import { useState } from 'react';
import { getDefaultExperts, getExpertPrompt } from '@/lib/storage/experts';
import type { Expert } from '@/types/index';
import { ChatMessage } from './ChatMessage';
import { MarkdownRenderer } from './MarkdownRenderer';

interface ExpertChatProps {
  expert: Expert;
  onBack: () => void;
}

export function ExpertChat({ expert, onBack }: ExpertChatProps) {
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'expert'; content: string }>>([
    {
      role: 'expert',
      content: `Hello! I'm ${expert.name}, your ${expert.role}. ${expert.description}\n\nI'm here to help with ${expert.capabilities.join(', ')}. What would you like to discuss today?`
    }
  ]);
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);

  const handleSend = async () => {
    if (!input.trim() || isThinking) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsThinking(true);

    try {
      const expertResponse = await generateExpertResponse(expert, userMessage);
      setMessages(prev => [...prev, { role: 'expert', content: expertResponse }]);
    } catch (error) {
      setMessages(prev => [...prev, {
        role: 'expert',
        content: `I apologize, but I'm currently unable to connect to access your specialized expertise. This could be due to a technical issue. Could you please try again, or contact support for assistance?`
      }]);
    } finally {
      setIsThinking(false);
    }
  };

  return (
    <div className="expert-chat">
      <div className="expert-header">
        <button className="back-button" onClick={onBack}>
          ← Back
        </button>
        <h1>{expert.name}</h1>
        <p>{expert.role}</p>
      </div>

      <div className="chat-messages">
        {messages.map((message, index) => (
          <ChatMessage
            key={index}
            role={message.role}
            content={message.content}
          />
        ))}

        {isThinking && (
          <div className="thinking-indicator">
            <span></span>
            <span></span>
            <span></span>
          </div>
        )}
      </div>

      <div className="chat-input">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
          placeholder={`Ask me anything about ${expert.capabilities.join(', ')}...`}
          rows={4}
          disabled={isThinking}
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || isThinking}
          className="send-button"
        >
          Send
        </button>
      </div>
    </div>
  );
}

async function generateExpertResponse(expert: Expert, userQuery: string): Promise<string> {
  const systemPrompt = getExpertPrompt(expert.id);
  const prompt = `User Question: ${userQuery}\n\nExpert Response:`;

  try {
    const response = await callAIModel(prompt, systemPrompt);
    return response;
  } catch (error) {
    throw new Error('AI model connection failed');
  }
}

async function callAIModel(prompt: string, systemPrompt: string): Promise<string> {
  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'ollama/qwen2.5:14b',
        message: prompt,
        systemPrompt
      })
    });
    
    const data = await response.json();
    return data.message || 'I apologize, but there was an issue generating a specialized response. Please try again.';
  } catch (error) {
    throw new Error('AI model unavailable');
  }
}