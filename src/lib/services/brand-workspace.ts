import { sqlDatabase } from '@/lib/database/sqlite';
import type { 
  BrandDocument, 
  Brand, 
  Project, 
  ChatSession, 
  ChatMessage, 
  GeneratedOutput,
  DocumentType,
  ProjectType,
  ProjectStatus
} from '@/types/brand-workspace';

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

class BrandWorkspaceService {
  private static instance: BrandWorkspaceService;

  private constructor() {}

  static getInstance(): BrandWorkspaceService {
    if (!BrandWorkspaceService.instance) {
      BrandWorkspaceService.instance = new BrandWorkspaceService();
    }
    return BrandWorkspaceService.instance;
  }

  async initialize(): Promise<void> {
    sqlDatabase.initialize();
  }

  async createBrand(brand: Omit<Brand, 'id' | 'createdAt' | 'updatedAt'>): Promise<Brand> {
    await this.initialize();
    const id = generateId();
    const now = Date.now();
    
    const newBrand: Brand = {
      ...brand,
      id,
      voiceProfile: brand.voiceProfile || {},
      settings: brand.settings || {},
      tags: brand.tags || [],
      createdAt: now,
      updatedAt: now,
    };

    await sqlDatabase.run(
      `INSERT INTO brands_v2 (id, name, description, industry, website, logo, voice_profile, settings, tags, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        brand.name,
        brand.description || null,
        brand.industry || null,
        brand.website || null,
        brand.logo || null,
        JSON.stringify(newBrand.voiceProfile),
        JSON.stringify(newBrand.settings),
        JSON.stringify(newBrand.tags),
        now,
        now,
      ]
    );

    return newBrand;
  }

  async getBrands(): Promise<Brand[]> {
    await this.initialize();
    const rows = await sqlDatabase.all('SELECT * FROM brands_v2 ORDER BY name');
    return rows.map(this.mapRowToBrand);
  }

  async getBrandById(id: string): Promise<Brand | null> {
    await this.initialize();
    const row = await sqlDatabase.get('SELECT * FROM brands_v2 WHERE id = ?', [id]);
    return row ? this.mapRowToBrand(row) : null;
  }

  async updateBrand(id: string, updates: Partial<Brand>): Promise<Brand | null> {
    await this.initialize();
    const brand = await this.getBrandById(id);
    if (!brand) return null;

    const updated = { ...brand, ...updates, updatedAt: Date.now() };

    await sqlDatabase.run(
      `UPDATE brands_v2 SET name = ?, description = ?, industry = ?, website = ?, logo = ?, 
       voice_profile = ?, settings = ?, tags = ?, updated_at = ? WHERE id = ?`,
      [
        updated.name,
        updated.description || null,
        updated.industry || null,
        updated.website || null,
        updated.logo || null,
        JSON.stringify(updated.voiceProfile),
        JSON.stringify(updated.settings),
        JSON.stringify(updated.tags),
        updated.updatedAt,
        id,
      ]
    );

    return updated;
  }

  async deleteBrand(id: string): Promise<boolean> {
    await this.initialize();
    
    const documents = await this.getBrandDocuments(id);
    for (const doc of documents) {
      await this.deleteDocument(doc.id);
    }
    
    const projects = await this.getProjects(id);
    for (const project of projects) {
      await this.deleteProject(project.id);
    }

    await sqlDatabase.run('DELETE FROM brands_v2 WHERE id = ?', [id]);
    return true;
  }

  async addDocument(
    brandId: string,
    document: {
      title: string;
      type: DocumentType;
      content: string;
      originalFilename?: string;
      projectId?: string;
      metadata?: BrandDocument['metadata'];
    }
  ): Promise<BrandDocument> {
    await this.initialize();
    const id = generateId();
    const now = Date.now();

    const newDoc: BrandDocument = {
      id,
      brandId,
      title: document.title,
      originalFilename: document.originalFilename,
      type: document.type,
      source: document.projectId ? 'project' : 'brand',
      projectId: document.projectId,
      content: document.content,
      metadata: {
        ...document.metadata,
        importedAt: now,
      },
      vectorized: false,
      createdAt: now,
      updatedAt: now,
    };

    await sqlDatabase.run(
      `INSERT INTO brand_documents (id, brand_id, title, original_filename, type, source, project_id, content, metadata, vectorized, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        brandId,
        newDoc.title,
        newDoc.originalFilename || null,
        newDoc.type,
        newDoc.source,
        newDoc.projectId || null,
        newDoc.content,
        JSON.stringify(newDoc.metadata),
        newDoc.vectorized ? 1 : 0,
        now,
        now,
      ]
    );

    return newDoc;
  }

  async getBrandDocuments(brandId: string, projectId?: string): Promise<BrandDocument[]> {
    await this.initialize();
    let query = 'SELECT * FROM brand_documents WHERE brand_id = ?';
    const params: any[] = [brandId];

    if (projectId) {
      query += ' AND (project_id = ? OR project_id IS NULL)';
      params.push(projectId);
    }

    query += ' ORDER BY created_at DESC';
    const rows = await sqlDatabase.all(query, params);
    return rows.map(this.mapRowToDocument);
  }

  async getDocumentById(id: string): Promise<BrandDocument | null> {
    await this.initialize();
    const row = await sqlDatabase.get('SELECT * FROM brand_documents WHERE id = ?', [id]);
    return row ? this.mapRowToDocument(row) : null;
  }

  async updateDocument(id: string, updates: Partial<BrandDocument>): Promise<BrandDocument | null> {
    await this.initialize();
    const doc = await this.getDocumentById(id);
    if (!doc) return null;

    const updated = { ...doc, ...updates, updatedAt: Date.now() };

    await sqlDatabase.run(
      `UPDATE brand_documents SET title = ?, content = ?, compacted_content = ?, metadata = ?, vectorized = ?, updated_at = ? WHERE id = ?`,
      [
        updated.title,
        updated.content,
        updated.compactedContent || null,
        JSON.stringify(updated.metadata),
        updated.vectorized ? 1 : 0,
        updated.updatedAt,
        id,
      ]
    );

    return updated;
  }

  async deleteDocument(id: string): Promise<boolean> {
    await this.initialize();
    await sqlDatabase.run('DELETE FROM brand_documents WHERE id = ?', [id]);
    return true;
  }

  async compactDocument(id: string): Promise<BrandDocument | null> {
    const doc = await this.getDocumentById(id);
    if (!doc) return null;

    const compacted = this.compactMarkdown(doc.content);
    return this.updateDocument(id, { compactedContent: compacted });
  }

  private compactMarkdown(content: string): string {
    let compacted = content;
    
    compacted = compacted.replace(/\n{3,}/g, '\n\n');
    compacted = compacted.replace(/[ \t]+\n/g, '\n');
    compacted = compacted.replace(/\n[ \t]+/g, '\n');
    
    const lines = compacted.split('\n');
    const compactedLines: string[] = [];
    let previousWasEmpty = false;

    for (const line of lines) {
      const isEmpty = line.trim() === '';
      if (isEmpty && previousWasEmpty) continue;
      compactedLines.push(line);
      previousWasEmpty = isEmpty;
    }

    return compactedLines.join('\n').trim();
  }

  async createProject(
    brandId: string,
    project: Omit<Project, 'id' | 'brandId' | 'createdAt' | 'updatedAt'>
  ): Promise<Project> {
    await this.initialize();
    const id = generateId();
    const now = Date.now();

    const newProject: Project = {
      ...project,
      id,
      brandId,
      deliverables: project.deliverables || [],
      tags: project.tags || [],
      createdAt: now,
      updatedAt: now,
    };

    await sqlDatabase.run(
      `INSERT INTO projects_v2 (id, brand_id, name, description, type, status, requirements, deliverables, deadline, metadata, tags, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        brandId,
        newProject.name,
        newProject.description || null,
        newProject.type,
        newProject.status,
        newProject.requirements || null,
        JSON.stringify(newProject.deliverables),
        newProject.deadline || null,
        JSON.stringify(newProject.metadata || {}),
        JSON.stringify(newProject.tags),
        now,
        now,
      ]
    );

    return newProject;
  }

  async getProjects(brandId?: string, status?: ProjectStatus): Promise<Project[]> {
    await this.initialize();
    let query = 'SELECT * FROM projects_v2 WHERE 1=1';
    const params: any[] = [];

    if (brandId) {
      query += ' AND brand_id = ?';
      params.push(brandId);
    }

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }

    query += ' ORDER BY updated_at DESC';
    const rows = await sqlDatabase.all(query, params);
    return rows.map(this.mapRowToProject);
  }

  async getProjectById(id: string): Promise<Project | null> {
    await this.initialize();
    const row = await sqlDatabase.get('SELECT * FROM projects_v2 WHERE id = ?', [id]);
    return row ? this.mapRowToProject(row) : null;
  }

  async updateProject(id: string, updates: Partial<Project>): Promise<Project | null> {
    await this.initialize();
    const project = await this.getProjectById(id);
    if (!project) return null;

    const updated = { ...project, ...updates, updatedAt: Date.now() };

    await sqlDatabase.run(
      `UPDATE projects_v2 SET name = ?, description = ?, type = ?, status = ?, requirements = ?, deliverables = ?, deadline = ?, metadata = ?, tags = ?, updated_at = ? WHERE id = ?`,
      [
        updated.name,
        updated.description || null,
        updated.type,
        updated.status,
        updated.requirements || null,
        JSON.stringify(updated.deliverables),
        updated.deadline || null,
        JSON.stringify(updated.metadata || {}),
        JSON.stringify(updated.tags),
        updated.updatedAt,
        id,
      ]
    );

    return updated;
  }

  async deleteProject(id: string): Promise<boolean> {
    await this.initialize();
    
    await sqlDatabase.run('DELETE FROM brand_documents WHERE project_id = ?', [id]);
    await sqlDatabase.run('DELETE FROM chat_sessions WHERE project_id = ?', [id]);
    await sqlDatabase.run('DELETE FROM projects_v2 WHERE id = ?', [id]);
    
    return true;
  }

  async createChatSession(projectId: string | null | undefined, brandId: string, title?: string): Promise<ChatSession> {
    await this.initialize();
    const id = generateId();
    const now = Date.now();

    const session: ChatSession = {
      id,
      projectId: projectId || undefined,
      brandId,
      title: title || `Chat ${new Date().toLocaleDateString()}`,
      messages: [],
      context: {
        brandDocumentsUsed: [],
        projectDocumentsUsed: [],
        totalTokensUsed: 0,
      },
      createdAt: now,
      updatedAt: now,
    };

    await sqlDatabase.run(
      `INSERT INTO chat_sessions (id, project_id, brand_id, title, messages, context, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        projectId || null,
        brandId,
        session.title,
        JSON.stringify(session.messages),
        JSON.stringify(session.context),
        now,
        now,
      ]
    );

    return session;
  }

  async getChatSessions(projectId?: string): Promise<ChatSession[]> {
    await this.initialize();
    let rows;
    if (projectId) {
      rows = await sqlDatabase.all(
        'SELECT * FROM chat_sessions WHERE project_id = ? ORDER BY updated_at DESC',
        [projectId]
      );
    } else {
      rows = await sqlDatabase.all(
        'SELECT * FROM chat_sessions WHERE project_id IS NULL ORDER BY updated_at DESC'
      );
    }
    return rows.map(this.mapRowToChatSession);
  }

  async getChatSessionById(id: string): Promise<ChatSession | null> {
    await this.initialize();
    const row = await sqlDatabase.get('SELECT * FROM chat_sessions WHERE id = ?', [id]);
    return row ? this.mapRowToChatSession(row) : null;
  }

  async addMessageToSession(sessionId: string, message: Omit<ChatMessage, 'id' | 'timestamp'>): Promise<ChatSession | null> {
    await this.initialize();
    const session = await this.getChatSessionById(sessionId);
    if (!session) return null;

    const newMessage: ChatMessage = {
      ...message,
      id: generateId(),
      timestamp: Date.now(),
    };

    session.messages.push(newMessage);
    session.updatedAt = Date.now();

    await sqlDatabase.run(
      `UPDATE chat_sessions SET messages = ?, updated_at = ? WHERE id = ?`,
      [JSON.stringify(session.messages), session.updatedAt, sessionId]
    );

    return session;
  }

  async updateSessionContext(
    sessionId: string,
    context: Partial<ChatSession['context']>
  ): Promise<void> {
    await this.initialize();
    const session = await this.getChatSessionById(sessionId);
    if (!session) return;

    session.context = { ...session.context, ...context };
    session.updatedAt = Date.now();

    await sqlDatabase.run(
      `UPDATE chat_sessions SET context = ?, updated_at = ? WHERE id = ?`,
      [JSON.stringify(session.context), session.updatedAt, sessionId]
    );
  }

  async deleteChatSession(id: string): Promise<boolean> {
    await this.initialize();
    await sqlDatabase.run('DELETE FROM chat_sessions WHERE id = ?', [id]);
    return true;
  }

  async saveGeneratedOutput(
    projectId: string,
    output: {
      type: GeneratedOutput['type'];
      title: string;
      content: string;
      format: GeneratedOutput['format'];
      sessionId?: string;
      metadata?: Record<string, any>;
    }
  ): Promise<GeneratedOutput> {
    await this.initialize();
    const id = generateId();
    const now = Date.now();

    const newOutput: GeneratedOutput = {
      id,
      projectId,
      sessionId: output.sessionId,
      type: output.type,
      title: output.title,
      content: output.content,
      format: output.format,
      metadata: output.metadata,
      createdAt: now,
      updatedAt: now,
    };

    await sqlDatabase.run(
      `INSERT INTO generated_outputs (id, project_id, session_id, type, title, content, format, metadata, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        projectId,
        output.sessionId || null,
        output.type,
        output.title,
        output.content,
        output.format,
        JSON.stringify(output.metadata || {}),
        now,
        now,
      ]
    );

    return newOutput;
  }

  async getGeneratedOutputs(projectId: string): Promise<GeneratedOutput[]> {
    await this.initialize();
    const rows = await sqlDatabase.all(
      'SELECT * FROM generated_outputs WHERE project_id = ? ORDER BY created_at DESC',
      [projectId]
    );
    return rows.map(this.mapRowToGeneratedOutput);
  }

  async getGeneratedOutputById(id: string): Promise<GeneratedOutput | null> {
    await this.initialize();
    const row = await sqlDatabase.get('SELECT * FROM generated_outputs WHERE id = ?', [id]);
    return row ? this.mapRowToGeneratedOutput(row) : null;
  }

  async deleteGeneratedOutput(id: string): Promise<boolean> {
    await this.initialize();
    await sqlDatabase.run('DELETE FROM generated_outputs WHERE id = ?', [id]);
    return true;
  }

  async buildContextForChat(brandId: string, projectId?: string): Promise<{
    systemPrompt: string;
    documents: BrandDocument[];
  }> {
    const brand = await this.getBrandById(brandId);
    if (!brand) {
      throw new Error('Brand not found');
    }

    const brandDocs = await this.getBrandDocuments(brandId);
    const documents: BrandDocument[] = [...brandDocs];
    const contextParts: string[] = [];

    contextParts.push(`# Brand: ${brand.name}`);
    if (brand.description) {
      contextParts.push(`\n## Description\n${brand.description}`);
    }
    if (brand.industry) {
      contextParts.push(`\n## Industry\n${brand.industry}`);
    }

    if (brand.voiceProfile) {
      contextParts.push('\n## Brand Voice Guidelines');
      if (brand.voiceProfile.tone) {
        contextParts.push(`**Tone:** ${brand.voiceProfile.tone}`);
      }
      if (brand.voiceProfile.style) {
        contextParts.push(`**Style:** ${brand.voiceProfile.style}`);
      }
      if (brand.voiceProfile.keyMessages?.length) {
        contextParts.push(`**Key Messages:** ${brand.voiceProfile.keyMessages.join(', ')}`);
      }
      if (brand.voiceProfile.avoidPhrases?.length) {
        contextParts.push(`**Avoid:** ${brand.voiceProfile.avoidPhrases.join(', ')}`);
      }
      if (brand.voiceProfile.customInstructions) {
        contextParts.push(`**Additional Instructions:** ${brand.voiceProfile.customInstructions}`);
      }
    }

    if (projectId) {
      const project = await this.getProjectById(projectId);
      if (project) {
        contextParts.push(`\n# Project: ${project.name}`);
        contextParts.push(`**Type:** ${project.type}`);
        contextParts.push(`**Status:** ${project.status}`);
        if (project.description) {
          contextParts.push(`\n## Project Description\n${project.description}`);
        }
        if (project.requirements) {
          contextParts.push(`\n## Requirements\n${project.requirements}`);
        }
        if (project.deliverables?.length) {
          contextParts.push(`\n## Deliverables\n${project.deliverables.map(d => `- ${d}`).join('\n')}`);
        }

        const projectDocs = await this.getBrandDocuments(brandId, projectId);
        documents.push(...projectDocs);
      }
    }

    if (documents.length > 0) {
      contextParts.push('\n# Available Documents');
      for (const doc of documents) {
        const content = doc.compactedContent || doc.content;
        const truncatedContent = content.length > 4000 ? content.substring(0, 4000) + '\n...[truncated]' : content;
        contextParts.push(`\n## ${doc.title} (${doc.type})\n${truncatedContent}`);
      }
    }

    return {
      systemPrompt: contextParts.join('\n'),
      documents,
    };
  }

  private mapRowToBrand(row: any): Brand {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      industry: row.industry,
      website: row.website,
      logo: row.logo,
      voiceProfile: row.voice_profile ? JSON.parse(row.voice_profile) : {},
      settings: row.settings ? JSON.parse(row.settings) : {},
      tags: row.tags ? JSON.parse(row.tags) : [],
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private mapRowToDocument(row: any): BrandDocument {
    return {
      id: row.id,
      brandId: row.brand_id,
      title: row.title,
      originalFilename: row.original_filename,
      type: row.type,
      source: row.source,
      projectId: row.project_id,
      content: row.content,
      compactedContent: row.compacted_content,
      metadata: row.metadata ? JSON.parse(row.metadata) : {},
      vectorized: !!row.vectorized,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private mapRowToProject(row: any): Project {
    return {
      id: row.id,
      brandId: row.brand_id,
      name: row.name,
      description: row.description,
      type: row.type,
      status: row.status,
      requirements: row.requirements,
      deliverables: row.deliverables ? JSON.parse(row.deliverables) : [],
      deadline: row.deadline,
      metadata: row.metadata ? JSON.parse(row.metadata) : {},
      tags: row.tags ? JSON.parse(row.tags) : [],
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private mapRowToChatSession(row: any): ChatSession {
    return {
      id: row.id,
      projectId: row.project_id,
      brandId: row.brand_id,
      title: row.title,
      messages: row.messages ? JSON.parse(row.messages) : [],
      context: row.context ? JSON.parse(row.context) : {
        brandDocumentsUsed: [],
        projectDocumentsUsed: [],
        totalTokensUsed: 0,
      },
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private mapRowToGeneratedOutput(row: any): GeneratedOutput {
    return {
      id: row.id,
      projectId: row.project_id,
      sessionId: row.session_id,
      type: row.type,
      title: row.title,
      content: row.content,
      format: row.format,
      metadata: row.metadata ? JSON.parse(row.metadata) : {},
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

export const brandWorkspace = BrandWorkspaceService.getInstance();