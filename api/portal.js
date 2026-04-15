import Stripe from 'stripe';
import { admin, db } from './_firebase.js';


export default async function handler(req, res) {
  // 1. Health Check
  if (req.method === 'GET') {
    return res.status(200).json({ status: 'Portal API is active' });
  }

  // 2. Method Check
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId, origin } = req.body;

  if (!userId) {
    return res.status(400).json({ error: "Missing userId in request body." });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: "Unauthorized: Missing token." });
  }

  const token = authHeader.split(' ')[1];
  let verifiedUid;

  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    verifiedUid = decodedToken.uid;
  } catch (err) {
    return res.status(401).json({ error: "Unauthorized: Invalid token." });
  }

  if (verifiedUid !== userId) {
    return res.status(403).json({ error: "Forbidden: User ID mismatch." });
  }

  const ALLOWED_ORIGINS = [
    'https://xaujournal.vercel.app',
    'https://myjournal-bfeca.web.app',
    'https://myjournal-walker3.vercel.app',
    process.env.ALLOWED_ORIGIN
  ].filter(Boolean);

  const safeOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];

  const { STRIPE_SECRET } = process.env;

  if (!STRIPE_SECRET) {
    return res.status(500).json({ error: "Configuration Error: Missing STRIPE_SECRET." });
  }

  const stripe = new Stripe(STRIPE_SECRET);

  try {
    const userDoc = await db.collection('users').doc(userId).get();
    
    if (!userDoc.exists) {
      return res.status(404).json({ error: `User profile for ID ${userId} not found in Firestore.` });
    }

    const { stripeCustomerId } = userDoc.data();

    if (!stripeCustomerId) {
      return res.status(400).json({ 
        error: "Billing Error: No Stripe Customer ID found. This user probably hasn't completed a successful checkout yet." 
      });
    }

    // Create a portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: safeOrigin,
    });

    return res.status(200).json({ url: session.url });
  } catch (error) {
    console.error("PORTAL CRITICAL ERROR:", error);
    return res.status(500).json({ error: `Critical Portal Failure: ${error.message}` });
  }
}
