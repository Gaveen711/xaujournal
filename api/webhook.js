// api/webhook.js
// xaujournal — Stripe Webhook Handler
//
// Events handled:
//   checkout.session.completed      → upgrade user to Pro
//   invoice.paid                    → renewal: reset expiry + clear grace
//   invoice.payment_failed          → start 1.5-week grace period
//   customer.subscription.deleted  → start 1.5-week grace period

import Stripe from 'stripe';
import { admin, db, isDbReady } from './_firebase.js';
import resend from './_resend.js';

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
      console.log('⚓ EVENT VERIFIED:', event.type, 'ID:', event.id);
    } catch (err) {
      console.error('❌ SIGNATURE ERROR:', err.message);
      return res.status(400).json({ error: `Webhook Signature Error: ${err.message}` });
    }

    if (!isDbReady()) {
      console.error('❌ DB NOT AVAILABLE — FIREBASE_SERVICE_ACCOUNT env var likely missing or malformed in Vercel.');
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

      // ── Send Institutional Invoice Email ──────────────────────────
      try {
        const userEmail = session.customer_details?.email || session.metadata?.email;
        if (userEmail) {
          const dateStr = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
          const amountStr = (session.amount_total / 100).toFixed(2);
          const invoiceNum = session.invoice ? session.invoice.toString().slice(-4) : Math.floor(1000 + Math.random() * 9000);

          await resend.emails.send({
            from: 'xaujournal <billing@xaujournal.com>',
            to: userEmail,
            subject: `Institutional Receipt: XAU-${invoiceNum} | xaujournal`,
            html: `
              <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 60px; background: #0d0d14; color: #ffffff; border-radius: 32px; border: 1px solid #ffffff10;">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 60px;">
                  <div>
                    <h1 style="font-size: 28px; font-weight: 900; letter-spacing: -0.05em; margin: 0; color: #8b5cf6;">XAUJOURNAL</h1>
                    <p style="text-transform: uppercase; font-size: 10px; font-weight: 900; letter-spacing: 0.3em; color: #64748b; margin-top: 8px;">Institutional Receipt</p>
                  </div>
                  <div style="text-align: right;">
                    <p style="font-size: 12px; font-weight: 900; color: #ffffff; margin: 0;">INVOICE #XAU-${invoiceNum}</p>
                    <p style="font-size: 10px; color: #64748b; margin: 4px 0 0 0;">DATE: ${dateStr.toUpperCase()}</p>
                  </div>
                </div>

                <div style="border-top: 1px solid #ffffff10; border-bottom: 1px solid #ffffff10; padding: 40px 0; margin-bottom: 40px;">
                  <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                      <td style="font-size: 11px; font-weight: 900; color: #64748b; text-transform: uppercase; padding-bottom: 12px;">Description</td>
                      <td style="font-size: 11px; font-weight: 900; color: #64748b; text-transform: uppercase; text-align: right; padding-bottom: 12px;">Amount</td>
                    </tr>
                    <tr>
                      <td style="font-size: 14px; font-weight: 700; color: #ffffff; padding: 20px 0;">PRO TERMINAL SUBSCRIPTION (MONTHLY)</td>
                      <td style="font-size: 15px; font-weight: 900; color: #8b5cf6; text-align: right; padding: 20px 0;">$${amountStr}</td>
                    </tr>
                  </table>
                </div>

                <div style="text-align: right; margin-bottom: 60px;">
                  <p style="font-size: 11px; color: #64748b; margin: 0; font-weight: 900; text-transform: uppercase;">Total Amount Paid</p>
                  <h2 style="font-size: 42px; font-weight: 900; margin: 8px 0; color: #ffffff;">$${amountStr} <span style="font-size: 14px; color: #64748b; font-weight: 500;">USD</span></h2>
                </div>

                <div style="background: #ffffff05; padding: 24px; border-radius: 20px; border: 1px solid #ffffff05;">
                  <p style="font-size: 10px; font-weight: 900; color: #64748b; text-transform: uppercase; margin-bottom: 8px;">Status</p>
                  <p style="font-size: 13px; color: #ffffff; margin: 0; font-weight: 700;">PRO ACCESS GRANTED • SECURED STRIPE NODE</p>
                </div>

                <div style="margin-top: 60px; padding-top: 40px; border-top: 1px solid #ffffff10;">
                  <p style="font-size: 11px; font-weight: 900; color: #22c55e; letter-spacing: 0.1em; margin: 0; text-transform: uppercase;">Curated by Gaveen.</p>
                  <p style="font-size: 10px; color: #475569; margin: 8px 0 0 0; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">Secured Cloud Infrastructure | Trading Analytics Unit</p>
                </div>
              </div>
            `
          });
          console.log('📧 Institutional invoice dispatched to:', userEmail);
        }
      } catch (emailErr) {
        console.error('❌ Failed to dispatch invoice email:', emailErr);
      }
    }

    // ── invoice.paid / invoice.payment_succeeded → renewal ─────────────────
    else if (event.type === 'invoice.paid' || event.type === 'invoice.payment_succeeded') {
      const customerId = event.data.object.customer;
      const uid = await findUserByCustomer(customerId);
      console.log(`🔍 Renewal: customer=${customerId} -> uid=${uid}`);
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
        console.log(`✅ Renewal processed for uid=${uid} (${event.type})`);
      }
    }

    // ── invoice.payment_failed → start grace ─────────────────────────────────
    else if (event.type === 'invoice.payment_failed') {
      const uid = await findUserByCustomer(event.data.object.customer);
      if (uid) await startGracePeriod(uid, 'payment_failed');
    }

    // ── subscription.deleted / updated (cancellation) ────────────────────────
    else if (event.type === 'customer.subscription.deleted') {
      const uid = await findUserByCustomer(event.data.object.customer);
      console.log(`🔍 Deletion: customer=${event.data.object.customer} -> uid=${uid}`);
      if (uid) await startGracePeriod(uid, 'subscription_deleted');
    }

    else if (event.type === 'customer.subscription.updated') {
      const sub = event.data.object;
      if (sub.cancel_at_period_end) {
        const uid = await findUserByCustomer(sub.customer);
        console.log(`🔍 Scheduled Cancel: customer=${sub.customer} -> uid=${uid}`);
        if (uid) {
          // We don't enter grace yet because they still have access until period end,
          // but we could mark it as "Cancelled (ending soon)" if we had a field for it.
          // For now, let's just log it.
          console.log(`⏳ Subscription for ${uid} scheduled to end at ${new Date(sub.current_period_end * 1000).toISOString()}`);
        }
      }
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
