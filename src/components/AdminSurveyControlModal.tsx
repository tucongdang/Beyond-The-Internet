import React, { useState, useEffect } from 'react';
import {
  X,
  FileSpreadsheet,
  CheckCircle2,
  ExternalLink,
  Users,
  Sparkles,
  Gift,
  RefreshCw,
  Send,
  AlertTriangle,
  Play,
  Square,
  HelpCircle,
  Eye,
  Sliders,
  Settings,
  Link as LinkIcon,
  FolderOpen,
  PlusCircle,
  BarChart3,
  Star,
  LogIn,
  LogOut,
  Check,
  Loader2,
  Edit3,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Save,
  Ticket,
  ClipboardList,
  Copy,
  Languages,
  Globe,
  Calendar,
  Flag,
  Clock
} from 'lucide-react';
import { GameState, AudienceSurveyConfig } from '../types';
import { syncService } from '../services/syncService';
import { DEFAULT_SURVEY_CONFIG, buildGoogleFormUrl } from '../utils/surveyUtils';
import { translationService, SUPPORTED_TRANSLATION_LANGUAGES, SurveyTranslation } from '../services/translationService';
import { soundFx } from '../services/audioEffects';
import { vibrateTap, vibrateSuccess } from '../utils/hapticUtils';
import {
  googleFormsService,
  extractFormIdFromUrl,
  GoogleDriveFormItem,
  GoogleFormAnalytics,
  EditableFormQuestionItem,
  EditableFormStructure
} from '../services/googleFormsService';

interface AdminSurveyControlModalProps {
  isOpen: boolean;
  onClose: () => void;
  gameState: GameState;
  activeAudienceCount?: number;
}

type TabType = 'SETTINGS' | 'EDITOR' | 'WORKSPACE' | 'ANALYTICS';

export const AdminSurveyControlModal: React.FC<AdminSurveyControlModalProps> = ({
  isOpen,
  onClose,
  gameState,
  activeAudienceCount = 0
}) => {
  const currentConfig: AudienceSurveyConfig = gameState.audience_survey || DEFAULT_SURVEY_CONFIG;

  const [activeTab, setActiveTab] = useState<TabType>('SETTINGS');
  const [formUrl, setFormUrl] = useState(currentConfig.form_url || '');
  const [googleFormId, setGoogleFormId] = useState(currentConfig.google_form_id || '');
  const [editUrl, setEditUrl] = useState(currentConfig.edit_url || '');
  const [sampleRate, setSampleRate] = useState<number>(currentConfig.sample_rate ?? 10);
  const [title, setTitle] = useState(currentConfig.title || DEFAULT_SURVEY_CONFIG.title || '');
  const [description, setDescription] = useState(currentConfig.description || DEFAULT_SURVEY_CONFIG.description || '');
  const [giftNote, setGiftNote] = useState(currentConfig.gift_note || DEFAULT_SURVEY_CONFIG.gift_note || '');
  const [autoShowOnSummary, setAutoShowOnSummary] = useState<boolean>(currentConfig.auto_show_on_summary ?? true);
  const [allowEmbeddedView, setAllowEmbeddedView] = useState<boolean>(currentConfig.allow_embedded_view ?? true);
  const [prefillNameEntry, setPrefillNameEntry] = useState(currentConfig.prefill_name_entry || '');
  const [prefillMssvEntry, setPrefillMssvEntry] = useState(currentConfig.prefill_mssv_entry || '');
  const [targetSeed, setTargetSeed] = useState(currentConfig.target_seed || 'BTI2026_FINALE_SURVEY');
  
  const formatDateTimeLocal = (timestamp?: number) => {
    if (!timestamp) return '';
    try {
      const d = new Date(timestamp);
      const pad = (n: number) => String(n).padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    } catch {
      return '';
    }
  };

  const [startTime, setStartTime] = useState<string>(() => formatDateTimeLocal(currentConfig.start_time));
  const [endTime, setEndTime] = useState<string>(() => formatDateTimeLocal(currentConfig.end_time));

  const [isSaving, setIsSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Google Forms Integration State
  const [isGoogleConnected, setIsGoogleConnected] = useState<boolean>(googleFormsService.isAuthenticated());
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isCreatingForm, setIsCreatingForm] = useState(false);
  const [isLoadingDriveForms, setIsLoadingDriveForms] = useState(false);
  const [driveForms, setDriveForms] = useState<GoogleDriveFormItem[]>([]);
  const [analytics, setAnalytics] = useState<GoogleFormAnalytics | null>(null);
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(false);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);

  // Form Structure / In-App Question Editor State
  const [formStructure, setFormStructure] = useState<EditableFormStructure | null>(null);
  const [isLoadingStructure, setIsLoadingStructure] = useState(false);
  const [isSavingStructure, setIsSavingStructure] = useState(false);
  const [structureError, setStructureError] = useState<string | null>(null);

  // Audience Experience In-Modal Preview State
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewStage, setPreviewStage] = useState<'INVITE' | 'FORM' | 'VOUCHER'>('INVITE');
  const [hasCopiedVoucher, setHasCopiedVoucher] = useState(false);
  const [previewLanguage, setPreviewLanguage] = useState<string>('vi');

  // AI Survey & Questions Translation State
  const [translations, setTranslations] = useState<Record<string, { title: string; description: string; gift_note: string }>>(() => {
    return gameState.audience_survey?.translations || {};
  });
  const [surveyTargetLang, setSurveyTargetLang] = useState<string>('en');
  const [isTranslatingSurvey, setIsTranslatingSurvey] = useState(false);
  const [surveyTransPreview, setSurveyTransPreview] = useState<SurveyTranslation | null>(null);
  const [isTranslatingQuestions, setIsTranslatingQuestions] = useState(false);
  const [questionsTargetLang, setQuestionsTargetLang] = useState<string>('en');

  // Sync state when gameState updates
  useEffect(() => {
    if (gameState.audience_survey) {
      const cfg = gameState.audience_survey;
      setFormUrl(cfg.form_url || '');
      setGoogleFormId(cfg.google_form_id || '');
      setEditUrl(cfg.edit_url || '');
      setSampleRate(cfg.sample_rate ?? 10);
      setTitle(cfg.title || DEFAULT_SURVEY_CONFIG.title || '');
      setDescription(cfg.description || DEFAULT_SURVEY_CONFIG.description || '');
      setGiftNote(cfg.gift_note || DEFAULT_SURVEY_CONFIG.gift_note || '');
      setAutoShowOnSummary(cfg.auto_show_on_summary ?? true);
      setAllowEmbeddedView(cfg.allow_embedded_view ?? true);
      setPrefillNameEntry(cfg.prefill_name_entry || '');
      setPrefillMssvEntry(cfg.prefill_mssv_entry || '');
      setTargetSeed(cfg.target_seed || 'BTI2026_FINALE_SURVEY');
      if (cfg.start_time !== undefined) {
        setStartTime(formatDateTimeLocal(cfg.start_time));
      }
      if (cfg.end_time !== undefined) {
        setEndTime(formatDateTimeLocal(cfg.end_time));
      }
      if (cfg.translations) {
        setTranslations(cfg.translations);
      }
    }
  }, [gameState.audience_survey]);

  // Keep Google connection status checked
  useEffect(() => {
    setIsGoogleConnected(googleFormsService.isAuthenticated());
  }, [isOpen]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleGoogleSignIn = async () => {
    setIsAuthenticating(true);
    try {
      const token = await googleFormsService.authenticate(true);
      if (token) {
        setIsGoogleConnected(true);
        showToast('Đã kết nối Google Workspace thành công!');
        // Pre-load forms
        loadDriveForms();
      } else {
        showToast('Chưa hoàn tất đăng nhập Google.');
      }
    } catch (err: any) {
      console.error('Google Sign In error:', err);
      showToast('Lỗi đăng nhập Google: ' + (err?.message || 'Thử lại'));
    } finally {
      setIsAuthenticating(false);
    }
  };

  const loadDriveForms = async () => {
    setIsLoadingDriveForms(true);
    try {
      const list = await googleFormsService.listForms();
      setDriveForms(list);
    } catch (err: any) {
      console.warn('Failed to load drive forms:', err);
    } finally {
      setIsLoadingDriveForms(false);
    }
  };

  const handleCreateDefaultForm = async () => {
    setIsCreatingForm(true);
    try {
      const result = await googleFormsService.createDefaultSurveyForm({
        eventTitle: 'Beyond The Internet 2026',
        giftNote: giftNote
      });

      setFormUrl(result.responderUri);
      setGoogleFormId(result.formId);
      setEditUrl(result.editUri);
      setTitle(result.title);
      setIsGoogleConnected(true);

      // Auto-save to Firestore immediately
      await handleSaveConfig({
        form_url: result.responderUri,
        google_form_id: result.formId,
        edit_url: result.editUri,
        title: result.title,
        enabled: true
      });

      showToast('Đã tạo Google Form BTI 2026 tự động trên Drive thành công!');
      setActiveTab('SETTINGS');
    } catch (err: any) {
      console.error('Create form failed:', err);
      showToast('Không thể tạo Form: ' + (err?.message || 'Kiểm tra quyền tài khoản Google Workspace'));
    } finally {
      setIsCreatingForm(false);
    }
  };

  const handleSelectDriveForm = async (item: GoogleDriveFormItem) => {
    const rawId = item.id;
    const viewUrl = `https://docs.google.com/forms/d/e/${rawId}/viewform`;
    const editLink = item.webViewLink || `https://docs.google.com/forms/d/${rawId}/edit`;

    setFormUrl(viewUrl);
    setGoogleFormId(rawId);
    setEditUrl(editLink);
    setTitle(item.name || title);

    await handleSaveConfig({
      form_url: viewUrl,
      google_form_id: rawId,
      edit_url: editLink,
      title: item.name || title,
      enabled: true
    });

    showToast(`Đã liên kết biểu mẫu: ${item.name}`);
    setActiveTab('SETTINGS');
  };

  const handleFetchAnalytics = async () => {
    const targetId = googleFormId || extractFormIdFromUrl(formUrl);
    if (!targetId) {
      setAnalyticsError('Vui lòng nhập đường dẫn Google Form hoặc tạo Form trước.');
      return;
    }

    if (!isGoogleConnected) {
      await handleGoogleSignIn();
      if (!googleFormsService.isAuthenticated()) return;
    }

    setIsLoadingAnalytics(true);
    setAnalyticsError(null);
    try {
      const data = await googleFormsService.getFormAnalytics(targetId);
      setAnalytics(data);
      if (!googleFormId) {
        setGoogleFormId(targetId);
      }
    } catch (err: any) {
      console.error('Failed to get analytics:', err);
      setAnalyticsError(err?.message || 'Không thể tải phản hồi từ Google Forms');
    } finally {
      setIsLoadingAnalytics(false);
    }
  };

  const loadFormStructure = async (targetIdInput?: string) => {
    const targetId = targetIdInput || googleFormId || extractFormIdFromUrl(formUrl);
    if (!targetId) {
      setStructureError('Vui lòng nhập đường dẫn Google Form hoặc tạo Form trước.');
      return;
    }

    if (!isGoogleConnected) {
      await handleGoogleSignIn();
      if (!googleFormsService.isAuthenticated()) return;
    }

    setIsLoadingStructure(true);
    setStructureError(null);
    try {
      const data = await googleFormsService.fetchFormStructure(targetId);
      setFormStructure(data);
      if (!googleFormId) {
        setGoogleFormId(targetId);
      }
    } catch (err: any) {
      console.error('Failed to load form structure:', err);
      setStructureError(err?.message || 'Không thể tải cấu trúc biểu mẫu từ Google Forms');
    } finally {
      setIsLoadingStructure(false);
    }
  };

  const handleSaveFormStructure = async () => {
    if (!formStructure) return;
    setIsSavingStructure(true);
    try {
      await googleFormsService.saveFormStructure(formStructure.formId, {
        description: formStructure.description,
        items: formStructure.items
      });
      await handleSaveConfig({
        description: formStructure.description
      });
      showToast('Đã lưu và cập nhật biểu mẫu lên Google Form thành công!');
    } catch (err: any) {
      console.error('Failed to save form structure:', err);
      showToast('Lỗi khi lưu lên Google Form: ' + (err?.message || 'Kiểm tra quyền truy cập'));
    } finally {
      setIsSavingStructure(false);
    }
  };

  const handleUpdateItem = (index: number, updated: Partial<EditableFormQuestionItem>) => {
    if (!formStructure) return;
    const nextItems = [...formStructure.items];
    nextItems[index] = { ...nextItems[index], ...updated };
    setFormStructure({ ...formStructure, items: nextItems });
  };

  const handleAddItem = (type: EditableFormQuestionItem['questionType']) => {
    if (!formStructure) return;
    const newItem: EditableFormQuestionItem = {
      id: `new_${Date.now()}`,
      title: type === 'SCALE' ? 'Bạn đánh giá nội dung này ở mức độ nào?' : 'Câu hỏi khảo sát mới',
      questionType: type,
      required: false,
      options: type === 'RADIO' || type === 'CHECKBOX' ? ['Lựa chọn 1', 'Lựa chọn 2'] : [],
      scaleLow: type === 'SCALE' ? 1 : undefined,
      scaleHigh: type === 'SCALE' ? 5 : undefined,
      scaleLowLabel: type === 'SCALE' ? 'Chưa hài lòng' : undefined,
      scaleHighLabel: type === 'SCALE' ? 'Rất hài lòng' : undefined
    };
    setFormStructure({
      ...formStructure,
      items: [...formStructure.items, newItem]
    });
  };

  const handleDeleteItem = (index: number) => {
    if (!formStructure) return;
    const nextItems = formStructure.items.filter((_, i) => i !== index);
    setFormStructure({ ...formStructure, items: nextItems });
  };

  const handleMoveItem = (index: number, direction: 'UP' | 'DOWN') => {
    if (!formStructure) return;
    const targetIndex = direction === 'UP' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= formStructure.items.length) return;
    const nextItems = [...formStructure.items];
    const temp = nextItems[index];
    nextItems[index] = nextItems[targetIndex];
    nextItems[targetIndex] = temp;
    setFormStructure({ ...formStructure, items: nextItems });
  };

  const handleAddOption = (itemIndex: number) => {
    if (!formStructure) return;
    const item = formStructure.items[itemIndex];
    const newOptions = [...item.options, `Lựa chọn ${item.options.length + 1}`];
    handleUpdateItem(itemIndex, { options: newOptions });
  };

  const handleUpdateOption = (itemIndex: number, optIndex: number, val: string) => {
    if (!formStructure) return;
    const item = formStructure.items[itemIndex];
    const newOptions = [...item.options];
    newOptions[optIndex] = val;
    handleUpdateItem(itemIndex, { options: newOptions });
  };

  const handleDeleteOption = (itemIndex: number, optIndex: number) => {
    if (!formStructure) return;
    const item = formStructure.items[itemIndex];
    if (item.options.length <= 1) {
      showToast('Cần giữ ít nhất 1 lựa chọn đáp án');
      return;
    }
    const newOptions = item.options.filter((_, i) => i !== optIndex);
    handleUpdateItem(itemIndex, { options: newOptions });
  };

  const handleSaveConfig = async (override?: Partial<AudienceSurveyConfig>) => {
    setIsSaving(true);
    try {
      const derivedId = override?.google_form_id || googleFormId || extractFormIdFromUrl(formUrl) || undefined;
      const updated: AudienceSurveyConfig = {
        enabled: override?.enabled !== undefined ? override.enabled : Boolean(currentConfig.enabled),
        form_url: (override?.form_url !== undefined ? override.form_url : formUrl).trim(),
        google_form_id: derivedId,
        edit_url: override?.edit_url !== undefined ? override.edit_url : editUrl,
        sample_rate: Number(sampleRate) || 10,
        title: (override?.title !== undefined ? override.title : title).trim(),
        description: description.trim(),
        gift_note: giftNote.trim(),
        auto_show_on_summary: autoShowOnSummary,
        allow_embedded_view: allowEmbeddedView,
        prefill_name_entry: prefillNameEntry.trim() || undefined,
        prefill_mssv_entry: prefillMssvEntry.trim() || undefined,
        target_seed: targetSeed.trim() || 'BTI2026_FINALE_SURVEY',
        force_active: override?.force_active !== undefined ? override.force_active : Boolean(currentConfig.force_active),
        start_time: override?.start_time !== undefined 
          ? override.start_time 
          : (startTime ? new Date(startTime).getTime() : undefined),
        end_time: override?.end_time !== undefined 
          ? override.end_time 
          : (endTime ? new Date(endTime).getTime() : undefined),
        translations: override?.translations !== undefined ? override.translations : (Object.keys(translations).length > 0 ? translations : undefined),
        updated_at: Date.now()
      };

      await syncService.updateGameState({
        audience_survey: updated
      });

      showToast('Đã lưu cấu hình khảo sát!');
    } catch (err: any) {
      console.error('Failed to save survey config:', err);
      showToast('Lỗi khi lưu cấu hình');
    } finally {
      setIsSaving(false);
    }
  };

  const handleStartSurvey = async () => {
    soundFx.playReveal(true);
    const now = Date.now();
    await handleSaveConfig({
      enabled: true,
      force_active: true,
      start_time: now
    });
    setStartTime(formatDateTimeLocal(now));
    showToast('🚀 ĐÃ BẮT ĐẦU MỞ KHẢO SÁT! Khán giả thuộc tỷ lệ mẫu đã nhận được thông báo.');
  };

  const handleEndSurvey = async () => {
    soundFx.playLock();
    const now = Date.now();
    await handleSaveConfig({
      force_active: false,
      enabled: false,
      end_time: now
    });
    setEndTime(formatDateTimeLocal(now));
    showToast('🏁 ĐÃ KẾT THÚC & KHÓA KHẢO SÁT!');
  };

  const handleAiTranslateSurveyInfo = async () => {
    if (!title && !description && !giftNote) {
      showToast('Cần nhập tiêu đề hoặc lời kêu gọi trước khi dịch.');
      return;
    }
    setIsTranslatingSurvey(true);
    setSurveyTransPreview(null);
    soundFx.playClick();
    vibrateTap();
    try {
      const res = await translationService.translateSurveyConfig(
        { title, description, gift_note: giftNote },
        surveyTargetLang
      );
      setSurveyTransPreview(res);
      soundFx.playTing();
      vibrateSuccess();
      const langLabel = SUPPORTED_TRANSLATION_LANGUAGES.find(l => l.code === surveyTargetLang)?.label || surveyTargetLang;
      showToast(`Đã dịch AI sang ${langLabel}!`);
    } catch (err: any) {
      console.error('Survey translate error:', err);
      showToast('Lỗi khi dịch AI. Vui lòng thử lại.');
    } finally {
      setIsTranslatingSurvey(false);
    }
  };

  const handleSaveSurveyTranslation = async (lang: string, trans: SurveyTranslation) => {
    const updated = {
      ...translations,
      [lang]: trans
    };
    setTranslations(updated);
    await handleSaveConfig({ translations: updated });
    showToast(`Đã lưu bản dịch ${lang.toUpperCase()} vào cấu hình khảo sát!`);
    setSurveyTransPreview(null);
  };

  const handleApplySurveyTranslationToMain = (trans: SurveyTranslation) => {
    if (trans.title) setTitle(trans.title);
    if (trans.description) setDescription(trans.description);
    if (trans.gift_note) setGiftNote(trans.gift_note);
    showToast('Đã áp dụng bản dịch vào các trường nội dung chính!');
    setSurveyTransPreview(null);
  };

  const handleRemoveSurveyTranslation = async (lang: string) => {
    const updated = { ...translations };
    delete updated[lang];
    setTranslations(updated);
    await handleSaveConfig({ translations: Object.keys(updated).length > 0 ? updated : undefined });
    showToast(`Đã xóa bản dịch ${lang.toUpperCase()}.`);
  };

  const handleAiTranslateFormQuestions = async (targetLang: string) => {
    if (!formStructure || !formStructure.items || formStructure.items.length === 0) {
      showToast('Chưa có câu hỏi nào để dịch.');
      return;
    }
    setIsTranslatingQuestions(true);
    soundFx.playClick();
    vibrateTap();
    try {
      const translatedItems = await translationService.translateSurveyQuestions(
        formStructure.items,
        targetLang
      );

      const updatedStructure: EditableFormStructure = {
        ...formStructure,
        items: formStructure.items.map((item, idx) => {
          const trans = translatedItems[idx];
          if (!trans) return item;
          return {
            ...item,
            title: trans.title || item.title,
            description: trans.description !== undefined ? trans.description : item.description,
            options: Array.isArray(trans.options) && trans.options.length > 0 ? trans.options : item.options,
            scaleLowLabel: trans.scaleLowLabel || item.scaleLowLabel,
            scaleHighLabel: trans.scaleHighLabel || item.scaleHighLabel
          };
        })
      };

      setFormStructure(updatedStructure);
      soundFx.playTing();
      vibrateSuccess();
      const langLabel = SUPPORTED_TRANSLATION_LANGUAGES.find(l => l.code === targetLang)?.label || targetLang;
      showToast(`Đã dịch toàn bộ câu hỏi sang ${langLabel}! Nhớ nhấn "Lưu Biểu Mẫu" để cập nhật.`);
    } catch (err: any) {
      console.error('Failed to translate questions:', err);
      showToast('Lỗi khi dịch AI câu hỏi khảo sát.');
    } finally {
      setIsTranslatingQuestions(false);
    }
  };

  const handleAiTranslateSingleQuestion = async (index: number, targetLang: string) => {
    if (!formStructure || !formStructure.items[index]) return;
    const item = formStructure.items[index];
    soundFx.playClick();
    vibrateTap();
    try {
      const res = await translationService.translateSurveyQuestions([item], targetLang);
      if (res && res[0]) {
        const trans = res[0];
        handleUpdateItem(index, {
          title: trans.title || item.title,
          description: trans.description !== undefined ? trans.description : item.description,
          options: Array.isArray(trans.options) && trans.options.length > 0 ? trans.options : item.options,
          scaleLowLabel: trans.scaleLowLabel || item.scaleLowLabel,
          scaleHighLabel: trans.scaleHighLabel || item.scaleHighLabel
        });
        soundFx.playTing();
        showToast(`Đã dịch câu hỏi #${index + 1}!`);
      }
    } catch (err: any) {
      console.error('Failed to translate single question:', err);
      showToast('Lỗi dịch câu hỏi.');
    }
  };

  const handleToggleMaster = async () => {
    const nextState = !Boolean(currentConfig.enabled);
    await handleSaveConfig({ enabled: nextState });
  };

  const handleToggleInstantTrigger = async () => {
    const nextForce = !Boolean(currentConfig.force_active);
    await handleSaveConfig({ enabled: true, force_active: nextForce });
    if (nextForce) {
      showToast(`Đã phát tín hiệu khảo sát tức thì tới ${sampleRate}% khán giả!`);
    } else {
      showToast('Đã dừng phát tín hiệu khảo sát tức thì.');
    }
  };

  const handleRerollSeed = () => {
    const newSeed = `BTI_${Date.now().toString(36).toUpperCase()}`;
    setTargetSeed(newSeed);
    showToast('Đã đổi mã Seed! Bấm "Lưu Cấu Hình" để áp dụng đợt chọn 10% mới.');
  };

  const handleTestPreviewOnMyDevice = () => {
    setShowPreviewModal(true);
    setPreviewStage('INVITE');
    if (typeof window !== 'undefined') {
      localStorage.setItem('BTI_SURVEY_FORCE_PREVIEW', 'true');
      window.dispatchEvent(new Event('storage'));
    }
    showToast('Đang mở bản xem trước giao diện khảo sát...');
  };

  const handleClosePreviewModal = () => {
    setShowPreviewModal(false);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('BTI_SURVEY_FORCE_PREVIEW');
      window.dispatchEvent(new Event('storage'));
    }
  };

  if (!isOpen) return null;

  const isEnabled = Boolean(currentConfig.enabled);
  const isForceActive = Boolean(currentConfig.force_active);
  const estimatedSampleCount = Math.max(1, Math.round((activeAudienceCount * sampleRate) / 100));
  const isTestingPreview = typeof window !== 'undefined' && Boolean(localStorage.getItem('BTI_SURVEY_FORCE_PREVIEW'));

  return (
    <div 
      className="fixed inset-0 z-[80] flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-xl animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-4xl bg-slate-950/95 border border-[#F7CAC9]/40 rounded-[6px] shadow-2xl shadow-purple-950/60 overflow-hidden flex flex-col max-h-[92vh] transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="p-4 sm:p-5 border-b border-[#F7CAC9]/25 flex items-center justify-between bg-gradient-to-r from-purple-950/60 via-slate-900 to-purple-950/60 shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-[4px] bg-[#F7CAC9]/15 border border-[#F7CAC9]/40 flex items-center justify-center text-[#F7CAC9] shrink-0 shadow-inner">
              <FileSpreadsheet className="w-5 h-5 text-[#F7CAC9]" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-black text-white tracking-wide">
                  Khảo Sát Khán Giả (10%) & Google Forms
                </h3>
                <span className={`text-[9px] font-mono font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-[2px] border ${
                  isEnabled 
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm shadow-emerald-900/30' 
                    : 'bg-slate-800/60 text-slate-400 border-slate-700/60'
                }`}>
                  {isEnabled ? 'ĐANG BẬT' : 'ĐANG TẮT'}
                </span>
                {isForceActive && (
                  <span className="text-[9px] font-mono font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-[2px] bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-400 inline-block animate-ping" />
                    LIVE ON AIR
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Mô-đun thu thập phản hồi Google Forms tự động bốc thăm ngẫu nhiên {sampleRate}% khán giả theo User ID
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-[4px] hover:bg-white/10 transition cursor-pointer border border-transparent hover:border-slate-700/50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-4 sm:px-6 border-b border-slate-800/80 bg-slate-950/90 flex items-center gap-1 sm:gap-2 shrink-0 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setActiveTab('SETTINGS')}
            className={`py-3 px-3.5 text-xs font-mono font-bold transition-all flex items-center gap-2 border-b-2 cursor-pointer whitespace-nowrap ${
              activeTab === 'SETTINGS'
                ? 'border-[#F7CAC9] text-[#F7CAC9] bg-purple-950/40 font-extrabold'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Cấu Hình & Phát Lệnh</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('EDITOR');
              if (!formStructure && (googleFormId || formUrl)) {
                loadFormStructure();
              }
            }}
            className={`py-3 px-3.5 text-xs font-mono font-bold transition-all flex items-center gap-2 border-b-2 cursor-pointer whitespace-nowrap ${
              activeTab === 'EDITOR'
                ? 'border-[#F7CAC9] text-[#F7CAC9] bg-purple-950/40 font-extrabold'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Chỉnh Sửa Câu Hỏi</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('WORKSPACE');
              if (isGoogleConnected && driveForms.length === 0) {
                loadDriveForms();
              }
            }}
            className={`py-3 px-3.5 text-xs font-mono font-bold transition-all flex items-center gap-2 border-b-2 cursor-pointer relative whitespace-nowrap ${
              activeTab === 'WORKSPACE'
                ? 'border-[#F7CAC9] text-[#F7CAC9] bg-purple-950/40 font-extrabold'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
          >
            <FolderOpen className="w-3.5 h-3.5" />
            <span>Google Drive Workspace</span>
            {isGoogleConnected && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block shadow-sm shadow-emerald-400" title="Google Connected" />
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('ANALYTICS');
              if (!analytics && (googleFormId || formUrl)) {
                handleFetchAnalytics();
              }
            }}
            className={`py-3 px-3.5 text-xs font-mono font-bold transition-all flex items-center gap-2 border-b-2 cursor-pointer whitespace-nowrap ${
              activeTab === 'ANALYTICS'
                ? 'border-[#F7CAC9] text-[#F7CAC9] bg-purple-950/40 font-extrabold'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Thống Kê Live</span>
          </button>
        </div>

        {/* Modal Scrollable Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {/* TAB 1: SETTINGS */}
          {activeTab === 'SETTINGS' && (
            <>
              {/* Status Quick Bar */}
              <div className="p-4 rounded-[4px] bg-slate-900/80 border border-sky-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs font-mono">
                    <Users className="w-4 h-4 text-sky-400" />
                    <span className="text-slate-300">Khán giả đang online:</span>
                    <strong className="text-white text-sm font-bold">{activeAudienceCount} người</strong>
                  </div>
                  <div className="text-xs text-slate-400 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-pink-400" />
                    <span>
                      Tỷ lệ bốc thăm <strong>{sampleRate}%</strong> → Dự kiến khoảng <strong className="text-sky-300">{estimatedSampleCount} khán giả</strong> sẽ nhận được khảo sát.
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto shrink-0">
                  {/* Nút BẮT ĐẦU */}
                  <button
                    type="button"
                    onClick={handleStartSurvey}
                    disabled={!formUrl.trim() || (isEnabled && isForceActive)}
                    className={`px-3 py-2 rounded-[3px] text-xs font-mono font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md ${
                      isEnabled && isForceActive
                        ? 'bg-slate-800 text-slate-500 border border-white/5 cursor-not-allowed'
                        : 'bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-400/40 shadow-emerald-950/40 active:scale-95'
                    }`}
                    title="Bắt đầu mở khảo sát ngay lập tức cho khán giả"
                  >
                    <Play className="w-3.5 h-3.5 fill-current text-white" />
                    <span>Bắt Đầu</span>
                  </button>

                  {/* Nút KẾT THÚC */}
                  <button
                    type="button"
                    onClick={handleEndSurvey}
                    disabled={!isEnabled && !isForceActive}
                    className={`px-3 py-2 rounded-[3px] text-xs font-mono font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md ${
                      !isEnabled && !isForceActive
                        ? 'bg-slate-800 text-slate-500 border border-white/5 cursor-not-allowed'
                        : 'bg-rose-600 hover:bg-rose-500 text-white border border-rose-400/50 shadow-rose-950/40 active:scale-95'
                    }`}
                    title="Kết thúc và đóng toàn bộ khảo sát ngay lập tức"
                  >
                    <Flag className="w-3.5 h-3.5 text-white" />
                    <span>Kết Thúc</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleToggleMaster}
                    className={`px-3 py-2 rounded-[3px] text-xs font-mono font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md ${
                      isEnabled
                        ? 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/10'
                    }`}
                  >
                    {isEnabled ? 'Tạm Dừng' : 'Kích Hoạt'}
                  </button>
                </div>
              </div>

              {/* Scheduling Section: Thiết lập Ngày & Giờ Tổ Chức (Tránh rò rỉ nội dung cho khán giả đăng ký sớm) */}
              <div className="p-4 rounded-[6px] bg-slate-900/60 border border-indigo-500/30 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <label className="text-xs font-mono font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                    Thiết Lập Ngày Giờ Mở Khảo Sát (Bảo Vệ Đề / Tránh Rò Rỉ Sớm)
                  </label>
                  <span className="text-[11px] font-mono text-slate-400">
                    Khán giả đăng ký trước giờ này sẽ KHÔNG nhìn thấy khảo sát
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <span className="text-[11px] font-mono text-slate-300 block mb-1">
                      Thời điểm bắt đầu mở (Start Time):
                    </span>
                    <input
                      type="datetime-local"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="w-full bg-slate-950 border border-indigo-500/30 rounded-[3px] px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-indigo-400"
                    />
                    <span className="text-[10px] text-slate-500 mt-0.5 block">
                      Để trống nếu muốn mở theo nút Bắt đầu của Ban Tổ Chức
                    </span>
                  </div>

                  <div>
                    <span className="text-[11px] font-mono text-slate-300 block mb-1">
                      Thời điểm kết thúc đóng (End Time):
                    </span>
                    <input
                      type="datetime-local"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="w-full bg-slate-950 border border-indigo-500/30 rounded-[3px] px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-indigo-400"
                    />
                    <span className="text-[10px] text-slate-500 mt-0.5 block">
                      Tự động đóng khảo sát khi vượt quá thời gian này
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-white/5">
                  <div className="text-[11px] font-mono text-slate-400 flex items-center gap-1.5">
                    <Clock className="w-3 h-3 text-sky-400" />
                    <span>Trạng thái khung giờ:</span>
                    {startTime && new Date(startTime).getTime() > Date.now() ? (
                      <span className="text-amber-400 font-bold">Chưa đến giờ mở (Đang khóa an toàn)</span>
                    ) : endTime && new Date(endTime).getTime() < Date.now() ? (
                      <span className="text-rose-400 font-bold">Đã hết hạn kết thúc (Đã đóng)</span>
                    ) : (
                      <span className="text-emerald-400 font-bold">Trong khung giờ hợp lệ</span>
                    )}
                  </div>

                  {(startTime || endTime) && (
                    <button
                      type="button"
                      onClick={() => {
                        setStartTime('');
                        setEndTime('');
                      }}
                      className="text-[11px] font-mono text-slate-400 hover:text-white underline cursor-pointer"
                    >
                      Xóa khung giờ
                    </button>
                  )}
                </div>
              </div>

              {/* Form Link Section with Quick Actions */}
              <div className="space-y-2 p-4 rounded-[6px] bg-slate-900/50 border border-slate-800">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <LinkIcon className="w-3.5 h-3.5 text-[#F7CAC9]" />
                    Đường Dẫn Biểu Mẫu (Form URL) <span className="text-rose-400">*</span>
                  </label>
                  <div className="flex items-center gap-3">
                    {editUrl && (
                      <a
                        href={editUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 underline"
                      >
                        Sửa trên Google Forms <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                    {formUrl && (
                      <a
                        href={formUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-sky-400 hover:text-sky-300 flex items-center gap-1 underline"
                      >
                        Xem thử <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={formUrl}
                    onChange={(e) => setFormUrl(e.target.value)}
                    placeholder="https://docs.google.com/forms/d/e/.../viewform hoặc tạo tự động bên dưới"
                    className="flex-1 px-3.5 py-2.5 rounded-[4px] bg-slate-950 border border-slate-700 focus:border-[#F7CAC9] text-white text-xs font-mono outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setActiveTab('WORKSPACE')}
                    className="px-3 py-2 rounded-[4px] bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap border border-slate-700"
                  >
                    <FolderOpen className="w-3.5 h-3.5 text-pink-400" />
                    Quản lý Form
                  </button>
                </div>

                {/* Direct Google Action Chips */}
                <div className="flex items-center gap-2 pt-1 flex-wrap">
                  <button
                    type="button"
                    onClick={handleCreateDefaultForm}
                    disabled={isCreatingForm}
                    className="px-2.5 py-1 rounded bg-[#F7CAC9]/10 hover:bg-[#F7CAC9]/20 text-[#F7CAC9] border border-[#F7CAC9]/30 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
                  >
                    {isCreatingForm ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <PlusCircle className="w-3 h-3" />
                    )}
                    1-Click Tạo Form Khảo Sát BTI 2026 trên Google Drive
                  </button>

                  {formUrl && (
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('ANALYTICS');
                        handleFetchAnalytics();
                      }}
                      className="px-2.5 py-1 rounded bg-sky-950/60 hover:bg-sky-900/60 text-sky-300 border border-sky-800/60 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <BarChart3 className="w-3 h-3" />
                      Xem Thống Kê Phản Hồi Trực Tiếp
                    </button>
                  )}
                </div>
              </div>

              {/* Sampling Rate Slider & Visual Distribution Simulator */}
              <div className="space-y-3 p-4 rounded-[6px] bg-slate-900/80 border border-slate-700/60 shadow-inner">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <label className="text-xs font-mono font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-[#F7CAC9]" />
                    Tỷ lệ bốc thăm ngẫu nhiên: <span className="text-[#F7CAC9] text-sm font-black">{sampleRate}%</span>
                  </label>
                  <span className="text-[11px] font-mono text-slate-400">
                    Thuật toán DJB2 băm User ID ổn định tuyệt đối
                  </span>
                </div>

                {/* Slider Input */}
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="1"
                    max="100"
                    step="1"
                    value={sampleRate}
                    onChange={(e) => setSampleRate(Number(e.target.value))}
                    className="w-full accent-[#F7CAC9] cursor-pointer h-2 bg-slate-700 rounded-lg"
                  />
                  <span className="font-mono text-xs font-bold text-white bg-slate-800 px-3 py-1 rounded border border-slate-700 min-w-[55px] text-center">
                    {sampleRate}%
                  </span>
                </div>

                {/* Visual Ratio Bar & Audience Headcount Simulation */}
                <div className="space-y-1.5 p-2.5 rounded-[4px] bg-slate-950/70 border border-slate-800">
                  <div className="flex items-center justify-between text-[11px] font-mono">
                    <span className="text-[#F7CAC9] font-bold flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#F7CAC9] inline-block animate-pulse" />
                      Nhóm nhận khảo sát ({sampleRate}%): ~{estimatedSampleCount} người
                    </span>
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-slate-600 inline-block" />
                      Khán giả còn lại ({100 - sampleRate}%): ~{Math.max(0, activeAudienceCount - estimatedSampleCount)} người
                    </span>
                  </div>
                  <div className="w-full h-3 rounded-full bg-slate-800 overflow-hidden flex border border-slate-700 shadow-inner">
                    <div 
                      className="h-full bg-gradient-to-r from-[#92A8D1] via-[#F7CAC9] to-[#E39A96] transition-all duration-300"
                      style={{ width: `${sampleRate}%` }}
                    />
                    <div 
                      className="h-full bg-slate-800/80 transition-all duration-300"
                      style={{ width: `${100 - sampleRate}%` }}
                    />
                  </div>
                </div>

                {/* Presets Row */}
                <div className="flex items-center gap-2 pt-0.5 flex-wrap">
                  <span className="text-[11px] text-slate-400 font-mono">Preset nhanh:</span>
                  {[
                    { rate: 5, label: '5%' },
                    { rate: 10, label: '★ 10% (Chuẩn BTI)' },
                    { rate: 15, label: '15%' },
                    { rate: 20, label: '20%' },
                    { rate: 50, label: '50%' },
                    { rate: 100, label: '100% (Tất cả)' },
                  ].map((preset) => (
                    <button
                      key={preset.rate}
                      type="button"
                      onClick={() => setSampleRate(preset.rate)}
                      className={`px-2.5 py-1 rounded-[3px] text-[11px] font-mono font-bold transition cursor-pointer ${
                        sampleRate === preset.rate
                          ? 'bg-[#F7CAC9]/25 text-[#F7CAC9] border border-[#F7CAC9]/50 shadow-sm'
                          : 'bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-700'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}

                  <button
                    type="button"
                    onClick={() => setShowPreviewModal(true)}
                    className="ml-auto px-2.5 py-1 rounded-[3px] bg-slate-800 hover:bg-slate-700 text-[#92A8D1] hover:text-white border border-[#92A8D1]/40 text-[11px] font-mono font-bold flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <Eye className="w-3 h-3" />
                    Xem trước giao diện Khán giả
                  </button>
                </div>
              </div>

              {/* Trigger Condition Checkboxes */}
              <div className="space-y-2.5">
                <label className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider block">
                  Điều kiện kích hoạt hiển thị
                </label>

                <label className="flex items-start gap-2.5 p-3 rounded-[4px] bg-slate-900/40 border border-slate-800 cursor-pointer hover:bg-slate-900/70 transition">
                  <input
                    type="checkbox"
                    checked={autoShowOnSummary}
                    onChange={(e) => setAutoShowOnSummary(e.target.checked)}
                    className="mt-0.5 rounded accent-pink-500"
                  />
                  <div className="text-xs">
                    <span className="font-bold text-white block">
                      Tự động hiển thị khi Bế mạc / Vinh danh (Show Summary / Grand Finale)
                    </span>
                    <span className="text-slate-400 text-[11px]">
                      Khi MC chiếu bảng xếp hạng chung cuộc hoặc lễ trao giải, modal khảo sát sẽ tự động hiện lên trên máy 10% khán giả được chọn.
                    </span>
                  </div>
                </label>

                <label className="flex items-start gap-2.5 p-3 rounded-[4px] bg-slate-900/40 border border-slate-800 cursor-pointer hover:bg-slate-900/70 transition">
                  <input
                    type="checkbox"
                    checked={allowEmbeddedView}
                    onChange={(e) => setAllowEmbeddedView(e.target.checked)}
                    className="mt-0.5 rounded accent-pink-500"
                  />
                  <div className="text-xs">
                    <span className="font-bold text-white block">
                      Cho phép điền khảo sát trực tiếp trong ứng dụng (Iframe)
                    </span>
                    <span className="text-slate-400 text-[11px]">
                      Khán giả có thể làm khảo sát ngay mà không cần rời màn hình hoặc nhảy sang tab khác.
                    </span>
                  </div>
                </label>
              </div>

              {/* Text Customization (Title, Description, Gift Note) */}
              <div className="space-y-3 p-3.5 rounded-[6px] bg-slate-900/40 border border-slate-800">
                <label className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider block">
                  Nội dung thông điệp & Quà tặng
                </label>

                <div>
                  <span className="text-[11px] text-slate-400 mb-1 block">Tiêu đề khảo sát:</span>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Khảo Sát Khán Giả BTI 2026"
                    className="w-full px-3 py-2 rounded-[3px] bg-slate-950 border border-slate-700 text-white text-xs outline-none focus:border-[#F7CAC9]"
                  />
                </div>

                <div>
                  <span className="text-[11px] text-slate-400 mb-1 block">Lời mời tham gia:</span>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={2}
                    placeholder="Bạn là 1 trong 10% khán giả đại diện được chọn ngẫu nhiên tham gia khảo sát nhanh nhận quà tri ân từ Ban Tổ Chức!"
                    className="w-full px-3 py-2 rounded-[3px] bg-slate-950 border border-slate-700 text-white text-xs outline-none focus:border-[#F7CAC9] resize-none"
                  />
                </div>

                <div>
                  <span className="text-[11px] text-slate-400 mb-1 block">Ghi chú quà tặng / Hướng dẫn nhận quà:</span>
                  <input
                    type="text"
                    value={giftNote}
                    onChange={(e) => setGiftNote(e.target.value)}
                    placeholder="Hoàn tất khảo sát để nhận phần quà lưu niệm tại bàn Lễ tân."
                    className="w-full px-3 py-2 rounded-[3px] bg-slate-950 border border-slate-700 text-white text-xs outline-none focus:border-[#F7CAC9]"
                  />
                </div>
              </div>

              {/* AI Survey Translation Card (Multilingual Survey Info) */}
              <div className="space-y-3 p-4 rounded-[6px] bg-gradient-to-br from-purple-950/40 via-slate-900/60 to-purple-950/20 border border-[#F7CAC9]/30 shadow-md">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#F7CAC9] animate-pulse" />
                    <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                      Dịch AI Cấu Hình Khảo Sát (Multilingual Survey)
                    </span>
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-[2px] bg-[#F7CAC9]/20 text-[#F7CAC9] border border-[#F7CAC9]/40 font-bold">
                      Gemini Flash
                    </span>
                  </div>
                  {Object.keys(translations).length > 0 && (
                    <span className="text-[11px] font-mono text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      Đã lưu {Object.keys(translations).length} bản dịch
                    </span>
                  )}
                </div>

                <p className="text-[11px] text-slate-300">
                  Tự động dịch tiêu đề, lời mời tham gia và ghi chú quà tặng sang tiếng Anh hoặc các ngôn ngữ quốc tế cho khán giả đa quốc gia.
                </p>

                {/* Target Language Select & Action Button */}
                <div className="flex items-center gap-2 flex-wrap pt-1">
                  <div className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1.5 rounded-[4px] border border-slate-700">
                    <Globe className="w-3.5 h-3.5 text-[#F7CAC9]" />
                    <select
                      value={surveyTargetLang}
                      onChange={(e) => setSurveyTargetLang(e.target.value)}
                      className="bg-transparent text-white text-xs font-mono outline-none cursor-pointer"
                    >
                      {SUPPORTED_TRANSLATION_LANGUAGES.map((lang) => (
                        <option key={lang.code} value={lang.code} className="bg-slate-900 text-white">
                          {lang.flag} {lang.label} ({lang.nativeLabel})
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    type="button"
                    onClick={handleAiTranslateSurveyInfo}
                    disabled={isTranslatingSurvey}
                    className="px-3.5 py-1.5 rounded-[4px] bg-gradient-to-r from-[#92A8D1] to-[#F7CAC9] hover:brightness-110 text-slate-950 font-bold text-xs font-mono transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow"
                  >
                    {isTranslatingSurvey ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Đang dịch AI...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Dịch sang {SUPPORTED_TRANSLATION_LANGUAGES.find(l => l.code === surveyTargetLang)?.label || surveyTargetLang}</span>
                      </>
                    )}
                  </button>

                  {translations[surveyTargetLang] && (
                    <span className="text-[10px] text-emerald-300 font-mono flex items-center gap-1">
                      <Check className="w-3 h-3" /> Đã lưu trong hệ thống
                    </span>
                  )}
                </div>

                {/* Translation Preview Box */}
                {surveyTransPreview && (
                  <div className="p-3 rounded-[4px] bg-slate-950 border border-[#F7CAC9]/40 space-y-2 text-xs font-mono animate-in fade-in">
                    <div className="flex items-center justify-between text-[11px] text-[#F7CAC9] font-bold border-b border-slate-800 pb-1.5">
                      <span>Bản dịch: {SUPPORTED_TRANSLATION_LANGUAGES.find(l => l.code === surveyTargetLang)?.label} ({surveyTargetLang.toUpperCase()})</span>
                      <button
                        type="button"
                        onClick={() => setSurveyTransPreview(null)}
                        className="text-slate-400 hover:text-white"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Tiêu đề (Title):</span>
                      <p className="text-white font-semibold font-sans">{surveyTransPreview.title}</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Lời kêu gọi (Description):</span>
                      <p className="text-slate-200 font-sans">{surveyTransPreview.description}</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Ghi chú quà tặng (Gift Note):</span>
                      <p className="text-amber-300 font-sans">{surveyTransPreview.gift_note}</p>
                    </div>
                    <div className="flex items-center gap-2 pt-1.5 border-t border-slate-800 flex-wrap">
                      <button
                        type="button"
                        onClick={() => handleSaveSurveyTranslation(surveyTargetLang, surveyTransPreview)}
                        className="px-3 py-1 rounded-[3px] bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1 cursor-pointer"
                      >
                        <Save className="w-3 h-3" />
                        Lưu vào cấu hình đa ngữ
                      </button>
                      <button
                        type="button"
                        onClick={() => handleApplySurveyTranslationToMain(surveyTransPreview)}
                        className="px-3 py-1 rounded-[3px] bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs flex items-center gap-1 cursor-pointer"
                      >
                        Áp dụng đè lên tiếng Việt
                      </button>
                    </div>
                  </div>
                )}

                {/* Saved Translations List */}
                {Object.keys(translations).length > 0 && (
                  <div className="pt-2 border-t border-slate-800/80 space-y-1.5">
                    <span className="text-[10px] uppercase font-mono font-bold text-slate-400 tracking-wider block">
                      Các ngôn ngữ đã được lưu trong khảo sát:
                    </span>
                    <div className="flex items-center gap-2 flex-wrap">
                      {Object.entries(translations).map(([code, trans]) => {
                        const langObj = SUPPORTED_TRANSLATION_LANGUAGES.find(l => l.code === code);
                        return (
                          <div
                            key={code}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[3px] bg-slate-950 border border-slate-700 text-xs font-mono text-slate-200"
                          >
                            <span>{langObj?.flag || '🌐'} {langObj?.label || code.toUpperCase()}</span>
                            <button
                              type="button"
                              onClick={() => {
                                setSurveyTargetLang(code);
                                setSurveyTransPreview(trans);
                              }}
                              className="text-sky-400 hover:text-sky-300 underline text-[10px] cursor-pointer ml-1"
                            >
                              Xem
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveSurveyTranslation(code)}
                              className="text-rose-400 hover:text-rose-300 ml-1 cursor-pointer"
                              title="Xóa bản dịch này"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Advanced / Pre-fill Entries & Re-roll Seed */}
              <details className="text-xs text-slate-400 rounded-[6px] bg-slate-900/30 border border-slate-800 p-3">
                <summary className="font-mono uppercase font-bold text-slate-300 cursor-pointer flex items-center justify-between">
                  <span>Cài đặt nâng cao (Điền trước dữ liệu & Bốc thăm lại)</span>
                </summary>
                <div className="pt-3 space-y-3 text-slate-300">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <span className="text-[11px] text-slate-400 mb-1 block">Entry ID Tên (Google Forms):</span>
                      <input
                        type="text"
                        value={prefillNameEntry}
                        onChange={(e) => setPrefillNameEntry(e.target.value)}
                        placeholder="ví dụ: entry.123456789"
                        className="w-full px-3 py-2 rounded-[3px] bg-slate-950 border border-slate-700 text-white text-xs font-mono outline-none"
                      />
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-400 mb-1 block">Entry ID MSSV / SBD:</span>
                      <input
                        type="text"
                        value={prefillMssvEntry}
                        onChange={(e) => setPrefillMssvEntry(e.target.value)}
                        placeholder="ví dụ: entry.987654321"
                        className="w-full px-3 py-2 rounded-[3px] bg-slate-950 border border-slate-700 text-white text-xs font-mono outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                    <div>
                      <span className="font-mono text-[11px] text-slate-400">Mã Seed Bốc Thăm:</span>
                      <code className="ml-2 font-mono text-pink-300 bg-slate-950 px-2 py-0.5 rounded">
                        {targetSeed}
                      </code>
                    </div>
                    <button
                      type="button"
                      onClick={handleRerollSeed}
                      className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono flex items-center gap-1 transition cursor-pointer"
                    >
                      <RefreshCw className="w-3 h-3" />
                      Bốc thăm 10% khác
                    </button>
                  </div>
                </div>
              </details>
            </>
          )}

          {/* TAB: IN-APP FORM QUESTION EDITOR */}
          {activeTab === 'EDITOR' && (
            <div className="space-y-5">
              {/* Header Card */}
              <div className="p-4 rounded-[6px] bg-slate-900/80 border border-slate-700/80 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Edit3 className="w-5 h-5 text-[#F7CAC9]" />
                    <h3 className="text-sm font-bold text-white">
                      Trình Chỉnh Sửa Câu Hỏi Biểu Mẫu (In-App Form Editor)
                    </h3>
                  </div>
                  <p className="text-xs text-slate-400">
                    Sửa đổi câu hỏi, kiểu trắc nghiệm, thang điểm và đồng bộ trực tiếp lên Google Form thời gian thực.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => loadFormStructure()}
                    disabled={isLoadingStructure || isSavingStructure || (!googleFormId && !formUrl)}
                    className="px-3 py-1.5 rounded-[4px] bg-slate-800 hover:bg-slate-700 border border-slate-600 text-xs font-semibold text-slate-200 flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoadingStructure ? 'animate-spin' : ''}`} />
                    Tải lại từ Google
                  </button>

                  {editUrl && (
                    <a
                      href={editUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-[4px] bg-slate-800 hover:bg-slate-700 border border-slate-600 text-xs font-semibold text-sky-300 hover:text-sky-200 flex items-center gap-1.5 transition"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Mở trên Google Forms
                    </a>
                  )}

                  <button
                    type="button"
                    onClick={handleSaveFormStructure}
                    disabled={isSavingStructure || !formStructure || isLoadingStructure}
                    className="px-4 py-1.5 rounded-[4px] bg-gradient-to-r from-[#92A8D1] to-[#F7CAC9] text-slate-950 font-bold text-xs flex items-center gap-1.5 hover:brightness-110 active:scale-95 transition shadow-sm cursor-pointer disabled:opacity-50"
                  >
                    {isSavingStructure ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Save className="w-3.5 h-3.5" />
                    )}
                    {isSavingStructure ? 'Đang lưu lên Google...' : 'Lưu & Cập nhật Google Form'}
                  </button>
                </div>
              </div>

              {/* No form connected warning */}
              {(!googleFormId && !formUrl) ? (
                <div className="p-8 text-center bg-slate-900/60 border border-slate-800 rounded-[6px] space-y-3">
                  <div className="w-12 h-12 mx-auto rounded-full bg-slate-800 flex items-center justify-center text-slate-400">
                    <FileSpreadsheet className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-white">Chưa kết nối Google Form</h4>
                  <p className="text-xs text-slate-400 max-w-md mx-auto">
                    Hãy bấm &quot;1-Click Tạo Form Tự Động&quot; tại tab Cấu Hình hoặc chọn biểu mẫu từ Google Drive để bắt đầu chỉnh sửa câu hỏi ngay tại đây.
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('SETTINGS')}
                    className="px-4 py-2 rounded-[4px] bg-[#F7CAC9] text-slate-950 font-bold text-xs hover:bg-[#f5b8b7] transition cursor-pointer"
                  >
                    Đến tab Cấu Hình
                  </button>
                </div>
              ) : isLoadingStructure ? (
                <div className="p-12 text-center bg-slate-900/60 border border-slate-800 rounded-[6px] space-y-3">
                  <Loader2 className="w-8 h-8 animate-spin text-[#F7CAC9] mx-auto" />
                  <p className="text-xs text-slate-300">Đang tải cấu trúc và câu hỏi từ Google Form...</p>
                </div>
              ) : structureError ? (
                <div className="p-6 bg-red-950/40 border border-red-800/60 rounded-[6px] space-y-3">
                  <div className="flex items-center gap-2 text-red-400 text-sm font-bold">
                    <AlertTriangle className="w-5 h-5 shrink-0" />
                    <span>Lỗi tải biểu mẫu</span>
                  </div>
                  <p className="text-xs text-red-300 font-mono">{structureError}</p>
                  <button
                    type="button"
                    onClick={() => loadFormStructure()}
                    className="px-3 py-1.5 rounded bg-red-900/60 hover:bg-red-900 border border-red-700 text-xs text-white font-medium cursor-pointer"
                  >
                    Thử lại
                  </button>
                </div>
              ) : formStructure ? (
                <div className="space-y-4">
                  {/* Form Info Section */}
                  <div className="p-4 rounded-[6px] bg-slate-900/60 border border-slate-800 space-y-3">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
                        <span>Tiêu đề biểu mẫu</span>
                        <span className="text-[10px] text-slate-500 font-normal">Từ Google Forms</span>
                      </label>
                      <input
                        type="text"
                        value={formStructure.title}
                        disabled
                        className="w-full px-3 py-2 text-xs rounded bg-slate-950/80 border border-slate-800 text-slate-400 font-medium cursor-not-allowed"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
                        <span>Mô tả & Lời mở đầu của khảo sát</span>
                        <span className="text-[10px] text-emerald-400">Được đồng bộ lên Google Form</span>
                      </label>
                      <textarea
                        rows={3}
                        value={formStructure.description}
                        onChange={(e) => setFormStructure({ ...formStructure, description: e.target.value })}
                        placeholder="Nhập lời cảm ơn hoặc thông điệp hướng dẫn gửi tới khán giả..."
                        className="w-full px-3 py-2 text-xs rounded bg-slate-950 border border-slate-700 focus:border-[#F7CAC9] text-white focus:outline-none transition leading-relaxed resize-y"
                      />
                    </div>
                  </div>

                  {/* Questions Section */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white uppercase tracking-wider">
                          Danh sách câu hỏi ({formStructure.items.length})
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                          Google Forms API
                        </span>
                      </div>

                      {/* AI Batch Translate Toolbar for Survey Questions */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <div className="flex items-center gap-1 bg-slate-950 px-2 py-1 rounded border border-slate-700">
                          <Languages className="w-3 h-3 text-[#F7CAC9]" />
                          <select
                            value={questionsTargetLang}
                            onChange={(e) => setQuestionsTargetLang(e.target.value)}
                            className="bg-transparent text-[11px] font-mono text-white outline-none cursor-pointer"
                          >
                            {SUPPORTED_TRANSLATION_LANGUAGES.map((l) => (
                              <option key={l.code} value={l.code} className="bg-slate-900 text-white">
                                {l.flag} {l.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleAiTranslateFormQuestions(questionsTargetLang)}
                          disabled={isTranslatingQuestions || formStructure.items.length === 0}
                          className="px-2.5 py-1 rounded bg-purple-900/60 hover:bg-purple-800/80 text-purple-200 border border-purple-600/40 text-xs font-mono font-bold flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
                          title="Dịch toàn bộ câu hỏi và các lựa chọn đáp án sang ngôn ngữ đích bằng AI"
                        >
                          {isTranslatingQuestions ? (
                            <>
                              <Loader2 className="w-3 h-3 animate-spin" />
                              <span>Đang dịch AI...</span>
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-3 h-3 text-[#F7CAC9]" />
                              <span>Dịch AI toàn bộ ({questionsTargetLang.toUpperCase()})</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {formStructure.items.map((item, index) => (
                      <div
                        key={item.id || index}
                        className="p-4 rounded-[6px] bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition space-y-3"
                      >
                        {/* Question Top Toolbar */}
                        <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-800/80">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-[#F7CAC9]/20 text-[#F7CAC9] border border-[#F7CAC9]/30">
                              Câu {index + 1}
                            </span>

                            {/* Type Selector */}
                            <select
                              value={item.questionType}
                              onChange={(e) => handleUpdateItem(index, {
                                questionType: e.target.value as any,
                                options: (e.target.value === 'RADIO' || e.target.value === 'CHECKBOX') && item.options.length === 0
                                  ? ['Lựa chọn 1', 'Lựa chọn 2']
                                  : item.options
                              })}
                              className="px-2.5 py-1 text-xs rounded bg-slate-950 border border-slate-700 text-slate-200 focus:border-[#F7CAC9] focus:outline-none cursor-pointer"
                            >
                              <option value="RADIO">Trắc nghiệm (1 đáp án - Radio)</option>
                              <option value="CHECKBOX">Hộp kiểm (Nhiều đáp án - Checkbox)</option>
                              <option value="SCALE">Thang điểm (1 - 5 Sao)</option>
                              <option value="TEXT">Trả lời ngắn (Text)</option>
                              <option value="PARAGRAPH">Đoạn văn tự do (Paragraph)</option>
                            </select>
                          </div>

                          <div className="flex items-center gap-2">
                            {/* AI Translate Single Question */}
                            <button
                              type="button"
                              onClick={() => handleAiTranslateSingleQuestion(index, questionsTargetLang)}
                              className="px-2 py-1 rounded bg-purple-950/60 hover:bg-purple-900 border border-purple-800/40 text-purple-300 text-[11px] font-mono flex items-center gap-1 cursor-pointer transition"
                              title={`Dịch câu hỏi này sang ${questionsTargetLang.toUpperCase()} bằng AI`}
                            >
                              <Sparkles className="w-3 h-3 text-[#F7CAC9]" />
                              <span>Dịch AI</span>
                            </button>

                            {/* Required Checkbox */}
                            <label className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer select-none">
                              <input
                                type="checkbox"
                                checked={item.required}
                                onChange={(e) => handleUpdateItem(index, { required: e.target.checked })}
                                className="w-3.5 h-3.5 accent-[#F7CAC9] rounded cursor-pointer"
                              />
                              <span>Bắt buộc</span>
                            </label>

                            <div className="h-4 w-px bg-slate-800" />

                            {/* Move Up/Down */}
                            <button
                              type="button"
                              onClick={() => handleMoveItem(index, 'UP')}
                              disabled={index === 0}
                              className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-30 cursor-pointer"
                              title="Di chuyển lên"
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMoveItem(index, 'DOWN')}
                              disabled={index === formStructure.items.length - 1}
                              className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-30 cursor-pointer"
                              title="Di chuyển xuống"
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>

                            {/* Delete Item */}
                            <button
                              type="button"
                              onClick={() => handleDeleteItem(index)}
                              className="p-1 rounded bg-red-950/40 hover:bg-red-900 border border-red-800/40 text-red-300 cursor-pointer"
                              title="Xóa câu hỏi này"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Question Title Input */}
                        <div className="space-y-1">
                          <label className="text-[11px] font-semibold text-slate-400">Tiêu đề câu hỏi:</label>
                          <input
                            type="text"
                            value={item.title}
                            onChange={(e) => handleUpdateItem(index, { title: e.target.value })}
                            placeholder="Nhập nội dung câu hỏi..."
                            className="w-full px-3 py-1.5 text-xs rounded bg-slate-950 border border-slate-700 focus:border-[#F7CAC9] text-white focus:outline-none transition font-medium"
                          />
                        </div>

                        {/* Question Type Specific Body */}
                        {(item.questionType === 'RADIO' || item.questionType === 'CHECKBOX') && (
                          <div className="space-y-2 pt-1">
                            <label className="text-[11px] font-semibold text-slate-400">Các lựa chọn đáp án:</label>
                            <div className="space-y-1.5 pl-2 border-l-2 border-slate-800">
                              {item.options.map((opt, optIdx) => (
                                <div key={optIdx} className="flex items-center gap-2">
                                  <span className="w-3.5 h-3.5 rounded-full border border-slate-600 flex items-center justify-center shrink-0">
                                    <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                                  </span>
                                  <input
                                    type="text"
                                    value={opt}
                                    onChange={(e) => handleUpdateOption(index, optIdx, e.target.value)}
                                    className="flex-1 px-2.5 py-1 text-xs rounded bg-slate-950 border border-slate-700 text-slate-200 focus:border-[#F7CAC9] focus:outline-none"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteOption(index, optIdx)}
                                    className="p-1 text-slate-400 hover:text-red-400 transition cursor-pointer"
                                    title="Xóa lựa chọn này"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ))}

                              <button
                                type="button"
                                onClick={() => handleAddOption(index)}
                                className="mt-1 text-xs text-[#F7CAC9] hover:underline flex items-center gap-1 font-medium cursor-pointer"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                Thêm lựa chọn đáp án
                              </button>
                            </div>
                          </div>
                        )}

                        {item.questionType === 'SCALE' && (
                          <div className="space-y-2 pt-1">
                            <label className="text-[11px] font-semibold text-slate-400">Cấu hình thang điểm (1 đến 5):</label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              <div className="space-y-1">
                                <span className="text-[10px] text-slate-500">Nhãn mức 1 (Thấp nhất):</span>
                                <input
                                  type="text"
                                  value={item.scaleLowLabel || ''}
                                  onChange={(e) => handleUpdateItem(index, { scaleLowLabel: e.target.value })}
                                  placeholder="Chưa hài lòng"
                                  className="w-full px-2.5 py-1 text-xs rounded bg-slate-950 border border-slate-700 text-slate-200 focus:border-[#F7CAC9] focus:outline-none"
                                />
                              </div>
                              <div className="space-y-1">
                                <span className="text-[10px] text-slate-500">Nhãn mức 5 (Cao nhất):</span>
                                <input
                                  type="text"
                                  value={item.scaleHighLabel || ''}
                                  onChange={(e) => handleUpdateItem(index, { scaleHighLabel: e.target.value })}
                                  placeholder="Tuyệt vời"
                                  className="w-full px-2.5 py-1 text-xs rounded bg-slate-950 border border-slate-700 text-slate-200 focus:border-[#F7CAC9] focus:outline-none"
                                />
                              </div>
                            </div>
                          </div>
                        )}

                        {(item.questionType === 'TEXT' || item.questionType === 'PARAGRAPH') && (
                          <div className="p-2.5 rounded bg-slate-950/60 border border-slate-800 text-[11px] text-slate-400 italic">
                            Khán giả sẽ nhập văn bản tự do ({item.questionType === 'PARAGRAPH' ? 'Nhiều dòng / Đoạn văn' : 'Một dòng ngắn'}).
                          </div>
                        )}
                      </div>
                    ))}

                    {/* Add Question Button Bar */}
                    <div className="p-4 rounded-[6px] bg-slate-900/60 border border-dashed border-slate-700 flex flex-wrap items-center justify-between gap-3">
                      <span className="text-xs font-bold text-slate-300">Thêm câu hỏi mới vào biểu mẫu:</span>
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleAddItem('RADIO')}
                          className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 border border-slate-600 text-xs font-medium text-slate-200 flex items-center gap-1.5 transition cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5 text-[#F7CAC9]" />
                          + Trắc nghiệm (Radio)
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAddItem('SCALE')}
                          className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 border border-slate-600 text-xs font-medium text-slate-200 flex items-center gap-1.5 transition cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5 text-amber-400" />
                          + Thang điểm (1-5 Sao)
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAddItem('TEXT')}
                          className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 border border-slate-600 text-xs font-medium text-slate-200 flex items-center gap-1.5 transition cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5 text-sky-400" />
                          + Văn bản tự do
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          )}

          {/* TAB 2: GOOGLE WORKSPACE */}
          {activeTab === 'WORKSPACE' && (
            <div className="space-y-5">
              {/* Account Status Card */}
              <div className="p-4 rounded-[6px] bg-slate-900/80 border border-slate-700/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 border ${
                    isGoogleConnected 
                      ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400' 
                      : 'bg-amber-500/20 border-amber-500/40 text-amber-400'
                  }`}>
                    {isGoogleConnected ? <CheckCircle2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      Google Workspace & Drive API
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                        isGoogleConnected ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
                      }`}>
                        {isGoogleConnected ? 'ĐÃ KẾT NỐI' : 'CHƯA ĐĂNG NHẬP'}
                      </span>
                    </h4>
                    <p className="text-xs text-slate-400">
                      Quyền truy cập Google Drive & Google Forms đã được cấp phép cho ứng dụng Beyond The Internet.
                    </p>
                  </div>
                </div>

                {!isGoogleConnected ? (
                  <button
                    type="button"
                    onClick={handleGoogleSignIn}
                    disabled={isAuthenticating}
                    className="px-4 py-2 rounded-[4px] bg-white hover:bg-slate-100 text-slate-800 text-xs font-bold transition flex items-center gap-2 shadow cursor-pointer disabled:opacity-50"
                  >
                    {isAuthenticating ? (
                      <Loader2 className="w-4 h-4 animate-spin text-slate-600" />
                    ) : (
                      <svg className="w-4 h-4" viewBox="0 0 48 48">
                        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                      </svg>
                    )}
                    <span>Đăng nhập Google Workspace</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={loadDriveForms}
                      disabled={isLoadingDriveForms}
                      className="px-3 py-1.5 rounded-[4px] bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer border border-slate-700"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isLoadingDriveForms ? 'animate-spin' : ''}`} />
                      Làm mới Drive
                    </button>
                  </div>
                )}
              </div>

              {/* 1-Click Form Generator Banner */}
              <div className="p-4 rounded-[6px] bg-gradient-to-r from-pink-950/40 via-purple-950/30 to-slate-900 border border-pink-500/30 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-pink-400" />
                      Tạo Biểu Mẫu Khảo Sát BTI 2026 Chuẩn Tự Động
                    </h4>
                    <p className="text-xs text-slate-300 mt-1">
                      Hệ thống sẽ gọi trực tiếp Google Forms API để khởi tạo ngay 1 Google Form chuẩn trên Google Drive của bạn, bao gồm đầy đủ 5 câu hỏi đánh giá:
                    </p>
                    <ul className="text-[11px] text-slate-400 list-disc list-inside mt-1.5 space-y-0.5">
                      <li>Độ hài lòng tổng thể chương trình (Thang điểm 1 - 5 sao)</li>
                      <li>Vòng thi / khoảnh khắc ấn tượng nhất (Khởi động, VCNV, Tăng tốc, Về đích, Lucky Draw)</li>
                      <li>Đánh giá trải nghiệm ứng dụng và độ mượt khi tương tác</li>
                      <li>Góp ý đóng góp cho Ban Tổ Chức</li>
                      <li>Mã số sinh viên (MSSV) nhận quà tri ân</li>
                    </ul>
                  </div>

                  <button
                    type="button"
                    onClick={handleCreateDefaultForm}
                    disabled={isCreatingForm}
                    className="px-4 py-2.5 rounded-[4px] bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg transition cursor-pointer whitespace-nowrap disabled:opacity-50 shrink-0"
                  >
                    {isCreatingForm ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Đang tạo trên Drive...</span>
                      </>
                    ) : (
                      <>
                        <PlusCircle className="w-4 h-4" />
                        <span>1-Click Tạo Form Mới</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Forms in Google Drive */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <FolderOpen className="w-4 h-4 text-sky-400" />
                    Biểu Mẫu Google Forms Trên Drive Của Bạn
                  </h4>
                  {driveForms.length > 0 && (
                    <span className="text-xs text-slate-500 font-mono">
                      Tìm thấy {driveForms.length} biểu mẫu
                    </span>
                  )}
                </div>

                {!isGoogleConnected ? (
                  <div className="p-8 text-center bg-slate-900/40 rounded-[6px] border border-slate-800 space-y-3">
                    <FolderOpen className="w-8 h-8 text-slate-600 mx-auto" />
                    <p className="text-xs text-slate-400 max-w-md mx-auto">
                      Đăng nhập Google Workspace để duyệt và chọn trực tiếp các biểu mẫu có sẵn trong Google Drive của bạn mà không cần copy link thủ công.
                    </p>
                    <button
                      type="button"
                      onClick={handleGoogleSignIn}
                      className="px-4 py-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition cursor-pointer border border-slate-700"
                    >
                      Kết nối Google Drive
                    </button>
                  </div>
                ) : isLoadingDriveForms ? (
                  <div className="p-8 text-center bg-slate-900/40 rounded-[6px] border border-slate-800 flex flex-col items-center justify-center gap-2">
                    <Loader2 className="w-6 h-6 animate-spin text-pink-400" />
                    <span className="text-xs text-slate-400">Đang quét danh sách Google Forms trên Drive...</span>
                  </div>
                ) : driveForms.length === 0 ? (
                  <div className="p-6 text-center bg-slate-900/40 rounded-[6px] border border-slate-800 space-y-2">
                    <p className="text-xs text-slate-400">
                      Chưa tìm thấy biểu mẫu Google Forms nào trên Google Drive của bạn.
                    </p>
                    <button
                      type="button"
                      onClick={handleCreateDefaultForm}
                      className="px-3.5 py-1.5 rounded bg-pink-600/30 hover:bg-pink-600/40 text-pink-300 border border-pink-500/40 text-xs font-bold transition cursor-pointer"
                    >
                      Tạo Biểu Mẫu Khảo Sát BTI Đầu Tiên
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-2 max-h-64 overflow-y-auto pr-1">
                    {driveForms.map((item) => {
                      const isSelected = formUrl.includes(item.id) || (googleFormId === item.id);
                      return (
                        <div
                          key={item.id}
                          className={`p-3 rounded-[4px] border transition flex items-center justify-between gap-3 ${
                            isSelected
                              ? 'bg-pink-950/30 border-pink-500/50 text-white'
                              : 'bg-slate-900/40 border-slate-800 hover:border-slate-700 text-slate-300'
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <FileSpreadsheet className="w-4 h-4 text-pink-400 shrink-0" />
                              <span className="text-xs font-bold truncate block">{item.name}</span>
                              {isSelected && (
                                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-pink-500/20 text-pink-300 border border-pink-500/40 font-bold shrink-0">
                                  ĐANG DÙNG
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500 font-mono mt-0.5 truncate">
                              ID: {item.id} • {item.modifiedTime ? `Sửa: ${new Date(item.modifiedTime).toLocaleDateString('vi-VN')}` : ''}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {item.webViewLink && (
                              <a
                                href={item.webViewLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-white/10 transition"
                                title="Xem trên Drive"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            )}
                            <button
                              type="button"
                              onClick={() => handleSelectDriveForm(item)}
                              className={`px-3 py-1.5 rounded-[3px] text-xs font-bold transition cursor-pointer ${
                                isSelected
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                              }`}
                            >
                              {isSelected ? 'Đã Chọn' : 'Chọn Form Này'}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: LIVE ANALYTICS */}
          {activeTab === 'ANALYTICS' && (
            <div className="space-y-5">
              {/* Analytics Header Controls */}
              <div className="p-4 rounded-[6px] bg-slate-900/80 border border-slate-700/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-emerald-400" />
                    Thống Kê Phản Hồi Từ Khán Giả (Google Forms API)
                  </h4>
                  <p className="text-xs text-slate-400">
                    Dữ liệu được đồng bộ trực tiếp từ các bài gửi của khán giả qua biểu mẫu Google Forms.
                  </p>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={handleFetchAnalytics}
                    disabled={isLoadingAnalytics}
                    className="px-3 py-1.5 rounded-[4px] bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoadingAnalytics ? 'animate-spin' : ''}`} />
                    <span>Làm mới thống kê</span>
                  </button>
                  {formUrl && (
                    <a
                      href={formUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-[4px] bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition border border-slate-700"
                    >
                      <span>Mở Form</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>

              {analyticsError && (
                <div className="p-3.5 rounded-[4px] bg-rose-950/40 border border-rose-500/50 text-rose-300 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{analyticsError}</span>
                </div>
              )}

              {isLoadingAnalytics ? (
                <div className="p-12 text-center bg-slate-900/30 rounded-[6px] border border-slate-800 flex flex-col items-center justify-center gap-2">
                  <Loader2 className="w-7 h-7 animate-spin text-emerald-400" />
                  <span className="text-xs text-slate-300">Đang đọc phản hồi từ Google Forms API...</span>
                </div>
              ) : !analytics ? (
                <div className="p-8 text-center bg-slate-900/30 rounded-[6px] border border-slate-800 space-y-3">
                  <BarChart3 className="w-8 h-8 text-slate-600 mx-auto" />
                  <p className="text-xs text-slate-400">
                    Bấm "Làm mới thống kê" để tải dữ liệu câu trả lời của khán giả từ Google Forms.
                  </p>
                  <button
                    type="button"
                    onClick={handleFetchAnalytics}
                    className="px-4 py-2 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition cursor-pointer"
                  >
                    Tải Dữ Liệu Ngay
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Summary Metric Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-4 rounded-[6px] bg-slate-900/60 border border-slate-800">
                      <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block">
                        Tổng phản hồi nhận được
                      </span>
                      <div className="text-2xl font-black text-white mt-1 flex items-baseline gap-2">
                        <span>{analytics.totalResponses}</span>
                        <span className="text-xs text-slate-400 font-normal">lượt gửi</span>
                      </div>
                    </div>

                    <div className="p-4 rounded-[6px] bg-slate-900/60 border border-slate-800">
                      <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block">
                        Đánh giá chương trình
                      </span>
                      {(() => {
                        const scaleQ = analytics.questions.find((q) => q.type === 'SCALE');
                        const avg = scaleQ?.averageRating;
                        return (
                          <div className="text-2xl font-black text-amber-300 mt-1 flex items-center gap-1.5">
                            {avg !== undefined ? (
                              <>
                                <span>{avg}</span>
                                <span className="text-sm text-slate-400 font-normal">/ 5.0</span>
                                <Star className="w-4 h-4 fill-amber-400 text-amber-400 ml-1" />
                              </>
                            ) : (
                              <span className="text-sm text-slate-400 font-normal">Chưa có điểm</span>
                            )}
                          </div>
                        );
                      })()}
                    </div>

                    <div className="p-4 rounded-[6px] bg-slate-900/60 border border-slate-800">
                      <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block">
                        Thời gian gửi bài mới nhất
                      </span>
                      <div className="text-xs font-mono text-slate-300 mt-2">
                        {analytics.lastResponseTime
                          ? new Date(analytics.lastResponseTime).toLocaleTimeString('vi-VN') + ' ' + new Date(analytics.lastResponseTime).toLocaleDateString('vi-VN')
                          : 'Chưa có bài nộp'}
                      </div>
                    </div>
                  </div>

                  {/* Question Breakdown List */}
                  <div className="space-y-3">
                    <h5 className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider">
                      Chi tiết phản hồi từng câu hỏi
                    </h5>

                    {analytics.questions.map((q, idx) => (
                      <div key={q.itemId || idx} className="p-3.5 rounded-[6px] bg-slate-900/50 border border-slate-800 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-xs font-bold text-white block">
                            {q.title}
                          </span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-semibold shrink-0">
                            {q.totalAnswers} câu trả lời
                          </span>
                        </div>

                        {/* If Options Distribution (Choice questions) */}
                        {q.optionsDistribution && (
                          <div className="space-y-1.5 pt-1">
                            {Object.entries(q.optionsDistribution).map(([opt, count]) => {
                              const countNum = Number(count) || 0;
                              const pct = analytics.totalResponses > 0
                                ? Math.round((countNum / analytics.totalResponses) * 100)
                                : 0;
                              return (
                                <div key={opt} className="space-y-0.5">
                                  <div className="flex justify-between text-[11px] text-slate-300">
                                    <span className="truncate pr-2">{opt}</span>
                                    <span className="font-mono text-pink-300 shrink-0 font-bold">{countNum} ({pct}%)</span>
                                  </div>
                                  <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                                    <div
                                      className="h-full bg-gradient-to-r from-pink-500 to-rose-500 rounded-full transition-all duration-300"
                                      style={{ width: `${pct}%` }}
                                    />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* If Text samples (e.g. Feedback, greetings) */}
                        {q.type === 'TEXT' && q.sampleAnswers.length > 0 && (
                          <div className="pt-1 space-y-1">
                            {q.sampleAnswers.map((sample, sIdx) => (
                              <div
                                key={sIdx}
                                className="text-[11px] text-slate-300 bg-slate-950/80 px-2.5 py-1.5 rounded border border-slate-800/80 italic"
                              >
                                "{sample}"
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Recent Submissions List */}
                  {analytics.recentSubmissions.length > 0 && (
                    <div className="space-y-2 pt-2">
                      <h5 className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider">
                        Các phản hồi gần đây nhất
                      </h5>
                      <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                        {analytics.recentSubmissions.map((sub) => (
                          <div
                            key={sub.responseId}
                            className="p-2.5 rounded-[4px] bg-slate-900/30 border border-slate-800 text-[11px] flex items-center justify-between gap-3"
                          >
                            <span className="font-mono text-slate-400">
                              {new Date(sub.submittedAt).toLocaleTimeString('vi-VN')}
                            </span>
                            <span className="text-slate-300 truncate flex-1 text-right">
                              {Object.values(sub.answers).filter(Boolean).slice(0, 2).join(' • ') || 'Đã gửi câu trả lời'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="p-4 sm:p-5 border-t border-white/10 bg-slate-950 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleTestPreviewOnMyDevice}
              className="px-3.5 py-2 rounded-[3px] text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition cursor-pointer border bg-slate-900 text-slate-200 hover:text-white border-slate-700 hover:border-[#F7CAC9]/60 shadow-sm hover:shadow-purple-950/40"
              title="Mở xem trước giao diện khảo sát của khán giả"
            >
              <Eye className="w-3.5 h-3.5 text-[#F7CAC9]" />
              <span>Thử giao diện (Preview)</span>
            </button>

            {toastMessage && (
              <span className="text-xs text-emerald-400 font-mono flex items-center gap-1 animate-in fade-in">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {toastMessage}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-initial px-4 py-2 rounded-[3px] bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition cursor-pointer"
            >
              Đóng
            </button>
            <button
              type="button"
              onClick={() => handleSaveConfig()}
              disabled={isSaving}
              className="flex-1 sm:flex-initial px-5 py-2 rounded-[3px] bg-gradient-to-r from-[#F7CAC9] to-[#E39A96] hover:from-[#FCEEEC] hover:to-[#F7CAC9] text-slate-950 text-xs font-bold uppercase tracking-wider transition shadow cursor-pointer disabled:opacity-50"
            >
              {isSaving ? 'Đang lưu...' : 'Lưu Cấu Hình'}
            </button>
          </div>
        </div>

        {/* Audience Experience Live Preview Overlay */}
        {showPreviewModal && (
          <div 
            className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200"
            onClick={(e) => {
              e.stopPropagation();
              handleClosePreviewModal();
            }}
          >
            <div 
              className="w-full max-w-lg bg-slate-950/95 rounded-[6px] border border-[#F7CAC9]/50 shadow-2xl shadow-purple-950/60 overflow-hidden flex flex-col max-h-[92vh] backdrop-blur-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Preview Header */}
              <div className="p-3.5 bg-gradient-to-r from-purple-950/60 via-slate-900 to-purple-950/60 border-b border-[#F7CAC9]/30 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-[4px] bg-[#F7CAC9]/20 border border-[#F7CAC9]/40 flex items-center justify-center text-[#F7CAC9] shrink-0">
                    <Eye className="w-4 h-4 text-[#F7CAC9]" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs font-black text-white block tracking-wide truncate">
                      Xem Trước Trải Nghiệm Khán Giả
                    </span>
                    <span className="text-[10px] font-mono text-[#F7CAC9] font-semibold block">
                      Mô phỏng giao diện ({sampleRate}% đại diện)
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      if (typeof window !== 'undefined') {
                        localStorage.setItem('BTI_SURVEY_FORCE_PREVIEW', 'true');
                        window.dispatchEvent(new Event('storage'));
                        window.open('/?view=audience', '_blank');
                      }
                    }}
                    className="px-2 py-1 rounded-[3px] bg-slate-800 hover:bg-slate-700 text-[#92A8D1] hover:text-white border border-[#92A8D1]/30 text-[10px] font-mono font-bold flex items-center gap-1 transition cursor-pointer"
                    title="Mở tab giao diện Khán giả thực tế trong tab mới"
                  >
                    <span>Tab Khán giả</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={handleClosePreviewModal}
                    className="p-1.5 rounded-[4px] hover:bg-white/10 text-slate-400 hover:text-white transition cursor-pointer"
                    title="Đóng bản xem trước"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Stage & Language Toggle */}
              <div className="px-3 py-2 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between gap-2 shrink-0 overflow-x-auto">
                <div className="flex items-center gap-1.5 flex-1 min-w-0">
                  <button
                    type="button"
                    onClick={() => setPreviewStage('INVITE')}
                    className={`py-1.5 px-2 rounded-[3px] text-xs font-mono font-bold transition cursor-pointer whitespace-nowrap ${
                      previewStage === 'INVITE'
                        ? 'bg-[#F7CAC9] text-slate-950 font-black shadow'
                        : 'bg-slate-800/60 text-slate-400 hover:text-white border border-slate-700/50'
                    }`}
                  >
                    1. Mời Khảo Sát
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewStage('FORM')}
                    className={`py-1.5 px-2 rounded-[3px] text-xs font-mono font-bold transition cursor-pointer whitespace-nowrap ${
                      previewStage === 'FORM'
                        ? 'bg-[#F7CAC9] text-slate-950 font-black shadow'
                        : 'bg-slate-800/60 text-slate-400 hover:text-white border border-slate-700/50'
                    }`}
                  >
                    2. Biểu Mẫu Nhúng
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewStage('VOUCHER')}
                    className={`py-1.5 px-2 rounded-[3px] text-xs font-mono font-bold transition cursor-pointer whitespace-nowrap ${
                      previewStage === 'VOUCHER'
                        ? 'bg-[#F7CAC9] text-slate-950 font-black shadow'
                        : 'bg-slate-800/60 text-slate-400 hover:text-white border border-slate-700/50'
                    }`}
                  >
                    3. Phiếu Đổi Quà
                  </button>
                </div>

                {/* Preview Language Toggle: VI vs EN */}
                <div className="inline-flex items-center rounded-[3px] bg-slate-950 p-0.5 border border-[#F7CAC9]/30 font-mono text-[11px] shrink-0">
                  <button
                    type="button"
                    onClick={() => setPreviewLanguage('vi')}
                    className={`px-2 py-0.5 rounded-[2px] font-bold transition cursor-pointer flex items-center gap-1 ${
                      previewLanguage === 'vi'
                        ? 'bg-[#F7CAC9] text-slate-950 font-black shadow'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <span>🇻🇳</span>
                    <span>VI</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewLanguage('en')}
                    className={`px-2 py-0.5 rounded-[2px] font-bold transition cursor-pointer flex items-center gap-1 ${
                      previewLanguage === 'en'
                        ? 'bg-[#F7CAC9] text-slate-950 font-black shadow'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <span>🇬🇧</span>
                    <span>EN</span>
                  </button>
                </div>
              </div>

              {/* Preview Content Body */}
              <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-slate-200 min-h-0 flex-1">
                {previewStage === 'INVITE' && (() => {
                  const previewTrans = previewLanguage !== 'vi' ? (translations[previewLanguage] || surveyTransPreview) : null;
                  const pTitle = previewTrans?.title || title || 'Khảo Sát Ý Kiến Khán Giả BTI 2026';
                  const pDesc = previewTrans?.description || description || DEFAULT_SURVEY_CONFIG.description;
                  const pGift = previewTrans?.gift_note || giftNote;
                  const isPForeign = previewLanguage !== 'vi';

                  return (
                    <div className="space-y-3.5">
                      {/* Header banner */}
                      <div className="p-3.5 rounded-[4px] bg-purple-950/40 border border-[#F7CAC9]/40 flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-[4px] bg-[#F7CAC9]/20 border border-[#F7CAC9]/40 flex items-center justify-center text-[#F7CAC9] shrink-0">
                            <Sparkles className="w-4 h-4 animate-pulse text-[#F7CAC9]" />
                          </div>
                          <div>
                            <div className="text-xs font-black text-white">{pTitle}</div>
                            <span className="text-[10px] font-mono text-[#F7CAC9] font-semibold">
                              {isPForeign ? `Sample audience (${sampleRate}%)` : `Dành riêng cho ${sampleRate}% khán giả đại diện`}
                            </span>
                          </div>
                        </div>
                        {isPForeign && (
                          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-purple-900/60 border border-purple-500/40 text-purple-200 font-bold">
                            AI {previewLanguage.toUpperCase()}
                          </span>
                        )}
                      </div>

                      {/* Notification card */}
                      <div className="p-3.5 rounded-[4px] bg-[#F7CAC9]/10 border border-[#F7CAC9]/30 text-xs text-slate-200 leading-relaxed font-sans">
                        {pDesc}
                      </div>

                      {/* 3 Pillars */}
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="p-2 rounded-[3px] bg-slate-900/90 border border-slate-800">
                          <span className="block text-[11px] font-bold text-sky-300 font-mono">
                            {isPForeign ? '~60s' : '~60 giây'}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {isPForeign ? 'Fast & Easy' : 'Nhanh chóng'}
                          </span>
                        </div>
                        <div className="p-2 rounded-[3px] bg-slate-900/90 border border-slate-800">
                          <span className="block text-[11px] font-bold text-[#F7CAC9] font-mono">
                            {isPForeign ? 'Gift Reward' : 'Nhận quà'}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {isPForeign ? 'At Reception' : 'Tại lễ tân'}
                          </span>
                        </div>
                        <div className="p-2 rounded-[3px] bg-slate-900/90 border border-slate-800">
                          <span className="block text-[11px] font-bold text-emerald-300 font-mono">
                            {isPForeign ? 'Secure' : 'Bảo mật'}
                          </span>
                          <span className="text-[10px] text-slate-400">Google Forms</span>
                        </div>
                      </div>

                      {/* Gift callout */}
                      {pGift && (
                        <div className="p-3 rounded-[3px] bg-amber-500/10 border border-amber-500/30 flex items-center gap-2 text-xs text-amber-200">
                          <Gift className="w-4 h-4 text-amber-300 shrink-0" />
                          <span><strong>{isPForeign ? 'Gift reward:' : 'Quà tri ân:'}</strong> {pGift}</span>
                        </div>
                      )}

                      {/* Demo Action Buttons */}
                      <div className="pt-2 space-y-2">
                        <button
                          type="button"
                          onClick={() => setPreviewStage('FORM')}
                          className="w-full py-2.5 px-4 rounded-[3px] bg-gradient-to-r from-[#92A8D1] via-[#F7CAC9] to-[#E39A96] text-slate-950 font-black text-xs font-mono uppercase tracking-wider text-center shadow-md cursor-pointer transition-all border border-[#F7CAC9]/50 hover:brightness-110"
                        >
                          {isPForeign ? 'Take Survey (In-App)' : 'Làm Khảo Sát (Điền Trực Tiếp Trong Ứng Dụng)'}
                        </button>
                        {formUrl && (
                          <a
                            href={formUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block w-full py-2 px-4 rounded-[3px] bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white text-xs text-center border border-slate-800 font-mono transition"
                          >
                            {isPForeign ? 'Or open Google Forms in a new tab ↗' : 'Hoặc mở Google Forms trong tab mới ↗'}
                          </a>
                        )}
                        <div className="text-center pt-1">
                          <span 
                            className="text-xs text-emerald-400 hover:text-emerald-300 underline font-mono cursor-pointer" 
                            onClick={() => setPreviewStage('VOUCHER')}
                          >
                            {isPForeign ? 'I have submitted my response → View voucher' : 'Tôi đã gửi câu trả lời → Xem phiếu đổi quà mẫu'}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {previewStage === 'FORM' && (
                  <div className="space-y-3">
                    <div className="p-2 rounded-[3px] bg-slate-900 border border-white/10 flex items-center justify-between text-xs text-slate-300 font-mono">
                      <span className="flex items-center gap-1.5 text-slate-200">
                        <ClipboardList className="w-3.5 h-3.5 text-[#F7CAC9]" />
                        Điền trực tiếp trong ứng dụng
                      </span>
                      {formUrl ? (
                        <a
                          href={formUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#F7CAC9] hover:text-[#f8d7d6] flex items-center gap-1 font-bold"
                        >
                          Mở tab mới <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        <span className="text-amber-400 text-[11px] font-mono">Chưa nhập URL form</span>
                      )}
                    </div>

                    <div className="relative w-full h-[360px] bg-slate-900/90 rounded-[4px] border border-white/10 overflow-hidden flex flex-col items-center justify-center text-center p-4">
                      {formUrl ? (
                        <iframe
                          src={buildGoogleFormUrl({ form_url: formUrl }, { name: 'Khán giả BTI', mssv: '2026-TEST' }, true)}
                          title="Xem trước biểu mẫu Google Form"
                          className="w-full h-full border-0 rounded-[3px]"
                          loading="lazy"
                        />
                      ) : (
                        <div className="space-y-3 max-w-sm">
                          <FileSpreadsheet className="w-10 h-10 text-slate-500 mx-auto" />
                          <p className="text-xs text-slate-300">
                            Chưa có URL Google Form nào được cấu hình cho khảo sát này.
                          </p>
                          <p className="text-[11px] text-slate-400 font-mono">
                            Vui lòng nhập đường dẫn biểu mẫu tại tab <strong>CẤU HÌNH CHUNG</strong> hoặc tạo tự động ở tab <strong>GOOGLE WORKSPACE</strong>.
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setPreviewStage('INVITE')}
                        className="px-3.5 py-2 rounded-[3px] bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono font-semibold transition cursor-pointer"
                      >
                        ← Quay lại thông tin
                      </button>
                      <button
                        type="button"
                        onClick={() => setPreviewStage('VOUCHER')}
                        className="px-4 py-2 rounded-[3px] bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs font-mono uppercase tracking-wider transition shadow cursor-pointer"
                      >
                        Đã Gửi Form → Xem Phiếu Quà Tặng
                      </button>
                    </div>
                  </div>
                )}

                {previewStage === 'VOUCHER' && (
                  <div className="space-y-4">
                    {/* Congratulatory Hero */}
                    <div className="text-center space-y-1">
                      <div className="w-10 h-10 rounded-[4px] bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-400 mx-auto">
                        <CheckCircle2 className="w-5 h-5" />
                      </div>
                      <h4 className="text-sm font-black text-white">
                        Hoàn Tất Khảo Sát Thành Công!
                      </h4>
                      <p className="text-xs text-slate-300">
                        Cảm ơn bạn đã đóng góp ý kiến đại diện cho khán giả Beyond The Internet 2026.
                      </p>
                    </div>

                    {/* Voucher Ticket */}
                    <div className="rounded-[6px] bg-slate-900/90 border border-[#F7CAC9]/50 p-4 space-y-3 shadow-xl">
                      <div className="flex items-center justify-between border-b border-dashed border-slate-700 pb-2.5">
                        <div className="flex items-center gap-1.5">
                          <Ticket className="w-4 h-4 text-[#F7CAC9]" />
                          <span className="text-[11px] font-mono font-bold uppercase text-[#F7CAC9]">
                            Phiếu Nhận Quà Khảo Sát
                          </span>
                        </div>
                        <span className="text-[9px] font-mono px-2 py-0.5 rounded-[2px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold uppercase tracking-wider">
                          HỢP LỆ • SẴN SÀNG ĐỔI
                        </span>
                      </div>

                      <div className="py-2 text-center space-y-1.5">
                        <span className="text-[10px] text-slate-400 uppercase font-mono tracking-widest block">
                          Mã Voucher Đổi Quà Tri Ân:
                        </span>
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-[4px] bg-slate-950 border border-[#F7CAC9]/50">
                          <span className="text-xl font-mono font-black text-[#F7CAC9] tracking-wider">
                            BTI-GIFT-A8F2-2026
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              if (typeof navigator !== 'undefined' && navigator.clipboard) {
                                navigator.clipboard.writeText('BTI-GIFT-A8F2-2026');
                                setHasCopiedVoucher(true);
                                setTimeout(() => setHasCopiedVoucher(false), 2000);
                              }
                            }}
                            className="p-1 hover:text-white text-slate-400 transition cursor-pointer"
                            title="Sao chép mã"
                          >
                            {hasCopiedVoucher ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                        {hasCopiedVoucher && (
                          <span className="block text-[10px] text-emerald-400 font-mono">Đã sao chép mã!</span>
                        )}
                      </div>

                      <div className="pt-2 border-t border-dashed border-slate-700 space-y-2 text-xs">
                        <div className="flex items-center justify-between text-slate-300 font-mono text-[11px]">
                          <span>Người nhận:</span>
                          <strong className="text-white">Khán giả mẫu (Nguyễn Văn A)</strong>
                        </div>
                        <div className="p-2 rounded-[3px] bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs">
                          <strong className="block text-amber-300">Hướng dẫn nhận quà:</strong>
                          <span>{giftNote || 'Đưa mã này cho lễ tân tại sảnh hội trường để nhận phần quà lưu niệm Beyond The Internet 2026.'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setPreviewStage('FORM')}
                        className="flex-1 py-2 px-3 rounded-[3px] bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs font-mono transition cursor-pointer"
                      >
                        ← Xem lại biểu mẫu
                      </button>
                      <button
                        type="button"
                        onClick={handleClosePreviewModal}
                        className="flex-1 py-2 px-3 rounded-[3px] bg-[#F7CAC9] hover:bg-[#FCEEEC] text-slate-950 font-bold text-xs transition cursor-pointer text-center font-mono"
                      >
                        Đóng bản xem trước
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
