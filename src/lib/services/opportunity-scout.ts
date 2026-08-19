import { sqlDatabase } from '@/lib/database/sqlite';
import { SamGovService } from './sam-gov';
import { brandWorkspace } from './brand-workspace';
import { bidWorkflowService } from './bid-workflow';
import { chatCompletion } from '@/lib/models/sdk.server';
import { agentBrowserService, type BrowserSnapshot } from '@/lib/browser/agent-browser-service';
import { performWebSearch } from '@/lib/websearch';
import type { SAMOpportunity, SAMSearchParams } from './sam-gov';
import type { Project } from '@/types/brand-workspace';

/**
 * Opportunity Scout — a self-learning opportunity searcher.
 *
 * The scout:
 *  1. Builds a company profile (products, capabilities, NAICS, keywords, target agencies,
 *     past performance) from the brand, its documents, and its proposals.
 *  2. Generates search queries from that profile — including "learned" keywords weighted
 *     by what has produced real bids and wins.
 *  3. Searches SAM.gov via the official API — the SAM.gov API key is REQUIRED
 *     (no browser-scrape fallback). It also searches customer-published sites
 *     depending on the target agencies in the profile: DIU (diu.mil), SSC Front
 *     Door (frontdoor.spaceforce.mil), AFWERX (afwerx.af.mil), and SBIR.gov / DoD
 *     SBIR.
 *  4. Scores every opportunity against the profile and stores the best fits.
 *  5. Learns: after a proposal is written / won / lost, it adjusts keyword weights and
 *     records the agencies, NAICS codes, and products that actually mattered.
 */

export interface LearnedKeyword {
  keyword: string;
  weight: number; // relative importance, grows with successful use
  source: string; // e.g. 'win', 'bid', 'user', 'profile'
  lastUpdated: number;
}

export interface OpportunityProfile {
  products: string[];
  capabilities: string[];
  naicsCodes: string[];
  keywords: string[];
  targetAgencies: string[];
  pastPerformance: string[];
  learnedKeywords: LearnedKeyword[];
  lastSearchAt?: number;
  searchCount: number;
  updatedAt: number;
}

export interface ScoredOpportunity extends SAMOpportunity {
  fitScore: number;
  reasons: string[];
  matchedKeywords: string[];
  source?: string; // 'sam' | 'diu' | 'ssc' | 'afwerx' | 'sbir' — where the lead came from
}

/**
 * Published opportunity sources beyond SAM.gov — customer/agency-specific portals.
 * Each source knows which target agencies make it relevant, so the scout searches
 * the right sites "depending on the customer."
 */
export interface OpportunitySourceInfo {
  id: string;
  label: string;
  site: string;
  url: string;
  agencies: string[]; // lower-case agency substrings that trigger this source
  queryBuilders: (query: string) => string[];
  /** URL to open in the browser agent when scraping this source's public listings. */
  searchUrl: (query: string) => string;
  /** Regex matched against link hrefs to identify result cards on that site. */
  linkPattern: RegExp;
}

export const OPPORTUNITY_SOURCES: OpportunitySourceInfo[] = [
  {
    id: 'sam',
    label: 'SAM.gov',
    site: 'sam.gov',
    url: 'https://sam.gov',
    agencies: [],
    queryBuilders: q => [q],
    searchUrl: q =>
      `https://sam.gov/search/?index=opp&keywords=${encodeURIComponent(q)}&sort=-modifiedDate`,
    linkPattern: /\/opp\//,
  },
  {
    id: 'diu',
    label: 'DIU (Defense Innovation Unit)',
    site: 'diu.mil',
    url: 'https://www.diu.mil',
    agencies: ['dod', 'defense', 'diu', 'army', 'navy', 'marine', 'air force', 'space force', 'joint'],
    queryBuilders: q => [`site:diu.mil ${q}`, `DIU prototype opportunity ${q}`],
    searchUrl: () => 'https://www.diu.mil/work-with-us',
    linkPattern: /diu\.mil\/(work-with-us|opportunit|projects)/i,
  },
  {
    id: 'ssc',
    label: 'SSC Front Door / SpaceWERX',
    site: 'frontdoor.spaceforce.mil',
    url: 'https://frontdoor.spaceforce.mil',
    agencies: ['space force', 'ssc', 'spacewerx', 'ussf'],
    queryBuilders: q => [`site:frontdoor.spaceforce.mil ${q}`, `SpaceWERX open topic ${q}`],
    searchUrl: () => 'https://frontdoor.spaceforce.mil',
    linkPattern: /frontdoor\.spaceforce\.mil\//i,
  },
  {
    id: 'afwerx',
    label: 'AFWERX',
    site: 'afwerx.af.mil',
    url: 'https://www.afwerx.af.mil',
    agencies: ['air force', 'afwerx', 'usaf'],
    queryBuilders: q => [`site:afwerx.af.mil ${q}`, `AFWERX Open Topic ${q}`],
    searchUrl: () => 'https://www.afwerx.af.mil/open-solicitations/',
    linkPattern: /afwerx\.af\.mil\//i,
  },
  {
    id: 'sbir',
    label: 'SBIR.gov / DoD SBIR',
    site: 'sbir.gov',
    url: 'https://www.sbir.gov',
    agencies: ['dod', 'defense', 'sbir', 'sttr', 'army', 'navy', 'air force', 'space force', 'dhs', 'nasa'],
    queryBuilders: q => [`site:sbir.gov topic ${q}`, `DoD SBIR/STTR ${q}`],
    searchUrl: q => `https://www.sbir.gov/topics/search?keywords=${encodeURIComponent(q)}`,
    linkPattern: /\/topics\//i,
  },
];

export interface LearnEvent {
  projectId: string;
  projectName: string;
  outcome: string; // 'win' | 'loss' | 'bid' | 'review'
  agency?: string;
  naicsCodes: string[];
  keywords: string[];
  learnedAt: number;
}

const DEFAULT_MODEL = 'ollama/glm-4.7-flash';

function profileKey(brandId: string): string {
  return `opportunity_profile:${brandId}`;
}

function learnKey(brandId: string): string {
  return `opportunity_learn_events:${brandId}`;
}

const EMPTY_PROFILE: OpportunityProfile = {
  products: [],
  capabilities: [],
  naicsCodes: [],
  keywords: [],
  targetAgencies: [],
  pastPerformance: [],
  learnedKeywords: [],
  searchCount: 0,
  updatedAt: Date.now(),
};

export class OpportunityScoutService {
  private static instance: OpportunityScoutService;

  private constructor() {}

  static getInstance(): OpportunityScoutService {
    if (!OpportunityScoutService.instance) {
      OpportunityScoutService.instance = new OpportunityScoutService();
    }
    return OpportunityScoutService.instance;
  }

  // ==================== Profile ====================

  getProfile(brandId: string): OpportunityProfile {
    sqlDatabase.initialize();
    try {
      const stored = sqlDatabase.getSetting(profileKey(brandId));
      if (stored) {
        const parsed = JSON.parse(stored);
        return { ...EMPTY_PROFILE, ...parsed };
      }
    } catch (e) {
      console.error('[OpportunityScout] Failed to load profile:', e);
    }
    return { ...EMPTY_PROFILE };
  }

  saveProfile(brandId: string, profile: OpportunityProfile): void {
    sqlDatabase.initialize();
    profile.updatedAt = Date.now();
    try {
      sqlDatabase.setSetting(profileKey(brandId), JSON.stringify(profile), 'opportunity_scout');
    } catch (e) {
      console.error('[OpportunityScout] Failed to save profile:', e);
    }
  }

  getLearnEvents(brandId: string): LearnEvent[] {
    sqlDatabase.initialize();
    try {
      const stored = sqlDatabase.getSetting(learnKey(brandId));
      if (stored) return JSON.parse(stored) as LearnEvent[];
    } catch (e) {
      console.error('[OpportunityScout] Failed to load learn events:', e);
    }
    return [];
  }

  /** Build (or rebuild) the company profile from brand info, documents, and past projects. */
  async buildProfile(brandId: string, model?: string): Promise<OpportunityProfile> {
    sqlDatabase.initialize();
    const existing = this.getProfile(brandId);

    const brand = await brandWorkspace.getBrandById(brandId).catch(() => null);
    const documents = await brandWorkspace.getBrandDocuments(brandId).catch(() => []);
    const projects = await brandWorkspace.getProjects(brandId).catch(() => [] as Project[]);
    const bidProjects = projects.filter(p => p.type === 'bid' || p.type === 'proposal');

    const sourceText = [
      `Company: ${brand?.name || ''}`,
      `Industry: ${brand?.industry || ''}`,
      `Description: ${brand?.description || ''}`,
      `Website: ${brand?.website || ''}`,
      `Tags: ${(brand?.tags || []).join(', ')}`,
      '',
      '## Company documents (products, capabilities, past proposals)',
      documents
        .slice(0, 10)
        .map(d => `### ${d.title}\n${(d.compactedContent || d.content || '').slice(0, 2500)}`)
        .join('\n\n'),
      '',
      '## Past bid / proposal projects',
      bidProjects
        .slice(0, 10)
        .map(p => `- ${p.name}: ${p.description || ''} (${p.status})`)
        .join('\n'),
    ].join('\n');

    let extracted: Partial<OpportunityProfile> = {};
    try {
      const prompt = `${sourceText}

## TASK
You are building a search profile for a company that bids on government contracts. Analyze the company information, products, and past proposals above and extract:

- products: array of product/service offerings (short names)
- capabilities: array of capability areas (e.g. 'cybersecurity', 'cloud migration', 'EHR implementation')
- naicsCodes: array of likely NAICS codes the company would bid under (6-digit)
- keywords: array of search keywords an agency would use to find these services
- targetAgencies: array of likely customer agencies (e.g. 'VA', 'DHS', 'DoD') — only those supported by evidence
- pastPerformance: array of short past performance descriptors

Respond with STRICT JSON only, no markdown, no commentary:
{"products":[],"capabilities":[],"naicsCodes":[],"keywords":[],"targetAgencies":[],"pastPerformance":[]}`;

      const res = await chatCompletion({
        model: model || DEFAULT_MODEL,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2,
      });
      const content = (res?.message?.content || '').trim();
      const jsonStart = content.indexOf('{');
      const jsonEnd = content.lastIndexOf('}');
      if (jsonStart >= 0 && jsonEnd > jsonStart) {
        extracted = JSON.parse(content.slice(jsonStart, jsonEnd + 1));
      }
    } catch (e) {
      console.error('[OpportunityScout] Profile extraction failed:', e);
    }

    // Heuristic fallback so the profile is never empty
    const keywords = new Set<string>(existing.keywords);
    (extracted.keywords || []).forEach((k: string) => k && keywords.add(k));
    (extracted.capabilities || []).forEach((c: string) => c && keywords.add(c.toLowerCase()));
    (brand?.tags || []).forEach((t: string) => keywords.add(t.toLowerCase()));

    const profile: OpportunityProfile = {
      products: unique([...(existing.products), ...(extracted.products || [])]),
      capabilities: unique([...(existing.capabilities), ...(extracted.capabilities || [])]),
      naicsCodes: unique([...(existing.naicsCodes), ...(extracted.naicsCodes || [])]),
      keywords: Array.from(keywords).slice(0, 40),
      targetAgencies: unique([...(existing.targetAgencies), ...(extracted.targetAgencies || [])]),
      pastPerformance: unique([...(existing.pastPerformance), ...(extracted.pastPerformance || [])]),
      learnedKeywords: existing.learnedKeywords,
      lastSearchAt: existing.lastSearchAt,
      searchCount: existing.searchCount,
      updatedAt: Date.now(),
    };

    this.saveProfile(brandId, profile);
    return profile;
  }

  /** Generate search queries from the profile — learned keywords weighted highest. */
  generateQueries(profile: OpportunityProfile, limit: number = 6): string[] {
    const queries: string[] = [];

    const ranked = [...profile.learnedKeywords]
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 4)
      .map(k => k.keyword);
    const core = profile.keywords.slice(0, 4);

    // Product + service queries (these find real solicitations)
    for (const kw of [...ranked, ...core]) {
      if (kw && queries.length < limit) queries.push(kw);
    }

    // NAICS-based queries
    for (const naics of profile.naicsCodes.slice(0, 2)) {
      if (queries.length < limit) queries.push(naics);
    }

    return queries.filter((q, i) => queries.indexOf(q) === i).slice(0, limit);
  }

  // ==================== Searching ====================

  isApiConfigured(): boolean {
    sqlDatabase.initialize();
    return !!sqlDatabase.getApiKey('sam');
  }

  /** Which published sources to search, given the profile's target agencies. */
  applicableSources(profile: OpportunityProfile, requested?: string[]): OpportunitySourceInfo[] {
    const wanted = new Set(requested && requested.length > 0 ? requested : OPPORTUNITY_SOURCES.map(s => s.id));
    const agencies = (profile.targetAgencies || []).map((a: string) => a.toLowerCase());
    return OPPORTUNITY_SOURCES.filter(s => {
      if (!wanted.has(s.id)) return false;
      if (s.id === 'sam' || agencies.length === 0) return true;
      // "Depending on the customer": only search a portal if the profile targets
      // an agency the portal publishes for.
      return s.agencies.some(a => agencies.some(ag => ag.includes(a)));
    });
  }

  /** Search a customer-published site (DIU, SSC Front Door, AFWERX, SBIR.gov…) via web search. */
  private async webSourceSearch(
    source: OpportunitySourceInfo,
    query: string,
    resultsLimit: number
  ): Promise<SAMOpportunity[]> {
    const found: SAMOpportunity[] = [];
    const seenUrls = new Set<string>();
    for (const builderQuery of source.queryBuilders(query)) {
      if (found.length >= resultsLimit) break;
      try {
        const results = await performWebSearch(builderQuery);
        for (const r of results.slice(0, 5)) {
          if (!r.title || !r.url || seenUrls.has(r.url)) continue;
          seenUrls.add(r.url);
          found.push({
            id: `${source.id}_${Date.now()}_${found.length}`,
            title: r.title.replace(/\s*\|\s*.*$/, '').trim(),
            synopsis: r.excerpt || `Discovered via ${source.label} — open the link to review.`,
            solicitationNumber: `${source.id.toUpperCase()}-${Date.now()}-${found.length}`,
            agency: source.label,
            url: r.url,
            keywords: [query],
          });
          if (found.length >= resultsLimit) break;
        }
      } catch (e) {
        console.error(`[OpportunityScout] ${source.label} search failed for "${builderQuery}":`, e);
      }
    }
    return found;
  }

  /**
   * Search SAM.gov + customer-published sites for each query, score, and store the best fits.
   * A query can be a plain keyword string, or `{ keyword, naicsCode, pscCode }` to target a
   * specific NAICS/PSC category on SAM.gov (used by the daily targeted scan).
   */
  async search(
    brandId: string,
    opts?: {
      limit?: number;
      queries?: Array<string | { keyword?: string; naicsCode?: string; pscCode?: string }>;
      sources?: string[];
    }
  ): Promise<{
    success: boolean;
    mode: 'api' | 'none';
    queries: string[];
    opportunities: ScoredOpportunity[];
    profile: OpportunityProfile;
    sourcesUsed: string[];
    message?: string;
  }> {
    sqlDatabase.initialize();
    let profile = this.getProfile(brandId);
    if (profile.keywords.length === 0) {
      profile = await this.buildProfile(brandId);
    }

    const rawQueries =
      opts?.queries && opts.queries.length > 0 ? opts.queries : this.generateQueries(profile);
    const queries = rawQueries.slice(0, 8);
    const displayQueries = queries.map(q =>
      typeof q === 'string' ? q : q.keyword || q.naicsCode || q.pscCode || ''
    );
    const sources = this.applicableSources(profile, opts?.sources);
    const webSources = sources.filter(s => s.id !== 'sam');

    const all: SAMOpportunity[] = [];
    let mode: 'api' | 'none' = 'none';
    const apiKey = sqlDatabase.getApiKey('sam');
    const wantsSam = sources.some(s => s.id === 'sam');

    // SAM.gov searching REQUIRES the official API key — no browser-scrape
    // fallback. Without a key, SAM queries are skipped entirely and the
    // response explains how to enable searching.
    for (const query of queries) {
      const keyword = typeof query === 'string' ? query : query.keyword;
      const naicsCode = typeof query === 'string' ? undefined : query.naicsCode;
      const pscCode = typeof query === 'string' ? undefined : query.pscCode;
      const searchTerm = keyword || naicsCode || pscCode || '';
      if (!apiKey) continue;
      try {
        const params: SAMSearchParams = {
          ...(keyword ? { keyword } : {}),
          limit: Math.min(opts?.limit || 15, 50),
          ...(naicsCode ? { naicsCode } : {}),
          ...(pscCode ? { pscCode } : {}),
        };
        const res = await SamGovService.getInstance().search(params);
        if (res.success && res.opportunities) {
          all.push(
            ...res.opportunities.map((o: SAMOpportunity) => ({ ...o, keywords: [searchTerm], source: 'sam' }))
          );
          mode = 'api';
        }
      } catch (e) {
        console.error(`[OpportunityScout] SAM API search failed for "${searchTerm}":`, e);
      }
    }

    // Customer-published sites: DIU, SSC Front Door, AFWERX, SBIR.gov…
    for (const source of webSources) {
      for (const query of displayQueries.slice(0, 3)) {
        const found = await this.webSourceSearch(source, query, 5);
        all.push(...found.map(o => ({ ...o, source: source.id })));
      }
      // Browser scrape of the source's public listings (once per source — the
      // landing pages aren't keyword-scoped, so one pass is enough).
      try {
        const scraped = await this.scrapeSource(source, displayQueries[0] || '', 5);
        all.push(...scraped.map(o => ({ ...o, source: source.id })));
      } catch (e) {
        console.error(`[OpportunityScout] ${source.label} scrape failed:`, e);
      }
    }

    if (all.length === 0) {
      return {
        success: false,
        mode,
        queries: displayQueries,
        opportunities: [],
        profile,
        sourcesUsed: sources.map(s => s.id),
        message: apiKey
          ? wantsSam && queries.length > 0
            ? 'No opportunities found. Try adding more keywords to the profile.'
            : 'No opportunities found on the selected sources.'
          : wantsSam
          ? 'SAM.gov API key required — searching is disabled until you add your free key in Settings > API Keys (SAM.gov).'
          : 'No opportunities found on the selected sources.',
      };
    }

    // De-duplicate by solicitation number (SAM) or URL (web sources)
    const seen = new Set<string>();
    const scored: ScoredOpportunity[] = [];
    for (const opp of all) {
      const key = opp.url || opp.solicitationNumber || opp.id;
      if (seen.has(key)) continue;
      seen.add(key);
      scored.push(this.scoreOpportunity(opp, profile));
    }

    scored.sort((a, b) => b.fitScore - a.fitScore);

    // Store high-fit opportunities
    const searchId = `scout_${Date.now()}`;
    try {
      sqlDatabase.addSAMSearch(searchId, displayQueries, { brandId, limit: scored.length });
      for (const opp of scored.slice(0, 20)) {
        sqlDatabase.addSAMOpportunity(
          { ...opp, keywords: opp.matchedKeywords },
          searchId
        );
      }
      sqlDatabase.updateSAMSearch(searchId, { resultsCount: scored.length, lastRun: Date.now() });
    } catch (e) {
      console.error('[OpportunityScout] Failed to store results:', e);
    }

    profile.lastSearchAt = Date.now();
    profile.searchCount = (profile.searchCount || 0) + 1;
    this.saveProfile(brandId, profile);

    return {
      success: true,
      mode,
      queries: displayQueries,
      opportunities: scored,
      profile,
      sourcesUsed: sources.map(s => s.id),
    };
  }

  /**
   * Scrape a published source's public listings with the browser agent.
   * Opens the source's search/opportunities URL, waits for render, then extracts
   * real result cards (title, link, and — for SAM.gov — solicitation number and
   * response deadline) from a full-page snapshot. Returns [] on any failure so the
   * caller can fall back to search-engine results.
   */
  private async scrapeSource(
    source: OpportunitySourceInfo,
    query: string,
    maxResults: number = 6
  ): Promise<SAMOpportunity[]> {
    let snapshot: BrowserSnapshot;
    try {
      const url = source.searchUrl(query);
      const opened = await agentBrowserService.open(url);
      if (!opened.success) return [];
      // Let the SPA render results (SAM.gov, SBIR.gov are JS apps).
      await new Promise(r => setTimeout(r, 4000));
      snapshot = await agentBrowserService.snapshot({ interactiveOnly: false, timeout: 15000 });
    } catch (e) {
      console.error(`[OpportunityScout] ${source.label} scrape failed:`, e);
      return [];
    }
    return this.parseScrapedResults(snapshot, source, query, maxResults);
  }

  /** Turn a full-page snapshot into opportunity records for one source. */
  private parseScrapedResults(
    snapshot: BrowserSnapshot,
    source: OpportunitySourceInfo,
    query: string,
    maxResults: number
  ): SAMOpportunity[] {
    const out: SAMOpportunity[] = [];
    const seen = new Set<string>();
    const elements = snapshot.elements || [];

    // 1) Result cards: elements whose href matches the source's link pattern.
    //    On SAM.gov these are /opp/{uuid} deep links; on SBIR.gov /topics/… links;
    //    on AFWERX/SSC/DIU the card links on their opportunity pages.
    for (let i = 0; i < elements.length && out.length < maxResults; i++) {
      const el = elements[i];
      const attrs = el.attributes || {};
      const href = attrs.href || attrs.HREF || '';
      if (!href || !source.linkPattern.test(href)) continue;

      const title = (el.text || '').trim();
      // Skip nav/link-words — real result titles are substantive.
      if (title.length < 12) continue;
      if (seen.has(href)) continue;
      seen.add(href);

      const opportunity = this.cardToOpportunity(
        { title, href },
        elements,
        i,
        source,
        query
      );
      out.push(opportunity);
    }

    // 2) SAM.gov fallback: if no /opp/ links surfaced (page layout changed), grab
    //    any text that reads like an opportunity title.
    if (out.length === 0 && source.id === 'sam') {
      const titlePattern = /(?:Solicitation|Opportunity|Combined Synopsis|Presolicitation)/i;
      for (const el of elements) {
        const text = (el.text || '').trim();
        if (!titlePattern.test(text) || text.length < 15) continue;
        const href = (el.attributes || {}).href || source.searchUrl(query);
        if (seen.has(href)) continue;
        seen.add(href);
        out.push(
          this.cardToOpportunity({ title: text, href }, elements, 0, source, query)
        );
        if (out.length >= maxResults) break;
      }
    }

    return out;
  }

  /** Build a SAMOpportunity from a scraped card, scanning nearby elements for details. */
  private cardToOpportunity(
    card: { title: string; href: string },
    elements: BrowserSnapshot['elements'],
    index: number,
    source: OpportunitySourceInfo,
    query: string
  ): SAMOpportunity {
    const solicitationRe = /(?:solicitation\s*(?:number|#)?\s*:?\s*)?\b([A-Z]{1,8}\d{4,6}[A-Z]{0,4}\d{3,6})\b/i;
    const dateRe = /\b(\d{1,2}\/\d{1,2}\/\d{4})\b/;
    let solicitationNumber = '';
    let responseDeadline: string | undefined;
    let agency: string | undefined;

    // Scan a window around the card for label:value pairs (SAM.gov cards list
    // "Solicitation Number", "Posted Date", "Response Date", "Agency").
    for (let j = Math.max(0, index - 3); j < Math.min(elements.length, index + 25); j++) {
      const text = (elements[j].text || '').trim();
      if (!solicitationNumber) {
        const m = text.match(solicitationRe);
        // Ignore tokens that are really part of a title or UUID.
        if (m && !/^[0-9a-f]{32}$/i.test(m[1]) && text.length < 120) {
          solicitationNumber = m[1].toUpperCase();
        }
      }
      if (!responseDeadline) {
        if (/response\s*date|response\s*deadline|due\s*date/i.test(text)) {
          const dm = text.match(dateRe);
          if (dm) responseDeadline = dm[1];
        }
      }
      if (!agency && /^\s*agency\s*[:]?/i.test(text)) {
        agency = text.replace(/^\s*agency\s*[:]?\s*/i, '').trim() || undefined;
      }
    }

    return {
      id: `${source.id}_${Date.now()}_${outCounter()}`,
      title: card.title.slice(0, 200),
      synopsis: `Discovered via browser scrape of ${source.label} — open the link to review.`,
      solicitationNumber: solicitationNumber || `${source.id.toUpperCase()}-SCRAPE-${outCounter()}`,
      responseDeadline,
      agency: agency || source.label,
      url: new URL(card.href, source.url).toString(),
      keywords: [query],
    };
  }

  // ==================== Scoring ====================

  scoreOpportunity(opp: SAMOpportunity, profile: OpportunityProfile): ScoredOpportunity {
    const reasons: string[] = [];
    const matchedKeywords: string[] = [];
    const text = `${opp.title} ${opp.synopsis || ''}`.toLowerCase();
    let score = 0;

    // Learned keywords carry more weight
    for (const lk of profile.learnedKeywords) {
      if (text.includes(lk.keyword.toLowerCase())) {
        score += 8 + lk.weight;
        matchedKeywords.push(lk.keyword);
        reasons.push(`Learned keyword "${lk.keyword}" (weight ${lk.weight})`);
      }
    }

    // Core keywords
    for (const kw of profile.keywords) {
      if (kw && text.includes(kw.toLowerCase())) {
        score += 6;
        matchedKeywords.push(kw);
      }
    }

    // NAICS match
    if (opp.naicsCode && profile.naicsCodes.some(n => n === opp.naicsCode)) {
      score += 25;
      reasons.push(`NAICS ${opp.naicsCode} matches profile`);
    }

    // Agency match
    if (opp.agency && profile.targetAgencies.some(a => opp.agency!.toLowerCase().includes(a.toLowerCase()))) {
      score += 15;
      reasons.push(`Agency ${opp.agency} is a target`);
    }

    // Product match
    for (const prod of profile.products) {
      if (prod && text.includes(prod.toLowerCase())) {
        score += 10;
        matchedKeywords.push(prod);
      }
    }

    const fitScore = Math.min(100, Math.round(score));
    return {
      ...opp,
      fitScore,
      reasons: reasons.slice(0, 5),
      matchedKeywords: unique(matchedKeywords).slice(0, 6),
    };
  }

  // ==================== Learning ====================

  /**
   * Learn from a project outcome. Called after a proposal is written, won, or lost:
   * reads the capture document + project metadata, extracts the signals that mattered,
   * and boosts the profile's keyword/NAICS/agency weights accordingly.
   */
  async learnFromProject(
    brandId: string,
    projectId: string,
    outcome: 'win' | 'loss' | 'bid' | 'review' = 'bid',
    model?: string
  ): Promise<{ profile: OpportunityProfile; event: LearnEvent }> {
    sqlDatabase.initialize();
    const profile = this.getProfile(brandId);
    const project = await brandWorkspace.getProjectById(projectId).catch(() => null);
    if (!project) throw new Error('Project not found');

    const capture = await bidWorkflowService.getCaptureDocumentByProject(projectId).catch(() => null);
    const agency = capture?.extractedData?.agency || (project.metadata?.agency as string) || '';
    const naics =
      ((capture?.extractedData as any)?.naicsCode as string) ||
      (project.metadata?.naicsCode as string) ||
      '';
    const winThemes: string[] = (capture?.extractedData?.winThemes as string[]) || [];

    let llmKeywords: string[] = [];
    try {
      const prompt = `A company bid on this government opportunity:
Project: ${project.name}
Description: ${project.description || ''}
Agency: ${agency}
Win themes: ${winThemes.join('; ') || 'none'}
Key requirements: ${((capture?.extractedData?.keyRequirements as string[]) || []).join('; ') || 'none'}
Outcome: ${outcome}

Extract the 10 most important keywords/terms that describe this opportunity's domain, technology, and services — the terms a search for similar future opportunities should use. Respond with STRICT JSON only: {"keywords":[]}`;
      const res = await chatCompletion({
        model: model || DEFAULT_MODEL,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2,
      });
      const content = (res?.message?.content || '').trim();
      const start = content.indexOf('{');
      const end = content.lastIndexOf('}');
      if (start >= 0 && end > start) {
        const parsed = JSON.parse(content.slice(start, end + 1));
        llmKeywords = Array.isArray(parsed.keywords) ? parsed.keywords : [];
      }
    } catch (e) {
      console.error('[OpportunityScout] Learn extraction failed:', e);
    }

    // Heuristic keywords from the project + capture as fallback
    const heuristic = [
      ...(project.description || '').split(/[^a-zA-Z0-9]+/).filter(w => w.length > 4),
      ...(winThemes || []),
    ];
    const signals = unique([...llmKeywords, ...heuristic]).slice(0, 12);

    // Outcome multiplier: wins boost a lot, bids moderately, losses slightly
    const boost = outcome === 'win' ? 3 : outcome === 'bid' ? 1.5 : outcome === 'loss' ? 0.5 : 1;

    const learned = new Map(profile.learnedKeywords.map(k => [k.keyword.toLowerCase(), k]));
    for (const sig of signals) {
      const key = sig.toLowerCase();
      const existing = learned.get(key);
      if (existing) {
        existing.weight = Math.min(10, existing.weight + boost);
        existing.lastUpdated = Date.now();
      } else {
        learned.set(key, { keyword: key, weight: boost, source: outcome, lastUpdated: Date.now() });
      }
    }

    // Add the NAICS + agency to the profile so future searches hit them
    if (naics && !profile.naicsCodes.includes(naics)) profile.naicsCodes.push(naics);
    if (agency && !profile.targetAgencies.some(a => agency.toLowerCase().includes(a.toLowerCase()))) {
      profile.targetAgencies.push(agency);
    }

    profile.learnedKeywords = Array.from(learned.values())
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 30);
    this.saveProfile(brandId, profile);

    const event: LearnEvent = {
      projectId,
      projectName: project.name,
      outcome,
      agency: agency || undefined,
      naicsCodes: naics ? [naics] : [],
      keywords: signals,
      learnedAt: Date.now(),
    };
    const events = this.getLearnEvents(brandId);
    events.unshift(event);
    try {
      sqlDatabase.setSetting(learnKey(brandId), JSON.stringify(events.slice(0, 50)), 'opportunity_scout');
    } catch (e) {
      console.error('[OpportunityScout] Failed to save learn event:', e);
    }

    // Self-improving customer knowledge: record the outcome against the
    // customer (agency) record and fold the project's intelligence into it.
    if (agency) {
      try {
        const { customerKnowledge } = await import('./customer-knowledge');
        await customerKnowledge.recordOutcome(brandId, agency, outcome, project.name);
        await customerKnowledge.learnFromProject(brandId, projectId);
      } catch (e) {
        console.error('[OpportunityScout] Customer knowledge update failed:', e);
      }
    }

    return { profile, event };
  }
}

function unique<T>(arr: T[]): T[] {
  return Array.from(new Set(arr.filter(Boolean)));
}

let _outCounter = 0;
function outCounter(): number {
  _outCounter += 1;
  return _outCounter;
}

export const opportunityScout = OpportunityScoutService.getInstance();
