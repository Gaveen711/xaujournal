import { Hono, type Context, type MiddlewareHandler } from 'hono'
import { getPlatformAnalytics, getUserAnalytics } from './_adminAnalytics.js'
import {
  AdminHttpError,
  adminErrorResponse,
  categoryForStatus,
  requestIdMiddleware,
} from './_adminErrors.js'
import { listAdminUsers } from './_adminUsers.js'
import { isSettledPaymentStatus, normalizedPaymentStatus } from './_adminPolicy.js'

const ADMIN_EMAIL = 'admin@xaujournal.com'
const ADMIN_UID = 'rbGsMM2A2EdhgKLKLf9y0dGJ7RY2'
const AUDIT_COLLECTION = 'adminAuditLogs'
const SETTINGS_DOCUMENT = 'platform'
const DEFAULT_PAGE_SIZE = 50
const MAX_PAGE_SIZE = 100
const MAX_BODY_BYTES = 32 * 1024

const PAYPAL_SUBSCRIPTION_DETAIL_FIELDS = [
  'subscriptionId', 'paypalSubscriptionId', 'planId', 'paypalPlanId',
  'payerEmail', 'paypalPayerEmail', 'customerId', 'payerId', 'paypalPayerId',
  'status', 'paypalStatus', 'subscriptionStatus', 'autoRenew',
  'billingCycles', 'cycleExecutions', 'nextBillingAt', 'nextBillingTime', 'nextBillingDate',
  'latestCaptureId', 'captureId', 'latestOrderId', 'orderId',
  'currentPeriodStart', 'currentPeriodEnd', 'startedAt', 'expiresAt', 'canceledAt',
  'createdAt', 'updatedAt',
] as const

type AdminActor = { uid: string; email: string; authTime: number; secondFactor?: string }

export type AdminDependencies = {
  admin: any
  db: any
  now: () => any
  invalidateUserCache?: (uid: string) => Promise<void>
  invalidateApiKeyCache?: (keyId: string, uid: string) => Promise<void>
  consumeAdminRateLimit?: (
    scope: string,
    actorUid: string,
    limit: number,
    windowSeconds: number,
  ) => Promise<{ available: boolean; allowed: boolean; remaining: number; retryAfter: number }>
}

const USER_FIELDS = [
  'firstName', 'lastName', 'displayName', 'photoURL', 'country', 'plan',
  'isTrial', 'planExpiry', 'graceUntil', 'graceReason', 'mt5SyncEnabled',
  'totalTradesLogged', 'totalJournalsLogged', 'analyticsBackfillState',
  'requiresEmailVerification', 'paypalSubscriptionId', 'subscriptionId', 'paypalPlanId', 'planId',
  'payerEmail', 'paypalPayerEmail', 'paypalPayerId', 'payerId', 'customerId',
  'subscriptionStatus', 'paypalStatus', 'paymentStatus', 'autoRenew', 'billingCycles', 'cycleExecutions',
  'nextBillingAt', 'nextBillingTime', 'nextBillingDate', 'latestCaptureId', 'captureId',
  'latestOrderId', 'orderId', 'currentPeriodStart', 'currentPeriodEnd', 'createdAt', 'updatedAt', 'lastTradeTime',
  'deletionState', 'deletionRequestedAt',
] as const

const SUBSCRIPTION_FIELDS = [
  'plan', 'isTrial', 'planExpiry', 'graceUntil', 'graceReason',
  'subscription', 'paypalSubscriptionId', 'subscriptionId', 'paypalPlanId', 'planId',
  'payerEmail', 'paypalPayerEmail', 'paypalPayerId', 'payerId', 'customerId',
  'subscriptionStatus', 'paypalStatus', 'paymentStatus', 'autoRenew', 'billingCycles', 'cycleExecutions',
  'nextBillingAt', 'nextBillingTime', 'nextBillingDate', 'latestCaptureId', 'captureId',
  'latestOrderId', 'orderId', 'currentPeriodStart', 'currentPeriodEnd', 'mt5SyncEnabled',
  'createdAt', 'updatedAt',
] as const

const PAYMENT_FIELDS = [
  'userId', 'userName', 'userEmail', 'email', 'paypalSubscriptionId', 'subscriptionId',
  'paypalPlanId', 'planId', 'payerEmail', 'paypalPayerEmail', 'paypalPayerId', 'payerId', 'customerId',
  'billingCycles', 'cycleExecutions', 'nextBillingAt', 'nextBillingTime', 'nextBillingDate',
  'latestCaptureId', 'captureId', 'latestOrderId', 'orderId',
  'amount', 'refundedAmount', 'currency', 'status', 'paypalStatus', 'paymentStatus',
  'type', 'description', 'createdAt', 'updatedAt', 'paidAt', 'refundedAt',
] as const

const REPORT_FIELDS = [
  'userId', 'type', 'subject', 'body', 'tradeId', 'status', 'priority',
  'assigneeUid', 'resolutionNote', 'createdAt', 'updatedAt', 'resolvedAt',
] as const

const COUPON_FIELDS = [
  'code', 'description', 'discountType', 'discountValue', 'currency',
  'maxRedemptions', 'redeemedCount', 'active', 'expiresAt', 'createdAt',
  'updatedAt',
] as const

const ANNOUNCEMENT_FIELDS = [
  'title', 'body', 'audience', 'status', 'level', 'linkUrl', 'dismissible',
  'startsAt', 'endsAt', 'createdAt', 'updatedAt', 'publishedAt',
] as const

const SETTINGS_FIELDS = [
  'maintenanceMode', 'signupsEnabled', 'supportEmail', 'trialDays',
  'announcementBannerEnabled', 'reportsEnabled', 'updatedAt',
] as const

function isRecord(value: unknown): value is Record<string, any> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function publicValue(value: any): any {
  if (value === null || value === undefined) return value
  if (value instanceof Date) return value.toISOString()
  if (typeof value?.toDate === 'function') {
    const date = value.toDate()
    return date instanceof Date && !Number.isNaN(date.getTime()) ? date.toISOString() : null
  }
  if (Array.isArray(value)) return value.map(publicValue)
  if (isRecord(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, child]) => [key, publicValue(child)]),
    )
  }
  return value
}

function pickFields(source: Record<string, any>, fields: readonly string[]): Record<string, any> {
  const output: Record<string, any> = {}
  for (const field of fields) {
    if (Object.prototype.hasOwnProperty.call(source, field) && source[field] !== undefined) {
      output[field] = publicValue(source[field])
    }
  }
  return output
}

function publicDocument(doc: any, fields: readonly string[]): Record<string, any> {
  return { id: doc.id, ...pickFields(doc.data() || {}, fields) }
}

function publicAuthUser(user: any, userData: Record<string, any> = {}): Record<string, any> {
  const subscription = isRecord(userData.subscription)
    ? pickFields(userData.subscription, PAYPAL_SUBSCRIPTION_DETAIL_FIELDS)
    : undefined
  return {
    id: user.uid,
    uid: user.uid,
    email: user.email || null,
    emailVerified: user.emailVerified === true,
    disabled: user.disabled === true,
    displayName: user.displayName || userData.displayName || null,
    photoURL: user.photoURL || userData.photoURL || null,
    providerIds: Array.isArray(user.providerData)
      ? user.providerData.map((provider: any) => String(provider.providerId)).slice(0, 10)
      : [],
    createdAt: user.metadata?.creationTime || publicValue(userData.createdAt) || null,
    lastSignInAt: user.metadata?.lastSignInTime || null,
    isAdmin: user.customClaims?.admin === true,
    ...pickFields(userData, USER_FIELDS),
    ...(subscription ? { subscription } : {}),
  }
}

function assertIdentifier(value: unknown, label = 'id'): string {
  if (typeof value !== 'string' || value.length < 1 || value.length > 128 || value === '.' || value === '..' || /[\/\u0000-\u001f]/.test(value)) {
    throw new AdminHttpError(400, `Invalid ${label}`)
  }
  return value
}

function pageSize(c: Context): number {
  const raw = c.req.query('limit')
  if (raw === undefined) return DEFAULT_PAGE_SIZE
  if (!/^\d{1,3}$/.test(raw)) throw new AdminHttpError(400, 'Invalid limit')
  const parsed = Number(raw)
  if (parsed < 1 || parsed > MAX_PAGE_SIZE) throw new AdminHttpError(400, `limit must be between 1 and ${MAX_PAGE_SIZE}`)
  return parsed
}

function firestorePageToken(id: string): string {
  return Buffer.from(JSON.stringify({ v: 1, id }), 'utf8').toString('base64url')
}

function parseFirestorePageToken(raw: string | undefined): string | null {
  if (!raw) return null
  if (raw.length > 512 || !/^[A-Za-z0-9_-]+$/.test(raw)) throw new AdminHttpError(400, 'Invalid pageToken')
  try {
    const decoded = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8'))
    if (!isRecord(decoded) || decoded.v !== 1) throw new Error('invalid token version')
    return assertIdentifier(decoded.id, 'pageToken')
  } catch {
    throw new AdminHttpError(400, 'Invalid pageToken')
  }
}

async function listDocuments(
  c: Context,
  deps: AdminDependencies,
  collectionName: string,
  fields: readonly string[],
  filters: Array<[string, FirebaseFirestore.WhereFilterOp, any]> = [],
): Promise<{ data: Record<string, any>[]; nextPageToken?: string }> {
  const limit = pageSize(c)
  const cursor = parseFirestorePageToken(c.req.query('pageToken'))
  let query: any = deps.db.collection(collectionName)
  for (const [field, op, value] of filters) query = query.where(field, op, value)
  query = query.orderBy(deps.admin.firestore.FieldPath.documentId())
  if (cursor) query = query.startAfter(cursor)
  const snapshot = await query.limit(limit + 1).get()
  const pageDocs = snapshot.docs.slice(0, limit)
  const response: { data: Record<string, any>[]; nextPageToken?: string } = {
    data: pageDocs.map((doc: any) => publicDocument(doc, fields)),
  }
  if (snapshot.docs.length > limit && pageDocs.length > 0) {
    response.nextPageToken = firestorePageToken(pageDocs[pageDocs.length - 1].id)
  }
  return response
}

async function readBody(c: Context): Promise<Record<string, any>> {
  const contentLength = Number(c.req.header('content-length') || 0)
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
    throw new AdminHttpError(413, 'Request body too large')
  }
  const body = await c.req.json().catch(() => null)
  if (!isRecord(body)) throw new AdminHttpError(400, 'Invalid JSON body')
  return body
}

function assertOnlyFields(body: Record<string, any>, allowed: readonly string[]): void {
  const unknown = Object.keys(body).filter((key) => !allowed.includes(key))
  if (unknown.length > 0) throw new AdminHttpError(400, `Unsupported field: ${unknown[0]}`)
}

function requiredReason(body: Record<string, any>): string {
  if (typeof body.reason !== 'string') throw new AdminHttpError(400, 'reason is required')
  const reason = body.reason.trim().replace(/[\r\n]+/g, ' ')
  const meaningfulWords = reason.match(/[\p{L}\p{N}]{2,}/gu) || []
  if (reason.length < 10 || reason.length > 500 || meaningfulWords.length < 2) {
    throw new AdminHttpError(400, 'reason must be a specific explanation between 10 and 500 characters', 'INVALID_REASON')
  }
  return reason
}

function boundedString(value: unknown, field: string, max: number, nullable = false): string | null {
  if (nullable && value === null) return null
  if (typeof value !== 'string') throw new AdminHttpError(400, `${field} must be a string`)
  const result = value.trim()
  if (!result || result.length > max) throw new AdminHttpError(400, `${field} is invalid`)
  return result
}

function nullableIso(value: unknown, field: string): string | null {
  if (value === null || value === '') return null
  if (typeof value !== 'string' || value.length > 40) throw new AdminHttpError(400, `${field} must be an ISO date or null`)
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) throw new AdminHttpError(400, `${field} must be an ISO date or null`)
  return date.toISOString()
}

function booleanValue(value: unknown, field: string): boolean {
  if (typeof value !== 'boolean') throw new AdminHttpError(400, `${field} must be a boolean`)
  return value
}

function finiteNumber(value: unknown, field: string, min: number, max: number, integer = false): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max || (integer && !Number.isInteger(value))) {
    throw new AdminHttpError(400, `${field} is invalid`)
  }
  return value
}

function enumValue<T extends string>(value: unknown, field: string, values: readonly T[]): T {
  if (typeof value !== 'string' || !values.includes(value as T)) {
    throw new AdminHttpError(400, `${field} is invalid`)
  }
  return value as T
}

function actorFrom(c: Context): AdminActor {
  return c.get('adminActor') as AdminActor
}

function auditData(
  deps: AdminDependencies,
  actor: AdminActor,
  action: string,
  targetType: string,
  targetId: string,
  reason: string,
  status = 'completed',
  requestId?: string,
): Record<string, any> {
  return {
    actor: {
      uid: actor.uid,
      email: actor.email,
      authTime: actor.authTime,
      ...(actor.secondFactor ? { secondFactor: actor.secondFactor } : {}),
    },
    action,
    target: { type: targetType, id: targetId },
    reason,
    timestamp: deps.now(),
    status,
    ...(requestId ? { requestId } : {}),
  }
}

function auditDataFor(
  c: Context,
  deps: AdminDependencies,
  actor: AdminActor,
  action: string,
  targetType: string,
  targetId: string,
  reason: string,
  status = 'completed',
): Record<string, any> {
  return auditData(deps, actor, action, targetType, targetId, reason, status, c.get('requestId'))
}

async function auditSensitiveRead(
  c: Context,
  deps: AdminDependencies,
  action: string,
  targetType: string,
  targetId: string,
): Promise<void> {
  await deps.db.collection(AUDIT_COLLECTION).doc().set(auditDataFor(
    c,
    deps,
    actorFrom(c),
    action,
    targetType,
    targetId,
    'Sensitive administrative data viewed',
  ))
}

function requireRecentAdminAuthentication(c: Context, maxAgeSeconds = 10 * 60): void {
  const authTime = actorFrom(c).authTime
  const nowSeconds = Math.floor(Date.now() / 1000)
  const ageSeconds = nowSeconds - authTime
  if (!Number.isFinite(authTime) || authTime <= 0 || ageSeconds < -300 || ageSeconds > maxAgeSeconds) {
    throw new AdminHttpError(
      403,
      'Recent administrator authentication is required for this action',
      'RECENT_AUTH_REQUIRED',
    )
  }
}

function requireAdmin(deps: AdminDependencies): MiddlewareHandler {
  return async (c, next) => {
    const authHeader = c.req.header('Authorization') || ''
    const match = /^Bearer ([^\s]+)$/.exec(authHeader)
    if (!match) return adminErrorResponse(c, 401, 'AUTHENTICATION_REQUIRED', 'Authentication required', 'session')

    let decoded: any
    try {
      // checkRevoked=true also detects disabled/revoked admin sessions.
      decoded = await deps.admin.auth().verifyIdToken(match[1], true)
    } catch (error: any) {
      console.warn('[admin-auth] Token verification failed', {
        requestId: c.get('requestId'),
        code: error?.code,
      })
      return adminErrorResponse(c, 401, 'INVALID_SESSION', 'Invalid or expired token', 'session')
    }

    if (decoded.uid !== ADMIN_UID) return adminErrorResponse(c, 403, 'ADMIN_ACCESS_DENIED', 'Admin access denied', 'authorization')
    if (decoded.email_verified !== true) return adminErrorResponse(c, 403, 'ADMIN_EMAIL_UNVERIFIED', 'Verified admin email required', 'authorization')
    if (decoded.email !== ADMIN_EMAIL) return adminErrorResponse(c, 403, 'ADMIN_ACCESS_DENIED', 'Admin access denied', 'authorization')
    if (decoded.admin !== true) return adminErrorResponse(c, 403, 'ADMIN_ACCESS_DENIED', 'Admin access denied', 'authorization')

    // A valid ID token can remain usable briefly after an email, verification,
    // disabled-state, or custom-claim change. With one administrator, the
    // extra Auth lookup is cheap and makes revocation effective immediately.
    let currentUser: any
    try {
      currentUser = await deps.admin.auth().getUser(String(decoded.uid))
    } catch (error: any) {
      console.warn('[admin-auth] Current user lookup failed', {
        requestId: c.get('requestId'),
        code: error?.code,
      })
      return adminErrorResponse(c, 403, 'ADMIN_ACCESS_DENIED', 'Admin access denied', 'authorization')
    }
    if (
      currentUser.disabled === true
      || currentUser.uid !== ADMIN_UID
      || currentUser.emailVerified !== true
      || String(currentUser.email || '').trim().toLowerCase() !== ADMIN_EMAIL
      || currentUser.customClaims?.admin !== true
    ) {
      return adminErrorResponse(c, 403, 'ADMIN_ACCESS_DENIED', 'Admin access denied', 'authorization')
    }

    const authTime = Number(decoded.auth_time)
    const secondFactor = typeof decoded.firebase?.sign_in_second_factor === 'string'
      ? decoded.firebase.sign_in_second_factor
      : undefined
    c.set('adminActor', {
      uid: currentUser.uid,
      email: ADMIN_EMAIL,
      authTime: Number.isFinite(authTime) ? authTime : 0,
      ...(secondFactor ? { secondFactor } : {}),
    })
    await next()
  }
}

function adminActorRateLimit(deps: AdminDependencies): MiddlewareHandler {
  return async (c, next) => {
    if (!deps.consumeAdminRateLimit) return next()
    const method = c.req.method.toUpperCase()
    const path = c.req.path
    const mutation = method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS'
    const analytics = /\/analytics(?:\/|$)/.test(path)
    const policy = mutation
      ? { scope: 'mutation', limit: 30, windowSeconds: 60 }
      : analytics
        ? { scope: 'analytics', limit: 60, windowSeconds: 60 }
        : { scope: 'read', limit: 120, windowSeconds: 60 }
    const result = await deps.consumeAdminRateLimit(
      policy.scope,
      actorFrom(c).uid,
      policy.limit,
      policy.windowSeconds,
    )
    c.header('X-Admin-RateLimit-Limit', String(policy.limit))
    c.header('X-Admin-RateLimit-Remaining', String(Math.max(0, result.remaining)))
    if (!result.available) {
      if (mutation) {
        throw new AdminHttpError(503, 'Admin mutation safety service is unavailable', 'RATE_LIMIT_UNAVAILABLE')
      }
      c.header('X-Admin-RateLimit-Status', 'unavailable')
      return next()
    }
    if (!result.allowed) {
      c.header('Retry-After', String(Math.max(1, result.retryAfter)))
      throw new AdminHttpError(429, 'Too many admin requests. Try again later.', 'RATE_LIMITED')
    }
    return next()
  }
}

async function authUserOr404(deps: AdminDependencies, uid: string): Promise<any> {
  try {
    return await deps.admin.auth().getUser(uid)
  } catch (error: any) {
    if (error?.code === 'auth/user-not-found') {
      throw new AdminHttpError(404, 'User not found', 'USER_NOT_FOUND')
    }
    throw error
  }
}

async function countOf(query: any): Promise<number> {
  const snapshot = await query.count().get()
  return Number(snapshot.data().count || 0)
}

async function deleteQueryInBatches(deps: AdminDependencies, query: any): Promise<string[]> {
  const ids: string[] = []
  while (true) {
    const snapshot = await query.limit(400).get()
    if (snapshot.empty) return ids
    const batch = deps.db.batch()
    snapshot.docs.forEach((doc: any) => {
      ids.push(doc.id)
      batch.delete(doc.ref)
    })
    await batch.commit()
    if (snapshot.docs.length < 400) return ids
  }
}

function userPatch(body: Record<string, any>): { firestore: Record<string, any>; auth: Record<string, any> } {
  assertOnlyFields(body, ['reason', 'plan', 'planExpiry', 'graceUntil', 'graceReason', 'isTrial', 'mt5SyncEnabled', 'disabled'])
  const firestore: Record<string, any> = {}
  const auth: Record<string, any> = {}
  if ('plan' in body) firestore.plan = enumValue(body.plan, 'plan', ['free', 'pro', 'grace'])
  if ('planExpiry' in body) firestore.planExpiry = nullableIso(body.planExpiry, 'planExpiry')
  if ('graceUntil' in body) firestore.graceUntil = nullableIso(body.graceUntil, 'graceUntil')
  if ('graceReason' in body) firestore.graceReason = body.graceReason === null ? null : boundedString(body.graceReason, 'graceReason', 300)
  if ('isTrial' in body) firestore.isTrial = booleanValue(body.isTrial, 'isTrial')
  if ('mt5SyncEnabled' in body) firestore.mt5SyncEnabled = booleanValue(body.mt5SyncEnabled, 'mt5SyncEnabled')
  if ('disabled' in body) {
    auth.disabled = booleanValue(body.disabled, 'disabled')
    if (auth.disabled === false) {
      firestore.deletionState = null
      firestore.deletionRequestedAt = null
      firestore.deletionRequestedBy = null
    }
  }
  if (Object.keys(firestore).length + Object.keys(auth).length === 0) throw new AdminHttpError(400, 'No mutable fields supplied')
  return { firestore, auth }
}

function reportPatch(body: Record<string, any>): Record<string, any> {
  assertOnlyFields(body, ['reason', 'status', 'priority', 'assigneeUid', 'resolutionNote'])
  const patch: Record<string, any> = {}
  if ('status' in body) patch.status = enumValue(body.status, 'status', ['open', 'in_review', 'resolved', 'dismissed'])
  if ('priority' in body) patch.priority = enumValue(body.priority, 'priority', ['low', 'medium', 'high'])
  if ('assigneeUid' in body) patch.assigneeUid = body.assigneeUid === null ? null : assertIdentifier(body.assigneeUid, 'assigneeUid')
  if ('resolutionNote' in body) patch.resolutionNote = body.resolutionNote === null ? null : boundedString(body.resolutionNote, 'resolutionNote', 2000)
  if (Object.keys(patch).length === 0) throw new AdminHttpError(400, 'No mutable fields supplied')
  return patch
}

function couponPatch(body: Record<string, any>, creating: boolean): Record<string, any> {
  const allowed = ['reason', ...(creating ? ['code'] : []), 'description', 'discountType', 'discountValue', 'currency', 'maxRedemptions', 'active', 'expiresAt']
  assertOnlyFields(body, allowed)
  const patch: Record<string, any> = {}
  if (creating || 'code' in body) {
    const code = boundedString(body.code, 'code', 32) as string
    if (!/^[A-Z0-9][A-Z0-9_-]{2,31}$/.test(code)) throw new AdminHttpError(400, 'code must be 3-32 uppercase letters, numbers, underscores, or hyphens')
    patch.code = code
  }
  if ('description' in body) patch.description = body.description === null ? null : boundedString(body.description, 'description', 500)
  if ('discountType' in body) patch.discountType = enumValue(body.discountType, 'discountType', ['percent', 'fixed'])
  if ('discountValue' in body) patch.discountValue = finiteNumber(body.discountValue, 'discountValue', 0.01, 1_000_000)
  if ('currency' in body) {
    const currency = boundedString(body.currency, 'currency', 3) as string
    if (!/^[A-Z]{3}$/.test(currency)) throw new AdminHttpError(400, 'currency must be a three-letter uppercase code')
    patch.currency = currency
  }
  if ('maxRedemptions' in body) patch.maxRedemptions = finiteNumber(body.maxRedemptions, 'maxRedemptions', 1, 1_000_000, true)
  if ('active' in body) patch.active = booleanValue(body.active, 'active')
  if ('expiresAt' in body) patch.expiresAt = nullableIso(body.expiresAt, 'expiresAt')
  if (!creating && Object.keys(patch).length === 0) throw new AdminHttpError(400, 'No mutable fields supplied')
  return patch
}

function validateCouponDiscount(patch: Record<string, any>, existing: Record<string, any> = {}): void {
  const type = patch.discountType ?? existing.discountType
  const value = patch.discountValue ?? existing.discountValue
  if (!type || typeof value !== 'number') throw new AdminHttpError(400, 'discountType and discountValue are required')
  if (type === 'percent' && value > 100) throw new AdminHttpError(400, 'percent discountValue cannot exceed 100')
  if (type === 'fixed' && !(patch.currency ?? existing.currency)) throw new AdminHttpError(400, 'currency is required for fixed discounts')
}

function announcementPatch(body: Record<string, any>, creating: boolean): Record<string, any> {
  assertOnlyFields(body, ['reason', 'title', 'body', 'audience', 'status', 'level', 'linkUrl', 'dismissible', 'startsAt', 'endsAt'])
  const patch: Record<string, any> = {}
  if ('title' in body) patch.title = boundedString(body.title, 'title', 160)
  if ('body' in body) patch.body = boundedString(body.body, 'body', 5000)
  if ('audience' in body) patch.audience = enumValue(body.audience, 'audience', ['all', 'free', 'pro'])
  if ('status' in body) patch.status = enumValue(body.status, 'status', ['draft', 'published', 'archived'])
  if ('level' in body) patch.level = enumValue(body.level, 'level', ['info', 'warning', 'critical'])
  if ('linkUrl' in body) {
    if (body.linkUrl === null || body.linkUrl === '') patch.linkUrl = null
    else {
      const link = boundedString(body.linkUrl, 'linkUrl', 2048) as string
      if (!(link.startsWith('/') && !link.startsWith('//'))) {
        try {
          if (new URL(link).protocol !== 'https:') throw new Error('protocol')
        } catch {
          throw new AdminHttpError(400, 'linkUrl must be an HTTPS URL or an absolute site path')
        }
      }
      patch.linkUrl = link
    }
  }
  if ('dismissible' in body) patch.dismissible = booleanValue(body.dismissible, 'dismissible')
  if ('startsAt' in body) patch.startsAt = nullableIso(body.startsAt, 'startsAt')
  if ('endsAt' in body) patch.endsAt = nullableIso(body.endsAt, 'endsAt')
  if (creating && (!patch.title || !patch.body)) throw new AdminHttpError(400, 'title and body are required')
  if (!creating && Object.keys(patch).length === 0) throw new AdminHttpError(400, 'No mutable fields supplied')
  return patch
}

function validateAnnouncementWindow(patch: Record<string, any>, existing: Record<string, any> = {}): void {
  const startsAt = patch.startsAt !== undefined ? patch.startsAt : publicValue(existing.startsAt)
  const endsAt = patch.endsAt !== undefined ? patch.endsAt : publicValue(existing.endsAt)
  if (startsAt && endsAt && startsAt >= endsAt) throw new AdminHttpError(400, 'endsAt must be after startsAt')
}

function settingsPatch(body: Record<string, any>): Record<string, any> {
  assertOnlyFields(body, ['reason', 'maintenanceMode', 'signupsEnabled', 'supportEmail', 'trialDays', 'announcementBannerEnabled', 'reportsEnabled'])
  const patch: Record<string, any> = {}
  for (const field of ['maintenanceMode', 'signupsEnabled', 'announcementBannerEnabled', 'reportsEnabled']) {
    if (field in body) patch[field] = booleanValue(body[field], field)
  }
  if ('supportEmail' in body) {
    const email = boundedString(body.supportEmail, 'supportEmail', 254) as string
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) throw new AdminHttpError(400, 'supportEmail is invalid')
    patch.supportEmail = email
  }
  if ('trialDays' in body) patch.trialDays = finiteNumber(body.trialDays, 'trialDays', 0, 30, true)
  if (Object.keys(patch).length === 0) throw new AdminHttpError(400, 'No mutable fields supplied')
  return patch
}

/**
 * Builds the isolated admin router. All data serializers and mutation schemas
 * are allowlists; adding a Firestore field never exposes or makes it writable.
 */
export function createAdminApi(deps: AdminDependencies) {
  const app = new Hono<{ Variables: { adminActor: AdminActor; requestId: string } }>()

  app.use('*', requestIdMiddleware)
  app.use('*', async (c, next) => {
    c.header('Cache-Control', 'private, no-store, max-age=0')
    c.header('Pragma', 'no-cache')
    c.header('Vary', 'Origin, Authorization')
    await next()
  })
  app.use('*', requireAdmin(deps))
  app.use('*', adminActorRateLimit(deps))

  app.get('/health', async (c) => {
    const serverTime = new Date().toISOString()
    let databaseStatus: 'available' | 'unavailable' = 'available'
    try {
      // A single fixed-document read verifies the Admin SDK/Firestore path
      // without returning settings or scanning customer data.
      await deps.db.collection('settings').doc(SETTINGS_DOCUMENT).get()
    } catch (error: any) {
      databaseStatus = 'unavailable'
      console.error('[admin-health] Database check failed', {
        requestId: c.get('requestId'),
        code: error?.code,
      })
    }
    return c.json({ data: {
      available: databaseStatus === 'available',
      availability: databaseStatus === 'available' ? 'available' : 'degraded',
      status: databaseStatus === 'available' ? 'ok' : 'degraded',
      serverTime,
      generatedAt: serverTime,
      checks: [
        { name: 'authentication', status: 'available' },
        { name: 'database', status: databaseStatus },
      ],
    } })
  })

  app.get('/overview', async (c) => {
    const users = deps.db.collection('users')
    const payments = deps.db.collection('payments')
    const reports = deps.db.collection('reports')
    const [totalUsers, activeSubscriptions, totalPayments, openReports] = await Promise.all([
      countOf(users),
      countOf(users.where('plan', '==', 'pro')),
      countOf(payments),
      countOf(reports.where('status', '==', 'open')),
    ])
    return c.json({ data: { totalUsers, activeSubscriptions, totalPayments, openReports, generatedAt: new Date().toISOString() } })
  })

  app.get('/users', async (c) => {
    const limit = pageSize(c)
    const rawSearch = c.req.query('search')
    const search = rawSearch?.trim().toLowerCase()
    if (search && search.length > 128) throw new AdminHttpError(400, 'search is too long', 'INVALID_SEARCH')
    const rawPlan = c.req.query('plan')
    const rawStatus = c.req.query('status')
    const plan = rawPlan
      ? enumValue(rawPlan.toUpperCase(), 'plan', ['FREE', 'PRO', 'GRACE']).toLowerCase() as 'free' | 'pro' | 'grace'
      : undefined
    const status = rawStatus
      ? enumValue(rawStatus.toUpperCase(), 'status', ['ACTIVE', 'SUSPENDED']).toLowerCase() as 'active' | 'suspended'
      : undefined
    const response = await listAdminUsers(deps, {
      limit,
      pageToken: c.req.query('pageToken'),
      search: search || undefined,
      plan,
      status,
    }, publicAuthUser)
    await auditSensitiveRead(c, deps, 'users.directory.read', 'directory', 'users')
    return c.json(response)
  })

  app.get('/users/:uid/analytics', async (c) => {
    const uid = assertIdentifier(c.req.param('uid'), 'user uid')
    await authUserOr404(deps, uid)
    const response = await getUserAnalytics(c, deps, uid, pageSize(c))
    await auditSensitiveRead(c, deps, 'user.analytics.read', 'user', uid)
    return c.json(response)
  })

  app.get('/users/:uid', async (c) => {
    const uid = assertIdentifier(c.req.param('uid'), 'user uid')
    const user = await authUserOr404(deps, uid)
    const doc = await deps.db.collection('users').doc(user.uid).get()
    await auditSensitiveRead(c, deps, 'user.detail.read', 'user', uid)
    return c.json({ data: publicAuthUser(user, doc.exists ? doc.data() || {} : {}) })
  })

  app.patch('/users/:id', async (c) => {
    const id = assertIdentifier(c.req.param('id'), 'user id')
    const body = await readBody(c)
    const reason = requiredReason(body)
    const patch = userPatch(body)
    const actor = actorFrom(c)
    requireRecentAdminAuthentication(c)
    const target = await authUserOr404(deps, id)
    if (patch.auth.disabled === true && id === actor.uid) throw new AdminHttpError(409, 'You cannot disable your own admin account')

    const auditRef = deps.db.collection(AUDIT_COLLECTION).doc()
    await auditRef.set(auditDataFor(c, deps, actor, 'user.update', 'user', id, reason, 'started'))
    try {
      if (Object.keys(patch.auth).length > 0) await deps.admin.auth().updateUser(id, patch.auth)
      if (Object.keys(patch.firestore).length > 0) {
        await deps.db.collection('users').doc(id).set({ ...patch.firestore, updatedAt: deps.now() }, { merge: true })
      }
      await auditRef.update({ status: 'completed', completedAt: deps.now() })
      if ('plan' in patch.firestore || 'graceUntil' in patch.firestore || 'planExpiry' in patch.firestore) {
        await deps.invalidateUserCache?.(id)
      }
    } catch (error) {
      await auditRef.update({ status: 'failed', completedAt: deps.now() }).catch(() => undefined)
      throw error
    }

    const [updatedUser, updatedDoc] = await Promise.all([
      deps.admin.auth().getUser(target.uid),
      deps.db.collection('users').doc(id).get(),
    ])
    return c.json({ data: publicAuthUser(updatedUser, updatedDoc.exists ? updatedDoc.data() || {} : {}) })
  })

  app.delete('/users/:id', async (c) => {
    const id = assertIdentifier(c.req.param('id'), 'user id')
    const body = await readBody(c)
    assertOnlyFields(body, ['reason'])
    const reason = requiredReason(body)
    const actor = actorFrom(c)
    requireRecentAdminAuthentication(c)
    if (id === actor.uid) throw new AdminHttpError(409, 'You cannot delete your own admin account')

    const target = await authUserOr404(deps, id)
    if (target.customClaims?.admin === true || target.email === ADMIN_EMAIL) {
      throw new AdminHttpError(409, 'Admin accounts cannot be deleted through this endpoint')
    }

    const auditRef = deps.db.collection(AUDIT_COLLECTION).doc()
    await auditRef.set(auditDataFor(c, deps, actor, 'user.deletion.request', 'user', id, reason, 'started'))
    try {
      await deps.admin.auth().updateUser(id, { disabled: true })
      const keyIds = await deleteQueryInBatches(deps, deps.db.collection('apiKeys').where('uid', '==', id))
      await deps.db.collection('users').doc(id).set({
        deletionState: 'pending',
        deletionRequestedAt: deps.now(),
        deletionRequestedBy: actor.uid,
        updatedAt: deps.now(),
      }, { merge: true })
      await Promise.all(keyIds.map((keyId) => deps.invalidateApiKeyCache?.(keyId, id)))
      await deps.invalidateUserCache?.(id)
      await auditRef.update({ status: 'completed', completedAt: deps.now() })
    } catch (error) {
      await auditRef.update({ status: 'failed', completedAt: deps.now() }).catch(() => undefined)
      throw error
    }
    return c.json({ data: { id, deleted: false, deletionState: 'pending', disabled: true } })
  })

  app.get('/subscriptions', async (c) => {
    const plan = c.req.query('plan')
    const filters: Array<[string, FirebaseFirestore.WhereFilterOp, any]> = []
    if (plan) filters.push(['plan', '==', enumValue(plan, 'plan', ['pro', 'grace', 'free'])])
    else filters.push(['plan', 'in', ['pro', 'grace']])
    const response = await listDocuments(c, deps, 'users', SUBSCRIPTION_FIELDS, filters)
    const authUsers = await Promise.all(response.data.map((entry) => deps.admin.auth().getUser(entry.id).catch(() => null)))
    response.data = response.data.map((entry, index) => {
      const nestedSubscription = isRecord(entry.subscription)
        ? pickFields(entry.subscription, PAYPAL_SUBSCRIPTION_DETAIL_FIELDS)
        : {}
      const safeEntry = Object.fromEntries(Object.entries(entry).filter(([key]) => key !== 'subscription'))
      return {
        ...safeEntry,
        ...nestedSubscription,
        uid: entry.id,
        userId: entry.id,
        email: authUsers[index]?.email || null,
        displayName: authUsers[index]?.displayName || null,
      }
    })
    return c.json(response)
  })

  app.get('/analytics', async (c) => {
    const response = await getPlatformAnalytics(c, deps)
    await auditSensitiveRead(c, deps, 'analytics.platform.read', 'analytics', 'platform')
    return c.json(response)
  })

  app.get('/payments', async (c) => {
    const status = c.req.query('status')
    const userId = c.req.query('userId')
    const filters: Array<[string, FirebaseFirestore.WhereFilterOp, any]> = []
    if (status) {
      const normalized = (boundedString(status, 'status', 40) as string).toLowerCase()
      const aliases: Record<string, string[]> = {
        succeeded: ['completed', 'COMPLETED', 'paid', 'PAID', 'succeeded', 'SUCCESS'],
        failed: ['failed', 'FAILED', 'declined', 'DECLINED', 'denied', 'DENIED', 'voided', 'VOIDED'],
        refunded: ['refunded', 'REFUNDED', 'partially_refunded', 'PARTIALLY_REFUNDED', 'reversed', 'REVERSED'],
        pending: ['pending', 'PENDING', 'created', 'CREATED', 'approved', 'APPROVED', 'payer_action_required', 'PAYER_ACTION_REQUIRED'],
      }
      const acceptedStatuses = aliases[normalized] ?? [normalized]
      filters.push(['status', acceptedStatuses.length === 1 ? '==' : 'in', acceptedStatuses.length === 1 ? acceptedStatuses[0] : acceptedStatuses])
    }
    if (userId) filters.push(['userId', '==', assertIdentifier(userId, 'user id')])
    return c.json(await listDocuments(c, deps, 'payments', PAYMENT_FIELDS, filters))
  })

  app.delete('/payments/:id', async (c) => {
    const id = assertIdentifier(c.req.param('id'), 'payment id')
    const body = await readBody(c)
    assertOnlyFields(body, ['reason'])
    const reason = requiredReason(body)
    const ref = deps.db.collection('payments').doc(id)
    const snapshot = await ref.get()
    if (!snapshot.exists) throw new AdminHttpError(404, 'Payment not found')
    const paymentStatus = normalizedPaymentStatus(snapshot.get('status'))
    if (isSettledPaymentStatus(paymentStatus) || ['refunded', 'partially_refunded', 'reversed'].includes(paymentStatus)) {
      throw new AdminHttpError(409, 'Settled payment records cannot be deleted')
    }
    const batch = deps.db.batch()
    batch.delete(ref)
    batch.set(deps.db.collection(AUDIT_COLLECTION).doc(), auditDataFor(c, deps, actorFrom(c), 'payment.delete', 'payment', id, reason))
    await batch.commit()
    return c.json({ data: { id, deleted: true } })
  })

  app.get('/reports', async (c) => {
    const status = c.req.query('status')
    const filters: Array<[string, FirebaseFirestore.WhereFilterOp, any]> = []
    if (status) filters.push(['status', '==', enumValue(status, 'status', ['open', 'in_review', 'resolved', 'dismissed'])])
    return c.json(await listDocuments(c, deps, 'reports', REPORT_FIELDS, filters))
  })

  app.patch('/reports/:id', async (c) => {
    const id = assertIdentifier(c.req.param('id'), 'report id')
    const body = await readBody(c)
    const reason = requiredReason(body)
    const patch = reportPatch(body)
    const ref = deps.db.collection('reports').doc(id)
    const snapshot = await ref.get()
    if (!snapshot.exists) throw new AdminHttpError(404, 'Report not found')
    const updated = { ...patch, updatedAt: deps.now(), ...(patch.status === 'resolved' ? { resolvedAt: deps.now() } : {}) }
    const batch = deps.db.batch()
    batch.update(ref, updated)
    batch.set(deps.db.collection(AUDIT_COLLECTION).doc(), auditDataFor(c, deps, actorFrom(c), 'report.update', 'report', id, reason))
    await batch.commit()
    const result = await ref.get()
    return c.json({ data: publicDocument(result, REPORT_FIELDS) })
  })

  app.delete('/reports/:id', async (c) => {
    const id = assertIdentifier(c.req.param('id'), 'report id')
    const body = await readBody(c)
    assertOnlyFields(body, ['reason'])
    const reason = requiredReason(body)
    const ref = deps.db.collection('reports').doc(id)
    if (!(await ref.get()).exists) throw new AdminHttpError(404, 'Report not found')
    const batch = deps.db.batch()
    batch.delete(ref)
    batch.set(deps.db.collection(AUDIT_COLLECTION).doc(), auditDataFor(c, deps, actorFrom(c), 'report.delete', 'report', id, reason))
    await batch.commit()
    return c.json({ data: { id, deleted: true } })
  })

  app.get('/coupons', async (c) => c.json(await listDocuments(c, deps, 'coupons', COUPON_FIELDS)))

  app.post('/coupons', async (c) => {
    const body = await readBody(c)
    const reason = requiredReason(body)
    const patch = couponPatch(body, true)
    validateCouponDiscount(patch)
    const id = patch.code
    const ref = deps.db.collection('coupons').doc(id)
    if ((await ref.get()).exists) throw new AdminHttpError(409, 'Coupon already exists')
    const data = { ...patch, redeemedCount: 0, createdAt: deps.now(), updatedAt: deps.now() }
    const batch = deps.db.batch()
    batch.create(ref, data)
    batch.set(deps.db.collection(AUDIT_COLLECTION).doc(), auditDataFor(c, deps, actorFrom(c), 'coupon.create', 'coupon', id, reason))
    await batch.commit()
    const result = await ref.get()
    return c.json({ data: publicDocument(result, COUPON_FIELDS) }, 201)
  })

  app.patch('/coupons/:id', async (c) => {
    const id = assertIdentifier(c.req.param('id'), 'coupon id')
    const body = await readBody(c)
    const reason = requiredReason(body)
    const patch = couponPatch(body, false)
    const ref = deps.db.collection('coupons').doc(id)
    const snapshot = await ref.get()
    if (!snapshot.exists) throw new AdminHttpError(404, 'Coupon not found')
    validateCouponDiscount(patch, snapshot.data() || {})
    const batch = deps.db.batch()
    batch.update(ref, { ...patch, updatedAt: deps.now() })
    batch.set(deps.db.collection(AUDIT_COLLECTION).doc(), auditDataFor(c, deps, actorFrom(c), 'coupon.update', 'coupon', id, reason))
    await batch.commit()
    return c.json({ data: publicDocument(await ref.get(), COUPON_FIELDS) })
  })

  app.delete('/coupons/:id', async (c) => {
    const id = assertIdentifier(c.req.param('id'), 'coupon id')
    const body = await readBody(c)
    assertOnlyFields(body, ['reason'])
    const reason = requiredReason(body)
    const ref = deps.db.collection('coupons').doc(id)
    const snapshot = await ref.get()
    if (!snapshot.exists) throw new AdminHttpError(404, 'Coupon not found')
    if (Number(snapshot.get('redeemedCount') || 0) > 0) throw new AdminHttpError(409, 'Redeemed coupons must be deactivated, not deleted')
    const batch = deps.db.batch()
    batch.delete(ref)
    batch.set(deps.db.collection(AUDIT_COLLECTION).doc(), auditDataFor(c, deps, actorFrom(c), 'coupon.delete', 'coupon', id, reason))
    await batch.commit()
    return c.json({ data: { id, deleted: true } })
  })

  app.get('/announcements', async (c) => c.json(await listDocuments(c, deps, 'announcements', ANNOUNCEMENT_FIELDS)))

  app.post('/announcements', async (c) => {
    const body = await readBody(c)
    const reason = requiredReason(body)
    const patch = announcementPatch(body, true)
    validateAnnouncementWindow(patch)
    const ref = deps.db.collection('announcements').doc()
    const status = patch.status || 'draft'
    const data = { ...patch, status, createdAt: deps.now(), updatedAt: deps.now(), ...(status === 'published' ? { publishedAt: deps.now() } : {}) }
    const batch = deps.db.batch()
    batch.create(ref, data)
    batch.set(deps.db.collection(AUDIT_COLLECTION).doc(), auditDataFor(c, deps, actorFrom(c), 'announcement.create', 'announcement', ref.id, reason))
    await batch.commit()
    return c.json({ data: publicDocument(await ref.get(), ANNOUNCEMENT_FIELDS) }, 201)
  })

  app.patch('/announcements/:id', async (c) => {
    const id = assertIdentifier(c.req.param('id'), 'announcement id')
    const body = await readBody(c)
    const reason = requiredReason(body)
    const patch = announcementPatch(body, false)
    const ref = deps.db.collection('announcements').doc(id)
    const snapshot = await ref.get()
    if (!snapshot.exists) throw new AdminHttpError(404, 'Announcement not found')
    validateAnnouncementWindow(patch, snapshot.data() || {})
    const updated = { ...patch, updatedAt: deps.now(), ...(patch.status === 'published' && snapshot.get('status') !== 'published' ? { publishedAt: deps.now() } : {}) }
    const batch = deps.db.batch()
    batch.update(ref, updated)
    batch.set(deps.db.collection(AUDIT_COLLECTION).doc(), auditDataFor(c, deps, actorFrom(c), 'announcement.update', 'announcement', id, reason))
    await batch.commit()
    return c.json({ data: publicDocument(await ref.get(), ANNOUNCEMENT_FIELDS) })
  })

  app.delete('/announcements/:id', async (c) => {
    const id = assertIdentifier(c.req.param('id'), 'announcement id')
    const body = await readBody(c)
    assertOnlyFields(body, ['reason'])
    const reason = requiredReason(body)
    const ref = deps.db.collection('announcements').doc(id)
    if (!(await ref.get()).exists) throw new AdminHttpError(404, 'Announcement not found')
    const batch = deps.db.batch()
    batch.delete(ref)
    batch.set(deps.db.collection(AUDIT_COLLECTION).doc(), auditDataFor(c, deps, actorFrom(c), 'announcement.delete', 'announcement', id, reason))
    await batch.commit()
    return c.json({ data: { id, deleted: true } })
  })

  app.get('/settings', async (c) => {
    const snapshot = await deps.db.collection('settings').doc(SETTINGS_DOCUMENT).get()
    return c.json({ data: snapshot.exists ? pickFields(snapshot.data() || {}, SETTINGS_FIELDS) : {} })
  })

  app.patch('/settings', async (c) => {
    const body = await readBody(c)
    const reason = requiredReason(body)
    const patch = settingsPatch(body)
    const ref = deps.db.collection('settings').doc(SETTINGS_DOCUMENT)
    const batch = deps.db.batch()
    batch.set(ref, { ...patch, updatedAt: deps.now() }, { merge: true })
    batch.set(deps.db.collection(AUDIT_COLLECTION).doc(), auditDataFor(c, deps, actorFrom(c), 'settings.update', 'settings', SETTINGS_DOCUMENT, reason))
    await batch.commit()
    const result = await ref.get()
    return c.json({ data: pickFields(result.data() || {}, SETTINGS_FIELDS) })
  })

  app.notFound((c) => adminErrorResponse(c, 404, 'ADMIN_ENDPOINT_NOT_FOUND', 'Admin endpoint not found', 'not_found'))
  app.onError((error, c) => {
    if (error instanceof AdminHttpError) {
      return adminErrorResponse(c, error.status, error.code, error.message, categoryForStatus(error.status))
    }
    if ((error as any)?.code === 'auth/user-not-found') {
      return adminErrorResponse(c, 404, 'USER_NOT_FOUND', 'User not found', 'not_found')
    }
    console.error('[admin-api] Request failed', {
      requestId: c.get('requestId'),
      name: error?.constructor?.name,
      code: (error as any)?.code,
    })
    return adminErrorResponse(c, 500, 'BACKEND_ERROR', 'The admin API could not complete the request.', 'backend')
  })

  return app
}
