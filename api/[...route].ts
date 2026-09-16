import { Hono } from 'hono'
import { handle } from 'hono/vercel'
import crypto from 'crypto'
// @ts-ignore
import { admin, db as _db, initAdmin, now } from './_firebase.js'
const db: any = _db
// @ts-ignore
import resend from './_resend.js'

import { kv } from '@vercel/kv'
import { corsMiddleware, secureHeadersMiddleware, rateLimitMiddleware, requestIdMiddleware } from './_middleware.js'
import { getUidFromContext, verifyIdToken } from './_auth.js'
import { requireAuth, withUserDoc, requireEmailVerified, requirePro, requireProUser, assertPro } from './_entitlementMiddleware.js'
import {
  assertCron,
  assertRequiredConfig,
  escapeHtml,
  hashToken,
  isValidAccountId,
  isValidUid,
  isRecaptchaConfigured,
  timingSafeHexEqual,
  validateSyncPayload,
  verifyRecaptcha,
} from './_security.js'
// @ts-ignore
import { fetchBrokerTrades } from './_metaapi-broker.js'
import {
  resolveKey,
  invalidateUserCache,
  invalidateApiKeyCache,
  handleOpenTradeSync,
  handleCloseTradeSync
} from './_tradeService.js'
import { getClientIp } from './_ipUtils.js'
import { persistBrokerTrades } from './_brokerTradePersistence.js'
import { cachedJson, withAccountLock, withRetryBudget } from './_resilience.js'
import { createAdminApi } from './_admin.js'
import { localAdminRateLimitFallbackAllowed, ProcessLocalAdminRateLimiter } from './_adminRateLimit.js'
import { emptyTradeAnalytics, emptySessionAnalytics } from '../src/lib/tradeAnalytics.js'
import { USER_CREDENTIAL_FIELDS, ACCOUNT_CREDENTIAL_FIELDS, deletionPatch } from './_credentialFields.js'
import { verifyPayPalWebhook } from './_paypal.js'
import {
  cancelOwnedPayPalSubscription,
  confirmPayPalSubscription,
  createHostedPayPalSubscription,
  getPayPalSubscriptionStatus,
  isPayPalPlanId,
  isPayPalSubscriptionId,
  payPalHostedConfig,
  processPayPalWebhook,
} from './_paypalSubscriptions.js'

// Ensure Firebase is initialized before any routes execute
initAdmin()

// Surface missing secrets in the cold-start log rather than at the moment an
// attacker discovers a control degraded to a no-op.
assertRequiredConfig()

// Helper to sanitize both client responses and server logs.
function handleRouteError(route: string, err: any, c: any, customErrName = 'Internal Server Error') {
  // Never log whole provider errors: SDK errors may embed request credentials.
  console.error('[' + route + '] Error', { name: err?.constructor?.name, code: err?.code })
  const constructorName = err?.constructor?.name
  const MSG_MAP: Record<string, string> = {
    'MetaApiError': 'Broker connection failed. Check your credentials.',
    'FirebaseError': 'Database operation failed. Try again.',
  }
  const safeMsg = MSG_MAP[constructorName] || 'An unexpected error occurred.'
  return c.json({ error: customErrName, message: safeMsg }, 500)
}

const credentialDeleteSentinel = () => admin.firestore.FieldValue.delete()

/** Removes credential fields written by deployments that predate client-managed sync. */
async function scrubLegacyBrokerCredentials(uid: string) {
  await db.collection('users').doc(uid).set(
    deletionPatch(USER_CREDENTIAL_FIELDS, credentialDeleteSentinel),
    { merge: true },
  )
}

type Env = {}
type Variables = Record<string, unknown>

const processLocalAdminRateLimiter = new ProcessLocalAdminRateLimiter()

export const app = new Hono<{ Bindings: Env; Variables: Variables }>().basePath('/api')

// ── Middleware Registrations ────────────────────────────────────────────────
app.use('*', requestIdMiddleware)
app.use('*', secureHeadersMiddleware)
app.use('*', corsMiddleware)
app.use('*', rateLimitMiddleware)

// Public availability signal. The settings document remains server-only; this
// route reveals only the boolean required to render the maintenance notice.
app.get('/status', async (c) => {
  try {
    const snapshot = await db.collection('settings').doc('platform').get()
    c.header('Cache-Control', 'no-store')
    return c.json({ maintenanceMode: snapshot.get('maintenanceMode') === true })
  } catch (error: any) {
    console.error('[status] Settings lookup failed', { code: error?.code })
    c.header('Cache-Control', 'no-store')
    return c.json({ maintenanceMode: false, available: false }, 503)
  }
})

// Isolated privileged surface. The child router owns strict Firebase claim
// checks, response allowlists, validation, and mutation audit logging.
app.route('/admin', createAdminApi({
  admin,
  db,
  now,
  invalidateUserCache,
  invalidateApiKeyCache,
  consumeAdminRateLimit: async (scope, actorUid, limit, windowSeconds) => {
    const key = `rl:admin:${scope}:${actorUid}`
    try {
      const pipeline = kv.pipeline()
      pipeline.incr(key)
      pipeline.ttl(key)
      const [current, currentTtl] = await pipeline.exec() as [number, number]
      if (currentTtl === -1) await kv.expire(key, windowSeconds)
      const retryAfter = currentTtl > 0 ? currentTtl : windowSeconds
      return {
        available: true,
        allowed: current <= limit,
        remaining: Math.max(0, limit - current),
        retryAfter,
      }
    } catch (error: any) {
      console.error('[admin-rate-limit] KV unavailable', { code: error?.code })
      if (localAdminRateLimitFallbackAllowed(
        process.env.XAU_ADMIN_LOCAL_API_RUNTIME,
        process.env.VERCEL_ENV,
      )) {
        return processLocalAdminRateLimiter.consume(key, limit, windowSeconds)
      }
      return { available: false, allowed: false, remaining: 0, retryAfter: windowSeconds }
    }
  },
}))

// ── 1. Authentication Utilities Route ────────────────────────────────────────
app.post('/auth-utils', async (c) => {
  let body: any
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: 'Missing body payload' }, 400)
  }

  const { action } = body

  if (action === 'send-login-alert') {
    const authHeader = c.req.header('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ error: 'Unauthorized: Missing token.' }, 401)
    }
    const token = authHeader.split('Bearer ')[1]
    
    let email: string
    let decodedUid: string
    try {
      const decodedToken = await verifyIdToken(token)
      email = decodedToken.email
      decodedUid = decodedToken.uid
      if (!email || !decodedUid) {
        return c.json({ error: 'Email not found in token' }, 400)
      }
    } catch (err: any) {
      console.error('[send-login-alert] Auth verification failed:', err.message)
      return c.json({ error: 'Unauthorized: Invalid token' }, 401)
    }

    // One alert per user per 15 minutes. The endpoint sends mail on every call
    // and the Resend failure below is swallowed, so without a cooldown a single
    // authenticated account can drive unbounded sends against the quota.
    const cooldownKey = 'alert:login:' + decodedUid
    try {
      if (await kv.get(cooldownKey)) return c.json({ success: true, skipped: 'cooldown' })
      await kv.set(cooldownKey, 1, { ex: 900 })
    } catch (kvErr: any) {
      console.error('[send-login-alert] KV cooldown unavailable:', kvErr.message)
    }

    const ipAddress = getClientIp(c)
    // Client-supplied values are escaped: they are interpolated into HTML that
    // lands in a mailbox. `time` is taken from the server, not the request —
    // there is no reason to let the caller author the timestamp on a security
    // notice.
    const userAgent = String(body.userAgent || c.req.header('user-agent') || 'Unknown').slice(0, 256)
    const time = new Date().toUTCString()

    try {
      await resend.emails.send({
        from: 'XauJournal Security <security@xaujournal.com>',
        to: email,
        subject: 'XauJournal New Login Detected',
        text: `New login to your XauJournal account.\n\nIP Address: ${ipAddress}\nDevice/Browser: ${userAgent}\nTime: ${time}\n\nIf this was not you, reset your password immediately.`,
        html: `
          <div style="font-family: sans-serif; padding: 20px; color: #f1f5f9; background: #0f172a; border-radius: 8px;">
            <h2 style="color: #38bdf8; margin-bottom: 20px;">New Login Alert</h2>
            <p>We detected a new login to your XauJournal account.</p>
            <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
              <tr>
                <td style="padding: 8px 0; color: #94a3b8; width: 120px;">IP Address:</td>
                <td style="padding: 8px 0; font-weight: bold;">${escapeHtml(ipAddress)}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #94a3b8;">Device/Browser:</td>
                <td style="padding: 8px 0; font-weight: bold;">${escapeHtml(userAgent)}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #94a3b8;">Time:</td>
                <td style="padding: 8px 0; font-weight: bold;">${escapeHtml(time)}</td>
              </tr>
            </table>
            <p style="font-size: 13px; color: #64748b; line-height: 1.6;">If this was you, you can safely ignore this message. If you do not recognise this activity, please reset your password immediately.</p>
            <p style="margin-top: 40px; font-size: 12px; color: #475569; border-top: 1px solid #ffffff10; padding-top: 20px;">SECURED BY XAUJOURNAL INFRASTRUCTURE.</p>
          </div>
        `
      })
    } catch (emailErr: any) {
      console.error('Email Send Failed (Resend):', emailErr.message)
    }
    return c.json({ success: true })
  }

  // The 'recaptcha' action was removed deliberately. It returned the verdict to
  // the caller — who is the party being assessed — and let any anonymous
  // request spend a billable Enterprise assessment against the project API key.
  // Verification is now a server-side helper (_security.ts#verifyRecaptcha)
  // invoked inline by the endpoints that need it.
  return c.json({ error: 'Unknown action' }, 400)
})

app.post('/contact', async (c) => {
  let body: any
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400)
  }

  // Bound every field before it touches storage or a mail template. Unbounded
  // `message` allowed ~1MiB Firestore documents from anonymous callers, and
  // CR/LF in `subject` is header-smuggling material.
  const name = String(body.name ?? '').trim().slice(0, 120)
  const email = String(body.email ?? '').trim().slice(0, 254)
  const subject = String(body.subject ?? '').trim().slice(0, 200).replace(/[\r\n]+/g, ' ')
  const message = String(body.message ?? '').trim().slice(0, 5000)

  if (!name || !email || !message) {
    return c.json({ error: 'Missing required fields: name, email, and message' }, 400)
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    return c.json({ error: 'Invalid email address' }, 400)
  }

  // Enforced as soon as RECAPTCHA_API_KEY and VITE_RECAPTCHA_SITE_KEY are set.
  // Until then the endpoint still runs, protected by the field caps above and
  // the 5/hour `contact` rate-limit scope — but it logs the gap on every call
  // so the missing configuration cannot go unnoticed.
  if (isRecaptchaConfigured()) {
    const verdict = await verifyRecaptcha(body.recaptchaToken, 'contact')
    if (!verdict.ok) {
      console.warn('[contact] reCAPTCHA rejected:', verdict.reason)
      return c.json({ error: 'Verification failed. Please try again.' }, 403)
    }
  } else {
    console.warn('[contact] reCAPTCHA is not configured — set RECAPTCHA_API_KEY and VITE_RECAPTCHA_SITE_KEY')
  }

  try {
    // 1. Save to Firestore
    await db.collection('contactMessages').add({
      name,
      email,
      subject: subject || 'No Subject',
      message,
      ip: getClientIp(c),
      createdAt: now(),
    })

    // 2. Send email via Resend. The plaintext part carries the real content;
    //    the HTML part escapes every interpolated field, because this mail is
    //    read by staff and an unescaped body is a phishing template delivered
    //    from our own DKIM-signed domain.
    try {
      await resend.emails.send({
        from: 'XauJournal Contact Form<contact@xaujournal.com>',
        to: 'info@xaujournal.com',
        replyTo: email,
        subject: `[Contact Form] ${subject || 'New Message'}`,
        text: `Name: ${name}\nEmail: ${email}\nSubject: ${subject || 'No Subject'}\n\n${message}`,
        html: `
          <div style="font-family: sans-serif; padding: 20px; color: #1e293b;">
            <h2>New Contact Form Message</h2>
            <p><strong>Name:</strong> ${escapeHtml(name)}</p>
            <p><strong>Email:</strong> ${escapeHtml(email)}</p>
            <p><strong>Subject:</strong> ${escapeHtml(subject || 'No Subject')}</p>
            <p><strong>Message:</strong></p>
            <p style="white-space: pre-wrap; background: #f1f5f9; padding: 15px; border-radius: 6px;">${escapeHtml(message)}</p>
          </div>
        `
      })
    } catch (emailErr: any) {
      console.error('[contact] Resend email failed:', emailErr.message)
    }

    return c.json({ success: true, message: 'Message sent successfully.' })
  } catch (err: any) {
    return handleRouteError('contact', err, c)
  }
})


// ── Helper to consolidate Broker Connection logic ───────────────────────────
async function consolidateBrokerConnect({
  uid,
  login,
  password,
  server,
  brokerType
}: any) {
  await scrubLegacyBrokerCredentials(uid)
  // Random ids avoid persisting a credential-derived fingerprint.
  const accountId = 'broker_' + crypto.randomUUID().replaceAll('-', '')
  const brokerRef = db.collection('users').doc(uid).collection('brokerAccounts').doc(accountId)
  // Server-owned labels never reuse credential-shaped user input.
  const name = String(server)
  
  const lockResult = await withAccountLock(uid + ':connect', async () => {
    const activeAccounts = await db.collection('users').doc(uid).collection('brokerAccounts')
      .where('isActive', '==', true)
      .limit(2)
      .get()
    if (activeAccounts.docs.some((accountDoc: any) => accountDoc.id !== accountId)) {
      throw new Error('Only one broker account can be connected at a time')
    }
    const existingAccount = await brokerRef.get()
    const syncStartedAt = new Date()
    await brokerRef.set({
      id: accountId,
      accountName: name,
      brokerType,
      server,
      // Merge writes also remove sensitive fields left by older deployments.
      // The shared list covers all 7 legacy fields — the inline version here
      // had drifted to deleting only 4 of them.
      ...deletionPatch(ACCOUNT_CREDENTIAL_FIELDS, credentialDeleteSentinel),
      // Privacy boundary: the broker *password* stays on the user's device.
      // The login is account metadata (spec §2.1) — persisting it is what lets
      // sync survive device changes; 'client-session' still means the server
      // holds no credential. Never echo the login back in the response.
      // Must stay BELOW the deletion spread: 'login' is in the legacy scrub
      // list, and a later delete sentinel would clobber the persisted value.
      login: String(login),
      credentialStorage: 'client-session',
      isActive: true,
      lastSyncStatus: 'running',
      lastSyncError: null,
      syncJobState: 'running',
      retryCount: 0,
      nextSyncAt: new Date(syncStartedAt.getTime() + 5 * 60 * 1000).toISOString(),
      createdAt: existingAccount.exists ? (existingAccount.get('createdAt') || now()) : now(),
      updatedAt: now(),
    }, { merge: true })

    try {
      const deals = await withRetryBudget(
        'metaapi',
        () => fetchBrokerTrades({ login, password, server, brokerType }),
        { timeoutMs: 25_000, retries: 0 },
      )
      await persistBrokerTrades({
        db,
        userId: uid,
        accountId,
        brokerTrades: deals,
        timestampFactory: now,
        incrementFactory: (value: number) => admin.firestore.FieldValue.increment(value),
      })
      await brokerRef.update({
        lastSyncTime: now(), lastSyncStatus: 'success', lastSyncError: null,
        syncJobState: 'client-managed', retryCount: 0,
        nextSyncAt: null,
        tradeCount: deals.length, updatedAt: now(),
      })
      return { accountId, tradeCount: deals.length }
    } catch (error: any) {
      await brokerRef.update({
        lastSyncStatus: 'failed', lastSyncError: 'Broker sync failed',
        syncJobState: 'client-managed', retryCount: 0,
        nextSyncAt: null,
        updatedAt: now(),
      }).catch(() => undefined)
      throw error
    }
  })
  if (!lockResult.acquired) throw new Error('Broker connection is already in progress')
  return lockResult.value
}

// ── Helper to handle Broker Addition logic ───────────────────────────
async function handleBrokerAdd(
  c: any,
  uid: string,
  { login, password, server, brokerType, accountName, legacyResponse = false }: any
) {
  try {
    const result = await consolidateBrokerConnect({
      uid,
      login,
      password,
      server,
      brokerType,
      accountName
    })

    if (legacyResponse) {
      return c.json({
        message: `Connected to ${server}. Synced ${result.tradeCount} closed deal(s).`,
        accountId: result.accountId,
        tradeCount: result.tradeCount,
      })
    }

    return c.json({
      ok: true,
      message: 'Broker account added successfully',
      accountId: result.accountId,
      tradeCount: result.tradeCount,
    })
  } catch (error: any) {
    console.error('[broker-connect-add] Add account error:', error.message)
    const msg = error.message || 'Failed to connect to broker'
    if (/already in progress/i.test(msg)) {
      return c.json({ error: 'Broker connection is already in progress. Try again shortly.' }, 409)
    }
    if (/only one broker account/i.test(msg)) {
      return c.json({ error: 'Remove the current broker account before connecting another.' }, 409)
    }
    if (/invalid|auth|credential|password|login/i.test(msg)) {
      return c.json({ error: 'Invalid broker credentials. Check login, password, and server name.' }, 401)
    }
    return handleRouteError(
      legacyResponse ? 'connect-broker' : 'broker-login-sync:add',
      error,
      c,
      'Failed to connect to broker'
    )
  }
}


// Spec §2.1: broker login is account *metadata* (never the password). The
// pattern keeps stored values free of path separators and spoofable formatting.
const BROKER_LOGIN = /^[A-Za-z0-9._-]{1,32}$/

// ── 2. Broker Login Sync Route ──────────────────────────────────────────────
// Pro is gated per action, not per route: 'add'/'sync' consume MetaApi quota
// and require Pro; 'adopt'/'remove' only manage account metadata and must keep
// working for lapsed users (deliberate — spec §7-Q7), so they need auth +
// verified email only.
app.post('/broker-login-sync', requireAuth, withUserDoc, requireEmailVerified, async (c) => {
  const uid = String(c.get('uid'))

  let body;
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400)
  }

  const { action } = body

  if (action === 'add') {
    const proDenied = assertPro(c, { error: 'Broker sync requires active Pro subscription' })
    if (proDenied) return proDenied

    const { login, password, server, brokerType, accountName } = body
    if (!login || !password || !server || !brokerType) {
      return c.json({ error: 'Missing required: login, password, server, brokerType' }, 400)
    }
    if (!['mt4', 'mt5'].includes(brokerType)) {
      return c.json({ error: 'brokerType must be mt4 or mt5' }, 400)
    }
    // consolidateBrokerConnect persists the login BEFORE the MetaApi call can
    // fail, so the §2.1 shape must hold here — otherwise a malformed value
    // (or '[object Object]') is stored and a later adopt 409s against it.
    // String() first: legacy clients send numeric MT logins.
    if (!BROKER_LOGIN.test(String(login))) {
      return c.json({ error: 'Missing or invalid login' }, 400)
    }

    return handleBrokerAdd(c, uid, {
      login,
      password,
      server,
      brokerType,
      accountName,
      legacyResponse: false
    })
  }

  if (action === 'sync') {
    const proDenied = assertPro(c, { error: 'Broker sync requires active Pro subscription' })
    if (proDenied) return proDenied

    const { accountId, login, password, server, brokerType } = body
    // accountId becomes a Firestore document id; a slash would build a deeper
    // path than the brokerAccounts document intended.
    if (!isValidAccountId(accountId)) return c.json({ error: 'Missing or invalid accountId' }, 400)
    if (!login || !password || !server || !brokerType) {
      return c.json({ error: 'Missing local broker credentials for transient sync' }, 400)
    }

    try {
      const accountRef = db.collection('users').doc(uid).collection('brokerAccounts').doc(accountId)
      const accountSnap = await accountRef.get()
      if (!accountSnap.exists) return c.json({ error: 'Broker account not found' }, 404)
      await scrubLegacyBrokerCredentials(uid)
      const deals = await withRetryBudget(
        'metaapi',
        () => fetchBrokerTrades({ login, password, server, brokerType }),
        { timeoutMs: 25_000, retries: 0 },
      )
      const syncResult = await persistBrokerTrades({
        db,
        userId: uid,
        accountId,
        brokerTrades: deals,
        timestampFactory: now,
        incrementFactory: (value: number) => admin.firestore.FieldValue.increment(value),
      })
      await accountRef.update({
        lastSyncTime: now(),
        lastSyncStatus: 'success',
        lastSyncError: null,
        tradeCount: syncResult.totalFetched,
        syncJobState: 'client-managed',
        nextSyncAt: null,
        syncRequestedAt: now(),
        updatedAt: now(),
      })
      return c.json({ ok: true, ...syncResult, message: 'Broker sync completed' })
    } catch (error: any) {
      return handleRouteError('broker-login-sync:sync', error, c, 'Failed to sync broker')
    }
  }
  if (action === 'adopt') {
    // One-shot localStorage → Firestore migration of the broker login (spec
    // §2.1 / D-item 2). Not Pro-gated: without the server-held login, a lapsed
    // user's account list dies with their localStorage. Passwords never touch
    // this path — 'client-session' records that the server holds no credential.
    const { accountId, login } = body
    if (!isValidAccountId(accountId)) return c.json({ error: 'Missing or invalid accountId' }, 400)
    if (typeof login !== 'string' || !BROKER_LOGIN.test(login)) {
      return c.json({ error: 'Missing or invalid login' }, 400)
    }
    try {
      const accountRef = db.collection('users').doc(uid).collection('brokerAccounts').doc(accountId)
      // Transactional: two concurrent adopts (two devices with divergent stale
      // localStorage) must serialize, or a plain get-then-update race bypasses
      // the 409 mismatch guard and the loser silently overwrites the winner.
      const outcome = await db.runTransaction(async (tx: any) => {
        const accountSnap = await tx.get(accountRef)
        if (!accountSnap.exists) return 'missing'

        const storedLogin = accountSnap.get('login')
        if (typeof storedLogin === 'string' && storedLogin !== '') {
          // Idempotent on re-runs; a *different* stored login means server truth
          // already exists and is never silently overwritten.
          return storedLogin === login ? 'noop' : 'mismatch'
        }

        tx.update(accountRef, {
          login,
          credentialStorage: 'client-session',
          migratedFromLocalAt: now(),
          updatedAt: now(),
        })
        return 'adopted'
      })
      if (outcome === 'missing') return c.json({ error: 'Broker account not found' }, 404)
      if (outcome === 'mismatch') {
        return c.json({ error: 'Broker account already has a different login', code: 'login-mismatch' }, 409)
      }
      return c.json({ ok: true, adopted: outcome === 'adopted' })
    } catch (error: any) {
      return handleRouteError('broker-login-sync:adopt', error, c, 'Failed to adopt account')
    }
  }

  if (action === 'remove') {
    // Deliberately not Pro-gated (spec §7-Q7): lapsed users must still be able
    // to remove their own account metadata.
    const { accountId } = body
    if (!isValidAccountId(accountId)) return c.json({ error: 'Missing or invalid accountId' }, 400)
    try {
      const accountRef = db.collection('users').doc(uid).collection('brokerAccounts').doc(accountId)
      await scrubLegacyBrokerCredentials(uid)
      await accountRef.update({
        isActive: false,
        updatedAt: now(),
      })
      return c.json({ ok: true, message: 'Broker account removed' })
    } catch (error) {
      return c.json({ error: 'Failed to remove account' }, 500)
    }
  }

  return c.json({ error: 'Method not allowed' }, 405)
})

// ── 3. Connect Broker Route ──────────────────────────────────────────────────
app.post('/connect-broker', ...requireProUser({ message: 'Broker connect is a Pro feature.' }), async (c) => {
  const uid = String(c.get('uid'))

  let body;
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400)
  }

  const { server, accountId, password, platform = 'mt5' } = body
  if (!server || !accountId || !password) {
    return c.json({ error: 'Missing server, accountId, or password' }, 400)
  }
  // accountId is the MT login this legacy route persists (spec §2.1) — same
  // shape gate as the 'add' action, before anything reaches Firestore.
  if (!BROKER_LOGIN.test(String(accountId))) {
    return c.json({ error: 'Invalid accountId' }, 400)
  }

  const brokerType = platform === 'mt4' ? 'mt4' : 'mt5'

  // handleBrokerAdd owns all error mapping (credential 401s, in-progress 409s,
  // sanitized 500s) — nothing here can throw past it.
  return handleBrokerAdd(c, uid, {
    login: accountId,
    password,
    server,
    brokerType,
    accountName: String(server),
    legacyResponse: true
  })
})

// ── 4. Generate API Key Route ────────────────────────────────────────────────
app.post('/generate-api-key', ...requireProUser({ message: 'MT5/TradingView Auto-Sync is a Pro feature. Upgrade to generate an API key.' }), async (c) => {
  const uid = String(c.get('uid'))

  try {
    // Keys are stored hashed, so an existing key can no longer be re-read and
    // returned. Rotating is the only option: revoke the old record, mint a new
    // secret, and show it once.
    const existing = await db.collection('apiKeys').where('uid', '==', uid).get()
    if (!existing.empty) {
      const batch = db.batch()
      existing.docs.forEach((doc: any) => batch.delete(doc.ref))
      await batch.commit()
      await Promise.all(existing.docs.map((doc: any) => invalidateApiKeyCache(doc.id, uid)))
    }

    const apiKey = 'xau_' + crypto.randomBytes(24).toString('hex')
    // The document id is the SHA-256 of the key, never the key itself: document
    // ids surface in exports, backups, audit-log resource names, and the
    // Firebase console.
    await db.collection('apiKeys').doc(hashToken(apiKey)).set({
      uid,
      label: 'MT5/TradingView Sync Key',
      prefix: apiKey.slice(0, 12), // display-only, so the UI can identify a key
      createdAt: now(),
      lastUsedAt: null,
    })

    await db.collection('users').doc(uid).set(
      { mt5SyncEnabled: true, syncKeyCreatedAt: now() },
      { merge: true }
    )

    console.log(`[generate-api-key] New key created for uid=${uid}`)
    return c.json({ apiKey })
  } catch (err: any) {
    return handleRouteError('generate-api-key', err, c)
  }
})

// ── 5. Revoke API Key Route ──────────────────────────────────────────────────
app.post('/revoke-api-key', async (c) => {
  let uid: string
  try {
    uid = await getUidFromContext(c)
  } catch (err: any) {
    console.error('[revoke-api-key] verifyIdToken failed:', err?.message || err)
    return c.json({ error: 'Invalid or expired token' }, 401)
  }

  try {
    const snapshot = await db.collection('apiKeys').where('uid', '==', uid).get()
    if (snapshot.empty) {
      return c.json({ success: true, message: 'No active key to revoke' })
    }

    const apiKeys = snapshot.docs.map((doc: any) => doc.id)
    const batch = db.batch()
    snapshot.docs.forEach((doc: any) => batch.delete(doc.ref))
    await batch.commit()

    await db.collection('users').doc(uid).update({ mt5SyncEnabled: false })

    // Invalidate caches
    await Promise.all(apiKeys.map((key: any) => invalidateApiKeyCache(key, uid)))

    console.log(`[revoke-api-key] Key(s) revoked for uid=${uid}`)
    return c.json({ success: true })
  } catch (err: any) {
    return handleRouteError('revoke-api-key', err, c)
  }
})

// ── 5.5. Initialize User Route (Server-side Secure Trial Assignment) ─────────
app.post('/init-user', async (c) => {
  let uid: string
  try {
    uid = await getUidFromContext(c)
  } catch (err: any) {
    console.error('[init-user] verifyIdToken failed:', err?.message || err)
    return c.json({ error: 'Invalid or expired token' }, 401)
  }

  try {
    const userDocRef = db.collection('users').doc(uid)
    const userDoc = await userDocRef.get()

    if (userDoc.exists) {
      const data = userDoc.data() || {}
      if (data.plan) {
        // User already initialized, return current plan details idempotently
        return c.json({
          success: true,
          plan: data.plan,
          isTrial: data.isTrial || false,
          planExpiry: data.planExpiry || null,
        })
      }
    }

    const hasExistingTrades = userDoc.exists
      ? !(await userDocRef.collection('trades').limit(1).get()).empty
      : false

    // New user signup, initialize on Free with unlimited manual logging.
    // requiresEmailVerification marks this as a post-verification account: only
    // these are gated by assertEmailVerified, so existing users (who reach the
    // early return above and never get here) are grandfathered and never locked
    // out. This branch runs only for genuinely new accounts, which have already
    // been sent a verification email at signup.
    const initData = {
      plan: 'free',
      isTrial: false,
      planExpiry: null,
      requiresEmailVerification: true,
      createdAt: now(),
      updatedAt: now(),
      ...(hasExistingTrades ? {} : { analytics: emptyTradeAnalytics() }),
      analyticsBackfillState: hasExistingTrades ? 'required' : 'not_required',
    }

    await userDocRef.set(initData, { merge: true })
    console.log(`[init-user] Created initial Free plan for new user uid=${uid}`)

    return c.json({
      success: true,
      plan: 'free',
      isTrial: false,
      planExpiry: null,
    })
  } catch (err: any) {
    return handleRouteError('init-user', err, c)
  }
})

// ── 6. PayPal subscriptions ────────────────────────────────────────────────
app.get('/paypal/subscriptions/config', requireAuth, withUserDoc, async (c) => {
  return c.json(payPalHostedConfig())
})

app.post('/paypal/subscriptions/create', requireAuth, withUserDoc, requireEmailVerified, async (c) => {
  const body = await c.req.json().catch(() => null) as any
  const uid = String(c.get('uid'))
  if (!body || !isPayPalPlanId(body.planId) || typeof body.idempotencyKey !== 'string' || body.idempotencyKey.length < 16 || body.idempotencyKey.length > 128) {
    return c.json({ error: 'Invalid PayPal checkout request' }, 400)
  }
  try {
    // The response intentionally contains only PayPal's hosted approval URL.
    return c.json(await createHostedPayPalSubscription({
      uid,
      planId: body.planId,
      idempotencyKey: body.idempotencyKey,
      requestUrl: c.req.url,
    }))
  } catch (err: any) {
    return handleRouteError('paypal-create', err, c, 'PayPal checkout unavailable')
  }
})

app.post('/paypal/subscriptions/confirm', requireAuth, withUserDoc, requireEmailVerified, async (c) => {
  const body = await c.req.json().catch(() => null) as any
  const subscriptionId = body?.subscriptionId
  if (!isPayPalSubscriptionId(subscriptionId)) return c.json({ error: 'Invalid PayPal subscription' }, 400)
  try {
    const result = await confirmPayPalSubscription(String(c.get('uid')), subscriptionId)
    if (result.uid) await invalidateUserCache(result.uid)
    return c.json({ subscription: result.subscription })
  } catch (err: any) {
    return handleRouteError('paypal-confirm', err, c, 'PayPal confirmation unavailable')
  }
})

app.get('/paypal/subscriptions/status', requireAuth, withUserDoc, async (c) => {
  const subscriptionId = c.req.query('subscription_id') || undefined
  if (subscriptionId && !isPayPalSubscriptionId(subscriptionId)) return c.json({ error: 'Invalid PayPal subscription' }, 400)
  try {
    const result = await getPayPalSubscriptionStatus(String(c.get('uid')), subscriptionId)
    if (result.uid) await invalidateUserCache(result.uid)
    return c.json({ subscription: result.subscription })
  } catch (err: any) {
    return handleRouteError('paypal-status', err, c, 'PayPal subscription status unavailable')
  }
})

app.post('/paypal/subscriptions/cancel', requireAuth, withUserDoc, async (c) => {
  const body = await c.req.json().catch(() => ({})) as any
  const subscriptionId = body?.subscriptionId
  if (subscriptionId && !isPayPalSubscriptionId(subscriptionId)) return c.json({ error: 'Invalid PayPal subscription' }, 400)
  if (body?.reason !== undefined && (typeof body.reason !== 'string' || body.reason.length > 128)) {
    return c.json({ error: 'Invalid cancellation reason' }, 400)
  }
  try {
    const result = await cancelOwnedPayPalSubscription(String(c.get('uid')), subscriptionId, body?.reason)
    if (result.uid) await invalidateUserCache(result.uid)
    return c.json({ subscription: result.subscription })
  } catch (err: any) {
    return handleRouteError('paypal-cancel', err, c, 'PayPal cancellation unavailable')
  }
})

app.post('/webhooks/paypal', async (c) => {
  const rawBody = await c.req.text()
  let body: any
  try {
    body = JSON.parse(rawBody)
  } catch {
    return c.text('Invalid JSON', 400)
  }
  try {
    const verified = await verifyPayPalWebhook({
      authAlgo: c.req.header('paypal-auth-algo') || '',
      certUrl: c.req.header('paypal-cert-url') || '',
      transmissionId: c.req.header('paypal-transmission-id') || '',
      transmissionSig: c.req.header('paypal-transmission-sig') || '',
      transmissionTime: c.req.header('paypal-transmission-time') || '',
    }, body)
    if (!verified) return c.text('Invalid signature', 401)
    const result = await processPayPalWebhook(body)
    if (result.uid) await invalidateUserCache(result.uid)
    return c.json({ ok: true, ignored: Boolean((result as any).ignored), deduped: Boolean(result.deduped) })
  } catch (err: any) {
    return handleRouteError('paypal-webhook', err, c)
  }
})

// ── 8. Trade Webhook Handler (shared by MT5 and TradingView) ────────────────
//
// /sync-trade and /tv-webhook previously duplicated ~30 lines of near-identical
// handling, and both validated `positionId` for presence only. That value is
// interpolated into a Firestore document id, and `.doc()` accepts a
// slash-separated relative path — so `positionId: "a/b/c"` wrote into a nested
// subcollection that /api/reset-trades never deletes. One implementation, one
// validator.
const handleTradeWebhook = (routeName: string, defaultSource: 'mt5' | 'tradingview') => async (c: any) => {
  let body: any
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400)
  }

  const apiKey = c.req.header('x-api-key') || body?.apiKey
  const uid = await resolveKey(apiKey)
  if (!uid) return c.json({ error: 'Invalid API key or subscription expired' }, 403)

  const payload = validateSyncPayload(body)
  if (!payload) {
    return c.json({ error: 'Missing or invalid: event, positionId, symbol' }, 400)
  }

  const tradeRef = db.collection('users').doc(uid).collection('trades').doc(`pos_${payload.positionId}`)

  let result
  try {
    result = payload.event === 'open'
      ? await handleOpenTradeSync(tradeRef, payload, defaultSource)
      : await handleCloseTradeSync(tradeRef, payload, defaultSource)
  } catch (err: any) {
    return handleRouteError(routeName, err, c)
  }

  console.log(`[${routeName}] uid=${uid} event=${payload.event} pos=${payload.positionId}`, result)
  return c.json(result)
}

// ── 9. Sync Trade Route ──────────────────────────────────────────────────────
app.post('/sync-trade', handleTradeWebhook('sync-trade', 'mt5'))

// ── 10b. Reset Trades Route ──────────────────────────────────────────────────
app.post('/reset-trades', async (c) => {
  let uid: string
  try {
    uid = await getUidFromContext(c)
  } catch (err: any) {
    console.error('[reset-trades] verifyIdToken failed:', err.message)
    // Verifier internals stay in the server log — the 401 body is uniform
    // across routes so error text can't leak token-validation details.
    return c.json({ error: 'Invalid or expired token' }, 401)
  }

  try {
    const auditRef = db.collection('users').doc(uid).collection('auditLogs').doc()
    await auditRef.set({
      action: 'RESET_TRADES',
      confirmedAt: now(),
      timestamp: new Date().toISOString(),
    })

    const tradesColRef = db.collection('users').doc(uid).collection('trades')

    // recursiveDelete also removes subcollections. A batched delete of the
    // top-level documents alone leaves any nested document behind, which is an
    // erasure gap when the user has asked for their trade history to be wiped.
    const firestore = admin.firestore()
    if (typeof firestore.recursiveDelete === 'function') {
      await firestore.recursiveDelete(tradesColRef)
    } else {
      const snapshot = await tradesColRef.get()
      if (!snapshot.empty) {
        const docs = snapshot.docs
        const CHUNK_SIZE = 400
        for (let i = 0; i < docs.length; i += CHUNK_SIZE) {
          const chunk = docs.slice(i, i + CHUNK_SIZE)
          const batch = db.batch()
          chunk.forEach((doc: any) => batch.delete(doc.ref))
          await batch.commit()
        }
      }
    }

    await db.collection('users').doc(uid).set({
      totalTradesLogged: 0,
      analytics: emptyTradeAnalytics(),
      // The server-maintained session aggregate must reset with the trades it
      // counts — left behind, a re-sync double-counts every bucket, and the
      // stale counters are version-consistent so the lazy rebuild gate would
      // trust them forever. The zeroed map (version stamped) IS the correct
      // full-rebuild result for an empty trade set.
      sessionAnalytics: emptySessionAnalytics(),
    }, { merge: true })

    console.log(`[reset-trades] Wiped trades for uid=${uid}`)
    return c.json({ success: true, message: 'All trades reset successfully.' })
  } catch (err: any) {
    return handleRouteError('reset-trades', err, c)
  }
})

// ── 11. TradingView Webhook Route ────────────────────────────────────────────
app.post('/tv-webhook', handleTradeWebhook('tv-webhook', 'tradingview'))

// ── 13. Cron Jobs ───────────────────────────────────────────────────────────
// Every scheduled handler goes through assertCron(), which refuses to run when
// CRON_SECRET is absent. Building the expected value inline as
// `Bearer ${process.env.CRON_SECRET}` produced the literal "Bearer undefined"
// for an unset variable, which any caller could send.
const CRON_PAGE_SIZE = 500
const handleBrokerSyncPoller = async (c: any) => {
  const denied = assertCron(c)
  if (denied) return denied

  console.log('[broker-sync-poller] Starting scheduled broker sync...')

  let totalUsers = 0
  let totalAccounts = 0
  let successfulSyncs = 0
  let failedSyncs = 0

  try {
    // 1. Fetch all active broker accounts across the database in one collection group query
    const accountsSnapshot = await db
      .collectionGroup('brokerAccounts')
      .where('isActive', '==', true)
      .where('syncJobState', 'in', ['queued', 'retry', 'running'])
      .where('nextSyncAt', '<=', new Date().toISOString())
      .orderBy('nextSyncAt')
      .limit(100)
      .get()

    if (accountsSnapshot.empty) {
      console.log('[broker-sync-poller] No active broker accounts found.')
      return c.json({
        ok: true,
        timestamp: new Date().toISOString(),
        usersProcessed: 0,
        accountsProcessed: 0,
        successfulSyncs: 0,
        failedSyncs: 0,
      })
    }

    // Client-managed credentials make unattended server sync intentionally impossible.
    // Convert queued legacy accounts to client-managed mode and remove any sensitive
    // fields retained by an older deployment.
    const activeAccounts = accountsSnapshot.docs
    const uniqueUsers = new Set()

    for (const accountDoc of activeAccounts) {
      const uid = accountDoc.ref.parent.parent.id
      // Scrub each user once, not once per account.
      if (!uniqueUsers.has(uid)) {
        uniqueUsers.add(uid)
        await scrubLegacyBrokerCredentials(uid)
      }
      const accountData = accountDoc.data() || {}
      await accountDoc.ref.update({
        // Never downgrade an account already migrated to server-held metadata
        // (connect/adopt write 'client-session'); a crash between connect's
        // initial set and its terminal update lands here within 5 minutes.
        credentialStorage: accountData.credentialStorage === 'client-session'
          ? 'client-session'
          : 'client-local',
        // 'login' is persisted §2.1 account *metadata* (written by add/adopt),
        // not a credential — deleting it here would strand sync on both sides
        // once the client drains localStorage. Scrub everything else.
        ...deletionPatch(
          ACCOUNT_CREDENTIAL_FIELDS.filter((field) => field !== 'login'),
          credentialDeleteSentinel,
        ),
        syncJobState: 'client-managed',
        nextSyncAt: null,
        updatedAt: new Date().toISOString(),
      })
    }

    totalUsers = uniqueUsers.size
    totalAccounts = activeAccounts.length

    const result = {
      ok: true,
      timestamp: new Date().toISOString(),
      usersProcessed: totalUsers,
      accountsProcessed: totalAccounts,
      successfulSyncs,
      failedSyncs,
    }

    console.log('[broker-sync-poller] Completed scheduled broker sync:', result)
    return c.json(result)
  } catch (error: any) {
    return handleRouteError('broker-sync-poller', error, c, 'Cron job failed')
  }
}
app.get('/cron/broker-sync-poller', handleBrokerSyncPoller)
app.post('/cron/broker-sync-poller', handleBrokerSyncPoller)

const handleRemindExpiry = async (c: any) => {
  const denied = assertCron(c)
  if (denied) return denied

  try {
    const nowTime = new Date()
    const threeDaysFromNow = new Date(nowTime.getTime() + (3 * 24 * 60 * 60 * 1000))
    const usersRef = db.collection('users')
    // Bounded read: an unpaginated scan of every Pro user gets slower and more
    // expensive with every signup, and eventually times out the function.
    const snapshot = await usersRef.where('plan', '==', 'pro').limit(CRON_PAGE_SIZE).get()

    const emailPromises: Promise<any>[] = []

    for (const doc of snapshot.docs) {
      const data = doc.data()
      if (!data.planExpiry) continue

      const expiryDate = new Date(data.planExpiry)

      if (expiryDate <= threeDaysFromNow && expiryDate > new Date(threeDaysFromNow.getTime() - 86400000)) {
        try {
          const authUser = await admin.auth().getUser(doc.id)
          const verifiedEmail = authUser.email

          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
          if (!verifiedEmail || !emailRegex.test(verifiedEmail)) {
            console.warn(`[remind-expiry] Skipping ${doc.id}: no verified email`)
            continue
          }

          // `name` is a client-writable profile field, so it is escaped before
          // it reaches an HTML mail body.
          const displayName = escapeHtml(String(data.name || 'Trader').slice(0, 100))
          emailPromises.push(
            resend.emails.send({
              from: 'xaujournal <alerts@xaujournal.com>',
              to: verifiedEmail,
              subject: 'xaujournal: 3 Days Left of Pro',
              html: `<p>Hi ${displayName}, your Pro access expires in 3 days. Renew now to avoid losing your advanced analytics.</p>`
            })
          )
        } catch (authErr: any) {
          console.error(`[remind-expiry] Failed to fetch auth user or send email for ${doc.id}:`, authErr.message)
        }
      }
    }

    await Promise.all(emailPromises)
    return c.json({ success: true, sent: emailPromises.length })
  } catch (error: any) {
    return handleRouteError('remind-expiry', error, c)
  }
}
app.get('/cron/remind-expiry', handleRemindExpiry)
app.post('/cron/remind-expiry', handleRemindExpiry)

const handleRevokeExpired = async (c: any) => {
  const denied = assertCron(c)
  if (denied) return denied

  try {
    const nowTime = new Date()
    const nowIso = nowTime.toISOString()

    const snapshot = await db.collection('users')
      .where('plan', '==', 'grace')
      .where('graceUntil', '<=', nowIso)
      .limit(CRON_PAGE_SIZE)
      .get()

    if (snapshot.empty) {
      console.log('[revoke-expired] No expired grace periods found.')
      return c.json({ success: true, revoked: 0 })
    }

    const revokeTasks = snapshot.docs.map(async (userDoc: any) => {
      const uid = userDoc.id
      try {
        const keySnap = await db.collection('apiKeys').where('uid', '==', uid).get()
        const apiKeys = keySnap.docs.map((doc: any) => doc.id)
        const batch = db.batch()
        keySnap.docs.forEach((doc: any) => batch.delete(doc.ref))

        batch.update(db.collection('users').doc(uid), {
          plan: 'free',
          planExpiry: null,
          graceUntil: null,
          graceReason: null,
          mt5SyncEnabled: false,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        })

        await batch.commit()
        
        // Invalidate KV caches
        await Promise.all(apiKeys.map((key: any) => invalidateApiKeyCache(key, uid)))
        await invalidateUserCache(uid)

        console.log(`[revoke-expired] Revoked keys and downgraded uid=${uid}`)
        return true
      } catch (e: any) {
        console.error(`[revoke-expired] Failed for uid=${uid}:`, e.message)
        return false
      }
    })

    const results = await Promise.all(revokeTasks)
    const revokedCount = results.filter(Boolean).length

    return c.json({ success: true, revoked: revokedCount })
  } catch (error: any) {
    return handleRouteError('revoke-expired', error, c)
  }
}
app.get('/cron/revoke-expired', handleRevokeExpired)
app.post('/cron/revoke-expired', handleRevokeExpired)

// Cached market-data proxy with request coalescing and stale-while-revalidate.
app.get('/yahoo-chart/:symbol', async (c) => {
  const symbol = c.req.param('symbol')
  const interval = c.req.query('interval') || '1m'
  const range = c.req.query('range') || '1d'
  try {
    const result = await cachedJson('yahoo:' + symbol + ':' + interval + ':' + range, async () => {
      const url = 'https://query1.finance.yahoo.com/v8/finance/chart/' + encodeURIComponent(symbol)
        + '?interval=' + encodeURIComponent(interval) + '&range=' + encodeURIComponent(range)
      return withRetryBudget('yahoo', async (signal) => {
        const response = await fetch(url, { signal, headers: { 'User-Agent': 'xaujournal-market-proxy/1.0' } })
        if (!response.ok) throw new Error('Yahoo upstream returned ' + response.status)
        return response.json()
      }, { timeoutMs: 5_000, retries: 1 })
    }, { freshSeconds: 15, staleSeconds: 120 })
    c.header('Cache-Control', 'public, s-maxage=15, stale-while-revalidate=120')
    c.header('X-Cache', result.cache)
    return c.json(result.data)
  } catch (error: any) {
    return handleRouteError('yahoo-chart', error, c, 'Market data unavailable')
  }
})

app.get('/spot-price/:symbol', async (c) => {
  const symbol = c.req.param('symbol')
  try {
    const result = await cachedJson('spot:' + symbol, async () => withRetryBudget('gold-api', async (signal) => {
      const response = await fetch('https://api.gold-api.com/price/' + encodeURIComponent(symbol), { signal })
      if (!response.ok) throw new Error('Gold API upstream returned ' + response.status)
      return response.json()
    }, { timeoutMs: 4_000, retries: 1 }), { freshSeconds: 10, staleSeconds: 90 })
    c.header('Cache-Control', 'public, s-maxage=10, stale-while-revalidate=90')
    c.header('X-Cache', result.cache)
    return c.json(result.data)
  } catch (error: any) {
    return handleRouteError('spot-price', error, c, 'Spot price unavailable')
  }
})

// Unauthenticated, so every field that reaches the log is constrained: an
// allowlisted metric name, a finite number, and bounded strings. Unbounded
// caller-controlled text in structured logs is log injection.
const WEB_VITAL_NAMES = new Set(['CLS', 'LCP', 'INP', 'FCP', 'TTFB', 'FID'])
const WEB_VITAL_RATINGS = new Set(['good', 'needs-improvement', 'poor'])

app.post('/vitals', async (c) => {
  const body = await c.req.json().catch(() => null)
  if (!body || typeof body.name !== 'string' || !WEB_VITAL_NAMES.has(body.name)) {
    return c.json({ error: 'Invalid metric' }, 400)
  }
  if (typeof body.value !== 'number' || !Number.isFinite(body.value)) {
    return c.json({ error: 'Invalid metric' }, 400)
  }
  console.log('[web-vital]', JSON.stringify({
    name: body.name,
    value: Math.round(body.value * 1000) / 1000,
    rating: WEB_VITAL_RATINGS.has(body.rating) ? body.rating : null,
    route: String(body.route || '').replace(/[\r\n]+/g, ' ').slice(0, 120),
  }))
  return c.body(null, 204)
})

// Vercel's Node runtime dispatches named Web handlers for this Hono adapter.
// Keeping the handlers named preserves the Response returned by `handle(app)`.
export const GET = handle(app)
export const POST = handle(app)
export const PUT = handle(app)
export const PATCH = handle(app)
export const DELETE = handle(app)
export const OPTIONS = handle(app)
