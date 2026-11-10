import React, { useState, useEffect } from 'react';
import { FileText, Shield, Info, Check, X, ExternalLink } from 'lucide-react';
import { soundFx } from '../services/audioEffects';
import { vibrateTap, vibrateSuccess, vibrateSelection } from '../utils/hapticUtils';
import { PDPD_CONSENT_VERSION, PDPD_LAW_REFERENCE } from '../utils/vnLawCompliance';
import { useLanguage } from '../hooks/useLanguage';

interface FirstVisitConsentModalProps {
  onOpenFullPolicy: () => void;
}

const STORAGE_KEY = 'bti_pdpd_first_visit_consent_v1';

type PolicyTab = 'TERMS' | 'PRIVACY' | 'DATA';

export const FirstVisitConsentModal: React.FC<FirstVisitConsentModalProps> = ({
  onOpenFullPolicy
}) => {
  const { localLanguage } = useLanguage();
  const [isVisible, setIsVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<PolicyTab>('TERMS');
  const [isAgreed, setIsAgreed] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        // Small delay so the page loads smoothly before the modal fades in
        const timer = setTimeout(() => {
          setIsVisible(true);
        }, 500);
        return () => clearTimeout(timer);
      }
    } catch {
      // Ignore storage access errors in private browsing
    }
  }, []);

  const handleAcceptAll = () => {
    if (!isAgreed) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        agreed: true,
        version: PDPD_CONSENT_VERSION,
        timestamp: Date.now()
      }));
    } catch {}
    soundFx.playClick();
    vibrateSuccess();
    setIsVisible(false);
  };

  const handleDismissWithoutAccept = () => {
    soundFx.playClick();
    vibrateTap();
    setIsVisible(false);
  };

  const handleOpenPolicy = () => {
    soundFx.playClick();
    vibrateTap();
    setIsVisible(false);
    onOpenFullPolicy();
  };

  if (!isVisible) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="policy-modal-title"
      className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-5 md:p-6 bg-black/80 backdrop-blur-md animate-fadeIn"
    >
      <div 
        className="w-full max-w-4xl max-h-[92vh] sm:max-h-[88vh] bg-[#0c051f] border border-white/10 rounded-[12px] shadow-2xl shadow-purple-950/80 text-white flex flex-col overflow-hidden relative animate-scaleUp"
      >
        {/* Top subtle gradient accent line */}
        <div className="h-1 bg-gradient-to-r from-sky-400 via-[#F7CAC9] to-rose-500 shrink-0" />

        {/* Close Button Top-Right */}
        <button
          type="button"
          onClick={handleDismissWithoutAccept}
          className="absolute top-3.5 right-3.5 p-1.5 rounded-[4px] bg-white/5 hover:bg-white/15 text-white/60 hover:text-white transition cursor-pointer z-20"
          title={localLanguage !== 'vi' ? 'Close' : 'Đóng'}
          aria-label="Đóng"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Main Body Grid: Left Navigation Sidebar & Right Content Area */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-12 min-h-0 overflow-hidden">
          
          {/* Left Sidebar Tabs (3 items matching design) */}
          <div className="md:col-span-4 lg:col-span-3.5 p-3.5 sm:p-4 border-b md:border-b-0 md:border-r border-white/10 flex flex-row md:flex-col gap-1.5 shrink-0 bg-[#090317] overflow-x-auto md:overflow-visible">
            
            {/* Tab 1: Điều khoản sử dụng */}
            <button
              type="button"
              onClick={() => {
                vibrateSelection();
                soundFx.playClick();
                setActiveTab('TERMS');
              }}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-[6px] text-xs sm:text-sm font-medium transition cursor-pointer whitespace-nowrap md:whitespace-normal text-left shrink-0 md:shrink w-auto md:w-full ${
                activeTab === 'TERMS'
                  ? 'bg-white text-slate-900 font-bold shadow-md'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <FileText className={`w-4 h-4 shrink-0 ${activeTab === 'TERMS' ? 'text-slate-900' : 'text-slate-400'}`} />
              <span>{localLanguage !== 'vi' ? 'Terms of Service' : 'Điều khoản sử dụng'}</span>
            </button>

            {/* Tab 2: Chính sách bảo mật */}
            <button
              type="button"
              onClick={() => {
                vibrateSelection();
                soundFx.playClick();
                setActiveTab('PRIVACY');
              }}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-[6px] text-xs sm:text-sm font-medium transition cursor-pointer whitespace-nowrap md:whitespace-normal text-left shrink-0 md:shrink w-auto md:w-full ${
                activeTab === 'PRIVACY'
                  ? 'bg-white text-slate-900 font-bold shadow-md'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <Shield className={`w-4 h-4 shrink-0 ${activeTab === 'PRIVACY' ? 'text-slate-900' : 'text-slate-400'}`} />
              <span>{localLanguage !== 'vi' ? 'Privacy Policy' : 'Chính sách bảo mật'}</span>
            </button>

            {/* Tab 3: Chính sách dữ liệu */}
            <button
              type="button"
              onClick={() => {
                vibrateSelection();
                soundFx.playClick();
                setActiveTab('DATA');
              }}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-[6px] text-xs sm:text-sm font-medium transition cursor-pointer whitespace-nowrap md:whitespace-normal text-left shrink-0 md:shrink w-auto md:w-full ${
                activeTab === 'DATA'
                  ? 'bg-white text-slate-900 font-bold shadow-md'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <Info className={`w-4 h-4 shrink-0 ${activeTab === 'DATA' ? 'text-slate-900' : 'text-slate-400'}`} />
              <span>{localLanguage !== 'vi' ? 'Data Policy' : 'Chính sách dữ liệu'}</span>
            </button>

            {/* Quiet Law Tag at bottom of sidebar on desktop */}
            <div className="hidden md:flex flex-col mt-auto pt-4 border-t border-white/5 text-[10px] font-mono text-white/40 space-y-1">
              <span>{PDPD_LAW_REFERENCE}</span>
              <span className="text-white/30">Phiên bản: {PDPD_CONSENT_VERSION}</span>
            </div>
          </div>

          {/* Right Scrollable Content Area */}
          <div className="md:col-span-8 lg:col-span-8.5 p-4 sm:p-6 overflow-y-auto max-h-[50vh] sm:max-h-[58vh] custom-scrollbar text-xs sm:text-sm text-slate-200 leading-relaxed font-sans select-text space-y-4">
            
            {/* CONTENT TAB 1: TERMS */}
            {activeTab === 'TERMS' && (
              <div className="space-y-4 animate-fadeIn">
                <p className="text-white/90 leading-relaxed">
                  {localLanguage !== 'vi' ? (
                    <>By using the <strong>BTI 2026</strong> application, Participants agree and legally commit to the rights and obligations stipulated under this Regulation. The Organizers reserve the right to modify, amend, add or remove any part of these Terms of Use at any time without prior notice. Participants are advised to review regularly to stay updated with changes.</>
                  ) : (
                    <>Bằng việc sử dụng ứng dụng <strong>BTI 2026</strong>, Khách Hàng / Thí Sinh đồng ý và chấp thuận bị ràng buộc về pháp lý bởi các quyền và nghĩa vụ phát sinh theo quy định tại Quy chế này. Ban Tổ Chức có quyền thay đổi, chỉnh sửa, thêm hoặc lược bỏ bất kỳ phần nào trong Quy định và Điều kiện sử dụng, vào bất cứ lúc nào mà không cần thông báo trước. Khách Hàng vui lòng kiểm tra thường xuyên để cập nhật những thay đổi của BTI 2026.</>
                  )}
                </p>

                <div>
                  <h3 className="text-sm sm:text-base font-bold text-white mb-2">
                    {localLanguage !== 'vi' ? '1. Account Registration' : '1. Đăng Ký Tài Khoản'}
                  </h3>
                  <ul className="space-y-2 text-white/80">
                    <li className="flex items-start gap-2">
                      <span className="text-white/40 shrink-0 font-bold">—</span>
                      <span>
                        {localLanguage !== 'vi'
                          ? 'To participate in the BTI 2026 arena, participants must register an account using a compatible device and provide accurate verification details (Full Name, Student ID, Email). Participants are responsible for ensuring all provided information is truthful and complete.'
                          : 'Để sử dụng ứng dụng BTI 2026, Khách Hàng phải đăng ký tài khoản khách hàng thông qua thiết bị hoặc nền tảng có thể truy cập vào BTI 2026 và cung cấp cho BTI 2026 các thông tin cần thiết để xác nhận tài khoản. Khách Hàng có trách nhiệm cập nhật và đảm bảo tính đầy đủ, chính xác của các thông tin đã cung cấp cho BTI 2026.'}
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-white/40 shrink-0 font-bold">—</span>
                      <span>
                        {localLanguage !== 'vi'
                          ? 'Participants must be individuals aged 18 years or older with full civil act capacity according to Vietnamese law. Minors may only participate with consent and supervision from parents or legal guardians. By registering, you confirm meeting these legal criteria.'
                          : 'Để đăng ký và sử dụng tài khoản, Khách Hàng phải là cá nhân từ đủ 18 tuổi trở lên và có đầy đủ năng lực hành vi dân sự theo quy định của pháp luật Việt Nam. Trẻ em và người chưa thành niên chỉ được phép sử dụng ứng dụng BTI 2026 khi có sự đồng ý và giám sát trực tiếp từ cha mẹ hoặc người giám hộ hợp pháp. Bằng việc đăng ký và sử dụng dịch vụ, Khách Hàng xác nhận đã đủ điều kiện về độ tuổi và năng lực hành vi dân sự như quy định nêu trên.'}
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-white/40 shrink-0 font-bold">—</span>
                      <span>
                        {localLanguage !== 'vi'
                          ? 'The organizers reserve the right to request proof of identity (Student Card, National ID) when reconciling match outcomes and granting awards.'
                          : 'BTI 2026 có quyền yêu cầu Khách Hàng cung cấp giấy tờ, bằng chứng chứng minh về độ tuổi và các thông tin xác nhận tài khoản (như thẻ sinh viên, giấy tờ tùy thân) phục vụ đối soát giải thưởng.'}
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-white/40 shrink-0 font-bold">—</span>
                      <span>
                        {localLanguage !== 'vi'
                          ? 'Participants are responsible for safeguarding their login credentials and devices. The organizers hold no liability for credential compromises resulting from participant device negligence.'
                          : 'Khách Hàng có trách nhiệm bảo mật tài khoản đã đăng ký thông qua việc bảo mật mật khẩu và các thông tin liên quan đến tài khoản của Khách Hàng. Đồng thời, Khách Hàng cần bảo quản cẩn thận các thiết bị đã dùng để truy cập ứng dụng BTI 2026 nhằm bảo mật tài khoản. BTI 2026 không chịu trách nhiệm trong trường hợp thông tin bị lộ do phía người dùng sơ suất.'}
                      </span>
                    </li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-sm sm:text-base font-bold text-white mb-2">
                    {localLanguage !== 'vi' ? '2. Fair Play & Anti-Cheat Ethics' : '2. Quy Tắc Ứng Xử & Chống Gian Lận (Fair Play)'}
                  </h3>
                  <ul className="space-y-2 text-white/80">
                    <li className="flex items-start gap-2">
                      <span className="text-white/40 shrink-0 font-bold">—</span>
                      <span>
                        {localLanguage !== 'vi'
                          ? 'Participants agree to compete fairly without using automated scripts, bots, or unauthorized network manipulation to distort contest results.'
                          : 'Khách Hàng cam kết tham gia các vòng thi đấu trực tiếp với tinh thần trung thực, không sử dụng công cụ can thiệp bot/script, không khai thác lỗ hổng kỹ thuật để làm sai lệch bảng xếp hạng.'}
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-white/40 shrink-0 font-bold">—</span>
                      <span>
                        {localLanguage !== 'vi'
                          ? 'The organizers retain the right to suspend or disqualify accounts exhibiting fraudulent behavior.'
                          : 'Ban Tổ Chức BTI 2026 có quyền tạm ngừng hoặc hủy bỏ tư cách tham gia, từ chối trao giải thưởng nếu phát hiện hành vi gian lận hoặc vi phạm nghiêm trọng quy chế thi đấu.'}
                      </span>
                    </li>
                  </ul>
                </div>
              </div>
            )}

            {/* CONTENT TAB 2: PRIVACY */}
            {activeTab === 'PRIVACY' && (
              <div className="space-y-4 animate-fadeIn">
                <p className="text-white/90 leading-relaxed">
                  {localLanguage !== 'vi' ? (
                    <>This Privacy Policy explains how <strong>BTI 2026</strong> collects, encrypts, and handles your data in strict compliance with Vietnamese Decree <strong>13/2023/ND-CP</strong> on Personal Data Protection.</>
                  ) : (
                    <>Chính sách bảo mật này mô tả cách thức <strong>BTI 2026</strong> thu thập, mã hóa, lưu trữ và bảo vệ thông tin cá nhân của bạn, tuân thủ nghiêm ngặt theo quy định tại <strong>Nghị định số 13/2023/NĐ-CP</strong> của Chính phủ về Bảo vệ dữ liệu cá nhân.</>
                  )}
                </p>

                <div>
                  <h3 className="text-sm sm:text-base font-bold text-white mb-2">
                    {localLanguage !== 'vi' ? '1. Personal Data Minimization' : '1. Nguyên Tắc Thu Thập Tối Thiểu & Mã Hóa'}
                  </h3>
                  <ul className="space-y-2 text-white/80">
                    <li className="flex items-start gap-2">
                      <span className="text-white/40 shrink-0 font-bold">—</span>
                      <span>
                        {localLanguage !== 'vi'
                          ? 'We process only the minimum necessary data points: Student ID, Nickname, Gender, Birth Year, and live score telemetry to enable scoring and prize drawings.'
                          : 'Dữ liệu cá nhân chỉ được thu thập trong phạm vi tối thiểu cần thiết để phục vụ công tác tổ chức, chấm điểm và trao giải (MSSV, Họ tên hiển thị, Năm sinh, Giới tính).'}
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-white/40 shrink-0 font-bold">—</span>
                      <span>
                        {localLanguage !== 'vi'
                          ? 'All participant passwords and tokens are one-way cryptographic hashes. No plain-text passwords exist anywhere on our servers.'
                          : 'Mọi mật khẩu xác thực đều được băm mã hóa một chiều bằng thuật toán hiện đại, tuyệt đối không lưu trữ dạng văn bản thuần (plain text).'}
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-white/40 shrink-0 font-bold">—</span>
                      <span>
                        {localLanguage !== 'vi'
                          ? 'We strictly guarantee zero sale or commercial disclosure of participant data to third parties.'
                          : 'Cam kết tuyệt đối không bán, chia sẻ hoặc thương mại hóa dữ liệu cá nhân của người tham gia cho bất kỳ bên thứ ba nào vì mục đích quảng cáo thương mại.'}
                      </span>
                    </li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-sm sm:text-base font-bold text-white mb-2">
                    {localLanguage !== 'vi' ? '2. Anonymized 12-Digit UID' : '2. Cơ Chế Ẩn Danh 12 Số (Anonymized UID)'}
                  </h3>
                  <ul className="space-y-2 text-white/80">
                    <li className="flex items-start gap-2">
                      <span className="text-white/40 shrink-0 font-bold">—</span>
                      <span>
                        {localLanguage !== 'vi'
                          ? 'To protect personal privacy in public auditorium settings, live scores and stage projector boards display only your anonymized 12-digit code (e.g. •••• •••• ••••), keeping your identity secure.'
                          : 'Nhằm bảo vệ quyền riêng tư trong không gian thi đấu công cộng, hệ thống tự động sinh Mã định danh 12 số ẩn danh đại diện cho bạn trên màn chiếu sân khấu LED và bảng xếp hạng trực tiếp. Tên thật và MSSV chỉ được dùng để đối soát giải thưởng nội bộ.'}
                      </span>
                    </li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-sm sm:text-base font-bold text-white mb-2">
                    {localLanguage !== 'vi' ? '3. Data Subject Rights' : '3. Quyền Của Chủ Thể Dữ Liệu'}
                  </h3>
                  <ul className="space-y-2 text-white/80">
                    <li className="flex items-start gap-2">
                      <span className="text-white/40 shrink-0 font-bold">—</span>
                      <span>
                        {localLanguage !== 'vi'
                          ? 'You maintain the full right to access, inspect, modify, or permanently delete your account data (Right to be Forgotten) at any point.'
                          : 'Người dùng có toàn quyền xem, chỉnh sửa thông tin hồ sơ hoặc yêu cầu xóa dữ liệu vĩnh viễn (Right to be Forgotten) bất cứ lúc nào thông qua Hồ sơ cá nhân hoặc Trang Chính Sách.'}
                      </span>
                    </li>
                  </ul>
                </div>
              </div>
            )}

            {/* CONTENT TAB 3: DATA */}
            {activeTab === 'DATA' && (
              <div className="space-y-4 animate-fadeIn">
                <p className="text-white/90 leading-relaxed">
                  {localLanguage !== 'vi' ? (
                    <>Details regarding technical telemetry, essential operational cookies, and session management required for live real-time sync.</>
                  ) : (
                    <>Chính sách dữ liệu quy định chi tiết về các loại dữ liệu kỹ thuật, cookie phiên làm việc và nhật ký truy cập được hệ thống lưu trữ nhằm duy trì kết nối thời gian thực ổn định.</>
                  )}
                </p>

                <div>
                  <h3 className="text-sm sm:text-base font-bold text-white mb-2">
                    {localLanguage !== 'vi' ? '1. Technical Data Scope' : '1. Danh Mục Dữ Liệu Thu Thập'}
                  </h3>
                  <ul className="space-y-2 text-white/80">
                    <li className="flex items-start gap-2">
                      <span className="text-white/40 shrink-0 font-bold">—</span>
                      <span>
                        {localLanguage !== 'vi'
                          ? 'Participant Identification: Full Name, Student ID (MSSV), Gender, Birth Year, Registered Email.'
                          : 'Dữ liệu định danh: Họ tên, Mã số sinh viên (MSSV), Giới tính, Năm sinh, Email liên hệ.'}
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-white/40 shrink-0 font-bold">—</span>
                      <span>
                        {localLanguage !== 'vi'
                          ? 'Contest Telemetry: Response selections, response timestamp latency (milliseconds), round breakdown scores, cheer counts.'
                          : 'Dữ liệu thi đấu: Lịch sử câu trả lời, thời gian phản hồi (mili-giây), điểm số các vòng thi, xếp hạng và số lượt cổ vũ.'}
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-white/40 shrink-0 font-bold">—</span>
                      <span>
                        {localLanguage !== 'vi'
                          ? 'Technical Telemetry: WebSocket/Firebase ping connection status, battery level indicator (for enabling Eco / Dark Battery Saver mode), viewport geometry for layout optimization.'
                          : 'Dữ liệu kỹ thuật thiết bị: Trạng thái kết nối WebSocket/Firebase, chỉ số pin (nhằm kích hoạt chế độ tiết kiệm năng lượng), kích thước màn hình để tối ưu giao diện hiển thị.'}
                      </span>
                    </li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-sm sm:text-base font-bold text-white mb-2">
                    {localLanguage !== 'vi' ? '2. Retention & Deletion Schedule' : '2. Thời Gian Lưu Trữ & Hủy Bỏ'}
                  </h3>
                  <ul className="space-y-2 text-white/80">
                    <li className="flex items-start gap-2">
                      <span className="text-white/40 shrink-0 font-bold">—</span>
                      <span>
                        {localLanguage !== 'vi'
                          ? 'Contest data is securely retained throughout the match period and subsequent award verification. Once the season concludes, data is purged upon user request or archived securely.'
                          : 'Dữ liệu thi đấu được lưu trữ trong suốt thời gian diễn ra giải đấu và lưu trữ phục vụ tổng kết, trao giải. Sau khi kết thúc giải đấu, dữ liệu sẽ được lưu trữ dự phòng bảo mật hoặc xóa theo yêu cầu của bạn.'}
                      </span>
                    </li>
                  </ul>
                </div>
              </div>
            )}

            {/* Link to Full Policy standalone page */}
            <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
              <span>{localLanguage !== 'vi' ? 'Need more legal details?' : 'Bạn muốn tìm hiểu kỹ hơn về khung pháp lý?'}</span>
              <button
                type="button"
                onClick={handleOpenPolicy}
                className="text-[#F7CAC9] hover:underline font-mono inline-flex items-center gap-1 cursor-pointer"
              >
                <span>{localLanguage !== 'vi' ? 'Read Full 8-Article Policy' : 'Xem Toàn Văn Bản Chính Sách (8 Điều)'}</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* Bottom Bar: Logo, Disclaimer, Active Consent Checkbox & Primary Action Button */}
        {/* (Faithfully following Image 1 layout & Image 2 Active Consent rules) */}
        {/* ========================================================================= */}
        <div className="border-t border-white/10 bg-[#080214] p-3.5 sm:p-4.5 px-4 sm:px-6 flex flex-col lg:flex-row lg:items-center justify-between gap-3 sm:gap-4 shrink-0">
          
          {/* Left: Branding & Disclaimer text */}
          <div className="flex items-center gap-3 min-w-0">
            {/* BTI Logo Badge */}
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-[4px] bg-gradient-to-br from-indigo-600 via-purple-600 to-rose-500 flex items-center justify-center font-black text-xs sm:text-sm text-white shrink-0 shadow-md shadow-purple-950/50 border border-white/20 select-none">
              BTI
            </div>

            <div className="hidden sm:block w-[1px] h-7 bg-white/15 shrink-0" />

            <div className="text-[11px] sm:text-xs text-white/80 leading-snug">
              <span>
                {localLanguage !== 'vi' 
                  ? 'Continuing signifies that you agree to our ' 
                  : 'Tiếp tục đồng nghĩa với việc bạn đồng ý với '}
              </span>
              <button 
                type="button"
                onClick={() => {
                  vibrateSelection();
                  setActiveTab('TERMS');
                }}
                className={`font-bold underline cursor-pointer transition ${activeTab === 'TERMS' ? 'text-white' : 'text-slate-300 hover:text-white'}`}
              >
                {localLanguage !== 'vi' ? 'Terms of Service' : 'Điều khoản sử dụng'}
              </button>
              <span>, </span>
              <button 
                type="button"
                onClick={() => {
                  vibrateSelection();
                  setActiveTab('PRIVACY');
                }}
                className={`font-bold underline cursor-pointer transition ${activeTab === 'PRIVACY' ? 'text-white' : 'text-slate-300 hover:text-white'}`}
              >
                {localLanguage !== 'vi' ? 'Privacy Policy' : 'Chính sách bảo mật'}
              </button>
              <span> {localLanguage !== 'vi' ? 'and ' : 'và '}</span>
              <button 
                type="button"
                onClick={() => {
                  vibrateSelection();
                  setActiveTab('DATA');
                }}
                className={`font-bold underline cursor-pointer transition ${activeTab === 'DATA' ? 'text-white' : 'text-slate-300 hover:text-white'}`}
              >
                {localLanguage !== 'vi' ? 'Data Policy' : 'Chính sách dữ liệu'}
              </button>
              <span> {localLanguage !== 'vi' ? 'of BTI 2026.' : 'của chúng tôi.'}</span>
            </div>
          </div>

          {/* Right: Active Consent Checkbox & Primary Button (Per Image 2) */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 shrink-0">
            
            {/* Checkbox (Unchecked by default - Active Consent) */}
            <label className="flex items-center gap-2 cursor-pointer select-none group">
              <input
                type="checkbox"
                id="checkbox-first-visit-consent"
                checked={isAgreed}
                onChange={(e) => {
                  vibrateTap();
                  setIsAgreed(e.target.checked);
                }}
                className="w-4 h-4 rounded-[3px] bg-slate-900 border-white/30 text-rose-600 focus:ring-0 focus:ring-offset-0 cursor-pointer accent-rose-600 shrink-0 group-hover:border-rose-400"
              />
              <span className="text-[11px] sm:text-xs text-white/90 leading-tight">
                {localLanguage !== 'vi' ? 'I have read and agree' : 'Tôi đã đọc và đồng ý'}
              </span>
            </label>

            {/* Primary Action Button (Disabled if not agreed per Image 2) */}
            <button
              type="button"
              id="btn-policy-agree-and-continue"
              disabled={!isAgreed}
              onClick={handleAcceptAll}
              className={`min-h-[44px] px-5 sm:px-6 py-2.5 rounded-[6px] font-bold text-xs sm:text-sm tracking-wide transition-all select-none flex items-center justify-center gap-2 shrink-0 ${
                isAgreed
                  ? 'bg-[#E50914] hover:bg-red-600 active:scale-98 text-white shadow-lg shadow-red-950/60 cursor-pointer'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed opacity-60 border border-white/5'
              }`}
            >
              <Check className="w-4 h-4 shrink-0" />
              <span>{localLanguage !== 'vi' ? 'Agree & Continue' : 'Đồng ý & tiếp tục'}</span>
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};
