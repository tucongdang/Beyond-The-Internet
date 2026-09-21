import { collection, doc, onSnapshot, setDoc, updateDoc, deleteDoc, getDocs, Firestore } from 'firebase/firestore';
import { db, removeUndefined } from '../firebase';
import { AudienceQAQuestion, QASettings, QAQuestionStatus, QAQuestionCategory, UserInfo } from '../types';
import { syncService } from './syncService';
import { getSecureRandomId, getSecureRandomInt } from '../utils/cryptoUtils';

const STORAGE_KEY_QA_ITEMS = 'BTI2026_AUDIENCE_QA_ITEMS';
const STORAGE_KEY_QA_SETTINGS = 'BTI2026_AUDIENCE_QA_SETTINGS';

export const DEFAULT_QA_SETTINGS: QASettings = {
  is_open: true,
  allow_anonymous: true,
  max_chars: 250,
  slow_mode_sec: 15
};

export const QA_CATEGORIES: { id: QAQuestionCategory; label: string; color: string; badgeBg: string }[] = [
  { id: 'GENERAL', label: 'Chung / Khán Phòng', color: 'text-sky-300', badgeBg: 'bg-sky-500/20 border-sky-500/40 text-sky-200' },
  { id: 'JURY', label: 'Ban Giám Khảo & Cố Vấn', color: 'text-amber-300', badgeBg: 'bg-amber-500/20 border-amber-500/40 text-amber-200' },
  { id: 'CONTESTANT', label: 'Dành Cho Thí Sinh', color: 'text-purple-300', badgeBg: 'bg-purple-500/20 border-purple-500/40 text-purple-200' },
  { id: 'TOPIC', label: 'Chuyên Môn & Đề Thi', color: 'text-emerald-300', badgeBg: 'bg-emerald-500/20 border-emerald-500/40 text-emerald-200' },
  { id: 'FEEDBACK', label: 'Góp Ý & Cảm Nghĩ', color: 'text-pink-300', badgeBg: 'bg-pink-500/20 border-pink-500/40 text-pink-200' }
];

export const SAMPLE_QA_QUESTIONS: Omit<AudienceQAQuestion, 'id' | 'created_at'>[] = [
  {
    uid: 'sample_user_1',
    author_name: 'Trần Minh Hoàng',
    author_mssv: '21127001',
    is_anonymous: false,
    question_text: 'Xin hỏi Ban Giám khảo: Khi phát hiện hệ thống mạng bị tấn công Ransomware, bước cô lập đầu tiên cần thực hiện theo chuẩn NIST là gì?',
    category: 'JURY',
    status: 'APPROVED',
    upvotes: 14,
    upvoted_uids: ['sample_user_1']
  },
  {
    uid: 'sample_user_2',
    author_name: 'Lê Quỳnh Nga',
    author_mssv: '22120088',
    is_anonymous: false,
    question_text: 'Thí sinh có thể chia sẻ bí quyết phân biệt nhanh giữa mã độc Deepfake và video thật trong điều kiện ánh sáng yếu không?',
    category: 'CONTESTANT',
    status: 'APPROVED',
    upvotes: 9,
    upvoted_uids: []
  },
  {
    uid: 'sample_user_3',
    author_name: 'Khán giả ẩn danh',
    is_anonymous: true,
    question_text: 'Tại sao giao thức Zero Trust lại ưu tiên việc xác thực liên tục (Continuous Verification) thay vì chỉ xác thực 1 lần ở vòng ngoài (Perimeter)?',
    category: 'TOPIC',
    status: 'PENDING',
    upvotes: 6,
    upvoted_uids: []
  },
  {
    uid: 'sample_user_4',
    author_name: 'Vũ Đức Duy',
    author_mssv: '20125032',
    is_anonymous: false,
    question_text: 'Không khí hội trường hôm nay quá bùng nổ! Đề thi VCNV rất thách thức và mang tính thực tiễn cao.',
    category: 'FEEDBACK',
    status: 'APPROVED',
    upvotes: 18,
    upvoted_uids: []
  }
];

class RealtimeQAService {
  private questions: AudienceQAQuestion[] = [];
  private settings: QASettings = DEFAULT_QA_SETTINGS;
  private listeners: Set<(questions: AudienceQAQuestion[]) => void> = new Set();
  private settingsListeners: Set<(settings: QASettings) => void> = new Set();
  private broadcastChannel: BroadcastChannel | null = null;
  private unsubscribeFirestore: (() => void) | null = null;

  constructor() {
    this.loadLocalData();
    this.initBroadcastChannel();
    this.initFirestoreListener();
  }

  private loadLocalData() {
    if (typeof window === 'undefined') return;
    try {
      const savedItems = localStorage.getItem(STORAGE_KEY_QA_ITEMS);
      if (savedItems) {
        this.questions = JSON.parse(savedItems);
      }
      const savedSettings = localStorage.getItem(STORAGE_KEY_QA_SETTINGS);
      if (savedSettings) {
        this.settings = { ...DEFAULT_QA_SETTINGS, ...JSON.parse(savedSettings) };
      }
    } catch (e) {
      console.warn('Error loading QA from localStorage:', e);
    }
  }

  private saveLocalData() {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY_QA_ITEMS, JSON.stringify(this.questions));
      localStorage.setItem(STORAGE_KEY_QA_SETTINGS, JSON.stringify(this.settings));
    } catch (e) {
      console.warn('Error saving QA to localStorage:', e);
    }
  }

  private initBroadcastChannel() {
    if (typeof window === 'undefined' || !('BroadcastChannel' in window)) return;
    try {
      this.broadcastChannel = new BroadcastChannel('bti2026_audience_qa_channel');
      this.broadcastChannel.onmessage = (event) => {
        const { type, payload } = event.data || {};
        if (type === 'QA_QUESTIONS_UPDATE' && Array.isArray(payload)) {
          this.questions = payload;
          this.notifyListeners();
        } else if (type === 'QA_SETTINGS_UPDATE' && payload) {
          this.settings = payload;
          this.notifySettingsListeners();
        }
      };
    } catch (e) {
      console.warn('QA BroadcastChannel not available:', e);
    }
  }

  public initFirestoreListener() {
    if (this.unsubscribeFirestore) {
      this.unsubscribeFirestore();
      this.unsubscribeFirestore = null;
    }

    try {
      const firestoreDb = db as Firestore;
      if (!firestoreDb) return;

      const qaCol = collection(firestoreDb, 'audience_qa');
      this.unsubscribeFirestore = onSnapshot(qaCol, (snapshot) => {
        if (!snapshot.empty) {
          const items: AudienceQAQuestion[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            items.push({
              id: docSnap.id,
              uid: data.uid || '',
              author_name: data.author_name || 'Khán giả',
              author_mssv: data.author_mssv,
              is_anonymous: Boolean(data.is_anonymous),
              question_text: data.question_text || '',
              category: data.category || 'GENERAL',
              status: data.status || 'PENDING',
              upvotes: Number(data.upvotes || 0),
              upvoted_uids: Array.isArray(data.upvoted_uids) ? data.upvoted_uids : [],
              created_at: Number(data.created_at || Date.now()),
              featured_at: data.featured_at ? Number(data.featured_at) : undefined,
              answered_at: data.answered_at ? Number(data.answered_at) : undefined,
              admin_notes: data.admin_notes
            });
          });

          // Sort by creation time (descending)
          items.sort((a, b) => b.created_at - a.created_at);
          this.questions = items;
          this.saveLocalData();
          this.notifyListeners();
        }
      }, (err) => {
        console.warn('Firestore QA listener error:', err);
      });
    } catch (e) {
      console.warn('Failed to init Firestore QA listener:', e);
    }
  }

  private notifyListeners() {
    this.listeners.forEach((listener) => {
      try {
        listener([...this.questions]);
      } catch (e) {
        console.error('Error in QA questions listener:', e);
      }
    });
  }

  private notifySettingsListeners() {
    this.settingsListeners.forEach((listener) => {
      try {
        listener({ ...this.settings });
      } catch (e) {
        console.error('Error in QA settings listener:', e);
      }
    });
  }

  public subscribe(callback: (questions: AudienceQAQuestion[]) => void): () => void {
    this.listeners.add(callback);
    callback([...this.questions]);
    return () => {
      this.listeners.delete(callback);
    };
  }

  public subscribeToSettings(callback: (settings: QASettings) => void): () => void {
    this.settingsListeners.add(callback);
    callback({ ...this.settings });
    return () => {
      this.settingsListeners.delete(callback);
    };
  }

  public getQuestions(): AudienceQAQuestion[] {
    return [...this.questions];
  }

  public getSettings(): QASettings {
    return { ...this.settings };
  }

  // --- Actions ---

  public async submitQuestion(
    questionText: string,
    user: Partial<UserInfo> | null,
    isAnonymous: boolean = false,
    category: QAQuestionCategory | string = 'GENERAL'
  ): Promise<{ success: boolean; id?: string; error?: string }> {
    const trimmed = questionText.trim();
    if (!trimmed) {
      return { success: false, error: 'Nội dung câu hỏi không được để trống' };
    }
    if (trimmed.length > (this.settings.max_chars || 250)) {
      return { success: false, error: `Câu hỏi vượt quá ${this.settings.max_chars} ký tự` };
    }
    if (!this.settings.is_open) {
      return { success: false, error: 'Hệ thống Q&A hiện đang tạm đóng nhận câu hỏi' };
    }

    const questionId = getSecureRandomId('qa_' + Date.now() + '_', 7);
    const newQuestion: AudienceQAQuestion = {
      id: questionId,
      uid: user?.uid || getSecureRandomId('anon_', 6),
      author_name: isAnonymous ? 'Khán giả ẩn danh' : (user?.name || 'Khán giả'),
      author_mssv: isAnonymous ? undefined : user?.mssv,
      is_anonymous: isAnonymous,
      question_text: trimmed,
      category: category || 'GENERAL',
      status: 'PENDING',
      upvotes: 0,
      upvoted_uids: [],
      created_at: Date.now()
    };

    // Update local & broadcast
    this.questions = [newQuestion, ...this.questions];
    this.saveLocalData();
    this.notifyListeners();
    if (this.broadcastChannel) {
      this.broadcastChannel.postMessage({ type: 'QA_QUESTIONS_UPDATE', payload: this.questions });
    }

    // Sync to Firestore
    try {
      const firestoreDb = db as Firestore;
      if (firestoreDb) {
        await setDoc(doc(firestoreDb, 'audience_qa', questionId), removeUndefined(newQuestion));
      }
    } catch (err) {
      console.warn('Failed to sync new question to Firestore:', err);
    }

    return { success: true, id: questionId };
  }

  public async toggleUpvote(questionId: string, userUid: string): Promise<boolean> {
    if (!userUid) return false;

    const idx = this.questions.findIndex((q) => q.id === questionId);
    if (idx === -1) return false;

    const q = this.questions[idx];
    const upvotedList = q.upvoted_uids || [];
    const alreadyUpvoted = upvotedList.includes(userUid);

    let updatedUpvotes = q.upvotes || 0;
    let updatedUpvotedUids: string[];

    if (alreadyUpvoted) {
      updatedUpvotes = Math.max(0, updatedUpvotes - 1);
      updatedUpvotedUids = upvotedList.filter((uid) => uid !== userUid);
    } else {
      updatedUpvotes = updatedUpvotes + 1;
      updatedUpvotedUids = [...upvotedList, userUid];
    }

    const updatedQ: AudienceQAQuestion = {
      ...q,
      upvotes: updatedUpvotes,
      upvoted_uids: updatedUpvotedUids
    };

    this.questions[idx] = updatedQ;
    this.saveLocalData();
    this.notifyListeners();

    if (this.broadcastChannel) {
      this.broadcastChannel.postMessage({ type: 'QA_QUESTIONS_UPDATE', payload: this.questions });
    }

    // Sync to Firestore
    try {
      const firestoreDb = db as Firestore;
      if (firestoreDb) {
        await updateDoc(doc(firestoreDb, 'audience_qa', questionId), {
          upvotes: updatedUpvotes,
          upvoted_uids: updatedUpvotedUids
        });
      }
    } catch (err) {
      console.warn('Failed to update upvote in Firestore:', err);
    }

    return !alreadyUpvoted;
  }

  public async updateQuestionStatus(
    questionId: string,
    newStatus: QAQuestionStatus,
    adminNotes?: string
  ): Promise<boolean> {
    const idx = this.questions.findIndex((q) => q.id === questionId);
    if (idx === -1) return false;

    const q = this.questions[idx];
    const updateData: Partial<AudienceQAQuestion> = {
      status: newStatus,
      ...(adminNotes !== undefined ? { admin_notes: adminNotes } : {}),
      ...(newStatus === 'FEATURED' ? { featured_at: Date.now() } : {}),
      ...(newStatus === 'ANSWERED' ? { answered_at: Date.now() } : {})
    };

    const updatedQ: AudienceQAQuestion = { ...q, ...updateData };
    this.questions[idx] = updatedQ;
    this.saveLocalData();
    this.notifyListeners();

    if (this.broadcastChannel) {
      this.broadcastChannel.postMessage({ type: 'QA_QUESTIONS_UPDATE', payload: this.questions });
    }

    // Sync to Firestore
    try {
      const firestoreDb = db as Firestore;
      if (firestoreDb) {
        await updateDoc(doc(firestoreDb, 'audience_qa', questionId), updateData);
      }
    } catch (err) {
      console.warn('Failed to update question status in Firestore:', err);
    }

    return true;
  }

  public async featureQuestionOnProjector(question: AudienceQAQuestion | null): Promise<void> {
    // 1. Update GameState so ProjectorView receives live featured question
    await syncService.updateGameState({
      featured_qa_question: question || null
    });

    // 2. If a question was featured, set its status to 'FEATURED'
    if (question) {
      await this.updateQuestionStatus(question.id, 'FEATURED');
    }
  }

  public async deleteQuestion(questionId: string): Promise<boolean> {
    this.questions = this.questions.filter((q) => q.id !== questionId);
    this.saveLocalData();
    this.notifyListeners();

    if (this.broadcastChannel) {
      this.broadcastChannel.postMessage({ type: 'QA_QUESTIONS_UPDATE', payload: this.questions });
    }

    // If currently featured question is deleted, clear from stage
    const currentGameState = syncService['cachedGameState'];
    if (currentGameState?.featured_qa_question?.id === questionId) {
      await syncService.updateGameState({ featured_qa_question: null });
    }

    // Sync to Firestore
    try {
      const firestoreDb = db as Firestore;
      if (firestoreDb) {
        await deleteDoc(doc(firestoreDb, 'audience_qa', questionId));
      }
    } catch (err) {
      console.warn('Failed to delete question from Firestore:', err);
    }

    return true;
  }

  public async clearAllQuestions(): Promise<void> {
    const toDelete = [...this.questions];
    this.questions = [];
    this.saveLocalData();
    this.notifyListeners();

    if (this.broadcastChannel) {
      this.broadcastChannel.postMessage({ type: 'QA_QUESTIONS_UPDATE', payload: [] });
    }

    await syncService.updateGameState({ featured_qa_question: null });

    // Sync delete in Firestore
    try {
      const firestoreDb = db as Firestore;
      if (firestoreDb) {
        const snap = await getDocs(collection(firestoreDb, 'audience_qa'));
        snap.forEach(async (docSnap) => {
          await deleteDoc(docSnap.ref);
        });
      }
    } catch (err) {
      console.warn('Failed to clear QA questions in Firestore:', err);
    }
  }

  public async updateSettings(newSettings: Partial<QASettings>): Promise<void> {
    this.settings = { ...this.settings, ...newSettings };
    this.saveLocalData();
    this.notifySettingsListeners();

    if (this.broadcastChannel) {
      this.broadcastChannel.postMessage({ type: 'QA_SETTINGS_UPDATE', payload: this.settings });
    }

    await syncService.updateGameState({ qa_settings: this.settings });
  }

  public async seedSampleQuestions(): Promise<void> {
    const now = Date.now();
    for (let i = 0; i < SAMPLE_QA_QUESTIONS.length; i++) {
      const sample = SAMPLE_QA_QUESTIONS[i];
      const id = getSecureRandomId('sample_qa_' + (i + 1) + '_', 6);
      const q: AudienceQAQuestion = {
        ...sample,
        id,
        created_at: now - (i * 120000 + getSecureRandomInt(0, 45000))
      };

      this.questions.push(q);

      try {
        const firestoreDb = db as Firestore;
        if (firestoreDb) {
          await setDoc(doc(firestoreDb, 'audience_qa', id), removeUndefined(q));
        }
      } catch {}
    }

    this.questions.sort((a, b) => b.created_at - a.created_at);
    this.saveLocalData();
    this.notifyListeners();
    if (this.broadcastChannel) {
      this.broadcastChannel.postMessage({ type: 'QA_QUESTIONS_UPDATE', payload: this.questions });
    }
  }
}

export const qaService = new RealtimeQAService();
