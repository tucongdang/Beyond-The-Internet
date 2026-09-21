import { useLanguage } from '../hooks/useLanguage';
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { GameState, UserInfo, UserResponse, OptionKey, QuestionTranslation } from '../types';
import { translationService, SUPPORTED_TRANSLATION_LANGUAGES } from '../services/translationService';
import { syncService } from '../services/syncService';
import { soundFx } from '../services/audioEffects';
import { normalizeVcnvAnswer } from '../utils/exportUtils';
import { calculateLeaderboard } from '../utils/leaderboardUtils';
import { getUserDisplayUid } from '../utils/uidUtils';
import { interpolateTimerColor } from '../utils/colorUtils';

import {
  computeAudienceScoreFromResponses,
  getAudienceTotalScore,
  getAudienceScoreBreakdown,
  normalizeRoundKey
} from '../services/audienceScoringService';
import {
  vibrateSubmit,
  vibrateSuccess,
  vibrateWarning,
  vibrateTap,
  vibrateNewQuestion,
  vibrateRoundEnd,
  vibrateCountdownCritical,
  vibrateCorrect,
  vibrateWrong,
  vibrateLifeline,
  vibrateCheer,
  vibrateSelection,
  vibrateGrandCelebration
} from '../utils/hapticUtils';
import { ZoomIn } from 'lucide-react';
import { t } from '../utils/i18n';
import { ShareGameModal } from './ShareGameModal';
import { Leaderboard } from './Leaderboard';
import { LuckyDrawAudience } from './LuckyDrawAudience';
import { NextQuestionCountdown } from './NextQuestionCountdown';
import { CountdownTimer } from './CountdownTimer';
import { AudienceDesktopSidebar } from './AudienceDesktopSidebar';
import confetti from '../utils/confetti';
import {
  Radio,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle, AlertOctagon,
  Sparkles,
  Award,
  BarChart3,
  HelpCircle,
  Lock,
  Send,
  Zap,
  ShieldCheck,
  ChevronRight,
  Flame,
  Trophy,
  TrendingUp,
  QrCode,
  ArrowUpDown,
  AlertTriangle,
  X,
  GripVertical,
  Share2,
  Home,
  User, Users,
  History,
  Sun,
  SunMedium,
  Smartphone,
  Heart,
  MessageSquare,
  Megaphone,
  RefreshCw, Globe, Languages, ChevronDown, Check,
  Volume2, VolumeX, Shield
} from 'lucide-react';
import { aiExplanationService } from '../services/aiExplanationService';
import { calculateSurvivalStats } from '../utils/leaderboardUtils';
import { PostMatchCardModal } from './PostMatchCardModal';
import { useScreenWakeLock } from '../hooks/useScreenWakeLock';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { BatteryIndicator } from './BatteryIndicator';

import { ScoreDisplay } from './ScoreDisplay';
import { EmergencyPollAudience } from './EmergencyPollAudience';
import { AnnouncerOverlay } from './AnnouncerOverlay';
import { AudienceQuestionLogModal } from './AudienceQuestionLogModal';
import { AudienceCheerModal } from './AudienceCheerModal';
import { AudienceCheerButton } from './AudienceCheerButton';
import { AudienceQAModal } from './AudienceQAModal';
import { AudienceHighlightedQuestionToast } from './AudienceHighlightedQuestionToast';
import { QuestionLikeButton } from './QuestionLikeButton';
import { AudienceShoutMarquee } from './AudienceShoutMarquee';
import { AudienceShoutModal } from './AudienceShoutModal';

interface AudienceViewProps {
  gameState: GameState;
  user: UserInfo | null;
  responses: Record<string, UserResponse>;
  allResponses?: Record<string, Record<string, UserResponse>>;
  onOpenRegister: () => void;
  onOpenProfile: () => void;
  onOpenLogModal?: () => void;
  onOpenShareModal?: () => void;
  onOpenQAModal?: () => void;
  onOpenPostMatchModal?: () => void;
  isHighContrast?: boolean;
  onToggleHighContrast?: () => void;
  isWakeLockLocked?: boolean;
  isWakeLockSupported?: boolean;
  onToggleWakeLock?: () => void;
}

const AudienceViewContent: React.FC<AudienceViewProps> = ({
  gameState,
  user,
  responses,
  allResponses,
  onOpenRegister,
  onOpenProfile,
  onOpenLogModal,
  onOpenShareModal,
  onOpenQAModal,
  onOpenPostMatchModal,
  isHighContrast,
  onToggleHighContrast,
  isWakeLockLocked,
  isWakeLockSupported,
  onToggleWakeLock
}) => {
  const [localLanguage, setLocalLanguage] = useState<string>(() => {
    return localStorage.getItem('bti_lang') || 'vi';
  });

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = localLanguage || 'vi';
    }
  }, [localLanguage]);

  useEffect(() => {
    const handleStorageChange = () => {
      setLocalLanguage(localStorage.getItem('bti_lang') || 'vi');
    };
    const handleCustomChange = (e: any) => {
      if (e.detail) setLocalLanguage(e.detail);
    };
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('languageChange', handleCustomChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('languageChange', handleCustomChange);
    };
  }, []);

  const [isShareModalOpen, setIsShareModalOpen] = useState<boolean>(false);
  const handleOpenShareModal = onOpenShareModal || (() => setIsShareModalOpen(true));
  const [isLogModalOpen, setIsLogModalOpen] = useState<boolean>(false);
  const [lastKeyPressed, setLastKeyPressed] = useState<string>('');
  const isLongQuestion = (gameState?.question_text || '').length > 180;
  const [isQuestionZoomed, setIsQuestionZoomed] = useState<boolean>(false);
  const [selectedChoice, setSelectedChoice] = useState<string>('');
  const networkStatus = useNetworkStatus();
  const [shortAnswerText, setShortAnswerText] = useState<string>('');
  const [isConfirmingShortAnswer, setIsConfirmingShortAnswer] = useState<boolean>(false);
  const [vcnvPrediction, setVcnvPrediction] = useState<string>('');
  const [isEditingVcnv, setIsEditingVcnv] = useState<boolean>(false);
  const [hasVotedThisQuestion, setHasVotedThisQuestion] = useState<boolean>(false);
  const [isPendingSync, setIsPendingSync] = useState<boolean>(false);
  const [submitToast, setSubmitToast] = useState<boolean>(false);
  const [timeLeft, setTimeLeft] = useState<number>(gameState.time_limit);
  const prevStatusRef = useRef<string>(gameState.status);

  // Risk Box States
  const [riskAnswerText, setRiskAnswerText] = useState<string>('');
  const [riskCnvText, setRiskCnvText] = useState<string>('');
  const [hasSubmittedRisk, setHasSubmittedRisk] = useState<boolean>(false);
  const [isEditingRisk, setIsEditingRisk] = useState<boolean>(false);

  // True / False 4 Sub-questions state
  const [tfChoices, setTfChoices] = useState<Record<string, 'Đ' | 'S'>>({});

  // Sequencing items state & Drag and Drop
  const [seqItems, setSeqItems] = useState<string[]>([]);
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);

  // Toast Warning Notification state
  const [seqToast, setSeqToast] = useState<{
    id: string;
    title: string;
    message: string;
    type: 'warning' | 'error' | 'info';
  } | null>(null);


    // Mini-Tip Quick Guide state
  const [showMiniTip, setShowMiniTip] = useState<boolean>(false);
  const [tipQuestionId, setTipQuestionId] = useState<string>('');

  // Round 4 Double Down / All-In Risk state
  const [isDoubleDownActive, setIsDoubleDownActive] = useState<boolean>(false);

  // AI Voice TTS state
  const [isSpeakingQuestion, setIsSpeakingQuestion] = useState<boolean>(false);
  const [autoSpeakAnswer, setAutoSpeakAnswer] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('bti_auto_speak_answer');
      if (saved !== null) return saved === 'true';
    }
    return true; // Auto read out correct answer by default
  });
  const lastSpokenCorrectAnswerQIdRef = useRef<string | null>(null);

  // AI Instant Explanation state ("Hỏi Nhanh Vì Sao")
  const [aiExplanation, setAiExplanation] = useState<string>('');
  const [isAiExplaining, setIsAiExplaining] = useState<boolean>(false);

  // Tab switch / focus departure detection state
  const [tabSwitchCount, setTabSwitchCount] = useState<number>(0);
  const tabSwitchCountRef = useRef<number>(0);
  const [showTabSwitchWarning, setShowTabSwitchWarning] = useState<boolean>(false);

  // Offline queue notice
  const [offlineNotice, setOfflineNotice] = useState<string | null>(null);

  // Post-match infographic card modal state
  const [isPostMatchModalOpen, setIsPostMatchModalOpen] = useState<boolean>(false);

  // Multilingual Question Translation State & Resolver
  const [localTranslation, setLocalTranslation] = useState<QuestionTranslation | null>(null);
  const [isTranslating, setIsTranslating] = useState<boolean>(false);
  const [translationError, setTranslationError] = useState<string | null>(null);
  const [isLanguageMenuOpen, setIsLanguageMenuOpen] = useState<boolean>(false);
  const [shortAnswerTranslation, setShortAnswerTranslation] = useState<{ text: string; lang: string }>({ text: '', lang: '' });
  const [isTranslatingShortAnswer, setIsTranslatingShortAnswer] = useState<boolean>(false);
  const [revealShortAnswerTranslation, setRevealShortAnswerTranslation] = useState<{ text: string; lang: string; flag: string }>({ text: '', lang: '', flag: '' });

  const getLangFlag = (code: string) => {
    if (code === 'vi') return '🇻🇳';
    const found = SUPPORTED_TRANSLATION_LANGUAGES.find(l => l.code === code);
    return found?.flag || '🌐';
  };

  // Synchronize translation:
  // When in Vietnamese ('vi'), clear translation and never translate
  // When in any foreign language (en, zh, ja, ko, fr, es, de, th, lo, km, ru, etc.), resolve translation
  useEffect(() => {
    if (localLanguage === 'vi') {
      setLocalTranslation(null);
      return;
    }

    const targetLang = localLanguage;
    const fromBroadcast = gameState.translations?.[targetLang];
    if (fromBroadcast) {
      setLocalTranslation(fromBroadcast);
      return;
    }
    const cached = translationService.getCachedTranslation(gameState.question_id, targetLang);
    if (cached) {
      setLocalTranslation(cached);
      return;
    }

    // Automatically translate question & answer options to target language
    if (gameState.question_text && gameState.question_id) {
      let isCancelled = false;
      setIsTranslating(true);
      setTranslationError(null);
      translationService.translateQuestion(
        {
          id: gameState.question_id,
          question_text: gameState.question_text,
          options: gameState.options,
          explanation: gameState.explanation
        },
        targetLang
      ).then((trans) => {
        if (!isCancelled) {
          setLocalTranslation(trans);
          setIsTranslating(false);
        }
      }).catch((err) => {
        if (!isCancelled) {
          console.warn(`Auto translate question to ${targetLang} error:`, err);
          setTranslationError(err?.message || 'Không thể dịch');
          setIsTranslating(false);
        }
      });

      return () => {
        isCancelled = true;
      };
    }

    setLocalTranslation(null);
  }, [gameState.question_id, gameState.question_text, gameState.options, gameState.explanation, gameState.translations, localLanguage]);

  // Auto translate correct short answer to player's target language during REVEAL
  useEffect(() => {
    const isShort = gameState.round_type === 'SHORT_ANSWER' || gameState.round_type === 'FILL_IN_BLANK' || gameState.round_type === 'VCNV';
    if (gameState.status === 'REVEAL' && isShort && gameState.correct_key) {
      let isCancelled = false;
      const targetLang = localLanguage !== 'vi' ? localLanguage : 'vi';
      translationService.translateShortAnswer(gameState.correct_key, targetLang)
        .then((translated) => {
          if (!isCancelled && translated && translated.trim().toLowerCase() !== gameState.correct_key.trim().toLowerCase()) {
            setRevealShortAnswerTranslation({
              text: translated,
              lang: targetLang,
              flag: getLangFlag(targetLang)
            });
          }
        })
        .catch(() => {});
      return () => {
        isCancelled = true;
      };
    } else {
      setRevealShortAnswerTranslation({ text: '', lang: '', flag: '' });
    }
  }, [gameState.status, gameState.round_type, gameState.correct_key, localLanguage]);

  const handleTranslateShortAnswer = async (targetLang?: string) => {
    if (!shortAnswerText.trim() || isTranslatingShortAnswer) return;
    setIsTranslatingShortAnswer(true);
    const langToUse = targetLang || (localLanguage !== 'vi' ? localLanguage : 'en');
    try {
      const translated = await translationService.translateShortAnswer(shortAnswerText.trim(), langToUse);
      setShortAnswerTranslation({ text: translated, lang: langToUse });
      soundFx.playTing();
      vibrateTap();
    } catch (err) {
      console.warn('Translate short answer error:', err);
    } finally {
      setIsTranslatingShortAnswer(false);
    }
  };

  const handleRequestTranslate = async () => {
    if (isTranslating || localLanguage === 'vi') return;
    setIsTranslating(true);
    setTranslationError(null);
    try {
      const trans = await translationService.translateQuestion(
        {
          id: gameState.question_id,
          question_text: gameState.question_text,
          options: gameState.options,
          explanation: gameState.explanation
        },
        localLanguage
      );
      setLocalTranslation(trans);
      soundFx.playTing();
      vibrateTap();
    } catch (err: any) {
      setTranslationError(err?.message || 'Không thể dịch');
      soundFx.playAlarm();
    } finally {
      setIsTranslating(false);
    }
  };

  const activeQuestionText = (localLanguage !== 'vi' && localTranslation?.question_text)
    ? localTranslation.question_text
    : gameState.question_text;
  const activeOptions = (localLanguage !== 'vi' && localTranslation?.options)
    ? localTranslation.options
    : gameState.options;
  const activeExplanation = (localLanguage !== 'vi' && localTranslation?.explanation)
    ? localTranslation.explanation
    : gameState.explanation;

  // Helper to detect CJK / East Asian / Non-Latin characters for typography breathing room
  const isCjk = (text?: unknown, lang?: string): boolean => {
    if (lang && ['ko', 'zh', 'ja', 'th', 'lo', 'km'].includes(lang)) return true;
    if (!text) return false;
    return /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\uff66-\uff9f\uac00-\ud7af\u0e00-\u0e7f\u0e80-\u0eff\u1780-\u17ff]/.test(String(text));
  };
  const isCjkQuestion = isCjk(activeQuestionText, localLanguage);

  // Helper to detect Korean (Hangul) specifically for NEXON Lv1 Gothic question font
  const isKorean = (text?: unknown, lang?: string): boolean => {
    if (lang === 'ko') return true;
    if (!text) return false;
    return /[\uac00-\ud7af\u1100-\u11ff\u3130-\u318f]/.test(String(text));
  };
  const isKoreanQuestion = isKorean(activeQuestionText, localLanguage);

  const hasAnnouncer = Boolean(gameState?.announcer_overlay?.active && gameState?.announcer_overlay?.text?.trim());
  

  // Auto-dismiss notification toast
  useEffect(() => {
    if (!seqToast) return;
    const timer = setTimeout(() => {
      setSeqToast(null);
    }, 4500);
    return () => clearTimeout(timer);
  }, [seqToast]);

  // Handle Mini-Tip display logic
  useEffect(() => {
    if (gameState.status === "ACTIVE" && gameState.question_id && gameState.question_id !== tipQuestionId && !hasVotedThisQuestion) {
      setShowMiniTip(true);
      setTipQuestionId(gameState.question_id);
      
      const timer = setTimeout(() => {
        setShowMiniTip(false);
      }, 8000);
      
      return () => clearTimeout(timer);
    } else if (gameState.status !== "ACTIVE" || hasVotedThisQuestion) {
      setShowMiniTip(false);
    }
  }, [gameState.status, gameState.question_id, tipQuestionId, hasVotedThisQuestion]);

  useEffect(() => {
    if (gameState.options) {
      const keys = Object.keys(gameState.options);
      setSeqItems(keys);
    } else {
      setSeqItems([]);
    }
  }, [gameState.question_id, gameState.options]);

  const moveSeqItemUp = (idx: number) => {
    if (idx <= 0) return;
    soundFx.playClick();
    vibrateTap();
    setSeqItems(prev => {
      const updated = [...prev];
      const temp = updated[idx];
      updated[idx] = updated[idx - 1];
      updated[idx - 1] = temp;
      return updated;
    });
  };

  const moveSeqItemDown = (idx: number) => {
    if (idx >= seqItems.length - 1) return;
    soundFx.playClick();
    vibrateTap();
    setSeqItems(prev => {
      const updated = [...prev];
      const temp = updated[idx];
      updated[idx] = updated[idx + 1];
      updated[idx + 1] = temp;
      return updated;
    });
  };

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    setDraggedIdx(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, dropIndex: number) => {
    e.preventDefault();
    if (draggedIdx === null || draggedIdx === dropIndex) return;
    soundFx.playClick();
    vibrateTap();
    setSeqItems(prev => {
      const updated = [...prev];
      const [movedItem] = updated.splice(draggedIdx, 1);
      updated.splice(dropIndex, 0, movedItem);
      return updated;
    });
    setDraggedIdx(null);
  };

  const showSeqWarningToast = (title: string, message: string, type: 'warning' | 'error' = 'warning') => {
    vibrateWarning();
    try {
      soundFx.playClick();
    } catch (e) {}
    setSeqToast({
      id: Date.now().toString(),
      title,
      message,
      type
    });
  };

  const handleSequencingSubmit = () => {
    const expectedKeys = Object.keys(gameState.options || {});
    const expectedCount = expectedKeys.length;

    // 1. Check if user is registered
    if (!user) {
      showSeqWarningToast(
        t("view_sort_err_login", localLanguage),
        t("view_sort_req_name", localLanguage),
        'warning'
      );
      onOpenRegister();
      return;
    }

    // 2. Check if question options exist
    if (expectedCount === 0) {
      showSeqWarningToast(
        t("view_sort_err_nodata", localLanguage),
        t("view_sort_no_options", localLanguage),
        'warning'
      );
      return;
    }

    // 3. Check if game status is ACTIVE
    if (gameState.status !== 'ACTIVE') {
      showSeqWarningToast(
        t("view_sort_err_timeout", localLanguage),
        t("view_sort_timeout", localLanguage),
        'warning'
      );
      return;
    }

    // 4. Check if answer is incomplete (< expectedCount)
    if (!seqItems || seqItems.length === 0 || seqItems.length < expectedCount) {
      const currentCount = seqItems ? seqItems.length : 0;
      showSeqWarningToast(
        t("view_sort_err_incomplete", localLanguage),
        t("view_sort_incomplete", localLanguage).replace("{expected}", String(expectedCount)).replace("{current}", String(currentCount)).replace("{expected}", String(expectedCount)),
        'warning'
      );
      return;
    }

    // 5. Check missing or duplicate keys
    const missingKeys = expectedKeys.filter(k => !seqItems.includes(k));
    const hasDuplicates = new Set(seqItems).size !== seqItems.length;
    if (missingKeys.length > 0 || hasDuplicates) {
      showSeqWarningToast(
        t("view_sort_err_invalid", localLanguage),
        missingKeys.length > 0
          ? t("view_sort_missing", localLanguage).replace("{missing}", missingKeys.join(", "))
          : t("view_sort_duplicate", localLanguage),
        'error'
      );
      return;
    }

    // 6. Check empty option texts
    const emptyKey = seqItems.find(k => !gameState.options?.[k] || !gameState.options[k].trim());
    if (emptyKey) {
      showSeqWarningToast(
        t("view_sort_err_empty", localLanguage),
        t("view_sort_invalid", localLanguage).replace("{key}", emptyKey),
        'error'
      );
      return;
    }

    // All validation passed!
    soundFx.playClick();
    vibrateSubmit();
    setSeqToast(null);
    const formattedChoice = seqItems.join('-');
    handleOptionSelect(formattedChoice);
  };

  const handleToggleTf = (subKey: string, value: 'Đ' | 'S') => {
    if (!user) {
      onOpenRegister();
      return;
    }
    if (gameState.status !== 'ACTIVE' || timeLeft <= 0) return;
    soundFx.playClick();
    vibrateTap();
    const updated = { ...tfChoices, [subKey]: value };
    setTfChoices(updated);
  };

  const handleSubmitTf = async () => {
    if (!user) {
      onOpenRegister();
      return;
    }
    if (gameState.status !== 'ACTIVE' || timeLeft <= 0) return;
    soundFx.playClick();
    vibrateSubmit();

    const sortedKeys = Object.keys(tfChoices).sort();
    const formatted = sortedKeys.map(k => `${k}:${tfChoices[k]}`).join(',');
    setSelectedChoice(formatted);
    setHasVotedThisQuestion(true);

    const now = Date.now();
    const latency = gameState.server_start_time
      ? Math.max(0.1, (now - gameState.server_start_time) / 1000)
      : 1.0;

    const payload: UserResponse = {
      choice: formatted,
      timestamp: now,
      latency_sec: Number(latency.toFixed(2)),
      isDoubleDown: isVeDichRound ? isDoubleDownActive : undefined,
      tabSwitchCount: tabSwitchCountRef.current > 0 ? tabSwitchCountRef.current : undefined,
      user_info: {
        name: user.name,
        mssv: user.mssv,
        uid: user.uid,
        anonymizedUid: user.anonymizedUid || user.uid
      }
    };

    if (!navigator.onLine) {
      queueOfflineResponse(payload);
    }

    try {
      await syncService.submitResponse(gameState.question_id, user.uid, payload);
    } catch (err) {
      console.warn('TF submit failed, queued offline:', err);
      queueOfflineResponse(payload);
    }
  };

  const audienceMediaRef = useRef<HTMLVideoElement | HTMLAudioElement | null>(null);

  useEffect(() => {
    if (gameState.status === 'ACTIVE' && gameState.media_autoplay && audienceMediaRef.current) {
      audienceMediaRef.current.play().catch(err => {
        console.warn('Autoplay prevented by browser:', err);
      });
    }
  }, [gameState.status, gameState.question_id, gameState.media_autoplay, gameState.server_start_time]);

  // Derive user's response for Risk Box from allResponses or local state
  const userRiskResponse = user?.uid ? allResponses?.['VCNV_RISK']?.[user.uid] : undefined;

  useEffect(() => {
    if (userRiskResponse?.choice && !isEditingRisk) {
      setRiskAnswerText(userRiskResponse.choice);
      setHasSubmittedRisk(true);
    }
  }, [userRiskResponse, isEditingRisk]);

  const handleRiskAnswerSubmit = async () => {
    setIsPendingSync(true);
    if (!user) {
      onOpenRegister();
      return;
    }
    if (!riskAnswerText.trim() && !riskCnvText.trim()) return;

    soundFx.playClick();
    vibrateSubmit();
    setHasSubmittedRisk(true);
    setIsEditingRisk(false);
    const latency = Number(((syncService.getSynchronizedNow() - (gameState.vcnv_risk_start_time || syncService.getSynchronizedNow())) / 1000).toFixed(2));

    // 1. Submit prediction for Risk Box (VCNV_RISK)
    if (riskAnswerText.trim()) {
      await syncService.submitResponse('VCNV_RISK', user.uid, {
        choice: riskAnswerText.trim().toUpperCase(),
        timestamp: syncService.getSynchronizedNow(),
        latency_sec: latency,
        user_info: { name: user.name, mssv: user.mssv, uid: user.uid, anonymizedUid: user.anonymizedUid || user.uid }
      });
    }

    // 2. Submit prediction for CNV Keyword (VCNV_01)
    if (riskCnvText.trim()) {
      await syncService.submitResponse(gameState.question_id || 'VCNV_01', user.uid, {
        choice: riskCnvText.trim().toUpperCase(),
        timestamp: syncService.getSynchronizedNow(),
        latency_sec: latency,
        user_info: { name: user.name, mssv: user.mssv, uid: user.uid, anonymizedUid: user.anonymizedUid || user.uid }
      });
    }
    setIsPendingSync(false);
  };

  // Compute live user stats and score breakdown across all rounds
  const userPerformance = useMemo(() => {
    if (!user?.uid || !allResponses) return null;
    const board = calculateLeaderboard(allResponses, undefined, gameState);
    const myData = board.find(u => u.uid === user.uid || (user.mssv && u.mssv === user.mssv));
    const audienceScoreState = computeAudienceScoreFromResponses(allResponses, user.uid, user.mssv, undefined, gameState);

    return {
      totalScore: getAudienceTotalScore(audienceScoreState),
      scoreBreakdown: getAudienceScoreBreakdown(audienceScoreState),
      audienceScoreState,
      rank: myData?.rank || '-',
      accuracyRate: myData?.accuracyRate || 0,
      correctCount: audienceScoreState.correctAnswersCount,
      totalAnswered: audienceScoreState.totalAnswered,
      avgLatency: myData?.avgLatency || 0,
      totalPlayers: board.length
    };
  }, [allResponses, user?.uid, user?.mssv, gameState]);

  // Round 4 (Về đích) detection for Double Down / All-In Risk
  const isVeDichRound = useMemo(() => {
    const roundKey = normalizeRoundKey(gameState.round_name || gameState.question_id || '');
    return roundKey === 'round4';
  }, [gameState.round_name, gameState.question_id]);

  // Battle Royale survival statistics (undefeated players with 100% accuracy)
  const survivalStats = useMemo(() => {
    return calculateSurvivalStats(allResponses, undefined, gameState, user?.uid, user?.mssv);
  }, [allResponses, gameState, user?.uid, user?.mssv]);

  // Streak calculations (strictly NO point multiplier, purely gamification & combo sound)
  const streakStats = useMemo(() => {
    const history = userPerformance?.audienceScoreState?.history || [];
    let currentStreak = 0;
    let maxStreak = 0;
    let temp = 0;
    for (const item of history) {
      if (item.is_correct) {
        temp++;
        if (temp > maxStreak) maxStreak = temp;
      } else {
        temp = 0;
      }
    }
    for (let i = history.length - 1; i >= 0; i--) {
      if (history[i].is_correct) {
        currentStreak++;
      } else {
        break;
      }
    }
    return { currentStreak, maxStreak };
  }, [userPerformance?.audienceScoreState?.history]);

  // Offline queue storage key
  const OFFLINE_QUEUE_KEY = 'bti_offline_queue';

  const queueOfflineResponse = (payload: UserResponse) => {
    try {
      const raw = localStorage.getItem(OFFLINE_QUEUE_KEY);
      const queue: any[] = raw ? JSON.parse(raw) : [];
      // Remove any prior pending entry for the same question and user so newest choice takes precedence
      const filteredQueue = queue.filter(item => !(item.questionId === gameState.question_id && item.uid === user?.uid));
      filteredQueue.push({
        id: `${gameState.question_id}_${user?.uid}_${Date.now()}`,
        questionId: gameState.question_id,
        uid: user?.uid,
        payload: { ...payload, isOfflineSync: true },
        savedAt: Date.now()
      });
      localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(filteredQueue));
      setOfflineNotice('📶 Mạng gián đoạn! Đáp án đã được lưu ngoại tuyến, sẽ tự động đồng bộ khi có kết nối.');
    } catch (err) {
      console.warn('Queue offline response error:', err);
    }
  };

  // Auto-sync queued offline answers when browser regains network
  useEffect(() => {
    const syncOfflineQueue = async () => {
      try {
        const raw = localStorage.getItem(OFFLINE_QUEUE_KEY);
        if (!raw) return;
        const queue: any[] = JSON.parse(raw);
        if (queue.length === 0) return;
        let syncedCount = 0;
        for (const item of queue) {
          await syncService.submitResponse(item.questionId, item.uid, item.payload);
          syncedCount++;
        }
        localStorage.removeItem(OFFLINE_QUEUE_KEY);
        if (syncedCount > 0) {
          setOfflineNotice(`✅ Đã tự động đồng bộ ${syncedCount} câu trả lời ngoại tuyến!`);
          soundFx.playTing();
          setTimeout(() => setOfflineNotice(null), 4000);
        }
      } catch (err) {
        console.warn('Sync offline queue error:', err);
      }
    };

    window.addEventListener('online', syncOfflineQueue);
    if (navigator.onLine) {
      syncOfflineQueue();
    }
    return () => window.removeEventListener('online', syncOfflineQueue);
  }, []);

  // Tab-switch / focus departure detection during active question
  useEffect(() => {
    if (gameState.status !== 'ACTIVE' || hasVotedThisQuestion) return;

    const handleVisibilityOrBlur = () => {
      if (document.hidden && gameState.status === 'ACTIVE' && !hasVotedThisQuestion) {
        tabSwitchCountRef.current += 1;
        setTabSwitchCount(tabSwitchCountRef.current);
        setShowTabSwitchWarning(true);
        soundFx.playAlarm();
        vibrateWarning();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityOrBlur);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityOrBlur);
    };
  }, [gameState.status, hasVotedThisQuestion]);

  useEffect(() => {
    if (!showTabSwitchWarning) return;
    const timer = setTimeout(() => {
      setShowTabSwitchWarning(false);
    }, 4500);
    return () => clearTimeout(timer);
  }, [showTabSwitchWarning]);

  // AI Voice TTS toggle
  const handleToggleSpeakQuestion = () => {
    if (isSpeakingQuestion) {
      aiExplanationService.stopSpeech();
      setIsSpeakingQuestion(false);
    } else {
      setIsSpeakingQuestion(true);
      aiExplanationService.speakQuestionText(
        activeQuestionText,
        localLanguage,
        () => setIsSpeakingQuestion(false),
        () => setIsSpeakingQuestion(false),
        {
          options: activeOptions || gameState.options,
          roundType: gameState.round_type,
          eliminatedOptions: gameState.eliminated_options,
          correctKey: gameState.correct_key,
          explanation: activeExplanation,
          isReveal: gameState.status === 'REVEAL'
        }
      );
    }
  };

  // Automatically trigger reading of correct answer after timer expires or when revealed by Admin
  const triggerAutoSpeakCorrectAnswer = useCallback(() => {
    if (!autoSpeakAnswer) return;
    const qId = gameState.question_id;
    if (!qId || !gameState.correct_key) return;
    if (lastSpokenCorrectAnswerQIdRef.current === qId) return;

    lastSpokenCorrectAnswerQIdRef.current = qId;
    setIsSpeakingQuestion(true);

    // Allow reveal chime / fanfare sound effects to lead before AI voice begins
    setTimeout(() => {
      aiExplanationService.speakCorrectAnswer(
        {
          options: activeOptions || gameState.options,
          roundType: gameState.round_type,
          correctKey: gameState.correct_key,
          explanation: activeExplanation || gameState.explanation
        },
        localLanguage,
        () => setIsSpeakingQuestion(false),
        () => setIsSpeakingQuestion(false)
      );
    }, 450);
  }, [autoSpeakAnswer, gameState.question_id, gameState.correct_key, gameState.options, gameState.round_type, gameState.explanation, activeOptions, activeExplanation, localLanguage]);

  // Automatic Answer TTS Effect: Triggers after timer expiration or when Admin reveals answer
  useEffect(() => {
    if (gameState.status === 'ACTIVE') {
      lastSpokenCorrectAnswerQIdRef.current = null;
      return;
    }

    const isTimerExpired = timeLeft <= 0 && (gameState.status === 'ACTIVE' || gameState.status === 'LOCKED');
    const isRevealed = gameState.status === 'REVEAL';

    if ((isRevealed || isTimerExpired) && gameState.correct_key) {
      triggerAutoSpeakCorrectAnswer();
    }
  }, [gameState.status, gameState.correct_key, timeLeft, gameState.question_id, triggerAutoSpeakCorrectAnswer]);

  // AI Instant Explanation trigger
  const handleRequestAiExplanation = async () => {
    if (isAiExplaining) return;
    setIsAiExplaining(true);
    try {
      const text = await aiExplanationService.getInstantExplanation({
        id: gameState.question_id,
        question_text: gameState.question_text,
        options: gameState.options,
        correct_key: gameState.correct_key,
        explanation: gameState.explanation
      }, localLanguage);
      setAiExplanation(text);
      soundFx.playTing();
      vibrateTap();
    } catch (err: any) {
      setAiExplanation(err?.message || 'Không thể tạo giải thích AI lúc này.');
      soundFx.playAlarm();
    } finally {
      setIsAiExplaining(false);
    }
  };

  // Derive user's current response for this question
  const userResponse = user ? responses[user.uid] : undefined;

  const prevQuestionIdRef = useRef<string>(gameState.question_id);
  const prevEliminatedCountRef = useRef<number>(gameState.eliminated_options?.length || 0);
  const lastTickTimeRef = useRef<number>(0);

  // Initialize or restore user choice for current question
  useEffect(() => {
    if (user?.uid && responses[user.uid]) {
      setSelectedChoice(responses[user.uid].choice);
      setShortAnswerText(responses[user.uid].choice);
      setHasVotedThisQuestion(true);
      if (responses[user.uid].isDoubleDown) {
        setIsDoubleDownActive(true);
      }
    } else if (prevQuestionIdRef.current !== gameState.question_id) {
      // Distinct long-pulse haptic feedback upon receiving a new question
      vibrateNewQuestion();
      setSelectedChoice('');
      setShortAnswerText('');
      setVcnvPrediction('');
      setIsEditingVcnv(false);
      setHasVotedThisQuestion(false);
      setTfChoices({});
      setIsDoubleDownActive(false);
      aiExplanationService.stopSpeech();
      setIsSpeakingQuestion(false);
      setAiExplanation('');
      setTabSwitchCount(0);
      tabSwitchCountRef.current = 0;
      setShowTabSwitchWarning(false);
      prevQuestionIdRef.current = gameState.question_id;
    }
  }, [gameState.question_id, responses, user?.uid]);

  // Clean up speech synthesis on component unmount
  useEffect(() => {
    return () => {
      aiExplanationService.stopSpeech();
    };
  }, []);

  // Tactile feedback on 50:50 option elimination
  useEffect(() => {
    const currCount = gameState.eliminated_options?.length || 0;
    if (currCount > prevEliminatedCountRef.current) {
      vibrateLifeline();
    }
    prevEliminatedCountRef.current = currCount;
  }, [gameState.eliminated_options]);

  // Synchronized countdown timer when state is ACTIVE
  useEffect(() => {
    if (gameState.status !== 'ACTIVE') {
      setTimeLeft(gameState.time_limit);
      return;
    }

    const computeTime = () => {
      if (gameState.is_timer_paused) {
        return typeof gameState.paused_remaining_seconds === 'number'
          ? Math.max(0, gameState.paused_remaining_seconds)
          : gameState.time_limit;
      }
      if (!gameState.server_start_time) {
        return gameState.time_limit;
      }
      const now = syncService.getSynchronizedNow();
      const elapsedSec = Math.floor((now - gameState.server_start_time) / 1000);
      const remaining = Math.max(0, gameState.time_limit - elapsedSec);
      return remaining;
    };

    setTimeLeft(computeTime());

    if (gameState.is_timer_paused) {
      return;
    }

    const interval = setInterval(() => {
      const remaining = computeTime();
      setTimeLeft(remaining);

      // Play tick sounds & tactile countdown tick
      if (remaining > 0 && remaining <= 5 && Date.now() - lastTickTimeRef.current >= 950) {
        lastTickTimeRef.current = Date.now();
        soundFx.playTick(true);
        if (remaining <= 3) {
          vibrateCountdownCritical();
        }
      } else if (remaining > 5 && Date.now() - lastTickTimeRef.current >= 950) {
        lastTickTimeRef.current = Date.now();
        soundFx.playTick(false);
      }

      if (remaining === 0 && prevStatusRef.current === 'ACTIVE') {
        soundFx.playLock();
        vibrateRoundEnd();
      }
    }, 250);

    return () => clearInterval(interval);
  }, [gameState.status, gameState.server_start_time, gameState.time_limit, gameState.is_timer_paused, gameState.paused_remaining_seconds]);

  // Handle status transition audio, haptics & confetti
  useEffect(() => {
    if (prevStatusRef.current !== gameState.status) {
      if (gameState.status === 'ACTIVE') {
        soundFx.playStartRound();
        vibrateNewQuestion();
      } else if (gameState.status === 'LOCKED') {
        soundFx.playLock();
        // Short-staccato pulse pattern when a round ends / locks
        vibrateRoundEnd();
      } else if (gameState.status === 'REVEAL') {
        const hasAnswered = Boolean(user?.uid && responses[user.uid]?.choice);
        const isUserCorrect = user?.uid && (responses[user.uid]?.choice || '').trim().toUpperCase() === (gameState.correct_key || '').trim().toUpperCase();
        soundFx.playReveal(Boolean(isUserCorrect));
        if (isUserCorrect) {
          vibrateCorrect();
          // Combo FX audio when on a winning streak (strictly NO point multiplier)
          if (streakStats.currentStreak >= 2) {
            soundFx.playStreakCombo(streakStats.currentStreak);
          }
          try {
            confetti({
              particleCount: 80,
              spread: 70,
              origin: { y: 0.6 }
            });
          } catch {}
        } else if (hasAnswered) {
          vibrateWrong();
        }
      }
      prevStatusRef.current = gameState.status;
    }
  }, [gameState.status, gameState.correct_key, user?.uid, responses]);

  // Handle Option Tap
  const handleOptionSelect = async (optionKey: string) => {
    if (!user) {
      onOpenRegister();
      return;
    }

    if (gameState.status !== 'ACTIVE' || timeLeft <= 0) return;

    // Check if option was eliminated in Round 3
    if (gameState.eliminated_options?.includes(optionKey)) return;

    // Tactile vibration feedback confirmation
    vibrateSubmit();

    soundFx.playClick();
    setSelectedChoice(optionKey);
    setHasVotedThisQuestion(true);
    setSubmitToast(true);
    setTimeout(() => setSubmitToast(false), 2500);

    const now = Date.now();
    const latency = gameState.server_start_time
      ? Math.max(0.1, (now - gameState.server_start_time) / 1000)
      : 1.0;

    const responsePayload: UserResponse = {
      choice: optionKey,
      timestamp: now,
      latency_sec: Number(latency.toFixed(2)),
      isDoubleDown: isVeDichRound ? isDoubleDownActive : undefined,
      tabSwitchCount: tabSwitchCountRef.current > 0 ? tabSwitchCountRef.current : undefined,
      user_info: {
        name: user.name,
        mssv: user.mssv,
        uid: user.uid,
        anonymizedUid: user.anonymizedUid || user.uid
      }
    };

    if (!navigator.onLine) {
      queueOfflineResponse(responsePayload);
    }

    setIsPendingSync(true);
    try {
      await syncService.submitResponse(gameState.question_id, user.uid, responsePayload);
    } catch (err) {
      console.warn('Submit response failed, saving to offline queue:', err);
      queueOfflineResponse(responsePayload);
    } finally {
      setIsPendingSync(false);
    }
  };

  // Handle Short text submit

  const handleVcnvSubmit = async () => {
    setIsPendingSync(true);
    if (!vcnvPrediction.trim() || gameState.vcnv_summary_active) return;
    if (!user) {
      onOpenRegister();
      return;
    }
    soundFx.playClick();
    vibrateSubmit();
    
    const now = Date.now();
    const latency = gameState.server_start_time
      ? Math.max(0.1, (now - gameState.server_start_time) / 1000)
      : 1.0;

    await syncService.submitResponse(gameState.question_id || 'VCNV_01', user.uid, {
      choice: vcnvPrediction.trim().toUpperCase(),
      timestamp: now,
      latency_sec: Number(latency.toFixed(2)),
      user_info: { name: user.name, mssv: user.mssv, uid: user.uid, anonymizedUid: user.anonymizedUid || user.uid }
    });
    setIsEditingVcnv(false);
    setIsPendingSync(false);
  };

  const handleShortAnswerSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!user) {
      onOpenRegister();
      return;
    }
    if (!shortAnswerText.trim() || gameState.status !== 'ACTIVE' || timeLeft <= 0) return;
    
    // Yêu cầu xác nhận thay vì gửi ngay
    setIsConfirmingShortAnswer(true);
  };

  const confirmShortAnswerSubmit = () => {
    setIsConfirmingShortAnswer(false);
    handleOptionSelect(shortAnswerText.trim().toUpperCase());
  };

  const cancelShortAnswerSubmit = () => {
    setIsConfirmingShortAnswer(false);
  };

  // Calculate vote statistics for Reveal state
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

  const shortStats = useMemo(() => {
    const isShort = gameState.round_type === 'SHORT_ANSWER' || gameState.round_type === 'FILL_IN_BLANK' || gameState.round_type === 'SEQUENCING';
    const isVcnv = gameState.round_type === 'VCNV' || gameState.question_id?.startsWith('VCNV');
    if (!isShort && !isVcnv) return null;
    const groups: Record<string, { count: number; raw: string }> = {};
    let totalValid = 0;
    (Object.values(responses || {}) as UserResponse[]).forEach(r => {
      if (!r.choice) return;
      const val = r.choice.trim().toUpperCase();
      if (!val) return;
      if (!groups[val]) groups[val] = { count: 0, raw: val };
      groups[val].count += 1;
      totalValid += 1;
    });

    const list = Object.values(groups).sort((a, b) => b.count - a.count).slice(0, 10);
    return { list, total: totalValid };
  }, [gameState.round_type, responses]);

  const voteStats = useMemo(() => {
    const totalVotes = Object.keys(responses).length;
    const counts: Record<string, number> = {};

    (Object.values(responses) as UserResponse[]).forEach(r => {
      const c = (r.choice || '').toUpperCase();
      counts[c] = (counts[c] || 0) + 1;
    });

    return { totalVotes, counts };
  }, [responses]);

  const pollStats = useMemo(() => {
    if (!allResponses || !gameState.question_id) return { total: 0, percentages: {} };
    const responsesForQ = allResponses[gameState.question_id] || {};
    const total = Object.keys(responsesForQ).length;
    const counts: Record<string, number> = {};
    Object.values(responsesForQ).forEach((r: any) => {
      const val = (r.choice || '').trim().toUpperCase();
      if (val) counts[val] = (counts[val] || 0) + 1;
    });
    const percentages: Record<string, number> = {};
    Object.keys(gameState.options || {}).forEach(k => {
      percentages[k] = total > 0 ? Math.round(((counts[k.toUpperCase()] || 0) / total) * 100) : 0;
    });
    return { total, percentages };
  }, [allResponses, gameState.question_id, gameState.options]);



  // Keyboard shortcut support for rapid voting and global PC desktop hotkeys
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      const rawKey = e.key;
      const keyUpper = rawKey.toUpperCase();

      // Track key press for visual keyboard animation in desktop sidebar
      setLastKeyPressed(keyUpper);
      const timer = setTimeout(() => {
        setLastKeyPressed('');
      }, 350);

      // Global PC hotkeys:
      if (keyUpper === 'F') {
        e.preventDefault();
        soundFx.playClick();
        vibrateTap();
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch(() => {});
        } else {
          document.exitFullscreen?.().catch(() => {});
        }
        return () => clearTimeout(timer);
          }

      if (keyUpper === 'M') {
        e.preventDefault();
        const nextState = !soundFx.isEnabled();
        soundFx.setEnabled(nextState);
        if (nextState) soundFx.playClick();
        return () => clearTimeout(timer);
          }

      if (keyUpper === 'T' && onToggleHighContrast) {
        e.preventDefault();
        soundFx.playClick();
        vibrateTap();
        onToggleHighContrast();
        return () => clearTimeout(timer);
          }

      if (keyUpper === 'Q' && onOpenQAModal) {
        e.preventDefault();
        soundFx.playClick();
        vibrateTap();
        onOpenQAModal();
        return () => clearTimeout(timer);
          }

      if (keyUpper === 'L') {
        e.preventDefault();
        soundFx.playClick();
        vibrateTap();
        if (onOpenLogModal) onOpenLogModal();
        else setIsLogModalOpen(true);
        return () => clearTimeout(timer);
          }

      if (keyUpper === 'S') {
        e.preventDefault();
        soundFx.playClick();
        setIsShareModalOpen(true);
        return () => clearTimeout(timer);
          }

      if (keyUpper === 'P' && onOpenProfile) {
        e.preventDefault();
        soundFx.playClick();
        onOpenProfile();
        return () => clearTimeout(timer);
          }

      // Voting / Answer Selection when ACTIVE
      if (gameState.status === 'ACTIVE' && timeLeft > 0) {
        // Enter key submission for True/False 4 or Sequencing
        if (rawKey === 'Enter') {
          if (gameState.round_type === 'TRUE_FALSE_4') {
            e.preventDefault();
            handleSubmitTf();
            return () => clearTimeout(timer);
          }
          if (gameState.round_type === 'SEQUENCING') {
            e.preventDefault();
            handleSequencingSubmit();
            return () => clearTimeout(timer);
          }
          if (gameState.round_type === 'SHORT_ANSWER') {
            e.preventDefault();
            handleShortAnswerSubmit();
            return () => clearTimeout(timer);
          }
        }

        if (gameState.options) {
          const optionKeys = Object.keys(gameState.options);
          if (optionKeys.length > 0) {
            // 1. Dynamic Number Keys '1'..'9': map to option at visual slot index (0-based)
            if (/^[1-9]$/.test(rawKey)) {
              const slotIdx = parseInt(rawKey, 10) - 1;
              if (slotIdx >= 0 && slotIdx < optionKeys.length) {
                e.preventDefault();
                handleOptionSelect(optionKeys[slotIdx]);
                return () => clearTimeout(timer);
          }
            }

            // 2. Direct Letter Keys (e.g. 'A', 'B', 'C', 'D'): select option key if present
            if (gameState.options[keyUpper]) {
              e.preventDefault();
              handleOptionSelect(keyUpper);
              return () => clearTimeout(timer);
          }
          }
        }
      }

      return () => clearTimeout(timer);
          }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState.status, timeLeft, gameState.options, gameState.round_type, user, onToggleHighContrast, onOpenQAModal, onOpenLogModal, onOpenProfile]);

  
  const renderContent = () => {

  if (gameState.panic_mode) {
    return (
      <div className="flex-1 w-full h-full flex items-center justify-center relative z-[999] bg-red-950/90 backdrop-blur-md p-6">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="w-24 h-24 mx-auto rounded-full bg-red-600/20 flex items-center justify-center animate-pulse">
            <AlertOctagon className="w-12 h-12 text-red-500" />
          </div>
          <h2 className="text-3xl font-black text-red-400 tracking-widest uppercase">{t("view_panic_title", localLanguage)}</h2>
          <p className="text-red-300/80 text-sm leading-relaxed">
            {t("view_panic_desc1", localLanguage)}
            <br/><br/>
            {t("view_panic_desc2", localLanguage)}
          </p>
        </div>
      </div>
    );
  }
  if (gameState.active_module === 'LUCKY_DRAW' || (gameState.lucky_draw && gameState.lucky_draw.status !== 'IDLE')) {
    return <LuckyDrawAudience gameState={gameState} currentUserInfo={user} />;
  }

  if (gameState.show_summary) {
    return (
      <div className="flex-1 w-full h-full relative z-50">
        <Leaderboard
          allResponses={allResponses || {}}
          gameState={gameState}
          activeCount={1} 
        />
      </div>
    );
  }

  // If user is not yet registered, show prompt
  if (!user) {
    return (
      <div
        id="audience-unregistered-banner"
        className="min-h-[calc(100dvh-4rem)] flex items-center justify-center p-4"
      >
        <div className="max-w-md w-full fluent-box rounded-[2px] p-6 sm:p-8 text-center text-white shadow-2xl relative overflow-hidden">
          <div className="w-16 h-16 rounded-[2px] bg-gradient-to-tr from-[#F7CAC9] to-[#F7CAC9] flex items-center justify-center mx-auto mb-4 shadow-lg shadow-[#F7CAC9]/30">
            <Radio className="w-8 h-8 text-white animate-pulse" />
          </div>
          <h2 className="text-2xl font-black mb-2 tracking-tight">Beyond The Internet 2026</h2>
          <p className="text-[#B6A6D8] text-sm mb-6 leading-relaxed">
            {gameState.lobby_locked
              ? t("view_wait_mc", localLanguage)
              : t("view_welcome_reg", localLanguage)}
          </p>

          <div className="space-y-3">
            {gameState.lobby_locked ? (
              <div 
                id="audience-lobby-locked-notice"
                className="w-full bg-rose-950/80 border border-rose-500/50 text-rose-200 font-bold py-3.5 px-6 rounded-[2px] shadow-lg flex items-center justify-center gap-2 text-sm"
              >
                <Lock className="w-4 h-4 text-rose-400 animate-pulse" />
                <span>{t("view_closed_gate", localLanguage)}</span>
              </div>
            ) : (
              <button
                id="btn-audience-start-onboarding"
                onClick={onOpenRegister}
                className="w-full bg-gradient-to-r from-[#F7CAC9] to-[#F7CAC9] hover:from-[#F7CAC9] text-[#0D0420] font-bold py-3.5 px-6 rounded-[2px] shadow-lg shadow-[#F7CAC9]/25 flex items-center justify-center gap-2 text-sm transition hover-effect cursor-pointer"
              >
                {t("view_reg_now", localLanguage)} <ChevronRight className="w-4 h-4" />
              </button>
            )}

            <button
              id="btn-audience-share-unregistered"
              type="button"
              onClick={() => {
                soundFx.playClick();
                setIsShareModalOpen(true);
              }}
              className="w-full py-3 px-4 rounded-[2px] fluent-box hover-effect text-[#FCEEEC] border border-[#F7CAC9]/30 font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <QrCode className="w-4 h-4 text-[#F7CAC9]" />
              <span>{t("view_share_qr", localLanguage)}</span>
            </button>
          </div>
        </div>

        {/* Floating Quick Share Button */}

        
      {/* Auto-Zoom Long Text Question Modal */}
      {isQuestionZoomed && isLongQuestion && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-lg animate-in fade-in duration-200" onClick={() => setIsQuestionZoomed(false)}>
          <div className="w-full max-w-2xl bg-[#0f172a] border border-[#F7CAC9]/30 rounded-[4px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/5">
              <h3 className="text-[#F7CAC9] font-mono font-bold text-sm tracking-widest uppercase flex items-center gap-2">
                <ZoomIn className="w-4 h-4" />
                {t("view_easier_read", localLanguage)}
              </h3>
              <button
                onClick={() => setIsQuestionZoomed(false)}
                className="w-8 h-8 rounded-[2px] bg-white/10 hover:bg-white/20 flex items-center justify-center transition"
              >
                <X className="w-4 h-4 text-white" />
              </button>
            </div>
            <div className="p-6 md:p-8 overflow-y-auto">
              <h2 className={`text-xl sm:text-2xl md:text-3xl font-bold text-white ${isCjkQuestion ? 'cjk-text tracking-wide leading-loose' : 'leading-relaxed tracking-tight'} ${isKoreanQuestion ? 'korean-question-font' : ''}`} data-question-text="true">
                {activeQuestionText}
              </h2>
            </div>
            <div className="p-4 border-t border-white/10 bg-white/5 text-center">
              <button
                onClick={() => setIsQuestionZoomed(false)}
                className="px-6 py-2.5 rounded-[2px] bg-white/10 hover:bg-white/20 text-white font-medium text-sm transition"
              >
                {t("view_close", localLanguage)}
              </button>
            </div>
          </div>
        </div>
      )}

        <ShareGameModal
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
          gameTitle="Beyond The Internet 2026"
          roundName={gameState.round_name || gameState.category}
        />
      </div>
    );
  }



  // ==========================================
  // STATE: EMERGENCY AD-HOC POLL OVERRIDE
  // Real-time Yes/No & Sentiment poll injected by host
  // ==========================================
  if (gameState.emergency_poll && gameState.emergency_poll.status !== 'DISMISSED') {
    return (
      <div className="min-h-[calc(100dvh-4rem)] p-3 sm:p-4 md:p-6 flex flex-col items-center justify-center">
        <EmergencyPollAudience
          gameState={gameState}
          user={user}
          allResponses={allResponses}
          onOpenRegister={onOpenRegister}
        />
      </div>
    );
  }

  // ==========================================
  // STATE: VCNV PREDICTION MODULE (ROUND 2)
  // Intercepts all other states for VCNV.
  // ==========================================
  const isVcnvRound =
    gameState.round_type === 'VCNV' ||
    Boolean(gameState.round_name?.includes('Vượt Chướng Ngại Vật')) ||
    Boolean(gameState.question_id?.startsWith('VCNV'));

  if (isVcnvRound) {
    const isVcnvLocked = gameState.vcnv_status === 'LOCKED';
    const isVcnvRevealed = gameState.vcnv_status === 'REVEALED' || Boolean(gameState.vcnv_summary_active);
    const isRiskUser = Boolean(user?.uid && gameState.vcnv_risk_claimed_by?.uid === user.uid);

    const isRiskActive = gameState.vcnv_risk_status === 'ACTIVE_ANSWER' || gameState.vcnv_risk_status === 'COUNTDOWN_10S';
    const isBranch2 = gameState.vcnv_risk_branch === 'BRANCH_2' || gameState.vcnv_risk_status === 'FROZEN';
    const isBranch1 = gameState.vcnv_risk_branch === 'BRANCH_1';
    const isRiskRevealed = gameState.vcnv_risk_status === 'REVEALED';

    const isVcnvOpened = isRiskActive || isBranch1 || isBranch2 || isRiskRevealed || isVcnvRevealed || gameState.vcnv_status === 'OPEN' || gameState.vcnv_status === 'LOCKED';

    // 1. Standby Landing Page (When Ô Mạo Hiểm has NOT been opened yet)
    if (!isVcnvOpened) {
      return (
        <div
          id="audience-state-vcnv-standby"
          className="min-h-[calc(100dvh-4rem)] flex flex-col items-center justify-center p-4 sm:p-6 text-white text-center"
        >
          <div className="max-w-lg w-full fluent-box rounded-[2px] p-8 shadow-2xl relative overflow-hidden">
            {/* Glowing pulse radar rings */}
            <div className="relative w-36 h-36 mx-auto mb-6 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-2 border-[#F7CAC9]/20 animate-ping" />
              <div className="absolute inset-3 rounded-full border border-[#F7CAC9]/40 animate-pulse" />
              <div className="w-20 h-20 rounded-[2px] bg-gradient-horizon flex items-center justify-center shadow-xl shadow-[#F7CAC9]/30">
                <Radio className="w-10 h-10 text-white animate-pulse" />
              </div>
            </div>

            <div className="inline-block px-3.5 py-1 rounded-[2px] text-xs font-bold uppercase tracking-widest bg-[#F7CAC9]/10 text-[#F7CAC9] border border-[#F7CAC9]/30 mb-3">
              {t("standby_ready", localLanguage)}
            </div>

            <h2 className="text-xl sm:text-2xl font-black text-slate-100 mb-3">
              {gameState.round_name || t("view_round2_fallback", localLanguage)}
            </h2>

            <p className="text-base sm:text-lg text-[#FCEEEC] font-medium italic mb-6 leading-relaxed">
              &ldquo;{t("view_listen_mc", localLanguage)}&rdquo;
            </p>

            <div className="p-4 rounded-[2px] fluent-box-nested text-left text-xs space-y-2 text-[#B6A6D8]">
              <div className="flex items-center justify-between text-[#B6A6D8] border-b border-white/10 pb-2">
                <span>{t("standby_authenticated", localLanguage)}</span>
                <span className="font-bold text-white">{user.name}</span>
              </div>
              <div className="flex items-center justify-between text-[#B6A6D8] border-b border-white/10 pb-2">
                <span>{t("standby_uid", localLanguage)}</span>
                <span className="font-mono font-bold text-[#F7CAC9]">{getUserDisplayUid(user)}</span>
              </div>
              <div className="flex items-center justify-between text-[#B6A6D8]">
                <span>{t("standby_device_status", localLanguage)}</span>
                <span className="text-emerald-400 font-medium flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> {t("standby_ready_to_receive", localLanguage)}
                </span>
              </div>
              <div className="flex items-center justify-between text-[#B6A6D8] border-t border-white/10 pt-2">
                <span className="flex items-center gap-1.5">
                  <Sun className="w-3.5 h-3.5 text-amber-400" />
                  <span>{t("standby_wake_lock", localLanguage)}</span>
                </span>
                {isWakeLockSupported !== false && onToggleWakeLock ? (
                  <button
                    type="button"
                    onClick={() => {
                      soundFx.playClick();
                      vibrateTap();
                      onToggleWakeLock();
                    }}
                    className={`px-2 py-0.5 rounded-[2px] text-[11px] font-bold font-mono transition flex items-center gap-1.5 hover-effect cursor-pointer ${
                      isWakeLockLocked
                        ? 'fluent-box text-amber-300 border-amber-500/40'
                        : 'fluent-box-nested text-slate-400 hover:text-white'
                    }`}
                    title={isWakeLockLocked ? t("view_wakelock_on", localLanguage) : t("view_wakelock_off", localLanguage)}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${isWakeLockLocked ? 'bg-amber-400 animate-pulse' : 'bg-slate-500'}`} />
                    {isWakeLockLocked ? t("view_on", localLanguage) : t("view_off", localLanguage)}
                  </button>
                ) : (
                  <span className="text-slate-500 text-[10px]">{t("standby_auto_device", localLanguage)}</span>
                )}
              </div>
              <div className="border-t border-white/10 pt-2">
                <BatteryIndicator showDetails={true} className="!p-2.5 !rounded-[2px] fluent-box-nested" />
              </div>
            </div>

            <div className="mt-6 text-[11px] text-slate-500">
              {t("view_auto_switch", localLanguage)}
            </div>

            <button
              id="btn-audience-share-standby"
              type="button"
              onClick={() => {
                soundFx.playClick();
                setIsShareModalOpen(true);
              }}
              className="w-full mt-4 py-3 px-4 rounded-[2px] fluent-box hover-effect border border-[#F7CAC9]/40 text-[#FCEEEC] font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <QrCode className="w-4 h-4 text-[#F7CAC9]" />
              <span>{t("standby_invite", localLanguage)}</span>
            </button>
          </div>

          {/* Floating Quick Share Button */}

          <ShareGameModal
            isOpen={isShareModalOpen}
            onClose={() => setIsShareModalOpen(false)}
            gameTitle="Beyond The Internet 2026"
            roundName={gameState.round_name || gameState.category}
          />
        </div>
      );
    }

    return (
      <div id="audience-state-vcnv" className="max-w-7xl 2xl:max-w-[100rem] w-full mx-auto p-4 sm:p-6 text-white pt-4 sm:pt-8 space-y-6">
        
        {/* 2-Column Responsive Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start animate-fadeIn">
          
          {/* LEFT COLUMN: 4 Horizontal Clues Stack ("Thiết kế dạng cột") */}
          <div className="lg:col-span-5 space-y-4">
            <div className="fluent-box rounded-[2px] p-5 shadow-xl space-y-4 text-left">
              <div className="pb-2 border-b border-white/10">
                <h4 className="text-xs uppercase text-[#F7CAC9] font-bold tracking-widest font-mono">
                  {t("view_row_map", localLanguage)}
                </h4>
              </div>

              {/* Stacked single column format */}
              <div className="flex flex-col gap-3">
                {[0, 1, 2, 3].map(idx => {
                  const isOpen = (gameState.vcnv_clues || [])[idx];
                  const text = (gameState.vcnv_clue_texts || [])[idx];
                  return (
                    <div
                      key={idx}
                      className={`p-4 rounded-[2px] border flex items-center justify-between gap-3 transition ${
                        isOpen
                          ? 'fluent-box border-[#F7CAC9] text-white shadow-inner animate-fadeIn'
                          : 'fluent-box-nested border-white/10 text-slate-400'
                      }`}
                    >
                      <div className="text-left">
                        <span className="text-[9px] font-mono uppercase tracking-wider block opacity-70 font-sans">
                          {t("view_row", localLanguage)}{idx + 1}
                        </span>
                        <span className="font-bold text-xs sm:text-sm uppercase font-sans">
                          {isOpen ? (text ? text : (t("view_revealed", localLanguage))) : t("view_unopened", localLanguage)}
                        </span>
                      </div>
                      <div className={`w-8 h-8 rounded-[2px] flex items-center justify-center font-bold text-xs shrink-0 ${
                        isOpen ? 'bg-[#F7CAC9]/20 text-[#F7CAC9]' : 'fluent-box-nested text-[#B6A6D8]/50 border border-white/10'
                      }`}>
                        {isOpen ? (localLanguage !== 'vi' ? 'OPEN' : 'MỞ') : '?'}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Center Box Status */}
              {gameState.vcnv_center_visible && (
                <div className={`p-4 rounded-[2px] border flex items-center justify-between gap-3 transition ${
                  gameState.vcnv_center_status
                    ? 'fluent-box border-amber-500 text-amber-200'
                    : 'fluent-box-nested border-white/10 text-slate-400'
                }`}>
                  <div className="text-left">
                    <span className="text-[9px] font-mono uppercase tracking-wider block opacity-70 font-sans">
                      {t("view_center", localLanguage)}
                    </span>
                    <span className="font-bold text-xs sm:text-sm uppercase font-sans">
                      {gameState.vcnv_center_status ? (gameState.vcnv_center_text || (t("view_revealed", localLanguage))) : t("view_unopened", localLanguage)}
                    </span>
                  </div>
                  <div className={`w-8 h-8 rounded-[2px] flex items-center justify-center font-bold text-xs shrink-0 ${
                    gameState.vcnv_center_status ? 'bg-amber-500/20 text-amber-300' : 'fluent-box-nested text-white/20'
                  }`}>
                    {gameState.vcnv_center_status ? (localLanguage !== 'vi' ? 'OPEN' : 'MỞ') : '?'}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN: Prediction Forms & Risk states */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* RISK BOX: ANSWER / PREDICTION STAGE (FOR CONTESTANT & AUDIENCE) */}
        {isRiskActive && (
          <div className="fluent-box border-2 border-amber-500/70 rounded-[2px] p-5 sm:p-6 shadow-2xl space-y-5 animate-fadeIn">
            {/* Header Banner */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-amber-500/30">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-[2px] fluent-box border border-amber-500/50 flex items-center justify-center text-amber-400 shadow-inner">
                  <Zap className="w-5 h-5 fill-current" />
                </div>
                <div>
                  <h3 className="text-xs uppercase text-amber-400 font-mono font-bold tracking-wider">
                    {isRiskUser ? (t("view_risk_answering", localLanguage)) : (t("view_risk_chosen", localLanguage))}
                  </h3>
                  <p className="text-sm font-bold text-white">
                    {gameState.vcnv_risk_claimed_by?.name || t("view_contestant", localLanguage)} {gameState.vcnv_risk_claimed_by?.mssv ? `(${gameState.vcnv_risk_claimed_by.mssv})` : ''}
                  </p>
                </div>
              </div>

              <span className="px-3 py-1 fluent-box text-amber-300 border border-amber-500/40 rounded-[2px] font-mono text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" /> {t("view_120_pts", localLanguage)}
              </span>
            </div>

            {/* Display Question / Clue prominently for ALL viewers */}
            <div className="p-4 fluent-box-nested border border-amber-500/40 rounded-[2px] space-y-1.5 text-left">
              <p className="text-[11px] text-amber-300 font-mono uppercase font-bold flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" /> {t("view_risk_clue", localLanguage)}
              </p>
              <p className="text-sm sm:text-base text-white font-semibold leading-relaxed">
                {gameState.vcnv_risk_question || t("view_risk_clue_wait", localLanguage)}
              </p>
            </div>

            {/* If current user is the contestant on stage */}
            {isRiskUser ? (
              <div className="space-y-4">
                {hasSubmittedRisk && !isEditingRisk ? (
                  <div className="p-5 fluent-box-nested border border-emerald-500/50 rounded-[2px] text-center space-y-3 animate-fadeIn">
                    <div className="w-10 h-10 rounded-[2px] bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 mx-auto">
                      {isPendingSync ? <RefreshCw className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                    </div>
                    <div>
                      <p className="text-xs text-emerald-300 font-mono uppercase font-bold">
                        {isPendingSync ? (t("view_submitting_ans", localLanguage)) : (t("view_submitted_risk", localLanguage))}
                      </p>
                      <div className="mt-2 space-y-1">
                        <p className="text-xs text-[#B6A6D8]">
                          {t("view_risk_ans", localLanguage)} <span className="font-mono font-bold text-white">{riskAnswerText || t("view_no_input", localLanguage)}</span>
                        </p>
                        <p className="text-xs text-amber-300">
                          {t("view_cnv_keyword", localLanguage)} <span className="font-mono font-bold text-white">{riskCnvText || t("view_no_input", localLanguage)}</span>
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsEditingRisk(true)}
                      className="px-4 py-1.5 fluent-box hover-effect text-white rounded-[2px] text-xs font-mono transition cursor-pointer"
                    >
                      {t("view_edit_ans", localLanguage)}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-mono text-slate-200 mb-1 font-bold text-left">
                        {t("view_risk_1", localLanguage)}
                      </label>
                      <input
                        type="text"
                        value={riskAnswerText}
                        onChange={(e) => setRiskAnswerText(e.target.value)}
                        placeholder={t("view_risk_ph", localLanguage)}
                        className="w-full fluent-box-nested border border-white/15 focus:border-amber-500 rounded-[2px] px-3.5 py-2.5 text-sm text-white font-mono uppercase outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-mono text-amber-300 mb-1 font-bold text-left">
                        {t("view_cnv_1", localLanguage)}
                      </label>
                      <input
                        type="text"
                        value={riskCnvText}
                        onChange={(e) => setRiskCnvText(e.target.value)}
                        placeholder={t("view_cnv_ph", localLanguage)}
                        className="w-full fluent-box-nested border border-amber-500/60 focus:border-amber-400 rounded-[2px] px-3.5 py-2.5 text-sm text-amber-200 font-mono uppercase outline-none"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleRiskAnswerSubmit}
                      disabled={!riskAnswerText.trim() && !riskCnvText.trim()}
                      className="w-full py-3.5 bg-gradient-to-r from-amber-400 to-amber-300 hover:from-amber-300 hover:to-yellow-300 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 font-black rounded-[2px] text-xs uppercase tracking-wider transition shadow-lg flex items-center justify-center gap-2 hover-effect cursor-pointer"
                    >
                      <Send className="w-4 h-4" /> {t("view_submit_risk", localLanguage)}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              /* AUDIENCE PARTICIPATION IN RISK PREDICTION */
              <div className="space-y-4">
                {hasSubmittedRisk && !isEditingRisk ? (
                  <div className="p-5 fluent-box-nested border border-amber-500/40 rounded-[2px] text-center space-y-3 animate-fadeIn">
                    <div className="w-10 h-10 rounded-[2px] bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 mx-auto">
                      {isPendingSync ? <RefreshCw className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                    </div>
                    <div>
                      <p className="text-xs uppercase text-amber-300 font-mono font-bold">
                        {isPendingSync ? (t("view_syncing_predict", localLanguage)) : (t("view_recorded_predict_risk", localLanguage))}
                      </p>
                      <div className="mt-2 inline-block px-4 py-2 fluent-box-nested border border-amber-500/40 rounded-[2px] font-mono font-bold text-amber-200 text-base uppercase">
                        {riskAnswerText || userRiskResponse?.choice}
                      </div>
                      <p className="text-[11px] text-[#B6A6D8] mt-2">
                        {t("view_wait_admin", localLanguage)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsEditingRisk(true)}
                      className="px-4 py-1.5 fluent-box hover-effect text-white rounded-[2px] text-xs font-mono transition cursor-pointer"
                    >
                      {t("view_edit_predict", localLanguage)}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-mono text-amber-300 mb-1.5 font-bold text-left">
                        {t("view_your_risk_predict", localLanguage)}
                      </label>
                      <input
                        type="text"
                        value={riskAnswerText}
                        onChange={(e) => setRiskAnswerText(e.target.value)}
                        placeholder={t("view_predict_risk_ph", localLanguage)}
                        className="w-full fluent-box-nested border border-amber-500/50 focus:border-amber-400 rounded-[2px] px-3.5 py-3 text-sm text-white font-mono uppercase outline-none placeholder:text-slate-500"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleRiskAnswerSubmit}
                      disabled={!riskAnswerText.trim()}
                      className="w-full py-3 bg-gradient-to-r from-amber-400 to-amber-300 hover:from-amber-300 hover:to-yellow-300 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 font-bold rounded-[2px] text-xs uppercase tracking-wider transition shadow-lg flex items-center justify-center gap-2 hover-effect cursor-pointer"
                    >
                      <Send className="w-4 h-4" /> {t("view_send_risk_predict", localLanguage)}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* RISK BOX: FROZEN STAGE (BRANCH 2) */}
        {gameState.vcnv_risk_status === 'FROZEN' && (
          <div className="fluent-box border-2 border-[#E39A96]/50 rounded-[2px] p-5 shadow-2xl space-y-3 animate-fadeIn">
            <div className="flex items-center justify-between pb-2 border-b border-[#E39A96]/30">
              <div className="flex items-center gap-2 text-[#FCEEEC] font-mono text-xs font-bold uppercase">
                <Lock className="w-4 h-4" /> {t("view_risk_frozen", localLanguage)}
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 fluent-box-nested text-blue-300 rounded-[2px] border border-[#E39A96]/30 font-bold">
                {localLanguage !== 'vi' ? 'BRANCH 2 • REVEAL AT END OF ROUND' : 'NHÁNH 2 • CHỜ CÔNG BỐ CUỐI VÒNG'}
              </span>
            </div>

            <p className="text-xs text-[#B6A6D8] leading-relaxed text-left">
              {t("view_frozen", localLanguage)}
            </p>

            {userRiskResponse?.choice && (
              <div className="p-3 fluent-box-nested border border-[#E39A96]/30 rounded-[2px] text-left">
                <p className="text-[11px] text-blue-300 font-mono">{t("view_risk_submitted", localLanguage)}</p>
                <p className="text-sm font-mono font-bold text-white uppercase mt-1">{userRiskResponse.choice}</p>
              </div>
            )}

            <div className="p-3 fluent-box-nested border border-amber-500/30 rounded-[2px] text-left text-xs text-amber-300/90 space-y-1">
              <p className="font-bold">{t("view_200pts", localLanguage)}</p>
              <p className="text-[11px]">
                {t("view_frozen_desc", localLanguage)}
              </p>
            </div>
          </div>
        )}

        {/* RISK BOX: REVEALED STAGE WITH AUDIENCE RESULTS */}
        {gameState.vcnv_risk_status === 'REVEALED' && (
          <div className="fluent-box border-2 border-emerald-500/50 rounded-[2px] p-5 sm:p-6 shadow-2xl space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between pb-3 border-b border-emerald-500/30">
              <div className="flex items-center gap-2 text-emerald-400 font-mono text-xs font-bold uppercase">
                <Sparkles className="w-4 h-4" /> {localLanguage !== 'vi' ? 'RISK BOX RESULT' : 'KẾT QUẢ Ô MẠO HIỂM'}
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 fluent-box-nested text-emerald-300 rounded-[2px] border border-emerald-500/30 font-bold">{t("view_announced", localLanguage)}</span>
            </div>

            <div className="space-y-2 text-left">
              <p className="text-xs text-[#B6A6D8] leading-relaxed">
                <strong> {t("view_hint", localLanguage)}</strong> {gameState.vcnv_risk_question || t("view_no_hint", localLanguage)}
              </p>
              <div className="p-3 fluent-box-nested border border-emerald-500/30 rounded-[2px]">
                <p className="text-xs text-[#B6A6D8] mb-0.5">{t("view_official_risk", localLanguage)}</p>
                <p className="text-base font-mono font-black text-emerald-400 uppercase tracking-wide">
                  {gameState.vcnv_risk_answer || 'DEEPFAKE'}
                </p>
              </div>
            </div>

            {/* Audience Result Comparison */}
            {(() => {
              const myPrediction = userRiskResponse?.choice || riskAnswerText;
              if (!myPrediction) {
                return (
                  <p className="text-xs text-[#B6A6D8] italic text-center">
                    {t("view_no_risk_predict", localLanguage)}
                  </p>
                );
              }
              const isCorrect = normalizeVcnvAnswer(myPrediction) === normalizeVcnvAnswer(gameState.vcnv_risk_answer);
              return (
                <div className={`p-4 rounded-[2px] border text-center space-y-1.5 ${
                  isCorrect
                    ? 'fluent-box border-emerald-500/60 text-emerald-300'
                    : 'fluent-box-nested border-rose-500/40 text-rose-300'
                }`}>
                  <p className="text-xs font-mono font-bold uppercase">
                    {isCorrect ? (t("view_guess_correct", localLanguage)) : (t("view_guess_incorrect", localLanguage))}
                  </p>
                  <p className="text-xs text-white">
                    {t("view_your_predict", localLanguage)} <strong className="font-mono uppercase">{myPrediction}</strong>
                  </p>
                </div>
              );
            })()}
          </div>
        )}

        {/* MAIN VCNV AUDIENCE PREDICTION BOX (Only visible when Branch 2 is triggered, explicit open, or round is revealed) */}
        {(isBranch2 || isVcnvRevealed || gameState.vcnv_status === 'OPEN' || gameState.vcnv_status === 'LOCKED') && !isRiskActive && (
          <div className="fluent-box rounded-[2px] p-6 sm:p-8 shadow-xl space-y-6">
            <div className="text-center">
              <h2 className="text-xs uppercase text-[#F7CAC9] font-bold tracking-widest font-mono mb-2">
                {t("view_round2_title", localLanguage)}
              </h2>
              <h3 className="text-xl sm:text-2xl font-black text-white">
                {t("view_predict_cnv", localLanguage)}
              </h3>
              <p className="text-sm text-[#B6A6D8] mt-2">
                {t("view_predict_desc", localLanguage)}
              </p>
            </div>

          {/* Clues layout optimized to Right Column display */}

          {/* WORKFLOW STAGE 3: REVEALED */}
          {isVcnvRevealed ? (
            <div className={`p-5 sm:p-6 rounded-[2px] border text-center animate-fadeIn ${
              userResponse && normalizeVcnvAnswer(userResponse.choice) === normalizeVcnvAnswer(gameState.vcnv_keyword)
                ? 'fluent-box border-emerald-500/50 text-emerald-400'
                : 'fluent-box border-rose-500/50 text-rose-400'
            }`}>
              <h3 className="text-xl font-bold mb-2">
                {userResponse && normalizeVcnvAnswer(userResponse.choice) === normalizeVcnvAnswer(gameState.vcnv_keyword)
                  ? t("view_correct", localLanguage) : t("view_incorrect", localLanguage)}
              </h3>
              <p className="text-sm font-medium mb-1">
                {t("view_official_keyword", localLanguage)} <strong className="text-white text-base fluent-box px-2.5 py-0.5 rounded-[2px] ml-1 font-mono">{gameState.vcnv_keyword}</strong>
              </p>
              <p className="text-xs opacity-80 mt-2">
                {t("view_your_predict", localLanguage)} <span className="font-mono font-bold text-white">{userResponse?.choice || t("view_not_participated", localLanguage)}</span>
              </p>
            </div>
          ) : isVcnvLocked ? (
            /* WORKFLOW STAGE 2: LOCKED (PENDING - NOT REVEALED YET) */
            <div className="p-6 rounded-[2px] fluent-box border border-amber-500/40 text-center animate-fadeIn space-y-4">
              <div className="w-12 h-12 rounded-[2px] bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 mx-auto">
                <Lock className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xs uppercase text-amber-400 font-mono tracking-wider font-bold mb-1">
                  {t("view_predict_closed", localLanguage)}
                </h3>
                {userResponse ? (
                  <div className="mt-3">
                    <p className="text-xs text-[#B6A6D8] mb-1">{t("view_recorded_predict", localLanguage)}</p>
                    <div className="inline-block px-4 py-2 fluent-box-nested border border-amber-500/40 text-amber-300 font-mono font-bold text-lg rounded-[2px] uppercase shadow-inner">
                      {userResponse.choice}
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-[#B6A6D8] mt-2 italic">
                    {t("view_no_predict", localLanguage)}
                  </p>
                )}
              </div>
              <p className="text-xs text-amber-200/70 font-sans">
                {t("view_wait_contestant", localLanguage)}
              </p>
            </div>
          ) : userResponse && !isEditingVcnv ? (
            /* WORKFLOW STAGE 1: SUBMITTED (CAN EDIT) */
            <div className="p-6 rounded-[2px] fluent-box border border-white/10 text-center animate-fadeIn space-y-4">
              <CheckCircle2 className="w-12 h-12 text-[#F7CAC9] mx-auto" />
              <div>
                <h3 className="text-xs uppercase text-[#B6A6D8] font-mono tracking-wider mb-1">
                  {t("view_predict_recorded", localLanguage)}
                </h3>
                <div className="inline-block px-4 py-2 bg-[#F7CAC9]/20 border border-[#F7CAC9]/40 text-[#FCEEEC] font-mono font-bold text-lg rounded-[2px] uppercase shadow-inner">
                  {userResponse.choice}
                </div>
              </div>
              <p className="text-xs text-[#B6A6D8]">
                {t("view_edit_predict_desc", localLanguage)}
              </p>
              <div>
                <button
                  type="button"
                  onClick={() => {
                    setVcnvPrediction(userResponse.choice);
                    setIsEditingVcnv(true);
                  }}
                  className="text-xs text-[#F7CAC9] hover:text-[#FCEEEC] underline font-medium transition cursor-pointer"
                >
                  {t("view_edit_predict", localLanguage)}
                </button>
              </div>
            </div>
          ) : (
            /* WORKFLOW STAGE 1: FORM INPUT */
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-[#B6A6D8] mb-2 text-left">
                  {t("view_enter_predict", localLanguage)}
                </label>
                <input
                  type="text"
                  value={vcnvPrediction}
                  onChange={(e) => setVcnvPrediction(e.target.value)}
                  placeholder={t("view_ph_predict_cnv", localLanguage)}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleVcnvSubmit();
                  }}
                  className="w-full fluent-box-nested border border-white/15 focus:border-[#F7CAC9] rounded-[2px] px-4 py-3.5 text-sm sm:text-base text-white font-mono uppercase text-center transition outline-none shadow-inner placeholder:text-[#B6A6D8]/60"
                />
              </div>
              <div className="flex gap-2">
                {isEditingVcnv && (
                  <button
                    type="button"
                    onClick={() => setIsEditingVcnv(false)}
                    className="px-4 py-3.5 fluent-box-nested hover:bg-white/10 text-[#B6A6D8] font-semibold rounded-[2px] text-xs uppercase tracking-wider transition hover-effect cursor-pointer"
                  >
                    {t("view_cancel", localLanguage)}
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleVcnvSubmit}
                  disabled={!vcnvPrediction.trim()}
                  className="flex-1 py-3.5 bg-gradient-horizon hover:from-[#F7CAC9] hover:to-[#E39A96] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-[2px] text-xs uppercase tracking-wider transition shadow-lg flex items-center justify-center gap-2 hover-effect cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  {isEditingVcnv ? t("view_update_predict", localLanguage) : t("view_send_predict", localLanguage)}
                </button>
              </div>
            </div>
          )}
        </div>
        )}

          </div> {/* close lg:col-span-7 */}
        </div> {/* close 2-Column Responsive grid */}

        {/* Floating Companion Tab & Drawer */}
        <AudienceDesktopSidebar
          user={user}
          gameState={gameState}
          userPerformance={userPerformance}
          isHighContrast={isHighContrast}
          onToggleHighContrast={onToggleHighContrast}
          isWakeLockLocked={isWakeLockLocked}
          isWakeLockSupported={isWakeLockSupported}
          onToggleWakeLock={onToggleWakeLock}
          onOpenShareModal={() => setIsShareModalOpen(true)}
          onOpenProfile={onOpenProfile}
          onOpenLogModal={onOpenLogModal || (() => setIsLogModalOpen(true))}
          onOpenQAModal={onOpenQAModal}
          selectedChoice={selectedChoice}
          hasVotedThisQuestion={hasVotedThisQuestion}
          timeLeft={timeLeft}
          lastKeyPressed={lastKeyPressed}
        />

        {/* Floating Quick Share Button */}

        <ShareGameModal
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
          gameTitle="Beyond The Internet 2026"
          roundName={gameState.round_name || gameState.category}
        />
      </div>
    );
  }


  // ==========================================
  // STATE 1: STANDBY
  // ==========================================
  if (gameState.status === 'STANDBY') {
    return (
      <div
        id="audience-state-standby"
        className="max-w-4xl w-full mx-auto p-4 sm:p-6 text-white relative"
      >
        <div className="flex flex-col items-center justify-center animate-fadeIn">
          {/* Main Standby Radar Card */}
          <div className="w-full max-w-2xl fluent-box rounded-[2px] p-6 sm:p-8 relative overflow-hidden text-center shadow-2xl">
            {/* Glowing pulse radar rings */}
            <div className="relative w-36 h-36 mx-auto mb-6 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-2 border-[#F7CAC9]/20 animate-ping" />
              <div className="absolute inset-3 rounded-full border border-[#F7CAC9]/40 animate-pulse" />
              <div className="w-20 h-20 rounded-[2px] bg-gradient-horizon flex items-center justify-center shadow-xl shadow-[#F7CAC9]/30">
                <Radio className="w-10 h-10 text-[#0D0420] animate-pulse" />
              </div>
            </div>

            <div className="inline-block px-3.5 py-1 rounded-[2px] text-xs font-bold uppercase tracking-widest bg-[#F7CAC9]/10 text-[#F7CAC9] border border-[#F7CAC9]/30 mb-3">
              {t("standby_ready", localLanguage)}
            </div>

            <h2 className="text-xl sm:text-2xl font-black text-slate-100 mb-3">
              {gameState.round_name || 'Beyond The Internet 2026'}
            </h2>

            <p className="text-base sm:text-lg text-[#FCEEEC] font-medium italic mb-6 leading-relaxed">
              &ldquo;{t("view_listen_mc", localLanguage)}&rdquo;
            </p>

            <div className="p-4 rounded-[2px] fluent-box-nested text-left text-xs space-y-2 text-[#B6A6D8]">
              <div className="flex items-center justify-between text-[#B6A6D8] border-b border-white/10 pb-2">
                <span>{t("standby_authenticated", localLanguage)}</span>
                <span className="font-bold text-white">{user.name}</span>
              </div>
              <div className="flex items-center justify-between text-[#B6A6D8] border-b border-white/10 pb-2">
                <span>{t("standby_uid", localLanguage)}</span>
                <span className="font-mono font-bold text-[#F7CAC9]">{getUserDisplayUid(user)}</span>
              </div>
              <div className="flex items-center justify-between text-[#B6A6D8]">
                <span>{t("standby_device_status", localLanguage)}</span>
                <span className="text-emerald-400 font-medium flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> {t("standby_ready_to_receive", localLanguage)}
                </span>
              </div>
              <div className="flex items-center justify-between text-[#B6A6D8] border-t border-white/10 pt-2">
                <span className="flex items-center gap-1.5">
                  <Sun className="w-3.5 h-3.5 text-amber-400" />
                  <span>{t("standby_wake_lock", localLanguage)}</span>
                </span>
                {isWakeLockSupported !== false && onToggleWakeLock ? (
                  <button
                    type="button"
                    onClick={() => {
                      soundFx.playClick();
                      vibrateTap();
                      onToggleWakeLock();
                    }}
                    className={`px-2 py-0.5 rounded-[2px] text-[11px] font-bold font-mono transition flex items-center gap-1.5 hover-effect ${
                      isWakeLockLocked
                        ? 'bg-white/10 text-amber-300 border border-amber-500/40'
                        : 'bg-white/10 text-slate-400 hover:text-white border border-white/10'
                    }`}
                    title={isWakeLockLocked ? t("view_wakelock_on", localLanguage) : t("view_wakelock_off", localLanguage)}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${isWakeLockLocked ? 'bg-amber-400 animate-pulse' : 'bg-slate-500'}`} />
                    {isWakeLockLocked ? t("view_on", localLanguage) : t("view_off", localLanguage)}
                  </button>
                ) : (
                  <span className="text-slate-500 text-[10px]">{t("standby_auto_device", localLanguage)}</span>
                )}
              </div>
              <div className="border-t border-white/10 pt-2">
                <BatteryIndicator showDetails={true} className="!p-2.5 !bg-[#13072E]/60 !rounded-[2px]" />
              </div>
            </div>

            <div className="mt-6 mb-2">
              <AudienceCheerButton user={user} isHighContrast={isHighContrast} />
            </div>
            <div className="mt-4 text-[11px] text-slate-500">
              {t("standby_wait_mc", localLanguage)}
            </div>

            <button
              id="btn-audience-share-standby"
              type="button"
              onClick={() => {
                soundFx.playClick();
                setIsShareModalOpen(true);
              }}
              className="w-full mt-4 py-3 px-4 rounded-[2px] bg-[#F7CAC9]/15 hover:bg-[#F7CAC9]/25 border border-[#F7CAC9]/40 text-[#FCEEEC] font-bold text-xs flex items-center justify-center gap-2 transition hover-effect shadow-lg"
            >
              <QrCode className="w-4 h-4 text-[#F7CAC9]" />
              <span>{t("standby_invite", localLanguage)}</span>
            </button>
          </div>
        </div>

        {/* Floating Companion Tab & Drawer */}
        <AudienceDesktopSidebar
          user={user}
          gameState={gameState}
          userPerformance={userPerformance}
          isHighContrast={isHighContrast}
          onToggleHighContrast={onToggleHighContrast}
          isWakeLockLocked={isWakeLockLocked}
          isWakeLockSupported={isWakeLockSupported}
          onToggleWakeLock={onToggleWakeLock}
          onOpenShareModal={() => setIsShareModalOpen(true)}
          onOpenProfile={onOpenProfile}
          onOpenLogModal={onOpenLogModal || (() => setIsLogModalOpen(true))}
          onOpenQAModal={onOpenQAModal}
          selectedChoice={selectedChoice}
          hasVotedThisQuestion={hasVotedThisQuestion}
          timeLeft={timeLeft}
          lastKeyPressed={lastKeyPressed}
        />

        {/* Floating Quick Share Button */}

        <ShareGameModal
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
          gameTitle="Beyond The Internet 2026"
          roundName={gameState.round_name || gameState.category}
        />
      </div>
    );
  }


  // ==========================================
  // STATE 2: ACTIVE
  // ==========================================
  if (gameState.status === 'ACTIVE') {
    const isBlindPoll = gameState.round_type === 'BLIND_POLL';
    const isShortAnswer = gameState.round_type === 'SHORT_ANSWER' || gameState.round_type === 'FILL_IN_BLANK';
    const isTrueFalse4 = gameState.round_type === 'TRUE_FALSE_4';
    const isTrueFalse = gameState.round_type === 'TRUE_FALSE';
    const isImagePoll = gameState.round_type === 'IMAGE_POLL';
    const isSequencing = gameState.round_type === 'SEQUENCING';
    const isTTRound =
      gameState.round_type === 'ELIMINATION_6' ||
      gameState.round_type === 'SEQUENCING' ||
      gameState.round_name?.includes('Tăng tốc') ||
      gameState.question_id?.startsWith('TT');
    const timerProgress = Math.max(0, (timeLeft / (gameState.time_limit || 1)) * 100);



    return (
      <div
        id="audience-state-active"
        className="max-w-7xl xl:max-w-[95%] w-full mx-auto p-4 sm:p-6 pb-28 sm:pb-8 text-white space-y-5 relative"
      >
        {/* Floating Toast Notification for Drag & Drop / Sequencing Warnings */}
        {/* Small Success Toast */}
        {submitToast && (
          <div className="fixed bottom-6 right-6 z-50 animate-fadeIn pointer-events-none">
            <div className="flex items-center gap-2 bg-emerald-500 text-white px-4 py-2.5 rounded-[2px] shadow-lg shadow-emerald-500/30">
              <CheckCircle2 className="w-4 h-4" />
              <span className="text-sm font-bold">{t("active_submitted", localLanguage)}</span>
            </div>
          </div>
        )}

        {/* Mini-Tip Quick Guide */}
        {showMiniTip && (
          <div className="fixed bottom-24 right-4 sm:right-6 z-50 animate-slideUp">
            <div className="flex items-start gap-3 bg-[#190839]/95 backdrop-blur-xl border-2 border-[#F7CAC9]/40 text-white p-4 rounded-[2px] shadow-[0_0_30px_rgba(247,202,201,0.2)] max-w-xs sm:max-w-sm relative">
              <div className="bg-[#F7CAC9]/20 p-2 rounded-[2px] shrink-0 mt-0.5">
                <HelpCircle className="w-5 h-5 text-[#F7CAC9] animate-pulse" />
              </div>
              <div className="flex-1 pr-6">
                <h4 className="text-[#F7CAC9] text-xs font-black mb-1 uppercase tracking-wider">{t("view_tips", localLanguage)}</h4>
                <p className="text-sm text-slate-200 leading-tight">
                  {gameState.round_type === 'MULTIPLE_CHOICE' ? t("view_tip_mc", localLanguage) :
                   gameState.round_type === 'TRUE_FALSE_4' ? t("view_tip_tf", localLanguage) :
                   gameState.round_type === 'SEQUENCING' ? t("view_tip_sort", localLanguage) :
                   (gameState.round_type === 'SHORT_ANSWER' || gameState.round_type === 'FILL_IN_BLANK') ? t("view_tip_short", localLanguage) :
                   gameState.round_type === 'VCNV' ? t("view_tip_cnv", localLanguage) :
                   t("view_tip_default", localLanguage)}
                </p>
              </div>
              <button 
                onClick={() => setShowMiniTip(false)}
                className="absolute top-2 right-2 p-1 text-slate-400 hover:text-white transition rounded-[2px] hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {seqToast && (
          <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-lg animate-fadeIn shadow-2xl pointer-events-auto">
            <div className={`p-4 sm:p-5 rounded-[2px] border-2 backdrop-blur-2xl flex items-start gap-3.5 transition-all shadow-2xl ${
              seqToast.type === 'error'
                ? 'bg-rose-950/95 border-rose-500 text-rose-100 shadow-rose-900/80'
                : 'bg-amber-950/95 border-amber-400 text-amber-100 shadow-amber-900/80'
            }`}>
              <div className={`p-2.5 rounded-[2px] shrink-0 ${
                seqToast.type === 'error' ? 'bg-white/10 text-rose-400' : 'bg-white/10 text-amber-300'
              }`}>
                <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 animate-bounce" />
              </div>
              <div className="flex-1 min-w-0 pr-1">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="font-mono font-black text-xs sm:text-sm uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                    ⚠️ {seqToast.title}
                  </h4>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-[2px] bg-white/10 text-amber-300 border border-amber-500/30">
                    {localLanguage !== 'vi' ? 'WARNING' : 'CẢNH BÁO'}
                  </span>
                </div>
                <p className="text-xs sm:text-sm font-semibold leading-relaxed text-white/95">
                  {seqToast.message}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSeqToast(null)}
                className="p-1.5 rounded-[2px] bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition shrink-0 hover-effect"
                title={t("view_close_toast", localLanguage)}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
        {/* Tab switch / focus departure warning toast */}
        {showTabSwitchWarning && (
          <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-lg animate-fadeIn shadow-2xl">
            <div className="p-4 rounded-[2px] border-2 bg-rose-950/95 border-rose-500 text-rose-100 flex items-start gap-3 backdrop-blur-2xl shadow-rose-950/80">
              <div className="p-2 rounded-[2px] bg-rose-500/20 text-rose-400 shrink-0">
                <AlertTriangle className="w-5 h-5 animate-bounce" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-sm text-rose-300">CẢNH BÁO: RỜI KHỎI TAB MÀN HÌNH</h4>
                  <span className="text-[10px] font-mono font-black px-1.5 py-0.5 bg-rose-500/30 text-rose-200 rounded-[2px]">
                    LẦN {tabSwitchCount}
                  </span>
                </div>
                <p className="text-xs text-rose-200/90 mt-1 leading-relaxed">
                  Hệ thống phát hiện bạn đã chuyển tab hoặc rời màn hình khi câu hỏi đang diễn ra. Thông số này được ghi nhận vào hệ thống.
                </p>
              </div>
              <button onClick={() => setShowTabSwitchWarning(false)} className="p-1 text-rose-400 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Offline sync status notice */}
        {offlineNotice && (
          <div className="fixed bottom-20 sm:bottom-6 left-1/2 -translate-x-1/2 z-50 animate-fadeIn pointer-events-auto">
            <div className="flex items-center gap-2 bg-slate-900/95 border border-amber-400/50 text-amber-200 px-4 py-2.5 rounded-[2px] shadow-2xl text-xs font-semibold backdrop-blur-md">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>{offlineNotice}</span>
              <button onClick={() => setOfflineNotice(null)} className="ml-2 text-slate-400 hover:text-white cursor-pointer">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Reusable CountdownTimer Header: Category, Badges, Timer & Progress Bar */}
        <CountdownTimer
          timeLeft={timeLeft}
          totalTime={gameState.time_limit}
          isTTRound={isTTRound}
          label={gameState.category || gameState.round_name}
        >
          {/* Battle Royale Survival Badge */}
          <div 
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-[2px] text-xs font-mono font-bold bg-purple-500/15 text-purple-200 border border-purple-400/30"
            title={`Đấu trường Sinh tử: ${survivalStats.survivorsCount} / ${survivalStats.totalContestants} người bất bại (${survivalStats.survivalRate}%)`}
          >
            <Shield className="w-3.5 h-3.5 text-purple-300" />
            <span className="hidden md:inline text-[11px]">SINH TỒN:</span>
            <span className="text-white font-black">{survivalStats.survivorsCount}</span>
          </div>

          {/* Streak Combo Badge (NO point multiplier) */}
          {streakStats.currentStreak >= 2 && (
            <div 
              className="flex items-center gap-1 px-2.5 py-1 rounded-[2px] text-xs font-mono font-black bg-amber-500/20 text-amber-300 border border-amber-400/40 animate-pulse"
              title={`Chuỗi thắng: ${streakStats.currentStreak} câu liên tiếp!`}
            >
              <Flame className="w-3.5 h-3.5 text-amber-400" />
              <span>x{streakStats.currentStreak}</span>
            </div>
          )}

          {/* Post-match card trigger button */}
          <button
            type="button"
            onClick={() => setIsPostMatchModalOpen(true)}
            className="p-1.5 sm:px-2.5 sm:py-1 rounded-[2px] text-xs font-medium bg-gradient-to-r from-purple-600/30 to-indigo-600/30 hover:from-purple-600/50 hover:to-indigo-600/50 text-[#FCEEEC] border border-purple-400/30 flex items-center gap-1.5 transition hover-effect cursor-pointer"
            title="Xuất thẻ thành tích Infographic"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span className="hidden sm:inline text-[11px] font-bold">Thẻ</span>
          </button>

          <button
            id="btn-audience-share-active"
            type="button"
            onClick={() => {
              soundFx.playClick();
              setIsShareModalOpen(true);
            }}
            className="p-1.5 sm:px-2.5 sm:py-1 rounded-[2px] text-xs font-medium bg-white/10 hover:bg-white/20 text-[#FCEEEC] border border-white/10 flex items-center gap-1.5 transition hover-effect"
            title={t("view_share_qr_title", localLanguage)}
          >
            <QrCode className="w-3.5 h-3.5 text-[#F7CAC9]" />
            <span className="hidden sm:inline text-[11px] font-bold">QR</span>
          </button>
        </CountdownTimer>

        {/* Active Question & Options Area - Full Width for Maximum Reading Space */}
        <div className="w-full max-w-7xl 2xl:max-w-[100rem] mx-auto space-y-5">
          <div className={`grid grid-cols-1 ${isLongQuestion ? '' : 'lg:grid-cols-12'} gap-6 lg:gap-8 ${isLongQuestion ? '' : 'items-stretch'}`}>
            
            {/* LEFT Column: Question Box */}
            <div className={isLongQuestion ? "col-span-1 lg:col-span-12 flex flex-col" : "lg:col-span-5 flex flex-col justify-start"}>
                {!isBlindPoll ? (
                  <div className={`fluent-question-box p-5 sm:p-6 lg:p-8 flex flex-col justify-center relative group ${
                    isLongQuestion 
                      ? 'min-h-[120px] md:min-h-[160px] w-full' 
                      : 'min-h-[160px] md:min-h-[280px] h-full'
                  }`}>
                    {/* Fluent UI Header Payload */}
                    <div className="text-xs font-mono font-bold text-[#F7CAC9] uppercase tracking-wider mb-2.5 flex items-center justify-between gap-2 border-b border-white/10 pb-2">
                      <span className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#F7CAC9] animate-pulse" />
                        {gameState.round_name} • {t("view_code", localLanguage)}: {gameState.question_id}
                      </span>
                      <div className="flex items-center gap-2">
                        {/* Translation status indicator & language switcher */}
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => setIsLanguageMenuOpen(!isLanguageMenuOpen)}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[2px] text-[11px] font-bold border transition shadow-sm cursor-pointer ${
                              localLanguage !== 'vi'
                                ? 'bg-sky-500/20 text-sky-200 border-sky-400/40 hover:bg-sky-500/30'
                                : 'bg-white/10 text-white/90 border-white/20 hover:bg-white/15'
                            }`}
                            title={localLanguage === 'vi' ? 'Chọn ngôn ngữ hiển thị' : `Đang hiển thị: ${localLanguage.toUpperCase()}`}
                          >
                            <Globe className="w-3.5 h-3.5 text-sky-300" />
                            <span>
                              {localLanguage === 'vi' 
                                ? '🇻🇳 VI' 
                                : `${SUPPORTED_TRANSLATION_LANGUAGES.find(l => l.code === localLanguage)?.flag || '🌐'} ${localLanguage.toUpperCase()}`
                              }
                            </span>
                            {isTranslating ? (
                              <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-spin" />
                            ) : (
                              <ChevronDown className="w-3.5 h-3.5 opacity-60" />
                            )}
                          </button>

                          {isLanguageMenuOpen && (
                            <>
                              <div 
                                className="fixed inset-0 z-40" 
                                onClick={() => setIsLanguageMenuOpen(false)} 
                              />
                              <div className="absolute right-0 top-full mt-1.5 w-60 py-1 rounded-[4px] bg-[#190839]/95 backdrop-blur-xl border border-white/20 shadow-2xl z-50 text-left animate-fadeIn max-h-72 overflow-y-auto">
                                <div className="px-3 py-1.5 text-[10px] font-mono font-bold text-[#F7CAC9] border-b border-white/10 uppercase tracking-wider flex items-center justify-between sticky top-0 bg-[#190839] z-10">
                                  <span>Ngôn ngữ hiển thị</span>
                                  <Sparkles className="w-3 h-3 text-[#F7CAC9]" />
                                </div>

                                {/* Tiếng Việt (Gốc) */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setLocalLanguage('vi');
                                    localStorage.setItem('bti_lang', 'vi');
                                    window.dispatchEvent(new Event('storage'));
                                    window.dispatchEvent(new CustomEvent('languageChange', { detail: 'vi' }));
                                    setIsLanguageMenuOpen(false);
                                  }}
                                  className={`w-full px-3 py-1.5 text-xs text-left flex items-center justify-between hover:bg-white/10 transition cursor-pointer ${
                                    localLanguage === 'vi' ? 'bg-sky-500/25 text-white font-bold border-l-2 border-sky-400' : 'text-white/80'
                                  }`}
                                >
                                  <span className="flex items-center gap-2">
                                    <span className="text-base">🇻🇳</span>
                                    <span>Tiếng Việt (Gốc)</span>
                                  </span>
                                  {localLanguage === 'vi' && (
                                    <span className="text-sky-300 font-bold text-xs">✓</span>
                                  )}
                                </button>

                                {/* Foreign Languages (English, Chinese, Japanese, Korean, etc.) */}
                                {SUPPORTED_TRANSLATION_LANGUAGES.map((lang) => {
                                  const isSelected = localLanguage === lang.code;
                                  return (
                                    <button
                                      key={lang.code}
                                      type="button"
                                      onClick={() => {
                                        setLocalLanguage(lang.code);
                                        localStorage.setItem('bti_lang', lang.code);
                                        window.dispatchEvent(new Event('storage'));
                                        window.dispatchEvent(new CustomEvent('languageChange', { detail: lang.code }));
                                        setIsLanguageMenuOpen(false);
                                      }}
                                      className={`w-full px-3 py-1.5 text-xs text-left flex items-center justify-between hover:bg-white/10 transition cursor-pointer ${
                                        isSelected ? 'bg-sky-500/25 text-white font-bold border-l-2 border-sky-400' : 'text-white/80'
                                      }`}
                                    >
                                      <span className="flex items-center gap-2 truncate">
                                        <span className="text-base">{lang.flag}</span>
                                        <span className="truncate">{lang.nativeLabel}</span>
                                        <span className="text-[10px] font-mono text-white/40">({lang.code.toUpperCase()})</span>
                                      </span>
                                      {isSelected && (
                                        <span className="text-sky-300 font-bold text-xs">✓</span>
                                      )}
                                    </button>
                                  );
                                })}

                                {/* AI Re-translate Button: ONLY displayed when viewing in a foreign language */}
                                {localLanguage !== 'vi' && (
                                  <div className="border-t border-white/10 mt-1 pt-1">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        handleRequestTranslate();
                                        setIsLanguageMenuOpen(false);
                                      }}
                                      className="w-full px-3 py-1.5 text-xs text-left flex items-center justify-between hover:bg-white/10 transition cursor-pointer text-sky-300 font-bold bg-white/5"
                                    >
                                      <span className="flex items-center gap-1.5">
                                        <RefreshCw className={`w-3.5 h-3.5 text-sky-400 ${isTranslating ? 'animate-spin' : ''}`} />
                                        {isTranslating ? 'Đang dịch AI...' : 'Dịch lại câu hỏi bằng AI'}
                                      </span>
                                    </button>
                                  </div>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                        {isLongQuestion && (
                          <button
                            onClick={() => setIsQuestionZoomed(true)}
                            className="p-1.5 rounded-[2px] bg-white/5 hover:bg-white/15 text-white/80 hover:text-white transition shadow-sm border border-white/10"
                            title={t("view_auto_zoom", localLanguage)}
                          >
                            <ZoomIn className="w-4 h-4" />
                          </button>
                        )}
                        <QuestionLikeButton
                          questionId={gameState.question_id}
                          user={user}
                          gameState={gameState}
                          variant="compact"
                        />

                        {/* AI Voice TTS Button (Web Speech API - Nhóm 2) */}
                        <button
                          type="button"
                          onClick={handleToggleSpeakQuestion}
                          className={`p-1.5 rounded-[2px] border transition shadow-sm cursor-pointer ${
                            isSpeakingQuestion
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/50 animate-pulse'
                              : 'bg-white/5 hover:bg-white/15 text-white/80 hover:text-white border-white/10'
                          }`}
                          title={isSpeakingQuestion ? t("view_tts_stop", localLanguage) : t("view_tts_start", localLanguage)}
                        >
                          {isSpeakingQuestion ? (
                            <VolumeX className="w-4 h-4 text-emerald-400 animate-pulse" />
                          ) : (
                            <Volume2 className="w-4 h-4 text-[#F7CAC9]" />
                          )}
                        </button>
                      </div>
                    </div>
                    <h2 className={`text-base sm:text-lg md:text-xl font-bold text-white ${isCjkQuestion ? 'cjk-text tracking-wide leading-loose' : 'leading-relaxed tracking-tight'} ${isKoreanQuestion ? 'korean-question-font' : ''}`} data-question-text="true">
                      {activeQuestionText}
                    </h2>
                    {gameState.media_type === 'IMAGE' && gameState.media_url && (
                      <div className="mt-4 flex justify-center">
                        <img src={gameState.media_url} alt={t("view_media_alt", localLanguage)} className="max-h-52 rounded-[2px] object-contain border border-[#F7CAC9]/30 shadow-lg" />
                      </div>
                    )}
                    {gameState.media_type === 'VIDEO' && gameState.media_url && (
                      <div className="mt-4 flex justify-center w-full">
                        <video
                          ref={(el) => { audienceMediaRef.current = el; }}
                          src={gameState.media_url}
                          controls
                          autoPlay={Boolean(gameState.media_autoplay && gameState.status === 'ACTIVE')}
                          className="max-h-52 w-full rounded-[2px] border border-[#F7CAC9]/30 shadow-lg"
                        />
                      </div>
                    )}
                    {gameState.media_type === 'AUDIO' && gameState.media_url && (
                      <div className="mt-4 flex justify-center w-full">
                        <audio
                          ref={(el) => { audienceMediaRef.current = el; }}
                          src={gameState.media_url}
                          controls
                          autoPlay={Boolean(gameState.media_autoplay && gameState.status === 'ACTIVE')}
                          className="w-full"
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  /* Round 4 BLIND POLLING MODE BANNER */
                  <div className={`fluent-question-box p-5 text-center shadow-xl flex flex-col justify-center ${
                    isLongQuestion 
                      ? 'min-h-[120px] md:min-h-[160px] w-full' 
                      : 'min-h-[160px] md:min-h-[280px] h-full'
                  }`}>
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-[2px] text-xs font-extrabold uppercase tracking-widest bg-white/10 text-purple-300 border border-purple-500/40 mb-2 mx-auto">
                      <Sparkles className="w-3.5 h-3.5 text-purple-400" /> {t("active_blind_poll_title", localLanguage)}
                    </div>
                    <p className="text-sm md:text-base text-purple-200 font-medium leading-relaxed">
                      {t("active_blind_poll_desc", localLanguage)}
                    </p>
                  </div>
                )}
              </div>

              {/* RIGHT Column: Input Controls & Choice Confirmation */}
              <div className={isLongQuestion ? "col-span-1 lg:col-span-12 flex flex-col justify-between gap-4" : "lg:col-span-7 flex flex-col justify-between gap-4"}>
                <div className="flex-1">
                  {/* Round 4 (Về đích) Double Down / All-In Risk Mode Toggle & Lock */}
                  {isVeDichRound && (
                    <div className={`p-3 sm:p-3.5 rounded-[2px] border transition-all mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      isDoubleDownActive
                        ? 'bg-amber-500/20 border-amber-400 text-amber-100 shadow-[0_0_20px_rgba(251,191,36,0.3)]'
                        : 'bg-black/30 border-white/10 text-slate-300 hover:border-amber-400/30'
                    }`}>
                      <div className="flex items-center gap-2.5">
                        <div className={`p-2 rounded-[2px] shrink-0 ${isDoubleDownActive ? 'bg-amber-400 text-black font-black animate-pulse' : 'bg-white/10 text-amber-400'}`}>
                          <Flame className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-black text-xs sm:text-sm text-white tracking-wide">
                              {t("view_bet_title", localLanguage)}
                            </span>
                            {isDoubleDownActive && (
                              <span className="text-[10px] font-mono font-black px-1.5 py-0.5 bg-amber-400 text-black rounded-[2px] flex items-center gap-1 shadow-sm">
                                <Lock className="w-3 h-3" />
                                {t("view_bet_locked_badge", localLanguage)}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-amber-200/90 leading-tight mt-0.5">
                            {isDoubleDownActive 
                              ? t("view_bet_desc_locked", localLanguage)
                              : t("view_bet_desc_default", localLanguage)}
                          </p>
                          {isDoubleDownActive && (
                            <span className="text-[10px] font-mono text-amber-300/80 flex items-center gap-1 mt-1">
                              <Lock className="w-3 h-3 text-amber-400 shrink-0" />
                              {t("view_bet_locked_notice", localLanguage)}
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        disabled={isDoubleDownActive || hasVotedThisQuestion}
                        onClick={() => {
                          if (isDoubleDownActive || hasVotedThisQuestion) return;
                          setIsDoubleDownActive(true);
                          soundFx.playAllInActivation();
                          vibrateLifeline();
                        }}
                        className={`px-3.5 py-2 rounded-[2px] font-mono font-black text-xs transition border shrink-0 text-center flex items-center justify-center gap-1.5 ${
                          isDoubleDownActive
                            ? 'bg-amber-400 text-black border-amber-300 shadow-md cursor-not-allowed opacity-95'
                            : 'bg-gradient-to-r from-amber-500 to-amber-400 text-black border-amber-300 hover:from-amber-400 hover:to-amber-300 cursor-pointer shadow-lg active:scale-95'
                        } ${hasVotedThisQuestion && !isDoubleDownActive ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        {isDoubleDownActive && <Lock className="w-3.5 h-3.5" />}
                        {isDoubleDownActive 
                          ? t("view_bet_btn_locked", localLanguage) 
                          : t("view_bet_btn_action", localLanguage)}
                      </button>
                    </div>
                  )}

                  {/* Input Controls */}
                  {isTrueFalse4 ? (
                    <div className="space-y-3 pt-1">
                      <div className="text-xs font-mono font-bold text-[#F7CAC9] uppercase tracking-wider flex items-center justify-between pb-1 border-b border-white/10">
                        <span>{t("view_choose_tf", localLanguage)}</span>
                      </div>

                      <div className={`grid grid-cols-1 ${isLongQuestion ? 'md:grid-cols-2' : ''} gap-3`}>
                        {Object.entries(activeOptions || gameState.options || {}).map(([key, label]) => {
                          const currentChoice = tfChoices[key]; // no default 'Đ'

                        return (
                          <div
                            key={key}
                            className="p-3.5 sm:p-4 rounded-[2px] fluent-box-nested space-y-2.5"
                          >
                            <div className="flex items-start gap-2.5">
                              <span className="w-6 h-6 rounded-[2px] bg-[#F7CAC9]/20 text-[#FCEEEC] font-mono font-bold text-xs flex items-center justify-center shrink-0 border border-[#F7CAC9]/30">
                                {key}
                              </span>
                              <p className={`text-xs sm:text-sm font-medium text-slate-200 ${isCjk(label, localLanguage) ? 'cjk-text tracking-wide leading-loose' : 'leading-relaxed'}`}>
                                {label}
                              </p>
                            </div>

                            <div className="grid grid-cols-2 gap-2 pt-1">
                              <button
                                type="button"
                                onClick={() => handleToggleTf(key, 'Đ')}
                                className={`py-2 px-3 rounded-[2px] font-bold font-mono text-xs transition border flex items-center justify-center gap-1.5 hover-effect focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 ${
                                  currentChoice === 'Đ'
                                    ? 'bg-emerald-500 text-[#0D0420] border-emerald-400 shadow-md shadow-emerald-500/30 font-black'
                                    : 'fluent-box-nested text-[#B6A6D8] border-white/10 hover:border-white/20'
                                }`}
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" /> {t("view_stmt_true", localLanguage).replace("{key}", key)}
                              </button>

                              <button
                                type="button"
                                onClick={() => handleToggleTf(key, 'S')}
                                className={`py-2 px-3 rounded-[2px] font-bold font-mono text-xs transition border flex items-center justify-center gap-1.5 hover-effect focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 ${
                                  currentChoice === 'S'
                                    ? 'bg-rose-500 text-white border-rose-400 shadow-md shadow-rose-500/30 font-black'
                                    : 'fluent-box-nested text-[#B6A6D8] border-white/10 hover:border-white/20'
                                }`}
                              >
                                <XCircle className="w-3.5 h-3.5" /> {t("view_stmt_false", localLanguage).replace("{key}", key)}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                      </div>
                      <button
                        onClick={handleSubmitTf}
                        disabled={Object.keys(tfChoices).length === 0 || hasVotedThisQuestion}
                        className={`w-full mt-4 py-3 sm:py-4 rounded-[2px] font-black text-sm sm:text-base transition-colors flex items-center justify-center gap-2 hover-effect focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
                          hasVotedThisQuestion
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 cursor-not-allowed'
                            : 'bg-[#F7CAC9] hover:bg-white text-[#0D0420] disabled:opacity-50'
                        }`}
                      >
                        {hasVotedThisQuestion ? (
                          <>
                            {isPendingSync ? <RefreshCw className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />} {isPendingSync ? (t("view_syncing", localLanguage)) : (t("view_recorded", localLanguage))}
                          </>
                        ) : (
                          <>
                            <Send className="w-4 h-4" />
                            {t("view_send_tf", localLanguage)}
                          </>
                        )}
                      </button>
                    </div>
                  ) : isSequencing ? (
                    /* SEQUENCING Drag & Reorder UI */
                    <div className="space-y-3 pt-1">
                      <div className="flex items-center justify-between text-xs font-mono font-bold text-[#F7CAC9] pb-1 border-b border-white/10">
                        <span className="flex items-center gap-1.5">
                          <ArrowUpDown className="w-4 h-4 text-[#F7CAC9]" /> {t("view_drag_drop", localLanguage)}
                        </span>
                        <span className="bg-[#F7CAC9]/20 px-2 py-0.5 rounded-[2px] text-[10px]">
                          {seqItems.length} {localLanguage !== 'vi' ? 'ITEMS' : 'MỤC'}
                        </span>
                      </div>

                      <div className="space-y-2">
                        {seqItems.map((optKey, idx) => {
                          const itemText = activeOptions?.[optKey] || gameState.options?.[optKey] || '';
                          return (
                            <div
                              key={optKey}
                              draggable
                              onDragStart={(e) => handleDragStart(e, idx)}
                              onDragOver={(e) => handleDragOver(e, idx)}
                              onDrop={(e) => handleDrop(e, idx)}
                              className={`p-3 fluent-box-nested rounded-[2px] flex items-center justify-between gap-3 shadow-md transition-all cursor-grab active:cursor-grabbing hover:border-[#F7CAC9] ${
                                draggedIdx === idx ? 'border-amber-400 bg-white/15 opacity-60 scale-[0.98]' : 'border-white/10'
                              }`}
                            >
                              <div className="flex items-center gap-2.5 flex-1 min-w-0">
                                <span className="text-white/40 hover:text-white cursor-grab shrink-0 p-0.5">
                                <GripVertical className="w-4 h-4" />
                              </span>
                              <span className="w-7 h-7 rounded-[2px] bg-[#F7CAC9] text-[#0D0420] font-mono font-black text-xs flex items-center justify-center shrink-0 shadow-sm">
                                {idx + 1}
                              </span>
                              <span className="w-6 h-6 rounded-[2px] bg-white/10 text-[#FCEEEC] font-mono font-bold text-xs flex items-center justify-center shrink-0">
                                {optKey}
                              </span>
                              <p className={`text-xs sm:text-sm font-semibold text-white break-words ${isCjk(itemText, localLanguage) ? 'cjk-text tracking-wide leading-loose' : 'leading-tight'}`}>
                                {itemText}
                              </p>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => moveSeqItemUp(idx)}
                                disabled={idx === 0}
                                className="w-8 h-8 rounded-[2px] bg-white/10 hover:bg-[#F7CAC9] hover:text-[#0D0420] text-white disabled:opacity-20 flex items-center justify-center font-bold text-sm transition hover-effect"
                                title={t("view_move_up", localLanguage)}
                              >
                                ▲
                              </button>
                              <button
                                type="button"
                                onClick={() => moveSeqItemDown(idx)}
                                disabled={idx === seqItems.length - 1}
                                className="w-8 h-8 rounded-[2px] bg-white/10 hover:bg-[#F7CAC9] hover:text-[#0D0420] text-white disabled:opacity-20 flex items-center justify-center font-bold text-sm transition hover-effect"
                                title={t("view_move_down", localLanguage)}
                              >
                                ▼
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="p-3 fluent-box-nested rounded-[2px] flex items-center justify-between text-xs font-mono">
                      <span className="text-slate-400">{t("view_your_seq", localLanguage)}</span>
                      <span className="text-[#F7CAC9] font-black text-sm tracking-wider">
                        {seqItems.join(' ➔ ')}
                      </span>
                    </div>

                    <button
                      type="button"
                      disabled={hasVotedThisQuestion}
                      onClick={handleSequencingSubmit}
                      className={`w-full py-3.5 sm:py-4 rounded-[2px] font-black text-sm sm:text-base transition-colors flex items-center justify-center gap-2 hover-effect focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
                        hasVotedThisQuestion
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 cursor-not-allowed'
                          : 'bg-[#F7CAC9] hover:bg-white text-[#0D0420] shadow-lg shadow-[#F7CAC9]/20'
                      }`}
                    >
                      {hasVotedThisQuestion ? (
                        <>
                          {isPendingSync ? <RefreshCw className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />} {isPendingSync ? (t("view_syncing", localLanguage)) : (t("view_recorded_val", localLanguage).replace("{val}", selectedChoice))}
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" /> {localLanguage !== 'vi' ? 'CONFIRM ORDER' : 'XÁC NHẬN SẮP XẾP'} ({seqItems.join('-')})
                        </>
                      )}
                    </button>
                  </div>
                ) : isShortAnswer ? (
                  <>
                    <form onSubmit={handleShortAnswerSubmit} className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="block text-xs font-semibold text-[#B6A6D8]">
                          {gameState.round_type === 'FILL_IN_BLANK' ? t("view_enter_blank", localLanguage) : t("view_enter_short", localLanguage)}
                        </label>
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder={gameState.round_type === 'FILL_IN_BLANK' ? t("view_ph_blank", localLanguage) : t("view_ph_short", localLanguage)}
                          value={shortAnswerText}
                          onChange={(e) => {
                            setShortAnswerText(e.target.value);
                            if (shortAnswerTranslation.text) setShortAnswerTranslation({ text: '', lang: '' });
                          }}
                          disabled={hasVotedThisQuestion}
                          className={`flex-1 fluent-box-nested text-white px-4 py-3.5 rounded-[2px] font-mono text-base outline-none uppercase transition-all ${
                            hasVotedThisQuestion
                              ? 'border-emerald-500/50 bg-emerald-900/20 text-emerald-100 opacity-80 cursor-not-allowed'
                              : 'focus:ring-2 focus:ring-[#F7CAC9] focus:border-[#F7CAC9]'
                          }`}
                        />
                        <button
                          type="submit"
                          disabled={hasVotedThisQuestion}
                          className={`font-bold px-6 rounded-[2px] flex items-center gap-2 transition hover-effect focus:outline-none ${
                            hasVotedThisQuestion
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 cursor-not-allowed'
                              : 'bg-[#F7CAC9] hover:bg-white text-[#0D0420] focus-visible:ring-2 focus-visible:ring-amber-400'
                          }`}
                        >
                          {hasVotedThisQuestion ? (
                            <>
                              {isPendingSync ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} {isPendingSync ? t("active_syncing", localLanguage) : t("view_sent", localLanguage)}
                            </>
                          ) : (
                            <>
                              <Send className="w-4 h-4" /> {t("view_send", localLanguage)}
                            </>
                          )}
                        </button>
                      </div>

                      {/* AI Multilingual Short Answer Translation helper */}
                      {shortAnswerText.trim() && !hasVotedThisQuestion && (
                        <div className="flex items-center flex-wrap gap-2 text-xs pt-0.5 animate-fadeIn">
                          <button
                            type="button"
                            onClick={() => handleTranslateShortAnswer(localLanguage !== 'vi' ? localLanguage : 'en')}
                            disabled={isTranslatingShortAnswer}
                            className="text-[11px] font-mono font-semibold px-2.5 py-1 rounded-[2px] bg-sky-500/15 hover:bg-sky-500/25 border border-sky-400/40 text-sky-200 flex items-center gap-1.5 transition cursor-pointer"
                            title="Dịch câu trả lời AI sang ngôn ngữ mục tiêu"
                          >
                            <Sparkles className="w-3 h-3 text-sky-300" />
                            <span>
                              {isTranslatingShortAnswer 
                                ? t("view_translating", localLanguage) 
                                : `${getLangFlag(localLanguage !== 'vi' ? localLanguage : 'en')} ${t("view_translate_short", localLanguage).replace('{lang}', (localLanguage !== 'vi' ? localLanguage : 'EN').toUpperCase())}`}
                            </span>
                          </button>
                          {localLanguage !== 'vi' && (
                            <button
                              type="button"
                              onClick={() => handleTranslateShortAnswer('vi')}
                              disabled={isTranslatingShortAnswer}
                              className="text-[11px] font-mono font-semibold px-2 py-1 rounded-[2px] bg-white/10 hover:bg-white/15 border border-white/20 text-slate-200 flex items-center gap-1 transition cursor-pointer"
                              title="Dịch sang Tiếng Việt"
                            >
                              <span>🇻🇳 VI</span>
                            </button>
                          )}
                          {shortAnswerTranslation.text && (
                            <div className="flex items-center gap-1.5 text-[11px] text-emerald-300 font-mono bg-emerald-950/60 border border-emerald-500/40 px-2.5 py-1 rounded-[2px]">
                              <span>{getLangFlag(shortAnswerTranslation.lang)} {t("view_translated_label", localLanguage)} <strong>{shortAnswerTranslation.text}</strong></span>
                              <button
                                type="button"
                                onClick={() => setShortAnswerText(shortAnswerTranslation.text)}
                                className="ml-1 underline text-[10px] text-emerald-200 hover:text-white cursor-pointer"
                                title="Điền từ này vào ô trả lời"
                              >
                                ({t("view_use_translated", localLanguage)})
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </form>
                    
                    {/* Short Answer Confirm Modal */}
                    {isConfirmingShortAnswer && (
                      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
                        <div className="bg-[#190839] border border-[#F7CAC9]/30 rounded-[4px] w-full max-w-sm p-6 shadow-2xl flex flex-col items-center text-center animate-slideUp">
                          <div className="w-12 h-12 rounded-[2px] bg-amber-500/20 flex items-center justify-center mb-4">
                            <AlertCircle className="w-6 h-6 text-amber-400" />
                          </div>
                          <h3 className="text-lg font-bold text-white mb-2">{t("view_confirm_send", localLanguage)}</h3>
                          <p className="text-sm text-slate-300 mb-6">
                            {t("view_sending", localLanguage)} <strong className="text-[#F7CAC9] font-mono block mt-2 text-xl break-all">{shortAnswerText.toUpperCase()}</strong>
                            <br/>
                            {t("view_no_change", localLanguage)}
                          </p>
                          <div className="flex gap-3 w-full">
                            <button
                              type="button"
                              onClick={cancelShortAnswerSubmit}
                              className="flex-1 py-2.5 rounded-[2px] border border-white/20 text-white font-bold hover:bg-white/10 transition"
                            >
                              {t("view_cancel", localLanguage)}
                            </button>
                            <button
                              type="button"
                              onClick={confirmShortAnswerSubmit}
                              className="flex-1 py-2.5 rounded-[2px] bg-[#F7CAC9] text-[#0D0420] font-bold hover:bg-white transition"
                            >
                              {t("view_confirm_btn", localLanguage)}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                ) : isTrueFalse ? (
                  /* Toggle cho Đúng/Sai */
                  <div className="flex flex-col sm:flex-row gap-4 pt-4 items-center justify-center">
                    {Object.entries(activeOptions || gameState.options || {}).map(([key, label]) => {
                      const serverCorrectKey = (gameState.correct_key || '').trim().toUpperCase();
                      const isCorrectAnswer = serverCorrectKey && key.toUpperCase() === serverCorrectKey;
                      const isSelected = (selectedChoice || "").toUpperCase() === key.toUpperCase();
                      const isUserIncorrect = hasVotedThisQuestion && isSelected && serverCorrectKey && key.toUpperCase() !== serverCorrectKey;
                      
                      const isOptionA = key.toUpperCase() === 'A';
                      
                      return (
                        <button
                          key={key}
                          onClick={() => !hasVotedThisQuestion && handleOptionSelect(key)}
                          disabled={hasVotedThisQuestion}
                          className={`relative flex-1 w-full sm:max-w-xs px-4 py-8 sm:py-10 rounded-[4px] border-2 transition-all overflow-hidden shadow-lg ${
                            isSelected 
                              ? isOptionA ? 'border-emerald-400 bg-emerald-500/20' : 'border-rose-400 bg-rose-500/20'
                              : 'border-white/10 bg-black/40 hover:border-white/30 hover:bg-white/5'
                          } ${hasVotedThisQuestion && !isSelected ? 'opacity-40 grayscale' : ''} ${
                            timeLeft <= 0 && isCorrectAnswer ? 'ring-4 ring-amber-400 border-amber-400' : ''
                          }`}
                        >
                          {isSelected && (
                             <div className={`absolute inset-0 opacity-20 pointer-events-none animate-pulse ${isOptionA ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                          )}
                          <div className="flex flex-col items-center gap-3 relative z-10">
                            <span className={`text-3xl sm:text-4xl md:text-5xl font-black ${isCjk(label, localLanguage) ? 'cjk-text tracking-wide leading-loose' : 'tracking-tight'} ${isSelected ? (isOptionA ? 'text-emerald-400' : 'text-rose-400') : 'text-white'}`}>
                              {label}
                            </span>
                          </div>
                          {isSelected && (
                             <div className="absolute top-3 right-3 flex items-center gap-1.5 z-10">
                              <span className={`text-[10px] font-mono font-black px-2 py-0.5 rounded-[2px] animate-pulse flex items-center gap-1 shadow-md ${
                                isOptionA ? 'bg-emerald-400 text-emerald-950' : 'bg-rose-400 text-rose-950'
                              }`}>
                                <CheckCircle2 className="w-3 h-3" />{t("view_selected", localLanguage)}</span>
                             </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                ) : isImagePoll ? (
                  /* Grid ảnh cho Poll hình ảnh */
                  <div className={`grid grid-cols-1 sm:grid-cols-2 ${isLongQuestion ? 'lg:grid-cols-4' : ''} gap-4 pt-1`}>
                    {Object.entries(activeOptions || gameState.options || {}).map(([key, label], idx) => {
                      const serverCorrectKey = (gameState.correct_key || '').trim().toUpperCase();
                      const isCorrectAnswer = serverCorrectKey && key.toUpperCase() === serverCorrectKey;
                      const isSelected = (selectedChoice || "").toUpperCase() === key.toUpperCase();
                      const isUserIncorrect = hasVotedThisQuestion && isSelected && serverCorrectKey && key.toUpperCase() !== serverCorrectKey;
                      const hasSelected = Boolean(selectedChoice);
                      const isEliminated = gameState.eliminated_options?.includes(key);
                      const pct = (timeLeft <= 0) ? (pollStats.percentages[key] || 0) : null;
                      
                      const numKey = idx + 1;
                      
                      return (
                        <button
                          key={key}
                          onClick={() => !hasVotedThisQuestion && !isEliminated && handleOptionSelect(key)}
                          disabled={hasVotedThisQuestion || isEliminated}
                          className={`relative text-left p-3 sm:p-4 rounded-[2px] border-2 transition-all flex flex-col gap-3 overflow-hidden ${
                            isEliminated
                              ? 'border-rose-500/30 opacity-40 grayscale bg-rose-900/20'
                              : isSelected
                              ? isUserIncorrect
                                ? 'border-rose-500 bg-rose-900/60 shadow-[0_0_20px_rgba(244,63,94,0.3)] ring-1 ring-rose-500'
                                : 'border-[#F7CAC9] bg-[#F7CAC9]/10 shadow-[0_0_20px_rgba(247,202,201,0.2)] ring-1 ring-[#F7CAC9]'
                              : isCorrectAnswer && timeLeft <= 0
                              ? 'border-emerald-500 bg-emerald-900/40 ring-2 ring-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.3)]'
                              : hasVotedThisQuestion
                              ? 'border-white/5 opacity-50 grayscale bg-black/40'
                              : 'border-white/10 hover:border-white/30 bg-black/40 hover:bg-white/5'
                          }`}
                        >
                          {/* Image rendering */}
                          {gameState.option_images?.[key] && (
                            <img src={gameState.option_images[key]} alt={`Option ${key}`} className="w-full h-40 sm:h-48 object-cover rounded-[2px] shadow-sm border border-white/10" />
                          )}
                          
                          <div className="flex items-start gap-3 w-full">
                            <div className="flex flex-col items-center gap-1 shrink-0 relative z-10">
                              <div
                                className={`w-10 h-10 rounded-[2px] font-mono font-black text-base flex items-center justify-center transition-all ${
                                  isSelected
                                    ? 'bg-[#F7CAC9] text-[#0D0420] shadow-[0_0_15px_rgba(247,202,201,0.8)]'
                                    : 'bg-white/10 text-[#F7CAC9]'
                                }`}
                              >
                                {key}
                              </div>
                            </div>
                            
                            <div className="flex-1 pt-1 relative z-10">
                              <div
                                className={`text-sm sm:text-base font-bold ${
                                  isSelected ? 'text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]' : 'text-slate-200'
                                } ${isCjk(label, localLanguage) ? 'cjk-text tracking-wide leading-loose' : 'leading-snug'}`}
                              >
                                {label}
                              </div>
                            </div>
                          </div>
                          
                          {isSelected && (
                            <div className="absolute top-3 right-3 text-[#F7CAC9] flex items-center gap-1.5 relative z-10">
                              <span className="text-[10px] font-mono font-black bg-[#F7CAC9] text-[#0D0420] px-2 py-0.5 rounded-[2px] shadow-[0_0_10px_rgba(247,202,201,0.6)] animate-pulse flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" />{t("view_selected", localLanguage)}</span>
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  /* Options Grid */
                  <div className={`grid grid-cols-1 sm:grid-cols-2 ${isLongQuestion ? 'lg:grid-cols-4' : ''} gap-4 pt-1`}>
                    {Object.entries(activeOptions || gameState.options || {}).map(([key, label], idx) => {
                      const serverCorrectKey = (gameState.correct_key || '').trim().toUpperCase();
                      const isCorrectAnswer = serverCorrectKey && key.toUpperCase() === serverCorrectKey;
                      const isSelected = (selectedChoice || "").toUpperCase() === key.toUpperCase();
                      const isUserIncorrect = hasVotedThisQuestion && isSelected && serverCorrectKey && key.toUpperCase() !== serverCorrectKey;
                      const hasSelected = Boolean(selectedChoice);
                      const isEliminated = gameState.eliminated_options?.includes(key);
                      const pct = (timeLeft <= 0) ? (pollStats.percentages[key] || 0) : null;

                      // Blind poll mode label simplification
                      const displayText = isBlindPoll
                        ? `${t('active_option', localLanguage)} ${key}`
                        : label;

                      const numKey = idx + 1;

                      return (
                        <button
                          key={key}
                          id={`btn-option-${key}`}
                          disabled={isEliminated || timeLeft <= 0}
                          onClick={() => handleOptionSelect(key)}
                          className={`relative w-full p-4 sm:p-5 rounded-[2px] text-left flex items-start gap-3.5 select-none overflow-hidden hover-effect focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 transition-all duration-300 ${
                            isEliminated
                              ? 'opacity-30 fluent-box-nested line-through cursor-not-allowed border-white/5'
                              : isCorrectAnswer && hasVotedThisQuestion
                              ? 'fluent-option-btn border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.4)] bg-emerald-500/20 z-10 scale-[1.01] animate-pulse'
                              : isUserIncorrect
                              ? 'fluent-option-btn border-rose-500 shadow-[0_0_20px_rgba(244,63,94,0.4)] bg-rose-500/20 z-10 scale-[1.01]'
                              : isSelected
                              ? 'fluent-option-btn selected shadow-[0_0_20px_rgba(247,202,201,0.2)] z-10 scale-[1.01]'
                              : hasVotedThisQuestion
                              ? 'fluent-option-btn opacity-40 hover:opacity-70 scale-[0.98]'
                              : 'fluent-option-btn'
                          }`}
                        >
                          {/* Network LED */}
                          <div 
                            className={`absolute top-2 right-2 w-1.5 h-1.5 rounded-full z-20 shadow-[0_0_8px_currentColor] ${
                              networkStatus === 'OFFLINE' ? 'bg-rose-500 text-rose-500 animate-pulse' :
                              networkStatus === 'DELAYED' ? 'bg-amber-400 text-amber-400' :
                              'bg-emerald-500 text-emerald-500'
                            }`}
                            title={
                              networkStatus === 'OFFLINE' ? t("view_net_offline", localLanguage) :
                              networkStatus === 'DELAYED' ? t("view_net_slow", localLanguage) :
                              t("view_net_stable", localLanguage)
                            }
                          />

                          {/* Subtle Progress Bar at the top of the button */}
                          {gameState.status === 'ACTIVE' && (
                            <div className="absolute top-0 left-0 right-0 h-1 bg-black/20 z-0">
                              <div 
                                className="h-full"
                                style={{ 
                                  width: `${timerProgress}%`, 
                                  backgroundColor: interpolateTimerColor(timerProgress),
                                  transition: 'width 1s linear, background-color 1s linear' 
                                }}
                              />
                            </div>
                          )}

                          {/* Glow Overlay when selected */}
                          {isSelected && (
                            <div className="absolute inset-0 bg-gradient-to-r from-[#F7CAC9]/20 via-white/10 to-transparent animate-pulse pointer-events-none" />
                          )}

                          {/* Option Key Badge with keyboard hint */}
                          <div className="flex flex-col items-center gap-1 shrink-0 relative z-10">
                            <div
                              className={`w-10 h-10 rounded-[2px] font-mono font-black text-base flex items-center justify-center transition-all ${
                                isSelected
                                  ? 'bg-[#F7CAC9] text-[#0D0420] shadow-[0_0_15px_rgba(247,202,201,0.8)]'
                                  : 'fluent-option-badge text-[#F7CAC9]'
                              }`}
                            >
                              {key}
                            </div>
                            <span className="text-[9px] font-mono text-amber-300 font-bold hidden sm:inline px-1 py-0.5 rounded-[2px] bg-white/10 border border-white/15">
                              [{numKey}]
                            </span>
                          </div>

                          {/* Option Text & Image */}
                          <div className="flex-1 pt-1 relative z-10 flex flex-col gap-2">
                            {gameState.option_images?.[key] && (
                              <img src={gameState.option_images[key]} alt={`Option ${key}`} className="w-full h-32 object-cover rounded-[2px] shadow-sm border border-white/10" />
                            )}
                            <div
                              className={`text-sm sm:text-base font-bold ${
                                isSelected ? 'text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]' : 'text-slate-200'
                              } ${isCjk(displayText, localLanguage) ? 'cjk-text tracking-wide leading-loose' : 'leading-snug'}`}
                            >
                              {displayText}
                            </div>
                          </div>

                          {isSelected && (
                            <div className="absolute top-3 right-3 flex items-center gap-1.5 relative z-10">
                              <span className={`text-[10px] font-mono font-black px-2 py-0.5 rounded-[2px] flex items-center gap-1 ${
                                isPendingSync
                                  ? 'bg-amber-400/20 text-amber-300 border border-amber-400/50'
                                  : 'bg-[#F7CAC9] text-[#0D0420] shadow-[0_0_10px_rgba(247,202,201,0.6)] animate-pulse'
                              }`}>
                                {isPendingSync ? <RefreshCw className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                                {isPendingSync ? (t("view_syncing", localLanguage)) : (t("view_you_chose_final", localLanguage))}
                              </span>
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* User current choice confirmation footer */}
              {hasVotedThisQuestion && (
                <div className="p-3.5 rounded-[2px] fluent-box-nested text-xs text-[#FCEEEC] flex flex-col sm:flex-row sm:items-center justify-between mt-2 shadow-inner gap-2">
                  <div className="flex flex-col gap-1.5">
                    <span className="flex items-center gap-2">
                      {isPendingSync ? <RefreshCw className="w-4 h-4 text-amber-400 animate-spin" /> : <CheckCircle2 className="w-4 h-4 text-[#F7CAC9]" />} 
                      {isPendingSync ? t("active_syncing", localLanguage) : t("active_voted", localLanguage)} <strong className="text-white font-mono text-sm">[{selectedChoice}]</strong>
                    </span>
                    {!isPendingSync && pollStats.total > 1 && (
                      <span className="flex items-center gap-1.5 text-[11px] text-[#A78BFA] font-medium bg-purple-500/10 px-2 py-1 rounded-[2px] border border-purple-500/20 w-fit">
                        <Users className="w-3 h-3" />
                        {t("view_there_are", localLanguage)} {pollStats.percentages[selectedChoice] || 0}% ({Math.round(((pollStats.percentages[selectedChoice] || 0) * pollStats.total) / 100)} {t("active_similar_votes", localLanguage)})
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-[#B6A6D8] italic sm:text-right">
                    {t("view_can_change", localLanguage)}
                  </span>
                </div>
              )}
            </div>

          </div>
        </div>

        {/* Floating Companion Tab & Drawer */}
        <AudienceDesktopSidebar
          user={user}
          gameState={gameState}
          userPerformance={userPerformance}
          isHighContrast={isHighContrast}
          onToggleHighContrast={onToggleHighContrast}
          isWakeLockLocked={isWakeLockLocked}
          isWakeLockSupported={isWakeLockSupported}
          onToggleWakeLock={onToggleWakeLock}
          onOpenShareModal={() => setIsShareModalOpen(true)}
          onOpenProfile={onOpenProfile}
          onOpenLogModal={onOpenLogModal || (() => setIsLogModalOpen(true))}
          onOpenQAModal={onOpenQAModal}
          selectedChoice={selectedChoice}
          hasVotedThisQuestion={hasVotedThisQuestion}
          timeLeft={timeLeft}
          lastKeyPressed={lastKeyPressed}
        />

        {/* Floating Quick Share Button */}

        <ShareGameModal
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
          gameTitle="Beyond The Internet 2026"
          roundName={gameState.round_name || gameState.category}
        />
      </div>
    );
  }

  // ==========================================
  // STATE 3: LOCKED
  // CRITICAL SECURITY: NO GREEN/RED, NO ANSWERS REVEALED
  // ==========================================
  if (gameState.status === 'LOCKED') {
    return (
      <div
        id="audience-state-locked"
        className="max-w-5xl w-full mx-auto p-4 sm:p-6 text-white relative animate-fadeIn"
      >
        {/* Main Locked Status Card */}
        <div className="w-full fluent-box rounded-[2px] p-6 sm:p-8 text-center shadow-2xl">
          <div className="w-16 h-16 rounded-[2px] bg-white/10 text-amber-400 border border-amber-500/30 flex items-center justify-center mx-auto mb-5 shadow-lg">
            <Lock className="w-8 h-8" />
          </div>

          <div className="inline-block px-3 py-1 rounded-[2px] text-xs font-bold uppercase tracking-wider bg-white/10 text-amber-400 border border-amber-500/30 mb-3">
            {t("view_timeout", localLanguage)}
          </div>

          <h2 className="text-xl sm:text-2xl font-black text-slate-100 mb-3">
            {t("view_locked", localLanguage)}
          </h2>

          <div className="my-6 p-4 rounded-[2px] fluent-box-nested max-w-md mx-auto">
            {selectedChoice ? (
              <div>
                <p className="text-xs text-[#B6A6D8] mb-1">{t("view_recorded_choice", localLanguage)}</p>
                <div className="text-2xl font-black font-mono text-[#F7CAC9]">
                  {t("view_option", localLanguage)} [{selectedChoice}]
                </div>
              </div>
            ) : (
              <div className="text-sm text-[#B6A6D8]">
                {t("view_no_record", localLanguage)}
              </div>
            )}
          </div>

          <p className="text-sm sm:text-base text-[#B6A6D8] italic leading-relaxed max-w-lg mx-auto">
            &ldquo;{t("view_recorded_wait", localLanguage)}&rdquo;
          </p>

          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
            <QuestionLikeButton
              questionId={gameState.question_id}
              user={user}
              gameState={gameState}
              variant="standard"
            />
          </div>

          <div className="mt-4 flex items-center justify-center gap-2 text-xs text-slate-500">
            <span className="w-2 h-2 rounded-full bg-[#F7CAC9] animate-pulse" />
            {t("view_wait_reveal", localLanguage)}
          </div>

          <button
            id="btn-audience-share-locked"
            type="button"
            onClick={() => {
              soundFx.playClick();
              setIsShareModalOpen(true);
            }}
            className="max-w-xs mx-auto mt-5 py-2.5 px-4 rounded-[2px] bg-white/10 hover:bg-white/20 border border-white/10 text-[#FCEEEC] font-bold text-xs flex items-center justify-center gap-2 transition hover-effect"
          >
            <QrCode className="w-4 h-4 text-[#F7CAC9]" />
            <span>{t("view_share_game", localLanguage)}</span>
          </button>
        </div>

        {/* Floating Companion Tab & Drawer */}
        <AudienceDesktopSidebar
          user={user}
          gameState={gameState}
          userPerformance={userPerformance}
          isHighContrast={isHighContrast}
          onToggleHighContrast={onToggleHighContrast}
          isWakeLockLocked={isWakeLockLocked}
          isWakeLockSupported={isWakeLockSupported}
          onToggleWakeLock={onToggleWakeLock}
          onOpenShareModal={() => setIsShareModalOpen(true)}
          onOpenProfile={onOpenProfile}
          onOpenLogModal={onOpenLogModal || (() => setIsLogModalOpen(true))}
          onOpenQAModal={onOpenQAModal}
          selectedChoice={selectedChoice}
          hasVotedThisQuestion={hasVotedThisQuestion}
          timeLeft={timeLeft}
          lastKeyPressed={lastKeyPressed}
        />

        {/* Floating Quick Share Button */}

        <ShareGameModal
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
          gameTitle="Beyond The Internet 2026"
          roundName={gameState.round_name || gameState.category}
        />
      </div>
    );
  }

  // ==========================================
  // STATE 4: REVEAL
  // Show correctness, theoretical explanation & vote percentage bars
  // ==========================================
  if (gameState.status === 'REVEAL') {
    const effectiveChoice = selectedChoice || (user?.uid ? responses[user.uid]?.choice : '') || '';
    const userChoice = effectiveChoice.trim().toUpperCase();
    const correctKey = (gameState.correct_key || '').trim().toUpperCase();
    const hasAnswered = Boolean(userChoice);
    const isTf4 = gameState.round_type === 'TRUE_FALSE_4';
    const isShort = gameState.round_type === 'SHORT_ANSWER';

    let tfCorrectCount = 0;
    const tfSubResults: { key: string; label: string; userAns: string; officialAns: string; isItemCorrect: boolean }[] = [];

    if (isTf4) {
      Object.entries(activeOptions || gameState.options || {}).forEach(([k, label]) => {
        let official = '';
        const match = gameState.correct_key.match(new RegExp(`${k}\\s*:\\s*([ĐSđsTFtf])`, 'i'));
        if (match) {
          const val = match[1].toUpperCase();
          official = (val === 'Đ' || val === 'T') ? t("view_tf_true", localLanguage) : t("view_tf_false", localLanguage);
        }

        let userVal = '';
        const userMatch = userChoice.match(new RegExp(`${k}\\s*:\\s*([ĐSđsTFtf])`, 'i'));
        if (userMatch) {
          const val = userMatch[1].toUpperCase();
          userVal = (val === 'Đ' || val === 'T') ? t("view_tf_true", localLanguage) : t("view_tf_false", localLanguage);
        }

        const isItemCorrect = Boolean(userVal && official && userVal === official);
        if (isItemCorrect) tfCorrectCount++;

        tfSubResults.push({
          key: k,
          label: String(label || ''),
          userAns: userVal || t("view_not_chosen", localLanguage),
          officialAns: official || 'N/A',
          isItemCorrect
        });
      });
    }

    const isCorrect = isTf4
      ? tfCorrectCount === tfSubResults.length
      : isShort
      ? hasAnswered && (userChoice === correctKey || normalizeVcnvAnswer(userChoice) === normalizeVcnvAnswer(correctKey))
      : hasAnswered && userChoice === correctKey;

    return (
      <div
        id="audience-state-reveal"
        className="max-w-5xl w-full mx-auto p-4 sm:p-6 text-white relative animate-fadeIn"
      >
        <div className="space-y-6">
        {/* Result Announcement Hero Card */}
        <div
          className={`fluent-box rounded-[2px] p-6 sm:p-8 text-center shadow-2xl relative overflow-hidden ${
            !hasAnswered
              ? 'border-white/10'
              : isCorrect
              ? 'bg-gradient-to-b from-emerald-950/90 to-[#241148]/80 border-emerald-500/50 shadow-emerald-500/20'
              : isTf4 && tfCorrectCount > 0
              ? 'bg-gradient-to-b from-amber-950/90 to-[#241148]/80 border-amber-500/50 shadow-amber-500/20'
              : 'bg-gradient-to-b from-rose-950/90 to-[#241148]/80 border-rose-500/50 shadow-rose-500/20'
          }`}
        >
          <div className="w-16 h-16 rounded-[2px] mx-auto mb-4 flex items-center justify-center shadow-lg">
            {!hasAnswered ? (
              <div className="w-16 h-16 rounded-[2px] fluent-box-nested text-[#B6A6D8] flex items-center justify-center">
                <HelpCircle className="w-8 h-8" />
              </div>
            ) : isCorrect ? (
              <div className="w-16 h-16 rounded-[2px] bg-emerald-500 text-[#0D0420] flex items-center justify-center shadow-emerald-500/30">
                <CheckCircle2 className="w-10 h-10" />
              </div>
            ) : isTf4 && tfCorrectCount > 0 ? (
              <div className="w-16 h-16 rounded-[2px] bg-amber-500 text-[#0D0420] flex items-center justify-center shadow-amber-500/30 font-black text-xl font-mono">
                {tfCorrectCount}/4
              </div>
            ) : (
              <div className="w-16 h-16 rounded-[2px] bg-rose-500 text-white flex items-center justify-center shadow-rose-500/30">
                <XCircle className="w-10 h-10" />
              </div>
            )}
          </div>

          <div className="text-xs font-bold uppercase tracking-widest text-[#B6A6D8] mb-1">
            {gameState.round_name} • {gameState.category}
          </div>

          <h2 className="text-2xl sm:text-3xl font-black mb-2">
            {!hasAnswered
              ? t("view_you_no_ans", localLanguage)
              : isCorrect
              ? t("view_result_correct", localLanguage)
              : isTf4
              ? t("view_result_partial", localLanguage).replace("{count}", String(tfCorrectCount))
              : t("view_result_incorrect", localLanguage)}
          </h2>

          {!isTf4 && (
            <div className="flex items-center justify-center gap-3 mt-4">
              <div className="p-3 fluent-box-nested rounded-[2px] text-xs">
                <span className="text-[#B6A6D8] block mb-0.5">{t("view_your_choice", localLanguage)}</span>
                <strong
                  className={`font-mono text-base font-bold ${
                    !hasAnswered
                      ? 'text-slate-500'
                      : isCorrect
                      ? 'text-emerald-400'
                      : 'text-rose-400'
                  }`}
                >
                  {userChoice ? `[${userChoice}]` : t("view_no_ans", localLanguage)}
                </strong>
              </div>

              <div className="p-3 fluent-box-nested rounded-[2px] border-emerald-500/40 text-xs">
                <span className="text-emerald-400 block mb-0.5">{t("view_mc_ans", localLanguage)}</span>
                <strong className="font-mono text-base font-black text-emerald-300">
                  [{correctKey}]
                </strong>
                {revealShortAnswerTranslation.text && (
                  <span className="block text-[11px] text-emerald-200 mt-1 font-sans">
                    {revealShortAnswerTranslation.flag} {t("view_translated_label", localLanguage)} <strong>{revealShortAnswerTranslation.text}</strong>
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Round 4 All-In Bet Outcome Badge */}
          {isVeDichRound && responses[user?.uid || '']?.isDoubleDown && (
            <div className="mt-3 flex items-center justify-center">
              <div className={`px-3.5 py-1.5 rounded-[2px] font-mono font-black text-xs flex items-center gap-2 border shadow-lg ${
                isCorrect
                  ? 'bg-amber-400 text-black border-amber-300 shadow-amber-400/20'
                  : 'bg-rose-950/90 text-rose-200 border-rose-500/60 shadow-rose-950/40'
              }`}>
                <Flame className={`w-4 h-4 shrink-0 ${isCorrect ? 'text-black' : 'text-rose-400'}`} />
                <span>
                  {t("view_bet_reveal_badge", localLanguage)}{' '}
                  <strong className={isCorrect ? 'text-black underline' : 'text-rose-200 underline'}>
                    {isCorrect ? t("view_bet_outcome_win", localLanguage) : t("view_bet_outcome_loss", localLanguage)}
                  </strong>
                </span>
              </div>
            </div>
          )}

          {/* Upvote & Like Question Action */}
          <div className="mt-5 pt-4 border-t border-white/10 flex items-center justify-center gap-3">
            <span className="text-xs text-slate-300">{t("view_feedback", localLanguage)}</span>
            <QuestionLikeButton
              questionId={gameState.question_id}
              user={user}
              gameState={gameState}
              variant="pill"
            />
          </div>
        </div>
        {/* ORIGINAL QUESTION & OPTIONS (Injected to fix "che rùi" issue) */}
        <div className="fluent-box rounded-[2px] p-5 sm:p-6 shadow-xl mb-6">
          <div className="flex items-start justify-between gap-3 mb-4">
            <h3 className={`text-lg sm:text-xl font-black text-white ${isCjkQuestion ? 'cjk-text tracking-wide leading-loose' : 'leading-relaxed'} ${isKoreanQuestion ? 'korean-question-font' : ''}`} data-question-text="true">
              {activeQuestionText}
            </h3>
            <button
              type="button"
              onClick={handleToggleSpeakQuestion}
              className={`p-1.5 rounded-[2px] border transition shadow-sm cursor-pointer shrink-0 ${
                isSpeakingQuestion
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/50 animate-pulse'
                  : 'bg-white/5 hover:bg-white/15 text-white/80 hover:text-white border-white/10'
              }`}
              title={isSpeakingQuestion ? t("view_tts_stop", localLanguage) : t("view_tts_start", localLanguage)}
            >
              {isSpeakingQuestion ? (
                <VolumeX className="w-4 h-4 text-emerald-400 animate-pulse" />
              ) : (
                <Volume2 className="w-4 h-4 text-[#F7CAC9]" />
              )}
            </button>
          </div>
          <div className={`grid grid-cols-1 sm:grid-cols-2 gap-3`}>
            {Object.entries(activeOptions || gameState.options || {}).map(([key, label]) => {
              const serverCorrectKey = (gameState.correct_key || '').trim().toUpperCase();
              const isSelected = (selectedChoice || "").toUpperCase() === key.toUpperCase();
              const isCorrectAnswer = serverCorrectKey && key.toUpperCase() === serverCorrectKey;
              const isUserIncorrect = hasAnswered && isSelected && serverCorrectKey && key.toUpperCase() !== serverCorrectKey;
              
              return (
                <div
                  key={key}
                  className={`relative w-full p-4 sm:p-5 rounded-[2px] text-left flex items-start gap-3.5 select-none overflow-hidden transition-all duration-300 ${
                    isCorrectAnswer
                      ? 'fluent-option-btn border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.4)] bg-emerald-500/20 z-10 scale-[1.01] animate-pulse'
                      : isUserIncorrect
                      ? 'fluent-option-btn border-rose-500 shadow-[0_0_20px_rgba(244,63,94,0.4)] bg-rose-500/20 z-10 scale-[1.01]'
                      : isSelected
                      ? 'fluent-option-btn selected shadow-[0_0_20px_rgba(247,202,201,0.2)] z-10 scale-[1.01]'
                      : 'fluent-option-btn opacity-40 hover:opacity-70 scale-[0.98]'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-[2px] flex items-center justify-center shrink-0 font-black font-mono text-base sm:text-lg border ${
                    isCorrectAnswer ? 'bg-emerald-500 text-white border-emerald-400' :
                    isUserIncorrect ? 'bg-rose-500 text-white border-rose-400' :
                    isSelected ? 'bg-white text-[#0D0420] border-white' : 
                    'bg-[#F7CAC9]/10 text-[#F7CAC9] border-[#F7CAC9]/30'
                  }`}>
                    {key}
                  </div>
                  <span className={`text-sm sm:text-base font-medium flex-1 ${isSelected || isCorrectAnswer ? 'text-white' : 'text-slate-300'} ${isCjk(label, localLanguage) ? 'cjk-text tracking-wide leading-loose' : 'leading-snug'}`}>
                    {label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>


        {/* TF4 Detailed Item Breakdown */}
        {isTf4 && (
          <div className="fluent-box rounded-[2px] p-5 space-y-3 shadow-xl">
            <div className="text-xs font-bold font-mono text-[#F7CAC9] uppercase tracking-wider pb-2 border-b border-white/10 flex items-center justify-between">
              <span>{t("view_compare_result", localLanguage)}</span>
              <span className="text-white">{t("view_score", localLanguage)} {tfCorrectCount}/4</span>
            </div>

            <div className="space-y-2.5">
              {tfSubResults.map((item) => (
                <div
                  key={item.key}
                  className={`p-3.5 rounded-[2px] border flex items-center justify-between gap-3 ${
                    item.isItemCorrect
                      ? 'fluent-box-nested border-emerald-500/40'
                      : 'fluent-box-nested border-rose-500/40'
                  }`}
                >
                  <div className="flex items-start gap-2.5 flex-1 min-w-0">
                    <span className="w-6 h-6 rounded-[2px] bg-[#3E1D74]/50 text-[#FCEEEC] font-mono font-bold text-xs flex items-center justify-center shrink-0 border border-white/10">
                      {item.key}
                    </span>
                    <p className="text-xs sm:text-sm text-slate-200 line-clamp-2">
                      {item.label}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 font-mono text-xs">
                    <span className="px-2 py-1 rounded-[2px] bg-[#0D0420]/50 text-[#B6A6D8] border border-white/10">
                      {t("view_you", localLanguage)} <strong className={(item.userAns === 'ĐÚNG' || item.userAns === 'TRUE') ? 'text-emerald-400' : 'text-rose-400'}>{item.userAns}</strong>
                    </span>
                    <span className="px-2 py-1 rounded-[2px] bg-[#0D0420]/50 text-slate-200 border border-white/10">
                      {t("view_standard", localLanguage)} <strong className={(item.officialAns === 'ĐÚNG' || item.officialAns === 'TRUE') ? 'text-emerald-400' : 'text-rose-400'}>{item.officialAns}</strong>
                    </span>
                    {item.isItemCorrect ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                    ) : (
                      <XCircle className="w-5 h-5 text-rose-400 shrink-0" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Theoretical Explanation (Bóc tách bẫy tâm lý / Chuẩn Thông tư 02) */}
        {activeExplanation && (
          <div className="fluent-box rounded-[2px] p-5 sm:p-6 shadow-xl border-[#F7CAC9]/30">
            <div className="flex items-center gap-2 text-[#F7CAC9] text-xs font-bold uppercase tracking-wider mb-2">
              <Sparkles className="w-4 h-4" /> {t("view_theory", localLanguage)}
            </div>
            <p className={`text-sm sm:text-base text-slate-200 ${isCjk(activeExplanation, localLanguage) ? 'cjk-text tracking-wide leading-loose' : 'leading-relaxed'}`}>
              {activeExplanation}
            </p>
          </div>
        )}

        {/* AI Instant Explanation Module (Hỏi Nhanh Vì Sao - Nhóm 2) */}
        <div className="fluent-box rounded-[2px] p-4 sm:p-5 shadow-xl border-purple-500/30 bg-purple-950/20">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-[2px] bg-purple-500/20 text-purple-300 shrink-0">
                <Sparkles className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-white flex items-center gap-1.5">
                  <span>AI Trợ Lý Học Tập</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-[2px] bg-purple-500/30 text-purple-200 border border-purple-400/40">
                    HỎI NHANH VÌ SAO
                  </span>
                </h4>
                <p className="text-xs text-purple-200/80 mt-0.5">
                  Chưa hiểu rõ vì sao đáp án này đúng? Bấm để nhận phân tích tức thì từ Gemini AI.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleRequestAiExplanation}
              disabled={isAiExplaining}
              className="px-3.5 py-2 rounded-[2px] bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md transition shrink-0 cursor-pointer"
            >
              {isAiExplaining ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-white" />
                  <span>Đang giải thích...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-purple-200" />
                  <span>{aiExplanation ? 'Giải thích lại' : 'Hỏi AI vì sao đúng'}</span>
                </>
              )}
            </button>
          </div>

          {aiExplanation && (
            <div className="mt-3.5 pt-3 border-t border-purple-500/20 animate-fadeIn">
              <div className="p-3.5 rounded-[2px] bg-black/40 border border-purple-500/30 text-xs sm:text-sm text-purple-100 leading-relaxed whitespace-pre-wrap">
                {aiExplanation}
              </div>
            </div>
          )}
        </div>

        {/* Audience Voting Percentage Bar Chart */}
        <div className="fluent-box rounded-[2px] p-5 sm:p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-slate-200 text-sm font-bold">
              <BarChart3 className="w-4 h-4 text-[#F7CAC9]" />
              {t("view_audience_poll", localLanguage)}
            </div>
            <span className="text-xs font-mono text-[#B6A6D8]">
              {t("view_total_votes", localLanguage)} <strong>{voteStats.totalVotes}</strong>
            </span>
          </div>

          <div className="space-y-3">
            {gameState.round_type === 'TRUE_FALSE_4' && tfStats ? (
              Object.entries(activeOptions || gameState.options || {}).map(([key, label]) => {
                const stat = tfStats[key] || { D: 0, S: 0, total: 0 };
                const totalStatementVotes = stat.total;
                const percentD = totalStatementVotes > 0 ? Math.round((stat.D / totalStatementVotes) * 100) : 0;
                const percentS = totalStatementVotes > 0 ? Math.round((stat.S / totalStatementVotes) * 100) : 0;
                
                return (
                  <div key={key} className="space-y-2 p-3 bg-black/40 rounded-[2px] border border-white/5">
                    <div className="text-xs text-[#B6A6D8] font-medium leading-relaxed break-words">
                      <span className="font-mono font-bold text-white px-1.5 py-0.5 rounded-[2px] bg-white/10 mr-1.5">{key}</span>
                      <span className={isCjk(label, localLanguage) ? 'cjk-text tracking-wide leading-loose' : ''}>{label}</span>
                    </div>
                    
                    <div className="flex gap-2 w-full h-4 rounded-[2px] overflow-hidden bg-[#0D0420]/50 border border-white/10 p-0.5">
                      {percentD > 0 && (
                        <div 
                          className="h-full rounded-[2px] bg-emerald-400/80 transition-all duration-700 flex items-center justify-center overflow-hidden"
                          style={{ width: `${percentD}%` }}
                        >
                          {percentD > 15 && <span className="text-[9px] font-mono text-emerald-950 font-bold px-1">{t("view_tf_true", localLanguage)} {percentD}%</span>}
                        </div>
                      )}
                      {percentS > 0 && (
                        <div 
                          className="h-full rounded-[2px] bg-rose-400/80 transition-all duration-700 flex items-center justify-center overflow-hidden"
                          style={{ width: `${percentS}%` }}
                        >
                          {percentS > 15 && <span className="text-[9px] font-mono text-rose-950 font-bold px-1">{t("view_tf_false", localLanguage)} {percentS}%</span>}
                        </div>
                      )}
                    </div>
                    <div className="flex justify-between text-[10px] font-mono text-white/50">
                      <span>{t("view_true", localLanguage)} {stat.D} {t("view_votes", localLanguage)}</span>
                      <span>{t("view_false", localLanguage)} {stat.S} {t("view_votes", localLanguage)}</span>
                    </div>
                  </div>
                );
              })
            ) : (gameState.round_type === 'SHORT_ANSWER' || gameState.round_type === 'FILL_IN_BLANK' || gameState.round_type === 'SEQUENCING' || gameState.round_type === 'VCNV') && shortStats ? (
              shortStats.list.length === 0 ? (
                <div className="text-center text-white/40 text-xs py-4 font-mono">{t("view_wait_ans", localLanguage)}</div>
              ) : (
                <div className="space-y-2">
                  {shortStats.list.map((item, idx) => {
                    const percent = shortStats.total > 0 ? Math.round((item.count / shortStats.total) * 100) : 0;
                    return (
                      <div key={idx} className="space-y-1">
                        <div className="flex items-start justify-between text-xs gap-3">
                          <div className="flex items-start gap-1.5 flex-1 min-w-0">
                            <span className="font-mono font-bold px-1.5 py-0.5 rounded-[2px] shrink-0 mt-0.5 bg-white/10 text-white break-all">
                              {item.raw}
                            </span>
                            {item.raw === userChoice && (
                              <span className="text-[10px] bg-[#F7CAC9]/20 text-[#FCEEEC] px-1.5 py-0.5 rounded-[2px] shrink-0 mt-0.5">
                                {t("view_you_chose", localLanguage)}
                              </span>
                            )}
                          </div>
                          <span className="font-mono text-[#B6A6D8] shrink-0 mt-0.5">
                            {item.count} {t("view_votes", localLanguage)} ({percent}%)
                          </span>
                        </div>
                        <div className="w-full h-3 bg-[#0D0420]/50 rounded-[2px] overflow-hidden p-0.5 border border-white/10">
                          <div
                            className="h-full rounded-[2px] transition-all duration-700 bg-amber-400"
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
            ) : (
              Object.entries(activeOptions || gameState.options || {}).map(([key, label]) => {
              const count = voteStats.counts[key] || 0;
              const percent = voteStats.totalVotes > 0
                ? Math.round((count / voteStats.totalVotes) * 100)
                : 0;
              const isOfficialKey = key.toUpperCase() === correctKey;
              const isUserPick = key.toUpperCase() === userChoice;

              return (
                <div key={key} className="space-y-1">
                  <div className="flex items-start justify-between text-xs gap-3">
                    <div className="flex items-start gap-1.5 flex-1 min-w-0">
                      <span
                        className={`font-mono font-bold px-1.5 py-0.5 rounded-[2px] shrink-0 mt-0.5 ${
                          isOfficialKey
                            ? 'bg-white/10 text-emerald-400 border border-emerald-500/40'
                            : 'fluent-box-nested text-[#B6A6D8]'
                        }`}
                      >
                        {key}
                      </span>
                      <span className={`text-[#B6A6D8] font-medium break-words ${isCjk(label, localLanguage) ? 'cjk-text tracking-wide leading-loose' : 'leading-relaxed'}`}>
                        {label}
                      </span>
                      {isUserPick && (
                        <span className="text-[10px] bg-[#F7CAC9]/20 text-[#FCEEEC] px-1.5 py-0.5 rounded-[2px] shrink-0 mt-0.5">
                          {t("view_you_chose", localLanguage)}
                        </span>
                      )}
                    </div>
                    <span className="font-mono text-[#B6A6D8] shrink-0 mt-0.5">
                      {count} {t("view_votes", localLanguage)} ({percent}%)
                    </span>
                  </div>

                  {/* Visual Bar */}
                  <div className="w-full h-3 bg-[#0D0420]/50 rounded-[2px] overflow-hidden p-0.5 border border-white/10">
                    <div
                      className={`h-full rounded-[2px] transition-all duration-700 ${
                        isOfficialKey
                          ? 'bg-emerald-400 shadow-sm shadow-emerald-400/50'
                          : isUserPick
                          ? 'bg-[#F7CAC9]'
                          : 'bg-[#3E1D74]/70'
                      }`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              );
            })
          )}
          </div>
        </div>

        {/* Bottom Share Game Callout */}
        <div className="flex justify-center pt-2">
          <button
            id="btn-audience-share-reveal"
            type="button"
            onClick={() => {
              soundFx.playClick();
              setIsShareModalOpen(true);
            }}
            className="py-3 px-5 rounded-[2px] bg-[#F7CAC9]/15 hover:bg-[#F7CAC9]/25 border border-[#F7CAC9]/30 text-[#FCEEEC] font-bold text-xs flex items-center justify-center gap-2 transition hover-effect"
          >
            <QrCode className="w-4 h-4 text-[#F7CAC9]" />
            <span>{t("view_share_qr_alt", localLanguage)}</span>
          </button>
        </div>
      </div>

      {/* Floating Companion Tab & Drawer */}
      <AudienceDesktopSidebar
        user={user}
        gameState={gameState}
        userPerformance={userPerformance}
        isHighContrast={isHighContrast}
        onToggleHighContrast={onToggleHighContrast}
        isWakeLockLocked={isWakeLockLocked}
        isWakeLockSupported={isWakeLockSupported}
        onToggleWakeLock={onToggleWakeLock}
        onOpenShareModal={() => setIsShareModalOpen(true)}
        onOpenProfile={onOpenProfile}
        onOpenLogModal={onOpenLogModal || (() => setIsLogModalOpen(true))}
        onOpenQAModal={onOpenQAModal}
        selectedChoice={selectedChoice}
        hasVotedThisQuestion={hasVotedThisQuestion}
        timeLeft={timeLeft}
        lastKeyPressed={lastKeyPressed}
      />


        {/* Floating Quick Share Button */}

        <ShareGameModal
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
          gameTitle="Beyond The Internet 2026"
          roundName={gameState.round_name || gameState.category}
        />
      </div>
    );
  }

  return null;
  };
  return (
    <>
      {renderContent()}

      {/* Post-Match Infographic Achievement Card (Nhóm 4) */}
      <PostMatchCardModal
        isOpen={isPostMatchModalOpen}
        onClose={() => setIsPostMatchModalOpen(false)}
        user={user}
        totalScore={userPerformance?.totalScore || 0}
        rank={typeof userPerformance?.rank === 'number' ? userPerformance.rank : 1}
        totalContestants={survivalStats.totalContestants || userPerformance?.totalPlayers || 1}
        accuracyRate={userPerformance?.accuracyRate || 0}
        maxStreak={streakStats.maxStreak}
        isSurvivor={survivalStats.isUserAlive}
      />
    </>
  );
};

export const AudienceView: React.FC<AudienceViewProps> = (props) => {
  const { localLanguage } = useLanguage();

  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  
  const [isCheerModalOpen, setIsCheerModalOpen] = useState(false);
  const [isQAModalOpen, setIsQAModalOpen] = useState(false);
  const [isShoutModalOpen, setIsShoutModalOpen] = useState(false);
  const [isPostMatchModalOpen, setIsPostMatchModalOpen] = useState(false);
  const [qaModalInitialTab, setQaModalInitialTab] = useState<'ASK' | 'MY_QUESTIONS' | 'COMMUNITY'>('ASK');
  const handleOpenLogModal = props.onOpenLogModal || (() => setIsLogModalOpen(true));
  const handleOpenShareModal = props.onOpenShareModal || (() => setIsShareModalOpen(true));
  const handleOpenCheerModal = () => setIsCheerModalOpen(true);
  const handleOpenShoutModal = () => setIsShoutModalOpen(true);
  const handleOpenPostMatchModal = () => setIsPostMatchModalOpen(true);
  const handleOpenQAModal = (tab: 'ASK' | 'MY_QUESTIONS' | 'COMMUNITY' = 'ASK') => {
    setQaModalInitialTab(tab);
    setIsQAModalOpen(true);
  };

    // Mini-Tip Quick Guide state
  const [showMiniTip, setShowMiniTip] = useState<boolean>(false);
  const [tipQuestionId, setTipQuestionId] = useState<string>('');

  const hasAnnouncer = Boolean(props.gameState.announcer_overlay?.active && props.gameState.announcer_overlay?.text?.trim());
  const isHighContrast = Boolean(props.isHighContrast);
  const { isSupported: isWakeLockSupported, isLocked: isWakeLockLocked, toggleLock: toggleWakeLock } = useScreenWakeLock(true);

  // Compute live user score & stats for post-match card generator
  const audienceScoreState = useMemo(() => {
    return computeAudienceScoreFromResponses(props.allResponses || {}, props.user?.uid, props.user?.mssv, undefined, props.gameState);
  }, [props.allResponses, props.user?.uid, props.user?.mssv, props.gameState]);

  const survivalStats = useMemo(() => {
    return calculateSurvivalStats(props.allResponses, undefined, props.gameState, props.user?.uid, props.user?.mssv);
  }, [props.allResponses, props.gameState, props.user?.uid, props.user?.mssv]);

  const streakStats = useMemo(() => {
    const history = audienceScoreState.history || [];
    let currentStreak = 0;
    let maxStreak = 0;
    let temp = 0;
    for (const item of history) {
      if (item.is_correct) {
        temp++;
        if (temp > maxStreak) maxStreak = temp;
      } else {
        temp = 0;
      }
    }
    for (let i = history.length - 1; i >= 0; i--) {
      if (history[i].is_correct) {
        currentStreak++;
      } else {
        break;
      }
    }
    return { currentStreak, maxStreak };
  }, [audienceScoreState.history]);

  const leaderboard = useMemo(() => {
    return calculateLeaderboard(props.allResponses || {}, undefined, props.gameState);
  }, [props.allResponses, props.gameState]);

  const myData = useMemo(() => {
    return leaderboard.find(u => u.uid === props.user?.uid || (props.user?.mssv && u.mssv === props.user.mssv));
  }, [leaderboard, props.user?.uid, props.user?.mssv]);

  return (
    <div className={`flex flex-col h-full relative transition-all duration-300 ${isHighContrast ? 'audience-high-contrast bg-black/50 backdrop-blur-[24px] saturate-150' : ''}`}>
      <ScoreDisplay 
        user={props.user} 
        allResponses={props.allResponses || {}} 
        gameState={props.gameState} 
        isHighContrast={isHighContrast}
        onToggleHighContrast={props.onToggleHighContrast}
        isWakeLockLocked={isWakeLockLocked}
        isWakeLockSupported={isWakeLockSupported}
        onToggleWakeLock={toggleWakeLock}
        onOpenLogModal={handleOpenLogModal}
        onOpenPostMatchModal={handleOpenPostMatchModal}
      />

      {/* Real-time Audience Shout Marquee Bar */}
      <AudienceShoutMarquee
        user={props.user}
        onOpenShoutModal={handleOpenShoutModal}
        variant="audience"
        isHighContrast={isHighContrast}
      />

      <div className="px-3 sm:px-6 pt-2 max-w-7xl mx-auto w-full z-40 relative">
        <NextQuestionCountdown gameState={props.gameState} compact={false} />
      </div>
      <div className={`flex-1 overflow-x-hidden ${hasAnnouncer ? 'pb-44 sm:pb-16' : 'pb-32 sm:pb-0'}`}>
        <AudienceViewContent 
          {...props} 
          onOpenLogModal={handleOpenLogModal}
          onOpenShareModal={handleOpenShareModal}
          onOpenQAModal={handleOpenQAModal}
          onOpenPostMatchModal={handleOpenPostMatchModal}
          isWakeLockLocked={isWakeLockLocked}
          isWakeLockSupported={isWakeLockSupported}
          onToggleWakeLock={toggleWakeLock}
        />
      </div>

      {/* Floating Audience Action Group (Desktop / Tablet only) */}
      <div className="hidden sm:inline-flex fixed left-4 bottom-6 z-40 fluent-action-group shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
        <button
          id="btn-audience-shout-floating"
          type="button"
          onClick={() => {
            vibrateSelection();
            soundFx.playTing();
            setIsShoutModalOpen(true);
          }}
          className="fluent-action-btn text-pink-300 bg-pink-500/10 hover:bg-pink-500/20 border-pink-500/20 hover:border-pink-500/30"
          title={t("view_nav_shout_mq", localLanguage)}
        >
          <Megaphone className="w-[14px] h-[14px] text-pink-400" />
          <span className="font-bold tracking-wide">{t("view_shout", localLanguage)}</span>
        </button>

        <button
          id="btn-audience-cheer-floating"
          type="button"
          onClick={() => {
            vibrateSelection();
            soundFx.playTing();
            setIsCheerModalOpen(true);
          }}
          className="fluent-action-btn text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border-rose-500/20 hover:border-rose-500/30"
          title={t("view_nav_cheer", localLanguage)}
        >
          <Heart className="w-[14px] h-[14px] fill-current animate-pulse text-rose-400" />
          <span className="font-bold tracking-wide">{t("view_cheer", localLanguage)}</span>
        </button>

        <button
          id="btn-audience-qa-floating"
          type="button"
          onClick={() => {
            vibrateSelection();
            soundFx.playTing();
            setIsQAModalOpen(true);
          }}
          className="fluent-action-btn text-sky-300 bg-sky-500/10 hover:bg-sky-500/20 border-sky-500/20 hover:border-sky-500/30"
          title={t("view_nav_qa", localLanguage)}
        >
          <MessageSquare className="w-[14px] h-[14px] text-sky-400" />
          <span className="font-bold tracking-wide">{t("view_qna", localLanguage)}</span>
        </button>

        <button
          id="btn-audience-postmatch-floating"
          type="button"
          onClick={() => {
            vibrateSelection();
            soundFx.playTing();
            handleOpenPostMatchModal();
          }}
          className="fluent-action-btn text-purple-300 bg-purple-500/10 hover:bg-purple-500/20 border-purple-500/20 hover:border-purple-500/30"
          title="Xuất Thẻ Thành Tích Infographic (Post-Match Card)"
        >
          <Sparkles className="w-[14px] h-[14px] text-amber-300 animate-pulse" />
          <span className="font-bold tracking-wide">Thẻ</span>
        </button>
      </div>

      {/* Mobile Bottom Navigation Bar (Optimized for iOS Safe Area & Touch Targets) */}
      <nav 
        id="audience-mobile-bottom-nav"
        aria-label={t("view_nav_audience", localLanguage)}
        className={`sm:hidden fixed bottom-0 left-0 right-0 min-h-[62px] h-[calc(58px+env(safe-area-inset-bottom,0px))] ${
        isHighContrast 
          ? 'bg-black/95 backdrop-blur-[24px] saturate-150 border-t-2 border-white/40 text-white' 
          : 'bg-[#140628]/95 backdrop-blur-xl border-t border-[#3E1D74]/70 shadow-[0_-10px_35px_rgba(0,0,0,0.6)]'
      } z-50 flex items-center justify-around px-1 pb-[env(safe-area-inset-bottom,6px)] pt-1`}
      >
        <button
          type="button"
          aria-label={t("view_nav_contest", localLanguage)}
          className={`flex flex-col items-center justify-center gap-1 min-w-[48px] min-h-[48px] w-full h-full active:scale-95 transition-transform ${
            isHighContrast ? 'text-white font-bold' : 'text-[#F7CAC9]'
          }`}
        >
          <Home className="w-5 h-5 drop-shadow-[0_0_8px_rgba(247,202,201,0.5)]" />
          <span className="text-[9px] font-bold tracking-tight">{t("view_contest", localLanguage)}</span>
          <span className="w-1 h-1 rounded-full bg-[#F7CAC9] mt-0.5" />
        </button>
        <button
          type="button"
          aria-label={t("view_nav_shout", localLanguage)}
          onClick={() => {
            vibrateSelection();
            soundFx.playTing();
            setIsShoutModalOpen(true);
          }}
          className={`flex flex-col items-center justify-center gap-1 min-w-[48px] min-h-[48px] w-full h-full active:scale-95 transition-transform ${
            isHighContrast ? 'text-pink-400 font-bold' : 'text-pink-400 hover:text-pink-300'
          }`}
        >
          <Megaphone className="w-5 h-5 text-pink-400 drop-shadow-[0_0_8px_rgba(244,114,182,0.5)]" />
          <span className="text-[9px] font-bold tracking-tight">{t("view_shout", localLanguage)}</span>
        </button>
        <button
          type="button"
          aria-label={t("view_nav_cheering", localLanguage)}
          onClick={() => {
            vibrateSelection();
            soundFx.playTing();
            setIsCheerModalOpen(true);
          }}
          className={`flex flex-col items-center justify-center gap-1 min-w-[48px] min-h-[48px] w-full h-full active:scale-95 transition-transform ${
            isHighContrast ? 'text-rose-400 font-bold' : 'text-rose-400 hover:text-rose-300'
          }`}
        >
          <Heart className="w-5 h-5 fill-current text-rose-400 animate-pulse drop-shadow-[0_0_8px_rgba(251,113,133,0.5)]" />
          <span className="text-[9px] font-bold tracking-tight">{t("view_cheer", localLanguage)}</span>
        </button>
        <button
          type="button"
          aria-label={t("view_nav_qna", localLanguage)}
          onClick={() => {
            vibrateSelection();
            soundFx.playTing();
            setIsQAModalOpen(true);
          }}
          className={`flex flex-col items-center justify-center gap-1 min-w-[48px] min-h-[48px] w-full h-full active:scale-95 transition-transform ${
            isHighContrast ? 'text-sky-400 font-bold' : 'text-sky-300 hover:text-sky-200'
          }`}
        >
          <MessageSquare className="w-5 h-5 text-sky-400 drop-shadow-[0_0_8px_rgba(56,189,248,0.5)]" />
          <span className="text-[9px] font-bold tracking-tight">{t("view_qna", localLanguage)}</span>
        </button>
        <button
          type="button"
          aria-label={t("view_nav_invite", localLanguage)}
          onClick={() => {
            vibrateTap();
            soundFx.playClick();
            handleOpenShareModal();
          }}
          className={`hidden min-[420px]:flex flex-col items-center justify-center gap-1 min-w-[48px] min-h-[48px] w-full h-full active:scale-95 transition-transform ${
            isHighContrast ? 'text-white/90 hover:text-white' : 'text-[#FCEEEC]/80 hover:text-white'
          }`}
        >
          <QrCode className="w-5 h-5 text-[#F7CAC9]" />
          <span className="text-[9px] font-bold tracking-tight">{t("view_invite", localLanguage)}</span>
        </button>
        <button
          type="button"
          aria-label={t("view_nav_log", localLanguage)}
          onClick={() => {
            vibrateTap();
            soundFx.playClick();
            handleOpenLogModal();
          }}
          className={`hidden min-[420px]:flex flex-col items-center justify-center gap-1 min-w-[48px] min-h-[48px] w-full h-full active:scale-95 transition-transform ${
            isHighContrast ? 'text-white/90 hover:text-white' : 'text-[#FCEEEC]/80 hover:text-white'
          }`}
        >
          <History className="w-5 h-5 text-[#F7CAC9]" />
          <span className="text-[9px] font-bold tracking-tight">{t("view_log", localLanguage)}</span>
        </button>
        <button
          type="button"
          aria-label={t("view_nav_profile", localLanguage)}
          onClick={() => {
            vibrateTap();
            props.onOpenProfile();
          }}
          className={`flex flex-col items-center justify-center gap-1 min-w-[48px] min-h-[48px] w-full h-full active:scale-95 transition-transform ${
            isHighContrast ? 'text-white/90 hover:text-white' : 'text-white/60 hover:text-white'
          }`}
        >
          <User className="w-5 h-5" />
          <span className="text-[9px] font-bold tracking-tight">{t("view_profile", localLanguage)}</span>
        </button>
      </nav>

      {/* Audience Shout Modal */}
      <AudienceShoutModal
        isOpen={isShoutModalOpen}
        onClose={() => setIsShoutModalOpen(false)}
        user={props.user}
        onOpenRegister={props.onOpenRegister}
      />

      {/* Audience Cheer Modal (createPortal) */}
      <AudienceCheerModal
        isOpen={isCheerModalOpen}
        onClose={() => setIsCheerModalOpen(false)}
        user={props.user}
        isHighContrast={isHighContrast}
      />

      {/* Audience Q&A Modal (createPortal) */}
      <AudienceQAModal
        isOpen={isQAModalOpen}
        onClose={() => setIsQAModalOpen(false)}
        user={props.user}
        isHighContrast={isHighContrast}
        initialTab={qaModalInitialTab}
      />

      {/* Question & Response Read-Only Log Modal */}
      <AudienceQuestionLogModal
        isOpen={isLogModalOpen}
        onClose={() => setIsLogModalOpen(false)}
        user={props.user}
        allResponses={props.allResponses || {}}
        gameState={props.gameState}
      />

      {/* Share Modal */}
      <ShareGameModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        gameTitle="Beyond The Internet 2026"
        roundName={props.gameState.round_name || props.gameState.category}
      />

      {/* Post-Match Infographic Achievement Card Modal (Nhóm 4) */}
      <PostMatchCardModal
        isOpen={isPostMatchModalOpen}
        onClose={() => setIsPostMatchModalOpen(false)}
        user={props.user}
        totalScore={getAudienceTotalScore(audienceScoreState)}
        rank={typeof myData?.rank === 'number' ? myData.rank : 1}
        totalContestants={survivalStats.totalContestants || leaderboard.length || 1}
        accuracyRate={myData?.accuracyRate || 0}
        maxStreak={streakStats.maxStreak}
        isSurvivor={survivalStats.isUserAlive}
      />

      {/* Live Highlighted Question Toast Notification from Admin */}
      <AudienceHighlightedQuestionToast
        featuredQuestion={props.gameState.featured_qa_question}
        onOpenQAModal={() => handleOpenQAModal('COMMUNITY')}
        isHighContrast={isHighContrast}
      />


      

      {/* Live Broadcast Announcer Overlay */}
      <AnnouncerOverlay overlay={props.gameState.announcer_overlay} mode="audience" isHighContrast={isHighContrast} />
    </div>
  );
};
