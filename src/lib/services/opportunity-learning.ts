/**
 * Opportunity Learning — the self-improvement loop for the AI opportunity
 * ranking.
 *
 * The ranking AI makes a call on every match (score 0-100, pursue/watch/skip).
 * This service closes the loop:
 *
 *  1. ENGAGEMENT — when the user actually acts on a ranked item (starts a bid,
 *     marks it "pursue", or marks it "not relevant"), the AI's original call
 *     is recorded next to what the human did.
 *  2. OUTCOMES — win/loss/bid events already recorded by the opportunity
 *     scout (learnFromProject) are folded in as ground truth.
 *  3. LEARN — one LLM pass reads the engagements + outcomes (and the previous
 *     lessons) and distills 3-6 sharp, actionable lessons about what the AI
 *     got right and wrong — e.g. "EO/IR opportunities ≥70 are always
 *     bid-worthy — weight them higher" or "sole-source notices to incumbents
 *     are never pursued — be more skeptical".
 *  4. INJECT — the lessons are fed into the NEXT ranking prompt, so the AI's
 *     scoring rubric evolves with experience instead of re-ranking from
 *     scratch every scan.
 *
 * The learning pass runs lazily: the first time the matches page is viewed
 * after new signals appear (and once per batch — it never re-runs unless
 * something new happened). It can also be forced with "Learn now".
 */

import { sqlDatabase } from '@/lib/database/sqlite';
import { chatCompletion } from '@/lib/models/sdk.server';
import { sanitizePrompt } from '@/lib/utils/validation';
import { opportunityScout } from './opportunity-scout';

const DEFAULT_MODEL = 'ollama/glm-4.7-flash';
/** If a learning pass's started-marker is older than this, treat as crashed. */
const LOCK_TIMEOUT_MS = 10 * 60 * 1000;
const MAX_ENGAGEMENTS = 100;
const MAX_LESSONS = 6;

const engagementsKey = (brandId: string) => `opportunity_engagement:${brandId}`;
const lessonsKey = (brandId: string) => `opportunity_lessons:${brandId}`;
const startedKey = (brandId: string) => `opportunity_learn:started:${brandId}`;

export type EngagementSignal = 'bid' | 'pursue' | 'not-relevant';

export interface OpportunityEngagement {
  id: string;
  opportunityId: string;
  title: string;
  url?: string;
  aiScore: number;
  rank?: number;
  recommendation?: string;
  signal: EngagementSignal;
  recordedAt: number;
}

export interface LearningLesson {
  pattern: string;
  adjustment: string;
}

export interface LearningLessons {
  brandId: string;
  learnedAt: number;
  lessons: LearningLesson[];
  engagementCount: number;
  outcomeCount: number;
  message?: string;
}

export class OpportunityLearningService {
  private static instance: OpportunityLearningService;
  private running = new Set<string>();

  private constructor() {}

  static getInstance(): OpportunityLearningService {
    if (!OpportunityLearningService.instance) {
      OpportunityLearningService.instance = new OpportunityLearningService();
    }
    return OpportunityLearningService.instance;
  }

  // ==================== Engagement ====================

  getEngagements(brandId: string): OpportunityEngagement[] {
    sqlDatabase.initialize();
    const stored = sqlDatabase.getSetting(engagementsKey(brandId));
    if (!stored) return [];
    try {
      return JSON.parse(stored) as OpportunityEngagement[];
    } catch {
      return [];
    }
  }

  /** Record what the human did with an AI-ranked item (fire-and-forget friendly). */
  recordEngagement(brandId: string, e: Omit<OpportunityEngagement, 'id' | 'recordedAt'>): void {
    sqlDatabase.initialize();
    const entry: OpportunityEngagement = {
      ...e,
      id: `eng_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      recordedAt: Date.now(),
    };
    const all = this.getEngagements(brandId);
    all.unshift(entry);
    try {
      sqlDatabase.setSetting(
        engagementsKey(brandId),
        JSON.stringify(all.slice(0, MAX_ENGAGEMENTS)),
        'opportunity_scout'
      );
    } catch (err) {
      console.error('[OpportunityLearning] Failed to record engagement:', err);
    }
  }

  // ==================== Lessons / state ====================

  getLessons(brandId: string): LearningLessons | null {
    sqlDatabase.initialize();
    const stored = sqlDatabase.getSetting(lessonsKey(brandId));
    if (!stored) return null;
    try {
      return JSON.parse(stored) as LearningLessons;
    } catch {
      return null;
    }
  }

  isLearning(brandId: string): boolean {
    if (this.running.has(brandId)) return true;
    sqlDatabase.initialize();
    const marker = sqlDatabase.getSetting(startedKey(brandId));
    if (!marker) return false;
    const ts = parseInt(marker, 10);
    return Number.isFinite(ts) && Date.now() - ts < LOCK_TIMEOUT_MS;
  }

  /** True when there are engagements or outcomes newer than the last lesson. */
  hasNewSignals(brandId: string): boolean {
    sqlDatabase.initialize();
    const engagements = this.getEngagements(brandId);
    const outcomes = opportunityScout.getLearnEvents(brandId);
    if (engagements.length === 0 && outcomes.length === 0) return false;
    const lessons = this.getLessons(brandId);
    if (!lessons) return true;
    const newest =
      Math.max(
        ...[engagements[0]?.recordedAt, outcomes[0]?.learnedAt].filter(Boolean)
      ) || 0;
    return newest > lessons.learnedAt;
  }

  getLearningStatus(brandId: string) {
    const engagements = this.getEngagements(brandId);
    const outcomes = opportunityScout.getLearnEvents(brandId);
    const lessons = this.getLessons(brandId);
    return {
      engagementCount: engagements.length,
      outcomeCount: outcomes.length,
      bidsStarted: engagements.filter(e => e.signal === 'bid').length,
      pursueMarks: engagements.filter(e => e.signal === 'pursue').length,
      notRelevant: engagements.filter(e => e.signal === 'not-relevant').length,
      lessons: lessons?.lessons || [],
      learnedAt: lessons?.learnedAt || null,
      stale: this.hasNewSignals(brandId),
      running: this.isLearning(brandId),
      lastMessage: lessons?.message || null,
    };
  }

  /** Start the learning pass in the background. Honors freshness unless force. */
  async startLearning(
    brandId: string,
    opts?: { force?: boolean }
  ): Promise<{ started: boolean; message: string }> {
    sqlDatabase.initialize();
    if (this.isLearning(brandId)) {
      return { started: false, message: 'A learning pass is already running.' };
    }
    if (!opts?.force && !this.hasNewSignals(brandId)) {
      return {
        started: false,
        message: 'Nothing new to learn from yet — the AI learns when you act on a match or a bid outcome is recorded.',
      };
    }

    this.running.add(brandId);
    sqlDatabase.setSetting(startedKey(brandId), String(Date.now()), 'opportunity_scout');

    void this.learn(brandId)
      .catch(e => {
        console.error('[OpportunityLearning] Learn pass failed:', e);
        // Persist a failure marker so the page doesn't retry the LLM on every
        // view — it shows the message with a "Learn now" button instead.
        const failed: LearningLessons = {
          brandId,
          learnedAt: Date.now(),
          lessons: [],
          engagementCount: this.getEngagements(brandId).length,
          outcomeCount: opportunityScout.getLearnEvents(brandId).length,
          message: `The learning pass failed: ${e instanceof Error ? e.message : String(e)}`,
        };
        try {
          sqlDatabase.setSetting(lessonsKey(brandId), JSON.stringify(failed), 'opportunity_scout');
        } catch (persistErr) {
          console.error('[OpportunityLearning] Failed to persist failure marker:', persistErr);
        }
      })
      .finally(() => {
        this.running.delete(brandId);
        sqlDatabase.deleteSetting(startedKey(brandId));
      });

    return { started: true, message: 'The AI is studying what you pursued and what happened…' };
  }

  // ==================== The learning pass ====================

  /** One LLM pass: read engagements + outcomes, distill updated lessons, persist. */
  async learn(brandId: string): Promise<LearningLessons> {
    sqlDatabase.initialize();
    const engagements = this.getEngagements(brandId);
    const outcomes = opportunityScout.getLearnEvents(brandId);
    const previous = this.getLessons(brandId);

    const prompt = this.buildPrompt(engagements, outcomes, previous);

    let lessons: LearningLesson[] = [];
    try {
      const result = await chatCompletion({
        model: DEFAULT_MODEL,
        messages: [{ role: 'user', content: sanitizePrompt(prompt, 30000) }],
        temperature: 0.3,
        maxTokens: 2000,
      });
      lessons = this.parseLessons((result?.message?.content || '').trim());
    } catch (e) {
      console.error('[OpportunityLearning] LLM pass failed:', e);
      throw new Error(`Learning pass failed: ${e instanceof Error ? e.message : String(e)}`);
    }

    if (lessons.length === 0) {
      // Keep any previous lessons rather than wiping them on a bad parse.
      const kept = previous?.lessons || [];
      lessons = kept.slice(0, MAX_LESSONS);
      if (kept.length === 0) {
        throw new Error('The AI did not return parseable lessons. Please try again.');
      }
    }

    const result: LearningLessons = {
      brandId,
      learnedAt: Date.now(),
      lessons: lessons.slice(0, MAX_LESSONS),
      engagementCount: engagements.length,
      outcomeCount: outcomes.length,
    };
    try {
      sqlDatabase.setSetting(lessonsKey(brandId), JSON.stringify(result), 'opportunity_scout');
    } catch (e) {
      console.error('[OpportunityLearning] Failed to persist lessons:', e);
    }
    return result;
  }

  private buildPrompt(
    engagements: OpportunityEngagement[],
    outcomes: { outcome: string; projectName: string; agency?: string; keywords: string[]; learnedAt: number }[],
    previous: LearningLessons | null
  ): string {
    const engLines =
      engagements.length === 0
        ? '  (none yet — the user has not acted on any ranked item)'
        : engagements
            .slice(0, 40)
            .map(e => {
              const action =
                e.signal === 'bid'
                  ? 'started a bid'
                  : e.signal === 'pursue'
                  ? 'marked as worth pursuing'
                  : 'marked as NOT relevant';
              return `- [${new Date(e.recordedAt).toLocaleDateString()}] "${e.title.slice(0, 90)}" — AI score ${e.aiScore}${e.rank ? `, ranked #${e.rank}` : ''}${e.recommendation ? `, recommended "${e.recommendation}"` : ''} → user ${action}`;
            })
            .join('\n');

    const outcomeLines =
      outcomes.length === 0
        ? '  (none yet — no bid outcomes recorded)'
        : outcomes
            .slice(0, 25)
            .map(o => {
              const agency = o.agency ? ` (${o.agency})` : '';
              const kw = (o.keywords || []).slice(0, 6).join(', ');
              return `- "${o.projectName.slice(0, 90)}" — ${o.outcome.toUpperCase()}${agency}${kw ? ` — keywords: ${kw}` : ''}`;
            })
            .join('\n');

    const prevLines = previous?.lessons?.length
      ? previous.lessons.map(l => `- ${l.pattern} → ${l.adjustment}`).join('\n')
      : '  (none yet — first learning pass)';

    return `You are the continuous-improvement engine for a government-contracting opportunity ranker. The ranker gives every SAM.gov match an AI score (0-100) and a pursue/watch/skip recommendation. Your job: study what the AI recommended versus what the human actually did and what the outcomes were, and produce sharper guidance so the NEXT ranking pass scores better.

## WHAT THE AI RANKED AND WHAT THE HUMAN DID
${engLines}

## BID OUTCOMES (ground truth)
${outcomeLines}

## CURRENT LESSONS
${prevLines}

## TASK
Distill 3-6 sharp, actionable lessons from the evidence above. Each lesson must be:
- pattern: the observable pattern (e.g. "every EO/IR opportunity scoring 70+ was pursued and won", "sole-source spares notices to RTX were all marked not-relevant", "SSA RFIs are usually Social Security Administration, not space").
- adjustment: exactly how the ranking AI should change its scoring because of it (e.g. "weight electro-optical payload keywords and past-performance evidence higher", "be more skeptical of sole-source notices to incumbents — drop their score", "check the agency name before crediting SSA as space situational awareness").

Only write lessons with real support in the evidence — never invent patterns. If the evidence is thin, keep it to 1-2 honest lessons rather than padding.

Respond with STRICT JSON only, no markdown:
{"lessons":[{"pattern":"...","adjustment":"..."}]}`;
  }

  private parseLessons(raw: string): LearningLesson[] {
    const start = raw.indexOf('{');
    const end = raw.lastIndexOf('}');
    if (start < 0 || end <= start) return [];
    let parsed: any;
    try {
      parsed = JSON.parse(raw.slice(start, end + 1));
    } catch {
      return [];
    }
    const arr = Array.isArray(parsed?.lessons) ? parsed.lessons : [];
    const out: LearningLesson[] = [];
    for (const it of arr) {
      const pattern = String(it?.pattern || '').trim().slice(0, 300);
      const adjustment = String(it?.adjustment || '').trim().slice(0, 300);
      if (pattern && adjustment) out.push({ pattern, adjustment });
    }
    return out.slice(0, MAX_LESSONS);
  }
}

export const opportunityLearning = OpportunityLearningService.getInstance();
