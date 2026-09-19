const fs = require('fs');
let code = fs.readFileSync('src/utils/i18n.ts', 'utf8');

const viKeys = `    sidebar_profile_rank: "Mở bảng Hồ sơ & Xếp hạng (Phím P)",
    sidebar_keys_guide: "Mở hướng dẫn Phím tắt máy tính (Phím H / K)",
    sidebar_tools: "Mở bảng Công cụ & Cài đặt hiển thị",
    sidebar_qna_cheer: "Cổ vũ & Hỏi đáp Q&A",
    sidebar_hide: "Ẩn thanh công cụ",
    sidebar_tab_title: "Tab Tiện Ích Khán Giả",
    sidebar_h_to_close: "Phím H để đóng",
    sidebar_esc_to_close: "Đóng bảng (Phím Esc / H)",
    sidebar_profile: "Hồ Sơ",
    sidebar_keys: "Phím Tắt",
    sidebar_tool_tab: "Công Cụ",
    sidebar_interact: "Giao Lưu",
    sidebar_edit_profile: "Xem & sửa thông tin cá nhân (Phím P)",
    sidebar_connecting: "Đang kết nối",
    sidebar_total_score: "Tổng Điểm",
    sidebar_correct_rate: "Tỷ lệ Đúng",
    sidebar_syncing_score: "Đang đồng bộ dữ liệu điểm số khán giả...",
    sidebar_current_choice: "Lựa chọn hiện tại:",
    sidebar_question_eval: "Đánh giá câu hỏi:",
    sidebar_edit_p: "Sửa Hồ Sơ (P)",
    sidebar_log_l: "Nhật Ký (L)",
    sidebar_ans_a: "Đáp án A",
    sidebar_ans_b: "Đáp án B",
    sidebar_ans_c: "Đáp án C",
    sidebar_ans_d: "Đáp án D",
    sidebar_confirm: "Xác nhận",
    sidebar_quick_keys: "Phím Chức Năng Nhanh",
    sidebar_full_mode: "Chế độ Toàn Màn Hình",
    sidebar_sound_fx: "Âm Thanh Hiệu Ứng (Sound FX)",
    sidebar_keep_awake: "Giữ Màn Hình Luôn Sáng",
    sidebar_battery_saver_set: "Cài Đặt Tiết Kiệm Pin",
    sidebar_invite_qr: "Mời Bạn Bè Tham Gia (Mã QR)",
    sidebar_live_aud: "Khán Giả Trực Tiếp",
    sidebar_live_desc: "Bạn đang theo dõi trực tiếp đấu trường. Mọi câu trả lời và tương tác được chấm điểm tự động trong thời gian thực!",
    sidebar_on: "Đang Bật",
    sidebar_off: "Tắt",
    sidebar_details: "Chi Tiết"
`;

const enKeys = `    sidebar_profile_rank: "Open Profile & Leaderboard (Key P)",
    sidebar_keys_guide: "Open Shortcuts Guide (Key H / K)",
    sidebar_tools: "Open Tools & Display Settings",
    sidebar_qna_cheer: "Cheer & Q&A",
    sidebar_hide: "Hide Toolbar",
    sidebar_tab_title: "Audience Utilities Tab",
    sidebar_h_to_close: "Press H to close",
    sidebar_esc_to_close: "Close panel (Esc / H)",
    sidebar_profile: "Profile",
    sidebar_keys: "Shortcuts",
    sidebar_tool_tab: "Tools",
    sidebar_interact: "Interact",
    sidebar_edit_profile: "View & edit personal info (Key P)",
    sidebar_connecting: "Connecting",
    sidebar_total_score: "Total Score",
    sidebar_correct_rate: "Correct Rate",
    sidebar_syncing_score: "Syncing audience score data...",
    sidebar_current_choice: "Current choice:",
    sidebar_question_eval: "Question evaluation:",
    sidebar_edit_p: "Edit Profile (P)",
    sidebar_log_l: "Question Log (L)",
    sidebar_ans_a: "Answer A",
    sidebar_ans_b: "Answer B",
    sidebar_ans_c: "Answer C",
    sidebar_ans_d: "Answer D",
    sidebar_confirm: "Confirm",
    sidebar_quick_keys: "Quick Shortcuts",
    sidebar_full_mode: "Fullscreen Mode",
    sidebar_sound_fx: "Sound FX",
    sidebar_keep_awake: "Keep Screen Awake",
    sidebar_battery_saver_set: "Battery Saver Settings",
    sidebar_invite_qr: "Invite Friends (QR Code)",
    sidebar_live_aud: "Live Audience",
    sidebar_live_desc: "You are watching the live arena. All answers and interactions are scored automatically in real-time!",
    sidebar_on: "ON",
    sidebar_off: "OFF",
    sidebar_details: "Details"
`;

code = code.replace('view_stmt_true: "Ý {key}: ĐÚNG",', viKeys + '    view_stmt_true: "Ý {key}: ĐÚNG",');
code = code.replace('view_stmt_true: "STMT {key}: TRUE",', enKeys + '    view_stmt_true: "STMT {key}: TRUE",');
fs.writeFileSync('src/utils/i18n.ts', code);
console.log("Patched i18n_sidebar");

let aud = fs.readFileSync('src/components/AudienceDesktopSidebar.tsx', 'utf8');
aud = aud.replace(/title="Mở bảng Hồ sơ & Xếp hạng \(Phím P\)"/g, 'title={t("sidebar_profile_rank", localLanguage)}');
aud = aud.replace(/title="Mở hướng dẫn Phím tắt máy tính \(Phím H \/ K\)"/g, 'title={t("sidebar_keys_guide", localLanguage)}');
aud = aud.replace(/title="Mở bảng Công cụ & Cài đặt hiển thị"/g, 'title={t("sidebar_tools", localLanguage)}');
aud = aud.replace(/title="Cổ vũ & Hỏi đáp Q&A"/g, 'title={t("sidebar_qna_cheer", localLanguage)}');
aud = aud.replace(/title="Ẩn thanh công cụ"/g, 'title={t("sidebar_hide", localLanguage)}');
aud = aud.replace(/Tab Tiện Ích Khán Giả/g, '{t("sidebar_tab_title", localLanguage)}');
aud = aud.replace(/Phím H để đóng/g, '{t("sidebar_h_to_close", localLanguage)}');
aud = aud.replace(/title="Đóng bảng \(Phím Esc \/ H\)"/g, 'title={t("sidebar_esc_to_close", localLanguage)}');
aud = aud.replace(/title="Xem & sửa thông tin cá nhân \(Phím P\)"/g, 'title={t("sidebar_edit_profile", localLanguage)}');
aud = aud.replace(/title="Đang kết nối"/g, 'title={t("sidebar_connecting", localLanguage)}');
aud = aud.replace(/Tổng Điểm/g, '{t("sidebar_total_score", localLanguage)}');
aud = aud.replace(/Tỷ lệ Đúng/g, '{t("sidebar_correct_rate", localLanguage)}');
aud = aud.replace(/Đang đồng bộ dữ liệu điểm số khán giả.../g, '{t("sidebar_syncing_score", localLanguage)}');
aud = aud.replace(/Lựa chọn hiện tại:/g, '{t("sidebar_current_choice", localLanguage)}');
aud = aud.replace(/Đánh giá câu hỏi:/g, '{t("sidebar_question_eval", localLanguage)}');
aud = aud.replace(/Sửa Hồ Sơ \(P\)/g, '{t("sidebar_edit_p", localLanguage)}');
aud = aud.replace(/Nhật Ký \(L\)/g, '{t("sidebar_log_l", localLanguage)}');
aud = aud.replace(/Đáp án A/g, '{"Đáp án A"}'); // Will handle dynamic ones later if needed, they are just minor options
aud = aud.replace(/localLanguage === 'en' \? 'Confirm' : 'Xác nhận'/g, 't("sidebar_confirm", localLanguage)');
aud = aud.replace(/localLanguage === 'en' \? 'Quick Keys' : 'Phím Chức Năng Nhanh'/g, 't("sidebar_quick_keys", localLanguage)');
aud = aud.replace(/localLanguage === 'en' \? 'Fullscreen Mode' : 'Chế độ Toàn Màn Hình'/g, 't("sidebar_full_mode", localLanguage)');
aud = aud.replace(/Âm Thanh Hiệu Ứng \(Sound FX\)/g, '{t("sidebar_sound_fx", localLanguage)}');
aud = aud.replace(/localLanguage === 'en' \? 'Keep Screen On' : 'Giữ Màn Hình Luôn Sáng'/g, 't("sidebar_keep_awake", localLanguage)');
aud = aud.replace(/Cài Đặt Tiết Kiệm Pin/g, '{t("sidebar_battery_saver_set", localLanguage)}');
aud = aud.replace(/Mời Bạn Bè Tham Gia \(Mã QR\)/g, '{t("sidebar_invite_qr", localLanguage)}');
aud = aud.replace(/Khán Giả Trực Tiếp/g, '{t("sidebar_live_aud", localLanguage)}');
aud = aud.replace(/Bạn đang theo dõi trực tiếp đấu trường Beyond The Internet 2026. Mọi câu trả lời và tương tác được chấm điểm tự động trong thời gian thực!/g, '{t("sidebar_live_desc", localLanguage)}');

fs.writeFileSync('src/components/AudienceDesktopSidebar.tsx', aud);
console.log("Patched AudienceDesktopSidebar");
