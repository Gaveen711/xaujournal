const messages: Record<string, string> = {
  'broker-config': 'Broker sync is not configured. Please contact support.',
  'broker-provider-auth': 'Broker service authorization failed. Please contact support.',
  'broker-credentials': 'Broker login failed. Check the account, password, server and platform.',
  'broker-timeout': 'Broker synchronization took too long. Please retry.',
  'broker-history-incomplete': 'Broker history is still synchronizing. Please retry.',
  'broker-history-limit': 'Broker history is too large for one import. Please contact support.',
  'broker-cleanup': 'Broker cleanup is pending. Please retry later.',
  'broker-quota': 'Broker service capacity is temporarily unavailable. Please retry later.',
  'broker-busy': 'A broker operation is already running. Please wait and try again.',
  'broker-unavailable': 'Broker service is temporarily unavailable. Please retry later.',
  'broker-failed': 'Broker sync failed. Please retry or contact support.',
}

export function brokerErrorDetails(error: any) {
  let code = Object.hasOwn(messages, error?.code || '') ? error.code : 'broker-failed'
  const name = error?.name || error?.constructor?.name
  if (code === 'broker-failed') {
    if (['UnauthorizedError', 'ForbiddenError', 'MethodAccessError'].includes(name)) code = 'broker-provider-auth'
    else if (name === 'TimeoutError') code = 'broker-timeout'
    else if (['TooManyRequestsError', 'QuotaExceededError'].includes(name)) code = 'broker-quota'
    // Only explicit broker auth failures should blame the user's password.
    else if (error?.details?.error === 'AUTH' || error?.details?.code === 'AUTH') code = 'broker-credentials'
  }
  const status = code === 'broker-credentials' ? 422 : code === 'broker-busy' ? 409
    : code === 'broker-timeout' ? 504 : ['broker-quota', 'broker-unavailable'].includes(code) ? 503 : 502
  return { code, message: messages[code], status }
}

export function brokerOperationError(code: string) {
  return Object.assign(new Error(messages[code]), { code })
}
