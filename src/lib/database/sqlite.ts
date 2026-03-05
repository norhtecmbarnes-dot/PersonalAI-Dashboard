import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import * as path from 'path';

let db: SqlJsDatabase | null = null;
let dbPath: string = '';

async function initDb(): Promise<SqlJsDatabase> {
  if (db) return db;
  
  let SQL: any;
  
  // Runtime detection
  const isNodeRuntime = typeof process !== 'undefined' && 
                        typeof process.cwd === 'function' &&
                        typeof require !== 'undefined';
  
  if (!isNodeRuntime) {
    throw new Error(
      'Database cannot be initialized in Edge Runtime. ' +
      'Please use the Node.js runtime for database operations. ' +
      'Add export const runtime = "nodejs"; to your API route.'
    );
  }
  
  // Node.js runtime - use file-based storage ONLY
  const wasmPath = path.join(process.cwd(), 'node_modules', 'sql.js', 'dist', 'sql-wasm.wasm');
  const wasmBinary = fs.readFileSync(wasmPath);
  
  SQL = await initSqlJs({ wasmBinary });
  
  dbPath = process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'assistant.db');
  const dataDir = path.dirname(dbPath);
  
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  
  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath);
    db = new SQL.Database(fileBuffer);
    console.log('[SQLite] Loaded existing database from:', dbPath);
  } else {
    db = new SQL.Database();
    console.log('[SQLite] Created new database at:', dbPath);
  }
  
  if (!db) {
    throw new Error('Database initialization failed');
  }
  
  return db;
}

function saveDb(): void {
  if (db && dbPath) {
    const data = db.export();
    const buffer = Buffer.from(data);
    try {
      fs.writeFileSync(dbPath, buffer);
      console.log('[SQLite] Database saved to:', dbPath);
    } catch (e) {
      console.error('[SQLite] Failed to save database:', e);
      throw new Error('Failed to save database: ' + (e instanceof Error ? e.message : 'Unknown error'));
    }
  }
}

export interface Contact {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  title?: string;
  notes?: string;
  tags: string[];
  source?: string;
  createdAt: number;
  updatedAt: number;
}

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  startDate: number;
  endDate?: number;
  location?: string;
  attendees?: string[];
  reminder?: number;
  status: 'pending' | 'confirmed' | 'cancelled';
  source?: string;
  createdAt: number;
  updatedAt: number;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  dueDate?: number;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'in_progress' | 'completed';
  assignee?: string;
  tags: string[];
  source?: string;
  createdAt: number;
  updatedAt: number;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  linkedContacts?: string[];
  linkedEvents?: string[];
  linkedTasks?: string[];
  positionX?: number;
  positionY?: number;
  width?: number;
  height?: number;
  color?: string;
  createdAt: number;
  updatedAt: number;
}

export interface Activity {
  id: string;
  type: 'email' | 'call' | 'meeting' | 'message' | 'note' | 'task' | 'other';
  title: string;
  description?: string;
  participants: string[];
  date: number;
  duration?: number;
  outcome?: string;
  tags: string[];
  source?: string;
  rawData?: string;
  createdAt: number;
}

export interface RawData {
  id: string;
  type: 'email' | 'message' | 'text' | 'other';
  content: string;
  sender?: string;
  recipients?: string[];
  date?: number;
  metadata?: Record<string, any>;
  processed: boolean;
  processingResult?: string;
  createdAt: number;
}

export interface VectorLakeEntry {
  id: string;
  query: string;
  searchTerms: string[];
  results: string;
  context: string;
  answer: string;
  embedding: string;
  accessCount: number;
  lastAccessed: number;
  createdAt: number;
  expiresAt: number;
}

export interface Folder {
  id: string;
  name: string;
  parentId: string | null;
  description?: string;
  color?: string;
  createdAt: number;
  updatedAt: number;
}

export interface Brand {
  id: string;
  name: string;
  description?: string;
  website?: string;
  contacts: string[];
  notes: string;
  tags: string[];
  documents: string[];
  createdAt: number;
  updatedAt: number;
  // Brand Voice fields
  persona?: string;
  systemPrompt?: string;
  voiceStyle?: 'professional' | 'casual' | 'technical' | 'friendly' | 'formal';
  industry?: string;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  folderId?: string;
  brandId?: string;
  status: 'active' | 'completed' | 'archived';
  tags: string[];
  createdAt: number;
  updatedAt: number;
}

function generateId(): string {
  return uuidv4();
}

export class SQLDatabase {
  private static instance: SQLDatabase;
  private initialized: boolean = false;

  private constructor() {}

  static getInstance(): SQLDatabase {
    if (!SQLDatabase.instance) {
      SQLDatabase.instance = new SQLDatabase();
    }
    return SQLDatabase.instance;
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;
    await initDb();
    this.createTables();
    this.initialized = true;
  }

  private createTables(): void {
    if (!db) return;
    
    db.run(`
      CREATE TABLE IF NOT EXISTS contacts (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT,
        phone TEXT,
        company TEXT,
        title TEXT,
        notes TEXT,
        tags TEXT,
        source TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS events (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        start_date INTEGER NOT NULL,
        end_date INTEGER,
        location TEXT,
        attendees TEXT,
        reminder INTEGER,
        status TEXT DEFAULT 'pending',
        source TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        due_date INTEGER,
        priority TEXT DEFAULT 'medium',
        status TEXT DEFAULT 'pending',
        assignee TEXT,
        tags TEXT,
        source TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS notes (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        content TEXT,
        category TEXT DEFAULT 'general',
        tags TEXT,
        linked_contacts TEXT,
        linked_events TEXT,
        linked_tasks TEXT,
        position_x INTEGER DEFAULT 0,
        position_y INTEGER DEFAULT 0,
        width INTEGER DEFAULT 300,
        height INTEGER DEFAULT 200,
        color TEXT DEFAULT 'yellow',
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS chat_history (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        summary TEXT,
        markdown_content TEXT NOT NULL,
        messages TEXT,
        model TEXT,
        expert TEXT,
        tags TEXT,
        word_count INTEGER,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS experts (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        title TEXT,
        specialization TEXT NOT NULL,
        description TEXT,
        expertise_level TEXT DEFAULT 'advanced',
        specialization_type TEXT,
        capabilities TEXT,
        language TEXT DEFAULT 'en',
        contact TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS activities (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        participants TEXT,
        date INTEGER NOT NULL,
        duration INTEGER,
        outcome TEXT,
        tags TEXT,
        source TEXT,
        raw_data TEXT,
        created_at INTEGER NOT NULL
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS raw_data (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        content TEXT NOT NULL,
        sender TEXT,
        recipients TEXT,
        date INTEGER,
        metadata TEXT,
        processed INTEGER DEFAULT 0,
        processing_result TEXT,
        created_at INTEGER NOT NULL
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS vector_lake (
        id TEXT PRIMARY KEY,
        query TEXT NOT NULL,
        search_terms TEXT,
        results TEXT,
        context TEXT,
        answer TEXT,
        embedding TEXT,
        access_count INTEGER DEFAULT 1,
        last_accessed INTEGER NOT NULL,
        created_at INTEGER NOT NULL,
        expires_at INTEGER
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS folders (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        parent_id TEXT,
        description TEXT,
        color TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS brands (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        website TEXT,
        contacts TEXT,
        notes TEXT,
        tags TEXT,
        documents TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        folder_id TEXT,
        brand_id TEXT,
        status TEXT DEFAULT 'active',
        tags TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `);

    db.run(`CREATE INDEX IF NOT EXISTS idx_contacts_name ON contacts(name)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(email)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_events_start ON events(start_date)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_tasks_due ON tasks(due_date)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_activities_date ON activities(date)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_activities_type ON activities(type)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_raw_processed ON raw_data(processed)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_vector_lake_query ON vector_lake(query)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_folders_parent ON folders(parent_id)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_projects_folder ON projects(folder_id)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_projects_brand ON projects(brand_id)`);

    // Brand Workspace Tables (v2)
    db.run(`
      CREATE TABLE IF NOT EXISTS brands_v2 (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        industry TEXT,
        website TEXT,
        logo TEXT,
        voice_profile TEXT,
        settings TEXT,
        tags TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS brand_documents (
        id TEXT PRIMARY KEY,
        brand_id TEXT NOT NULL,
        title TEXT NOT NULL,
        original_filename TEXT,
        type TEXT NOT NULL,
        source TEXT NOT NULL,
        project_id TEXT,
        content TEXT,
        compacted_content TEXT,
        metadata TEXT,
        vectorized INTEGER DEFAULT 0,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS projects_v2 (
        id TEXT PRIMARY KEY,
        brand_id TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        type TEXT NOT NULL,
        status TEXT DEFAULT 'active',
        requirements TEXT,
        deliverables TEXT,
        deadline INTEGER,
        metadata TEXT,
        tags TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS chat_sessions (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        brand_id TEXT NOT NULL,
        title TEXT,
        messages TEXT,
        context TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS generated_outputs (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        session_id TEXT,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        content TEXT,
        format TEXT DEFAULT 'markdown',
        metadata TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `);

    db.run(`CREATE INDEX IF NOT EXISTS idx_brands_v2_name ON brands_v2(name)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_brand_documents_brand ON brand_documents(brand_id)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_brand_documents_project ON brand_documents(project_id)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_projects_v2_brand ON projects_v2(brand_id)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_projects_v2_status ON projects_v2(status)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_chat_sessions_project ON chat_sessions(project_id)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_chat_sessions_brand ON chat_sessions(brand_id)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_generated_outputs_project ON generated_outputs(project_id)`);

    // SAM.gov tables
    db.run(`
      CREATE TABLE IF NOT EXISTS sam_searches (
        id TEXT PRIMARY KEY,
        name TEXT,
        keywords TEXT NOT NULL,
        filters TEXT,
        schedule TEXT DEFAULT 'daily',
        enabled INTEGER DEFAULT 1,
        status TEXT DEFAULT 'active',
        results_count INTEGER DEFAULT 0,
        created_at INTEGER NOT NULL,
        last_run INTEGER
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS sam_opportunities (
        id TEXT PRIMARY KEY,
        search_id TEXT,
        title TEXT NOT NULL,
        synopsis TEXT,
        solicitation_number TEXT,
        posted_date TEXT,
        response_deadline TEXT,
        award_amount TEXT,
        naics_code TEXT,
        classification_code TEXT,
        agency TEXT,
        office TEXT,
        location TEXT,
        url TEXT,
        keywords TEXT,
        matched_keywords TEXT,
        captured_at INTEGER NOT NULL
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS sam_api_keys (
        key TEXT PRIMARY KEY,
        created_at INTEGER NOT NULL,
        expires_at INTEGER NOT NULL,
        last_used INTEGER
      )
    `);

    db.run(`CREATE INDEX IF NOT EXISTS idx_sam_searches_status ON sam_searches(status)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_sam_opportunities_search ON sam_opportunities(search_id)`);
    
    // Tracked Opportunities table (user-added opportunities for monitoring)
    db.run(`
      CREATE TABLE IF NOT EXISTS tracked_opportunities (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        synopsis TEXT,
        solicitation_number TEXT,
        opportunity_type TEXT,
        posted_date TEXT,
        updated_date TEXT,
        response_deadline TEXT,
        award_amount TEXT,
        naics_code TEXT,
        classification_code TEXT,
        agency TEXT,
        office TEXT,
        location TEXT,
        url TEXT,
        status TEXT DEFAULT 'active',
        pipeline_stage TEXT DEFAULT 'interested',
        award_date TEXT,
        notes TEXT,
        tags TEXT,
        user_priority TEXT DEFAULT 'medium',
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `);
    
    db.run(`CREATE INDEX IF NOT EXISTS idx_tracked_opportunities_status ON tracked_opportunities(status)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_tracked_opportunities_deadline ON tracked_opportunities(response_deadline)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_tracked_opportunities_pipeline ON tracked_opportunities(pipeline_stage)`);
    
    // Opportunity Documents table (uploaded files for tracked opportunities)
    db.run(`
      CREATE TABLE IF NOT EXISTS opportunity_documents (
        id TEXT PRIMARY KEY,
        opportunity_id TEXT NOT NULL,
        filename TEXT NOT NULL,
        original_name TEXT,
        content TEXT,
        type TEXT,
        size INTEGER,
        uploaded_at INTEGER NOT NULL,
        FOREIGN KEY (opportunity_id) REFERENCES tracked_opportunities(id)
      )
    `);
    
    db.run(`CREATE INDEX IF NOT EXISTS idx_opportunity_documents_opp ON opportunity_documents(opportunity_id)`);
    
    // Opportunity News table (news/updates about tracked opportunities)
    db.run(`
      CREATE TABLE IF NOT EXISTS opportunity_news (
        id TEXT PRIMARY KEY,
        opportunity_id TEXT,
        solicitation_number TEXT,
        title TEXT NOT NULL,
        summary TEXT,
        source TEXT,
        url TEXT,
        news_date TEXT,
        captured_at INTEGER NOT NULL,
        FOREIGN KEY (opportunity_id) REFERENCES tracked_opportunities(id)
      )
    `);
    
    db.run(`CREATE INDEX IF NOT EXISTS idx_opportunity_news_opp ON opportunity_news(opportunity_id)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_opportunity_news_date ON opportunity_news(news_date)`);

    // Documents table (replaces localStorage)
    db.run(`
      CREATE TABLE IF NOT EXISTS documents (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        content TEXT,
        type TEXT DEFAULT 'text',
        category TEXT,
        tags TEXT,
        metadata TEXT,
        size INTEGER DEFAULT 0,
        vectorized INTEGER DEFAULT 0,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `);

    db.run(`CREATE INDEX IF NOT EXISTS idx_documents_type ON documents(type)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_documents_category ON documents(category)`);

    // Scheduled Tasks table
    db.run(`
      CREATE TABLE IF NOT EXISTS scheduled_tasks (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        prompt TEXT,
        task_type TEXT NOT NULL,
        schedule TEXT NOT NULL,
        brand_id TEXT,
        project_id TEXT,
        enabled INTEGER DEFAULT 1,
        permanent INTEGER DEFAULT 0,
        expires_at INTEGER,
        last_run INTEGER,
        last_result TEXT,
        last_error TEXT,
        run_count INTEGER DEFAULT 0,
        success_count INTEGER DEFAULT 0,
        fail_count INTEGER DEFAULT 0,
        config TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `);

    // Migration: Add permanent and expires_at columns if they don't exist
    try {
      db.run(`ALTER TABLE scheduled_tasks ADD COLUMN permanent INTEGER DEFAULT 0`);
    } catch (e) { /* column already exists */ }
    try {
      db.run(`ALTER TABLE scheduled_tasks ADD COLUMN expires_at INTEGER`);
    } catch (e) { /* column already exists */ }

    db.run(`CREATE INDEX IF NOT EXISTS idx_scheduled_tasks_enabled ON scheduled_tasks(enabled)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_scheduled_tasks_type ON scheduled_tasks(task_type)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_scheduled_tasks_brand ON scheduled_tasks(brand_id)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_scheduled_tasks_expires ON scheduled_tasks(expires_at)`);

    // App Config table (replaces localStorage)
    db.run(`
      CREATE TABLE IF NOT EXISTS app_config (
        id TEXT PRIMARY KEY,
        key TEXT UNIQUE NOT NULL,
        value TEXT,
        category TEXT,
        updated_at INTEGER NOT NULL
      )
    `);

    // User Preferences table (replaces localStorage)
    db.run(`
      CREATE TABLE IF NOT EXISTS user_preferences (
        id TEXT PRIMARY KEY,
        key TEXT UNIQUE NOT NULL,
        value TEXT,
        updated_at INTEGER NOT NULL
      )
    `);

    // Metrics table (replaces localStorage ai_dashboard_metrics)
    db.run(`
      CREATE TABLE IF NOT EXISTS metrics (
        id TEXT PRIMARY KEY,
        event_type TEXT NOT NULL,
        data TEXT,
        timestamp INTEGER NOT NULL
      )
    `);

    db.run(`CREATE INDEX IF NOT EXISTS idx_metrics_type ON metrics(event_type)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_metrics_timestamp ON metrics(timestamp)`);

    // Tool Efficiency table (replaces localStorage)
    db.run(`
      CREATE TABLE IF NOT EXISTS tool_efficiency (
        id TEXT PRIMARY KEY,
        tool_name TEXT NOT NULL,
        call_count INTEGER DEFAULT 0,
        total_duration INTEGER DEFAULT 0,
        error_count INTEGER DEFAULT 0,
        last_called INTEGER,
        data TEXT,
        updated_at INTEGER NOT NULL
      )
    `);

    // Self-Improvement Reports table
    db.run(`
      CREATE TABLE IF NOT EXISTS self_improvement_reports (
        id TEXT PRIMARY KEY,
        report_type TEXT NOT NULL,
        content TEXT,
        score INTEGER,
        recommendations TEXT,
        timestamp INTEGER NOT NULL
      )
    `);

    // Intelligence Reports table
    db.run(`
      CREATE TABLE IF NOT EXISTS intelligence_reports (
        id TEXT PRIMARY KEY,
        title TEXT,
        content TEXT,
        category TEXT,
        sources TEXT,
        timestamp INTEGER NOT NULL
      )
    `);

    // Research Reports table
    db.run(`
      CREATE TABLE IF NOT EXISTS research_reports (
        id TEXT PRIMARY KEY,
        query TEXT NOT NULL,
        findings TEXT,
        status TEXT,
        timestamp INTEGER NOT NULL
      )
    `);

    // Book Writer Progress table
    db.run(`
      CREATE TABLE IF NOT EXISTS book_writer_progress (
        id TEXT PRIMARY KEY,
        chapter_id TEXT,
        title TEXT,
        content TEXT,
        status TEXT,
        word_count INTEGER DEFAULT 0,
        updated_at INTEGER NOT NULL
      )
    `);

    // Model Budget table
    db.run(`
      CREATE TABLE IF NOT EXISTS model_budget (
        id TEXT PRIMARY KEY,
        model_id TEXT UNIQUE NOT NULL,
        daily_limit INTEGER,
        used_today INTEGER DEFAULT 0,
        last_reset INTEGER,
        updated_at INTEGER NOT NULL
      )
    `);

    // Settings table (API keys, model preferences, etc.)
    db.run(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT,
        category TEXT DEFAULT 'general',
        updated_at INTEGER NOT NULL
      )
    `);

    db.run(`CREATE INDEX IF NOT EXISTS idx_settings_category ON settings(category)`);
    
    // Custom Tools table (user-defined API tools)
    db.run(`
      CREATE TABLE IF NOT EXISTS custom_tools (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        description TEXT,
        endpoint TEXT NOT NULL,
        method TEXT DEFAULT 'POST',
        headers TEXT,
        body_template TEXT,
        parameters TEXT,
        response_path TEXT,
        enabled INTEGER DEFAULT 1,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `);

    // Memory table (persistent memory system)
    db.run(`
      CREATE TABLE IF NOT EXISTS memory (
        id TEXT PRIMARY KEY,
        category TEXT NOT NULL,
        key TEXT,
        content TEXT NOT NULL,
        source TEXT,
        importance INTEGER DEFAULT 5,
        embedding TEXT,
        metadata TEXT,
        access_count INTEGER DEFAULT 0,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `);

    db.run(`CREATE INDEX IF NOT EXISTS idx_memory_category ON memory(category)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_memory_source ON memory(source)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_memory_created ON memory(created_at)`);

    // Chat Messages table (for memory capture)
    db.run(`
      CREATE TABLE IF NOT EXISTS chat_messages (
        id TEXT PRIMARY KEY,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        session_id TEXT,
        timestamp INTEGER NOT NULL,
        metadata TEXT
      )
    `);

    db.run(`CREATE INDEX IF NOT EXISTS idx_chat_messages_timestamp ON chat_messages(timestamp)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_chat_messages_session ON chat_messages(session_id)`);
    
    db.run(`CREATE INDEX IF NOT EXISTS idx_custom_tools_name ON custom_tools(name)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_custom_tools_enabled ON custom_tools(enabled)`);
    
    // Prompts table (saved user prompts)
    db.run(`
      CREATE TABLE IF NOT EXISTS prompts (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        category TEXT DEFAULT 'general',
        tags TEXT,
        variables TEXT,
        use_count INTEGER DEFAULT 0,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `);
    
    db.run(`CREATE INDEX IF NOT EXISTS idx_prompts_category ON prompts(category)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_prompts_title ON prompts(title)`);
    
    saveDb();
  }

  private parseTags(tags: string | string[] | undefined | null): string[] {
    if (!tags) return [];
    if (Array.isArray(tags)) return tags;
    try {
      return JSON.parse(tags as string);
    } catch {
      return [];
    }
  }

  // Contacts
  addContact(contact: Omit<Contact, 'id' | 'createdAt' | 'updatedAt'>): Contact {
    if (!db) throw new Error('Database not initialized');
    
    const id = generateId();
    const now = Date.now();

    db.run(
      `INSERT INTO contacts (id, name, email, phone, company, title, notes, tags, source, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, contact.name, contact.email || null, contact.phone || null, contact.company || null,
       contact.title || null, contact.notes || null, JSON.stringify(contact.tags || []),
       contact.source || null, now, now]
    );

    saveDb();
    return { ...contact, id, createdAt: now, updatedAt: now };
  }

  updateContact(id: string, updates: Partial<Contact>): Contact | null {
    if (!db) throw new Error('Database not initialized');
    
    const now = Date.now();
    const contact = this.getContactById(id);
    if (!contact) return null;

    const updated = { ...contact, ...updates, updatedAt: now };

    db.run(
      `UPDATE contacts SET name = ?, email = ?, phone = ?, company = ?, title = ?, notes = ?, tags = ?, source = ?, updated_at = ?
       WHERE id = ?`,
      [updated.name, updated.email || null, updated.phone || null, updated.company || null,
       updated.title || null, updated.notes || null, JSON.stringify(updated.tags),
       updated.source || null, now, id]
    );

    saveDb();
    return updated;
  }

  deleteContact(id: string): boolean {
    if (!db) throw new Error('Database not initialized');
    db.run('DELETE FROM contacts WHERE id = ?', [id]);
    saveDb();
    return true;
  }

  getContactById(id: string): Contact | null {
    if (!db) throw new Error('Database not initialized');
    const result = db.exec('SELECT * FROM contacts WHERE id = ?', [id]);
    if (result.length === 0 || result[0].values.length === 0) return null;
    return this.mapRowToContact(result[0].columns, result[0].values[0]);
  }

  getContacts(query?: string): Contact[] {
    if (!db) throw new Error('Database not initialized');
    
    let result;
    if (query) {
      const searchTerm = `%${query}%`;
      result = db.exec(
        `SELECT * FROM contacts WHERE name LIKE ? OR email LIKE ? OR company LIKE ? ORDER BY name`,
        [searchTerm, searchTerm, searchTerm]
      );
    } else {
      result = db.exec('SELECT * FROM contacts ORDER BY name');
    }
    
    if (result.length === 0) return [];
    return result[0].values.map(row => this.mapRowToContact(result[0].columns, row));
  }

  findOrCreateContact(name: string, email?: string): Contact {
    if (!db) throw new Error('Database not initialized');
    
    const result = db.exec('SELECT * FROM contacts WHERE email = ? OR LOWER(name) = LOWER(?)', [email || null, name.toLowerCase()]);
    
    if (result.length > 0 && result[0].values.length > 0) {
      return this.mapRowToContact(result[0].columns, result[0].values[0]);
    }

    return this.addContact({ name, email, tags: [], source: 'auto' });
  }

  private mapRowToContact(columns: string[], values: any[]): Contact {
    const row: any = {};
    columns.forEach((col, i) => row[col] = values[i]);
    return {
      id: row.id,
      name: row.name,
      email: row.email,
      phone: row.phone,
      company: row.company,
      title: row.title,
      notes: row.notes,
      tags: this.parseTags(row.tags),
      source: row.source,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  // Events
  addEvent(event: Omit<CalendarEvent, 'id' | 'createdAt' | 'updatedAt'>): CalendarEvent {
    if (!db) throw new Error('Database not initialized');
    
    const id = generateId();
    const now = Date.now();

    db.run(
      `INSERT INTO events (id, title, description, start_date, end_date, location, attendees, reminder, status, source, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, event.title, event.description || null, event.startDate, event.endDate || null,
       event.location || null, JSON.stringify(event.attendees || []), event.reminder || null,
       event.status || 'pending', event.source || null, now, now]
    );

    saveDb();
    return { ...event, id, createdAt: now, updatedAt: now };
  }

  updateEvent(id: string, updates: Partial<CalendarEvent>): CalendarEvent | null {
    if (!db) throw new Error('Database not initialized');
    
    const now = Date.now();
    const event = this.getEventById(id);
    if (!event) return null;

    const updated = { ...event, ...updates, updatedAt: now };

    db.run(
      `UPDATE events SET title = ?, description = ?, start_date = ?, end_date = ?, location = ?, attendees = ?, reminder = ?, status = ?, source = ?, updated_at = ?
       WHERE id = ?`,
      [updated.title, updated.description || null, updated.startDate, updated.endDate || null,
       updated.location || null, JSON.stringify(updated.attendees || []), updated.reminder || null,
       updated.status, updated.source || null, now, id]
    );

    saveDb();
    return updated;
  }

  deleteEvent(id: string): boolean {
    if (!db) throw new Error('Database not initialized');
    db.run('DELETE FROM events WHERE id = ?', [id]);
    saveDb();
    return true;
  }

  getEventById(id: string): CalendarEvent | null {
    if (!db) throw new Error('Database not initialized');
    const result = db.exec('SELECT * FROM events WHERE id = ?', [id]);
    if (result.length === 0 || result[0].values.length === 0) return null;
    return this.mapRowToEvent(result[0].columns, result[0].values[0]);
  }

  getEvents(startDate?: number, endDate?: number): CalendarEvent[] {
    if (!db) throw new Error('Database not initialized');
    
    let result;
    if (startDate && endDate) {
      result = db.exec(
        'SELECT * FROM events WHERE start_date >= ? AND start_date <= ? ORDER BY start_date',
        [startDate, endDate]
      );
    } else {
      result = db.exec('SELECT * FROM events ORDER BY start_date');
    }
    
    if (result.length === 0) return [];
    return result[0].values.map(row => this.mapRowToEvent(result[0].columns, row));
  }

  getUpcomingEvents(days: number = 7): CalendarEvent[] {
    const now = Date.now();
    const future = now + (days * 24 * 60 * 60 * 1000);
    return this.getEvents(now, future);
  }

  private mapRowToEvent(columns: string[], values: any[]): CalendarEvent {
    const row: any = {};
    columns.forEach((col, i) => row[col] = values[i]);
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      startDate: row.start_date,
      endDate: row.end_date,
      location: row.location,
      attendees: this.parseTags(row.attendees),
      reminder: row.reminder,
      status: row.status,
      source: row.source,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  // Tasks
  addTask(task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Task {
    if (!db) throw new Error('Database not initialized');
    
    const id = generateId();
    const now = Date.now();

    db.run(
      `INSERT INTO tasks (id, title, description, due_date, priority, status, assignee, tags, source, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, task.title, task.description || null, task.dueDate || null, task.priority || 'medium',
       task.status || 'pending', task.assignee || null, JSON.stringify(task.tags || []),
       task.source || null, now, now]
    );

    saveDb();
    return { ...task, id, createdAt: now, updatedAt: now };
  }

  updateTask(id: string, updates: Partial<Task>): Task | null {
    if (!db) throw new Error('Database not initialized');
    
    const now = Date.now();
    const task = this.getTaskById(id);
    if (!task) return null;

    const updated = { ...task, ...updates, updatedAt: now };

    db.run(
      `UPDATE tasks SET title = ?, description = ?, due_date = ?, priority = ?, status = ?, assignee = ?, tags = ?, source = ?, updated_at = ?
       WHERE id = ?`,
      [updated.title, updated.description || null, updated.dueDate || null, updated.priority,
       updated.status, updated.assignee || null, JSON.stringify(updated.tags),
       updated.source || null, now, id]
    );

    saveDb();
    return updated;
  }

  deleteTask(id: string): boolean {
    if (!db) throw new Error('Database not initialized');
    db.run('DELETE FROM tasks WHERE id = ?', [id]);
    saveDb();
    return true;
  }

  getTaskById(id: string): Task | null {
    if (!db) throw new Error('Database not initialized');
    const result = db.exec('SELECT * FROM tasks WHERE id = ?', [id]);
    if (result.length === 0 || result[0].values.length === 0) return null;
    return this.mapRowToTask(result[0].columns, result[0].values[0]);
  }

  getTasks(status?: Task['status'], priority?: Task['priority']): Task[] {
    if (!db) throw new Error('Database not initialized');
    
    let query = 'SELECT * FROM tasks';
    const params: any[] = [];

    if (status || priority) {
      const conditions: string[] = [];
      if (status) {
        conditions.push('status = ?');
        params.push(status);
      }
      if (priority) {
        conditions.push('priority = ?');
        params.push(priority);
      }
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY due_date NULLS LAST, priority DESC, created_at DESC';

    const result = db.exec(query, params);
    if (result.length === 0) return [];
    return result[0].values.map(row => this.mapRowToTask(result[0].columns, row));
  }

  private mapRowToTask(columns: string[], values: any[]): Task {
    const row: any = {};
    columns.forEach((col, i) => row[col] = values[i]);
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      dueDate: row.due_date,
      priority: row.priority,
      status: row.status,
      assignee: row.assignee,
      tags: this.parseTags(row.tags),
      source: row.source,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  // Notes
  addNote(note: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>): Note {
    if (!db) throw new Error('Database not initialized');
    
    const id = generateId();
    const now = Date.now();

    db.run(
      `INSERT INTO notes (id, title, content, category, tags, linked_contacts, linked_events, linked_tasks, position_x, position_y, width, height, color, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, note.title, note.content || '', note.category || 'general',
       JSON.stringify(note.tags || []), JSON.stringify(note.linkedContacts || []),
       JSON.stringify(note.linkedEvents || []), JSON.stringify(note.linkedTasks || []),
       note.positionX || 0, note.positionY || 0, note.width || 300, note.height || 200,
       note.color || 'yellow', now, now]
    );

    saveDb();
    return { ...note, id, createdAt: now, updatedAt: now };
  }

  updateNote(id: string, updates: Partial<Note>): Note | null {
    if (!db) throw new Error('Database not initialized');
    
    const now = Date.now();
    const note = this.getNoteById(id);
    if (!note) return null;

    const updated = { ...note, ...updates, updatedAt: now };

    db.run(
      `UPDATE notes SET title = ?, content = ?, category = ?, tags = ?, linked_contacts = ?, linked_events = ?, linked_tasks = ?, position_x = ?, position_y = ?, width = ?, height = ?, color = ?, updated_at = ?
       WHERE id = ?`,
      [updated.title, updated.content || '', updated.category,
       JSON.stringify(updated.tags), JSON.stringify(updated.linkedContacts || []),
       JSON.stringify(updated.linkedEvents || []), JSON.stringify(updated.linkedTasks || []),
       updated.positionX ?? note.positionX ?? 0, 
       updated.positionY ?? note.positionY ?? 0, 
       updated.width ?? note.width ?? 300, 
       updated.height ?? note.height ?? 200,
       updated.color ?? note.color ?? 'yellow', 
       now, id]
    );

    saveDb();
    return updated;
  }

  deleteNote(id: string): boolean {
    if (!db) throw new Error('Database not initialized');
    db.run('DELETE FROM notes WHERE id = ?', [id]);
    saveDb();
    return true;
  }

  getNoteById(id: string): Note | null {
    if (!db) throw new Error('Database not initialized');
    const result = db.exec('SELECT * FROM notes WHERE id = ?', [id]);
    if (result.length === 0 || result[0].values.length === 0) return null;
    return this.mapRowToNote(result[0].columns, result[0].values[0]);
  }

  getNotes(category?: string): Note[] {
    if (!db) throw new Error('Database not initialized');
    
    let result;
    if (category) {
      result = db.exec('SELECT * FROM notes WHERE category = ? ORDER BY updated_at DESC', [category]);
    } else {
      result = db.exec('SELECT * FROM notes ORDER BY updated_at DESC');
    }
    
    if (result.length === 0) return [];
    return result[0].values.map(row => this.mapRowToNote(result[0].columns, row));
  }

  private mapRowToNote(columns: string[], values: any[]): Note {
    const row: any = {};
    columns.forEach((col, i) => row[col] = values[i]);
    return {
      id: row.id,
      title: row.title,
      content: row.content,
      category: row.category,
      tags: this.parseTags(row.tags),
      linkedContacts: this.parseTags(row.linked_contacts),
      linkedEvents: this.parseTags(row.linked_events),
      linkedTasks: this.parseTags(row.linked_tasks),
      positionX: row.position_x ?? 0,
      positionY: row.position_y ?? 0,
      width: row.width ?? 300,
      height: row.height ?? 200,
      color: row.color || 'yellow',
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  // Activities
  addActivity(activity: Omit<Activity, 'id' | 'createdAt'>): Activity {
    if (!db) throw new Error('Database not initialized');
    
    const id = generateId();
    const now = Date.now();

    db.run(
      `INSERT INTO activities (id, type, title, description, participants, date, duration, outcome, tags, source, raw_data, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, activity.type, activity.title, activity.description || null,
       JSON.stringify(activity.participants || []), activity.date, activity.duration || null,
       activity.outcome || null, JSON.stringify(activity.tags || []),
       activity.source || null, activity.rawData || null, now]
    );

    saveDb();
    return { ...activity, id, createdAt: now };
  }

  getActivities(type?: Activity['type'], days?: number): Activity[] {
    if (!db) throw new Error('Database not initialized');
    
    let query = 'SELECT * FROM activities';
    const params: any[] = [];

    const conditions: string[] = [];
    if (type) {
      conditions.push('type = ?');
      params.push(type);
    }
    if (days) {
      const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000);
      conditions.push('date >= ?');
      params.push(cutoff);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY date DESC';

    const result = db.exec(query, params);
    if (result.length === 0) return [];
    return result[0].values.map(row => this.mapRowToActivity(result[0].columns, row));
  }

  private mapRowToActivity(columns: string[], values: any[]): Activity {
    const row: any = {};
    columns.forEach((col, i) => row[col] = values[i]);
    return {
      id: row.id,
      type: row.type,
      title: row.title,
      description: row.description,
      participants: this.parseTags(row.participants),
      date: row.date,
      duration: row.duration,
      outcome: row.outcome,
      tags: this.parseTags(row.tags),
      source: row.source,
      rawData: row.raw_data,
      createdAt: row.created_at,
    };
  }

  // Raw Data
  addRawData(raw: Omit<RawData, 'id' | 'processed' | 'createdAt'>): RawData {
    if (!db) throw new Error('Database not initialized');
    
    const id = generateId();
    const now = Date.now();

    db.run(
      `INSERT INTO raw_data (id, type, content, sender, recipients, date, metadata, processed, processing_result, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, raw.type, raw.content, raw.sender || null, JSON.stringify(raw.recipients || []),
       raw.date || null, raw.metadata ? JSON.stringify(raw.metadata) : null, 0, null, now]
    );

    saveDb();
    return { ...raw, id, processed: false, createdAt: now };
  }

  markProcessed(id: string, result: string): boolean {
    if (!db) throw new Error('Database not initialized');
    db.run('UPDATE raw_data SET processed = 1, processing_result = ? WHERE id = ?', [result, id]);
    saveDb();
    return true;
  }

  getUnprocessedRawData(): RawData[] {
    if (!db) throw new Error('Database not initialized');
    const result = db.exec('SELECT * FROM raw_data WHERE processed = 0 ORDER BY created_at DESC');
    if (result.length === 0) return [];
    return result[0].values.map(row => this.mapRowToRawData(result[0].columns, row));
  }

  private mapRowToRawData(columns: string[], values: any[]): RawData {
    const row: any = {};
    columns.forEach((col, i) => row[col] = values[i]);
    return {
      id: row.id,
      type: row.type,
      content: row.content,
      sender: row.sender,
      recipients: this.parseTags(row.recipients),
      date: row.date,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
      processed: !!row.processed,
      processingResult: row.processing_result,
      createdAt: row.created_at,
    };
  }

  // Search
  search(query: string): { contacts: Contact[]; events: CalendarEvent[]; tasks: Task[]; notes: Note[]; activities: Activity[] } {
    const searchTerm = `%${query}%`;

    return {
      contacts: this.getContacts(query),
      events: this.getEvents().filter(e =>
        e.title.includes(query) || (e.description?.includes(query))
      ),
      tasks: this.getTasks().filter(t =>
        t.title.includes(query) || (t.description?.includes(query))
      ),
      notes: this.getNotes().filter(n =>
        n.title.includes(query) || n.content.includes(query)
      ),
      activities: this.getActivities().filter(a =>
        a.title.includes(query) || (a.description?.includes(query))
      ),
    };
  }

  // Stats
  getStats(): {
    contacts: number;
    events: number;
    tasks: number;
    notes: number;
    activities: number;
    pendingTasks: number;
    upcomingEvents: number;
  } {
    if (!db) throw new Error('Database not initialized');

    const contactsCount = db.exec('SELECT COUNT(*) as count FROM contacts');
    const eventsCount = db.exec('SELECT COUNT(*) as count FROM events');
    const tasksCount = db.exec('SELECT COUNT(*) as count FROM tasks');
    const notesCount = db.exec('SELECT COUNT(*) as count FROM notes');
    const activitiesCount = db.exec('SELECT COUNT(*) as count FROM activities');
    const pendingTasksCount = db.exec("SELECT COUNT(*) as count FROM tasks WHERE status != 'completed'");

    return {
      contacts: contactsCount[0]?.values[0]?.[0] || 0,
      events: eventsCount[0]?.values[0]?.[0] || 0,
      tasks: tasksCount[0]?.values[0]?.[0] || 0,
      notes: notesCount[0]?.values[0]?.[0] || 0,
      activities: activitiesCount[0]?.values[0]?.[0] || 0,
      pendingTasks: pendingTasksCount[0]?.values[0]?.[0] || 0,
      upcomingEvents: this.getUpcomingEvents(7).length,
    };
  }

  // Export/Import
  exportAll(): string {
    const data = {
      contacts: this.getContacts(),
      events: this.getEvents(),
      tasks: this.getTasks(),
      notes: this.getNotes(),
      activities: this.getActivities(),
      exportedAt: Date.now(),
    };
    return JSON.stringify(data, null, 2);
  }

  importAll(json: string): boolean {
    try {
      const data = JSON.parse(json);

      if (data.contacts) {
        for (const c of data.contacts) {
          this.addContact(c);
        }
      }
      if (data.events) {
        for (const e of data.events) {
          this.addEvent(e);
        }
      }
      if (data.tasks) {
        for (const t of data.tasks) {
          this.addTask(t);
        }
      }
      if (data.notes) {
        for (const n of data.notes) {
          this.addNote(n);
        }
      }
      if (data.activities) {
        for (const a of data.activities) {
          this.addActivity(a);
        }
      }

      return true;
    } catch (error) {
      console.error('Import error:', error);
      return false;
    }
  }

  clearAll(): void {
    if (!db) throw new Error('Database not initialized');
    db.run('DELETE FROM contacts');
    db.run('DELETE FROM events');
    db.run('DELETE FROM tasks');
    db.run('DELETE FROM notes');
    db.run('DELETE FROM activities');
    db.run('DELETE FROM raw_data');
    db.run('DELETE FROM vector_lake');
    saveDb();
  }

  // Vector Lake Methods
  addVectorLakeEntry(entry: Omit<VectorLakeEntry, 'id' | 'accessCount' | 'lastAccessed' | 'createdAt'>): VectorLakeEntry {
    if (!db) throw new Error('Database not initialized');
    
    const id = generateId();
    const now = Date.now();

    db.run(
      `INSERT INTO vector_lake (id, query, search_terms, results, context, answer, embedding, access_count, last_accessed, created_at, expires_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, entry.query, JSON.stringify(entry.searchTerms), entry.results, entry.context,
       entry.answer, entry.embedding, 1, now, now, entry.expiresAt || null]
    );

    saveDb();
    return { ...entry, id, accessCount: 1, lastAccessed: now, createdAt: now };
  }

  getVectorLakeEntry(id: string): VectorLakeEntry | null {
    if (!db) throw new Error('Database not initialized');
    const result = db.exec('SELECT * FROM vector_lake WHERE id = ?', [id]);
    if (result.length === 0 || result[0].values.length === 0) return null;
    return this.mapRowToVectorLakeEntry(result[0].columns, result[0].values[0]);
  }

  findSimilarQueries(query: string, threshold: number = 0.7): VectorLakeEntry[] {
    if (!db) throw new Error('Database not initialized');
    
    const queryEmbedding = this.generateEmbedding(query);
    const result = db.exec('SELECT * FROM vector_lake WHERE expires_at IS NULL OR expires_at > ? ORDER BY last_accessed DESC LIMIT 20', [Date.now()]);
    
    if (result.length === 0) return [];
    
    const entries = result[0].values.map(row => this.mapRowToVectorLakeEntry(result[0].columns, row));
    
    return entries
      .map(entry => ({
        ...entry,
        similarity: this.cosineSimilarity(queryEmbedding, entry.embedding ? JSON.parse(entry.embedding) : []),
      }))
      .filter(e => e.similarity >= threshold)
      .sort((a, b) => b.similarity - a.similarity)
      .map(({ similarity, ...entry }) => entry);
  }

  incrementAccessCount(id: string): void {
    if (!db) throw new Error('Database not initialized');
    db.run('UPDATE vector_lake SET access_count = access_count + 1, last_accessed = ? WHERE id = ?', [Date.now(), id]);
    saveDb();
  }

  getPopularQueries(limit: number = 10): VectorLakeEntry[] {
    if (!db) throw new Error('Database not initialized');
    const result = db.exec('SELECT * FROM vector_lake ORDER BY access_count DESC LIMIT ?', [limit]);
    if (result.length === 0) return [];
    return result[0].values.map(row => this.mapRowToVectorLakeEntry(result[0].columns, row));
  }

  getRecentQueries(limit: number = 10): VectorLakeEntry[] {
    if (!db) throw new Error('Database not initialized');
    const result = db.exec('SELECT * FROM vector_lake ORDER BY created_at DESC LIMIT ?', [limit]);
    if (result.length === 0) return [];
    return result[0].values.map(row => this.mapRowToVectorLakeEntry(result[0].columns, row));
  }

  deleteVectorLakeEntry(id: string): boolean {
    if (!db) throw new Error('Database not initialized');
    db.run('DELETE FROM vector_lake WHERE id = ?', [id]);
    saveDb();
    return true;
  }

  clearExpiredEntries(): number {
    if (!db) throw new Error('Database not initialized');
    const now = Date.now();
    const result = db.exec('DELETE FROM vector_lake WHERE expires_at IS NOT NULL AND expires_at < ?', [now]);
    saveDb();
    return result.length;
  }

  getVectorLakeStats(): { total: number; totalAccesses: number; avgSimilarity: number } {
    if (!db) throw new Error('Database not initialized');
    const count = db.exec('SELECT COUNT(*) as count FROM vector_lake');
    const accesses = db.exec('SELECT SUM(access_count) as total FROM vector_lake');
    return {
      total: count[0]?.values[0]?.[0] || 0,
      totalAccesses: accesses[0]?.values[0]?.[0] || 0,
      avgSimilarity: 0,
    };
  }

  private generateEmbedding(text: string): number[] {
    const hash = this.simpleHash(text);
    const embedding: number[] = [];
    const seed = hash;
    
    for (let i = 0; i < 384; i++) {
      const x = Math.sin(seed * (i + 1) * 12.9898) * 43758.5453;
      embedding.push((x - Math.floor(x)) * 2 - 1);
    }
    
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    return embedding.map(val => val / magnitude);
  }

  private simpleHash(text: string): number {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length || a.length === 0) return 0;
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  private mapRowToVectorLakeEntry(columns: string[], values: any[]): VectorLakeEntry {
    const row: any = {};
    columns.forEach((col, i) => row[col] = values[i]);
    return {
      id: row.id,
      query: row.query,
      searchTerms: row.search_terms ? JSON.parse(row.search_terms) : [],
      results: row.results,
      context: row.context,
      answer: row.answer,
      embedding: row.embedding,
      accessCount: row.access_count,
      lastAccessed: row.last_accessed,
      createdAt: row.created_at,
      expiresAt: row.expires_at,
    };
  }

  // Folder Methods
  addFolder(folder: Omit<Folder, 'id' | 'createdAt' | 'updatedAt'>): Folder {
    if (!db) throw new Error('Database not initialized');
    const id = generateId();
    const now = Date.now();
    db.run(
      `INSERT INTO folders (id, name, parent_id, description, color, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, folder.name, folder.parentId || null, folder.description || null, folder.color || null, now, now]
    );
    saveDb();
    return { ...folder, id, createdAt: now, updatedAt: now };
  }

  getFolders(parentId?: string | null): Folder[] {
    if (!db) throw new Error('Database not initialized');
    let result;
    if (parentId === undefined) {
      result = db.exec('SELECT * FROM folders ORDER BY name');
    } else {
      result = db.exec('SELECT * FROM folders WHERE parent_id IS ? ORDER BY name', [parentId || null]);
    }
    if (result.length === 0) return [];
    return result[0].values.map(row => this.mapRowToFolder(result[0].columns, row));
  }

  getFolderById(id: string): Folder | null {
    if (!db) throw new Error('Database not initialized');
    const result = db.exec('SELECT * FROM folders WHERE id = ?', [id]);
    if (result.length === 0 || result[0].values.length === 0) return null;
    return this.mapRowToFolder(result[0].columns, result[0].values[0]);
  }

  updateFolder(id: string, updates: Partial<Folder>): Folder | null {
    if (!db) throw new Error('Database not initialized');
    const folder = this.getFolderById(id);
    if (!folder) return null;
    const updated = { ...folder, ...updates, updatedAt: Date.now() };
    db.run(
      `UPDATE folders SET name = ?, parent_id = ?, description = ?, color = ?, updated_at = ? WHERE id = ?`,
      [updated.name, updated.parentId || null, updated.description || null, updated.color || null, updated.updatedAt, id]
    );
    saveDb();
    return updated;
  }

  deleteFolder(id: string): boolean {
    if (!db) throw new Error('Database not initialized');
    db.run('DELETE FROM folders WHERE id = ?', [id]);
    saveDb();
    return true;
  }

  private mapRowToFolder(columns: string[], values: any[]): Folder {
    const row: any = {};
    columns.forEach((col, i) => row[col] = values[i]);
    return {
      id: row.id,
      name: row.name,
      parentId: row.parent_id,
      description: row.description,
      color: row.color,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  // Brand Methods
  addBrand(brand: Omit<Brand, 'id' | 'createdAt' | 'updatedAt'>): Brand {
    if (!db) throw new Error('Database not initialized');
    const id = generateId();
    const now = Date.now();
    db.run(
      `INSERT INTO brands (id, name, description, website, contacts, notes, tags, documents, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, brand.name, brand.description || null, brand.website || null, JSON.stringify(brand.contacts || []),
       brand.notes || null, JSON.stringify(brand.tags || []), JSON.stringify(brand.documents || []), now, now]
    );
    saveDb();
    return { ...brand, id, createdAt: now, updatedAt: now };
  }

  getBrands(): Brand[] {
    if (!db) throw new Error('Database not initialized');
    const result = db.exec('SELECT * FROM brands ORDER BY name');
    if (result.length === 0) return [];
    return result[0].values.map(row => this.mapRowToBrand(result[0].columns, row));
  }

  getBrandById(id: string): Brand | null {
    if (!db) throw new Error('Database not initialized');
    const result = db.exec('SELECT * FROM brands WHERE id = ?', [id]);
    if (result.length === 0 || result[0].values.length === 0) return null;
    return this.mapRowToBrand(result[0].columns, result[0].values[0]);
  }

  updateBrand(id: string, updates: Partial<Brand>): Brand | null {
    if (!db) throw new Error('Database not initialized');
    const brand = this.getBrandById(id);
    if (!brand) return null;
    const updated = { ...brand, ...updates, updatedAt: Date.now() };
    db.run(
      `UPDATE brands SET name = ?, description = ?, website = ?, contacts = ?, notes = ?, tags = ?, documents = ?, updated_at = ? WHERE id = ?`,
      [updated.name, updated.description || null, updated.website || null, JSON.stringify(updated.contacts || []),
       updated.notes || null, JSON.stringify(updated.tags || []), JSON.stringify(updated.documents || []), updated.updatedAt, id]
    );
    saveDb();
    return updated;
  }

  deleteBrand(id: string): boolean {
    if (!db) throw new Error('Database not initialized');
    db.run('DELETE FROM brands WHERE id = ?', [id]);
    saveDb();
    return true;
  }

  private mapRowToBrand(columns: string[], values: any[]): Brand {
    const row: any = {};
    columns.forEach((col, i) => row[col] = values[i]);
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      website: row.website,
      contacts: this.parseTags(row.contacts),
      notes: row.notes || '',
      tags: this.parseTags(row.tags),
      documents: this.parseTags(row.documents),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  // Project Methods
  addProject(project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>): Project {
    if (!db) throw new Error('Database not initialized');
    const id = generateId();
    const now = Date.now();
    db.run(
      `INSERT INTO projects (id, name, description, folder_id, brand_id, status, tags, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, project.name, project.description || null, project.folderId || null, project.brandId || null,
       project.status || 'active', JSON.stringify(project.tags || []), now, now]
    );
    saveDb();
    return { ...project, id, createdAt: now, updatedAt: now };
  }

  getProjects(folderId?: string, brandId?: string, status?: Project['status']): Project[] {
    if (!db) throw new Error('Database not initialized');
    let query = 'SELECT * FROM projects WHERE 1=1';
    const params: any[] = [];
    if (folderId) { query += ' AND folder_id = ?'; params.push(folderId); }
    if (brandId) { query += ' AND brand_id = ?'; params.push(brandId); }
    if (status) { query += ' AND status = ?'; params.push(status); }
    query += ' ORDER BY updated_at DESC';
    const result = db.exec(query, params);
    if (result.length === 0) return [];
    return result[0].values.map(row => this.mapRowToProject(result[0].columns, row));
  }

  getProjectById(id: string): Project | null {
    if (!db) throw new Error('Database not initialized');
    const result = db.exec('SELECT * FROM projects WHERE id = ?', [id]);
    if (result.length === 0 || result[0].values.length === 0) return null;
    return this.mapRowToProject(result[0].columns, result[0].values[0]);
  }

  updateProject(id: string, updates: Partial<Project>): Project | null {
    if (!db) throw new Error('Database not initialized');
    const project = this.getProjectById(id);
    if (!project) return null;
    const updated = { ...project, ...updates, updatedAt: Date.now() };
    db.run(
      `UPDATE projects SET name = ?, description = ?, folder_id = ?, brand_id = ?, status = ?, tags = ?, updated_at = ? WHERE id = ?`,
      [updated.name, updated.description || null, updated.folderId || null, updated.brandId || null,
       updated.status, JSON.stringify(updated.tags || []), updated.updatedAt, id]
    );
    saveDb();
    return updated;
  }

  deleteProject(id: string): boolean {
    if (!db) throw new Error('Database not initialized');
    db.run('DELETE FROM projects WHERE id = ?', [id]);
    saveDb();
    return true;
  }

  private mapRowToProject(columns: string[], values: any[]): Project {
    const row: any = {};
    columns.forEach((col, i) => row[col] = values[i]);
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      folderId: row.folder_id,
      brandId: row.brand_id,
      status: row.status,
      tags: this.parseTags(row.tags),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  // Generic query methods for BrandWorkspaceService
  async run(sql: string, params: any[] = []): Promise<void> {
    if (!db) throw new Error('Database not initialized');
    db.run(sql, params);
    saveDb();
  }

  async get(sql: string, params: any[] = []): Promise<any | null> {
    if (!db) throw new Error('Database not initialized');
    const result = db.exec(sql, params);
    if (result.length === 0 || result[0].values.length === 0) return null;
    const row: any = {};
    result[0].columns.forEach((col, i) => row[col] = result[0].values[0][i]);
    return row;
  }

  async all(sql: string, params: any[] = []): Promise<any[]> {
    if (!db) throw new Error('Database not initialized');
    const result = db.exec(sql, params);
    if (result.length === 0) return [];
    return result[0].values.map(values => {
      const row: any = {};
      result[0].columns.forEach((col, i) => row[col] = values[i]);
      return row;
    });
  }

  // SAM.gov Methods
  addSAMSearch(id: string, keywords: string[], filters?: any): void {
    if (!db) throw new Error('Database not initialized');
    db.run(
      `INSERT OR REPLACE INTO sam_searches (id, keywords, filters, status, results_count, created_at, last_run)
       VALUES (?, ?, ?, 'active', 0, ?, NULL)`,
      [id, JSON.stringify(keywords), filters ? JSON.stringify(filters) : null, Date.now()]
    );
    saveDb();
  }

  getSAMSearches(): any[] {
    if (!db) throw new Error('Database not initialized');
    const result = db.exec('SELECT * FROM sam_searches ORDER BY created_at DESC');
    if (result.length === 0) return [];
    return result[0].values.map(values => {
      const row: any = {};
      result[0].columns.forEach((col, i) => row[col] = values[i]);
      return {
        ...row,
        keywords: JSON.parse(row.keywords || '[]'),
        filters: row.filters ? JSON.parse(row.filters) : undefined,
      };
    });
  }

  updateSAMSearch(id: string, updates: { status?: string; resultsCount?: number; lastRun?: number }): void {
    if (!db) throw new Error('Database not initialized');
    const parts: string[] = [];
    const params: any[] = [];
    
    if (updates.status !== undefined) {
      parts.push('status = ?');
      params.push(updates.status);
    }
    if (updates.resultsCount !== undefined) {
      parts.push('results_count = ?');
      params.push(updates.resultsCount);
    }
    if (updates.lastRun !== undefined) {
      parts.push('last_run = ?');
      params.push(updates.lastRun);
    }
    
    if (parts.length > 0) {
      params.push(id);
      db.run(`UPDATE sam_searches SET ${parts.join(', ')} WHERE id = ?`, params);
      saveDb();
    }
  }

  deleteSAMSearch(id: string): void {
    if (!db) throw new Error('Database not initialized');
    db.run('DELETE FROM sam_searches WHERE id = ?', [id]);
    db.run('DELETE FROM sam_opportunities WHERE search_id = ?', [id]);
    saveDb();
  }

  addSAMOpportunity(opp: any, searchId?: string): void {
    if (!db) throw new Error('Database not initialized');
    db.run(
      `INSERT OR REPLACE INTO sam_opportunities 
       (id, search_id, title, synopsis, solicitation_number, posted_date, response_deadline, 
        award_amount, naics_code, classification_code, agency, office, location, url, keywords, matched_keywords, captured_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [opp.id, searchId || null, opp.title, opp.synopsis || '', opp.solicitationNumber || '',
       opp.postedDate || '', opp.responseDeadline || '', opp.awardAmount || null,
       opp.naicsCode || null, opp.classificationCode || null, opp.agency || null,
       opp.office || null, opp.location || null, opp.url || '',
       JSON.stringify(opp.keywords || []), JSON.stringify(opp.matchedKeywords || []),
       Date.now()]
    );
    saveDb();
  }

  getSAMOpportunities(searchId?: string): any[] {
    if (!db) throw new Error('Database not initialized');
    let query = 'SELECT * FROM sam_opportunities';
    const params: any[] = [];
    
    if (searchId) {
      query += ' WHERE search_id = ?';
      params.push(searchId);
    }
    
    query += ' ORDER BY captured_at DESC';
    
    const result = db.exec(query, params);
    if (result.length === 0) return [];
    return result[0].values.map(values => {
      const row: any = {};
      result[0].columns.forEach((col, i) => row[col] = values[i]);
      return {
        ...row,
        keywords: JSON.parse(row.keywords || '[]'),
        matchedKeywords: JSON.parse(row.matched_keywords || '[]'),
      };
    });
  }

  clearSAMOpportunities(searchId?: string): void {
    if (!db) throw new Error('Database not initialized');
    if (searchId) {
      db.run('DELETE FROM sam_opportunities WHERE search_id = ?', [searchId]);
    } else {
      db.run('DELETE FROM sam_opportunities');
    }
    saveDb();
  }

  addSAMApiKey(key: string, expiresAt: number): void {
    if (!db) throw new Error('Database not initialized');
    db.run(
      `INSERT OR REPLACE INTO sam_api_keys (key, created_at, expires_at, last_used)
       VALUES (?, ?, ?, NULL)`,
      [key, Date.now(), expiresAt]
    );
    saveDb();
  }

  getSAMApiKeys(): any[] {
    if (!db) throw new Error('Database not initialized');
    const result = db.exec('SELECT * FROM sam_api_keys ORDER BY created_at DESC');
    if (result.length === 0) return [];
    return result[0].values.map(values => {
      const row: any = {};
      result[0].columns.forEach((col, i) => row[col] = values[i]);
      return row;
    });
  }

  getActiveSAMApiKey(): string | null {
    if (!db) throw new Error('Database not initialized');
    const now = Date.now();
    const result = db.exec(
      'SELECT key FROM sam_api_keys WHERE expires_at > ? ORDER BY expires_at DESC LIMIT 1',
      [now]
    );
    if (result.length === 0 || result[0].values.length === 0) return null;
    
    const key = result[0].values[0][0] as string;
    db.run('UPDATE sam_api_keys SET last_used = ? WHERE key = ?', [now, key]);
    return key;
  }

  deleteSAMApiKey(key: string): void {
    if (!db) throw new Error('Database not initialized');
    db.run('DELETE FROM sam_api_keys WHERE key = ?', [key]);
    saveDb();
  }

  // Tracked Opportunities Methods
  addTrackedOpportunity(opp: {
    title: string;
    synopsis?: string;
    solicitationNumber: string;
    type?: string;
    postedDate?: string;
    updatedDate?: string;
    responseDeadline?: string;
    awardAmount?: string;
    naicsCode?: string;
    classificationCode?: string;
    agency?: string;
    office?: string;
    location?: string;
    url?: string;
    status?: string;
    pipelineStage?: string;
    awardDate?: string;
    notes?: string;
    tags?: string[];
    userPriority?: 'low' | 'medium' | 'high' | 'critical';
  }): { id: string; createdAt: number } {
    if (!db) throw new Error('Database not initialized');
    const id = generateId();
    const now = Date.now();
    
    db.run(
      `INSERT INTO tracked_opportunities 
       (id, title, synopsis, solicitation_number, opportunity_type, posted_date, updated_date, 
        response_deadline, award_amount, naics_code, classification_code, agency, office, location, 
        url, status, pipeline_stage, award_date, notes, tags, user_priority, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, opp.title, opp.synopsis || '', opp.solicitationNumber, opp.type || 'Solicitation',
       opp.postedDate || '', opp.updatedDate || '', opp.responseDeadline || '',
       opp.awardAmount || '', opp.naicsCode || '', opp.classificationCode || '',
       opp.agency || '', opp.office || '', opp.location || '', opp.url || '',
       opp.status || 'active', opp.pipelineStage || 'interested', opp.awardDate || '', opp.notes || '',
       JSON.stringify(opp.tags || []), opp.userPriority || 'medium', now, now]
    );
    
    saveDb();
    return { id, createdAt: now };
  }

  getTrackedOpportunities(status?: string, pipelineStage?: string): any[] {
    if (!db) throw new Error('Database not initialized');
    
    let query = 'SELECT * FROM tracked_opportunities';
    const conditions: string[] = [];
    const params: any[] = [];
    
    if (status) {
      conditions.push('status = ?');
      params.push(status);
    }
    if (pipelineStage) {
      conditions.push('pipeline_stage = ?');
      params.push(pipelineStage);
    }
    
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    
    query += ' ORDER BY response_deadline ASC, created_at DESC';
    
    const result = db.exec(query, params);
    if (result.length === 0) return [];
    
    return result[0].values.map(values => {
      const row: any = {};
      result[0].columns.forEach((col, i) => row[col] = values[i]);
      return {
        ...row,
        tags: JSON.parse(row.tags || '[]'),
      };
    });
  }

  getTrackedOpportunityById(id: string): any | null {
    if (!db) throw new Error('Database not initialized');
    const result = db.exec('SELECT * FROM tracked_opportunities WHERE id = ?', [id]);
    if (result.length === 0 || result[0].values.length === 0) return null;
    
    const row: any = {};
    result[0].columns.forEach((col, i) => row[col] = result[0].values[0][i]);
    return {
      ...row,
      tags: JSON.parse(row.tags || '[]'),
    };
  }

  getTrackedOpportunityBySolicitationNumber(solNum: string): any | null {
    if (!db) throw new Error('Database not initialized');
    const result = db.exec('SELECT * FROM tracked_opportunities WHERE solicitation_number = ?', [solNum]);
    if (result.length === 0 || result[0].values.length === 0) return null;
    
    const row: any = {};
    result[0].columns.forEach((col, i) => row[col] = result[0].values[0][i]);
    return {
      ...row,
      tags: JSON.parse(row.tags || '[]'),
    };
  }

  updateTrackedOpportunity(id: string, updates: {
    title?: string;
    synopsis?: string;
    type?: string;
    postedDate?: string;
    updatedDate?: string;
    responseDeadline?: string;
    awardAmount?: string;
    status?: string;
    pipelineStage?: string;
    awardDate?: string;
    notes?: string;
    tags?: string[];
    userPriority?: 'low' | 'medium' | 'high' | 'critical';
  }): boolean {
    if (!db) throw new Error('Database not initialized');
    
    const fields: string[] = [];
    const values: any[] = [];
    
    if (updates.title !== undefined) { fields.push('title = ?'); values.push(updates.title); }
    if (updates.synopsis !== undefined) { fields.push('synopsis = ?'); values.push(updates.synopsis); }
    if (updates.type !== undefined) { fields.push('opportunity_type = ?'); values.push(updates.type); }
    if (updates.postedDate !== undefined) { fields.push('posted_date = ?'); values.push(updates.postedDate); }
    if (updates.updatedDate !== undefined) { fields.push('updated_date = ?'); values.push(updates.updatedDate); }
    if (updates.responseDeadline !== undefined) { fields.push('response_deadline = ?'); values.push(updates.responseDeadline); }
    if (updates.awardAmount !== undefined) { fields.push('award_amount = ?'); values.push(updates.awardAmount); }
    if (updates.status !== undefined) { fields.push('status = ?'); values.push(updates.status); }
    if (updates.pipelineStage !== undefined) { fields.push('pipeline_stage = ?'); values.push(updates.pipelineStage); }
    if (updates.awardDate !== undefined) { fields.push('award_date = ?'); values.push(updates.awardDate); }
    if (updates.notes !== undefined) { fields.push('notes = ?'); values.push(updates.notes); }
    if (updates.tags !== undefined) { fields.push('tags = ?'); values.push(JSON.stringify(updates.tags)); }
    if (updates.userPriority !== undefined) { fields.push('user_priority = ?'); values.push(updates.userPriority); }
    
    if (fields.length === 0) return false;
    
    fields.push('updated_at = ?');
    values.push(Date.now());
    values.push(id);
    
    db.run(`UPDATE tracked_opportunities SET ${fields.join(', ')} WHERE id = ?`, values);
    saveDb();
    return true;
  }

  deleteTrackedOpportunity(id: string): boolean {
    if (!db) throw new Error('Database not initialized');
    // Delete associated documents and news first
    db.run('DELETE FROM opportunity_documents WHERE opportunity_id = ?', [id]);
    db.run('DELETE FROM opportunity_news WHERE opportunity_id = ?', [id]);
    db.run('DELETE FROM tracked_opportunities WHERE id = ?', [id]);
    saveDb();
    return true;
  }

  // Opportunity Documents Methods
  addOpportunityDocument(doc: {
    opportunityId: string;
    filename: string;
    originalName?: string;
    content: string;
    type?: string;
    size?: number;
  }): { id: string; uploadedAt: number } {
    if (!db) throw new Error('Database not initialized');
    const id = generateId();
    const now = Date.now();
    
    db.run(
      `INSERT INTO opportunity_documents (id, opportunity_id, filename, original_name, content, type, size, uploaded_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, doc.opportunityId, doc.filename, doc.originalName || doc.filename, doc.content, doc.type || 'text', doc.size || 0, now]
    );
    
    saveDb();
    return { id, uploadedAt: now };
  }

  getOpportunityDocuments(opportunityId: string): any[] {
    if (!db) throw new Error('Database not initialized');
    const result = db.exec('SELECT id, opportunity_id, filename, original_name, type, size, uploaded_at FROM opportunity_documents WHERE opportunity_id = ? ORDER BY uploaded_at DESC', [opportunityId]);
    if (result.length === 0) return [];
    return result[0].values.map(values => {
      const row: any = {};
      result[0].columns.forEach((col, i) => row[col] = values[i]);
      return row;
    });
  }

  getOpportunityDocumentContent(docId: string): string | null {
    if (!db) throw new Error('Database not initialized');
    const result = db.exec('SELECT content FROM opportunity_documents WHERE id = ?', [docId]);
    if (result.length === 0 || result[0].values.length === 0) return null;
    return result[0].values[0][0] as string;
  }

  deleteOpportunityDocument(docId: string): boolean {
    if (!db) throw new Error('Database not initialized');
    db.run('DELETE FROM opportunity_documents WHERE id = ?', [docId]);
    saveDb();
    return true;
  }

  // Opportunity News Methods
  addOpportunityNews(news: {
    opportunityId?: string;
    solicitationNumber?: string;
    title: string;
    summary?: string;
    source?: string;
    url?: string;
    newsDate?: string;
  }): { id: string; capturedAt: number } {
    if (!db) throw new Error('Database not initialized');
    const id = generateId();
    const now = Date.now();
    
    db.run(
      `INSERT INTO opportunity_news (id, opportunity_id, solicitation_number, title, summary, source, url, news_date, captured_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, news.opportunityId || null, news.solicitationNumber || '', news.title, news.summary || '', news.source || '', news.url || '', news.newsDate || '', now]
    );
    
    saveDb();
    return { id, capturedAt: now };
  }

  getOpportunityNews(opportunityId?: string, limit: number = 50): any[] {
    if (!db) throw new Error('Database not initialized');
    let query = 'SELECT * FROM opportunity_news';
    const params: any[] = [];
    
    if (opportunityId) {
      query += ' WHERE opportunity_id = ?';
      params.push(opportunityId);
    }
    
    query += ' ORDER BY news_date DESC, captured_at DESC LIMIT ?';
    params.push(limit);
    
    const result = db.exec(query, params);
    if (result.length === 0) return [];
    return result[0].values.map(values => {
      const row: any = {};
      result[0].columns.forEach((col, i) => row[col] = values[i]);
      return row;
    });
  }

  getRecentNewsForPipelineStages(stages: string[], limit: number = 20): any[] {
    if (!db) throw new Error('Database not initialized');
    
    const placeholders = stages.map(() => '?').join(',');
    const result = db.exec(
      `SELECT n.*, o.title as opportunity_title, o.agency 
       FROM opportunity_news n 
       LEFT JOIN tracked_opportunities o ON n.opportunity_id = o.id
       WHERE o.pipeline_stage IN (${placeholders})
       ORDER BY n.captured_at DESC LIMIT ?`,
      [...stages, limit]
    );
    
    if (result.length === 0) return [];
    return result[0].values.map(values => {
      const row: any = {};
      result[0].columns.forEach((col, i) => row[col] = values[i]);
      return row;
    });
  }

  // Pipeline Statistics
  getOpportunityPipelineStats(): any {
    if (!db) throw new Error('Database not initialized');
    
    const stages = ['interested', 'pursuing', 'bidding', 'submitted', 'won', 'lost'];
    const stats: Record<string, number> = {};
    
    for (const stage of stages) {
      const result = db.exec('SELECT COUNT(*) FROM tracked_opportunities WHERE pipeline_stage = ?', [stage]);
      stats[stage] = result.length > 0 ? (result[0].values[0][0] as number) : 0;
    }
    
    const totalResult = db.exec('SELECT COUNT(*) FROM tracked_opportunities');
    stats.total = totalResult.length > 0 ? (totalResult[0].values[0][0] as number) : 0;
    
    return stats;
  }

  // Get opportunities report data
  getOpportunitiesReport(): any[] {
    if (!db) throw new Error('Database not initialized');
    
    const result = db.exec(`
      SELECT 
        o.id, o.title, o.solicitation_number, o.agency, o.office, o.response_deadline,
        o.award_amount, o.pipeline_stage, o.status, o.user_priority, o.created_at,
        (SELECT COUNT(*) FROM opportunity_documents d WHERE d.opportunity_id = o.id) as document_count,
        (SELECT COUNT(*) FROM opportunity_news n WHERE n.opportunity_id = o.id) as news_count
      FROM tracked_opportunities o
      ORDER BY o.pipeline_stage, o.response_deadline ASC, o.created_at DESC
    `);
    
    if (result.length === 0) return [];
    return result[0].values.map(values => {
      const row: any = {};
      result[0].columns.forEach((col, i) => row[col] = values[i]);
      return row;
    });
  }

  // Document Methods
  addDocument(doc: { title: string; content: string; type?: string; category?: string; tags?: string[]; metadata?: any }): { id: string; createdAt: number } {
    if (!db) throw new Error('Database not initialized');
    const id = generateId();
    const now = Date.now();
    
    db.run(
      `INSERT INTO documents (id, title, content, type, category, tags, metadata, size, vectorized, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`,
      [id, doc.title, doc.content, doc.type || 'text', doc.category || null,
       JSON.stringify(doc.tags || []), JSON.stringify(doc.metadata || {}),
       doc.content.length, now, now]
    );
    
    saveDb();
    return { id, createdAt: now };
  }

  getDocuments(type?: string, category?: string): any[] {
    if (!db) throw new Error('Database not initialized');
    
    let query = 'SELECT * FROM documents';
    const conditions: string[] = [];
    const params: any[] = [];
    
    if (type) {
      conditions.push('type = ?');
      params.push(type);
    }
    if (category) {
      conditions.push('category = ?');
      params.push(category);
    }
    
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    query += ' ORDER BY created_at DESC';
    
    const result = db.exec(query, params);
    if (result.length === 0) return [];
    
    return result[0].values.map(values => {
      const row: any = {};
      result[0].columns.forEach((col, i) => row[col] = values[i]);
      return {
        ...row,
        tags: JSON.parse(row.tags || '[]'),
        metadata: JSON.parse(row.metadata || '{}'),
      };
    });
  }

  getDocumentById(id: string): any | null {
    if (!db) throw new Error('Database not initialized');
    const result = db.exec('SELECT * FROM documents WHERE id = ?', [id]);
    if (result.length === 0 || result[0].values.length === 0) return null;
    
    const row: any = {};
    result[0].columns.forEach((col, i) => row[col] = result[0].values[0][i]);
    return {
      ...row,
      tags: JSON.parse(row.tags || '[]'),
      metadata: JSON.parse(row.metadata || '{}'),
    };
  }

  updateDocument(id: string, updates: { title?: string; content?: string; type?: string; category?: string; tags?: string[]; metadata?: any }): boolean {
    if (!db) throw new Error('Database not initialized');
    
    const doc = this.getDocumentById(id);
    if (!doc) return false;
    
    const title = updates.title ?? doc.title;
    const content = updates.content ?? doc.content;
    const type = updates.type ?? doc.type;
    const category = updates.category ?? doc.category;
    const tags = updates.tags ?? doc.tags;
    const metadata = updates.metadata ?? doc.metadata;
    const size = updates.content !== undefined ? updates.content.length : doc.size;
    
    db.run(
      `UPDATE documents SET title = ?, content = ?, type = ?, category = ?, tags = ?, metadata = ?, size = ?, updated_at = ? WHERE id = ?`,
      [title, content, type, category, JSON.stringify(tags), JSON.stringify(metadata), size, Date.now(), id]
    );
    
    saveDb();
    return true;
  }

  deleteDocument(id: string): boolean {
    if (!db) throw new Error('Database not initialized');
    db.run('DELETE FROM documents WHERE id = ?', [id]);
    saveDb();
    return true;
  }

  searchDocuments(query: string): any[] {
    if (!db) throw new Error('Database not initialized');
    const searchTerm = `%${query}%`;
    const result = db.exec(
      `SELECT * FROM documents WHERE title LIKE ? OR content LIKE ? ORDER BY created_at DESC`,
      [searchTerm, searchTerm]
    );
    
    if (result.length === 0) return [];
    
    return result[0].values.map(values => {
      const row: any = {};
      result[0].columns.forEach((col, i) => row[col] = values[i]);
      return {
        ...row,
        tags: JSON.parse(row.tags || '[]'),
        metadata: JSON.parse(row.metadata || '{}'),
      };
    });
  }

  // Scheduled Task Methods
  addScheduledTask(task: {
    name: string;
    description?: string;
    prompt?: string;
    taskType: string;
    schedule: string;
    brandId?: string;
    projectId?: string;
    config?: any;
    permanent?: boolean;
    expiresAt?: number;
    enabled?: boolean;
  }): { id: string; createdAt: number } {
    if (!db) throw new Error('Database not initialized');
    const id = generateId();
    const now = Date.now();
    const enabledValue = task.enabled !== false ? 1 : 0; // Default to enabled if not specified
    
    db.run(
      `INSERT INTO scheduled_tasks (id, name, description, prompt, task_type, schedule, brand_id, project_id, enabled, permanent, expires_at, last_run, last_result, last_error, run_count, success_count, fail_count, config, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, NULL, 0, 0, 0, ?, ?, ?)`,
      [id, task.name, task.description || null, task.prompt || null, task.taskType, task.schedule,
       task.brandId || null, task.projectId || null, enabledValue, task.permanent ? 1 : 0, task.expiresAt || null,
       JSON.stringify(task.config || {}), now, now]
    );
    
    saveDb();
    return { id, createdAt: now };
  }

  getScheduledTasks(enabledOnly: boolean = false): any[] {
    if (!db) throw new Error('Database not initialized');
    
    let query = 'SELECT * FROM scheduled_tasks';
    if (enabledOnly) {
      query += ' WHERE enabled = 1';
    }
    query += ' ORDER BY created_at DESC';
    
    const result = db.exec(query);
    if (result.length === 0) return [];
    
    return result[0].values.map(values => {
      const row: any = {};
      result[0].columns.forEach((col, i) => row[col] = values[i]);
      return {
        id: row.id,
        name: row.name,
        description: row.description,
        prompt: row.prompt,
        taskType: row.task_type,  // Map snake_case to camelCase
        schedule: row.schedule,
        brandId: row.brand_id,
        projectId: row.project_id,
        enabled: row.enabled === 1,
        lastRun: row.last_run,
        lastResult: row.last_result,
        lastError: row.last_error,
        runCount: row.run_count,
        successCount: row.success_count,
        failCount: row.fail_count,
        config: JSON.parse(row.config || '{}'),
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    });
  }

  getScheduledTaskById(id: string): any | null {
    if (!db) throw new Error('Database not initialized');
    const result = db.exec('SELECT * FROM scheduled_tasks WHERE id = ?', [id]);
    if (result.length === 0 || result[0].values.length === 0) return null;
    
    const row: any = {};
    result[0].columns.forEach((col, i) => row[col] = result[0].values[0][i]);
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      prompt: row.prompt,
      taskType: row.task_type,  // Map snake_case to camelCase
      schedule: row.schedule,
      brandId: row.brand_id,
      projectId: row.project_id,
      enabled: row.enabled === 1,
      lastRun: row.last_run,
      lastResult: row.last_result,
      lastError: row.last_error,
      runCount: row.run_count,
      successCount: row.success_count,
      failCount: row.fail_count,
      config: JSON.parse(row.config || '{}'),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  getTasksDueNow(): any[] {
    if (!db) throw new Error('Database not initialized');
    const now = Date.now();
    const tasks = this.getScheduledTasks(true);
    
    return tasks.filter(task => {
      if (!task.schedule) return false;
      
      const lastRun = task.last_run || 0;
      
      // Parse schedule - supports: "every:N:unit" or "cron:expression"
      if (task.schedule.startsWith('every:')) {
        const parts = task.schedule.split(':');
        if (parts.length >= 3) {
          const interval = parseInt(parts[1]);
          const unit = parts[2];
          
          let ms = 0;
          switch (unit) {
            case 'minutes': ms = interval * 60 * 1000; break;
            case 'hours': ms = interval * 60 * 60 * 1000; break;
            case 'days': ms = interval * 24 * 60 * 60 * 1000; break;
            case 'weeks': ms = interval * 7 * 24 * 60 * 60 * 1000; break;
          }
          
          return now - lastRun >= ms;
        }
      }
      
      // Specific time: "at:HH:MM"
      if (task.schedule.startsWith('at:')) {
        const parts = task.schedule.split(':');
        if (parts.length >= 3) {
          const hour = parseInt(parts[1]);
          const minute = parseInt(parts[2]);
          const nowDate = new Date(now);
          const lastRunDate = new Date(lastRun);
          
          // Check if it's the right time (within 5 minutes)
          const targetMinute = hour * 60 + minute;
          const currentMinute = nowDate.getHours() * 60 + nowDate.getMinutes();
          
          // Check if we already ran today
          const sameDay = lastRunDate.toDateString() === nowDate.toDateString();
          
          return !sameDay && Math.abs(currentMinute - targetMinute) <= 5;
        }
      }
      
      // Daily: "daily"
      if (task.schedule === 'daily') {
        const lastRunDate = new Date(lastRun);
        const today = new Date(now);
        return lastRunDate.toDateString() !== today.toDateString();
      }
      
      // Weekly: "weekly" or "weekly:day"
      if (task.schedule.startsWith('weekly')) {
        const parts = task.schedule.split(':');
        const targetDay = parts[1] ? ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'].indexOf(parts[1].toLowerCase()) : -1;
        
        const nowDate = new Date(now);
        const lastRunDate = new Date(lastRun);
        const daysSinceLastRun = Math.floor((now - lastRun) / (24 * 60 * 60 * 1000));
        
        if (targetDay >= 0) {
          return nowDate.getDay() === targetDay && daysSinceLastRun >= 1;
        }
        
        return daysSinceLastRun >= 7;
      }
      
      // Manual: "manual" - never auto-run
      if (task.schedule === 'manual') {
        return false;
      }
      
      // Default to hourly if unrecognized
      return now - lastRun >= 60 * 60 * 1000;
    });
  }

  updateScheduledTask(id: string, updates: {
    name?: string;
    description?: string;
    prompt?: string;
    schedule?: string;
    enabled?: boolean;
    permanent?: boolean;
    expiresAt?: number;
    config?: any;
  }): boolean {
    if (!db) throw new Error('Database not initialized');
    
    const task = this.getScheduledTaskById(id);
    if (!task) return false;
    
    db.run(
      `UPDATE scheduled_tasks SET name = ?, description = ?, prompt = ?, schedule = ?, enabled = ?, permanent = ?, expires_at = ?, config = ?, updated_at = ? WHERE id = ?`,
      [
        updates.name ?? task.name,
        updates.description ?? task.description,
        updates.prompt ?? task.prompt,
        updates.schedule ?? task.schedule,
        updates.enabled !== undefined ? (updates.enabled ? 1 : 0) : task.enabled,
        updates.permanent !== undefined ? (updates.permanent ? 1 : 0) : task.permanent,
        updates.expiresAt ?? task.expires_at,
        JSON.stringify(updates.config ?? task.config),
        Date.now(),
        id
      ]
    );
    
    saveDb();
    return true;
  }

  // Task results storage for viewing reports
  addTaskResult(taskId: string, result: {
    result?: string;
    data?: any;
    success: boolean;
  }): { id: string; createdAt: number } {
    if (!db) throw new Error('Database not initialized');
    const id = generateId();
    const now = Date.now();
    
    db.run(
      `CREATE TABLE IF NOT EXISTS task_results (
        id TEXT PRIMARY KEY,
        task_id TEXT NOT NULL,
        result TEXT,
        data TEXT,
        success INTEGER,
        created_at INTEGER NOT NULL,
        FOREIGN KEY (task_id) REFERENCES scheduled_tasks(id)
      )`
    );
    
    db.run(
      `INSERT INTO task_results (id, task_id, result, data, success, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, taskId, result.result || null, JSON.stringify(result.data || {}), result.success ? 1 : 0, now]
    );
    
    saveDb();
    return { id, createdAt: now };
  }

  getTaskResults(taskId: string, limit: number = 10): any[] {
    if (!db) throw new Error('Database not initialized');
    
    const result = db.exec(
      `SELECT * FROM task_results WHERE task_id = ? ORDER BY created_at DESC LIMIT ?`,
      [taskId, limit]
    );
    
    if (result.length === 0) return [];
    
    return result[0].values.map(values => {
      const row: any = {};
      result[0].columns.forEach((col, i) => row[col] = values[i]);
      if (row.data) {
        try { row.data = JSON.parse(row.data); } catch (e) {}
      }
      return row;
    });
  }

  getLatestTaskResult(taskId: string): any | null {
    const results = this.getTaskResults(taskId, 1);
    return results.length > 0 ? results[0] : null;
  }

  cleanupOldTaskResults(daysToKeep: number = 30): void {
    if (!db) throw new Error('Database not initialized');
    
    const cutoff = Date.now() - (daysToKeep * 24 * 60 * 60 * 1000);
    
    db.run(`DELETE FROM task_results WHERE created_at < ?`, [cutoff]);
    
    saveDb();
  }

  recordTaskRun(id: string, success: boolean, result?: string, error?: string): void {
    if (!db) throw new Error('Database not initialized');
    const now = Date.now();
    
    const task = this.getScheduledTaskById(id);
    if (!task) return;
    
    const runCount = (task.run_count || 0) + 1;
    const successCount = (task.success_count || 0) + (success ? 1 : 0);
    const failCount = (task.fail_count || 0) + (success ? 0 : 1);
    
    db.run(
      `UPDATE scheduled_tasks SET last_run = ?, last_result = ?, last_error = ?, run_count = ?, success_count = ?, fail_count = ?, updated_at = ? WHERE id = ?`,
      [now, result || null, error || null, runCount, successCount, failCount, now, id]
    );
    
    saveDb();
  }

  deleteScheduledTask(id: string): boolean {
    if (!db) throw new Error('Database not initialized');
    db.run('DELETE FROM scheduled_tasks WHERE id = ?', [id]);
    saveDb();
    return true;
  }

  enableTask(id: string): void {
    if (!db) throw new Error('Database not initialized');
    db.run('UPDATE scheduled_tasks SET enabled = 1, updated_at = ? WHERE id = ?', [Date.now(), id]);
    saveDb();
  }

  disableTask(id: string): void {
    if (!db) throw new Error('Database not initialized');
    db.run('UPDATE scheduled_tasks SET enabled = 0, updated_at = ? WHERE id = ?', [Date.now(), id]);
    saveDb();
  }

  // Chat History Methods
  saveChatHistory(chat: {
    id?: string;
    title: string;
    summary?: string;
    messages: Array<{ role: string; content: string; timestamp?: number }>;
    model?: string;
    expert?: string;
    tags?: string[];
  }): { id: string; createdAt: number } {
    if (!db) throw new Error('Database not initialized');
    const id = chat.id || generateId();
    const now = Date.now();
    
    // Compact messages into markdown
    const markdownContent = this.compactMessagesToMarkdown(chat.messages);
    const summary = chat.summary || this.generateSummary(chat.messages);
    const wordCount = markdownContent.split(/\s+/).filter(Boolean).length;
    
    db.run(
      `INSERT OR REPLACE INTO chat_history 
       (id, title, summary, markdown_content, messages, model, expert, tags, word_count, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, chat.title, summary, markdownContent, JSON.stringify(chat.messages), 
       chat.model || null, chat.expert || null, JSON.stringify(chat.tags || []), 
       wordCount, now, now]
    );
    
    saveDb();
    return { id, createdAt: now };
  }

  private compactMessagesToMarkdown(messages: Array<{ role: string; content: string; timestamp?: number }>): string {
    const lines: string[] = [];
    lines.push(`# Chat Session`);
    lines.push(``);
    lines.push(`**Date:** ${new Date().toISOString()}`);
    lines.push(``);
    
    for (const msg of messages) {
      const timestamp = msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString() : '';
      const roleLabel = msg.role === 'user' ? '### 👤 User' : '### 🤖 Assistant';
      
      lines.push(roleLabel + (timestamp ? ` (${timestamp})` : ''));
      lines.push(``);
      lines.push(msg.content);
      lines.push(``);
      lines.push('---');
      lines.push(``);
    }
    
    return lines.join('\n');
  }

  private generateSummary(messages: Array<{ role: string; content: string }>): string {
    if (messages.length === 0) return 'Empty conversation';
    
    // Get first user message as summary basis
    const firstUserMsg = messages.find(m => m.role === 'user');
    const lastAssistantMsg = [...messages].reverse().find(m => m.role === 'assistant');
    
    let summary = '';
    if (firstUserMsg) {
      summary = firstUserMsg.content.slice(0, 100);
      if (firstUserMsg.content.length > 100) summary += '...';
    }
    
    return summary || 'Conversation';
  }

  getChatHistory(id?: string): any[] {
    if (!db) throw new Error('Database not initialized');
    
    let query = 'SELECT * FROM chat_history';
    const params: any[] = [];
    
    if (id) {
      query += ' WHERE id = ?';
      params.push(id);
    }
    
    query += ' ORDER BY updated_at DESC';
    
    const result = db.exec(query, params);
    if (result.length === 0) return [];
    
    return result[0].values.map(values => {
      const cols = result[0].columns;
      const row: any = {};
      cols.forEach((col, i) => row[col] = values[i]);
      
      try {
        row.messages = JSON.parse(row.messages || '[]');
        row.tags = JSON.parse(row.tags || '[]');
      } catch {
        row.messages = [];
        row.tags = [];
      }
      
      return row;
    });
  }

  searchChatHistory(query: string): any[] {
    if (!db) throw new Error('Database not initialized');
    
    const searchTerm = `%${query.toLowerCase()}%`;
    
    const result = db.exec(
      `SELECT * FROM chat_history 
       WHERE LOWER(title) LIKE ? 
          OR LOWER(summary) LIKE ? 
          OR LOWER(markdown_content) LIKE ?
          OR LOWER(tags) LIKE ?
       ORDER BY updated_at DESC 
       LIMIT 50`,
      [searchTerm, searchTerm, searchTerm, searchTerm]
    );
    
    if (result.length === 0) return [];
    
    return result[0].values.map(values => {
      const cols = result[0].columns;
      const row: any = {};
      cols.forEach((col, i) => row[col] = values[i]);
      
      // Return a snippet with context
      const content = row.markdown_content || '';
      const lowerContent = content.toLowerCase();
      const queryLower = query.toLowerCase();
      const idx = lowerContent.indexOf(queryLower);
      
      if (idx !== -1) {
        const start = Math.max(0, idx - 50);
        const end = Math.min(content.length, idx + query.length + 100);
        row.snippet = (start > 0 ? '...' : '') + content.slice(start, end) + (end < content.length ? '...' : '');
      } else {
        row.snippet = content.slice(0, 150) + (content.length > 150 ? '...' : '');
      }
      
      try {
        row.messages = JSON.parse(row.messages || '[]');
        row.tags = JSON.parse(row.tags || '[]');
      } catch {
        row.messages = [];
        row.tags = [];
      }
      
      return row;
    });
  }

  deleteChatHistory(id: string): boolean {
    if (!db) throw new Error('Database not initialized');
    db.run('DELETE FROM chat_history WHERE id = ?', [id]);
    saveDb();
    return true;
  }

  getRecentChatHistory(limit: number = 20): any[] {
    return this.getChatHistory().slice(0, limit);
  }

  // Expert Management Methods
  getExperts(): any[] {
    if (!db) throw new Error('Database not initialized');
    
    const result = db.exec('SELECT * FROM experts ORDER BY created_at ASC');
    if (result.length === 0) return [];
    
    return result[0].values.map(values => {
      const cols = result[0].columns;
      const row: any = {};
      cols.forEach((col, i) => row[col] = values[i]);
      
      try {
        row.capabilities = JSON.parse(row.capabilities || '[]');
        row.contact = JSON.parse(row.contact || '{}');
      } catch {
        row.capabilities = [];
        row.contact = {};
      }
      
      return row;
    });
  }

  getExpertById(id: string): any | null {
    if (!db) throw new Error('Database not initialized');
    
    const result = db.exec('SELECT * FROM experts WHERE id = ?', [id]);
    if (result.length === 0 || result[0].values.length === 0) return null;
    
    const cols = result[0].columns;
    const row: any = {};
    cols.forEach((col, i) => row[col] = result[0].values[0][i]);
    
    try {
      row.capabilities = JSON.parse(row.capabilities || '[]');
      row.contact = JSON.parse(row.contact || '{}');
    } catch {
      row.capabilities = [];
      row.contact = {};
    }
    
    return row;
  }

  addExpert(expert: {
    name: string;
    title?: string;
    specialization: string;
    description?: string;
    expertiseLevel?: string;
    specializationType?: string;
    capabilities?: string[];
    language?: string;
    contact?: { email?: string; phone?: string; location?: string };
  }): { id: string; createdAt: number } {
    if (!db) throw new Error('Database not initialized');
    
    const id = generateId();
    const now = Date.now();
    
    db.run(
      `INSERT INTO experts (id, name, title, specialization, description, expertise_level, specialization_type, capabilities, language, contact, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, expert.name, expert.title || null, expert.specialization, expert.description || null,
       expert.expertiseLevel || 'advanced', expert.specializationType || null,
       JSON.stringify(expert.capabilities || []), expert.language || 'en',
       JSON.stringify(expert.contact || {}), now, now]
    );
    
    saveDb();
    return { id, createdAt: now };
  }

  updateExpert(id: string, updates: {
    name?: string;
    title?: string;
    specialization?: string;
    description?: string;
    expertiseLevel?: string;
    specializationType?: string;
    capabilities?: string[];
    language?: string;
    contact?: { email?: string; phone?: string; location?: string };
  }): boolean {
    if (!db) throw new Error('Database not initialized');
    
    const fields: string[] = [];
    const values: any[] = [];
    
    if (updates.name !== undefined) { fields.push('name = ?'); values.push(updates.name); }
    if (updates.title !== undefined) { fields.push('title = ?'); values.push(updates.title); }
    if (updates.specialization !== undefined) { fields.push('specialization = ?'); values.push(updates.specialization); }
    if (updates.description !== undefined) { fields.push('description = ?'); values.push(updates.description); }
    if (updates.expertiseLevel !== undefined) { fields.push('expertise_level = ?'); values.push(updates.expertiseLevel); }
    if (updates.specializationType !== undefined) { fields.push('specialization_type = ?'); values.push(updates.specializationType); }
    if (updates.capabilities !== undefined) { fields.push('capabilities = ?'); values.push(JSON.stringify(updates.capabilities)); }
    if (updates.language !== undefined) { fields.push('language = ?'); values.push(updates.language); }
    if (updates.contact !== undefined) { fields.push('contact = ?'); values.push(JSON.stringify(updates.contact)); }
    
    if (fields.length === 0) return false;
    
    fields.push('updated_at = ?');
    values.push(Date.now());
    values.push(id);
    
    db.run(`UPDATE experts SET ${fields.join(', ')} WHERE id = ?`, values);
    saveDb();
    return true;
  }

  deleteExpert(id: string): boolean {
    if (!db) throw new Error('Database not initialized');
    db.run('DELETE FROM experts WHERE id = ?', [id]);
    saveDb();
    return true;
  }

  ensureDefaultExperts(): void {
    if (!db) throw new Error('Database not initialized');
    
    const existing = db.exec('SELECT COUNT(*) as count FROM experts');
    if (existing.length > 0 && existing[0].values[0][0] > 0) return;
    
    // Add default experts
    const defaultExperts = [
      { name: 'Dr. Sarah Chen', title: 'Chief Technology Officer', specialization: 'Cloud Architecture & Enterprise Systems', description: 'Expert in distributed systems and cloud migrations.', expertiseLevel: 'principal', specializationType: 'cloud', capabilities: ['System Architecture', 'Cloud Migration', 'AI Implementation'] },
      { name: 'Marcus Rivera', title: 'Senior Security Consultant', specialization: 'Cybersecurity & Compliance', description: 'Expert in enterprise security and threat mitigation.', expertiseLevel: 'advanced', specializationType: 'security', capabilities: ['Security Architecture', 'Compliance', 'Threat Assessment'] },
      { name: 'Dr. Emily Watson', title: 'Machine Learning Specialist', specialization: 'AI & Data Science', description: 'Expert in machine learning and predictive analytics.', expertiseLevel: 'principal', specializationType: 'ai', capabilities: ['ML Models', 'Data Pipelines', 'AI Ethics'] },
      { name: 'James Liu', title: 'DevOps Engineering Lead', specialization: 'DevOps & Platform Engineering', description: 'Expert in CI/CD and infrastructure automation.', expertiseLevel: 'advanced', specializationType: 'devops', capabilities: ['CI/CD', 'Infrastructure', 'Monitoring'] },
      { name: 'Dr. Maria Santos', title: 'Product Strategy Consultant', specialization: 'Digital Transformation & Product Design', description: 'Expert in product strategy and UX design.', expertiseLevel: 'advanced', specializationType: 'product', capabilities: ['Product Strategy', 'UX Design', 'Digital Transformation'] },
      { name: 'David Park', title: 'Blockchain Technology Lead', specialization: 'Blockchain & Web3 Solutions', description: 'Expert in smart contracts and Web3 applications.', expertiseLevel: 'intermediate', specializationType: 'blockchain', capabilities: ['Smart Contracts', 'Web3', 'Distributed Systems'] },
    ];
    
    for (const expert of defaultExperts) {
      this.addExpert(expert);
    }
  }

  // Settings Methods (API keys, preferences, etc.)
  getSetting(key: string): string | null {
    if (!db) throw new Error('Database not initialized');
    const result = db.exec('SELECT value FROM settings WHERE key = ?', [key]);
    if (result.length === 0 || result[0].values.length === 0) return null;
    return result[0].values[0][0] as string;
  }

  setSetting(key: string, value: string, category: string = 'general'): void {
    if (!db) throw new Error('Database not initialized');
    const now = Date.now();
    db.run(
      `INSERT OR REPLACE INTO settings (key, value, category, updated_at) VALUES (?, ?, ?, ?)`,
      [key, value, category, now]
    );
    saveDb();
  }

  deleteSetting(key: string): boolean {
    if (!db) throw new Error('Database not initialized');
    db.run('DELETE FROM settings WHERE key = ?', [key]);
    saveDb();
    return true;
  }

  getSettingsByCategory(category: string): Record<string, string> {
    if (!db) throw new Error('Database not initialized');
    const result = db.exec('SELECT key, value FROM settings WHERE category = ?', [category]);
    if (result.length === 0) return {};
    
    const settings: Record<string, string> = {};
    for (const row of result[0].values) {
      settings[row[0] as string] = row[1] as string;
    }
    return settings;
  }

  getAllSettings(): Record<string, { value: string; category: string }> {
    if (!db) throw new Error('Database not initialized');
    const result = db.exec('SELECT key, value, category FROM settings');
    if (result.length === 0) return {};
    
    const settings: Record<string, { value: string; category: string }> = {};
    for (const row of result[0].values) {
      settings[row[0] as string] = {
        value: row[1] as string,
        category: row[2] as string,
      };
    }
    return settings;
  }

  // API Key specific methods (encrypted storage would be better for production)
  getApiKey(provider: string): string | null {
    return this.getSetting(`api_key_${provider}`);
  }

  setApiKey(provider: string, key: string): void {
    this.setSetting(`api_key_${provider}`, key, 'api_keys');
  }

  deleteApiKey(provider: string): boolean {
    return this.deleteSetting(`api_key_${provider}`);
  }

  getAllApiKeys(): { provider: string; hasKey: boolean }[] {
    const providers = ['openrouter', 'tavily', 'brave', 'serpapi', 'glm', 'deepseek', 'sam', 'openai', 'anthropic', 'gemini', 'groq', 'mistral'];
    return providers.map(provider => ({
      provider,
      hasKey: !!this.getApiKey(provider),
    }));
  }

  // Custom Tools methods
  addCustomTool(tool: {
    name: string;
    description?: string;
    endpoint: string;
    method?: string;
    headers?: Record<string, string>;
    bodyTemplate?: string;
    parameters?: { name: string; type: string; description: string; required: boolean }[];
    responsePath?: string;
  }): { id: string; createdAt: number } {
    if (!db) throw new Error('Database not initialized');
    
    const id = generateId();
    const now = Date.now();
    
    db.run(
      `INSERT INTO custom_tools (id, name, description, endpoint, method, headers, body_template, parameters, response_path, enabled, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
      [
        id,
        tool.name,
        tool.description || null,
        tool.endpoint,
        tool.method || 'POST',
        tool.headers ? JSON.stringify(tool.headers) : null,
        tool.bodyTemplate || null,
        tool.parameters ? JSON.stringify(tool.parameters) : null,
        tool.responsePath || null,
        now,
        now,
      ]
    );
    
    saveDb();
    return { id, createdAt: now };
  }

  getCustomTools(enabledOnly: boolean = false): any[] {
    if (!db) throw new Error('Database not initialized');
    
    let query = 'SELECT * FROM custom_tools';
    if (enabledOnly) {
      query += ' WHERE enabled = 1';
    }
    query += ' ORDER BY name';
    
    const result = db.exec(query);
    if (result.length === 0) return [];
    
    return result[0].values.map(row => {
      const cols = result[0].columns;
      const obj: any = {};
      cols.forEach((col, i) => {
        if (col === 'headers' || col === 'parameters') {
          obj[col] = row[i] ? JSON.parse(row[i] as string) : null;
        } else if (col === 'enabled') {
          obj[col] = row[i] === 1;
        } else {
          obj[col] = row[i];
        }
      });
      return {
        id: obj.id,
        name: obj.name,
        description: obj.description,
        endpoint: obj.endpoint,
        method: obj.method,
        headers: obj.headers,
        bodyTemplate: obj.body_template,
        parameters: obj.parameters,
        responsePath: obj.response_path,
        enabled: obj.enabled,
        createdAt: obj.created_at,
        updatedAt: obj.updated_at,
      };
    });
  }

  getCustomToolByName(name: string): any | null {
    if (!db) throw new Error('Database not initialized');
    const result = db.exec('SELECT * FROM custom_tools WHERE name = ?', [name]);
    if (result.length === 0 || result[0].values.length === 0) return null;
    
    const cols = result[0].columns;
    const row = result[0].values[0];
    const obj: any = {};
    cols.forEach((col, i) => {
      if (col === 'headers' || col === 'parameters') {
        obj[col] = row[i] ? JSON.parse(row[i] as string) : null;
      } else if (col === 'enabled') {
        obj[col] = row[i] === 1;
      } else {
        obj[col] = row[i];
      }
    });
    
    return {
      id: obj.id,
      name: obj.name,
      description: obj.description,
      endpoint: obj.endpoint,
      method: obj.method,
      headers: obj.headers,
      bodyTemplate: obj.body_template,
      parameters: obj.parameters,
      responsePath: obj.response_path,
      enabled: obj.enabled,
      createdAt: obj.created_at,
      updatedAt: obj.updated_at,
    };
  }

  updateCustomTool(id: string, updates: {
    name?: string;
    description?: string;
    endpoint?: string;
    method?: string;
    headers?: Record<string, string>;
    bodyTemplate?: string;
    parameters?: { name: string; type: string; description: string; required: boolean }[];
    responsePath?: string;
    enabled?: boolean;
  }): boolean {
    if (!db) throw new Error('Database not initialized');
    
    const fields: string[] = [];
    const values: any[] = [];
    
    if (updates.name !== undefined) { fields.push('name = ?'); values.push(updates.name); }
    if (updates.description !== undefined) { fields.push('description = ?'); values.push(updates.description); }
    if (updates.endpoint !== undefined) { fields.push('endpoint = ?'); values.push(updates.endpoint); }
    if (updates.method !== undefined) { fields.push('method = ?'); values.push(updates.method); }
    if (updates.headers !== undefined) { fields.push('headers = ?'); values.push(JSON.stringify(updates.headers)); }
    if (updates.bodyTemplate !== undefined) { fields.push('body_template = ?'); values.push(updates.bodyTemplate); }
    if (updates.parameters !== undefined) { fields.push('parameters = ?'); values.push(JSON.stringify(updates.parameters)); }
    if (updates.responsePath !== undefined) { fields.push('response_path = ?'); values.push(updates.responsePath); }
    if (updates.enabled !== undefined) { fields.push('enabled = ?'); values.push(updates.enabled ? 1 : 0); }
    
    if (fields.length === 0) return false;
    
    fields.push('updated_at = ?');
    values.push(Date.now());
    values.push(id);
    
    db.run(`UPDATE custom_tools SET ${fields.join(', ')} WHERE id = ?`, values);
    saveDb();
    return true;
  }

  deleteCustomTool(id: string): boolean {
    if (!db) throw new Error('Database not initialized');
    db.run('DELETE FROM custom_tools WHERE id = ?', [id]);
    saveDb();
    return true;
  }

  // Model preferences
  getDefaultModel(): string {
    return this.getSetting('default_model') || 'ollama/qwen2.5:7b';
  }

  setDefaultModel(modelId: string): void {
    this.setSetting('default_model', modelId, 'model');
  }

  getModelPreferences(): {
    defaultModel: string;
    autoRoute: boolean;
    preferLocal: boolean;
    cloudForChat: boolean;
  } {
    return {
      defaultModel: this.getSetting('default_model') || 'ollama/qwen2.5:7b',
      autoRoute: this.getSetting('auto_route_models') === 'true',
      preferLocal: this.getSetting('prefer_local_models') !== 'false',
      cloudForChat: this.getSetting('cloud_for_chat') === 'true',
    };
  }

  setModelPreferences(prefs: {
    defaultModel?: string;
    autoRoute?: boolean;
    preferLocal?: boolean;
    cloudForChat?: boolean;
  }): void {
    if (prefs.defaultModel !== undefined) {
      this.setSetting('default_model', prefs.defaultModel, 'model');
    }
    if (prefs.autoRoute !== undefined) {
      this.setSetting('auto_route_models', String(prefs.autoRoute), 'model');
    }
    if (prefs.preferLocal !== undefined) {
      this.setSetting('prefer_local_models', String(prefs.preferLocal), 'model');
    }
    if (prefs.cloudForChat !== undefined) {
      this.setSetting('cloud_for_chat', String(prefs.cloudForChat), 'model');
    }
  }

  // Search mode preference (persisted per user)
  getSearchMode(): boolean {
    return this.getSetting('search_mode') === 'true';
  }

  setSearchMode(enabled: boolean): void {
    this.setSetting('search_mode', String(enabled), 'preferences');
  }

  // Prompt Methods
  addPrompt(prompt: {
    title: string;
    content: string;
    category?: string;
    tags?: string[];
    variables?: { name: string; description: string; default?: string }[];
  }): { id: string; createdAt: number } {
    if (!db) throw new Error('Database not initialized');
    const id = generateId();
    const now = Date.now();
    
    db.run(
      `INSERT INTO prompts (id, title, content, category, tags, variables, use_count, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)`,
      [id, prompt.title, prompt.content, prompt.category || 'general',
        JSON.stringify(prompt.tags || []), JSON.stringify(prompt.variables || []), now, now]
    );
    
    saveDb();
    return { id, createdAt: now };
  }

  getPrompts(category?: string): any[] {
    if (!db) throw new Error('Database not initialized');
    
    let query = 'SELECT * FROM prompts';
    const params: any[] = [];
    
    if (category) {
      query += ' WHERE category = ?';
      params.push(category);
    }
    
    query += ' ORDER BY use_count DESC, updated_at DESC';
    
    const result = db.exec(query, params);
    if (result.length === 0) return [];
    
    return result[0].values.map(values => {
      const row: any = {};
      result[0].columns.forEach((col, i) => row[col] = values[i]);
      return {
        ...row,
        tags: JSON.parse(row.tags || '[]'),
        variables: JSON.parse(row.variables || '[]'),
      };
    });
  }

  getPromptById(id: string): any | null {
    if (!db) throw new Error('Database not initialized');
    const result = db.exec('SELECT * FROM prompts WHERE id = ?', [id]);
    if (result.length === 0 || result[0].values.length === 0) return null;
    
    const row: any = {};
    result[0].columns.forEach((col, i) => row[col] = result[0].values[0][i]);
    return {
      ...row,
      tags: JSON.parse(row.tags || '[]'),
      variables: JSON.parse(row.variables || '[]'),
    };
  }

  updatePrompt(id: string, updates: {
    title?: string;
    content?: string;
    category?: string;
    tags?: string[];
    variables?: { name: string; description: string; default?: string }[];
  }): boolean {
    if (!db) throw new Error('Database not initialized');
    
    const fields: string[] = [];
    const values: any[] = [];
    
    if (updates.title !== undefined) { fields.push('title = ?'); values.push(updates.title); }
    if (updates.content !== undefined) { fields.push('content = ?'); values.push(updates.content); }
    if (updates.category !== undefined) { fields.push('category = ?'); values.push(updates.category); }
    if (updates.tags !== undefined) { fields.push('tags = ?'); values.push(JSON.stringify(updates.tags)); }
    if (updates.variables !== undefined) { fields.push('variables = ?'); values.push(JSON.stringify(updates.variables)); }
    
    if (fields.length === 0) return false;
    
    fields.push('updated_at = ?');
    values.push(Date.now());
    values.push(id);
    
    db.run(`UPDATE prompts SET ${fields.join(', ')} WHERE id = ?`, values);
    saveDb();
    return true;
  }

  incrementPromptUse(id: string): void {
    if (!db) throw new Error('Database not initialized');
    db.run('UPDATE prompts SET use_count = use_count + 1, updated_at = ? WHERE id = ?', [Date.now(), id]);
    saveDb();
  }

  deletePrompt(id: string): boolean {
    if (!db) throw new Error('Database not initialized');
    db.run('DELETE FROM prompts WHERE id = ?', [id]);
    saveDb();
    return true;
  }

  searchPrompts(query: string): any[] {
    if (!db) throw new Error('Database not initialized');
    const searchTerm = `%${query}%`;
    
    const result = db.exec(
      `SELECT * FROM prompts WHERE title LIKE ? OR content LIKE ? OR tags LIKE ? ORDER BY use_count DESC, updated_at DESC`,
      [searchTerm, searchTerm, searchTerm]
    );
    
    if (result.length === 0) return [];
    
    return result[0].values.map(values => {
      const row: any = {};
      result[0].columns.forEach((col, i) => row[col] = values[i]);
      return {
        ...row,
        tags: JSON.parse(row.tags || '[]'),
        variables: JSON.parse(row.variables || '[]'),
      };
    });
  }

  close(): void {
    if (db) {
      saveDb();
      db.close();
      db = null;
    }
  }

  vacuum(): void {
    if (!db) throw new Error('Database not initialized');
    try {
      // sql.js doesn't support VACUUM directly, but we can export and reimport
      // For now, just save to optimize
      saveDb();
    } catch (error) {
      console.error('Error vacuuming database:', error);
    }
  }
}

export const sqlDatabase = SQLDatabase.getInstance();
