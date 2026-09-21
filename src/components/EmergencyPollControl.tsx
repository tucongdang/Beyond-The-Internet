import React, { useEffect } from 'react';
import { X, BarChart3 } from 'lucide-react';
import { GameState, EmergencyQuestionDraft, UserResponse } from '../types';
import { AdminPollManager } from './AdminPollManager';

interface EmergencyPollControlProps {
  gameState: GameState;
  allResponses?: Record<string, Record<string, UserResponse>>;
  activeAudienceCount?: number;
  isOpen: boolean;
  onClose: () => void;
  onOpenHistoryTab?: () => void;
  initialDraft?: EmergencyQuestionDraft | null;
  onClearInitialDraft?: () => void;
}

export const EmergencyPollControl: React.FC<EmergencyPollControlProps> = ({
  gameState,
  allResponses,
  activeAudienceCount = 1,
  isOpen,
  onClose,
  onOpenHistoryTab,
  initialDraft,
  onClearInitialDraft
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div 
      className="fluent-dialog-overlay z-[60] animate-fadeIn"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="emergency-poll-title"
    >
      <div 
        className="fluent-dialog w-full max-w-5xl fluent-box rounded-[2px] shadow-2xl flex flex-col text-white my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header Bar */}
        <div className="fluent-dialog-header shrink-0 flex items-center justify-between px-6 py-4 border-b border-white/10 fluent-box-nested">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-[2px] fluent-box text-[#F7CAC9] border border-[#F7CAC9]/30 flex items-center justify-center">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h3 id="emergency-poll-title" className="text-base font-bold text-white uppercase tracking-wider">
                Hệ Thống Khảo Sát Khẩn Cấp & Live Poll Unified
              </h3>
              <p className="text-[11px] text-white/50">
                Phát sóng khảo sát đa dạng (2-6 đáp án), xem telemetry trực tiếp & điều khiển trên cùng một giao diện duy nhất
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="w-8 h-8 rounded-[2px] bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer"
            title="Đóng cửa sổ"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body hosting AdminPollManager */}
        <div className="fluent-dialog-body p-4 sm:p-6 overflow-y-auto space-y-4 scrollbar-thin">
          <AdminPollManager
            gameState={gameState}
            allResponses={allResponses}
            activeAudienceCount={activeAudienceCount}
            onOpenHistoryTab={() => {
              onClose();
              if (onOpenHistoryTab) onOpenHistoryTab();
            }}
            initialDraft={initialDraft}
            onClearInitialDraft={onClearInitialDraft}
          />
        </div>
      </div>
    </div>
  );
};
