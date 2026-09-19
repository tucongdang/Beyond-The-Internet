const fs = require('fs');
let code = fs.readFileSync('src/components/AudienceView.tsx', 'utf8');

// 2164
code = code.replace(/t\("view_ph_blank", localLanguage\)\} : t\("view_ph_short", localLanguage\)\}/g, 't("view_ph_blank", localLanguage) : t("view_ph_short", localLanguage)');

// 2185
code = code.replace(/\{isPendingSync \? t\("active_syncing", localLanguage\)\} : t\("view_sent", localLanguage\)\}/g, '{isPendingSync ? t("active_syncing", localLanguage) : t("view_sent", localLanguage)}');

// 2396-2398
code = code.replace(/networkStatus === 'OFFLINE' \? t\("view_net_offline", localLanguage\)\} :/g, "networkStatus === 'OFFLINE' ? t(\"view_net_offline\", localLanguage) :");
code = code.replace(/networkStatus === 'DELAYED' \? t\("view_net_slow", localLanguage\)\} :/g, "networkStatus === 'DELAYED' ? t(\"view_net_slow\", localLanguage) :");
code = code.replace(/t\("view_net_stable", localLanguage\)\}/g, 't("view_net_stable", localLanguage)');

// 2476
code = code.replace(/\{t\("active_similar_votes", localLanguage\)/g, '{t("active_similar_votes", localLanguage)}');
// 2505 (actually the issue is missing `{` or `}`? Wait, `{t("view_option", localLanguage)} [{selectedChoice}]`. What is the error? TS1136: Property assignment expected. Let's look at 2505 later if it's still there)
// Wait, `t("view_option", localLanguage)} [{selectedChoice}]` - if it's inside JSX it should be `{t("view_option", localLanguage)} [{selectedChoice}]`. Maybe I missed the first `{`?
code = code.replace(/>\{t\("view_option", localLanguage\)\} \[\{selectedChoice\}\]</g, '>{t("view_option", localLanguage)} [{selectedChoice}]<');
// It was: `<p ...>Phương án [{selectedChoice}]</p>` -> `<p ...>{t("view_option", localLanguage)} [{selectedChoice}]</p>`

// title={...}}
code = code.replace(/title=\{t\("view_nav_shout_mq", localLanguage\)\}\}/g, 'title={t("view_nav_shout_mq", localLanguage)}');
code = code.replace(/title=\{t\("view_nav_cheer", localLanguage\)\}\}/g, 'title={t("view_nav_cheer", localLanguage)}');
code = code.replace(/title=\{t\("view_nav_qa", localLanguage\)\}\}/g, 'title={t("view_nav_qa", localLanguage)}');

fs.writeFileSync('src/components/AudienceView.tsx', code);
