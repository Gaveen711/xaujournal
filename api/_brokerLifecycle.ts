import { fetchBrokerTrades, deleteMetaApiAccount } from './_metaapi-broker.js'

// Server-only cleanup ledger. Contains provider IDs and retry timestamps, never
// logins, passwords or tokens. Ten minutes exceeds the function's 300s lifetime.
export async function fetchTrackedBrokerTrades(db: any, credentials: any) {
  return fetchBrokerTrades(credentials, null, {
    onCreated: (id: string) => db.collection('brokerCleanup').doc(id).set({
      providerAccountId: id,
      nextAttemptAt: new Date(Date.now() + 10 * 60_000).toISOString(),
    }),
    onRemoved: (id: string) => db.collection('brokerCleanup').doc(id).delete(),
  })
}

export async function retryBrokerCleanup(db: any) {
  let due
  try {
    due = await db.collection('brokerCleanup')
      .where('nextAttemptAt', '<=', new Date().toISOString()).limit(3).get()
  } catch {
    // Cleanup recovery is best effort and must not make the user-facing poller fail.
    return 0
  }
  let removed = 0
  for (const doc of due?.docs || []) {
    const record = doc.data()
    if (record.providerAccountId !== doc.id) continue
    try {
      await deleteMetaApiAccount(doc.id)
      if (typeof doc.ref.delete === 'function') await doc.ref.delete()
      removed++
    } catch {
      await doc.ref.update({ nextAttemptAt: new Date(Date.now() + 60 * 60_000).toISOString() })
    }
  }
  return removed
}
