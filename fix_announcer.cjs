const fs = require('fs');
let code = fs.readFileSync('src/components/AnnouncerOverlay.tsx', 'utf8');
code = code.replace('const [isMinimized, setIsMinimized] = useState(false);', 'const { localLanguage } = useLanguage();\n  const [isMinimized, setIsMinimized] = useState(false);');
fs.writeFileSync('src/components/AnnouncerOverlay.tsx', code);
console.log("Fixed AnnouncerOverlay");
