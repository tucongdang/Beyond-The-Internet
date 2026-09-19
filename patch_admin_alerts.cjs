const fs = require('fs');

// 1. syncService.ts
let syncCode = fs.readFileSync('src/services/syncService.ts', 'utf8');

// Add listeners set
syncCode = syncCode.replace(/private globalNotificationRecallListeners = new Set\(\);\n/, "private globalNotificationRecallListeners = new Set<() => void>();\n  private adminAlertListeners = new Set<(msg: string) => void>();\n");

// Add subscribe method
const subscribeGlobalRegex = /public subscribeToGlobalNotificationBroadcast\(callback: \(notif: any\) => void\): \(\) => void \{/;
syncCode = syncCode.replace(subscribeGlobalRegex, `public subscribeToAdminAlerts(callback: (msg: string) => void): () => void {
    this.adminAlertListeners.add(callback);
    return () => this.adminAlertListeners.delete(callback);
  }

  public subscribeToGlobalNotificationBroadcast(callback: (notif: any) => void): () => void {`);

// Add broadcast handling
const broadcastHandleRegex = /\} else if \(type === 'GLOBAL_NOTIFICATION'\) \{/;
syncCode = syncCode.replace(broadcastHandleRegex, `} else if (type === 'ADMIN_ALERT') {
            this.adminAlertListeners.forEach(cb => cb(payload));
          } else if (type === 'GLOBAL_NOTIFICATION') {`);

// Modify checkAndFilterSpam alert behavior
const spamRegex = /this\.sendGlobalNotification\([\s\S]*?'ALERT'\s*\);/;
syncCode = syncCode.replace(spamRegex, `this.adminAlertListeners.forEach(cb => cb('Hệ thống Auto-Moderation phát hiện nhiều câu trả lời điền từ có dấu hiệu spam hoặc vi phạm từ ngữ ở câu hỏi hiện tại. Vui lòng kiểm tra!'));
          if (this.broadcastChannel) {
            this.broadcastChannel.postMessage({ type: 'ADMIN_ALERT', payload: 'Hệ thống Auto-Moderation phát hiện nhiều câu trả lời điền từ có dấu hiệu spam hoặc vi phạm từ ngữ ở câu hỏi hiện tại. Vui lòng kiểm tra!' });
          }`);

fs.writeFileSync('src/services/syncService.ts', syncCode);

// 2. AdminPortal.tsx
let adminCode = fs.readFileSync('src/components/AdminPortal.tsx', 'utf8');
const effectRegex = /useEffect\(\(\) => \{\n\s*const qId = gameState\.question_id/;
adminCode = adminCode.replace(effectRegex, `useEffect(() => {
    return syncService.subscribeToAdminAlerts((msg) => {
      notify(msg, 'warning'); // Display the spam warning toast to Admin
    });
  }, []);

  useEffect(() => {
    const qId = gameState.question_id`);

fs.writeFileSync('src/components/AdminPortal.tsx', adminCode);
console.log("Patched both files.");
