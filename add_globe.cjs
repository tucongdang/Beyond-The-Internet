const fs = require('fs');
let content = fs.readFileSync('src/components/AudienceView.tsx', 'utf8');
content = content.replace("RefreshCw", "RefreshCw, Globe");
fs.writeFileSync('src/components/AudienceView.tsx', content);
