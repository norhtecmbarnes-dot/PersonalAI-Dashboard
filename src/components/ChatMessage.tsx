import { useState } from 'react';
import { MarkdownRenderer } from './MarkdownRenderer';

interface ChatMessageProps {
  role: 'user' | 'assistant' | 'expert';
  content: string;
}

export function ChatMessage({ role, content }: ChatMessageProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const isExpert = role === 'expert';
  const userInitials = 'U';

  return (
    <div className={`chat-message ${isExpert ? 'expert' : 'user'}`}>
      <div className="message-avatar">
        {isExpert ? (
          <div className="expert-avatar">
            <span className="avatar-letter">E</span>
          </div>
        ) : (
          <div className="user-avatar">
            <span className="avatar-letter">{userInitials}</span>
          </div>
        )}
      </div>

      <div className="message-content">
        {(role === 'assistant' || role === 'expert') ? (
          <>
            <div className="message-bubble expert-bubble">
              <MarkdownRenderer content={content} />
            </div>
            <div className="message-actions">
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className={`action-button expand-button`}
              >
                {isExpanded ? 'Show less' : 'Show more'}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className={`message-bubble user-bubble`}>
              {content}
            </div>
          </>
        )}
      </div>
    </div>
  );
}