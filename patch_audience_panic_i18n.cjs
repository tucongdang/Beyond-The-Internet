const fs = require('fs');

let code = fs.readFileSync('src/components/AudienceView.tsx', 'utf8');

code = code.replace(
  /<h2 className="text-3xl font-black text-red-400 tracking-widest uppercase">HỆ THỐNG TẠM DỪNG<\/h2>/,
  '<h2 className="text-3xl font-black text-red-400 tracking-widest uppercase">{t("view_panic_title", localLanguage)}</h2>'
);

code = code.replace(
  /Quyền tương tác hiện đang bị khóa bởi Quản trị viên do có yêu cầu khẩn cấp\. Mọi bài thi đã nộp vẫn được bảo lưu an toàn\./,
  '{t("view_panic_desc1", localLanguage)}'
);

code = code.replace(
  /Vui lòng làm theo hướng dẫn của MC hoặc chờ thông báo tiếp theo\./,
  '{t("view_panic_desc2", localLanguage)}'
);

// Also need to check if "Beyond The Internet 2026" at line 942 needs localization. 
// "Beyond The Internet 2026" is a brand name, probably doesn't need to be localized.

// Let's also check for "QR" at line 1911.
// It's probably just the letters "QR".

fs.writeFileSync('src/components/AudienceView.tsx', code);
console.log("Patched AudienceView panic mode");
