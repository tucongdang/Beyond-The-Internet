import React, { useState } from 'react';
import {
  BookOpen,
  Server,
  Users,
  BarChart3,
  Cloud,
  LayoutGrid,
  ShieldCheck,
  Database,
  Zap,
  ArrowRightLeft,
  Award,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Radio,
  Sparkles,
  HelpCircle,
  Keyboard,
  FileSpreadsheet,
  RotateCcw,
  Search,
  Lock,
  Volume2,
  Share2,
  Tv,
  ChevronRight,
  Info
} from 'lucide-react';

type GuideSection = 'SCORING' | 'WORKFLOW' | 'SPECIAL_MODULES' | 'BROADCAST' | 'DATA_EXPORT' | 'SHORTCUTS' | 'ARCHITECTURE';

export const AdminGuide: React.FC = () => {
  const [activeSection, setActiveSection] = useState<GuideSection>('SCORING');
  const [searchQuery, setSearchQuery] = useState('');

  const sections = [
    { id: 'SCORING' as GuideSection, label: 'Cơ Chế Chấm Điểm', icon: Award, desc: 'Bảng điểm chi tiết 4 vòng thi & công thức tính' },
    { id: 'WORKFLOW' as GuideSection, label: 'Quy Trình 4 Vòng Thi', icon: LayoutGrid, desc: 'Hướng dẫn điều khiển từng vòng & các bước thao tác' },
    { id: 'SPECIAL_MODULES' as GuideSection, label: 'Thăm Dò & Lucky Draw', icon: Sparkles, desc: 'Khảo sát khẩn cấp, Vòng quay may mắn & Word Cloud' },
    { id: 'BROADCAST' as GuideSection, label: 'Thông Báo & Thu Hồi', icon: Radio, desc: 'Phát tin khẩn, chạy chữ Marquee & thu hồi 1-click' },
    { id: 'DATA_EXPORT' as GuideSection, label: 'Xuất Dữ Liệu & SPSS', icon: FileSpreadsheet, desc: 'Xuất CSV mã hóa nhị phân, JSON Dump & Audit log' },
    { id: 'SHORTCUTS' as GuideSection, label: 'Phím Tắt & Xử Lý Sự Cố', icon: Keyboard, desc: 'Bảng phím tắt thao tác nhanh & phương án backup' },
    { id: 'ARCHITECTURE' as GuideSection, label: 'Kiến Trúc Đa Màn Hình', icon: Server, desc: 'Mô hình Pub/Sub, Firestore State & Sync Engine' }
  ];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="fluent-box p-5 sm:p-6 rounded-[8px] border border-white/10 relative overflow-hidden bg-gradient-to-r from-[#190839]/90 via-[#0d163a]/90 to-[#120a2e]/90 backdrop-blur-[24px]">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <BookOpen className="w-48 h-48 text-[#F7CAC9]" />
        </div>
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-[4px] bg-purple-500/20 text-purple-200 border border-purple-400/40 text-[11px] font-mono font-bold uppercase tracking-wider">
            <BookOpen className="w-3.5 h-3.5 text-purple-300" />
            CẨM NANG VẬN HÀNH & KIẾN TRÚC HỆ THỐNG • BTI 2026
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2.5 tracking-wide">
            Hướng Dẫn Quản Trị Viên & Ban Tổ Chức
          </h2>
          <p className="text-xs sm:text-sm text-white/70 max-w-3xl leading-relaxed">
            Tài liệu chi tiết cung cấp toàn bộ quy chuẩn vận hành trận đấu, cơ chế tính điểm phân tầng tốc độ, 
            kịch bản xử lý sự cố trực tiếp và phương pháp trích xuất dữ liệu khoa học cho báo cáo nghiên cứu.
          </p>
        </div>
      </div>

      {/* Sub-Navigation Tab Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-1">
        {sections.map(sec => {
          const Icon = sec.icon;
          const isActive = activeSection === sec.id;
          return (
            <button
              key={sec.id}
              type="button"
              id={`btn-guide-tab-${sec.id.toLowerCase()}`}
              onClick={() => setActiveSection(sec.id)}
              className={`fluent-subtab-btn px-3.5 py-2.5 rounded-[6px] border text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? 'bg-gradient-to-r from-purple-600/90 to-cyan-600/90 text-white border-purple-400/60 shadow-lg shadow-purple-950/40 ring-1 ring-white/20'
                  : 'fluent-box-nested border-white/10 text-white/70 hover:text-white hover:border-white/20'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-white/60'}`} />
              <span>{sec.label}</span>
            </button>
          );
        })}
      </div>

      {/* SECTION 1: CƠ CHẾ CHẤM ĐIỂM (SCORING) */}
      {activeSection === 'SCORING' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Tổng quan bảng điểm */}
          <div className="fluent-box p-5 sm:p-6 rounded-[8px] border border-white/10 space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-white/10">
              <Award className="w-5 h-5 text-amber-400" />
              <h3 className="text-sm sm:text-base font-bold text-white uppercase tracking-wider font-mono">
                1. Ma Trận & Thang Điểm 4 Vòng Thi Đấu (Scoring Rules Matrix)
              </h3>
            </div>

            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left text-xs border-collapse font-sans">
                <thead>
                  <tr className="border-b border-white/20 bg-white/5 text-white/80 font-mono uppercase text-[11px]">
                    <th className="p-3">Vòng Thi</th>
                    <th className="p-3">Hình Thức Câu Hỏi</th>
                    <th className="p-3">Điểm Chuẩn (Base)</th>
                    <th className="p-3">Thưởng Tốc Độ / Phân Tầng</th>
                    <th className="p-3">Điểm Tối Đa</th>
                    <th className="p-3">Ghi Chú Vận Hành</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10 text-white/90">
                  <tr className="hover:bg-white/5 transition">
                    <td className="p-3 font-bold text-cyan-300 font-mono">VÒNG 1: KHỞI ĐỘNG</td>
                    <td className="p-3">Trắc nghiệm 4 lựa chọn (A/B/C/D)</td>
                    <td className="p-3 font-mono font-bold text-emerald-400">+10 điểm</td>
                    <td className="p-3 text-amber-300 font-mono">+5 điểm (nếu trả lời &lt; 3.0 giây)</td>
                    <td className="p-3 font-mono font-bold text-amber-400">+15 điểm</td>
                    <td className="p-3 text-white/70">Khuyến khích phản xạ nhanh. Khán giả sai nhận 0 điểm.</td>
                  </tr>
                  <tr className="hover:bg-white/5 transition">
                    <td className="p-3 font-bold text-amber-300 font-mono">VÒNG 2: VƯỢT CHƯỚNG NGẠI VẬT</td>
                    <td className="p-3">Dự đoán Từ khóa CNV & Ô Mạo Hiểm</td>
                    <td className="p-3 font-mono font-bold text-emerald-400">+80 điểm (CNV)</td>
                    <td className="p-3 text-amber-300 font-mono">+120 điểm (Ô Mạo Hiểm 15s)</td>
                    <td className="p-3 font-mono font-bold text-amber-400">+200 điểm</td>
                    <td className="p-3 text-white/70">Đúng cả 2 nhánh nhận trọn 200 điểm. Chuẩn hóa không dấu, không phân biệt hoa/thường.</td>
                  </tr>
                  <tr className="hover:bg-white/5 transition">
                    <td className="p-3 font-bold text-purple-300 font-mono">VÒNG 3: TĂNG TỐC</td>
                    <td className="p-3">Trắc nghiệm + Trả lời ngắn</td>
                    <td className="p-3 font-mono font-bold text-emerald-400">+10 điểm</td>
                    <td className="p-3 text-amber-300 font-mono">
                      Top 1: +40đ (≤5s)<br />
                      Top 2: +30đ (5-10s)<br />
                      Top 3: +20đ (10-15s)<br />
                      Top 4+: +10đ (&gt;15s)
                    </td>
                    <td className="p-3 font-mono font-bold text-amber-400">+40 điểm / câu</td>
                    <td className="p-3 text-white/70">Hỗ trợ trắc nghiệm &amp; trả lời ngắn, tự động xếp hạng theo tem thời gian (Server Latency Timestamp) miligiây.</td>
                  </tr>
                  <tr className="hover:bg-white/5 transition">
                    <td className="p-3 font-bold text-rose-300 font-mono">VÒNG 4: VỀ ĐÍCH</td>
                    <td className="p-3">Kịch Tương Tác / Thực Hành</td>
                    <td className="p-3 font-mono font-bold text-emerald-400">+40 điểm</td>
                    <td className="p-3 text-amber-300 font-mono">
                      Đúng Kịch TT / Thực hành: +40đ<br />
                      (Đúng Sai 4 ý: +10đ / mỗi ý đúng)
                    </td>
                    <td className="p-3 font-mono font-bold text-amber-400">+40 điểm</td>
                    <td className="p-3 text-white/70">Đúng Kịch TT / Thực hành nhận trọn 40 điểm. Hỗ trợ cơ chế điểm từng phần (Partial Credit) linh hoạt cho dạng câu hỏi phức hợp.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Chi tiết thuật toán chuẩn hóa VCNV & chống gian lận */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="fluent-box-nested p-4 rounded-[6px] border border-white/10 space-y-2.5">
              <h4 className="text-xs font-bold text-cyan-300 uppercase font-mono flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-cyan-400" />
                Thuật toán Chuẩn Hóa Đáp Án Tự Luận VCNV
              </h4>
              <p className="text-xs text-white/80 leading-relaxed">
                Hệ thống áp dụng hàm chuẩn hóa văn bản đa tầng trước khi so khớp:
              </p>
              <ul className="text-xs text-white/70 space-y-1.5 list-disc list-inside font-mono">
                <li>Bỏ dấu tiếng Việt (ví dụ: <code className="text-amber-300">"Chuyển đổi số"</code> ➔ <code className="text-cyan-300">"chuyen doi so"</code>).</li>
                <li>Xóa toàn bộ ký tự đặc biệt, khoảng trắng thừa ở đầu/cuối và giữa từ.</li>
                <li>Chuyển về chữ thường (lowercase) đồng nhất.</li>
                <li>Khớp chính xác với từ khóa gốc hoặc danh sách từ đồng nghĩa cho phép.</li>
              </ul>
            </div>

            <div className="fluent-box-nested p-4 rounded-[6px] border border-white/10 space-y-2.5">
              <h4 className="text-xs font-bold text-amber-300 uppercase font-mono flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-amber-400" />
                Cơ Chế Khóa Điểm & Chống Trực Trục (Anti-tamper)
              </h4>
              <p className="text-xs text-white/80 leading-relaxed">
                Hệ thống đảm bảo tính toàn vẹn tuyệt đối của điểm số:
              </p>
              <ul className="text-xs text-white/70 space-y-1.5 list-disc list-inside font-mono">
                <li>Điểm chỉ được tính 1 lần duy nhất cho mỗi câu hỏi (One-time submission).</li>
                <li>Khi trạng thái là <strong>LOCKED</strong> hoặc <strong>REVEAL</strong>, toàn bộ lượt gửi mới bị từ chối ở tầng Client và Firestore Rule.</li>
                <li>Tem thời gian (Server Latency) ghi nhận độc lập bởi Server Timestamp để chống can thiệp đồng hồ trên máy thí sinh.</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 2: QUY TRÌNH 4 VÒNG THI (WORKFLOW) */}
      {activeSection === 'WORKFLOW' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Sơ đồ 4 bước cơ bản của 1 câu hỏi */}
          <div className="fluent-box p-5 rounded-[8px] border border-white/10 space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
              <Clock className="w-4 h-4 text-cyan-400" />
              Chu Trình 4 Bước Chuẩn Của Một Câu Hỏi (Master Question Lifecycle)
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-[6px] bg-sky-950/40 border border-sky-500/40 space-y-2">
                <div className="flex items-center justify-between font-mono">
                  <span className="text-[10px] font-bold text-sky-300 bg-sky-500/20 px-2 py-0.5 rounded-[3px] border border-sky-400/40">BƯỚC 1</span>
                  <span className="text-xs font-bold text-sky-200">STANDBY</span>
                </div>
                <h4 className="text-xs font-bold text-white">1. Chọn & Nạp Câu Hỏi</h4>
                <p className="text-[11px] text-white/70">
                  Admin chọn câu hỏi trong Ngân Hàng. Màn hình sân khấu (Projector) và Thí sinh hiển thị tiêu đề và nội dung câu hỏi.
                </p>
              </div>

              <div className="p-3.5 rounded-[6px] bg-emerald-950/40 border border-emerald-500/40 space-y-2">
                <div className="flex items-center justify-between font-mono">
                  <span className="text-[10px] font-bold text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded-[3px] border border-emerald-400/40">BƯỚC 2</span>
                  <span className="text-xs font-bold text-emerald-200">ACTIVE</span>
                </div>
                <h4 className="text-xs font-bold text-white">2. Mở Nhận Trả Lời</h4>
                <p className="text-[11px] text-white/70">
                  Bắt đầu đếm ngược thời gian (15s - 60s). Các nút A/B/C/D mở trên điện thoại khán giả để chạm chọn đáp án.
                </p>
              </div>

              <div className="p-3.5 rounded-[6px] bg-amber-950/40 border border-amber-500/40 space-y-2">
                <div className="flex items-center justify-between font-mono">
                  <span className="text-[10px] font-bold text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded-[3px] border border-amber-400/40">BƯỚC 3</span>
                  <span className="text-xs font-bold text-amber-200">LOCKED</span>
                </div>
                <h4 className="text-xs font-bold text-white">3. Khóa Đáp Án (Hết Giờ)</h4>
                <p className="text-[11px] text-white/70">
                  Tự động hoặc thủ công khóa chốt đáp án. Màn hình khán giả hiển thị biểu tượng ổ khóa, chờ MC phân tích.
                </p>
              </div>

              <div className="p-3.5 rounded-[6px] bg-purple-950/40 border border-purple-500/40 space-y-2">
                <div className="flex items-center justify-between font-mono">
                  <span className="text-[10px] font-bold text-purple-300 bg-purple-500/20 px-2 py-0.5 rounded-[3px] border border-purple-400/40">BƯỚC 4</span>
                  <span className="text-xs font-bold text-purple-200">REVEAL</span>
                </div>
                <h4 className="text-xs font-bold text-white">4. Công Bố Đáp Án & Điểm</h4>
                <p className="text-[11px] text-white/70">
                  Hiển thị đáp án đúng màu xanh lục, biểu đồ Bar Chart tỷ lệ chọn A,B,C,D và tự động cộng điểm cho khán giả đúng.
                </p>
              </div>
            </div>
          </div>

          {/* Quy trình đặc thù Vòng 2 VCNV */}
          <div className="fluent-box p-5 rounded-[8px] border border-amber-500/30 bg-amber-950/20 space-y-3">
            <div className="flex items-center gap-2">
              <LayoutGrid className="w-5 h-5 text-amber-400" />
              <h3 className="text-sm font-bold text-amber-200 uppercase tracking-wider font-mono">
                Quy Trình 3 Bước Đặc Thù: Vòng 2 Vượt Chướng Ngại Vật (VCNV)
              </h3>
            </div>
            <p className="text-xs text-white/80 leading-relaxed">
              Vòng 2 yêu cầu sự phối hợp nhịp nhàng giữa sân khấu chính và khán phòng để đảm bảo tính bất ngờ:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
              <div className="p-3 rounded-[4px] fluent-box-nested border border-white/10 space-y-1">
                <span className="text-[10px] font-mono font-bold text-cyan-300">BƯỚC 1: MỞ NHẬN DỰ ĐOÁN</span>
                <p className="text-xs text-white/90">
                  Bật trạng thái <code className="text-cyan-300">OPEN</code>. Khán giả trên điện thoại có thể gõ từ khóa và sửa đổi không giới hạn.
                </p>
              </div>
              <div className="p-3 rounded-[4px] fluent-box-nested border border-white/10 space-y-1">
                <span className="text-[10px] font-mono font-bold text-amber-300">BƯỚC 2: CHỐT KẾT QUẢ</span>
                <p className="text-xs text-white/90">
                  Khi thí sinh trên sân khấu bấm chuông trả lời, Admin bấm <code className="text-amber-300">LOCKED</code> để đóng nhận dự đoán nhưng <em>chưa công bố đáp án</em>.
                </p>
              </div>
              <div className="p-3 rounded-[4px] fluent-box-nested border border-white/10 space-y-1">
                <span className="text-[10px] font-mono font-bold text-emerald-300">BƯỚC 3: CÔNG BỐ ĐÁP ÁN</span>
                <p className="text-xs text-white/90">
                  Khi MC chính thức công bố từ khóa, Admin bấm <code className="text-emerald-300">REVEAL</code> để mở ảnh trung tâm, lật toàn bộ hàng ngang và cộng điểm.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 3: THĂM DÒ KHẨN CẤP & LUCKY DRAW */}
      {activeSection === 'SPECIAL_MODULES' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Module Emergency Poll */}
            <div className="fluent-box p-5 rounded-[8px] border border-white/10 space-y-3">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-cyan-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                  Khảo Sát Khẩn Cấp (Emergency Live Poll)
                </h3>
              </div>
              <p className="text-xs text-white/80 leading-relaxed">
                Cho phép Ban Tổ Chức nhanh chóng tạo cuộc thăm dò ý kiến khán giả / cố vấn ngay trong tình huống tranh biện:
              </p>
              <ul className="text-xs text-white/70 space-y-2 list-disc list-inside font-mono">
                <li><strong>Các dạng:</strong> YES/NO, ĐỒNG Ý/PHẢN ĐỐI, ĐÚNG/SAI, hoặc Trắc nghiệm tùy chỉnh.</li>
                <li><strong>Thời gian:</strong> Thiết lập đếm ngược (10s - 30s) hoặc đóng thủ công.</li>
                <li><strong>Hiển thị trực tiếp:</strong> Biểu đồ cột phân phối động Real-time nhảy số theo từng mili-giây.</li>
                <li><strong>Lưu trữ:</strong> Toàn bộ lịch sử thăm dò được ghi lại để trích xuất báo cáo.</li>
              </ul>
            </div>

            {/* Module Lucky Draw Wheel */}
            <div className="fluent-box p-5 rounded-[8px] border border-white/10 space-y-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                  Vòng Quay May Mắn (Lucky Draw)
                </h3>
              </div>
              <p className="text-xs text-white/80 leading-relaxed">
                Hệ thống quay thưởng ngẫu nhiên dành riêng cho khán giả tham gia tương tác:
              </p>
              <ul className="text-xs text-white/70 space-y-2 list-disc list-inside font-mono">
                <li><strong>Bộ lọc đối tượng:</strong> Tất cả khán giả đã check-in, khán giả có điểm số &gt; 0, hoặc khán giả trong Top xếp hạng.</li>
                <li><strong>Hiệu ứng:</strong> Vòng quay đồ họa Canvas 60 FPS, âm thanh tích tắc hồi hộp và hiệu ứng pháo hoa Confetti khi trúng giải.</li>
                <li><strong>Lịch sử trúng thưởng:</strong> Tự động loại trừ người đã trúng giải các lượt trước để đảm bảo công bằng.</li>
              </ul>
            </div>
          </div>

          {/* Module Word Cloud */}
          <div className="fluent-box p-5 rounded-[8px] border border-white/10 space-y-3">
            <div className="flex items-center gap-2">
              <Cloud className="w-5 h-5 text-purple-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                Đám Mây Từ Khóa Tương Tác (Interactive Word Cloud)
              </h3>
            </div>
            <p className="text-xs text-white/80 leading-relaxed">
              Khán giả gửi cảm nghĩ hoặc từ khóa ngắn (1-3 từ). Hệ thống sử dụng thuật toán gom cụm tần suất để phóng to các từ xuất hiện nhiều nhất, tạo nên bức tranh trực quan về cảm xúc khán phòng theo thời gian thực.
            </p>
          </div>
        </div>
      )}

      {/* SECTION 4: THÔNG BÁO KHẨN CẤP & THU HỒI */}
      {activeSection === 'BROADCAST' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="fluent-box p-5 rounded-[8px] border border-white/10 space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-white/10">
              <Radio className="w-5 h-5 text-rose-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                Hệ Thống Phát Thông Báo & Thu Hồi Khẩn Cấp (Instant Broadcast & Recall)
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="p-3 rounded-[6px] bg-rose-950/40 border border-rose-500/50 space-y-1">
                <span className="text-[10px] font-mono font-bold text-rose-300">1. KHẨN CẤP (URGENT)</span>
                <p className="text-xs text-white/80">
                  Dành cho hiệu lệnh MC, dừng trận đấu, kiểm tra kết nối. Kèm âm thanh còi báo và rung chuông.
                </p>
              </div>
              <div className="p-3 rounded-[6px] bg-amber-950/40 border border-amber-500/50 space-y-1">
                <span className="text-[10px] font-mono font-bold text-amber-300">2. LƯU Ý (ALERT)</span>
                <p className="text-xs text-white/80">
                  Cảnh báo thời gian, nhắc nhở khán giả không làm ồn hoặc chú ý lên sân khấu chính.
                </p>
              </div>
              <div className="p-3 rounded-[6px] bg-purple-950/40 border border-purple-500/50 space-y-1">
                <span className="text-[10px] font-mono font-bold text-purple-300">3. VINH DANH (CELEBRATION)</span>
                <p className="text-xs text-white/80">
                  Chúc mừng thí sinh xuất sắc, chúc mừng người thắng cuộc Lucky Draw kèm pháo giấy.
                </p>
              </div>
              <div className="p-3 rounded-[6px] bg-sky-950/40 border border-sky-500/50 space-y-1">
                <span className="text-[10px] font-mono font-bold text-sky-300">4. TIN TỨC (INFO)</span>
                <p className="text-xs text-white/80">
                  Thông báo quy định, link tài liệu hoặc hướng dẫn check-in vòng thi tiếp theo.
                </p>
              </div>
            </div>

            {/* Tính năng thu hồi */}
            <div className="p-4 rounded-[6px] bg-[#1a0815] border border-rose-500/40 space-y-2">
              <h4 className="text-xs font-bold text-rose-300 uppercase font-mono flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                Cơ Chế Thu Hồi 1-Click (Instant Notification Recall)
              </h4>
              <p className="text-xs text-white/80 leading-relaxed">
                Khi có thông báo nhầm hoặc sự kiện khẩn cấp đã kết thúc, Ban Tổ Chức chỉ cần bấm nút <strong>"Thu Hồi Thông Báo"</strong>. 
                Hệ thống sẽ ngay lập tức:
              </p>
              <ul className="text-xs text-white/70 space-y-1 list-disc list-inside font-mono">
                <li>Đóng toàn bộ Popup Toast đang hiển thị trên điện thoại khán giả và màn chiếu.</li>
                <li>Xóa dải chữ chạy Marquee đáy màn hình ngay trong 0.1 giây.</li>
                <li>Dừng âm thanh còi báo động trên toàn bộ thiết bị đã kết nối.</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 5: XUẤT DỮ LIỆU & SPSS */}
      {activeSection === 'DATA_EXPORT' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="fluent-box p-5 rounded-[8px] border border-white/10 space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-white/10">
              <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                Xuất Dữ Liệu Nghiên Cứu Khoa Học & Hậu Kiểm (SPSS / CSV / Full Dump)
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="p-4 rounded-[6px] fluent-box-nested border border-white/10 space-y-2">
                <h4 className="text-xs font-bold text-emerald-300 uppercase font-mono">
                  1. Chuẩn Hóa SPSS Tabular (1/0)
                </h4>
                <p className="text-xs text-white/70 leading-relaxed">
                  Xuất file CSV chứa ma trận nhị phân: mỗi hàng là một khán giả (MSSV, Họ tên), mỗi cột là câu hỏi với giá trị <strong>1 (Đúng)</strong> hoặc <strong>0 (Sai)</strong>, kèm tổng điểm và thời gian phản hồi chính xác đến mili-giây.
                </p>
              </div>

              <div className="p-4 rounded-[6px] fluent-box-nested border border-white/10 space-y-2">
                <h4 className="text-xs font-bold text-cyan-300 uppercase font-mono">
                  2. Full Database JSON Dump &amp; JSON Lines (.jsonl)
                </h4>
                <p className="text-xs text-white/70 leading-relaxed">
                  Sao lưu toàn bộ cấu trúc cơ sở dữ liệu trận đấu (Trạng thái câu hỏi, ngân hàng đề, chi tiết từng bài nộp, danh sách khán giả) để phục hồi hệ thống hoặc nạp vào các mô hình xử lý dữ liệu lớn (Python Pandas, Hugging Face, BigQuery).
                </p>
              </div>

              <div className="p-4 rounded-[6px] fluent-box-nested border border-white/10 space-y-2">
                <h4 className="text-xs font-bold text-amber-300 uppercase font-mono">
                  3. Audit Action &amp; Research Log (Chuẩn Nghiên Cứu Khoa Học)
                </h4>
                <p className="text-xs text-white/70 leading-relaxed">
                  Lưu vết thời gian thực mọi biến cố của Ban Tổ Chức (chuyển câu, khóa giờ, công bố đáp án), độ trễ phản xạ của thí sinh (Reaction Time ms), tham số đo lường độ khó Item Analysis và xuất dữ liệu chuẩn hóa phục vụ giải trình khiếu nại hoặc công bố nghiên cứu thực nghiệm (APA Format, SPSS, R).
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 6: PHÍM TẮT & XỬ LÝ SỰ CỐ */}
      {activeSection === 'SHORTCUTS' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Bảng phím tắt */}
          <div className="fluent-box p-5 rounded-[8px] border border-white/10 space-y-3">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
              <Keyboard className="w-4 h-4 text-cyan-400" />
              Bảng Phím Tắt Thao Tác Nhanh (Keyboard Hotkeys)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1">
              <div className="p-2.5 rounded-[4px] fluent-box-nested border border-white/10 flex items-center justify-between">
                <span className="text-xs text-white/80">Mở / Dừng đếm ngược</span>
                <kbd className="px-2 py-0.5 rounded bg-white/15 text-white font-mono text-xs font-bold border border-white/20">Space</kbd>
              </div>
              <div className="p-2.5 rounded-[4px] fluent-box-nested border border-white/10 flex items-center justify-between">
                <span className="text-xs text-white/80">Khóa câu hỏi tức thì</span>
                <kbd className="px-2 py-0.5 rounded bg-white/15 text-white font-mono text-xs font-bold border border-white/20">L</kbd>
              </div>
              <div className="p-2.5 rounded-[4px] fluent-box-nested border border-white/10 flex items-center justify-between">
                <span className="text-xs text-white/80">Công bố đáp án (Reveal)</span>
                <kbd className="px-2 py-0.5 rounded bg-white/15 text-white font-mono text-xs font-bold border border-white/20">R</kbd>
              </div>
              <div className="p-2.5 rounded-[4px] fluent-box-nested border border-white/10 flex items-center justify-between">
                <span className="text-xs text-white/80">Câu tiếp theo</span>
                <kbd className="px-2 py-0.5 rounded bg-white/15 text-white font-mono text-xs font-bold border border-white/20">→</kbd>
              </div>
              <div className="p-2.5 rounded-[4px] fluent-box-nested border border-white/10 flex items-center justify-between">
                <span className="text-xs text-white/80">Câu trước đó</span>
                <kbd className="px-2 py-0.5 rounded bg-white/15 text-white font-mono text-xs font-bold border border-white/20">←</kbd>
              </div>
              <div className="p-2.5 rounded-[4px] fluent-box-nested border border-white/10 flex items-center justify-between">
                <span className="text-xs text-white/80">Chế độ Toàn Màn Hình</span>
                <kbd className="px-2 py-0.5 rounded bg-white/15 text-white font-mono text-xs font-bold border border-white/20">F</kbd>
              </div>
            </div>
          </div>

          {/* Phương án xử lý sự cố */}
          <div className="fluent-box p-5 rounded-[8px] border border-rose-500/30 bg-rose-950/20 space-y-3">
            <h3 className="text-sm font-bold text-rose-300 uppercase tracking-wider font-mono flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400" />
              Quy Trình Xử Lý Sự Cố Khẩn Cấp (Troubleshooting & Contingency Plan)
            </h3>
            <div className="space-y-2 text-xs text-white/80">
              <div className="p-3 rounded-[4px] fluent-box-nested border border-white/10 space-y-1">
                <strong className="text-rose-300 font-mono">1. Mất kết nối Internet tại khán phòng:</strong>
                <p className="text-white/70">
                  Hệ thống tự động kích hoạt <em>Offline Buffer Service</em>. Khán giả vẫn có thể gửi bài offline, dữ liệu được xếp vào hàng đợi IndexedDB và tự động đồng bộ ngay khi mạng phục hồi trong 5 giây.
                </p>
              </div>
              <div className="p-3 rounded-[4px] fluent-box-nested border border-white/10 space-y-1">
                <strong className="text-amber-300 font-mono">2. Thí sinh bị lỗi tải trang:</strong>
                <p className="text-white/70">
                  Không cần đăng nhập lại. Nhấn F5 hoặc quét lại mã QR trên màn chiếu, hệ thống sử dụng Device Fingerprint để nhận diện và khôi phục đúng điểm số cũng như câu hỏi hiện tại.
                </p>
              </div>
              <div className="p-3 rounded-[4px] fluent-box-nested border border-white/10 space-y-1">
                <strong className="text-cyan-300 font-mono">3. Reset trận đấu khi có trục trặc nghiêm trọng:</strong>
                <p className="text-white/70">
                  Tại tab <em>Hệ Thống / Cài Đặt</em>, Admin có thể bấm <strong>"Xóa Trắng Dữ Liệu Phản Hồi"</strong> để bắt đầu lại từ đầu mà không làm mất danh sách câu hỏi trong ngân hàng.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 7: KIẾN TRÚC HỆ THỐNG */}
      {activeSection === 'ARCHITECTURE' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="fluent-box p-5 rounded-[8px] border border-white/10 space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-white/10">
              <Server className="w-5 h-5 text-purple-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                Kiến Trúc Đa Màn Hình & Đồng Bộ Pub/Sub (System Architecture)
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-[6px] fluent-box-nested border border-white/10 space-y-2">
                <div className="w-8 h-8 rounded-[4px] bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold">
                  <Tv className="w-4 h-4" />
                </div>
                <h4 className="text-xs font-bold text-white font-mono uppercase">1. Projector Mode (Màn Chiếu Sân Khấu)</h4>
                <p className="text-xs text-white/70 leading-relaxed">
                  Thiết kế tối ưu cho màn hình LED lớn và máy chiếu 4K. Tự động ẩn thanh điều khiển, tập trung vào đồ họa câu hỏi, thanh đếm ngược khổng lồ và bảng xếp hạng trực quan.
                </p>
              </div>

              <div className="p-4 rounded-[6px] fluent-box-nested border border-white/10 space-y-2">
                <div className="w-8 h-8 rounded-[4px] bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                  <Users className="w-4 h-4" />
                </div>
                <h4 className="text-xs font-bold text-white font-mono uppercase">2. Audience Mobile View (Khán Giả / Thí Sinh)</h4>
                <p className="text-xs text-white/70 leading-relaxed">
                  Giao diện di động phản hồi xúc giác (Haptic Feedback) và âm thanh sống động. Tối ưu hóa dung lượng truyền tải &lt; 50KB cho trải nghiệm siêu mượt.
                </p>
              </div>

              <div className="p-4 rounded-[6px] fluent-box-nested border border-white/10 space-y-2">
                <div className="w-8 h-8 rounded-[4px] bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold">
                  <Server className="w-4 h-4" />
                </div>
                <h4 className="text-xs font-bold text-white font-mono uppercase">3. Admin Master Center (Bàn Điều Khiển)</h4>
                <p className="text-xs text-white/70 leading-relaxed">
                  Trung tâm quyền lực với đầy đủ 14 phân hệ điều hành: điều khiển thời gian, nạp câu hỏi, chấm điểm tự động, soundboard và trích xuất số liệu.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

