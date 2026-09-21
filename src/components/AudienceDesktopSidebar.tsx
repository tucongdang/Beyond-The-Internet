import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useLanguage } from '../hooks/useLanguage';
import { GameState, UserInfo } from '../types';
import { 
  Trophy, 
  Keyboard, 
  Volume2, 
  VolumeX, 
  Sun, 
  SunMedium, 
  Contrast, 
  QrCode, 
  Sparkles, 
  Zap, 
  CheckCircle2, 
  Activity,
  User,
  History,
  Maximize,
  Minimize,
  X,
  ChevronRight,
  ChevronLeft,
  Heart,
  MessageSquare,
  Wrench,
  BarChart3,
  Flame,
  HelpCircle,
  Sliders
} from 'lucide-react';
import { t } from '../utils/i18n';
import { soundFx } from '../services/audioEffects';
import { vibrateTap, vibrateSelection } from '../utils/hapticUtils';
import { getUserDisplayUid } from '../utils/uidUtils';
import { useBatterySaver } from '../utils/batterySaverUtils';
import { BatterySaverModal } from './BatterySaverModal';
import { AudioSettingsModal } from './AudioSettingsModal';
import { AudienceCheerButton } from './AudienceCheerButton';
import { AudienceQAWidget } from './AudienceQAWidget';
import { QuestionLikeButton } from './QuestionLikeButton';

interface AudienceDesktopSidebarProps {
  user: UserInfo | null;
  gameState: GameState;
  userPerformance: {
    totalScore: number;
    rank: string | number;
    accuracyRate: number;
    correctCount: number;
    totalAnswered: number;
    avgLatency: number;
    totalPlayers: number;
  } | null;
  isHighContrast?: boolean;
  onToggleHighContrast?: () => void;
  isWakeLockLocked?: boolean;
  isWakeLockSupported?: boolean;
  onToggleWakeLock?: () => void;
  onOpenShareModal: () => void;
  onOpenProfile: () => void;
  onOpenLogModal?: () => void;
  onOpenQAModal?: () => void;
  selectedChoice?: string;
  hasVotedThisQuestion?: boolean;
  timeLeft?: number;
  lastKeyPressed?: string;
}

type TabType = 'PROFILE' | 'HOTKEYS' | 'TOOLS' | 'COMMUNITY';

export const AudienceDesktopSidebar: React.FC<AudienceDesktopSidebarProps> = ({
  user,
  gameState,
  userPerformance,
  isHighContrast = false,
  onToggleHighContrast,
  isWakeLockLocked = false,
  isWakeLockSupported = true,
  onToggleWakeLock,
  onOpenShareModal,
  onOpenProfile,
  onOpenLogModal,
  onOpenQAModal,
  selectedChoice = '',
  hasVotedThisQuestion = false,
  timeLeft = 0,
  lastKeyPressed = ''
}) => {
  const { localLanguage } = useLanguage();

  const { isBatterySaver } = useBatterySaver();
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [isDockCollapsed, setIsDockCollapsed] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<TabType>('PROFILE');
  const [isBatterySaverModalOpen, setIsBatterySaverModalOpen] = useState(false);
  const [isAudioSettingsOpen, setIsAudioSettingsOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(soundFx.isEnabled());
  const [isFullscreen, setIsFullscreen] = useState<boolean>(Boolean(document.fullscreenElement));

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // Global hotkeys to open floating tab with 'H' or close with 'Escape'
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
        soundFx.playClick();
      }
      if (e.key.toUpperCase() === 'H' || e.key.toUpperCase() === 'K') {
        if (!e.ctrlKey && !e.metaKey && !e.altKey) {
          e.preventDefault();
          soundFx.playClick();
          vibrateTap();
          setIsOpen(prev => {
            if (!prev) setActiveTab('HOTKEYS');
            return !prev;
          });
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const handleToggleFullscreen = () => {
    soundFx.playClick();
    vibrateTap();
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.warn('Fullscreen request failed:', err);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(err => {
          console.warn('Exit fullscreen failed:', err);
        });
      }
    }
  };

  const handleToggleSound = () => {
    const nextState = !soundEnabled;
    soundFx.setEnabled(nextState);
    setSoundEnabled(nextState);
    if (nextState) {
      soundFx.playClick();
    }
  };

  const handleOpenTab = (tab: TabType) => {
    soundFx.playTing();
    vibrateSelection();
    setActiveTab(tab);
    setIsOpen(true);
  };

  const isQuestionActive = gameState.status === 'ACTIVE' && timeLeft > 0;

  const sidebarContent = (
    <>
      {/* ========================================================================= */}
      {/* 1. FLOATING EDGE TAB DOCK (Cố định cạnh phải, gắn cố định vào viewport màn hình) */}
      {/* ========================================================================= */}
      {isDockCollapsed ? (
        <button
          id="btn-expand-audience-dock"
          type="button"
          onClick={() => {
            soundFx.playClick();
            vibrateTap();
            setIsDockCollapsed(false);
          }}
          className="hidden lg:flex fixed right-0 top-1/2 -translate-y-1/2 z-[45] p-2 pl-2.5 fluent-box border-y border-l border-white/10 rounded-l-[2px] text-slate-400 hover:text-white transition-all shadow-2xl cursor-pointer hover-effect pointer-events-auto"
          title={t("sidebar_show", localLanguage)}
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
      ) : (
        <aside 
          id="audience-floating-dock-trigger"
          className="hidden lg:flex fixed right-0 top-1/2 -translate-y-1/2 z-[45] flex-col items-end pointer-events-auto select-none"
          aria-label="Toolbar"
        >
          <div className="flex flex-col gap-1.5 p-1.5 pr-0 rounded-l-[2px] fluent-box border-y border-l border-white/10 shadow-2xl transition-all duration-300">
            
            {/* Tab 1: Profile & Rank Trigger */}
          <button
            type="button"
            onClick={() => handleOpenTab('PROFILE')}
            className={`p-2 rounded-[2px] flex items-center gap-2 transition-all cursor-pointer hover-effect ${
              isOpen && activeTab === 'PROFILE'
                ? 'bg-amber-400 text-black font-bold shadow-lg shadow-amber-400/30'
                : 'bg-white/10 text-amber-300 hover:text-amber-200 border border-amber-400/30'
            }`}
            title={t("sidebar_profile_rank", localLanguage)}
          >
            <User className="w-4 h-4 shrink-0" />
            {userPerformance ? (
              <span className="hidden xl:inline text-xs font-mono font-black">
                #{userPerformance.rank}
              </span>
            ) : null}
          </button>

          {/* Tab 2: Hotkeys Trigger */}
          <button
            type="button"
            onClick={() => handleOpenTab('HOTKEYS')}
            className={`p-2 rounded-[2px] flex items-center gap-2 transition-all cursor-pointer relative hover-effect ${
              isOpen && activeTab === 'HOTKEYS'
                ? 'bg-purple-500 text-white font-bold shadow-lg shadow-purple-500/30'
                : 'bg-white/10 text-purple-300 hover:text-purple-200 border border-purple-400/30'
            }`}
            title={t("sidebar_keys_guide", localLanguage)}
          >
            <Keyboard className="w-4 h-4 shrink-0" />
            {isQuestionActive && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 border border-black animate-ping" />
            )}
          </button>

          {/* Tab 3: Tools & Settings Trigger */}
          <button
            type="button"
            onClick={() => handleOpenTab('TOOLS')}
            className={`p-2 rounded-[2px] flex items-center gap-2 transition-all cursor-pointer hover-effect ${
              isOpen && activeTab === 'TOOLS'
                ? 'bg-[#F7CAC9] text-black font-bold shadow-lg shadow-[#F7CAC9]/30'
                : 'bg-white/10 text-slate-200 hover:text-white border border-white/20'
            }`}
            title={t("sidebar_tools", localLanguage)}
          >
            <Wrench className="w-4 h-4 shrink-0" />
          </button>

          {/* Tab 4: Community / Cheer / QA Trigger */}
          <button
            type="button"
            onClick={() => handleOpenTab('COMMUNITY')}
            className={`p-2 rounded-[2px] flex items-center gap-2 transition-all cursor-pointer hover-effect ${
              isOpen && activeTab === 'COMMUNITY'
                ? 'bg-rose-500 text-white font-bold shadow-lg shadow-rose-500/30'
                : 'bg-white/10 text-rose-300 hover:text-rose-200 border border-rose-400/30'
            }`}
            title={t("sidebar_qna_cheer", localLanguage)}
          >
            <Heart className="w-4 h-4 shrink-0" />
          </button>

          {/* Open/Close Arrow Button */}
          <button
            type="button"
            onClick={() => {
              soundFx.playClick();
              vibrateTap();
              setIsDockCollapsed(true);
              setIsOpen(false);
            }}
            className="p-1 rounded-[2px] bg-white/10 hover:bg-white/20 text-slate-400 hover:text-white flex items-center justify-center transition mr-1.5 hover-effect"
            title={t("sidebar_hide_toolbar", localLanguage)}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </aside>
      )}

      {/* ========================================================================= */}
      {/* 2. FLOATING TAB DRAWER OVERLAY (Trượt từ phải sang, không chiếm chỗ câu hỏi) */}
      {/* ========================================================================= */}
      {isOpen && (
        <>
          {/* Backdrop click to close on tablet viewports */}
          <div 
            className="hidden sm:block fixed inset-0 bg-black/50 backdrop-blur-sm z-[45] xl:bg-transparent xl:pointer-events-none transition-opacity cursor-pointer"
            onClick={() => setIsOpen(false)}
          />

          <div
            id="audience-floating-tab-panel"
            className="hidden sm:flex fixed right-0 top-14 bottom-0 w-[85vw] sm:w-[360px] lg:w-[400px] max-w-full z-[46] rounded-l-[4px] fluent-box border-y border-l border-white/10 shadow-2xl flex-col overflow-hidden animate-slideInRight"
          >
            {/* Header: Tabs selector and Close button */}
            <div className="p-3.5 pb-2.5 border-b border-white/10 fluent-box-nested flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-[2px] fluent-box text-[#F7CAC9] border border-[#F7CAC9]/30">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <h3 className="font-extrabold text-sm text-white uppercase tracking-wider">
                    {t("sidebar_tab_title", localLanguage)}
                  </h3>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-[2px] bg-white/10 text-white/70 border border-white/10 hidden sm:inline">
                    {t("sidebar_h_to_close", localLanguage)}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      soundFx.playClick();
                      setIsOpen(false);
                    }}
                    className="p-1.5 rounded-[2px] bg-white/10 hover:bg-white/20 text-white transition hover-effect"
                    title={t("sidebar_esc_to_close", localLanguage)}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Navigation Tabs Pill Bar */}
              <div className="grid grid-cols-4 gap-1 p-1 rounded-[2px] fluent-box border border-white/10">
                <button
                  type="button"
                  onClick={() => handleOpenTab('PROFILE')}
                  className={`py-1.5 px-1 rounded-[2px] text-xs font-bold transition flex items-center justify-center gap-1 hover-effect ${
                    activeTab === 'PROFILE'
                      ? 'bg-amber-400 text-black shadow-md'
                      : 'text-white/60 hover:text-white'
                  }`}
                >
                  <User className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{localLanguage !== 'vi' ? 'Profile' : 'Hồ Sơ'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleOpenTab('HOTKEYS')}
                  className={`py-1.5 px-1 rounded-[2px] text-xs font-bold transition flex items-center justify-center gap-1 relative hover-effect ${
                    activeTab === 'HOTKEYS'
                      ? 'bg-purple-500 text-white shadow-md'
                      : 'text-white/60 hover:text-white'
                  }`}
                >
                  <Keyboard className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{localLanguage !== 'vi' ? 'Keys' : 'Phím Tắt'}</span>
                  {isQuestionActive && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping absolute top-1 right-1" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => handleOpenTab('TOOLS')}
                  className={`py-1.5 px-1 rounded-[2px] text-xs font-bold transition flex items-center justify-center gap-1 hover-effect ${
                    activeTab === 'TOOLS'
                      ? 'bg-[#F7CAC9] text-black shadow-md'
                      : 'text-white/60 hover:text-white'
                  }`}
                >
                  <Wrench className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{localLanguage !== 'vi' ? 'Tools' : 'Công Cụ'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleOpenTab('COMMUNITY')}
                  className={`py-1.5 px-1 rounded-[2px] text-xs font-bold transition flex items-center justify-center gap-1 hover-effect ${
                    activeTab === 'COMMUNITY'
                      ? 'bg-rose-500 text-white shadow-md'
                      : 'text-white/60 hover:text-white'
                  }`}
                >
                  <Heart className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{localLanguage !== 'vi' ? 'Interact' : 'Giao Lưu'}</span>
                </button>
              </div>
            </div>

            {/* Scrollable Content Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
              
              {/* ========================================================= */}
              {/* TAB 1: PROFILE & STATS */}
              {/* ========================================================= */}
              {activeTab === 'PROFILE' && (
                <div className="space-y-3.5 animate-fadeIn">
                  {/* Identity Card */}
                  <div className="p-4 rounded-[2px] fluent-box-nested">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            setIsOpen(false);
                            onOpenProfile();
                          }}
                          className="w-11 h-11 rounded-[2px] fluent-acrylic-surface border border-amber-400/40 text-amber-300 flex items-center justify-center font-bold shadow-md cursor-pointer hover-effect transition"
                          title={t("sidebar_edit_profile", localLanguage)}
                        >
                          <User className="w-5 h-5 text-amber-300" />
                        </button>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <h4 className="font-extrabold text-sm text-white truncate max-w-[150px]">
                              {user?.name || (localLanguage !== 'vi' ? 'Audience' : 'Khán Giả')}
                            </h4>
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" title={t("sidebar_connecting", localLanguage)} />
                          </div>
                          <p className="text-[11px] font-mono text-[#F7CAC9]/80 truncate">
                            MSSV / ID: <strong className="text-white">{user ? getUserDisplayUid(user) : 'N/A'}</strong>
                          </p>
                        </div>
                      </div>

                      {userPerformance && (
                        <div className="px-3 py-1.5 rounded-[2px] fluent-acrylic-surface border border-amber-400/40 text-amber-300 flex flex-col items-end">
                          <span className="text-[9px] font-mono uppercase font-bold text-amber-400/90 tracking-wider">
                            {localLanguage !== 'vi' ? 'RANK' : 'HẠNG'}
                          </span>
                          <span className="text-base font-black font-mono leading-none">#{userPerformance.rank}</span>
                        </div>
                      )}
                    </div>

                    {/* Stats Grid */}
                    {userPerformance ? (
                      <div className="grid grid-cols-2 gap-2">
                        <div className="p-3 rounded-[2px] fluent-box-nested">
                          <span className="text-[10px] font-mono text-white/60 uppercase tracking-wider font-semibold flex items-center gap-1">
                            <Trophy className="w-3.5 h-3.5 text-amber-400" /> {t("sidebar_total_score", localLanguage)}
                          </span>
                          <span className="text-xl font-black font-mono text-white tracking-tight mt-1 block">
                            {userPerformance.totalScore.toLocaleString('vi-VN')}
                            <span className="text-[10px] font-sans font-normal text-amber-300 ml-1">{localLanguage !== 'vi' ? 'p' : 'đ'}</span>
                          </span>
                        </div>

                        <div className="p-3 rounded-[2px] fluent-box-nested">
                          <span className="text-[10px] font-mono text-white/60 uppercase tracking-wider font-semibold flex items-center gap-1">
                            <Activity className="w-3.5 h-3.5 text-emerald-400" /> {t("sidebar_correct_rate", localLanguage)}
                          </span>
                          <div className="flex items-baseline gap-1 mt-1">
                            <span className="text-xl font-black font-mono text-emerald-400">
                              {userPerformance.accuracyRate}%
                            </span>
                            <span className="text-[10px] font-mono text-white/50">
                              ({userPerformance.correctCount}/{userPerformance.totalAnswered})
                            </span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="p-3 rounded-[2px] fluent-box-nested text-xs text-white/50 text-center">
                        {t("sidebar_syncing_score", localLanguage)}
                      </div>
                    )}
                  </div>

                  {/* Current Voting Status */}
                  {hasVotedThisQuestion && (
                    <div className="p-3.5 rounded-[2px] fluent-box-nested border-emerald-500/40 flex items-center justify-between text-xs text-emerald-300">
                      <span className="flex items-center gap-2 font-medium">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        {t("sidebar_current_choice", localLanguage)}
                      </span>
                      <span className="font-mono font-black text-sm px-2.5 py-0.5 rounded-[2px] bg-white/10 text-emerald-200 border border-emerald-400/40">
                        [{selectedChoice}]
                      </span>
                    </div>
                  )}

                  {/* Question Like / Rating */}
                  {gameState.question_id && (
                    <div className="p-3 rounded-[2px] fluent-box-nested flex items-center justify-between">
                      <div className="text-xs text-white/60">
                        <span className="font-mono text-amber-300 font-bold">[{gameState.question_id}]</span> {t("sidebar_question_eval", localLanguage)}
                      </div>
                      <QuestionLikeButton
                        questionId={gameState.question_id}
                        user={user}
                        gameState={gameState}
                        variant="compact"
                      />
                    </div>
                  )}

                  {/* Quick Profile Actions */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setIsOpen(false);
                        onOpenProfile();
                      }}
                      className="p-2.5 rounded-[2px] bg-white/10 hover:bg-white/20 border border-white/10 text-white text-xs font-semibold flex items-center justify-center gap-2 transition hover-effect"
                    >
                      <User className="w-4 h-4 text-amber-300" />
                      <span>{t("sidebar_edit_p", localLanguage)}</span>
                    </button>

                    {onOpenLogModal && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsOpen(false);
                          onOpenLogModal();
                        }}
                        className="p-2.5 rounded-[2px] bg-[#F7CAC9]/15 hover:bg-[#F7CAC9]/30 border border-[#F7CAC9]/40 text-[#F7CAC9] text-xs font-semibold flex items-center justify-center gap-2 transition hover-effect"
                      >
                        <History className="w-4 h-4 text-[#F7CAC9]" />
                        <span>{t("sidebar_log_l", localLanguage)}</span>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* ========================================================= */}
              {/* TAB 2: KEYBOARD HOTKEYS */}
              {/* ========================================================= */}
              {activeTab === 'HOTKEYS' && (
                <div className="space-y-3.5 animate-fadeIn">
                  <div className="flex items-center justify-between pb-1 border-b border-white/10">
                    <span className="text-xs font-bold text-white/80">
                      {localLanguage !== 'vi' ? 'DIRECT ANSWER' : 'TRẢ LỜI CÂU HỎI TRỰC TIẾP'}
                    </span>
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded-[2px] font-bold ${
                      isQuestionActive ? 'bg-white/10 text-emerald-300 border border-emerald-500/40 animate-pulse' : 'bg-white/10 text-white/50'
                    }`}>
                      {isQuestionActive ? (localLanguage !== 'vi' ? 'KEY PRESS' : 'NHẬN PHÍM') : (localLanguage !== 'vi' ? 'READY' : 'SẴN SÀNG')}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                    {[
                      { num: '1', letter: 'A', label: localLanguage !== 'vi' ? 'Option A' : 'Đáp án A' },
                      { num: '2', letter: 'B', label: localLanguage !== 'vi' ? 'Option B' : 'Đáp án B' },
                      { num: '3', letter: 'C', label: localLanguage !== 'vi' ? 'Option C' : 'Đáp án C' },
                      { num: '4', letter: 'D', label: localLanguage !== 'vi' ? 'Option D' : 'Đáp án D' }
                    ].map((keyItem) => {
                      const isPressed = lastKeyPressed === keyItem.num || lastKeyPressed === keyItem.letter;
                      const isOptSelected = selectedChoice.toUpperCase() === keyItem.letter;
                      return (
                        <div 
                          key={keyItem.num}
                          className={`p-2.5 rounded-[2px] border flex items-center justify-between transition-all duration-200 ${
                            isPressed
                              ? 'bg-white/10 border-pink-400 text-white scale-105 shadow-md shadow-pink-500/30 ring-2 ring-pink-400'
                              : isOptSelected
                              ? 'fluent-box-nested border-emerald-400/50 text-emerald-200'
                              : 'fluent-box-nested border-white/10 text-white/80'
                          }`}
                        >
                          <div className="flex items-center gap-1">
                            <kbd className="px-1.5 py-0.5 rounded-[2px] bg-white/10 text-amber-300 border border-amber-400/40 font-bold text-[11px]">
                              {keyItem.num}
                            </kbd>
                            <span className="text-white/30 text-[10px]">/</span>
                            <kbd className="px-1.5 py-0.5 rounded-[2px] bg-white/10 text-amber-300 border border-amber-400/40 font-bold text-[11px]">
                              {keyItem.letter}
                            </kbd>
                          </div>
                          <span className="font-sans text-[11px] font-semibold">{keyItem.label}</span>
                        </div>
                      );
                    })}
                  </div>

                  <div className="p-2.5 rounded-[2px] fluent-box-nested border-purple-500/30 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <kbd className="px-2 py-0.5 rounded-[2px] bg-white/10 text-purple-200 border border-purple-400/40 font-mono font-bold text-xs">
                        Enter
                      </kbd>
                      <span className="text-white/90">{t("sidebar_send_sort", localLanguage)}</span>
                    </div>
                    <span className="text-[10px] text-purple-300 font-mono">{t("sidebar_confirm", localLanguage)}</span>
                  </div>

                  <div className="pt-2 border-t border-white/10">
                    <h5 className="text-[11px] font-mono font-bold text-white/60 mb-2 uppercase">{t("sidebar_quick_keys", localLanguage)}</h5>
                    <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                      <div className="p-2 rounded-[2px] fluent-box-nested border-white/10 flex items-center gap-2">
                        <kbd className="px-1.5 py-0.5 rounded-[2px] bg-white/10 text-white border border-white/20 font-bold">F</kbd>
                        <span className="text-white/80 text-[11px]">{localLanguage !== 'vi' ? 'Fullscreen' : 'Toàn màn hình'}</span>
                      </div>
                      <div className="p-2 rounded-[2px] fluent-box-nested border-white/10 flex items-center gap-2">
                        <kbd className="px-1.5 py-0.5 rounded-[2px] bg-white/10 text-white border border-white/20 font-bold">M</kbd>
                        <span className="text-white/80 text-[11px]">{t("sidebar_mute", localLanguage)}</span>
                      </div>
                      <div className="p-2 rounded-[2px] fluent-box-nested border-white/10 flex items-center gap-2">
                        <kbd className="px-1.5 py-0.5 rounded-[2px] bg-white/10 text-sky-300 border border-sky-500/40 font-bold">Q</kbd>
                        <span className="text-white/80 text-[11px]">{t("sidebar_qna", localLanguage)}</span>
                      </div>
                      <div className="p-2 rounded-[2px] fluent-box-nested border-white/10 flex items-center gap-2">
                        <kbd className="px-1.5 py-0.5 rounded-[2px] bg-white/10 text-purple-300 border border-purple-500/40 font-bold">L</kbd>
                        <span className="text-white/80 text-[11px]">{localLanguage !== 'vi' ? 'Question Logs' : 'Nhật ký câu hỏi'}</span>
                      </div>
                      <div className="p-2 rounded-[2px] fluent-box-nested border-white/10 flex items-center gap-2">
                        <kbd className="px-1.5 py-0.5 rounded-[2px] bg-white/10 text-amber-300 border border-amber-400/40 font-bold">T</kbd>
                        <span className="text-white/80 text-[11px]">{localLanguage !== 'vi' ? 'High Contrast Mode' : 'Nền đen tương phản'}</span>
                      </div>
                      <div className="p-2 rounded-[2px] fluent-box-nested border-white/10 flex items-center gap-2">
                        <kbd className="px-1.5 py-0.5 rounded-[2px] bg-white/10 text-pink-300 border border-pink-500/40 font-bold">H</kbd>
                        <span className="text-white/80 text-[11px]">{t("sidebar_close_tab", localLanguage)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ========================================================= */}
              {/* TAB 3: TOOLS & SETTINGS */}
              {/* ========================================================= */}
              {activeTab === 'TOOLS' && (
                <div className="space-y-2.5 animate-fadeIn">
                  {/* Fullscreen Toggle */}
                  <button
                    type="button"
                    onClick={handleToggleFullscreen}
                    className={`w-full p-3 rounded-[2px] border text-xs font-semibold flex items-center justify-between transition cursor-pointer hover-effect ${
                      isFullscreen
                        ? 'bg-white/10 border-indigo-400 text-indigo-200'
                        : 'fluent-box-nested text-white/80 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      {isFullscreen ? <Minimize className="w-4 h-4 text-indigo-300" /> : <Maximize className="w-4 h-4 text-indigo-300" />}
                      <span>{t("sidebar_full_mode", localLanguage)}</span>
                    </div>
                    <span className="font-mono text-[11px] px-2 py-0.5 rounded-[2px] bg-white/10">{localLanguage !== 'vi' ? "F Key" : "Phím F"}</span>
                  </button>

                  {/* Sound FX Toggle */}
                  <button
                    type="button"
                    onClick={handleToggleSound}
                    className={`w-full p-3 rounded-[2px] border text-xs font-semibold flex items-center justify-between transition cursor-pointer hover-effect ${
                      soundEnabled
                        ? 'bg-white/10 border-purple-500/40 text-purple-200'
                        : 'fluent-box-nested text-white/50 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      {soundEnabled ? <Volume2 className="w-4 h-4 text-purple-400" /> : <VolumeX className="w-4 h-4 text-white/40" />}
                      <span>{t("sidebar_sound_fx", localLanguage)}</span>
                    </div>
                    <span className="font-mono text-[11px] px-2 py-0.5 rounded-[2px] bg-white/10">
                      {soundEnabled ? (localLanguage !== 'vi' ? 'ON (M)' : 'BẬT (M)') : (localLanguage !== 'vi' ? 'OFF (M)' : 'TẮT (M)')}
                    </span>
                  </button>

                  {/* Audio & AI Voice Volume Sliders Modal Trigger */}
                  <button
                    type="button"
                    onClick={() => {
                      soundFx.playClick();
                      vibrateTap();
                      setIsAudioSettingsOpen(true);
                    }}
                    className="w-full p-3 rounded-[2px] border border-sky-500/30 bg-sky-950/20 hover:bg-sky-900/30 text-sky-200 text-xs font-semibold flex items-center justify-between transition cursor-pointer hover-effect"
                  >
                    <div className="flex items-center gap-2.5">
                      <Sliders className="w-4 h-4 text-sky-400" />
                      <span>{localLanguage !== 'vi' ? 'Audio & Voice Volumes' : 'Cài Đặt Âm Lượng'}</span>
                    </div>
                    <span className="font-mono text-[10px] px-2 py-0.5 rounded-[2px] bg-sky-900/40 border border-sky-400/30 text-sky-300">
                      Sliders
                    </span>
                  </button>

                  {/* Wake Lock Screen */}
                  {isWakeLockSupported !== false && onToggleWakeLock && (
                    <button
                      type="button"
                      onClick={() => {
                        soundFx.playClick();
                        vibrateTap();
                        onToggleWakeLock();
                      }}
                      className={`w-full p-3 rounded-[2px] border text-xs font-semibold flex items-center justify-between transition cursor-pointer hover-effect ${
                        isWakeLockLocked
                          ? 'bg-white/10 border-amber-500/40 text-amber-300'
                          : 'fluent-box-nested text-white/50 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        {isWakeLockLocked ? <Sun className="w-4 h-4 text-amber-400 animate-pulse" /> : <SunMedium className="w-4 h-4 text-white/40" />}
                        <span>{t("sidebar_keep_awake", localLanguage)}</span>
                      </div>
                      <span className="font-mono text-[11px] px-2 py-0.5 rounded-[2px] bg-white/10">
                        {isWakeLockLocked ? (localLanguage !== 'vi' ? 'Active' : 'Đang Bật') : (localLanguage !== 'vi' ? 'Off' : 'Tắt')}
                      </span>
                    </button>
                  )}

                  {/* High Contrast Mode */}
                  {onToggleHighContrast && (
                    <button
                      type="button"
                      onClick={() => {
                        soundFx.playClick();
                        vibrateTap();
                        onToggleHighContrast();
                      }}
                      className={`w-full p-3 rounded-[2px] border text-xs font-semibold flex items-center justify-between transition cursor-pointer hover-effect ${
                        isHighContrast
                          ? 'bg-amber-400 text-black border-amber-300 font-bold'
                          : 'fluent-box-nested text-white/50 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Contrast className="w-4 h-4" />
                        <span>{localLanguage !== 'vi' ? 'High Contrast Black' : 'Nền Đen Tương Phản Cao'}</span>
                      </div>
                      <span className="font-mono text-[11px] px-2 py-0.5 rounded-[2px] bg-white/10">{localLanguage !== 'vi' ? "T Key" : "Phím T"}</span>
                    </button>
                  )}

                  {/* Battery Saver */}
                  <button
                    type="button"
                    onClick={() => {
                      soundFx.playClick();
                      vibrateTap();
                      setIsBatterySaverModalOpen(true);
                    }}
                    className={`w-full p-3 rounded-[2px] border text-xs font-semibold flex items-center justify-between transition cursor-pointer hover-effect ${
                      isBatterySaver
                        ? 'bg-emerald-500 text-black border-emerald-400 font-bold'
                        : 'fluent-box-nested text-emerald-300'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Zap className="w-4 h-4 fill-current" />
                      <span>{t("sidebar_battery_saver_set", localLanguage)}</span>
                    </div>
                    <span className="font-mono text-[11px] px-2 py-0.5 rounded-[2px] bg-white/10">
                      {isBatterySaver ? (localLanguage !== 'vi' ? 'Active' : 'Đang Bật') : (localLanguage !== 'vi' ? 'Details' : 'Chi Tiết')}
                    </span>
                  </button>

                  {/* Share QR */}
                  <button
                    type="button"
                    onClick={() => {
                      soundFx.playClick();
                      setIsOpen(false);
                      onOpenShareModal();
                    }}
                    className="w-full p-3 rounded-[2px] bg-white/10 hover:bg-white/20 border border-white/10 text-white text-xs font-semibold flex items-center justify-between transition cursor-pointer hover-effect"
                  >
                    <div className="flex items-center gap-2.5">
                      <QrCode className="w-4 h-4 text-[#F7CAC9]" />
                      <span>{t("sidebar_invite_qr", localLanguage)}</span>
                    </div>
                    <span className="font-mono text-[11px] px-2 py-0.5 rounded-[2px] bg-white/10">{localLanguage !== 'vi' ? "S Key" : "Phím S"}</span>
                  </button>
                </div>
              )}

              {/* ========================================================= */}
              {/* TAB 4: COMMUNITY & QA */}
              {/* ========================================================= */}
              {activeTab === 'COMMUNITY' && (
                <div className="flex flex-col gap-3 animate-fadeIn">
                  <AudienceCheerButton user={user} isHighContrast={isHighContrast} />

                  {onOpenQAModal && (
                    <AudienceQAWidget user={user} onOpenModal={onOpenQAModal} isHighContrast={isHighContrast} />
                  )}

                  <div className="p-3.5 rounded-[2px] fluent-box-nested text-xs text-white/60 space-y-1.5 shadow-inner">
                    <div className="font-bold text-white flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      {t("sidebar_live_aud", localLanguage)}
                    </div>
                    <p className="text-[11px] leading-relaxed">
                      {t("sidebar_live_desc", localLanguage)}
                    </p>
                  </div>
                </div>
              )}

            </div>
          </div>
        </>
      )}

      <BatterySaverModal isOpen={isBatterySaverModalOpen} onClose={() => setIsBatterySaverModalOpen(false)} />
      <AudioSettingsModal isOpen={isAudioSettingsOpen} onClose={() => setIsAudioSettingsOpen(false)} />
    </>
  );

  if (typeof document === 'undefined' || !document.body) return null;
  return createPortal(sidebarContent, document.body);
};
