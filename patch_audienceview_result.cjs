const fs = require('fs');

let code = fs.readFileSync('src/components/AudienceView.tsx', 'utf8');

code = code.replace(/\(localLanguage === 'en' \? 'TRUE' : 'ĐÚNG'\)/g, 't("view_tf_true", localLanguage)');
code = code.replace(/\(localLanguage === 'en' \? 'FALSE' : 'SAI'\)/g, 't("view_tf_false", localLanguage)');
code = code.replace(/\(localLanguage === 'en' \? 'ABSOLUTELY CORRECT!' : 'CHÍNH XÁC TUYỆT ĐỐI!'\)/g, 't("view_result_correct", localLanguage)');
code = code.replace(/\(localLanguage === 'en' \? `YOU GOT \$\{tfCorrectCount\}\/4 CORRECT` : `BẠN ĐÚNG \$\{tfCorrectCount\}\/4 Ý`\)/g, 't("view_result_partial", localLanguage).replace("{count}", String(tfCorrectCount))');
code = code.replace(/'CHƯA CHÍNH XÁC!'/g, 't("view_result_incorrect", localLanguage)');

fs.writeFileSync('src/components/AudienceView.tsx', code);
console.log("Patched AudienceView result feedback");
