import * as fs from 'fs';
import * as path from 'path';
import { brandWorkspace } from './brand-workspace';
import { sqlDatabase } from '@/lib/database/sqlite';
import { performWebSearch } from '@/lib/websearch';
import { chatCompletion } from '@/lib/models/sdk.server';
import { sanitizePrompt } from '@/lib/utils/validation';
import { fetchTopPages, wikipediaSearch, type FetchedPage } from '@/lib/webpages';
import type { SearchResult } from '@/lib/websearch';

const DEFAULT_MODEL = 'ollama/glm-4.7-flash';

export interface ProcurementResearchResult {
  markdown: string;
  filePath: string | null;
  outputId: string | null;
  findingsCount: number;
  queries: string[];
}

interface Finding extends SearchResult {
  query: string;
}

/**
 * Search agent for procurements. Runs web searches about the opportunity
 * (budget, interested customers, competition, news — whatever is public
 * domain) and writes a self-contained markdown report to
 * data/research/<projectId>-research.md, plus a generated output so the
 * report is visible in the app.
 */
class ProcurementResearchService {
  private static instance: ProcurementResearchService;

  private constructor() {}

  static getInstance(): ProcurementResearchService {
    if (!ProcurementResearchService.instance) {
      ProcurementResearchService.instance = new ProcurementResearchService();
    }
    return ProcurementResearchService.instance;
  }

  async runResearch(projectId: string, model?: string): Promise<ProcurementResearchResult> {
    const project = await brandWorkspace.getProjectById(projectId);
    if (!project) {
      throw new Error('Procurement not found');
    }

    const brand = await brandWorkspace.getBrandById(project.brandId);
    const metadata = project.metadata || {};

    const agency = (metadata.agency as string) || '';
    const program = (metadata.opportunityName as string) || project.name;
    const solicitation = (metadata.solicitationNumber as string) || '';
    const company = brand?.name || '';

    // Build search queries covering public-domain intel about the opportunity
    const base = [program, agency, solicitation].filter(Boolean).join(' ');
    const queries = [
      `${base} budget funding`,
      `${base} contract award`,
      `${base} competition`,
      `${base} news`,
    ].filter(q => q.trim().length > 3);

    // Run the searches
    const findings: Finding[] = [];
    for (const query of queries) {
      try {
        const results = await performWebSearch(query);
        for (const result of results.slice(0, 4)) {
          if (!result.title || !result.url) continue;
          if (findings.some(f => f.url === result.url)) continue;
          findings.push({ ...result, query });
        }
      } catch (error) {
        console.error(`[ProcurementResearch] Search failed for "${query}":`, error);
      }
    }

    // Compile the report (LLM narrative with a deterministic fallback)
    let markdown: string;
    try {
      markdown = await this.compileReport(
        { program, agency, solicitation, company },
        findings,
        model
      );
    } catch (error) {
      console.error('[ProcurementResearch] Report compilation failed, using fallback:', error);
      markdown = this.fallbackMarkdown({ program, agency, solicitation, company }, findings);
    }

    // Store in a separate markdown file
    let filePath: string | null = null;
    try {
      const dir = path.join(process.cwd(), 'data', 'research');
      fs.mkdirSync(dir, { recursive: true });
      const file = path.join(dir, `${projectId}-research.md`);
      fs.writeFileSync(file, markdown, 'utf-8');
      filePath = file;
    } catch (error) {
      console.error('[ProcurementResearch] Could not write research file:', error);
    }

    // Also save as a generated output so it appears in the app
    let outputId: string | null = null;
    try {
      const output = await brandWorkspace.saveGeneratedOutput(projectId, {
        type: 'report',
        title: `Market Research — ${program}`,
        content: markdown,
        format: 'markdown',
      });
      outputId = output.id;
    } catch (error) {
      console.error('[ProcurementResearch] Could not save research output:', error);
    }

    return { markdown, filePath, outputId, findingsCount: findings.length, queries };
  }

  private async compileReport(
    ctx: { program: string; agency: string; solicitation: string; company: string },
    findings: Finding[],
    model?: string
  ): Promise<string> {
    const findingsText = findings
      .map(
        (f, i) =>
          `[${i + 1}] ${f.title}\nURL: ${f.url}\nSnippet: ${(f.excerpt || '').slice(0, 400)}`
      )
      .join('\n\n');

    const prompt = `You are a capture research analyst. Compile the web findings below into a concise markdown research report about this procurement opportunity.

## Opportunity
- Program: ${ctx.program}
- Agency: ${ctx.agency || 'Not specified'}
- Solicitation: ${ctx.solicitation || 'Not specified'}
- Our company: ${ctx.company || 'Not specified'}

## Web Findings (public domain)
${findingsText || 'No findings were returned.'}

## Report Requirements
Write markdown with these sections:
1. ## Overview — what this opportunity is, in 2-3 sentences
2. ## Budget & Funding — any budget figures, funding amounts, or fiscal-year context found
3. ## Interested Customers & Recent Awards — agencies/offices that issued or awarded related contracts, recent awardees
4. ## Competition — companies, incumbents, or rivals mentioned
5. ## News & Context — recent news or context that could matter for a bid
6. ## Sources — numbered list of source links used

Rules:
- Only use information present in the findings. Do NOT fabricate budget figures, companies, or facts.
- If a section has no supporting finding, write "No public information found yet" and move on.
- Cite each claim with its source number like [1].
- Keep it factual and scannable.

Report:`;

    const result = await chatCompletion({
      model: model || DEFAULT_MODEL,
      messages: [{ role: 'user', content: sanitizePrompt(prompt, 16000) }],
      temperature: 0.2,
      maxTokens: 1500,
    });

    const content = result.message?.content || '';
    if (!content.trim()) {
      throw new Error('Empty report from model');
    }
    return content.trim();
  }

  private fallbackMarkdown(
    ctx: { program: string; agency: string; solicitation: string; company: string },
    findings: Finding[]
  ): string {
    const lines = [
      `# Market Research — ${ctx.program}`,
      '',
      `- Agency: ${ctx.agency || 'Not specified'}`,
      `- Solicitation: ${ctx.solicitation || 'Not specified'}`,
      `- Company: ${ctx.company || 'Not specified'}`,
      `- Generated: ${new Date().toLocaleString()}`,
      '',
    ];

    if (findings.length === 0) {
      lines.push(
        '## Findings',
        '',
        'No public web findings were returned. Check search API keys in Settings (Ollama Cloud is free) and re-run research.',
        ''
      );
    } else {
      lines.push('## Findings');
      const byQuery = new Map<string, Finding[]>();
      for (const f of findings) {
        const list = byQuery.get(f.query) || [];
        list.push(f);
        byQuery.set(f.query, list);
      }
      for (const [query, list] of byQuery.entries()) {
        lines.push('', `### ${query}`, '');
        list.forEach(f => {
          lines.push(`- **${f.title}** — ${f.excerpt || ''}`);
          lines.push(`  ${f.url}`);
        });
      }
    }

    lines.push(
      '',
      '> ⚠️ This report was compiled from public search results. Verify before relying on any figure.',
      ''
    );

    return lines.join('\n');
  }

  /**
   * Build an org chart of the buying organization and identify key
   * individuals (contracting officers, program managers, technical POCs)
   * from the solicitation and the public web. Stores a markdown org chart
   * (data/research/<projectId>-org-chart.md + generated output) and adds the
   * individuals to the contacts database.
   */
  async buildOrgChart(
    projectId: string,
    model?: string
  ): Promise<{
    markdown: string;
    filePath: string | null;
    outputId: string | null;
    keyIndividuals: Array<{
      name: string;
      title?: string;
      role?: string;
      orgUnit?: string;
      email?: string;
      phone?: string;
    }>;
    contactsAdded: number;
  }> {
    const project = await brandWorkspace.getProjectById(projectId);
    if (!project) {
      throw new Error('Procurement not found');
    }

    const brand = await brandWorkspace.getBrandById(project.brandId);
    const metadata = project.metadata || {};
    const agency = (metadata.agency as string) || '';
    const program = (metadata.opportunityName as string) || project.name;
    const solicitation = (metadata.solicitationNumber as string) || '';
    const company = brand?.name || '';

    // 1) Key individuals from the solicitation documents (POCs are usually listed there)
    const documents = await brandWorkspace.getBrandDocuments(project.brandId, projectId);
    const pocs = await this.extractPocsFromSolicitation(documents, model);

    // 2) Web searches about the buying organization. DuckDuckGo placeholder
    //    hits (returned when no search API key is set) are filtered out.
    const base = [agency, program].filter(Boolean).join(' ');
    const queries = [
      `${base} org chart leadership`,
      `${base} program manager`,
      `${base} contracting office`,
      `${base} procurement organization`,
    ].filter(q => q.trim().length > 3);

    const findings: Finding[] = [];
    for (const query of queries) {
      try {
        const results = await performWebSearch(query);
        for (const result of results.slice(0, 4)) {
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
        console.error(`[ProcurementResearch] Org search failed for "${query}":`, error);
      }
    }

    // 2b) Query Wikipedia directly — free and reliable even without search keys.
    for (const term of [agency, `${agency} organization`, `${agency} leadership`].filter(
      t => t && t.trim().length > 2
    )) {
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

    // 3) Fetch the highest-value sources (Wikipedia, .gov/.mil pages) so the
    //    chart is built from real "last known" page content, not just snippets.
    const pages = await fetchTopPages(findings, 5);

    // 4) Compile the org chart markdown
    let markdown: string;
    try {
      markdown = await this.compileOrgChartReport(
        { program, agency, solicitation, company },
        pocs,
        findings,
        pages,
        model
      );
    } catch (error) {
      console.error('[ProcurementResearch] Org chart compile failed, using fallback:', error);
      markdown = this.fallbackOrgChartMarkdown(
        { program, agency, solicitation, company },
        pocs,
        findings,
        pages
      );
    }

    // 5) Store in a separate markdown file + generated output
    let filePath: string | null = null;
    try {
      const dir = path.join(process.cwd(), 'data', 'research');
      fs.mkdirSync(dir, { recursive: true });
      const file = path.join(dir, `${projectId}-org-chart.md`);
      fs.writeFileSync(file, markdown, 'utf-8');
      filePath = file;
    } catch (error) {
      console.error('[ProcurementResearch] Could not write org chart file:', error);
    }

    let outputId: string | null = null;
    try {
      const output = await brandWorkspace.saveGeneratedOutput(projectId, {
        type: 'report',
        title: `Customer Org Chart — ${program}`,
        content: markdown,
        format: 'markdown',
      });
      outputId = output.id;
    } catch (error) {
      console.error('[ProcurementResearch] Could not save org chart output:', error);
    }

    // 6) Add identified individuals to the contacts database (the userbase)
    const contactsAdded = this.saveKeyIndividualsAsContacts(pocs, agency, program);

    return {
      markdown,
      filePath,
      outputId,
      keyIndividuals: pocs,
      contactsAdded,
    };
  }

  /** Extract named points of contact from the solicitation documents. */
  private async extractPocsFromSolicitation(
    documents: { id: string; title: string; content: string }[],
    model?: string
  ): Promise<
    Array<{
      name: string;
      title?: string;
      role?: string;
      orgUnit?: string;
      email?: string;
      phone?: string;
      notes?: string;
    }>
  > {
    if (documents.length === 0) return [];

    const combinedContent = documents
      .map(doc => doc.content)
      .join('\n\n---\n\n')
      .slice(0, 30000);

    const prompt = `You are a capture analyst. Extract named points of contact from this solicitation.
Return ONLY valid JSON, an array of objects:
[
  {
    "name": "full name",
    "title": "official title if given",
    "role": "Contracting Officer | Program Manager | Technical POC | Other",
    "orgUnit": "office or directorate",
    "email": "email if given",
    "phone": "phone if given",
    "notes": "one short line of context"
  }
]
Include ONLY named individuals. If none are named, return [].

SOLICITATION:
${combinedContent}

JSON:`;

    try {
      const result = await chatCompletion({
        model: model || DEFAULT_MODEL,
        messages: [{ role: 'user', content: sanitizePrompt(prompt, 32000) }],
        temperature: 0.1,
        maxTokens: 800,
      });
      const text = result.message?.content || '';
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (!jsonMatch) return [];
      const parsed = JSON.parse(jsonMatch[0]);
      if (!Array.isArray(parsed)) return [];
      return parsed
        .filter((p: any) => p && typeof p.name === 'string' && p.name.trim())
        .map((p: any) => ({
          name: p.name.trim(),
          title: p.title || undefined,
          role: p.role || undefined,
          orgUnit: p.orgUnit || undefined,
          email: p.email || undefined,
          phone: p.phone || undefined,
          notes: p.notes || undefined,
        }));
    } catch (error) {
      console.error('[ProcurementResearch] POC extraction failed:', error);
      return [];
    }
  }

  private async compileOrgChartReport(
    ctx: { program: string; agency: string; solicitation: string; company: string },
    pocs: Array<{ name: string; title?: string; role?: string; orgUnit?: string; email?: string; phone?: string }>,
    findings: Finding[],
    pages: FetchedPage[],
    model?: string
  ): Promise<string> {
    const pocsText = pocs.length
      ? pocs
          .map(
            (p, i) =>
              `[${i + 1}] ${p.name} — ${p.role || p.title || 'Unknown role'}${p.orgUnit ? `, ${p.orgUnit}` : ''}${p.email ? `, ${p.email}` : ''}${p.phone ? `, ${p.phone}` : ''}`
          )
          .join('\n')
      : 'No named individuals found in the solicitation.';

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

    const prompt = `You are a capture analyst building an org chart of the organization buying through this procurement.

## Opportunity
- Program: ${ctx.program}
- Agency: ${ctx.agency || 'Not specified'}
- Solicitation: ${ctx.solicitation || 'Not specified'}
- Our company: ${ctx.company || 'Not specified'}

## Key Individuals (from the solicitation)
${pocsText}

## Web Findings (public domain)
${findingsText || 'No web findings returned.'}

## Fetched Page Content (Wikipedia / government sites — the highest-confidence sources)
${pagesText}

## Report Requirements
Write markdown with these sections:
1. ## Organization Overview — what the buying organization is and the office/directorate running this buy
2. ## Org Structure — an indented text hierarchy (like an org chart), e.g.:\n   Agency\n   ├─ Office/Command\n   │   └─ Program Office\n   Use the agency's real structure when found; otherwise show what is known and mark the rest \"unknown\".
3. ## Key Individuals — a markdown table: | Name | Role | Office | Contact | Source | where Source is \"Solicitation\" or the finding number
4. ## Engagement Notes — 2-4 practical notes on who to approach and how (contracting officer vs technical POC)

Rules:
- Only use names and facts present in the solicitation, web findings, or fetched page content. NEVER invent individuals or titles.
- The fetched page content is the most reliable source — prefer it over snippets.
- If a section lacks data, write \"No public information found yet\".
- Cite web claims with their source number like [1] or [Page N].
- Mark entries as of the current date; organizational structures change, so note \"as of <today's date>\".

Report:`;

    const result = await chatCompletion({
      model: model || DEFAULT_MODEL,
      messages: [{ role: 'user', content: sanitizePrompt(prompt, 45000) }],
      temperature: 0.2,
      maxTokens: 1500,
    });

    const content = result.message?.content || '';
    if (!content.trim()) {
      throw new Error('Empty org chart from model');
    }
    return content.trim();
  }

  private fallbackOrgChartMarkdown(
    ctx: { program: string; agency: string; solicitation: string; company: string },
    pocs: Array<{ name: string; title?: string; role?: string; orgUnit?: string; email?: string; phone?: string }>,
    findings: Finding[],
    pages: FetchedPage[]
  ): string {
    const lines = [
      `# Customer Org Chart — ${ctx.agency || ctx.program}`,
      '',
      `- Program: ${ctx.program}`,
      `- Agency: ${ctx.agency || 'Not specified'}`,
      `- Solicitation: ${ctx.solicitation || 'Not specified'}`,
      '',
      '## Key Individuals',
      '',
      '| Name | Role | Office | Contact | Source |',
      '| --- | --- | --- | --- | --- |',
    ];

    if (pocs.length === 0) {
      lines.push('| _None named in the solicitation_ | | | | |');
    } else {
      pocs.forEach(p => {
        lines.push(
          `| ${p.name} | ${p.role || p.title || '—'} | ${p.orgUnit || '—'} | ${[p.email, p.phone].filter(Boolean).join(', ') || '—'} | Solicitation |`
        );
      });
    }

    lines.push('', '## Org Structure', '', 'No public structure found yet — see web findings below.', '');

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

    lines.push(
      '',
      '> ⚠️ Compiled from public sources. Verify names and titles before outreach.',
      ''
    );

    return lines.join('\n');
  }

  /** Add identified individuals to the contacts database (deduplicated). */
  private saveKeyIndividualsAsContacts(
    pocs: Array<{ name: string; title?: string; role?: string; orgUnit?: string; email?: string; phone?: string }>,
    agency: string,
    program: string
  ): number {
    let added = 0;
    try {
      sqlDatabase.initialize();
      const existing = sqlDatabase.getContacts();
      for (const poc of pocs) {
        const name = poc.name.trim();
        const company = poc.orgUnit || agency || '';
        const alreadyExists = existing.some(
          c => c.name.toLowerCase() === name.toLowerCase() && (c.company || '').toLowerCase() === company.toLowerCase()
        );
        if (alreadyExists) continue;
        sqlDatabase.addContact({
          name,
          email: poc.email || undefined,
          phone: poc.phone || undefined,
          company: company || undefined,
          title: poc.title || poc.role || undefined,
          notes: `Key individual for ${program} (${poc.role || 'POC'}).`,
          tags: ['key-individual', program, poc.role || 'poc'],
          source: 'org-chart',
        });
        added++;
      }
    } catch (error) {
      console.error('[ProcurementResearch] Could not save key individuals as contacts:', error);
    }
    return added;
  }
}

export const procurementResearch = ProcurementResearchService.getInstance();
