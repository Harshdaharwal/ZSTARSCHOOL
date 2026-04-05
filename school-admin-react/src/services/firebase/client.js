import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getDatabase } from 'firebase/database';

export function isFirebaseConfigured() {
  return Boolean(
    import.meta.env.VITE_FIREBASE_API_KEY && import.meta.env.VITE_FIREBASE_PROJECT_ID
  );
}

let _app;
let _auth;
let _db;
let _rtdb;

/**
 * Returns Firebase app instances, or null if env is incomplete.
 * Supports both Firestore (_db) and Realtime Database (_rtdb).
 */
export function getFirebase() {
  if (!isFirebaseConfigured()) return null;
  if (!_app) {
    const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
    _app = initializeApp({
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || `${projectId}.firebaseapp.com`,
      projectId,
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || `${projectId}.appspot.com`,
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
      appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
      databaseURL:
        import.meta.env.VITE_FIREBASE_DATABASE_URL ||
        `https://${projectId}-default-rtdb.firebaseio.com`,
    });
    _auth = getAuth(_app);
    _db = getFirestore(_app);
    _rtdb = getDatabase(_app);
  }
  return { app: _app, auth: _auth, db: _db, rtdb: _rtdb };
}
