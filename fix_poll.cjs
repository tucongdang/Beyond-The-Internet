const fs = require('fs');

let code = fs.readFileSync('src/components/EmergencyPollAudience.tsx', 'utf8');

// Replace the hardcoded `localLanguage` calls in SOURCE_BADGE_STYLE with their string keys
code = code.replace(/label: t\("view_poll_expert", localLanguage\)/, 'label: "view_poll_expert"');
code = code.replace(/label: t\("view_poll_contestant", localLanguage\)/, 'label: "view_poll_contestant"');
code = code.replace(/label: t\("view_poll_judge", localLanguage\)/, 'label: "view_poll_judge"');
code = code.replace(/label: t\("view_poll_audience", localLanguage\)/, 'label: "view_poll_audience"');
code = code.replace(/label: t\("view_poll_mc", localLanguage\)/, 'label: "view_poll_mc"');

// Now, wherever `style.label` is used, we wrap it in `t(..., localLanguage)`
code = code.replace(/>\{style\.label\}</g, '>{t(style.label, localLanguage)}<');

fs.writeFileSync('src/components/EmergencyPollAudience.tsx', code);
console.log("Fixed EmergencyPollAudience static const");
