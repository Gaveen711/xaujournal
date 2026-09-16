import crypto from 'crypto'
// @ts-ignore
import { db as _db, now } from './_firebase.js'
import { hashToken, isValidUid } from './_security.js'
import {
  cancelPayPalSubscription,
  createPayPalSubscription,
  getPayPalSubscription,
} from './_paypal.js'
// @ts-ignore
import { PRO_MONTHLY_AMOUNT, PRO_YEARLY_AMOUNT } from '../src/lib/pricing.js'

const db: any = _db

export const PAYPAL_PROVIDER = 'paypal'
export const PAYPAL_CURRENCY = 'USD'

export const PAYPAL_PLANS = {
  pro_monthly: { amount: PRO_MONTHLY_AMOUNT, interval: 'MONTH' },
  pro_yearly: { amount: PRO_YEARLY_AMOUNT, interval: 'YEAR' },
} as const

export type PayPalPlanId = keyof typeof PAYPAL_PLANS

type PayPalWebhookEvent = {
  id?: unknown
  event_type?: unknown
  resource?: Record<string, any>
}

const PAYPAL_SUBSCRIPTION_ID = /^I-[A-Z0-9]{1,48}$/
const PAYPAL_PLAN_ID = /^P-[A-Z0-9]{24}$/
const CHECKOUT_TOKEN = /^[A-Za-z0-9_-]{32,96}$/
const CHECKOUT_LIFETIME_MS = 24 * 60 * 60 * 1000

export function isPayPalPlanId(value: unknown): value is PayPalPlanId {
  return value === 'pro_monthly' || value === 'pro_yearly'
}

export function isPayPalSubscriptionId(value: unknown): value is string {
  return typeof value === 'string' && PAYPAL_SUBSCRIPTION_ID.test(value)
}

function configuredProviderPlanId(planId: PayPalPlanId) {
  const envName = planId === 'pro_monthly' ? 'PAYPAL_MONTHLY_PLAN_ID' : 'PAYPAL_YEARLY_PLAN_ID'
  const value = process.env[envName]?.trim() || ''
  if (!PAYPAL_PLAN_ID.test(value)) throw new Error(`PayPal configuration is missing or invalid: ${envName}`)
  return value
}

function localPlanId(providerPlanId: unknown): PayPalPlanId | null {
  if (typeof providerPlanId !== 'string') return null
  if (providerPlanId === configuredProviderPlanId('pro_monthly')) return 'pro_monthly'
  if (providerPlanId === configuredProviderPlanId('pro_yearly')) return 'pro_yearly'
  return null
}

function cents(value: unknown) {
  if (typeof value !== 'string' && typeof value !== 'number') return null
  const amount = Number(value)
  return Number.isFinite(amount) ? Math.round(amount * 100) : null
}

function validIso(value: unknown) {
  if (typeof value !== 'string') return null
  const timestamp = Date.parse(value)
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : null
}

function checkoutAttemptRef(customId: string) {
  return db.collection('paypalCheckoutAttempts').doc(hashToken(customId))
}

function subscriptionRef(subscriptionId: string) {
  return db.collection('paypalSubscriptions').doc(hashToken(subscriptionId))
}

function requestRef(uid: string, idempotencyKey: string) {
  return db.collection('paypalCheckoutRequests').doc(hashToken(`${uid}:${idempotencyKey}`))
}

function paymentRef(paymentId: string) {
  return db.collection('payments').doc(hashToken(`paypal:${paymentId}`))
}

function approvalUrl(subscription: Record<string, any>) {
  const link = Array.isArray(subscription.links)
    ? subscription.links.find((item: any) => item?.rel === 'approve' && typeof item?.href === 'string')
    : null
  if (!link?.href) return null
  try {
    const url = new URL(link.href)
    return url.protocol === 'https:' && (url.hostname === 'paypal.com' || url.hostname.endsWith('.paypal.com'))
      ? link.href
      : null
  } catch {
    return null
  }
}

function checkoutOrigin(requestUrl: string) {
  if (process.env.VERCEL_ENV === 'production') return 'https://www.xaujournal.com'
  if (process.env.VERCEL_ENV === 'preview' && process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`
  }
  const url = new URL(requestUrl)
  if (url.protocol === 'https:' && ['www.xaujournal.com', 'xaujournal.com'].includes(url.hostname)) {
    return url.origin
  }
  if (url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname)) {
    return url.origin
  }
  throw new Error('PayPal checkout origin is not allowed')
}

function validateCanonicalPlan(subscription: Record<string, any>, planId: PayPalPlanId) {
  const expected = PAYPAL_PLANS[planId]
  const cycles = Array.isArray(subscription.plan?.billing_cycles) ? subscription.plan.billing_cycles : []
  const regular = cycles.find((cycle: any) => cycle?.tenure_type === 'REGULAR')
  const price = regular?.pricing_scheme?.fixed_price
  const intervalMatches = regular?.frequency?.interval_unit === expected.interval
    && Number(regular?.frequency?.interval_count) === 1
  const amountMatches = price?.currency_code === PAYPAL_CURRENCY
    && cents(price?.value) === cents(expected.amount)
  if (!intervalMatches || !amountMatches) throw new Error('PayPal subscription plan does not match the configured USD billing contract')
}

function canonicalPayment(subscription: Record<string, any>, planId: PayPalPlanId) {
  const payment = subscription.billing_info?.last_payment
  const amount = payment?.amount
  const time = validIso(payment?.time)
  const valid = amount?.currency_code === PAYPAL_CURRENCY
    && cents(amount?.value) === cents(PAYPAL_PLANS[planId].amount)
    && Boolean(time)
  return { valid, time, amount: amount?.value }
}

function billingCycles(subscription: Record<string, any>) {
  const cycles = Array.isArray(subscription.billing_info?.cycle_executions)
    ? subscription.billing_info.cycle_executions
    : []
  return cycles.map((cycle: any) => ({
    tenureType: cycle?.tenure_type,
    sequence: Number(cycle?.sequence) || 0,
    cyclesCompleted: Number(cycle?.cycles_completed) || 0,
    cyclesRemaining: Number(cycle?.cycles_remaining) || 0,
    totalCycles: Number(cycle?.total_cycles) || 0,
  }))
}

function eventSubscriptionId(event: PayPalWebhookEvent) {
  const type = String(event.event_type || '')
  const resource = event.resource || {}
  if (type.startsWith('BILLING.SUBSCRIPTION.')) return String(resource.id || '')
  return String(
    resource.billing_agreement_id
      || resource.supplementary_data?.related_ids?.subscription_id
      || resource.supplementary_data?.related_ids?.billing_agreement_id
      || '',
  )
}

function completedSale(event: PayPalWebhookEvent, subscriptionId: string, planId: PayPalPlanId) {
  if (event.event_type !== 'PAYMENT.SALE.COMPLETED') return null
  const resource = event.resource || {}
  const saleId = typeof resource.id === 'string' ? resource.id : ''
  const linkedSubscriptionId = eventSubscriptionId(event)
  const amount = resource.amount || resource.amount_with_breakdown?.gross_amount
  const paidAt = validIso(resource.create_time || resource.update_time)
  if (!saleId || linkedSubscriptionId !== subscriptionId || !paidAt) return null
  if (amount?.currency !== PAYPAL_CURRENCY && amount?.currency_code !== PAYPAL_CURRENCY) return null
  if (cents(amount?.total ?? amount?.value) !== cents(PAYPAL_PLANS[planId].amount)) return null
  const orderId = typeof resource.parent_payment === 'string'
    ? resource.parent_payment
    : (typeof resource.invoice_number === 'string' ? resource.invoice_number : null)
  return { saleId, paidAt, amount: Number(PAYPAL_PLANS[planId].amount), orderId }
}

function reversedSale(event: PayPalWebhookEvent, subscriptionId: string, planId: PayPalPlanId) {
  if (event.event_type !== 'PAYMENT.SALE.REFUNDED' && event.event_type !== 'PAYMENT.SALE.REVERSED') return null
  const resource = event.resource || {}
  const saleId = typeof resource.sale_id === 'string'
    ? resource.sale_id
    : (typeof resource.parent_payment === 'string'
      ? resource.parent_payment
      : (typeof resource.id === 'string' ? resource.id : ''))
  const occurredAt = validIso(resource.update_time || resource.create_time)
  const amount = resource.amount || resource.amount_with_breakdown?.gross_amount
  if (!saleId || eventSubscriptionId(event) !== subscriptionId || !occurredAt) return null
  const currency = amount?.currency ?? amount?.currency_code
  const amountValue = amount?.total ?? amount?.value
  if (currency && currency !== PAYPAL_CURRENCY) return null
  return {
    saleId,
    occurredAt,
    amount: cents(amountValue) === null ? Number(PAYPAL_PLANS[planId].amount) : Number(amountValue),
    status: event.event_type === 'PAYMENT.SALE.REFUNDED' ? 'refunded' : 'reversed',
    orderId: typeof resource.parent_payment === 'string' ? resource.parent_payment : null,
  }
}

function failedPayment(event: PayPalWebhookEvent, subscriptionId: string, planId: PayPalPlanId, eventId: string) {
  if (event.event_type !== 'BILLING.SUBSCRIPTION.PAYMENT.FAILED') return null
  const resource = event.resource || {}
  if (eventSubscriptionId(event) !== subscriptionId) return null
  const occurredAt = validIso(resource.status_update_time || resource.update_time || resource.create_time)
    || new Date().toISOString()
  return {
    id: eventId,
    occurredAt,
    amount: Number(PAYPAL_PLANS[planId].amount),
  }
}

export function toPublicPayPalSubscription(data: Record<string, any>) {
  const paidThrough = validIso(data.currentPeriodEnd)
  const paymentStatus = String(data.paymentStatus || '').toUpperCase()
  const entitlementActive = ['PAID', 'COMPLETED', 'SUCCESS'].includes(paymentStatus)
    && Boolean(paidThrough && Date.parse(paidThrough) > Date.now())
  const providerStatus = String(data.status || 'pending').toLowerCase()
  const status = providerStatus === 'none'
    ? 'none'
    : entitlementActive
    ? providerStatus
    : (['cancelled', 'expired', 'suspended'].includes(providerStatus) ? providerStatus : 'confirming')
  return {
    provider: PAYPAL_PROVIDER,
    status,
    providerStatus,
    entitlementActive,
    subscriptionId: data.subscriptionId || null,
    planId: data.planId || null,
    autoRenew: data.autoRenew === true,
    currentPeriodEnd: data.currentPeriodEnd || null,
    nextBillingTime: data.nextBillingTime || data.currentPeriodEnd || null,
    paymentStatus: data.paymentStatus || null,
  }
}

async function requeuePausedAccounts(uid: string) {
  const accounts = await db.collection('users').doc(uid).collection('brokerAccounts')
    .where('syncJobState', '==', 'paused')
    .get()
  if (accounts.empty) return
  const batch = db.batch()
  let count = 0
  accounts.docs.forEach((account: any) => {
    if (account.get('isActive') === true) {
      batch.update(account.ref, {
        syncJobState: 'queued',
        retryCount: 0,
        nextSyncAt: new Date().toISOString(),
        updatedAt: now(),
      })
      count += 1
    }
  })
  if (count > 0) await batch.commit()
}

export function payPalHostedConfig() {
  // Deliberately excludes client id and provider plan ids. Checkout is created
  // by the server, then the browser is sent only to PayPal's approval URL.
  return { provider: PAYPAL_PROVIDER, currency: PAYPAL_CURRENCY, checkout: 'hosted' as const }
}

export function mayGrantPayPalEntitlement(input: {
  eventType: string
  providerStatus: string
  nextBillingTime: string | null
  lastPaymentValid: boolean
  salePaidAt: string | null
  lastPaymentTime: string | null
  nowMs?: number
}) {
  const nowMs = input.nowMs ?? Date.now()
  const nextBillingMs = Date.parse(input.nextBillingTime || '')
  const saleMs = Date.parse(input.salePaidAt || '')
  const canonicalPaymentMs = Date.parse(input.lastPaymentTime || '')
  return input.eventType === 'PAYMENT.SALE.COMPLETED'
    && input.providerStatus === 'ACTIVE'
    && input.lastPaymentValid
    && Number.isFinite(nextBillingMs)
    && nextBillingMs > nowMs
    && Number.isFinite(saleMs)
    && Number.isFinite(canonicalPaymentMs)
    && Math.abs(saleMs - canonicalPaymentMs) <= 5 * 60 * 1000
}

export async function createHostedPayPalSubscription(input: {
  uid: string
  planId: PayPalPlanId
  idempotencyKey: string
  requestUrl: string
}) {
  if (!isValidUid(input.uid)) throw new Error('Invalid user')
  const providerPlanId = configuredProviderPlanId(input.planId)
  const checkoutRequestRef = requestRef(input.uid, input.idempotencyKey)

  const attempt = await db.runTransaction(async (transaction: any) => {
    const existingRequest = await transaction.get(checkoutRequestRef)
    if (existingRequest.exists) {
      const existingAttemptId = existingRequest.get('attemptId')
      if (!existingAttemptId) throw new Error('Invalid PayPal checkout request')
      const existingAttemptRef = db.collection('paypalCheckoutAttempts').doc(existingAttemptId)
      const existingAttempt = await transaction.get(existingAttemptRef)
      if (!existingAttempt.exists || existingAttempt.get('userId') !== input.uid) {
        throw new Error('Invalid PayPal checkout attempt')
      }
      if (existingAttempt.get('planId') !== input.planId) throw new Error('Idempotency key was used for another plan')
      return { ref: existingAttemptRef, data: existingAttempt.data() || {} }
    }

    const customId = crypto.randomBytes(24).toString('base64url')
    const ref = checkoutAttemptRef(customId)
    const createdAt = new Date().toISOString()
    const data = {
      userId: input.uid,
      planId: input.planId,
      providerPlanId,
      customId,
      providerRequestId: hashToken(`${input.uid}:${input.idempotencyKey}`).slice(0, 36),
      status: 'creating',
      createdAt,
      expiresAt: new Date(Date.now() + CHECKOUT_LIFETIME_MS).toISOString(),
      updatedAt: now(),
    }
    transaction.create(ref, data)
    transaction.create(checkoutRequestRef, {
      userId: input.uid,
      planId: input.planId,
      attemptId: ref.id,
      createdAt: now(),
    })
    return { ref, data }
  })

  if (typeof attempt.data.approveUrl === 'string') return { approveUrl: attempt.data.approveUrl }

  const origin = checkoutOrigin(input.requestUrl)
  const subscription = await createPayPalSubscription({
    planId: providerPlanId,
    customId: attempt.data.customId,
    requestId: attempt.data.providerRequestId,
    returnUrl: `${origin}/app/billing/subscription-status?provider=paypal`,
    cancelUrl: `${origin}/app/billing/subscription-status?provider=paypal&state=cancelled`,
  })
  const subscriptionId = String(subscription?.id || '')
  const approveUrl = approvalUrl(subscription || {})
  if (!isPayPalSubscriptionId(subscriptionId) || subscription?.plan_id !== providerPlanId || !approveUrl) {
    throw new Error('PayPal returned an invalid subscription approval response')
  }
  if (subscription.custom_id && subscription.custom_id !== attempt.data.customId) {
    throw new Error('PayPal returned a mismatched checkout reference')
  }

  const providerSubscriptionRef = subscriptionRef(subscriptionId)
  await db.runTransaction(async (transaction: any) => {
    const currentAttempt = await transaction.get(attempt.ref)
    const currentMapping = await transaction.get(providerSubscriptionRef)
    if (!currentAttempt.exists || currentAttempt.get('userId') !== input.uid) throw new Error('PayPal checkout attempt was removed')
    if (currentMapping.exists && currentMapping.get('userId') !== input.uid) throw new Error('PayPal subscription is already assigned')
    transaction.set(attempt.ref, {
      subscriptionId,
      approveUrl,
      status: String(subscription.status || 'APPROVAL_PENDING').toLowerCase(),
      updatedAt: now(),
    }, { merge: true })
    transaction.set(providerSubscriptionRef, {
      userId: input.uid,
      subscriptionId,
      planId: input.planId,
      providerPlanId,
      customId: attempt.data.customId,
      status: String(subscription.status || 'APPROVAL_PENDING').toLowerCase(),
      paymentStatus: 'PENDING',
      autoRenew: false,
      checkoutAttemptId: attempt.ref.id,
      createdAt: currentMapping.exists ? (currentMapping.get('createdAt') || now()) : now(),
      updatedAt: now(),
    }, { merge: true })
  })

  return { approveUrl }
}

async function canonicalIdentity(subscription: Record<string, any>, expectedUid?: string) {
  const subscriptionId = String(subscription.id || '')
  if (!isPayPalSubscriptionId(subscriptionId)) throw new Error('Invalid PayPal subscription')
  const planId = localPlanId(subscription.plan_id)
  if (!planId) throw new Error('PayPal subscription uses an unknown plan')
  validateCanonicalPlan(subscription, planId)

  const mappingRef = subscriptionRef(subscriptionId)
  const mapping = await mappingRef.get()
  let uid = mapping.exists ? String(mapping.get('userId') || '') : ''
  let attemptRef: any = null
  let attempt: any = null

  if (!uid) {
    const customId = typeof subscription.custom_id === 'string' ? subscription.custom_id : ''
    if (!CHECKOUT_TOKEN.test(customId)) throw new Error('PayPal checkout reference is missing')
    attemptRef = checkoutAttemptRef(customId)
    attempt = await attemptRef.get()
    if (!attempt.exists || attempt.get('customId') !== customId) throw new Error('PayPal checkout attempt not found')
    const expiresAt = Date.parse(attempt.get('expiresAt') || '')
    if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) throw new Error('PayPal checkout attempt expired')
    if (attempt.get('planId') !== planId || attempt.get('providerPlanId') !== subscription.plan_id) {
      throw new Error('PayPal checkout plan mismatch')
    }
    const assigned = attempt.get('subscriptionId')
    if (assigned && assigned !== subscriptionId) throw new Error('PayPal checkout attempt is already assigned')
    uid = String(attempt.get('userId') || '')
  }

  if (!isValidUid(uid)) throw new Error('PayPal subscription owner is invalid')
  if (expectedUid && expectedUid !== uid) throw new Error('PayPal subscription not found')
  if (mapping.exists && (mapping.get('planId') !== planId || mapping.get('providerPlanId') !== subscription.plan_id)) {
    throw new Error('PayPal subscription mapping mismatch')
  }
  return { uid, planId, mappingRef, mapping, attemptRef, attempt }
}

async function reconcileCanonical(input: {
  subscriptionId: string
  expectedUid?: string
  event?: PayPalWebhookEvent
}) {
  const subscription = await getPayPalSubscription(input.subscriptionId)
  if (subscription?.id !== input.subscriptionId) throw new Error('PayPal returned a mismatched subscription')
  const identity = await canonicalIdentity(subscription, input.expectedUid)
  const providerStatus = String(subscription.status || '').toUpperCase()
  const nextBillingTime = validIso(subscription.billing_info?.next_billing_time)
  const lastPayment = canonicalPayment(subscription, identity.planId)
  const canonicalBillingCycles = billingCycles(subscription)
  const sale = input.event ? completedSale(input.event, input.subscriptionId, identity.planId) : null
  const reversal = input.event ? reversedSale(input.event, input.subscriptionId, identity.planId) : null
  const eventType = String(input.event?.event_type || '')
  const eventId = typeof input.event?.id === 'string' && input.event.id
    ? input.event.id
    : (input.event ? hashToken(JSON.stringify(input.event)) : '')
  const eventRef = eventId ? db.collection('webhookEvents').doc(hashToken(`paypal:${eventId}`)) : null
  const failure = input.event ? failedPayment(input.event, input.subscriptionId, identity.planId, eventId) : null
  const salePaymentRef = sale ? paymentRef(sale.saleId) : null
  const reversalPaymentRef = reversal ? paymentRef(reversal.saleId) : null
  const failedPaymentRef = failure ? paymentRef(`failure:${failure.id}`) : null
  const userRef = db.collection('users').doc(identity.uid)
  const isCompletedSale = Boolean(sale && mayGrantPayPalEntitlement({
    eventType,
    providerStatus,
    nextBillingTime,
    lastPaymentValid: lastPayment.valid,
    salePaidAt: sale?.paidAt || null,
    lastPaymentTime: lastPayment.time,
  }))
  if (eventType === 'PAYMENT.SALE.COMPLETED' && !isCompletedSale) {
    // PayPal can deliver the sale event before GET subscription reflects the
    // new last_payment/next_billing_time. Do not consume the event: a 5xx makes
    // PayPal retry after its canonical subscription view catches up.
    throw new Error('PayPal completed sale is not yet canonical')
  }

  const result = await db.runTransaction(async (transaction: any) => {
    const eventSnapshot = eventRef ? await transaction.get(eventRef) : null
    const mappingSnapshot = await transaction.get(identity.mappingRef)
    const attemptSnapshot = identity.attemptRef ? await transaction.get(identity.attemptRef) : null
    const userSnapshot = await transaction.get(userRef)
    const paymentSnapshot = salePaymentRef ? await transaction.get(salePaymentRef) : null
    const reversalPaymentSnapshot = reversalPaymentRef ? await transaction.get(reversalPaymentRef) : null
    const failedPaymentSnapshot = failedPaymentRef ? await transaction.get(failedPaymentRef) : null

    if (eventSnapshot?.exists) {
      return { deduped: true, activated: false, uid: identity.uid, data: mappingSnapshot.data() || {} }
    }
    if (mappingSnapshot.exists && mappingSnapshot.get('userId') !== identity.uid) throw new Error('PayPal subscription is already assigned')
    if (!mappingSnapshot.exists) {
      if (!attemptSnapshot?.exists || attemptSnapshot.get('userId') !== identity.uid) throw new Error('PayPal checkout ownership could not be verified')
      const assigned = attemptSnapshot.get('subscriptionId')
      if (assigned && assigned !== input.subscriptionId) throw new Error('PayPal checkout attempt is already assigned')
    }

    const currentMapping = mappingSnapshot.data() || {}
    const currentUser = userSnapshot.data() || {}
    const alreadyRecordedSale = Boolean(sale && currentMapping.lastPaymentId === sale.saleId)
    const activated = isCompletedSale && !alreadyRecordedSale
    const reversalAffectsCurrent = Boolean(reversal && currentMapping.lastPaymentId === reversal.saleId)
    const paidThrough = activated
      ? nextBillingTime
      : (validIso(currentMapping.currentPeriodEnd) || validIso(currentUser.planExpiry))
    const paidThroughFuture = Boolean(paidThrough && Date.parse(paidThrough) > Date.now())
    const autoRenew = providerStatus === 'ACTIVE'
    const status = providerStatus.toLowerCase() || 'pending'

    const mappingPatch: Record<string, any> = {
      userId: identity.uid,
      subscriptionId: input.subscriptionId,
      planId: identity.planId,
      providerPlanId: subscription.plan_id,
      status,
      autoRenew,
      payerId: subscription.subscriber?.payer_id || currentMapping.payerId || null,
      payerEmail: subscription.subscriber?.email_address || currentMapping.payerEmail || null,
      customerId: subscription.subscriber?.payer_id || currentMapping.customerId || null,
      billingCycles: canonicalBillingCycles,
      nextBillingTime: nextBillingTime || currentMapping.nextBillingTime || null,
      currentPeriodEnd: paidThrough || null,
      latestCaptureId: sale?.saleId || currentMapping.latestCaptureId || null,
      latestOrderId: sale?.orderId || currentMapping.latestOrderId || null,
      paymentStatus: activated
        ? 'COMPLETED'
        : (reversalAffectsCurrent
          ? reversal!.status.toUpperCase()
          : (failure ? 'PAYMENT_FAILED' : currentMapping.paymentStatus || status)),
      updatedAt: now(),
    }
    if (!mappingSnapshot.exists) mappingPatch.createdAt = now()
    if (activated && sale) {
      mappingPatch.lastPaymentId = sale.saleId
      mappingPatch.lastPaymentTime = sale.paidAt
      mappingPatch.currentPeriodStart = sale.paidAt
    }
    transaction.set(identity.mappingRef, mappingPatch, { merge: true })

    if (identity.attemptRef) {
      transaction.set(identity.attemptRef, {
        subscriptionId: input.subscriptionId,
        status,
        consumedAt: now(),
        updatedAt: now(),
      }, { merge: true })
    }

    if (activated && sale && salePaymentRef && !paymentSnapshot?.exists) {
      transaction.create(salePaymentRef, {
        userId: identity.uid,
        provider: PAYPAL_PROVIDER,
        subscriptionId: input.subscriptionId,
        paypalSubscriptionId: input.subscriptionId,
        providerPaymentId: sale.saleId,
        providerInvoiceId: sale.saleId,
        planId: identity.planId,
        paypalPlanId: subscription.plan_id,
        payerEmail: subscription.subscriber?.email_address || null,
        paypalPayerEmail: subscription.subscriber?.email_address || null,
        payerId: subscription.subscriber?.payer_id || null,
        paypalPayerId: subscription.subscriber?.payer_id || null,
        customerId: subscription.subscriber?.payer_id || null,
        billingCycles: canonicalBillingCycles,
        nextBillingTime,
        nextBillingAt: nextBillingTime,
        latestCaptureId: sale.saleId,
        captureId: sale.saleId,
        latestOrderId: sale.orderId,
        orderId: sale.orderId,
        type: 'subscription',
        amount: sale.amount,
        currency: PAYPAL_CURRENCY,
        status: 'SUCCESS',
        paypalStatus: 'COMPLETED',
        paymentStatus: 'COMPLETED',
        date: sale.paidAt,
        paidAt: sale.paidAt,
        confirmedAt: sale.paidAt,
        expiresAt: nextBillingTime,
        createdAt: sale.paidAt,
        updatedAt: now(),
      })
    }

    if (reversal && reversalPaymentRef) {
      const existingPayment = reversalPaymentSnapshot?.data() || {}
      transaction.set(reversalPaymentRef, {
        userId: identity.uid,
        provider: PAYPAL_PROVIDER,
        subscriptionId: input.subscriptionId,
        paypalSubscriptionId: input.subscriptionId,
        providerPaymentId: reversal.saleId,
        providerInvoiceId: reversal.saleId,
        planId: identity.planId,
        paypalPlanId: subscription.plan_id,
        payerEmail: subscription.subscriber?.email_address || existingPayment.payerEmail || null,
        paypalPayerEmail: subscription.subscriber?.email_address || existingPayment.paypalPayerEmail || null,
        payerId: subscription.subscriber?.payer_id || existingPayment.payerId || null,
        paypalPayerId: subscription.subscriber?.payer_id || existingPayment.paypalPayerId || null,
        customerId: subscription.subscriber?.payer_id || existingPayment.customerId || null,
        billingCycles: canonicalBillingCycles,
        nextBillingTime: nextBillingTime || existingPayment.nextBillingTime || null,
        nextBillingAt: nextBillingTime || existingPayment.nextBillingAt || null,
        latestCaptureId: reversal.saleId,
        captureId: reversal.saleId,
        latestOrderId: reversal.orderId || existingPayment.latestOrderId || null,
        orderId: reversal.orderId || existingPayment.orderId || null,
        amount: existingPayment.amount ?? Number(PAYPAL_PLANS[identity.planId].amount),
        refundedAmount: reversal.amount,
        currency: PAYPAL_CURRENCY,
        status: 'REFUNDED',
        paypalStatus: reversal.status.toUpperCase(),
        paymentStatus: reversal.status.toUpperCase(),
        type: 'subscription',
        date: existingPayment.date || reversal.occurredAt,
        createdAt: existingPayment.createdAt || reversal.occurredAt,
        refundedAt: reversal.occurredAt,
        updatedAt: now(),
      }, { merge: true })
    }

    if (failure && failedPaymentRef && !failedPaymentSnapshot?.exists) {
      transaction.create(failedPaymentRef, {
        userId: identity.uid,
        provider: PAYPAL_PROVIDER,
        subscriptionId: input.subscriptionId,
        paypalSubscriptionId: input.subscriptionId,
        planId: identity.planId,
        paypalPlanId: subscription.plan_id,
        payerEmail: subscription.subscriber?.email_address || null,
        paypalPayerEmail: subscription.subscriber?.email_address || null,
        payerId: subscription.subscriber?.payer_id || null,
        paypalPayerId: subscription.subscriber?.payer_id || null,
        customerId: subscription.subscriber?.payer_id || null,
        billingCycles: canonicalBillingCycles,
        nextBillingTime: nextBillingTime || currentMapping.nextBillingTime || null,
        nextBillingAt: nextBillingTime || currentMapping.nextBillingTime || null,
        latestCaptureId: currentMapping.latestCaptureId || null,
        captureId: currentMapping.latestCaptureId || null,
        latestOrderId: currentMapping.latestOrderId || null,
        orderId: currentMapping.latestOrderId || null,
        amount: failure.amount,
        currency: PAYPAL_CURRENCY,
        status: 'FAILED',
        paypalStatus: 'PAYMENT_FAILED',
        paymentStatus: 'PAYMENT_FAILED',
        type: 'subscription',
        date: failure.occurredAt,
        createdAt: failure.occurredAt,
        updatedAt: now(),
      })
    }

    if (activated && sale) {
      transaction.set(userRef, {
        plan: 'pro',
        planExpiry: nextBillingTime,
        graceUntil: null,
        isTrial: false,
        paymentStatus: 'COMPLETED',
        paymentProvider: PAYPAL_PROVIDER,
        providerPaymentId: input.subscriptionId,
        paypalSubscriptionId: input.subscriptionId,
        subscriptionId: input.subscriptionId,
        paypalPlanId: subscription.plan_id,
        planId: identity.planId,
        payerEmail: subscription.subscriber?.email_address || null,
        paypalPayerEmail: subscription.subscriber?.email_address || null,
        payerId: subscription.subscriber?.payer_id || null,
        paypalPayerId: subscription.subscriber?.payer_id || null,
        customerId: subscription.subscriber?.payer_id || null,
        subscriptionStatus: status,
        paypalStatus: status,
        autoRenew: true,
        billingCycles: canonicalBillingCycles,
        nextBillingTime,
        nextBillingAt: nextBillingTime,
        latestCaptureId: sale.saleId,
        captureId: sale.saleId,
        latestOrderId: sale.orderId,
        orderId: sale.orderId,
        currentPeriodStart: sale.paidAt,
        currentPeriodEnd: nextBillingTime,
        subscription: {
          provider: PAYPAL_PROVIDER,
          providerPaymentId: input.subscriptionId,
          subscriptionId: input.subscriptionId,
          planId: identity.planId,
          autoRenew: true,
          status,
          currentPeriodStart: sale.paidAt,
          currentPeriodEnd: nextBillingTime,
        },
        updatedAt: now(),
      }, { merge: true })
    } else {
      const userPatch: Record<string, any> = {
        paymentProvider: PAYPAL_PROVIDER,
        providerPaymentId: input.subscriptionId,
        paypalSubscriptionId: input.subscriptionId,
        subscriptionId: input.subscriptionId,
        paypalPlanId: subscription.plan_id,
        planId: identity.planId,
        payerEmail: subscription.subscriber?.email_address || currentUser.payerEmail || null,
        paypalPayerEmail: subscription.subscriber?.email_address || currentUser.paypalPayerEmail || null,
        payerId: subscription.subscriber?.payer_id || currentUser.payerId || null,
        paypalPayerId: subscription.subscriber?.payer_id || currentUser.paypalPayerId || null,
        customerId: subscription.subscriber?.payer_id || currentUser.customerId || null,
        subscriptionStatus: status,
        paypalStatus: status,
        paymentStatus: reversalAffectsCurrent
          ? reversal!.status.toUpperCase()
          : (failure ? 'PAYMENT_FAILED' : status),
        autoRenew,
        billingCycles: canonicalBillingCycles,
        nextBillingTime: nextBillingTime || currentMapping.nextBillingTime || null,
        nextBillingAt: nextBillingTime || currentMapping.nextBillingTime || null,
        latestCaptureId: currentMapping.latestCaptureId || null,
        captureId: currentMapping.latestCaptureId || null,
        latestOrderId: currentMapping.latestOrderId || null,
        orderId: currentMapping.latestOrderId || null,
        subscription: {
          provider: PAYPAL_PROVIDER,
          providerPaymentId: input.subscriptionId,
          subscriptionId: input.subscriptionId,
          planId: identity.planId,
          autoRenew,
          status,
          currentPeriodStart: currentMapping.currentPeriodStart || currentUser.currentPeriodStart || null,
          currentPeriodEnd: paidThrough || null,
        },
        updatedAt: now(),
      }
      if (reversalAffectsCurrent || (!paidThroughFuture && ['CANCELLED', 'EXPIRED', 'SUSPENDED'].includes(providerStatus))) {
        userPatch.plan = 'free'
        userPatch.planExpiry = null
        userPatch.graceUntil = null
        userPatch.currentPeriodEnd = null
      } else if (paidThrough) {
        userPatch.planExpiry = paidThrough
        userPatch.currentPeriodEnd = paidThrough
      }
      transaction.set(userRef, userPatch, { merge: true })
    }

    if (eventRef) {
      transaction.create(eventRef, {
        provider: PAYPAL_PROVIDER,
        eventId,
        eventType: eventType || 'unknown',
        subscriptionId: input.subscriptionId,
        processedAt: now(),
      })
    }
    return {
      deduped: false,
      activated,
      uid: identity.uid,
      data: { ...currentMapping, ...mappingPatch },
    }
  })

  if (result.activated) await requeuePausedAccounts(identity.uid)
  return { ...result, subscription: toPublicPayPalSubscription(result.data) }
}

export async function confirmPayPalSubscription(uid: string, subscriptionId: string) {
  if (!isValidUid(uid) || !isPayPalSubscriptionId(subscriptionId)) throw new Error('Invalid PayPal confirmation')
  return reconcileCanonical({ subscriptionId, expectedUid: uid })
}

async function ownedSubscriptionId(uid: string, requested?: string) {
  if (!isValidUid(uid)) throw new Error('Invalid user')
  if (requested) {
    if (!isPayPalSubscriptionId(requested)) throw new Error('Invalid PayPal subscription')
    const mapping = await subscriptionRef(requested).get()
    if (!mapping.exists || mapping.get('userId') !== uid) throw new Error('PayPal subscription not found')
    return requested
  }
  const user = await db.collection('users').doc(uid).get()
  const value = user.get('subscription.subscriptionId') || user.get('providerPaymentId')
  if (!isPayPalSubscriptionId(value)) return null
  const mapping = await subscriptionRef(value).get()
  if (!mapping.exists || mapping.get('userId') !== uid) return null
  return value
}

export async function getPayPalSubscriptionStatus(uid: string, requested?: string) {
  const subscriptionId = await ownedSubscriptionId(uid, requested)
  if (!subscriptionId) return { uid, subscription: toPublicPayPalSubscription({ status: 'none' }) }
  return reconcileCanonical({ subscriptionId, expectedUid: uid })
}

export async function cancelOwnedPayPalSubscription(uid: string, requested?: string, reason = 'Cancelled by customer') {
  const subscriptionId = await ownedSubscriptionId(uid, requested)
  if (!subscriptionId) throw new Error('PayPal subscription not found')
  const canonical = await getPayPalSubscription(subscriptionId)
  if (!['CANCELLED', 'EXPIRED'].includes(String(canonical?.status || '').toUpperCase())) {
    await cancelPayPalSubscription(
      subscriptionId,
      reason || 'Cancelled by customer',
      hashToken(`${uid}:${subscriptionId}:cancel`).slice(0, 36),
    )
  }
  // Cancellation only disables future renewal. reconcileCanonical preserves the
  // previously verified paid-through date until it naturally expires.
  return reconcileCanonical({ subscriptionId, expectedUid: uid })
}

export async function processPayPalWebhook(event: PayPalWebhookEvent) {
  const eventType = String(event.event_type || '')
  const eventId = typeof event.id === 'string' && event.id ? event.id : hashToken(JSON.stringify(event))
  const eventRef = db.collection('webhookEvents').doc(hashToken(`paypal:${eventId}`))
  const alreadyProcessed = await eventRef.get()
  if (alreadyProcessed.exists) {
    return { ignored: false, deduped: true, activated: false, uid: null }
  }
  const supported = eventType.startsWith('BILLING.SUBSCRIPTION.') || eventType.startsWith('PAYMENT.SALE.')
  const subscriptionId = eventSubscriptionId(event)
  if (!supported || !isPayPalSubscriptionId(subscriptionId)) {
    await db.runTransaction(async (transaction: any) => {
      const seen = await transaction.get(eventRef)
      if (!seen.exists) transaction.create(eventRef, {
        provider: PAYPAL_PROVIDER,
        eventId,
        eventType: eventType || 'unknown',
        ignored: true,
        processedAt: now(),
      })
    })
    return { ignored: true, deduped: false, activated: false, uid: null }
  }
  return reconcileCanonical({ subscriptionId, event })
}
