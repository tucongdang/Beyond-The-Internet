const fs = require('fs');
let code = fs.readFileSync('src/components/AudienceView.tsx', 'utf8');

// Fix the overzealous replacement:
code = code.replace(/localLanguage\)\}\}/g, 'localLanguage)}');
// Actually, `t("view_score", localLanguage)}` might have become `t("view_score", localLanguage)}}` because I replaced `, localLanguage)` with `, localLanguage)}`. So `localLanguage)}` became `localLanguage)}}`.
code = code.replace(/localLanguage\)\}\}/g, 'localLanguage)}');
// Let's run it multiple times just in case there are `}}}` 
code = code.replace(/localLanguage\)\}\}/g, 'localLanguage)}');

fs.writeFileSync('src/components/AudienceView.tsx', code);
