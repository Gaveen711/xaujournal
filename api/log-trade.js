import admin from 'firebase-admin';

let db;
try {
  if (!admin.apps.length) {
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
    }
  }
  db = admin.firestore();
} catch (e) {
  console.error("Firebase Admin Error:", e);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { apiKey, userId, trade } = req.body;

  // Simple API Key check (In production, this should be more robust)
  if (apiKey !== process.env.MT5_SYNC_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!userId || !trade) {
    return res.status(400).json({ error: 'Missing userId or trade data' });
  }

  try {
    const tradeData = {
      ...trade,
      market: 'GOLD',
      syncedAt: admin.firestore.FieldValue.serverTimestamp(),
      source: 'MT5_AUTO'
    };

    // Add to user's trades collection
    const docRef = await db.collection('users').doc(userId).collection('trades').add(tradeData);
    
    // Update total trades count
    await db.collection('users').doc(userId).update({
      totalTradesLogged: admin.firestore.FieldValue.increment(1)
    });

    return res.status(200).json({ success: true, id: docRef.id });
  } catch (error) {
    console.error("Error logging trade from MT5:", error);
    return res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
}
