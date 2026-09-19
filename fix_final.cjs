const fs = require('fs');

// 1. AudienceCheerButton.tsx
let cheer = fs.readFileSync('src/components/AudienceCheerButton.tsx', 'utf8');
cheer = cheer.replace(/CHEER_TYPES/g, 'getCheerTypes(localLanguage)');
fs.writeFileSync('src/components/AudienceCheerButton.tsx', cheer);

// 2. AudienceHighlightedQuestionToast.tsx
let toast = fs.readFileSync('src/components/AudienceHighlightedQuestionToast.tsx', 'utf8');
toast = toast.replace(/const \{ localLanguage \} = useLanguage\(\);\n  const \{ localLanguage \} = useLanguage\(\);\n  const \[isVisible, setIsVisible\] =/g, 'const { localLanguage } = useLanguage();\n  const [isVisible, setIsVisible] =');
toast = toast.replace(/import \{ useLanguage \} from '\.\.\/hooks\/useLanguage';\nimport \{ useLanguage \} from '\.\.\/hooks\/useLanguage';/g, "import { useLanguage } from '../hooks/useLanguage';");
toast = toast.replace(/import React/, "import { useLanguage } from '../hooks/useLanguage';\nimport React");
fs.writeFileSync('src/components/AudienceHighlightedQuestionToast.tsx', toast);

// 3. CountdownTimer.tsx
let timer = fs.readFileSync('src/components/CountdownTimer.tsx', 'utf8');
timer = timer.replace(/localLanguage === 'en' \? 'Answer time' : 'Thời gian trả lời'/g, "localLanguage === 'en' ? 'Answer time' : 'Thời gian trả lời'");
if (!timer.includes('const { localLanguage }')) {
  timer = timer.replace(/const progress =/g, 'const { localLanguage } = useLanguage();\n  const progress =');
}
fs.writeFileSync('src/components/CountdownTimer.tsx', timer);

// 4. NextQuestionCountdown.tsx
let next = fs.readFileSync('src/components/NextQuestionCountdown.tsx', 'utf8');
next = next.replace(/const \{ localLanguage \} = useLanguage\(\);\n  const displayMsg =/g, 'const { localLanguage } = useLanguage();\n  const displayMsg =');
if (!next.includes('const { localLanguage }')) {
  next = next.replace(/const displayMsg =/g, 'const { localLanguage } = useLanguage();\n  const displayMsg =');
}
fs.writeFileSync('src/components/NextQuestionCountdown.tsx', next);

console.log("Fixed final syntax.");
