const fs = require('fs');
let code = fs.readFileSync('src/components/AudienceView.tsx', 'utf8');

code = code.replace(/title=t\(/g, 'title={t(');
code = code.replace(/title=\{t\("([^"]+)", localLanguage\)/g, 'title={t("$1", localLanguage)}');

fs.writeFileSync('src/components/AudienceView.tsx', code);
