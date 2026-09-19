const fs = require('fs');

let code = fs.readFileSync('src/utils/i18n.ts', 'utf8');

// Insert Vietnamese
code = code.replace(/sidebar_battery_saver_off: "Tắt tiết kiệm pin",/, 'sidebar_battery_saver_off: "Tắt tiết kiệm pin",\n    view_panic_title: "HỆ THỐNG TẠM DỪNG",\n    view_panic_desc1: "Quyền tương tác hiện đang bị khóa bởi Quản trị viên do có yêu cầu khẩn cấp. Mọi bài thi đã nộp vẫn được bảo lưu an toàn.",\n    view_panic_desc2: "Vui lòng làm theo hướng dẫn của MC hoặc chờ thông báo tiếp theo.",');

// Insert English
code = code.replace(/sidebar_battery_saver_off: "Battery Saver is OFF",/, 'sidebar_battery_saver_off: "Battery Saver is OFF",\n    view_panic_title: "SYSTEM PAUSED",\n    view_panic_desc1: "Interaction is currently locked by the Administrator due to an emergency request. All submitted answers are safely preserved.",\n    view_panic_desc2: "Please follow the MC\'s instructions or wait for further announcements.",');

fs.writeFileSync('src/utils/i18n.ts', code);
console.log("Patched i18n");
