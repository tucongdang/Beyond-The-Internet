import React from 'react';
import { X, Scale, Award, ShieldAlert, Bot, CheckCircle2 } from 'lucide-react';

interface TermsOfServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TermsOfServiceModal: React.FC<TermsOfServiceModalProps> = ({
  isOpen,
  onClose
}) => {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby="terms-service-title"
    >
      <div className="relative w-full max-w-2xl max-h-[85vh] flex flex-col bg-[#140628] border border-[#F7CAC9]/30 rounded-lg shadow-2xl overflow-hidden text-[#F5EFF9]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#F7CAC9]/20 bg-[#1D0A3A]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded bg-[#F7CAC9]/10 border border-[#F7CAC9]/30 text-[#F7CAC9]">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <h2 id="terms-service-title" className="text-lg font-bold text-white tracking-wide">
                Điều Khoản Sử Dụng & Liêm Chính Học Thuật
              </h2>
              <p className="text-xs text-[#F7CAC9]/80 font-mono">
                Quy chế Đấu trường Beyond The Internet 2026
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded text-white/70 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Terms Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5 text-sm leading-relaxed text-white/90 font-sans">
          
          <div className="p-3.5 rounded-[2px] bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs leading-5">
            <div className="font-semibold flex items-center gap-1.5 mb-1 text-amber-300">
              <Award className="w-4 h-4 shrink-0" />
              Nguyên tắc Vàng: Công Bằng - Trung Thực - Tôn Trọng
            </div>
            Beyond The Internet 2026 là sân chơi học thuật đề cao năng lực tư duy thực tế và tốc độ phản xạ. Người tham gia xác nhận đồng ý tuân thủ các điều lệ dưới đây khi đăng ký tài khoản dự thi.
          </div>

          {/* Section 1 */}
          <div className="space-y-1.5">
            <h3 className="text-sm font-bold text-[#F7CAC9] flex items-center gap-2">
              <span className="w-5 h-5 rounded-[2px] bg-[#F7CAC9]/20 flex items-center justify-center text-xs text-[#F7CAC9]">1</span>
              Quy Chế Liêm Chính Học Thuật & Phòng Chống Gian Lận
            </h3>
            <ul className="list-disc list-inside text-xs text-white/80 pl-7 space-y-1">
              <li>Mỗi thí sinh/khán giả chỉ sử dụng <strong>duy nhất 01 thiết bị</strong> trong suốt quá trình diễn ra trận đấu.</li>
              <li>Nghiêm cấm hành vi sử dụng công cụ tự động (bot, script, auto-click) để can thiệp gửi câu trả lời hoặc thu thập đề thi trái phép.</li>
              <li>Hệ thống ghi nhận trạng thái phiên thi đấu nhằm phát hiện các dấu hiệu vi phạm tính toàn vẹn của trận đấu.</li>
            </ul>
          </div>

          {/* Section 2 */}
          <div className="space-y-1.5">
            <h3 className="text-sm font-bold text-[#F7CAC9] flex items-center gap-2">
              <span className="w-5 h-5 rounded-[2px] bg-[#F7CAC9]/20 flex items-center justify-center text-xs text-[#F7CAC9]">2</span>
              Chuẩn Mực Ứng Xử Môi Trường Mạng (Luật An ninh mạng 116/2025/QH15)
            </h3>
            <ul className="list-disc list-inside text-xs text-white/80 pl-7 space-y-1">
              <li>Tên hiển thị, nội dung gửi lời cổ vũ (Audience Shout) và câu hỏi giao lưu phải mang tính xây dựng, tôn trọng người khác.</li>
              <li>Nghiêm cấm các từ ngữ xúc phạm danh dự, phân biệt chủng tộc, chia rẽ hoặc vi phạm Điều 7 Luật An ninh mạng số 116/2025/QH15 và Nghị định 333/2026/NĐ-CP. Mọi vi phạm sẽ bị bộ lọc tự động chặn và gỡ bỏ.</li>
            </ul>
          </div>

          {/* Section 3 */}
          <div className="space-y-1.5">
            <h3 className="text-sm font-bold text-[#F7CAC9] flex items-center gap-2">
              <span className="w-5 h-5 rounded-[2px] bg-[#F7CAC9]/20 flex items-center justify-center text-xs text-[#F7CAC9]">3</span>
              Tuyên Bố Minh Bạch AI (Luật Trí tuệ nhân tạo 134/2025/QH15 & NĐ 142/2026/NĐ-CP)
            </h3>
            <div className="p-3 rounded-[2px] bg-purple-500/10 border border-purple-500/20 text-xs text-purple-200 pl-7 space-y-1">
              <p className="flex items-center gap-1.5 font-semibold text-purple-300">
                <Bot className="w-4 h-4 text-purple-400" />
                Hệ thống Trợ lý Khán giả AI & Giọng đọc TTS (Google Gemini Flash)
              </p>
              <p>
                Căn cứ Điều 11 Luật Trí tuệ nhân tạo số 134/2025/QH15 và Điều 18 Nghị định 142/2026/NĐ-CP, Ban Tổ Chức thông báo rõ: khung chat hỗ trợ và giọng đọc tự động sử dụng mô hình AI tạo sinh, chỉ mang tính chất hỗ trợ giải đáp thể lệ và tham khảo.
              </p>
              <p>
                Trong trường hợp có tranh chấp hoặc mâu thuẫn về kết quả thi đấu, <strong>quyết định của Hội đồng Ban Giám khảo BTI 2026 là quyết định chung cuộc</strong>.
              </p>
            </div>
          </div>

          {/* Section 4 */}
          <div className="space-y-1.5">
            <h3 className="text-sm font-bold text-[#F7CAC9] flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-[#F7CAC9]/20 flex items-center justify-center text-xs text-[#F7CAC9]">4</span>
              Quyền Sở Hữu Trí Tuệ & Bản Quyền Đề Thi
            </h3>
            <p className="text-xs text-white/80 pl-7">
              Toàn bộ ngân hàng đề thi, tài liệu minh họa, video và âm thanh của Beyond The Internet 2026 thuộc quyền sở hữu độc quyền của Ban Tổ chức. Mọi hành vi ghi hình nhằm mục đích thương mại hoặc phát tán đề thi khi chưa có sự chấp thuận đều bị nghiêm cấm theo Luật Sở hữu trí tuệ Việt Nam.
            </p>
          </div>

        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-6 py-3.5 border-t border-[#F7CAC9]/20 bg-[#140628]">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded bg-[#F7CAC9] text-[#190839] font-semibold text-xs hover:bg-[#F7CAC9]/90 active:scale-95 transition-all shadow-md"
          >
            Đồng Ý & Tiếp Tục
          </button>
        </div>

      </div>
    </div>
  );
};
