import { sqlDatabase, type ProposalTask } from '@/lib/database/sqlite';
import { brandWorkspace } from './brand-workspace';
import { bidWorkflowService } from './bid-workflow';
import { chatCompletion } from '@/lib/models/sdk.server';

const DEFAULT_MODEL = 'ollama/glm-4.7-flash';

/**
 * Proposal Task Tracker — an AI to-do list for each procurement.
 *
 * Generates the proposal's task list (section, task, assignee, status) from the
 * proposal markdown + capture knowledge, stores it in SQLite, and lets the team
 * check off sections as they move from pending → in progress → completed.
 */
export class ProposalTasksService {
  private static instance: ProposalTasksService;

  private constructor() {}

  static getInstance(): ProposalTasksService {
    if (!ProposalTasksService.instance) {
      ProposalTasksService.instance = new ProposalTasksService();
    }
    return ProposalTasksService.instance;
  }

  getTasks(projectId: string): ProposalTask[] {
    sqlDatabase.initialize();
    return sqlDatabase.getProposalTasks(projectId);
  }

  addTask(
    task: Omit<ProposalTask, 'id' | 'createdAt' | 'updatedAt'>
  ): ProposalTask {
    sqlDatabase.initialize();
    return sqlDatabase.addProposalTask(task);
  }

  updateTask(id: string, updates: Partial<ProposalTask>): ProposalTask | null {
    sqlDatabase.initialize();
    return sqlDatabase.updateProposalTask(id, updates);
  }

  deleteTask(id: string): boolean {
    sqlDatabase.initialize();
    return sqlDatabase.deleteProposalTask(id);
  }

  /**
   * Generate (or refresh) the task list for a procurement from the proposal
   * markdown, capture document, and compliance matrix. Existing tasks are kept:
   * matched by title so completed work and manual edits survive regeneration.
   */
  async generateTasks(
    brandId: string,
    projectId: string,
    proposalMarkdown?: string,
    model?: string
  ): Promise<ProposalTask[]> {
    sqlDatabase.initialize();
    const project = await brandWorkspace.getProjectById(projectId);
    if (!project) throw new Error('Procurement not found');

    const [brand, capture, complianceMatrix, outputs] = await Promise.all([
      brandWorkspace.getBrandById(brandId).catch(() => null),
      bidWorkflowService.getCaptureDocumentByProject(projectId).catch(() => null),
      bidWorkflowService.getComplianceMatrixByProject(projectId).catch(() => null),
      brandWorkspace.getGeneratedOutputs(projectId).catch(() => []),
    ]);

    const proposal =
      proposalMarkdown && proposalMarkdown.trim()
        ? proposalMarkdown
        : outputs
            .filter(o => o.type === 'proposal')
            .sort((a, b) => b.createdAt - a.createdAt)[0]?.content || '';

    const metadata = (project.metadata as Record<string, unknown>) || {};
    const winThemes: string[] = (capture?.extractedData?.winThemes as string[]) || [];
    const requirements: string[] = (capture?.extractedData?.keyRequirements as string[]) || [];
    const matrixRows = complianceMatrix?.items || [];

    const sourceText = [
      `Project: ${project.name}`,
      `Solicitation type: ${metadata.solicitationType || 'unknown'}`,
      `Description: ${project.description || ''}`,
      winThemes.length ? `Win themes: ${winThemes.join('; ')}` : '',
      requirements.length ? `Key requirements: ${requirements.join('; ')}` : '',
      matrixRows.length
        ? `Compliance matrix (${matrixRows.length} items): ${matrixRows
            .slice(0, 25)
            .map(r => `${r.requirementText || ''} [${r.status || 'unknown'}]`)
            .join(' | ')}`
        : '',
      proposal ? `\n## PROPOSAL\n${proposal.slice(0, 25000)}` : '',
    ]
      .filter(Boolean)
      .join('\n\n');

    const prompt = `${sourceText}

## TASK
Build the proposal task list for this procurement: one to-do item per proposal section, with the person responsible and current status. Break large sections into 2-3 concrete tasks when that helps (e.g. "Technical Approach" → draft, technical review, red-team).

Rules:
- sections: use the proposal's real section names (Executive Summary, Technical Approach, Management, Past Performance, Staffing, Pricing, Compliance, etc.)
- assignee: the role/person responsible — use a real name only if the source names one, otherwise the role (e.g. "Proposal Manager", "Technical Lead", "Pricing Analyst")
- status: pending | in_progress | completed — only mark completed if the source material shows the work is done
- Ground everything in the source. Do not invent people.

Return STRICT JSON only:
{"tasks":[{"section":"...","title":"...","assignee":"...","status":"pending"}]}`;

    let generated: { section?: string; title?: string; assignee?: string; status?: string }[] = [];
    try {
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
        if (Array.isArray(parsed.tasks)) generated = parsed.tasks;
      }
    } catch (e) {
      console.error('[ProposalTasks] Generation failed:', e);
    }

    // Heuristic fallback so the list is never empty.
    if (generated.length === 0) {
      generated = [
        { section: 'Executive Summary', title: 'Draft executive summary grounded in win themes', assignee: 'Proposal Manager', status: 'pending' },
        { section: 'Technical Approach', title: 'Draft technical approach from key requirements', assignee: 'Technical Lead', status: 'pending' },
        { section: 'Management', title: 'Draft management and staffing approach', assignee: 'Program Manager', status: 'pending' },
        { section: 'Past Performance', title: 'Compile past performance evidence', assignee: 'Proposal Manager', status: 'pending' },
        { section: 'Pricing', title: 'Build pricing and cost volume', assignee: 'Pricing Analyst', status: 'pending' },
        { section: 'Compliance', title: 'Verify all requirements against the compliance matrix', assignee: 'Compliance Lead', status: 'pending' },
      ];
    }

    const existing = this.getTasks(projectId);
    const seen = new Set<string>();
    for (const item of generated.slice(0, 40)) {
      const title = (item.title || '').trim();
      if (!title) continue;
      const section = (item.section || '').trim() || 'General';
      const status: ProposalTask['status'] = ['pending', 'in_progress', 'completed'].includes(
        (item.status || '').toLowerCase()
      )
        ? (item.status as ProposalTask['status'])
        : 'pending';

      const match = existing.find(
        t => t.title.toLowerCase() === title.toLowerCase() && t.section?.toLowerCase() === section.toLowerCase()
      );
      if (match) {
        // Keep the team's progress; refresh section/assignee from the new generation.
        this.updateTask(match.id, { section, assignee: item.assignee || match.assignee });
        seen.add(match.id);
      } else {
        const created = this.addTask({
          projectId,
          section,
          title,
          assignee: (item.assignee || '').trim() || undefined,
          status,
          orderIndex: existing.length + seen.size,
        });
        seen.add(created.id);
      }
    }

    return this.getTasks(projectId);
  }
}

export const proposalTasks = ProposalTasksService.getInstance();
