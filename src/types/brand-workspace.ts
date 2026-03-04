export type DocumentType = 'pdf' | 'docx' | 'txt' | 'markdown' | 'url' | 'html' | 'image' | 'other';
export type DocumentSource = 'brand' | 'project';
export type ProjectType = 'bid' | 'proposal' | 'marketing' | 'campaign' | 'research' | 'quote' | 'other';
export type ProjectStatus = 'active' | 'completed' | 'archived' | 'on_hold';

export interface BrandDocument {
  id: string;
  brandId: string;
  title: string;
  originalFilename?: string;
  type: DocumentType;
  source: DocumentSource;
  projectId?: string;
  content: string;
  compactedContent?: string;
  metadata: {
    size?: number;
    mimeType?: string;
    url?: string;
    author?: string;
    createdAt?: number;
    importedAt: number;
    tags?: string[];
    summary?: string;
  };
  vectorized: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface Brand {
  id: string;
  name: string;
  description?: string;
  industry?: string;
  website?: string;
  logo?: string;
  voiceProfile: {
    tone?: string;
    style?: string;
    keyMessages?: string[];
    avoidPhrases?: string[];
    customInstructions?: string;
  };
  settings: {
    defaultModel?: string;
    temperature?: number;
    maxTokens?: number;
  };
  tags: string[];
  createdAt: number;
  updatedAt: number;
}

export interface Project {
  id: string;
  brandId: string;
  name: string;
  description?: string;
  type: ProjectType;
  status: ProjectStatus;
  requirements?: string;
  deliverables?: string[];
  deadline?: number;
  metadata?: Record<string, any>;
  tags: string[];
  createdAt: number;
  updatedAt: number;
}

export interface ChatSession {
  id: string;
  projectId?: string;
  brandId: string;
  title?: string;
  messages: ChatMessage[];
  context: {
    brandDocumentsUsed: string[];
    projectDocumentsUsed: string[];
    totalTokensUsed: number;
  };
  createdAt: number;
  updatedAt: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  metadata?: {
    model?: string;
    tokens?: number;
    documentsReferenced?: string[];
  };
}

export interface GeneratedOutput {
  id: string;
  projectId: string;
  sessionId?: string;
  type: 'proposal' | 'quote' | 'email' | 'report' | 'other';
  title: string;
  content: string;
  format: 'markdown' | 'html' | 'plain';
  metadata?: Record<string, any>;
  createdAt: number;
  updatedAt: number;
}

export interface DocumentUploadResult {
  success: boolean;
  document?: BrandDocument;
  error?: string;
}

export interface ChatRequest {
  brandId: string;
  projectId: string;
  message: string;
  sessionId?: string;
  model?: string;
}

export interface ChatResponse {
  success: boolean;
  message?: ChatMessage;
  session?: ChatSession;
  error?: string;
}