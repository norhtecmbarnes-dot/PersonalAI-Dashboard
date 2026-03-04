export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { sqlDatabase } from '@/lib/database/sqlite';

export async function GET(request: NextRequest) {
  try {
    await sqlDatabase.initialize();
    
    // Get all tables using the all method
    const tablesResult = await sqlDatabase.all(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_litestream_%'
      ORDER BY name
    `);
    
    const tables = [];
    
    for (const table of tablesResult) {
      try {
        const columnsResult = await sqlDatabase.all(`PRAGMA table_info(${table.name})`);
        tables.push({
          name: table.name,
          columns: columnsResult.map((col: any) => ({
            name: col.name,
            type: col.type,
            notNull: col.notnull === 1,
            primaryKey: col.pk === 1,
          })),
        });
      } catch (e) {
        console.error(`Error getting columns for ${table.name}:`, e);
      }
    }
    
    return NextResponse.json({ success: true, tables });
  } catch (error) {
    console.error('Failed to get tables:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}