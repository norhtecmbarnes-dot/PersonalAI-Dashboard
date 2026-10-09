/**
 * Self-Education — the system that keeps itself current.
 *
 * Loop (see docs/SELF-EDUCATION.md and book/Chapter-25):
 *
 *   1. CODE fetches the facts.  For every tool in the inventory we ask GitHub
 *      for its latest release and compare to the version we last saw. No model is
 *      used to "remember" versions — that would violate the knowledge policy.
 *   2. A LOW-COST model ranks the raw findings (relevance + a one-line note).
 *   3. The ALPHA model (the best available) contextualises everything against
 *      what the user actually does, and writes a markdown report.
 *   4. The report lands in data/improvements/ and a proposal queue is recorded.
 *      Nothing is implemented without the human's approval.
 */

import fs from 'fs';
import path from 'path';
import { TOOL_INVENTORY, MODEL_INVENTORY, inventoryBySubsystem, type TrackedTool } from './tool-inventory';
import { chatCompletion } from '@/lib/models/sdk.server';
import { getAlphaModel } from '@/lib/models/alpha';
import { sqlDatabase } from '@/lib/database/sqlite';
import { vectorLake } from '@/lib/storage/vector-lake';

export const IMPROVEMENTS_DIR = path.join(process.cwd(), 'data', 'improvements');
const PROPOSALS_FILE = path.join(IMPROVEMENTS_DIR, 'proposals.json');

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export interface ResearchFinding {
  toolId: string;
  toolName: string;
  category: TrackedTool['category'];
  usedBy?: string;
  kind: 'update' | 'baseline' | 'note';
  from: string;
  to: string;
  title: string;
  detail: string;
  url?: string;
  publishedAt?: string;
  discoveredAt: number;
}

export interface ImprovementProposal {
  id: string;
  toolId: string;
  title: string;
  detail: string;
  status: 'pending' | 'approved' | 'rejected' | 'applied';
  report?: string;
  createdAt: number;
  decidedAt?: number;
}

export interface WorkflowSignals {
  counts: Record<string, number>;
  notes: string[];
}

/* ------------------------------------------------------------------ */
/* Settings helpers (baselines + last run)                             */
/* ------------------------------------------------------------------ */

function readSetting(key: string, fallback = ''): string {
  try {
    sqlDatabase.initialize();
    return sqlDatabase.getSetting(key) ?? fallback;
  } catch {
    return fallback;
  }
}
function writeSetting(key: string, value: string): void {
  try {
    sqlDatabase.initialize();
    sqlDatabase.setSetting(key, value, 'self_education');
  } catch {
    /* best-effort */
  }
}

/* ------------------------------------------------------------------ */
/* 1. Research — deterministic facts from GitHub                       */
/* ------------------------------------------------------------------ */

async function fetchLatestRelease(repo: string): Promise<{
  tag?: string;
  url?: string;
  publishedAt?: string;
  body?: string;
} | null> {
  try {
    const res = await fetch(`https://api.github.com/repos/${repo}/releases/latest`, {
      headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'proposal-genie-self-education' },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return null;
    const j: any = await res.json();
    return { tag: j.tag_name, url: j.html_url, publishedAt: j.published_at, body: j.body };
  } catch {
    return null;
  }
}

export interface ResearchRun {
  findings: ResearchFinding[];
  checked: number;
  updates: number;
  baselines: number;
  errors: string[];
}

/** Fetch the current version of every tracked tool and diff against what we last saw. */
export async function researchUpdates(): Promise<ResearchRun> {
  const findings: ResearchFinding[] = [];
  const errors: string[] = [];
  let checked = 0;
  let updates = 0;
  let baselines = 0;
  const now = Date.now();

  for (const tool of TOOL_INVENTORY) {
    if (tool.source !== 'github' || !tool.repo) continue;
    const rel = await fetchLatestRelease(tool.repo);
    checked++;
    if (!rel || !rel.tag) {
      errors.push(`${tool.name}: no release information (${tool.repo})`);
      continue;
    }
    const seenKey = `edu_seen_${tool.id}`;
    const seen = readSetting(seenKey);

    if (!seen) {
      baselines++;
      writeSetting(seenKey, rel.tag);
      findings.push({
        toolId: tool.id,
        toolName: tool.name,
        category: tool.category,
        usedBy: tool.usedBy,
        kind: 'baseline',
        from: '(new)',
        to: rel.tag,
        title: `${tool.name} is now tracked at ${rel.tag}`,
        detail: tool.why || '',
        url: rel.url,
        publishedAt: rel.publishedAt,
        discoveredAt: now,
      });
      continue;
    }

    if (seen !== rel.tag) {
      updates++;
      writeSetting(seenKey, rel.tag);
      findings.push({
        toolId: tool.id,
        toolName: tool.name,
        category: tool.category,
        usedBy: tool.usedBy,
        kind: 'update',
        from: seen,
        to: rel.tag,
        title: `${tool.name}: ${seen} → ${rel.tag}`,
        detail: (rel.body || tool.why || '').slice(0, 1200),
        url: rel.url,
        publishedAt: rel.publishedAt,
        discoveredAt: now,
      });
    }
  }

  return { findings, checked, updates, baselines, errors };
}

/* ------------------------------------------------------------------ */
/* 2. Low-cost ranking                                                 */
/* ------------------------------------------------------------------ */

async function rankFindings(
  findings: ResearchFinding[]
): Promise<Record<string, { relevance: number; note: string }>> {
  const updates = findings.filter(f => f.kind === 'update');
  if (updates.length === 0) return {};

  const model =
    process.env.SELF_EDU_RANK_MODEL ||
    process.env.LOCAL_RANK_MODEL ||
    'ollama/qwen3.5:9b';

  const list = updates.map(f => ({
    toolId: f.toolId,
    tool: f.toolName,
    from: f.from,
    to: f.to,
    changelog: (f.detail || '').slice(0, 600),
  }));

  try {
    const res = await chatCompletion({
      model,
      messages: [
        {
          role: 'system',
          content:
            'You rank software updates for a local-first AI dashboard. Reply ONLY with JSON: ' +
            'an array of {"toolId","relevance"(0-10),"note"(one short sentence)}. ' +
            'Do not invent facts; judge only from the changelog text provided.',
        },
        { role: 'user', content: JSON.stringify(list) },
      ],
      temperature: 0,
      maxTokens: 900,
    });
    const raw = (typeof (res as any).message === 'string'
      ? (res as any).message
      : (res as any).message?.content || '') as string;
    const jsonStart = raw.indexOf('[');
    const jsonEnd = raw.lastIndexOf(']');
    if (jsonStart === -1 || jsonEnd === -1) return {};
    const arr = JSON.parse(raw.slice(jsonStart, jsonEnd + 1));
    const out: Record<string, { relevance: number; note: string }> = {};
    for (const r of arr) {
      if (r && r.toolId) out[r.toolId] = { relevance: Number(r.relevance) || 0, note: String(r.note || '') };
    }
    return out;
  } catch {
    return {};
  }
}

/* ------------------------------------------------------------------ */
/* 3. Workflow signals                                                 */
/* ------------------------------------------------------------------ */

export async function gatherWorkflowSignals(): Promise<WorkflowSignals> {
  const counts: Record<string, number> = {};
  const notes: string[] = [];
  try {
    sqlDatabase.initialize();
    const stats: any = sqlDatabase.getStats?.();
    if (stats) {
      for (const [k, v] of Object.entries(stats)) if (typeof v === 'number') counts[k] = v as number;
    }
  } catch {
    notes.push('database not available — workflow signals are partial');
  }
  try {
    const recent = vectorLake.getRecentQueries(10);
    if (Array.isArray(recent)) {
      counts.recentQueries = recent.length;
      for (const q of recent.slice(0, 10)) {
        const text = (q as any)?.query || (q as any)?.userQuery;
        if (text) notes.push(String(text).slice(0, 140));
      }
    }
  } catch {
    /* vector lake optional */
  }
  return { counts, notes };
}

/* ------------------------------------------------------------------ */
/* 4. Contextualise — the Alpha writes the report                      */
/* ------------------------------------------------------------------ */

export function buildReportPrompt(
  findings: ResearchFinding[],
  ranking: Record<string, { relevance: number; note: string }>,
  signals: WorkflowSignals,
  alpha: string
): string {
  const grouped = inventoryBySubsystem();
  return `You are the ALPHA model (${alpha}) writing an improvement report for a local-first
AI dashboard ("Proposal Genie"). A cheap model already gathered the raw facts below; you
contextualise them. Do NOT invent facts or versions — use only what is given.

## Raw findings (facts, fetched from GitHub)
${JSON.stringify(findings, null, 2)}

## Low-cost ranking (relevance 0-10 + note)
${JSON.stringify(ranking, null, 2)}

## What the user actually does (workflow signals)
${JSON.stringify(signals, null, 2)}

## Subsystems the tools belong to
${JSON.stringify(Object.fromEntries(Object.entries(grouped).map(([k, v]) => [k, v.map(t => t.name)])), null, 2)}

## Tracked models
${JSON.stringify(MODEL_INVENTORY, null, 2)}

Write a markdown report with EXACTLY these sections:

# Improvement Report — <date>
## Summary
(2-4 sentences: how many updates were found and what matters most.)
## Suggested improvements
(One subsection per worthwhile update. For each: **What** / **Why it matters for this
user** / **Impact** (high/med/low) / **Effort** (high/med/low) / **How to verify**.
Skip trivial or irrelevant ones — say so if you skip them.)
## Workflow suggestions
(Where the user's own strengths could be applied more, or where a tool would amplify
what they already do well. Ground each in the signals. Notice ONLY the user's strengths —
never build a recommendation on their mistakes, gaps, or weaknesses.)
## Needs human approval
(A short checklist of the actions you recommend, for the human to approve or reject.)

Be specific and honest. If there is nothing worth doing, say so plainly.`;
}

export async function contextualize(
  findings: ResearchFinding[],
  ranking: Record<string, { relevance: number; note: string }>,
  signals: WorkflowSignals
): Promise<{ markdown: string; model: string }> {
  const alpha = getAlphaModel();
  const prompt = buildReportPrompt(findings, ranking, signals, alpha);
  try {
    const res = await chatCompletion({
      model: alpha,
      messages: [
        { role: 'system', content: 'You write clear, honest engineering improvement reports.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3,
      maxTokens: 3000,
    });
    const md =
      typeof (res as any).message === 'string'
        ? (res as any).message
        : (res as any).message?.content || '';
    return { markdown: md, model: alpha };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'unknown error';
    return {
      markdown: `# Improvement Report\n\n> The Alpha model (${alpha}) could not be reached: ${msg}\n\nThe raw findings are below.\n\n${findings
        .map(f => `- **${f.toolName}** ${f.from} → ${f.to}${f.url ? ` (${f.url})` : ''}`)
        .join('\n')}\n`,
      model: alpha,
    };
  }
}

/* ------------------------------------------------------------------ */
/* 5. Reports & proposals on disk                                      */
/* ------------------------------------------------------------------ */

function ensureDir(): void {
  if (!fs.existsSync(IMPROVEMENTS_DIR)) fs.mkdirSync(IMPROVEMENTS_DIR, { recursive: true });
}

export function writeReport(markdown: string, title = 'improvement-report'): string {
  ensureDir();
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const file = path.join(IMPROVEMENTS_DIR, `${stamp}-${slug}.md`);
  fs.writeFileSync(file, markdown, 'utf8');
  // A stable pointer for the Alpha (and humans) to read the newest report.
  fs.writeFileSync(path.join(IMPROVEMENTS_DIR, 'latest.md'), markdown, 'utf8');
  return file;
}

export function listReports(): { name: string; size: number; modified: number }[] {
  ensureDir();
  return fs
    .readdirSync(IMPROVEMENTS_DIR)
    .filter(f => f.endsWith('.md'))
    .map(f => {
      const st = fs.statSync(path.join(IMPROVEMENTS_DIR, f));
      return { name: f, size: st.size, modified: st.mtimeMs };
    })
    .sort((a, b) => b.modified - a.modified);
}

export function readReport(name: string): string | null {
  ensureDir();
  const safe = path.basename(name);
  const file = path.join(IMPROVEMENTS_DIR, safe);
  if (!fs.existsSync(file)) return null;
  return fs.readFileSync(file, 'utf8');
}

export function listProposals(): ImprovementProposal[] {
  ensureDir();
  if (!fs.existsSync(PROPOSALS_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(PROPOSALS_FILE, 'utf8'));
  } catch {
    return [];
  }
}

function saveProposals(list: ImprovementProposal[]): void {
  ensureDir();
  fs.writeFileSync(PROPOSALS_FILE, JSON.stringify(list, null, 2), 'utf8');
}

export function recordProposals(findings: ResearchFinding[], reportFile: string): ImprovementProposal[] {
  const existing = listProposals();
  const known = new Set(existing.map(p => p.toolId + ':' + p.title));
  const fresh = findings
    .filter(f => f.kind === 'update')
    .filter(f => !known.has(f.toolId + ':' + f.title))
    .map(f => ({
      id: `prop_${Date.now().toString(36)}_${f.toolId}`,
      toolId: f.toolId,
      title: f.title,
      detail: f.detail.slice(0, 2000),
      status: 'pending' as const,
      report: reportFile,
      createdAt: Date.now(),
    }));
  const merged = [...fresh, ...existing].slice(0, 500);
  saveProposals(merged);
  return merged;
}

export function setProposalStatus(id: string, status: ImprovementProposal['status']): ImprovementProposal | null {
  const list = listProposals();
  const idx = list.findIndex(p => p.id === id);
  if (idx === -1) return null;
  list[idx] = { ...list[idx], status, decidedAt: Date.now() };
  saveProposals(list);
  return list[idx];
}

/* ------------------------------------------------------------------ */
/* 6. Orchestrate                                                      */
/* ------------------------------------------------------------------ */

export interface SelfEducationRun {
  ranAt: number;
  checked: number;
  updates: number;
  baselines: number;
  errors: string[];
  ranking: Record<string, { relevance: number; note: string }>;
  reportFile: string;
  alpha: string;
  proposals: number;
}

/** One full pass: research → rank → contextualise → report → queue. */
export async function runSelfEducation(): Promise<SelfEducationRun> {
  const run = await researchUpdates();
  const ranking = await rankFindings(run.findings);
  const signals = await gatherWorkflowSignals();
  const { markdown, model } = await contextualize(run.findings, ranking, signals);

  const reportFile = writeReport(markdown, 'improvement-report');
  const proposals = recordProposals(run.findings, reportFile);

  // Findings become searchable notes in the vector lake (best-effort).
  try {
    if (run.findings.length > 0) {
      await vectorLake.saveOrganizedData({
        contacts: [],
        tasks: [],
        events: [],
        notes: run.findings.map(f => ({
          title: `[self-education] ${f.title}`,
          content: `${f.detail}${f.url ? `\n${f.url}` : ''}`,
          category: 'self-education',
        })),
      });
    }
  } catch {
    /* vector lake optional */
  }

  writeSetting('edu_last_run', String(Date.now()));

  return {
    ranAt: Date.now(),
    checked: run.checked,
    updates: run.updates,
    baselines: run.baselines,
    errors: run.errors,
    ranking,
    reportFile,
    alpha: model,
    proposals: proposals.filter(p => p.status === 'pending').length,
  };
}

export function getSelfEducationStatus() {
  return {
    lastRun: Number(readSetting('edu_last_run', '0')) || 0,
    alpha: getAlphaModel(),
    reportsDir: IMPROVEMENTS_DIR,
    reportCount: listReports().length,
    pendingProposals: listProposals().filter(p => p.status === 'pending').length,
    trackedTools: TOOL_INVENTORY.length,
    trackedModels: MODEL_INVENTORY.length,
  };
}
