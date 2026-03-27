import { SQLDatabase } from '../database/sqlite';

/**
 * Universal embedding service that generates high-quality semantic embeddings
 * Falls back to hash-based embeddings if Ollama embedding model is unavailable
 */
export class EmbeddingService {
  private static instance: EmbeddingService;
  private useOllama: boolean = true;
  private embeddingModel: string = 'nomic-embed-text';
  private ollamaUrl: string = 'http://localhost:11434';

  private constructor() {}

  static getInstance(): EmbeddingService {
    if (!EmbeddingService.instance) {
      EmbeddingService.instance = new EmbeddingService();
    }
    return EmbeddingService.instance;
  }

  /**
   * Generate a semantic embedding for text
   * First tries Ollama embedding model, falls back to hash-based
   */
  async generateEmbedding(text: string): Promise<number[]> {
    if (this.useOllama) {
      try {
        const embedding = await this.generateOllamaEmbedding(text);
        if (embedding && embedding.length > 0) {
          return embedding;
        }
      } catch (error) {
        console.warn('[EmbeddingService] Ollama embedding failed, using fallback:', error);
        this.useOllama = false; // Disable for future calls
      }
    }

    // Fallback to hash-based deterministic embedding
    return this.generateHashEmbedding(text);
  }

  /**
   * Generate embedding using Ollama's embedding API
   */
  private async generateOllamaEmbedding(text: string): Promise<number[] | null> {
    const response = await fetch(`${this.ollamaUrl}/api/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.embeddingModel,
        prompt: text,
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama embedding API returned ${response.status}`);
    }

    const data = await response.json();

    if (!data.embedding || !Array.isArray(data.embedding)) {
      throw new Error('Invalid embedding response from Ollama');
    }

    return data.embedding;
  }

  /**
   * Fallback hash-based embedding generation
   * Creates deterministic pseudo-random embeddings
   * Note: These don't capture semantic meaning but allow similarity matching
   */
  private generateHashEmbedding(text: string): number[] {
    const hash = this.simpleHash(text);
    const embedding: number[] = [];
    const dimension = 768; // Standard embedding dimension

    // Generate pseudo-random values based on hash
    for (let i = 0; i < dimension; i++) {
      const x = Math.sin(hash * (i + 1) * 12.9898) * 43758.5453;
      embedding.push((x - Math.floor(x)) * 2 - 1);
    }

    // Normalize to unit vector
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    return embedding.map(val => val / magnitude);
  }

  /**
   * Simple hash function for consistent embeddings
   */
  private simpleHash(text: string): number {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash) || 1; // Ensure non-zero
  }

  /**
   * Calculate cosine similarity between two embeddings
   */
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

    if (normA === 0 || normB === 0) return 0;

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Set configuration for embedding service
   */
  configure(options: { useOllama?: boolean; embeddingModel?: string; ollamaUrl?: string }): void {
    if (options.useOllama !== undefined) this.useOllama = options.useOllama;
    if (options.embeddingModel) this.embeddingModel = options.embeddingModel;
    if (options.ollamaUrl) this.ollamaUrl = options.ollamaUrl;
  }

  /**
   * Get current configuration
   */
  getConfig() {
    return {
      useOllama: this.useOllama,
      embeddingModel: this.embeddingModel,
      ollamaUrl: this.ollamaUrl,
    };
  }

  /**
   * Check if Ollama embedding model is available
   */
  async checkAvailability(): Promise<{ available: boolean; message: string }> {
    try {
      const response = await fetch(`${this.ollamaUrl}/api/tags`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) {
        return {
          available: false,
          message: 'Ollama server not responding',
        };
      }

      const data = await response.json();
      const models = data.models || [];
      const hasEmbeddingModel = models.some(
        (m: any) => m.name.includes(this.embeddingModel) || m.name.includes('embed')
      );

      if (!hasEmbeddingModel) {
        return {
          available: false,
          message: `Embedding model '${this.embeddingModel}' not found. Run: ollama pull ${this.embeddingModel}`,
        };
      }

      return {
        available: true,
        message: `Embedding model '${this.embeddingModel}' ready`,
      };
    } catch (error) {
      return {
        available: false,
        message: `Cannot connect to Ollama: ${error}`,
      };
    }
  }
}

// Export singleton instance
export const embeddingService = EmbeddingService.getInstance();

// Convenience function for quick embedding generation
export async function generateEmbedding(text: string): Promise<number[]> {
  return embeddingService.generateEmbedding(text);
}

// Convenience function for cosine similarity
export function cosineSimilarity(a: number[], b: number[]): number {
  return embeddingService.cosineSimilarity(a, b);
}
