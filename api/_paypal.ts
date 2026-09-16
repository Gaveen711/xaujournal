type PayPalEnvironment = 'sandbox' | 'live'

export type PayPalWebhookHeaders = {
  authAlgo: string
  certUrl: string
  transmissionId: string
  transmissionSig: string
  transmissionTime: string
}

type PayPalRequestOptions = {
  method?: 'GET' | 'POST'
  body?: Record<string, unknown>
  requestId?: string
  preferRepresentation?: boolean
}

let cachedToken: { value: string; expiresAt: number; key: string } | null = null

function requiredEnv(name: string) {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`PayPal configuration is missing: ${name}`)
  return value
}

export function getPayPalEnvironment(): PayPalEnvironment {
  const value = requiredEnv('PAYPAL_ENV').toLowerCase()
  if (value !== 'sandbox' && value !== 'live') {
    throw new Error('PAYPAL_ENV must be sandbox or live')
  }
  return value
}

function apiBase(environment = getPayPalEnvironment()) {
  return environment === 'live'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com'
}

export function getPayPalClientId() {
  return requiredEnv('PAYPAL_CLIENT_ID')
}

function serverConfig() {
  return {
    clientId: getPayPalClientId(),
    clientSecret: requiredEnv('PAYPAL_CLIENT_SECRET'),
    webhookId: requiredEnv('PAYPAL_WEBHOOK_ID'),
    environment: getPayPalEnvironment(),
  }
}

function providerError(status: number) {
  const error = new Error(`PayPal request failed with status ${status}`)
  error.name = 'PayPalError'
  return error
}

async function accessToken() {
  const config = serverConfig()
  const cacheKey = `${config.environment}:${config.clientId}`
  if (cachedToken && cachedToken.key === cacheKey && cachedToken.expiresAt > Date.now() + 30_000) {
    return cachedToken.value
  }

  const credentials = Buffer.from(`${config.clientId}:${config.clientSecret}`, 'utf8').toString('base64')
  const response = await fetch(`${apiBase(config.environment)}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  })
  const payload = await response.json().catch(() => null) as any
  if (!response.ok || typeof payload?.access_token !== 'string') throw providerError(response.status)

  cachedToken = {
    value: payload.access_token,
    expiresAt: Date.now() + Math.max(60, Number(payload.expires_in) || 300) * 1000,
    key: cacheKey,
  }
  return cachedToken.value
}

async function request(path: string, options: PayPalRequestOptions = {}) {
  const token = await accessToken()
  const headers: Record<string, string> = {
    Accept: 'application/json',
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  }
  if (options.requestId) headers['PayPal-Request-Id'] = options.requestId.slice(0, 36)
  if (options.preferRepresentation) headers.Prefer = 'return=representation'

  const response = await fetch(`${apiBase()}${path}`, {
    method: options.method || 'GET',
    headers,
    ...(options.body ? { body: JSON.stringify(options.body) } : {}),
  })
  if (response.status === 204) return null
  const payload = await response.json().catch(() => null) as any
  if (!response.ok) throw providerError(response.status)
  return payload
}

export function getPayPalSubscription(subscriptionId: string) {
  return request(`/v1/billing/subscriptions/${encodeURIComponent(subscriptionId)}?fields=plan`)
}

export function createPayPalSubscription(input: {
  planId: string
  customId: string
  returnUrl: string
  cancelUrl: string
  requestId: string
}) {
  return request('/v1/billing/subscriptions', {
    method: 'POST',
    requestId: input.requestId,
    preferRepresentation: true,
    body: {
      plan_id: input.planId,
      custom_id: input.customId,
      application_context: {
        return_url: input.returnUrl,
        cancel_url: input.cancelUrl,
        user_action: 'SUBSCRIBE_NOW',
        shipping_preference: 'NO_SHIPPING',
      },
    },
  })
}

export function cancelPayPalSubscription(subscriptionId: string, reason: string, requestId: string) {
  return request(`/v1/billing/subscriptions/${encodeURIComponent(subscriptionId)}/cancel`, {
    method: 'POST',
    requestId,
    body: { reason: reason.slice(0, 128) },
  })
}

function validCertificateUrl(value: string) {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && (url.hostname === 'paypal.com' || url.hostname.endsWith('.paypal.com'))
  } catch {
    return false
  }
}

export async function verifyPayPalWebhook(headers: PayPalWebhookHeaders, event: Record<string, unknown>) {
  const values = [
    headers.authAlgo,
    headers.certUrl,
    headers.transmissionId,
    headers.transmissionSig,
    headers.transmissionTime,
  ]
  if (values.some((value) => typeof value !== 'string' || value.length === 0)) return false
  if (!validCertificateUrl(headers.certUrl)) return false

  const { webhookId } = serverConfig()
  const result = await request('/v1/notifications/verify-webhook-signature', {
    method: 'POST',
    body: {
      auth_algo: headers.authAlgo,
      cert_url: headers.certUrl,
      transmission_id: headers.transmissionId,
      transmission_sig: headers.transmissionSig,
      transmission_time: headers.transmissionTime,
      webhook_id: webhookId,
      webhook_event: event,
    },
  })
  return result?.verification_status === 'SUCCESS'
}

export function resetPayPalTokenCacheForTest() {
  cachedToken = null
}
