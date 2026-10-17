import React from 'react';
import { GameState, UserInfo } from '../types';
import { ChatAssistantWidget } from './ChatAssistantWidget';

export interface AudienceChatbotProps {
  gameState: GameState;
  userInfo: UserInfo;
}

/**
 * AudienceChatbot - Backward compatibility wrapper around ChatAssistantWidget
 */
export const AudienceChatbot: React.FC<AudienceChatbotProps> = ({ gameState, userInfo }) => {
  return <ChatAssistantWidget gameState={gameState} user={userInfo} />;
};

export { ChatAssistantWidget };
export { AssistantChatModal } from './AssistantChatModal';
