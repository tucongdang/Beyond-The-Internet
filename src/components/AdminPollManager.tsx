import React, { useState, useEffect, useMemo } from 'react';
import {
  BarChart3,
  Zap,
  Play,
  Lock,
  Eye,
  RotateCcw,
  Sparkles,
  Users,
  Timer,
  Clock,
  Radio,
  Flame,
  GraduationCap,
  Award,
  UserCheck,
  Plus,
  Trash2,
  Send,
  Edit3,
  MessageSquareQuote,
  Layers,
  History,
  CheckCircle2,
  AlertOctagon,
  Download,
  Copy,
  Check,
  HelpCircle,
  TrendingUp,
  RefreshCw,
  Loader2,
  AlertCircle,
  FileSpreadsheet,
  Square,
  ChevronDown
} from 'lucide-react';

import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import {
  GameState,
  EmergencyPoll,
  EmergencyPollSourceType,
  EmergencyQuestionDraft,
  EmergencyPollHistoryItem,
  UserResponse
} from '../types';
import { syncService } from '../services/syncService';
import { soundFx } from '../services/audioEffects';
import { vibrateSubmit, vibrateSuccess, vibrateTap } from '../utils/hapticUtils';

interface AdminPollManagerProps {
  gameState: GameState;
  allResponses?: Record<string, Record<string, UserResponse>>;
  activeAudienceCount?: number;
  onOpenHistoryTab?: () => void;
  onViewChange?: (view: string) => void;
  initialDraft?: EmergencyQuestionDraft | null;
  onClearInitialDraft?: () => void;
  onOpenAudienceSurvey?: () => void;
}

export const OPTION_COLORS = [
  '#10b981', // Emerald - Option A
  '#f43f5e', // Rose - Option B
  '#0284c7', // Sky - Option C
  '#f59e0b', // Amber - Option D
  '#a855f7', // Purple - Option E
  '#06b6d4'  // Cyan - Option F
];

export const OPTION_BG_LIGHT = [
  'bg-white/10 backdrop-blur-md border-emerald-500/30 text-emerald-300',
  'bg-white/10 backdrop-blur-md border-rose-500/30 text-rose-300',
  'bg-white/10 backdrop-blur-md border-sky-500/30 text-sky-300',
  'bg-white/10 backdrop-blur-md border-amber-500/30 text-amber-300',
  'bg-white/10 backdrop-blur-md border-purple-500/30 text-purple-300',
  'bg-white/10 backdrop-blur-md border-cyan-500/30 text-cyan-300'
];

export const OPTION_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

const SOURCE_TYPE_CONFIG: Record<
  EmergencyPollSourceType,
  { label: string; icon: React.ComponentType<{ className?: string }>; color: string; badgeBg: string; border: string; defaultName: string; suggestions: string[] }
> = {
  ADVISOR: {
    label: 'Cố vấn chuyên môn',
    icon: GraduationCap,
    color: 'text-sky-300',
    badgeBg: 'bg-white/10 backdrop-blur-md text-sky-300',
    border: 'border-sky-500/40',
    defaultName: 'Cố vấn chuyên môn',
    suggestions: ['TS. Cố vấn An ninh mạng', 'Chuyên gia Công nghệ AI', 'Cố vấn Pháp lý số', 'Cố vấn Kỹ thuật Cloud']
  },
  CONTESTANT: {
    label: 'Thí sinh / Đội thi',
    icon: Flame,
    color: 'text-amber-300',
    badgeBg: 'bg-white/10 backdrop-blur-md text-amber-300',
    border: 'border-amber-500/40',
    defaultName: 'Thí sinh phản biện',
    suggestions: ['Thí sinh phản biện', 'Đội thi số 1 (Alpha)', 'Đội thi số 2 (Beta)', 'Thí sinh xin trợ giúp']
  },
  JURY: {
    label: 'Ban Giám Khảo',
    icon: Award,
    color: 'text-purple-300',
    badgeBg: 'bg-white/10 backdrop-blur-md text-purple-300',
    border: 'border-purple-500/40',
    defaultName: 'Ban Giám Khảo',
    suggestions: ['Hội đồng Ban Giám Khảo', 'Trưởng Ban Giám Khảo', 'Giám khảo Chuyên môn', 'Biểu quyết phán quyết']
  },
  AUDIENCE: {
    label: 'Khán phòng / Khán giả',
    icon: Users,
    color: 'text-emerald-300',
    badgeBg: 'bg-white/10 backdrop-blur-md text-emerald-300',
    border: 'border-emerald-500/40',
    defaultName: 'Khán giả hội trường',
    suggestions: ['Khán giả Hội trường', 'Cổ động viên Đội 1', 'Đại diện Khán phòng', 'Khảo sát dự đoán']
  },
  HOST: {
    label: 'MC / Ban Tổ Chức',
    icon: Radio,
    color: 'text-rose-300',
    badgeBg: 'bg-white/10 backdrop-blur-md text-rose-300',
    border: 'border-rose-500/40',
    defaultName: 'MC / Ban Tổ Chức',
    suggestions: ['MC Điều phối', 'Ban Tổ Chức', 'Tổ Trọng tài', 'Khảo sát thời gian thi']
  }
};

const PRESET_POLLS: EmergencyQuestionDraft[] = [
  {
    id: 'PRESET_MC_4_1',
    question: 'Theo bạn, công nghệ nào đóng vai trò then chốt nhất trong việc bảo vệ dữ liệu Cloud hiện đại?',
    type: 'MULTIPLE_CHOICE',
    options: {
      A: 'Zero-Trust Architecture',
      B: 'Multi-Factor Authentication (MFA)',
      C: 'End-to-End Encryption (E2EE)',
      D: 'AI-driven Threat Detection'
    },
    time_limit: 30,
    source_type: 'ADVISOR',
    source_name: 'Cố vấn An toàn thông tin',
    context_note: 'Khảo sát chuyên môn Trực tiếp',
    created_at: Date.now() - 60000
  },
  {
    id: 'PRESET_MC_4_2',
    question: 'Khán phòng dự đoán đội thi nào sẽ giành điểm cao nhất trong vòng thi Về Đích?',
    type: 'MULTIPLE_CHOICE',
    options: {
      A: 'Đội 1: Cyber Knight',
      B: 'Đội 2: Cloud Pioneers',
      C: 'Đội 3: AI Guardians',
      D: 'Đội 4: Quantum Leap'
    },
    time_limit: 20,
    source_type: 'HOST',
    source_name: 'MC / Ban Tổ Chức',
    context_note: 'Dự đoán kết quả từ khán phòng',
    created_at: Date.now() - 50000
  },
  {
    id: 'PRESET_TF_1',
    question: 'Theo Cố vấn chuyên môn, website vừa hiển thị có dấu hiệu tấn công Phishing giả mạo hay không?',
    type: 'TRUE_FALSE',
    options: { A: 'Đúng (Phishing giả mạo)', B: 'Sai (Trang an toàn)' },
    time_limit: 20,
    source_type: 'ADVISOR',
    source_name: 'Cố vấn An ninh mạng',
    context_note: 'Kiểm chứng tình huống bảo mật',
    created_at: Date.now() - 40000
  },
  {
    id: 'PRESET_AGREE_1',
    question: 'Thí sinh đưa ra phản biện rằng mã độc sử dụng kỹ thuật Obfuscation. Bạn có đồng ý với lập luận này?',
    type: 'AGREE_DISAGREE',
    options: { A: 'Đồng ý với thí sinh', B: 'Không đồng ý' },
    time_limit: 25,
    source_type: 'CONTESTANT',
    source_name: 'Thí sinh phản biện',
    context_note: 'Phản biện trực tiếp',
    created_at: Date.now() - 30000
  },
  {
    id: 'PRESET_JURY_1',
    question: 'Ban Giám Khảo xin ý kiến khán phòng về việc công nhận đáp án thay thế của đội thi?',
    type: 'AGREE_DISAGREE',
    options: { A: 'Công nhận đáp án', B: 'Không công nhận' },
    time_limit: 20,
    source_type: 'JURY',
    source_name: 'Hội đồng Ban Giám Khảo',
    context_note: 'Biểu quyết phán quyết',
    created_at: Date.now() - 20000
  },
  {
    id: 'PRESET_BONUS_1',
    question: 'Khán giả trường quay có muốn mở thêm 15 giây thời gian suy nghĩ cho phần thi này không?',
    type: 'YES_NO',
    options: { A: 'Có (Mở thêm 15s)', B: 'Không' },
    time_limit: 15,
    source_type: 'HOST',
    source_name: 'MC Điều phối',
    context_note: 'Trợ giúp khán phòng',
    created_at: Date.now() - 10000
  }
];

export const AdminPollManager: React.FC<AdminPollManagerProps> = ({
  gameState,
  allResponses,
  activeAudienceCount = 1,
  onOpenHistoryTab,
  onViewChange,
  initialDraft,
  onClearInitialDraft,
  onOpenAudienceSurvey
}) => {
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isDismissDialogOpen, setIsDismissDialogOpen] = useState(false);

  const notify = (message: string, intent: 'success' | 'warning' | 'error' = 'success') => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 3000);
  };


  const currentPoll = gameState.emergency_poll;
  const isPollLive = Boolean(currentPoll && currentPoll.status !== 'DISMISSED');

  // View state: 'CREATOR' | 'TELEMETRY' | 'PRESETS' | 'AI_ASSISTANT'
  const [managerTab, setManagerTab] = useState<'CREATOR' | 'TELEMETRY' | 'PRESETS' | 'AI_ASSISTANT'>('CREATOR');

  // Form State
  const [pollType, setPollType] = useState<'MULTIPLE_CHOICE' | 'YES_NO' | 'TRUE_FALSE' | 'AGREE_DISAGREE' | 'CUSTOM'>(
    'MULTIPLE_CHOICE'
  );
  const [questionText, setQuestionText] = useState('');
  const [optionsList, setOptionsList] = useState<string[]>([
    'Lựa chọn A',
    'Lựa chọn B',
    'Lựa chọn C',
    'Lựa chọn D'
  ]);
  const [timeLimit, setTimeLimit] = useState<number>(30);
  const [sourceType, setSourceType] = useState<EmergencyPollSourceType>('HOST');
  const [sourceName, setSourceName] = useState('');
  const [contextNote, setContextNote] = useState('');
  const [correctOption, setCorrectOption] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [chartViewMode, setChartViewMode] = useState<'BAR' | 'DONUT'>('BAR');
  const [isTogglingSurveyLive, setIsTogglingSurveyLive] = useState(false);

  const handleToggleSurveyLive = async () => {
    if (!gameState.audience_survey?.form_url) {
      if (onOpenAudienceSurvey) onOpenAudienceSurvey();
      return;
    }
    const currentForce = gameState.audience_survey?.force_active || false;
    soundFx.playClick();
    vibrateTap();
    setIsTogglingSurveyLive(true);
    try {
      await syncService.updateGameState({
        audience_survey: {
          ...gameState.audience_survey,
          enabled: true,
          force_active: !currentForce,
          updated_at: Date.now()
        }
      });
      if (!currentForce) {
        vibrateSuccess();
      }
    } finally {
      setIsTogglingSurveyLive(false);
    }
  };

  // AI Assistant State
  const [aiPrompt, setAiPrompt] = useState('');
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [aiError, setAiError] = useState('');

  const handleGenerateAIQuestion = async () => {
    if (!aiPrompt.trim()) {
      setAiError('Vui lòng nhập chủ đề hoặc yêu cầu cho AI.');
      return;
    }
    
    setIsAiGenerating(true);
    setAiError('');
    vibrateTap();
    
    try {
      const response = await fetch('/api/generate-question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: aiPrompt })
      });
      
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Lỗi kết nối máy chủ AI');
      }
      
      const data = await response.json();
      
      if (data.questionText && data.options && Array.isArray(data.options)) {
        setQuestionText(data.questionText);
        setPollType('MULTIPLE_CHOICE');
        setOptionsList(data.options.slice(0, 6)); // ensure max 6 options
        if (typeof data.correctAnswerIndex === 'number' && data.correctAnswerIndex >= 0) {
          setCorrectOption(OPTION_LETTERS[data.correctAnswerIndex] || '');
        } else {
          setCorrectOption('');
        }
        setManagerTab('CREATOR'); // Switch back to creator to review
        // soundFx.playSuccess() -> wait, let's just do playClick for now to avoid undefined error if playSuccess isn't there
        soundFx.playClick();
        vibrateSuccess();
        setAiPrompt('');
      } else {
        throw new Error('Định dạng dữ liệu trả về không hợp lệ.');
      }
    } catch (err: any) {
      console.error(err);
      setAiError(err.message || 'Lỗi không xác định.');
    } finally {
      setIsAiGenerating(false);
    }
  };


  // Prefill initial draft if passed from history
  useEffect(() => {
    if (initialDraft) {
      setQuestionText(initialDraft.question);
      setPollType((initialDraft.type as any) || 'MULTIPLE_CHOICE');
      const opts = Object.values(initialDraft.options || {});
      setOptionsList(opts.length > 0 ? opts : ['Có', 'Không']);
      setTimeLimit(initialDraft.time_limit ?? 30);
      setSourceType(initialDraft.source_type || 'HOST');
      setSourceName(initialDraft.source_name || '');
      setContextNote(initialDraft.context_note || '');
      setCorrectOption(initialDraft.correct_option || '');
      setManagerTab('CREATOR');
      if (onClearInitialDraft) {
        onClearInitialDraft();
      }
    }
  }, [initialDraft, onClearInitialDraft]);

  // Auto-select tab based on live state
  useEffect(() => {
    if (isPollLive) {
      setManagerTab('TELEMETRY');
    }
  }, [isPollLive]);

  // Adjust default options list when poll type changes
  const handleTypeChange = (type: 'MULTIPLE_CHOICE' | 'YES_NO' | 'TRUE_FALSE' | 'AGREE_DISAGREE' | 'CUSTOM') => {
    vibrateTap();
    soundFx.playClick();
    setPollType(type);
    if (type === 'MULTIPLE_CHOICE') {
      setOptionsList(['Lựa chọn A', 'Lựa chọn B', 'Lựa chọn C', 'Lựa chọn D']);
    } else if (type === 'YES_NO') {
      setOptionsList(['Có', 'Không']);
    } else if (type === 'TRUE_FALSE') {
      setOptionsList(['Đúng', 'Sai']);
    } else if (type === 'AGREE_DISAGREE') {
      setOptionsList(['Đồng ý', 'Không đồng ý']);
    } else if (type === 'CUSTOM') {
      if (optionsList.length < 2) {
        setOptionsList(['Lựa chọn 1', 'Lựa chọn 2']);
      }
    }
  };

  // Add Option (up to 6)
  const handleAddOption = () => {
    if (optionsList.length >= 6) return;
    vibrateTap();
    setOptionsList(prev => [...prev, `Lựa chọn ${OPTION_LETTERS[prev.length] || prev.length + 1}`]);
  };

  // Remove Option (minimum 2)
  const handleRemoveOption = (index: number) => {
    if (optionsList.length <= 2) return;
    vibrateTap();
    setOptionsList(prev => prev.filter((_, i) => i !== index));
    if (correctOption === OPTION_LETTERS[index]) {
      setCorrectOption('');
    }
  };

  // Update Option Text
  const handleOptionChange = (index: number, text: string) => {
    setOptionsList(prev => {
      const updated = [...prev];
      updated[index] = text;
      return updated;
    });
  };

  // Select source type
  const handleSelectSourceType = (type: EmergencyPollSourceType) => {
    vibrateTap();
    setSourceType(type);
    if (!sourceName || Object.values(SOURCE_TYPE_CONFIG).some(c => c.defaultName === sourceName)) {
      setSourceName(SOURCE_TYPE_CONFIG[type].defaultName);
    }
  };

  // Apply a preset draft into the form
  const handleApplyPreset = (preset: EmergencyQuestionDraft) => {
    vibrateTap();
    soundFx.playClick();
    setQuestionText(preset.question);
    setPollType((preset.type as any) || 'MULTIPLE_CHOICE');
    const opts = Object.values(preset.options || {});
    setOptionsList(opts.length > 0 ? opts : ['Có', 'Không']);
    setTimeLimit(preset.time_limit ?? 30);
    setSourceType(preset.source_type || 'HOST');
    setSourceName(preset.source_name || '');
    setContextNote(preset.context_note || '');
    setCorrectOption(preset.correct_option || '');
    setManagerTab('CREATOR');
  };

  // Push poll live immediately from preset
  const handleLaunchPresetDirectly = async (preset: EmergencyQuestionDraft) => {
    setIsSubmitting(true);
    soundFx.playReveal(true);
    vibrateSubmit();

    await syncService.launchEmergencyPoll({
      question: preset.question.trim(),
      type: preset.type,
      options: preset.options,
      time_limit: preset.time_limit,
      source_type: preset.source_type,
      source_name: preset.source_name,
      context_note: preset.context_note,
      correct_option: preset.correct_option
    });

    setIsSubmitting(false);
    setManagerTab('TELEMETRY');
  };

  // Push poll live from current creator form
  const handleLaunchPoll = async () => {
    if (!questionText.trim()) {
      notify('Vui lòng nhập nội dung câu hỏi bình chọn!');
      return;
    }

    setIsSubmitting(true);
    soundFx.playReveal(true);
    vibrateSubmit();

    const optionsMap: Record<string, string> = {};
    optionsList.forEach((optText, index) => {
      const letter = OPTION_LETTERS[index] || `OPT_${index + 1}`;
      optionsMap[letter] = optText.trim() || `Lựa chọn ${letter}`;
    });

    await syncService.launchEmergencyPoll({
      question: questionText.trim(),
      type: pollType,
      options: optionsMap,
      time_limit: timeLimit,
      source_type: sourceType,
      source_name: sourceName.trim() || SOURCE_TYPE_CONFIG[sourceType].defaultName,
      context_note: contextNote.trim(),
      correct_option: correctOption.trim() || undefined
    });

    setIsSubmitting(false);
    setManagerTab('TELEMETRY');
  };

  // Active Poll Live Telemetry & Vote Computations
  const pollResponses: Record<string, UserResponse> = currentPoll?.id
    ? (allResponses?.[`EMERGENCY_POLL_${currentPoll.id}`] as Record<string, UserResponse>) || {}
    : {};

  const votesList: UserResponse[] = Object.values(pollResponses);
  const totalVotes = votesList.length;

  const currentOptionsEntries = useMemo(() => {
    if (!currentPoll?.options) return [];
    return Object.entries(currentPoll.options);
  }, [currentPoll?.options]);

  const pollStats = useMemo(() => {
    if (!currentPoll || !currentPoll.options) return [];

    const stats = Object.entries(currentPoll.options).map(([key, text], index) => {
      const count = votesList.filter(v => v.choice === key).length;
      const percent = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
      const color = OPTION_COLORS[index % OPTION_COLORS.length];
      return {
        key,
        text,
        name: `${key}: ${text}`,
        shortName: `Lựa chọn ${key}`,
        count,
        percent,
        value: count,
        color
      };
    });

    return stats;
  }, [currentPoll, votesList, totalVotes]);

  // Active Poll Countdown Timer
  const [activeTimeLeft, setActiveTimeLeft] = useState<number>(currentPoll?.time_limit || 0);

  useEffect(() => {
    if (!currentPoll || currentPoll.status !== 'ACTIVE' || (currentPoll.time_limit || 0) <= 0) {
      setActiveTimeLeft(currentPoll?.time_limit || 0);
      return;
    }

    const computeRemaining = () => {
      if (!currentPoll.server_start_time) return currentPoll.time_limit;
      const elapsed = Math.floor((syncService.getSynchronizedNow() - currentPoll.server_start_time) / 1000);
      return Math.max(0, currentPoll.time_limit - elapsed);
    };

    setActiveTimeLeft(computeRemaining());
    const interval = setInterval(() => {
      const remaining = computeRemaining();
      setActiveTimeLeft(remaining);
      if (remaining <= 0) {
        syncService.lockEmergencyPoll();
      }
    }, 500);

    return () => clearInterval(interval);
  }, [currentPoll?.id, currentPoll?.status, currentPoll?.server_start_time, currentPoll?.time_limit]);

  // Actions for Active Poll
  const handleLockPoll = async () => {
    soundFx.playLock();
    vibrateSubmit();
    await syncService.lockEmergencyPoll();
  };

  const handleRevealPoll = async () => {
    soundFx.playReveal(true);
    vibrateSuccess();
    await syncService.revealEmergencyPoll();
  };

  const handleDismissPoll = async () => {
    soundFx.playClick();
    vibrateTap();
    await syncService.dismissEmergencyPoll();
    setManagerTab('CREATOR');
  };

  // Export Active Poll to CSV
  const handleExportCSV = () => {
    if (!currentPoll) return;
    vibrateSubmit();
    soundFx.playClick();

    const headers = ['UID', 'Tên Khán Giả', 'MSSV', 'Lựa Chọn', 'Tên Lựa Chọn', 'Độ Trễ (s)', 'Thời Gian'];
    const rows = votesList.map(v => {
      const optText = currentPoll.options[v.choice] || '';
      return [
        v.user_info?.uid || '',
        `"${(v.user_info?.name || '').replace(/"/g, '""')}"`,
        `"${(v.user_info?.mssv || '').replace(/"/g, '""')}"`,
        v.choice,
        `"${optText.replace(/"/g, '""')}"`,
        v.latency_sec ?? '',
        new Date(v.timestamp).toLocaleString('vi-VN')
      ].join(',');
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `Poll_${currentPoll.id}_${new Date().toISOString().slice(0, 10)}.csv`);
    link.click();
  };

  const currentSourceCfg = currentPoll?.source_type
    ? SOURCE_TYPE_CONFIG[currentPoll.source_type]
    : SOURCE_TYPE_CONFIG.HOST;
  const CurrentSourceIcon = currentSourceCfg.icon;

  return (
    <div id="admin-poll-manager-hub" className="space-y-6 animate-fadeIn">
      {/* Top Banner & Mode Switcher */}
      <div className="fluent-box rounded-[2px] p-5 sm:p-6 shadow-2xl relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4 text-white border border-white/10">
        <div className="flex items-center gap-3.5 relative z-10">
          <div className="w-12 h-12 rounded-[2px] fluent-box-nested border border-[#F7CAC9]/30 flex items-center justify-center text-[#F7CAC9] shadow-lg">
            <BarChart3 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg sm:text-xl font-black text-white uppercase tracking-wider">
                Live Poll Control Center • Quản Trị Khảo Sát Sân Khấu
              </h1>
              {isPollLive && (
                <span className="px-2.5 py-0.5 rounded-[2px] text-[10px] font-mono font-black uppercase bg-rose-600 text-white flex items-center gap-1.5 animate-pulse border border-rose-400">
                  <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                  LIVE BROADCASTING
                </span>
              )}
            </div>
            <p className="text-xs text-white/50 mt-0.5">
              Tạo và phát sóng câu hỏi trắc nghiệm nhiều đáp án tới toàn bộ điện thoại khán giả & đồng bộ hiển thị máy chiếu
            </p>
          </div>
        </div>

        {/* Action Tabs in Header */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap relative z-10">
          <div className="fluent-box-nested rounded-[2px] p-1 border border-white/10 flex items-center gap-1">
            <button
              type="button"
              onClick={() => {
                vibrateTap();
                soundFx.playClick();
                setManagerTab('CREATOR');
              }}
              className={`fluent-subtab-btn ${
                managerTab === 'CREATOR'
                  ? 'active bg-[#F7CAC9] text-[#190839] shadow-md font-black border-[#F7CAC9]'
                  : 'text-white/60 hover:text-white hover:bg-white/10'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Tạo Poll Mới</span>
            </button>

            <button
              type="button"
              onClick={() => {
                vibrateTap();
                soundFx.playClick();
                setManagerTab('TELEMETRY');
              }}
              className={`fluent-subtab-btn relative ${
                managerTab === 'TELEMETRY'
                  ? 'active bg-[#F7CAC9] text-[#190839] shadow-md font-black border-[#F7CAC9]'
                  : 'text-white/60 hover:text-white hover:bg-white/10'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Kết Quả</span>
              {isPollLive && (
                <span className="w-2 h-2 rounded-full bg-rose-400 animate-ping absolute -top-1 -right-1" />
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                vibrateTap();
                soundFx.playClick();
                setManagerTab('PRESETS');
              }}
              className={`fluent-subtab-btn ${
                managerTab === 'PRESETS'
                  ? 'active bg-[#F7CAC9] text-[#190839] shadow-md font-black border-[#F7CAC9]'
                  : 'text-white/60 hover:text-white hover:bg-white/10'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Mẫu ({PRESET_POLLS.length})</span>
            </button>

            <button
              type="button"
              onClick={() => {
                vibrateTap();
                soundFx.playClick();
                setManagerTab('AI_ASSISTANT');
              }}
              className={`fluent-subtab-btn ${
                managerTab === 'AI_ASSISTANT'
                  ? 'active bg-[#F7CAC9] text-[#190839] shadow-md font-black border-[#F7CAC9]'
                  : 'text-white/60 hover:text-white hover:bg-white/10'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Trợ Lý AI</span>
            </button>
          </div>

          {onOpenHistoryTab && (
            <button
              type="button"
              onClick={() => {
                vibrateTap();
                soundFx.playClick();
                onOpenHistoryTab();
              }}
              className="fluent-subtab-btn fluent-box-nested text-white hover:bg-white/15 border border-white/15 text-xs font-bold font-mono transition flex items-center gap-1.5 ml-auto"
            >
              <History className="w-3.5 h-3.5 text-[#F7CAC9]" />
              <span>Lịch Sử</span>
              {(gameState.emergency_poll_history?.length || 0) > 0 && (
                <span className="px-1.5 py-0.2 rounded-[2px] bg-[#F7CAC9] text-[#190839] text-[10px] font-mono font-bold">
                  {gameState.emergency_poll_history?.length}
                </span>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Google Forms 10% Audience Survey Integration Banner */}
      <div className="fluent-box-nested p-3.5 sm:p-4 rounded-[6px] border border-[#F7CAC9]/40 bg-gradient-to-r from-purple-950/50 via-slate-900/80 to-purple-950/50 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#F7CAC9]/30 to-purple-600/30 border border-[#F7CAC9]/50 flex items-center justify-center text-[#F7CAC9] shrink-0 shadow-md">
            <FileSpreadsheet className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs sm:text-sm font-bold text-white tracking-wide">
                Khảo Sát Khán Giả Cuối Chương Trình (Google Forms)
              </span>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded-[3px] font-bold ${
                gameState.audience_survey?.enabled 
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'bg-white/10 text-white/50 border border-white/10'
              }`}>
                {gameState.audience_survey?.enabled ? `ĐANG BẬT (${gameState.audience_survey.sample_rate ?? 10}%)` : 'CHƯA BẬT'}
              </span>
              {gameState.audience_survey?.force_active && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-[3px] bg-rose-500/25 text-rose-300 border border-rose-500/40 animate-pulse font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400 inline-block animate-ping" />
                  ĐANG PHÁT LIVE
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-300/80 mt-1 flex items-center gap-1.5 flex-wrap">
              <span>Bốc thăm ngẫu nhiên <strong>{gameState.audience_survey?.sample_rate ?? 10}% khán giả</strong> theo User ID.</span>
              {activeAudienceCount !== undefined && activeAudienceCount > 0 && (
                <span className="text-[#F7CAC9] font-mono font-semibold">
                  (Dự kiến: ~{Math.round(((gameState.audience_survey?.sample_rate ?? 10) / 100) * activeAudienceCount)}/{activeAudienceCount} người)
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 w-full md:w-auto shrink-0">
          {/* Quick 1-Tap Live Trigger Toggle */}
          {gameState.audience_survey?.form_url && (
            <button
              type="button"
              onClick={handleToggleSurveyLive}
              disabled={isTogglingSurveyLive}
              className={`flex-1 md:flex-initial px-3.5 py-2 rounded-[3px] text-xs font-mono font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-md ${
                gameState.audience_survey?.force_active
                  ? 'bg-rose-600 hover:bg-rose-500 text-white border border-rose-400/50 animate-pulse'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-400/40'
              }`}
              title={gameState.audience_survey?.force_active ? 'Dừng phát khảo sát trên máy khán giả' : 'Phát lệnh khảo sát lên máy 10% khán giả ngay lúc này'}
            >
              {gameState.audience_survey?.force_active ? (
                <>
                  <Square className="w-3.5 h-3.5 fill-current" />
                  <span>Dừng Phát Live</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Phát Khảo Sát Ngay</span>
                </>
              )}
            </button>
          )}

          {onOpenAudienceSurvey && (
            <button
              type="button"
              onClick={() => {
                vibrateTap();
                soundFx.playClick();
                onOpenAudienceSurvey();
              }}
              className="flex-1 md:flex-initial px-4 py-2 rounded-[3px] bg-gradient-to-r from-[#F7CAC9] to-[#E39A96] hover:from-[#FCEEEC] hover:to-[#F7CAC9] text-slate-950 font-bold text-xs font-mono uppercase tracking-wider transition shadow-md cursor-pointer flex items-center justify-center gap-1.5"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Cấu Hình & Quản Lý Form</span>
            </button>
          )}
        </div>
      </div>

      {/* Poll Manager Tab Content with Fluent UI v2 Transition */}
      <div key={managerTab} className="fluent-tab-panel">
        {/* ================= VIEW 1: TELEMETRY & LIVE CONTROLS (WHEN A POLL IS ACTIVE OR REVEALED) ================= */}
        {managerTab === 'TELEMETRY' && (
        <div className="space-y-6">
          {isPollLive && currentPoll ? (
            <div className="fluent-box rounded-[2px] p-5 sm:p-7 shadow-2xl space-y-6 relative overflow-hidden border border-white/10 text-white">
              {/* Header Status Row */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <span className={`w-3.5 h-3.5 rounded-full ${
                    currentPoll.status === 'ACTIVE'
                      ? 'bg-emerald-400 animate-ping'
                      : currentPoll.status === 'LOCKED'
                      ? 'bg-amber-400'
                      : 'bg-blue-400'
                  }`} />
                  <div>
                    <span className="text-xs font-mono font-black uppercase tracking-wider text-[#F7CAC9]">
                      Trạng thái bình chọn:
                    </span>
                    <h2 className="text-base sm:text-lg font-black text-white">
                      {currentPoll.status === 'ACTIVE'
                        ? '🟢 ĐANG NHẬN BIỂU QUYẾT TỪ KHÁN PHÒNG'
                        : currentPoll.status === 'LOCKED'
                        ? '🔒 ĐÃ KHÓA BÌNH CHỌN (CHỜ CÔNG BỐ)'
                        : '✨ ĐÃ CÔNG BỐ KẾT QUẢ TRÊN MÀN HÌNH'}
                    </h2>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {currentPoll.time_limit > 0 && currentPoll.status === 'ACTIVE' && (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-[2px] fluent-box-nested text-amber-300 border border-amber-500/40 font-mono font-bold text-xs">
                      <Clock className="w-4 h-4 text-amber-400 animate-spin" />
                      <span>Đếm ngược: <strong className={activeTimeLeft <= 5 ? 'text-rose-400 text-sm animate-pulse' : 'text-amber-200'}>{activeTimeLeft}s</strong></span>
                    </div>
                  )}

                  {currentPoll.source_name && (
                    <span className={`px-3 py-1.5 rounded-[2px] text-xs font-bold border flex items-center gap-1.5 ${currentSourceCfg.badgeBg} ${currentSourceCfg.border}`}>
                      <CurrentSourceIcon className="w-3.5 h-3.5" />
                      <span>{currentPoll.source_name}</span>
                    </span>
                  )}

                  <span className="px-3 py-1.5 rounded-[2px] text-xs font-mono font-bold fluent-box-nested text-white border border-white/15 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-sky-400" />
                    <span>{totalVotes} / {activeAudienceCount} Khán giả ({activeAudienceCount > 0 ? Math.round((totalVotes / activeAudienceCount) * 100) : 0}%)</span>
                  </span>
                </div>
              </div>

              {/* Question Text Box */}
              <div className="space-y-1.5 fluent-box-nested border border-white/10 rounded-[2px] p-4 sm:p-5">
                <div className="flex items-center justify-between text-[11px] font-mono uppercase text-white/50">
                  <span>Câu hỏi khảo sát đang phát sóng:</span>
                  {currentPoll.context_note && (
                    <span className="text-[#F7CAC9] font-sans italic">
                      Ghi chú: {currentPoll.context_note}
                    </span>
                  )}
                </div>
                <p className="text-lg sm:text-2xl font-black text-white leading-relaxed">
                  "{currentPoll.question}"
                </p>
                {currentPoll.correct_option && (
                  <div className="pt-2 text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Đáp án chuẩn xác được đánh dấu: <strong>Lựa chọn {currentPoll.correct_option}</strong> ({currentPoll.options[currentPoll.correct_option]})</span>
                  </div>
                )}
              </div>

              {/* Real-time Vote Breakdown & Visual Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                {/* Left: Progress Bars for Each Option */}
                <div className="lg:col-span-6 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono uppercase text-white/60 font-bold">
                      Phân Bố Phiếu Bầu Trực Tiếp:
                    </span>
                    <span className="text-xs font-mono text-white/40">
                      Tổng số: <strong className="text-white">{totalVotes} phiếu</strong>
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    {pollStats.map((item, index) => {
                      const isCorrect = currentPoll.correct_option === item.key;
                      return (
                        <div
                          key={item.key}
                          className={`p-3 rounded-[2px] border transition-all ${
                            isCorrect && currentPoll.status === 'REVEALED'
                              ? 'fluent-box-nested border-emerald-400 shadow-md shadow-emerald-950/40'
                              : 'fluent-box-nested border-white/10'
                          }`}
                        >
                          <div className="flex items-center justify-between text-xs font-bold font-mono mb-1.5">
                            <div className="flex items-center gap-2">
                              <span
                                className="w-6 h-6 rounded-[2px] flex items-center justify-center text-xs font-black shadow-inner"
                                style={{ backgroundColor: `${item.color}30`, color: item.color, border: `1px solid ${item.color}60` }}
                              >
                                {item.key}
                              </span>
                              <span className="text-white text-sm truncate max-w-[220px] sm:max-w-[300px]" title={item.text}>
                                {item.text}
                              </span>
                              {isCorrect && (
                                <span className="px-1.5 py-0.2 rounded-[2px] bg-emerald-500 text-white text-[9px] font-bold">
                                  ĐÚNG
                                </span>
                              )}
                            </div>
                            <div className="text-right">
                              <span className="text-sm font-black" style={{ color: item.color }}>
                                {item.count} phiếu
                              </span>
                              <span className="text-xs font-mono text-white/60 ml-2">
                                ({item.percent}%)
                              </span>
                            </div>
                          </div>

                          {/* Animated Progress Bar */}
                          <div className="h-2.5 bg-black/60 rounded-[2px] overflow-hidden p-0.5 border border-white/10">
                            <div
                              className="h-full rounded-[2px] transition-all duration-500 shadow-md"
                              style={{
                                width: `${item.percent}%`,
                                backgroundColor: item.color
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Right: Recharts Interactive Graphic */}
                <div className="lg:col-span-6 fluent-box-nested border border-white/10 rounded-[2px] p-4 flex flex-col items-center justify-center min-h-[280px]">
                  <div className="w-full flex items-center justify-between mb-2">
                    <span className="text-xs font-mono font-bold text-white/60 uppercase">
                      Biểu Đồ Trực Quan
                    </span>
                    <div className="flex items-center gap-1 bg-white/10 p-1 rounded-[2px] border border-white/10">
                      <button
                        type="button"
                        onClick={() => setChartViewMode('BAR')}
                        className={`px-2.5 py-0.5 rounded-[2px] text-[11px] font-mono font-bold transition ${
                          chartViewMode === 'BAR' ? 'bg-[#F7CAC9] text-[#190839]' : 'text-white/50 hover:text-white'
                        }`}
                      >
                        Cột (Bar)
                      </button>
                      <button
                        type="button"
                        onClick={() => setChartViewMode('DONUT')}
                        className={`px-2.5 py-0.5 rounded-[2px] text-[11px] font-mono font-bold transition ${
                          chartViewMode === 'DONUT' ? 'bg-[#F7CAC9] text-[#190839]' : 'text-white/50 hover:text-white'
                        }`}
                      >
                        Tròn (Donut)
                      </button>
                    </div>
                  </div>

                  {totalVotes > 0 ? (
                    <div className="w-full h-[220px]">
                      <ResponsiveContainer width="100%" height="100%">
                        {chartViewMode === 'BAR' ? (
                          <BarChart data={pollStats} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <XAxis dataKey="key" stroke="#ffffff60" fontSize={11} fontStyle="bold" />
                            <YAxis stroke="#ffffff60" fontSize={11} allowDecimals={false} />
                            <Tooltip
                              content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                  const data = payload[0].payload;
                                  return (
                                    <div className="fluent-box border border-purple-500/40 p-2.5 rounded-[2px] shadow-xl text-xs">
                                      <p className="font-bold text-white mb-0.5">{data.name}</p>
                                      <p className="font-black text-sm" style={{ color: data.color }}>
                                        {data.count} phiếu ({data.percent}%)
                                      </p>
                                    </div>
                                  );
                                }
                                return null;
                              }}
                            />
                            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                              {pollStats.map((entry, index) => (
                                <Cell key={`bar-${index}`} fill={entry.color} />
                              ))}
                            </Bar>
                          </BarChart>
                        ) : (
                          <PieChart>
                            <Pie
                              data={pollStats}
                              cx="50%"
                              cy="50%"
                              innerRadius={55}
                              outerRadius={85}
                              paddingAngle={4}
                              dataKey="count"
                              stroke="none"
                            >
                              {pollStats.map((entry, index) => (
                                <Cell key={`pie-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip
                              content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                  const data = payload[0].payload;
                                  return (
                                    <div className="fluent-box border border-purple-500/40 p-2.5 rounded-[2px] shadow-xl text-xs">
                                      <p className="font-bold text-white mb-0.5">{data.name}</p>
                                      <p className="font-black text-sm" style={{ color: data.color }}>
                                        {data.count} phiếu ({data.percent}%)
                                      </p>
                                    </div>
                                  );
                                }
                                return null;
                              }}
                            />
                            <Legend
                              verticalAlign="bottom"
                              height={30}
                              iconType="circle"
                              formatter={(value) => <span className="text-xs font-mono text-white/70">{value}</span>}
                            />
                          </PieChart>
                        )}
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="text-center py-10 space-y-2">
                      <BarChart3 className="w-10 h-10 mx-auto text-white/20" />
                      <p className="text-xs font-mono text-white/40">Đang chờ phiếu biểu quyết từ khán phòng...</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Master Control Buttons for Live Poll */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-white/10">
                <div className="flex flex-wrap items-center gap-2.5">
                  {currentPoll.status === 'ACTIVE' && (
                    <button
                      type="button"
                      id="btn-poll-lock"
                      onClick={handleLockPoll}
                      className="px-4 py-2.5 rounded-[2px] bg-amber-950/60 hover:bg-amber-900/60 text-amber-300 border border-amber-500/50 font-bold text-xs flex items-center gap-2 transition active:scale-95 shadow-md cursor-pointer"
                    >
                      <Lock className="w-4 h-4" />
                      <span>Khóa Nhận Phiếu</span>
                    </button>
                  )}

                  {currentPoll.status !== 'REVEALED' && (
                    <button
                      type="button"
                      id="btn-poll-reveal"
                      onClick={handleRevealPoll}
                      className="px-5 py-2.5 rounded-[2px] bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition active:scale-95 shadow-lg border border-emerald-400 cursor-pointer"
                    >
                      <Eye className="w-4 h-4" />
                      <span>Công Bố Kết Quả Lên Màn Chiếu & Điện Thoại</span>
                    </button>
                  )}

                  <button
                    type="button"
                    id="btn-poll-export-csv"
                    onClick={handleExportCSV}
                    className="px-3.5 py-2.5 rounded-[2px] fluent-box-nested hover:bg-white/15 text-white font-bold text-xs flex items-center gap-1.5 transition border border-white/15 cursor-pointer"
                  >
                    <Download className="w-4 h-4 text-sky-400" />
                    <span>Xuất CSV</span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    id="btn-poll-dismiss-trigger"
                    onClick={() => setIsDismissDialogOpen(true)}
                    className="px-4 py-2.5 rounded-[2px] bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 border border-rose-500/40 font-bold text-xs flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Đóng Poll & Trở Lại Game</span>
                  </button>
                </div>

              </div>
            </div>
          ) : (
            <div className="fluent-box border border-dashed border-white/20 rounded-[2px] p-10 text-center space-y-4 text-white">
              <div className="w-16 h-16 rounded-[2px] fluent-box-nested border border-purple-500/30 flex items-center justify-center mx-auto text-[#F7CAC9]">
                <BarChart3 className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-white">Chưa có khảo sát nào đang phát sóng trực tiếp</h3>
                <p className="text-xs text-white/50 max-w-md mx-auto">
                  Bạn có thể tạo câu hỏi trắc nghiệm mới hoặc chọn một câu hỏi mẫu từ ngân hàng để phát sóng tức thì tới khán phòng.
                </p>
              </div>
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setManagerTab('CREATOR')}
                  className="px-5 py-2.5 rounded-[2px] bg-[#F7CAC9] hover:bg-[#FCEEEC] text-[#190839] font-black text-xs flex items-center gap-2 shadow-lg transition active:scale-95 cursor-pointer"
                >
                  <Zap className="w-4 h-4" />
                  <span>Tạo Poll Trắc Nghiệm Mới</span>
                </button>

                <button
                  type="button"
                  onClick={() => setManagerTab('PRESETS')}
                  className="px-4 py-2.5 rounded-[2px] fluent-box-nested hover:bg-white/15 text-white font-bold text-xs flex items-center gap-2 transition border border-white/15 cursor-pointer"
                >
                  <Layers className="w-4 h-4 text-sky-400" />
                  <span>Xem Ngân Hàng Mẫu</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ================= VIEW 2: MULTIPLE CHOICE POLL CREATOR ================= */}
      {managerTab === 'CREATOR' && (
        <div className="fluent-box rounded-[2px] p-5 sm:p-7 shadow-2xl space-y-6 text-white border border-white/10">
          {/* Header Title */}
          <div className="flex items-center justify-between border-b border-white/10 pb-4 flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-[2px] fluent-box-nested border border-[#F7CAC9]/30 flex items-center justify-center text-[#F7CAC9]">
                <Edit3 className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-black text-white uppercase tracking-wider">
                  Trình Soạn Thảo & Phát Sóng Poll Trực Tiếp
                </h2>
                <p className="text-xs text-white/50">
                  Thiết lập câu hỏi, đáp án lựa chọn (A, B, C, D...), thời gian đếm ngược và nguồn gốc câu hỏi
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setManagerTab('PRESETS')}
                className="px-3 py-1.5 rounded-[2px] fluent-box-nested hover:bg-white/15 text-white/80 hover:text-white text-xs font-mono font-bold transition flex items-center gap-1.5 border border-white/10 cursor-pointer"
              >
                <Layers className="w-3.5 h-3.5 text-sky-400" />
                <span>Nạp Từ Mẫu Sẵn Có</span>
              </button>
            </div>
          </div>

          {/* 1. Poll Format Switcher (Multiple Choice 4 Options, 2 Options, Custom) */}
          <div className="space-y-2.5">
            <label className="text-xs font-bold uppercase tracking-wider text-[#F7CAC9] flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-[#F7CAC9]" />
              <span>1. Kiểu khảo sát (Format):</span>
            </label>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
              {[
                { id: 'MULTIPLE_CHOICE', label: 'Trắc nghiệm 4 đáp án (A, B, C, D)', badge: '4 Lựa chọn' },
                { id: 'YES_NO', label: 'Có / Không', badge: '2 Lựa chọn' },
                { id: 'TRUE_FALSE', label: 'Đúng / Sai', badge: '2 Lựa chọn' },
                { id: 'AGREE_DISAGREE', label: 'Đồng ý / Phản đối', badge: '2 Lựa chọn' },
                { id: 'CUSTOM', label: 'Tùy chỉnh số lượng đáp án', badge: 'Tùy biến' }
              ].map(item => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleTypeChange(item.id as any)}
                  className={`p-3 rounded-[2px] border text-left transition flex flex-col justify-between gap-2 cursor-pointer ${
                    pollType === item.id
                      ? 'fluent-box-nested border-[#F7CAC9] text-white shadow-lg ring-1 ring-[#F7CAC9]'
                      : 'fluent-box-nested border-white/10 text-white/60 hover:text-white hover:bg-white/15'
                  }`}
                >
                  <span className="text-xs font-bold leading-tight">{item.label}</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-[2px] bg-black/60 text-[#F7CAC9] self-start border border-white/10">
                    {item.badge}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* 2. Source Origin Selection (Advisors / Contestants / Jury / Audience / Host) */}
          <div className="space-y-3 p-4 rounded-[2px] fluent-box-nested border border-white/10">
            <label className="text-xs font-bold uppercase tracking-wider text-sky-300 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <UserCheck className="w-4 h-4 text-sky-400" />
                <span>2. Nguồn gốc câu hỏi (Ai là người đặt câu hỏi?):</span>
              </span>
              <span className="text-[10px] text-white/40">Hiển thị trực tiếp trên Máy chiếu & Điện thoại</span>
            </label>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {(Object.keys(SOURCE_TYPE_CONFIG) as EmergencyPollSourceType[]).map((type) => {
                const cfg = SOURCE_TYPE_CONFIG[type];
                const Icon = cfg.icon;
                const isSelected = sourceType === type;

                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => handleSelectSourceType(type)}
                    className={`p-2.5 rounded-[2px] border text-xs font-bold transition flex flex-col items-center justify-center gap-1.5 text-center cursor-pointer ${
                      isSelected
                        ? `fluent-box-nested ${cfg.border} ${cfg.color} shadow-lg ring-1 ring-white/20`
                        : 'fluent-box-nested border-white/10 text-white/60 hover:text-white hover:bg-white/15'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-[11px] leading-tight">{cfg.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="space-y-1">
                <span className="text-[10px] font-mono uppercase text-white/60 font-bold">
                  Tên người / đại diện đặt câu hỏi:
                </span>
                <input
                  type="text"
                  value={sourceName}
                  onChange={(e) => setSourceName(e.target.value)}
                  placeholder={SOURCE_TYPE_CONFIG[sourceType].defaultName}
                  className="w-full bg-[#0E051C]/60 border border-white/15 focus:border-[#F7CAC9] rounded-[2px] px-3 py-2 text-xs font-bold text-white focus:outline-none placeholder-white/30"
                />
                {/* Suggestions */}
                <div className="flex flex-wrap gap-1 pt-1">
                  {SOURCE_TYPE_CONFIG[sourceType].suggestions.map((sug, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => {
                        vibrateTap();
                        setSourceName(sug);
                      }}
                      className="text-[10px] px-2 py-0.5 rounded-[2px] fluent-box-nested hover:bg-white/15 text-white/60 hover:text-white transition cursor-pointer"
                    >
                      + {sug}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-mono uppercase text-white/60 font-bold">
                  Ghi chú ngữ cảnh tình huống (Tùy chọn):
                </span>
                <input
                  type="text"
                  value={contextNote}
                  onChange={(e) => setContextNote(e.target.value)}
                  placeholder="VD: Phản biện câu hỏi VCNV, Thử thách phân định điểm số..."
                  className="w-full bg-[#0E051C]/60 border border-white/15 focus:border-[#F7CAC9] rounded-[2px] px-3 py-2 text-xs text-white focus:outline-none placeholder-white/30"
                />
              </div>
            </div>
          </div>

          {/* 3. Question Text Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-white/80 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <MessageSquareQuote className="w-4 h-4 text-[#F7CAC9]" />
                <span>3. Nội dung câu hỏi khảo sát / biểu quyết:</span>
              </span>
              <span className="text-[10px] font-mono text-white/40">{questionText.length} ký tự</span>
            </label>
            <textarea
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              placeholder="Nhập nội dung câu hỏi trắc nghiệm bạn muốn phát sóng tức thì tới toàn bộ khán phòng..."
              rows={3}
              className="w-full bg-[#0E051C]/60 border border-white/15 focus:border-[#F7CAC9] rounded-[2px] p-4 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-[#F7CAC9] transition resize-none"
            />
          </div>

          {/* 4. Multiple Choice Options Editor */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-white/80 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-emerald-400" />
                <span>4. Danh sách các lựa chọn đáp án ({optionsList.length} lựa chọn):</span>
              </label>

              {pollType === 'CUSTOM' && optionsList.length < 6 && (
                <button
                  type="button"
                  onClick={handleAddOption}
                  className="px-2.5 py-1 rounded-[2px] fluent-box-nested hover:bg-white/15 text-emerald-300 border border-emerald-500/40 text-xs font-mono font-bold flex items-center gap-1 transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Thêm lựa chọn</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {optionsList.map((optText, index) => {
                const letter = OPTION_LETTERS[index] || `OPT_${index + 1}`;
                const color = OPTION_COLORS[index % OPTION_COLORS.length];
                const isSelectedAsCorrect = correctOption === letter;

                return (
                  <div
                    key={index}
                    className="p-3 fluent-box-nested border border-white/10 rounded-[2px] space-y-1.5 focus-within:border-[#F7CAC9] transition relative"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-6 h-6 rounded-[2px] font-mono font-black text-xs flex items-center justify-center shadow-inner"
                          style={{ backgroundColor: `${color}30`, color, border: `1px solid ${color}60` }}
                        >
                          {letter}
                        </span>
                        <span className="text-[10px] font-mono text-white/50 uppercase">
                          Lựa chọn {letter}:
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            vibrateTap();
                            setCorrectOption(isSelectedAsCorrect ? '' : letter);
                          }}
                          className={`px-2 py-0.5 rounded-[2px] text-[10px] font-mono font-bold transition border cursor-pointer ${
                            isSelectedAsCorrect
                              ? 'bg-emerald-500 text-white border-emerald-400 shadow'
                              : 'fluent-box-nested text-white/40 border-white/10 hover:text-white/80'
                          }`}
                          title="Đánh dấu đây là đáp án đúng (tùy chọn)"
                        >
                          {isSelectedAsCorrect ? '✓ ĐÁP ÁN ĐÚNG' : 'Đánh dấu đúng'}
                        </button>

                        {pollType === 'CUSTOM' && optionsList.length > 2 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveOption(index)}
                            className="text-white/30 hover:text-rose-400 p-1 transition cursor-pointer"
                            title="Xóa lựa chọn này"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    <input
                      type="text"
                      value={optText}
                      onChange={(e) => handleOptionChange(index, e.target.value)}
                      placeholder={`Nội dung lựa chọn ${letter}...`}
                      className="w-full bg-[#0E051C]/60 border border-white/10 rounded-[2px] px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-[#F7CAC9]"
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {/* 5. Set Duration / Countdown Time Limit */}
          <div className="space-y-4 p-4 rounded-[2px] fluent-box-nested border border-amber-500/30">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <label className="text-xs font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                <Timer className="w-4 h-4 text-amber-400" />
                <span>5. Thời lượng đếm ngược:</span>
              </label>
              
              <div className="flex items-center gap-2 bg-black/40 px-3 py-1.5 rounded-[2px] border border-white/5">
                 <span className="text-xs font-bold text-white/70">Bật đếm ngược</span>
                 <button
                   type="button"
                   role="switch"
                   aria-checked={timeLimit > 0}
                   onClick={() => {
                     vibrateTap();
                     setTimeLimit(timeLimit > 0 ? 0 : 30);
                   }}
                   className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors duration-200 ease-in-out cursor-pointer ${
                     timeLimit > 0 ? 'bg-amber-500' : 'bg-white/20'
                   }`}
                 >
                   <span
                     className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ease-in-out ${
                       timeLimit > 0 ? 'translate-x-5' : 'translate-x-0'
                     }`}
                   />
                 </button>
              </div>
            </div>

            {timeLimit > 0 ? (
              <div className="space-y-3 pt-2">
                <div className="flex items-center gap-4">
                   <input
                      type="range"
                      min={10} max={180} step={5}
                      value={timeLimit}
                      onChange={(e) => setTimeLimit(Number(e.target.value))}
                      className="w-full h-2 bg-white/20 rounded-[2px] appearance-none cursor-pointer accent-amber-400"
                   />
                   <span className="text-sm font-mono font-bold text-amber-300 min-w-[60px] text-right bg-black/50 px-3 py-1.5 rounded-[2px] border border-amber-500/30">
                     {timeLimit}s
                   </span>
                </div>

                <div className="flex flex-wrap gap-1.5 pt-2 border-t border-white/10">
                  {[
                    { sec: 15, label: '15s' },
                    { sec: 30, label: '30s' },
                    { sec: 45, label: '45s' },
                    { sec: 60, label: '60s' },
                    { sec: 90, label: '90s' },
                    { sec: 120, label: '120s' }
                  ].map(item => (
                    <button
                      key={item.sec}
                      type="button"
                      onClick={() => {
                        vibrateTap();
                        setTimeLimit(item.sec);
                      }}
                      className={`px-3 py-1.5 rounded-[2px] border text-xs font-mono font-bold transition cursor-pointer ${
                        timeLimit === item.sec
                          ? 'bg-amber-500 text-black border-amber-400 shadow-md'
                          : 'fluent-box-nested border-white/10 text-white/70 hover:text-white hover:bg-white/15'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-xs font-mono text-white/50 text-center py-2 italic bg-black/20 rounded-[2px]">
                🔒 Đã tắt đếm ngược. Quản trò sẽ khóa bình chọn thủ công.
              </div>
            )}
          </div>

          {/* Launch Action Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-white/10">
            <div className="text-xs text-white/40 font-mono">
              🚀 Ngay khi bấm "Phát Sóng Ngay", câu hỏi sẽ bật lên trên toàn bộ thiết bị khán giả và máy chiếu.
            </div>

            <button
              type="button"
              id="btn-poll-launch-now"
              disabled={isSubmitting || !questionText.trim()}
              onClick={handleLaunchPoll}
              className="px-8 py-3.5 rounded-[2px] bg-[#F7CAC9] hover:bg-[#FCEEEC] text-[#190839] font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2.5 shadow-xl transition active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              <Zap className="w-5 h-5 fill-[#190839]" />
              <span>{isSubmitting ? 'Đang phát sóng...' : 'Phát Sóng Live Ngay Tới Khán Phòng'}</span>
            </button>
          </div>
        </div>
      )}

      {/* ================= VIEW 3: PRESETS & SAMPLE QUESTIONS BANK ================= */}
      {managerTab === 'PRESETS' && (
        <div className="fluent-box rounded-[2px] p-5 sm:p-7 shadow-2xl space-y-6 text-white border border-white/10">
          <div className="flex items-center justify-between border-b border-white/10 pb-4 flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-[2px] fluent-box-nested border border-sky-500/40 flex items-center justify-center text-sky-300">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-black text-white uppercase tracking-wider">
                  Ngân Hàng Câu Hỏi Khảo Sát Mẫu Chuẩn Bị Sẵn
                </h2>
                <p className="text-xs text-white/50">
                  Chọn câu hỏi để chỉnh sửa trước khi phát sóng hoặc bấm "Phát Sóng Ngay" tức thì
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setManagerTab('CREATOR')}
              className="px-4 py-2 rounded-[2px] bg-[#F7CAC9] hover:bg-[#FCEEEC] text-[#190839] font-black text-xs flex items-center gap-1.5 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Tự Soạn Câu Hỏi Mới</span>
            </button>
          </div>

          {/* Grid of Preset Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {PRESET_POLLS.map((preset) => {
              const cfg = SOURCE_TYPE_CONFIG[preset.source_type] || SOURCE_TYPE_CONFIG.HOST;
              const Icon = cfg.icon;
              const optionsArr = Object.entries(preset.options || {});

              return (
                <div
                  key={preset.id}
                  className="p-5 rounded-[2px] fluent-box-nested border border-white/10 hover:border-[#F7CAC9]/40 transition flex flex-col justify-between gap-4 group"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className={`px-2.5 py-0.5 rounded-[2px] text-[11px] font-bold border flex items-center gap-1.5 ${cfg.badgeBg} ${cfg.border}`}>
                        <Icon className="w-3.5 h-3.5" />
                        <span>{preset.source_name || cfg.label}</span>
                      </span>

                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-[2px] bg-white/10 text-white/70 font-mono text-[10px]">
                          {optionsArr.length} lựa chọn
                        </span>
                        <span className="px-2 py-0.5 rounded-[2px] bg-white/10 text-amber-300 font-mono text-[10px]">
                          ⏱️ {preset.time_limit}s
                        </span>
                      </div>
                    </div>

                    <p className="text-sm sm:text-base font-bold text-white leading-relaxed">
                      "{preset.question}"
                    </p>

                    {/* Options Preview Pills */}
                    <div className="grid grid-cols-2 gap-1.5 pt-1">
                      {optionsArr.map(([k, text]) => (
                        <div key={k} className="px-2.5 py-1.5 rounded-[2px] bg-black/60 border border-white/10 text-[11px] font-mono text-white/80 truncate">
                          <strong className="text-sky-300 mr-1">{k}:</strong>
                          <span>{text}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/5">
                    <button
                      type="button"
                      onClick={() => handleApplyPreset(preset)}
                      className="px-3 py-1.5 rounded-[2px] fluent-box hover:bg-white/15 text-white text-xs font-bold flex items-center gap-1.5 transition border border-white/10 cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-sky-300" />
                      <span>Nạp & Tùy Chỉnh</span>
                    </button>

                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => handleLaunchPresetDirectly(preset)}
                      className="px-4 py-1.5 rounded-[2px] bg-[#F7CAC9] hover:bg-[#FCEEEC] text-[#190839] text-xs font-black flex items-center gap-1.5 shadow-md transition disabled:opacity-50 cursor-pointer"
                    >
                      <Zap className="w-3.5 h-3.5 fill-[#190839]" />
                      <span>Phát Sóng Ngay</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ================= VIEW 4: AI ASSISTANT ================= */}
      {managerTab === 'AI_ASSISTANT' && (
        <div className="fluent-box rounded-[2px] p-5 sm:p-7 shadow-2xl space-y-6 text-white border border-white/10">
          <div className="flex items-center gap-3 border-b border-white/10 pb-4">
            <div className="w-10 h-10 rounded-[2px] fluent-box-nested border border-emerald-500/40 flex items-center justify-center text-emerald-300">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white uppercase tracking-wider">
                Trợ Lý AI Tạo Câu Hỏi
              </h2>
              <p className="text-xs text-white/50">
                Nhập chủ đề hoặc yêu cầu, AI sẽ sinh ngay một câu trắc nghiệm 4 đáp án
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-white/70 uppercase tracking-wider mb-2">
                Chủ đề hoặc Yêu cầu cho AI
              </label>
              <textarea
                value={aiPrompt}
                onChange={e => setAiPrompt(e.target.value)}
                placeholder="VD: Tạo 1 câu trắc nghiệm vui về chủ đề bảo mật mạng, độ khó trung bình..."
                className="w-full bg-[#0E051C]/60 border border-white/10 focus:border-emerald-500/50 rounded-[2px] p-4 text-sm text-white placeholder-white/30 outline-none transition min-h-[120px] resize-none"
              />
            </div>

            {aiError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-[2px] text-xs text-rose-300 flex items-center gap-2">
                <AlertOctagon className="w-4 h-4" />
                <span>{aiError}</span>
              </div>
            )}

            <div className="flex justify-end">
              <button
                type="button"
                disabled={isAiGenerating || !aiPrompt.trim()}
                onClick={handleGenerateAIQuestion}
                className="px-6 py-3 rounded-[2px] bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold text-sm flex items-center gap-2 shadow-lg transition disabled:opacity-50 cursor-pointer"
              >
                {isAiGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>AI Đang Suy Nghĩ...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Tạo Câu Hỏi</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      </div>

      {/* Dismiss Poll Confirmation Modal */}
      {isDismissDialogOpen && (
        <div className="fluent-dialog-overlay animate-fadeIn">
          <div className="max-w-md w-full fluent-box border border-rose-500/30 rounded-[2px] p-6 shadow-2xl text-white">
            <h3 className="font-black text-rose-300 text-lg">Xác nhận Đóng Poll?</h3>
            <p className="text-white/70 text-sm mt-2">
              Bạn có chắc chắn muốn đóng bình chọn trực tiếp này và đưa khán giả trở lại màn hình chờ không? Thao tác này sẽ dừng ngay lập tức việc nhận bình chọn.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsDismissDialogOpen(false)}
                className="px-4 py-2 rounded-[2px] fluent-box-nested hover:bg-white/20 text-white font-bold text-sm transition cursor-pointer border border-white/10"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={async () => {
                  setIsDismissDialogOpen(false);
                  await handleDismissPoll();
                }}
                className="px-4 py-2 rounded-[2px] bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm transition shadow-lg cursor-pointer"
              >
                Đồng ý Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-[350] fluent-box border border-[#F7CAC9]/40 text-[#F7CAC9] px-4 py-3 rounded-[2px] shadow-2xl flex items-center gap-2 animate-fadeIn text-sm">
          <AlertCircle className="w-4 h-4 text-[#F7CAC9] shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};

