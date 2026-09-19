const fs = require('fs');
console.log(fs.readFileSync('src/components/AudienceActivityFeed.tsx', 'utf8').includes('localLanguage'));
