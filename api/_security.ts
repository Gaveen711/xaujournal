import crypto from 'crypto'
import { Context } from 'hono'

/**
 * Shared server-side security primitives.
 *
 * These live in one module deliberately. The audit found the same control
 * implemented three times with three different bugs (cron secret comparison,
 * payload validation on /sync-trade vs /tv-webhook, HTML interpolation in two
 * mail templates). A control that has to be remembered twice eventually gets
 * applied once.
 */

// ── Configuration ───────────────────────────────────────────────────────────

/**
 * Names every secret the API needs, and reports the missing ones at cold start.
 *
 * Silent absence of an environment variable was the shared root cause of
 * several findings — most sharply the cron routes, where an unset CRON_SECRET
 * turned into the literal expected value "Bearer undefined". Individual guards
 * now fail closed on their own; this exists so the gap is visible in the logs
 * before someone probes for it.
 *
 * It reports rather than throws: a missing RESEND_API_KEY should degrade mail,
 * not take the whole API offline.
 */
const REQUIRED_ENV = [
  'FIREBASE_SERVICE_ACCOUNT',
  'CRON_SECRET',
  'PAYPAL_ENV',
  'PAYPAL_CLIENT_ID',
  'PAYPAL_CLIENT_SECRET',
  'PAYPAL_WEBHOOK_ID',
  'PAYPAL_MONTHLY_PLAN_ID',
  'PAYPAL_YEARLY_PLAN_ID',
  'METAAPI_TOKEN',
  'RESEND_API_KEY',
]

const RECOMMENDED_ENV = ['RECAPTCHA_API_KEY', 'VITE_RECAPTCHA_SITE_KEY']

export function assertRequiredConfig(): { missing: string[]; missingRecommended: string[] } {
  const missing = REQUIRED_ENV.filter((name) => !process.env[name])
  const missingRecommended = RECOMMENDED_ENV.filter((name) => !process.env[name])

  if (missing.length) {
    console.error('[config] MISSING REQUIRED SECRETS:', missing.join(', '),
      '— dependent routes will refuse to run')
  }
  if (missingRecommended.length) {
    console.warn('[config] Missing recommended secrets:', missingRecommended.join(', '),
      '— bot protection is not enforced')
  }
  return { missing, missingRecommended }
}

// ── HTML escaping ───────────────────────────────────────────────────────────

/**
 * Escapes a value for interpolation into an HTML attribute or text node.
 *
 * Every outbound email in this codebase is built with template literals, so
 * every interpolation point needs this. Prefer the `text:` field of the mail
 * provider where formatting is not required — it has no injection surface at
 * all.
 */
export function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// ── Cron authentication ─────────────────────────────────────────────────────

/**
 * Authenticates a scheduled-job request, or returns the response to send.
 *
 * The absent-secret case is the whole point of this function. Building the
 * expected value as `\`Bearer ${process.env.CRON_SECRET}\`` yields the literal
 * string "Bearer undefined" when the variable is unset, which any caller can
 * send. Refuse to run instead: a cron job that does not fire is a monitoring
 * problem, a cron job anyone can fire is an incident.
 */
export function assertCron(c: Context): Response | null {
  const expected = process.env.CRON_SECRET
  if (!expected || expected.length < 32) {
    console.error('[cron] CRON_SECRET missing or shorter than 32 chars — refusing to run')
    return c.json({ error: 'Cron secret is not configured' }, 503)
  }

  const header = c.req.header('Authorization') || ''
  const provided = header.startsWith('Bearer ')
    ? header.slice('Bearer '.length)
    : (c.req.header('x-cron-secret') || '')

  // Hash first so both operands are 32 bytes: timingSafeEqual throws on a
  // length mismatch, and the throw itself would leak the expected length.
  const a = crypto.createHash('sha256').update(provided).digest()
  const b = crypto.createHash('sha256').update(expected).digest()
  if (!crypto.timingSafeEqual(a, b)) return c.json({ error: 'Unauthorized' }, 401)

  return null
}

// ── Constant-time signature comparison ──────────────────────────────────────

/** Compares two hex digests without leaking position of first difference. */
export function timingSafeHexEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(String(a), 'utf8')
  const bufB = Buffer.from(String(b), 'utf8')
  if (bufA.length !== bufB.length) return false
  return crypto.timingSafeEqual(bufA, bufB)
}

// ── Secret hashing ──────────────────────────────────────────────────────────

/**
 * Derives the storage id for a bearer token.
 *
 * API keys are 192-bit CSPRNG values, so they are not brute-forceable and need
 * no salt or work factor — the reason to hash is that the plaintext must not be
 * the Firestore document id, where it would appear in exports, backups, audit
 * log resource names, and the console.
 */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(String(token)).digest('hex')
}

// ── Identifier validation ───────────────────────────────────────────────────

const FIREBASE_UID = /^[A-Za-z0-9_-]{1,128}$/
const POSITION_ID = /^[A-Za-z0-9_-]{1,64}$/
const SYMBOL = /^[A-Za-z0-9._-]{1,20}$/

/**
 * Firebase UIDs never contain a slash. External input that becomes a Firestore
 * document path must be checked, because `.doc()` accepts a slash-separated
 * relative path and will happily build a deeper path than intended.
 */
export function isValidUid(value: unknown): value is string {
  return typeof value === 'string' && FIREBASE_UID.test(value)
}

export function isValidAccountId(value: unknown): value is string {
  return typeof value === 'string' && FIREBASE_UID.test(value)
}

export type SyncPayload = {
  event: 'open' | 'close'
  positionId: string
  symbol: string
  direction: 'BUY' | 'SELL'
  lots: number
  price: number
  // Fallback open price for a close event with no prior open record, used to
  // derive pips. Omitting it from the validated payload would silently break
  // pip calculation on partial closes.
  openPrice: number | undefined
  profit: number
  commission: number
  swap: number
  comment: string
  ticket: string | null
  time: string | null
  source?: string
}

/**
 * Validates and coerces an MT5 / TradingView webhook payload.
 *
 * `positionId` is the important one: it is interpolated into a Firestore
 * document id, and `.doc('pos_a/b/c')` resolves to a nested subcollection
 * document rather than the intended trade. Firestore rejects `.`/`..` segments
 * so this cannot escape the caller's own tree, but it does create documents
 * that `/api/reset-trades` never deletes — an erasure gap.
 *
 * Returns null when the payload is unusable, so callers answer 400 rather than
 * writing a half-valid document.
 */
export function validateSyncPayload(body: any): SyncPayload | null {
  if (!body || typeof body !== 'object') return null

  const event = body.event
  if (event !== 'open' && event !== 'close') return null

  // Type-strict rather than coerced. `String(value)` on an object invokes a
  // caller-supplied toString(), so an attacker chooses what the validator
  // inspects; requiring a primitive removes that indirection entirely.
  const isPrimitiveId = (value: unknown) => typeof value === 'string' || typeof value === 'number'
  if (!isPrimitiveId(body.positionId) || !isPrimitiveId(body.symbol)) return null

  const positionId = String(body.positionId)
  if (!POSITION_ID.test(positionId)) return null

  const symbol = String(body.symbol)
  if (!SYMBOL.test(symbol)) return null

  if (body.comment != null && typeof body.comment !== 'string') return null
  const comment = String(body.comment ?? '')
  if (comment.length > 500) return null

  const clampNumber = (value: unknown, min: number, max: number) => {
    const parsed = Number(value)
    if (!Number.isFinite(parsed)) return 0
    return Math.min(Math.max(parsed, min), max)
  }

  const rawDirection = String(body.direction ?? '').toUpperCase()

  return {
    event,
    positionId,
    symbol,
    direction: rawDirection === 'SELL' ? 'SELL' : 'BUY',
    lots: clampNumber(body.lots, 0, 1000),
    price: clampNumber(body.price, 0, 10_000_000),
    openPrice: body.openPrice == null ? undefined : clampNumber(body.openPrice, 0, 10_000_000),
    profit: clampNumber(body.profit, -10_000_000, 10_000_000),
    commission: clampNumber(body.commission, -1_000_000, 1_000_000),
    swap: clampNumber(body.swap, -1_000_000, 1_000_000),
    comment,
    ticket: body.ticket == null ? null : String(body.ticket).slice(0, 64),
    time: body.time == null ? null : String(body.time).slice(0, 64),
    source: body.source == null ? undefined : String(body.source).slice(0, 32),
  }
}

// ── reCAPTCHA Enterprise ────────────────────────────────────────────────────

/**
 * Verifies a reCAPTCHA Enterprise token server-side.
 *
 * This is deliberately a helper and not an endpoint. The previous
 * `/api/auth-utils` `action: 'recaptcha'` route returned the verdict to the
 * caller, which means the caller decides whether to honour it — and it let any
 * anonymous request spend a billable assessment against the project's API key.
 *
 * Enforcement is enabled by configuring RECAPTCHA_API_KEY and
 * VITE_RECAPTCHA_SITE_KEY. When either is absent the caller is told so
 * explicitly rather than being silently waved through, so the operator can
 * decide whether that endpoint should still accept traffic.
 */
export type RecaptchaResult = { ok: boolean; configured: boolean; reason?: string }

export function isRecaptchaConfigured(): boolean {
  return Boolean(process.env.RECAPTCHA_API_KEY && process.env.VITE_RECAPTCHA_SITE_KEY)
}

export async function verifyRecaptcha(token: unknown, expectedAction: string): Promise<RecaptchaResult> {
  const apiKey = process.env.RECAPTCHA_API_KEY
  const siteKey = process.env.VITE_RECAPTCHA_SITE_KEY
  if (!apiKey || !siteKey) {
    return { ok: false, configured: false, reason: 'not-configured' }
  }
  if (!token || typeof token !== 'string') {
    return { ok: false, configured: true, reason: 'missing-token' }
  }

  const projectId = process.env.VITE_FIREBASE_PROJECT_ID || 'xaujournal29'
  try {
    const response = await fetch(
      `https://recaptchaenterprise.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/assessments`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Header, not a query string: query strings are recorded in proxy
          // logs, error traces, and APM spans.
          'X-Goog-Api-Key': apiKey,
        },
        body: JSON.stringify({ event: { token, siteKey, expectedAction } }),
      },
    )
    if (!response.ok) return { ok: false, configured: true, reason: `http-${response.status}` }

    const data: any = await response.json()
    const valid = data?.tokenProperties?.valid === true
    // Pinning the action stops a token minted for one flow being replayed into
    // another (e.g. a low-friction page's token reused against signup).
    const actionMatches = data?.tokenProperties?.action === expectedAction
    const score = data?.riskAnalysis?.score ?? 0

    if (!valid) return { ok: false, configured: true, reason: 'invalid-token' }
    if (!actionMatches) return { ok: false, configured: true, reason: 'action-mismatch' }
    if (score < 0.5) return { ok: false, configured: true, reason: 'low-score' }
    return { ok: true, configured: true }
  } catch (err: any) {
    // Fail closed: a verification we could not complete is not a pass.
    console.error('[recaptcha] assessment failed:', err?.message)
    return { ok: false, configured: true, reason: 'assessment-error' }
  }
}
