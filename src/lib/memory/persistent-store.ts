import { SQLDatabase } from '@/lib/database/sqlite';
import { generateId } from '@/lib/utils/id';
import * as fs from 'fs';
import * as path from 'path';

export type MemoryCategory = 'user' | 'project' | 'brand' | 'decision' | 'knowledge' | 'security' | 'preference';

export interface PersistentMemory {
  id: string;
  createdAt: number;
  category: MemoryCategory;
  key: string;
  content: string;
  embedding: number[] | null;
  importance: number;
  accessCount: number;
  lastAccessed: number;
  metadata: Record<string, any>;
}

export interface MemorySearchResult {
  memory: PersistentMemory;
  score: number;
  matchType: 'keyword' | 'semantic' | 'hybrid';
}

const MEMORY_DIR = path.join(process.cwd(), 'data', 'memory');
const ARCHIVE_DIR = path.join(MEMORY_DIR, 'archive');

function ensureMemoryDirs(): void {
  if (!fs.existsSync(MEMORY_DIR)) {
    fs.mkdirSync(MEMORY_DIR, { recursive: true });
  }
  if (!fs.existsSync(ARCHIVE_DIR)) {
    fs.mkdirSync(ARCHIVE_DIR, { recursive: true });
  }
}

export class PersistentMemoryStore {
  private db: SQLDatabase;
  private initialized: boolean = false;

  constructor() {
    this.db = SQLDatabase.getInstance();
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;
    await this.db.initialize();
    this.createTables();
    ensureMemoryDirs();
    this.initialized = true;
  }

  private createTables(): void {
    // Note: We add to SQLDatabase, but for now we use direct SQL here
    // The tables will be created via raw SQL execution
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

  private cosineSimilarity(a: number[], b: number[]): number {
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

  async saveMemory(memory: Omit<PersistentMemory, 'id' | 'createdAt' | 'accessCount' | 'lastAccessed' | 'embedding'>): Promise<string> {
    await this.initialize();
    
    const id = generateId();
    const now = Date.now();
    const embedding = this.generateEmbedding(memory.content);
    
    const memoryRecord: PersistentMemory = {
      ...memory,
      id,
      createdAt: now,
      embedding,
      accessCount: 1,
      lastAccessed: now,
    };

    // Save to vector store file (simple JSON append)
    const vectorFile = path.join(MEMORY_DIR, 'vectors.json');
    let vectors: PersistentMemory[] = [];
    
    try {
      if (fs.existsSync(vectorFile)) {
        vectors = JSON.parse(fs.readFileSync(vectorFile, 'utf-8'));
      }
    } catch (e) {
      vectors = [];
    }
    
    vectors.push(memoryRecord);
    
    try {
      fs.writeFileSync(vectorFile, JSON.stringify(vectors, null, 2));
    } catch (e) {
      console.error('[MemoryStore] Error saving vectors:', e);
    }

    return id;
  }

  async searchByKeyword(query: string, limit = 10, category?: MemoryCategory): Promise<PersistentMemory[]> {
    await this.initialize();
    
    const vectorFile = path.join(MEMORY_DIR, 'vectors.json');
    if (!fs.existsSync(vectorFile)) return [];
    
    let vectors: PersistentMemory[];
    try {
      vectors = JSON.parse(fs.readFileSync(vectorFile, 'utf-8'));
    } catch {
      return [];
    }

    const searchTerms = query.toLowerCase().split(/\s+/).filter(t => t.length > 2);
    
    const results = vectors.filter(v => {
      if (category && v.category !== category) return false;
      
      const contentLower = v.content.toLowerCase();
      const keyLower = v.key.toLowerCase();
      
      return searchTerms.some(term => 
        contentLower.includes(term) || keyLower.includes(term)
      );
    });

    // Sort by importance and recency
    results.sort((a, b) => {
      const importanceDiff = b.importance - a.importance;
      if (importanceDiff !== 0) return importanceDiff;
      return b.createdAt - a.createdAt;
    });

    return results.slice(0, limit);
  }

  async searchByEmbedding(query: string, limit = 10, category?: MemoryCategory): Promise<MemorySearchResult[]> {
    await this.initialize();
    
    const vectorFile = path.join(MEMORY_DIR, 'vectors.json');
    if (!fs.existsSync(vectorFile)) return [];
    
    let vectors: PersistentMemory[];
    try {
      vectors = JSON.parse(fs.readFileSync(vectorFile, 'utf-8'));
    } catch {
      return [];
    }

    const queryEmbedding = this.generateEmbedding(query);
    
    const results: MemorySearchResult[] = vectors
      .filter(v => {
        if (category && v.category !== category) return false;
        return v.embedding !== null;
      })
      .map(memory => ({
        memory,
        score: memory.embedding ? this.cosineSimilarity(queryEmbedding, memory.embedding) : 0,
        matchType: 'semantic' as const,
      }))
      .filter(r => r.score > 0.2)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    return results;
  }

  async search(query: string, options?: { category?: MemoryCategory; limit?: number }): Promise<MemorySearchResult[]> {
    const limit = options?.limit || 5;
    
    // Run both searches in parallel
    const [keywordResults, semanticResults] = await Promise.all([
      this.searchByKeyword(query, limit * 2, options?.category),
      this.searchByEmbedding(query, limit * 2, options?.category),
    ]);

    // Merge results
    const seen = new Set<string>();
    const merged: MemorySearchResult[] = [];

    // Add semantic results first (higher quality)
    for (const sr of semanticResults) {
      if (!seen.has(sr.memory.id)) {
        seen.add(sr.memory.id);
        merged.push({ ...sr, matchType: 'hybrid' });
      }
    }

    // Add keyword results (boost importance)
    for (const memory of keywordResults) {
      if (!seen.has(memory.id)) {
        seen.add(memory.id);
        merged.push({
          memory,
          score: 0.5 + (memory.importance / 20), // Boost by importance
          matchType: 'keyword',
        });
      }
    }

    // Sort by combined score
    merged.sort((a, b) => b.score - a.score);

    return merged.slice(0, limit);
  }

  async getRecent(limit = 10, category?: MemoryCategory): Promise<PersistentMemory[]> {
    await this.initialize();
    
    const vectorFile = path.join(MEMORY_DIR, 'vectors.json');
    if (!fs.existsSync(vectorFile)) return [];
    
    let vectors: PersistentMemory[];
    try {
      vectors = JSON.parse(fs.readFileSync(vectorFile, 'utf-8'));
    } catch {
      return [];
    }

    let filtered = vectors;
    if (category) {
      filtered = vectors.filter(v => v.category === category);
    }

    return filtered
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, limit);
  }

  async getImportant(limit = 10): Promise<PersistentMemory[]> {
    await this.initialize();
    
    const vectorFile = path.join(MEMORY_DIR, 'vectors.json');
    if (!fs.existsSync(vectorFile)) return [];
    
    let vectors: PersistentMemory[];
    try {
      vectors = JSON.parse(fs.readFileSync(vectorFile, 'utf-8'));
    } catch {
      return [];
    }

    return vectors
      .sort((a, b) => {
        const importanceDiff = b.importance - a.importance;
        if (importanceDiff !== 0) return importanceDiff;
        return b.createdAt - a.createdAt;
      })
      .slice(0, limit);
  }

  async delete(id: string): Promise<boolean> {
    await this.initialize();
    
    const vectorFile = path.join(MEMORY_DIR, 'vectors.json');
    if (!fs.existsSync(vectorFile)) return false;
    
    let vectors: PersistentMemory[];
    try {
      vectors = JSON.parse(fs.readFileSync(vectorFile, 'utf-8'));
    } catch {
      return false;
    }

    const originalLength = vectors.length;
    vectors = vectors.filter(v => v.id !== id);

    if (vectors.length < originalLength) {
      fs.writeFileSync(vectorFile, JSON.stringify(vectors, null, 2));
      return true;
    }

    return false;
  }

  async incrementAccess(id: string): Promise<void> {
    await this.initialize();
    
    const vectorFile = path.join(MEMORY_DIR, 'vectors.json');
    if (!fs.existsSync(vectorFile)) return;
    
    let vectors: PersistentMemory[];
    try {
      vectors = JSON.parse(fs.readFileSync(vectorFile, 'utf-8'));
    } catch {
      return;
    }

    const memory = vectors.find(v => v.id === id);
    if (memory) {
      memory.accessCount++;
      memory.lastAccessed = Date.now();
      fs.writeFileSync(vectorFile, JSON.stringify(vectors, null, 2));
    }
  }

  async getStats(): Promise<{ total: number; byCategory: Record<MemoryCategory, number>; avgImportance: number }> {
    await this.initialize();
    
    const vectorFile = path.join(MEMORY_DIR, 'vectors.json');
    if (!fs.existsSync(vectorFile)) {
      return { total: 0, byCategory: {} as Record<MemoryCategory, number>, avgImportance: 0 };
    }
    
    let vectors: PersistentMemory[];
    try {
      vectors = JSON.parse(fs.readFileSync(vectorFile, 'utf-8'));
    } catch {
      return { total: 0, byCategory: {} as Record<MemoryCategory, number>, avgImportance: 0 };
    }

    const byCategory: Record<string, number> = {};
    let totalImportance = 0;

    for (const v of vectors) {
      byCategory[v.category] = (byCategory[v.category] || 0) + 1;
      totalImportance += v.importance;
    }

    return {
      total: vectors.length,
      byCategory: byCategory as Record<MemoryCategory, number>,
      avgImportance: vectors.length > 0 ? totalImportance / vectors.length : 0,
    };
  }

  async archiveOld(daysOld: number = 30): Promise<number> {
    await this.initialize();
    
    const vectorFile = path.join(MEMORY_DIR, 'vectors.json');
    if (!fs.existsSync(vectorFile)) return 0;
    
    let vectors: PersistentMemory[];
    try {
      vectors = JSON.parse(fs.readFileSync(vectorFile, 'utf-8'));
    } catch {
      return 0;
    }

    const cutoff = Date.now() - (daysOld * 24 * 60 * 60 * 1000);
    const toArchive = vectors.filter(v => v.createdAt < cutoff && v.importance < 7);
    const toKeep = vectors.filter(v => v.createdAt >= cutoff || v.importance >= 7);

    if (toArchive.length === 0) return 0;

    // Create archive file
    const archiveDate = new Date().toISOString().split('T')[0];
    const archiveMonth = archiveDate.substring(0, 7);
    const archiveDir = path.join(ARCHIVE_DIR, archiveMonth);
    
    if (!fs.existsSync(archiveDir)) {
      fs.mkdirSync(archiveDir, { recursive: true });
    }

    const archiveFile = path.join(archiveDir, `memories-${archiveDate}.json`);
    
    // Read existing archive if any
    let existing: PersistentMemory[] = [];
    if (fs.existsSync(archiveFile)) {
      try {
        existing = JSON.parse(fs.readFileSync(archiveFile, 'utf-8'));
      } catch {}
    }

    // Write combined archive
    fs.writeFileSync(archiveFile, JSON.stringify([...existing, ...toArchive], null, 2));

    // Update main file
    fs.writeFileSync(vectorFile, JSON.stringify(toKeep, null, 2));

    return toArchive.length;
  }

  // Check if content contains sensitive data
  isSensitive(content: string): boolean {
    const sensitivePatterns = [
      /api[_-]?key/i,
      /secret/i,
      /password/i,
      /token/i,
      /private[_-]?key/i,
      /\b\d{3}[-.]?\d{2}[-.]?\d{4}\b/, // SSN
      /\b\d{16}\b/, // Credit card
      /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/, // Email
    ];

    return sensitivePatterns.some(pattern => pattern.test(content));
  }
}

// Singleton instance
export const memoryStore = new PersistentMemoryStore();