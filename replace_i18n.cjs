const fs = require('fs');
let content = fs.readFileSync('src/components/AudienceView.tsx', 'utf8');

content = content.replace("import { ShareGameModal }", "import { t } from '../utils/i18n';\nimport { ShareGameModal }");

const replacements = [
  { search: 'Sẵn sàng kết nối trực tiếp', replace: '{t("standby_ready", gameState.language)}' },
  { search: '“Hãy chú ý lắng nghe diễn biến trên sân khấu...”', replace: '{t("standby_listen", gameState.language)}' },
  { search: '>Khán giả đã xác thực:<', replace: '>{t("standby_authenticated", gameState.language)}<' },
  { search: '>Mã định danh (UID):<', replace: '>{t("standby_uid", gameState.language)}<' },
  { search: '>Trạng thái thiết bị:<', replace: '>{t("standby_device_status", gameState.language)}<' },
  { search: 'Đã sẵn sàng nhận lệnh từ MC', replace: '{t("standby_ready_to_receive", gameState.language)}' },
  { search: '>Màn hình luôn sáng (Wake Lock):<', replace: '>{t("standby_wake_lock", gameState.language)}<' },
  { search: '>Tự động theo thiết bị<', replace: '>{t("standby_auto_device", gameState.language)}<' },
  { search: 'Hệ thống sẽ tự động chuyển sang chế độ bình chọn ngay khi MC bấm giờ trên sân khấu.', replace: '{t("standby_wait_mc", gameState.language)}' },
  { search: '>Mời bạn bè cùng chơi (Mã QR)<', replace: '>{t("standby_invite", gameState.language)}<' },
  
  { search: 'Đã gửi đáp án', replace: '{t("active_submitted", gameState.language)}' },
  { search: '>Hãy chọn đáp án nhanh nhất có thể!<', replace: '>{t("active_select_fast", gameState.language)}<' },
  { search: 'Thời gian còn lại', replace: '{t("active_time_remain", gameState.language)}' },
  { search: 'HẾT GIỜ', replace: '{t("active_time_up", gameState.language)}' },
  { search: "'Bạn đã chọn:'", replace: 't("active_voted", gameState.language)' },
  { search: "'Đang đồng bộ...'", replace: 't("active_syncing", gameState.language)' },
  { search: '>Có thể đổi đáp án (bấm 1-4 trên phím)<', replace: '>{t("active_change_ans", gameState.language)}<' },
  { search: 'người) chọn giống bạn', replace: '{t("active_similar_votes", gameState.language)}' },
  { search: '>Đọc Dễ Hơn<', replace: '>{t("active_read_easier", gameState.language)}<' },
  { search: '>Đóng<', replace: '>{t("active_close", gameState.language)}<' },
  { search: 'Chế độ Blind Polling (Kịch AID)', replace: '{t("active_blind_poll_title", gameState.language)}' },
  { search: "'Khán giả lắng nghe kịch bản diễn ra trên sân khấu và chọn phương án tối ưu:'", replace: 't("active_blind_poll_desc", gameState.language)' },
  { search: "`Phương án ${key}`", replace: "`${t('active_option', gameState.language)} ${key}`" },

  { search: '>ĐÃ KHÓA BÌNH CHỌN<', replace: '>{t("locked_title", gameState.language)}<' },
  { search: 'Hệ thống đang xử lý và tổng hợp kết quả...', replace: '{t("locked_desc", gameState.language)}' },
  { search: 'Vui lòng chờ MC công bố đáp án chính xác trên sân khấu.', replace: '{t("locked_wait", gameState.language)}' },

  { search: '>CHÍNH XÁC<', replace: '>{t("reveal_correct", gameState.language)}<' },
  { search: '>SAI RỒI<', replace: '>{t("reveal_incorrect", gameState.language)}<' },
  { search: '>CHƯA TRẢ LỜI<', replace: '>{t("reveal_not_voted", gameState.language)}<' },
  { search: '>Đáp án là<', replace: '>{t("reveal_ans_is", gameState.language)}<' },
  { search: '>Bạn chọn:<', replace: '>{t("reveal_your_ans", gameState.language)}<' },
  { search: 'Bạn đã không đưa ra đáp án cho câu hỏi này.', replace: '{t("reveal_no_ans", gameState.language)}' },
  { search: '>Thứ hạng hiện tại:<', replace: '>{t("reveal_rank", gameState.language)}<' },
  { search: '>Điểm:<', replace: '>{t("reveal_score", gameState.language)}<' },
  { search: '>Giải thích đáp án:<', replace: '>{t("reveal_explanation", gameState.language)}<' }
];

for (const rep of replacements) {
  content = content.split(rep.search).join(rep.replace);
}

fs.writeFileSync('src/components/AudienceView.tsx', content);
