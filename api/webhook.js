const stripe = require('stripe')(process.env.STRIPE_SECRET);
const admin = require('firebase-admin');

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT))
  });
}

const db = admin.firestore();

export const config = {
  api: {
    bodyParser: false, // Stripe webhooks need raw body
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

  const sig = req.headers['stripe-signature'];
  const rawBody = await getRawBody(req);

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook Error:', err.message);
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
      
      console.log(`User ${userId} upgraded via Vercel Webhook`);
    } catch (dbError) {
      console.error('Firestore Error:', dbError);
      return res.status(500).send('Database Update Failed');
    }
  }

  res.status(200).json({ received: true });
}
