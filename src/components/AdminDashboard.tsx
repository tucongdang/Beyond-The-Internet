import React from 'react';
import { 
  Zap, 
  LayoutGrid, 
  Flame, 
  Target, 
  BarChart3, 
  ListPlus, 
  Trophy, 
  Sparkles, 
  History, 
  MessageSquare, 
  Cloud, 
  Camera, 
  Clock, 
  BookOpen,
  Gamepad2,
  Users,
  Settings,
  Calendar,
  Play,
  Flag,
  Shield,
  Radio
} from 'lucide-react';

import { AdminMatchConfigSection } from './AdminMatchConfigSection';

interface AdminDashboardProps {
  onNavigate: (tabId: any) => void;
  gameState: any;
  snapshotCount: number;
  onOpenEventSchedule?: () => void;
  onStartEvent?: () => void;
  onEndEvent?: () => void;
  triggerToast?: (message: string) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  onNavigate,
  gameState,
  snapshotCount,
  onOpenEventSchedule,
  onStartEvent,
  onEndEvent,
  triggerToast
}) => {
  const cardClasses = "fluent-box p-4 sm:p-5 transition-all duration-300 ease-out cursor-pointer group hover:bg-white/5 hover:brightness-110 hover:-translate-y-1 hover:scale-[1.02] hover:shadow-lg";
  const iconBoxClasses = "w-10 h-10 rounded-[2px] flex items-center justify-center mb-4 transition-transform group-hover:scale-110";

  const schedule = gameState.event_schedule;
  const isScheduled = schedule?.enabled && schedule?.status === 'SCHEDULED';
  const isLive = schedule?.enabled && schedule?.status === 'IN_PROGRESS';
  const isConcluded = schedule?.enabled && schedule?.status === 'CONCLUDED';

  return (
    <div className="space-y-6 sm:space-y-8 animate-fadeIn pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Bảng Điều Khiển Tổng Quan</h2>
          <p className="text-white/60 text-sm">Điều phối toàn diện luồng chương trình, bảo mật đề thi và quản lý vòng đấu.</p>
        </div>

        {onOpenEventSchedule && (
          <button
            type="button"
            onClick={onOpenEventSchedule}
            className="px-4 py-2.5 rounded-[3px] bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white font-mono font-bold text-xs shadow-lg shadow-sky-950/50 flex items-center gap-2 cursor-pointer transition active:scale-95 shrink-0 self-start sm:self-auto"
          >
            <Calendar className="w-4 h-4" />
            <span>Thiết Lập Lịch Trình & Ngày Giờ</span>
          </button>
        )}
      </div>

      {/* Hero Banner: Tiến Trình & Vận Hành Sự Kiện (Event Lifecycle & Leak Protection) */}
      <div className="fluent-box p-4 sm:p-5 rounded-[4px] border border-sky-500/30 bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 shadow-xl relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className={`w-12 h-12 rounded-[4px] flex items-center justify-center shrink-0 shadow-md ${
              isLive ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 animate-pulse' :
              isScheduled ? 'bg-amber-500/20 text-amber-300 border border-amber-400/40' :
              isConcluded ? 'bg-purple-500/20 text-purple-300 border border-purple-400/40' :
              'bg-sky-500/20 text-sky-300 border border-sky-400/30'
            }`}>
              {isLive ? <Radio className="w-6 h-6 animate-pulse" /> :
               isScheduled ? <Clock className="w-6 h-6" /> :
               isConcluded ? <Flag className="w-6 h-6" /> :
               <Shield className="w-6 h-6" />}
            </div>

            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-bold text-sm sm:text-base text-white">
                  {schedule?.title || 'Beyond The Internet 2026'}
                </span>
                {schedule?.enabled ? (
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold tracking-wider uppercase border ${
                    isLive ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40 animate-pulse' :
                    isScheduled ? 'bg-amber-500/20 text-amber-300 border-amber-400/40' :
                    'bg-purple-500/20 text-purple-300 border-purple-400/40'
                  }`}>
                    {isLive ? '● ĐANG DIỄN RA (LIVE)' :
                     isScheduled ? '⏳ CHỜ KHAI MẠC (LOCKED)' :
                     '🏁 ĐÃ KẾT THÚC (CONCLUDED)'}
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-[2px] text-[10px] font-mono text-slate-400 bg-white/5 border border-white/10">
                    Chưa kích hoạt khóa lịch trình
                  </span>
                )}
              </div>

              <p className="text-xs text-slate-300 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono">
                {schedule?.scheduled_start_time && (
                  <span className="text-sky-300 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>
                      {new Date(schedule.scheduled_start_time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} • {new Date(schedule.scheduled_start_time).toLocaleDateString('vi-VN')}
                    </span>
                  </span>
                )}
                {schedule?.location && (
                  <span className="text-slate-400">
                    Địa điểm: {schedule.location}
                  </span>
                )}
                <span className="text-emerald-400">
                  {isScheduled ? '🔒 Khán giả ở Phòng Chờ Khai Mạc (Đề thi được bảo mật)' :
                   isLive ? '🟢 Khán giả đang thi đấu trực tiếp' :
                   isConcluded ? '🏆 Khán giả xem Bế Mạc & Tổng Kết' : 'Chế độ thi đấu tự do'}
                </span>
              </p>
            </div>
          </div>

          {/* Quick Action Buttons for Master Event Lifecycle */}
          <div className="flex flex-wrap items-center gap-2 pt-2 lg:pt-0 border-t lg:border-t-0 border-white/10">
            {/* Start Button */}
            {onStartEvent && (
              <button
                type="button"
                onClick={onStartEvent}
                disabled={isLive}
                className={`py-2 px-3.5 rounded-[3px] font-mono font-bold text-xs flex items-center gap-1.5 shadow-md transition cursor-pointer ${
                  isLive
                    ? 'bg-slate-800 text-slate-500 border border-white/5 cursor-not-allowed'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950/40 active:scale-95'
                }`}
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Bắt Đầu Sự Kiện</span>
              </button>
            )}

            {/* End Button */}
            {onEndEvent && (
              <button
                type="button"
                onClick={onEndEvent}
                disabled={isConcluded || !isLive}
                className={`py-2 px-3.5 rounded-[3px] font-mono font-bold text-xs flex items-center gap-1.5 shadow-md transition cursor-pointer ${
                  isConcluded || !isLive
                    ? 'bg-slate-800 text-slate-500 border border-white/5 cursor-not-allowed'
                    : 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-950/40 active:scale-95'
                }`}
              >
                <Flag className="w-3.5 h-3.5" />
                <span>Kết Thúc Sự Kiện</span>
              </button>
            )}

            {/* Config Button */}
            {onOpenEventSchedule && (
              <button
                type="button"
                onClick={onOpenEventSchedule}
                className="py-2 px-3 rounded-[3px] bg-white/10 hover:bg-white/15 text-slate-200 border border-white/10 font-mono text-xs flex items-center gap-1.5 transition cursor-pointer"
              >
                <Settings className="w-3.5 h-3.5 text-slate-400" />
                <span>Cài Đặt</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Match Configuration & Stage Branding Control */}
      <AdminMatchConfigSection
        gameState={gameState}
        onOpenFullScheduleModal={onOpenEventSchedule}
        triggerToast={triggerToast}
      />

      <div className="space-y-6">
        {/* Nhóm 1: Vòng thi đấu */}
        <div>
          <h3 className="text-sm font-bold text-white/50 uppercase tracking-widest mb-4 flex items-center gap-2">
            <Gamepad2 className="w-4 h-4" />
            Điều khiển vòng thi đấu
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className={cardClasses} onClick={() => onNavigate('KDC')}>
              <div className={`${iconBoxClasses} bg-blue-500/20 text-blue-400`}><Zap className="w-5 h-5" /></div>
              <h4 className="text-base font-bold text-white mb-1 group-hover:text-blue-300 transition-colors">1. Khởi Động</h4>
              <p className="text-xs text-white/50 line-clamp-2">Điều khiển 45 câu hỏi Khởi động (Trắc nghiệm & Trả lời ngắn)</p>
            </div>
            
            <div className={cardClasses} onClick={() => onNavigate('VCNV')}>
              <div className={`${iconBoxClasses} bg-orange-500/20 text-orange-400`}><LayoutGrid className="w-5 h-5" /></div>
              <h4 className="text-base font-bold text-white mb-1 group-hover:text-orange-300 transition-colors">2. Chướng Ngại Vật</h4>
              <p className="text-xs text-white/50 line-clamp-2">Mở 4 hàng ngang, gợi ý ô hình và giải mã từ khóa trung tâm</p>
            </div>
            
            <div className={cardClasses} onClick={() => onNavigate('TT')}>
              <div className={`${iconBoxClasses} bg-rose-500/20 text-rose-400`}><Flame className="w-5 h-5" /></div>
              <h4 className="text-base font-bold text-white mb-1 group-hover:text-rose-300 transition-colors">3. Tăng Tốc</h4>
              <p className="text-xs text-white/50 line-clamp-2">4 câu hỏi tăng tốc tốc độ cao (Trắc nghiệm loại trừ & Sắp xếp)</p>
            </div>
            
            <div className={cardClasses} onClick={() => onNavigate('VD')}>
              <div className={`${iconBoxClasses} bg-emerald-500/20 text-emerald-400`}><Target className="w-5 h-5" /></div>
              <h4 className="text-base font-bold text-white mb-1 group-hover:text-emerald-300 transition-colors">4. Về Đích</h4>
              <p className="text-xs text-white/50 line-clamp-2">Gói câu hỏi Về đích (Ngôi sao hy vọng & Đúng/Sai 4 phát biểu)</p>
            </div>
          </div>
        </div>

        {/* Nhóm 2: Tương tác Khán giả */}
        <div>
          <h3 className="text-sm font-bold text-white/50 uppercase tracking-widest mb-4 flex items-center gap-2 mt-8">
            <Users className="w-4 h-4" />
            Tương tác & Cộng đồng
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className={cardClasses} onClick={() => onNavigate('POLL_MANAGER')}>
              <div className={`${iconBoxClasses} bg-amber-500/20 text-amber-400`}>
                <div className="relative">
                  <BarChart3 className="w-5 h-5" />
                  <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
                  </span>
                </div>
              </div>
              <h4 className="text-base font-bold text-white mb-1 group-hover:text-amber-300 transition-colors">Khảo sát Live</h4>
              <p className="text-xs text-white/50 line-clamp-2">Tạo và phát khảo sát realtime cho khán giả tại trường quay</p>
            </div>
            
            <div className={cardClasses} onClick={() => onNavigate('QA_MANAGER')}>
              <div className={`${iconBoxClasses} bg-indigo-500/20 text-indigo-400`}><MessageSquare className="w-5 h-5" /></div>
              <h4 className="text-base font-bold text-white mb-1 group-hover:text-indigo-300 transition-colors">Hỏi Đáp (Q&A)</h4>
              <p className="text-xs text-white/50 line-clamp-2">Kiểm duyệt và trả lời câu hỏi trực tiếp từ khán giả</p>
            </div>
            
            <div className={cardClasses} onClick={() => onNavigate('WORD_CLOUD')}>
              <div className={`${iconBoxClasses} bg-sky-500/20 text-sky-400`}><Cloud className="w-5 h-5" /></div>
              <h4 className="text-base font-bold text-white mb-1 group-hover:text-sky-300 transition-colors">Đám Mây Từ Khóa</h4>
              <p className="text-xs text-white/50 line-clamp-2">Trình chiếu tương tác đám mây từ khóa theo thời gian thực</p>
            </div>
            
            <div className={cardClasses} onClick={() => onNavigate('LUCKY_DRAW')}>
              <div className={`${iconBoxClasses} bg-fuchsia-500/20 text-fuchsia-400`}><Sparkles className="w-5 h-5" /></div>
              <h4 className="text-base font-bold text-white mb-1 group-hover:text-fuchsia-300 transition-colors">Quay Số May Mắn</h4>
              <p className="text-xs text-white/50 line-clamp-2">Bốc thăm trúng thưởng dành cho khán giả tham dự trực tiếp</p>
            </div>
          </div>
        </div>

        {/* Nhóm 3: Hệ thống & Quản trị */}
        <div>
          <h3 className="text-sm font-bold text-white/50 uppercase tracking-widest mb-4 flex items-center gap-2 mt-8">
            <Settings className="w-4 h-4" />
            Hệ thống & Quản trị
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className={cardClasses} onClick={() => onNavigate('QUESTIONS')}>
              <div className={`${iconBoxClasses} bg-zinc-500/20 text-zinc-300`}><ListPlus className="w-5 h-5" /></div>
              <h4 className="text-base font-bold text-white mb-1 group-hover:text-zinc-200 transition-colors">Ngân hàng Câu hỏi</h4>
              <p className="text-xs text-white/50 line-clamp-2">Biên soạn, nhập/xuất JSON ngân hàng câu hỏi hệ thống</p>
            </div>
            
            <div className={cardClasses} onClick={() => onNavigate('STATS')}>
              <div className={`${iconBoxClasses} bg-teal-500/20 text-teal-400`}><Trophy className="w-5 h-5" /></div>
              <h4 className="text-base font-bold text-white mb-1 group-hover:text-teal-300 transition-colors">Thống kê & Xếp hạng</h4>
              <p className="text-xs text-white/50 line-clamp-2">Bảng xếp hạng tổng điểm và phân tích dữ liệu SPSS xuất khẩu</p>
            </div>
            
            <div className={cardClasses} onClick={() => onNavigate('POLL_HISTORY')}>
              <div className={`${iconBoxClasses} bg-pink-500/20 text-pink-400`}>
                <History className="w-5 h-5" />
                {(gameState.emergency_poll_history?.length || 0) > 0 && (
                  <span className="absolute top-3 right-3 text-[10px] font-mono bg-pink-500/30 text-pink-200 px-1.5 py-0.5 rounded-[2px]">
                    {gameState.emergency_poll_history.length}
                  </span>
                )}
              </div>
              <h4 className="text-base font-bold text-white mb-1 group-hover:text-pink-300 transition-colors">Lịch sử Poll</h4>
              <p className="text-xs text-white/50 line-clamp-2">Xem lại kết quả các cuộc thăm dò ý kiến đã thực hiện</p>
            </div>

            <div className={cardClasses} onClick={() => onNavigate('SNAPSHOTS')}>
              <div className={`${iconBoxClasses} bg-cyan-500/20 text-cyan-400`}>
                <Camera className="w-5 h-5" />
                {snapshotCount > 0 && (
                  <span className="absolute top-3 right-3 text-[10px] font-mono bg-cyan-500/30 text-cyan-200 px-1.5 py-0.5 rounded-[2px]">
                    {snapshotCount}
                  </span>
                )}
              </div>
              <h4 className="text-base font-bold text-white mb-1 group-hover:text-cyan-300 transition-colors">Khoảnh Khắc</h4>
              <p className="text-xs text-white/50 line-clamp-2">Xem và quản lý các ảnh chụp màn hình sân khấu đã lưu</p>
            </div>

            <div className={cardClasses} onClick={() => onNavigate('ACTIVITY_LOG')}>
              <div className={`${iconBoxClasses} bg-lime-500/20 text-lime-400`}><Clock className="w-5 h-5" /></div>
              <h4 className="text-base font-bold text-white mb-1 group-hover:text-lime-300 transition-colors">Nhật Ký Hoạt Động</h4>
              <p className="text-xs text-white/50 line-clamp-2">Theo dõi chi tiết lịch sử (Audit Log) mọi hành động điều khiển</p>
            </div>

            <div className={cardClasses} onClick={() => onNavigate('GUIDE')}>
              <div className={`${iconBoxClasses} bg-violet-500/20 text-violet-400`}><BookOpen className="w-5 h-5" /></div>
              <h4 className="text-base font-bold text-white mb-1 group-hover:text-violet-300 transition-colors">Hướng Dẫn & Tài Liệu</h4>
              <p className="text-xs text-white/50 line-clamp-2">Tài liệu tham khảo kiến trúc và trích xuất phương pháp nghiên cứu</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
