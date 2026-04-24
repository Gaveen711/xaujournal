// api/revoke-api-key.js
// xaujournal — Revoke a user's MT5/TradingView sync API key
// Called from the React Settings page with a valid Firebase ID token.
//
// Request:
//   POST /api/revoke-api-key
//   Authorization: Bearer <Firebase ID Token>
//
// Response:
//   { success: true }

import { admin, db } from './_firebase.js';


// ── Handler ───────────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST')   return res.status(405).json({ error: 'POST only' });

  // Verify Firebase ID token
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
    const snapshot = await db.collection('apiKeys').where('uid', '==', uid).get();

    if (snapshot.empty) {
      return res.status(200).json({ success: true, message: 'No active key to revoke' });
    }

    const batch = db.batch();
    snapshot.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();

    await db.collection('users').doc(uid).update({ mt5SyncEnabled: false });

    console.log(`[revoke-api-key] Key(s) revoked for uid=${uid}`);
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('[revoke-api-key] Error:', err.message);
    return res.status(500).json({ error: 'Internal Server Error', message: err.message });
  }
}
