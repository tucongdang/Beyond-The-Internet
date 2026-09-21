import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, initializeFirestore, Firestore } from 'firebase/firestore';
import { getAuth, Auth } from 'firebase/auth';
import rawFirebaseConfig from '../firebase-applet-config.json';

// Standard provisioned API key fallback
const FALLBACK_API_KEY = 'AIzaSyDH5FdOqZNBuJALMzIg_o_vQWZyh7D0zbQ';

const rawKey = (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_FIREBASE_API_KEY)
  || (typeof process !== 'undefined' && (process.env as any)?.VITE_FIREBASE_API_KEY)
  || (typeof process !== 'undefined' && (process.env as any)?.FIREBASE_API_KEY)
  || rawFirebaseConfig.apiKey;

const activeApiKey = (rawKey && typeof rawKey === 'string' && rawKey.trim().length > 0)
  ? rawKey.trim()
  : FALLBACK_API_KEY;

export const firebaseConfig = {
  ...rawFirebaseConfig,
  apiKey: activeApiKey
};

export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

let firestoreDb: Firestore;
try {
  firestoreDb = initializeFirestore(app, { experimentalForceLongPolling: true }, (firebaseConfig as any).firestoreDatabaseId || '(default)');
} catch (e) {
  firestoreDb = getFirestore(app, (firebaseConfig as any).firestoreDatabaseId || '(default)');
}

export const db: Firestore = firestoreDb;

let firebaseAuth: Auth | null = null;
try {
  firebaseAuth = getAuth(app);
} catch (e) {
  console.warn('[firebase] Auth initialization fallback:', e);
}

export const auth: Auth = firebaseAuth as Auth;
