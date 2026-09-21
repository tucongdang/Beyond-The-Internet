import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, query, orderBy, limit, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { 
  Clock, 
  UserPlus, 
  Send, 
  Zap, 
  Camera, 
  AlertCircle, 
  FileText, 
  Copy, 
  Download, 
  Trash2, 
  CheckCircle2, 
  Filter, 
  Search, 
  SlidersHorizontal, 
  FileSpreadsheet, 
  BarChart3, 
  Database, 
  Sparkles, 
  Layers, 
  ShieldCheck, 
  UserCheck, 
  Cpu, 
  ChevronDown, 
  ChevronRight,
  Code2,
  RefreshCw
} from 'lucide-react';
import { ActivityLogItem, ActivityLogCategory } from '../types';
import { exportAuditLogsToCSV, exportToJSON, exportToJSONLines } from '../utils/exportUtils';

export const AdminActivityLog: React.FC = () => {
  const [logs, setLogs] = useState<ActivityLogItem[]>([]);
  const [isClearDialogOpen, setIsClearDialogOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  
  // Research filter states
  const [activeCategory, setActiveCategory] = useState<ActivityLogCategory | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [limitCount, setLimitCount] = useState<number>(300);
  const [expandedLogIds, setExpandedLogIds] = useState<Set<string>>(new Set());
  const [autoScroll, setAutoScroll] = useState<boolean>(false);

  const notify = (message: string, type: 'success' | 'warning' | 'error' = 'success') => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 3500);
  };

  useEffect(() => {
    if (!db) return;
    
    const q = query(
      collection(db, 'activity_logs'),
      orderBy('timestamp', 'desc'),
      limit(limitCount)
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newLogs = snapshot.docs.map(docSnap => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          type: data.type || 'SYSTEM_EVENT',
          category: data.category || (
            data.type?.startsWith('ADMIN_') ? 'ADMIN_CONTROL' :
            data.type === 'QUESTION_SUBMITTED' || data.type === 'USER_JOINED' ? 'USER_INTERACTION' :
            data.type === 'CHEER_PEAK' || data.type === 'SCREENSHOT_SAVED' ? 'SYSTEM_TELEMETRY' :
            data.type === 'VCNV_PREDICTION' || data.type === 'VCNV_REVEAL' ? 'VCNV_WORKFLOW' :
            data.type === 'EMERGENCY_POLL' ? 'POLL_SURVEY' :
            data.type === 'LUCKY_DRAW_WIN' ? 'LUCKY_DRAW' : 'GENERAL'
          ),
          title: data.title || '',
          description: data.description || '',
          timestamp: data.timestamp || Date.now(),
          timestamp_iso: data.timestamp_iso || new Date(data.timestamp || Date.now()).toISOString(),
          actor_id: data.actor_id || data.metadata?.uid || '',
          actor_role: data.actor_role || (data.type?.startsWith('ADMIN_') ? 'ADMIN' : 'AUDIENCE'),
          actor_name: data.actor_name || data.metadata?.name || '',
          round_id: data.round_id || data.metadata?.round_name || '',
          question_id: data.question_id || data.metadata?.questionId || data.metadata?.question_id || '',
          latency_ms: data.latency_ms ?? (data.metadata?.latency_sec ? Math.round(data.metadata.latency_sec * 1000) : undefined),
          score_delta: data.score_delta ?? data.metadata?.score_delta,
          research_tags: data.research_tags || [],
          metadata: data.metadata || {}
        };
      }) as ActivityLogItem[];
      setLogs(newLogs);
    }, (error) => {
      console.warn('Firestore activity_logs listener error:', error);
    });

    return () => unsubscribe();
  }, [limitCount]);

  // Toggle JSON details expansion
  const toggleExpand = (id: string) => {
    setExpandedLogIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Filter logs based on category and search query
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      if (activeCategory !== 'ALL' && log.category !== activeCategory) {
        return false;
      }
      if (!searchQuery.trim()) return true;

      const q = searchQuery.toLowerCase();
      const matchText = (
        (log.title || '') + ' ' +
        (log.description || '') + ' ' +
        (log.type || '') + ' ' +
        (log.actor_name || '') + ' ' +
        (log.actor_id || '') + ' ' +
        (log.question_id || '') + ' ' +
        (log.round_id || '') + ' ' +
        JSON.stringify(log.metadata || {})
      ).toLowerCase();

      return matchText.includes(q);
    });
  }, [logs, activeCategory, searchQuery]);

  // Research metrics summary
  const stats = useMemo(() => {
    const total = logs.length;
    let adminCount = 0;
    let userRespCount = 0;
    let vcnvPollCount = 0;
    let systemCount = 0;
    let totalLatencyMs = 0;
    let latencySampleCount = 0;

    logs.forEach(l => {
      if (l.category === 'ADMIN_CONTROL' || l.type.startsWith('ADMIN_')) adminCount++;
      else if (l.category === 'USER_INTERACTION' || l.type === 'QUESTION_SUBMITTED') {
        userRespCount++;
        if (typeof l.latency_ms === 'number' && l.latency_ms > 0) {
          totalLatencyMs += l.latency_ms;
          latencySampleCount++;
        }
      } else if (l.category === 'VCNV_WORKFLOW' || l.category === 'POLL_SURVEY') {
        vcnvPollCount++;
      } else {
        systemCount++;
      }
    });

    const meanLatencySec = latencySampleCount > 0 
      ? (totalLatencyMs / latencySampleCount / 1000).toFixed(2)
      : '0.00';

    return {
      total,
      adminCount,
      userRespCount,
      vcnvPollCount,
      systemCount,
      meanLatencySec,
      latencySampleCount
    };
  }, [logs]);

  const getCategoryBadge = (cat?: ActivityLogCategory) => {
    switch (cat) {
      case 'ADMIN_CONTROL':
        return <span className="px-2 py-0.5 text-[10px] font-bold rounded-[2px] bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">QUẢN TRỊ (ADMIN)</span>;
      case 'USER_INTERACTION':
        return <span className="px-2 py-0.5 text-[10px] font-bold rounded-[2px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">NGƯỜI CHƠI (USER)</span>;
      case 'PSYCHOMETRICS':
        return <span className="px-2 py-0.5 text-[10px] font-bold rounded-[2px] bg-purple-500/20 text-purple-300 border border-purple-500/30">ĐỘ KHÓ (ITEM)</span>;
      case 'VCNV_WORKFLOW':
        return <span className="px-2 py-0.5 text-[10px] font-bold rounded-[2px] bg-amber-500/20 text-amber-300 border border-amber-500/30">VCNV CHƯỚNG NGẠI VẬT</span>;
      case 'POLL_SURVEY':
        return <span className="px-2 py-0.5 text-[10px] font-bold rounded-[2px] bg-pink-500/20 text-pink-300 border border-pink-500/30">THĂM DÒ (POLL)</span>;
      case 'LUCKY_DRAW':
        return <span className="px-2 py-0.5 text-[10px] font-bold rounded-[2px] bg-yellow-500/20 text-yellow-300 border border-yellow-500/30">VÒNG QUAY</span>;
      default:
        return <span className="px-2 py-0.5 text-[10px] font-bold rounded-[2px] bg-slate-500/20 text-slate-300 border border-slate-500/30">HỆ THỐNG (SYSTEM)</span>;
    }
  };

  const getIcon = (type: string, cat?: ActivityLogCategory) => {
    if (cat === 'ADMIN_CONTROL' || type.startsWith('ADMIN_')) return <ShieldCheck className="w-4 h-4 text-cyan-400" />;
    if (type === 'USER_JOINED') return <UserPlus className="w-4 h-4 text-blue-400" />;
    if (type === 'QUESTION_SUBMITTED') return <Send className="w-4 h-4 text-emerald-400" />;
    if (type === 'CHEER_PEAK') return <Zap className="w-4 h-4 text-amber-400" />;
    if (type === 'SCREENSHOT_SAVED') return <Camera className="w-4 h-4 text-purple-400" />;
    if (type === 'EMERGENCY_POLL') return <BarChart3 className="w-4 h-4 text-pink-400" />;
    if (type === 'LUCKY_DRAW_WIN') return <Sparkles className="w-4 h-4 text-yellow-400" />;
    return <FileText className="w-4 h-4 text-slate-400" />;
  };

  const handleCopyLogItem = (log: ActivityLogItem) => {
    const text = `[${log.timestamp_iso || new Date(log.timestamp).toISOString()}] [${log.category || 'GENERAL'}] ${log.type} | Actor: ${log.actor_name || log.actor_id || 'System'} | Q_ID: ${log.question_id || 'N/A'} | Title: ${log.title} | Desc: ${log.description} | Metadata: ${JSON.stringify(log.metadata || {})}`;
    navigator.clipboard.writeText(text).then(() => {
      notify('Đã sao chép bản ghi nhật ký nghiên cứu vào clipboard');
    }).catch(() => {
      notify('Lỗi sao chép', 'error');
    });
  };

  const handleExportResearchCSV = () => {
    if (logs.length === 0) {
      notify('Không có dữ liệu nhật ký để xuất', 'warning');
      return;
    }
    exportAuditLogsToCSV(logs, `BTI2026_Audit_Research_Log_${new Date().toISOString().slice(0, 10)}.csv`);
    notify('Đã xuất thành công tệp CSV Nghiên Cứu & Audit Log');
  };

  const handleExportFilteredCSV = () => {
    if (filteredLogs.length === 0) {
      notify('Bộ lọc hiện tại không có dữ liệu để xuất', 'warning');
      return;
    }
    exportAuditLogsToCSV(filteredLogs, `BTI2026_Audit_Filtered_${activeCategory}_${new Date().toISOString().slice(0, 10)}.csv`);
    notify(`Đã xuất ${filteredLogs.length} bản ghi theo bộ lọc`);
  };

  const handleExportJSON = () => {
    if (logs.length === 0) {
      notify('Không có dữ liệu để xuất', 'warning');
      return;
    }
    exportToJSON({
      exportedAt: new Date().toISOString(),
      recordCount: logs.length,
      researchSummary: stats,
      activityLogs: logs
    }, `BTI2026_Audit_Action_Log_${new Date().toISOString().slice(0, 10)}.json`);
    notify('Đã xuất JSON Dump đầy đủ cho R / Python');
  };

  const handleExportJSONL = () => {
    if (logs.length === 0) {
      notify('Không có dữ liệu để xuất', 'warning');
      return;
    }
    exportToJSONLines(logs, `BTI2026_Audit_Action_Log_${new Date().toISOString().slice(0, 10)}.jsonl`);
    notify('Đã xuất JSON Lines cho Pandas / Spark');
  };

  const handleClearLogs = async () => {
    setIsClearDialogOpen(false);
    if (!db) return;
    
    notify('Đang tiến hành dọn dẹp toàn bộ nhật ký...', 'warning');
    
    let deletedCount = 0;
    for (const log of logs) {
      if (!log.id) continue;
      try {
        await deleteDoc(doc(db, 'activity_logs', log.id));
        deletedCount++;
      } catch (error) {
        console.error("Error deleting log", error);
      }
    }
    notify(`Đã dọn sạch thành công ${deletedCount} bản ghi nhật ký`);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header Context Box */}
      <div className="fluent-box rounded-[2px] border border-cyan-500/30 p-4 sm:p-5 bg-gradient-to-r from-[#004E8C]/30 to-purple-900/30 backdrop-blur-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-cyan-400" />
              <h2 className="text-base sm:text-lg font-black text-white tracking-wide uppercase">
                Trung Tâm Nhật Ký & Dữ Liệu Nghiên Cứu (Audit Action & Research Logs)
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-white/70 leading-relaxed max-w-4xl">
              Lưu vết thời gian thực mọi thao tác Ban Tổ Chức (chuyển câu, khóa nhận bài, công bố đáp án), phản xạ tương tác của người chơi (độ trễ phản hồi ms), thăm dò ý kiến và dữ liệu phân tích Item phục vụ <strong>giải trình khiếu nại</strong> &amp; <strong>công bố nghiên cứu khoa học (SPSS, R, Python)</strong>.
            </p>
          </div>

          {/* Quick Export Suite Buttons */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              onClick={handleExportResearchCSV}
              className="px-3 py-2 text-xs font-bold rounded-[2px] bg-cyan-600 hover:bg-cyan-500 text-white flex items-center gap-2 shadow-lg transition cursor-pointer border border-cyan-400/40"
              title="Xuất tệp CSV Nghiên Cứu & Audit Log đầy đủ"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Xuất CSV Nghiên Cứu</span>
            </button>
            <button
              onClick={handleExportJSON}
              className="px-3 py-2 text-xs font-bold rounded-[2px] fluent-box-nested hover:bg-white/20 text-white flex items-center gap-2 transition cursor-pointer border border-white/15"
              title="Xuất Full JSON Dump cho R / Python / SPSS"
            >
              <Database className="w-4 h-4 text-purple-300" />
              <span>Xuất JSON</span>
            </button>
            <button
              onClick={handleExportJSONL}
              className="px-2.5 py-2 text-xs font-bold rounded-[2px] fluent-box-nested hover:bg-white/20 text-white/80 hover:text-white flex items-center gap-1.5 transition cursor-pointer border border-white/10"
              title="Xuất JSON Lines (.jsonl)"
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>JSONL</span>
            </button>
          </div>
        </div>
      </div>

      {/* Research Statistical Summary KPI Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3">
        <div className="fluent-box-nested rounded-[2px] border border-white/10 p-3 flex flex-col justify-center text-center shadow-lg">
          <span className="text-[11px] text-slate-400 font-semibold mb-1 flex items-center justify-center gap-1">
            <Layers className="w-3.5 h-3.5 text-cyan-400" /> Dung Lượng Mẫu (N)
          </span>
          <span className="text-xl sm:text-2xl font-black text-white">{stats.total}</span>
          <span className="text-[10px] text-white/40 mt-0.5">Biến cố ghi nhận</span>
        </div>

        <div className="fluent-box-nested rounded-[2px] border border-white/10 p-3 flex flex-col justify-center text-center shadow-lg">
          <span className="text-[11px] text-slate-400 font-semibold mb-1 flex items-center justify-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" /> Thao Tác BTC
          </span>
          <span className="text-xl sm:text-2xl font-black text-cyan-400">{stats.adminCount}</span>
          <span className="text-[10px] text-white/40 mt-0.5">Đổi câu, Khóa, Reveal</span>
        </div>

        <div className="fluent-box-nested rounded-[2px] border border-white/10 p-3 flex flex-col justify-center text-center shadow-lg">
          <span className="text-[11px] text-slate-400 font-semibold mb-1 flex items-center justify-center gap-1">
            <Send className="w-3.5 h-3.5 text-emerald-400" /> Lượt Phản Hồi
          </span>
          <span className="text-xl sm:text-2xl font-black text-emerald-400">{stats.userRespCount}</span>
          <span className="text-[10px] text-white/40 mt-0.5">Bài nộp thí sinh</span>
        </div>

        <div className="fluent-box-nested rounded-[2px] border border-white/10 p-3 flex flex-col justify-center text-center shadow-lg">
          <span className="text-[11px] text-slate-400 font-semibold mb-1 flex items-center justify-center gap-1">
            <Clock className="w-3.5 h-3.5 text-amber-400" /> Phản Xạ TB (RT)
          </span>
          <span className="text-xl sm:text-2xl font-black text-amber-400">{stats.meanLatencySec}s</span>
          <span className="text-[10px] text-white/40 mt-0.5">{stats.latencySampleCount} mẫu đo lường</span>
        </div>

        <div className="fluent-box-nested rounded-[2px] border border-white/10 p-3 flex flex-col justify-center text-center shadow-lg">
          <span className="text-[11px] text-slate-400 font-semibold mb-1 flex items-center justify-center gap-1">
            <BarChart3 className="w-3.5 h-3.5 text-pink-400" /> VCNV &amp; Poll
          </span>
          <span className="text-xl sm:text-2xl font-black text-pink-400">{stats.vcnvPollCount}</span>
          <span className="text-[10px] text-white/40 mt-0.5">Dự đoán &amp; Thăm dò</span>
        </div>

        <div className="fluent-box-nested rounded-[2px] border border-white/10 p-3 flex flex-col justify-center text-center shadow-lg">
          <span className="text-[11px] text-slate-400 font-semibold mb-1 flex items-center justify-center gap-1">
            <Cpu className="w-3.5 h-3.5 text-purple-400" /> Telemetry &amp; Log
          </span>
          <span className="text-xl sm:text-2xl font-black text-purple-400">{stats.systemCount}</span>
          <span className="text-[10px] text-white/40 mt-0.5">Snapshot, Cheer, Sync</span>
        </div>
      </div>

      {/* Main Research Log Explorer Card */}
      <div className="fluent-box rounded-[2px] border border-white/10 shadow-2xl flex flex-col min-h-[640px]">
        {/* Navigation & Research Category Filter Tabs */}
        <div className="p-3 sm:p-4 border-b border-white/10 bg-black/20 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Category Tabs */}
          <div className="flex flex-wrap items-center gap-1 sm:gap-1.5">
            <button
              onClick={() => setActiveCategory('ALL')}
              className={`px-3 py-1.5 text-xs font-bold rounded-[2px] transition cursor-pointer ${
                activeCategory === 'ALL'
                  ? 'bg-cyan-500 text-slate-950 shadow-md font-black'
                  : 'fluent-box-nested text-white/70 hover:text-white hover:bg-white/10 border border-white/10'
              }`}
            >
              Tất Cả ({logs.length})
            </button>
            <button
              onClick={() => setActiveCategory('ADMIN_CONTROL')}
              className={`px-3 py-1.5 text-xs font-bold rounded-[2px] transition cursor-pointer flex items-center gap-1.5 ${
                activeCategory === 'ADMIN_CONTROL'
                  ? 'bg-cyan-500 text-slate-950 shadow-md font-black'
                  : 'fluent-box-nested text-cyan-300/80 hover:text-cyan-200 hover:bg-white/10 border border-cyan-500/20'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Quản Trị BTC ({stats.adminCount})</span>
            </button>
            <button
              onClick={() => setActiveCategory('USER_INTERACTION')}
              className={`px-3 py-1.5 text-xs font-bold rounded-[2px] transition cursor-pointer flex items-center gap-1.5 ${
                activeCategory === 'USER_INTERACTION'
                  ? 'bg-emerald-500 text-slate-950 shadow-md font-black'
                  : 'fluent-box-nested text-emerald-300/80 hover:text-emerald-200 hover:bg-white/10 border border-emerald-500/20'
              }`}
            >
              <Send className="w-3.5 h-3.5" />
              <span>Thí Sinh ({stats.userRespCount})</span>
            </button>
            <button
              onClick={() => setActiveCategory('VCNV_WORKFLOW')}
              className={`px-3 py-1.5 text-xs font-bold rounded-[2px] transition cursor-pointer flex items-center gap-1.5 ${
                activeCategory === 'VCNV_WORKFLOW'
                  ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                  : 'fluent-box-nested text-amber-300/80 hover:text-amber-200 hover:bg-white/10 border border-amber-500/20'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>VCNV</span>
            </button>
            <button
              onClick={() => setActiveCategory('POLL_SURVEY')}
              className={`px-3 py-1.5 text-xs font-bold rounded-[2px] transition cursor-pointer flex items-center gap-1.5 ${
                activeCategory === 'POLL_SURVEY'
                  ? 'bg-pink-500 text-slate-950 shadow-md font-black'
                  : 'fluent-box-nested text-pink-300/80 hover:text-pink-200 hover:bg-white/10 border border-pink-500/20'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Khảo Sát Poll</span>
            </button>
            <button
              onClick={() => setActiveCategory('SYSTEM_TELEMETRY')}
              className={`px-3 py-1.5 text-xs font-bold rounded-[2px] transition cursor-pointer flex items-center gap-1.5 ${
                activeCategory === 'SYSTEM_TELEMETRY'
                  ? 'bg-purple-500 text-slate-950 shadow-md font-black'
                  : 'fluent-box-nested text-purple-300/80 hover:text-purple-200 hover:bg-white/10 border border-purple-500/20'
              }`}
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>Hệ Thống</span>
            </button>
          </div>

          {/* Action Tools */}
          <div className="flex items-center gap-2">
            {activeCategory !== 'ALL' && (
              <button
                onClick={handleExportFilteredCSV}
                className="px-2.5 py-1.5 text-xs rounded-[2px] fluent-box-nested hover:bg-white/15 text-white flex items-center gap-1.5 transition cursor-pointer border border-white/10"
                title="Xuất CSV cho nhóm đang lọc"
              >
                <Download className="w-3.5 h-3.5 text-cyan-300" />
                <span>Xuất nhóm lọc</span>
              </button>
            )}

            <button
              onClick={() => setIsClearDialogOpen(true)}
              className="px-2.5 py-1.5 text-xs rounded-[2px] bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 flex items-center gap-1.5 transition cursor-pointer"
              title="Xóa tất cả bản ghi nhật ký khỏi database"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Xóa hết</span>
            </button>
          </div>
        </div>

        {/* Search Bar & Secondary Controls */}
        <div className="p-3 sm:p-4 border-b border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 bg-white/[0.02]">
          <div className="relative w-full sm:max-w-md">
            <Search className="w-4 h-4 text-[#F7CAC9] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm theo MSSV, Tên thí sinh, Q_ID, Action code..."
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-[2px] fluent-box-nested border border-white/10 text-white placeholder-white/40 focus:outline-none focus:border-cyan-400"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white text-xs"
              >
                ×
              </button>
            )}
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
            <div className="flex items-center gap-1.5 text-xs text-white/60">
              <span>Hiển thị tối đa:</span>
              <select
                value={limitCount}
                onChange={(e) => setLimitCount(Number(e.target.value))}
                className="fluent-box-nested text-xs rounded-[2px] px-2 py-1 text-white border border-white/10 bg-transparent focus:outline-none"
              >
                <option value={100} className="bg-slate-900 text-white">100 bản ghi</option>
                <option value={300} className="bg-slate-900 text-white">300 bản ghi</option>
                <option value={500} className="bg-slate-900 text-white">500 bản ghi</option>
                <option value={1000} className="bg-slate-900 text-white">1000 bản ghi</option>
              </select>
            </div>

            <span className="text-xs text-white/50 font-mono">
              {filteredLogs.length} / {logs.length} bản ghi
            </span>
          </div>
        </div>

        {/* Log Entries Stream Table */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2.5 custom-scrollbar max-h-[600px]">
          {filteredLogs.map((log, idx) => {
            const isExpanded = log.id ? expandedLogIds.has(log.id) : false;
            const hasMetadata = log.metadata && Object.keys(log.metadata).length > 0;

            return (
              <div
                key={log.id || `${log.timestamp}-${idx}`}
                className="fluent-box-nested border border-white/10 rounded-[2px] p-3 hover:bg-white/[0.08] transition relative group"
              >
                <div className="flex items-start justify-between gap-3">
                  {/* Left: Icon & Core Content */}
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="mt-0.5 shrink-0 p-1.5 rounded-[2px] fluent-box border border-white/10">
                      {getIcon(log.type, log.category)}
                    </div>

                    <div className="flex-1 min-w-0 space-y-1">
                      {/* Top Badges & Timestamps */}
                      <div className="flex flex-wrap items-center gap-2">
                        {getCategoryBadge(log.category)}
                        
                        <span className="text-[11px] font-mono font-bold text-slate-300 bg-white/10 px-1.5 py-0.5 rounded-[2px]">
                          {log.type}
                        </span>

                        {log.question_id && (
                          <span className="text-[10px] font-mono text-cyan-300 bg-cyan-950/60 border border-cyan-500/30 px-1.5 py-0.5 rounded-[2px]">
                            Q_ID: {log.question_id}
                          </span>
                        )}

                        {log.actor_role && (
                          <span className="text-[10px] text-white/60 bg-white/5 px-1.5 py-0.5 rounded-[2px]">
                            Actor: {log.actor_role} {log.actor_name ? `(${log.actor_name})` : ''}
                          </span>
                        )}

                        {typeof log.latency_ms === 'number' && log.latency_ms > 0 && (
                          <span className="text-[10px] font-mono text-amber-300 bg-amber-950/60 border border-amber-500/30 px-1.5 py-0.5 rounded-[2px]">
                            RT: {(log.latency_ms / 1000).toFixed(3)}s ({log.latency_ms}ms)
                          </span>
                        )}
                      </div>

                      {/* Log Title & Description */}
                      <div className="text-sm font-bold text-white leading-snug">
                        {log.title}
                      </div>

                      <p className="text-xs text-slate-300/80 leading-relaxed break-words">
                        {log.description}
                      </p>

                      {/* Expandable JSON Metadata Inspector */}
                      {hasMetadata && (
                        <div className="pt-1">
                          <button
                            onClick={() => log.id && toggleExpand(log.id)}
                            className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-mono cursor-pointer"
                          >
                            {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                            <span>{isExpanded ? 'Ẩn thông số JSON chi tiết' : 'Xem thông số JSON (Metadata / Payload)'}</span>
                          </button>

                          {isExpanded && (
                            <div className="mt-2 fluent-box p-2.5 rounded-[2px] text-[11px] font-mono text-cyan-200/90 overflow-x-auto border border-cyan-500/20 bg-slate-950/80 max-h-48 custom-scrollbar">
                              <pre className="whitespace-pre-wrap">{JSON.stringify(log.metadata, null, 2)}</pre>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right: Timestamp & Action buttons */}
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <div className="text-right">
                      <div className="text-xs font-mono font-bold text-white/80">
                        {new Date(log.timestamp).toLocaleTimeString('vi-VN', {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                          fractionalSecondDigits: 3
                        })}
                      </div>
                      <div className="text-[10px] font-mono text-white/40">
                        {new Date(log.timestamp).toISOString().slice(0, 10)}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleCopyLogItem(log)}
                        className="p-1.5 rounded-[2px] fluent-box-nested hover:bg-white/20 text-slate-300 hover:text-white transition cursor-pointer border border-white/10"
                        title="Sao chép chi tiết bản ghi (Audit Log Format)"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {filteredLogs.length === 0 && (
            <div className="text-center text-slate-400 py-16 text-sm space-y-2">
              <FileText className="w-8 h-8 text-white/20 mx-auto" />
              <div>Không tìm thấy bản ghi nhật ký nào phù hợp với bộ lọc</div>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="text-xs text-cyan-400 underline cursor-pointer"
                >
                  Xóa từ khóa tìm kiếm
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Clear Confirmation Dialog */}
      {isClearDialogOpen && (
        <div className="fluent-dialog-overlay animate-fadeIn">
          <div className="max-w-md w-full fluent-box border border-rose-500/40 rounded-[2px] p-6 shadow-2xl text-white space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <AlertCircle className="w-6 h-6 shrink-0" />
              <h3 className="font-black text-lg text-white">Xóa Toàn Bộ Nhật Ký Nghiên Cứu?</h3>
            </div>
            <p className="text-white/70 text-sm leading-relaxed">
              Hành động này sẽ xóa vĩnh viễn tất cả <strong>{logs.length} bản ghi</strong> nhật ký hoạt động (Audit Action Logs) trên cơ sở dữ liệu. Dữ liệu sau khi xóa sẽ không thể phục hồi. Bạn đã chắc chắn xuất dữ liệu dự phòng chưa?
            </p>
            <div className="pt-2 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsClearDialogOpen(false)}
                className="px-4 py-2 rounded-[2px] fluent-box-nested hover:bg-white/20 text-white font-bold text-sm transition cursor-pointer border border-white/10"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleClearLogs}
                className="px-4 py-2 rounded-[2px] bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm transition shadow-lg cursor-pointer"
              >
                Xác nhận Xóa Hết
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-[350] fluent-box border border-cyan-500/40 text-cyan-200 px-4 py-3 rounded-[2px] shadow-2xl flex items-center gap-2 animate-fadeIn text-sm">
          <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};
