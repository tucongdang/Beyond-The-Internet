const fs = require('fs');

const filesToFix = [
  'src/components/AudienceAnswerDistributionChart.tsx',
  'src/components/AudienceCheerModal.tsx',
  'src/components/AudienceQAWidget.tsx',
  'src/components/AudienceQuestionLogModal.tsx'
];

for (const file of filesToFix) {
  let code = fs.readFileSync(file, 'utf8');
  if (!code.includes("import { t }")) {
    code = "import { t } from '../utils/i18n';\n" + code;
    fs.writeFileSync(file, code);
  }
}
