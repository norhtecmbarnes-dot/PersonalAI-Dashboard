import { sqlDatabase } from '@/lib/database/sqlite';
import { memoryFileService } from '@/lib/services/memory-file';
import type { Brand as BrandV2 } from '@/types/brand-workspace';

export interface UnifiedContext {
  // User Identity
  user: {
    name: string;
    role?: string;
    organization?: string;
    preferences: Record<string, string>;
  };
  
  // Active Brand Voice (only one at a time)
  brandVoice: {
    id: string;
    name: string;
    description?: string;
    tone?: string;
    style?: string;
    keyMessages: string[];
    avoidPhrases: string[];
    customInstructions?: string;
    isActive: boolean;
  } | null;
  
  // Current Context
  context: {
    currentFocus?: string;
    activeProject?: string;
    recentFiles: string[];
    activeQueries: string[];
    sessionStartTime: number;
  };
  
  // Relevant Memories
  memories: {
    id: string;
    title: string;
    content: string;
    category: string;
    importance: number;
    lastAccessed: number;
  }[];
  
  // System State
  state: {
    lastUpdated: number;
    memoryCount: number;
    documentCount: number;
    taskCount: number;
  };
}

class UnifiedContextManager {
  private static instance: UnifiedContextManager;
  private activeBrandId: string | null = null;
  private contextCache: Map<string, any> = new Map();
  private lastRefresh: number = 0;
  private readonly CACHE_TTL = 30000; // 30 seconds

  private constructor() {}

  static getInstance(): UnifiedContextManager {
    if (!UnifiedContextManager.instance) {
      UnifiedContextManager.instance = new UnifiedContextManager();
    }
    return UnifiedContextManager.instance;
  }

  /**
   * Get the complete unified context for any operation
   * This combines user identity, brand voice, memories, and current context
   */
  async getUnifiedContext(query?: string): Promise<UnifiedContext> {
    const now = Date.now();
    
    // Check cache
    if (now - this.lastRefresh < this.CACHE_TTL) {
      const cached = this.contextCache.get('unified');
      if (cached) return cached;
    }

    sqlDatabase.initialize();

    // Load user from memory file
    const memoryFile = memoryFileService.getMemory();
    
    // Load active brand
    const brand = this.activeBrandId 
      ? sqlDatabase.getBrandById(this.activeBrandId)
      : null;

    // Map brand to BrandVoice structure (Brand from sqlite has different structure than BrandV2)
    const brandVoice = brand ? {
      id: brand.id,
      name: brand.name,
      description: brand.description,
      tone: brand.persona || brand.voiceStyle,
      style: brand.voiceStyle,
      keyMessages: [],
      avoidPhrases: [],
      customInstructions: brand.systemPrompt,
      isActive: true,
    } : null;

    // Get relevant memories if query provided
    let relevantMemories: UnifiedContext['memories'] = [];
    if (query) {
      relevantMemories = await this.getRelevantMemories(query);
    } else {
      // Get recent high-importance memories
      relevantMemories = memoryFile.knowledge
        .filter(k => k.importance === 'high' || k.importance === 'critical')
        .slice(0, 5)
        .map(k => ({
          id: k.id,
          title: k.title,
          content: k.content,
          category: 'knowledge',
          importance: k.importance === 'critical' ? 10 : k.importance === 'high' ? 8 : 5,
          lastAccessed: new Date(k.lastUpdated).getTime(),
        }));
    }

    // Get current context
    const recentFiles = memoryFile.context.recentFiles || [];
    const activeQueries = memoryFile.context.activeQueries || [];
    
    // Get counts
    const stats = {
      lastUpdated: now,
      memoryCount: memoryFile.knowledge.length,
      documentCount: sqlDatabase.getNotes('document').length,
      taskCount: sqlDatabase.getTasks().length,
    };

    const context: UnifiedContext = {
      user: {
        name: memoryFile.user.name || 'User',
        role: memoryFile.user.role,
        organization: memoryFile.user.organization,
        preferences: memoryFile.user.preferences || {},
      },
      brandVoice: brand ? {
        id: brand.id,
        name: brand.name,
        description: brand.description,
        tone: brand.voiceStyle,
        style: brand.voiceStyle,
        keyMessages: [],
        avoidPhrases: [],
        customInstructions: brand.systemPrompt,
        isActive: true,
      } : null,
      context: {
        currentFocus: memoryFile.context.currentFocus,
        activeProject: this.getActiveProject(memoryFile),
        recentFiles: recentFiles.slice(0, 10),
        activeQueries: activeQueries.slice(0, 5),
        sessionStartTime: Date.now(),
      },
      memories: relevantMemories,
      state: stats,
    };

    // Cache it
    this.contextCache.set('unified', context);
    this.lastRefresh = now;

    return context;
  }

  /**
   * Set the active brand voice
   * Only one brand can be active at a time
   */
  setActiveBrand(brandId: string | null): void {
    this.activeBrandId = brandId;
    this.contextCache.clear(); // Invalidate cache
    
    // Update memory file
    if (brandId) {
      const brand = sqlDatabase.getBrandById(brandId);
      if (brand) {
        memoryFileService.updateContext(brand.name, [], []);
      }
    }
  }

  /**
   * Get the active brand ID
   */
  getActiveBrandId(): string | null {
    return this.activeBrandId;
  }

  /**
   * Get active brand details
   */
  getActiveBrand(): any | null {
    if (!this.activeBrandId) return null;
    return sqlDatabase.getBrandById(this.activeBrandId);
  }

  /**
   * Generate a system prompt that includes all context
   * This can be used for chat, document generation, etc.
   */
  async generateSystemPrompt(query?: string): Promise<string> {
    const context = await this.getUnifiedContext(query);
    
    let prompt = '';

    // User Identity
    prompt += `## User Profile\n`;
    prompt += `Name: ${context.user.name}\n`;
    if (context.user.role) prompt += `Role: ${context.user.role}\n`;
    if (context.user.organization) prompt += `Organization: ${context.user.organization}\n`;
    
    // User preferences
    const prefs = Object.entries(context.user.preferences);
    if (prefs.length > 0) {
      prompt += `\nPreferences:\n`;
      prefs.forEach(([key, value]) => {
        prompt += `- ${key}: ${value}\n`;
      });
    }
    prompt += `\n`;

    // Brand Voice (if active)
    if (context.brandVoice) {
      prompt += `## Active Brand Voice: ${context.brandVoice.name}\n`;
      if (context.brandVoice.description) {
        prompt += `Description: ${context.brandVoice.description}\n`;
      }
      if (context.brandVoice.tone) {
        prompt += `Tone: ${context.brandVoice.tone}\n`;
      }
      if (context.brandVoice.style) {
        prompt += `Style: ${context.brandVoice.style}\n`;
      }
      if (context.brandVoice.keyMessages.length > 0) {
        prompt += `Key Messages: ${context.brandVoice.keyMessages.join(', ')}\n`;
      }
      if (context.brandVoice.avoidPhrases.length > 0) {
        prompt += `Avoid These Phrases: ${context.brandVoice.avoidPhrases.join(', ')}\n`;
      }
      if (context.brandVoice.customInstructions) {
        prompt += `\nAdditional Instructions:\n${context.brandVoice.customInstructions}\n`;
      }
      prompt += `\nIMPORTANT: You are writing as ${context.brandVoice.name}. Maintain this voice consistently.\n\n`;
    }

    // Current Context
    if (context.context.currentFocus) {
      prompt += `## Current Focus\n${context.context.currentFocus}\n\n`;
    }

    // Relevant Memories
    if (context.memories.length > 0) {
      prompt += `## Relevant Knowledge\n`;
      context.memories.forEach(mem => {
        prompt += `### ${mem.title}\n${mem.content}\n\n`;
      });
    }

    // System Instructions
    prompt += `## Instructions\n`;
    prompt += `- Always maintain the active brand voice in all responses\n`;
    prompt += `- Consider the user's role and preferences\n`;
    prompt += `- Reference relevant knowledge when appropriate\n`;
    if (context.brandVoice) {
      prompt += `- You are representing ${context.brandVoice.name} - be consistent with their voice\n`;
    }

    return prompt;
  }

  /**
   * Generate a context string for document creation
   */
  async generateDocumentContext(documentType: string, topic?: string): Promise<string> {
    const context = await this.getUnifiedContext(topic);
    
    let docContext = '';

    // Document Header Context
    docContext += `Document Creator: ${context.user.name}`;
    if (context.user.role) docContext += `, ${context.user.role}`;
    if (context.user.organization) docContext += ` at ${context.user.organization}`;
    docContext += `\n\n`;

    // Brand Voice Context
    if (context.brandVoice) {
      docContext += `This document is being created for: ${context.brandVoice.name}\n`;
      docContext += `Brand Voice Profile:\n`;
      if (context.brandVoice.tone) docContext += `- Tone: ${context.brandVoice.tone}\n`;
      if (context.brandVoice.style) docContext += `- Style: ${context.brandVoice.style}\n`;
      if (context.brandVoice.keyMessages.length > 0) {
        docContext += `- Key Messages to Include: ${context.brandVoice.keyMessages.join(', ')}\n`;
      }
      if (context.brandVoice.avoidPhrases.length > 0) {
        docContext += `- Avoid These Phrases: ${context.brandVoice.avoidPhrases.join(', ')}\n`;
      }
      docContext += `\n`;
    }

    // Relevant Knowledge
    if (context.memories.length > 0) {
      docContext += `Relevant Background Knowledge:\n`;
      context.memories.forEach((mem, i) => {
        docContext += `${i + 1}. ${mem.title}: ${mem.content.substring(0, 200)}...\n`;
      });
      docContext += `\n`;
    }

    // Document Type Specific Instructions
    docContext += `Document Type: ${documentType}\n`;
    if (topic) docContext += `Topic: ${topic}\n`;
    docContext += `\n`;

    return docContext;
  }

  /**
   * Capture a memory from anywhere in the system
   */
  async captureMemory(data: {
    content: string;
    title?: string;
    category?: string;
    importance?: 'critical' | 'high' | 'medium' | 'low';
    tags?: string[];
    source?: string;
  }): Promise<{ success: boolean; id?: string; error?: string }> {
    try {
      const title = data.title || this.generateTitle(data.content);
      const category = data.category || 'general';
      const importance = data.importance || 'medium';
      const tags = [...(data.tags || []), data.source || 'system'];

      // Add to memory file
      const section = {
        id: `mem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        title,
        content: data.content,
        lastUpdated: new Date().toISOString(),
        importance,
        tags,
      };

      memoryFileService.addKnowledge(section);

      // Also add to vector store for searchability
      try {
        await fetch('/api/memory', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'persistent_save',
            data: {
              content: data.content,
              key: title,
              category,
              importance: importance === 'critical' ? 10 : importance === 'high' ? 8 : importance === 'medium' ? 5 : 3,
            }
          })
        });
      } catch (e) {
        console.log('Vector store update optional');
      }

      // Clear cache to include new memory
      this.contextCache.clear();

      return { success: true, id: section.id };
    } catch (error) {
      console.error('Error capturing memory:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Search for relevant memories
   */
  private async getRelevantMemories(query: string): Promise<UnifiedContext['memories']> {
    try {
      const response = await fetch('/api/memory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'persistent_search',
          data: { query, limit: 5 }
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.results) {
          return data.results.map((r: any) => ({
            id: r.id,
            title: r.key,
            content: r.content,
            category: r.category,
            importance: r.importance,
            lastAccessed: r.lastAccessed,
          }));
        }
      }
    } catch (e) {
      console.log('Memory search optional');
    }

    // Fallback to memory file
    const memoryFile = memoryFileService.getMemory();
    return memoryFile.knowledge
      .filter(k => 
        k.title.toLowerCase().includes(query.toLowerCase()) ||
        k.content.toLowerCase().includes(query.toLowerCase())
      )
      .slice(0, 5)
      .map(k => ({
        id: k.id,
        title: k.title,
        content: k.content,
        category: 'knowledge',
        importance: k.importance === 'critical' ? 10 : k.importance === 'high' ? 8 : 5,
        lastAccessed: new Date(k.lastUpdated).getTime(),
      }));
  }

  /**
   * Get the active project from memory file
   */
  private getActiveProject(memoryFile: any): string | undefined {
    const activeProject = memoryFile.projects.find((p: any) => p.status === 'active');
    return activeProject?.name;
  }

  /**
   * Generate a title from content
   */
  private generateTitle(content: string): string {
    // Extract first sentence or first 50 chars
    const firstSentence = content.split(/[.!?]/)[0];
    if (firstSentence && firstSentence.length > 10) {
      return firstSentence.substring(0, 50) + (firstSentence.length > 50 ? '...' : '');
    }
    return `Memory ${new Date().toLocaleString()}`;
  }

  /**
   * Refresh the context cache
   */
  refreshCache(): void {
    this.contextCache.clear();
    this.lastRefresh = 0;
  }
}

export const unifiedContext = UnifiedContextManager.getInstance();
