import fs from 'fs';
import path from 'path';

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
    recentFiles: string[];
    activeQueries: string[];
  };
}

const MEMORY_FILE_PATH = path.join(process.cwd(), 'data', 'MEMORY.md');
const SOUL_FILE_PATH = path.join(process.cwd(), 'data', 'SOUL.md');

function ensureDataDir() {
  const dataDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
    console.log('[MemoryFile] Created data directory:', dataDir);
  }
}

function getDefaultMemory(): MemoryFile {
  return {
    version: '1.0',
    lastUpdated: new Date().toISOString(),
    user: {
      name: '',
      preferences: {}
    },
    projects: [],
    brands: [],
    frequentTasks: [],
    knowledge: [],
    conversations: {
      summary: '',
      keyTopics: [],
      actionItems: [],
      lastSession: new Date().toISOString()
    },
    context: {
      recentFiles: [],
      activeQueries: []
    }
  };
}

export function memoryToMarkdown(memory: MemoryFile): string {
  const lines: string[] = [
    `# MEMORY.md`,
    ``,
    `> Last updated: ${memory.lastUpdated}`,
    `> Version: ${memory.version}`,
    ``,
    `---`,
    ``,
    `## User Profile`,
    ``,
    `**Name:** ${memory.user.name || 'Not set'}`,
    memory.user.role ? `**Role:** ${memory.user.role}` : '',
    memory.user.organization ? `**Organization:** ${memory.user.organization}` : '',
    ``,
    `### Preferences`,
    ...Object.entries(memory.user.preferences).map(([k, v]) => `- ${k}: ${v}`),
    ``,
    `---`,
    ``,
    `## Projects`,
    ``,
    ...memory.projects.map(p => [
      `### ${p.name} (${p.status})`,
      ``,
      p.description,
      ``,
      `- Last accessed: ${p.lastAccessed}`,
      `- Documents: ${p.relatedDocuments.length} linked`,
      ``
    ].join('\n')),
    ``,
    `---`,
    ``,
    `## Brands`,
    ``,
    ...memory.brands.map(b => [
      `### ${b.name}`,
      ``,
      b.industry ? `Industry: ${b.industry}` : '',
      b.voiceProfile ? `Voice: ${b.voiceProfile}` : '',
      `- Key documents: ${b.keyDocuments.length}`,
      ``
    ].join('\n')),
    ``,
    `---`,
    ``,
    `## Frequent Tasks`,
    ``,
    ...memory.frequentTasks.map(t => 
      `- **${t.description}** (${t.frequency}) - Last: ${t.lastRun}`
    ),
    ``,
    `---`,
    ``,
    `## Knowledge Base`,
    ``,
    ...memory.knowledge.map(k => [
      `### ${k.title} [${k.importance}]`,
      ``,
      k.content,
      ``,
      `Tags: ${k.tags.join(', ')}`,
      `Updated: ${k.lastUpdated}`,
      ``
    ].join('\n')),
    ``,
    `---`,
    ``,
    `## Conversation Context`,
    ``,
    memory.conversations.summary || '_No conversation summary yet._',
    ``,
    `### Key Topics`,
    ...memory.conversations.keyTopics.map(t => `- ${t}`),
    ``,
    `### Action Items`,
    ...memory.conversations.actionItems.map(a => `- [ ] ${a}`),
    ``,
    `Last session: ${memory.conversations.lastSession}`,
    ``,
    `---`,
    ``,
    `## Current Context`,
    ``,
    memory.context.currentFocus ? `**Focus:** ${memory.context.currentFocus}` : '',
    ``,
    `### Recent Files`,
    ...memory.context.recentFiles.slice(-10).map(f => `- ${f}`),
    ``,
    `### Active Queries`,
    ...memory.context.activeQueries.slice(-5).map(q => `- ${q}`),
    ``,
    `---`,
    ``,
    `_This file is automatically maintained by AI Dashboard's memory system._`
  ];

  return lines.filter(l => l !== '').join('\n');
}

export function parseMemoryFromMarkdown(content: string): MemoryFile {
  const memory = getDefaultMemory();
  
  const sections = content.split('---');
  
  for (const section of sections) {
    const lines = section.trim().split('\n');
    const header = lines[0]?.match(/^##\s+(.+)$/);
    
    if (!header) continue;
    
    const sectionName = header[1].toLowerCase();
    const body = lines.slice(1).join('\n');
    
    switch (sectionName) {
      case 'user profile':
        const nameMatch = body.match(/\*\*Name:\*\*\s*(.+)/);
        if (nameMatch) memory.user.name = nameMatch[1].trim();
        break;
        
      case 'projects':
        const projectBlocks = body.split(/###\s+/).filter(Boolean);
        for (const block of projectBlocks) {
          const nameMatch = block.match(/^(.+?)\s*\((\w+)\)/);
          if (nameMatch) {
            memory.projects.push({
              id: nameMatch[1].toLowerCase().replace(/\s+/g, '-'),
              name: nameMatch[1].trim(),
              description: block.split('\n').find(l => !l.startsWith('-') && !l.startsWith('#') && l.trim()) || '',
              status: nameMatch[2] as MemoryFile['projects'][0]['status'],
              lastAccessed: block.match(/Last accessed:\s*(.+)/)?.[1] || new Date().toISOString(),
              relatedDocuments: []
            });
          }
        }
        break;
        
      case 'knowledge base':
        const knowledgeBlocks = body.split(/###\s+/).filter(Boolean);
        for (const block of knowledgeBlocks) {
          const titleMatch = block.match(/^(.+?)\s*\[(\w+)\]/);
          if (titleMatch) {
            memory.knowledge.push({
              id: titleMatch[1].toLowerCase().replace(/\s+/g, '-'),
              title: titleMatch[1].trim(),
              importance: titleMatch[2] as MemorySection['importance'],
              content: block.split('\n').slice(2).join('\n').trim(),
              lastUpdated: block.match(/Updated:\s*(.+)/)?.[1] || new Date().toISOString(),
              tags: (block.match(/Tags:\s*(.+)/)?.[1] || '').split(',').map(t => t.trim()).filter(Boolean)
            });
          }
        }
        break;
        
      case 'conversation context':
        memory.conversations.summary = body.split('###')[0].trim();
        memory.conversations.lastSession = body.match(/Last session:\s*(.+)/)?.[1] || new Date().toISOString();
        break;
    }
  }
  
  return memory;
}

export class MemoryFileService {
  private memory: MemoryFile | null = null;
  private soul: string | null = null;

  load(): MemoryFile {
    if (this.memory) return this.memory;
    
    ensureDataDir();
    
    if (fs.existsSync(MEMORY_FILE_PATH)) {
      try {
        const content = fs.readFileSync(MEMORY_FILE_PATH, 'utf-8');
        this.memory = parseMemoryFromMarkdown(content);
        return this.memory;
      } catch (e) {
        console.error('Failed to parse MEMORY.md:', e);
      }
    }
    
    this.memory = getDefaultMemory();
    this.save();
    return this.memory;
  }

  loadSoul(): string {
    if (this.soul) return this.soul;
    
    ensureDataDir();
    
    if (fs.existsSync(SOUL_FILE_PATH)) {
      this.soul = fs.readFileSync(SOUL_FILE_PATH, 'utf-8');
      return this.soul;
    }
    
    this.soul = this.getDefaultSoul();
    fs.writeFileSync(SOUL_FILE_PATH, this.soul);
    return this.soul;
  }

  private getDefaultSoul(): string {
    return `# SOUL.md

> This file defines the AI assistant's personality and behavior.

---

## Core Identity

I am an AI assistant designed to help with research, productivity, and knowledge management. I am helpful, accurate, and respectful.

---

## Behavioral Guidelines

### Communication Style
- Be concise but thorough
- Use clear, professional language
- Adapt to the user's communication preferences
- Explain complex topics in accessible ways

### Knowledge Handling
- Acknowledge uncertainty when appropriate
- Distinguish between facts and opinions
- Cite sources when available
- Update understanding based on new information

### Task Approach
- Break complex tasks into steps
- Ask clarifying questions when needed
- Provide progress updates on long tasks
- Offer alternatives when requests cannot be fulfilled

---

## Capabilities

I can help with:
- Document analysis and summarization
- Research and information synthesis
- Code review and development assistance
- Calendar and task management
- Brand voice and content generation
- Government contract opportunities (SAM.gov)

---

## Limitations

I cannot:
- Access external accounts or services without explicit setup
- Execute code directly on your system
- Make purchases or financial transactions
- Access files outside the workspace

---

## Personality Traits

- Curious: I enjoy learning new things
- Patient: I handle complex requests without frustration
- Thorough: I check my work for accuracy
- Adaptable: I adjust to different communication styles

---

_This file can be customized to change the assistant's personality._
`;
  }

  save(): void {
    if (!this.memory) return;
    
    ensureDataDir();
    this.memory.lastUpdated = new Date().toISOString();
    
    const markdown = memoryToMarkdown(this.memory);
    fs.writeFileSync(MEMORY_FILE_PATH, markdown, 'utf-8');
  }

  updateUser(updates: Partial<MemoryFile['user']>): void {
    this.memory = this.load();
    this.memory.user = { ...this.memory.user, ...updates };
    this.save();
  }

  addProject(project: MemoryFile['projects'][0]): void {
    this.memory = this.load();
    const existing = this.memory.projects.findIndex(p => p.id === project.id);
    if (existing >= 0) {
      this.memory.projects[existing] = project;
    } else {
      this.memory.projects.push(project);
    }
    this.save();
  }

  addBrand(brand: MemoryFile['brands'][0]): void {
    this.memory = this.load();
    const existing = this.memory.brands.findIndex(b => b.id === brand.id);
    if (existing >= 0) {
      this.memory.brands[existing] = brand;
    } else {
      this.memory.brands.push(brand);
    }
    this.save();
  }

  addKnowledge(section: MemorySection): void {
    this.memory = this.load();
    const existing = this.memory.knowledge.findIndex(k => k.id === section.id);
    if (existing >= 0) {
      this.memory.knowledge[existing] = section;
    } else {
      this.memory.knowledge.push(section);
    }
    this.save();
  }

  updateConversation(summary: string, topics: string[], actions: string[]): void {
    this.memory = this.load();
    this.memory.conversations = {
      summary,
      keyTopics: topics,
      actionItems: actions,
      lastSession: new Date().toISOString()
    };
    this.save();
  }

  updateContext(focus: string | undefined, recentFiles: string[], activeQueries: string[]): void {
    this.memory = this.load();
    this.memory.context = {
      currentFocus: focus,
      recentFiles: recentFiles.slice(-10),
      activeQueries: activeQueries.slice(-5)
    };
    this.save();
  }

  getSystemPrompt(): string {
    this.load();
    this.loadSoul();
    
    return `
${this.soul}

---

## Current Memory Context

### User Profile
- Name: ${this.memory!.user.name || 'User'}
- Preferences: ${Object.entries(this.memory!.user.preferences).map(([k, v]) => `${k}: ${v}`).join(', ') || 'None set'}

### Active Projects
${this.memory!.projects.filter(p => p.status === 'active').map(p => `- ${p.name}: ${p.description}`).join('\n') || 'No active projects'}

### Recent Knowledge
${this.memory!.knowledge.slice(-3).map(k => `- ${k.title}: ${k.content.slice(0, 100)}...`).join('\n') || 'No knowledge entries'}

### Current Focus
${this.memory!.context.currentFocus || 'General assistance'}

### Recent Actions
${this.memory!.context.activeQueries.slice(-3).map(q => `- ${q}`).join('\n') || 'None'}

Use this context to provide personalized assistance.
`.trim();
  }

  getMemory(): MemoryFile {
    return this.load();
  }

  reset(): void {
    this.memory = getDefaultMemory();
    this.save();
  }
}

export const memoryFileService = new MemoryFileService();