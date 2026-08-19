/**
 * AI Opportunity Ranking
 *
 * After a SAM.gov scan, the heuristic fit score tells you *which keywords
 * matched* — but not whether the opportunity is actually worth pursuing. This
 * service makes the AI read every scored match against the company's real
 * capability profile (products, capabilities, past performance, NAICS) in ONE
 * LLM pass, and returns a ranked list — score 0-100, one-line plain-English
 * summary, why it fits (or doesn't), and a pursue/watch/skip recommendation —
 * merged with each opportunity's SAM.gov URL.
 *
 * The ranking is computed once per scan (cached), lazy-triggered the first
 * time the matches page is viewed after a scan completes, and can be re-run
 * on demand ("Re-rank with AI"). The page presents it as a list of URLs with
 * summaries, sorted high to low.
 */

import { sqlDatabase } from '@/lib/database/sqlite';
import { chatCompletion } from '@/lib/models/sdk.server';
import { sanitizePrompt } from '@/lib/utils/validation';
import { dailySamScan } from './daily-sam-scan';
import { opportunityScout, type OpportunityProfile, type ScoredOpportunity } from './opportunity-scout';

const DEFAULT_MODEL = 'ollama/glm-4.7-flash';

/** How many of the top heuristic matches the AI reads in one pass. */
const MAX_RANKED = 25;
/** If a ranking's started-marker is older than this, treat it as crashed. */
const LOCK_TIMEOUT_MS = 10 * 60 * 1000;

const rankingKey = (brandId: string) => `opportunity_rank:${brandId}`;
const startedKey = (brandId: string) => `opportunity_rank:started:${brandId}`;

export interface RankedOpportunity {
  rank: number;
  /** 0-100 — how well this opportunity fits the company's capabilities (AI). */
  aiScore: number;
  /** One-line plain-English summary of what the opportunity is. */
  summary: string;
  /** Why it fits (or doesn't) — names the company capability involved. */
  why: string;
  recommendation: 'pursue' | 'watch' | 'skip';
  // Merged match data for display / deep links.
  id: string;
  title: string;
  url?: string;
  agency?: string;
  solicitationNumber: string;
  responseDeadline?: string;
  naicsCode?: string;
  fitScore: number;
  matchedKeywords: string[];
}

export interface OpportunityRanking {
  brandId: string;
  /** When the ranking was computed. */
  rankedAt: number;
  /** lastRun timestamp of the scan this ranking was computed from. */
  forRunAt: number;
  /** Sorted high → low. */
  items: RankedOpportunity[];
  model: string;
  matchesConsidered: number;
  message?: string;
}

export class OpportunityRankingService {
  private static instance: OpportunityRankingService;
  private running = new Set<string>();

  private constructor() {}

  static getInstance(): OpportunityRankingService {
    if (!OpportunityRankingService.instance) {
      OpportunityRankingService.instance = new OpportunityRankingService();
    }
    return OpportunityRankingService.instance;
  }

  // ==================== State ====================

  getRanking(brandId: string): OpportunityRanking | null {
    sqlDatabase.initialize();
    const stored = sqlDatabase.getSetting(rankingKey(brandId));
    if (!stored) return null;
    try {
      return JSON.parse(stored) as OpportunityRanking;
    } catch {
      return null;
    }
  }

  isRankingRunning(brandId: string): boolean {
    if (this.running.has(brandId)) return true;
    sqlDatabase.initialize();
    const marker = sqlDatabase.getSetting(startedKey(brandId));
    if (!marker) return false;
    const ts = parseInt(marker, 10);
    return Number.isFinite(ts) && Date.now() - ts < LOCK_TIMEOUT_MS;
  }

  /** True when no ranking exists for the scan that produced the given lastRun. */
  isRankStale(brandId: string, lastRun: number | null): boolean {
    if (!lastRun) return false;
    const ranking = this.getRanking(brandId);
    if (!ranking) return true;
    return ranking.forRunAt !== lastRun;
  }

  getRankStatus(brandId: string, lastRun: number | null): 'running' | 'ready' | 'stale' | 'none' {
    if (this.isRankingRunning(brandId)) return 'running';
    if (!lastRun) return 'none';
    if (this.isRankStale(brandId, lastRun)) return 'stale';
    return 'ready';
  }

  /**
   * Start a ranking for the current matches. Honors freshness unless `force`.
   * Runs in the background — poll getRankStatus() for completion.
   */
  async startRanking(
    brandId: string,
    opts?: { force?: boolean; limit?: number }
  ): Promise<{ started: boolean; message: string }> {
    sqlDatabase.initialize();
    const lastRun = dailySamScan.getLastRun(brandId);
    if (this.isRankingRunning(brandId)) {
      return { started: false, message: 'The AI is already ranking the matches.' };
    }
    if (!opts?.force && !this.isRankStale(brandId, lastRun)) {
      return { started: false, message: 'The AI ranking is already up to date.' };
    }

    const matches = dailySamScan.getMatches(brandId, { limit: 100 });
    if (matches.length === 0) {
      return {
        started: false,
        message: 'No matches to rank yet — run a scan first.',
      };
    }

    this.running.add(brandId);
    sqlDatabase.setSetting(startedKey(brandId), String(Date.now()), 'opportunity_scout');

    void this.rank(brandId, matches, opts?.limit)
      .catch(e => {
        console.error('[OpportunityRanking] Ranking failed:', e);
        // Persist a failed marker for THIS scan so the page does not retry the
        // LLM on every view — it shows the error with a Re-rank button instead.
        const failed: OpportunityRanking = {
          brandId,
          rankedAt: Date.now(),
          forRunAt: lastRun || Date.now(),
          items: [],
          model: DEFAULT_MODEL,
          matchesConsidered: matches.length,
          message: `The AI ranking failed: ${e instanceof Error ? e.message : String(e)}`,
        };
        try {
          sqlDatabase.setSetting(rankingKey(brandId), JSON.stringify(failed), 'opportunity_scout');
        } catch (persistErr) {
          console.error('[OpportunityRanking] Failed to persist failure marker:', persistErr);
        }
      })
      .finally(() => {
        this.running.delete(brandId);
        sqlDatabase.deleteSetting(startedKey(brandId));
      });

    return {
      started: true,
      message: `The AI is reading ${Math.min(matches.length, MAX_RANKED)} opportunities against your company profile…`,
    };
  }

  // ==================== The AI pass ====================

  /** One LLM pass: read the top matches against the profile, rank high → low, persist. */
  async rank(
    brandId: string,
    matches: ScoredOpportunity[],
    limit?: number
  ): Promise<OpportunityRanking> {
    sqlDatabase.initialize();
    const profile = opportunityScout.getProfile(brandId);
    const lastRun = dailySamScan.getLastRun(brandId);

    const pool = [...matches]
      .sort((a, b) => b.fitScore - a.fitScore)
      .slice(0, limit || MAX_RANKED);

    const prompt = this.buildPrompt(profile, pool);

    let items: RankedOpportunity[] = [];
    try {
      const result = await chatCompletion({
        model: DEFAULT_MODEL,
        messages: [{ role: 'user', content: sanitizePrompt(prompt, 50000) }],
        temperature: 0.2,
        maxTokens: 4000,
      });
      const raw = (result?.message?.content || '').trim();
      items = this.parseRanking(raw, pool);
      // One repair attempt — models sometimes wrap the JSON or truncate it.
      if (items.length === 0) {
        const repair = await chatCompletion({
          model: DEFAULT_MODEL,
          messages: [
            {
              role: 'user',
              content: sanitizePrompt(
                `${prompt}\n\nYour previous answer could not be parsed as JSON. Respond with STRICT JSON only — an object with an "items" array. Every item needs: index, score (0-100), summary (one short sentence), why (one short sentence), recommendation ("pursue" | "watch" | "skip").`,
                50000
              ),
            },
          ],
          temperature: 0.1,
          maxTokens: 4000,
        });
        items = this.parseRanking((repair?.message?.content || '').trim(), pool);
      }
    } catch (e) {
      console.error('[OpportunityRanking] LLM pass failed:', e);
      throw new Error(`AI ranking failed: ${e instanceof Error ? e.message : String(e)}`);
    }

    if (items.length === 0) {
      throw new Error('The AI did not return a parseable ranking. Please try again.');
    }

    items = items
      .sort((a, b) => b.aiScore - a.aiScore)
      .map((item, i) => ({ ...item, rank: i + 1 }));

    const ranking: OpportunityRanking = {
      brandId,
      rankedAt: Date.now(),
      forRunAt: lastRun || Date.now(),
      items,
      model: DEFAULT_MODEL,
      matchesConsidered: pool.length,
    };

    try {
      sqlDatabase.setSetting(rankingKey(brandId), JSON.stringify(ranking), 'opportunity_scout');
    } catch (e) {
      console.error('[OpportunityRanking] Failed to persist ranking:', e);
    }

    return ranking;
  }

  /** Build the compact one-pass prompt: company capabilities + numbered opportunities. */
  private buildPrompt(profile: OpportunityProfile, pool: ScoredOpportunity[]): string {
    const caps = [
      `Products: ${(profile.products || []).slice(0, 12).join('; ') || 'none listed'}`,
      `Capabilities: ${(profile.capabilities || []).slice(0, 12).join('; ') || 'none listed'}`,
      `NAICS codes: ${(profile.naicsCodes || []).join(', ') || 'none listed'}`,
      `Past performance: ${(profile.pastPerformance || []).slice(0, 8).join('; ') || 'none listed'}`,
      `Target agencies: ${(profile.targetAgencies || []).join(', ') || 'none listed'}`,
      `Search keywords: ${(profile.keywords || []).slice(0, 20).join('; ') || 'none listed'}`,
      `Learned keywords (weight): ${(profile.learnedKeywords || [])
        .slice(0, 8)
        .map(k => `${k.keyword}(${k.weight})`)
        .join('; ') || 'none'}`,
    ].join('\n');

    const listing = pool
      .map((o, i) => {
        const synopsis = (o.synopsis || '').replace(/\s+/g, ' ').trim().slice(0, 320);
        return `[${i}] ${o.title}
  Agency: ${o.agency || 'unknown'} | Solicitation: ${o.solicitationNumber || 'n/a'} | NAICS: ${o.naicsCode || 'n/a'} | Deadline: ${o.responseDeadline || 'n/a'}
  Synopsis: ${synopsis || 'no synopsis available'}`;
      })
      .join('\n\n');

    return `You are the capture director for a company that bids on U.S. government contracts. You have been handed the latest SAM.gov opportunities found by the daily scan, and you must decide which ones are genuinely worth the company's time.

## COMPANY CAPABILITIES
${caps}

## OPPORTUNITIES (numbered [0]..[${pool.length - 1}])
${listing}

## TASK
For EVERY numbered opportunity, judge how well it fits this company's REAL capabilities — not just keyword overlap. Consider: does the company do this work? Is it the right customer? Is the effort/scope realistic? Is the deadline actionable?

Respond with STRICT JSON only, no markdown, no commentary:
{"items":[{"index":0,"score":78,"summary":"one short plain-English sentence describing the opportunity","why":"one short sentence on why it fits or does not fit the company, naming the relevant capability","recommendation":"pursue"}]}

Rules:
- score 0-100: how strongly this opportunity fits the company's capabilities and is worth pursuing. Use the full range — most opportunities are mediocre; only a few should score above 80.
- summary: a plain-English, non-technical one-liner a busy founder can skim.
- why: ground it in something from COMPANY CAPABILITIES (a product, capability, past performance, or target agency). Never invent capability.
- recommendation: "pursue" when it is worth a real bid, "watch" when worth monitoring (e.g. draft RFP, long timeline, partial fit), "skip" when clearly off-target.
- Include EVERY index from 0 to ${pool.length - 1} exactly once.`;
  }

  /** Parse the LLM's JSON and merge it back with the original match records. */
  private parseRanking(raw: string, pool: ScoredOpportunity[]): RankedOpportunity[] {
    const start = raw.indexOf('{');
    const end = raw.lastIndexOf('}');
    if (start < 0 || end <= start) return [];
    let parsed: any;
    try {
      parsed = JSON.parse(raw.slice(start, end + 1));
    } catch {
      return [];
    }
    const arr = Array.isArray(parsed?.items) ? parsed.items : [];
    const out: RankedOpportunity[] = [];
    for (const it of arr) {
      const idx = Number(it?.index);
      const opp = pool[idx];
      if (!opp || !Number.isInteger(idx) || idx < 0 || idx >= pool.length) continue;
      const score = Math.max(0, Math.min(100, Math.round(Number(it?.score) || 0)));
      const rec = ['pursue', 'watch', 'skip'].includes(it?.recommendation)
        ? (it.recommendation as 'pursue' | 'watch' | 'skip')
        : score >= 70
        ? 'pursue'
        : score >= 40
        ? 'watch'
        : 'skip';
      out.push({
        rank: 0, // assigned after sorting
        aiScore: score,
        summary: String(it?.summary || opp.title).slice(0, 300),
        why: String(it?.why || '').slice(0, 300),
        recommendation: rec,
        id: opp.id,
        title: opp.title,
        url: opp.url,
        agency: opp.agency,
        solicitationNumber: opp.solicitationNumber,
        responseDeadline: opp.responseDeadline,
        naicsCode: opp.naicsCode,
        fitScore: opp.fitScore,
        matchedKeywords: opp.matchedKeywords || [],
      });
    }
    return out;
  }
}

export const opportunityRanking = OpportunityRankingService.getInstance();
