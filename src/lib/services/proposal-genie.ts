import { chatCompletion } from '@/lib/models/sdk.server';
import { brandWorkspace } from './brand-workspace';
import { bidWorkflowService } from './bid-workflow';
import { memoryFileService } from './memory-file';
import type {
  Brand,
  Project,
  BrandDocument,
  CaptureDocument,
  ComplianceMatrix,
} from '@/types/brand-workspace';

/**
 * Proposal Genie pipeline — the five pre-set functions that turn a project's
 * sources (RFPs, web pages, past proposals), the company soul (brand voice),
 * and capture knowledge into proposal markdown:
 *
 *  1. generateCoverPage       — cover page markdown
 *  2. integrateWinThemes      — weave win themes into the proposal structure
 *  3. analyzeCompetition      — competitive analysis section
 *  4. writeSections           — draft proposal sections from requirements
 *  5. assembleProposal        — combine everything into one proposal document
 *
 * The output markdown is designed to feed the Office tab's Word generator
 * (logo header, proprietary footer, page count).
 */

export interface ProposalGenieOptions {
  brandId: string;
  projectId: string;
  model?: string;
}

export interface ProposalContext {
  brand: Brand | null;
  project: Project | null;
  soul: string;
  documents: BrandDocument[];
  capture: CaptureDocument | null;
  complianceMatrix: ComplianceMatrix | null;
  winThemes: string[];
}

const DEFAULT_MODEL = 'ollama/glm-4.7-flash';

export class ProposalGenieService {
  private static instance: ProposalGenieService;

  private constructor() {}

  static getInstance(): ProposalGenieService {
    if (!ProposalGenieService.instance) {
      ProposalGenieService.instance = new ProposalGenieService();
    }
    return ProposalGenieService.instance;
  }

  /** Assemble everything the model needs to write honestly: soul, brand voice, project, sources. */
  async buildContext(options: ProposalGenieOptions): Promise<ProposalContext> {
    const { brandId, projectId } = options;
    const [brand, project, soul, documents, capture, complianceMatrix] = await Promise.all([
      brandWorkspace.getBrandById(brandId).catch(() => null),
      brandWorkspace.getProjectById(projectId).catch(() => null),
      Promise.resolve(memoryFileService.loadSoul()),
      brandWorkspace.getBrandDocuments(brandId, projectId).catch(() => [] as BrandDocument[]),
      bidWorkflowService.getCaptureDocumentByProject(projectId).catch(() => null),
      bidWorkflowService.getComplianceMatrixByProject(projectId).catch(() => null),
    ]);

    const winThemes: string[] = (capture?.extractedData?.winThemes as string[]) || [];
    if (project?.metadata?.winThemes) {
      const stored = Array.isArray(project.metadata.winThemes) ? project.metadata.winThemes : [];
      winThemes.push(...stored);
    }

    return { brand, project, soul, documents, capture, complianceMatrix, winThemes };
  }

  private contextPrompt(ctx: ProposalContext): string {
    const { brand, project, documents, capture, complianceMatrix, winThemes } = ctx;
    const voice = brand?.voiceProfile;
    const brandLines = [
      `Company: ${brand?.name || 'Not specified'}`,
      `Industry: ${brand?.industry || 'Not specified'}`,
      `Tone: ${voice?.tone || 'Not specified'}`,
      `Style: ${voice?.style || 'Not specified'}`,
      `Key messages: ${(voice?.keyMessages || []).join('; ') || 'Not specified'}`,
      `Avoid phrases: ${(voice?.avoidPhrases || []).join('; ') || 'Not specified'}`,
      `Custom instructions: ${voice?.customInstructions || 'Not specified'}`,
    ].join('\n');

    const captureLines = capture?.extractedData
      ? [
          `Agency: ${capture.extractedData.agency || 'Not specified'}`,
          `Program: ${capture.extractedData.programName || 'Not specified'}`,
          `Solicitation No.: ${capture.extractedData.solicitationNumber || 'Not specified'}`,
          `Due date: ${capture.extractedData.responseDeadline || 'Not specified'}`,
          `Scope: ${(capture.extractedData.scopeOfWork || '').slice(0, 2000)}`,
          `Evaluation criteria: ${(capture.extractedData.evaluationCriteria || []).slice(0, 10).join('; ')}`,
          `Key requirements: ${(capture.extractedData.keyRequirements || []).slice(0, 15).join('; ')}`,
        ].join('\n')
      : 'No capture document yet. Analyze the project description and documents.';

    const complianceLines = complianceMatrix?.items?.length
      ? complianceMatrix.items
          .slice(0, 40)
          .map(i => `- ${i.requirementText}${i.status ? ` [${i.status}]` : ''}`)
          .join('\n')
      : 'No compliance matrix yet.';

    const sourceLines = documents
      .slice(0, 8)
      .map(d => `### Source: ${d.title}\n${(d.compactedContent || d.content || '').slice(0, 3000)}`)
      .join('\n\n');

    const themeLines =
      winThemes.length > 0 ? winThemes.map((t, i) => `${i + 1}. ${t}`).join('\n') : '(none defined yet)';

    // Distilled solicitation intelligence: format rules, scoring, milestones
    const meta = project?.metadata || {};
    const intel = meta.solicitationIntel || {};
    const fmt = meta.formatGuide || intel.format || {};
    const formatLines = Object.entries(fmt)
      .filter(([, v]) => v)
      .map(([k, v]) => `- ${k}: ${v}`)
      .join('\n');
    const scoringLines =
      Array.isArray(intel.scoring) && intel.scoring.length
        ? intel.scoring
            .slice(0, 20)
            .map(
              (s: any) =>
                `- ${s.criterion}${s.weight ? ` (${s.weight})` : ''}${s.description ? ` — ${s.description}` : ''}`
            )
            .join('\n')
        : '(not extracted yet — analyze the RFP before writing)';
    const milestoneLines =
      Array.isArray(intel.milestones) && intel.milestones.length
        ? intel.milestones
            .slice(0, 20)
            .map((m: any) => `- ${m.event}${m.date ? ` — ${m.date}` : ''}`)
            .join('\n')
        : '(not extracted yet)';

    return [
      `## COMPANY SOUL (non-negotiable persona)\n${ctx.soul}`,
      `\n## CORPORATE VAULT (company knowledge)\n${brandLines}`,
      `\n## PROJECT\nName: ${project?.name || 'Unnamed'}\nDescription: ${project?.description || 'Not specified'}\nType: ${project?.type || 'other'}`,
      `\n## CAPTURE KNOWLEDGE\n${captureLines}`,
      `\n## WIN THEMES\n${themeLines}`,
      `\n## FORMAT RULES (non-negotiable — page limits, font, volumes)\n${formatLines || '(not extracted yet — check the RFP)'}`,
      `\n## SCORING CRITERIA (how the proposal is evaluated)\n${scoringLines}`,
      `\n## MILESTONES & KEY DATES\n${milestoneLines}`,
      `\n## COMPLIANCE REQUIREMENTS (from RFP)\n${complianceLines}`,
      `\n## SOURCES (RFP, web pages, past proposals)\n${sourceLines || '(no sources loaded — ask the user to add documents or web pages)'}`,
    ].join('\n\n');
  }

  private async callLLM(prompt: string, model?: string): Promise<string> {
    const res = await chatCompletion({
      model: model || DEFAULT_MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.4,
    });
    return res?.message?.content || '';
  }

  /** 1. Generate the cover page markdown. */
  async generateCoverPage(options: ProposalGenieOptions): Promise<string> {
    const ctx = await this.buildContext(options);
    const prompt = `${this.contextPrompt(ctx)}

## TASK
Generate ONLY the cover page for a government proposal, as markdown. Include:
- Company name (from brand)
- Proposal title (derived from the project and RFP)
- Agency name
- Solicitation number
- Due date
- A one-paragraph executive summary teaser

Follow the soul: specific, evidence-based, no placeholders. If information is missing, write the section with the known facts and flag missing items in square brackets like [AGENCY NAME].`;

    return this.callLLM(prompt, options.model);
  }

  /** 2. Integrate win themes into the proposal structure. */
  async integrateWinThemes(options: ProposalGenieOptions, winThemes?: string[]): Promise<string> {
    const ctx = await this.buildContext(options);
    const themes = (winThemes && winThemes.length > 0 ? winThemes : ctx.winThemes) || [];
    const prompt = `${this.contextPrompt(ctx)}

## TASK
Generate a "Win Themes & Discriminators" section for the proposal as markdown (## Win Themes).

${themes.length > 0
  ? `Here are the win themes to integrate:\n${themes.map((t, i) => `${i + 1}. ${t}`).join('\n')}\n\nFor each theme: (a) state it crisply, (b) explain how it addresses a customer need, (c) list the evidence the company must be able to back it with, and (d) note where in the proposal it should appear.`
  : 'No win themes defined yet. Propose 2-4 strong, customer-focused win themes and for each: (a) the theme, (b) the customer need it addresses, (c) required evidence, (d) where it appears in the proposal. Flag any claim the company must verify.'}

Follow the soul: no boilerplate, write to the customer, ground every claim in evidence.`;

    return this.callLLM(prompt, options.model);
  }

  /** 3. Analyze the competition. */
  async analyzeCompetition(options: ProposalGenieOptions): Promise<string> {
    const ctx = await this.buildContext(options);
    const prompt = `${this.contextPrompt(ctx)}

## TASK
Generate a "Competitive Analysis" section for the proposal as markdown (## Competitive Analysis).

Cover:
- Likely competitors and incumbents (based on sources; do not invent — flag unknown competitors as gaps)
- Each competitor's likely strengths and weaknesses relative to this opportunity
- The company's discriminators versus each competitor
- Competitive risks and how to counter them

Follow the soul: if you have no source-based knowledge of competitors, say so explicitly and list what the user should research (e.g., incumbent past performance, agency contract history, similar awards). Never fabricate competitor intelligence.`;

    return this.callLLM(prompt, options.model);
  }

  /** 4. Write proposal sections from the requirements. */
  async writeSections(options: ProposalGenieOptions, sections?: string[]): Promise<string> {
    const ctx = await this.buildContext(options);
    const requested = (sections && sections.length > 0 ? sections : []).join('; ');
    const prompt = `${this.contextPrompt(ctx)}

## TASK
Write proposal content for the following section(s): ${requested || 'the key proposal sections'}

Write each section as markdown with a ## heading. Cover the requirements from the compliance list where relevant. Ground every claim in the sources provided or the company's stated capabilities — if a claim cannot be supported, flag it as [GAP: ...] for the human to fill with real past performance or metrics.

Follow the soul: write to the customer, be specific not generic, no boilerplate, track compliance.`;

    return this.callLLM(prompt, options.model);
  }

  /** 5. Assemble the full proposal markdown. */
  async assembleProposal(options: ProposalGenieOptions, parts?: { cover?: string; winThemes?: string; competition?: string; sections?: string }): Promise<string> {
    const ctx = await this.buildContext(options);
    const [cover, winThemes, competition, body] = await Promise.all([
      parts?.cover ? Promise.resolve(parts.cover) : this.generateCoverPage(options),
      parts?.winThemes ? Promise.resolve(parts.winThemes) : this.integrateWinThemes(options),
      parts?.competition ? Promise.resolve(parts.competition) : this.analyzeCompetition(options),
      parts?.sections ? Promise.resolve(parts.sections) : this.writeSections(options),
    ]);

    const prompt = `${this.contextPrompt(ctx)}

## TASK
Assemble the provided proposal parts into ONE complete, well-ordered proposal in markdown. Keep the parts' wording intact — do not rewrite them. Produce this structure:

# PROPOSAL — {Project name}
## Cover Page
{cover}

## Table of Contents
{generate a TOC from the section headings below}

## Executive Summary
{write a concise executive summary grounded in the win themes and sources; follow the soul}

## Win Themes & Discriminators
{winThemes}

## Competitive Analysis
{competition}

## Proposal Body
{body}

## Compliance Matrix (reference)
{list the top requirements from the compliance matrix with status}

Do not add fabricated content. Flag anything missing with [GAP: ...].`;

    const assembled = await this.callLLM(prompt, options.model);

    // Prefer the model's assembled output; if it came back empty, stitch the parts together.
    if (!assembled.trim()) {
      return [
        `# PROPOSAL — ${ctx.project?.name || 'Untitled'}`,
        '',
        '## Cover Page',
        cover,
        '',
        '## Win Themes & Discriminators',
        winThemes,
        '',
        '## Competitive Analysis',
        competition,
        '',
        '## Proposal Body',
        body,
      ].join('\n\n');
    }
    return assembled;
  }

  /**
   * Extract presentation-ready data (quad chart, schedule/Gantt, staffing) from the
   * proposal markdown + capture knowledge. Returns structured JSON that feeds the
   * PptxGenJS quad-chart, gantt, and staffing exporters — no manual entry needed.
   */
  async generatePresentations(
    options: ProposalGenieOptions,
    proposalMarkdown?: string
  ): Promise<{
    quadrants: { name: string; points: string[] }[];
    tasks: { name: string; start: number; end: number; status: string; milestone?: boolean }[];
    staffing: {
      laborCategory: string;
      name: string;
      role: string;
      level: string;
      loe: string;
      status: string;
    }[];
  }> {
    const ctx = await this.buildContext(options);
    const metadata = (ctx.project?.metadata as Record<string, unknown>) || {};

    const source = (proposalMarkdown || '').trim()
      ? proposalMarkdown
      : [
          ctx.capture?.content || '',
          ctx.winThemes.length ? `Win themes: ${ctx.winThemes.join('; ')}` : '',
          `Project: ${ctx.project?.name || ''}`,
          `Description: ${ctx.project?.description || ''}`,
        ]
          .filter(Boolean)
          .join('\n\n');

    const prompt = `${this.contextPrompt(ctx)}

## SOURCE MATERIAL
${(source || 'No source material available.').slice(0, 30000)}

## TASK
Extract the data needed to build three proposal presentations. Base everything strictly on the source material; never invent capabilities, people, or dates. If something is unknown, leave it empty.

Return STRICT JSON only, no markdown, no commentary:
{
  "quadrants": [{"name": "Technical", "points": ["..."]}],
  "tasks": [{"name": "...", "start": 0, "end": 2, "status": "planned"}],
  "staffing": [{"laborCategory": "...", "name": "", "role": "...", "level": "...", "loe": "...", "status": "..."}]
}

Rules:
- quadrants: exactly 4 — Technical, Management, Past Performance, Price/Other — each with 2-5 short bullet points from the proposal.
- tasks: proposal schedule in 0-based weeks (start inclusive, end exclusive), status one of planned | in-progress | complete.
- staffing: only named people or roles actually mentioned in the source; laborCategory is the role category (e.g. "PM", "Engineering").`;

    let parsed: {
      quadrants?: { name?: string; points?: string[] }[];
      tasks?: { name?: string; start?: number; end?: number; status?: string; milestone?: boolean }[];
      staffing?: {
        laborCategory?: string;
        name?: string;
        role?: string;
        level?: string;
        loe?: string;
        status?: string;
      }[];
    } = {};
    try {
      const raw = (await this.callLLM(prompt, options.model)).trim();
      const start = raw.indexOf('{');
      const end = raw.lastIndexOf('}');
      if (start >= 0 && end > start) {
        parsed = JSON.parse(raw.slice(start, end + 1));
      }
    } catch (e) {
      console.error('[ProposalGenie] Presentation extraction failed:', e);
    }

    return {
      quadrants: this.normalizeQuadrants(parsed.quadrants, ctx),
      tasks: this.normalizeTasks(parsed.tasks),
      staffing: this.normalizeStaffing(parsed.staffing),
    };
  }

  private normalizeQuadrants(
    quadrants: { name?: string; points?: string[] }[] | undefined,
    ctx: ProposalContext
  ): { name: string; points: string[] }[] {
    const names = ['Technical', 'Management', 'Past Performance', 'Price / Other'];
    const fallbackPoints = [
      ...ctx.winThemes.slice(0, 4),
      ctx.project?.description ? `Overview: ${ctx.project.description}` : '',
    ].filter(Boolean);

    const cleaned = (quadrants || [])
      .map(q => ({
        name: (q.name || '').trim() || 'Quadrant',
        points: (q.points || []).map((p: string) => p.trim()).filter(Boolean),
      }))
      .filter(q => q.name);

    // Always return the 4 standard quadrants, padded with whatever the model found.
    const out: { name: string; points: string[] }[] = [];
    for (const name of names) {
      const found = cleaned.find(q => q.name.toLowerCase() === name.toLowerCase());
      out.push({
        name,
        points:
          found && found.points.length > 0
            ? found.points.slice(0, 5)
            : fallbackPoints.length > 0
            ? fallbackPoints.slice(0, 4)
            : [],
      });
    }
    return out;
  }

  private normalizeTasks(
    tasks: { name?: string; start?: number; end?: number; status?: string; milestone?: boolean }[] | undefined
  ): { name: string; start: number; end: number; status: string; milestone?: boolean }[] {
    const cleaned = (tasks || [])
      .map(t => {
        const start = Math.max(0, Math.round(Number(t.start) || 0));
        const end = Math.max(start + 1, Math.round(Number(t.end) || start + 1));
        return {
          name: (t.name || '').trim(),
          start,
          end,
          status: ['planned', 'in-progress', 'complete'].includes((t.status || '').toLowerCase())
            ? (t.status as string).toLowerCase()
            : 'planned',
          milestone: !!t.milestone,
        };
      })
      .filter(t => t.name);

    if (cleaned.length > 0) return cleaned.slice(0, 14);

    // Generic proposal schedule fallback (relative weeks).
    return [
      { name: 'Kickoff & Requirements Review', start: 0, end: 1, status: 'planned' },
      { name: 'Draft Proposal Sections', start: 1, end: 3, status: 'planned' },
      { name: 'Internal Review & Red Team', start: 3, end: 4, status: 'planned' },
      { name: 'Finalize & Format', start: 4, end: 5, status: 'planned' },
      { name: 'Submit & Post-Submission', start: 5, end: 6, status: 'planned' },
    ];
  }

  private normalizeStaffing(
    staffing: {
      laborCategory?: string;
      name?: string;
      role?: string;
      level?: string;
      loe?: string;
      status?: string;
    }[] | undefined
  ): {
    laborCategory: string;
    name: string;
    role: string;
    level: string;
    loe: string;
    status: string;
  }[] {
    return (staffing || [])
      .map(s => ({
        laborCategory: (s.laborCategory || s.role || '').trim(),
        name: (s.name || '').trim(),
        role: (s.role || '').trim(),
        level: (s.level || '').trim(),
        loe: (s.loe || '').trim(),
        status: (s.status || 'available').trim(),
      }))
      .filter(s => s.laborCategory || s.name || s.role)
      .slice(0, 20);
  }
}

export const proposalGenie = ProposalGenieService.getInstance();
