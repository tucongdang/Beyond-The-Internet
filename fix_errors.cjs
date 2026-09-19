const fs = require('fs');

// Fix QuestionLikeButton.tsx
let qcode = fs.readFileSync('src/components/QuestionLikeButton.tsx', 'utf8');
qcode = qcode.replace('const { language: localLanguage } = useLanguage();', 'const { localLanguage } = useLanguage();');
fs.writeFileSync('src/components/QuestionLikeButton.tsx', qcode);

// Fix AnnouncerOverlay.tsx
let acode = fs.readFileSync('src/components/AnnouncerOverlay.tsx', 'utf8');
if (!acode.includes('const { localLanguage } = useLanguage();')) {
    acode = acode.replace('const [isExpanded, setIsExpanded]', 'const { localLanguage } = useLanguage();\n  const [isExpanded, setIsExpanded]');
}
fs.writeFileSync('src/components/AnnouncerOverlay.tsx', acode);

console.log("Fixed ts errors");
