import { sqlDatabase, Note, Task, CalendarEvent, Contact } from '../database/sqlite';
import { v4 as uuidv4 } from 'uuid';

export interface DocumentContext {
  id: string;
  title: string;
  content: string;
  type: 'pdf' | 'docx' | 'txt' | 'md' | 'html' | 'other';
  summary?: string;
  tags: string[];
  importance: 'low' | 'medium' | 'high' | 'critical';
  briefingNotes?: string;
  remember: boolean;
  vectorized: boolean;
  embedding?: number[];
  createdAt: number;
  updatedAt: number;
}

export interface ChatContext {
  documentId: string;
  question: string;
  answer: string;
  sources: string[];
}

export class DocumentProcessor {
  private static instance: DocumentProcessor;

  private constructor() {}

  static getInstance(): DocumentProcessor {
    if (!DocumentProcessor.instance) {
      DocumentProcessor.instance = new DocumentProcessor();
    }
    return DocumentProcessor.instance;
  }

  async processDocument(file: {
    name: string;
    content: string;
    type: string;
    size: number;
  }): Promise<DocumentContext> {
    const id = uuidv4();
    const now = Date.now();

    const docType = this.detectDocumentType(file.name, file.type);
    const content = file.content;

    const contextualized = await this.contextualizeDocument(content, file.name);
    const importance = await this.evaluateImportance(content);
    const embedding = this.generateEmbedding(content);

    const docContext: DocumentContext = {
      id,
      title: file.name,
      content: content.substring(0, 50000),
      type: docType,
      summary: contextualized.summary,
      tags: contextualized.tags,
      importance,
      briefingNotes: contextualized.briefingNotes,
      remember: true,
      vectorized: true,
      embedding: embedding,
      createdAt: now,
      updatedAt: now,
    };

    return docContext;
  }

  private detectDocumentType(filename: string, mimeType: string): DocumentContext['type'] {
    const ext = filename.split('.').pop()?.toLowerCase();
    
    if (ext === 'pdf' || mimeType === 'application/pdf') return 'pdf';
    if (ext === 'docx' || ext === 'doc' || mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') return 'docx';
    if (ext === 'txt' || mimeType === 'text/plain') return 'txt';
    if (ext === 'md' || ext === 'markdown') return 'md';
    if (ext === 'html' || ext === 'htm' || mimeType === 'text/html') return 'html';
    
    return 'other';
  }

  private async contextualizeDocument(content: string, filename: string): Promise<{
    summary: string;
    tags: string[];
    briefingNotes: string;
  }> {
    const prompt = `Analyze this document and provide contextual information:

Filename: ${filename}
Content (first 3000 chars): ${content.substring(0, 3000)}

Return ONLY valid JSON with:
{
  "summary": "2-3 sentence summary of the document",
  "tags": ["relevant", "tags", "derived", "from", "content"],
  "briefingNotes": "Key points that would be important for a weekly briefing or report"
}`;

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'ollama/qwen2.5:14b',
          message: prompt,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const responseContent = data.message?.content || data.message || '';
        const match = responseContent.match(/\{[\s\S]*\}/);
        
        if (match) {
          return JSON.parse(match[0]);
        }
      }
    } catch (error) {
      console.error('Error contextualizing document:', error);
    }

    return {
      summary: content.substring(0, 200) + '...',
      tags: ['imported-document'],
      briefingNotes: 'Document imported - requires manual review for briefing',
    };
  }

  private async evaluateImportance(content: string): Promise<DocumentContext['importance']> {
    const prompt = `Evaluate the importance of this document for a weekly briefing or report.

Content (first 2000 chars): ${content.substring(0, 2000)}

Return ONLY one word: critical, high, medium, or low

Consider:
- Does it contain time-sensitive information?
- Does it have financial, strategic, or operational impact?
- Does it mention deadlines, decisions, or action items?
- Is it news-worthy or trend-setting?`;

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'ollama/qwen2.5:14b',
          message: prompt,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const content = (data.message?.content || data.message || '').toLowerCase().trim();
        
        if (content.includes('critical')) return 'critical';
        if (content.includes('high')) return 'high';
        if (content.includes('medium')) return 'medium';
        return 'low';
      }
    } catch (error) {
      console.error('Error evaluating importance:', error);
    }

    return 'medium';
  }

  private generateEmbedding(text: string): number[] {
    const hash = this.simpleHash(text);
    const embedding: number[] = [];
    const seed = hash;
    
    for (let i = 0; i < 384; i++) {
      const x = Math.sin(seed * (i + 1) * 12.9898) * 43758.5453;
      embedding.push((x - Math.floor(x)) * 2 - 1);
    }
    
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    return embedding.map(val => val / magnitude);
  }

  private simpleHash(text: string): number {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  async saveDocumentContext(docContext: DocumentContext): Promise<void> {
    await sqlDatabase.initialize();

    sqlDatabase.addNote({
      title: docContext.title,
      content: docContext.content,
      category: 'document',
      tags: [...docContext.tags, `importance:${docContext.importance}`, `type:${docContext.type}`],
    });

    if (docContext.importance === 'high' || docContext.importance === 'critical') {
      const note = sqlDatabase.addNote({
        title: `Briefing: ${docContext.title}`,
        content: docContext.briefingNotes || docContext.summary || '',
        category: 'briefing',
        tags: ['weekly-briefing', `importance:${docContext.importance}`],
      });
    }
  }

  async chatWithDocument(documentId: string, question: string): Promise<ChatContext> {
    await sqlDatabase.initialize();

    const notes = sqlDatabase.getNotes('document');
    const doc = notes.find(n => n.id === documentId || n.title.includes(documentId));

    if (!doc) {
      return {
        documentId,
        question,
        answer: 'Document not found',
        sources: [],
      };
    }

    const prompt = `Based on the following document, answer the user's question.

Document Title: ${doc.title}
Document Content: ${doc.content.substring(0, 8000)}

User's Question: ${question}

Provide a helpful answer based on the document content. If the question cannot be answered from the document, say so.`;

    try {
      const baseUrl = typeof window !== 'undefined' 
        ? window.location.origin 
        : process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
      
      const response = await fetch(`${baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'glm-4.7-flash',
          message: prompt,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const answer = data.message?.content || data.message || 'No answer generated';
        
        return {
          documentId,
          question,
          answer,
          sources: [doc.title],
        };
      }
    } catch (error) {
      console.error('Error chatting with document:', error);
    }

    return {
      documentId,
      question,
      answer: 'Error processing question',
      sources: [],
    };
  }

  getDocumentsForBriefing(importanceThreshold: 'low' | 'medium' | 'high' | 'critical' = 'medium'): Note[] {
    const importanceOrder = ['low', 'medium', 'high', 'critical'];
    const minImportance = importanceOrder.indexOf(importanceThreshold);
    
    const notes = sqlDatabase.getNotes('briefing');
    
    return notes.filter(note => {
      const importanceTag = note.tags.find(t => t.startsWith('importance:'));
      if (!importanceTag) return false;
      
      const importance = importanceTag.split(':')[1];
      return importanceOrder.indexOf(importance) >= minImportance;
    });
  }

  generateWeeklyBriefing(): string {
    const briefingNotes = this.getDocumentsForBriefing('medium');
    
    let briefing = '# Weekly Briefing\n\n';
    
    const critical = briefingNotes.filter(n => n.tags.includes('importance:critical'));
    const high = briefingNotes.filter(n => n.tags.includes('importance:high'));
    const medium = briefingNotes.filter(n => n.tags.includes('importance:medium'));

    if (critical.length > 0) {
      briefing += '## Critical Items\n';
      critical.forEach(note => {
        briefing += `- ${note.title}: ${note.content.substring(0, 200)}\n`;
      });
      briefing += '\n';
    }

    if (high.length > 0) {
      briefing += '## High Priority\n';
      high.forEach(note => {
        briefing += `- ${note.title}: ${note.content.substring(0, 200)}\n`;
      });
      briefing += '\n';
    }

    if (medium.length > 0) {
      briefing += '## Medium Priority\n';
      medium.forEach(note => {
        briefing += `- ${note.title}: ${note.content.substring(0, 200)}\n`;
      });
      briefing += '\n';
    }

    return briefing;
  }

  cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length || a.length === 0) return 0;
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  searchDocuments(query: string, limit = 5): Note[] {
    const queryEmbedding = this.generateEmbedding(query);
    const notes = sqlDatabase.getNotes();
    
    const results = notes
      .filter(n => n.category === 'document')
      .map(note => ({
        note,
        similarity: this.cosineSimilarity(queryEmbedding, this.generateEmbedding(note.content)),
      }))
      .filter(r => r.similarity > 0.3)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit)
      .map(r => r.note);

    return results;
  }
}

export const documentProcessor = DocumentProcessor.getInstance();
