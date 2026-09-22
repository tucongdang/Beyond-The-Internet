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

export const FIRESTORE_DATABASE_ID = (firebaseConfig as any).firestoreDatabaseId
  || (firebaseConfig as any).databaseId
  || 'ai-studio-beyondtheinterne-dcaa1017-6ed0-4d28-92fc-51bee2e1976b';

export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

let firestoreDb: Firestore;
try {
  firestoreDb = initializeFirestore(app, {
    experimentalForceLongPolling: true,
  }, FIRESTORE_DATABASE_ID);
} catch (e) {
  firestoreDb = getFirestore(app, FIRESTORE_DATABASE_ID);
}

export const db: Firestore = firestoreDb;

let firebaseAuth: Auth | null = null;
try {
  firebaseAuth = getAuth(app);
} catch (e) {
  console.warn('[firebase] Auth initialization fallback:', e);
}

export const auth: Auth = firebaseAuth as Auth;

/**
 * Deeply strips undefined fields from an object or array to prevent Firestore
 * "Function setDoc() called with invalid data. Unsupported field value: undefined" errors.
 */
export function removeUndefined<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(item => removeUndefined(item)) as unknown as T;
  const clean: any = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const val = (obj as any)[key];
      if (val !== undefined) {
        clean[key] = removeUndefined(val);
      }
    }
  }
  return clean as T;
}

