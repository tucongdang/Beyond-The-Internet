const fs = require('fs');
let content = fs.readFileSync('src/components/AudienceView.tsx', 'utf8');

content = content.replace('<div className="fixed bottom-36 right-4 sm:right-6 z-50 animate-slideUp">', '<div className="fixed bottom-24 right-4 sm:right-6 z-50 animate-slideUp">');

fs.writeFileSync('src/components/AudienceView.tsx', content);
