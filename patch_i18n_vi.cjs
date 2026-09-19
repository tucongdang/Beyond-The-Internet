const fs = require('fs');

let code = fs.readFileSync('src/utils/i18n.ts', 'utf8');

code = code.replace(/sidebar_battery_saver_off: "Tiết Kiệm Pin đang TẮT",/, 'sidebar_battery_saver_off: "Tiết Kiệm Pin đang TẮT",\n    view_panic_title: "HỆ THỐNG TẠM DỪNG",\n    view_panic_desc1: "Quyền tương tác hiện đang bị khóa bởi Quản trị viên do có yêu cầu khẩn cấp. Mọi bài thi đã nộp vẫn được bảo lưu an toàn.",\n    view_panic_desc2: "Vui lòng làm theo hướng dẫn của MC hoặc chờ thông báo tiếp theo.",');

fs.writeFileSync('src/utils/i18n.ts', code);
console.log("Patched i18n vi");
