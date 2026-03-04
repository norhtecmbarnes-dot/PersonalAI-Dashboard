/**
 * Memory File Service - Safe version for all runtimes
 * Uses SQLite database instead of file system
 * No Node.js imports at top level
 */

import { sqlDatabase } from '@/lib/database/sqlite';

export interface MemorySection {
  id: string;
  title: string;
  content: string;
  lastUpdated: string;
  importance: 'critical' | 'high' | 'medium' | 'low';
  tags: string[];
}

export interface MemoryFile {
  version: string;
  lastUpdated: string;
  user: {
    name: string;
    role?: string;
    organization?: string;
    preferences: Record<string, string>;
  };
  projects: Array<{
    id: string;
    name: string;
    description: string;
    status: 'active' | 'paused' | 'completed' | 'archived';
    lastAccessed: string;
    relatedDocuments: string[];
  }>;
  brands: Array<{
    id: string;
    name: string;
    industry?: string;
    voiceProfile?: string;
    keyDocuments: string[];
  }>;
  frequentTasks: Array<{
    description: string;
    frequency: string;
    lastRun: string;
  }>;
  knowledge: MemorySection[];
  conversations: {
    summary: string;
    keyTopics: string[];
    actionItems: string[];
    lastSession: string;
  };
  context: {
    currentFocus?: string;
    recentDocuments: string[];
    recentFiles: string[];
    activeProjects: string[];
    activeQueries: string[];
    pendingTasks: string[];
  };
}

// Default memory file structure
const DEFAULT_MEMORY: MemoryFile = {
  version: '1.0',
  lastUpdated: new Date().toISOString(),
  user: {
    name: 'User',
    preferences: {},
  },
  projects: [],
  brands: [],
  frequentTasks: [],
  knowledge: [],
  conversations: {
    summary: '',
    keyTopics: [],
    actionItems: [],
    lastSession: new Date().toISOString(),
  },
  context: {
    recentDocuments: [],
    recentFiles: [],
    activeProjects: [],
    activeQueries: [],
    pendingTasks: [],
  },
};

// Default soul content
const DEFAULT_SOUL = `# AI Assistant Soul

## Core Identity

I am an AI Research Assistant designed to help users build and customize their own AI systems.

## Values

- Helpfulness: I prioritize being useful above all else
- Accuracy: I verify information when possible
- Clarity: I communicate complex ideas simply
- Adaptability: I adjust to the user's needs and preferences

## Personality Traits

- Curious: I enjoy learning new things
- Patient: I handle complex requests without frustration
- Thorough: I check my work for accuracy
- Adaptable: I adjust to different communication styles

---

_This file can be customized to change the assistant's personality._
`;

class MemoryFileServiceSafe {
  private memoryFile: MemoryFile = DEFAULT_MEMORY;
  private loaded = false;

  async loadMemory(): Promise<MemoryFile> {
    if (this.loaded) {
      return this.memoryFile;
    }

    try {
      // Load from database only - no file system
      const memoryData = sqlDatabase.getSetting('memory_file');
      if (memoryData) {
        this.memoryFile = JSON.parse(memoryData);
        this.loaded = true;
      }
    } catch (e) {
      console.log('[MemoryFile] Could not load from database, using defaults');
    }

    return this.memoryFile;
  }

  async saveMemory(memory: Partial<MemoryFile>): Promise<void> {
    this.memoryFile = { ...this.memoryFile, ...memory };
    this.memoryFile.lastUpdated = new Date().toISOString();

    try {
      // Save to database only
      sqlDatabase.setSetting('memory_file', JSON.stringify(this.memoryFile));
    } catch (e) {
      console.error('[MemoryFile] Could not save to database:', e);
    }
  }

  getMemory(): MemoryFile {
    return this.memoryFile;
  }

  /**
   * Load the soul/personality file content
   */
  loadSoul(): string {
    // Return default soul content (stored in database)
    try {
      const soulData = sqlDatabase.getSetting('memory_soul');
      if (soulData) {
        return soulData;
      }
    } catch (e) {
      console.log('[MemoryFile] Could not load soul from database');
    }
    return DEFAULT_SOUL;
  }

  /**
   * Update user information
   */
  async updateUser(updates: Partial<MemoryFile['user']>): Promise<void> {
    await this.loadMemory();
    this.memoryFile.user = { ...this.memoryFile.user, ...updates };
    await this.saveMemory({});
  }

  /**
   * Add or update a project
   */
  async addProject(project: MemoryFile['projects'][0]): Promise<void> {
    await this.loadMemory();
    const existingIndex = this.memoryFile.projects.findIndex(p => p.id === project.id);
    if (existingIndex >= 0) {
      this.memoryFile.projects[existingIndex] = project;
    } else {
      this.memoryFile.projects.push(project);
    }
    await this.saveMemory({});
  }

  /**
   * Add or update a brand
   */
  async addBrand(brand: MemoryFile['brands'][0]): Promise<void> {
    await this.loadMemory();
    const existingIndex = this.memoryFile.brands.findIndex(b => b.id === brand.id);
    if (existingIndex >= 0) {
      this.memoryFile.brands[existingIndex] = brand;
    } else {
      this.memoryFile.brands.push(brand);
    }
    await this.saveMemory({});
  }

  /**
   * Add a knowledge section
   */
  async addKnowledge(section: MemorySection): Promise<void> {
    await this.loadMemory();
    const existingIndex = this.memoryFile.knowledge.findIndex(k => k.id === section.id);
    if (existingIndex >= 0) {
      this.memoryFile.knowledge[existingIndex] = section;
    } else {
      this.memoryFile.knowledge.push(section);
    }
    await this.saveMemory({});
  }

  /**
   * Update conversation summary
   */
  async updateConversation(summary: string, topics: string[], actions: string[]): Promise<void> {
    await this.loadMemory();
    this.memoryFile.conversations = {
      summary,
      keyTopics: topics,
      actionItems: actions,
      lastSession: new Date().toISOString(),
    };
    await this.saveMemory({});
  }

  /**
   * Update context information
   */
  async updateContext(focus: string | undefined, recentFiles: string[], activeQueries: string[]): Promise<void> {
    await this.loadMemory();
    this.memoryFile.context.currentFocus = focus;
    this.memoryFile.context.recentFiles = recentFiles.slice(-10);
    this.memoryFile.context.activeQueries = activeQueries.slice(-5);
    await this.saveMemory({});
  }

  /**
   * Reset memory to defaults
   */
  async reset(): Promise<void> {
    this.memoryFile = { ...DEFAULT_MEMORY };
    this.loaded = true;
    await this.saveMemory({});
  }

  /**
   * Generate system prompt from memory context
   * Used for providing context to AI assistants
   */
  getSystemPrompt(): string {
    const parts: string[] = [];

    // User context
    if (this.memoryFile.user.name !== 'User') {
      parts.push(`User: ${this.memoryFile.user.name}`);
    }
    if (this.memoryFile.user.role) {
      parts.push(`Role: ${this.memoryFile.user.role}`);
    }
    if (this.memoryFile.user.organization) {
      parts.push(`Organization: ${this.memoryFile.user.organization}`);
    }

    // Current focus
    if (this.memoryFile.context.currentFocus) {
      parts.push(`\nCurrent Focus: ${this.memoryFile.context.currentFocus}`);
    }

    // Active projects
    if (this.memoryFile.context.activeProjects.length > 0) {
      parts.push(`\nActive Projects: ${this.memoryFile.context.activeProjects.join(', ')}`);
    }

    // Knowledge
    if (this.memoryFile.knowledge.length > 0) {
      parts.push('\nRelevant Knowledge:');
      for (const section of this.memoryFile.knowledge.slice(0, 5)) {
        parts.push(`- ${section.title}`);
      }
    }

    // Pending tasks
    if (this.memoryFile.context.pendingTasks.length > 0) {
      parts.push(`\nPending Tasks: ${this.memoryFile.context.pendingTasks.slice(0, 5).join(', ')}`);
    }

    return parts.join('\n');
  }
}

export const memoryFileService = new MemoryFileServiceSafe();

// Helper functions
export function memoryToMarkdown(memory: MemoryFile): string {
  let markdown = `# Memory File\n\n`;
  markdown += `**Last Updated:** ${memory.lastUpdated}\n\n`;

  // User info
  markdown += `## User\n\n`;
  markdown += `**Name:** ${memory.user.name}\n`;
  if (memory.user.role) markdown += `**Role:** ${memory.user.role}\n`;
  if (memory.user.organization) markdown += `**Organization:** ${memory.user.organization}\n`;
  markdown += `\n`;

  // Knowledge sections
  markdown += `## Knowledge\n\n`;
  for (const section of memory.knowledge) {
    markdown += `### ${section.title}\n\n`;
    markdown += `${section.content}\n\n`;
    if (section.tags.length > 0) {
      markdown += `*Tags: ${section.tags.join(', ')}*\n\n`;
    }
  }

  return markdown;
}

export function parseMemoryFromMarkdown(markdown: string): Partial<MemoryFile> {
  const memory: Partial<MemoryFile> = {
    knowledge: [],
  };

  const lines = markdown.split('\n');
  let currentSection: MemorySection | null = null;
  let inKnowledge = false;

  for (const line of lines) {
    if (line.startsWith('## Knowledge')) {
      inKnowledge = true;
      continue;
    }

    if (inKnowledge) {
      if (line.startsWith('### ')) {
        if (currentSection) {
          memory.knowledge!.push(currentSection);
        }
        currentSection = {
          id: crypto.randomUUID(),
          title: line.replace('### ', ''),
          content: '',
          lastUpdated: new Date().toISOString(),
          importance: 'medium',
          tags: [],
        };
      } else if (currentSection && line.startsWith('*Tags:')) {
        const tagsMatch = line.match(/\*Tags: (.+)\*/);
        if (tagsMatch) {
          currentSection.tags = tagsMatch[1].split(', ').map(t => t.trim());
        }
      } else if (currentSection) {
        currentSection.content += line + '\n';
      }
    }
  }

  if (currentSection) {
    memory.knowledge!.push(currentSection);
  }

  return memory;
}

// Re-export types
export type { MemoryFile as MemoryFileType };
