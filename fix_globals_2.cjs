const fs = require('fs');

// AudienceCheerButton
let content = fs.readFileSync('src/components/AudienceCheerButton.tsx', 'utf8');
content = content.replace(/const CHEER_TYPES: Array<[^>]+> = \[([\s\S]*?)\];/g, 'const getCheerTypes = (localLanguage: string) => ([$1]);');
content = content.replace(/CHEER_TYPES\.map/g, 'getCheerTypes(localLanguage).map');
content = content.replace(/CHEER_TYPES\.find/g, 'getCheerTypes(localLanguage).find');
fs.writeFileSync('src/components/AudienceCheerButton.tsx', content);

// EmergencyPollAudience
content = fs.readFileSync('src/components/EmergencyPollAudience.tsx', 'utf8');
content = content.replace(/const MOCK_EMERGENCY_POLL: EmergencyPoll = \{([\s\S]*?)\n\};/g, 'const getMockPoll = (localLanguage: string): EmergencyPoll => ({\n$1\n});');
content = content.replace(/MOCK_EMERGENCY_POLL/g, 'getMockPoll(localLanguage)');
fs.writeFileSync('src/components/EmergencyPollAudience.tsx', content);

// AudienceHighlightedQuestionToast
content = fs.readFileSync('src/components/AudienceHighlightedQuestionToast.tsx', 'utf8');
content = content.replace(/const { localLanguage } = useLanguage\(\);\n  const { localLanguage } = useLanguage\(\);\n/g, 'const { localLanguage } = useLanguage();\n');
content = content.replace(/import { useLanguage } from '\.\.\/hooks\/useLanguage';\nimport { useLanguage } from '\.\.\/hooks\/useLanguage';/g, "import { useLanguage } from '../hooks/useLanguage';");
fs.writeFileSync('src/components/AudienceHighlightedQuestionToast.tsx', content);

// NextQuestionCountdown
content = fs.readFileSync('src/components/NextQuestionCountdown.tsx', 'utf8');
content = content.replace(/const { localLanguage } = useLanguage\(\);\n  const { localLanguage } = useLanguage\(\);\n/g, 'const { localLanguage } = useLanguage();\n');
content = content.replace(/import { useLanguage } from '\.\.\/hooks\/useLanguage';\nimport { useLanguage } from '\.\.\/hooks\/useLanguage';/g, "import { useLanguage } from '../hooks/useLanguage';");
fs.writeFileSync('src/components/NextQuestionCountdown.tsx', content);

// CountdownTimer
content = fs.readFileSync('src/components/CountdownTimer.tsx', 'utf8');
content = content.replace(/const { localLanguage } = useLanguage\(\);\n  const { localLanguage } = useLanguage\(\);\n/g, 'const { localLanguage } = useLanguage();\n');
content = content.replace(/import { useLanguage } from '\.\.\/hooks\/useLanguage';\nimport { useLanguage } from '\.\.\/hooks\/useLanguage';/g, "import { useLanguage } from '../hooks/useLanguage';");
fs.writeFileSync('src/components/CountdownTimer.tsx', content);

console.log("Fixed globals 2.");
