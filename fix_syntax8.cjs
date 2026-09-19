const fs = require('fs');
let code = fs.readFileSync('src/components/AudienceView.tsx', 'utf8');

// 2165 missing }
code = code.replace(/placeholder=\{gameState\.round_type === 'FILL_IN_BLANK' \? t\("view_ph_blank", localLanguage\) : t\("view_ph_short", localLanguage\)\s*value=/g, 'placeholder={gameState.round_type === \'FILL_IN_BLANK\' ? t("view_ph_blank", localLanguage) : t("view_ph_short", localLanguage)}\n                          value=');

// 3061 missing };
code = code.replace(/return null;\n  return \(\n    <>\n      \{renderContent\(\)\}/g, 'return null;\n  };\n  return (\n    <>\n      {renderContent()}');

fs.writeFileSync('src/components/AudienceView.tsx', code);
