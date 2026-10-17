import React, { useState } from 'react';
import { Bot, Sparkles, MessageSquare } from 'lucide-react';
import { GameState, UserInfo } from '../types';
import { soundFx } from '../services/audioEffects';
import { vibrateTap } from '../utils/hapticUtils';
import { AssistantChatModal } from './AssistantChatModal';

export interface ChatAssistantWidgetProps {
  gameState: GameState;
  user?: UserInfo | null;
  currentView?: string;
  className?: string;
  onMessageSent?: () => void;
  onMessageReceived?: () => void;
  initialTab?: 'chat' | 'facts';
}

export const ChatAssistantWidget: React.FC<ChatAssistantWidgetProps> = ({
  gameState,
  user,
  currentView,
  className = '',
  onMessageSent,
  onMessageReceived,
  initialTab
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);

  // If in pure stage projector view, do not show floating bubble
  if (currentView === 'projector') {
    return null;
  }

  const activeRoundName = gameState?.round_name?.trim() || 'Khởi động';
  const activeStatus = gameState?.status || 'STANDBY';
  const isQuestionActive = activeStatus === 'ACTIVE';

  // Automatically append the current active round name and status from gameState into the prompt context
  const roundPromptContext = `[NGỮ CẢNH TRẬN ĐẤU THỜI GIAN THỰC]: Vòng thi hiện tại là "${activeRoundName}" với trạng thái "${activeStatus}".`;

  const handleToggle = () => {
    vibrateTap();
    if (!isOpen) {
      soundFx.playTing();
    } else {
      soundFx.playClick();
    }
    setIsOpen(prev => !prev);
  };

  return (
    <>
      {/* Floating Bubble in bottom-right corner */}
      {!isOpen && (
        <button
          type="button"
          id="btn-chat-assistant-widget"
          onClick={handleToggle}
          className={`fixed bottom-20 right-3.5 sm:bottom-6 sm:right-6 z-40 p-3 sm:p-3.5 rounded-[4px] bg-gradient-to-r from-purple-700 via-indigo-700 to-purple-600 hover:from-purple-600 hover:to-indigo-600 text-white shadow-xl shadow-purple-950/80 border border-[#F7CAC9]/40 transition-all hover:scale-105 active:scale-95 cursor-pointer flex items-center gap-2 group backdrop-blur-xl ${className}`}
          title={`Mở Trợ Lý Khán Giả AI (${activeRoundName} • ${activeStatus})`}
          aria-label={`Mở Trợ Lý Khán Giả AI - Vòng ${activeRoundName}`}
        >
          <div className="relative flex items-center justify-center">
            <Bot className="w-5 h-5 text-white group-hover:rotate-12 transition-transform" />
            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${isQuestionActive ? 'bg-emerald-400' : 'bg-[#F7CAC9]'} opacity-75`} />
              <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isQuestionActive ? 'bg-emerald-400' : 'bg-[#F7CAC9]'}`} />
            </span>
          </div>

          <div className="hidden sm:flex flex-col text-left">
            <span className="text-[11px] font-bold font-mono tracking-tight text-white flex items-center gap-1">
              <span>Trợ Lý BTI</span>
              <Sparkles className="w-3 h-3 text-[#F7CAC9]" />
            </span>
            <span className="text-[9px] text-[#F7CAC9]/90 font-mono flex items-center gap-1 truncate max-w-[140px]">
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isQuestionActive ? 'bg-emerald-400 animate-pulse' : 'bg-cyan-300'}`} />
              <span className="truncate">{activeRoundName}</span>
            </span>
          </div>
        </button>
      )}

      {/* Assistant Chat Modal with subtle conversational sound effects */}
      <AssistantChatModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        gameState={gameState}
        user={user}
        activeRoundName={activeRoundName}
        activeStatus={activeStatus}
        promptContext={roundPromptContext}
        onMessageSent={onMessageSent || (() => soundFx.playMessageSent())}
        onMessageReceived={onMessageReceived || (() => soundFx.playMessageReceived())}
        initialTab={initialTab}
      />
    </>
  );
};
