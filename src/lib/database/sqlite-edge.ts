/**
 * Edge-compatible SQLite wrapper
 * Uses in-memory database when fs/path not available (Edge Runtime)
 * Falls back to file-based when in Node.js
 */

import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';

// Runtime detection
const isNodeRuntime = typeof process !== 'undefined' && 
                      typeof process.cwd === 'function' &&
                      typeof require !== 'undefined';

let db: SqlJsDatabase | null = null;
let isInitialized = false;
let dbPath: string = '';

async function initDb(): Promise<SqlJsDatabase> {
  if (db) return db;
  
  let SQL: any;
  
  if (isNodeRuntime) {
    // Node.js runtime - can use fs
    try {
      const path = await import('path');
      const fs = await import('fs');
      
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
      } else {
        db = new SQL.Database();
      }
    } catch (e) {
      console.log('[SQLite] Node.js init failed, using in-memory:', e);
      SQL = await initSqlJs();
      db = new SQL.Database();
    }
  } else {
    // Edge Runtime - use in-memory only
    SQL = await initSqlJs();
    db = new SQL.Database();
    console.log('[SQLite] Using in-memory database (Edge Runtime)');
  }
  
  // Initialize schema
  initSchema();
  
  if (!db) {
    throw new Error('Database initialization failed');
  }
  
  return db;
}

function initSchema(): void {
  if (!db) return;
  
  // SAM.gov tables
  db.run(`
    CREATE TABLE IF NOT EXISTS sam_searches (
      id TEXT PRIMARY KEY,
      keywords TEXT,
      filters TEXT,
      status TEXT,
      results_count INTEGER,
      last_run INTEGER,
      created_at INTEGER
    )
  `);
  
  db.run(`
    CREATE TABLE IF NOT EXISTS sam_opportunities (
      id TEXT PRIMARY KEY,
      search_id TEXT,
      title TEXT,
      synopsis TEXT,
      solicitation_number TEXT,
      posted_date TEXT,
      response_deadline TEXT,
      award_amount TEXT,
      agency TEXT,
      office TEXT,
      location TEXT,
      url TEXT,
      keywords TEXT,
      status TEXT,
      data TEXT,
      created_at INTEGER
    )
  `);
  
  db.run(`
    CREATE TABLE IF NOT EXISTS sam_api_keys (
      key TEXT PRIMARY KEY,
      expires_at INTEGER,
      last_used INTEGER,
      created_at INTEGER
    )
  `);
}

async function saveDb(): Promise<void> {
  if (!db) return;
  
  if (isNodeRuntime && dbPath) {
    try {
      const fs = await import('fs');
      const data = db.export();
      const buffer = Buffer.from(data);
      fs.writeFileSync(dbPath, buffer);
    } catch (e) {
      console.log('[SQLite] Save failed:', e);
    }
  }
}

// Minimal SAM.gov functions for Edge Runtime
export const sqlDatabase = {
  async initialize(): Promise<void> {
    if (isInitialized) return;
    await initDb();
    isInitialized = true;
  },
  
  // SAM Search functions
  addSAMSearch(id: string, keywords: string[], filters?: any): void {
    if (!db) throw new Error('Database not initialized');
    db.run(
      'INSERT OR REPLACE INTO sam_searches (id, keywords, filters, status, results_count, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      [id, JSON.stringify(keywords), JSON.stringify(filters || {}), 'active', 0, Date.now()]
    );
    saveDb();
  },
  
  getSAMSearches(): any[] {
    if (!db) throw new Error('Database not initialized');
    const result = db.exec('SELECT * FROM sam_searches ORDER BY created_at DESC');
    if (!result.length) return [];
    
    return result[0].values.map((values: any[]) => ({
      id: values[0],
      keywords: JSON.parse(values[1] || '[]'),
      filters: JSON.parse(values[2] || '{}'),
      status: values[3],
      results_count: values[4],
      last_run: values[5],
      created_at: values[6],
    }));
  },
  
  updateSAMSearch(id: string, updates: { status?: string; resultsCount?: number; lastRun?: number }): void {
    if (!db) throw new Error('Database not initialized');
    const fields: string[] = [];
    const values: any[] = [];
    
    if (updates.status !== undefined) { fields.push('status = ?'); values.push(updates.status); }
    if (updates.resultsCount !== undefined) { fields.push('results_count = ?'); values.push(updates.resultsCount); }
    if (updates.lastRun !== undefined) { fields.push('last_run = ?'); values.push(updates.lastRun); }
    
    if (fields.length === 0) return;
    values.push(id);
    
    db.run(`UPDATE sam_searches SET ${fields.join(', ')} WHERE id = ?`, values);
    saveDb();
  },
  
  deleteSAMSearch(id: string): void {
    if (!db) throw new Error('Database not initialized');
    db.run('DELETE FROM sam_searches WHERE id = ?', [id]);
    db.run('DELETE FROM sam_opportunities WHERE search_id = ?', [id]);
    saveDb();
  },
  
  // SAM Opportunity functions
  addSAMOpportunity(opp: any, searchId?: string): void {
    if (!db) throw new Error('Database not initialized');
    db.run(
      'INSERT OR REPLACE INTO sam_opportunities (id, search_id, title, synopsis, solicitation_number, posted_date, response_deadline, award_amount, agency, office, location, url, keywords, status, data, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        opp.id || `sam_${Date.now()}`,
        searchId || null,
        opp.title || '',
        opp.synopsis || '',
        opp.solicitationNumber || '',
        opp.postedDate || '',
        opp.responseDeadline || '',
        opp.awardAmount || '',
        opp.agency || '',
        opp.office || '',
        opp.location || '',
        opp.url || '',
        JSON.stringify(opp.keywords || []),
        opp.status || 'active',
        JSON.stringify(opp),
        Date.now()
      ]
    );
    saveDb();
  },
  
  clearSAMOpportunities(searchId?: string): void {
    if (!db) throw new Error('Database not initialized');
    if (searchId) {
      db.run('DELETE FROM sam_opportunities WHERE search_id = ?', [searchId]);
    } else {
      db.run('DELETE FROM sam_opportunities');
    }
    saveDb();
  },
  
  getSAMOpportunities(searchId?: string): any[] {
    if (!db) throw new Error('Database not initialized');
    
    let query = 'SELECT * FROM sam_opportunities';
    let params: any[] = [];
    
    if (searchId) {
      query += ' WHERE search_id = ?';
      params.push(searchId);
    }
    
    query += ' ORDER BY created_at DESC';
    
    const result = db.exec(query, params);
    if (!result.length) return [];
    
    return result[0].values.map((values: any[]) => {
      try {
        return JSON.parse(values[14] || '{}');
      } catch {
        return {
          id: values[0],
          searchId: values[1],
          title: values[2],
          synopsis: values[3],
          solicitationNumber: values[4],
          postedDate: values[5],
          responseDeadline: values[6],
          awardAmount: values[7],
          agency: values[8],
          office: values[9],
          location: values[10],
          url: values[11],
          keywords: JSON.parse(values[12] || '[]'),
          status: values[13],
        };
      }
    });
  },
  
  // SAM API Key functions
  addSAMApiKey(key: string, expiresAt: number): void {
    if (!db) throw new Error('Database not initialized');
    db.run(
      'INSERT OR REPLACE INTO sam_api_keys (key, expires_at, created_at) VALUES (?, ?, ?)',
      [key, expiresAt, Date.now()]
    );
    saveDb();
  },
  
  getSAMApiKeys(): any[] {
    if (!db) throw new Error('Database not initialized');
    const result = db.exec('SELECT * FROM sam_api_keys ORDER BY created_at DESC');
    if (!result.length) return [];
    
    return result[0].values.map((values: any[]) => ({
      key: values[0],
      expires_at: values[1],
      last_used: values[2],
      created_at: values[3],
    }));
  },
  
  getActiveSAMApiKey(): string | null {
    if (!db) throw new Error('Database not initialized');
    const result = db.exec('SELECT key FROM sam_api_keys WHERE expires_at > ? ORDER BY created_at DESC LIMIT 1', [Date.now()]);
    if (!result.length || !result[0].values.length) return null;
    return result[0].values[0][0];
  },
  
  deleteSAMApiKey(key: string): void {
    if (!db) throw new Error('Database not initialized');
    db.run('DELETE FROM sam_api_keys WHERE key = ?', [key]);
    saveDb();
  },
  
  updateSAMApiKeyLastUsed(key: string): void {
    if (!db) throw new Error('Database not initialized');
    db.run('UPDATE sam_api_keys SET last_used = ? WHERE key = ?', [Date.now(), key]);
    saveDb();
  },
  
  // Settings (minimal implementation)
  getSetting(key: string): string | null {
    if (!db) return null;
    const result = db.exec('SELECT value FROM settings WHERE key = ?', [key]);
    if (!result.length || !result[0].values.length) return null;
    return result[0].values[0][0];
  },
  
  setSetting(key: string, value: string): void {
    if (!db) return;
    db.run('INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, ?)', 
      [key, value, Date.now()]);
    saveDb();
  },
  
  getApiKey(service: string): string | null {
    return this.getSetting(`${service}_api_key`);
  },
  
  setApiKey(service: string, key: string): void {
    this.setSetting(`${service}_api_key`, key);
  },
  
  // Placeholder functions for other services
  getContacts: () => [],
  addContact: () => {},
  updateContact: () => {},
  deleteContact: () => {},
  getTasks: () => [],
  addTask: () => {},
  updateTask: () => {},
  deleteTask: () => {},
  getNotes: () => [],
  addNote: () => {},
  updateNote: () => {},
  deleteNote: () => {},
  getCalendarEvents: () => [],
  addCalendarEvent: () => {},
  updateCalendarEvent: () => {},
  deleteCalendarEvent: () => {},
  getDocuments: () => [],
  addDocument: () => {},
  updateDocument: () => {},
  deleteDocument: () => {},
  getProjects: () => [],
  addProject: () => {},
  updateProject: () => {},
  deleteProject: () => {},
  getBrands: () => [],
  addBrand: () => {},
  updateBrand: () => {},
  deleteBrand: () => {},
  getFolders: () => [],
  addFolder: () => {},
  updateFolder: () => {},
  deleteFolder: () => {},
  getChatHistory: () => [],
  addChatMessage: () => {},
  clearChatHistory: () => {},
  getPrompts: () => [],
  addPrompt: () => {},
  updatePrompt: () => {},
  deletePrompt: () => {},
  searchPrompts: () => [],
  incrementPromptUse: () => {},
  getScheduledTasks: () => [],
  addScheduledTask: () => {},
  updateScheduledTask: () => {},
  deleteScheduledTask: () => {},
  getCustomTools: () => [],
  addCustomTool: () => {},
  updateCustomTool: () => {},
  deleteCustomTool: () => {},
  getFeatureRequests: () => [],
  addFeatureRequest: () => {},
  updateFeatureRequest: () => {},
  getSecurityReports: () => [],
  addSecurityReport: () => {},
  getDatabaseTables: () => [],
  createDatabaseTable: () => {},
  getDatabaseTableData: () => [],
  insertDatabaseTableData: () => {},
  vacuum: () => {},
  close: () => {
    if (db) {
      db.close();
      db = null;
    }
  },
};

export default sqlDatabase;
