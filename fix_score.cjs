const fs = require('fs');
let code = fs.readFileSync('src/components/ScoreDisplay.tsx', 'utf8');
code = code.replace("import { useLanguage } from '../hooks/useLanguage'; } from './BatteryIndicator';", "import { useLanguage } from '../hooks/useLanguage';");
fs.writeFileSync('src/components/ScoreDisplay.tsx', code);
