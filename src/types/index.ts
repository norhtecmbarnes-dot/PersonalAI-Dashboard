export interface Expert {
  id: string;
  name: string;
  role: string;
  description: string;
  capabilities: string[];
  systemPrompt: string;
  personality?: string;
  editable: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'expert';
  content: string | React.ReactNode;
  timestamp: Date;
}

export interface ChatSession {
  id: string;
  expertId: string;
  expertName: string;
  title: string;
  messages: ChatMessage[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Document {
  id: string;
  title: string;
  content: string;
  type: 'knowledge' | 'document';
  author: string;
  createdAt: Date;
  updatedAt: Date;
  tags: string[];
}

export interface KnowledgeItem {
  id: string;
  key: string;
  value: string;
  category: string;
  description: string;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface SystemConfig {
  theme: 'light' | 'dark' | 'system';
  defaultExpert: string;
  fontSize: 'small' | 'medium' | 'large';
}