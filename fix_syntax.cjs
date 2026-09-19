const fs = require('fs');
let code = fs.readFileSync('src/components/AudienceView.tsx', 'utf8');

code = code.replace(/aria-label=t\("/g, 'aria-label={t("');
code = code.replace(/, localLanguage\)/g, ', localLanguage)}');

fs.writeFileSync('src/components/AudienceView.tsx', code);
