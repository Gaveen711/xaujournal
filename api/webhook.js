// api/webhook.js
// XAU Journal — Stripe Webhook Handler
//
// Events handled:
//   checkout.session.completed      → upgrade user to Pro
//   invoice.paid                    → renewal: reset expiry + clear grace
//   invoice.payment_failed          → start 1.5-week grace period
//   customer.subscription.deleted  → start 1.5-week grace period

import Stripe from 'stripe';
import { admin, db } from './_firebase.js';

export const config = { api: { bodyParser: false } };

const getRawBody = async (readable) => {
  const chunks = [];
  for await (const chunk of readable) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
};

const GRACE_MS = 10.5 * 24 * 60 * 60 * 1000; // 1.5 weeks in ms

// ── Helper: find userId by stripeCustomerId ───────────────────────────────────
async function findUserByCustomer(customerId) {
  if (!customerId) return null;
  const snap = await db.collection('users')
    .where('stripeCustomerId', '==', customerId).limit(1).get();
  if (snap.empty) return null;
  return snap.docs[0].id;
}

// ── Helper: start grace period for a user ────────────────────────────────────
async function startGracePeriod(uid, reason) {
  const graceUntil = new Date(Date.now() + GRACE_MS).toISOString();
  await db.collection('users').doc(uid).set({
    plan:           'grace',
    graceUntil,
    graceReason:    reason,
    mt5SyncEnabled: true, // still allowed during grace
    updatedAt:      admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });
  console.log(`⏳ Grace period started for uid=${uid} until ${graceUntil} (${reason})`);
}

// ─────────────────────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  console.log('➡️ WEBHOOK INVOCATION START');

  try {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

    const { STRIPE_SECRET, STRIPE_WEBHOOK_SECRET } = process.env;
    if (!STRIPE_SECRET || !STRIPE_WEBHOOK_SECRET) {
      console.error('❌ MISSING STRIPE VARS');
      return res.status(500).json({ error: 'Configuration Error' });
    }

    const stripe = new Stripe(STRIPE_SECRET);
    const sig    = req.headers['stripe-signature'];
    if (!sig) return res.status(400).json({ error: 'Missing stripe-signature header' });

    const rawBody = await getRawBody(req);

    let event;
    try {
      event = stripe.webhooks.constructEvent(rawBody, sig, STRIPE_WEBHOOK_SECRET);
      console.log('⚓ EVENT VERIFIED:', event.type);
    } catch (err) {
      console.error('❌ SIGNATURE ERROR:', err.message);
      return res.status(400).json({ error: `Webhook Signature Error: ${err.message}` });
    }

    if (!db) {
      console.error('❌ DB NOT AVAILABLE');
      return res.status(500).json({ error: 'Database not initialized. Check FIREBASE_SERVICE_ACCOUNT.' });
    }

    // ── checkout.session.completed → upgrade to Pro ──────────────────────────
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const userId  = session.metadata?.userId;

      console.log('👤 PROCESSING UPGRADE FOR:', userId);
      if (!userId) return res.status(200).json({ status: 'ignored_no_user' });

      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 30);

      await db.collection('users').doc(userId).set({
        plan:             'pro',
        planExpiry:       expiryDate.toISOString(),
        graceUntil:       null,
        graceReason:      null,
        mt5SyncEnabled:   true,
        stripeCustomerId: session.customer,
        updatedAt:        admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });

      console.log('💎 USER UPGRADED SUCCESSFULLY');
    }

    // ── invoice.paid → renewal ───────────────────────────────────────────────
    else if (event.type === 'invoice.paid') {
      const uid = await findUserByCustomer(event.data.object.customer);
      if (uid) {
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + 30);
        await db.collection('users').doc(uid).set({
          plan:           'pro',
          planExpiry:     expiryDate.toISOString(),
          graceUntil:     null,
          graceReason:    null,
          mt5SyncEnabled: true,
          updatedAt:      admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
        console.log(`✅ Renewal processed for uid=${uid}`);
      }
    }

    // ── invoice.payment_failed → start grace ─────────────────────────────────
    else if (event.type === 'invoice.payment_failed') {
      const uid = await findUserByCustomer(event.data.object.customer);
      if (uid) await startGracePeriod(uid, 'payment_failed');
    }

    // ── subscription.deleted → start grace ───────────────────────────────────
    else if (event.type === 'customer.subscription.deleted') {
      const uid = await findUserByCustomer(event.data.object.customer);
      if (uid) await startGracePeriod(uid, 'subscription_cancelled');
    }

    return res.status(200).json({ received: true });

  } catch (globalError) {
    console.error('💀 GLOBAL WEBHOOK ERROR:', globalError);
    return res.status(500).json({
      error:   'Internal Server Error',
      message: globalError.message,
    });
  }
}
