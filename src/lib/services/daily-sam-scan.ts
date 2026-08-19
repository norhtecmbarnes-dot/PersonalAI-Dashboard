/**
 * Daily Targeted SAM.gov Scan
 *
 * Runs a targeted SAM.gov opportunity search once a day for a company, then
 * exposes the scored matches to the /opportunities page (and the /api/sam-scan
 * route). "Targeted" means the search queries are derived from the company's
 * Opportunity Scout profile — its NAICS codes and learned/keywords — rather than
 * a generic keyword.
 *
 * Mechanics:
 *  - A scan is considered stale 24h after the last completed run. Visiting the
 *    matches URL lazily triggers a fresh scan if stale ("once a day via a URL").
 *  - An in-process Set plus a DB timestamp guard against concurrent runs; a
 *    started-marker older than 10 minutes is treated as a crashed scan and the
 *    lock is released.
 *  - Searching prefers the SAM.gov API key when one is set. Without a key, a
 *    browser agent drives the system Edge/Chrome browser against SAM.gov's
 *    public search (no login, no key) — so scanning keeps working through
 *    SAM.gov's 90-day key rotations.
 */

import { sqlDatabase } from '@/lib/database/sqlite';
import {
  opportunityScout,
  type OpportunityProfile,
  type ScoredOpportunity,
} from './opportunity-scout';
import { brandWorkspace } from './brand-workspace';
import { unifiedContext } from './unified-context';
import { agentBrowserService } from '@/lib/browser/agent-browser-service';
import type { SAMOpportunity } from './sam-gov';

/** Once per day. */
export const SCAN_INTERVAL_MS = 24 * 60 * 60 * 1000;
/** If a scan's started-marker is older than this, treat it as crashed. */
const LOCK_TIMEOUT_MS = 10 * 60 * 1000;

const lastRunKey = (brandId: string) => `daily_sam_scan:last_run:${brandId}`;
const lastSummaryKey = (brandId: string) => `daily_sam_scan:last_summary:${brandId}`;
const startedKey = (brandId: string) => `daily_sam_scan:started:${brandId}`;

export type ScanQuery = string | { keyword?: string; naicsCode?: string; pscCode?: string };

export interface ScanSummary {
  brandId: string;
  brandName: string;
  ranAt: number;
  durationMs: number;
  mode: 'api' | 'browser' | 'blocked' | 'none';
  queries: string[];
  totalFound: number;
  matchCount: number;
  topMatches: ScoredOpportunity[];
  errors: string[];
  message?: string;
}

export class DailySamScanService {
  private static instance: DailySamScanService;
  private running = new Set<string>();

  private constructor() {}

  static getInstance(): DailySamScanService {
    if (!DailySamScanService.instance) {
      DailySamScanService.instance = new DailySamScanService();
    }
    return DailySamScanService.instance;
  }

  // ==================== Brand resolution ====================

  /** Explicit brand → active brand → first brand. */
  async resolveBrandId(brandId?: string | null): Promise<string | null> {
    sqlDatabase.initialize();
    if (brandId) return brandId;
    const active = unifiedContext.getActiveBrandId();
    if (active) return active;
    const brands = await brandWorkspace.getBrands().catch(() => []);
    return brands.length > 0 ? brands[0].id : null;
  }

  // ==================== State ====================

  isConfigured(): boolean {
    sqlDatabase.initialize();
    return !!sqlDatabase.getApiKey('sam');
  }

  /** True when a key OR the browser agent is available to search with. */
  async canScan(): Promise<boolean> {
    return this.isConfigured() || (await agentBrowserService.checkInstalled());
  }

  getLastRun(brandId: string): number | null {
    sqlDatabase.initialize();
    const v = sqlDatabase.getSetting(lastRunKey(brandId));
    const n = v ? parseInt(v, 10) : NaN;
    return Number.isFinite(n) ? n : null;
  }

  getSummary(brandId: string): ScanSummary | null {
    sqlDatabase.initialize();
    const v = sqlDatabase.getSetting(lastSummaryKey(brandId));
    if (!v) return null;
    try {
      return JSON.parse(v) as ScanSummary;
    } catch {
      return null;
    }
  }

  isStale(brandId: string): boolean {
    const last = this.getLastRun(brandId);
    if (!last) return true;
    return Date.now() - last >= SCAN_INTERVAL_MS;
  }

  isRunning(brandId: string): boolean {
    if (this.running.has(brandId)) return true;
    sqlDatabase.initialize();
    const marker = sqlDatabase.getSetting(startedKey(brandId));
    if (!marker) return false;
    const ts = parseInt(marker, 10);
    return Number.isFinite(ts) && Date.now() - ts < LOCK_TIMEOUT_MS;
  }

  async getStatus(brandId: string) {
    const summary = this.getSummary(brandId);
    const profile = opportunityScout.getProfile(brandId);
    const brand = await brandWorkspace.getBrandById(brandId).catch(() => null);
    const last = this.getLastRun(brandId);
    const configured = this.isConfigured();
    return {
      brandId,
      brandName: brand?.name || summary?.brandName || '',
      configured,
      hasProfile: profile.keywords.length > 0 || profile.naicsCodes.length > 0,
      profileSummary: {
        naicsCodes: profile.naicsCodes.map(String),
        keywords: profile.keywords.slice(0, 8),
        targetAgencies: profile.targetAgencies,
      },
      lastRun: last,
      nextRun: last ? last + SCAN_INTERVAL_MS : null,
      stale: this.isStale(brandId),
      running: this.isRunning(brandId),
      mode: summary?.mode || null,
      totalFound: summary?.totalFound || 0,
      matchCount: summary?.matchCount || 0,
      // When the key is missing the stored summary is stale — always surface
      // the current search state instead.
      lastMessage: configured
        ? summary?.message || null
        : (await agentBrowserService.checkInstalled())
        ? 'No SAM.gov API key — the built-in browser agent searches SAM.gov without login (immune to the 90-day key rotation). Add your free key in Settings for faster structured results.'
        : 'SAM.gov API key required — add your free key in Settings > API Keys to enable daily scanning.',
    };
  }

  // ==================== Scan ====================

  /**
   * Build the targeted query set from the company profile:
   *  - one NAICS-filtered query per NAICS code (up to 3) — the core targeting
   *  - the top learned keywords (win/bid-proven), then core profile keywords
   */
  buildTargetedQueries(profile: OpportunityProfile): ScanQuery[] {
    const queries: ScanQuery[] = [];

    const naics = Array.from(
      new Set(profile.naicsCodes.map(c => String(c).trim()).filter(c => /^\d{4,6}$/.test(c)))
    ).slice(0, 3);
    for (const n of naics) {
      queries.push({ naicsCode: n });
    }

    const learned = [...profile.learnedKeywords]
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 2)
      .map(k => k.keyword);
    // Cover the top profile keywords so every "topic of interest" gets
    // searched daily (up to 3 NAICS + 2 learned + 5 core = 10 queries).
    const core = profile.keywords.slice(0, 6);

    for (const kw of [...learned, ...core]) {
      if (kw && queries.length < 10) queries.push(kw);
    }

    // De-duplicate (NAICS codes sometimes also appear as profile keywords)
    const seen = new Set<string>();
    return queries.filter(q => {
      const key = typeof q === 'string' ? `k:${q.toLowerCase()}` : `n:${q.naicsCode}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  /**
   * Start a scan for a brand. Honors the daily cadence unless `force` is set.
   * The scan itself runs in the background; poll getStatus() for completion.
   */
  async runScan(
    brandId: string,
    opts?: { force?: boolean; limit?: number }
  ): Promise<{ started: boolean; message: string }> {
    sqlDatabase.initialize();
    if (!(await this.canScan())) {
      return {
        started: false,
        message:
          'SAM.gov API key required — add your free key in Settings > API Keys (or install Edge/Chrome) to enable daily scanning.',
      };
    }
    if (this.isRunning(brandId)) {
      return { started: false, message: 'A scan is already running for this company.' };
    }
    if (!opts?.force && !this.isStale(brandId)) {
      const last = this.getLastRun(brandId);
      return {
        started: false,
        message: last
          ? `Scan is fresh — next automatic scan ${new Date(last + SCAN_INTERVAL_MS).toLocaleString()}.`
          : 'No scan has run yet.',
      };
    }

    this.running.add(brandId);
    sqlDatabase.setSetting(startedKey(brandId), String(Date.now()), 'daily_sam_scan');

    void this.execute(brandId, opts?.limit)
      .catch(e => {
        console.error('[DailySamScan] Scan failed:', e);
      })
      .finally(() => {
        this.running.delete(brandId);
        sqlDatabase.deleteSetting(startedKey(brandId));
      });

    return { started: true, message: 'Scan started.' };
  }

  /** The actual scan work. Records last_run + a summary on success. */
  private async execute(brandId: string, limit?: number): Promise<void> {
    const startedAt = Date.now();
    const errors: string[] = [];
    const brand = await brandWorkspace.getBrandById(brandId).catch(() => null);

    // Neither a key nor the browser agent is available — record a blocked
    // summary and stop (last_run is NOT recorded, so the next visit retries).
    if (!(await this.canScan())) {
      const summary: ScanSummary = {
        brandId,
        brandName: brand?.name || '',
        ranAt: Date.now(),
        durationMs: 0,
        mode: 'blocked',
        queries: [],
        totalFound: 0,
        matchCount: 0,
        topMatches: [],
        errors: ['No SAM.gov API key and no browser agent available'],
        message:
          'SAM.gov API key required — add your free key in Settings > API Keys (or install Edge/Chrome) to enable daily scanning.',
      };
      sqlDatabase.setSetting(lastSummaryKey(brandId), JSON.stringify(summary), 'daily_sam_scan');
      return;
    }

    try {
      let profile = opportunityScout.getProfile(brandId);
      if (profile.keywords.length === 0 && profile.naicsCodes.length === 0) {
        // No profile yet — build one from the brand's documents/projects first.
        profile = await opportunityScout.buildProfile(brandId);
      }

      const queries = this.buildTargetedQueries(profile);
      if (queries.length === 0) {
        throw new Error('Company profile has no NAICS codes or keywords to search with.');
      }

      const result = await opportunityScout.search(brandId, {
        queries,
        limit: limit || 20,
        sources: ['sam'],
      });

      const matches = result.opportunities.filter(o => o.fitScore > 0);
      const summary: ScanSummary = {
        brandId,
        brandName: brand?.name || '',
        ranAt: Date.now(),
        durationMs: Date.now() - startedAt,
        mode: result.mode,
        queries: result.queries,
        totalFound: result.opportunities.length,
        matchCount: matches.length,
        topMatches: matches.slice(0, 20),
        errors,
        message: result.message,
      };
      sqlDatabase.setSetting(lastRunKey(brandId), String(summary.ranAt), 'daily_sam_scan');
      sqlDatabase.setSetting(lastSummaryKey(brandId), JSON.stringify(summary), 'daily_sam_scan');
    } catch (e) {
      errors.push(e instanceof Error ? e.message : String(e));
      console.error('[DailySamScan] Scan error:', errors);
      // Note: last_run is intentionally NOT recorded on hard failure so the next
      // page visit retries rather than waiting out the 24h cadence.
    }
  }

  // ==================== Matches ====================

  /**
   * Load stored opportunities, re-score them against the *current* profile
   * (which self-improves as bids are won/lost), and return fit-score > 0 matches.
   */
  getMatches(brandId: string, opts?: { minScore?: number; limit?: number }): ScoredOpportunity[] {
    sqlDatabase.initialize();
    const profile = opportunityScout.getProfile(brandId);
    const stored = sqlDatabase.getSAMOpportunities();

    const seen = new Set<string>();
    const scored: ScoredOpportunity[] = [];
    for (const row of stored) {
      const opp = this.rowToOpportunity(row);
      if (!opp) continue;
      const key = opp.url || opp.solicitationNumber || opp.id;
      if (seen.has(key)) continue;
      seen.add(key);
      const s = opportunityScout.scoreOpportunity(opp, profile);
      if (s.fitScore > 0 && s.fitScore >= (opts?.minScore || 1)) {
        scored.push(s);
      }
    }

    scored.sort((a, b) => b.fitScore - a.fitScore);
    return scored.slice(0, opts?.limit || 100);
  }

  /** Map a raw sam_opportunities DB row back to our opportunity shape. */
  private rowToOpportunity(row: any): SAMOpportunity | null {
    if (!row || !row.title) return null;
    return {
      id: row.id,
      title: row.title,
      synopsis: row.synopsis || undefined,
      solicitationNumber: row.solicitation_number || row.id,
      postedDate: row.posted_date || undefined,
      responseDeadline: row.response_deadline || undefined,
      awardAmount: row.award_amount || undefined,
      naicsCode: row.naics_code || undefined,
      classificationCode: row.classification_code || undefined,
      agency: row.agency || undefined,
      office: row.office || undefined,
      location: row.location || undefined,
      url: row.url || undefined,
      keywords: row.keywords || [],
      matchedKeywords: row.matchedKeywords || [],
    };
  }
}

export const dailySamScan = DailySamScanService.getInstance();
