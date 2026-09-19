import React, { useState, useMemo } from 'react';
import {
  History,
  BarChart3,
  AlertOctagon,
  CheckCircle2,
  Users,
  Award,
  GraduationCap,
  Flame,
  Radio,
  Download,
  Copy,
  Trash2,
  Play,
  Search,
  Filter,
  Sparkles,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  FileSpreadsheet,
  Clock,
  ArrowUpRight,
  ShieldCheck,
  Zap,
  ThumbsUp,
  ThumbsDown,
  Activity,
  AlertCircle
} from 'lucide-react';
import { GameState, EmergencyPollHistoryItem, EmergencyPollSourceType, UserResponse } from '../types';
import { syncService } from '../services/syncService';
import { soundFx } from '../services/audioEffects';
import { vibrateSelection, vibrateSuccess, vibrateWarning, vibrateTap } from '../utils/hapticUtils';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from 'recharts';

interface PollHistoryTabProps {
  gameState: GameState;
  allResponses?: Record<string, Record<string, UserResponse>>;
  activeCount: number;
  onRelaunchPoll?: (pollData: {
    question: string;
    type: 'YES_NO' | 'TRUE_FALSE' | 'CUSTOM_2' | 'AGREE_DISAGREE';
    options: { A: string; B: string };
    time_limit: number;
    source_type?: EmergencyPollSourceType;
    source_name?: string;
    context_note?: string;
  }) => void;
}


const SOURCE_CONFIG: Record<
  EmergencyPollSourceType,
  { label: string; icon: React.ComponentType<{ className?: string }>; badgeBg: string; border: string; text: string }
> = {
  ADVISOR: {
    label: 'Cố vấn chuyên môn',
    icon: GraduationCap,
    badgeBg: 'fluent-box-nested',
    border: 'border-sky-500/40',
    text: 'text-sky-300'
  },
  CONTESTANT: {
    label: 'Thí sinh / Đội thi',
    icon: Flame,
    badgeBg: 'fluent-box-nested',
    border: 'border-amber-500/40',
    text: 'text-amber-300'
  },
  JURY: {
    label: 'Ban Giám Khảo',
    icon: Award,
    badgeBg: 'fluent-box-nested',
    border: 'border-purple-500/40',
    text: 'text-purple-300'
  },
  AUDIENCE: {
    label: 'Khán giả hội trường',
    icon: Users,
    badgeBg: 'fluent-box-nested',
    border: 'border-emerald-500/40',
    text: 'text-emerald-300'
  },
  HOST: {
    label: 'MC / Ban Tổ Chức',
    icon: Radio,
    badgeBg: 'fluent-box-nested',
    border: 'border-rose-500/40',
    text: 'text-rose-300'
  }
};

const getSentimentInfo = (item: EmergencyPollHistoryItem) => {
  if (item.totalVotes === 0) {
    return {
      label: 'Không có data',
      className: 'bg-slate-500/20 text-slate-300 border-slate-500/40',
      icon: Activity
    };
  }
  
  if (item.percentA >= 60) {
    return {
      label: 'Tích cực',
      className: 'fluent-box-nested text-emerald-300 border-emerald-500/40',
      icon: ThumbsUp
    };
  } else if (item.percentB >= 60) {
    return {
      label: 'Tiêu cực',
      className: 'fluent-box-nested text-rose-300 border-rose-500/40',
      icon: ThumbsDown
    };
  } else {
    return {
      label: 'Trái chiều',
      className: 'fluent-box-nested text-amber-300 border-amber-500/40',
      icon: Activity
    };
  }
};

export const PollHistoryTab: React.FC<PollHistoryTabProps> = ({
  gameState,
  allResponses,
  activeCount,
  onRelaunchPoll
}) => {
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isClearHistoryDialogOpen, setIsClearHistoryDialogOpen] = useState(false);
  const [deleteTargetPollId, setDeleteTargetPollId] = useState<string | null>(null);


  const notify = (message: string, intent: 'success' | 'warning' | 'error' = 'success') => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const [searchTerm, setSearchTerm] = useState('');
  const [sourceFilter, setSourceFilter] = useState<'ALL' | EmergencyPollSourceType>('ALL');
  const [expandedPollId, setExpandedPollId] = useState<string | null>(null);
  const [voterFilterChoice, setVoterFilterChoice] = useState<'ALL' | 'A' | 'B'>('ALL');
  const [copiedId, setCopiedId] = useState<string | null>(null);


  // Derive consolidated history from GameState and any unarchived active responses
  const historyList: EmergencyPollHistoryItem[] = useMemo(() => {
    const list = [...(gameState.emergency_poll_history || [])];

    // Check if there's an active/revealed poll not yet in history
    const currentPoll = gameState.emergency_poll;
    if (currentPoll && currentPoll.status !== 'DISMISSED') {
      const alreadyInHistory = list.some(item => item.id === currentPoll.id);
      if (!alreadyInHistory) {
        const liveResponses = currentPoll.id
          ? (allResponses?.[`EMERGENCY_POLL_${currentPoll.id}`] as Record<string, UserResponse>) || {}
          : {};
        const votesList = Object.values(liveResponses);
        const totalVotes = votesList.length;
        const countA = votesList.filter(v => v.choice === 'A').length;
        const countB = votesList.filter(v => v.choice === 'B').length;
        const percentA = totalVotes > 0 ? Math.round((countA / totalVotes) * 100) : 0;
        const percentB = totalVotes > 0 ? Math.round((countB / totalVotes) * 100) : 0;

        let dominantChoice: 'A' | 'B' | 'EQUAL' | 'NONE' = 'NONE';
        if (totalVotes > 0) {
          if (countA > countB) dominantChoice = 'A';
          else if (countB > countA) dominantChoice = 'B';
          else dominantChoice = 'EQUAL';
        }

        list.unshift({
          id: currentPoll.id,
          question: currentPoll.question,
          type: currentPoll.type,
          options: currentPoll.options,
          time_limit: currentPoll.time_limit,
          source_type: currentPoll.source_type,
          source_name: currentPoll.source_name,
          context_note: currentPoll.context_note,
          created_at: currentPoll.created_at,
          completed_at: Date.now(),
          totalVotes,
          countA,
          countB,
          percentA,
          percentB,
          dominantChoice,
          round_context: 'Đang phát sóng trực tiếp',
          responses: liveResponses
        });
      }
    }

    return list.sort((a, b) => (b.created_at || 0) - (a.created_at || 0));
  }, [gameState.emergency_poll_history, gameState.emergency_poll, allResponses]);

  // Aggregate high-level statistics
  const totalPolls = historyList.length;
  const totalVotesAcrossAll = historyList.reduce((acc, curr) => acc + (curr.totalVotes || 0), 0);
  const avgVotes = totalPolls > 0 ? Math.round(totalVotesAcrossAll / totalPolls) : 0;

  const sourceCounts = useMemo(() => {
    const counts: Record<EmergencyPollSourceType, number> = {
      ADVISOR: 0,
      CONTESTANT: 0,
      JURY: 0,
      AUDIENCE: 0,
      HOST: 0
    };
    historyList.forEach(item => {
      const src = item.source_type || 'HOST';
      if (counts[src] !== undefined) counts[src]++;
    });
    return counts;
  }, [historyList]);

  // Filtered list based on search and source chip
  const filteredList = useMemo(() => {
    return historyList.filter(item => {
      if (sourceFilter !== 'ALL' && item.source_type !== sourceFilter) {
        return false;
      }
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchQuestion = item.question?.toLowerCase().includes(query);
        const matchSource = item.source_name?.toLowerCase().includes(query);
        const matchContext = item.context_note?.toLowerCase().includes(query);
        const matchOptions =
          item.options?.A?.toLowerCase().includes(query) ||
          item.options?.B?.toLowerCase().includes(query);
        return matchQuestion || matchSource || matchContext || matchOptions;
      }
      return true;
    });
  }, [historyList, sourceFilter, searchTerm]);

  // Copy structured summary of a poll
  const handleCopySummary = (item: EmergencyPollHistoryItem) => {
    vibrateSuccess();
    soundFx.playClick();

    const dateStr = new Date(item.created_at || Date.now()).toLocaleTimeString('vi-VN');
    const sourceLabel = item.source_name || (item.source_type ? SOURCE_CONFIG[item.source_type]?.label : 'MC');
    const text = `📊 [KẾT QUẢ KHẢO SÁT BTI 2026 - ${dateStr}]
❓ Câu hỏi: "${item.question}"
📌 Nguồn: ${sourceLabel} ${item.context_note ? `(${item.context_note})` : ''}
👥 Tổng số phiếu: ${item.totalVotes} phiếu
🅰️ Lựa chọn A: "${item.options.A}" - ${item.countA} phiếu (${item.percentA}%)
🅱️ Lựa chọn B: "${item.options.B}" - ${item.countB} phiếu (${item.percentB}%)
🏆 Kết luận: ${
      item.dominantChoice === 'A'
        ? `Lựa chọn A ("${item.options.A}") chiếm đa số (${item.percentA}%)`
        : item.dominantChoice === 'B'
        ? `Lựa chọn B ("${item.options.B}") chiếm đa số (${item.percentB}%)`
        : 'Kết quả cân bằng 50% - 50%'
    }`;

    navigator.clipboard.writeText(text);
    setCopiedId(item.id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  // Helper to trigger CSV file download with UTF-8 BOM
  const triggerCSVDownload = (filename: string, csvContent: string) => {
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Export summary of all polls to CSV
  const handleExportCSV = () => {
    vibrateSelection();
    soundFx.playClick();

    if (historyList.length === 0) {
      notify('Chưa có lịch sử khảo sát nào để xuất!');
      return;
    }

    const headers = [
      'STT',
      'Poll_ID',
      'Thoi_Gian_Tao',
      'Nguon_De_Xuat',
      'Nguoi_De_Xuat',
      'Ghi_Chu_Ngu_Canh',
      'Noi_Dung_Cau_Hoi',
      'Lua_Chon_A',
      'Lua_Chon_B',
      'Tong_So_Phieu',
      'So_Phieu_A',
      'Ty_Le_A',
      'So_Phieu_B',
      'Ty_Le_B',
      'Ket_Luan_Da_So',
      'Vong_Dau'
    ];

    const rows = historyList.map((p, idx) => [
      idx + 1,
      `"${p.id}"`,
      `"${new Date(p.created_at).toLocaleString('vi-VN')}"`,
      `"${p.source_type || 'HOST'}"`,
      `"${(p.source_name || '').replace(/"/g, '""')}"`,
      `"${(p.context_note || '').replace(/"/g, '""')}"`,
      `"${(p.question || '').replace(/"/g, '""')}"`,
      `"${(p.options.A || '').replace(/"/g, '""')}"`,
      `"${(p.options.B || '').replace(/"/g, '""')}"`,
      p.totalVotes,
      p.countA,
      `"${p.percentA}%"`,
      p.countB,
      `"${p.percentB}%"`,
      `"${p.dominantChoice}"`,
      `"${p.round_context || ''}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    triggerCSVDownload(`BTI2026_Tong_Hop_Lich_Su_Poll_${new Date().toISOString().slice(0, 10)}.csv`, csvContent);
  };

  // Export specific single poll with all individual voter details to CSV
  const handleExportSinglePollCSV = (item: EmergencyPollHistoryItem) => {
    vibrateSuccess();
    soundFx.playClick();

    const responses: Record<string, any> = item.responses || {};
    const voterEntries = Object.entries(responses);

    const headers = [
      'STT',
      'Ma_Khao_Sat',
      'Thoi_Gian_Tao',
      'Nguon_De_Xuat',
      'Nguoi_De_Xuat',
      'Ghi_Chu_Ngu_Canh',
      'Cau_Hoi',
      'Noi_Dung_Option_A',
      'Noi_Dung_Option_B',
      'UID_Cu_Tri',
      'Ho_Va_Ten',
      'MSSV',
      'Dap_An_Chon',
      'Ten_Dap_An_Chon',
      'Thoi_Gian_Phan_Hoi_Giay',
      'Thoi_Diem_Nop'
    ];

    let rows: string[][] = [];

    if (voterEntries.length === 0) {
      // If no individual voters, export metadata row with indicator
      rows.push([
        '1',
        `"${item.id}"`,
        `"${new Date(item.created_at).toLocaleString('vi-VN')}"`,
        `"${item.source_type || 'HOST'}"`,
        `"${(item.source_name || '').replace(/"/g, '""')}"`,
        `"${(item.context_note || '').replace(/"/g, '""')}"`,
        `"${(item.question || '').replace(/"/g, '""')}"`,
        `"${(item.options.A || '').replace(/"/g, '""')}"`,
        `"${(item.options.B || '').replace(/"/g, '""')}"`,
        '"N/A"',
        '"(Không có chi tiết từng cử tri)"',
        '"N/A"',
        `"Tổng A: ${item.countA} | Tổng B: ${item.countB}"`,
        `"Tổng ${item.totalVotes} phiếu"`,
        '0',
        `"${new Date(item.created_at).toLocaleString('vi-VN')}"`
      ]);
    } else {
      rows = voterEntries.map(([uid, res], idx) => {
        const choice = res?.choice || 'UNKNOWN';
        const choiceText = choice === 'A' ? item.options.A : choice === 'B' ? item.options.B : choice;
        const name = res?.user_info?.name || res?.name || 'Khán giả ẩn danh';
        const mssv = res?.user_info?.mssv || res?.mssv || '';
        const latency = typeof res?.latency_sec === 'number' ? res.latency_sec : typeof res?.time_taken === 'number' ? res.time_taken : '';
        const submitTime = res?.timestamp ? new Date(res.timestamp).toLocaleString('vi-VN') : new Date(item.created_at).toLocaleString('vi-VN');

        return [
          (idx + 1).toString(),
          `"${item.id}"`,
          `"${new Date(item.created_at).toLocaleString('vi-VN')}"`,
          `"${item.source_type || 'HOST'}"`,
          `"${(item.source_name || '').replace(/"/g, '""')}"`,
          `"${(item.context_note || '').replace(/"/g, '""')}"`,
          `"${(item.question || '').replace(/"/g, '""')}"`,
          `"${(item.options.A || '').replace(/"/g, '""')}"`,
          `"${(item.options.B || '').replace(/"/g, '""')}"`,
          `"${uid}"`,
          `"${name.replace(/"/g, '""')}"`,
          `"${mssv.replace(/"/g, '""')}"`,
          `"${choice}"`,
          `"${(choiceText || '').replace(/"/g, '""')}"`,
          latency !== '' ? latency.toString() : '""',
          `"${submitTime}"`
        ];
      });
    }

    const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const safePollId = (item.id || 'poll').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 16);
    triggerCSVDownload(`BTI2026_Chi_Tiet_Poll_${safePollId}_${Date.now()}.csv`, csvContent);
  };

  // Export current active question's live votes to CSV
  const handleExportActivePollCSV = () => {
    vibrateSuccess();
    soundFx.playClick();

    const activePoll = gameState.emergency_poll;
    if (!activePoll || activePoll.status === 'DISMISSED') {
      notify('Hiện không có câu hỏi khảo sát nào đang hoạt động!');
      return;
    }

    const pollResponsesMap: Record<string, any> = allResponses?.[`EMERGENCY_POLL_${activePoll.id}`] || {};
    const voterEntries = Object.entries(pollResponsesMap);

    const headers = [
      'STT',
      'Ma_Khao_Sat',
      'Trang_Thai_Hien_Tai',
      'Thoi_Gian_Phat',
      'Nguon_De_Xuat',
      'Nguoi_De_Xuat',
      'Ghi_Chu_Ngu_Canh',
      'Cau_Hoi',
      'Lua_Chon_A',
      'Lua_Chon_B',
      'UID_Cu_Tri',
      'Ho_Va_Ten',
      'MSSV',
      'Dap_An_Chon',
      'Ten_Dap_An_Chon',
      'Thoi_Gian_Phan_Hoi_Giay',
      'Thoi_Diem_Nop'
    ];

    let rows: string[][] = [];

    if (voterEntries.length === 0) {
      rows.push([
        '1',
        `"${activePoll.id}"`,
        `"${activePoll.status}"`,
        `"${new Date(activePoll.created_at).toLocaleString('vi-VN')}"`,
        `"${activePoll.source_type || 'HOST'}"`,
        `"${(activePoll.source_name || '').replace(/"/g, '""')}"`,
        `"${(activePoll.context_note || '').replace(/"/g, '""')}"`,
        `"${(activePoll.question || '').replace(/"/g, '""')}"`,
        `"${(activePoll.options.A || '').replace(/"/g, '""')}"`,
        `"${(activePoll.options.B || '').replace(/"/g, '""')}"`,
        '"N/A"',
        '"(Chưa có khán giả nào gửi câu trả lời)"',
        '"N/A"',
        '"CHƯA CÓ DỮ LIỆU"',
        '"CHƯA CÓ DỮ LIỆU"',
        '0',
        `"${new Date().toLocaleString('vi-VN')}"`
      ]);
    } else {
      rows = voterEntries.map(([uid, res], idx) => {
        const choice = res?.choice || 'UNKNOWN';
        const choiceText = choice === 'A' ? activePoll.options.A : choice === 'B' ? activePoll.options.B : choice;
        const name = res?.user_info?.name || res?.name || 'Khán giả ẩn danh';
        const mssv = res?.user_info?.mssv || res?.mssv || '';
        const latency = typeof res?.latency_sec === 'number' ? res.latency_sec : typeof res?.time_taken === 'number' ? res.time_taken : '';
        const submitTime = res?.timestamp ? new Date(res.timestamp).toLocaleString('vi-VN') : new Date().toLocaleString('vi-VN');

        return [
          (idx + 1).toString(),
          `"${activePoll.id}"`,
          `"${activePoll.status}"`,
          `"${new Date(activePoll.created_at).toLocaleString('vi-VN')}"`,
          `"${activePoll.source_type || 'HOST'}"`,
          `"${(activePoll.source_name || '').replace(/"/g, '""')}"`,
          `"${(activePoll.context_note || '').replace(/"/g, '""')}"`,
          `"${(activePoll.question || '').replace(/"/g, '""')}"`,
          `"${(activePoll.options.A || '').replace(/"/g, '""')}"`,
          `"${(activePoll.options.B || '').replace(/"/g, '""')}"`,
          `"${uid}"`,
          `"${name.replace(/"/g, '""')}"`,
          `"${mssv.replace(/"/g, '""')}"`,
          `"${choice}"`,
          `"${(choiceText || '').replace(/"/g, '""')}"`,
          latency !== '' ? latency.toString() : '""',
          `"${submitTime}"`
        ];
      });
    }

    const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    triggerCSVDownload(`BTI2026_Live_Votes_Cau_Hien_Tai_${Date.now()}.csv`, csvContent);
  };

  // Export all detailed voter records across all past polls into a single granular dataset
  const handleExportAllVotersGranularCSV = () => {
    vibrateSuccess();
    soundFx.playClick();

    if (historyList.length === 0) {
      notify('Chưa có lịch sử khảo sát nào để xuất!');
      return;
    }

    const headers = [
      'STT',
      'Ma_Khao_Sat',
      'Thoi_Gian_Tao',
      'Nguon_De_Xuat',
      'Nguoi_De_Xuat',
      'Ghi_Chu_Ngu_Canh',
      'Cau_Hoi',
      'Lua_Chon_A',
      'Lua_Chon_B',
      'UID_Cu_Tri',
      'Ho_Va_Ten',
      'MSSV',
      'Dap_An_Chon',
      'Ten_Dap_An_Chon',
      'Thoi_Gian_Phan_Hoi_Giay',
      'Thoi_Diem_Nop'
    ];

    const rows: string[][] = [];
    let counter = 1;

    historyList.forEach(item => {
      const responses: Record<string, any> = item.responses || {};
      const voterEntries = Object.entries(responses);

      if (voterEntries.length === 0) {
        rows.push([
          (counter++).toString(),
          `"${item.id}"`,
          `"${new Date(item.created_at).toLocaleString('vi-VN')}"`,
          `"${item.source_type || 'HOST'}"`,
          `"${(item.source_name || '').replace(/"/g, '""')}"`,
          `"${(item.context_note || '').replace(/"/g, '""')}"`,
          `"${(item.question || '').replace(/"/g, '""')}"`,
          `"${(item.options.A || '').replace(/"/g, '""')}"`,
          `"${(item.options.B || '').replace(/"/g, '""')}"`,
          '"N/A"',
          '"(Không có chi tiết từng cử tri)"',
          '"N/A"',
          `"Tổng A: ${item.countA} | Tổng B: ${item.countB}"`,
          `"Tổng ${item.totalVotes} phiếu"`,
          '0',
          `"${new Date(item.created_at).toLocaleString('vi-VN')}"`
        ]);
      } else {
        voterEntries.forEach(([uid, res]) => {
          const choice = res?.choice || 'UNKNOWN';
          const choiceText = choice === 'A' ? item.options.A : choice === 'B' ? item.options.B : choice;
          const name = res?.user_info?.name || res?.name || 'Khán giả ẩn danh';
          const mssv = res?.user_info?.mssv || res?.mssv || '';
          const latency = typeof res?.latency_sec === 'number' ? res.latency_sec : typeof res?.time_taken === 'number' ? res.time_taken : '';
          const submitTime = res?.timestamp ? new Date(res.timestamp).toLocaleString('vi-VN') : new Date(item.created_at).toLocaleString('vi-VN');

          rows.push([
            (counter++).toString(),
            `"${item.id}"`,
            `"${new Date(item.created_at).toLocaleString('vi-VN')}"`,
            `"${item.source_type || 'HOST'}"`,
            `"${(item.source_name || '').replace(/"/g, '""')}"`,
            `"${(item.context_note || '').replace(/"/g, '""')}"`,
            `"${(item.question || '').replace(/"/g, '""')}"`,
            `"${(item.options.A || '').replace(/"/g, '""')}"`,
            `"${(item.options.B || '').replace(/"/g, '""')}"`,
            `"${uid}"`,
            `"${name.replace(/"/g, '""')}"`,
            `"${mssv.replace(/"/g, '""')}"`,
            `"${choice}"`,
            `"${(choiceText || '').replace(/"/g, '""')}"`,
            latency !== '' ? latency.toString() : '""',
            `"${submitTime}"`
          ]);
        });
      }
    });

    const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    triggerCSVDownload(`BTI2026_Tat_Ca_Phieu_Bau_Chi_Tiet_${new Date().toISOString().slice(0, 10)}.csv`, csvContent);
  };

  // Export full JSON with detailed voter logs
  const handleExportJSON = () => {
    vibrateSelection();
    soundFx.playClick();

    if (historyList.length === 0) {
      notify('Chưa có lịch sử khảo sát nào để xuất!');
      return;
    }

    const jsonString = JSON.stringify(historyList, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `BTI2026_Emergency_Polls_Detailed_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Delete single poll from history
  // Clear all history
  return (
    <div id="poll-history-tab" className="space-y-6 animate-fadeIn text-[#e5e5e5]">
      {/* Top Bento Header Banner */}
      <section className="fluent-box border border-white/10 rounded-[4px] p-4 sm:p-6 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-4 border-b border-white/10">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-[4px] fluent-box-nested text-purple-300 font-mono text-[10px] font-bold border border-purple-500/40 uppercase tracking-widest">
                Real-Time Audience Sentiment Archive
              </span>
              <span className="text-xs text-white/40 font-mono">• BTI 2026 Telemetry</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2.5 tracking-tight font-mono">
              <History className="w-6 h-6 text-[#F7CAC9]" />
              LỊCH SỬ KHẢO SÁT TỨC THÌ (POLL HISTORY)
            </h2>
            <p className="text-xs text-white/60 max-w-3xl">
              Tra cứu và đối chiếu toàn bộ các câu hỏi thăm dò khẩn cấp, khảo sát ý kiến do Cố vấn, Thí sinh hoặc Ban Giám Khảo đề xuất trong suốt các vòng thi.
            </p>
          </div>

          {/* Action Toolbar */}
          <div className="flex flex-wrap items-center gap-2">
            {gameState.emergency_poll && gameState.emergency_poll.status !== 'DISMISSED' && (
              <button
                type="button"
                onClick={handleExportActivePollCSV}
                className="px-3.5 py-2 fluent-box hover:bg-white/15 border border-amber-500/50 text-amber-200 rounded-[4px] text-xs font-bold font-mono transition flex items-center gap-1.5 shadow-sm ring-1 ring-amber-500/30 animate-pulse cursor-pointer"
                title="Tải ngay file CSV toàn bộ phiếu bầu của câu hỏi đang diễn ra"
              >
                <Download className="w-3.5 h-3.5 text-amber-300" />
                <span>Tải CSV Poll Đang Chạy</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleExportCSV}
              className="px-3.5 py-2 fluent-box hover:bg-white/15 border border-emerald-500/40 text-emerald-300 rounded-[4px] text-xs font-bold font-mono transition flex items-center gap-1.5 shadow-sm cursor-pointer"
              title="Xuất bảng tổng kết thống kê các cuộc khảo sát sang file CSV (SPSS / Excel)"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Tải CSV (Tổng Hợp)</span>
            </button>

            <button
              type="button"
              onClick={handleExportAllVotersGranularCSV}
              className="px-3.5 py-2 fluent-box hover:bg-white/15 border border-sky-500/40 text-sky-300 rounded-[4px] text-xs font-bold font-mono transition flex items-center gap-1.5 shadow-sm cursor-pointer"
              title="Xuất file CSV chi tiết từng lượt bình chọn của toàn bộ các cuộc khảo sát"
            >
              <Users className="w-3.5 h-3.5" />
              <span>Tải CSV (Tất Cả Cử Tri)</span>
            </button>

            <button
              type="button"
              onClick={handleExportJSON}
              className="px-3.5 py-2 fluent-box hover:bg-white/15 border border-white/15 text-white rounded-[4px] text-xs font-bold font-mono transition flex items-center gap-1.5 cursor-pointer"
              title="Xuất file JSON kèm danh sách chi tiết người bình chọn"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Xuất JSON</span>
            </button>

            {historyList.length > 0 && (
              <button
                type="button"
                onClick={() => setIsClearHistoryDialogOpen(true)}
                className="px-3.5 py-2 fluent-box hover:bg-white/15 border border-rose-500/40 text-rose-300 rounded-[4px] text-xs font-bold font-mono transition flex items-center gap-1.5 cursor-pointer"
                title="Xóa toàn bộ lịch sử khảo sát"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Xóa Lịch Sử</span>
              </button>
            )}
          </div>
        </div>


        {/* 4 Bento KPI Metric Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-4">
          {/* Card 1 */}
          <div className="p-3.5 rounded-[4px] fluent-box-nested border border-white/10 space-y-1">
            <div className="text-[10px] font-mono uppercase tracking-wider text-white/50 flex items-center justify-between">
              <span>Tổng số cuộc khảo sát</span>
              <BarChart3 className="w-3.5 h-3.5 text-[#F7CAC9]" />
            </div>
            <div className="text-2xl font-black text-white font-mono">
              {totalPolls} <span className="text-xs font-normal text-white/40">cuộc</span>
            </div>
            <div className="text-[11px] text-[#F7CAC9]/80">
              Đã kích hoạt trong phiên
            </div>
          </div>

          {/* Card 2 */}
          <div className="p-3.5 rounded-[4px] fluent-box-nested border border-white/10 space-y-1">
            <div className="text-[10px] font-mono uppercase tracking-wider text-white/50 flex items-center justify-between">
              <span>Tổng lượt bình chọn</span>
              <Users className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="text-2xl font-black text-emerald-400 font-mono">
              {totalVotesAcrossAll} <span className="text-xs font-normal text-white/40">phiếu</span>
            </div>
            <div className="text-[11px] text-emerald-300/80">
              TB {avgVotes} phiếu / cuộc
            </div>
          </div>

          {/* Card 3 */}
          <div className="p-3.5 rounded-[4px] fluent-box-nested border border-white/10 space-y-1">
            <div className="text-[10px] font-mono uppercase tracking-wider text-white/50 flex items-center justify-between">
              <span>Khán phòng trực tuyến</span>
              <Zap className="w-3.5 h-3.5 text-sky-400" />
            </div>
            <div className="text-2xl font-black text-sky-400 font-mono">
              {activeCount} <span className="text-xs font-normal text-white/40">khán giả</span>
            </div>
            <div className="text-[11px] text-sky-300/80">
              Sẵn sàng phản hồi
            </div>
          </div>

          {/* Card 4: Source Breakdown */}
          <div className="p-3.5 rounded-[4px] fluent-box-nested border border-white/10 space-y-1.5">
            <div className="text-[10px] font-mono uppercase tracking-wider text-white/50">
              Nguồn khởi xướng
            </div>
            <div className="flex flex-wrap gap-1 text-[10px] font-mono font-bold">
              <span className="px-1.5 py-0.5 rounded-[2px] fluent-box text-sky-300 border border-sky-500/30">
                🎓 Cố vấn: {sourceCounts.ADVISOR}
              </span>
              <span className="px-1.5 py-0.5 rounded-[2px] fluent-box text-amber-300 border border-amber-500/30">
                ⚡ Thí sinh: {sourceCounts.CONTESTANT}
              </span>
              <span className="px-1.5 py-0.5 rounded-[2px] fluent-box text-purple-300 border border-purple-500/30">
                ⚖️ BGK: {sourceCounts.JURY}
              </span>
            </div>
          </div>
        </div>

        {/* Live Active Poll Quick-Access Banner (if currently running) */}
        {gameState.emergency_poll && gameState.emergency_poll.status !== 'DISMISSED' && (
          <div className="mt-4 p-4 rounded-[4px] fluent-acrylic-surface border border-amber-500/50 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-[4px] fluent-box-nested text-amber-300 border border-amber-500/40 text-[10px] font-mono font-black uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-[4px] bg-amber-400 animate-ping" />
                  🔴 CÂU HỎI ĐANG PHÁT TRỰC TIẾP
                </span>
                <span className="text-xs text-white/50 font-mono">
                  Trạng thái: <strong className="text-amber-200">{gameState.emergency_poll.status}</strong>
                </span>
              </div>
              <p className="text-sm font-bold text-white leading-snug">
                "{gameState.emergency_poll.question}"
              </p>
              <div className="text-xs text-white/70 flex items-center gap-3 pt-0.5 font-mono">
                <span>🅰️ {gameState.emergency_poll.options.A}: <strong className="text-emerald-400">{gameState.emergency_poll.counts?.A || 0} phiếu</strong></span>
                <span>🅱️ {gameState.emergency_poll.options.B}: <strong className="text-rose-400">{gameState.emergency_poll.counts?.B || 0} phiếu</strong></span>
                <span>👥 Tổng: <strong>{(gameState.emergency_poll.counts?.A || 0) + (gameState.emergency_poll.counts?.B || 0)} phiếu</strong></span>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 relative z-10">
              <button
                type="button"
                onClick={handleExportActivePollCSV}
                className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-[#190839] font-black rounded-[4px] text-xs font-mono transition flex items-center gap-1.5 shadow-md active:scale-95 cursor-pointer"
              >
                <Download className="w-4 h-4 text-[#190839]" />
                <span>Tải CSV Phiếu Bầu Câu Này</span>
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Filter & Search Bar */}
      <section className="fluent-box border border-white/10 rounded-[4px] p-4 space-y-3">
        <div className="flex flex-col md:flex-row items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#F7CAC9]" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Tìm kiếm theo từ khóa câu hỏi, tên Cố vấn/Thí sinh, hoặc ngữ cảnh..."
              className="w-full pl-10 pr-4 py-2 bg-[#0E051C]/60 border border-white/10 focus:border-[#F7CAC9] rounded-[4px] text-xs text-white placeholder-white/40 transition outline-none"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white text-xs cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>

          {/* Source Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 custom-scrollbar" onWheel={(e) => { if (e.deltaY !== 0) e.currentTarget.scrollLeft += e.deltaY; }}>
            <span className="text-[11px] font-mono text-white/40 uppercase tracking-wider shrink-0 flex items-center gap-1 mr-1">
              <Filter className="w-3.5 h-3.5" /> Lọc:
            </span>

            {[
              { id: 'ALL', label: `Tất cả (${historyList.length})` },
              { id: 'ADVISOR', label: `🎓 Cố vấn (${sourceCounts.ADVISOR})` },
              { id: 'CONTESTANT', label: `⚡ Thí sinh (${sourceCounts.CONTESTANT})` },
              { id: 'JURY', label: `⚖️ BGK (${sourceCounts.JURY})` },
              { id: 'AUDIENCE', label: `👥 Khán giả (${sourceCounts.AUDIENCE})` },
              { id: 'HOST', label: `🎙️ MC (${sourceCounts.HOST})` }
            ].map(chip => (
              <button
                key={chip.id}
                onClick={() => {
                  vibrateSelection();
                  setSourceFilter(chip.id as any);
                }}
                className={`px-3 py-1.5 rounded-[4px] text-xs font-bold font-mono transition shrink-0 cursor-pointer ${
                  sourceFilter === chip.id
                    ? 'bg-[#F7CAC9] text-[#190839]'
                    : 'fluent-box-nested hover:bg-white/15 text-white/60 border border-white/5'
                }`}
              >
                {chip.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Main List of Poll Cards */}
      {filteredList.length === 0 ? (
        <div className="p-12 text-center fluent-box border border-dashed border-white/15 rounded-[4px] space-y-4">
          <div className="w-16 h-16 rounded-[4px] fluent-box border border-purple-500/30 text-[#F7CAC9] mx-auto flex items-center justify-center">
            <History className="w-8 h-8 opacity-60" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-white">Chưa Có Dữ Liệu Khảo Sát Khẩn Cấp</h3>
            <p className="text-xs text-white/50 max-w-md mx-auto">
              Khi MC hoặc Host kích hoạt các câu hỏi thăm dò ý kiến khẩn cấp (Phím tắt <kbd className="px-1.5 py-0.5 fluent-box-nested rounded-[2px] font-mono text-[#F7CAC9]">K</kbd>), kết quả biểu quyết của khán phòng sẽ tự động lưu lại ở đây để tra cứu bất kỳ lúc nào.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredList.map((item, index) => {
            const isExpanded = expandedPollId === item.id;
            const sourceConfig = item.source_type ? SOURCE_CONFIG[item.source_type] : SOURCE_CONFIG.HOST;
            const SourceIcon = sourceConfig.icon;
            const formattedTime = new Date(item.created_at || Date.now()).toLocaleTimeString('vi-VN', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit'
            });
            const formattedDate = new Date(item.created_at || Date.now()).toLocaleDateString('vi-VN');
            const sentiment = getSentimentInfo(item);
            const SentimentIcon = sentiment.icon;

            const responses: Record<string, UserResponse> = item.responses || {};
            const voterList = Object.entries(responses).map(([uid, res]) => ({
              uid,
              ...(typeof res === 'object' && res !== null ? res : {})
            }));

            const filteredVoters = voterList.filter(v => {
              if (voterFilterChoice === 'ALL') return true;
              return v.choice === voterFilterChoice;
            });

            let chartData: any[] = [];
            if (isExpanded) {
              const sortedResponses = [...voterList].sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
              if (sortedResponses.length > 0) {
                const startTime = (sortedResponses[0].timestamp || Date.now()) - 1000;
                const endTime = Math.max(
                  item.completed_at || 0,
                  sortedResponses[sortedResponses.length - 1].timestamp || 0
                );
                
                const durationSec = Math.max(1, (endTime - startTime) / 1000);
                const bucketSizeMs = durationSec > 120 ? 5000 : (durationSec > 60 ? 2000 : 1000);
                
                let currentA = 0;
                let currentB = 0;
                let responseIndex = 0;
                
                for (let t = startTime; t <= endTime + bucketSizeMs; t += bucketSizeMs) {
                  while (responseIndex < sortedResponses.length && (sortedResponses[responseIndex].timestamp || 0) <= t) {
                    if (sortedResponses[responseIndex].choice === 'A') currentA++;
                    if (sortedResponses[responseIndex].choice === 'B') currentB++;
                    responseIndex++;
                  }
                  chartData.push({
                    timeLabel: `${Math.round((t - startTime) / 1000)}s`,
                    A: currentA,
                    B: currentB,
                  });
                }
              }
            }

            return (
              <div
                key={item.id}
                className="bg-[#190839]/80 backdrop-blur-md border border-white/15 hover:border-purple-500/40 rounded-[4px] p-4 sm:p-5 shadow-xl space-y-4 transition group"
              >
                {/* Header Meta Line */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-white/10">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2.5 py-1 rounded-[4px] fluent-box-nested border border-white/10 font-mono text-[11px] text-white/70 font-bold">
                      #{filteredList.length - index} • {formattedTime} ({formattedDate})
                    </span>

                    {/* Source Badge */}
                    <span
                      className={`px-3 py-1 rounded-[4px] text-xs font-bold border flex items-center gap-1.5 shadow-sm ${sourceConfig.badgeBg} ${sourceConfig.border} ${sourceConfig.text}`}
                    >
                      <SourceIcon className="w-3.5 h-3.5" />
                      <span>{item.source_name || sourceConfig.label}</span>
                    </span>

                    {item.context_note && (
                      <span className="px-2.5 py-0.5 rounded-[4px] fluent-box-nested text-purple-200 border border-purple-500/20 text-xs italic">
                        📌 {item.context_note}
                      </span>
                    )}

                    {item.round_context && (
                      <span className="text-[11px] text-white/40 font-mono">
                        [{item.round_context}]
                      </span>
                    )}
                    {/* Sentiment Badge */}
                    <span className={`px-2.5 py-1 rounded-[4px] text-xs font-bold border flex items-center gap-1.5 shadow-sm ${sentiment.className}`}>
                      <SentimentIcon className="w-3 h-3" />
                      <span>{sentiment.label}</span>
                    </span>
                  </div>

                  {/* Actions Header */}
                  <div className="flex items-center gap-1.5 self-end sm:self-auto">
                    <button
                      type="button"
                      onClick={() => handleExportSinglePollCSV(item)}
                      className="px-2.5 py-1.5 fluent-box-nested hover:fluent-box-nested border border-emerald-500/40 text-emerald-300 rounded-[4px] text-xs font-bold font-mono flex items-center gap-1 transition shadow-sm"
                      title="Tải toàn bộ phiếu bầu của cuộc khảo sát này sang file CSV"
                    >
                      <Download className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Tải CSV</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleCopySummary(item)}
                      className="px-2.5 py-1.5 fluent-box-nested hover:fluent-box-nested border border-white/10 rounded-[4px] text-xs text-white/80 hover:text-white flex items-center gap-1 transition"
                      title="Sao chép tóm tắt cho MC đọc trên sân khấu"
                    >
                      {copiedId === item.id ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-300 font-bold">Đã chép</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-white/50" />
                          <span>Sao chép</span>
                        </>
                      )}
                    </button>

                    {onRelaunchPoll && (
                      <button
                        type="button"
                        onClick={() => {
                          vibrateSelection();
                          onRelaunchPoll({
                            question: item.question,
                            type: item.type as any,
                            options: item.options as any,
                            time_limit: item.time_limit,
                            source_type: item.source_type,
                            source_name: item.source_name,
                            context_note: item.context_note
                          });
                        }}
                        className="px-2.5 py-1.5 fluent-box-nested hover:fluent-box-nested border border-rose-500/40 text-rose-300 rounded-[4px] text-xs font-bold flex items-center gap-1 transition"
                        title="Nạp lại câu hỏi này vào bộ điều khiển khảo sát để phát sóng lại"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>Phát Lại</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => setDeleteTargetPollId(item.id)}
                      className="p-1.5 text-white/30 hover:text-rose-400 hover:fluent-box-nested rounded-[4px] transition cursor-pointer"
                      title="Xóa bản ghi này"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>


                {/* Big Question Heading */}
                <div className="space-y-1">
                  <div className="text-[10px] font-mono text-purple-300 uppercase tracking-wider font-bold">
                    CÂU HỎI KHẢO SÁT / THĂM DÒ:
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-white leading-relaxed">
                    "{item.question}"
                  </h3>
                </div>

                {/* Dual Visual Result Race & Percentage Bars */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  {/* Option A Box */}
                  <div
                    className={`p-3.5 rounded-[4px] border transition ${
                      item.dominantChoice === 'A'
                        ? 'fluent-box-nested border-emerald-500/50 shadow-md ring-1 ring-emerald-500/30'
                        : 'fluent-box border-white/10'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-[4px] fluent-box-nested border border-emerald-400 text-emerald-300 font-mono font-black text-xs flex items-center justify-center">
                          A
                        </span>
                        <span className="text-xs font-bold text-white truncate max-w-[180px] sm:max-w-[220px]">
                          {item.options.A}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-black font-mono text-emerald-400">
                          {item.countA} phiếu
                        </span>
                        <span className="text-xs text-white/50 ml-1.5 font-mono">
                          ({item.percentA}%)
                        </span>
                      </div>
                    </div>

                    <div className="h-2.5 fluent-box-nested rounded-[2px] overflow-hidden p-[1px] border border-white/5">
                      <div
                        className="h-full bg-emerald-500 rounded-[1px] transition-all duration-500"
                        style={{ width: `${item.percentA}%` }}
                      />
                    </div>
                  </div>

                  {/* Option B Box */}
                  <div
                    className={`p-3.5 rounded-[4px] border transition ${
                      item.dominantChoice === 'B'
                        ? 'fluent-box-nested border-rose-500/50 shadow-md ring-1 ring-rose-500/30'
                        : 'fluent-box border-white/10'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-[4px] fluent-box-nested border border-rose-400 text-rose-300 font-mono font-black text-xs flex items-center justify-center">
                          B
                        </span>
                        <span className="text-xs font-bold text-white truncate max-w-[180px] sm:max-w-[220px]">
                          {item.options.B}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-black font-mono text-rose-400">
                          {item.countB} phiếu
                        </span>
                        <span className="text-xs text-white/50 ml-1.5 font-mono">
                          ({item.percentB}%)
                        </span>
                      </div>
                    </div>

                    <div className="h-2.5 fluent-box-nested rounded-[2px] overflow-hidden p-[1px] border border-white/5">
                      <div
                        className="h-full bg-rose-500 rounded-[1px] transition-all duration-500"
                        style={{ width: `${item.percentB}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Dominant Outcome Badge & Voter Drawer Toggle */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-white/5">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-white/40 font-mono">KẾT LUẬN:</span>
                    {item.dominantChoice === 'A' ? (
                      <span className="px-2.5 py-0.5 rounded-[4px] fluent-box-nested text-emerald-300 font-bold border border-emerald-500/30 flex items-center gap-1">
                        <Sparkles className="w-3 h-3" /> Lựa chọn A ("{item.options.A}") chiếm đa số ({item.percentA}%)
                      </span>
                    ) : item.dominantChoice === 'B' ? (
                      <span className="px-2.5 py-0.5 rounded-[4px] fluent-box-nested text-rose-300 font-bold border border-rose-500/30 flex items-center gap-1">
                        <Sparkles className="w-3 h-3" /> Lựa chọn B ("{item.options.B}") chiếm đa số ({item.percentB}%)
                      </span>
                    ) : item.totalVotes > 0 ? (
                      <span className="px-2.5 py-0.5 rounded-[4px] fluent-box-nested text-amber-300 font-bold border border-amber-500/30">
                        ⚖️ Tỷ lệ cân bằng 50% - 50%
                      </span>
                    ) : (
                      <span className="text-white/40 italic">Chưa có lượt bình chọn nào</span>
                    )}
                  </div>

                  {/* Toggle Voter Details Button */}
                  {voterList.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        vibrateSelection();
                        setExpandedPollId(isExpanded ? null : item.id);
                      }}
                      className="text-xs font-mono font-bold text-[#F7CAC9] hover:text-[#FCEEEC] flex items-center gap-1 transition self-end sm:self-auto cursor-pointer"
                    >
                      <span>{isExpanded ? 'Ẩn danh sách cử tri' : `Xem chi tiết ${voterList.length} người vote`}</span>
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                  )}
                </div>

                {/* Collapsible Detailed Voter List */}
                {isExpanded && voterList.length > 0 && (
                  <div className="pt-3 border-t border-purple-500/20 space-y-4 animate-fadeIn">
                    
                    {/* Vote Velocity Line Chart */}
                    <div className="bg-[#0B0213]/50 backdrop-blur-md border border-white/10 rounded-[4px] p-4 shadow-inner">
                      <h4 className="text-[11px] font-mono font-bold text-white/50 uppercase tracking-widest mb-3 flex items-center gap-2">
                        <Activity className="w-3.5 h-3.5 text-purple-400" />
                        Tiến độ & Vận tốc biểu quyết (Tích lũy)
                      </h4>
                      <div className="h-52 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: -20 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff15" vertical={false} />
                            <XAxis dataKey="timeLabel" stroke="#ffffff40" fontSize={10} tickMargin={8} />
                            <YAxis stroke="#ffffff40" fontSize={10} tickFormatter={(val) => Math.round(val).toString()} />
                            <RechartsTooltip 
                              contentStyle={{ backgroundColor: '#190839', borderColor: '#ffffff20', borderRadius: '8px' }}
                              itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                              labelStyle={{ color: '#ffffff80', fontSize: '10px', marginBottom: '4px' }}
                            />
                            <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} iconType="circle" />
                            <Line type="monotone" name={`A: ${item.options.A}`} dataKey="A" stroke="#34d399" strokeWidth={3} dot={false} activeDot={{ r: 5, fill: '#34d399', stroke: '#0B0213', strokeWidth: 2 }} />
                            <Line type="monotone" name={`B: ${item.options.B}`} dataKey="B" stroke="#fb7185" strokeWidth={3} dot={false} activeDot={{ r: 5, fill: '#fb7185', stroke: '#0B0213', strokeWidth: 2 }} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs pb-1">
                      <span className="font-mono text-white/60 font-bold uppercase tracking-wider">
                        Danh sách chi tiết khán giả đã biểu quyết:
                      </span>

                      {/* Filter by Choice & CSV Download */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="flex items-center gap-1 text-[11px] font-mono">
                          <button
                            onClick={() => setVoterFilterChoice('ALL')}
                            className={`px-2 py-0.5 rounded ${
                              voterFilterChoice === 'ALL' ? 'bg-purple-600 text-white font-bold' : 'fluent-box-nested text-white/50'
                            }`}
                          >
                            Tất cả ({voterList.length})
                          </button>
                          <button
                            onClick={() => setVoterFilterChoice('A')}
                            className={`px-2 py-0.5 rounded ${
                              voterFilterChoice === 'A' ? 'bg-emerald-600 text-white font-bold' : 'fluent-box-nested text-emerald-400'
                            }`}
                          >
                            Chỉ A ({item.countA})
                          </button>
                          <button
                            onClick={() => setVoterFilterChoice('B')}
                            className={`px-2 py-0.5 rounded ${
                              voterFilterChoice === 'B' ? 'bg-rose-600 text-white font-bold' : 'fluent-box-nested text-rose-400'
                            }`}
                          >
                            Chỉ B ({item.countB})
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleExportSinglePollCSV(item)}
                          className="px-2 py-0.5 rounded fluent-box-nested hover:fluent-box-nested border border-emerald-500/40 text-emerald-300 font-mono text-[11px] font-bold flex items-center gap-1 transition"
                          title="Tải bảng danh sách cử tri này thành file CSV"
                        >
                          <Download className="w-3 h-3 text-emerald-400" />
                          <span>Xuất CSV Bảng Này</span>
                        </button>
                      </div>
                    </div>

                    <div className="max-h-60 overflow-y-auto border border-white/10 rounded-[4px] fluent-box-nested scrollbar-thin">
                      <table className="w-full text-left text-xs font-mono">
                        <thead className="fluent-box-nested text-white/40 sticky top-0 border-b border-white/10">
                          <tr>
                            <th className="p-2 sm:px-3">STT</th>
                            <th className="p-2 sm:px-3">Khán giả / Thí sinh</th>
                            <th className="p-2 sm:px-3">MSSV / Mã</th>
                            <th className="p-2 sm:px-3">Lựa chọn</th>
                            <th className="p-2 sm:px-3 text-right">Tốc độ nộp</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {filteredVoters.map((voter: any, vIdx) => (
                            <tr key={voter.uid || vIdx} className="hover:fluent-box-nested transition">
                              <td className="p-2 sm:px-3 text-white/40">{vIdx + 1}</td>
                              <td className="p-2 sm:px-3 font-medium text-white font-sans">
                                {voter.user_info?.name || voter.name || 'Khán giả ẩn danh'}
                              </td>
                              <td className="p-2 sm:px-3 text-white/50">{voter.user_info?.mssv || voter.mssv || '---'}</td>
                              <td className="p-2 sm:px-3">
                                <span
                                  className={`px-2 py-0.5 rounded font-bold ${
                                    voter.choice === 'A'
                                      ? 'fluent-box-nested text-emerald-300 border border-emerald-500/40'
                                      : 'fluent-box-nested text-rose-300 border border-rose-500/40'
                                  }`}
                                >
                                  {voter.choice === 'A' ? `A: ${item.options.A}` : `B: ${item.options.B}`}
                                </span>
                              </td>
                              <td className="p-2 sm:px-3 text-right text-sky-400">
                                {typeof voter.latency_sec === 'number'
                                  ? `${voter.latency_sec.toFixed(2)}s`
                                  : typeof voter.time_taken === 'number'
                                  ? `${voter.time_taken.toFixed(2)}s`
                                  : '---'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Clear History Confirmation Modal */}
      {isClearHistoryDialogOpen && (
        <div className="fluent-dialog-overlay animate-fadeIn">
          <div className="max-w-md w-full bg-[#160731]/90 backdrop-blur-xl border border-rose-500/30 rounded-[4px] p-6 shadow-2xl text-white">
            <h3 className="font-black text-rose-300 text-lg">Xác nhận Xóa Lịch Sử?</h3>
            <p className="text-white/70 text-sm mt-2">
              Cảnh báo: Hành động này sẽ xóa sạch toàn bộ lịch sử các cuộc khảo sát khẩn cấp đã thực hiện trong phiên đấu. Bạn có chắc chắn không?
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsClearHistoryDialogOpen(false)}
                className="px-4 py-2 rounded-[4px] fluent-box hover:bg-white/15 text-white font-bold text-sm transition cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={async () => {
                  vibrateWarning();
                  soundFx.playClick();
                  await syncService.clearPollHistory();
                  setIsClearHistoryDialogOpen(false);
                  notify('Đã xóa sạch lịch sử khảo sát');
                }}
                className="px-4 py-2 rounded-[4px] bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm transition shadow-lg shadow-rose-900/50 cursor-pointer"
              >
                Đồng ý Xóa Sạch
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTargetPollId && (
        <div className="fluent-dialog-overlay animate-fadeIn">
          <div className="max-w-md w-full bg-[#160731]/90 backdrop-blur-xl border border-rose-500/30 rounded-[4px] p-6 shadow-2xl text-white">
            <h3 className="font-black text-rose-300 text-lg">Xác nhận Xóa?</h3>
            <p className="text-white/70 text-sm mt-2">
              Bạn có chắc chắn muốn xóa bản ghi khảo sát này khỏi lịch sử không?
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteTargetPollId(null)}
                className="px-4 py-2 rounded-[4px] fluent-box hover:bg-white/15 text-white font-bold text-sm transition cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={async () => {
                  vibrateWarning();
                  soundFx.playClick();
                  await syncService.deletePollFromHistory(deleteTargetPollId);
                  setDeleteTargetPollId(null);
                  notify('Đã xóa bản ghi khảo sát');
                }}
                className="px-4 py-2 rounded-[4px] bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm transition shadow-lg shadow-rose-900/50 cursor-pointer"
              >
                Đồng ý Xóa
              </button>
            </div>
          </div>
        </div>
      )}

      {toastMessage && (

        <div className="fixed bottom-6 right-6 z-[350] bg-purple-950/90 border border-purple-500/40 text-purple-200 px-4 py-3 rounded-[4px] shadow-2xl flex items-center gap-2 animate-fadeIn text-sm">
          <AlertCircle className="w-4 h-4 text-purple-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};

