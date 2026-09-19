const fs = require('fs');
let code = fs.readFileSync('src/components/ProfileModal.tsx', 'utf8');

code = code.replace("import { useLanguage } from '../hooks/useLanguage'; from 'react-dom';", "import { useLanguage } from '../hooks/useLanguage';");

fs.writeFileSync('src/components/ProfileModal.tsx', code);
