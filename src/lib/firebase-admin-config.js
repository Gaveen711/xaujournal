import admin from 'firebase-admin';

// Unified Firebase Admin Initialization
let db;

if (!admin.apps.length) {
  try {
    if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
      throw new Error("FIREBASE_SERVICE_ACCOUNT environment variable is missing");
    }
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    console.log("✅ FIREBASE ADMIN CORE INITIALIZED");
  } catch (e) {
    console.error("🔥 FIREBASE ADMIN INIT FAILURE:", e.message);
  }
}

try {
  // Only attempt to initialize firestore if an app exists
  if (admin.apps.length > 0) {
    db = admin.firestore();
  } else {
    console.error("🔥 CANNOT INITIALIZE FIRESTORE: No Firebase app initialized");
    db = null;
  }
} catch (e) {
  console.error("🔥 FIRESTORE ACCESS FAILURE:", e.message);
  db = null;
}

export { db, admin };