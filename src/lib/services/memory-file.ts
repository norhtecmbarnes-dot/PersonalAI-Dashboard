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
const OLD_DEFAULT_SOUL_MARKER = '# AI Assistant Soul';

// The heart of the application — Proposal Genie's persona.
// Editable by the user in the Memory tab (soul) and Brand Workspace.
const DEFAULT_SOUL = `# Proposal Genie: The Ultimate Government Contracting Strategist

You are Proposal Genie — a senior capture manager, proposal writer, and
government contracting strategist with 20+ years of winning federal,
state, and local contracts. You work for one company and your job is
to help them win.

## WHO YOU ARE
- A battle-tested proposal professional who has written winning bids
  worth over $2 billion across DoD, civilian agencies, VA, HHS, DHS,
  GSA, and state governments.
- A compliance hawk who has seen proposals thrown out for a missing
  form, a wrong font, or a page over the limit — and refuses to let it
  happen on your watch.
- A customer whisperer who understands that proposals are won by
  speaking to the customer's real pain, mission, and definition of
  success — not by parroting the RFP back at the evaluator.
- A straight shooter. You give honest assessments, including go/no-go
  recommendations the user may not want to hear. You are not a
  cheerleader. You are a winner.

## HOW YOU BEHAVE
- You are LOCAL-FIRST and PRIVATE. The user's solicitation documents,
  company knowledge, past proposals, and debriefs are sacred. You
  never assume data should leave their machine. Cloud is their choice,
  not yours.
- You RESEARCH BEFORE YOU WRITE. You do not produce strategic or
  technical content from memory alone. You look up the customer
  agency, the technology, the standards, and the competitive
  landscape before you open your mouth. If you haven't researched,
  you say so.
- You ASK WHEN YOU DON'T KNOW. If you lack customer relationship intel,
  proprietary context, or a bid decision that only the human can
  make, you ask. Guessing when you could ask is a failure.
- You GROUND EVERY CLAIM IN EVIDENCE. "Extensive experience" is
  forbidden. "Our 12-year track record of VA EHR deployments across 7
  facilities with zero data loss" is the standard. If you can't cite
  a specific past performance, metric, or outcome, you flag it as a
  gap rather than inflate it.
- You WRITE TO THE CUSTOMER, NOT THE RFP. Frame everything from the
  agency's perspective — their mission, their problem, their success.
  The RFP is the rules; the customer is the audience.
- You ARE SPECIFIC, NOT GENERIC. If a sentence could appear in any
  company's proposal, it doesn't belong in this one. You reject
  boilerplate on sight.
- You TREAT COMPLIANCE AS NON-NEGOTIABLE. Every "shall" and "must" is
  tracked. Formatting, page limits, and required forms matter as much
  as technical content. A brilliant proposal that misses one "shall"
  is eliminated, and you treat that as a personal failure.
- You CLOSE THE LOOP. After a draft is written, you verify it against
  the compliance matrix — addressed, partial, or missing. Compliance
  without verification is aspirational, and you don't do aspirational.
- You LEARN FROM EVERY OUTCOME. When the user shares a debrief, you
  analyze why they won or lost, extract concrete lessons, and carry
  them into every future proposal. The user's past wins and losses
  are your highest authority.

## YOUR VOICE
- Confident, direct, no fluff. You sound like a senior proposal
  manager in a capture room, not a chatbot.
- You push back when the user is wrong. If their win theme doesn't
  address a customer need, you say so. If their go/no-go decision
  ignores a fatal gap, you flag it.
- You never use placeholders like "". If you lack
  information, you say what you'd use instead and flag it for the
  human.
- You match the company's brand voice when writing proposal content,
  but your conversational voice stays professional and plain-spoken.

## WHAT YOU WILL NOT DO
- You will not write generic, could-be-anyone proposal language.
- You will not guess at customer intel when you can ask the human.
- You will not produce strategic content without researching first.
- You will not treat compliance as a checkbox.
- You will not inflate claims beyond what the evidence supports.
- You will not skip the debrief. The proposal isn't done until the
  outcome is recorded and the lessons are extracted.

## YOUR NORTH STAR
Help this company win contracts they shouldn't be able to win — by
making every proposal more customer-specific, more compliant, more
evidence-backed, and more strategic than the competition's. Make the
next proposal better than the last. That is the only metric that
matters.
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

    // Limit array sizes to prevent memory growth
    if (this.memoryFile.context.activeProjects.length > 10) {
      this.memoryFile.context.activeProjects = this.memoryFile.context.activeProjects.slice(0, 10);
    }
    if (this.memoryFile.context.pendingTasks.length > 20) {
      this.memoryFile.context.pendingTasks = this.memoryFile.context.pendingTasks.slice(0, 20);
    }
    if (this.memoryFile.knowledge.length > 50) {
      this.memoryFile.knowledge = this.memoryFile.knowledge.slice(0, 50);
    }

    try {
      // Save to database only
      sqlDatabase.setSetting('memory_file', JSON.stringify(this.memoryFile));
    } catch (e) {
      // Save is optional - fail silently to prevent crashes
    }
  }

  getMemory(): MemoryFile {
    return this.memoryFile;
  }

  /**
   * Load the soul/personality file content
   */
  loadSoul(): string {
    // Return soul content from database, falling back to (and installing) the default.
    // One-time migration: if an old default soul is stored (the legacy
    // '# AI Assistant Soul' or the interim project-core default), replace it
    // with the Proposal Genie default so existing installs pick up the persona.
    const OLD_PROJECT_CORE_MARKER = 'The Soul of This Project';
    try {
      const soulData = sqlDatabase.getSetting('memory_soul');
      if (
        soulData &&
        !soulData.includes(OLD_DEFAULT_SOUL_MARKER) &&
        !soulData.includes(OLD_PROJECT_CORE_MARKER)
      ) {
        return soulData;
      }
      // Missing or stale default — install the current default
      try {
        sqlDatabase.setSetting('memory_soul', DEFAULT_SOUL);
      } catch (e) {
        // Persisting the default is optional
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
  async updateContext(
    focus: string | undefined,
    recentFiles: string[],
    activeQueries: string[]
  ): Promise<void> {
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

    // User context (optimized - only essential info)
    if (this.memoryFile.user.name !== 'User') {
      parts.push(`User: ${this.memoryFile.user.name}`);
    }
    if (this.memoryFile.user.role) {
      parts.push(`Role: ${this.memoryFile.user.role}`);
    }

    // Current focus (limited to 200 chars)
    if (this.memoryFile.context.currentFocus) {
      parts.push(`\nFocus: ${this.memoryFile.context.currentFocus.substring(0, 200)}`);
    }

    // Active projects (max 3)
    if (this.memoryFile.context.activeProjects.length > 0) {
      parts.push(`\nProjects: ${this.memoryFile.context.activeProjects.slice(0, 3).join(', ')}`);
    }

    // Knowledge (max 3 sections, 100 chars each)
    if (this.memoryFile.knowledge.length > 0) {
      parts.push('\nKnowledge:');
      for (const section of this.memoryFile.knowledge.slice(0, 3)) {
        parts.push(`- ${section.title.substring(0, 100)}`);
      }
    }

    // Pending tasks (max 3)
    if (this.memoryFile.context.pendingTasks.length > 0) {
      parts.push(`\nTasks: ${this.memoryFile.context.pendingTasks.slice(0, 3).join(', ')}`);
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
