import React, { useState, useEffect, useMemo, useRef } from 'react';
import QRCode from 'qrcode';
import { GameState, UserResponse } from '../types';
import { normalizeVcnvAnswer } from '../utils/exportUtils';
import { getProjectorTheme } from '../utils/themeUtils';
import { Leaderboard } from './Leaderboard';
import { LuckyDrawProjector } from './LuckyDrawProjector';
import { EmergencyPollProjector } from './EmergencyPollProjector';
import { ProjectorResponseList } from './ProjectorResponseList';
import { ProjectorWordCloud } from './ProjectorWordCloud';
import { AnnouncerOverlay } from './AnnouncerOverlay';
import { NextQuestionCountdown } from './NextQuestionCountdown';
import { ProjectorCheerMeter } from './ProjectorCheerMeter';
import { ProjectorQAOverlay } from './ProjectorQAOverlay';
import { ProjectorResponseBarChart } from './ProjectorResponseBarChart';
import { syncService } from '../services/syncService';
import { snapshotService } from '../services/snapshotService';
import { soundFx } from '../services/audioEffects';
import { Radio, Clock, Award, CheckCircle2, BarChart3, BarChart2, Users, Sparkles, Shield, LayoutGrid, Trophy, XCircle, Flame, Zap, Timer, QrCode, ListFilter, Heart, MessageSquare, Cloud, Camera } from 'lucide-react';

interface ProjectorViewProps {
  gameState: GameState;
  responses: Record<string, UserResponse>;
  allResponses?: Record<string, Record<string, UserResponse>>;
  activeCount: number;
}

export const ProjectorView: React.FC<ProjectorViewProps> = ({
  gameState,
  responses,
  allResponses,
  activeCount
}) => {
  const [timeLeft, setTimeLeft] = useState<number>(gameState.time_limit);
  const [showLeaderboard, setShowLeaderboard] = useState<boolean>(false);
  const [showHeatmap, setShowHeatmap] = useState<boolean>(true);
  const [showResponseList, setShowResponseList] = useState<boolean>(false);
  const [showWordCloud, setShowWordCloud] = useState<boolean>(false);
  const [showBarChart, setShowBarChart] = useState<boolean>(false);
  const [optionsDisplayMode, setOptionsDisplayMode] = useState<'CARDS' | 'CHART'>('CARDS');
  const [showCheerMeter, setShowCheerMeter] = useState<boolean>(true);
  const isLeaderboardVisible = showLeaderboard || gameState.show_summary;
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const isLongQuestion = (gameState?.question_text || '').length > 180;
  const mediaRef = useRef<HTMLVideoElement | HTMLAudioElement | null>(null);
  const [isCapturingSnapshot, setIsCapturingSnapshot] = useState<boolean>(false);
  const [snapshotFlash, setSnapshotFlash] = useState<boolean>(false);

  // Responsive scaling for projector
  const [stageScale, setStageScale] = useState(1);
  useEffect(() => {
    const handleResize = () => {
      const winW = window.innerWidth;
      const winH = window.innerHeight;
      const scaleW = winW / 1920;
      const scaleH = winH / 1080;
      setStageScale(Math.min(scaleW, scaleH));
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleCaptureProjectorSnapshot = async () => {
    if (isCapturingSnapshot) return;
    setIsCapturingSnapshot(true);
    soundFx.playCameraShutter();
    setSnapshotFlash(true);
    setTimeout(() => setSnapshotFlash(false), 300);

    try {
      const stageEl = document.getElementById('projector-view-stage');
      if (stageEl) {
        await snapshotService.captureAndSave(
          stageEl,
          gameState,
          responses,
          activeCount,
          undefined,
          gameState.round_type === 'VCNV' ? 'VCNV' : gameState.emergency_poll ? 'POLL' : 'GENERAL'
        );
      }
    } catch (err) {
      console.error('Failed to capture snapshot from stage:', err);
    } finally {
      setIsCapturingSnapshot(false);
    }
  };

  useEffect(() => {
    if (gameState.status === 'ACTIVE' && gameState.media_autoplay && mediaRef.current) {
      mediaRef.current.play().catch(err => {
        console.warn('Autoplay prevented by browser:', err);
      });
    }
  }, [gameState.status, gameState.question_id, gameState.media_autoplay, gameState.server_start_time]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      let audienceUrl = window.location.origin + window.location.pathname;
      if (audienceUrl.includes('ais-dev-')) {
        audienceUrl = audienceUrl.replace('ais-dev-', 'ais-pre-');
      }
      QRCode.toDataURL(audienceUrl, { width: 400, margin: 2, color: { dark: '#1e1b4b', light: '#ffffff' } })
        .then(url => setQrDataUrl(url))
        .catch(err => console.error('QR code generation error:', err));
    }
  }, []);

  const riskSubmissionsCount = useMemo(() => {
    return Object.keys(allResponses?.['VCNV_RISK'] || {}).length;
  }, [allResponses]);

  // Keyboard shortcut: 'L' for Leaderboard, 'B' for Bar Chart, 'H' for Heatmap, 'R'/'S' for Response List, 'W' for Word Cloud
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }
      if ((e.key === 'b' || e.key === 'B') && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        setShowBarChart(prev => {
          const next = !prev;
          if (next) {
            setShowLeaderboard(false);
            setShowHeatmap(false);
            setShowResponseList(false);
            setShowWordCloud(false);
          }
          return next;
        });
      }
      if ((e.key === 'l' || e.key === 'L') && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        setShowLeaderboard(prev => {
          const next = !prev;
          if (next) {
            setShowBarChart(false);
            setShowHeatmap(false);
            setShowResponseList(false);
            setShowWordCloud(false);
          }
          return next;
        });
      }
      if ((e.key === 'h' || e.key === 'H') && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        setShowHeatmap(prev => {
          const next = !prev;
          if (next) {
            setShowLeaderboard(false);
            setShowBarChart(false);
            setShowResponseList(false);
            setShowWordCloud(false);
          }
          return next;
        });
      }
      if ((e.key === 'r' || e.key === 'R' || e.key === 's' || e.key === 'S') && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        setShowResponseList(prev => {
          const next = !prev;
          if (next) {
            setShowLeaderboard(false);
            setShowBarChart(false);
            setShowHeatmap(false);
            setShowWordCloud(false);
          }
          return next;
        });
      }
      if ((e.key === 'w' || e.key === 'W') && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        setShowWordCloud(prev => {
          const next = !prev;
          if (next) {
            setShowLeaderboard(false);
            setShowBarChart(false);
            setShowHeatmap(false);
            setShowResponseList(false);
          }
          return next;
        });
      }
      if ((e.key === 'c' || e.key === 'C') && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        setShowCheerMeter(prev => !prev);
      }
      if ((e.key === 'q' || e.key === 'Q') && !e.ctrlKey && !e.metaKey && !e.altKey) {
        // Toggle or dismiss featured Q&A question on stage
        if (gameState.featured_qa_question) {
          e.preventDefault();
          syncService.updateGameState({ featured_qa_question: null });
        }
      }
      if ((e.key === 'p' || e.key === 'P') && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        handleCaptureProjectorSnapshot();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, responses, activeCount]);

  useEffect(() => {
    if (gameState.status !== 'ACTIVE') {
      setTimeLeft(gameState.time_limit);
      return;
    }

    const compute = () => {
      if (!gameState.server_start_time) return gameState.time_limit;
      const now = syncService.getSynchronizedNow();
      const elapsed = Math.floor((now - gameState.server_start_time) / 1000);
      return Math.max(0, gameState.time_limit - elapsed);
    };

    setTimeLeft(compute());
    const interval = setInterval(() => {
      setTimeLeft(compute());
    }, 200);

    return () => clearInterval(interval);
  }, [gameState.status, gameState.server_start_time, gameState.time_limit]);

  // Vote statistics
  const voteStats = useMemo(() => {
    const total = Object.keys(responses).length;
    const counts: Record<string, number> = { A: 0, B: 0, C: 0, D: 0, E: 0, F: 0 };
    (Object.values(responses) as UserResponse[]).forEach(r => {
      const c = r.choice.toUpperCase();
      counts[c] = (counts[c] || 0) + 1;
    });
    return { total, counts };
  }, [responses]);

  // Compute colors relative to percentage/count
  const getHeatColor = (percentage: number) => {
    if (percentage === 0) return {
      bg: 'bg-slate-950/40 border-slate-800/40 text-slate-500',
      glow: 'shadow-none',
      badge: 'bg-slate-900/50 backdrop-blur-[24px] saturate-150 text-slate-500 border border-slate-800'
    };
    if (percentage <= 15) return {
      bg: 'bg-blue-950/35 border-blue-500/40 text-blue-300',
      glow: 'shadow-[0_0_15px_rgba(59,130,246,0.15)]',
      badge: 'bg-blue-950 text-blue-300 border border-blue-500/30'
    };
    if (percentage <= 40) return {
      bg: 'bg-emerald-950/35 border-emerald-500/40 text-emerald-300',
      glow: 'shadow-[0_0_15px_rgba(16,185,129,0.2)]',
      badge: 'bg-emerald-950 text-emerald-300 border border-emerald-500/30'
    };
    if (percentage <= 70) return {
      bg: 'bg-amber-950/40 backdrop-blur-md border-amber-500/50 text-amber-300',
      glow: 'shadow-[0_0_20px_rgba(245,158,11,0.25)]',
      badge: 'bg-amber-950 text-amber-200 border border-amber-500/40'
    };
    return {
      bg: 'fluent-box-nested border-rose-500/60 text-rose-300 font-bold animate-pulse',
      glow: 'shadow-[0_0_25px_rgba(244,63,94,0.35)]',
      badge: 'bg-rose-950 text-rose-200 border border-rose-500/50'
    };
  };

  // TRUE_FALSE_4 parsing
  const tfStats = useMemo(() => {
    if (gameState.round_type !== 'TRUE_FALSE_4') return null;
    const counts: Record<string, { D: number; S: number; total: number }> = {};
    Object.keys(gameState.options || {}).forEach(k => {
      counts[k] = { D: 0, S: 0, total: 0 };
    });

    (Object.values(responses || {}) as UserResponse[]).forEach(r => {
      if (!r.choice) return;
      const parts = r.choice.split(',');
      parts.forEach(part => {
        const [k, v] = part.split(':');
        if (k && counts[k]) {
          const val = v ? v.trim().toUpperCase() : '';
          if (val === 'Đ' || val === 'T') {
            counts[k].D += 1;
            counts[k].total += 1;
          } else if (val === 'S' || val === 'F') {
            counts[k].S += 1;
            counts[k].total += 1;
          }
        }
      });
    });
    return counts;
  }, [gameState.round_type, responses, gameState.options]);

  // SHORT_ANSWER/VCNV word-cloud parsing
  const shortStats = useMemo(() => {
    const isShort = gameState.round_type === 'SHORT_ANSWER';
    const isVcnv = gameState.round_type === 'VCNV' || gameState.question_id?.startsWith('VCNV');
    if (!isShort && !isVcnv) return null;
    const groups: Record<string, { count: number; raw: string }> = {};
    let totalValid = 0;

    (Object.values(responses || {}) as UserResponse[]).forEach(r => {
      if (!r.choice) return;
      const val = r.choice.trim();
      if (!val) return;
      const norm = normalizeVcnvAnswer(val);
      if (!norm) return;
      totalValid++;
      if (groups[norm]) {
        groups[norm].count += 1;
      } else {
        groups[norm] = { count: 1, raw: val.toUpperCase() };
      }
    });

    return {
      total: totalValid,
      list: Object.values(groups).sort((a, b) => b.count - a.count).slice(0, 12)
    };
  }, [gameState.round_type, gameState.question_id, responses]);

  // Top 5 VCNV correct audience predictions
  const top5Vcnv = useMemo(() => {
    if (!gameState.vcnv_summary_active || !gameState.vcnv_keyword) return [];
    const correctTarget = normalizeVcnvAnswer(gameState.vcnv_keyword);
    const correctResps = Object.values(responses || {}).filter((r: UserResponse) => {
      return normalizeVcnvAnswer(r.choice) === correctTarget;
    });
    correctResps.sort((a: UserResponse, b: UserResponse) => {
      const latA = a.latency_sec ?? 999;
      const latB = b.latency_sec ?? 999;
      if (latA !== latB) return latA - latB;
      return a.timestamp - b.timestamp;
    });
    return correctResps.slice(0, 5);
  }, [responses, gameState.vcnv_summary_active, gameState.vcnv_keyword]);

  // Top 5 Risk Box correct audience predictions
  const top5Risk = useMemo(() => {
    if (gameState.vcnv_risk_status !== 'REVEALED' || !gameState.vcnv_risk_answer) return [];
    const correctTarget = normalizeVcnvAnswer(gameState.vcnv_risk_answer);
    const riskResps = Object.values(allResponses?.['VCNV_RISK'] || {});
    const correctResps = riskResps.filter((r: UserResponse) => {
      return normalizeVcnvAnswer(r.choice) === correctTarget;
    });
    correctResps.sort((a: UserResponse, b: UserResponse) => {
      const latA = a.latency_sec ?? 999;
      const latB = b.latency_sec ?? 999;
      if (latA !== latB) return latA - latB;
      return a.timestamp - b.timestamp;
    });
    return correctResps.slice(0, 5);
  }, [allResponses, gameState.vcnv_risk_status, gameState.vcnv_risk_answer]);

  const isRiskActive = gameState.vcnv_risk_status === 'ACTIVE_ANSWER' || gameState.vcnv_risk_status === 'COUNTDOWN_10S';
  const isBranch1 = gameState.vcnv_risk_branch === 'BRANCH_1';
  const isBranch2 = gameState.vcnv_risk_branch === 'BRANCH_2' || gameState.vcnv_risk_status === 'FROZEN';
  const isRiskRevealed = gameState.vcnv_risk_status === 'REVEALED';
  const isVcnvSummary = Boolean(gameState.vcnv_summary_active);

  const isVcnvRound =
    gameState.round_type === 'VCNV' ||
    gameState.round_type === 'LOCKED' ||
    gameState.round_name?.includes('Vượt Chướng Ngại Vật') ||
    gameState.question_id?.startsWith('VCNV');

  const isVcnvOpened = isRiskActive || isBranch1 || isBranch2 || isRiskRevealed || isVcnvSummary || gameState.vcnv_status === 'OPEN' || gameState.vcnv_status === 'LOCKED' || gameState.vcnv_status === 'REVEALED';

  const isTTRound =
    gameState.round_type === 'ELIMINATION_6' ||
    gameState.round_type === 'SEQUENCING' ||
    gameState.round_name?.includes('Tăng tốc') ||
    gameState.question_id?.startsWith('TT');

  const totalTimeLimit = gameState.time_limit || 20;
  const elapsedSec = Math.max(0, totalTimeLimit - timeLeft);
  const ttPhase = elapsedSec < 10 ? 1 : elapsedSec < 20 ? 2 : 3;

  const theme = useMemo(() => getProjectorTheme(gameState.projectorTheme), [gameState.projectorTheme]);
  const hasAnnouncer = Boolean(gameState.announcer_overlay?.active && gameState.announcer_overlay?.text?.trim());

  return (
    <div 
      id="projector-view-stage"
      className={`min-h-[calc(100dvh-4rem)] w-full ${theme.bgGradient} text-[#F5EFF9] p-4 p-6 p-8 ${hasAnnouncer ? 'pb-20 pb-24' : ''} flex flex-col justify-between select-none relative overflow-hidden transition-colors duration-700`}>
      {/* Screen flash on capture */}
      {snapshotFlash && (
        <div className="fixed inset-0 z-[100] bg-white/70 pointer-events-none transition-opacity duration-300 animate-fadeOut" />
      )}

      {/* Stage Header (Bento Style) */}
      <header className={`relative z-10 fluent-box p-3 px-4 px-5 flex items-center justify-between gap-4 transition-all duration-500 group`}>
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 shrink-0 rounded-[2px] fluent-box-nested text-purple-300 border border-purple-500/30 flex items-center justify-center font-bold shadow-lg`}>
            <Radio className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="text-[9px] font-mono uppercase tracking-[0.2em] text-[#F7CAC9] font-bold">
              STAGE DISPLAY MATRIX • {theme.name.toUpperCase()}
            </div>
            <h1 className="text-base text-lg font-bold tracking-tight text-white whitespace-nowrap">
              Beyond The Internet 2026
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Action buttons (hidden by default) */}
          <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          {/* Toggle Realtime Recharts Bar Chart */}
          <button
            type="button"
            onClick={() => {
              setShowBarChart(!showBarChart);
              if (!showBarChart) {
                setShowLeaderboard(false);
                setShowHeatmap(false);
                setShowResponseList(false);
                setShowWordCloud(false);
              }
            }}
            className={`px-4 py-2 rounded-[2px] font-mono text-xs font-bold transition flex items-center gap-2 border shadow-lg ${
              showBarChart
                ? 'fluent-acrylic-surface text-white border-pink-400 ring-2 ring-pink-400/40 shadow-pink-500/30'
                : 'fluent-acrylic-surface text-purple-300 border-purple-500/40 hover:fluent-box-nested'
            }`}
            title="Bật/Tắt Biểu Đồ Cột Phân Bố Khán Giả (Phím tắt: B)"
          >
            <BarChart2 className={`w-4 h-4 ${showBarChart ? 'text-white animate-bounce' : 'text-purple-400'}`} />
            <span>{showBarChart ? 'Quay lại Câu hỏi' : 'Biểu Đồ Cột'}</span>
            <kbd className={`px-1.5 py-0.5 text-[9px] rounded border ${showBarChart ? 'bg-black/50 backdrop-blur-[24px] saturate-150/20 border-black/30 text-white' : 'fluent-box-nested border-white/20 text-purple-200'}`}>
              B
            </kbd>
          </button>

          {/* Toggle Live Response Stream / List */}
          <button
            type="button"
            onClick={() => {
              setShowResponseList(!showResponseList);
              if (!showResponseList) {
                setShowLeaderboard(false);
                setShowHeatmap(false);
                setShowWordCloud(false);
                setShowBarChart(false);
              }
            }}
            className={`px-4 py-2 rounded-[2px] font-mono text-xs font-bold transition flex items-center gap-2 border shadow-lg ${
              showResponseList
                ? 'bg-sky-500 text-slate-950 border-sky-400 ring-2 ring-sky-400/40'
                : 'fluent-acrylic-surface text-sky-300 border-sky-500/40 hover:fluent-box-nested'
            }`}
            title="Bật/Tắt Danh Sách Phản Hồi Trực Tiếp (Phím tắt: R)"
          >
            <ListFilter className={`w-4 h-4 ${showResponseList ? 'text-slate-950' : 'text-sky-400'}`} />
            <span>{showResponseList ? 'Quay lại Câu hỏi' : `DS Phản Hồi (${voteStats.total})`}</span>
            <kbd className={`px-1.5 py-0.5 text-[9px] rounded border ${showResponseList ? 'bg-black/50 backdrop-blur-[24px] saturate-150/20 border-black/30 text-black' : 'fluent-box-nested border-white/20 text-sky-200'}`}>
              R
            </kbd>
          </button>

          {/* Toggle Live Response Heatmap */}
          <button
            type="button"
            onClick={() => {
              setShowHeatmap(!showHeatmap);
              if (!showHeatmap) {
                setShowLeaderboard(false);
                setShowResponseList(false);
                setShowWordCloud(false);
                setShowBarChart(false);
              }
            }}
            className={`px-4 py-2 rounded-[2px] font-mono text-xs font-bold transition flex items-center gap-2 border shadow-lg ${
              showHeatmap
                ? 'bg-rose-500 text-white border-rose-400 ring-2 ring-rose-400/40'
                : 'bg-gradient-to-r from-rose-500/20 to-orange-500/20 text-rose-300 border-rose-500/40 hover:fluent-box-nested'
            }`}
            title="Bật/Tắt Bản Đồ Nhiệt Phân Phối (Phím tắt: H)"
          >
            <BarChart3 className={`w-4 h-4 ${showHeatmap ? 'text-white' : 'text-rose-400'}`} />
            <span>{showHeatmap ? 'Quay lại Câu hỏi' : 'Bản Đồ Nhiệt'}</span>
            <kbd className={`px-1.5 py-0.5 text-[9px] rounded border ${showHeatmap ? 'bg-black/50 backdrop-blur-[24px] saturate-150/20 border-black/30 text-white' : 'fluent-box-nested border-white/20 text-rose-200'}`}>
              H
            </kbd>
          </button>

          {/* Toggle Top 5 Leaderboard on Stage */}
          <button
            type="button"
            onClick={() => {
              setShowLeaderboard(!showLeaderboard);
              if (!showLeaderboard) {
                setShowHeatmap(false);
                setShowResponseList(false);
                setShowWordCloud(false);
                setShowBarChart(false);
              }
            }}
            className={`px-4 py-2 rounded-[2px] font-mono text-xs font-bold transition flex items-center gap-2 border shadow-lg ${
              isLeaderboardVisible
                ? 'bg-amber-500 text-slate-950 border-amber-400 ring-2 ring-amber-400/40'
                : 'fluent-acrylic-surface text-amber-300 border-amber-500/40 hover:fluent-box-nested'
            }`}
            title="Bật/Tắt Bảng Xếp Hạng Top 5 (Phím tắt: L)"
          >
            <Trophy className={`w-4 h-4 ${isLeaderboardVisible ? 'text-slate-950' : 'text-amber-400'}`} />
            <span>{isLeaderboardVisible ? 'Quay lại Câu hỏi' : 'Top 5 BXH'}</span>
            <kbd className={`px-1.5 py-0.5 text-[9px] rounded border ${isLeaderboardVisible ? 'bg-black/50 backdrop-blur-[24px] saturate-150/20 border-black/30 text-black' : 'fluent-box-nested border-white/20 text-amber-200'}`}>
              L
            </kbd>
          </button>

          {/* Toggle Word Cloud Visualization */}
          <button
            type="button"
            onClick={() => {
              setShowWordCloud(!showWordCloud);
              if (!showWordCloud) {
                setShowLeaderboard(false);
                setShowHeatmap(false);
                setShowResponseList(false);
                setShowBarChart(false);
              }
            }}
            className={`px-4 py-2 rounded-[2px] font-mono text-xs font-bold transition flex items-center gap-2 border shadow-lg ${
              showWordCloud
                ? 'bg-[#F7CAC9] text-[#190839] border-[#F7CAC9] ring-2 ring-[#F7CAC9]/40'
                : 'fluent-acrylic-surface text-pink-300 border-pink-500/40 hover:fluent-box-nested'
            }`}
            title="Bật/Tắt Đám Mây Từ Khóa Trực Tiếp (Phím tắt: W)"
          >
            <Cloud className={`w-4 h-4 ${showWordCloud ? 'text-[#190839]' : 'text-[#F7CAC9]'}`} />
            <span>{showWordCloud ? 'Quay lại Câu hỏi' : 'Đám Mây Từ Khóa'}</span>
            <kbd className={`px-1.5 py-0.5 text-[9px] rounded border ${showWordCloud ? 'bg-black/50 backdrop-blur-[24px] saturate-150/20 border-black/30 text-black' : 'fluent-box-nested border-white/20 text-pink-200'}`}>
              W
            </kbd>
          </button>

          {/* Quick Snapshot Button on Stage Header */}
          <button
            type="button"
            id="btn-projector-snap-stage"
            onClick={handleCaptureProjectorSnapshot}
            disabled={isCapturingSnapshot}
            className={`px-3 py-2 rounded-[2px] font-mono text-xs font-bold transition flex items-center gap-1.5 border shadow-lg ${
              isCapturingSnapshot
                ? 'bg-purple-800 text-purple-200 border-purple-400 animate-pulse'
                : 'fluent-box-nested hover:fluent-box-nested text-purple-200 border-white/20 hover:border-pink-400 hover:text-white cursor-pointer'
            }`}
            title="Chụp ảnh trạng thái màn chiếu sân khấu vào Biên bản phát sóng (Phím tắt: P)"
          >
            <Camera className={`w-4 h-4 ${isCapturingSnapshot ? 'animate-spin' : 'text-pink-300'}`} />
            <span className="hidden inline">{isCapturingSnapshot ? 'Đang Chụp...' : 'Snap Sân Khấu'}</span>
            <kbd className="px-1.5 py-0.5 text-[9px] rounded border fluent-box-nested border-white/20 text-purple-200">
              P
            </kbd>
          </button>

          </div>

          <div className={`px-3 py-1.5 rounded-[2px] fluent-box flex items-center gap-2 font-mono text-[11px] text-white/70`}>
            <Users className={`w-3.5 h-3.5 text-purple-300`} />
            <span>
              Connected: <strong className="text-white font-bold">{voteStats.total}/{activeCount}</strong>
            </span>
          </div>

          <div
            className={`px-3 py-1.5 rounded-[2px] font-bold uppercase tracking-wider text-[11px] border ${
              gameState.status === 'ACTIVE'
                ? `${theme.activeBadge} animate-pulse`
                : gameState.status === 'LOCKED'
                ? theme.lockedBadge
                : gameState.status === 'REVEAL'
                ? theme.revealBadge
                : `fluent-box-nested text-white/40 border-white/10`
            }`}
          >
            {gameState.status === 'ACTIVE'
              ? 'BÌNH CHỌN TRỰC TIẾP'
              : gameState.status === 'LOCKED'
              ? 'ĐÃ KHÓA BÌNH CHỌN'
              : gameState.status === 'REVEAL'
              ? 'CÔNG BỐ KẾT QUẢ'
              : 'ĐANG CHỜ MC'}
          </div>
        </div>
      </header>

      {/* Next Question Wait Countdown Banner (if active) */}
      <NextQuestionCountdown gameState={gameState} className="relative z-10 my-2" />

      {/* Stage Main Body */}
      <main className="relative z-10 my-auto py-4 py-6">
        {gameState.active_module === 'LUCKY_DRAW' || (gameState.lucky_draw && gameState.lucky_draw.status !== 'IDLE') ? (
          <LuckyDrawProjector gameState={gameState} />
        ) : gameState.emergency_poll && gameState.emergency_poll.status !== 'DISMISSED' ? (
          <EmergencyPollProjector
            gameState={gameState}
            allResponses={allResponses}
            activeCount={activeCount}
          />
        ) : showBarChart ? (
          <div className="max-w-7xl max-w-[95%] w-full mx-auto space-y-4 animate-fadeIn">
            <ProjectorResponseBarChart
              gameState={gameState}
              responses={responses}
              activeCount={activeCount}
              onClose={() => setShowBarChart(false)}
            />
          </div>
        ) : showWordCloud ? (
          <ProjectorWordCloud
            gameState={gameState}
            responses={responses}
            allResponses={allResponses}
            onClose={() => setShowWordCloud(false)}
          />
        ) : showResponseList ? (
          <ProjectorResponseList
            responses={responses}
            gameState={gameState}
            activeCount={activeCount}
            onClose={() => setShowResponseList(false)}
          />
        ) : isLeaderboardVisible ? (
          <Leaderboard
            allResponses={allResponses}
            gameState={gameState}
            activeCount={activeCount}
            onClose={gameState.show_summary ? undefined : () => setShowLeaderboard(false)}
          />
        ) : isVcnvRound ? (
          /* Dedicated Stage Visual for Round 2: Vượt Chướng Ngại Vật */
          !isVcnvOpened ? (
            /* Standby Stage Visual (Matching Client Landing) */
            <div className="text-center max-w-2xl mx-auto space-y-6 bg-[#241148]/90 backdrop-blur-md border border-[#3E1D74] rounded-[2px] p-10 shadow-2xl backdrop-blur-md animate-fadeIn">
              <div className="relative w-32 h-32 mx-auto mb-4 flex items-center justify-center">
                <div className="absolute inset-0 rounded-[2px] border-2 border-[#F7CAC9]/20 animate-ping" />
                <div className="absolute inset-3 rounded-[2px] border border-[#F7CAC9]/40 animate-pulse" />
                <div className="w-20 h-20 rounded-[2px] bg-gradient-horizon flex items-center justify-center shadow-xl shadow-[#F7CAC9]/30">
                  <Radio className="w-10 h-10 text-white animate-pulse" />
                </div>
              </div>
              <div className="inline-block px-4 py-1.5 rounded-[2px] text-xs font-bold uppercase tracking-widest bg-[#F7CAC9]/10 backdrop-blur-md text-[#F7CAC9] border border-[#3E1D74] font-mono">
                SẮN SÀNG KẾT NỐI TRỰC TIẾP
              </div>
              <h2 className="text-3xl text-4xl font-black text-white tracking-tight">
                {gameState.round_name || 'Vòng 2: Vượt chướng ngại vật'}
              </h2>
              <p className="text-lg text-[#EBC7D6] font-medium italic">
                &ldquo;Hãy chú ý lắng nghe diễn biến trên sân khấu...&rdquo;
              </p>
              <p className="text-xs text-[#B6A6D8] font-mono">
                Hệ thống đang sẵn sàng nhận lệnh từ Ban Tổ Chức & MC trên sân khấu
              </p>
            </div>
          ) : (
            <div className="max-w-7xl max-w-[95%] w-full mx-auto space-y-3 animate-fadeIn">
              <div className="flex items-center justify-between">
                <span className="px-4 py-1 rounded-[2px] text-xs font-mono uppercase tracking-wider bg-[#F7CAC9]/20 backdrop-blur-md text-[#F7CAC9] border border-[#F7CAC9]/40 font-bold flex items-center gap-2">
                  <LayoutGrid className="w-4 h-4" /> VÒNG 2: VƯỢT CHƯỚNG NGẠI VẬT
                </span>

                <div className="flex items-center gap-2">
                  {gameState.vcnv_status === 'LOCKED' && (
                    <span className="px-3.5 py-1 rounded-[2px] text-xs font-mono font-bold text-amber-400 fluent-box-nested border border-amber-500/30 flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5" /> ĐÃ CHỐT NHẬN DỰ ĐOÁN (CHỜ SÂN KHẤU)
                    </span>
                  )}
                  <div className="px-4 py-1 rounded-[2px] text-xs font-mono text-emerald-400 fluent-box-nested border border-emerald-500/30">
                    {voteStats.total} Khán giả đã gửi dự đoán
                  </div>
                </div>
              </div>

              {/* 2-Column Responsive Layout */}
              <div className="grid grid-cols-1 grid-cols-12 gap-4 items-start">
                {/* LEFT COLUMN: Heatmaps, Risk Box banners, and Keyword Summary */}
                <div className="col-span-6 space-y-3">
                  {/* Live Heatmap tag word-cloud for VCNV Predictions (Hidden when round is finalized to prevent vertical stack overload) */}
                  {showHeatmap && shortStats && !gameState.vcnv_summary_active && (
                    <div className="bg-slate-950/40 border border-white/5 rounded-[2px] p-3 p-3.5 shadow-xl space-y-2 animate-fadeIn">
                      <div className="flex justify-between items-center pb-2 border-b border-white/10">
                        <span className="text-xs font-mono font-bold text-rose-300 uppercase tracking-wider flex items-center gap-1.5">
                          <Zap className="w-3.5 h-3.5 animate-pulse text-rose-400" /> BẢN ĐỒ NHIỆT: DỰ ĐOÁN TỪ KHÓA CNV ({shortStats.total} câu trả lời)
                        </span>
                      </div>

                      {shortStats.list.length === 0 ? (
                        <p className="text-xs text-white/40 text-center py-4 font-mono">Đang chờ dự đoán từ khán giả...</p>
                      ) : (
                        <div className="flex flex-wrap gap-1.5 justify-center py-0.5">
                          {shortStats.list.map((item, idx) => {
                            const percentage = shortStats.total > 0 ? Math.round((item.count / shortStats.total) * 100) : 0;
                            const heat = getHeatColor(percentage);
                            const sizeClass = percentage > 50
                              ? 'text-base py-1 px-2.5 rounded-[2px]'
                              : percentage > 25
                              ? 'text-sm py-0.5 px-2 rounded-[2px]'
                              : percentage > 10
                              ? 'text-xs py-0.5 px-1.5 rounded-[2px]'
                              : 'text-[10px] py-0.5 px-1 rounded';

                            return (
                              <div
                                key={idx}
                                className={`font-mono border flex items-center gap-1 shadow-md transition-all duration-300 ${heat.bg} ${heat.glow} ${sizeClass}`}
                              >
                                <span className="font-bold tracking-wider">{item.raw}</span>
                                <span className={`text-[8px] font-mono font-black py-0.5 px-1 rounded ${heat.badge}`}>
                                  {percentage}% ({item.count})
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* STAGE RISK BOX ANNOUNCEMENT BANNER */}
                  {gameState.vcnv_risk_status === 'ACTIVE_ANSWER' && (
                    <div className="p-3 rounded-[2px] fluent-box shadow-2xl space-y-1 text-white animate-fadeIn">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded fluent-box-nested text-amber-400 flex items-center justify-center font-bold text-xs">
                            ⚡
                          </div>
                          <div>
                            <h4 className="text-[11px] font-bold text-amber-300 uppercase font-mono text-left">
                              THÍ SINH [{gameState.vcnv_risk_claimed_by?.name || 'SÂN KHẤU'}] ĐÃ CHỌN Ô MẠO HIỂM
                            </h4>
                            <p className="text-[10px] text-slate-400 text-left">
                              Bình chọn đang hiển thị trên thiết bị di động
                            </p>
                          </div>
                        </div>
                        <span className="text-[9px] font-mono px-2 py-0.5 fluent-box-nested text-amber-300 border border-amber-500/30 rounded font-bold">
                          🔥 {riskSubmissionsCount} KHÁN GIẢ ĐANG DỰ ĐOÁN
                        </span>
                      </div>
                    </div>
                  )}

                  {gameState.vcnv_risk_status === 'FROZEN' && (
                    <div className="p-3 rounded-[2px] fluent-box border border-[#3E1D74] shadow-2xl text-[#F5EFF9] space-y-1 animate-fadeIn">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-mono uppercase text-[#F7CAC9] font-bold tracking-wider block">
                          🔒 CÂU TRẢ LỜI Ô MẠO HIỂM ĐÃ ĐÓNG BĂNG
                        </span>
                      </div>
                      <p className="text-[10px] text-[#B6A6D8] text-left">
                        Tiếp tục các hàng ngang. Khán giả đoán đúng cả hai nhận được <strong>200 điểm</strong>!
                      </p>
                    </div>
                  )}

                  {/* RISK REVEALED CARD */}
                  {gameState.vcnv_risk_status === 'REVEALED' && (
                    <div className="p-5 p-6 rounded-[2px] fluent-box border border-[#522b94]/70 shadow-2xl text-[#F5EFF9] space-y-4 animate-fadeIn">
                      <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                        <span className="text-sm font-mono uppercase text-[#F7CAC9] font-black tracking-wider block">
                          🌟 CÔNG BỐ NỘI DUNG Ô MẠO HIỂM
                        </span>
                        <span className="text-xs font-mono px-3 py-1 fluent-box-nested text-emerald-300 rounded-[2px] border border-emerald-500/30 font-bold">
                          +120 ĐIỂM
                        </span>
                      </div>
                      <p className="text-sm text-base text-slate-200 text-left leading-relaxed">
                        <strong>Gợi ý:</strong> {gameState.vcnv_risk_question}
                      </p>
                      <p className="text-sm text-base text-emerald-400 font-mono font-bold text-left fluent-box-nested p-2.5 rounded-[2px] border border-emerald-500/20">
                        <strong>Đáp án:</strong> {gameState.vcnv_risk_answer}
                      </p>

                      {top5Risk.length > 0 && (
                        <div className="pt-2.5 border-t border-white/10 space-y-2">
                          <h5 className="text-xs text-sm font-bold text-amber-400 font-mono flex items-center gap-2">
                            <Trophy className="w-4 h-4 text-amber-400" /> Top Khán Giả Đoán Đúng Ô Mạo Hiểm:
                          </h5>
                          <div className="grid grid-cols-1 grid-cols-2 gap-2">
                            {top5Risk.map((r, i) => (
                              <div key={r.user_info?.uid || i} className="p-2.5 rounded-[2px] fluent-box-nested border border-amber-500/20 flex items-center justify-between shadow-sm">
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <span className="w-5.5 h-5.5 rounded-[2px] bg-amber-500 text-slate-950 font-black flex items-center justify-center text-[10px] font-mono shrink-0 shadow">
                                    #{i + 1}
                                  </span>
                                  <div className="min-w-0">
                                    <p className="text-xs font-bold text-white truncate max-w-[120px]">{r.user_info?.name}</p>
                                    <p className="text-[10px] text-[#B6A6D8] font-mono truncate">{r.user_info?.mssv}</p>
                                  </div>
                                </div>
                                <span className="text-xs text-amber-300 font-mono font-bold shrink-0 ml-1.5">
                                  {(r.latency_sec || 0).toFixed(2)}s
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* VCNV KEYWORD SUMMARY */}
                  {gameState.vcnv_summary_active && (
                    <div className="fluent-box border border-emerald-500/50 rounded-[2px] p-5 p-6 shadow-2xl space-y-4 animate-fadeIn">
                      <div className="text-center pb-3 border-b border-white/10">
                        <span className="text-xs font-mono uppercase tracking-widest text-emerald-400 block mb-1 font-bold">
                          TỪ KHÓA CHƯỚNG NGẠI VẬT CHÍNH XÁC
                        </span>
                        <h2 className="text-3xl text-4xl font-black text-rose-300 tracking-widest font-mono uppercase filter drop-shadow-[0_0_12px_rgba(247,202,201,0.4)]">
                          {gameState.vcnv_keyword || '(Chưa công bố)'}
                        </h2>
                      </div>

                      <div className="space-y-2.5">
                        <h3 className="text-xs text-sm font-bold text-emerald-400 uppercase tracking-widest font-mono flex items-center gap-2">
                          <Trophy className="w-4 h-4 text-emerald-400" /> Top 5 Khán Giả Đoán Nhanh & Chính Xác
                        </h3>

                        {top5Vcnv.length === 0 ? (
                          <p className="text-xs text-sm text-white/40 text-center py-4 font-mono">
                            Không có khán giả nào đoán đúng từ khóa này.
                          </p>
                        ) : (
                          <div className="grid grid-cols-1 grid-cols-2 gap-2">
                            {top5Vcnv.map((r, i) => (
                              <div
                                key={r.user_info.uid || i}
                                className="p-2.5 rounded-[2px] fluent-box-nested border border-emerald-500/20 flex items-center justify-between shadow-sm hover:fluent-box-nested transition-all"
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <span className="w-6.5 h-6.5 shrink-0 rounded-[2px] bg-emerald-500 text-slate-950 font-black flex items-center justify-center text-xs shadow-md">
                                    #{i + 1}
                                  </span>
                                  <div className="min-w-0">
                                    <p className="text-xs text-sm font-bold text-white truncate max-w-[120px]">{r.user_info.name}</p>
                                    <p className="text-[10px] text-white/50 font-mono truncate">{r.user_info.mssv}</p>
                                  </div>
                                </div>
                                <div className="text-right font-mono shrink-0 ml-1.5">
                                  <span className="text-xs text-sm text-emerald-400 font-extrabold block">
                                    {(r.latency_sec || 0).toFixed(2)}s
                                  </span>
                                  <span className="text-[10px] text-white/40 truncate max-w-[80px] block font-medium">
                                    {r.choice}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* RIGHT COLUMN: 4 Horizontal Clues Stack ("Thiết kế dạng cột") */}
                <div className="col-span-6 space-y-2.5">
                  <div className="grid grid-cols-1 gap-2">
                    {[0, 1, 2, 3].map(idx => {
                      const isOpen = (gameState.vcnv_clues || [])[idx];
                      const text = (gameState.vcnv_clue_texts || [])[idx];
                      return (
                        <div
                          key={idx}
                          className={`py-2 px-3.5 rounded-[2px] border-2 transition-all flex items-center justify-between shadow-lg ${
                            isOpen
                              ? 'bg-[#F7CAC9]/15 backdrop-blur-md border-[#F7CAC9] text-[#FCEEEC] ring-2 ring-[#F7CAC9]/30'
                              : 'bg-[#241148]/40 backdrop-blur-md border-[#3E1D74] text-[#B6A6D8]/50'
                          }`}
                        >
                          <div className="text-left">
                            <span className="text-[9px] font-mono uppercase tracking-widest text-white/50 block mb-0.5">
                              Gợi ý hàng ngang #{idx + 1}
                            </span>
                            <h3 className="text-xs text-sm font-bold text-white uppercase">
                              {isOpen ? (text ? text : 'HÀNG NGANG ĐÃ MỞ') : 'HÀNG NGANG BÍ ẨN'}
                            </h3>
                          </div>
                          <div
                            className={`w-8 h-8 shrink-0 rounded-[2px] flex items-center justify-center font-bold font-mono text-xs ${
                              isOpen ? 'bg-[#F7CAC9]/20 backdrop-blur-md text-[#F7CAC9]' : 'bg-[#0D0420]/50 backdrop-blur-md border border-[#3E1D74]/50 text-[#B6A6D8]'
                            }`}
                          >
                            {isOpen ? 'MỞ' : '?'}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Center Box Stage Matrix */}
                  {gameState.vcnv_center_visible && (
                    <div className={`py-2 px-3.5 rounded-[2px] border-2 transition-all flex items-center justify-between shadow-lg ${
                      gameState.vcnv_center_status
                        ? 'fluent-box-nested border-amber-500 text-amber-200 ring-2 ring-amber-500/30'
                        : 'fluent-box-nested border-white/10 text-white/40'
                    }`}>
                      <div className="text-left">
                        <span className="text-[9px] font-mono uppercase tracking-widest text-white/50 block mb-0.5">
                          Ô Trung Tâm
                        </span>
                        <h3 className="text-xs text-sm font-bold text-white uppercase">
                          {gameState.vcnv_center_status ? (gameState.vcnv_center_text || 'Ô TRUNG TÂM ĐÃ MỞ') : 'Ô TRUNG TÂM BÍ ẨN'}
                        </h3>
                      </div>
                      <div
                        className={`w-8 h-8 shrink-0 rounded-[2px] flex items-center justify-center font-bold font-mono text-xs ${
                          gameState.vcnv_center_status ? 'fluent-box-nested text-amber-300' : 'fluent-box-nested'
                        }`}
                      >
                        {gameState.vcnv_center_status ? 'MỞ' : '?'}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        ) : gameState.status === 'STANDBY' ? (
          /* Standby Stage Visual (Bento Style) */
          <div className="text-center max-w-2xl mx-auto space-y-6 bg-[#241148]/50 backdrop-blur-md border border-[#3E1D74] rounded-[2px] p-10">
            <div className="w-24 h-24 rounded-[2px] bg-[#F7CAC9]/20 backdrop-blur-md border border-[#F7CAC9]/30 flex items-center justify-center mx-auto text-[#F7CAC9] shadow-xl shadow-[#0D0420]/20">
              <Shield className="w-12 h-12 animate-pulse" />
            </div>
            <div className="inline-block px-3 py-1 rounded-[2px] text-xs font-mono uppercase tracking-widest bg-[#F7CAC9] text-[#190839] font-black">
              {gameState.round_name}
            </div>
            <h2 className="text-3xl text-4xl font-bold text-white tracking-tight leading-tight">
              &ldquo;Hãy chú ý lắng nghe diễn biến trên sân khấu...&rdquo;
            </h2>
            <p className="text-sm text-white/50">
              Hệ thống đã sẵn sàng kết nối bình chọn cho tất cả khán giả qua thiết bị di động
            </p>
          </div>
        ) : (
          /* Active / Locked / Reveal Stage Display (Bento Grid) */
          <div className="max-w-7xl max-w-[95%] w-full mx-auto space-y-6 space-y-8">
            {/* Category & Timer row */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="px-3.5 py-1.5 rounded-[2px] text-xs font-mono uppercase tracking-wider bg-[#F7CAC9]/20 backdrop-blur-md text-[#F7CAC9] border border-[#3E1D74] font-bold">
                  {gameState.category || gameState.round_name}
                </span>
                {isTTRound && (
                  <span className="px-3 py-1 rounded-[2px] text-xs font-mono uppercase tracking-wider fluent-box-nested text-amber-300 border border-amber-500/40 font-black flex items-center gap-1.5">
                    <Flame className="w-3.5 h-3.5 animate-pulse" />
                    TĂNG TỐC
                  </span>
                )}
              </div>

              {gameState.status === 'ACTIVE' && (
                <div className="flex items-center gap-3">
                  {/* For Elimination 6 questions: show 10s phase indicator on stage */}
                  {isTTRound && gameState.round_type === 'ELIMINATION_6' && (
                    <div className="hidden flex items-center gap-2 px-3.5 py-1.5 rounded-[2px] fluent-box-nested border border-amber-500/30 text-xs font-mono">
                      <span className="text-white/50 uppercase">Giai đoạn:</span>
                      <span className="font-bold text-amber-300">
                        {ttPhase === 1 ? '1 (6 Phương Án)' : ttPhase === 2 ? '2 (Loại 2 còn 4)' : '3 (Loại tiếp còn 2)'}
                      </span>
                    </div>
                  )}

                  {/* Stage Timer Badge */}
                  <div
                    className={`flex items-center gap-2.5 px-6 py-2 rounded-[2px] font-mono text-2xl text-3xl font-black border transition-all ${
                      timeLeft <= 3
                        ? 'fluent-box-nested border-rose-500 text-rose-400 scale-110 animate-bounce shadow-lg shadow-rose-500/30 ring-2 ring-rose-400/50'
                        : timeLeft <= 5
                        ? 'fluent-box-nested border-amber-500 text-amber-300 scale-105 animate-pulse shadow-lg shadow-amber-500/20 ring-2 ring-amber-400/40'
                        : isTTRound
                        ? 'fluent-acrylic-surface border-amber-500/40 text-amber-300 shadow-md shadow-amber-500/10'
                        : 'bg-[#241148]/80 backdrop-blur-md border border-[#3E1D74] text-[#F5EFF9]'
                    }`}
                  >
                    {isTTRound ? (
                      <Flame className={`w-6 h-6 ${timeLeft <= 5 ? 'text-rose-400 fill-current animate-pulse' : 'text-amber-400 fill-current'}`} />
                    ) : (
                      <Clock className="w-5 h-5 text-[#F7CAC9]" />
                    )}
                    <span>{timeLeft}s</span>
                  </div>
                </div>
              )}
            </div>

            {/* Tăng Tốc Energy Speed Track Bar */}
            {isTTRound && gameState.status === 'ACTIVE' && (
              <div className="w-full h-2.5 fluent-box-nested rounded-[2px] overflow-hidden p-0.5 border border-[#F7CAC9]/30 shadow-inner">
                <div
                  className={`h-full rounded-[2px] ${
                    timeLeft <= 3
                      ? 'bg-rose-600 shadow-lg shadow-rose-600/50'
                      : timeLeft <= 5
                      ? 'bg-rose-400 shadow-md shadow-rose-400/50'
                      : 'bg-[#F7CAC9] shadow-md shadow-[#F7CAC9]/40'
                  }`}
                  style={{ 
                    width: `${Math.max(0, Math.min(100, (timeLeft / totalTimeLimit) * 100))}%`,
                    transition: 'width 1s linear, background-color 0.3s ease'
                  }}
                />
              </div>
            )}

            {/* Responsive Side-by-Side 2-Column layout for computers / tablets */}
            <div className={`grid grid-cols-1 grid-cols-12 gap-6 gap-8 ${isLongQuestion ? '' : 'items-stretch'}`}>
              
              {/* LEFT Column: Question Bento Card */}
              <div className={isLongQuestion ? "col-span-1 col-span-12 flex flex-col" : "col-span-5 flex flex-col justify-start"}>
                <div className={`fluent-question-box p-6 p-10 shadow-2xl flex flex-col justify-center relative ${
                  isLongQuestion 
                    ? 'min-h-[140px] min-h-[180px] w-full' 
                    : 'min-h-[220px] min-h-[380px] h-full'
                }`}>
                  <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-2 mb-3 relative z-10">
                    <span className="text-xs uppercase text-[#F7CAC9] font-mono tracking-widest font-bold flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-[2px] bg-[#F7CAC9] animate-pulse" />
                      Payload • [{gameState.question_id}]
                    </span>
                    <span className="text-[11px] font-mono text-white/50">
                      {gameState.round_name}
                    </span>
                  </div>
                  {gameState.round_type === 'BLIND_POLL' && gameState.status === 'ACTIVE' ? (
                    <div className="text-center py-4 relative z-10">
                      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-[2px] text-xs font-mono uppercase tracking-widest bg-[#F7CAC9]/20 backdrop-blur-md text-[#F7CAC9] border border-[#3E1D74]/80 mb-3">
                        <Sparkles className="w-3.5 h-3.5" /> Kịch Tình Huống AID (Blind Poll)
                      </div>
                      <h2 className="text-xl text-2xl font-medium text-white/90 leading-relaxed">
                        Khán giả đang theo dõi kịch bản trên sân khấu và bình chọn trên điện thoại
                      </h2>
                    </div>
                  ) : (
                    <h2 className={`font-black text-white leading-relaxed relative z-10 tracking-tight ${
                      (gameState.question_text || '').length > 200
                        ? 'text-lg text-xl text-2xl'
                        : (gameState.question_text || '').length > 100
                        ? 'text-xl text-2xl text-3xl'
                        : 'text-2xl text-3xl text-4xl'
                    }`}>
                      {gameState.question_text}
                    </h2>
                  )}
                  {gameState.media_type === 'IMAGE' && gameState.media_url && (
                    <div className="mt-6 flex justify-center relative z-10">
                      <img src={gameState.media_url} alt="Question Media" className="max-h-[30vh] rounded-[2px] object-contain border-2 border-white/20 shadow-2xl" />
                    </div>
                  )}
                  {gameState.media_type === 'VIDEO' && gameState.media_url && (
                    <div className="mt-6 flex justify-center relative z-10">
                      <video
                        ref={(el) => { mediaRef.current = el; }}
                        src={gameState.media_url}
                        controls
                        autoPlay={Boolean(gameState.media_autoplay && gameState.status === 'ACTIVE')}
                        className="max-h-[30vh] rounded-[2px] border-2 border-white/20 shadow-2xl"
                      />
                    </div>
                  )}
                  {gameState.media_type === 'AUDIO' && gameState.media_url && (
                    <div className="mt-6 flex justify-center relative z-10 w-full max-w-lg mx-auto">
                      <audio
                        ref={(el) => { mediaRef.current = el; }}
                        src={gameState.media_url}
                        controls
                        autoPlay={Boolean(gameState.media_autoplay && gameState.status === 'ACTIVE')}
                        className="w-full"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* RIGHT Column: Options & Live Heatmaps */}
              <div className={isLongQuestion ? "col-span-1 col-span-12 flex flex-col justify-center" : "col-span-7 flex flex-col justify-center"}>
                {gameState.round_type === 'TRUE_FALSE_4' ? (
                  <div className={`grid grid-cols-1 grid-cols-2 ${isLongQuestion ? 'grid-cols-4' : ''} gap-4`}>
                    {Object.entries(gameState.options || {}).map(([key, label]) => {
                      // Parse correct key for this sub-statement
                      let expectedAnswer = '';
                      if (gameState.correct_key) {
                        const match = gameState.correct_key.match(new RegExp(`${key}\\s*:\\s*([ĐSđsTFtf])`, 'i'));
                        if (match) {
                          const val = match[1].toUpperCase();
                          expectedAnswer = (val === 'Đ' || val === 'T') ? 'ĐÚNG' : 'SAI';
                        }
                      }

                      const isRevealed = gameState.status === 'REVEAL';
                      const isDung = expectedAnswer === 'ĐÚNG';

                      // Calculate True/False vote heatmap stats inline for this statement
                      const stat = tfStats ? (tfStats[key] || { D: 0, S: 0, total: 0 }) : { D: 0, S: 0, total: 0 };
                      const percentD = stat.total > 0 ? Math.round((stat.D / stat.total) * 100) : 0;
                      const percentS = stat.total > 0 ? Math.round((stat.S / stat.total) * 100) : 0;

                      const heatD = getHeatColor(percentD);
                      const heatS = getHeatColor(percentS);

                      return (
                        <div
                          key={key}
                          className={`p-5 rounded-[2px] border transition-all relative overflow-hidden flex flex-col justify-between ${
                            isRevealed
                              ? isDung
                                ? 'fluent-box-nested border-emerald-500/60 ring-1 ring-emerald-500/40'
                                : 'fluent-box-nested border-rose-500/60 ring-1 ring-rose-500/40'
                              : 'fluent-box border-white/10'
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <span className="w-8 h-8 rounded-[2px] bg-[#F7CAC9]/10 text-[#F7CAC9] font-mono font-bold flex items-center justify-center text-sm border border-white/10">
                                Ý {key})
                              </span>

                              {isRevealed && (
                                <span
                                  className={`px-3 py-1 rounded-[2px] font-mono font-black text-xs uppercase tracking-wider shadow-md ${
                                    isDung
                                      ? 'bg-emerald-500 text-slate-950 ring-1 ring-emerald-400/50'
                                      : 'bg-rose-500 text-white ring-1 ring-rose-400/50'
                                  }`}
                                >
                                  {expectedAnswer}
                                </span>
                              )}
                            </div>

                            <p className="text-sm text-base font-semibold text-white leading-relaxed">
                              {label}
                            </p>
                          </div>

                          {/* Integrated live heatmap inline visualization */}
                          {showHeatmap && !isRevealed && (
                            <div className="mt-4 pt-3 border-t border-white/10 space-y-2">
                              <div className="flex justify-between items-center text-[10px] font-mono text-rose-300 font-bold uppercase tracking-wider">
                                <span>🔥 BẢN ĐỒ NHIỆT KHÁN GIẢ:</span>
                                <span>{stat.total} phiếu</span>
                              </div>
                              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                                <div className={`p-2 rounded-[2px] border flex items-center justify-between transition-all duration-300 ${heatD.bg} ${heatD.glow}`}>
                                  <span className="opacity-70 font-bold">Ý ĐÚNG</span>
                                  <span className="font-black">{percentD}%</span>
                                </div>
                                <div className={`p-2 rounded-[2px] border flex items-center justify-between transition-all duration-300 ${heatS.bg} ${heatS.glow}`}>
                                  <span className="opacity-70 font-bold">Ý SAI</span>
                                  <span className="font-black">{percentS}%</span>
                                </div>
                              </div>
                            </div>
                          )}

                          {!isRevealed && !showHeatmap && (
                            <div className="mt-3 pt-2 border-t border-white/5 flex justify-between items-center text-xs text-white/40 font-mono">
                              <span>Khán giả chọn: [ĐÚNG / SAI]</span>
                              <span className="text-[#B6A6D8]">Đang chờ chốt</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : gameState.round_type === 'SHORT_ANSWER' ? (
                  /* Dedicated display for SHORT_ANSWER */
                  <div className="space-y-4">
                    {gameState.status === 'REVEAL' ? (
                      <div className="fluent-box border-emerald-500/50 rounded-[2px] p-6 p-8 text-center space-y-3 shadow-2xl animate-fadeIn">
                        <span className="text-xs font-mono uppercase tracking-widest text-emerald-400 font-bold block">
                          ĐÁP ÁN CHÍNH XÁC (CÂU TRẢ LỜI NGẮN)
                        </span>
                        <h3 className="text-3xl text-4xl font-black text-white font-mono uppercase tracking-wider">
                          {gameState.correct_key || '(Chưa thiết lập đáp án)'}
                        </h3>
                        <div className="pt-2 text-xs font-mono text-white/60">
                          Tổng số khán giả đã tham gia gửi đáp án: <strong className="text-emerald-400">{voteStats.total}</strong>
                        </div>
                      </div>
                    ) : (
                      <div className="fluent-box rounded-[2px] p-8 text-center space-y-3 shadow-xl">
                        <div className="w-12 h-12 shrink-0 rounded-[2px] bg-[#F7CAC9]/20 text-[#F7CAC9] flex items-center justify-center mx-auto border border-white/10">
                          <Sparkles className="w-6 h-6 animate-pulse" />
                        </div>
                        <h3 className="text-xl font-bold text-white">
                          Phần thi Trả lời ngắn
                        </h3>
                        <p className="text-sm text-white/60 max-w-lg mx-auto">
                          Khán giả và thí sinh đang nhập câu trả lời trực tiếp trên thiết bị di động.
                        </p>
                        <div className="inline-block px-4 py-1.5 rounded-[2px] bg-[#F7CAC9]/20 border border-white/10 text-[#F7CAC9] font-mono text-xs font-bold">
                          Đã nhận: {voteStats.total} phản hồi
                        </div>
                      </div>
                    )}

                    {/* Live Integrated Heatmap predictions word cloud for Short Answer */}
                    {showHeatmap && shortStats && (
                      <div className="fluent-box rounded-[2px] p-6 shadow-xl space-y-4 animate-fadeIn">
                        <div className="flex justify-between items-center pb-2 border-b border-white/10">
                          <span className="text-xs font-mono font-bold text-rose-300 uppercase tracking-wider flex items-center gap-1.5">
                            <Zap className="w-3.5 h-3.5 animate-pulse text-rose-400" /> BẢN ĐỒ NHIỆT KHÁN GIẢ ({shortStats.total} câu trả lời)
                          </span>
                        </div>

                        {shortStats.list.length === 0 ? (
                          <p className="text-sm text-white/40 text-center py-6 font-mono">Đang chờ phản hồi của khán giả gửi về...</p>
                        ) : (
                          <div className="flex flex-wrap gap-2.5 justify-center py-2">
                            {shortStats.list.map((item, idx) => {
                              const percentage = shortStats.total > 0 ? Math.round((item.count / shortStats.total) * 100) : 0;
                              const heat = getHeatColor(percentage);
                              const sizeClass = percentage > 50
                                ? 'text-xl py-2 px-4 rounded-[2px]'
                                : percentage > 25
                                ? 'text-lg py-1.5 px-3 rounded-[2px]'
                                : percentage > 10
                                ? 'text-sm py-1 px-2.5 rounded-[2px]'
                                : 'text-xs py-1 px-2 rounded-[2px]';

                              return (
                                <div
                                  key={idx}
                                  className={`font-mono border flex items-center gap-1.5 shadow-md transition-all duration-300 ${heat.bg} ${heat.glow} ${sizeClass}`}
                                >
                                  <span className="font-bold tracking-wider">{item.raw}</span>
                                  <span className={`text-[9px] font-mono font-black py-0.5 px-1 rounded-[2px] ${heat.badge}`}>
                                    {percentage}% ({item.count})
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : gameState.round_type === 'SEQUENCING' ? (
                  /* Dedicated display for SEQUENCING */
                  <div className="space-y-4">
                    {gameState.status === 'REVEAL' ? (
                      <div className="fluent-box border-emerald-500/50 rounded-[2px] p-6 p-8 text-center space-y-4 shadow-2xl animate-fadeIn">
                        <span className="text-xs font-mono uppercase tracking-widest text-emerald-400 font-bold block">
                          TRÌNH TỰ CHÍNH XÁC
                        </span>
                        <div className="flex flex-wrap items-center justify-center gap-3 py-2">
                          {(gameState.correct_key || 'A-B-C-D').split('-').map((key, idx) => {
                            const trimmedKey = key.trim();
                            const label = gameState.options?.[trimmedKey] || '';
                            return (
                              <React.Fragment key={trimmedKey}>
                                {idx > 0 && <span className="text-emerald-400 font-black text-xl">➔</span>}
                                <div className="bg-emerald-500 text-slate-950 px-4 py-2.5 rounded-[2px] font-mono font-black text-sm text-base shadow-lg flex items-center gap-2">
                                  <span className="w-6 h-6 rounded-[2px] bg-slate-950 text-emerald-400 text-xs flex items-center justify-center">
                                    {idx + 1}
                                  </span>
                                  <span>[{trimmedKey}] {label}</span>
                                </div>
                              </React.Fragment>
                            );
                          })}
                        </div>
                        <div className="pt-2 text-xs font-mono text-white/60">
                          Tổng số câu trả lời ghi nhận: <strong className="text-emerald-400">{voteStats.total}</strong>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between text-xs font-mono font-bold text-[#F7CAC9] px-1">
                          <span>DANH SÁCH CÁC MỤC CẦN SẮP XẾP TRÌNH TỰ:</span>
                          <span className="bg-white/10 px-3 py-1 rounded-[2px] text-white border border-white/10">Đã nhận: {voteStats.total} phản hồi</span>
                        </div>
                        <div className="grid grid-cols-1 grid-cols-2 gap-3">
                          {Object.entries(gameState.options || {}).map(([key, label]) => (
                            <div key={key} className="p-4 fluent-box-nested rounded-[2px] flex items-center gap-3">
                              <span className="w-8 h-8 rounded-[2px] bg-[#F7CAC9] text-[#0D0420] font-mono font-black text-sm flex items-center justify-center shrink-0 shadow">
                                {key}
                              </span>
                              <span className="text-sm text-base font-semibold text-white leading-tight">{label}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    {/* Inline View Switcher for Multiple Choice (Cards vs Recharts Bar Chart) */}
                    <div className="flex items-center justify-between mb-3 px-1">
                      <div className="flex items-center gap-1.5 p-1 bg-black/50 border border-white/10 rounded-[2px]">
                        <button
                          type="button"
                          onClick={() => setOptionsDisplayMode('CARDS')}
                          className={`px-3 py-1 rounded-[2px] text-xs font-mono font-bold transition flex items-center gap-1.5 ${
                            optionsDisplayMode === 'CARDS'
                              ? 'bg-[#F7CAC9] text-[#190839] shadow-sm'
                              : 'text-white/60 hover:text-white hover:bg-white/10'
                          }`}
                        >
                          <LayoutGrid className="w-3.5 h-3.5" />
                          Thẻ Lựa Chọn
                        </button>
                        <button
                          type="button"
                          onClick={() => setOptionsDisplayMode('CHART')}
                          className={`px-3 py-1 rounded-[2px] text-xs font-mono font-bold transition flex items-center gap-1.5 ${
                            optionsDisplayMode === 'CHART'
                              ? 'fluent-acrylic-surface text-white shadow-sm'
                              : 'text-white/60 hover:text-white hover:bg-white/10'
                          }`}
                        >
                          <BarChart2 className="w-3.5 h-3.5" />
                          Biểu Đồ Cột (Recharts)
                        </button>
                      </div>
                      <div className="text-[11px] font-mono text-white/50">
                        Đã nộp: <strong className="text-white font-bold">{voteStats.total}/{activeCount}</strong>
                      </div>
                    </div>

                    {optionsDisplayMode === 'CHART' ? (
                      <div className="fluent-box rounded-[2px] p-4 p-5 shadow-2xl">
                        <ProjectorResponseBarChart
                          gameState={gameState}
                          responses={responses}
                          activeCount={activeCount}
                        />
                      </div>
                    ) : (
                      <div className={`grid grid-cols-1 grid-cols-2 ${isLongQuestion ? 'grid-cols-4' : ''} gap-4`}>
                        {Object.entries(gameState.options || {}).map(([key, label]) => {
                          const count = voteStats.counts[key] || 0;
                          const percent = voteStats.total > 0 ? Math.round((count / voteStats.total) * 100) : 0;
                          const isCorrect = gameState.status === 'REVEAL' && key.toUpperCase() === gameState.correct_key.toUpperCase();
                          const isEliminated = (gameState.eliminated_options || []).includes(key);

                          return (
                            <div
                              key={key}
                              className={`p-5 rounded-[2px] border transition-all relative overflow-hidden ${
                                isEliminated
                                  ? 'fluent-box-nested border-rose-500/30 opacity-45'
                                  : isCorrect
                                  ? 'fluent-box-nested border-emerald-500/60 ring-1 ring-emerald-500/40'
                                  : 'fluent-box border-white/10'
                              }`}
                            >
                              <div className="flex items-center justify-between mb-3 relative z-10">
                                <div className="flex items-center gap-3">
                                  <div
                                    className={`w-9 h-9 rounded-[2px] font-mono font-bold text-base flex items-center justify-center shadow-md ${
                                      isEliminated
                                        ? 'bg-rose-900/60 text-rose-300 border border-rose-500/40 line-through'
                                        : isCorrect
                                        ? 'bg-emerald-500 text-black'
                                        : 'fluent-option-badge text-[#F5EFF9]'
                                    }`}
                                  >
                                    {key}
                                  </div>
                                  <div>
                                    <span className={`text-base font-semibold ${isEliminated ? 'line-through text-white/50' : 'text-white'}`}>
                                      {label}
                                    </span>
                                    {isEliminated && (
                                      <span className="ml-2 inline-flex items-center gap-1 text-[10px] font-mono text-rose-400 bg-white/10 px-2 py-0.5 rounded-[2px] border border-rose-500/30 font-bold uppercase">
                                        <XCircle className="w-3 h-3" /> Đã loại trừ
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {/* Vote Count & Percent */}
                                {(gameState.status === 'REVEAL' || showHeatmap) && (
                                  <div className="text-right font-mono">
                                    <span className={`text-lg font-bold ${showHeatmap && gameState.status !== 'REVEAL' ? 'text-rose-300 font-black' : 'text-white'}`}>
                                      {percent}%
                                    </span>
                                    <span className="text-[10px] text-white/40 block">({count} phiếu)</span>
                                  </div>
                                )}
                              </div>

                              {/* Progress Bar (Visible on REVEAL or HEATMAP) */}
                              {(gameState.status === 'REVEAL' || showHeatmap) && (
                                <div className="w-full h-2.5 bg-black/50 rounded-[2px] overflow-hidden p-0.5 border border-white/5 mt-3">
                                  <div
                                    className={`h-full rounded-[1px] transition-all duration-500 ${
                                      isCorrect
                                        ? 'bg-emerald-400'
                                        : showHeatmap && gameState.status !== 'REVEAL'
                                        ? percent > 70
                                          ? 'bg-gradient-to-r from-orange-500 to-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)] animate-pulse'
                                          : percent > 40
                                          ? 'bg-amber-400'
                                          : percent > 15
                                          ? 'bg-emerald-400/80'
                                          : 'bg-blue-400/80'
                                        : 'bg-[#E39A96]'
                                    }`}
                                    style={{ width: `${percent}%` }}
                                  />
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>

            </div>

            {/* Explanation on Reveal */}
            {gameState.status === 'REVEAL' && gameState.explanation && (
              <div className="fluent-box rounded-[2px] p-6 shadow-xl animate-fadeIn">
                <div className="text-[10px] font-bold uppercase tracking-widest text-[#F7CAC9] mb-2 font-mono flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#F7CAC9]" /> Bóc tách Bẫy Tâm Lý & Căn Cứ Học Thuật:
                </div>
                <p className="text-sm text-base text-white/80 leading-relaxed">
                  {gameState.explanation}
                </p>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Realtime Audience Cheer & Intensity Meter */}
      {showCheerMeter && (
        <div className="relative z-20 my-3 animate-fadeIn">
          <ProjectorCheerMeter theme={gameState.projectorTheme} />
        </div>
      )}

      {/* Stage Footer (Bento Style) */}
      <footer className="relative z-10 flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-4 text-[10px] text-white/40 font-mono">
        <div className="flex items-center gap-3">
          <span>BEYOND THE INTERNET 2026 • LIVE STAGE ENGINE</span>
          <span>•</span>
          <button
            type="button"
            onClick={() => setShowCheerMeter(!showCheerMeter)}
            className="text-pink-300/90 hover:text-pink-200 underline transition cursor-pointer flex items-center gap-1"
          >
            <Heart className="w-3 h-3 text-rose-400 fill-current" />
            {showCheerMeter ? '💓 Ẩn Nhịp Tim Cổ Vũ (Phím C)' : '💓 Hiện Nhịp Tim Cổ Vũ (Phím C)'}
          </button>
          <span>•</span>
          <button
            type="button"
            onClick={() => {
              setShowResponseList(!showResponseList);
              if (!showResponseList) {
                setShowLeaderboard(false);
                setShowHeatmap(false);
              }
            }}
            className="text-sky-300/80 hover:text-sky-300 underline transition cursor-pointer flex items-center gap-1"
          >
            <ListFilter className="w-3 h-3" />
            {showResponseList ? '↩ Trở về màn hình câu hỏi' : '📝 Xem Danh Sách Phản Hồi (Phím R)'}
          </button>
          <span>•</span>
          <button
            type="button"
            onClick={() => {
              setShowBarChart(!showBarChart);
              if (!showBarChart) {
                setShowLeaderboard(false);
                setShowHeatmap(false);
                setShowResponseList(false);
                setShowWordCloud(false);
              }
            }}
            className="text-purple-300/80 hover:text-purple-300 underline transition cursor-pointer flex items-center gap-1"
          >
            <BarChart2 className="w-3 h-3 text-purple-400" />
            {showBarChart ? '↩ Trở về màn hình câu hỏi' : '📊 Biểu Đồ Cột Recharts (Phím B)'}
          </button>
          <span>•</span>
          <button
            type="button"
            onClick={() => {
              setShowWordCloud(!showWordCloud);
              if (!showWordCloud) {
                setShowLeaderboard(false);
                setShowHeatmap(false);
                setShowResponseList(false);
                setShowBarChart(false);
              }
            }}
            className="text-pink-300/80 hover:text-pink-300 underline transition cursor-pointer flex items-center gap-1"
          >
            <Cloud className="w-3 h-3 text-[#F7CAC9]" />
            {showWordCloud ? '↩ Trở về màn hình câu hỏi' : '☁️ Đám Mây Từ Khóa (Phím W)'}
          </button>
          <span>•</span>
          <button
            type="button"
            onClick={() => {
              setShowLeaderboard(!showLeaderboard);
              if (!showLeaderboard) {
                setShowHeatmap(false);
                setShowResponseList(false);
                setShowWordCloud(false);
              }
            }}
            className="text-amber-300/80 hover:text-amber-300 underline transition cursor-pointer flex items-center gap-1"
          >
            <Trophy className="w-3 h-3" />
            {isLeaderboardVisible ? '↩ Trở về màn hình câu hỏi' : '🏆 Xem Bảng Xếp Hạng Top 5 (Phím L)'}
          </button>
          <span>•</span>
          <button
            type="button"
            onClick={() => {
              setShowHeatmap(!showHeatmap);
              if (!showHeatmap) {
                setShowLeaderboard(false);
                setShowResponseList(false);
                setShowWordCloud(false);
              }
            }}
            className="text-rose-300/80 hover:text-rose-300 underline transition cursor-pointer flex items-center gap-1"
          >
            <BarChart3 className="w-3 h-3" />
            {showHeatmap ? '📊 Ẩn Bản Đồ Nhiệt Real-time (Phím H)' : '📊 Hiện Bản Đồ Nhiệt Real-time (Phím H)'}
          </button>
        </div>
        <span>LATENCY: &lt;100MS • SYNC RATE: 10HZ</span>
      </footer>

      {/* MODAL: Audience QR Code Display (Sync with Admin Portal) */}
      {gameState.show_qr && (
        <div className="fluent-dialog-overlay animate-fadeIn">
          <div className="max-w-md w-full bg-[#190839]/50 backdrop-blur-md border-2 border-blue-500/30 rounded-[2px] p-8 text-center text-[#e5e5e5] shadow-[0_0_50px_rgba(59,130,246,0.25)] relative overflow-hidden">
            {/* Subtle decorative glow */}
            <div className="absolute -top-10 -right-10 w-40 h-40 fluent-box-nested rounded-[2px] blur-2xl pointer-events-none" />
            <div className="absolute -bottom-10 -left-10 w-40 h-40 fluent-box-nested rounded-[2px] blur-2xl pointer-events-none" />

            <div className="w-16 h-16 fluent-box-nested rounded-[2px] flex items-center justify-center text-blue-400 mx-auto mb-4 border border-blue-500/20">
              <QrCode className="w-8 h-8 animate-pulse" />
            </div>

            <h3 className="text-2xl font-black text-white uppercase tracking-wider mb-2">MÃ QR KHÁN GIẢ</h3>
            <p className="text-sm text-white/50 mb-6">
              Quét mã bằng camera điện thoại để vào màn hình tương tác và tham gia bình chọn trực tiếp!
            </p>

            {qrDataUrl ? (
              <div className="p-5 bg-white rounded-[2px] inline-block shadow-2xl border-4 border-blue-500/20 mb-4 scale-105 hover:scale-110 transition duration-300">
                <img src={qrDataUrl} alt="QR Code Khán Giả" className="w-64 h-64 mx-auto" />
              </div>
            ) : (
              <div className="w-64 h-64 fluent-box-nested rounded-[2px] mx-auto flex items-center justify-center text-xs text-white/40">
                Đang tạo QR...
              </div>
            )}

            <div className="text-[10px] font-mono text-white/30 uppercase tracking-widest mt-4">
              BEYOND THE INTERNET 2026 • REALTIME ENGINE
            </div>
          </div>
        </div>
      )}

      {gameState.projector_dimmed && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-[24px] saturate-150/85 z-[9999] pointer-events-none transition-opacity duration-1000 backdrop-blur-sm animate-fadeIn" />
      )}

      {/* Realtime Featured Audience Q&A Overlay */}
      <ProjectorQAOverlay 
        question={gameState.featured_qa_question || null} 
        theme={gameState.projectorTheme} 
      />

      {/* Live Broadcast Announcer Overlay */}
      <AnnouncerOverlay overlay={gameState.announcer_overlay} mode="projector" />
    </div>
  );
};
