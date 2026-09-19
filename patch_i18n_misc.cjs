const fs = require('fs');
let code = fs.readFileSync('src/utils/i18n.ts', 'utf8');

// Vi
code = code.replace(/view_panic_desc2: "Vui lòng làm theo hướng dẫn của MC hoặc chờ thông báo tiếp theo.",/, 'view_panic_desc2: "Vui lòng làm theo hướng dẫn của MC hoặc chờ thông báo tiếp theo.",\n    view_code: "Mã",\n    view_votes: "phiếu",\n    view_media_alt: "Hình ảnh câu hỏi",');

// En
code = code.replace(/view_panic_desc2: "Please follow the MC's instructions or wait for further announcements.",/, 'view_panic_desc2: "Please follow the MC\'s instructions or wait for further announcements.",\n    view_code: "Code",\n    view_votes: "votes",\n    view_media_alt: "Question Media",');

fs.writeFileSync('src/utils/i18n.ts', code);
console.log("Patched misc i18n keys");
