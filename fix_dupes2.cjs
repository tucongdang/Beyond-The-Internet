const fs = require('fs');

let code = fs.readFileSync('src/utils/i18n.ts', 'utf8');

code = code.replace(/sidebar_hide: "Ẩn thanh công cụ",/g, 'sidebar_hide_toolbar: "Ẩn thanh công cụ",');
code = code.replace(/sidebar_hide: "Hide Toolbar",/g, 'sidebar_hide_toolbar: "Hide Toolbar",');

code = code.replace(/sidebar_profile: "Hồ Sơ",/g, 'sidebar_profile_tab: "Hồ Sơ",');
code = code.replace(/sidebar_profile: "Profile",/g, 'sidebar_profile_tab: "Profile",');

fs.writeFileSync('src/utils/i18n.ts', code);

let aud = fs.readFileSync('src/components/AudienceDesktopSidebar.tsx', 'utf8');
aud = aud.replace(/t\("sidebar_hide", localLanguage\)/g, 't("sidebar_hide_toolbar", localLanguage)');
aud = aud.replace(/t\("sidebar_profile", localLanguage\)/g, 't("sidebar_profile_tab", localLanguage)');
fs.writeFileSync('src/components/AudienceDesktopSidebar.tsx', aud);

console.log("Fixed dupes 2");
