export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { sqlDatabase } from '@/lib/database/sqlite';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ table: string }> }
) {
  try {
    const { table: tableName } = await params;
    
    sqlDatabase.initialize();

    const tableCheck = await sqlDatabase.all(`
      SELECT name FROM sqlite_master WHERE type='table' AND name=?
    `, [tableName]);

    if (!tableCheck || tableCheck.length === 0) {
      return NextResponse.json(
        { success: false, error: `Table '${tableName}' not found` },
        { status: 404 }
      );
    }

    const columnsResult = await sqlDatabase.all(`PRAGMA table_info(${tableName})`);
    
    const columns = columnsResult.map((col: any) => ({
      name: col.name,
      type: col.type,
      notNull: col.notnull === 1,
      primaryKey: col.pk === 1,
    }));

    return NextResponse.json({
      success: true,
      table: tableName,
      columns,
    });
  } catch (error) {
    console.error('Failed to get table schema:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}