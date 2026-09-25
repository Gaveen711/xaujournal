import {
  analyticsDeltaForTrades, analyticsUpdate, subtractTradeAnalytics, tradeAnalyticsDelta,
  sessionAnalyticsDelta, sessionAnalyticsDeltaForTrades, sessionAnalyticsUpdate, subtractSessionAnalytics,
} from '../src/lib/tradeAnalytics.js'
import { chunkedDbGetAll } from './_firestoreUtils.js'

const FIRESTORE_BATCH_WRITE_LIMIT = 450

/** Session deltas are bucketed ({bucket: {counter}}), not flat — accumulate per bucket. */
function addSessionDelta(total: any, delta: any) {
  Object.keys(total).forEach((bucket) => {
    Object.keys(total[bucket]).forEach((key) => { total[bucket][key] += delta[bucket][key] })
  })
}

export function toDateOrNull(value: any): Date | null {
  if (!value) return null
  if (typeof value.toDate === 'function') return value.toDate()
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

export async function persistBrokerTrades({
  db, userId, accountId, brokerTrades, timestampFactory, incrementFactory,
}: {
  db: any
  userId: string
  accountId: string
  brokerTrades: any[]
  timestampFactory: () => any
  incrementFactory?: (value: number) => any
}) {
  const tradesRef = db.collection('users').doc(userId).collection('trades')
  const uniqueTrades = [...new Map(brokerTrades.map((trade: any) => [String(trade.closeDealTicket), trade])).values()]

  let newTrades = 0
  let updatedTrades = 0
  for (let i = 0; i < uniqueTrades.length; i += FIRESTORE_BATCH_WRITE_LIMIT) {
    const chunk = uniqueTrades.slice(i, i + FIRESTORE_BATCH_WRITE_LIMIT)
    const processChunk = async (batch: any, snapshots: any[]) => {
    // Reads and aggregate deltas share the transaction. On conflict Firestore
    // retries against the committed documents instead of counting them twice.
    const existingTrades = new Map<string, any>()
    snapshots.forEach((snap: any) => { if (snap.exists) existingTrades.set(snap.id, snap.data()) })
    let added = 0
    let updated = 0
    const aggregateDelta = analyticsDeltaForTrades([])
    const sessionAggregateDelta = sessionAnalyticsDeltaForTrades([])

    for (const trade of chunk) {
      const tradeDocId = 'broker_' + accountId + '_' + trade.closeDealTicket
      const previous = existingTrades.get(tradeDocId)
      const exists = Boolean(previous)
      const tradeData: any = { ...trade, accountId, syncedAt: timestampFactory(), updatedAt: timestampFactory() }
      // Audit stamp normalizeDeal cannot set (no timestamp factory there). Only
      // accompanies actual session fields — a doc without them gets none invented.
      if (tradeData.sessionEngineVersion !== undefined) tradeData.sessionResolvedAt = timestampFactory()
      if (exists) {
        updated++
      } else {
        tradeData.createdAt = timestampFactory()
        added++
      }
      batch.set(tradesRef.doc(tradeDocId), tradeData, { merge: true })
      const nextTrade = exists ? { ...previous, ...tradeData } : tradeData
      const delta = exists
        ? subtractTradeAnalytics(previous, nextTrade)
        : tradeAnalyticsDelta(tradeData)
      Object.keys(aggregateDelta).forEach((key) => { aggregateDelta[key] += delta[key] })
      // 'Unknown' is a legitimate aggregate bucket (untimed trades); it is
      // never a stored sessionCode — that comes from resolveSessionAt upstream.
      addSessionDelta(sessionAggregateDelta, exists
        ? subtractSessionAnalytics(previous, nextTrade)
        : sessionAnalyticsDelta(tradeData))
    }

    if (incrementFactory) {
      const hasAggregateChanges = Object.values(aggregateDelta).some((value) => value !== 0)
      // One update per batch: 'analytics.*' and 'sessionAnalytics.buckets.*'
      // dot paths (plus 'totalTradesLogged') cannot collide, and
      // sessionAnalyticsUpdate drops zero counters so an all-zero session
      // delta contributes nothing.
      const userUpdate: any = hasAggregateChanges ? analyticsUpdate(aggregateDelta, incrementFactory) : {}
      Object.assign(userUpdate, sessionAnalyticsUpdate(sessionAggregateDelta, incrementFactory))
      if (Object.keys(userUpdate).length) {
        batch.update(db.collection('users').doc(userId), userUpdate)
      }
    }
    return { added, updated }
    }
    const refs = chunk.map((trade: any) => tradesRef.doc('broker_' + accountId + '_' + trade.closeDealTicket))
    const counts = db.runTransaction
      ? await db.runTransaction(async (tx: any) => {
        const snapshots = []
        for (const ref of refs) snapshots.push(await tx.get(ref))
        const result = await processChunk({
          set: (ref: any, data: any, opts: any) => tx.set(ref, data, opts),
          update: (ref: any, data: any) => tx.update(ref, data),
        }, snapshots)
        return result
      })
      : await (async () => {
        const snapshots = await chunkedDbGetAll(db, refs)
        const batch = db.batch()
        const writes: any[] = []
        const result = await processChunk({
          set: (ref: any, data: any, opts: any) => writes.push(() => batch.set(ref, data, opts)),
          update: (ref: any, data: any) => writes.push(() => batch.update(ref, data)),
        }, snapshots)
        for (const write of writes) write()
        await batch.commit()
        return result
      })()
    newTrades += counts.added
    updatedTrades += counts.updated
  }

  return { newTrades, updatedTrades, totalFetched: uniqueTrades.length }
}
