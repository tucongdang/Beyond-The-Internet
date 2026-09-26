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
  Radio,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  Sliders,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';

import { AdminMatchConfigSection } from './AdminMatchConfigSection';
import { syncService } from '../services/syncService';
import { soundFx } from '../services/audioEffects';
import { vibrateTap, vibrateSelection } from '../utils/hapticUtils';
import { AggregateBatteryIndicator } from './AggregateBatteryIndicator';

interface AdminDashboardProps {
  onNavigate: (tabId: any) => void;
  gameState: any;
  snapshotCount: number;
  activeCount?: number;
  onOpenEventSchedule?: () => void;
  onStartEvent?: () => void;
  onEndEvent?: () => void;
  triggerToast?: (message: string) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  onNavigate,
  gameState,
  snapshotCount,
  activeCount = 0,
  onOpenEventSchedule,
  onStartEvent,
  onEndEvent,
  triggerToast
}) => {
  const schedule = gameState.event_schedule;
  const isScheduled = schedule?.enabled && schedule?.status === 'SCHEDULED';
  const isLive = schedule?.enabled && schedule?.status === 'IN_PROGRESS';
  const isConcluded = schedule?.enabled && schedule?.status === 'CONCLUDED';

  const handleQuickNav = (tabId: string) => {
    vibrateTap();
    soundFx.playClick();
    onNavigate(tabId);
    if (tabId === 'LUCKY_DRAW') {
      syncService.updateGameState({ active_module: 'LUCKY_DRAW' });
    } else if (gameState.active_module === 'LUCKY_DRAW') {
      syncService.updateGameState({ active_module: 'GAME' });
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 animate-fadeIn pb-12">
      {/* Top Banner Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Trung Tâm Chỉ Huy Tổng Quan
            </h2>
            <span className="px-2 py-0.5 rounded-[2px] text-[10px] font-mono font-bold bg-sky-500/20 text-sky-300 border border-sky-400/30 uppercase tracking-wider">
              Executive Cockpit
            </span>
          </div>
          <p className="text-white/60 text-xs sm:text-sm mt-0.5">
            Tổng quan thời gian thực, quản lý tiến trình trận đấu và điều phối nhanh các phân hệ.
          </p>
        </div>

        {onOpenEventSchedule && (
          <button
            type="button"
            onClick={onOpenEventSchedule}
            className="px-3.5 py-2 rounded-[3px] bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white font-mono font-bold text-xs shadow-md shadow-sky-950/50 flex items-center gap-2 cursor-pointer transition active:scale-95 shrink-0 self-start sm:self-auto"
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Lịch Trình & Ngày Giờ</span>
          </button>
        )}
      </div>

      {/* ================= 4 REALTIME KPI TELEMETRY CARDS ================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* KPI 1: Audience Connections */}
        <div className="fluent-box p-3.5 rounded-[4px] border border-sky-500/30 bg-gradient-to-br from-sky-950/40 to-slate-900/80 flex flex-col justify-between space-y-2 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase text-sky-400 font-bold tracking-wider">
              Khán Giả Kết Nối
            </span>
            <div className="w-7 h-7 rounded-[2px] bg-sky-500/20 border border-sky-400/40 flex items-center justify-center text-sky-300">
              <Users className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black font-mono text-white">
                {activeCount}
              </span>
              <span className="text-xs text-white/50 font-mono">thiết bị</span>
            </div>
            <p className="text-[11px] text-emerald-400 flex items-center gap-1 font-mono mt-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              <span>Đồng bộ Firestore Stream</span>
            </p>
          </div>
        </div>

        {/* KPI 2: Active Round & Question */}
        <div className="fluent-box p-3.5 rounded-[4px] border border-purple-500/30 bg-gradient-to-br from-purple-950/40 to-slate-900/80 flex flex-col justify-between space-y-2 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase text-purple-400 font-bold tracking-wider">
              Câu Hỏi Hiện Tại
            </span>
            <div className="w-7 h-7 rounded-[2px] bg-purple-500/20 border border-purple-400/40 flex items-center justify-center text-purple-300">
              <Target className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl sm:text-2xl font-black font-mono text-white">
                {gameState.question_id || 'Chưa nạp'}
              </span>
              <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-[2px] border ${
                gameState.status === 'ACTIVE' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 animate-pulse' :
                gameState.status === 'LOCKED' ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' :
                gameState.status === 'REVEAL' ? 'bg-purple-500/20 text-purple-300 border-purple-500/40' :
                'bg-white/10 text-white/60 border-white/10'
              }`}>
                {gameState.status}
              </span>
            </div>
            <button
              type="button"
              onClick={() => handleQuickNav('KDC')}
              className="text-[11px] text-purple-300 hover:text-white flex items-center gap-1 mt-1 font-mono cursor-pointer transition"
            >
              <span>Vào Đấu Trường</span>
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* KPI 3: Event Lifecycle Status */}
        <div className="fluent-box p-3.5 rounded-[4px] border border-amber-500/30 bg-gradient-to-br from-amber-950/40 to-slate-900/80 flex flex-col justify-between space-y-2 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase text-amber-400 font-bold tracking-wider">
              Trạng Thái Sự Kiện
            </span>
            <div className="w-7 h-7 rounded-[2px] bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300">
              {isLive ? <Radio className="w-3.5 h-3.5 animate-pulse" /> : <Clock className="w-3.5 h-3.5" />}
            </div>
          </div>
          <div>
            <div className="text-base sm:text-lg font-bold font-mono text-white flex items-center gap-1.5">
              <span>{isLive ? 'ĐANG PHÁT SÓNG' : isScheduled ? 'CHỜ KHAI MẠC' : isConcluded ? 'ĐÃ KẾT THÚC' : 'TỰ DO (TEST)'}</span>
            </div>
            <p className="text-[11px] text-amber-300/80 font-mono mt-1 truncate">
              {schedule?.title || 'Beyond The Internet 2026'}
            </p>
          </div>
        </div>

        {/* KPI 4: Audience Battery Health */}
        <div className="fluent-box p-3.5 rounded-[4px] border border-emerald-500/30 bg-gradient-to-br from-emerald-950/40 to-slate-900/80 flex flex-col justify-between space-y-2 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase text-emerald-400 font-bold tracking-wider">
              Pin & Thiết Bị Khán Giả
            </span>
            <div className="w-7 h-7 rounded-[2px] bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-300">
              <Zap className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <div className="pt-0.5">
              <AggregateBatteryIndicator triggerToast={triggerToast} />
            </div>
            <p className="text-[10px] text-white/50 font-mono mt-1">
              Giám sát tình trạng pin thời gian thực
            </p>
          </div>
        </div>
      </div>

      {/* ================= HERO EVENT LIFECYCLE STRIP ================= */}
      <div className="fluent-box p-3.5 sm:p-4 rounded-[4px] border border-sky-500/30 bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 shadow-xl relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-[3px] flex items-center justify-center shrink-0 shadow-md ${
              isLive ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 animate-pulse' :
              isScheduled ? 'bg-amber-500/20 text-amber-300 border border-amber-400/40' :
              isConcluded ? 'bg-purple-500/20 text-purple-300 border border-purple-400/40' :
              'bg-sky-500/20 text-sky-300 border border-sky-400/30'
            }`}>
              {isLive ? <Radio className="w-5 h-5 animate-pulse" /> :
               isScheduled ? <Clock className="w-5 h-5" /> :
               isConcluded ? <Flag className="w-5 h-5" /> :
               <Shield className="w-5 h-5" />}
            </div>

            <div className="space-y-0.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-bold text-sm text-white">
                  {schedule?.title || 'Beyond The Internet 2026 • Live Gameshow'}
                </span>
                {schedule?.enabled && (
                  <span className={`px-2 py-0.2 rounded-full text-[9px] font-mono font-bold tracking-wider uppercase border ${
                    isLive ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40 animate-pulse' :
                    isScheduled ? 'bg-amber-500/20 text-amber-300 border-amber-400/40' :
                    'bg-purple-500/20 text-purple-300 border-purple-400/40'
                  }`}>
                    {isLive ? '● ĐANG DIỄN RA (LIVE)' :
                     isScheduled ? '⏳ CHỜ KHAI MẠC (LOCKED)' :
                     '🏁 ĐÃ KẾT THÚC'}
                  </span>
                )}
              </div>

              <p className="text-xs text-slate-300 flex flex-wrap items-center gap-x-3 gap-y-0.5 font-mono">
                {schedule?.scheduled_start_time && (
                  <span className="text-sky-300 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
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
                  {isScheduled ? '🔒 Khán giả ở Phòng Chờ (Bảo mật đề thi)' :
                   isLive ? '🟢 Đang thi đấu trực tiếp' :
                   isConcluded ? '🏆 Khán giả xem Bế Mạc' : 'Chế độ phát sóng trực tiếp'}
                </span>
              </p>
            </div>
          </div>

          {/* Quick Action Buttons for Master Event Lifecycle */}
          <div className="flex flex-wrap items-center gap-2 pt-2 lg:pt-0 border-t lg:border-t-0 border-white/10">
            {onStartEvent && (
              <button
                type="button"
                onClick={onStartEvent}
                disabled={isLive}
                className={`py-1.5 px-3 rounded-[3px] font-mono font-bold text-xs flex items-center gap-1.5 shadow-md transition cursor-pointer ${
                  isLive
                    ? 'bg-slate-800 text-slate-500 border border-white/5 cursor-not-allowed'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950/40 active:scale-95'
                }`}
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Bắt Đầu Sự Kiện</span>
              </button>
            )}

            {onEndEvent && (
              <button
                type="button"
                onClick={onEndEvent}
                disabled={isConcluded || !isLive}
                className={`py-1.5 px-3 rounded-[3px] font-mono font-bold text-xs flex items-center gap-1.5 shadow-md transition cursor-pointer ${
                  isConcluded || !isLive
                    ? 'bg-slate-800 text-slate-500 border border-white/5 cursor-not-allowed'
                    : 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-950/40 active:scale-95'
                }`}
              >
                <Flag className="w-3.5 h-3.5" />
                <span>Kết Thúc</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ================= 4 BENTO LAUNCHPAD HUBS ================= */}
      <div className="space-y-4">
        <h3 className="text-xs font-bold text-white/50 uppercase tracking-widest flex items-center gap-1.5">
          <Gamepad2 className="w-4 h-4 text-purple-400" />
          <span>Điều Phối Nhanh Các Phân Hệ (Fast Launchpad)</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {/* Hub 1: 🎮 ĐẤU TRƯỜNG 4 VÒNG THI */}
          <div className="fluent-box p-4 rounded-[4px] border border-blue-500/20 bg-gradient-to-br from-blue-950/30 to-slate-900/60 space-y-3 shadow-lg">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <div className="w-7 h-7 rounded-[2px] bg-blue-500/20 text-blue-400 flex items-center justify-center">
                  <Gamepad2 className="w-4 h-4" />
                </div>
                <span>1. Đấu Trường (4 Vòng Thi Đấu)</span>
              </div>
              <button
                type="button"
                onClick={() => handleQuickNav('KDC')}
                className="text-[11px] font-mono text-blue-300 hover:text-white flex items-center gap-1 cursor-pointer"
              >
                <span>Mở Vòng Thi</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleQuickNav('KDC')}
                className="p-2.5 rounded-[3px] bg-white/5 hover:bg-blue-600/20 border border-white/10 hover:border-blue-400/40 transition text-left cursor-pointer group"
              >
                <div className="flex items-center gap-1.5 text-blue-300 font-bold text-xs mb-0.5">
                  <Zap className="w-3.5 h-3.5 text-blue-400" />
                  <span>1. Khởi Động</span>
                </div>
                <p className="text-[10px] text-white/50">45 câu hỏi nhanh trắc nghiệm & ngắn</p>
              </button>

              <button
                type="button"
                onClick={() => handleQuickNav('VCNV')}
                className="p-2.5 rounded-[3px] bg-white/5 hover:bg-orange-600/20 border border-white/10 hover:border-orange-400/40 transition text-left cursor-pointer group"
              >
                <div className="flex items-center gap-1.5 text-orange-300 font-bold text-xs mb-0.5">
                  <LayoutGrid className="w-3.5 h-3.5 text-orange-400" />
                  <span>2. Chướng Ngại Vật</span>
                </div>
                <p className="text-[10px] text-white/50">4 hàng ngang & ô hình trung tâm</p>
              </button>

              <button
                type="button"
                onClick={() => handleQuickNav('TT')}
                className="p-2.5 rounded-[3px] bg-white/5 hover:bg-rose-600/20 border border-white/10 hover:border-rose-400/40 transition text-left cursor-pointer group"
              >
                <div className="flex items-center gap-1.5 text-rose-300 font-bold text-xs mb-0.5">
                  <Flame className="w-3.5 h-3.5 text-rose-400" />
                  <span>3. Tăng Tốc</span>
                </div>
                <p className="text-[10px] text-white/50">4 câu loại trừ 6 phương án & sắp xếp</p>
              </button>

              <button
                type="button"
                onClick={() => handleQuickNav('VD')}
                className="p-2.5 rounded-[3px] bg-white/5 hover:bg-emerald-600/20 border border-white/10 hover:border-emerald-400/40 transition text-left cursor-pointer group"
              >
                <div className="flex items-center gap-1.5 text-emerald-300 font-bold text-xs mb-0.5">
                  <Target className="w-3.5 h-3.5 text-emerald-400" />
                  <span>4. Về Đích</span>
                </div>
                <p className="text-[10px] text-white/50">Gói câu điểm số & ngôi sao hy vọng</p>
              </button>
            </div>
          </div>

          {/* Hub 2: 💬 TƯƠNG TÁC KHÁN GIẢ */}
          <div className="fluent-box p-4 rounded-[4px] border border-amber-500/20 bg-gradient-to-br from-amber-950/30 to-slate-900/60 space-y-3 shadow-lg">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <div className="w-7 h-7 rounded-[2px] bg-amber-500/20 text-amber-400 flex items-center justify-center">
                  <Users className="w-4 h-4" />
                </div>
                <span>2. Tương Tác &amp; Khảo Sát</span>
              </div>
              <button
                type="button"
                onClick={() => handleQuickNav('QA_MANAGER')}
                className="text-[11px] font-mono text-amber-300 hover:text-white flex items-center gap-1 cursor-pointer"
              >
                <span>Xem Chi Tiết</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => handleQuickNav('POLL_MANAGER')}
                className="px-3 py-2 rounded-[3px] bg-white/5 hover:bg-amber-600/20 border border-white/10 text-xs font-mono text-amber-200 flex items-center gap-1.5 transition cursor-pointer"
              >
                <BarChart3 className="w-3.5 h-3.5 text-amber-400" />
                <span>Khảo Sát Poll Live</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickNav('QA_MANAGER')}
                className="px-3 py-2 rounded-[3px] bg-white/5 hover:bg-indigo-600/20 border border-white/10 text-xs font-mono text-indigo-200 flex items-center gap-1.5 transition cursor-pointer"
              >
                <MessageSquare className="w-3.5 h-3.5 text-indigo-400" />
                <span>Hỏi Đáp Q&A</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickNav('CHAT_MANAGER')}
                className="px-3 py-2 rounded-[3px] bg-white/5 hover:bg-cyan-600/20 border border-white/10 text-xs font-mono text-cyan-200 flex items-center gap-1.5 transition cursor-pointer"
              >
                <Radio className="w-3.5 h-3.5 text-cyan-400" />
                <span>Chat Khán Giả</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickNav('WORD_CLOUD')}
                className="px-3 py-2 rounded-[3px] bg-white/5 hover:bg-sky-600/20 border border-white/10 text-xs font-mono text-sky-200 flex items-center gap-1.5 transition cursor-pointer"
              >
                <Cloud className="w-3.5 h-3.5 text-sky-400" />
                <span>Mây Từ Khóa</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickNav('LUCKY_DRAW')}
                className="px-3 py-2 rounded-[3px] bg-white/5 hover:bg-fuchsia-600/20 border border-white/10 text-xs font-mono text-fuchsia-200 flex items-center gap-1.5 transition cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-fuchsia-400" />
                <span>Quay Số May Mắn</span>
              </button>
            </div>
          </div>

          {/* Hub 3: 📊 BÁO CÁO & XẾP HẠNG */}
          <div className="fluent-box p-4 rounded-[4px] border border-teal-500/20 bg-gradient-to-br from-teal-950/30 to-slate-900/60 space-y-3 shadow-lg">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <div className="w-7 h-7 rounded-[2px] bg-teal-500/20 text-teal-400 flex items-center justify-center">
                  <Trophy className="w-4 h-4" />
                </div>
                <span>3. Kết Quả &amp; Thống Kê SPSS</span>
              </div>
              <button
                type="button"
                onClick={() => handleQuickNav('STATS')}
                className="text-[11px] font-mono text-teal-300 hover:text-white flex items-center gap-1 cursor-pointer"
              >
                <span>Xem Báo Cáo</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => handleQuickNav('STATS')}
                className="px-3 py-2 rounded-[3px] bg-white/5 hover:bg-teal-600/20 border border-white/10 text-xs font-mono text-teal-200 flex items-center gap-1.5 transition cursor-pointer"
              >
                <Trophy className="w-3.5 h-3.5 text-teal-400" />
                <span>Bảng Tổng Điểm & Vinh Danh</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickNav('POLL_HISTORY')}
                className="px-3 py-2 rounded-[3px] bg-white/5 hover:bg-pink-600/20 border border-white/10 text-xs font-mono text-pink-200 flex items-center gap-1.5 transition cursor-pointer"
              >
                <History className="w-3.5 h-3.5 text-pink-400" />
                <span>Lịch Sử Khảo Sát</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickNav('SNAPSHOTS')}
                className="px-3 py-2 rounded-[3px] bg-white/5 hover:bg-cyan-600/20 border border-white/10 text-xs font-mono text-cyan-200 flex items-center gap-1.5 transition cursor-pointer"
              >
                <Camera className="w-3.5 h-3.5 text-cyan-400" />
                <span>Khoảnh Khắc ({snapshotCount})</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickNav('ACTIVITY_LOG')}
                className="px-3 py-2 rounded-[3px] bg-white/5 hover:bg-lime-600/20 border border-white/10 text-xs font-mono text-lime-200 flex items-center gap-1.5 transition cursor-pointer"
              >
                <Clock className="w-3.5 h-3.5 text-lime-400" />
                <span>Nhật Ký Audit</span>
              </button>
            </div>
          </div>

          {/* Hub 4: 📚 NGÂN HÀNG ĐỀ & CẤU HÌNH */}
          <div className="fluent-box p-4 rounded-[4px] border border-purple-500/20 bg-gradient-to-br from-purple-950/30 to-slate-900/60 space-y-3 shadow-lg">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <div className="w-7 h-7 rounded-[2px] bg-purple-500/20 text-purple-400 flex items-center justify-center">
                  <ListPlus className="w-4 h-4" />
                </div>
                <span>4. Ngân Hàng Đề &amp; Hướng Dẫn</span>
              </div>
              <button
                type="button"
                onClick={() => handleQuickNav('QUESTIONS')}
                className="text-[11px] font-mono text-purple-300 hover:text-white flex items-center gap-1 cursor-pointer"
              >
                <span>Mở Soạn Đề</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => handleQuickNav('QUESTIONS')}
                className="px-3 py-2 rounded-[3px] bg-white/5 hover:bg-purple-600/20 border border-white/10 text-xs font-mono text-purple-200 flex items-center gap-1.5 transition cursor-pointer"
              >
                <ListPlus className="w-3.5 h-3.5 text-purple-400" />
                <span>Biên Soạn & Nhập/Xuất Đề</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickNav('GUIDE')}
                className="px-3 py-2 rounded-[3px] bg-white/5 hover:bg-violet-600/20 border border-white/10 text-xs font-mono text-violet-200 flex items-center gap-1.5 transition cursor-pointer"
              >
                <BookOpen className="w-3.5 h-3.5 text-violet-400" />
                <span>Tài Liệu Vận Hành</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Match Configuration & Stage Branding Control */}
      <AdminMatchConfigSection
        gameState={gameState}
        onOpenFullScheduleModal={onOpenEventSchedule}
        triggerToast={triggerToast}
      />
    </div>
  );
};
