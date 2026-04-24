// api/cron/revoke-expired.js
// xaujournal — Daily cron: revoke API keys for users whose grace period has ended.
//
// Runs daily at 11:00 UTC (configured in vercel.json).
// Finds all users with plan='grace' and graceUntil < now,
// deletes their apiKeys, sets plan='free', and clears mt5SyncEnabled.

import { timingSafeEqual } from 'crypto';
import { admin, db } from '../_firebase.js';


export default async function handler(req, res) {
  // ── Auth guard (timing-safe) ───────────────────────────────────────────────
  const providedAuth = req.headers.authorization || '';
  const expectedAuth = `Bearer ${process.env.CRON_SECRET}`;
  const pBuf = Buffer.from(providedAuth.padEnd(expectedAuth.length));
  const eBuf = Buffer.from(expectedAuth.padEnd(providedAuth.length));
  if (pBuf.length !== eBuf.length || !timingSafeEqual(pBuf, eBuf)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const now    = new Date();
    const nowIso = now.toISOString();

    // Find all users in grace whose grace period has now expired
    const snapshot = await db.collection('users')
      .where('plan', '==', 'grace')
      .where('graceUntil', '<=', nowIso)
      .get();

    if (snapshot.empty) {
      console.log('[revoke-expired] No expired grace periods found.');
      return res.status(200).json({ success: true, revoked: 0 });
    }

    let revokedCount = 0;

    for (const userDoc of snapshot.docs) {
      const uid = userDoc.id;
      try {
        // Delete all API keys for this user
        const keySnap = await db.collection('apiKeys').where('uid', '==', uid).get();
        const batch   = db.batch();
        keySnap.docs.forEach(doc => batch.delete(doc.ref));

        // Downgrade to free
        batch.update(db.collection('users').doc(uid), {
          plan:           'free',
          planExpiry:     null,
          graceUntil:     null,
          graceReason:    null,
          mt5SyncEnabled: false,
          updatedAt:      admin.firestore.FieldValue.serverTimestamp(),
        });

        await batch.commit();
        revokedCount++;
        console.log(`[revoke-expired] Revoked keys and downgraded uid=${uid}`);
      } catch (e) {
        console.error(`[revoke-expired] Failed for uid=${uid}:`, e.message);
      }
    }

    return res.status(200).json({ success: true, revoked: revokedCount });
  } catch (error) {
    console.error('[revoke-expired] Cron error:', error);
    return res.status(500).json({ error: error.message });
  }
}
