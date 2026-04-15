import Stripe from 'stripe';
import { admin, db, initAdmin } from './_firebase.js';


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

  // Use the helper to ensure initialization
  initAdmin();
  if (!admin.apps.length) {
    console.error('[checkout] Firebase not initialised — check FIREBASE_SERVICE_ACCOUNT env var');
    return res.status(500).json({ error: 'Server configuration error: Firebase Admin not initialised.' });
  }

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
    try {
      const session = await stripe.billingPortal.sessions.create({
        customer: stripeCustomerId,
        return_url: safeOrigin,
      });
      return res.status(200).json({ url: session.url });
    } catch (stripeError) {
      console.error("STRIPE PORTAL ERROR:", stripeError.message);
      
      // Handle the case where the customer was deleted or missing in Stripe
      if (stripeError.code === 'resource_missing') {
        // Optionally clear it from Firestore so they can restart checkout
        await db.collection('users').doc(userId).update({ stripeCustomerId: admin.firestore.FieldValue.delete() });
        return res.status(400).json({ 
          error: "Your billing record is out of sync or was removed. Please click 'Upgrade' to refresh your account." 
        });
      }
      throw stripeError;
    }
  } catch (error) {
    console.error("PORTAL CRITICAL ERROR:", error);
    return res.status(500).json({ error: `Critical Portal Failure: ${error.message}` });
  }
}
