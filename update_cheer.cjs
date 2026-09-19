const fs = require('fs');
let content = fs.readFileSync('src/components/AudienceCheerButton.tsx', 'utf8');

const target = `  { type: 'STAR', label: 'Tỏa Sáng', icon: '⭐', color: 'from-yellow-400 to-amber-500' }
];`;

const replacement = `  { type: 'STAR', label: 'Tỏa Sáng', icon: '⭐', color: 'from-yellow-400 to-amber-500' },
  { type: 'SMILE', label: 'Vui vẻ', icon: '😄', color: 'from-blue-400 to-indigo-500' },
  { type: 'NERVOUS', label: 'Hồi hộp', icon: '🥶', color: 'from-cyan-400 to-blue-500' },
  { type: 'HARD', label: 'Khó quá', icon: '🤯', color: 'from-purple-500 to-pink-600' }
];`;

content = content.replace(target, replacement);
fs.writeFileSync('src/components/AudienceCheerButton.tsx', content);
