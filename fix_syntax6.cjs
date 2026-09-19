const fs = require('fs');
let code = fs.readFileSync('src/components/AudienceView.tsx', 'utf8');
let lines = code.split('\n');

function fixLine(n, replaceFrom, replaceTo) {
  let idx = n - 1;
  if (lines[idx]) {
    lines[idx] = lines[idx].replace(replaceFrom, replaceTo);
  }
}

// 928 needs `}` at the end
fixLine(928, ': t("view_welcome_reg", localLanguage)', ': t("view_welcome_reg", localLanguage)}');

// 1116
fixLine(1116, '? t("view_on", localLanguage) : t("view_off", localLanguage)', '? t("view_on", localLanguage) : t("view_off", localLanguage)}');

// 1499
fixLine(1499, '? t("view_correct", localLanguage) : t("view_incorrect", localLanguage)', '? t("view_correct", localLanguage) : t("view_incorrect", localLanguage)}');

// 1599
fixLine(1599, '? t("view_update_predict", localLanguage) : t("view_send_predict", localLanguage)', '? t("view_update_predict", localLanguage) : t("view_send_predict", localLanguage)}');

// 1712
fixLine(1712, '? t("view_on", localLanguage) : t("view_off", localLanguage)', '? t("view_on", localLanguage) : t("view_off", localLanguage)}');

// 1828
fixLine(1828, 't("view_tip_default", localLanguage)', 't("view_tip_default", localLanguage)}');

// 2159
fixLine(2159, '? t("view_enter_blank", localLanguage) : t("view_enter_short", localLanguage)', '? t("view_enter_blank", localLanguage) : t("view_enter_short", localLanguage)}');

// 2476 - this one has `{t(...` but what was it originally?
// `({Math.round(((pollStats.percentages[selectedChoice] || 0) * pollStats.total) / 100)} {t("active_similar_votes", localLanguage)}`
// It should be `... {t("active_similar_votes", localLanguage)})` maybe?
fixLine(2476, '{t("active_similar_votes", localLanguage)', '{t("active_similar_votes", localLanguage)})');

// 2668
// `userAns: userVal || t("view_not_chosen", localLanguage),` - this should be correct if it's in an object literal. Wait, it was `userAns: userVal || 'Chưa chọn',`. So replacing it with `userAns: userVal || t("view_not_chosen", localLanguage),` is correct. Why did it error at 2668? Let's read it.

fs.writeFileSync('src/components/AudienceView.tsx', lines.join('\n'));

// Let's also check AudienceQuestionLogModal.tsx syntax errors:
let logCode = fs.readFileSync('src/components/AudienceQuestionLogModal.tsx', 'utf8');
logCode = logCode.replace(/title=t\(/g, 'title={t(');
logCode = logCode.replace(/title=\{t\("([^"]+)", localLanguage\)/g, 'title={t("$1", localLanguage)}');
// And replacing `}`? 
// 339: `title={t("log_copy_all", localLanguage)}}` -> `title={t("log_copy_all", localLanguage)}`
logCode = logCode.replace(/localLanguage\)\}\}/g, 'localLanguage)}');

fs.writeFileSync('src/components/AudienceQuestionLogModal.tsx', logCode);
