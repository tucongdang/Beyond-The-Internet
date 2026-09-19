const fs = require('fs');
let content = fs.readFileSync('src/components/AudienceView.tsx', 'utf8');

// The modal at the very end of the file is:
const badModalRegex = /\{\/\* Auto-Zoom Long Text Question Modal \*\/\}[\s\S]*?Đóng\s*<\/button>\s*<\/div>\s*<\/div>\s*<\/div>\s*\)\}/m;
content = content.replace(badModalRegex, "");

// Now we insert it into AudienceViewContent.
// AudienceViewContent returns JSX. We can put it right before `</> // or similar` or at the end of the main layout block.
// Wait, AudienceViewContent returns multiple things depending on the mode.
