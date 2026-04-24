import Stripe from 'stripe';
import { admin, db, initAdmin } from './_firebase.js';

export default async function handler(req, res) {
  // Health check — also reveals Firebase init state
  if (req.method === 'GET') {
    return res.status(200).json({
      status: 'API is active',
      firebase: !!db,
      adminApps: admin?.apps?.length ?? 0,
    });
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Guard: Firebase must be initialised
  initAdmin();
  if (!admin.apps.length) {
    console.error('[checkout] Firebase not initialised — check FIREBASE_SERVICE_ACCOUNT env var');
    return res.status(500).json({ error: 'Server configuration error: Firebase Admin not initialised.' });
  }

  const STRIPE_SECRET = process.env.STRIPE_SECRET;
  if (!STRIPE_SECRET || STRIPE_SECRET.startsWith('sk_test_...')) {
    return res.status(500).json({ error: 'Configuration Error: STRIPE_SECRET is missing.' });
  }

  const stripe = new Stripe(STRIPE_SECRET);

  const { origin, email, userId } = req.body;
  if (!email || !userId || !origin) {
    return res.status(400).json({
      error: `Missing parameters: ${!email ? 'email ' : ''}${!userId ? 'userId ' : ''}${!origin ? 'origin' : ''}`,
    });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing token.' });
  }

  const token = authHeader.split(' ')[1];
  let verifiedUid;

  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    verifiedUid = decodedToken.uid;
  } catch (err) {
    console.error('[checkout] Token verification failed:', err.message);
    return res.status(401).json({ error: 'Unauthorized: Invalid token.' });
  }

  if (verifiedUid !== userId) {
    return res.status(403).json({ error: 'Forbidden: User ID mismatch.' });
  }

  const ALLOWED_ORIGINS = [
    'https://xaujournal.vercel.app',
    'https://xaujournal-cfnqvtqlm-walker-4a977fbd.vercel.app',
    'https://myjournal-bfeca.web.app',
    process.env.ALLOWED_ORIGIN,
  ].filter(Boolean);

  const safeOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      customer_email: email,
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product: process.env.STRIPE_PRODUCT_ID || process.env.VITE_STRIPE_PRODUCT_ID || 'prod_UNob9xTUDh4IOn',
            unit_amount: req.body.planType === 'pro_yearly' ? 19900 : 2999,
            recurring: { interval: req.body.planType === 'pro_yearly' ? 'year' : 'month' },
          },
          quantity: 1,
        },
      ],
      success_url: `${safeOrigin}/checkout-success`,
      cancel_url:  `${safeOrigin}/checkout-cancel`,
      metadata: { userId },
    });

    return res.status(200).json({ url: session.url });
  } catch (error) {
    console.error('[checkout] Stripe error:', error.message, error.code ?? '');
    return res.status(500).json({ error: `Stripe checkout failed: ${error.message}` });
  }
}
