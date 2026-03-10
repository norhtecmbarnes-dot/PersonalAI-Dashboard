import { sqlDatabase } from '@/lib/database/sqlite';
import { brandWorkspace } from './brand-workspace';
import { knowledgeExtractor } from './knowledge-extractor';
import type { ExtractedKnowledge } from './knowledge-extractor';
import type { 
  CaptureDocument, 
  ComplianceMatrix, 
  ComplianceMatrixItem, 
  BidWorkflow,
  Project,
  BrandDocument
} from '@/types/brand-workspace';

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
    await sqlDatabase.initialize();
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
    model?: string
  ): Promise<ComplianceMatrix> {
    await this.initialize();

    // Extract requirements from documents
    const requirements = await this.extractRequirements(documents, model, 200);

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