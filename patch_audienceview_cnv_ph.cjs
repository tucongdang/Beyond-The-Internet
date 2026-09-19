const fs = require('fs');

let code = fs.readFileSync('src/components/AudienceView.tsx', 'utf8');

code = code.replace(/placeholder="VD: DEEPFAKE, BẢO MẬT DỮ LIỆU\.\.\."/, 'placeholder={t("view_ph_predict_cnv", localLanguage)}');

fs.writeFileSync('src/components/AudienceView.tsx', code);
console.log("Patched AudienceView");
