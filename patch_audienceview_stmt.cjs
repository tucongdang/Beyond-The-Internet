const fs = require('fs');
let code = fs.readFileSync('src/components/AudienceView.tsx', 'utf8');

code = code.replace(/\{localLanguage === 'en' \? \`STMT \$\{key\}: TRUE\` : \`Ý \$\{key\}: ĐÚNG\`\}/g, '{t("view_stmt_true", localLanguage).replace("{key}", key)}');
code = code.replace(/\{localLanguage === 'en' \? \`STMT \$\{key\}: FALSE\` : \`Ý \$\{key\}: SAI\`\}/g, '{t("view_stmt_false", localLanguage).replace("{key}", key)}');

code = code.replace(/\{localLanguage === 'en' \? 'TRUE' : 'ĐÚNG'\}/g, '{t("view_tf_true", localLanguage)}');
code = code.replace(/>SAI \{percentS\}\%</g, '>{t("view_tf_false", localLanguage)} {percentS}%<');

fs.writeFileSync('src/components/AudienceView.tsx', code);
console.log("Patched AudienceView stmt and percent labels");
