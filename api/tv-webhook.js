// api/tv-webhook.js
// xaujournal — TradingView Alert Webhook
// Receives alert payloads from TradingView strategies.
//
// TradingView Alert Message template:
// {
//   "apiKey": "YOUR_XAU_API_KEY",
//   "event":      "open",
//   "source":     "tradingview",
//   "positionId": "{{ticker}}-{{timenow}}",
//   "symbol":     "{{ticker}}",
//   "direction":  "{{strategy.order.action}}",
//   "lots":       0.10,
//   "price":      {{close}},
//   "profit":     0,
//   "time":       "{{timenow}}"
// }
//
// NOTE: TradingView cannot report broker P&L — profit is always 0.
// P&L can be edited manually in the journal, or auto-filled when the
// MT5 EA closes the matching trade.

import admin from 'firebase-admin';

// ── Firebase Admin init ───────────────────────────────────────────────────────
let db;
try {
  if (!admin.apps.length) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  }
  db = admin.firestore();
} catch (e) {
  console.error('Firebase Admin init error:', e.message);
}

const now = () => admin.firestore.FieldValue.serverTimestamp();

// ── Helpers (same open/close logic as sync-trade) ────────────────────────────

// ── Shared plan guard ───────────────────────────────────────────────────────
function isSyncAllowed(userData) {
  const { plan, planExpiry, graceUntil } = userData || {};
  const nowMs = Date.now();
  if (plan === 'pro' && planExpiry && new Date(planExpiry).getTime() > nowMs) return true;
  if (graceUntil && new Date(graceUntil).getTime() > nowMs) return true;
  return false;
}

async function resolveKey(apiKey) {
  if (!apiKey) return null;
  const doc = await db.collection('apiKeys').doc(apiKey).get();
  if (!doc.exists) return null;
  const uid = doc.data().uid;
  if (!uid) return null;

  const userDoc = await db.collection('users').doc(uid).get();
  if (!isSyncAllowed(userDoc.data())) return null;

  return uid;
}

async function handleOpen(tradeRef, payload) {
  const snap = await tradeRef.get();
  if (snap.exists) return { status: 'duplicate' };

  await tradeRef.set({
    positionId:     payload.positionId,
    symbol:         payload.symbol,
    direction:      payload.direction,
    lots:           Number(payload.lots)       || 0,
    openPrice:      Number(payload.price)      || 0,
    openTime:       payload.time,
    status:         'open',
    commission:     0,
    swap:           0,
    comment:        payload.comment || '',
    source:         'tradingview',
    createdAt:      now(),
    updatedAt:      now(),
  });

  return { status: 'created', positionId: payload.positionId };
}

async function handleClose(tradeRef, payload) {
  const snap       = await tradeRef.get();
  const brokerPnl  = Number(payload.profit)     || 0;
  const commission = Number(payload.commission) || 0;
  const swap       = Number(payload.swap)       || 0;
  const netPnl     = brokerPnl + commission + swap;

  const PIP_SIZE = 0.1;
  let pips = null;

  if (snap.exists) {
    const openPrice  = snap.data().openPrice || 0;
    const direction  = snap.data().direction || payload.direction;
    const closePrice = Number(payload.price) || 0;
    const diff = direction === 'buy'
      ? closePrice - openPrice
      : openPrice  - closePrice;
    pips = Math.round(diff / PIP_SIZE);

    await tradeRef.update({
      closePrice: Number(payload.price) || 0,
      closeTime:  payload.time,
      pnl:        brokerPnl,
      commission,
      swap,
      netPnl,
      pips,
      status:     'closed',
      updatedAt:  now(),
    });
  } else {
    await tradeRef.set({
      positionId:  payload.positionId,
      symbol:      payload.symbol,
      direction:   payload.direction,
      lots:        Number(payload.lots)  || 0,
      closePrice:  Number(payload.price) || 0,
      closeTime:   payload.time,
      pnl:         brokerPnl,
      commission,
      swap,
      netPnl,
      status:      'closed',
      partial:     true,
      source:      'tradingview',
      createdAt:   now(),
      updatedAt:   now(),
    });
  }

  return { status: 'updated', positionId: payload.positionId, pnl: brokerPnl, pips };
}

// ── Handler ───────────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST')   return res.status(405).json({ error: 'POST only' });

  const body   = req.body;
  const apiKey = body?.apiKey || req.headers['x-api-key'];
  const uid    = await resolveKey(apiKey);
  if (!uid) return res.status(403).json({ error: 'Invalid API key or subscription expired' });

  const { event, positionId, symbol } = body;
  if (!event || !positionId || !symbol)
    return res.status(400).json({ error: 'Missing: event, positionId, symbol' });

  const tradeRef = db
    .collection('users').doc(uid)
    .collection('trades').doc(`pos_${positionId}`);

  let result;
  try {
    if      (event === 'open')  result = await handleOpen(tradeRef, body);
    else if (event === 'close') result = await handleClose(tradeRef, body);
    else return res.status(400).json({ error: `Unknown event: ${event}` });
  } catch (err) {
    console.error('[tv-webhook] Firestore error:', err.message);
    return res.status(500).json({ error: 'Internal Server Error', message: err.message });
  }

  console.log(`[tv-webhook] uid=${uid} event=${event} pos=${positionId}`, result);
  return res.status(200).json(result);
}
