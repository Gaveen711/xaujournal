// api/_firebase.js
// Shared Firebase Admin initializer for all Vercel API routes.
//
// WHY THIS EXISTS:
// Vercel stores env vars as plain strings. The private_key in a service account
// JSON contains real newlines (\n). When stored in Vercel env vars and retrieved,
// those newlines often come back as the literal two-char sequence \n instead of
// an actual newline character. Google's auth client rejects the key as invalid,
// causing "UNAUTHENTICATED" errors from Firestore.
//
// This module normalises the key before initialising the SDK.

import admin from 'firebase-admin';

function initAdmin() {
  if (admin.apps.length > 0) return admin;

  try {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
    let serviceAccount;

    if (raw) {
      // Robust sanitisation for JSON string
      const sanitized = raw.trim().replace(/^\uFEFF/, '').replace(/\\"/g, '"').replace(/^"(.*)"$/, '$1');
      try {
        serviceAccount = JSON.parse(sanitized);
      } catch (parseErr) {
        console.error('❌ JSON Parse Failed on sanitised string. Trying raw...');
        serviceAccount = JSON.parse(raw);
      }
    } else if (process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL) {
      // Fallback to individual vars if the main JSON is missing
      serviceAccount = {
        projectId: process.env.VITE_FIREBASE_PROJECT_ID || 'myjournal-bfeca',
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY
      };
    }

    if (serviceAccount) {
      if (serviceAccount.privateKey) serviceAccount.privateKey = serviceAccount.privateKey.replace(/\\n/g, '\n');
      if (serviceAccount.private_key) serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: 'https://myjournal-bfeca-default-rtdb.asia-southeast1.firebasedatabase.app',
      });
      console.log('✅ Firebase Admin initialised (Lazy)');
    } else {
      console.error('❌ Firebase Init Error: No credentials found in ENV.');
    }
  } catch (e) {
    console.error('🔥 Firebase Lazy Init Failed:', e.message);
  }
  return admin;
}

// Safe db accessor — returns null if Firebase never initialised.
// Always call isDbReady() before using db.
export function isDbReady() {
  initAdmin();
  return admin.apps.length > 0;
}

export const db = new Proxy({}, {
  get: (target, prop) => {
    if (!isDbReady()) {
      console.error(`❌ db.${String(prop)} called but Firebase is not initialised.`);
      return undefined;
    }
    return admin.firestore()[prop];
  }
});

export { admin, initAdmin };

export const now = () => admin.firestore.FieldValue.serverTimestamp();
