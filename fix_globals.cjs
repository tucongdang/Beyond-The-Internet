const fs = require('fs');

function patchFile(file, replacements) {
  let content = fs.readFileSync(file, 'utf8');
  for (const [from, to] of replacements) {
    if (from instanceof RegExp) {
      content = content.replace(from, to);
    } else {
      content = content.split(from).join(to);
    }
  }
  fs.writeFileSync(file, content);
}

// 1. AudienceCheerButton.tsx
let content = fs.readFileSync('src/components/AudienceCheerButton.tsx', 'utf8');
content = content.replace(/const CHEER_TYPES = \[([\s\S]*?)\];/g, 'const getCheerTypes = (localLanguage: string) => ([$1]);');
content = content.replace(/CHEER_TYPES\.map/g, 'getCheerTypes(localLanguage).map');
content = content.replace(/CHEER_TYPES\.find/g, 'getCheerTypes(localLanguage).find');
fs.writeFileSync('src/components/AudienceCheerButton.tsx', content);

// 2. EmergencyPollAudience.tsx
content = fs.readFileSync('src/components/EmergencyPollAudience.tsx', 'utf8');
content = content.replace(/const MOCK_EMERGENCY_POLL: EmergencyPoll = \{([\s\S]*?)\]\n\};/g, 'const getMockPoll = (localLanguage: string): EmergencyPoll => ({\n$1]\n});');
content = content.replace(/MOCK_EMERGENCY_POLL/g, 'getMockPoll(localLanguage)');
fs.writeFileSync('src/components/EmergencyPollAudience.tsx', content);

// 3. NextQuestionCountdown.tsx
content = fs.readFileSync('src/components/NextQuestionCountdown.tsx', 'utf8');
content = content.replace(/const displayMsg = gameState\?\.next_question_wait_message \|\| \(localLanguage === 'en' \? 'Prepare for the next question' : 'Chuẩn bị cho câu hỏi tiếp theo'\);/g, 
  "const { localLanguage } = useLanguage();\n  const displayMsg = gameState?.next_question_wait_message || (localLanguage === 'en' ? 'Prepare for the next question' : 'Chuẩn bị cho câu hỏi tiếp theo');"
);
content = content.replace(/\{localLanguage === 'en' \? 'Wait progress' : 'Tiến trình chờ'\}/g, 
  "{localLanguage === 'en' ? 'Wait progress' : 'Tiến trình chờ'}"
);
if (!content.includes('useLanguage')) {
  content = content.replace(/import React/, "import { useLanguage } from '../hooks/useLanguage';\nimport React");
}
fs.writeFileSync('src/components/NextQuestionCountdown.tsx', content);

// 4. CountdownTimer.tsx
content = fs.readFileSync('src/components/CountdownTimer.tsx', 'utf8');
content = content.replace(/localLanguage === 'en' \? 'Answer time' : 'Thời gian trả lời'/g, 
  "localLanguage === 'en' ? 'Answer time' : 'Thời gian trả lời'"
);
if (!content.includes('const { localLanguage }')) {
  content = content.replace(/const progress =/g, "const { localLanguage } = useLanguage();\n  const progress =");
}
if (!content.includes('useLanguage')) {
  content = content.replace(/import React/, "import { useLanguage } from '../hooks/useLanguage';\nimport React");
}
fs.writeFileSync('src/components/CountdownTimer.tsx', content);

// 5. AudienceHighlightedQuestionToast.tsx
content = fs.readFileSync('src/components/AudienceHighlightedQuestionToast.tsx', 'utf8');
if (!content.includes('const { localLanguage }')) {
  content = content.replace(/const \[isVisible, setIsVisible\] =/g, "const { localLanguage } = useLanguage();\n  const [isVisible, setIsVisible] =");
}
if (!content.includes('useLanguage')) {
  content = content.replace(/import React/, "import { useLanguage } from '../hooks/useLanguage';\nimport React");
}
fs.writeFileSync('src/components/AudienceHighlightedQuestionToast.tsx', content);

console.log("Fixed globals.");
