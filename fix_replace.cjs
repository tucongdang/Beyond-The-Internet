const fs = require('fs');

function fixFile(file) {
  let code = fs.readFileSync(file, 'utf8');
  
  // Fix number replacements in AudienceView.tsx
  code = code.replace(/\.replace\("([^"]+)", expectedCount\)/g, '.replace("$1", String(expectedCount))');
  code = code.replace(/\.replace\("([^"]+)", currentCount\)/g, '.replace("$1", String(currentCount))');
  code = code.replace(/\.replace\("([^"]+)", Math.round/g, '.replace("$1", String(Math.round');
  code = code.replace(/\}\)\}\)/g, '}))'); // Math.round closing parens might need fix if I blindly String(...)
  // Actually, wait: `Math.round((...) * total) / 100)`
  
  fs.writeFileSync(file, code);
}

// Safer approach: 
let av = fs.readFileSync('src/components/AudienceView.tsx', 'utf8');
av = av.replace(/replace\("\{expected\}", expectedCount\)/g, 'replace("{expected}", String(expectedCount))');
av = av.replace(/replace\("\{current\}", currentCount\)/g, 'replace("{current}", String(currentCount))');
fs.writeFileSync('src/components/AudienceView.tsx', av);

let logCode = fs.readFileSync('src/components/AudienceQuestionLogModal.tsx', 'utf8');
logCode = logCode.replace(/replace\("\{count\}", logEntries.filter/g, 'replace("{count}", String(logEntries.filter');
logCode = logCode.replace(/isCorrect\)\.length\)/g, 'isCorrect).length))');
logCode = logCode.replace(/replace\("\{pts\}", entry\.pointsEarned\)/g, 'replace("{pts}", String(entry.pointsEarned))');
logCode = logCode.replace(/replace\("\{filtered\}", filteredEntries\.length\)/g, 'replace("{filtered}", String(filteredEntries.length))');
logCode = logCode.replace(/replace\("\{total\}", logEntries\.length\)/g, 'replace("{total}", String(logEntries.length))');
fs.writeFileSync('src/components/AudienceQuestionLogModal.tsx', logCode);
