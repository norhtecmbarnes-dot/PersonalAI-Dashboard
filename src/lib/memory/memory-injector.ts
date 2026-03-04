import { loadScratchpad, getScratchpadSummary, estimateMemoryTokens, Scratchpad } from './scratchpad';
import { memoryStore, MemoryCategory, MemorySearchResult } from './persistent-store';

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export interface MemoryContext {
  userProfile: string;
  activeContext: string;
  relevantMemories: string[];
  tokenCount: number;
  scratchpad: Scratchpad;
}

export interface MemoryInjectionResult {
  systemPromptAddition: string;
  contextSummary: string;
  tokenCount: number;
}

export async function injectMemoryContext(
  userMessage: string,
  maxTokens: number = 1500
): Promise<MemoryInjectionResult> {
  const scratchpad = loadScratchpad();
  const parts: string[] = [];
  let tokenCount = 0;

  // 1. User profile (always included, very short)
  const userProfile = formatUserProfile(scratchpad);
  if (userProfile) {
    parts.push(userProfile);
    tokenCount += estimateTokens(userProfile);
  }

  // 2. Active context (always included)
  const activeContext = formatActiveContext(scratchpad);
  if (activeContext) {
    parts.push(activeContext);
    tokenCount += estimateTokens(activeContext);
  }

  // 3. Recent decisions (always included)
  const recentDecisions = formatRecentDecisions(scratchpad);
  if (recentDecisions) {
    parts.push(recentDecisions);
    tokenCount += estimateTokens(recentDecisions);
  }

  // 4. Search for relevant memories (if we have token budget)
  const remainingTokens = maxTokens - tokenCount;
  let relevantMemories: MemorySearchResult[] = [];

  if (remainingTokens > 100 && userMessage.length > 10) {
    try {
      relevantMemories = await memoryStore.search(userMessage, { limit: 5 });
      
      for (const result of relevantMemories) {
        const memoryText = formatMemory(result);
        const memoryTokens = estimateTokens(memoryText);
        
        if (tokenCount + memoryTokens <= maxTokens) {
          parts.push(memoryText);
          tokenCount += memoryTokens;
          
          // Increment access count
          await memoryStore.incrementAccess(result.memory.id);
        }
      }
    } catch (error) {
      console.error('[MemoryInjector] Error searching memories:', error);
    }
  }

  // Build the system prompt addition
  const systemPromptAddition = buildSystemPromptAddition(parts);
  const contextSummary = getScratchpadSummary();

  return {
    systemPromptAddition,
    contextSummary,
    tokenCount,
  };
}

function formatUserProfile(scratchpad: Scratchpad): string {
  if (!scratchpad.userProfile.name && Object.keys(scratchpad.userProfile.preferences).length === 0) {
    return '';
  }

  const parts: string[] = [];
  
  if (scratchpad.userProfile.name) {
    parts.push(`User name: ${scratchpad.userProfile.name}`);
  }
  
  if (scratchpad.userProfile.assistantName && scratchpad.userProfile.assistantName !== 'AI Assistant') {
    parts.push(`Assistant name: ${scratchpad.userProfile.assistantName}`);
  }
  
  const prefEntries = Object.entries(scratchpad.userProfile.preferences).slice(0, 5);
  if (prefEntries.length > 0) {
    parts.push(`Preferences: ${prefEntries.map(([k, v]) => `${k}=${v}`).join(', ')}`);
  }

  return parts.length > 0 ? `[User Profile]\n${parts.join('. ')}.` : '';
}

function formatActiveContext(scratchpad: Scratchpad): string {
  const parts: string[] = [];

  if (scratchpad.sessionContext.currentFocus) {
    parts.push(`Current focus: ${scratchpad.sessionContext.currentFocus}`);
  }

  if (scratchpad.sessionContext.lastTopic) {
    parts.push(`Last topic: ${scratchpad.sessionContext.lastTopic}`);
  }

  if (scratchpad.activeProjects.length > 0) {
    const projects = scratchpad.activeProjects
      .slice(0, 2)
      .map(p => `${p.name} (${p.status})`)
      .join(', ');
    parts.push(`Active projects: ${projects}`);
  }

  if (scratchpad.sessionContext.pendingTasks.length > 0) {
    parts.push(`Pending tasks: ${scratchpad.sessionContext.pendingTasks.slice(0, 3).join(', ')}`);
  }

  return parts.length > 0 ? `[Context]\n${parts.join('. ')}.` : '';
}

function formatRecentDecisions(scratchpad: Scratchpad): string {
  if (scratchpad.recentDecisions.length === 0) return '';

  const decisions = scratchpad.recentDecisions
    .slice(0, 3)
    .map(d => `${d.decision} (${d.category})`);

  return `[Recent Decisions]\n${decisions.join('; ')}.`;
}

function formatMemory(result: MemorySearchResult): string {
  const { memory, score, matchType } = result;
  const confidence = Math.round(score * 100);
  const category = memory.category.charAt(0).toUpperCase() + memory.category.slice(1);
  
  return `[${category} Memory${confidence > 70 ? ', High Confidence' : ''}] ${memory.key}: ${memory.content}`;
}

function buildSystemPromptAddition(parts: string[]): string {
  if (parts.length === 0) return '';

  return `
## Persistent Memory Context
You have access to persistent memory that survives across sessions. The following context has been loaded automatically:

${parts.join('\n\n')}

**Instructions:**
- Use this context to provide personalized, context-aware responses
- Reference stored preferences and decisions when relevant
- If the user asks about past work or decisions, search your memory first
- Never fabricate information not in your memory or context
- When learning new important information, consider saving it to memory
`;
}

export async function saveImportantFact(
  content: string,
  key: string,
  category: MemoryCategory = 'knowledge',
  importance: number = 5
): Promise<string> {
  // Check for sensitive data
  if (memoryStore.isSensitive(content)) {
    console.warn('[MemoryInjector] Refusing to save sensitive data');
    throw new Error('Cannot save sensitive information to memory');
  }

  const id = await memoryStore.saveMemory({
    category,
    key,
    content,
    importance,
    metadata: {},
  });

  return id;
}

export async function updateSessionFocus(focus: string, topic?: string): Promise<void> {
  const scratchpad = loadScratchpad();
  
  scratchpad.sessionContext.currentFocus = focus;
  if (topic) {
    scratchpad.sessionContext.lastTopic = topic;
  }
  scratchpad.sessionContext.lastSessionDate = Date.now();
  
  const { saveScratchpad } = await import('./scratchpad');
  saveScratchpad(scratchpad);
}

export async function addPendingTask(task: string): Promise<void> {
  const scratchpad = loadScratchpad();
  
  if (!scratchpad.sessionContext.pendingTasks.includes(task)) {
    scratchpad.sessionContext.pendingTasks.push(task);
    // Keep max 10 pending tasks
    if (scratchpad.sessionContext.pendingTasks.length > 10) {
      scratchpad.sessionContext.pendingTasks = scratchpad.sessionContext.pendingTasks.slice(-10);
    }
  }
  
  const { saveScratchpad } = await import('./scratchpad');
  saveScratchpad(scratchpad);
}

export async function completePendingTask(task: string): Promise<void> {
  const scratchpad = loadScratchpad();
  scratchpad.sessionContext.pendingTasks = scratchpad.sessionContext.pendingTasks.filter(t => t !== task);
  
  const { saveScratchpad } = await import('./scratchpad');
  saveScratchpad(scratchpad);
}

export async function setUserPreference(key: string, value: string): Promise<void> {
  const scratchpad = loadScratchpad();
  scratchpad.userProfile.preferences[key] = value;
  
  const { saveScratchpad } = await import('./scratchpad');
  saveScratchpad(scratchpad);
}

export async function setUserName(name: string): Promise<void> {
  const scratchpad = loadScratchpad();
  scratchpad.userProfile.name = name;
  scratchpad.userProfile.updatedAt = Date.now();
  
  const { saveScratchpad } = await import('./scratchpad');
  saveScratchpad(scratchpad);
}

export async function setAssistantName(name: string): Promise<void> {
  const scratchpad = loadScratchpad();
  scratchpad.userProfile.assistantName = name;
  scratchpad.userProfile.updatedAt = Date.now();
  
  const { saveScratchpad } = await import('./scratchpad');
  saveScratchpad(scratchpad);
}

export function getMemoryStats() {
  const scratchpad = loadScratchpad();
  return {
    userProfile: {
      name: scratchpad.userProfile.name,
      preferencesCount: Object.keys(scratchpad.userProfile.preferences).length,
    },
    activeProjects: scratchpad.activeProjects.length,
    recentDecisions: scratchpad.recentDecisions.length,
    pendingTasks: scratchpad.sessionContext.pendingTasks.length,
    totalMemories: scratchpad.stats.totalMemories,
    lastArchiveRun: scratchpad.stats.lastArchiveRun,
    version: scratchpad.stats.version,
  };
}