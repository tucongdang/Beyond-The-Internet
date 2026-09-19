const fs = require('fs');

let code = fs.readFileSync('src/components/AudienceView.tsx', 'utf8');

code = code.replace(/\{localLanguage === "en" \? "Code" : "Mã"\}/g, '{t("view_code", localLanguage)}');
code = code.replace(/\{localLanguage === "en" \? "votes" : "phiếu"\}/g, '{t("view_votes", localLanguage)}');
code = code.replace(/alt="Question Media"/g, 'alt={t("view_media_alt", localLanguage)}');

fs.writeFileSync('src/components/AudienceView.tsx', code);
console.log("Patched AudienceView misc");
