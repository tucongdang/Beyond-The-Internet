const fs = require('fs');
let code = fs.readFileSync('src/components/AudienceView.tsx', 'utf8');
let lines = code.split('\n');

function fixLine(n, replaceFrom, replaceTo) {
  let idx = n - 1;
  if (lines[idx]) {
    lines[idx] = lines[idx].replace(replaceFrom, replaceTo);
  }
}

fixLine(288, 't("view_sort_req_name", localLanguage)},', 't("view_sort_req_name", localLanguage),');
fixLine(299, 't("view_sort_no_options", localLanguage)},', 't("view_sort_no_options", localLanguage),');
fixLine(309, 't("view_sort_timeout", localLanguage)},', 't("view_sort_timeout", localLanguage),');
fixLine(320, 't("view_sort_incomplete", localLanguage)}.replace', 't("view_sort_incomplete", localLanguage).replace');
fixLine(333, '? t("view_sort_missing", localLanguage)}.replace', '? t("view_sort_missing", localLanguage).replace');
fixLine(334, ': t("view_sort_duplicate", localLanguage)}', ': t("view_sort_duplicate", localLanguage)');
fixLine(345, 't("view_sort_invalid", localLanguage)}.replace', 't("view_sort_invalid", localLanguage).replace');
fixLine(927, '? t("view_wait_mc", localLanguage)}', '? t("view_wait_mc", localLanguage)');
fixLine(928, ': t("view_welcome_reg", localLanguage)}', ': t("view_welcome_reg", localLanguage)');
fixLine(1113, '? t("view_wakelock_on", localLanguage)} : t("view_wakelock_off", localLanguage)}', '? t("view_wakelock_on", localLanguage) : t("view_wakelock_off", localLanguage)');
fixLine(1116, '? t("view_on", localLanguage)} : t("view_off", localLanguage)}', '? t("view_on", localLanguage) : t("view_off", localLanguage)');
fixLine(1305, 'placeholder=t("view_risk_ph", localLanguage)}', 'placeholder={t("view_risk_ph", localLanguage)}');
fixLine(1317, 'placeholder=t("view_cnv_ph", localLanguage)}', 'placeholder={t("view_cnv_ph", localLanguage)}');
fixLine(1369, 'placeholder=t("view_predict_risk_ph", localLanguage)}', 'placeholder={t("view_predict_risk_ph", localLanguage)}');
fixLine(1499, '? t("view_correct", localLanguage)} : t("view_incorrect", localLanguage)}', '? t("view_correct", localLanguage) : t("view_incorrect", localLanguage)');
fixLine(1599, '? t("view_update_predict", localLanguage)} : t("view_send_predict", localLanguage)}', '? t("view_update_predict", localLanguage) : t("view_send_predict", localLanguage)');
fixLine(1709, '? t("view_wakelock_on", localLanguage)} : t("view_wakelock_off", localLanguage)}', '? t("view_wakelock_on", localLanguage) : t("view_wakelock_off", localLanguage)');
fixLine(1712, '? t("view_on", localLanguage)} : t("view_off", localLanguage)}', '? t("view_on", localLanguage) : t("view_off", localLanguage)');
fixLine(1823, '? t("view_tip_mc", localLanguage)} :', '? t("view_tip_mc", localLanguage) :');
fixLine(1824, '? t("view_tip_tf", localLanguage)} :', '? t("view_tip_tf", localLanguage) :');
fixLine(1825, '? t("view_tip_sort", localLanguage)} :', '? t("view_tip_sort", localLanguage) :');
fixLine(1826, '? t("view_tip_short", localLanguage)} :', '? t("view_tip_short", localLanguage) :');
fixLine(1827, '? t("view_tip_cnv", localLanguage)} :', '? t("view_tip_cnv", localLanguage) :');
fixLine(1828, 't("view_tip_default", localLanguage)}', 't("view_tip_default", localLanguage)');
fixLine(2159, '? t("view_enter_blank", localLanguage)} : t("view_enter_short", localLanguage)}', '? t("view_enter_blank", localLanguage) : t("view_enter_short", localLanguage)');
fixLine(2164, 'placeholder={gameState.round_type === \'FILL_IN_BLANK\' ? t("view_ph_blank", localLanguage) : t("view_ph_short", localLanguage)}', 'placeholder={gameState.round_type === \'FILL_IN_BLANK\' ? t("view_ph_blank", localLanguage) : t("view_ph_short", localLanguage)}'); // Already fixed? Let's check. Wait, in fix_syntax_final I fixed 2164.
fixLine(2476, '{t("active_similar_votes", localLanguage)}', 't("active_similar_votes", localLanguage)}'); // Wait, line 2476 was `Có {pollStats...} {t(...)`. It's fine inside JSX!
fixLine(2668, 'userAns: userVal || t("view_not_chosen", localLanguage)},', 'userAns: userVal || t("view_not_chosen", localLanguage),');
fixLine(2724, '? t("view_you_no_ans", localLanguage)}', '? t("view_you_no_ans", localLanguage)');

fs.writeFileSync('src/components/AudienceView.tsx', lines.join('\n'));
