const fs = require('fs');
let code = fs.readFileSync('src/services/syncService.ts', 'utf8');

code = code.replace(/private isFirebaseConnected: boolean = false;/, "private isFirebaseConnected: boolean = false;\n  private spamCounters: Record<string, number> = {};");

fs.writeFileSync('src/services/syncService.ts', code);
console.log("Patched prop");
