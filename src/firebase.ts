import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, initializeFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import rawFirebaseConfig from '../firebase-applet-config.json';

const activeApiKey = (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_FIREBASE_API_KEY)
  || (typeof process !== 'undefined' && (process.env as any)?.VITE_FIREBASE_API_KEY)
  || rawFirebaseConfig.apiKey;

export const firebaseConfig = {
  ...rawFirebaseConfig,
  apiKey: activeApiKey
};

export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

let firestoreDb;
try {
  firestoreDb = initializeFirestore(app, { experimentalForceLongPolling: true }, (firebaseConfig as any).firestoreDatabaseId || '(default)');
} catch (e) {
  firestoreDb = getFirestore(app, (firebaseConfig as any).firestoreDatabaseId || '(default)');
}

export const db = firestoreDb;
export const auth = getAuth(app);
