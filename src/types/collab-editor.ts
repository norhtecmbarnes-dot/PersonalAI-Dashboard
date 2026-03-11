export type ChangeType = 'insert' | 'delete' | 'format' | 'move';
export type ChangeStatus = 'pending' | 'accepted' | 'rejected';
export type Author = 'user' | 'ai';

export interface TrackedChange {
  id: string;
  type: ChangeType;
  status: ChangeStatus;
  author: Author;
  position: number;
  positionEnd: number;
  originalText: string;
  newText: string;
  timestamp: number;
  reason?: string;
  metadata?: {
    grammarFix?: boolean;
    expanded?: boolean;
    simplified?: boolean;
    rephrased?: boolean;
  };
}

export interface Comment {
  id: string;
  author: Author;
  position: number;
  positionEnd: number;
  text: string;
  timestamp: number;
  resolved: boolean;
  thread: CommentReply[];
}

export interface CommentReply {
  id: string;
  author: Author;
  text: string;
  timestamp: number;
}

export interface DocumentVersion {
  id: string;
  timestamp: number;
  content: string;
  changes: TrackedChange[];
  comments: Comment[];
  label: string;
}

export interface CollabDocument {
  id: string;
  title: string;
  content: string;
  changes: TrackedChange[];
  comments: Comment[];
  versions: DocumentVersion[];
  createdAt: number;
  updatedAt: number;
  author: string;
  
  brandId?: string;
  brandName?: string;
  
  projectId?: string;
  projectName?: string;
  
  documentType: 'proposal' | 'book' | 'article' | 'report' | 'general';
  
  metadata: {
    wordCount: number;
    charCount: number;
    pendingChanges: number;
    unresolvedComments: number;
    lastSaved?: number;
    autoSaved: boolean;
  };
}

export interface AIEditRequest {
  documentId: string;
  action: 'fix_grammar' | 'expand' | 'simplify' | 'rewrite' | 'suggest' | 'generate' | 'comment';
  selection?: {
    start: number;
    end: number;
    text: string;
  };
  context?: {
    brandVoice?: string;
    projectFiles?: string[];
    researchHistory?: string[];
    documentType: string;
  };
  options?: {
    tone?: 'formal' | 'casual' | 'technical' | 'persuasive';
    length?: 'shorter' | 'longer' | 'same';
    style?: string;
  };
}

export interface AIEditResponse {
  success: boolean;
  changes?: TrackedChange[];
  comments?: Comment[];
  newText?: string;
  error?: string;
}

export interface EditorState {
  document: CollabDocument;
  selectedChange: string | null;
  selectedComment: string | null;
  isAiWorking: boolean;
  showChanges: boolean;
  showComments: boolean;
  viewMode: 'edit' | 'preview' | 'changes' | 'final';
}