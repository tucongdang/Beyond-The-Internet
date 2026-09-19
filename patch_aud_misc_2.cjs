const fs = require('fs');
let code = fs.readFileSync('src/components/AudienceView.tsx', 'utf8');

code = code.replace(/\{localLanguage === "en" \? "Confirm" : "Xác nhận"\} \{t\("view_send", localLanguage\)\}/g, '{t("view_confirm_btn", localLanguage)}');
code = code.replace(/\{localLanguage === "en" \? "There are" : "Có"\}/g, '{t("view_there_are", localLanguage)}');

fs.writeFileSync('src/components/AudienceView.tsx', code);
console.log("Patched AudienceView");
