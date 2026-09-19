const fs = require('fs');
let code = fs.readFileSync('src/components/AudienceView.tsx', 'utf8');

// 1113
code = code.replace(/title=\{isWakeLockLocked \? t\("view_wakelock_on", localLanguage\) : t\("view_wakelock_off", localLanguage\)\s*>/g, 'title={isWakeLockLocked ? t("view_wakelock_on", localLanguage) : t("view_wakelock_off", localLanguage)}\n                  >');

// 1709 (it was 1709 which is identical)
code = code.replace(/title=\{isWakeLockLocked \? t\("view_wakelock_on", localLanguage\) : t\("view_wakelock_off", localLanguage\)\s*>/g, 'title={isWakeLockLocked ? t("view_wakelock_on", localLanguage) : t("view_wakelock_off", localLanguage)}\n                  >');

// 2476
code = code.replace(/\{isPendingSync \? t\("active_syncing", localLanguage\)\} : t\("active_voted", localLanguage\)\}/g, '{isPendingSync ? t("active_syncing", localLanguage) : t("active_voted", localLanguage)}');

// 2481
code = code.replace(/\{t\("active_similar_votes", localLanguage\)\s*<\/span>/g, '{t("active_similar_votes", localLanguage)})\n                      </span>');
// Wait, the previous text was: `({Math.round(...)} {t(...)` without closing `)`. 
// I replaced it with `{t("active_similar_votes", localLanguage)})` earlier in fixLine! Let's check 2481 text exactly:
// From grep: `{localLanguage === "en" ? "There are" : "Có"} {pollStats.percentages[selectedChoice] || 0}% ({Math.round(((pollStats.percentages[selectedChoice] || 0) * pollStats.total) / 100)} {t("active_similar_votes", localLanguage)}`
code = code.replace(/\{t\("active_similar_votes", localLanguage\)\n/g, '{t("active_similar_votes", localLanguage)})\n');
// actually just replace `t("active_similar_votes", localLanguage)}` with `t("active_similar_votes", localLanguage)})`
code = code.replace(/t\("active_similar_votes", localLanguage\)\}\s*<\/span>/g, 't("active_similar_votes", localLanguage)})\n                      </span>');

// 2668
code = code.replace(/userAns: userVal \|\| t\("view_not_chosen", localLanguage\)\},/g, 'userAns: userVal || t("view_not_chosen", localLanguage),');

// 3061-3072: Wait, `return null;  };  return (    <>      {renderContent()}    </>  );};export const AudienceView`
// There's a stray `};` ?
// `return null;  };  return (` -> `return null;  \n  return (`
code = code.replace(/return null;\s*};\s*return \(/g, 'return null;\n  return (');

fs.writeFileSync('src/components/AudienceView.tsx', code);
