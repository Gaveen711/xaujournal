// functions/index.js
// xaujournal — Auto-Sync Cloud Functions
//
// Handles trade data from:
//   • MT5 Expert Advisor  (x-api-key header auth)
//   • TradingView Alerts  (x-api-key header auth via webhook)
//
// DEPLOY:
//   firebase deploy --only functions
//
// SET API KEYS:
//   No config needed — keys stored in Firestore "apiKeys" collection.
//   Keys are generated per-user via the generateApiKey callable function.

const functions = require("firebase-functions");
const admin     = require("firebase-admin");
const crypto    = require("crypto");

if (!admin.apps.length) admin.initializeApp();
const db  = admin.firestore();
const now = () => admin.firestore.FieldValue.serverTimestamp();

// ─────────────────────────────────────────────────────────────────────────────
// Shared helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Resolve an API key to a Firebase uid.
 * Returns uid string, or null if invalid.
 */
async function resolveKey(apiKey) {
  if (!apiKey) return null;
  const doc = await db.collection("apiKeys").doc(apiKey).get();
  if (!doc.exists) return null;
  return doc.data().uid || null;
}

/**
 * Upsert an open trade record. Creates if not exists, skips if already open.
 */
async function handleOpen(tradeRef, payload) {
  const snap = await tradeRef.get();
  if (snap.exists) return { status: "duplicate" };

  await tradeRef.set({
    positionId:      payload.positionId,
    openDealTicket:  payload.ticket || null,
    symbol:          payload.symbol,
    direction:       payload.direction,
    lots:            Number(payload.lots)  || 0,
    openPrice:       Number(payload.price) || 0,
    openTime:        payload.time,
    status:          "open",
    commission:      Number(payload.commission) || 0,
    swap:            Number(payload.swap)       || 0,
    comment:         payload.comment || "",
    source:          payload.source || "unknown",
    createdAt:       now(),
    updatedAt:       now(),
  });

  return { status: "created", positionId: payload.positionId };
}

/**
 * Close an existing trade record (or create partial if open was missed).
 * Uses broker-reported P&L as source of truth — no recalculation.
 */
async function handleClose(tradeRef, payload) {
  const snap       = await tradeRef.get();
  const brokerPnl  = Number(payload.profit)     || 0;
  const commission = Number(payload.commission) || 0;
  const swap       = Number(payload.swap)       || 0;
  const netPnl     = brokerPnl + commission + swap;

  // Pip calculation — XAUUSD convention: 1 pip = $0.10
  const PIP_SIZE   = 0.1;
  let pips         = null;

  if (snap.exists) {
    const openPrice  = snap.data().openPrice  || 0;
    const direction  = snap.data().direction  || payload.direction;
    const closePrice = Number(payload.price)  || 0;
    const diff       = direction === "buy"
      ? closePrice - openPrice
      : openPrice  - closePrice;
    pips = Math.round(diff / PIP_SIZE);

    await tradeRef.update({
      closeDealTicket: payload.ticket || null,
      closePrice:      Number(payload.price) || 0,
      closeTime:       payload.time,
      pnl:             brokerPnl,
      commission,
      swap,
      netPnl,
      pips,
      status:          "closed",
      updatedAt:       now(),
    });
  } else {
    // EA was installed after the trade opened — create partial record
    await tradeRef.set({
      positionId:      payload.positionId,
      closeDealTicket: payload.ticket || null,
      symbol:          payload.symbol,
      direction:       payload.direction,
      lots:            Number(payload.lots)  || 0,
      closePrice:      Number(payload.price) || 0,
      closeTime:       payload.time,
      pnl:             brokerPnl,
      commission,
      swap,
      netPnl,
      status:          "closed",
      partial:         true,
      source:          payload.source || "unknown",
      createdAt:       now(),
      updatedAt:       now(),
    });
  }

  return { status: "updated", positionId: payload.positionId, pnl: brokerPnl, pips };
}


// ─────────────────────────────────────────────────────────────────────────────
// syncTrade — receives from MT5 EA (and any raw HTTP client)
// ─────────────────────────────────────────────────────────────────────────────
exports.syncTrade = functions
  .runWith({ timeoutSeconds: 30, memory: "256MB" })
  .https.onRequest(async (req, res) => {

    res.set("Access-Control-Allow-Origin", "*");
    if (req.method === "OPTIONS") return res.status(204).send("");
    if (req.method !== "POST")   return res.status(405).json({ error: "POST only" });

    const apiKey = req.headers["x-api-key"] || req.body?.apiKey;
    const uid    = await resolveKey(apiKey);
    if (!uid) return res.status(403).json({ error: "Invalid API key" });

    const { event, positionId, symbol } = req.body;
    if (!event || !positionId || !symbol)
      return res.status(400).json({ error: "Missing: event, positionId, symbol" });

    const tradeRef = db
      .collection("users").doc(uid)
      .collection("trades").doc(`pos_${positionId}`);

    let result;
    if (event === "open")       result = await handleOpen(tradeRef, req.body);
    else if (event === "close") result = await handleClose(tradeRef, req.body);
    else return res.status(400).json({ error: `Unknown event: ${event}` });

    console.log(`[syncTrade] uid=${uid} event=${event} pos=${positionId}`, result);
    return res.status(200).json(result);
  });


// ─────────────────────────────────────────────────────────────────────────────
// tvWebhook — receives TradingView alert webhooks
//
// TradingView Alert Message template (paste into TradingView alert):
// {
//   "apiKey": "YOUR_API_KEY",
//   "event": "{{strategy.order.action == 'buy' ? 'open' : 'close'}}",
//   "source": "tradingview",
//   "positionId": "{{ticker}}-{{timenow}}",
//   "symbol": "{{ticker}}",
//   "direction": "{{strategy.order.action}}",
//   "lots": 0.10,
//   "price": {{close}},
//   "profit": 0,
//   "time": "{{timenow}}"
// }
//
// NOTE: TradingView can't report broker P&L — profit will be 0 on the webhook.
// The trade will show in the journal as "TV alert" and P&L can be edited manually,
// OR you can pair this with the MT5 EA (MT5 EA fills P&L when it closes the trade).
// ─────────────────────────────────────────────────────────────────────────────
exports.tvWebhook = functions
  .runWith({ timeoutSeconds: 30, memory: "256MB" })
  .https.onRequest(async (req, res) => {

    res.set("Access-Control-Allow-Origin", "*");
    if (req.method === "OPTIONS") return res.status(204).send("");
    if (req.method !== "POST")   return res.status(405).json({ error: "POST only" });

    const body   = req.body;
    const apiKey = body?.apiKey || req.headers["x-api-key"];
    const uid    = await resolveKey(apiKey);
    if (!uid) return res.status(403).json({ error: "Invalid API key" });

    const { event, positionId, symbol } = body;
    if (!event || !positionId || !symbol)
      return res.status(400).json({ error: "Missing: event, positionId, symbol" });

    // Tag the source so the UI can show a "TV" badge
    body.source = "tradingview";

    const tradeRef = db
      .collection("users").doc(uid)
      .collection("trades").doc(`pos_${positionId}`);

    let result;
    if (event === "open")       result = await handleOpen(tradeRef, body);
    else if (event === "close") result = await handleClose(tradeRef, body);
    else return res.status(400).json({ error: `Unknown event: ${event}` });

    console.log(`[tvWebhook] uid=${uid} event=${event} pos=${positionId}`, result);
    return res.status(200).json(result);
  });


// ─────────────────────────────────────────────────────────────────────────────
// generateApiKey — callable from your React app (Settings page)
// ─────────────────────────────────────────────────────────────────────────────
exports.generateApiKey = functions.https.onCall(async (data, context) => {
  if (!context.auth)
    throw new functions.https.HttpsError("unauthenticated", "Login required");

  const uid = context.auth.uid;

  // Return existing key if one already exists
  const existing = await db.collection("apiKeys")
    .where("uid", "==", uid).limit(1).get();

  if (!existing.empty)
    return { apiKey: existing.docs[0].id };

  // Generate a new cryptographically secure key prefixed with "xau_"
  const apiKey = "xau_" + crypto.randomBytes(24).toString("hex");

  await db.collection("apiKeys").doc(apiKey).set({
    uid,
    label:     "MT5/TradingView Sync Key",
    createdAt: now(),
  });

  await db.collection("users").doc(uid).set(
    { mt5SyncEnabled: true, syncKeyCreatedAt: now() },
    { merge: true }
  );

  return { apiKey };
});


// ─────────────────────────────────────────────────────────────────────────────
// revokeApiKey — callable from your React app (Settings page)
// ─────────────────────────────────────────────────────────────────────────────
exports.revokeApiKey = functions.https.onCall(async (data, context) => {
  if (!context.auth)
    throw new functions.https.HttpsError("unauthenticated", "Login required");

  const uid = context.auth.uid;
  const snapshot = await db.collection("apiKeys").where("uid", "==", uid).get();

  const batch = db.batch();
  snapshot.docs.forEach(doc => batch.delete(doc.ref));
  await batch.commit();

  await db.collection("users").doc(uid).update({ mt5SyncEnabled: false });
  return { success: true };
});
