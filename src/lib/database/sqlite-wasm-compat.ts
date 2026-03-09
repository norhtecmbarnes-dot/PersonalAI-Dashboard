/**
 * SQL.js compatibility wrapper for @sqlite.org/sqlite-wasm
 * Provides the same API as sql.js Database class for seamless replacement
 */

export type SqlValue = string | number | Uint8Array | null;

export interface QueryExecResult {
  columns: string[];
  values: SqlValue[][];
}

export interface Statement {
  bind(values: SqlValue[]): void;
  step(): boolean;
  get(): SqlValue[];
  get(idx: number): SqlValue;
  free(): void;
  reset(): void;
}

export class SQLiteWasmDatabase {
  private db: any;
  private filename: string;
  private sqlite3Module: any;
  private capi: any;
  private wasm: any;

  constructor(filename?: string) {
    this.filename = filename || ':memory:';
  }

  async init(): Promise<void> {
    if (this.db) return;
    // Dynamic import to avoid issues with ES modules in Node
    this.sqlite3Module = await import('@sqlite.org/sqlite-wasm');
    const sqlite3 = await this.sqlite3Module.default();
    this.db = new sqlite3.oo1.DB(this.filename);
    this.capi = sqlite3.capi;
    this.wasm = sqlite3.wasm;
  }

  private ensureDb(): void {
    if (!this.db) {
      throw new Error('Database not initialized. Call init() first.');
    }
  }

  /**
   * Execute SQL statement with optional parameters (for INSERT/UPDATE/DELETE/CREATE)
   * Similar to sql.js db.run()
   */
  run(sql: string, params?: SqlValue[]): void {
    this.ensureDb();
    if (!params || params.length === 0) {
      // Use exec for statements without parameters
      this.db.exec(sql);
      return;
    }
    // Use prepared statement for parameters
    const stmt = this.db.prepare(sql);
    try {
      stmt.bind(params);
      stmt.step();
    } finally {
      stmt.finalize();
    }
  }

  /**
   * Execute SQL query and return results in sql.js format
   * Similar to sql.js db.exec()
   */
  exec(sql: string, params?: SqlValue[]): QueryExecResult[] {
    this.ensureDb();
    // If parameters provided, use prepared statement
    if (params && params.length > 0) {
      const stmt = this.db.prepare(sql);
      try {
        stmt.bind(params);
        const columns = stmt.getColumnNames();
        const values: SqlValue[][] = [];
        while (stmt.step()) {
          const row: SqlValue[] = [];
          for (let i = 0; i < columns.length; i++) {
            row.push(stmt.get(i));
          }
          values.push(row);
        }
        return [{ columns, values }];
      } finally {
        stmt.finalize();
      }
    } else {
      // Use selectObjects to get column names and values
      // Note: selectObjects returns array of objects with column names as keys
      const objects = this.db.selectObjects(sql);
      if (objects.length === 0) {
        // Try to get column names from a prepared statement
        const stmt = this.db.prepare(sql);
        const columns = stmt.getColumnNames();
        stmt.finalize();
        return [{ columns, values: [] }];
      }
      const columns = Object.keys(objects[0]);
      const values = objects.map((obj: any) => columns.map((col: any) => obj[col]));
      return [{ columns, values }];
    }
  }

  /**
   * Prepare a statement
   */
  prepare(sql: string): Statement {
    this.ensureDb();
    const stmt = this.db.prepare(sql);
    return {
      bind: (values: SqlValue[]) => stmt.bind(values),
      step: () => stmt.step(),
      get: (idx?: number): SqlValue | SqlValue[] => {
        if (idx !== undefined) {
          return stmt.get(idx);
        }
        const columns = stmt.getColumnNames();
        return columns.map((_: any, i: number) => stmt.get(i));
      },
      free: () => stmt.finalize(),
      reset: () => stmt.reset(),
    } as Statement;
  }

  /**
   * Export database to Uint8Array (for backup)
   */
  export(): Uint8Array {
    this.ensureDb();
    // TODO: implement proper serialization using sqlite3_serialize
    console.warn('Database export not fully implemented, returning empty buffer');
    return new Uint8Array(0);
  }

  /**
   * Close the database
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}