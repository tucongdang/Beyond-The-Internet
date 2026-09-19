const fs = require('fs');

// AudienceCheerButton.tsx
let cheer = fs.readFileSync('src/components/AudienceCheerButton.tsx', 'utf8');
cheer = cheer.replace(/getCheerTypes\(localLanguage\)\.length/g, 'getCheerTypes(localLanguage).length');
cheer = cheer.replace(/CHEER_TYPES\.length/g, 'getCheerTypes(localLanguage).length');
cheer = cheer.replace(/setSelectedType\(type\.type\)/g, 'setSelectedType(type.type as CheerType)');
fs.writeFileSync('src/components/AudienceCheerButton.tsx', cheer);

// AudienceHighlightedQuestionToast.tsx
let toast = fs.readFileSync('src/components/AudienceHighlightedQuestionToast.tsx', 'utf8');
if (!toast.includes('const { localLanguage }')) {
  toast = toast.replace(/const \[isVisible, setIsVisible\] =/g, 'const { localLanguage } = useLanguage();\n  const [isVisible, setIsVisible] =');
}
if (!toast.includes('useLanguage')) {
  toast = toast.replace(/import React/, "import { useLanguage } from '../hooks/useLanguage';\nimport React");
}
fs.writeFileSync('src/components/AudienceHighlightedQuestionToast.tsx', toast);

// CountdownTimer.tsx
let timer = fs.readFileSync('src/components/CountdownTimer.tsx', 'utf8');
if (!timer.includes('const { localLanguage }')) {
  timer = timer.replace(/const progress =/g, 'const { localLanguage } = useLanguage();\n  const progress =');
}
if (!timer.includes('useLanguage')) {
  timer = timer.replace(/import React/, "import { useLanguage } from '../hooks/useLanguage';\nimport React");
}
fs.writeFileSync('src/components/CountdownTimer.tsx', timer);

// NextQuestionCountdown.tsx
let next = fs.readFileSync('src/components/NextQuestionCountdown.tsx', 'utf8');
if (!next.includes('const { localLanguage }')) {
  next = next.replace(/const displayMsg =/g, 'const { localLanguage } = useLanguage();\n  const displayMsg =');
}
if (!next.includes('useLanguage')) {
  next = next.replace(/import React/, "import { useLanguage } from '../hooks/useLanguage';\nimport React");
}
fs.writeFileSync('src/components/NextQuestionCountdown.tsx', next);

// EmergencyPollAudience.tsx
let poll = fs.readFileSync('src/components/EmergencyPollAudience.tsx', 'utf8');
poll = poll.replace(/label: localLanguage === 'en' \? 'Expert Advisor' : 'Cố vấn chuyên môn'/g, "label: 'Cố vấn chuyên môn'");
poll = poll.replace(/label: localLanguage === 'en' \? 'Contestant \/ Team' : 'Thí sinh \/ Đội thi'/g, "label: 'Thí sinh / Đội thi'");
poll = poll.replace(/label: localLanguage === 'en' \? 'Judges' : 'Ban Giám Khảo'/g, "label: 'Ban Giám Khảo'");
poll = poll.replace(/label: localLanguage === 'en' \? 'Audience' : 'Khán giả'/g, "label: 'Khán giả'");
poll = poll.replace(/label: localLanguage === 'en' \? 'MC \/ Organizers' : 'MC \/ Ban Tổ Chức'/g, "label: 'MC / Ban Tổ Chức'");
poll = poll.replace(/const getMockPoll = \(localLanguage: string\): EmergencyPoll => \(\{/g, "const getMockPoll = (): EmergencyPoll => ({");
poll = poll.replace(/getMockPoll\(localLanguage\)/g, "getMockPoll()");
fs.writeFileSync('src/components/EmergencyPollAudience.tsx', poll);

console.log("Fixed manual errors.");
