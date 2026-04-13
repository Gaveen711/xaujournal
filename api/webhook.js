import Stripe from 'stripe';
import admin from 'firebase-admin';

export const config = {
  api: {
    bodyParser: false,
  },
};

const getRawBody = async (readable) => {
  const chunks = [];
  for await (const chunk of readable) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  const STRIPE_SECRET = process.env.STRIPE_SECRET;
  const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
  const SERVICE_ACCOUNT = process.env.FIREBASE_SERVICE_ACCOUNT;

  if (!STRIPE_SECRET || !WEBHOOK_SECRET || !SERVICE_ACCOUNT) {
    return res.status(500).json({ error: "Webhook Error: Missing environment variables on Vercel." });
  }

  const stripe = new Stripe(STRIPE_SECRET);

  if (!admin.apps.length) {
    try {
      admin.initializeApp({
        credential: admin.credential.cert(JSON.parse(SERVICE_ACCOUNT))
      });
    } catch (e) {
      console.error("FIREBASE ADMIN INIT ERROR:", e);
      return res.status(500).json({ error: "Firebase Admin failed to initialize." });
    }
  }

  const db = admin.firestore();
  const sig = req.headers['stripe-signature'];
  const rawBody = await getRawBody(req);

  let event;

  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook Verification Failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const userId = session.metadata.userId;

    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 30);

    try {
      await db.collection('users').doc(userId).set({
        plan: 'pro',
        planExpiry: expiryDate.toISOString(),
        stripeCustomerId: session.customer,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
    } catch (dbError) {
      return res.status(500).send('Database Update Failed');
    }
  }

  res.status(200).json({ received: true });
}
