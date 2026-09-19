const fs = require('fs');

let code = fs.readFileSync('src/services/syncService.ts', 'utf8');

// 1. Add import
if (!code.includes('import { getBatterySaverMode }')) {
  code = code.replace(/import \{ app, db \} from '\.\.\/firebase';/, "import { app, db } from '../firebase';\nimport { getBatterySaverMode } from '../utils/batterySaverUtils';");
}

// 2. Add property
if (!code.includes('private batterySaverInterval: any = null;')) {
  code = code.replace(/private isFirebaseConnected: boolean = false;/, "private isFirebaseConnected: boolean = false;\n  private batterySaverInterval: any = null;");
}

fs.writeFileSync('src/services/syncService.ts', code);
console.log("Fixed syncService.");
