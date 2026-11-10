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
  ArrowUp
} from 'lucide-react';
import { soundFx } from '../services/audioEffects';
import { vibrateTap, vibrateSuccess, vibrateCopy } from '../utils/hapticUtils';
import { PDPD_CONSENT_VERSION, PDPD_LAW_REFERENCE } from '../utils/vnLawCompliance';
import { useLanguage } from '../hooks/useLanguage';
import { UserInfo } from '../types';

interface PolicyPageProps {
  onBack: () => void;
  currentUser?: UserInfo | null;
  onRequestDataDeletion?: () => void;
  previousViewName?: string;
}

type PolicyTab = 'PRIVACY' | 'TERMS_AI' | 'SUBJECT_RIGHTS';

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
      if (tabParam === 'terms' || tabParam === 'ai' || tabParam === 'terms_ai') return 'TERMS_AI';
      if (tabParam === 'rights' || tabParam === 'dpo' || tabParam === 'subject_rights') return 'SUBJECT_RIGHTS';
    }
    return 'PRIVACY';
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

  // Track window/main scroll container progress and Back to Top threshold (> 400px)
  useEffect(() => {
    const getScrollMetrics = () => {
      const mainEl = document.querySelector('main');
      if (mainEl && mainEl.scrollHeight > mainEl.clientHeight + 10) {
        return {
          scrollTop: mainEl.scrollTop,
          scrollHeight: Math.max(1, mainEl.scrollHeight - mainEl.clientHeight),
        };
      }
      const docTop = window.scrollY || document.documentElement.scrollTop || 0;
      const docHeight = Math.max(1, (document.documentElement.scrollHeight || 1) - window.innerHeight);
      return { scrollTop: docTop, scrollHeight: docHeight };
    };

    const handleScroll = () => {
      if (typeof window === 'undefined') return;
      const { scrollTop, scrollHeight } = getScrollMetrics();

      setShowBackToTop(scrollTop > 400);

      if (scrollHeight > 0) {
        const progress = Math.min(100, Math.max(0, Math.round((scrollTop / scrollHeight) * 100)));
        setScrollProgress(progress);
      } else {
        setScrollProgress(100);
      }
    };

    const mainEl = document.querySelector('main');
    window.addEventListener('scroll', handleScroll, { passive: true });
    if (mainEl) {
      mainEl.addEventListener('scroll', handleScroll, { passive: true });
    }

    handleScroll();
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (mainEl) {
        mainEl.removeEventListener('scroll', handleScroll);
      }
    };
  }, [activeTab]);

  const handleScrollToTop = () => {
    soundFx.playClick();
    vibrateTap();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    const mainEl = document.querySelector('main');
    if (mainEl) {
      mainEl.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Automated 5-second scroll position autosave to LocalStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const intervalId = setInterval(() => {
      const mainEl = document.querySelector('main');
      const currentScrollTop = mainEl && mainEl.scrollHeight > mainEl.clientHeight + 10
        ? mainEl.scrollTop
        : (window.scrollY || document.documentElement.scrollTop || 0);
      const scrollHeight = mainEl && mainEl.scrollHeight > mainEl.clientHeight + 10
        ? Math.max(1, mainEl.scrollHeight - mainEl.clientHeight)
        : Math.max(1, (document.documentElement.scrollHeight || 1) - window.innerHeight);
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
    const currentScrollTop = mainEl && mainEl.scrollHeight > mainEl.clientHeight + 10
      ? mainEl.scrollTop
      : (window.scrollY || document.documentElement.scrollTop || 0);

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
        window.scrollTo({ top: savedBookmark.scrollTop, behavior: 'smooth' });
        if (mainEl) {
          mainEl.scrollTo({ top: savedBookmark.scrollTop, behavior: 'smooth' });
        }
      } else if (savedBookmark.scrollProgress > 0) {
        const scrollHeight = mainEl && mainEl.scrollHeight > mainEl.clientHeight + 10
          ? Math.max(1, mainEl.scrollHeight - mainEl.clientHeight)
          : Math.max(1, (document.documentElement.scrollHeight || 1) - window.innerHeight);
        const targetY = Math.round((savedBookmark.scrollProgress / 100) * scrollHeight);
        window.scrollTo({ top: targetY, behavior: 'smooth' });
        if (mainEl) {
          mainEl.scrollTo({ top: targetY, behavior: 'smooth' });
        }
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

  // Articles data for tab 1 with search indexing (Updated to Law 91/2025/QH15 & Decree 356/2025/ND-CP)
  const articles = useMemo(() => [
    {
      id: 'dieu-1',
      num: 1,
      title: 'Bên Kiểm Soát & Bên Xử Lý Dữ Liệu',
      content: 'Ban Tổ Chức Cuộc Thi Học Thuật Beyond The Internet 2026 phối hợp cùng Bộ phận Kỹ thuật & Công nghệ Hội trường thực hiện vai trò Bên Kiểm soát và Xử lý dữ liệu cá nhân.',
      bullets: [
        'Phạm vi áp dụng: Toàn bộ dữ liệu phát sinh qua tương tác web-app đấu trường trực tiếp (Live Arena), hạ tầng cơ sở dữ liệu Firebase Firestore và dịch vụ máy chủ tính điểm.',
        'Nguyên tắc minh bạch: Xử lý đúng mục đích đã thông báo, giới hạn dữ liệu ở mức tối thiểu cần thiết cho việc vận hành cuộc thi học thuật.'
      ]
    },
    {
      id: 'dieu-2',
      num: 2,
      title: 'Phân Loại Dữ Liệu Cá Nhân Cơ Bản & Nhạy Cảm (Điều 4 NĐ 356/2025/NĐ-CP)',
      content: 'Hệ thống phân loại và giới hạn chặt chẽ phạm vi dữ liệu thu thập theo quy định tại Điều 3 và Điều 4 Nghị định 356/2025/NĐ-CP:',
      bullets: [
        'Dữ liệu cá nhân cơ bản: Mã số sinh viên (MSSV), Họ và tên, Tên hiển thị (Nickname), Giới tính, Năm sinh, Địa chỉ Email xác thực tài khoản và Đội thi yêu thích. Hệ thống tự động sinh Mã định danh ẩn danh UID 12 số để đại diện cho người chơi trên màn chiếu và bảng xếp hạng công cộng mà không làm lộ thông tin định danh.',
        'Dữ liệu kỹ thuật & dữ liệu tương tác trong phiên thi (liên quan điểm l khoản 1 Điều 4 Nghị định 356/2025/NĐ-CP): Thời gian nộp đáp án (mili-giây), phương án trả lời câu hỏi, điểm số các vòng, độ trễ mạng (Ping/RTT) và nhật ký chuyển tab trong giờ mở câu hỏi nhằm chống gian lận.',
        'Cam kết không thu thập ngoài phạm vi: Hệ thống KHÔNG thu thập dữ liệu vị trí GPS, dữ liệu sinh trắc học, thông tin tài chính/ngân hàng và KHÔNG gắn công cụ theo dõi hành vi để chạy quảng cáo thương mại.'
      ]
    },
    {
      id: 'dieu-3',
      num: 3,
      title: 'Mục Đích Xử Lý & Nguyên Tắc Đồng Ý (Điều 9 Luật 91/2025/QH15)',
      content: 'Dữ liệu chỉ được xử lý sau khi người tham gia chủ động tích chọn đồng ý rõ ràng (không dùng ô tích sẵn; sự im lặng hoặc tiếp tục sử dụng không được coi là đồng ý theo khoản 4 Điều 9 Luật 91/2025/QH15 và khoản 3 Điều 6 Nghị định 356/2025/NĐ-CP) cho 04 mục đích cụ thể:',
      bullets: [
        'Xác thực tài khoản tham gia đấu trường câu hỏi trực tiếp và đồng bộ trạng thái thi đấu.',
        'Tính toán điểm số, tốc độ phản hồi và xếp hạng trên Bảng xếp hạng thời gian thực (Live Leaderboard).',
        'Đối soát danh tính chính xác khi trao giải thưởng hiện vật/học bổng và cấp giấy chứng nhận tham gia.',
        'Đảm bảo an ninh mạng, chống gian lận học thuật và ngăn chặn các cuộc tấn công bằng bot tự động.'
      ]
    },
    {
      id: 'dieu-4',
      num: 4,
      title: 'Biện Pháp Bảo Vệ & Thông Báo Sự Cố (Điều 23 Luật 91/2025 & Luật ANM 116/2025)',
      content: 'Hệ thống áp dụng các biện pháp bảo mật kỹ thuật và tổ chức theo chuẩn an toàn thông tin mạng:',
      bullets: [
        'Mã hóa mật khẩu & truyền tải: Mật khẩu tài khoản được băm một chiều bằng thuật toán PBKDF2/scrypt kèm salt ngẫu nhiên độc lập tại cả phía máy khách (Client) và máy chủ (Server), tuyệt đối không lưu trữ mật khẩu dạng văn bản thuần (plain text). Toàn bộ kết nối truyền tải qua giao thức TLS/HTTPS.',
        'Quy trình ứng phó sự cố 72 giờ: Trường hợp phát sinh sự cố rò rỉ hoặc xâm phạm dữ liệu cá nhân, Ban Tổ Chức thực hiện thông báo tới cơ quan chuyên trách bảo vệ dữ liệu cá nhân chậm nhất trong vòng 72 giờ theo khoản 1 Điều 23 Luật 91/2025/QH15 và Điều 28 Nghị định 356/2025/NĐ-CP.'
      ]
    },
    {
      id: 'dieu-5',
      num: 5,
      title: 'Thời Hạn Lưu Trữ Dữ Liệu & Nhật Ký Hệ Thống',
      content: 'Thời hạn lưu trữ được phân tách rõ giữa dữ liệu cuộc thi và nhật ký bảo mật:',
      bullets: [
        'Dữ liệu cá nhân phục vụ giải đấu: Lưu trữ trong suốt thời gian diễn ra cuộc thi BTI 2026 và tối đa 60 ngày sau đêm Chung kết để hoàn tất đối soát giải thưởng, sau đó được xóa hoặc ẩn danh hóa không thể khôi phục.',
        'Nhật ký kỹ thuật an ninh mạng: Lưu trữ bảo mật theo quy định tại Luật An ninh mạng số 116/2025/QH15 và Nghị định 333/2026/NĐ-CP phục vụ công tác đảm bảo an toàn thông tin.'
      ]
    },
    {
      id: 'dieu-6',
      num: 6,
      title: 'Bên Thứ Ba & Chuyển Dữ Liệu Xuyên Biên Giới (Điều 20 Luật 91/2025/QH15)',
      content: 'Ban Tổ Chức tuyệt đối không mua bán dữ liệu cá nhân dưới mọi hình thức (khoản 6 Điều 7 Luật 91/2025/QH15) và không chia sẻ dữ liệu cho mục đích quảng cáo. Để vận hành đồng bộ thời gian thực và trợ lý giải đáp thể lệ, ứng dụng sử dụng hạ tầng đám mây đặt tại nước ngoài của Google LLC (thuộc phạm vi Điều 20 Luật 91/2025/QH15 và Điều 18 Nghị định 356/2025/NĐ-CP):',
      bullets: [
        'Google Cloud Platform & Firebase Authentication/Firestore: Lưu trữ tài khoản, trạng thái câu hỏi và bảng điểm thời gian thực.',
        'Google Gemini API: Xử lý tin nhắn hỏi đáp thể lệ và tạo giọng đọc câu hỏi (hệ thống tự động lược bỏ thông tin định danh cá nhân như SĐT/Email/CCCD trước khi gửi yêu cầu).'
      ]
    },
    {
      id: 'dieu-7',
      num: 7,
      title: 'Bảo Vệ Dữ Liệu Trẻ Em & Người Chưa Thành Niên (Điều 24 Luật 91/2025/QH15)',
      content: 'Căn cứ Điều 24 Luật Bảo vệ dữ liệu cá nhân số 91/2025/QH15 và Luật Trẻ em 2016, đối với người tham gia là trẻ em (dưới 16 tuổi), việc xử lý dữ liệu cá nhân và công bố thông tin phải có sự đồng ý của cha mẹ hoặc người đại diện theo pháp luật (kèm sự đồng ý của trẻ từ đủ 7 tuổi trở lên).',
      bullets: [
        'Ban Tổ Chức ngừng xử lý và xóa dữ liệu cá nhân của trẻ em ngay khi cha mẹ/người giám hộ rút lại sự đồng ý hoặc theo yêu cầu của cơ quan bảo vệ trẻ em.'
      ]
    },
    {
      id: 'dieu-8',
      num: 8,
      title: 'Quyền Của Chủ Thể Dữ Liệu & Thời Hạn Thực Hiện (Điều 4 Luật 91/2025 & Điều 5 NĐ 356/2025)',
      content: 'Chủ thể dữ liệu có đầy đủ các quyền theo khoản 1 Điều 4 Luật 91/2025/QH15 (quyền được biết, đồng ý, rút lại sự đồng ý theo Điều 10, xem, chỉnh sửa, yêu cầu cung cấp, xóa dữ liệu, hạn chế/phản đối xử lý và khiếu nại). Thời hạn phản hồi tuân thủ Điều 5 Nghị định 356/2025/NĐ-CP:',
      bullets: [
        'Phản hồi & hướng dẫn thủ tục: Chậm nhất trong 02 ngày làm việc kể từ khi nhận yêu cầu.',
        'Xem, chỉnh sửa hoặc yêu cầu cung cấp dữ liệu: Hoàn thành trong 10–15 ngày.',
        'Rút lại sự đồng ý, hạn chế hoặc phản đối xử lý dữ liệu: Hoàn thành trong 15–20 ngày.',
        'Yêu cầu xóa dữ liệu cá nhân: Hoàn thành trong 20–30 ngày (hoặc người dùng có thể kích hoạt xóa/ẩn danh hóa tức thì ngay trong mục Hồ Sơ Cá Nhân trên ứng dụng).'
      ]
    }
  ], []);

  const filteredArticles = useMemo(() => {
    if (!searchQuery.trim()) return articles;
    const q = searchQuery.toLowerCase().trim();
    return articles.filter(a => 
      a.title.toLowerCase().includes(q) || 
      a.content.toLowerCase().includes(q) ||
      (a.bullets && a.bullets.some(b => b.toLowerCase().includes(q))) ||
      `điều ${a.num}`.includes(q)
    );
  }, [articles, searchQuery]);

  // Estimated reading time based on active tab content (assuming average reading speed of 200 wpm)
  const readingTimeEstimate = useMemo(() => {
    let wordCount = 0;
    if (activeTab === 'PRIVACY') {
      wordCount = articles.reduce((acc, art) => {
        const bulletWords = art.bullets ? art.bullets.join(' ').split(/\s+/).length : 0;
        return acc + art.title.split(/\s+/).length + art.content.split(/\s+/).length + bulletWords;
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
    <div className="w-full min-h-full h-max shrink-0 grow bg-[#0D0420] text-[#F5EFF9] flex flex-col font-sans select-text">
      
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
            <div className="w-7 h-7 rounded-[2px] bg-[#F7CAC9]/20 border border-[#F7CAC9]/40 text-[#F7CAC9] flex items-center justify-center font-black text-xs font-mono">
              BTI
            </div>
            <div className="text-left hidden sm:block">
              <div className="flex items-center gap-2">
                <h1 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                  Beyond The Internet 2026
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
                <span className="w-1.5 h-1.5 rounded-[2px] bg-amber-400" />
                <span>{localLanguage !== 'vi' ? 'Auto-saved' : 'Tự động lưu'}</span>
              </span>
            )}
          </div>

          <div className="flex-1 max-w-[200px] sm:max-w-xs h-1.5 bg-black/50 border border-white/10 rounded-[2px] overflow-hidden">
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
      <div className="grow max-w-5xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        
        {/* Saved Bookmark / Auto-saved Prompt Bar if saved position exists */}
        {savedBookmark && (
          <div className="p-3 sm:p-3.5 rounded-[2px] bg-amber-950/40 border border-amber-500/40 flex flex-wrap items-center justify-between gap-3 text-xs text-amber-200 font-mono shadow-lg print:hidden animate-fadeIn">
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
                  <span className="px-1.5 py-0.2 rounded-[2px] bg-amber-500/30 text-amber-200 text-[10px]">
                    {savedBookmark.scrollProgress}%
                  </span>
                </div>
                <p className="text-[11px] text-amber-200/80 truncate">
                  {savedBookmark.tab === 'PRIVACY' ? (localLanguage !== 'vi' ? '1. Privacy Policy' : 'Mục 1. Chính sách bảo mật') :
                   savedBookmark.tab === 'TERMS_AI' ? (localLanguage !== 'vi' ? '2. Contest Terms & AI' : 'Mục 2. Điều lệ & AI') :
                   (localLanguage !== 'vi' ? '3. Subject Rights' : 'Mục 3. Quyền chủ thể')}
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
        <div className="p-5 sm:p-6 rounded-[2px] bg-gradient-to-r from-[#1E0B38] via-[#15072B] to-[#120524] border border-[#F7CAC9]/30 shadow-xl relative overflow-hidden">
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
                  ? 'Official transparency statement of the Beyond The Internet 2026 Academic Competition regarding personal data protection, anti-cheat regulations, and ethical AI utilization.'
                  : 'Văn bản công khai chính thức của Cuộc thi Học thuật Beyond The Internet 2026 về bảo vệ dữ liệu cá nhân, quy chế thi đấu liêm chính và nguyên tắc sử dụng Trí tuệ Nhân tạo có trách nhiệm.'}
              </p>
            </div>

            <div className="shrink-0 text-left sm:text-right font-mono text-xs text-white/60 space-y-1">
              <div>Hiệu lực: <strong className="text-white">Mùa giải 2026</strong></div>
              <div className="text-[10px] text-emerald-400 font-semibold">Trạng thái: Đang áp dụng chính thức</div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-1 bg-white/5 border border-white/10 rounded-[2px] font-mono text-xs font-bold select-none print:hidden">
          <button
            type="button"
            id="tab-privacy-policy-btn"
            onClick={() => handleTabChange('PRIVACY')}
            className={`py-2.5 px-3 rounded-[2px] transition flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'PRIVACY' 
                ? 'bg-[#F7CAC9] text-[#190839] shadow-md font-black' 
                : 'text-white/70 hover:text-white hover:bg-white/5'
            }`}
          >
            <ShieldCheck className="w-4 h-4 shrink-0" />
            <span>1. {localLanguage !== 'vi' ? 'Privacy Policy (Law 91/2025)' : 'Chính Sách Bảo Mật (Luật 91 & NĐ 356)'}</span>
          </button>

          <button
            type="button"
            id="tab-contest-terms-btn"
            onClick={() => handleTabChange('TERMS_AI')}
            className={`py-2.5 px-3 rounded-[2px] transition flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'TERMS_AI' 
                ? 'bg-[#F7CAC9] text-[#190839] shadow-md font-black' 
                : 'text-white/70 hover:text-white hover:bg-white/5'
            }`}
          >
            <Bot className="w-4 h-4 shrink-0" />
            <span>2. {localLanguage !== 'vi' ? 'Contest Terms & AI Law 134' : 'Điều Lệ & Minh Bạch AI (Luật 134)'}</span>
          </button>

          <button
            type="button"
            id="tab-subject-rights-btn"
            onClick={() => handleTabChange('SUBJECT_RIGHTS')}
            className={`py-2.5 px-3 rounded-[2px] transition flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'SUBJECT_RIGHTS' 
                ? 'bg-[#F7CAC9] text-[#190839] shadow-md font-black' 
                : 'text-white/70 hover:text-white hover:bg-white/5'
            }`}
          >
            <Scale className="w-4 h-4 shrink-0" />
            <span>3. {localLanguage !== 'vi' ? 'Subject Rights & DPO' : 'Quyền Chủ Thể & DPO (Đ.5 NĐ 356)'}</span>
          </button>
        </div>

        {/* Tab 1: Privacy Policy (Luật 91/2025/QH15 & Nghị định 356/2025/NĐ-CP) */}
        {activeTab === 'PRIVACY' && (
          <div className="space-y-6 text-left leading-relaxed animate-fadeIn">
            
            {/* Quick in-page Search & Jump Filter */}
            <div className="p-3 sm:p-4 rounded-[2px] bg-white/5 border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 print:hidden">
              <div className="relative w-full sm:w-80">
                <Search className="w-3.5 h-3.5 text-white/40 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={localLanguage !== 'vi' ? 'Search legal articles...' : 'Tìm kiếm điều khoản (VD: xóa dữ liệu, xuyên biên giới...)'}
                  className="w-full pl-8 pr-7 py-1.5 bg-[#0D0420] border border-white/15 focus:border-[#F7CAC9] rounded-[2px] text-xs text-white placeholder:text-white/30 font-mono outline-none"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-white/40 hover:text-white p-0.5"
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

            <div className="p-4 rounded-[2px] bg-sky-950/40 border border-sky-500/30 text-sky-200 text-xs flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />
              <div>
                <strong className="block font-bold text-white mb-0.5 uppercase font-mono">
                  Cơ sở pháp lý cập nhật theo khung pháp luật Việt Nam 2025–2026
                </strong>
                Chính sách này được xây dựng dựa trên <strong>Luật Bảo vệ dữ liệu cá nhân số 91/2025/QH15</strong> và <strong>Nghị định số 356/2025/NĐ-CP</strong> (có hiệu lực từ 01/01/2026, thay thế Nghị định 13/2023/NĐ-CP), kết hợp cùng <strong>Luật An ninh mạng số 116/2025/QH15</strong> (và Nghị định 333/2026/NĐ-CP). Nền tảng chỉ xử lý dữ liệu khi có sự đồng ý tự nguyện, rõ ràng của người tham gia.
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
                        className="p-1 px-2 rounded-[2px] bg-white/5 hover:bg-white/15 text-white/60 hover:text-[#F7CAC9] transition cursor-pointer text-[11px] font-mono flex items-center gap-1 shrink-0 border border-white/10"
                        title={localLanguage !== 'vi' ? 'Copy link to this clause' : 'Sao chép đường dẫn trực tiếp điều khoản này'}
                      >
                        <Copy className="w-3 h-3" />
                        <span className="hidden sm:inline">{localLanguage !== 'vi' ? 'Copy Link' : 'Sao Chép Link'}</span>
                      </button>
                    </div>

                    <div className="text-xs sm:text-sm text-white/85 pl-2 sm:pl-7 leading-relaxed space-y-2">
                      <p>{art.content}</p>
                      {art.bullets && art.bullets.length > 0 && (
                        <ul className="list-disc list-outside ml-4 space-y-1.5 text-white/80">
                          {art.bullets.map((item, idx) => (
                            <li key={idx} className="leading-relaxed">
                              {item}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </section>
                ))
              )}
            </div>

          </div>
        )}

        {/* Tab 2: Contest Terms & AI Transparency */}
        {activeTab === 'TERMS_AI' && (
          <div className="space-y-6 text-left leading-relaxed animate-fadeIn">
            
            <div className="p-4 rounded-[2px] bg-purple-950/40 border border-purple-500/30 text-purple-200 text-xs flex items-start gap-3">
              <Bot className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
              <div>
                <strong className="block font-bold text-white mb-0.5 uppercase font-mono">
                  Minh bạch Trí tuệ Nhân tạo (Luật Trí tuệ nhân tạo số 134/2025/QH15 & Nghị định 142/2026/NĐ-CP)
                </strong>
                Căn cứ Điều 11 Luật Trí tuệ nhân tạo số 134/2025/QH15 (hiệu lực 01/03/2026) và Điều 18 Nghị định 142/2026/NĐ-CP (hiệu lực 01/05/2026), Beyond The Internet 2026 công bố rõ vai trò Bên triển khai hệ thống AI, gắn nhãn rõ ràng các tính năng tương tác với Trợ lý AI và giọng đọc AI tự động.
              </div>
            </div>

            {/* AI Policy */}
            <section className="p-4 sm:p-5 rounded-[2px] bg-white/5 border border-white/10 space-y-3">
              <h3 className="text-sm sm:text-base font-bold text-[#F7CAC9] flex items-center gap-2 font-mono">
                <Sparkles className="w-4 h-4 text-amber-300" />
                Mô Hình AI, Gắn Nhãn Minh Bạch & Phạm Vi Hoạt Động
              </h3>
              <div className="text-xs sm:text-sm text-white/85 pl-2 sm:pl-7 space-y-2">
                <p>
                  Hệ thống tích hợp mô hình <strong>Google Gemini Flash</strong> thông qua kênh proxy máy chủ (Server-side Proxy) và gắn nhãn nhận biết trực tiếp trên giao diện:
                </p>
                <ul className="list-disc list-inside space-y-1 text-white/80">
                  <li><strong>Thông báo tương tác AI (Khoản 1 Điều 11 Luật 134/2025/QH15):</strong> Khung Trợ lý Khán giả và tính năng đọc câu hỏi/đáp án đều được gắn nhãn rõ là hệ thống AI tự động để người dùng nhận biết ngay khi tiếp cận.</li>
                  <li><strong>Giới hạn của AI (Phân loại rủi ro thấp - Điều 9 Luật 134/2025/QH15):</strong> AI chỉ giải đáp thể lệ cuộc thi, tóm tắt câu hỏi và hỗ trợ dịch thuật/giọng đọc; AI không có quyền can thiệp vào mã nguồn tính điểm, không quyết định thí sinh thắng/thua và không sửa đổi kết quả thi đấu.</li>
                  <li><strong>Bảo vệ dữ liệu khi tương tác AI:</strong> Nội dung câu hỏi gửi tới API Google Gemini chỉ bao gồm văn bản thắc mắc và bối cảnh vòng thi; hệ thống không đính kèm mật khẩu hay mã định danh nhạy cảm của người dùng.</li>
                </ul>
              </div>
            </section>

            {/* Fair Play & Anti-Cheat */}
            <section className="p-4 sm:p-5 rounded-[2px] bg-white/5 border border-white/10 space-y-3">
              <h3 className="text-sm sm:text-base font-bold text-[#F7CAC9] flex items-center gap-2 font-mono">
                <Lock className="w-4 h-4 text-sky-400" />
                Quy Chế Liêm Chính Học Thuật & Phòng Chống Gian Lận
              </h3>
              <div className="text-xs sm:text-sm text-white/85 pl-2 sm:pl-7 space-y-2">
                <p>
                  Để đảm bảo sự công bằng tuyệt đối cho toàn bộ thí sinh và khán giả tham gia, hệ thống áp dụng các lớp bảo vệ kỹ thuật:
                </p>
                <ol className="list-decimal list-inside space-y-1 text-white/80">
                  <li><strong>Hàng rào CAPTCHA toán học:</strong> Bắt buộc xác thực chống bot tự động khi đăng ký hoặc đăng nhập.</li>
                  <li><strong>Khóa phiên thi đấu & Chống thoát màn hình (Anti-Exit Guard):</strong> Cảnh báo khi người chơi rời khỏi giao diện câu hỏi trong thời gian làm bài.</li>
                  <li><strong>Chống can thiệp gói tin (Anti-Tampering):</strong> Khóa thời gian gửi đáp án ở cấp độ server; mọi câu trả lời gửi sau khi hết thời gian đếm ngược sẽ tự động bị từ chối.</li>
                  <li><strong>Chế độ Safe Exam Browser (SEB):</strong> Khóa các phím tắt và chế độ kiểm tra phần tử F12 trên các thiết bị phòng máy của thí sinh.</li>
                </ol>
              </div>
            </section>

            {/* Contest Rules */}
            <section className="p-4 sm:p-5 rounded-[2px] bg-white/5 border border-white/10 space-y-3">
              <h3 className="text-sm sm:text-base font-bold text-[#F7CAC9] flex items-center gap-2 font-mono">
                <Award className="w-4 h-4 text-emerald-400" />
                Cơ Chế Tính Điểm & Giải Quyết Khiếu Nại
              </h3>
              <div className="text-xs sm:text-sm text-white/85 pl-2 sm:pl-7 space-y-2">
                <p>
                  Điểm số được tính dựa trên độ chính xác của đáp án và tốc độ gửi câu trả lời hợp lệ. Trong trường hợp xảy ra sự cố kỹ thuật về đường truyền Internet của hội trường, quyết định của Ban Trọng Tài và Ban Tổ Chức là quyết định cuối cùng.
                </p>
              </div>
            </section>

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
                    <strong className="text-sky-300">Bộ phận Kỹ Thuật & Pháp chế BTI 2026</strong>
                  </div>
                  <div>
                    <span className="text-white/50 block text-[10px]">Email tiếp nhận yêu cầu chủ thể dữ liệu:</span>
                    <a href="mailto:dpo-bti2026@domain.edu.vn" className="text-sky-300 underline font-bold">
                      dpo-bti2026@domain.edu.vn
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
        <p>BEYOND THE INTERNET 2026 • HỆ THỐNG ĐẤU TRƯỜNG TƯƠNG TÁC THỜI GIAN THỰC</p>
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
          className="fixed bottom-20 right-5 sm:bottom-8 sm:right-8 z-50 p-3 rounded-[2px] bg-[#1c0836]/90 hover:bg-[#F7CAC9] text-[#F7CAC9] hover:text-[#190839] border border-[#F7CAC9]/40 shadow-2xl backdrop-blur-md transition-all duration-300 active:scale-90 animate-fadeIn flex items-center justify-center cursor-pointer group print:hidden"
          title={localLanguage !== 'vi' ? 'Scroll smoothly back to top' : 'Cuộn mượt về đầu trang'}
          aria-label="Back to top"
        >
          <ArrowUp className="w-5 h-5 group-hover:-translate-y-0.5 transition-transform" />
        </button>
      )}

    </div>
  );
};
