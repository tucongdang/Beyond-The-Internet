const fs = require('fs');
let code = fs.readFileSync('src/components/AudienceView.tsx', 'utf8');
let lines = code.split('\n');

function fixLine(n, replaceFrom, replaceTo) {
  let idx = n - 1;
  if (lines[idx]) {
    lines[idx] = lines[idx].replace(replaceFrom, replaceTo);
  }
}

// 288:  t("view_sort_incomplete", localLanguage).replace("{expected}", expectedCount).replace("{current}", currentCount).replace("{expected}", expectedCount)
// Wait, I replaced a string inside an array or function.
// Let's print out lines around 288.
