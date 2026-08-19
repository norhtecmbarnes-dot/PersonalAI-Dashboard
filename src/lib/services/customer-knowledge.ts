import { sqlDatabase } from '@/lib/database/sqlite';
import { brandWorkspace } from './brand-workspace';
import { performWebSearch } from '@/lib/websearch';
import { chatCompletion } from '@/lib/models/sdk.server';
import { sanitizePrompt } from '@/lib/utils/validation';
import { fetchTopPages, wikipediaSearch, type FetchedPage } from '@/lib/webpages';
import type { SearchResult } from '@/lib/websearch';

const DEFAULT_MODEL = 'ollama/glm-4.7-flash';

export interface CustomerIntelEntry {
  at: number;
  source: string; // 'solicitation' | 'outcome' | 'scout' | 'chat' | 'manual'
  type: string; // 'mission' | 'priority' | 'hot-button' | 'buying-pattern' | 'contact' | 'note' | 'outcome' | 'format' | 'requirement'
  content: string;
  projectId?: string;
  projectName?: string;
}

export interface CustomerKnowledgeRecord {
  id: string;
  brandId: string;
  name: string;
  aliases: string[];
  mission?: string;
  priorities: string[];
  hotButtons: string[];
  buyingPatterns: string[];
  keyContacts: string[];
  notes?: string;
  winCount: number;
  lossCount: number;
  bidCount: number;
  intel: CustomerIntelEntry[];
  metadata: Record<string, any>;
  /** Last known org chart markdown, rebuilt from public sources. */
  orgChart?: string;
  orgChartUpdatedAt?: number;
  createdAt: number;
  updatedAt: number;
}

interface OrgFinding extends SearchResult {
  query: string;
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

/** Normalize an agency/customer name for matching: lowercase, collapse spaces. */
export function normalizeCustomerName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\b(?:the|u\.?s\.?|united states)\b/g, ' ')
    .replace(/department of\s+/g, '')
    .replace(/\bagency\b/g, '')
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export class CustomerKnowledgeService {
  private static instance: CustomerKnowledgeService;

  private constructor() {}

  static getInstance(): CustomerKnowledgeService {
    if (!CustomerKnowledgeService.instance) {
      CustomerKnowledgeService.instance = new CustomerKnowledgeService();
    }
    return CustomerKnowledgeService.instance;
  }

  async getCustomers(brandId: string): Promise<CustomerKnowledgeRecord[]> {
    sqlDatabase.initialize();
    const rows = await sqlDatabase.all(
      'SELECT * FROM customers WHERE brand_id = ? ORDER BY updated_at DESC',
      [brandId]
    );
    return rows.map(r => this.mapRow(r));
  }

  async getCustomerById(id: string): Promise<CustomerKnowledgeRecord | null> {
    sqlDatabase.initialize();
    const row = await sqlDatabase.get('SELECT * FROM customers WHERE id = ?', [id]);
    return row ? this.mapRow(row) : null;
  }

  async findCustomer(
    brandId: string,
    name: string
  ): Promise<CustomerKnowledgeRecord | null> {
    sqlDatabase.initialize();
    const key = normalizeCustomerName(name);
    const rows = await sqlDatabase.all(
      'SELECT * FROM customers WHERE brand_id = ?',
      [brandId]
    );
    for (const row of rows) {
      const record = this.mapRow(row);
      if (
        normalizeCustomerName(record.name) === key ||
        record.aliases.some(a => normalizeCustomerName(a) === key)
      ) {
        return record;
      }
    }
    return null;
  }

  /**
   * Create a customer or merge the provided fields into the existing record
   * (matched by normalized name). New list fields are appended and deduped.
   */
  async upsertCustomer(
    brandId: string,
    data: Partial<Omit<CustomerKnowledgeRecord, 'id' | 'brandId' | 'createdAt' | 'updatedAt'>> & {
      name: string;
    }
  ): Promise<CustomerKnowledgeRecord> {
    sqlDatabase.initialize();
    const existing = await this.findCustomer(brandId, data.name);
    const now = Date.now();

    if (existing) {
      const merged: CustomerKnowledgeRecord = {
        ...existing,
        name: data.name || existing.name,
        aliases: unique([
          ...existing.aliases,
          ...(data.aliases || []),
          ...(normalizeCustomerName(data.name) !== normalizeCustomerName(existing.name)
            ? [data.name]
            : []),
        ]),
        mission: data.mission || existing.mission,
        priorities: unique([...existing.priorities, ...(data.priorities || [])]),
        hotButtons: unique([...existing.hotButtons, ...(data.hotButtons || [])]),
        buyingPatterns: unique([
          ...existing.buyingPatterns,
          ...(data.buyingPatterns || []),
        ]),
        keyContacts: unique([...existing.keyContacts, ...(data.keyContacts || [])]),
        notes: data.notes || existing.notes,
        updatedAt: now,
      };
      await sqlDatabase.run(
        `UPDATE customers SET name = ?, aliases = ?, mission = ?, priorities = ?,
         hot_buttons = ?, buying_patterns = ?, key_contacts = ?, notes = ?, updated_at = ?
         WHERE id = ?`,
        [
          merged.name,
          JSON.stringify(merged.aliases),
          merged.mission || null,
          JSON.stringify(merged.priorities),
          JSON.stringify(merged.hotButtons),
          JSON.stringify(merged.buyingPatterns),
          JSON.stringify(merged.keyContacts),
          merged.notes || null,
          now,
          existing.id,
        ]
      );
      return merged;
    }

    const record: CustomerKnowledgeRecord = {
      id: generateId(),
      brandId,
      name: data.name,
      aliases: unique(data.aliases || []),
      mission: data.mission,
      priorities: data.priorities || [],
      hotButtons: data.hotButtons || [],
      buyingPatterns: data.buyingPatterns || [],
      keyContacts: data.keyContacts || [],
      notes: data.notes,
      winCount: 0,
      lossCount: 0,
      bidCount: 0,
      intel: [],
      metadata: {},
      createdAt: now,
      updatedAt: now,
    };
    await sqlDatabase.run(
      `INSERT INTO customers (id, brand_id, name, aliases, mission, priorities,
       hot_buttons, buying_patterns, key_contacts, notes, win_count, loss_count,
       bid_count, intel, metadata, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 0, ?, ?, ?, ?)`,
      [
        record.id,
        record.brandId,
        record.name,
        JSON.stringify(record.aliases),
        record.mission || null,
        JSON.stringify(record.priorities),
        JSON.stringify(record.hotButtons),
        JSON.stringify(record.buyingPatterns),
        JSON.stringify(record.keyContacts),
        record.notes || null,
        JSON.stringify([]),
        JSON.stringify({}),
        now,
        now,
      ]
    );
    return record;
  }

  async deleteCustomer(id: string): Promise<void> {
    sqlDatabase.initialize();
    await sqlDatabase.run('DELETE FROM customers WHERE id = ?', [id]);
  }

  /** Append an intel entry (deduped) to a customer record. Creates the customer if needed. */
  async addIntel(
    brandId: string,
    customerName: string,
    entry: Omit<CustomerIntelEntry, 'at'>,
    createIfMissing = true
  ): Promise<CustomerKnowledgeRecord | null> {
    if (!customerName || !customerName.trim()) return null;
    sqlDatabase.initialize();

    let record = await this.findCustomer(brandId, customerName);
    if (!record) {
      if (!createIfMissing) return null;
      record = await this.upsertCustomer(brandId, { name: customerName });
    }

    const existingContents = new Set(
      record.intel.map(e => e.content.toLowerCase().slice(0, 120))
    );
    const content = entry.content.trim();
    if (!content || existingContents.has(content.toLowerCase().slice(0, 120))) {
      return record;
    }

    const now = Date.now();
    record.intel.unshift({ ...entry, content, at: now });
    record.intel = record.intel.slice(0, 200);
    record.updatedAt = now;

    // Fold the entry into the summary field for its type so the UI cards
    // surface it without scrolling the timeline.
    if (entry.type === 'hot-button') {
      record.hotButtons = unique([...record.hotButtons, content]);
    } else if (entry.type === 'priority') {
      record.priorities = unique([...record.priorities, content]);
    } else if (entry.type === 'buying-pattern') {
      record.buyingPatterns = unique([...record.buyingPatterns, content]);
    } else if (entry.type === 'contact') {
      record.keyContacts = unique([...record.keyContacts, content]);
    } else if (entry.type === 'mission') {
      record.mission = record.mission || content;
    }

    await sqlDatabase.run(
      `UPDATE customers SET intel = ?, hot_buttons = ?, priorities = ?,
       buying_patterns = ?, key_contacts = ?, mission = ?, updated_at = ? WHERE id = ?`,
      [
        JSON.stringify(record.intel),
        JSON.stringify(record.hotButtons),
        JSON.stringify(record.priorities),
        JSON.stringify(record.buyingPatterns),
        JSON.stringify(record.keyContacts),
        record.mission || null,
        now,
        record.id,
      ]
    );
    return record;
  }

  /** Bump win/loss/bid counters and log the outcome in the customer's intel. */
  async recordOutcome(
    brandId: string,
    customerName: string,
    outcome: 'win' | 'loss' | 'bid' | 'review',
    projectName?: string
  ): Promise<CustomerKnowledgeRecord | null> {
    if (!customerName || !customerName.trim()) return null;
    sqlDatabase.initialize();
    const record = await this.findCustomer(brandId, customerName);
    if (!record) return null;

    const now = Date.now();
    if (outcome === 'win') record.winCount += 1;
    else if (outcome === 'loss') record.lossCount += 1;
    else if (outcome === 'bid') record.bidCount += 1;

    record.updatedAt = now;
    await sqlDatabase.run(
      'UPDATE customers SET win_count = ?, loss_count = ?, bid_count = ?, updated_at = ? WHERE id = ?',
      [record.winCount, record.lossCount, record.bidCount, now, record.id]
    );
    await this.addIntel(brandId, customerName, {
      source: 'outcome',
      type: 'outcome',
      content: `${outcome.toUpperCase()}: ${projectName || customerName}${outcome === 'win' ? ' — winning themes and discriminators to reuse.' : outcome === 'loss' ? ' — review debrief for lessons.' : ' — submitted, awaiting decision.'}`,
      projectName,
    });
    return record;
  }

  /**
   * Self-improving extraction: scan a project (solicitation dissection, capture
   * document, win themes, milestones) and fold everything it learned about the
   * customer's mission, priorities, hot buttons, and buying patterns into the
   * customer's knowledge record.
   */
  async learnFromProject(
    brandId: string,
    projectId: string
  ): Promise<CustomerKnowledgeRecord | null> {
    sqlDatabase.initialize();
    const project = await brandWorkspace.getProjectById(projectId).catch(() => null);
    if (!project) return null;

    const meta = project.metadata || {};
    const intel = meta.solicitationIntel || {};
    const agency: string =
      (meta.agency as string) || (meta.opportunityName as string) || '';

    // Read the capture document directly (avoids importing bid-workflow, which
    // imports this service for its learning hook — no cycles).
    const captureRow = await sqlDatabase
      .get('SELECT * FROM capture_documents WHERE project_id = ?', [projectId])
      .catch(() => null);
    const capture = captureRow
      ? {
          extractedData: captureRow.extracted_data
            ? JSON.parse(captureRow.extracted_data)
            : {},
        }
      : null;

    const customerName = agency || capture?.extractedData?.agency || '';
    if (!customerName) return null;

    let record = await this.findCustomer(brandId, customerName);
    if (!record) {
      record = await this.upsertCustomer(brandId, {
        name: customerName,
        aliases: agency === customerName ? [] : [agency],
      });
    }

    // Mission — from the project description / scope of work
    const scope =
      capture?.extractedData?.scopeOfWork || project.description || intel?.summary || '';
    if (scope) {
      record = (await this.addIntel(brandId, customerName, {
        source: 'solicitation',
        type: 'mission',
        content: `Scope/mission: ${String(scope).slice(0, 600)}`,
        projectId,
        projectName: project.name,
      })) || record;
    }

    // Priorities — win themes and program focus
    const winThemes: string[] = Array.isArray(meta.winThemes)
      ? meta.winThemes
      : (capture?.extractedData?.winThemes as string[]) || [];
    for (const theme of winThemes.slice(0, 8)) {
      record = (await this.addIntel(brandId, customerName, {
        source: 'chat',
        type: 'priority',
        content: `Win theme / priority: ${String(theme).slice(0, 300)}`,
        projectId,
        projectName: project.name,
      })) || record;
    }

    // Hot buttons — how this customer evaluates and what they emphasize
    const scoring = Array.isArray(intel.scoring) ? intel.scoring : [];
    for (const s of scoring.slice(0, 8)) {
      const line = `Evaluates: ${s.criterion}${s.weight ? ` (${s.weight})` : ''}${s.description ? ` — ${s.description}` : ''}`;
      record = (await this.addIntel(brandId, customerName, {
        source: 'solicitation',
        type: 'hot-button',
        content: String(line).slice(0, 300),
        projectId,
        projectName: project.name,
      })) || record;
    }

    // Buying patterns — milestones, schedule, submission behavior
    const milestones = Array.isArray(intel.milestones) ? intel.milestones : [];
    const captureMilestones =
      (capture?.extractedData?.milestones as string[]) || [];
    const allMilestones = [
      ...milestones.map((m: any) => (m.date ? `${m.event} — ${m.date}` : m.event)),
      ...captureMilestones,
    ];
    for (const m of allMilestones.slice(0, 6)) {
      record = (await this.addIntel(brandId, customerName, {
        source: 'solicitation',
        type: 'buying-pattern',
        content: `Milestone: ${String(m).slice(0, 200)}`,
        projectId,
        projectName: project.name,
      })) || record;
    }

    // Format preferences
    const fmt = meta.formatGuide || intel.format || {};
    const fmtLines = Object.entries(fmt)
      .filter(([, v]) => v)
      .map(([k, v]) => `${k}: ${v}`);
    if (fmtLines.length) {
      record = (await this.addIntel(brandId, customerName, {
        source: 'solicitation',
        type: 'format',
        content: `Format preferences: ${fmtLines.join('; ')}`,
        projectId,
        projectName: project.name,
      })) || record;
    }

    // Compliance volume
    const complianceCount = Array.isArray(intel.compliance) ? intel.compliance.length : 0;
    if (complianceCount > 0) {
      record = (await this.addIntel(brandId, customerName, {
        source: 'solicitation',
        type: 'requirement',
        content: `${complianceCount} compliance requirements extracted from a recent solicitation.`,
        projectId,
        projectName: project.name,
      })) || record;
    }

    return record;
  }

  /**
   * Go out and collect the customer's current organization from public
   * sources (Wikipedia, agency .gov/.mil pages, search snippets), compile a
   * markdown org chart, and store it as the customer's "last known" org
   * structure. Re-running refreshes the chart as the org changes.
   */
  async buildOrgChartForCustomer(
    brandId: string,
    customerId: string,
    model?: string
  ): Promise<CustomerKnowledgeRecord | null> {
    sqlDatabase.initialize();
    const record = await this.getCustomerById(customerId);
    if (!record || record.brandId !== brandId) return null;

    const name = record.name;
    const year = new Date().getFullYear();
    const queries = [
      `${name} org chart leadership`,
      `${name} organization structure directorate office`,
      `${name} leadership ${year}`,
      `${name} headquarters organization`,
      `${name} key officials directory`,
    ].filter(q => q.trim().length > 3);

    // 1) Search the web for the agency's current organization. Filter out the
    //    DuckDuckGo placeholder hits that appear when no search API key is set.
    const findings: OrgFinding[] = [];
    for (const query of queries) {
      try {
        const results = await performWebSearch(query);
        for (const result of results.slice(0, 5)) {
          if (!result.title || !result.url) continue;
          let host = '';
          try {
            host = new URL(result.url).hostname.replace(/^www\./, '');
          } catch {
            continue;
          }
          if (host === 'duckduckgo.com') continue; // placeholder, not a source
          if (findings.some(f => f.url === result.url)) continue;
          findings.push({ ...result, query });
        }
      } catch (error) {
        console.error(`[CustomerKnowledge] Org search failed for "${query}":`, error);
      }
    }

    // 1b) Query Wikipedia directly — free and reliable even without search keys.
    for (const term of [name, `${name} organization`, `${name} leadership`]) {
      const hits = await wikipediaSearch(term, 4);
      for (const hit of hits) {
        if (findings.some(f => f.url === hit.url)) continue;
        findings.push({
          title: hit.title,
          url: hit.url,
          excerpt: 'Wikipedia — organization page',
          source: 'Wikipedia',
          query: term,
        });
      }
    }

    // 2) Fetch the highest-value pages (Wikipedia, .gov/.mil) for real content
    const pages = await fetchTopPages(findings, 5);

    // 3) Compile the org chart markdown
    let markdown = await this.compileCustomerOrgChart(name, findings, pages, model).catch(
      error => {
        console.error('[CustomerKnowledge] Org chart compile failed, using fallback:', error);
        return this.fallbackCustomerOrgChart(name, findings, pages);
      }
    );

    // 4) Store as the customer's last-known org chart
    const now = Date.now();
    await sqlDatabase.run(
      `UPDATE customers SET org_chart = ?, org_chart_updated_at = ?, updated_at = ? WHERE id = ?`,
      [markdown, now, now, customerId]
    );

    await this.addIntel(brandId, name, {
      source: 'scout',
      type: 'note',
      content: `Org chart rebuilt from public sources (${pages.length} page(s) fetched, ${findings.length} finding(s)) — as of ${new Date(now).toLocaleDateString()}.`,
    });

    return this.getCustomerById(customerId);
  }

  private async compileCustomerOrgChart(
    customerName: string,
    findings: OrgFinding[],
    pages: FetchedPage[],
    model?: string
  ): Promise<string> {
    const findingsText = findings
      .map((f, i) => `[${i + 1}] ${f.title}\nURL: ${f.url}\nSnippet: ${(f.excerpt || '').slice(0, 400)}`)
      .join('\n\n');

    const pagesText = pages.length
      ? pages
          .map(
            (p, i) =>
              `### Page ${i + 1}: ${p.title}\nURL: ${p.url}\n\n${p.text.slice(0, 5000)}`
          )
          .join('\n\n---\n\n')
      : 'No pages could be fetched.';

    const today = new Date().toLocaleDateString();
    const prompt = `You are a capture analyst compiling the current organizational chart of a government customer from public sources.

## Customer
${customerName}

## Web Findings (search results)
${findingsText || 'No web findings returned.'}

## Fetched Page Content (Wikipedia / government sites — highest-confidence sources)
${pagesText}

## Report Requirements
Write markdown with these sections:
1. ## Organization Overview — what the agency is, its mission, and how it is organized (e.g., secretariats, commands, directorates, program offices).
2. ## Org Structure — an indented text hierarchy (like an org chart), e.g.:\n   Agency\n   ├─ Office / Command\n   │   └─ Directorate / Program Office\n   Use the real structure found in the sources; where unknown write \"unknown\".
3. ## Key Leadership — a markdown table: | Position | Name | Office | Source |. Only include named individuals actually present in the sources.
4. ## Buying / Program Offices — the offices that issue and manage procurements for this customer.
5. ## Sources — a bulleted list of the URLs used.

Rules:
- Only use names and facts present in the findings or fetched page content. NEVER invent individuals or titles.
- The fetched page content is the most reliable source — prefer it over snippets.
- Note the chart reflects the organization \"as of ${today}\"; structures change.
- Cite claims with [1] or [Page N].
- If a section lacks data, write \"No public information found yet\".

Report:`;

    const result = await chatCompletion({
      model: model || DEFAULT_MODEL,
      messages: [{ role: 'user', content: sanitizePrompt(prompt, 45000) }],
      temperature: 0.2,
      maxTokens: 1800,
    });
    const content = result.message?.content || '';
    if (!content.trim()) throw new Error('Empty org chart from model');
    return content.trim();
  }

  private fallbackCustomerOrgChart(
    customerName: string,
    findings: OrgFinding[],
    pages: FetchedPage[]
  ): string {
    const today = new Date().toLocaleDateString();
    const lines = [
      `# Org Chart — ${customerName}`,
      '',
      `> As of ${today}. Compiled from public sources; verify before outreach.`,
      '',
      '## Org Structure',
      '',
      `${customerName}`,
      '├─ (structure not yet extracted — sources below)',
      '',
    ];

    if (pages.length > 0) {
      lines.push('## Sources Fetched', '');
      pages.forEach(p => {
        lines.push(`- **${p.title}**`);
        lines.push(`  ${p.url}`);
        lines.push(`  \n  ${p.text.slice(0, 600).replace(/\n+/g, ' ')}`);
      });
    } else if (findings.length > 0) {
      lines.push('## Web Findings', '');
      findings.forEach(f => {
        lines.push(`- **${f.title}** — ${f.excerpt || ''}`);
        lines.push(`  ${f.url}`);
      });
    } else {
      lines.push('No public web findings returned. Check search API keys and re-run.');
    }

    return lines.join('\n');
  }

  /**
   * Build the "invisible proposal" context block — the human's knowledge about
   * a customer that is NOT in the solicitation: mission, priorities, hot
   * buttons, buying patterns, key contacts, win/loss record, and captured
   * intel. This is injected into the partner chat and the proposal writer so
   * the AI writes discriminators grounded in what the human knows, while
   * keeping compliance facts from the solicitation separate.
   *
   * When no customer name is given, returns the brand's most-recently-updated
   * customers (capped) so the writer still sees relevant relationship
   * knowledge for agencies it has worked with.
   */
  async buildKnowledgeContext(
    brandId: string,
    customerName?: string,
    maxCustomers = 3
  ): Promise<string> {
    sqlDatabase.initialize();
    let records: CustomerKnowledgeRecord[] = [];

    if (customerName && customerName.trim()) {
      const found = await this.findCustomer(brandId, customerName);
      if (found) records = [found];
    }
    if (records.length === 0) {
      records = (await this.getCustomers(brandId)).slice(0, maxCustomers);
    }
    if (records.length === 0) return '';

    const blocks: string[] = [];
    for (const c of records.slice(0, maxCustomers)) {
      const lines: string[] = [
        `### ${c.name}`,
        `Relationship: ${c.bidCount} bid(s) · ${c.winCount} win(s) · ${c.lossCount} loss(es)`,
      ];
      if (c.mission) lines.push(`Mission: ${c.mission}`);
      if (c.priorities.length) {
        lines.push(`Priorities: ${c.priorities.slice(0, 8).join(' | ')}`);
      }
      if (c.hotButtons.length) {
        lines.push(`Hot buttons / evaluation emphasis: ${c.hotButtons.slice(0, 8).join(' | ')}`);
      }
      if (c.buyingPatterns.length) {
        lines.push(`Buying patterns / rhythms: ${c.buyingPatterns.slice(0, 6).join(' | ')}`);
      }
      if (c.keyContacts.length) {
        lines.push(`Known contacts: ${c.keyContacts.slice(0, 6).join(' | ')}`);
      }
      if (c.notes) lines.push(`Notes: ${c.notes}`);

      // Fresh, high-value intel from the timeline (skip outcomes already
      // summarized above; include only entries from the last ~2 years).
      const cutoff = Date.now() - 2 * 365 * 24 * 3600 * 1000;
      const recentIntel = c.intel
        .filter(e => e.at >= cutoff && e.type !== 'outcome')
        .slice(0, 10)
        .map(e => `- [${e.source}] ${e.content.slice(0, 240)}`);
      if (recentIntel.length) {
        lines.push(`Captured intel (${recentIntel.length}):`);
        lines.push(...recentIntel);
      }
      if (c.orgChart) {
        lines.push(`Org chart: available (${c.orgChartUpdatedAt ? new Date(c.orgChartUpdatedAt).toLocaleDateString() : 'date unknown'})`);
      }
      blocks.push(lines.join('\n'));
    }

    return [
      `## THE INVISIBLE PROPOSAL — human knowledge about this customer that is NOT in the solicitation`,
      `These are the human team's hard-won relationship facts (past bids, wins/losses, contacts, what this customer actually cares about). Use them to shape discriminators, win themes, and customer-tailored language. Treat them as TRUE but always phrased as claims the company can back. Never confuse them with the solicitation's compliance facts.`,
      '',
      ...blocks,
    ].join('\n');
  }

  private mapRow(row: any): CustomerKnowledgeRecord {
    const intel: CustomerIntelEntry[] = row.intel ? JSON.parse(row.intel) : [];
    const priorities: string[] = row.priorities ? JSON.parse(row.priorities) : [];
    const hotButtons: string[] = row.hot_buttons ? JSON.parse(row.hot_buttons) : [];
    const buyingPatterns: string[] = row.buying_patterns
      ? JSON.parse(row.buying_patterns)
      : [];
    const keyContacts: string[] = row.key_contacts ? JSON.parse(row.key_contacts) : [];

    // Backfill summary fields from the intel timeline (records created before
    // the fold-in logic was added still surface their learned entries).
    for (const entry of intel) {
      if (entry.type === 'hot-button') hotButtons.push(entry.content);
      else if (entry.type === 'priority') priorities.push(entry.content);
      else if (entry.type === 'buying-pattern') buyingPatterns.push(entry.content);
      else if (entry.type === 'contact') keyContacts.push(entry.content);
    }

    return {
      id: row.id,
      brandId: row.brand_id,
      name: row.name,
      aliases: row.aliases ? JSON.parse(row.aliases) : [],
      mission: row.mission || undefined,
      priorities: unique(priorities),
      hotButtons: unique(hotButtons),
      buyingPatterns: unique(buyingPatterns),
      keyContacts: unique(keyContacts),
      notes: row.notes || undefined,
      winCount: row.win_count || 0,
      lossCount: row.loss_count || 0,
      bidCount: row.bid_count || 0,
      intel,
      metadata: row.metadata ? JSON.parse(row.metadata) : {},
      orgChart: row.org_chart || undefined,
      orgChartUpdatedAt: row.org_chart_updated_at || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values.map(v => v.trim()).filter(Boolean)));
}

export const customerKnowledge = CustomerKnowledgeService.getInstance();
