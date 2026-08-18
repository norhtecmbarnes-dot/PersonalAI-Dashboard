import { sqlDatabase } from '@/lib/database/sqlite';
import { brandWorkspace } from './brand-workspace';
import { knowledgeExtractor } from './knowledge-extractor';
import { chatCompletion } from '@/lib/models/sdk.server';
import { sanitizePrompt } from '@/lib/utils/validation';
import type { ExtractedKnowledge } from './knowledge-extractor';
import type { 
  CaptureDocument, 
  ComplianceMatrix, 
  ComplianceMatrixItem, 
  BidWorkflow,
  Project,
  BrandDocument,
  ChatMessage
} from '@/types/brand-workspace';

const DEFAULT_MODEL = 'ollama/glm-4.7-flash';

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

export class BidWorkflowService {
  private static instance: BidWorkflowService;

  private constructor() {}

  static getInstance(): BidWorkflowService {
    if (!BidWorkflowService.instance) {
      BidWorkflowService.instance = new BidWorkflowService();
    }
    return BidWorkflowService.instance;
  }

  async initialize(): Promise<void> {
    sqlDatabase.initialize();
  }

  /**
   * Start a bid workflow from a tracked opportunity
   */
  async startBidFromOpportunity(
    brandId: string,
    opportunityId: string,
    opportunityData: any,
    projectName?: string
  ): Promise<{ project: Project; workflow: BidWorkflow }> {
    await this.initialize();

    // Create a project for this bid
    const project = await brandWorkspace.createProject(brandId, {
      name: projectName || `Bid: ${opportunityData.title || 'New Bid'}`,
      description: opportunityData.synopsis || '',
      type: 'bid',
      status: 'active',
      requirements: opportunityData.synopsis || '',
      deliverables: [],
      tags: ['bid', 'opportunity', opportunityData.agency || ''],
      metadata: {
        opportunityId,
        solicitationNumber: opportunityData.solicitation_number,
        postedDate: opportunityData.posted_date,
        responseDeadline: opportunityData.response_deadline,
        awardAmount: opportunityData.award_amount,
        agency: opportunityData.agency,
        office: opportunityData.office,
        url: opportunityData.url,
      },
    });

    // Create initial workflow
    const workflowId = generateId();
    const now = Date.now();
    const workflow: BidWorkflow = {
      id: workflowId,
      projectId: project.id,
      stage: 'capture',
      historicalBidReferences: [],
      createdAt: now,
      updatedAt: now,
    };

    await sqlDatabase.run(
      `INSERT INTO bid_workflows (id, project_id, stage, historical_bid_references, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [workflowId, project.id, 'capture', JSON.stringify([]), now, now]
    );

    return { project, workflow };
  }

  /**
   * Create a capture document from processed RFP documents
   */
  async createCaptureDocument(
    projectId: string,
    documents: BrandDocument[],
    model?: string
  ): Promise<CaptureDocument> {
    await this.initialize();

    // Combine document content
    const combinedContent = documents.map(doc => doc.content).join('\n\n---\n\n');

    // Extract knowledge using the knowledge extractor
    const knowledge = await knowledgeExtractor.extractKnowledge(combinedContent, model);

    // Create capture document structure
    const captureId = generateId();
    const now = Date.now();

    // Parse opportunity metadata from project
    const project = await brandWorkspace.getProjectById(projectId);
    const metadata = project?.metadata || {};

    const captureDocument: CaptureDocument = {
      id: captureId,
      projectId,
      opportunityId: metadata.opportunityId as string,
      title: `Capture Document: ${project?.name || 'Bid'}`,
      content: '', // Will be generated
      extractedData: {
        programName: project?.name,
        customer: metadata.agency as string,
        agency: metadata.agency as string,
        solicitationNumber: metadata.solicitationNumber as string,
        postedDate: metadata.postedDate as string,
        responseDeadline: metadata.responseDeadline as string,
        awardAmount: metadata.awardAmount as string,
        scopeOfWork: this.extractScopeOfWork(knowledge),
        milestones: this.extractMilestones(knowledge),
        deliverables: this.extractDeliverables(knowledge),
        evaluationCriteria: this.extractEvaluationCriteria(knowledge),
        competition: [],
        reasonsToBid: [],
        riskFactors: this.extractRiskFactors(knowledge),
        winThemes: [],
        keyRequirements: this.extractKeyRequirements(knowledge),
        summary: knowledge.summary,
      },
      metadata: {
        sourceDocumentIds: documents.map(d => d.id),
        extractionModel: model,
        extractionTimestamp: now,
      },
      createdAt: now,
      updatedAt: now,
    };

    // Generate narrative content from extracted data
    captureDocument.content = this.generateCaptureDocumentContent(captureDocument.extractedData);

    await sqlDatabase.run(
      `INSERT INTO capture_documents (id, project_id, opportunity_id, title, content, extracted_data, metadata, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        captureId,
        projectId,
        captureDocument.opportunityId || null,
        captureDocument.title,
        captureDocument.content,
        JSON.stringify(captureDocument.extractedData),
        JSON.stringify(captureDocument.metadata || {}),
        now,
        now,
      ]
    );

    // Update workflow stage
    await this.updateWorkflowStage(projectId, 'capture', { captureDocumentId: captureId });

    return captureDocument;
  }

  /**
   * Create compliance matrix from RFP requirements
   */
  async createComplianceMatrix(
    projectId: string,
    documents: BrandDocument[],
    model?: string,
    preExtracted?: Array<{ text: string; section?: string; pageReference?: string }>
  ): Promise<ComplianceMatrix> {
    await this.initialize();

    // Prefer LLM-extracted requirements from the dissection step; fall back
    // to the regex scanner for legacy callers.
    const requirements =
      preExtracted && preExtracted.length > 0
        ? preExtracted
        : await this.extractRequirements(documents, model, 200);

    const matrixId = generateId();
    const now = Date.now();

    const matrix: ComplianceMatrix = {
      id: matrixId,
      projectId,
      title: `Compliance Matrix: ${projectId}`,
      items: requirements.map((req, idx) => ({
        id: `${matrixId}_item_${idx}`,
        projectId,
        requirementId: `req_${idx}`,
        requirementText: req.text,
        section: req.section,
        pageReference: req.pageReference,
        status: 'pending',
        createdAt: now,
        updatedAt: now,
      })),
      metadata: {
        formatRequirements: this.extractFormatRequirements(documents),
        deliveryMethod: this.extractDeliveryMethod(documents),
        pageLimits: this.extractPageLimits(documents),
        volumesRequired: this.extractVolumesRequired(documents),
      },
      createdAt: now,
      updatedAt: now,
    };

    // Save matrix metadata
    await sqlDatabase.run(
      `INSERT INTO compliance_matrices (id, project_id, title, metadata, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [matrixId, projectId, matrix.title, JSON.stringify(matrix.metadata || {}), now, now]
    );

    // Save individual items
    for (const item of matrix.items) {
      await sqlDatabase.run(
        `INSERT INTO compliance_matrix_items (id, project_id, requirement_id, requirement_text, section, page_reference, proposal_section, page_number, responsible_party, status, notes, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          item.id,
          item.projectId,
          item.requirementId,
          item.requirementText,
          item.section || null,
          item.pageReference || null,
          item.proposalSection || null,
          item.pageNumber || null,
          item.responsibleParty || null,
          item.status,
          item.notes || null,
          now,
          now,
        ]
      );
    }

    // Update workflow stage
    await this.updateWorkflowStage(projectId, 'compliance', { complianceMatrixId: matrixId });

    return matrix;
  }

  /**
   * Automatically process a solicitation loaded into a procurement:
   *  - Names the opportunity
   *  - Extracts the due date and creates a calendar event
   *  - Extracts the format guide (font, font size, pages, volumes) as markdown
   *  - Creates the capture document that will hold win themes, competition, and strategy
   */
  async processSolicitation(
    projectId: string,
    model?: string
  ): Promise<{
    opportunityName: string | null;
    agency: string | null;
    solicitationNumber: string | null;
    responseDeadline: string | null;
    formatGuide: Record<string, string>;
    formatGuideMarkdown: string | null;
    calendarEventId: string | null;
    captureDocument: CaptureDocument | null;
  }> {
    await this.initialize();

    const project = await brandWorkspace.getProjectById(projectId);
    if (!project) {
      throw new Error('Procurement not found');
    }

    const documents = await brandWorkspace.getBrandDocuments(project.brandId, projectId);
    if (documents.length === 0) {
      return {
        opportunityName: null,
        agency: null,
        solicitationNumber: null,
        responseDeadline: null,
        formatGuide: {},
        formatGuideMarkdown: null,
        calendarEventId: null,
        captureDocument: null,
      };
    }

    // Idempotency: if we already processed this exact set of documents, return
    // the cached summary instead of re-running extraction on every upload.
    const cachedMeta = project.metadata || {};
    if (
      cachedMeta.solicitationProcessedAt &&
      cachedMeta.solicitationDocCount === documents.length
    ) {
      return {
        opportunityName: (cachedMeta.opportunityName as string) || null,
        agency: (cachedMeta.agency as string) || null,
        solicitationNumber: (cachedMeta.solicitationNumber as string) || null,
        responseDeadline: (cachedMeta.responseDeadline as string) || null,
        formatGuide: (cachedMeta.formatGuide as Record<string, string>) || {},
        formatGuideMarkdown: null,
        calendarEventId: (cachedMeta.calendarEventId as string) || null,
        captureDocument: await this.getCaptureDocumentByProject(projectId),
      };
    }

    const combinedContent = documents
      .map(doc => doc.content)
      .join('\n\n---\n\n')
      .slice(0, 60000);

    const extracted = await this.extractSolicitationDetails(combinedContent, model);

    // Merge extraction into the procurement's metadata
    const metadata = { ...(project.metadata || {}) };
    if (extracted.programName) metadata.opportunityName = extracted.programName;
    if (extracted.agency) metadata.agency = extracted.agency;
    if (extracted.solicitationNumber) metadata.solicitationNumber = extracted.solicitationNumber;
    if (extracted.responseDeadline) metadata.responseDeadline = extracted.responseDeadline;
    metadata.formatGuide = {
      font: extracted.font || '',
      fontSize: extracted.fontSize || '',
      pageCount: extracted.pageCount || '',
      volumes: extracted.volumes || '',
      submissionInfo: extracted.submissionInfo || '',
    };

    const opportunityName = extracted.programName || project.name;

    // Create a calendar event for the due date (idempotent per procurement)
    let calendarEventId: string | null = null;
    const deadlineMs = this.parseDeadline(extracted.responseDeadline || metadata.responseDeadline);
    if (deadlineMs && !metadata.calendarEventId) {
      try {
        const event = sqlDatabase.addEvent({
          title: `${opportunityName} — Proposal Due`,
          description: `Proposal due for ${opportunityName}${
            extracted.agency ? ` (${extracted.agency})` : ''
          }. Solicitation: ${extracted.solicitationNumber || 'n/a'}.`,
          startDate: deadlineMs,
          endDate: deadlineMs + 60 * 60 * 1000,
          location: extracted.submissionInfo || '',
          status: 'pending',
          source: 'solicitation',
        });
        calendarEventId = event.id;
        metadata.calendarEventId = event.id;
      } catch (e) {
        console.error('[BidWorkflow] Could not create calendar event:', e);
      }
    } else if (metadata.calendarEventId) {
      calendarEventId = metadata.calendarEventId as string;
    }

    // Build the format guide markdown
    const formatGuideMarkdown = this.buildFormatGuideMarkdown(opportunityName, extracted);

    // Auto-name the opportunity and persist everything
    metadata.solicitationProcessedAt = Date.now();
    metadata.solicitationDocCount = documents.length;
    await brandWorkspace.updateProject(projectId, {
      name: extracted.programName || project.name,
      metadata,
    });

    if (formatGuideMarkdown) {
      try {
        await brandWorkspace.saveGeneratedOutput(projectId, {
          type: 'report',
          title: `Format Guide — ${opportunityName}`,
          content: formatGuideMarkdown,
          format: 'markdown',
        });
      } catch (e) {
        console.error('[BidWorkflow] Could not save format guide:', e);
      }
    }

    // Capture document — home for win themes, competition, and strategy
    let captureDocument: CaptureDocument | null = null;
    try {
      const existing = await this.getCaptureDocumentByProject(projectId);
      if (existing) {
        captureDocument = existing;
      } else {
        captureDocument = await this.createCaptureDocument(projectId, documents, model);
      }
    } catch (e) {
      console.error('[BidWorkflow] Capture document creation failed:', e);
    }

    return {
      opportunityName: extracted.programName || null,
      agency: extracted.agency || null,
      solicitationNumber: extracted.solicitationNumber || null,
      responseDeadline: extracted.responseDeadline || null,
      formatGuide: metadata.formatGuide as Record<string, string>,
      formatGuideMarkdown,
      calendarEventId,
      captureDocument,
    };
  }

  /**
   * Dissect a solicitation into structured intelligence: every compliance
   * requirement, the scoring criteria with weights, key milestones, format
   * rules (font, page limits, volumes, margins), and required forms/info.
   *
   * Persists to the procurement's metadata, rebuilds the compliance matrix
   * from the extracted items, and saves a human-readable "Solicitation
   * Intelligence" document into the vault — so chat and every proposal
   * function always know the page limits, fonts, win themes, and scoring.
   */
  async dissectSolicitation(
    projectId: string,
    model?: string,
    options: { force?: boolean } = {}
  ): Promise<{
    complianceCount: number;
    scoringCount: number;
    milestonesCount: number;
    format: Record<string, string>;
    requiredInfo: string[];
    intelligenceMarkdown: string | null;
    complianceMatrixId: string | null;
  }> {
    await this.initialize();

    const project = await brandWorkspace.getProjectById(projectId);
    if (!project) {
      throw new Error('Procurement not found');
    }

    const documents = await brandWorkspace.getBrandDocuments(project.brandId, projectId);
    if (documents.length === 0) {
      throw new Error('No solicitation documents to dissect — upload the RFP first.');
    }

    // Idempotency: if already dissected for this exact set of documents and
    // the caller isn't forcing a re-run, return the cached summary.
    const meta = project.metadata || {};
    if (
      !options.force &&
      meta.solicitationIntelAt &&
      meta.solicitationIntelDocCount === documents.length &&
      meta.solicitationIntel
    ) {
      const cached = meta.solicitationIntel as any;
      const matrix = await this.getComplianceMatrixByProject(projectId).catch(() => null);
      return {
        complianceCount: (cached.compliance || []).length,
        scoringCount: (cached.scoring || []).length,
        milestonesCount: (cached.milestones || []).length,
        format: cached.format || {},
        requiredInfo: cached.requiredInfo || [],
        intelligenceMarkdown: null,
        complianceMatrixId: matrix?.id || null,
      };
    }

    const combinedContent = documents
      .map(doc => doc.content)
      .join('\n\n---\n\n')
      .slice(0, 45000);

    const intel = await this.extractSolicitationIntelligence(combinedContent, model);

    // Persist the intelligence onto the procurement's metadata
    const metadata = { ...meta };
    metadata.solicitationIntel = intel;
    if (intel.format) {
      const existing = metadata.formatGuide || {};
      metadata.formatGuide = {
        font: intel.format.font || existing.font || '',
        fontSize: intel.format.fontSize || existing.fontSize || '',
        pageCount: intel.format.pageCount || existing.pageCount || '',
        volumes: intel.format.volumes || existing.volumes || '',
        submissionInfo: existing.submissionInfo || '',
      };
    }
    metadata.solicitationIntelAt = Date.now();
    metadata.solicitationIntelDocCount = documents.length;
    await brandWorkspace.updateProject(projectId, { metadata });

    // Rebuild the compliance matrix from the LLM-extracted requirements
    let complianceMatrixId: string | null = null;
    try {
      const requirements = (intel.compliance || []).map(c => ({
        text: c.requirement,
        section: c.section,
        pageReference: '',
      }));
      const matrix = await this.createComplianceMatrix(
        projectId,
        documents,
        model,
        requirements
      );
      complianceMatrixId = matrix.id;
    } catch (e) {
      console.error('[BidWorkflow] Compliance matrix rebuild failed:', e);
    }

    // Save a human-readable intelligence document into the vault so it
    // appears in the Documents tab and feeds chat / proposal functions.
    const intelligenceMarkdown = this.buildIntelligenceMarkdown(project.name, intel);
    try {
      await brandWorkspace.addDocument(project.brandId, {
        title: `Solicitation Intelligence — ${project.name}`,
        content: intelligenceMarkdown,
        type: 'markdown',
        projectId,
        metadata: {
          importedAt: Date.now(),
          tags: ['solicitation-intelligence', 'compliance', 'scoring'],
          summary: `Dissected ${documents.length} solicitation documents: ${(intel.compliance || []).length} compliance requirements, ${(intel.scoring || []).length} scoring factors, ${(intel.milestones || []).length} milestones.`,
        },
      });
    } catch (e) {
      console.error('[BidWorkflow] Could not save solicitation intelligence:', e);
    }

    // Self-improving customer knowledge: fold what we just learned about this
    // agency (mission, scoring hot buttons, milestones, format) into the
    // per-customer knowledge base.
    try {
      const { customerKnowledge } = await import('./customer-knowledge');
      await customerKnowledge.learnFromProject(project.brandId, projectId);
    } catch (e) {
      console.error('[BidWorkflow] Customer knowledge update failed:', e);
    }

    return {
      complianceCount: (intel.compliance || []).length,
      scoringCount: (intel.scoring || []).length,
      milestonesCount: (intel.milestones || []).length,
      format: intel.format || {},
      requiredInfo: intel.requiredInfo || [],
      intelligenceMarkdown,
      complianceMatrixId,
    };
  }

  /** Extract compliance, scoring, milestones, format, and required info in one LLM pass. */
  private async extractSolicitationIntelligence(
    content: string,
    model?: string
  ): Promise<{
    compliance: Array<{ requirement: string; section?: string }>;
    scoring: Array<{ criterion: string; weight?: string; description?: string }>;
    milestones: Array<{ event: string; date?: string }>;
    format: Record<string, string>;
    requiredInfo: string[];
  }> {
    const prompt = `You are an expert proposal compliance analyst. Dissect the solicitation below and extract EVERYTHING a proposal team must know before writing.

Return ONLY valid JSON with this exact shape:
{
  "compliance": [{"requirement": "exact shall/must requirement", "section": "section or paragraph reference"}],
  "scoring": [{"criterion": "evaluation factor", "weight": "stated weight or points", "description": "what the evaluator looks for"}],
  "milestones": [{"event": "event name", "date": "date if stated"}],
  "format": {"font": "", "fontSize": "", "pageLimits": "per-volume or total page limits", "volumes": "volume names/count", "margins": "", "pageCount": ""},
  "requiredInfo": ["required forms, certifications, or mandated content"]
}

Rules:
- Include EVERY distinct "shall", "must", "will", "is required to", and "offeror shall" statement as a compliance item. Be exhaustive — a missed item means a protestable non-compliance.
- Include every evaluation factor and its stated weight or points (e.g., Technical 50%, Past Performance 30%, Price 20%).
- Include all dates: questions due, amendments, site visits, proposal due.
- For format, only fill fields the solicitation actually states; leave "" when not stated.
- Keep requirement text verbatim where possible; truncate to 300 chars max per item.

SOLICITATION:
${content.slice(0, 40000)}

JSON:`;

    try {
      const result = await chatCompletion({
        model: model || DEFAULT_MODEL,
        messages: [{ role: 'user', content: sanitizePrompt(prompt, 45000) }],
        temperature: 0.1,
        maxTokens: 3000,
      });
      const text = result.message?.content || '';
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return { compliance: [], scoring: [], milestones: [], format: {}, requiredInfo: [] };
      }
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        compliance: Array.isArray(parsed.compliance) ? parsed.compliance.slice(0, 200) : [],
        scoring: Array.isArray(parsed.scoring) ? parsed.scoring.slice(0, 30) : [],
        milestones: Array.isArray(parsed.milestones) ? parsed.milestones.slice(0, 40) : [],
        format:
          parsed.format && typeof parsed.format === 'object' ? parsed.format : {},
        requiredInfo: Array.isArray(parsed.requiredInfo)
          ? parsed.requiredInfo.slice(0, 40)
          : [],
      };
    } catch (e) {
      console.error('[BidWorkflow] Solicitation intelligence extraction failed:', e);
      return { compliance: [], scoring: [], milestones: [], format: {}, requiredInfo: [] };
    }
  }

  private buildIntelligenceMarkdown(
    name: string,
    intel: {
      compliance: Array<{ requirement: string; section?: string }>;
      scoring: Array<{ criterion: string; weight?: string; description?: string }>;
      milestones: Array<{ event: string; date?: string }>;
      format: Record<string, string>;
      requiredInfo: string[];
    }
  ): string {
    const lines: string[] = [
      `# Solicitation Intelligence — ${name}`,
      '',
      'Machine-extracted from the solicitation. Verify against the source document before submission.',
      '',
    ];

    lines.push('## Format Requirements', '');
    const fmtEntries = Object.entries(intel.format || {}).filter(([, v]) => v);
    if (fmtEntries.length) {
      lines.push('| Rule | Value |', '| --- | --- |');
      for (const [key, value] of fmtEntries) {
        lines.push(`| ${key} | ${value} |`);
      }
    } else {
      lines.push('No explicit format rules found in the solicitation.');
    }
    lines.push('');

    lines.push('## Scoring Criteria', '');
    if (intel.scoring?.length) {
      for (const s of intel.scoring) {
        const weight = s.weight ? ` (${s.weight})` : '';
        lines.push(
          `- **${s.criterion}**${weight}${s.description ? ` — ${s.description}` : ''}`
        );
      }
    } else {
      lines.push('No explicit scoring criteria found.');
    }
    lines.push('');

    lines.push('## Milestones & Key Dates', '');
    if (intel.milestones?.length) {
      for (const m of intel.milestones) {
        lines.push(`- ${m.date ? `**${m.event}** — ${m.date}` : m.event}`);
      }
    } else {
      lines.push('No explicit milestones found.');
    }
    lines.push('');

    lines.push('## Compliance Requirements', '');
    if (intel.compliance?.length) {
      for (const c of intel.compliance) {
        lines.push(
          `- [ ] ${c.requirement}${c.section ? ` _(Section: ${c.section})_` : ''}`
        );
      }
    } else {
      lines.push('No explicit compliance requirements found.');
    }
    lines.push('');

    if (intel.requiredInfo?.length) {
      lines.push('## Required Information & Forms', '');
      for (const r of intel.requiredInfo) {
        lines.push(`- ${r}`);
      }
      lines.push('');
    }

    lines.push(
      '> ⚠️ Machine-extracted. Confirm against the official solicitation before submission.'
    );
    return lines.join('\n');
  }

  /**
   * Extract win themes, competitive data, and strategy from a conversation and
   * merge them into the procurement's knowledge (metadata + capture document).
   */
  async captureStrategyFromConversation(
    projectId: string,
    messages: ChatMessage[],
    model?: string
  ): Promise<{ winThemes: string[]; competition: string[]; strategy: string } | null> {
    await this.initialize();

    const recent = messages
      .slice(-8)
      .map(m => `${m.role.toUpperCase()}: ${m.content.slice(0, 800)}`)
      .join('\n\n');

    const prompt = `You are a capture strategist. From the conversation below, extract proposal intelligence.
Return ONLY valid JSON:
{
  "winThemes": ["1-3 distinct win themes or discriminators discussed"],
  "competition": ["competitive data points mentioned (incumbents, rivals, advantages)"],
  "strategy": "one paragraph capturing the agreed capture/proposal strategy"
}
If nothing strategic was discussed, return empty arrays and an empty string.

CONVERSATION:
${recent}

JSON:`;

    try {
      const result = await chatCompletion({
        model: model || DEFAULT_MODEL,
        messages: [{ role: 'user', content: sanitizePrompt(prompt, 9000) }],
        temperature: 0.2,
        maxTokens: 500,
      });
      const text = result.message?.content || '';
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return null;
      const parsed = JSON.parse(jsonMatch[0]);

      const project = await brandWorkspace.getProjectById(projectId);
      if (!project) return null;

      const metadata = { ...(project.metadata || {}) };
      const existingThemes = Array.isArray(metadata.winThemes) ? metadata.winThemes : [];
      const newThemes = Array.isArray(parsed.winThemes) ? parsed.winThemes : [];
      metadata.winThemes = [...new Set([...existingThemes, ...newThemes])].slice(0, 25);

      const existingCompetition = Array.isArray(metadata.competition) ? metadata.competition : [];
      const newCompetition = Array.isArray(parsed.competition) ? parsed.competition : [];
      metadata.competition = [...new Set([...existingCompetition, ...newCompetition])].slice(0, 25);

      if (typeof parsed.strategy === 'string' && parsed.strategy.trim()) {
        metadata.strategyNotes = parsed.strategy;
      }
      metadata.lastStrategyExtractionAt = Date.now();

      await brandWorkspace.updateProject(projectId, { metadata });

      return {
        winThemes: metadata.winThemes,
        competition: metadata.competition,
        strategy: typeof parsed.strategy === 'string' ? parsed.strategy : '',
      };
    } catch (e) {
      console.error('[BidWorkflow] Conversation strategy extraction failed:', e);
      return null;
    }
  }

  /** Extract structured solicitation details with a single LLM call. */
  private async extractSolicitationDetails(
    content: string,
    model?: string
  ): Promise<{
    programName?: string;
    agency?: string;
    solicitationNumber?: string;
    responseDeadline?: string;
    font?: string;
    fontSize?: string;
    pageCount?: string;
    volumes?: string;
    submissionInfo?: string;
  }> {
    const prompt = `You are an expert capture analyst. Extract submission details from the solicitation below.
Return ONLY valid JSON with these string fields (use "" when not found):
{
  "programName": "the program or opportunity name",
  "agency": "the issuing agency or office",
  "solicitationNumber": "the solicitation/notice number",
  "responseDeadline": "the proposal due date",
  "font": "required font, e.g. Times New Roman",
  "fontSize": "required font size, e.g. 12 point",
  "pageCount": "page limits, e.g. 25 pages max per volume",
  "volumes": "number and names of volumes, e.g. 3 volumes (Technical, Management, Cost)",
  "submissionInfo": "submission method, address, or portal"
}

SOLICITATION:
${content.slice(0, 20000)}

JSON:`;

    try {
      const result = await chatCompletion({
        model: model || DEFAULT_MODEL,
        messages: [{ role: 'user', content: sanitizePrompt(prompt, 22000) }],
        temperature: 0.1,
        maxTokens: 700,
      });
      const text = result.message?.content || '';
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return {};
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        programName: parsed.programName || undefined,
        agency: parsed.agency || undefined,
        solicitationNumber: parsed.solicitationNumber || undefined,
        responseDeadline: parsed.responseDeadline || undefined,
        font: parsed.font || undefined,
        fontSize: parsed.fontSize || undefined,
        pageCount: parsed.pageCount || undefined,
        volumes: parsed.volumes || undefined,
        submissionInfo: parsed.submissionInfo || undefined,
      };
    } catch (e) {
      console.error('[BidWorkflow] Solicitation extraction failed:', e);
      return {};
    }
  }

  private buildFormatGuideMarkdown(
    name: string,
    f: {
      font?: string;
      fontSize?: string;
      pageCount?: string;
      volumes?: string;
      submissionInfo?: string;
    }
  ): string {
    return [
      `# Format Guide — ${name}`,
      '',
      'Extracted from the solicitation. Verify against the source document before submission.',
      '',
      '| Requirement | Value |',
      '| --- | --- |',
      `| Font | ${f.font || 'Not specified'} |`,
      `| Font size | ${f.fontSize || 'Not specified'} |`,
      `| Page count / limits | ${f.pageCount || 'Not specified'} |`,
      `| Total volumes | ${f.volumes || 'Not specified'} |`,
      `| Submission details | ${f.submissionInfo || 'Not specified'} |`,
      '',
      '> ⚠️ This guide is machine-extracted. Always confirm formatting rules against the official solicitation.',
    ].join('\n');
  }

  private parseDeadline(value: string | undefined): number | null {
    if (!value) return null;
    const trimmed = value.trim();
    if (!trimmed) return null;

    const parsed = Date.parse(trimmed);
    if (!isNaN(parsed)) return parsed;

    // MM/DD/YYYY or MM-DD-YY
    const mdy = trimmed.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
    if (mdy) {
      const year = mdy[3].length === 2 ? `20${mdy[3]}` : mdy[3];
      const ms = new Date(Number(year), Number(mdy[1]) - 1, Number(mdy[2])).getTime();
      if (!isNaN(ms)) return ms;
    }

    return null;
  }

  /**
   * Generate outline based on compliance matrix and capture document
   */
  async generateOutline(
    projectId: string,
    captureDocumentId?: string,
    complianceMatrixId?: string,
    model?: string
  ): Promise<string> {
    await this.initialize();

    let captureData: any = {};
    if (captureDocumentId) {
      const captureDoc = await this.getCaptureDocument(captureDocumentId);
      if (captureDoc) {
        captureData = captureDoc.extractedData;
      }
    }

    let requirements: ComplianceMatrixItem[] = [];
    if (complianceMatrixId) {
      const matrixItems = await this.getComplianceMatrixItems(complianceMatrixId);
      requirements = matrixItems;
    }

    // Build outline prompt
    const prompt = `Create a comprehensive proposal outline for a government bid.
    
Capture Information:
- Program: ${captureData.programName || 'Unknown'}
- Agency: ${captureData.agency || 'Unknown'}
- Scope: ${captureData.scopeOfWork || 'Not specified'}

Key Requirements (${requirements.length} items):
${requirements.slice(0, 10).map((req, i) => `${i + 1}. ${req.requirementText}`).join('\n')}

Generate a detailed outline with sections and subsections that address all requirements.
Format in markdown with headers (#, ##, ###). Include:
1. Executive Summary
2. Understanding of Requirements
3. Technical Approach
4. Management Plan
5. Past Performance
6. Pricing Strategy (if applicable)
7. Compliance Matrix Reference Section
8. Appendices

Make sure the outline is comprehensive and addresses all key requirements.`;

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: prompt }],
          model: model || undefined,
          temperature: 0.3,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'No error details');
        throw new Error(`Chat API error: ${response.status} ${response.statusText}. Details: ${errorText}`);
      }

      const data = await response.json();
      
      // Extract content from various possible response structures
      const outline = data.message || data.response || data.content || data.result || '';
      
      if (!outline && process.env.NODE_ENV !== 'production') {
        console.warn('Unexpected chat API response structure:', JSON.stringify(data).slice(0, 500));
      }

      // Update workflow stage
      await this.updateWorkflowStage(projectId, 'outline', {});

      return outline;
    } catch (error) {
      console.error('Error generating outline:', error);
      throw error;
    }
  }

  /**
   * Get historical bids for a brand (similar projects)
   */
  async getHistoricalBids(brandId: string, limit: number = 5): Promise<Project[]> {
    const projects = await brandWorkspace.getProjects(brandId);
    return projects
      .filter(p => p.type === 'bid' || p.type === 'proposal')
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, limit);
  }

  /**
   * Update workflow stage
   */
  async updateWorkflowStage(
    projectId: string,
    stage: BidWorkflow['stage'],
    updates: Partial<BidWorkflow>
  ): Promise<BidWorkflow | null> {
    await this.initialize();

    const workflow = await this.getWorkflowByProject(projectId);
    if (!workflow) return null;

    const updated: BidWorkflow = {
      ...workflow,
      ...updates,
      stage,
      updatedAt: Date.now(),
    };

    await sqlDatabase.run(
      `UPDATE bid_workflows SET stage = ?, capture_document_id = ?, compliance_matrix_id = ?, outline_id = ?, proposal_id = ?, historical_bid_references = ?, metadata = ?, updated_at = ? WHERE project_id = ?`,
      [
        updated.stage,
        updated.captureDocumentId || null,
        updated.complianceMatrixId || null,
        updated.outlineId || null,
        updated.proposalId || null,
        JSON.stringify(updated.historicalBidReferences || []),
        JSON.stringify(updated.metadata || {}),
        updated.updatedAt,
        projectId,
      ]
    );

    return updated;
  }

  async getWorkflowByProject(projectId: string): Promise<BidWorkflow | null> {
    await this.initialize();
    const row = await sqlDatabase.get(
      'SELECT * FROM bid_workflows WHERE project_id = ?',
      [projectId]
    );
    return row ? this.mapRowToWorkflow(row) : null;
  }

  async getWorkflowById(workflowId: string): Promise<BidWorkflow | null> {
    await this.initialize();
    const row = await sqlDatabase.get(
      'SELECT * FROM bid_workflows WHERE id = ?',
      [workflowId]
    );
    return row ? this.mapRowToWorkflow(row) : null;
  }

  async getCaptureDocument(id: string): Promise<CaptureDocument | null> {
    await this.initialize();
    const row = await sqlDatabase.get(
      'SELECT * FROM capture_documents WHERE id = ?',
      [id]
    );
    return row ? this.mapRowToCaptureDocument(row) : null;
  }

  async getComplianceMatrixItems(matrixId: string): Promise<ComplianceMatrixItem[]> {
    await this.initialize();
    const rows = await sqlDatabase.all(
      'SELECT * FROM compliance_matrix_items WHERE id LIKE ?',
      [`${matrixId}_item_%`]
    );
    return rows.map(this.mapRowToComplianceMatrixItem);
  }

  async getCaptureDocumentByProject(projectId: string): Promise<CaptureDocument | null> {
    await this.initialize();
    const row = await sqlDatabase.get(
      'SELECT * FROM capture_documents WHERE project_id = ?',
      [projectId]
    );
    return row ? this.mapRowToCaptureDocument(row) : null;
  }

  async getComplianceMatrixByProject(projectId: string): Promise<ComplianceMatrix | null> {
    await this.initialize();
    const row = await sqlDatabase.get(
      'SELECT * FROM compliance_matrices WHERE project_id = ?',
      [projectId]
    );
    if (!row) return null;
    const items = await this.getComplianceMatrixItems(row.id);
    const matrix = this.mapRowToComplianceMatrix(row);
    matrix.items = items;
    return matrix;
  }

  async getWorkflowsByBrand(brandId: string): Promise<Array<{ project: Project; workflow: BidWorkflow }>> {
    const projects = await brandWorkspace.getProjects(brandId);
    const result = [];
    for (const project of projects) {
      if (project.type === 'bid' || project.type === 'proposal') {
        const workflow = await this.getWorkflowByProject(project.id);
        if (workflow) {
          result.push({ project, workflow });
        }
      }
    }
    return result;
  }

  // Helper methods for extraction
  private extractScopeOfWork(knowledge: ExtractedKnowledge): string {
    const keyFacts = knowledge.keyFacts || [];
    const services = (knowledge.services || []).map((s: any) => s.description).join('; ');
    return `${keyFacts.slice(0, 3).join(' ')} ${services}`.trim();
  }

  private extractMilestones(knowledge: ExtractedKnowledge): string[] {
    const timeline = knowledge.timeline || [];
    return timeline.map((t: any) => `${t.event}: ${t.date || 'TBD'}`);
  }

  private extractDeliverables(knowledge: ExtractedKnowledge): string[] {
    const services = knowledge.services || [];
    const products = knowledge.products || [];
    return [
      ...services.map((s: any) => s.name),
      ...products.map((p: any) => p.name),
    ];
  }

  private extractEvaluationCriteria(knowledge: ExtractedKnowledge): string[] {
    const keyFacts = knowledge.keyFacts || [];
    return keyFacts
      .filter((fact: string) => fact.toLowerCase().includes('evaluation') || fact.toLowerCase().includes('criteria'))
      .slice(0, 5);
  }

  private extractRiskFactors(knowledge: ExtractedKnowledge): string[] {
    const keyFacts = knowledge.keyFacts || [];
    return keyFacts
      .filter((fact: string) => fact.toLowerCase().includes('risk') || fact.toLowerCase().includes('challenge'))
      .slice(0, 5);
  }

  private extractKeyRequirements(knowledge: ExtractedKnowledge): string[] {
    const keyFacts = knowledge.keyFacts || [];
    return keyFacts
      .filter((fact: string) => fact.toLowerCase().includes('requirement') || fact.toLowerCase().includes('must') || fact.toLowerCase().includes('shall'))
      .slice(0, 10);
  }

  private generateCaptureDocumentContent(extractedData: any): string {
    const sections = [];
    
    sections.push(`# Capture Document\n\n`);
    
    if (extractedData.programName) {
      sections.push(`## Program: ${extractedData.programName}\n`);
    }
    
    if (extractedData.customer) {
      sections.push(`### Customer\n${extractedData.customer}\n`);
    }
    
    if (extractedData.scopeOfWork) {
      sections.push(`### Scope of Work\n${extractedData.scopeOfWork}\n`);
    }
    
    if (extractedData.milestones && extractedData.milestones.length > 0) {
      sections.push(`### Milestones\n${extractedData.milestones.map((m: string) => `- ${m}`).join('\n')}\n`);
    }
    
    if (extractedData.deliverables && extractedData.deliverables.length > 0) {
      sections.push(`### Deliverables\n${extractedData.deliverables.map((d: string) => `- ${d}`).join('\n')}\n`);
    }
    
    if (extractedData.keyRequirements && extractedData.keyRequirements.length > 0) {
      sections.push(`### Key Requirements\n${extractedData.keyRequirements.map((r: string) => `- ${r}`).join('\n')}\n`);
    }
    
    if (extractedData.riskFactors && extractedData.riskFactors.length > 0) {
      sections.push(`### Risk Factors\n${extractedData.riskFactors.map((r: string) => `- ${r}`).join('\n')}\n`);
    }
    
    if (extractedData.summary) {
      sections.push(`### Summary\n${extractedData.summary}\n`);
    }
    
    return sections.join('\n');
  }

  private async extractRequirements(documents: BrandDocument[], model?: string, limit: number = 200): Promise<Array<{ text: string; section?: string; pageReference?: string }>> {
    // For now, use a simple extraction
    // In a real implementation, use AI to extract requirements from RFP documents
    const combined = documents.map(d => d.content).join('\n\n');
    
    // Look for requirement-like patterns
    const lines = combined.split('\n');
    const requirements: Array<{ text: string; section?: string; pageReference?: string }> = [];
    
    let currentSection = '';
    for (const line of lines) {
      if (line.match(/^[A-Z][A-Za-z\s]+:$/) || line.match(/^\d+\.\s+[A-Z]/)) {
        currentSection = line;
      }
      
      if (line.toLowerCase().includes('shall') || line.toLowerCase().includes('must') || 
          line.toLowerCase().includes('requirement') || line.match(/^\d+\.\d+/)) {
        requirements.push({
          text: line.trim(),
          section: currentSection,
          pageReference: '', // Would need page numbers from PDF
        });
      }
    }
    
    return requirements.slice(0, limit);
  }

  private extractFormatRequirements(documents: BrandDocument[]): string {
    const content = documents.map(d => d.content).join('\n');
    if (content.toLowerCase().includes('font size')) return 'Specified in RFP';
    if (content.toLowerCase().includes('margins')) return 'Specified in RFP';
    return 'Standard format';
  }

  private extractDeliveryMethod(documents: BrandDocument[]): string {
    const content = documents.map(d => d.content).join('\n');
    if (content.toLowerCase().includes('electronic submission')) return 'Electronic';
    if (content.toLowerCase().includes('hard copy')) return 'Hard Copy';
    return 'Electronic or Hard Copy';
  }

  private extractPageLimits(documents: BrandDocument[]): string {
    const content = documents.map(d => d.content).join('\n');
    const match = content.match(/(\d+)\s+page/);
    return match ? `${match[1]} pages` : 'No specified limit';
  }

  private extractVolumesRequired(documents: BrandDocument[]): string {
    const content = documents.map(d => d.content).join('\n');
    if (content.toLowerCase().includes('volume')) return 'Multiple volumes required';
    return 'Single volume';
  }

  private safeJsonParse(jsonString: string, fallback: any): any {
    try {
      return JSON.parse(jsonString);
    } catch {
      return fallback;
    }
  }

  // Mapping functions
  private mapRowToWorkflow(row: any): BidWorkflow {
    return {
      id: row.id,
      projectId: row.project_id,
      stage: row.stage,
      captureDocumentId: row.capture_document_id,
      complianceMatrixId: row.compliance_matrix_id,
      outlineId: row.outline_id,
      proposalId: row.proposal_id,
      historicalBidReferences: row.historical_bid_references ? this.safeJsonParse(row.historical_bid_references, []) : [],
      metadata: row.metadata ? this.safeJsonParse(row.metadata, {}) : {},
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private mapRowToCaptureDocument(row: any): CaptureDocument {
    return {
      id: row.id,
      projectId: row.project_id,
      opportunityId: row.opportunity_id,
      title: row.title,
      content: row.content,
      extractedData: row.extracted_data ? this.safeJsonParse(row.extracted_data, {}) : {},
      metadata: row.metadata ? this.safeJsonParse(row.metadata, {}) : {},
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private mapRowToComplianceMatrix(row: any): ComplianceMatrix {
    return {
      id: row.id,
      projectId: row.project_id,
      title: row.title,
      items: [], // items will be fetched separately
      metadata: row.metadata ? this.safeJsonParse(row.metadata, {}) : {},
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private mapRowToComplianceMatrixItem(row: any): ComplianceMatrixItem {
    return {
      id: row.id,
      projectId: row.project_id,
      requirementId: row.requirement_id,
      requirementText: row.requirement_text,
      section: row.section,
      pageReference: row.page_reference,
      proposalSection: row.proposal_section,
      pageNumber: row.page_number,
      responsibleParty: row.responsible_party,
      status: row.status as any,
      notes: row.notes,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

export const bidWorkflowService = BidWorkflowService.getInstance();