import Stripe from 'stripe';
import admin from 'firebase-admin';

// Self-contained Firebase Admin Initialization to avoid import path issues in Vercel
let db;
try {
  if (!admin.apps.length) {
    if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
      console.error("❌ CRITICAL: FIREBASE_SERVICE_ACCOUNT is missing");
    } else {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
      console.log("✅ FIREBASE ADMIN INITIALIZED IN WEBHOOK");
    }
  }
  db = admin.firestore();
} catch (initError) {
  console.error("🔥 FIREBASE INIT ERROR:", initError.message);
}

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
  console.log("➡️ WEBHOOK INVOCATION START");

  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { STRIPE_SECRET, STRIPE_WEBHOOK_SECRET } = process.env;

    if (!STRIPE_SECRET || !STRIPE_WEBHOOK_SECRET) {
      console.error("❌ MISSING STRIPE VARS");
      return res.status(500).json({ 
        error: "Configuration Error", 
        details: "Stripe keys are missing in environment variables" 
      });
    }

    const stripe = new Stripe(STRIPE_SECRET);
    const sig = req.headers['stripe-signature'];
    
    if (!sig) {
      console.error("❌ MISSING STRIPE SIGNATURE");
      return res.status(400).json({ error: "Missing stripe-signature header" });
    }

    const rawBody = await getRawBody(req);

    let event;
    try {
      event = stripe.webhooks.constructEvent(rawBody, sig, STRIPE_WEBHOOK_SECRET);
      console.log("⚓ EVENT VERIFIED:", event.type);
    } catch (err) {
      console.error('❌ SIGNATURE ERROR:', err.message);
      return res.status(400).json({ error: `Webhook Signature Error: ${err.message}` });
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const userId = session.metadata?.userId;
      
      console.log("👤 PROCESSING UPGRADE FOR:", userId);

      if (!userId) {
        console.error("⚠️ NO USERID IN METADATA");
        return res.status(200).json({ status: 'ignored_no_user' });
      }

      if (!db) {
        console.error("❌ DB NOT AVAILABLE");
        return res.status(500).json({ error: "Database not initialized. Check FIREBASE_SERVICE_ACCOUNT." });
      }

      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 30);

      try {
        await db.collection('users').doc(userId).set({
          plan: 'pro',
          planExpiry: expiryDate.toISOString(),
          stripeCustomerId: session.customer,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
        console.log("💎 USER UPGRADED SUCCESSFULLY");
      } catch (dbError) {
        console.error("❌ FIRESTORE ERROR:", dbError.message);
        return res.status(500).json({ error: "Database Upgrade Failed", message: dbError.message });
      }
    }

    return res.status(200).json({ received: true });
  } catch (globalError) {
    console.error("💀 GLOBAL WEBHOOK ERROR:", globalError);
    return res.status(500).json({ 
      error: "Internal Server Error", 
      message: globalError.message,
      stack: globalError.stack 
    });
  }
}
