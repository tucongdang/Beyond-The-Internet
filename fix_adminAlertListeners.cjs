const fs = require('fs');
let code = fs.readFileSync('src/services/syncService.ts', 'utf8');

code = code.replace(/private globalNotificationRecallListeners: Set<\(\) => void> = new Set\(\);/g, "private globalNotificationRecallListeners: Set<() => void> = new Set();\n  private adminAlertListeners = new Set<(msg: string) => void>();");

fs.writeFileSync('src/services/syncService.ts', code);
