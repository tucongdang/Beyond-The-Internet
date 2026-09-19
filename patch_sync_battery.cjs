const fs = require('fs');

let code = fs.readFileSync('src/services/syncService.ts', 'utf8');

// 1. Import getBatterySaverMode
code = code.replace(/import \{ getAuth /g, "import { getBatterySaverMode } from '../utils/batterySaverUtils';\nimport { getAuth ");

// 2. Add batterySaverInterval property
code = code.replace(/private pingInterval: any = null;/g, "private pingInterval: any = null;\n  private batterySaverInterval: any = null;");

// 3. Add listener to constructor
const constructorRegex = /this\.initLatencyHistorySeed\(\);/;
code = code.replace(constructorRegex, `this.initLatencyHistorySeed();
    if (typeof window !== 'undefined') {
      window.addEventListener('bti_battery_saver_changed', (e: any) => {
        const enabled = e.detail?.enabled;
        this.logActivity('SYSTEM_EVENT', 'Battery Saver', \`Chế độ siêu tiết kiệm pin: \${enabled ? 'BẬT' : 'TẮT'}\`);
        if (this.db) {
          this.attachFirebaseListeners(); // Reattach with new mode
        }
      });
    }`);

// 4. Update attachFirebaseListeners
const attachRegex = /private attachFirebaseListeners\(\) \{[\s\S]*?this\.unsubscribes\.push\(onSnapshot\(qScans, \(snapshot\) => \{/;
const newAttach = `private attachFirebaseListeners() {
    if (!this.db) return;
    
    this.unsubscribes.forEach(unsub => unsub());
    this.unsubscribes = [];
    if (this.batterySaverInterval) {
      clearInterval(this.batterySaverInterval);
      this.batterySaverInterval = null;
    }

    const isBatterySaver = getBatterySaverMode();

    if (isBatterySaver) {
      // BẬT CHẾ ĐỘ TIẾT KIỆM PIN: POLLING 10s một lần thay vì onSnapshot realtime
      this.batterySaverInterval = setInterval(async () => {
        if (!this.db) return;
        try {
          // Poll game_state
          const stateSnap = await getDoc(doc(this.db, 'game_state', 'current'));
          if (stateSnap.exists()) {
            this.setFirebaseConnected(true);
            const data = stateSnap.data() as GameState;
            this.cachedGameState = { ...DEFAULT_GAME_STATE, ...data };
            this.saveLocalState();
            this.notifyStateListeners();
            this.notifyResponseListeners();
          }

          // Poll responses
          const respsSnap = await getDocs(collection(this.db, 'responses'));
          const rData: Record<string, Record<string, UserResponse>> = {};
          respsSnap.forEach(docSnap => {
            const docData = docSnap.data();
            const qId = docData.questionId;
            const uid = docData.uid;
            if (qId && uid) {
              if (!rData[qId]) rData[qId] = {};
              rData[qId][uid] = docData.response;
            }
          });
          this.cachedResponses = rData;
          this.saveLocalResponses();
          this.notifyResponseListeners();

        } catch (err) {
          console.error('Polling error in Battery Saver mode:', err);
          this.setFirebaseConnected(false);
        }
      }, 10000); // 10 seconds polling interval

    } else {
      // CHẾ ĐỘ BÌNH THƯỜNG: REALTIME ONSNAPSHOT
      // 1. Listen to game_state
      this.unsubscribes.push(onSnapshot(doc(this.db, 'game_state', 'current'), (snapshot) => {
        this.setFirebaseConnected(true);
        if (snapshot.exists()) {
          const data = snapshot.data() as GameState;
          this.cachedGameState = { ...DEFAULT_GAME_STATE, ...data };
          this.saveLocalState();
          this.notifyStateListeners();
          this.notifyResponseListeners();
        }
      }, (error) => {
        console.error('Firestore game_state listener error:', error);
        this.setFirebaseConnected(false);
      }));

      // 2. Listen to responses
      this.unsubscribes.push(onSnapshot(collection(this.db, 'responses'), (snapshot) => {
        this.setFirebaseConnected(true);
        const data: Record<string, Record<string, UserResponse>> = {};
        snapshot.forEach(docSnap => {
          const docData = docSnap.data();
          const qId = docData.questionId;
          const uid = docData.uid;
          if (qId && uid) {
            if (!data[qId]) data[qId] = {};
            data[qId][uid] = docData.response;
          }
        });
        this.cachedResponses = data;
        this.saveLocalResponses();
        this.notifyResponseListeners();
      }, (error) => {
        console.error('Firestore responses listener error:', error);
        this.setFirebaseConnected(false);
      }));
    }

    // 3. Listen to presence (always poll heavily or just use snapshot because it's low traffic)
    // Actually presence we can leave as snapshot since it's just meta, but to be strict let's keep it.
    if (!isBatterySaver) {
      this.unsubscribes.push(onSnapshot(collection(this.db, 'presence'), (snapshot) => {
        this.setFirebaseConnected(true);
        const data: Record<string, any> = {};
        snapshot.forEach(docSnap => {
          data[docSnap.id] = docSnap.data();
        });
        this.cachedPresence = data;
        this.saveLocalPresence();
        this.notifyPresenceListeners();
      }, (error) => {
        console.error('Firestore presence listener error:', error);
        this.setFirebaseConnected(false);
      }));
    }

    // 4. Listen to qr_scans (Scan History for Hourly Trends)
    try {
      const qScans = query(collection(this.db, 'qr_scans'), orderBy('timestamp', 'asc'), limit(500));
      this.unsubscribes.push(onSnapshot(qScans, (snapshot) => {`;

code = code.replace(attachRegex, newAttach);

// We need to import getDocs, query, orderBy, limit if they are not already imported from firebase/firestore
// But let's check if getDocs is imported.
if (!code.includes('getDocs')) {
  code = code.replace(/getDoc, setDoc/, "getDoc, getDocs, setDoc");
}

fs.writeFileSync('src/services/syncService.ts', code);
console.log("Patched syncService with polling for Battery Saver.");
