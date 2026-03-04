import * as fs from 'fs';
import * as path from 'path';
import { memoryStore, MemoryCategory } from './persistent-store';
import { loadScratchpad, saveScratchpad, addRecentDecision } from './scratchpad';

const ARCHIVE_DIR = path.join(process.cwd(), 'data', 'memory', 'archive');

interface MemoryCaptureResult {
  captured: number;
  archived: number;
  errors: string[];
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: number;
}

interface CaptureAnalysis {
  facts: Array<{
    content: string;
    key: string;
    category: MemoryCategory;
    importance: number;
  }>;
  decisions: Array<{
    decision: string;
    context: string;
    category: string;
  }>;
  preferences: Array<{
    key: string;
    value: string;
  }>;
  projects: Array<{
    id: string;
    name: string;
    status: string;
  }>;
}

const FACT_PATTERNS = [
  /(?:remember|note|keep in mind|important|key point|decision): (.+)/gi,
  /(?:the project|we are|I'm working on|current focus) (?:is|will be) (.+)/gi,
  /(?:my preference|I prefer|I like|settings) (?:is|are) (.+)/gi,
  /(?:brand voice|tone|style) (?:is|should be) (.+)/gi,
];

const SENSITIVE_PATTERNS = [
  /api[_-]?key/i,
  /secret/i,
  /password/i,
  /token/i,
  /private[_-]?key/i,
  /credential/i,
  /auth/i,
];

export async function analyzeAndCapture(
  messages: ChatMessage[],
  options?: { 
    force?: boolean; 
    minImportance?: number;
    maxToCapture?: number;
  }
): Promise<MemoryCaptureResult> {
  const result: MemoryCaptureResult = {
    captured: 0,
    archived: 0,
    errors: [],
  };

  if (!messages || messages.length < 2) {
    return result;
  }

  try {
    await memoryStore.initialize();

    // Analyze messages for important content
    const analysis = await analyzeMessages(messages);

    // Capture new facts
    const maxCapture = options?.maxToCapture || 5;
    const minImportance = options?.minImportance || 5;

    for (const fact of analysis.facts.slice(0, maxCapture)) {
      if (fact.importance >= minImportance && !containsSensitive(fact.content)) {
        try {
          await memoryStore.saveMemory({
            category: fact.category,
            key: fact.key,
            content: fact.content,
            importance: fact.importance,
            metadata: {},
          });
          result.captured++;
        } catch (e) {
          result.errors.push(`Failed to save fact: ${fact.key}`);
        }
      }
    }

    // Update scratchpad with recent decisions
    for (const decision of analysis.decisions.slice(0, 3)) {
      try {
        addRecentDecision(decision);
      } catch (e) {
        result.errors.push('Failed to save decision');
      }
    }

    // Update preferences
    const scratchpad = loadScratchpad();
    for (const pref of analysis.preferences) {
      if (!containsSensitive(pref.value)) {
        scratchpad.userProfile.preferences[pref.key] = pref.value;
      }
    }

    // Update active projects
    for (const project of analysis.projects) {
      const existing = scratchpad.activeProjects.find(p => p.id === project.id);
      if (existing) {
        existing.status = project.status;
        existing.lastWorkedOn = Date.now();
      } else {
        scratchpad.activeProjects.unshift({
          ...project,
          description: '',
          lastWorkedOn: Date.now(),
        });
      }
    }

    // Keep max 5 active projects
    if (scratchpad.activeProjects.length > 5) {
      scratchpad.activeProjects = scratchpad.activeProjects.slice(0, 5);
    }

    saveScratchpad(scratchpad);

  } catch (error) {
    result.errors.push(error instanceof Error ? error.message : 'Unknown error');
  }

  return result;
}

async function analyzeMessages(messages: ChatMessage[]): Promise<CaptureAnalysis> {
  const analysis: CaptureAnalysis = {
    facts: [],
    decisions: [],
    preferences: [],
    projects: [],
  };

  // Combine messages for analysis
  const recentMessages = messages.slice(-10);
  const combinedText = recentMessages
    .map(m => `${m.role}: ${m.content}`)
    .join('\n');

  // Extract facts using patterns
  for (const pattern of FACT_PATTERNS) {
    const matches = combinedText.matchAll(pattern);
    for (const match of matches) {
      if (match[1] && match[1].length > 10 && match[1].length < 500) {
        analysis.facts.push({
          content: match[1].trim(),
          key: extractKey(match[1]),
          category: categorizeContent(match[1]),
          importance: estimateImportance(match[1]),
        });
      }
    }
  }

  // Look for decision statements
  const decisionPatterns = [
    /(?:we decided|let's go with|the decision is|agreed on): (.+)/gi,
    /(?:I'll|we'll|you'll) (?:use|implement|choose|select|go with) (.+)/gi,
  ];

  for (const pattern of decisionPatterns) {
    const matches = combinedText.matchAll(pattern);
    for (const match of matches) {
      if (match[1] && match[1].length > 5) {
        analysis.decisions.push({
          decision: match[1].trim(),
          context: combinedText.substring(0, 200),
          category: 'decision',
        });
      }
    }
  }

  // Look for preference signals
  const prefPatterns = [
    /(?:I prefer|my preference|I like|I want) (.+?)(?:\.|$)/gi,
    /(?:setting|configuring|configure) (.+?) (?:to|as) (.+?)(?:\.|$)/gi,
  ];

  for (const pattern of prefPatterns) {
    const matches = combinedText.matchAll(pattern);
    for (const match of matches) {
      const key = extractKey(match[1] || match[0]);
      const value = match[2] || extractValue(match[1]) || 'true';
      analysis.preferences.push({ key, value });
    }
  }

  // Look for project mentions
  const projectPatterns = [
    /(?:project|app|system) ['"]?([a-zA-Z0-9_-]+)['"]?/gi,
    /(?:working on|building|developing) ['"]?([a-zA-Z0-9_-]+)['"]?/gi,
  ];

  for (const pattern of projectPatterns) {
    const matches = combinedText.matchAll(pattern);
    for (const match of matches) {
      analysis.projects.push({
        id: match[1].toLowerCase(),
        name: match[1],
        status: 'active',
      });
    }
  }

  return analysis;
}

function extractKey(text: string): string {
  // Extract first meaningful words as key
  const words = text.toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 2)
    .slice(0, 3);
  
  return words.join('_') || 'memory_' + Date.now();
}

function extractValue(text: string): string {
  const cleaned = text.trim();
  if (cleaned.length < 100) return cleaned;
  return cleaned.substring(0, 100);
}

function categorizeContent(content: string): MemoryCategory {
  const lower = content.toLowerCase();
  
  if (/project|app|code|system|feature|function/i.test(lower)) return 'project';
  if (/brand|voice|tone|style|design/i.test(lower)) return 'brand';
  if (/security|auth|permission|access/i.test(lower)) return 'security';
  if (/prefer|like|want|setting|config/i.test(lower)) return 'preference';
  if (/decision|choose|select|agreed/i.test(lower)) return 'decision';
  
  return 'knowledge';
}

function estimateImportance(content: string): number {
  const lower = content.toLowerCase();
  
  // Higher importance for explicit importance markers
  if (/important|critical|essential|must|key/i.test(lower)) return 9;
  if (/remember|note|keep/i.test(lower)) return 8;
  if (/decision|chosen|selected/i.test(lower)) return 7;
  if (/project|system|architecture/i.test(lower)) return 6;
  
  // Default importance
  return 5;
}

function containsSensitive(content: string): boolean {
  return SENSITIVE_PATTERNS.some(pattern => pattern.test(content));
}

export async function runArchiveCompaction(): Promise<{
  archived: number;
  errors: string[];
}> {
  const result: { archived: number; errors: string[] } = {
    archived: 0,
    errors: [],
  };

  try {
    await memoryStore.initialize();
    
    // Archive memories older than 30 days with importance < 7
    const archived = await memoryStore.archiveOld(30);
    result.archived = archived;

    // Update scratchpad stats
    const scratchpad = loadScratchpad();
    const stats = await memoryStore.getStats();
    scratchpad.stats.totalMemories = stats.total;
    scratchpad.stats.lastArchiveRun = Date.now();
    saveScratchpad(scratchpad);

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    result.errors.push(errorMsg);
  }

  return result;
}

export async function getArchiveFiles(): Promise<string[]> {
  if (!fs.existsSync(ARCHIVE_DIR)) {
    return [];
  }

  const files: string[] = [];
  const months = fs.readdirSync(ARCHIVE_DIR);
  
  for (const month of months) {
    const monthPath = path.join(ARCHIVE_DIR, month);
    if (fs.statSync(monthPath).isDirectory()) {
      const dayFiles = fs.readdirSync(monthPath)
        .filter(f => f.endsWith('.json'))
        .map(f => path.join(month, f));
      files.push(...dayFiles);
    }
  }

  return files.sort().reverse();
}

export async function loadArchive(filePath: string): Promise<any[]> {
  const fullPath = path.join(ARCHIVE_DIR, filePath);
  
  if (!fs.existsSync(fullPath)) {
    return [];
  }

  try {
    const data = fs.readFileSync(fullPath, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

export function shouldRunCapture(): boolean {
  const scratchpad = loadScratchpad();
  const lastRun = scratchpad.stats.lastArchiveRun || 0;
  const hourAgo = Date.now() - (60 * 60 * 1000);
  
  return lastRun < hourAgo;
}

export function getMemoryHealth(): {
  totalMemories: number;
  scratchpadSize: number;
  lastArchive: number;
  archiveFiles: number;
} {
  const scratchpad = loadScratchpad();
  const archiveFiles = fs.existsSync(ARCHIVE_DIR) 
    ? fs.readdirSync(ARCHIVE_DIR, { recursive: true }).length 
    : 0;

  return {
    totalMemories: scratchpad.stats.totalMemories,
    scratchpadSize: JSON.stringify(scratchpad).length,
    lastArchive: scratchpad.stats.lastArchiveRun,
    archiveFiles,
  };
}