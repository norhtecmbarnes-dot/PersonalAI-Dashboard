import * as fs from 'fs';
import * as path from 'path';

export interface Scratchpad {
  userProfile: {
    name: string;
    assistantName: string;
    preferences: Record<string, string>;
    createdAt: number;
    updatedAt: number;
  };
  activeProjects: Array<{
    id: string;
    name: string;
    description: string;
    status: string;
    lastWorkedOn: number;
  }>;
  recentDecisions: Array<{
    timestamp: number;
    decision: string;
    context: string;
    category: string;
  }>;
  sessionContext: {
    lastTopic: string;
    currentFocus: string;
    pendingTasks: string[];
    lastSessionDate: number;
  };
  stats: {
    totalMemories: number;
    lastArchiveRun: number;
    tokenBudget: number;
    version: number;
    updatedAt: number;
  };
}

const MEMORY_DIR = path.join(process.cwd(), 'data', 'memory');
const SCRATCHPAD_PATH = path.join(MEMORY_DIR, 'scratchpad.json');

const DEFAULT_SCRATCHPAD: Scratchpad = {
  userProfile: {
    name: '',
    assistantName: 'AI Assistant',
    preferences: {},
    createdAt: Date.now(),
    updatedAt: Date.now()
  },
  activeProjects: [],
  recentDecisions: [],
  sessionContext: {
    lastTopic: '',
    currentFocus: '',
    pendingTasks: [],
    lastSessionDate: Date.now()
  },
  stats: {
    totalMemories: 0,
    lastArchiveRun: Date.now(),
    tokenBudget: 1000,
    version: 1,
    updatedAt: Date.now()
  }
};

function ensureMemoryDir(): void {
  if (!fs.existsSync(MEMORY_DIR)) {
    fs.mkdirSync(MEMORY_DIR, { recursive: true });
  }
}

export function loadScratchpad(): Scratchpad {
  try {
    ensureMemoryDir();
    if (fs.existsSync(SCRATCHPAD_PATH)) {
      const data = fs.readFileSync(SCRATCHPAD_PATH, 'utf-8');
      const parsed = JSON.parse(data);
      return { ...DEFAULT_SCRATCHPAD, ...parsed };
    }
  } catch (error) {
    console.error('Error loading scratchpad:', error);
  }
  return { ...DEFAULT_SCRATCHPAD };
}

export function saveScratchpad(data: Scratchpad): void {
  try {
    ensureMemoryDir();
    data.stats.updatedAt = Date.now();
    fs.writeFileSync(SCRATCHPAD_PATH, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error saving scratchpad:', error);
  }
}

export function updateScratchpad(updates: Partial<Scratchpad>): Scratchpad {
  const current = loadScratchpad();
  const updated = { ...current, ...updates, stats: { ...current.stats, ...updates.stats } };
  saveScratchpad(updated);
  return updated;
}

export function updateUserProfile(updates: Partial<Scratchpad['userProfile']>): Scratchpad {
  const current = loadScratchpad();
  const updated = {
    ...current,
    userProfile: { ...current.userProfile, ...updates, updatedAt: Date.now() }
  };
  saveScratchpad(updated);
  return updated;
}

export function addActiveProject(project: Scratchpad['activeProjects'][0]): Scratchpad {
  const current = loadScratchpad();
  const existing = current.activeProjects.find(p => p.id === project.id);
  
  if (existing) {
    existing.status = project.status;
    existing.lastWorkedOn = Date.now();
  } else {
    current.activeProjects.unshift({ ...project, lastWorkedOn: Date.now() });
    if (current.activeProjects.length > 5) {
      current.activeProjects = current.activeProjects.slice(0, 5);
    }
  }
  
  saveScratchpad(current);
  return current;
}

export function addRecentDecision(decision: Omit<Scratchpad['recentDecisions'][0], 'timestamp'>): Scratchpad {
  const current = loadScratchpad();
  
  current.recentDecisions.unshift({
    ...decision,
    timestamp: Date.now()
  });
  
  if (current.recentDecisions.length > 10) {
    current.recentDecisions = current.recentDecisions.slice(0, 10);
  }
  
  saveScratchpad(current);
  return current;
}

export function updateSessionContext(updates: Partial<Scratchpad['sessionContext']>): Scratchpad {
  const current = loadScratchpad();
  current.sessionContext = {
    ...current.sessionContext,
    ...updates,
    lastSessionDate: Date.now()
  };
  saveScratchpad(current);
  return current;
}

export function clearScratchpad(): void {
  saveScratchpad({ ...DEFAULT_SCRATCHPAD });
}

export function getScratchpadSummary(): string {
  const scratchpad = loadScratchpad();
  const parts: string[] = [];
  
  if (scratchpad.userProfile.name) {
    parts.push(`User: ${scratchpad.userProfile.name}`);
  }
  
  if (scratchpad.activeProjects.length > 0) {
    const projects = scratchpad.activeProjects
      .slice(0, 2)
      .map(p => `${p.name} (${p.status})`)
      .join(', ');
    parts.push(`Active projects: ${projects}`);
  }
  
  if (scratchpad.recentDecisions.length > 0) {
    const decisions = scratchpad.recentDecisions
      .slice(0, 3)
      .map(d => d.decision)
      .join('; ');
    parts.push(`Recent decisions: ${decisions}`);
  }
  
  if (scratchpad.sessionContext.currentFocus) {
    parts.push(`Current focus: ${scratchpad.sessionContext.currentFocus}`);
  }
  
  return parts.join('. ');
}

export function estimateMemoryTokens(): number {
  const summary = getScratchpadSummary();
  return Math.ceil(summary.length / 4);
}