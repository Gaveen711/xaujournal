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

let db;

if (!admin.apps.length) {
  try {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT env var is missing');

    const serviceAccount = JSON.parse(raw);

    // Fix escaped newlines in the private key (common Vercel env var issue)
    if (serviceAccount.private_key) {
      serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
    }

    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    console.log('✅ Firebase Admin initialised');
  } catch (e) {
    console.error('🔥 Firebase Admin init failed:', e.message);
  }
}

try {
  db = admin.firestore();
} catch (e) {
  console.error('🔥 Firestore init failed:', e.message);
}

export { admin, db };

export const now = () => admin.firestore.FieldValue.serverTimestamp();
