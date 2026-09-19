import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, getDoc, onSnapshot } from 'firebase/firestore';
import fs from 'fs';

const config = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));
const app = initializeApp(config);
const db = getFirestore(app);

async function run() {
  const ref = doc(db, 'game_state', 'current');
  console.log("Setting to active...");
  await setDoc(ref, { status: 'ACTIVE', server_start_time: Date.now(), time_limit: 20 }, { merge: true });
  
  console.log("Waiting for lock...");
  onSnapshot(ref, (snap) => {
    const data = snap.data();
    if (data.status === 'LOCKED') {
      console.log("LOCKED! Explanation:", data.explanation);
      process.exit(0);
    }
  });
}
run();
