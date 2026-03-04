import { sqlDatabase } from '@/lib/database/sqlite';

export interface Document {
  id: string;
  title: string;
  type: 'text' | 'pdf' | 'markdown' | 'code' | 'other';
  content: string;
  createdAt: number;
  size: number;
  category?: string;
  metadata?: {
    author?: string;
    tags?: string[];
    summary?: string;
    importance?: string;
    [key: string]: any;
  };
}

export class DocumentStore {
  private static initialized = false;

  private static async ensureInit(): Promise<void> {
    if (!DocumentStore.initialized) {
      await sqlDatabase.initialize();
      DocumentStore.initialized = true;
    }
  }

  static async create(document: Omit<Document, 'id' | 'createdAt'>): Promise<Document> {
    await DocumentStore.ensureInit();
    
    const result = sqlDatabase.addDocument({
      title: document.title,
      content: document.content,
      type: document.type,
      category: document.category,
      tags: document.metadata?.tags,
      metadata: document.metadata,
    });

    return {
      id: result.id,
      title: document.title,
      type: document.type,
      content: document.content,
      createdAt: result.createdAt,
      size: document.size,
      category: document.category,
      metadata: document.metadata,
    };
  }

  static async getAll(): Promise<Document[]> {
    await DocumentStore.ensureInit();
    const docs = sqlDatabase.getDocuments();
    return docs.map((d: any) => ({
      id: d.id,
      title: d.title,
      type: d.type || 'text',
      content: d.content,
      createdAt: d.created_at,
      size: d.size,
      category: d.category,
      metadata: d.metadata,
    }));
  }

  static async getById(id: string): Promise<Document | null> {
    await DocumentStore.ensureInit();
    const doc = sqlDatabase.getDocumentById(id);
    if (!doc) return null;
    
    return {
      id: doc.id,
      title: doc.title,
      type: doc.type || 'text',
      content: doc.content,
      createdAt: doc.created_at,
      size: doc.size,
      category: doc.category,
      metadata: doc.metadata,
    };
  }

  static async update(id: string, updates: Partial<Document>): Promise<Document | null> {
    await DocumentStore.ensureInit();
    const success = sqlDatabase.updateDocument(id, {
      title: updates.title,
      content: updates.content,
      type: updates.type,
      category: updates.category,
      tags: updates.metadata?.tags,
      metadata: updates.metadata,
    });

    if (!success) return null;
    return DocumentStore.getById(id);
  }

  static async delete(id: string): Promise<boolean> {
    await DocumentStore.ensureInit();
    return sqlDatabase.deleteDocument(id);
  }

  static async search(query: string): Promise<Document[]> {
    await DocumentStore.ensureInit();
    const docs = sqlDatabase.searchDocuments(query);
    return docs.map((d: any) => ({
      id: d.id,
      title: d.title,
      type: d.type || 'text',
      content: d.content,
      createdAt: d.created_at,
      size: d.size,
      category: d.category,
      metadata: d.metadata,
    }));
  }

  static async getByType(type: Document['type']): Promise<Document[]> {
    await DocumentStore.ensureInit();
    const docs = sqlDatabase.getDocuments(type);
    return docs.map((d: any) => ({
      id: d.id,
      title: d.title,
      type: d.type || 'text',
      content: d.content,
      createdAt: d.created_at,
      size: d.size,
      category: d.category,
      metadata: d.metadata,
    }));
  }

  static async getByTags(tags: string[]): Promise<Document[]> {
    await DocumentStore.ensureInit();
    const allDocs = await DocumentStore.getAll();
    return allDocs.filter(doc =>
      doc.metadata?.tags?.some(tag => tags.includes(tag))
    );
  }

  static async clear(): Promise<void> {
    await DocumentStore.ensureInit();
    const docs = await DocumentStore.getAll();
    for (const doc of docs) {
      await DocumentStore.delete(doc.id);
    }
  }

  // Synchronous wrappers for backwards compatibility
  static createSync(document: Omit<Document, 'id' | 'createdAt'>): Document {
    let result: Document | null = null;
    DocumentStore.create(document).then(doc => { result = doc; });
    return result || {
      id: Date.now().toString(),
      title: document.title,
      type: document.type,
      content: document.content,
      createdAt: Date.now(),
      size: document.size,
    };
  }

  static getAllSync(): Document[] {
    // This is called from API routes on server, need to be sync
    // Use the promise version in API routes instead
    return [];
  }
}