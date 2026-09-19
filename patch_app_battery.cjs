const fs = require('fs');

let code = fs.readFileSync('src/App.tsx', 'utf8');

if (!code.includes('useBatterySaver')) {
  // Update import
  code = code.replace(/import \{ applyBatterySaverClasses, getBatterySaverMode \} from '\.\/utils\/batterySaverUtils';/, "import { applyBatterySaverClasses, getBatterySaverMode, useBatterySaver } from './utils/batterySaverUtils';");
  
  // Call hook inside App
  code = code.replace(/export default function App\(\) \{/, "export default function App() {\n  const { isBatterySaver, batteryLevel } = useBatterySaver();\n");
}

fs.writeFileSync('src/App.tsx', code);
console.log("Patched App.tsx with useBatterySaver.");
