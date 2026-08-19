import { sqlDatabase } from '@/lib/database/sqlite';
import { brandWorkspace } from './brand-workspace';
import { knowledgeExtractor } from './knowledge-extractor';
import { bidWorkflowService } from './bid-workflow';
import { chatCompletion } from '@/lib/models/sdk.server';
import { sanitizePrompt } from '@/lib/utils/validation';
import type { Brand, Project, CaptureDocument, ComplianceMatrix } from '@/types/brand-workspace';

const DEFAULT_MODEL = 'ollama/glm-4.7-flash';

export interface CapabilityItem {
  need: string;
  source: string; // compliance | scoring | deliverable | scope | schedule | customer
  capability: 'strong' | 'partial' | 'gap' | 'unknown';
  evidence: string;
  gap: string;
  action: string;
}

export interface CapabilityAssessment {
  assessedAt: number;
  readinessScore: number; // 0-100
  recommendation: 'go' | 'no-go' | 'bid-with-caveats';
  recommendationReason: string;
  strengths: string[];
  gaps: string[];
  items: CapabilityItem[];
  needCount: number;
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

function clampScore(n: number): number {
  if (!isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function normalizeRecommendation(r: string): CapabilityAssessment['recommendation'] {
  const v = (r || '').toLowerCase();
  if (v.includes('no')) return 'no-go';
  if (v.includes('caveat') || v.includes('condition') || v.includes('partial')) return 'bid-with-caveats';
  return 'go';
}

export class CapabilityAssessmentService {
  private static instance: CapabilityAssessmentService;

  private constructor() {}

  static getInstance(): CapabilityAssessmentService {
    if (!CapabilityAssessmentService.instance) {
      CapabilityAssessmentService.instance = new CapabilityAssessmentService();
    }
    return CapabilityAssessmentService.instance;
  }

  /** Read the last assessment stored on the project, if any. */
  async getCached(brandId: string, projectId: string): Promise<CapabilityAssessment | null> {
    const project = await brandWorkspace.getProjectById(projectId);
    if (!project || project.brandId !== brandId) return null;
    const meta = project.metadata || {};
    return (meta.capabilityAssessment as CapabilityAssessment) || null;
  }

  /**
   * Compare the customer's needs (solicitation requirements, scoring, scope,
   * deliverables) against the company's capabilities (structured knowledge
   * base + corporate vault) in one LLM pass, and store the result on the
   * project. Everything it reads is already extracted — it never re-reads
   * raw documents — so a full assessment is a single model call.
   */
  async assess(
    brandId: string,
    projectId: string,
    model?: string,
    options: { force?: boolean } = {}
  ): Promise<CapabilityAssessment> {
    sqlDatabase.initialize();

    const project = await brandWorkspace.getProjectById(projectId);
    if (!project) throw new Error('Project not found');
    if (project.brandId !== brandId) throw new Error('Brand mismatch');

    // Idempotency: reuse the cached assessment unless the inputs changed or
    // the caller forces a re-run. The doc count is the fingerprint of the
    // knowledge base (new RFP uploads / vault additions invalidate it).
    const cached = await this.getCached(brandId, projectId);
    // The fingerprint counts source documents only — this feature's own output
    // docs must not invalidate the cache.
    const docCount = (await brandWorkspace
      .getBrandDocuments(brandId, projectId)
      .catch(() => [] as any[])).filter(
      d => !((d.metadata?.tags as string[]) || []).includes('capability-assessment')
    ).length;
    if (
      !options.force &&
      cached &&
      cached.assessedAt &&
      (project.metadata as any).capabilityAssessmentDocCount === docCount
    ) {
      return cached;
    }

    // ----- Customer needs (all pre-extracted, no raw re-reading) -----
    const [capture, compliance] = await Promise.all([
      bidWorkflowService.getCaptureDocumentByProject(projectId).catch(() => null),
      bidWorkflowService.getComplianceMatrixByProject(projectId).catch(() => null),
    ]);
    const intel = (project.metadata as any)?.solicitationIntel || {};

    const needs: string[] = [];
    const needsSources: string[] = [];
    const addNeed = (text: string, source: string) => {
      if (text && text.trim()) {
        needs.push(text.trim());
        needsSources.push(source);
      }
    };

    for (const c of intel.compliance || []) {
      addNeed(
        `${c.requirement}${c.section ? ` (${c.section})` : ''}`,
        'compliance'
      );
    }
    for (const s of intel.scoring || []) {
      addNeed(
        `Evaluation factor: ${s.criterion}${s.weight ? ` (${s.weight})` : ''}${s.description ? ` — ${s.description}` : ''}`,
        'scoring'
      );
    }
    if (capture?.extractedData) {
      for (const k of capture.extractedData.keyRequirements || []) addNeed(k, 'requirement');
      for (const d of capture.extractedData.deliverables || []) addNeed(d, 'deliverable');
      for (const e of capture.extractedData.evaluationCriteria || []) addNeed(e, 'scoring');
    }
    if (capture?.extractedData?.scopeOfWork) {
      addNeed(`Scope: ${capture.extractedData.scopeOfWork}`, 'scope');
    } else if (project.description) {
      addNeed(`Scope: ${project.description}`, 'scope');
    }
    for (const m of intel.milestones || []) {
      addNeed(`Milestone: ${m.event}${m.date ? ` — ${m.date}` : ''}`, 'schedule');
    }
    if (compliance?.items?.length) {
      for (const item of compliance.items.slice(0, 40)) {
        addNeed(item.requirementText, 'compliance');
      }
    }

    const needsText = needs.length
      ? needs.map((n, i) => `${i + 1}. [${needsSources[i]}] ${n.slice(0, 220)}`).join('\n')
      : '(no solicitation requirements extracted yet — assess against the project description)';

    // ----- Company capabilities (structured knowledge base + vault) -----
    const [brand, knowledge, docs] = await Promise.all([
      brandWorkspace.getBrandById(brandId).catch(() => null),
      knowledgeExtractor.getBrandKnowledge(brandId).catch(() => []),
      brandWorkspace.getBrandDocuments(brandId, projectId).catch(() => []),
    ]);

    const capLines: string[] = [];
    capLines.push(`Company: ${brand?.name || 'Not specified'}`);
    capLines.push(`Industry: ${brand?.industry || 'Not specified'}`);
    if (brand?.description) capLines.push(`Description: ${brand.description}`);

    const grouped: Record<string, string[]> = {};
    for (const k of knowledge) {
      (grouped[k.category] = grouped[k.category] || []).push(
        k.category === 'product' || k.category === 'service'
          ? `${k.key}: ${(k.value || '').slice(0, 200)}`
          : `${k.key}: ${(k.value || '').slice(0, 200)}`
      );
    }
    for (const [category, entries] of Object.entries(grouped)) {
      if (['product', 'service', 'differentiator', 'fact'].includes(category)) {
        capLines.push(`${category}: ${entries.slice(0, 12).join(' | ')}`);
      }
    }

    // Exclude this feature's own output docs (capability assessments) from the
    // capability inputs — otherwise the model reads its previous assessment as
    // company capability and anchors to it.
    const sourceDocs = docs.filter(
      d => !((d.metadata?.tags as string[]) || []).includes('capability-assessment')
    );
    for (const doc of sourceDocs.slice(0, 6)) {
      capLines.push(
        `Vault doc "${doc.title}" (${doc.type}): ${(doc.compactedContent || doc.content || '').slice(0, 1200)}`
      );
    }

    // The Opportunity Scout profile — the company's own statement of products,
    // capabilities, NAICS codes, target agencies, and past performance. This
    // is the best single source of "what the company says it can do."
    try {
      const { opportunityScout } = await import('./opportunity-scout');
      const profile = opportunityScout.getProfile(brandId);
      if (profile) {
        capLines.push('Company profile (Opportunity Scout, self-declared):');
        if (profile.products?.length) {
          capLines.push(`Products: ${profile.products.slice(0, 10).join(' | ')}`);
        }
        if (profile.capabilities?.length) {
          capLines.push(`Capabilities: ${profile.capabilities.slice(0, 10).join(' | ')}`);
        }
        if (profile.naicsCodes?.length) {
          capLines.push(`NAICS codes: ${profile.naicsCodes.join(', ')}`);
        }
        if (profile.keywords?.length) {
          capLines.push(`Keywords: ${profile.keywords.slice(0, 12).join(' | ')}`);
        }
        if (profile.targetAgencies?.length) {
          capLines.push(`Target agencies: ${profile.targetAgencies.join(' | ')}`);
        }
        if (profile.pastPerformance?.length) {
          capLines.push(`Past performance: ${profile.pastPerformance.slice(0, 6).join(' | ')}`);
        }
      }
    } catch (e) {
      console.error('[CapabilityAssessment] Scout profile failed:', e);
    }

    const capabilitiesText = capLines.join('\n');

    // ----- The invisible proposal (human knowledge about the customer) -----
    let invisibleText = '';
    try {
      const { customerKnowledge } = await import('./customer-knowledge');
      invisibleText = await customerKnowledge.buildKnowledgeContext(
        brandId,
        (project.metadata as any)?.agency || (project.metadata as any)?.opportunityName || project.name
      );
    } catch (e) {
      console.error('[CapabilityAssessment] Customer knowledge failed:', e);
    }

    const prompt = `You are a capture and bid-decision analyst. Compare the CUSTOMER'S NEEDS for one opportunity against THE COMPANY'S CAPABILITIES, and produce a rigorous capability-gap matrix. Your job is to be brutally honest — a bid that overestimates its capabilities loses money.

## CUSTOMER NEEDS (from the solicitation)
${needsText}

## COMPANY CAPABILITIES (from the company knowledge base and corporate vault)
${capabilitiesText || '(no company knowledge extracted yet — assess from the company name and flag everything as unknown)'}

## HUMAN KNOWLEDGE ABOUT THE CUSTOMER (the invisible proposal — context, not solicitation facts)
${invisibleText || '(none captured)'}

Return ONLY valid JSON with this exact shape:
{
  "readinessScore": 0-100,
  "recommendation": "go" | "no-go" | "bid-with-caveats",
  "recommendationReason": "2-3 sentence rationale grounded in the evidence above",
  "strengths": ["2-5 genuine strengths: needs the company clearly has evidence/capability for"],
  "gaps": ["2-6 gaps: needs with no evidence, unproven capability, or missing past performance"],
  "items": [
    {
      "need": "the customer need, condensed",
      "source": "compliance | scoring | deliverable | scope | schedule | customer",
      "capability": "strong | partial | gap | unknown",
      "evidence": "what the company can point to, named concretely (product, service, fact, vault doc) — or 'none found'",
      "gap": "what is missing, unproven, or would need a partner/subcontractor",
      "action": "one concrete action: prove it, partner, exclude from proposal, or flag for the human"
    }
  ]
}

Rules:
- Every major need gets an item (aim for 6-15 items, covering compliance, scoring, deliverables, scope, schedule).
- capability "strong" when the company has concrete evidence for it OR documented domain expertise that directly covers the need (e.g. a self-declared SSA company facing an SSA requirement). "partial" when related capability exists but not exactly this. "gap" when nothing in the material suggests the company can do it. "unknown" when there is no data either way — never invent capability.
- Evidence must name something real from the capabilities list (a product, service, fact, vault doc, or profile line). NEVER invent capabilities.
- The readiness score must be defensible from the items: count strong items, weight scoring factors and compliance. Compute it fresh; it is not an existing number.
- recommendation: "go" only when most scored needs are strong; "no-go" when critical gaps exist; "bid-with-caveats" when winnable with targeted work.
- If there are no customer needs at all, return items [] and a low readiness score with recommendation "no-go" and reason "no solicitation loaded yet".

JSON:`;

    const result = await chatCompletion({
      model: model || DEFAULT_MODEL,
      messages: [{ role: 'user', content: sanitizePrompt(prompt, 50000) }],
      temperature: 0.2,
      maxTokens: 3500,
    });

    const raw = (result?.message?.content || '').trim();
    const assessment = this.parseAssessment(raw, needs.length);

    // ----- Persist: project metadata (feeds chat + proposal writer) -----
    const metadata = { ...(project.metadata || {}) };
    metadata.capabilityAssessment = assessment;
    metadata.capabilityAssessmentDocCount = docCount;
    await brandWorkspace.updateProject(projectId, { metadata });

    // ----- Persist: vault document (visible, exportable, feeds chat) -----
    // Replace any previous assessment docs for this project so re-runs don't
    // accumulate stale copies in the vault.
    try {
      const previous = docs.filter(
        d =>
          d.projectId === projectId &&
          ((d.metadata?.tags as string[]) || []).includes('capability-assessment')
      );
      for (const old of previous) {
        await brandWorkspace.deleteDocument(old.id).catch(() => null);
      }
      const markdown = this.toMarkdown(project, brand, assessment);
      await brandWorkspace.addDocument(brandId, {
        title: `Capability Assessment — ${project.name}`,
        content: markdown,
        type: 'markdown',
        projectId,
        metadata: {
          importedAt: Date.now(),
          tags: ['capability-assessment', 'go-no-go'],
          summary: `${assessment.readinessScore}/100 readiness · ${assessment.recommendation} · ${assessment.items.length} needs assessed`,
        },
      });
    } catch (e) {
      console.error('[CapabilityAssessment] Vault document failed:', e);
    }

    // ----- Fold into the capture document so downstream functions use it -----
    try {
      const existing = await bidWorkflowService.getCaptureDocumentByProject(projectId);
      if (existing) {
        const data = existing.extractedData || {};
        const reasons = new Set([
          ...(data.reasonsToBid || []),
          ...assessment.strengths.slice(0, 8),
        ]);
        const risks = new Set([
          ...(data.riskFactors || []),
          ...assessment.gaps.slice(0, 8),
        ]);
        const updatedData = {
          ...data,
          reasonsToBid: Array.from(reasons).slice(0, 10),
          riskFactors: Array.from(risks).slice(0, 10),
        };
        const updated = { ...existing, extractedData: updatedData };
        await sqlDatabase.run(
          `UPDATE capture_documents SET extracted_data = ?, updated_at = ? WHERE id = ?`,
          [JSON.stringify(updatedData), Date.now(), existing.id]
        );
        void updated;
      }
    } catch (e) {
      console.error('[CapabilityAssessment] Capture fold-in failed:', e);
    }

    return assessment;
  }

  private parseAssessment(raw: string, needCount: number): CapabilityAssessment {
    let parsed: any = {};
    try {
      const start = raw.indexOf('{');
      const end = raw.lastIndexOf('}');
      if (start >= 0 && end > start) {
        parsed = JSON.parse(raw.slice(start, end + 1));
      }
    } catch (e) {
      console.error('[CapabilityAssessment] Parse failed:', e);
      console.error('[CapabilityAssessment] Raw response head:', raw.slice(0, 400));
    }
    if (!parsed || Object.keys(parsed).length === 0) {
      console.error('[CapabilityAssessment] No JSON parsed. Raw length:', raw.length, 'Head:', raw.slice(0, 300));
    }

    const items: CapabilityItem[] = Array.isArray(parsed.items)
      ? parsed.items
          .map((i: any) => ({
            need: String(i.need || '').trim(),
            source: String(i.source || 'requirement').trim(),
            capability: (['strong', 'partial', 'gap', 'unknown'].includes(i.capability)
              ? i.capability
              : 'unknown') as CapabilityItem['capability'],
            evidence: String(i.evidence || '').trim(),
            gap: String(i.gap || '').trim(),
            action: String(i.action || '').trim(),
          }))
          .filter((i: CapabilityItem) => i.need)
          .slice(0, 40)
      : [];

    return {
      assessedAt: Date.now(),
      readinessScore: clampScore(Number(parsed.readinessScore)),
      recommendation: normalizeRecommendation(parsed.recommendation),
      recommendationReason: String(parsed.recommendationReason || '').trim(),
      strengths: (Array.isArray(parsed.strengths) ? parsed.strengths : [])
        .map((s: any) => String(s).trim())
        .filter(Boolean)
        .slice(0, 10),
      gaps: (Array.isArray(parsed.gaps) ? parsed.gaps : [])
        .map((g: any) => String(g).trim())
        .filter(Boolean)
        .slice(0, 12),
      items,
      needCount,
    };
  }

  toMarkdown(
    project: Project,
    brand: Brand | null,
    a: CapabilityAssessment
  ): string {
    const recLabel =
      a.recommendation === 'go'
        ? '🟢 GO'
        : a.recommendation === 'no-go'
        ? '🔴 NO-GO'
        : '🟡 BID WITH CAVEATS';
    const lines: string[] = [
      `# Capability Assessment — ${project.name}`,
      '',
      `**Company:** ${brand?.name || 'Not specified'}`,
      `**Readiness score:** ${a.readinessScore}/100`,
      `**Recommendation:** ${recLabel}`,
      `**Assessed:** ${new Date(a.assessedAt).toLocaleString()}`,
      '',
    ];

    if (a.recommendationReason) {
      lines.push(`**Why:** ${a.recommendationReason}`, '');
    }

    lines.push('## Needs vs. Capabilities', '');
    if (a.items.length > 0) {
      lines.push('| # | Customer need | Source | Capability | Evidence | Gap / Action |', '| --- | --- | --- | --- | --- | --- |');
      a.items.forEach((item, i) => {
        const cap =
          item.capability === 'strong'
            ? '✅ Strong'
            : item.capability === 'partial'
            ? '🟡 Partial'
            : item.capability === 'gap'
            ? '❌ Gap'
            : '❓ Unknown';
        const cell = (s: string) => s.replace(/\|/g, '\\|').replace(/\n/g, ' ').slice(0, 200);
        lines.push(
          `| ${i + 1} | ${cell(item.need)} | ${item.source} | ${cap} | ${cell(item.evidence)} | ${cell(item.gap || item.action)} |`
        );
      });
      lines.push('');
    } else {
      lines.push('No needs assessed yet — run the assessment after dissecting the solicitation.', '');
    }

    if (a.strengths.length) {
      lines.push('## Where We Are Strong', '');
      a.strengths.forEach(s => lines.push(`- ✅ ${s}`));
      lines.push('');
    }
    if (a.gaps.length) {
      lines.push('## Where We Have Gaps', '');
      a.gaps.forEach(g => lines.push(`- ❌ ${g}`));
      lines.push('');
    }

    lines.push('> ⚠️ Machine assessment. Verify every claim against real capability before committing a bid.');
    return lines.join('\n');
  }
}

export const capabilityAssessmentService = CapabilityAssessmentService.getInstance();
