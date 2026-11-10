import React from 'react';
import { X, ShieldCheck, Lock, FileText, CheckCircle2, UserCheck, Trash2, ExternalLink } from 'lucide-react';
import { PDPD_LAW_REFERENCE, PDPD_CONSENT_VERSION } from '../utils/vnLawCompliance';

interface PrivacyPolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRequestDataDeletion?: () => void;
}

export const PrivacyPolicyModal: React.FC<PrivacyPolicyModalProps> = ({
  isOpen,
  onClose,
  onRequestDataDeletion
}) => {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby="privacy-policy-title"
    >
      <div className="relative w-full max-w-2xl max-h-[85vh] flex flex-col bg-[#140628] border border-[#F7CAC9]/30 rounded-[2px] shadow-2xl overflow-hidden text-[#F5EFF9]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#F7CAC9]/20 bg-[#1D0A3A]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-[2px] bg-[#F7CAC9]/10 border border-[#F7CAC9]/30 text-[#F7CAC9]">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 id="privacy-policy-title" className="text-lg font-bold text-white tracking-wide">
                Chính Sách Bảo Vệ Dữ Liệu Cá Nhân
              </h2>
              <p className="text-xs text-[#F7CAC9]/80 font-mono">
                Căn cứ {PDPD_LAW_REFERENCE} • Phiên bản {PDPD_CONSENT_VERSION}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-[2px] text-white/70 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Policy Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5 text-sm leading-relaxed text-white/90 font-sans">
          
          {/* Important Notice Box */}
          <div className="p-3.5 rounded-[2px] bg-[#92A8D1]/10 border border-[#92A8D1]/30 text-[#92A8D1] text-xs leading-5">
            <div className="font-semibold flex items-center gap-1.5 mb-1">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-[#92A8D1]" />
              Căn cứ Luật Bảo vệ dữ liệu cá nhân 91/2025/QH15, Nghị định 356/2025/NĐ-CP & Luật An ninh mạng 116/2025/QH15
            </div>
            Beyond The Internet 2026 tôn trọng quyền riêng tư và bảo vệ an toàn thông tin của thí sinh, khán giả. Chúng tôi chỉ thu thập dữ liệu tối thiểu cần thiết phục vụ tổ chức, chấm điểm và trao giải khi có sự đồng ý rõ ràng của bạn.
          </div>

          {/* Section 1 */}
          <div className="space-y-1.5">
            <h3 className="text-sm font-bold text-[#F7CAC9] flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-[#F7CAC9]/20 flex items-center justify-center text-xs text-[#F7CAC9]">1</span>
              Bên Kiểm Soát & Xử Lý Dữ Liệu Cá Nhân
            </h3>
            <p className="text-xs text-white/80 pl-7">
              Đơn vị chủ quản: <strong>Ban Tổ chức Cuộc thi Học thuật Beyond The Internet 2026</strong>.<br />
              Phạm vi áp dụng: Nền tảng web-app tương tác trực tiếp (Live Gameshow Interaction) dành cho khán giả và thí sinh tham dự.
            </p>
          </div>

          {/* Section 2 */}
          <div className="space-y-1.5">
            <h3 className="text-sm font-bold text-[#F7CAC9] flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-[#F7CAC9]/20 flex items-center justify-center text-xs text-[#F7CAC9]">2</span>
              Các Loại Dữ Liệu Cá Nhân Thu Thập
            </h3>
            <ul className="list-disc list-inside text-xs text-white/80 pl-7 space-y-1">
              <li><strong>Thông tin định danh cơ bản</strong>: Họ và tên, Mã số sinh viên / Học sinh (MSSV/SBD), Tên hiển thị (Nickname), Trường/Khoa.</li>
              <li><strong>Dữ liệu quá trình tham gia</strong>: Lịch sử nộp câu trả lời, mốc thời gian phản hồi, điểm số tích lũy, huy hiệu khen thưởng.</li>
              <li><strong>Thông tin kỹ thuật & bảo mật phiên</strong>: Mã định danh thiết bị ẩn danh (Device Fingerprint), địa chỉ IP, trạng thái kết nối mạng nhằm phòng chống gian lận (Anti-cheat) và bảo đảm tính công bằng của giải đấu.</li>
            </ul>
          </div>

          {/* Section 3 */}
          <div className="space-y-1.5">
            <h3 className="text-sm font-bold text-[#F7CAC9] flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-[#F7CAC9]/20 flex items-center justify-center text-xs text-[#F7CAC9]">3</span>
              Mục Đích Xử Lý Dữ Liệu
            </h3>
            <ul className="list-disc list-inside text-xs text-white/80 pl-7 space-y-1">
              <li>Xác thực quyền tham gia và hiển thị vị trí trên Bảng xếp hạng thời gian thực (Real-time Leaderboard).</li>
              <li>Trao giấy chứng nhận, giải thưởng hiện kim và hiện vật cho các cá nhân / đội thi đạt thành tích.</li>
              <li>Hỗ trợ kỹ thuật viên và Trợ lý AI giải đáp thắc mắc liên quan đến thể lệ trận đấu.</li>
              <li>Đảm bảo an toàn thông tin, ngăn ngừa tấn công mạng và phòng chống hành vi gian lận thi cử.</li>
            </ul>
          </div>

          {/* Section 4 */}
          <div className="space-y-1.5">
            <h3 className="text-sm font-bold text-[#F7CAC9] flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-[#F7CAC9]/20 flex items-center justify-center text-xs text-[#F7CAC9]">4</span>
              Chia Sẻ Dữ Liệu Với Bên Thứ Ba
            </h3>
            <p className="text-xs text-white/80 pl-7">
              Chúng tôi <strong>không bao giờ bán, cho thuê hoặc chuyển nhượng dữ liệu cá nhân</strong> cho mục đích thương mại. Dữ liệu chỉ được truyền tải qua các kênh hạ tầng đám mây tin cậy:
            </p>
            <ul className="list-disc list-inside text-xs text-white/80 pl-7 space-y-1">
              <li><strong>Google Cloud & Firebase Firestore</strong>: Lưu trữ và đồng bộ hóa trạng thái bảng điểm bảo mật thời gian thực.</li>
              <li><strong>Google Gemini API</strong>: Phân tích câu hỏi trợ giúp kỹ thuật và thể lệ (Dữ liệu gửi lên AI chỉ bao gồm bối cảnh trận đấu và tin nhắn thắc mắc, không chứa thông tin định danh cá nhân).</li>
            </ul>
          </div>

          {/* Section 5 */}
          <div className="space-y-1.5">
            <h3 className="text-sm font-bold text-[#F7CAC9] flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-[#F7CAC9]/20 flex items-center justify-center text-xs text-[#F7CAC9]">5</span>
              Thời Hạn Lưu Trữ Dữ Liệu
            </h3>
            <p className="text-xs text-white/80 pl-7">
              Dữ liệu được lưu trữ trong suốt thời gian diễn ra cuộc thi và tối đa 30 ngày sau đêm Chung kết phục vụ việc đối soát kết quả, trao giải và cấp giấy chứng nhận. Sau thời hạn này, các dữ liệu định danh sẽ được tự động xóa hoặc ẩn danh hóa hoàn toàn.
            </p>
          </div>

          {/* Section 6 */}
          <div className="space-y-1.5">
            <h3 className="text-sm font-bold text-[#F7CAC9] flex items-center gap-2">
              <span className="w-5 h-5 rounded-[2px] bg-[#F7CAC9]/20 flex items-center justify-center text-xs text-[#F7CAC9]">6</span>
              Quyền Của Chủ Thể Dữ Liệu (Điều 4 Luật 91/2025/QH15 & Điều 5 NĐ 356/2025/NĐ-CP)
            </h3>
            <p className="text-xs text-white/80 pl-7">
              Theo quy định tại Luật Bảo vệ dữ liệu cá nhân số 91/2025/QH15 và Nghị định 356/2025/NĐ-CP, bạn có các quyền:
            </p>
            <ul className="list-disc list-inside text-xs text-white/80 pl-7 space-y-1">
              <li><strong>Quyền được biết & đồng ý</strong>: Được thông báo rõ mục đích trước khi xử lý dữ liệu; rút lại sự đồng ý bất kỳ lúc nào (Điều 10 Luật 91/2025).</li>
              <li><strong>Quyền xem, chỉnh sửa & yêu cầu cung cấp dữ liệu</strong>: Thực hiện trực tiếp tại mục Hồ sơ hoặc yêu cầu phản hồi trong 10–15 ngày (khoản 3 Điều 5 NĐ 356/2025).</li>
              <li><strong>Quyền xóa dữ liệu & hạn chế xử lý</strong>: Xóa/ẩn danh trực tiếp trong ứng dụng hoặc yêu cầu xử lý trong 20–30 ngày (khoản 4 Điều 5 NĐ 356/2025).</li>
            </ul>
          </div>

          {/* Section 7 */}
          <div className="space-y-1.5">
            <h3 className="text-sm font-bold text-[#F7CAC9] flex items-center gap-2">
              <span className="w-5 h-5 rounded-[2px] bg-[#F7CAC9]/20 flex items-center justify-center text-xs text-[#F7CAC9]">7</span>
              Bảo Vệ Dữ Liệu Trẻ Em (Điều 24 Luật 91/2025/QH15 & Luật Trẻ em 2016)
            </h3>
            <p className="text-xs text-white/80 pl-7">
              Đối với người tham gia là trẻ em (dưới 16 tuổi), việc đăng ký và xử lý dữ liệu cần có sự đồng ý của cha mẹ hoặc người đại diện theo pháp luật (kèm sự đồng ý của trẻ từ đủ 7 tuổi trở lên theo khoản 2 Điều 24 Luật 91/2025/QH15).
            </p>
          </div>

          {/* Section 8 */}
          <div className="space-y-1.5">
            <h3 className="text-sm font-bold text-[#F7CAC9] flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-[#F7CAC9]/20 flex items-center justify-center text-xs text-[#F7CAC9]">8</span>
              Cam Kết An Toàn An Ninh Mạng
            </h3>
            <p className="text-xs text-white/80 pl-7">
              Mọi kết nối đều được mã hóa bằng giao thức HTTPS/TLS tiêu chuẩn. Mật khẩu được băm an toàn một chiều ở client và server bằng thuật toán scrypt với salt độc lập, tuyệt đối không lưu trữ văn bản thuần (plain text).
            </p>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-3.5 border-t border-[#F7CAC9]/20 bg-[#140628]">
          {onRequestDataDeletion ? (
            <button
              onClick={() => {
                onClose();
                onRequestDataDeletion();
              }}
              className="text-xs text-rose-300 hover:text-rose-200 flex items-center gap-1.5 py-1.5 px-3 rounded border border-rose-500/30 hover:bg-rose-500/10 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Yêu cầu xóa dữ liệu cá nhân
            </button>
          ) : (
            <span className="text-[11px] text-white/50">
              Mọi thắc mắc vui lòng liên hệ Ban Thư ký BTI 2026.
            </span>
          )}

          <button
            onClick={onClose}
            className="px-5 py-2 rounded bg-[#F7CAC9] text-[#190839] font-semibold text-xs hover:bg-[#F7CAC9]/90 active:scale-95 transition-all shadow-md"
          >
            Đã Hiểu & Đóng
          </button>
        </div>

      </div>
    </div>
  );
};
