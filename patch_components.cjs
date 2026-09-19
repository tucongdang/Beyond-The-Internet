const fs = require('fs');

function replaceInFile(path, replacements) {
    let code = fs.readFileSync(path, 'utf8');
    for (const r of replacements) {
        code = code.split(r.from).join(r.to);
    }
    fs.writeFileSync(path, code);
    console.log("Patched " + path);
}

// BatteryIndicator.tsx
replaceInFile('src/components/BatteryIndicator.tsx', [
    { from: `localLanguage === 'en' ? 'Device Battery' : 'Pin Thiết Bị'`, to: `t("view_battery_dev", localLanguage)` },
    { from: `localLanguage === 'en' ? 'Level:' : 'Mức pin:'`, to: `t("view_battery_level", localLanguage)` },
    { from: `Tiết kiệm pin`, to: `{t("view_battery_save", localLanguage)}` },
    { from: `Sạc AC`, to: `{t("view_battery_charge", localLanguage)}` },
    { from: `localLanguage === "en" ? "Battery Status" : "Tình Trạng Pin"`, to: `t("view_battery_status", localLanguage)` },
    { from: `localLanguage === "en" ? \`Device battery: \$\{percent\}%. Click for power settings.\` : \`Mức pin thiết bị: \$\{percent\}%. Bấm để mở cài đặt tiết kiệm pin.\``, to: `t("view_battery_label_dev", localLanguage).replace("{percent}", String(percent))` },
    { from: `localLanguage === 'en' ? 'Chg' : 'Sạc'`, to: `t("view_battery_chg", localLanguage)` }
]);

// ScoreDisplay.tsx
replaceInFile('src/components/ScoreDisplay.tsx', [
    { from: `lang === 'en' ? 'Start' : 'Khởi Động'`, to: `t("view_score_start", lang)` },
    { from: `lang === 'en' ? '+10p / Q (+5p <3s)' : '+10đ / câu (+5đ <3s)'`, to: `t("view_score_start_desc", lang)` },
    { from: `lang === 'en' ? 'Risk (+120p) & Obj (+80p)' : 'Mạo hiểm (+120đ) & CNV (+80đ)'`, to: `t("view_score_obs_desc", lang)` },
    { from: `lang === 'en' ? 'Accel' : 'Tăng Tốc'`, to: `t("view_score_accel", lang)` },
    { from: `lang === 'en' ? 'Speed (+40, +30, +20, +10)' : 'Tốc độ (+40, +30, +20, +10)'`, to: `t("view_score_accel_desc", lang)` },
    { from: `lang === 'en' ? 'Finish' : 'Về Đích'`, to: `t("view_score_finish", lang)` },
    { from: `lang === 'en' ? 'Interaction (+40p)' : 'Tương tác (+40đ)'`, to: `t("view_score_finish_desc", lang)` },
    { from: `localLanguage === 'en' ? 'Total Score' : 'Tổng Điểm'`, to: `t("view_score_total", localLanguage)` },
    { from: `localLanguage === 'en' ? 'Points per Round' : 'Điểm Từng Vòng'`, to: `t("view_score_per_round", localLanguage)` },
    { from: `localLanguage === "en" ? "Wake Lock ON. Click to turn off." : "Màn hình luôn sáng đang BẬT. Nhấn để tắt."`, to: `t("view_score_wake_on", localLanguage)` },
    { from: `localLanguage === "en" ? "Wake Lock OFF. Click to turn on." : "Màn hình luôn sáng đang TẮT. Nhấn để bật."`, to: `t("view_score_wake_off", localLanguage)` },
    { from: `localLanguage === "en" ? "Always On" : "Luôn sáng"`, to: `t("view_score_always_on", localLanguage)` },
    { from: `localLanguage === "en" ? "Auto Off" : "Tự tắt"`, to: `t("view_score_auto_off", localLanguage)` },
    { from: `localLanguage === "en" ? "Disable High Contrast" : "Tắt chế độ nền đen"`, to: `t("view_score_dark_on", localLanguage)` },
    { from: `localLanguage === "en" ? "Enable High Contrast" : "Bật chế độ nền đen"`, to: `t("view_score_dark_off", localLanguage)` },
    { from: `localLanguage === "en" ? "Dark" : "Nền đen"`, to: `t("view_score_dark", localLanguage)` },
    { from: `localLanguage === "en" ? "Open Answer Logs" : "Mở Nhật Ký Câu Hỏi & Đáp Án Cá Nhân (Read-Only)"`, to: `t("view_score_log_title", localLanguage)` },
    { from: `localLanguage === "en" ? "Exit Fullscreen (F)" : "Thu nhỏ màn hình (Phím F)"`, to: `t("view_score_full_exit", localLanguage)` },
    { from: `localLanguage === "en" ? "Enter Fullscreen (F)" : "Bật chế độ toàn màn hình (Phím F)"`, to: `t("view_score_full_enter", localLanguage)` },
    { from: `localLanguage === "en" ? "Exit Full" : "Thu Nhỏ"`, to: `t("view_score_full_exit_short", localLanguage)` },
    { from: `localLanguage === "en" ? "Full (F)" : "Toàn Màn (F)"`, to: `t("view_score_full_enter_short", localLanguage)` },
    { from: `localLanguage === 'en' ? 'Score Details & Stats' : 'Chi Tiết Điểm Số & Thống Kê'`, to: `t("view_score_details", localLanguage)` },
]);

// EmergencyPollAudience.tsx
replaceInFile('src/components/EmergencyPollAudience.tsx', [
    { from: `'Cố vấn chuyên môn'`, to: `t("view_poll_expert", localLanguage)` },
    { from: `'Thí sinh / Đội thi'`, to: `t("view_poll_contestant", localLanguage)` },
    { from: `'Ban Giám Khảo'`, to: `t("view_poll_judge", localLanguage)` },
    { from: `'Khán giả'`, to: `t("view_poll_audience", localLanguage)` },
    { from: `'MC / Ban Tổ Chức'`, to: `t("view_poll_mc", localLanguage)` },
    { from: `localLanguage === 'en' ? '• Live opinion from the hall' : '• Ý kiến trực tiếp từ khán phòng'`, to: `t("view_poll_live", localLanguage)` },
    { from: `isTimeUp ? 'HẾT GIỜ (ĐÃ KHÓA)' : 'ĐÃ KHÓA'`, to: `isTimeUp ? t("view_poll_timeout_locked", localLanguage) : t("view_poll_locked", localLanguage)` },
    { from: `localLanguage === 'en' ? '⏰ Voting time is up! The system has automatically closed the poll.' : '⏰ Hết thời gian biểu quyết! Hệ thống đã tự động đóng nhận phiếu bầu từ khán giả.'`, to: `t("view_poll_timeout_msg", localLanguage)` },
    { from: `localLanguage === 'en' ? 'voted' : 'đã bình chọn'`, to: `t("view_poll_voted_count", localLanguage)` },
    { from: `localLanguage === 'en' ? 'YOU VOTED' : 'BẠN ĐÃ BÌNH CHỌN'`, to: `t("view_poll_you_voted", localLanguage)` },
    { from: `localLanguage === 'en' ? 'CORRECT ANSWER' : 'ĐÁP ÁN ĐÚNG'`, to: `t("view_poll_correct_ans", localLanguage)` },
    { from: `localLanguage === 'en' ? 'Your opinion has been recorded in the live system!' : 'Ý kiến của bạn đã được ghi nhận vào hệ thống live!'`, to: `t("view_poll_recorded", localLanguage)` },
    { from: `localLanguage === "en" ? "Tap on your choice above to vote now" : "{localLanguage === 'en' ? 'Tap on your choice above to vote now' : 'Hãy chạm vào lựa chọn của bạn ở trên để bình chọn ngay'}"`, to: `t("view_poll_tap_vote", localLanguage)` },
    { from: `isTimeUp ? (localLanguage === 'en' ? 'Time is up' : 'Hết giờ bình chọn') : (localLanguage === 'en' ? 'Voting ended' : 'Bình chọn đã kết thúc')`, to: `isTimeUp ? t("view_poll_timeup", localLanguage) : t("view_poll_ended", localLanguage)` },
    { from: `localLanguage === 'en' ? 'Speed:' : 'Tốc độ:'`, to: `t("view_poll_speed", localLanguage)` },
    { from: `localLanguage === 'en' ? 'Majority choice:' : 'Đa số khán phòng lựa chọn:'`, to: `t("view_poll_majority", localLanguage)` },
    { from: `localLanguage === 'en' ? 'Balanced result between top choices!' : 'Kết quả cân bằng giữa các lựa chọn dẫn đầu!'`, to: `t("view_poll_balanced", localLanguage)` },
    { from: `localLanguage === 'en' ? \`Choice \$\{dominantOption.key\}: "\$\{dominantOption.text\}" (\$\{dominantOption.percent\}%)\` : \`Lựa chọn \$\{dominantOption.key\}: "\$\{dominantOption.text\}" (\$\{dominantOption.percent\}%)\``, to: `t("view_poll_choice", localLanguage).replace("{key}", dominantOption.key).replace("{text}", dominantOption.text).replace("{percent}", String(dominantOption.percent))` }
]);

// AnnouncerOverlay.tsx
replaceInFile('src/components/AnnouncerOverlay.tsx', [
    { from: `title="Bấm để mở rộng thanh thông báo chạy chữ"`, to: `title={t("view_ann_expand", localLanguage)}` },
    { from: `title="Di chuột hoặc chạm để tạm dừng đọc thông báo"`, to: `title={t("view_ann_pause", localLanguage)}` },
    { from: `title="Thu nhỏ thanh thông báo"`, to: `title={t("view_ann_collapse", localLanguage)}` },
    { from: `title="Đóng thông báo"`, to: `title={t("view_ann_close", localLanguage)}` }
]);

// QuestionLikeButton.tsx
replaceInFile('src/components/QuestionLikeButton.tsx', [
    { from: `title={isLiked ? 'Bỏ thích câu hỏi này' : 'Thích / Thả tim câu hỏi này'}`, to: `title={isLiked ? t("view_like_unlike", localLanguage) : t("view_like_like", localLanguage)}` },
    { from: `title={isLiked ? 'Đã thích câu hỏi này (Bấm để hủy)' : 'Thả tim câu hỏi hay'}`, to: `title={isLiked ? t("view_like_liked_btn", localLanguage) : t("view_like_like_btn", localLanguage)}` },
    { from: `{isLiked ? 'Đã thích' : 'Thích câu hỏi'}`, to: `{isLiked ? t("view_like_liked_txt", localLanguage) : t("view_like_like_txt", localLanguage)}` },
    { from: `title={isLiked ? 'Đã thích câu hỏi này' : 'Bấm để thích / đánh giá cao câu hỏi này'}`, to: `title={isLiked ? t("view_like_liked_title", localLanguage) : t("view_like_like_title", localLanguage)}` },
    { from: `{isLiked ? 'Đã thích' : 'Thích câu này'}`, to: `{isLiked ? t("view_like_liked_txt", localLanguage) : t("view_like_like_txt2", localLanguage)}` }
]);

