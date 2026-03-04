export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { sqlDatabase } from '@/lib/database/sqlite';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { table, data } = body;

    if (!table || !data || typeof data !== 'object') {
      return NextResponse.json(
        { success: false, error: 'table and data required' },
        { status: 400 }
      );
    }

    await sqlDatabase.initialize();

    // Get table schema to validate columns
    const columnsResult = await sqlDatabase.all(`PRAGMA table_info(${table})`);
    
    if (!columnsResult || columnsResult.length === 0) {
      return NextResponse.json(
        { success: false, error: `Table '${table}' not found` },
        { status: 404 }
      );
    }

    const validColumns = columnsResult.map((col: any) => col.name);
    const primaryKey = columnsResult.find((col: any) => col.pk === 1)?.name;

    // Filter data to only valid columns
    const filteredData: Record<string, any> = {};
    const now = Date.now();

    for (const [key, value] of Object.entries(data)) {
      if (validColumns.includes(key)) {
        filteredData[key] = value;
      }
    }

    // Add timestamps if columns exist
    if (validColumns.includes('created_at') && !filteredData['created_at']) {
      filteredData['created_at'] = now;
    }
    if (validColumns.includes('updated_at') && !filteredData['updated_at']) {
      filteredData['updated_at'] = now;
    }

    // Generate ID if needed
    const idColumn = primaryKey || 'id';
    if (validColumns.includes(idColumn) && !filteredData[idColumn]) {
      filteredData[idColumn] = uuidv4();
    }

    // Handle JSON fields (tags, arrays, etc.)
    for (const [key, value] of Object.entries(filteredData)) {
      if (Array.isArray(value)) {
        filteredData[key] = JSON.stringify(value);
      }
    }

    // Build INSERT query
    const columns = Object.keys(filteredData);
    const placeholders = columns.map(() => '?').join(', ');
    const values = Object.values(filteredData);

    const sql = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`;

    try {
      await sqlDatabase.run(sql, values);
      
      return NextResponse.json({
        success: true,
        id: filteredData[idColumn],
        message: `Record inserted into ${table}`,
      });
    } catch (insertError) {
      console.error('Insert error:', insertError);
      return NextResponse.json({
        success: false,
        error: insertError instanceof Error ? insertError.message : 'Insert failed',
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Database insert error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const table = searchParams.get('table');
  const limit = parseInt(searchParams.get('limit') || '10');
  const offset = parseInt(searchParams.get('offset') || '0');

  if (!table) {
    return NextResponse.json({
      success: false,
      error: 'table parameter required',
      usage: '?table=tablename&limit=10&offset=0',
    }, { status: 400 });
  }

  try {
    await sqlDatabase.initialize();

    // Check if table exists
    const tableCheck = await sqlDatabase.all(`
      SELECT name FROM sqlite_master WHERE type='table' AND name=?
    `, [table]);

    if (!tableCheck || tableCheck.length === 0) {
      return NextResponse.json({
        success: false,
        error: `Table '${table}' not found`,
      }, { status: 404 });
    }

    const rows = await sqlDatabase.all(`SELECT * FROM ${table} ORDER BY rowid DESC LIMIT ? OFFSET ?`, [limit, offset]);
    const countResult = await sqlDatabase.all(`SELECT COUNT(*) as count FROM ${table}`);
    const total = countResult[0]?.count || 0;

    // Parse JSON fields
    const parsedRows = rows.map(row => {
      const parsed: Record<string, any> = { ...row };
      for (const [key, value] of Object.entries(row)) {
        if (typeof value === 'string' && (value.startsWith('[') || value.startsWith('{'))) {
          try {
            parsed[key] = JSON.parse(value);
          } catch {
            // Keep as string if not valid JSON
          }
        }
      }
      return parsed;
    });

    return NextResponse.json({
      success: true,
      table,
      rows: parsedRows,
      total,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Database query error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { table, id, idColumn } = body;

    if (!table || !id) {
      return NextResponse.json(
        { success: false, error: 'table and id required' },
        { status: 400 }
      );
    }

    await sqlDatabase.initialize();

    const column = idColumn || 'id';
    await sqlDatabase.run(`DELETE FROM ${table} WHERE ${column} = ?`, [id]);

    return NextResponse.json({
      success: true,
      message: `Record deleted from ${table}`,
    });
  } catch (error) {
    console.error('Database delete error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}