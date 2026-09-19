const fs = require('fs');
let content = fs.readFileSync('src/components/AudienceView.tsx', 'utf8');

// Replace "ĐÃ CÔNG BỐ" at line 1428
content = content.replace(/>\s*ĐÃ CÔNG BỐ\s*</g, ">{localLanguage === 'en' ? 'REVEALED' : 'ĐÃ CÔNG BỐ'}<");

// Replace "ĐÃ CHỌN" in True/False toggles (around line 2267 and 2341)
content = content.replace(/>\s*ĐÃ CHỌN\s*</g, ">{localLanguage === 'en' ? 'SELECTED' : 'ĐÃ CHỌN'}<");
content = content.replace(/>\s*ĐÃ CHỌN\s*</g, ">{localLanguage === 'en' ? 'SELECTED' : 'ĐÃ CHỌN'}<");

fs.writeFileSync('src/components/AudienceView.tsx', content);
console.log('Patched AudienceView.tsx');
