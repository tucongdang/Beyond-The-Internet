import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, initializeFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import firebaseConfig from '../firebase-applet-config.json';

export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

let firestoreDb;
try {
  firestoreDb = initializeFirestore(app, { experimentalForceLongPolling: true }, (firebaseConfig as any).firestoreDatabaseId || '(default)');
} catch (e) {
  firestoreDb = getFirestore(app, (firebaseConfig as any).firestoreDatabaseId || '(default)');
}

export const db = firestoreDb;
export const auth = getAuth(app);
