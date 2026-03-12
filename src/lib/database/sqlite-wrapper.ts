import Database from 'better-sqlite3';

export interface QueryExecResult {
  columns: string[];
  values: (string | number | null | Buffer)[][];
}

export class SqliteWrapper {
  private db: Database.Database | null = null;
  private filename: string;

  constructor(filename: string) {
    this.filename = filename;
  }

  init(): void {
    if (this.db) return;
    this.db = new Database(this.filename);
    this.db.pragma('journal_mode = WAL');
  }

  run(sql: string, params?: (string | number | null | Buffer)[]): void {
    if (!this.db) throw new Error('Database not initialized');
    try {
      if (params && params.length > 0) {
        this.db.prepare(sql).run(...params);
      } else {
        this.db.prepare(sql).run();
      }
    } catch (error) {
      // DDL statements (CREATE TABLE, etc.) may fail with .run() but still work
      if (!sql.trim().toUpperCase().startsWith('SELECT')) {
        try {
          this.db.exec(sql);
        } catch {
          // Ignore DDL errors (table already exists, etc.)
        }
      } else {
        throw error;
      }
    }
  }

  exec(sql: string, params?: (string | number | null | Buffer)[]): QueryExecResult[] {
    if (!this.db) throw new Error('Database not initialized');
    
    try {
      if (params && params.length > 0) {
        const stmt = this.db.prepare(sql);
        const rows = stmt.all(...params) as Record<string, any>[];
        if (rows.length === 0) {
          const colNames = stmt.columns();
          return [{ columns: colNames.map(c => c.name), values: [] }];
        }
        const columns = Object.keys(rows[0]);
        const values = rows.map(row => columns.map(col => {
          const val = row[col];
          if (val instanceof Buffer) return val;
          if (typeof val === 'boolean') return val ? 1 : 0;
          return val;
        }));
        return [{ columns, values }];
      } else {
        // For queries without params, check if it's a SELECT
        const trimmedSql = sql.trim().toUpperCase();
        if (trimmedSql.startsWith('SELECT') || trimmedSql.startsWith('PRAGMA')) {
          const rows = this.db.prepare(sql).all() as Record<string, any>[];
          if (rows.length === 0) {
            const stmt = this.db.prepare(sql);
            const colNames = stmt.columns();
            return [{ columns: colNames.map(c => c.name), values: [] }];
          }
          const columns = Object.keys(rows[0]);
          const values = rows.map(row => columns.map(col => {
            const val = row[col];
            if (val instanceof Buffer) return val;
            if (typeof val === 'boolean') return val ? 1 : 0;
            return val;
          }));
          return [{ columns, values }];
        } else {
          // DDL/INSERT/UPDATE/DELETE
          this.db.exec(sql);
          return [{ columns: [], values: [] }];
        }
      }
    } catch (error) {
      console.error('[SQLite] Query error:', error);
      return [{ columns: [], values: [] }];
    }
  }

  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}