import crypto from 'crypto'
import { kv } from '@vercel/kv'

const inflight = new Map<string, Promise<any>>()
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export async function withRetryBudget<T>(
  provider: string,
  operation: (signal: AbortSignal) => Promise<T>,
  options: { timeoutMs?: number; retries?: number; circuitFailures?: number; circuitSeconds?: number } = {},
): Promise<T> {
  const timeoutMs = options.timeoutMs ?? 20_000
  const retries = options.retries ?? 2
  const circuitFailures = options.circuitFailures ?? 5
  const circuitSeconds = options.circuitSeconds ?? 60
  const circuitKey = 'circuit:' + provider
  const circuit = await kv.get<any>(circuitKey).catch(() => null)
  if (circuit?.openUntil > Date.now()) throw new Error(provider + ' circuit is temporarily open')

  let lastError: any
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController()
    let timeout: ReturnType<typeof setTimeout> | undefined
    try {
      const result = await Promise.race([
        operation(controller.signal),
        new Promise<never>((_, reject) => {
          timeout = setTimeout(() => {
            controller.abort()
            reject(new Error(provider + ' request budget exceeded'))
          }, timeoutMs)
        }),
      ])
      await kv.del(circuitKey).catch(() => undefined)
      return result
    } catch (error) {
      lastError = error
      if (attempt < retries) await sleep(Math.min(250 * (2 ** attempt) + Math.random() * 150, 2_000))
    } finally {
      if (timeout) clearTimeout(timeout)
    }
  }

  const failures = Number(circuit?.failures || 0) + 1
  await kv.set(circuitKey, {
    failures,
    openUntil: failures >= circuitFailures ? Date.now() + circuitSeconds * 1000 : 0,
  }, { ex: circuitSeconds * 2 }).catch(() => undefined)
  throw lastError
}

export type AccountLockResult<T> = { acquired: true; value: T } | { acquired: false }

export async function withAccountLock<T>(accountId: string, operation: () => Promise<T>): Promise<AccountLockResult<T>> {
  const key = 'lock:broker:' + accountId
  const token = crypto.randomUUID()
  const acquired = await kv.set(key, token, { nx: true, ex: 360 }).catch(() => {
    throw Object.assign(new Error('Broker locking is temporarily unavailable'), { code: 'broker-unavailable' })
  })
  if (!acquired) return { acquired: false }
  try {
    return { acquired: true, value: await operation() }
  } finally {
    const owner = await kv.get<string>(key).catch(() => null)
    if (owner === token) await kv.del(key).catch(() => undefined)
  }
}

export async function cachedJson<T>(
  key: string,
  loader: () => Promise<T>,
  options: { freshSeconds?: number; staleSeconds?: number } = {},
): Promise<{ data: T; cache: 'HIT' | 'STALE' | 'MISS' }> {
  const freshSeconds = options.freshSeconds ?? 15
  const staleSeconds = options.staleSeconds ?? 120
  const cacheKey = 'swr:' + key
  const cached = await kv.get<any>(cacheKey).catch(() => null)
  const age = cached ? Date.now() - cached.storedAt : Infinity
  if (cached && age < freshSeconds * 1000) return { data: cached.data, cache: 'HIT' }

  const refresh = () => {
    if (!inflight.has(cacheKey)) {
      const promise = loader()
        .then(async (data) => {
          await kv.set(cacheKey, { data, storedAt: Date.now() }, { ex: freshSeconds + staleSeconds }).catch(() => undefined)
          return data
        })
        .finally(() => inflight.delete(cacheKey))
      inflight.set(cacheKey, promise)
    }
    return inflight.get(cacheKey) as Promise<T>
  }

  if (cached && age < (freshSeconds + staleSeconds) * 1000) {
    void refresh().catch(() => undefined)
    return { data: cached.data, cache: 'STALE' }
  }
  return { data: await refresh(), cache: 'MISS' }
}
