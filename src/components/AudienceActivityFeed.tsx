import { useLanguage } from '../hooks/useLanguage';
import React, { useState, useEffect, useRef } from 'react';
import { t } from '../utils/i18n';
import { GameState, UserResponse } from '../types';
import { Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface AudienceActivityFeedProps {
  gameState: GameState;
  allResponses: Record<string, Record<string, UserResponse>>;
}

interface ActivityToast {
  id: string;
  userName: string;
  choice: string;
  timestamp: number;
  pollName: string;
}

export const AudienceActivityFeed: React.FC<AudienceActivityFeedProps> = ({ gameState, allResponses }) => {
  const { localLanguage } = useLanguage();

  const [toasts, setToasts] = useState<ActivityToast[]>([]);
  const prevResponsesRef = useRef<Record<string, number>>({});

  useEffect(() => {
    // Collect all active poll responses
    const activePolls: { id: string; name: string; responses: Record<string, UserResponse> }[] = [];
    
    // Main poll
    if (gameState.status === 'ACTIVE' && gameState.question_id) {
       activePolls.push({
         id: gameState.question_id,
         name: 'Câu hỏi chính',
         responses: allResponses[gameState.question_id] || {}
       });
    }

    // Emergency poll
    if (gameState.emergency_poll?.status === 'ACTIVE' && gameState.emergency_poll.id) {
       const key = `EMERGENCY_POLL_${gameState.emergency_poll.id}`;
       activePolls.push({
         id: key,
         name: 'Khảo sát khẩn cấp',
         responses: allResponses[key] || {}
       });
    }

    const newToasts: ActivityToast[] = [];
    const newPrevResponses: Record<string, number> = { ...prevResponsesRef.current };
    
    let hasNew = false;
    const isFirstRun = Object.keys(prevResponsesRef.current).length === 0;

    activePolls.forEach(poll => {
      Object.entries(poll.responses).forEach(([uid, response]) => {
         const uniqueKey = `${poll.id}_${uid}`;
         if (!prevResponsesRef.current[uniqueKey]) {
            // New response!
            hasNew = true;
            newPrevResponses[uniqueKey] = response.timestamp;
            
            // Only add to toasts if the response is recent (within last 10 seconds) or not first run
            if (!isFirstRun || Date.now() - response.timestamp < 10000) {
               newToasts.push({
                 id: uniqueKey,
                 userName: response.user_info?.name || 'Khán giả',
                 choice: response.choice,
                 timestamp: Date.now(),
                 pollName: poll.name
               });
            }
         }
      });
    });

    if (hasNew) {
      prevResponsesRef.current = newPrevResponses;
      
      if (newToasts.length > 0) {
        setToasts(prev => {
          const combined = [...newToasts.reverse(), ...prev];
          return combined.slice(0, 5); // Keep max 5 recent toasts on screen
        });
      }
    }
  }, [allResponses, gameState.status, gameState.question_id, gameState.emergency_poll]);

  useEffect(() => {
    if (toasts.length === 0) return;
    
    const interval = setInterval(() => {
       const now = Date.now();
       setToasts(prev => prev.filter(t => now - t.timestamp < 4000));
    }, 500);
    return () => clearInterval(interval);
  }, [toasts]);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50 flex flex-col gap-2 pointer-events-none">
      <AnimatePresence>
        {toasts.map(toast => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, x: -50, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
            className="bg-slate-900/50 backdrop-blur-[24px] saturate-150/90 border border-slate-700/50 shadow-lg shadow-black/20 rounded-[12px] p-3 backdrop-blur-md flex items-center gap-3 w-64 pointer-events-auto"
          >
            <div className="w-8 h-8 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center shrink-0 border border-blue-500/30">
              <Zap className="w-4 h-4 text-blue-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-slate-400 font-mono mb-0.5 truncate uppercase tracking-widest">{toast.pollName}</p>
              <p className="text-xs font-bold text-white truncate">
                {toast.userName} <span className="text-slate-400 font-normal">{t("feed_chose", localLanguage)}</span> <span className="text-amber-400">"{toast.choice}"</span>
              </p>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
