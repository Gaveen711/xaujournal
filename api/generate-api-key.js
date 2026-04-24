// api/generate-api-key.js
// xaujournal — Generate a per-user MT5/TradingView sync API key
// PRO ONLY — returns 403 if user is on free plan or grace period has lapsed.

import crypto from 'crypto';
import { admin, db, now } from './_firebase.js';

// ── Plan guard ────────────────────────────────────────────────────────────────
// Returns true if the user doc allows MT5 sync access.
// Allows: active Pro, OR within the 1.5-week grace period after expiry.
function isSyncAllowed(userData) {
  const { plan, planExpiry, graceUntil } = userData || {};
  const nowMs = Date.now();

  if (plan === 'pro' && planExpiry && new Date(planExpiry).getTime() > nowMs) {
    return true; // Active Pro
  }
  if (graceUntil && new Date(graceUntil).getTime() > nowMs) {
    return true; // Within grace period
  }
  return false;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST')   return res.status(405).json({ error: 'POST only' });

  const authHeader = req.headers['authorization'] || '';
  const idToken    = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!idToken) return res.status(401).json({ error: 'Missing Authorization header' });

  let uid;
  try {
    const decoded = await admin.auth().verifyIdToken(idToken);
    uid = decoded.uid;
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  try {
    // ── Pro plan gate ──
    const userDoc  = await db.collection('users').doc(uid).get();
    const userData = userDoc.data() || {};

    if (!isSyncAllowed(userData)) {
      return res.status(403).json({
        error: 'Pro subscription required',
        message: 'MT5/TradingView Auto-Sync is a Pro feature. Upgrade to generate an API key.',
      });
    }

    // Return existing key if one already exists
    const existing = await db.collection('apiKeys')
      .where('uid', '==', uid).limit(1).get();

    if (!existing.empty) {
      return res.status(200).json({ apiKey: existing.docs[0].id });
    }

    // Generate a new cryptographically secure key
    const apiKey = 'xau_' + crypto.randomBytes(24).toString('hex');

    await db.collection('apiKeys').doc(apiKey).set({
      uid,
      label:     'MT5/TradingView Sync Key',
      createdAt: now(),
    });

    await db.collection('users').doc(uid).set(
      { mt5SyncEnabled: true, syncKeyCreatedAt: now() },
      { merge: true }
    );

    console.log(`[generate-api-key] New key created for uid=${uid}`);
    return res.status(200).json({ apiKey });
  } catch (err) {
    console.error('[generate-api-key] Error:', err.message);
    return res.status(500).json({ error: 'Internal Server Error', message: err.message });
  }
}
