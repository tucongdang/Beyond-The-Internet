import React, { useState } from 'react';
import { X, Sparkles, Globe, Check, AlertCircle, RefreshCw, Send } from 'lucide-react';
import { QuestionItem, QuestionTranslation, GameState } from '../types';
import { translationService, SUPPORTED_TRANSLATION_LANGUAGES } from '../services/translationService';
import { syncService } from '../services/syncService';
import { soundFx } from '../services/audioEffects';
import { vibrateTap, vibrateSuccess } from '../utils/hapticUtils';

interface AiTranslationModalProps {
  isOpen: boolean;
  onClose: () => void;
  gameState: GameState;
  onApplyTranslations?: (translations: Record<string, QuestionTranslation>) => void;
}

export const AiTranslationModal: React.FC<AiTranslationModalProps> = ({
  isOpen,
  onClose,
  gameState,
  onApplyTranslations
}) => {
  const [selectedLangs, setSelectedLangs] = useState<string[]>(['en']);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [previewTranslations, setPreviewTranslations] = useState<Record<string, QuestionTranslation>>(() => {
    return gameState.translations || {};
  });

  if (!isOpen) return null;

  const currentTranslations = {
    ...(gameState.translations || {}),
    ...previewTranslations
  };

  const toggleLanguageSelection = (code: string) => {
    setSelectedLangs(prev =>
      prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]
    );
  };

  const selectAllPopular = () => {
    setSelectedLangs(['en', 'zh', 'ja', 'ko']);
  };

  const handleTranslateSelected = async () => {
    if (selectedLangs.length === 0) {
      setErrorMsg('Vui lòng chọn ít nhất một ngôn ngữ mục tiêu.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    vibrateTap();

    const newTrans: Record<string, QuestionTranslation> = { ...previewTranslations };

    try {
      for (const lang of selectedLangs) {
        const res = await translationService.translateQuestion(
          {
            id: gameState.question_id,
            question_text: gameState.question_text,
            options: gameState.options,
            explanation: gameState.explanation
          },
          lang
        );
        newTrans[lang] = res;
      }

      setPreviewTranslations(newTrans);
      vibrateSuccess();
      soundFx.playTing();

      // Automatically broadcast to live game state if running
      syncService.updateGameState({
        translations: newTrans
      });

      if (onApplyTranslations) {
        onApplyTranslations(newTrans);
      }

      setSuccessMsg(`Đã dịch thành công sang ${selectedLangs.map(l => l.toUpperCase()).join(', ')} và đồng bộ tới tất cả khán giả!`);
    } catch (err: any) {
      console.error('Translation error:', err);
      setErrorMsg(err?.message || 'Có lỗi xảy ra khi gọi AI dịch.');
      soundFx.playAlarm();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="fluent-card w-full max-w-xl max-h-[90vh] flex flex-col rounded-[4px] border border-white/20 bg-[#190839]/95 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-[2px] bg-sky-500/20 text-sky-300 border border-sky-500/30 flex items-center justify-center">
              <Globe className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-white font-bold text-sm sm:text-base flex items-center gap-1.5">
                Dịch Câu Hỏi Bằng AI (Gemini Flash)
              </h3>
              <p className="text-[11px] text-white/50 font-mono">
                Mã: {gameState.question_id} • {gameState.round_name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-[2px] bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {/* Source Question Preview */}
          <div className="fluent-box-nested p-3.5 rounded-[2px] border border-white/10">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#F7CAC9] block mb-1">
              Câu hỏi gốc (Tiếng Việt):
            </span>
            <p className="text-xs sm:text-sm text-white/90 font-medium line-clamp-3">
              {gameState.question_text || '(Chưa có nội dung câu hỏi)'}
            </p>
          </div>

          {/* Language Selection Grid */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-white/90 flex items-center gap-1.5">
                <span>Chọn ngôn ngữ mục tiêu cần dịch:</span>
              </span>
              <button
                type="button"
                onClick={selectAllPopular}
                className="text-[11px] text-sky-300 hover:text-sky-200 underline font-mono cursor-pointer"
              >
                + Chọn 4 tiếng phổ biến (EN, ZH, JA, KO)
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {SUPPORTED_TRANSLATION_LANGUAGES.map(lang => {
                const isSelected = selectedLangs.includes(lang.code);
                const hasTranslation = Boolean(currentTranslations[lang.code]);

                return (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => toggleLanguageSelection(lang.code)}
                    className={`p-2.5 rounded-[2px] text-left border flex items-center justify-between gap-2 transition cursor-pointer ${
                      isSelected
                        ? 'bg-sky-500/20 border-sky-400/60 text-white shadow-sm'
                        : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="text-base">{lang.flag}</span>
                      <div className="truncate">
                        <span className="text-xs font-bold block truncate">{lang.nativeLabel}</span>
                        <span className="text-[10px] text-white/40 font-mono block">({lang.code.toUpperCase()})</span>
                      </div>
                    </div>
                    {hasTranslation && (
                      <span className="w-4 h-4 rounded-full bg-emerald-500/30 text-emerald-300 border border-emerald-500/50 flex items-center justify-center text-[10px] shrink-0" title="Đã có bản dịch">
                        ✓
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Current Translations Status */}
          {Object.keys(currentTranslations).length > 0 && (
            <div className="p-3 rounded-[2px] bg-emerald-950/40 border border-emerald-500/30 text-emerald-200 text-xs">
              <span className="font-bold block mb-1">✓ Bản dịch đang phát sóng:</span>
              <div className="flex flex-wrap gap-1.5">
                {Object.keys(currentTranslations).map(langCode => (
                  <span
                    key={langCode}
                    className="px-2 py-0.5 rounded-[2px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[11px] font-mono font-bold"
                  >
                    [{langCode.toUpperCase()}]
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Status Message */}
          {errorMsg && (
            <div className="p-3 rounded-[2px] bg-rose-950/60 border border-rose-500/40 text-rose-200 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-[2px] bg-emerald-950/60 border border-emerald-500/40 text-emerald-200 text-xs flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-white/10 bg-white/5 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-[2px] bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition cursor-pointer"
          >
            Đóng
          </button>

          <button
            type="button"
            onClick={handleTranslateSelected}
            disabled={isLoading || selectedLangs.length === 0}
            className="px-5 py-2.5 rounded-[2px] bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white text-xs sm:text-sm font-bold shadow-md shadow-sky-500/20 flex items-center gap-2 transition disabled:opacity-50 cursor-pointer"
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-white" />
                <span>Đang dịch AI ({selectedLangs.length} ngôn ngữ)...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-[#F7CAC9]" />
                <span>Dịch & Phát Sóng Tức Thì</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
