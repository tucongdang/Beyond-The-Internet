import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  ShieldCheck, 
  ArrowLeft, 
  Printer, 
  FileText, 
  Share2, 
  Check, 
  Search, 
  Lock, 
  Bot, 
  Trash2, 
  Mail, 
  ExternalLink, 
  CheckCircle2, 
  AlertTriangle,
  Scale,
  Award,
  HelpCircle,
  Sparkles,
  Copy,
  ChevronRight,
  BookOpen,
  Filter,
  Clock,
  X,
  Bookmark,
  BookmarkCheck,
  ArrowUp,
  Cookie,
  SlidersHorizontal
} from 'lucide-react';
import { soundFx } from '../services/audioEffects';
import { vibrateTap, vibrateSuccess, vibrateCopy } from '../utils/hapticUtils';
import { PDPD_CONSENT_VERSION, PDPD_LAW_REFERENCE } from '../utils/vnLawCompliance';
import { useLanguage } from '../hooks/useLanguage';
import { UserInfo } from '../types';
import { 
  TERMS_OF_SERVICE_DATA, 
  PRIVACY_POLICY_DATA, 
  DATA_POLICY_DATA, 
  PolicyDocument 
} from '../utils/policyData';

interface PolicyPageProps {
  onBack: () => void;
  currentUser?: UserInfo | null;
  onRequestDataDeletion?: () => void;
  previousViewName?: string;
}

export type PolicyTab = 'TERMS' | 'PRIVACY' | 'DATA' | 'SUBJECT_RIGHTS' | 'TERMS_AI';

interface PolicyBookmark {
  tab: PolicyTab;
  scrollProgress: number;
  scrollTop: number;
  url: string;
  timestamp: number;
  formattedDate: string;
  isAutoSave?: boolean;
}

export const PolicyPage: React.FC<PolicyPageProps> = ({
  onBack,
  currentUser,
  onRequestDataDeletion,
  previousViewName
}) => {
  const { localLanguage, toggleLanguage } = useLanguage();
  
  // Initialize active tab from URL query param if present
  const [activeTab, setActiveTab] = useState<PolicyTab>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab')?.toLowerCase();
      if (tabParam === 'terms' || tabParam === 'ai' || tabParam === 'terms_ai') return 'TERMS';
      if (tabParam === 'privacy') return 'PRIVACY';
      if (tabParam === 'data') return 'DATA';
      if (tabParam === 'rights' || tabParam === 'dpo' || tabParam === 'subject_rights') return 'SUBJECT_RIGHTS';
    }
    return 'TERMS';
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [dpoFormSent, setDpoFormSent] = useState(false);
  const [dpoMessage, setDpoMessage] = useState('');
  const [activeArticleIndex, setActiveArticleIndex] = useState<number | null>(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [showBackToTop, setShowBackToTop] = useState(false);

  const lastAutosavedRef = useRef<{ tab: PolicyTab; scrollTop: number; scrollProgress: number } | null>(null);
  const [lastAutosaveBadge, setLastAutosaveBadge] = useState<boolean>(false);

  // Bookmark state: checks manual bookmark first, falls back to autosaved position
  const [savedBookmark, setSavedBookmark] = useState<PolicyBookmark | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      const storedManual = localStorage.getItem('bti_policy_bookmark');
      if (storedManual) return { ...JSON.parse(storedManual), isAutoSave: false };
      const storedAuto = localStorage.getItem('bti_policy_autosave');
      if (storedAuto) return { ...JSON.parse(storedAuto), isAutoSave: true };
    } catch (e) {
      return null;
    }
    return null;
  });
  const [bookmarkToast, setBookmarkToast] = useState<string | null>(null);

  // Track window/container scroll progress and Back to Top threshold (> 400px)
  useEffect(() => {
    const handleScroll = () => {
      if (typeof window === 'undefined') return;
      
      const mainEl = document.querySelector('main');
      const scrollTop = mainEl && mainEl.scrollTop > 0 ? mainEl.scrollTop : (window.scrollY || document.documentElement.scrollTop || 0);
      const scrollHeight = mainEl && mainEl.scrollHeight > mainEl.clientHeight
        ? (mainEl.scrollHeight - mainEl.clientHeight)
        : ((document.documentElement.scrollHeight || 1) - window.innerHeight);
      
      setShowBackToTop(scrollTop > 400);

      if (scrollHeight > 0) {
        const progress = Math.min(100, Math.max(0, Math.round((scrollTop / scrollHeight) * 100)));
        setScrollProgress(progress);
      } else {
        setScrollProgress(100);
      }
    };

    const mainEl = document.querySelector('main');
    if (mainEl) {
      mainEl.addEventListener('scroll', handleScroll, { passive: true });
    }
    window.addEventListener('scroll', handleScroll, { passive: true });

    handleScroll();
    return () => {
      if (mainEl) {
        mainEl.removeEventListener('scroll', handleScroll);
      }
      window.removeEventListener('scroll', handleScroll);
    };
  }, [activeTab]);

  const handleScrollToTop = () => {
    soundFx.playClick();
    vibrateTap();
    const mainEl = document.querySelector('main');
    if (mainEl) {
      mainEl.scrollTo({ top: 0, behavior: 'smooth' });
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Automated 5-second scroll position autosave to LocalStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const intervalId = setInterval(() => {
      const mainEl = document.querySelector('main');
      const currentScrollTop = mainEl && mainEl.scrollTop > 0 ? mainEl.scrollTop : (window.scrollY || document.documentElement.scrollTop || 0);
      
      const scrollHeight = mainEl && mainEl.scrollHeight > mainEl.clientHeight
        ? (mainEl.scrollHeight - mainEl.clientHeight)
        : ((document.documentElement.scrollHeight || 1) - window.innerHeight);
      const currentProgress = scrollHeight > 0 
        ? Math.min(100, Math.max(0, Math.round((currentScrollTop / scrollHeight) * 100))) 
        : 100;

      // Skip autosave if user has not scrolled down yet
      if (currentScrollTop < 10 && currentProgress === 0) return;

      const last = lastAutosavedRef.current;
      if (last && last.tab === activeTab && Math.abs(last.scrollTop - currentScrollTop) < 15) {
        // Skip redundant write if scroll position hasn't changed significantly
        return;
      }

      const currentUrl = `${window.location.origin}${window.location.pathname}?view=policy&tab=${activeTab.toLowerCase()}`;
      const dateObj = new Date();
      const formattedDate = dateObj.toLocaleDateString(localLanguage === 'vi' ? 'vi-VN' : 'en-US', {
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit'
      });

      const autoBookmark: PolicyBookmark = {
        tab: activeTab,
        scrollProgress: currentProgress,
        scrollTop: currentScrollTop,
        url: currentUrl,
        timestamp: Date.now(),
        formattedDate,
        isAutoSave: true
      };

      try {
        localStorage.setItem('bti_policy_autosave', JSON.stringify(autoBookmark));
        lastAutosavedRef.current = { tab: activeTab, scrollTop: currentScrollTop, scrollProgress: currentProgress };
        
        // Brief visual indicator badge in header
        setLastAutosaveBadge(true);
        setTimeout(() => setLastAutosaveBadge(false), 1800);

        // Update active prompt banner if no manual bookmark is set
        setSavedBookmark((prev) => {
          if (!prev || prev.isAutoSave) {
            return autoBookmark;
          }
          return prev;
        });
      } catch (e) {
        console.error('Failed to autosave scroll position:', e);
      }
    }, 5000);

    return () => clearInterval(intervalId);
  }, [activeTab, localLanguage]);

  // Sync tab changes to URL search param without reload
  const handleTabChange = (tab: PolicyTab) => {
    soundFx.playClick();
    vibrateTap();
    setActiveTab(tab);
    if (typeof window !== 'undefined' && window.history) {
      const url = new URL(window.location.href);
      url.searchParams.set('tab', tab.toLowerCase());
      window.history.replaceState({}, '', url.toString());
    }
  };

  const handleCopyPolicyUrl = () => {
    soundFx.playClick();
    vibrateCopy();
    if (typeof window !== 'undefined') {
      const url = `${window.location.origin}${window.location.pathname}?view=policy&tab=${activeTab.toLowerCase()}`;
      navigator.clipboard?.writeText(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  // Bookmark current position and URL
  const handleSaveBookmark = () => {
    soundFx.playClick();
    vibrateSuccess();

    const mainEl = document.querySelector('main');
    const currentScrollTop = mainEl && mainEl.scrollTop > 0 ? mainEl.scrollTop : (window.scrollY || document.documentElement.scrollTop || 0);

    const currentUrl = typeof window !== 'undefined'
      ? `${window.location.origin}${window.location.pathname}?view=policy&tab=${activeTab.toLowerCase()}`
      : '';

    const dateObj = new Date();
    const formattedDate = dateObj.toLocaleDateString(localLanguage === 'vi' ? 'vi-VN' : 'en-US', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit'
    });

    const newBookmark: PolicyBookmark = {
      tab: activeTab,
      scrollProgress,
      scrollTop: currentScrollTop,
      url: currentUrl,
      timestamp: Date.now(),
      formattedDate,
      isAutoSave: false
    };

    try {
      localStorage.setItem('bti_policy_bookmark', JSON.stringify(newBookmark));
      setSavedBookmark(newBookmark);

      if (typeof window !== 'undefined' && window.history) {
        window.history.replaceState({}, '', currentUrl);
      }

      const msg = localLanguage !== 'vi'
        ? `Saved bookmark at ${scrollProgress}% reading progress!`
        : `Đã lưu dấu trang tại vị trí ${scrollProgress}%!`;
      setBookmarkToast(msg);
      setTimeout(() => setBookmarkToast(null), 3500);
    } catch (e) {
      console.error('Failed to save policy bookmark:', e);
    }
  };

  const handleRestoreBookmark = () => {
    if (!savedBookmark) return;
    soundFx.playClick();
    vibrateTap();

    if (savedBookmark.tab && savedBookmark.tab !== activeTab) {
      setActiveTab(savedBookmark.tab);
      if (typeof window !== 'undefined' && window.history) {
        const url = new URL(window.location.href);
        url.searchParams.set('tab', savedBookmark.tab.toLowerCase());
        window.history.replaceState({}, '', url.toString());
      }
    }

    setTimeout(() => {
      if (typeof window === 'undefined') return;
      const mainEl = document.querySelector('main');

      if (savedBookmark.scrollTop > 0) {
        if (mainEl) {
          mainEl.scrollTo({ top: savedBookmark.scrollTop, behavior: 'smooth' });
        }
        window.scrollTo({ top: savedBookmark.scrollTop, behavior: 'smooth' });
      } else if (savedBookmark.scrollProgress > 0) {
        const scrollHeight = mainEl && mainEl.scrollHeight > mainEl.clientHeight
          ? (mainEl.scrollHeight - mainEl.clientHeight)
          : ((document.documentElement.scrollHeight || 1) - window.innerHeight);
        const targetY = Math.round((savedBookmark.scrollProgress / 100) * scrollHeight);
        if (mainEl) {
          mainEl.scrollTo({ top: targetY, behavior: 'smooth' });
        }
        window.scrollTo({ top: targetY, behavior: 'smooth' });
      }
    }, 100);

    const isAuto = savedBookmark.isAutoSave;
    const msg = localLanguage !== 'vi'
      ? `Resumed from ${isAuto ? 'auto-saved' : 'saved'} position (${savedBookmark.scrollProgress}%)`
      : `Đã quay lại vị trí ${isAuto ? 'tự động lưu' : 'dấu trang'} (${savedBookmark.scrollProgress}%)`;
    setBookmarkToast(msg);
    setTimeout(() => setBookmarkToast(null), 3000);
  };

  const handleClearBookmark = () => {
    soundFx.playClick();
    vibrateTap();
    try {
      localStorage.removeItem('bti_policy_bookmark');
      localStorage.removeItem('bti_policy_autosave');
      lastAutosavedRef.current = null;
      setSavedBookmark(null);
      const msg = localLanguage !== 'vi' ? 'Bookmark cleared' : 'Đã xóa vị trí lưu';
      setBookmarkToast(msg);
      setTimeout(() => setBookmarkToast(null), 2500);
    } catch (e) {
      console.error(e);
    }
  };

  const handleCopyArticleLink = (artId: string, artTitle: string) => {
    soundFx.playClick();
    vibrateCopy();
    if (typeof window !== 'undefined') {
      const url = `${window.location.origin}${window.location.pathname}?view=policy&tab=${activeTab.toLowerCase()}#${artId}`;
      navigator.clipboard?.writeText(url);
      const msg = localLanguage !== 'vi' ? `Copied link to ${artTitle}` : `Đã chép link: ${artTitle}`;
      setBookmarkToast(msg);
      setTimeout(() => setBookmarkToast(null), 2500);
    }
  };

  const handlePrint = () => {
    soundFx.playClick();
    vibrateTap();
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  const returnLabel = useMemo(() => {
    if (previousViewName) {
      return localLanguage !== 'vi' ? `Back to ${previousViewName}` : `Quay Lại ${previousViewName}`;
    }
    return localLanguage !== 'vi' ? 'Back' : 'Quay Lại';
  }, [previousViewName, localLanguage]);

  interface ArticleClause {
    id: string;
    num: number;
    title: string;
    intro: string;
    items: Array<{
      label?: string;
      text: string;
    }>;
    note?: string;
  }

  const currentPolicyDoc: PolicyDocument | null = useMemo(() => {
    if (activeTab === 'TERMS' || activeTab === 'TERMS_AI') return TERMS_OF_SERVICE_DATA;
    if (activeTab === 'PRIVACY') return PRIVACY_POLICY_DATA;
    if (activeTab === 'DATA') return DATA_POLICY_DATA;
    return null;
  }, [activeTab]);

  // Articles data dynamically mapped from policyData.ts
  const articles: ArticleClause[] = useMemo(() => {
    if (!currentPolicyDoc) return [];

    return currentPolicyDoc.sections.map((sec, idx) => {
      const intro = sec.content[0] || '';
      const items = sec.content.slice(1).map(txt => {
        const colonIdx = txt.indexOf(':');
        if (colonIdx > 0 && colonIdx < 50 && !txt.startsWith('•')) {
          return {
            label: txt.substring(0, colonIdx).trim(),
            text: txt.substring(colonIdx + 1).trim()
          };
        }
        return { text: txt };
      });

      return {
        id: sec.id,
        num: idx + 1,
        title: sec.title.replace(/^[0-9.]+\s*/, ''),
        intro,
        items: items.length > 0 ? items : [{ text: intro }],
        note: `Căn cứ ${currentPolicyDoc.nameVi} - Beyond The Internet 2027`
      };
    });
  }, [currentPolicyDoc]);

  const filteredArticles = useMemo(() => {
    if (!searchQuery.trim()) return articles;
    const q = searchQuery.toLowerCase().trim();
    return articles.filter(a => 
      a.title.toLowerCase().includes(q) || 
      a.intro.toLowerCase().includes(q) ||
      a.items.some(it => it.text.toLowerCase().includes(q) || (it.label && it.label.toLowerCase().includes(q))) ||
      (a.note && a.note.toLowerCase().includes(q)) ||
      `điều ${a.num}`.includes(q)
    );
  }, [articles, searchQuery]);

  // Estimated reading time based on active tab content (assuming average reading speed of 200 wpm)
  const readingTimeEstimate = useMemo(() => {
    let wordCount = 0;
    if (activeTab === 'PRIVACY') {
      wordCount = articles.reduce((acc, art) => {
        const itemsWords = art.items.reduce((sum, item) => sum + (item.label ? item.label.split(/\s+/).length : 0) + item.text.split(/\s+/).length, 0);
        return acc + art.title.split(/\s+/).length + art.intro.split(/\s+/).length + itemsWords + (art.note ? art.note.split(/\s+/).length : 0);
      }, 0);
    } else if (activeTab === 'TERMS_AI') {
      wordCount = 650; // Estimated words for Terms & AI tab
    } else {
      wordCount = 450; // Estimated words for Subject Rights tab
    }
    const minutes = Math.max(1, Math.ceil(wordCount / 200));
    return {
      minutes,
      labelVi: `~${minutes} phút đọc`,
      labelEn: `~${minutes} min read`
    };
  }, [activeTab, articles]);

  return (
    <div className="w-full bg-[#0D0420] text-[#F5EFF9] flex flex-col font-sans select-text h-max grow min-h-full">
      
      {/* Top Sticky Header */}
      <header className="sticky top-0 z-40 bg-[#16062f]/95 backdrop-blur-xl border-b border-[#F7CAC9]/20 px-4 sm:px-6 py-3 print:hidden shadow-lg">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
          
          {/* Back button with explicit previous view label */}
          <button
            type="button"
            id="policy-page-header-back-btn"
            onClick={() => {
              soundFx.playClick();
              vibrateTap();
              onBack();
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[2px] bg-white/10 hover:bg-white/20 active:scale-95 text-white font-mono text-xs font-bold transition border border-white/15 cursor-pointer group shadow-sm"
            title={localLanguage !== 'vi' ? 'Return to previous view' : 'Quay lại giao diện đang xem trước đó'}
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            <span className="truncate max-w-[200px] sm:max-w-none">{returnLabel}</span>
          </button>

          {/* Center Brand Title & Reading Time Badge */}
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-[2px] overflow-hidden bg-black border border-[#F7CAC9]/40 flex items-center justify-center">
              <img src="/logo-square.png" alt="BTI 2027" className="w-full h-full object-cover" />
            </div>
            <div className="text-left hidden sm:block">
              <div className="flex items-center gap-2">
                <h1 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                  Beyond The Internet 2027
                </h1>
                <span 
                  id="policy-reading-time-header-badge"
                  className="px-1.5 py-0.2 rounded-[2px] bg-sky-500/15 border border-sky-400/30 text-sky-300 font-mono text-[9px] font-semibold flex items-center gap-1"
                  title={localLanguage !== 'vi' ? 'Estimated time to read this section' : 'Thời gian ước tính để đọc hết mục này'}
                >
                  <Clock className="w-2.5 h-2.5 text-sky-400" />
                  <span>{localLanguage !== 'vi' ? readingTimeEstimate.labelEn : readingTimeEstimate.labelVi}</span>
                </span>
              </div>
              <p className="text-[10px] text-[#F7CAC9]/80 font-mono">
                {localLanguage !== 'vi' ? 'Legal & Privacy Portal' : 'Cổng Thông Tin Pháp Lý & Quyền Riêng Tư'}
              </p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            
            {/* Bookmark for later button */}
            <button
              type="button"
              id="policy-bookmark-for-later-btn"
              onClick={handleSaveBookmark}
              className={`p-1.5 sm:px-2.5 sm:py-1.5 rounded-[2px] font-mono text-xs flex items-center gap-1.5 border transition cursor-pointer ${
                savedBookmark && savedBookmark.scrollProgress === scrollProgress && savedBookmark.tab === activeTab
                  ? 'bg-amber-500/20 text-amber-200 border-amber-400/40 font-bold shadow'
                  : 'bg-white/5 hover:bg-white/15 text-white/80 hover:text-white border-white/10'
              }`}
              title={localLanguage !== 'vi' ? 'Save reading position and URL to local storage for later' : 'Lưu vị trí đọc và đường dẫn vào bộ nhớ máy để đọc tiếp sau'}
            >
              {savedBookmark && savedBookmark.scrollProgress === scrollProgress && savedBookmark.tab === activeTab ? (
                <BookmarkCheck className="w-3.5 h-3.5 text-amber-400" />
              ) : (
                <Bookmark className="w-3.5 h-3.5 text-amber-300" />
              )}
              <span className="hidden sm:inline">
                {localLanguage !== 'vi' ? 'Bookmark' : 'Lưu Dấu Trang'}
              </span>
            </button>

            <button
              type="button"
              onClick={handleCopyPolicyUrl}
              className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-[2px] bg-white/5 hover:bg-white/15 text-white/80 hover:text-white font-mono text-xs flex items-center gap-1 border border-white/10 cursor-pointer transition"
              title="Sao chép link chính sách"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span className="hidden md:inline">{copiedLink ? (localLanguage !== 'vi' ? 'Copied' : 'Đã Chép') : (localLanguage !== 'vi' ? 'Share Link' : 'Chia Sẻ Link')}</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-[2px] bg-white/5 hover:bg-white/15 text-white/80 hover:text-white font-mono text-xs flex items-center gap-1 border border-white/10 cursor-pointer transition"
              title="In hoặc xuất PDF"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden md:inline">{localLanguage !== 'vi' ? 'Print / PDF' : 'In / Lưu PDF'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                soundFx.playClick();
                toggleLanguage();
              }}
              className="px-2 py-1.5 rounded-[2px] bg-sky-500/20 text-sky-200 border border-sky-400/30 font-mono text-xs font-bold uppercase cursor-pointer"
            >
              {localLanguage.toUpperCase()}
            </button>
          </div>

        </div>

        {/* Legal Reading Scroll Progress Bar */}
        <div className="mt-2.5 pt-1.5 border-t border-white/10 flex items-center justify-between gap-3 text-[10px] font-mono">
          <div className="flex items-center gap-1.5 text-white/70">
            <BookOpen className="w-3.5 h-3.5 text-[#F7CAC9] shrink-0" />
            <span className="hidden sm:inline">
              {localLanguage !== 'vi' ? 'Legal Reading Progress:' : 'Tiến độ đọc văn bản pháp lý:'}
            </span>
            <span className="sm:hidden">
              {localLanguage !== 'vi' ? 'Progress:' : 'Tiến độ:'}
            </span>
            <strong className={`font-bold ${scrollProgress >= 100 ? 'text-emerald-400' : 'text-sky-300'}`}>
              {scrollProgress}% {scrollProgress >= 100 && (localLanguage !== 'vi' ? '✓ Read Complete' : '✓ Đã đọc xong')}
            </strong>
            {lastAutosaveBadge && (
              <span className="text-[9px] text-amber-300 font-mono flex items-center gap-1 animate-pulse ml-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                <span>{localLanguage !== 'vi' ? 'Auto-saved' : 'Tự động lưu'}</span>
              </span>
            )}
          </div>

          <div className="flex-1 max-w-[200px] sm:max-w-xs h-1.5 bg-black/50 border border-white/10 rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all duration-150 ${
                scrollProgress >= 100 
                  ? 'bg-gradient-to-r from-emerald-400 to-teal-300 shadow-[0_0_8px_rgba(52,211,153,0.8)]' 
                  : 'bg-gradient-to-r from-sky-400 via-[#F7CAC9] to-purple-400'
              }`}
              style={{ width: `${scrollProgress}%` }}
            />
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        
        {/* Saved Bookmark / Auto-saved Prompt Bar if saved position exists */}
        {savedBookmark && (
          <div className="p-3 sm:p-3.5 rounded-[4px] bg-amber-950/40 border border-amber-500/40 flex flex-wrap items-center justify-between gap-3 text-xs text-amber-200 font-mono shadow-lg print:hidden animate-fadeIn">
            <div className="flex items-center gap-2.5 overflow-hidden min-w-[240px] flex-1">
              <div className="w-7 h-7 rounded-[2px] bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300 shrink-0">
                <BookmarkCheck className="w-4 h-4 animate-bounce" />
              </div>
              <div className="truncate">
                <div className="flex items-center gap-1.5 font-bold text-white">
                  <span>
                    {savedBookmark.isAutoSave 
                      ? (localLanguage !== 'vi' ? 'Auto-Saved Reading Position (5s)' : 'Vị Trí Tự Động Lưu (5s)') 
                      : (localLanguage !== 'vi' ? 'Saved Reading Bookmark' : 'Dấu Trang Đã Lưu')}
                  </span>
                  <span className="px-1.5 py-0.2 rounded bg-amber-500/30 text-amber-200 text-[10px]">
                    {savedBookmark.scrollProgress}%
                  </span>
                </div>
                <p className="text-[11px] text-amber-200/80 truncate">
                  {savedBookmark.tab === 'TERMS' || savedBookmark.tab === 'TERMS_AI' ? (localLanguage !== 'vi' ? '1. Terms of Service' : 'Mục 1. Điều khoản sử dụng') :
                   savedBookmark.tab === 'PRIVACY' ? (localLanguage !== 'vi' ? '2. Privacy Policy' : 'Mục 2. Chính sách bảo mật') :
                   savedBookmark.tab === 'DATA' ? (localLanguage !== 'vi' ? '3. Data Policy' : 'Mục 3. Chính sách dữ liệu') :
                   (localLanguage !== 'vi' ? '4. Subject Rights' : 'Mục 4. Quyền chủ thể')}
                  <span className="hidden sm:inline"> • {savedBookmark.formattedDate}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                id="policy-restore-bookmark-btn"
                onClick={handleRestoreBookmark}
                className="px-3 py-1.5 rounded-[2px] bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-black text-xs font-mono uppercase tracking-wider transition cursor-pointer shadow-md flex items-center gap-1.5"
              >
                <Bookmark className="w-3.5 h-3.5" />
                <span>{localLanguage !== 'vi' ? 'Resume Reading' : 'Đọc Tiếp Từ Đây'}</span>
              </button>

              <button
                type="button"
                onClick={handleClearBookmark}
                className="p-1.5 rounded-[2px] bg-white/5 hover:bg-rose-500/20 hover:text-rose-300 text-amber-300/70 transition cursor-pointer border border-transparent hover:border-rose-400/30"
                title={localLanguage !== 'vi' ? 'Clear saved bookmark' : 'Xóa dấu trang'}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Banner Section */}
        <div className="p-5 sm:p-6 rounded-[4px] bg-gradient-to-r from-[#1E0B38] via-[#15072B] to-[#120524] border border-[#F7CAC9]/30 shadow-xl relative overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-2 text-left">
              {/* Zero-Pill Unboxed Metadata with Typographic Separators */}
              <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-white/80">
                <span className="flex items-center gap-1.5 text-emerald-300 font-semibold">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{PDPD_LAW_REFERENCE}</span>
                </span>
                <span aria-hidden="true" className="text-white/30">·</span>
                <span className="flex items-center gap-1 text-sky-300">
                  <Clock className="w-3.5 h-3.5 text-sky-400" />
                  <span>{localLanguage !== 'vi' ? readingTimeEstimate.labelEn : readingTimeEstimate.labelVi}</span>
                </span>
                <span aria-hidden="true" className="text-white/30">·</span>
                <span className="text-purple-200">
                  {localLanguage !== 'vi' ? `Version ${PDPD_CONSENT_VERSION}` : `Phiên bản ${PDPD_CONSENT_VERSION}`}
                </span>
              </div>

              <h2 className="text-xl sm:text-2xl font-black text-white tracking-wide uppercase font-mono">
                {localLanguage !== 'vi' ? 'Legal Framework & Privacy Policy' : 'Quy Chế Pháp Lý & Chính Sách Bảo Mật'}
              </h2>
              <p className="text-xs sm:text-sm text-[#F7CAC9]/90 max-w-2xl font-sans leading-relaxed">
                {localLanguage !== 'vi'
                  ? 'Official transparency statement of the Beyond The Internet 2027 Academic Competition regarding personal data protection, anti-cheat regulations, and ethical AI utilization.'
                  : 'Văn bản công khai chính thức của Cuộc thi Học thuật Beyond The Internet 2027 về bảo vệ dữ liệu cá nhân, quy chế thi đấu liêm chính và nguyên tắc sử dụng Trí tuệ Nhân tạo có trách nhiệm.'}
              </p>
            </div>

            <div className="shrink-0 text-left sm:text-right font-mono text-xs text-white/60 space-y-1">
              <div>Hiệu lực: <strong className="text-white">Mùa giải 2027</strong></div>
              <div className="text-[10px] text-emerald-400 font-semibold">Trạng thái: Đang áp dụng chính thức</div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs (4 Comprehensive Tabs) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-1 bg-white/5 border border-white/10 rounded-[2px] font-mono text-xs font-bold select-none print:hidden">
          <button
            type="button"
            id="tab-terms-btn"
            onClick={() => handleTabChange('TERMS')}
            className={`py-2.5 px-2.5 rounded-[2px] transition flex items-center justify-center gap-1.5 cursor-pointer text-center ${
              activeTab === 'TERMS' || activeTab === 'TERMS_AI'
                ? 'bg-[#F7CAC9] text-[#190839] shadow-md font-black' 
                : 'text-white/70 hover:text-white hover:bg-white/5'
            }`}
          >
            <FileText className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">1. {localLanguage !== 'vi' ? 'Terms of Service' : 'Điều Khoản Sử Dụng'}</span>
          </button>

          <button
            type="button"
            id="tab-privacy-btn"
            onClick={() => handleTabChange('PRIVACY')}
            className={`py-2.5 px-2.5 rounded-[2px] transition flex items-center justify-center gap-1.5 cursor-pointer text-center ${
              activeTab === 'PRIVACY' 
                ? 'bg-[#F7CAC9] text-[#190839] shadow-md font-black' 
                : 'text-white/70 hover:text-white hover:bg-white/5'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">2. {localLanguage !== 'vi' ? 'Privacy Policy' : 'Chính Sách Bảo Mật'}</span>
          </button>

          <button
            type="button"
            id="tab-data-btn"
            onClick={() => handleTabChange('DATA')}
            className={`py-2.5 px-2.5 rounded-[2px] transition flex items-center justify-center gap-1.5 cursor-pointer text-center ${
              activeTab === 'DATA' 
                ? 'bg-[#F7CAC9] text-[#190839] shadow-md font-black' 
                : 'text-white/70 hover:text-white hover:bg-white/5'
            }`}
          >
            <Scale className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">3. {localLanguage !== 'vi' ? 'Data Policy' : 'Chính Sách Dữ Liệu'}</span>
          </button>

          <button
            type="button"
            id="tab-subject-rights-btn"
            onClick={() => handleTabChange('SUBJECT_RIGHTS')}
            className={`py-2.5 px-2.5 rounded-[2px] transition flex items-center justify-center gap-1.5 cursor-pointer text-center ${
              activeTab === 'SUBJECT_RIGHTS' 
                ? 'bg-[#F7CAC9] text-[#190839] shadow-md font-black' 
                : 'text-white/70 hover:text-white hover:bg-white/5'
            }`}
          >
            <Award className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">4. {localLanguage !== 'vi' ? 'Subject Rights & DPO' : 'Quyền Chủ Thể & DPO'}</span>
          </button>
        </div>

        {/* Content Tabs 1, 2, 3: TERMS, PRIVACY, DATA */}
        {activeTab !== 'SUBJECT_RIGHTS' && (
          <div className="space-y-6 text-left leading-relaxed animate-fadeIn">
            
            {/* Quick in-page Search & Jump Filter */}
            <div className="p-3 sm:p-4 rounded-[2px] bg-white/5 border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 print:hidden">
              <div className="relative w-full sm:w-80">
                <Search className="w-3.5 h-3.5 text-white/40 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={localLanguage !== 'vi' ? 'Search legal articles...' : 'Tìm kiếm điều khoản trong mục này...'}
                  className="w-full pl-8 pr-7 py-1.5 bg-[#0D0420] border border-white/15 focus:border-[#F7CAC9] rounded-[2px] text-xs text-white placeholder:text-white/30 font-mono outline-none"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-white/40 hover:text-white p-0.5 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {searchQuery && (
                <span className="text-[11px] font-mono text-[#F7CAC9] font-semibold shrink-0">
                  {localLanguage !== 'vi' ? `Found ${filteredArticles.length} matching clause(s)` : `Tìm thấy ${filteredArticles.length} điều khoản`}
                </span>
              )}

              {/* Table of Contents jump badges */}
              <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 custom-scrollbar text-[10px] font-mono">
                <span className="text-white/40 shrink-0 mr-1 flex items-center gap-0.5">
                  <Filter className="w-3 h-3" />
                  <span>Xem nhanh:</span>
                </span>
                {articles.map((art) => (
                  <button
                    key={art.id}
                    type="button"
                    onClick={() => {
                      const el = document.getElementById(art.id);
                      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      setActiveArticleIndex(art.num);
                      setTimeout(() => setActiveArticleIndex(null), 2000);
                    }}
                    className="px-2 py-0.5 rounded-[2px] bg-white/5 hover:bg-white/15 border border-white/10 text-white/70 hover:text-[#F7CAC9] transition cursor-pointer shrink-0"
                  >
                    Đ.{art.num}
                  </button>
                ))}
              </div>
            </div>

            {/* Document Introduction Box */}
            <div className="p-4 rounded-[2px] bg-sky-950/40 border border-sky-500/30 text-sky-200 text-xs flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />
              <div>
                <strong className="block font-bold text-white mb-0.5 uppercase font-mono">
                  {currentPolicyDoc?.nameVi} • Beyond The Internet 2027
                </strong>
                {currentPolicyDoc?.shortDescriptionVi} Áp dụng chính thức theo quy định của Luật Bảo vệ dữ liệu cá nhân 91/2025/QH15, Nghị định 356/2025/NĐ-CP và Luật An ninh mạng 116/2025/QH15.
              </div>
            </div>

            {/* Rendered Articles (Filtered or All) */}
            <div className="space-y-4">
              {filteredArticles.length === 0 ? (
                <div className="p-6 text-center text-white/50 bg-white/5 border border-white/10 rounded-[2px] font-mono text-xs">
                  Không tìm thấy điều khoản nào khớp với từ khóa "{searchQuery}".
                </div>
              ) : (
                filteredArticles.map((art) => (
                  <section 
                    key={art.id} 
                    id={art.id}
                    className={`p-4 sm:p-5 rounded-[2px] border transition-all ${
                      activeArticleIndex === art.num 
                        ? 'bg-[#F7CAC9]/15 border-[#F7CAC9] shadow-lg shadow-purple-950/40' 
                        : 'bg-white/5 border-white/10 hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <h3 className="text-sm sm:text-base font-bold text-[#F7CAC9] flex items-center gap-2 font-mono">
                        <span className="px-2 py-0.5 rounded-[2px] bg-[#F7CAC9]/20 text-[#F7CAC9] text-xs font-black">
                          Điều {art.num}
                        </span>
                        <span>{art.title}</span>
                      </h3>

                      <button
                        type="button"
                        onClick={() => handleCopyArticleLink(art.id, art.title)}
                        className="p-1 px-2 rounded bg-white/5 hover:bg-white/15 text-white/60 hover:text-[#F7CAC9] transition cursor-pointer text-[11px] font-mono flex items-center gap-1 shrink-0 border border-white/10"
                        title={localLanguage !== 'vi' ? 'Copy link to this clause' : 'Sao chép đường dẫn trực tiếp điều khoản này'}
                      >
                        <Copy className="w-3 h-3" />
                        <span className="hidden sm:inline">{localLanguage !== 'vi' ? 'Copy Link' : 'Sao Chép Link'}</span>
                      </button>
                    </div>

                    {/* Introductory lead paragraph */}
                    <p className="text-xs sm:text-sm text-white/90 pl-2 sm:pl-7 leading-relaxed font-sans mb-3 font-medium">
                      {art.intro}
                    </p>

                    {/* Bulleted list of clauses */}
                    <ul className="pl-2 sm:pl-7 space-y-2 text-xs sm:text-sm text-white/80 list-none">
                      {art.items.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-2.5 leading-relaxed">
                          <span className="text-[#F7CAC9] font-bold select-none shrink-0 mt-0.5">•</span>
                          <span className="flex-1">
                            {item.label && (
                              <strong className="text-sky-200 font-semibold mr-1.5 font-mono">
                                {item.label}:
                              </strong>
                            )}
                            <span className="text-white/85">{item.text}</span>
                          </span>
                        </li>
                      ))}
                    </ul>

                    {/* Statutory reference footer note */}
                    {art.note && (
                      <div className="mt-3.5 pl-2 sm:pl-7 pt-2.5 border-t border-white/10 text-[11px] font-mono text-[#F7CAC9]/80 flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>{art.note}</span>
                      </div>
                    )}

                    {/* Interactive European GDPR Cookie Settings trigger for Article 5 */}
                    {art.id === 'data-sec-5' && (
                      <div className="mt-4 sm:ml-7 p-3.5 rounded-[2px] bg-gradient-to-r from-blue-950/40 via-purple-950/30 to-[#120726] border border-blue-500/40 space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-base" aria-hidden="true">🇪🇺</span>
                            <span className="font-bold text-white font-mono text-xs">
                              {localLanguage !== 'vi' ? 'EU GDPR & ePrivacy Compliance Dashboard' : 'Trung Tâm Tùy Chọn Cookie Theo Chuẩn Châu Âu (GDPR)'}
                            </span>
                          </div>
                          <span className="text-[10px] font-mono text-blue-300 bg-blue-500/20 px-2 py-0.5 rounded-[2px] border border-blue-500/30 w-fit">
                            Directive 2002/58/EC & GDPR Art. 7
                          </span>
                        </div>
                        <p className="text-[11px] text-white/80 leading-relaxed font-sans">
                          {localLanguage !== 'vi'
                            ? 'You have the right to withdraw or modify your cookie consent at any time without affecting contest participation.'
                            : 'Bạn có quyền rút lại hoặc điều chỉnh danh mục cookie & lưu trữ cục bộ bất cứ lúc nào mà không làm ảnh hưởng đến tính công bằng của trận đấu.'}
                        </p>
                        <div className="flex flex-wrap items-center gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => {
                              soundFx.playClick();
                              vibrateTap();
                              window.dispatchEvent(new CustomEvent('bti-open-cookie-settings'));
                            }}
                            className="px-3.5 py-1.5 rounded-[2px] bg-[#F7CAC9] hover:bg-white text-[#190839] font-mono text-xs font-bold transition cursor-pointer flex items-center gap-1.5 active:scale-95 shadow-md"
                          >
                            <SlidersHorizontal className="w-3.5 h-3.5" />
                            <span>{localLanguage !== 'vi' ? 'Open EU Cookie Settings' : 'Mở Cài Đặt Cookie Châu Âu'}</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </section>
                ))
              )}
            </div>

            {/* AI Transparency & Anti-cheat special addendum for Terms tab */}
            {(activeTab === 'TERMS' || activeTab === 'TERMS_AI') && (
              <div className="pt-4 space-y-4">
                <div className="p-4 rounded-[2px] bg-purple-950/40 border border-purple-500/30 text-purple-200 text-xs flex items-start gap-3">
                  <Bot className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block font-bold text-white mb-0.5 uppercase font-mono">
                      Phụ lục: Minh Bạch Hệ Thống Hỗ Trợ Tự Động & Chuẩn Mực Đấu Trường (Điều 11 Luật 134/2025/QH15)
                    </strong>
                    Hệ thống Cố vấn Học thuật BTI 2027 được vận hành nhằm mục đích tra cứu thể lệ và giải thích kiến thức sau giờ thi đấu, hoàn toàn độc lập với Hội đồng Giám khảo. Hệ thống không can thiệp vào quá trình tính điểm, bảng xếp hạng hay dữ liệu khảo thí thời gian thực.
                  </div>
                </div>
              </div>
            )}

          </div>
        )}

        {/* Tab 3: Data Subject Rights & DPO Contact */}
        {activeTab === 'SUBJECT_RIGHTS' && (
          <div className="space-y-6 text-left leading-relaxed animate-fadeIn">
            
            <div className="p-4 rounded-[2px] bg-emerald-950/40 border border-emerald-500/30 text-emerald-200 text-xs flex items-start gap-3">
              <Scale className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <strong className="block font-bold text-white mb-0.5 uppercase font-mono">
                  Hướng Dẫn Thực Thi Quyền Của Chủ Thể Dữ Liệu (Điều 4 Luật 91/2025/QH15 & Điều 5 Nghị định 356/2025/NĐ-CP)
                </strong>
                Chủ thể dữ liệu có toàn quyền yêu cầu được biết, rút lại sự đồng ý (Điều 10 Luật 91/2025/QH15), xem, chỉnh sửa, hạn chế xử lý, phản đối xử lý hoặc yêu cầu xóa dữ liệu của mình.
              </div>
            </div>

            {/* Self-service data deletion */}
            <div className="p-5 rounded-[2px] bg-rose-950/20 border border-rose-500/40 space-y-3">
              <div className="flex items-center gap-2 text-rose-300 font-bold font-mono text-sm">
                <Trash2 className="w-4 h-4 text-rose-400" />
                <span>Kích Hoạt Quyền Xóa Dữ Liệu Cá Nhân Trực Tiếp</span>
              </div>
              <p className="text-xs text-rose-200/90">
                Nếu bạn đã đăng nhập tài khoản khán giả trên thiết bị này, bạn có thể gửi yêu cầu xóa dữ liệu và ẩn danh hóa tài khoản ngay lập tức. Toàn bộ Họ tên, Email và MSSV của bạn sẽ được chuyển thành mã băm ẩn danh, không thể khôi phục danh tính.
              </p>

              {currentUser ? (
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (onRequestDataDeletion) {
                        onRequestDataDeletion();
                      } else if (typeof window !== 'undefined') {
                        window.dispatchEvent(new CustomEvent('bti_system_notice', {
                          detail: { message: 'Vui lòng mở mục Cài Đặt Hồ Sơ (Profile) để thực hiện xóa tài khoản an toàn.' }
                        }));
                      }
                    }}
                    className="px-4 py-2 rounded-[2px] bg-rose-600 hover:bg-rose-500 text-white font-mono text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-md"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Yêu Cầu Xóa Dữ Liệu Cho Tài Khoản: {currentUser.mssv || currentUser.name}</span>
                  </button>
                </div>
              ) : (
                <div className="p-2.5 rounded-[2px] bg-black/40 border border-white/10 text-xs text-white/70 font-mono">
                  Trạng thái hiện tại: Bạn chưa đăng nhập. Dữ liệu trên trình duyệt này chỉ bao gồm trạng thái phiên làm việc và cài đặt giao diện cục bộ. Bạn có thể xóa bất cứ lúc nào qua tính năng Xóa dữ liệu duyệt web của trình duyệt.
                </div>
              )}
            </div>

            {/* DPO Contact Info & Statutory Timelines under Article 5 Decree 356/2025/ND-CP */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              <div className="p-5 rounded-[2px] bg-white/5 border border-white/10 space-y-3">
                <h4 className="text-sm font-bold text-white font-mono flex items-center gap-2">
                  <Mail className="w-4 h-4 text-sky-400" />
                  Kênh Tiếp Nhận & Thời Hạn Xử Lý (Điều 5 NĐ 356/2025)
                </h4>
                <div className="space-y-2 text-xs text-white/80 font-mono">
                  <div>
                    <span className="text-white/50 block text-[10px]">Bộ phận phụ trách bảo vệ dữ liệu (Điều 33 Luật 91/2025):</span>
                    <strong className="text-sky-300">Bộ phận Kỹ Thuật & Pháp chế BTI 2027</strong>
                  </div>
                  <div>
                    <span className="text-white/50 block text-[10px]">Email tiếp nhận yêu cầu chủ thể dữ liệu:</span>
                    <a href="mailto:dpo-bti2027@domain.edu.vn" className="text-sky-300 underline font-bold">
                      dpo-bti2027@domain.edu.vn
                    </a>
                  </div>
                  <div className="space-y-1 pt-1 border-t border-white/10">
                    <span className="text-white/50 block text-[10px]">Thời hạn xử lý yêu cầu theo Điều 5 Nghị định 356/2025/NĐ-CP:</span>
                    <ul className="list-disc list-inside text-[11px] text-white/85 space-y-0.5 font-sans">
                      <li><strong>Phản hồi & hướng dẫn thủ tục:</strong> tối đa <strong>02 ngày làm việc</strong>.</li>
                      <li><strong>Xem, chỉnh sửa, cung cấp dữ liệu:</strong> <strong>10 ngày</strong> (15 ngày nếu cần bên xử lý/bên thứ ba; gia hạn tối đa 1 lần 10 ngày).</li>
                      <li><strong>Rút đồng ý, hạn chế, phản đối xử lý:</strong> <strong>15 ngày</strong> (20 ngày nếu cần bên xử lý/bên thứ ba; gia hạn tối đa 1 lần 15 ngày).</li>
                      <li><strong>Xóa dữ liệu:</strong> <strong>20 ngày</strong> (30 ngày nếu cần bên xử lý/bên thứ ba; gia hạn tối đa 1 lần 20 ngày).</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="p-5 rounded-[2px] bg-white/5 border border-white/10 space-y-3">
                <h4 className="text-sm font-bold text-white font-mono flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-400" />
                  Gửi Yêu Cầu Trực Tuyến Tới Ban Tổ Chức
                </h4>
                {dpoFormSent ? (
                  <div className="p-3 bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs rounded-[2px] flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>Yêu cầu của bạn đã được ghi nhận. Ban Thư ký sẽ liên hệ xác minh qua email trong 24-48 giờ.</span>
                  </div>
                ) : (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      soundFx.playClick();
                      vibrateSuccess();
                      setDpoFormSent(true);
                    }}
                    className="space-y-2 text-left"
                  >
                    <textarea
                      required
                      rows={3}
                      value={dpoMessage}
                      onChange={(e) => setDpoMessage(e.target.value)}
                      placeholder="Mô tả nội dung yêu cầu (VD: Yêu cầu trích xuất lịch sử điểm, hủy tài khoản MSSV...)"
                      className="w-full p-2 bg-[#0D0420] border border-white/15 focus:border-sky-400 text-xs text-white rounded-[2px] outline-none font-mono placeholder:text-white/30"
                    />
                    <button
                      type="submit"
                      className="w-full py-2 px-3 bg-sky-600 hover:bg-sky-500 text-white font-mono font-bold text-xs uppercase tracking-wider rounded-[2px] transition cursor-pointer"
                    >
                      Gửi Yêu Cầu Tới DPO
                    </button>
                  </form>
                )}
              </div>

            </div>

          </div>
        )}

        {/* Bottom Return Bar for easy 1-click exit back to previous state */}
        <div className="pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 print:hidden">
          <div className="text-left text-xs font-mono text-white/50">
            <span>Bạn đang xem chính sách tại: </span>
            <strong className="text-white">{PDPD_CONSENT_VERSION}</strong>
          </div>

          <button
            type="button"
            id="policy-page-bottom-back-btn"
            onClick={() => {
              soundFx.playClick();
              vibrateTap();
              onBack();
            }}
            className="w-full sm:w-auto px-6 py-2.5 rounded-[2px] bg-[#F7CAC9] text-[#190839] hover:bg-[#FCEEEC] font-mono font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition cursor-pointer shadow-lg active:scale-98"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{returnLabel}</span>
          </button>
        </div>

      </div>

      {/* Footer */}
      <footer className="mt-auto border-t border-white/10 bg-[#090218] px-4 py-6 text-center text-xs font-mono text-white/50 space-y-2 print:border-none">
        <p>BEYOND THE INTERNET 2027 • HỆ THỐNG ĐẤU TRƯỜNG TƯƠNG TÁC THỜI GIAN THỰC</p>
        <p className="text-[11px] text-white/40">
          Căn cứ Luật Bảo vệ dữ liệu cá nhân 91/2025/QH15, Nghị định 356/2025/NĐ-CP, Luật An ninh mạng 116/2025/QH15 & Luật Trí tuệ nhân tạo 134/2025/QH15.
        </p>
      </footer>

      {/* Floating Bookmark Toast */}
      {bookmarkToast && (
        <div className="fixed bottom-5 right-5 z-50 px-4 py-2.5 rounded-[2px] bg-[#1a1033] border border-amber-400/60 text-amber-100 font-mono text-xs shadow-2xl flex items-center gap-2.5 animate-fadeIn print:hidden">
          <BookmarkCheck className="w-4 h-4 text-amber-400 shrink-0" />
          <span>{bookmarkToast}</span>
        </div>
      )}

      {/* Smooth Back to Top Floating Button */}
      {showBackToTop && (
        <button
          type="button"
          id="btn-policy-back-to-top"
          onClick={handleScrollToTop}
          className="fixed bottom-20 right-5 sm:bottom-8 sm:right-8 z-50 p-3 rounded-full bg-[#1c0836]/90 hover:bg-[#F7CAC9] text-[#F7CAC9] hover:text-[#190839] border border-[#F7CAC9]/40 shadow-2xl backdrop-blur-md transition-all duration-300 active:scale-90 animate-fadeIn flex items-center justify-center cursor-pointer group print:hidden"
          title={localLanguage !== 'vi' ? 'Scroll smoothly back to top' : 'Cuộn mượt về đầu trang'}
          aria-label="Back to top"
        >
          <ArrowUp className="w-5 h-5 group-hover:-translate-y-0.5 transition-transform" />
        </button>
      )}

    </div>
  );
};
