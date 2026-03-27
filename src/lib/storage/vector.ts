import fs from 'fs';
import path from 'path';
import { embeddingService } from '../services/embedding-service';
import { DocumentStore } from './documents';
import { NoteStore } from './notes';

const VECTOR_FILE = path.join(process.cwd(), 'data', 'vector_store.json');

function ensureDataDir(): void {
  const dataDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

export interface VectorEntry {
  id: string;
  content: string;
  embedding: number[];
  metadata: {
    type: 'document' | 'note' | 'conversation' | 'knowledge';
    sourceId?: string;
    title?: string;
    timestamp: number;
    tags?: string[];
  };
}

export interface SearchResult {
  id: string;
  content: string;
  score: number;
  metadata: VectorEntry['metadata'];
}

export class VectorStore {
  private static embeddings: VectorEntry[] = [];

  static initialize(): void {
    const stored = this.load();
    this.embeddings = stored;
    console.log('[VectorStore] Initialized with', this.embeddings.length, 'embeddings');
  }

  private static load(): VectorEntry[] {
    try {
      ensureDataDir();
      if (fs.existsSync(VECTOR_FILE)) {
        const data = fs.readFileSync(VECTOR_FILE, 'utf-8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.error('[VectorStore] Error loading embeddings:', error);
    }
    return [];
  }

  private static save(): void {
    try {
      ensureDataDir();
      fs.writeFileSync(VECTOR_FILE, JSON.stringify(this.embeddings, null, 2));
    } catch (error) {
      console.error('[VectorStore] Error saving embeddings:', error);
    }
  }

  private static async generateEmbedding(text: string): Promise<number[]> {
    return embeddingService.generateEmbedding(text);
  }

  private static cosineSimilarity(a: number[], b: number[]): number {
    return embeddingService.cosineSimilarity(a, b);
  }

  static async addDocument(doc: {
    id: string;
    content: string;
    title: string;
    tags?: string[];
  }): Promise<void> {
    const embedding = await this.generateEmbedding(doc.content);
    const entry: VectorEntry = {
      id: doc.id,
      content: doc.content,
      embedding,
      metadata: {
        type: 'document',
        sourceId: doc.id,
        title: doc.title,
        timestamp: Date.now(),
        tags: doc.tags,
      },
    };
    this.embeddings.push(entry);
    this.save();
  }

  static async addNote(note: {
    id: string;
    content: string;
    title: string;
    tags?: string[];
  }): Promise<void> {
    const embedding = await this.generateEmbedding(note.content);
    const entry: VectorEntry = {
      id: note.id,
      content: note.content,
      embedding,
      metadata: {
        type: 'note',
        sourceId: note.id,
        title: note.title,
        timestamp: Date.now(),
        tags: note.tags,
      },
    };
    this.embeddings.push(entry);
    this.save();
  }

  static async addKnowledge(knowledge: {
    id: string;
    content: string;
    tags?: string[];
  }): Promise<void> {
    const embedding = await this.generateEmbedding(knowledge.content);
    const entry: VectorEntry = {
      id: knowledge.id,
      content: knowledge.content,
      embedding,
      metadata: {
        type: 'knowledge',
        timestamp: Date.now(),
        tags: knowledge.tags,
      },
    };
    this.embeddings.push(entry);
    this.save();
  }

  static async addConversation(message: {
    id: string;
    content: string;
    role: string;
  }): Promise<void> {
    const embedding = await this.generateEmbedding(message.content);
    const entry: VectorEntry = {
      id: message.id,
      content: message.content,
      embedding,
      metadata: {
        type: 'conversation',
        timestamp: Date.now(),
      },
    };
    this.embeddings.push(entry);

    if (this.embeddings.length > 1000) {
      this.embeddings = this.embeddings.slice(-500);
    }
    this.save();
  }

  static async search(query: string, limit = 5, threshold = 0.3): Promise<SearchResult[]> {
    const queryEmbedding = await this.generateEmbedding(query);

    const results: SearchResult[] = this.embeddings
      .map(entry => ({
        id: entry.id,
        content: entry.content,
        score: this.cosineSimilarity(queryEmbedding, entry.embedding),
        metadata: entry.metadata,
      }))
      .filter(r => r.score >= threshold)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    return results;
  }

  static async getContextForQuery(query: string, maxTokens = 2000): Promise<string> {
    const results = await this.search(query, 10, 0.2);

    let context = '';
    let tokenCount = 0;
    const avgTokensPerWord = 1.3;

    for (const result of results) {
      const wordCount = result.content.split(/\s+/).length;
      const tokens = wordCount * avgTokensPerWord;

      if (tokenCount + tokens > maxTokens) break;

      context += `[${result.metadata.type}] ${result.content}\n\n`;
      tokenCount += tokens;
    }

    return context;
  }

  static getByType(type: VectorEntry['metadata']['type']): VectorEntry[] {
    return this.embeddings.filter(e => e.metadata.type === type);
  }

  static delete(id: string): void {
    this.embeddings = this.embeddings.filter(e => e.id !== id);
    this.save();
  }

  static clear(): void {
    this.embeddings = [];
    this.save();
  }

  static getStats(): { total: number; byType: Record<string, number> } {
    const byType: Record<string, number> = {};
    for (const entry of this.embeddings) {
      byType[entry.metadata.type] = (byType[entry.metadata.type] || 0) + 1;
    }
    return { total: this.embeddings.length, byType };
  }

  static async syncWithStorage(): Promise<void> {
    const docs = await DocumentStore.getAll();
    const notes = NoteStore.getAll();

    const existingDocIds = new Set(
      this.embeddings.filter(e => e.metadata.type === 'document').map(e => e.metadata.sourceId)
    );
    const existingNoteIds = new Set(
      this.embeddings.filter(e => e.metadata.type === 'note').map(e => e.metadata.sourceId)
    );

    for (const doc of docs) {
      if (!existingDocIds.has(doc.id)) {
        await this.addDocument({
          id: doc.id,
          content: doc.content,
          title: doc.title,
          tags: doc.metadata?.tags,
        });
      }
    }

    for (const note of notes) {
      if (!existingNoteIds.has(note.id)) {
        await this.addNote({
          id: note.id,
          content: note.content,
          title: note.title,
          tags: note.tags,
        });
      }
    }
  }
}

VectorStore.initialize();
