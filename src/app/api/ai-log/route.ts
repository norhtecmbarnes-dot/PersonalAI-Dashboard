export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { sqlDatabase } from '@/lib/database/sqlite';

/**
 * AI Log Endpoint
 * 
 * Receives events from across the application for AI self-improvement.
 * Events are stored in SQLite and analyzed during weekly reflection.
 * 
 * Event sources:
 * - onlyoffice: document create/edit/save/delete
 * - chat: conversations, commands
 * - canvas: UI generation
 * - tasks: scheduled task execution
 * - research: web searches, findings
 * - security: vulnerability scans
 */

interface LogEntry {
  source: string;
  event: string;
  data: any;
  timestamp: number;
}

// Ensure log table exists
async function ensureLogTable() {
  sqlDatabase.initialize();
  
  try {
    await sqlDatabase.all(`
      CREATE TABLE IF NOT EXISTS ai_logs (
        id TEXT PRIMARY KEY,
        source TEXT NOT NULL,
        event TEXT NOT NULL,
        data TEXT,
        timestamp INTEGER NOT NULL,
        created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000)
      )
    `);
    
    // Create indexes for common queries
    await sqlDatabase.all(`
      CREATE INDEX IF NOT EXISTS idx_ai_logs_source ON ai_logs(source)
    `);
    await sqlDatabase.all(`
      CREATE INDEX IF NOT EXISTS idx_ai_logs_timestamp ON ai_logs(timestamp)
    `);
  } catch {
    // Table might already exist
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: LogEntry = await request.json();
    
    const { source, event, data, timestamp } = body;
    
    if (!source || !event) {
      return NextResponse.json({ 
        error: 'Missing required fields: source, event' 
      }, { status: 400 });
    }
    
    await ensureLogTable();
    
    const id = `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    await sqlDatabase.run(
      `INSERT INTO ai_logs (id, source, event, data, timestamp) VALUES (?, ?, ?, ?, ?)`,
      [id, source, event, JSON.stringify(data || {}), timestamp || Date.now()]
    );
    
    // Log to console for development
    console.log(`[AI Log] ${source}/${event}`, data);
    
    return NextResponse.json({ 
      success: true, 
      id,
      timestamp: timestamp || Date.now()
    });
    
  } catch (error) {
    console.error('[AI Log] Error:', error);
    return NextResponse.json({ 
      error: 'Failed to log event',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const source = searchParams.get('source');
    const event = searchParams.get('event');
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');
    const since = searchParams.get('since'); // timestamp
    
    await ensureLogTable();
    
    let query = 'SELECT * FROM ai_logs';
    const params: any[] = [];
    const conditions: string[] = [];
    
    if (source) {
      conditions.push('source = ?');
      params.push(source);
    }
    
    if (event) {
      conditions.push('event = ?');
      params.push(event);
    }
    
    if (since) {
      conditions.push('timestamp >= ?');
      params.push(parseInt(since));
    }
    
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    
    query += ' ORDER BY timestamp DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);
    
    const logs = await sqlDatabase.all(query, params);
    
    // Parse JSON data
    const parsedLogs = logs.map(log => ({
      ...log,
      data: log.data ? JSON.parse(log.data) : null,
    }));
    
    // Get total count
    let countQuery = 'SELECT COUNT(*) as count FROM ai_logs';
    if (conditions.length > 0) {
      countQuery += ' WHERE ' + conditions.join(' AND ');
    }
    const countResult = await sqlDatabase.all(countQuery, params.slice(0, -2)); // Remove limit/offset
    const total = countResult[0]?.count || 0;
    
    return NextResponse.json({
      success: true,
      logs: parsedLogs,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      }
    });
    
  } catch (error) {
    console.error('[AI Log] Error:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch logs',
      logs: []
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const before = searchParams.get('before'); // timestamp
    const source = searchParams.get('source');
    
    await ensureLogTable();
    
    let query = 'DELETE FROM ai_logs';
    const params: any[] = [];
    const conditions: string[] = [];
    
    if (before) {
      conditions.push('timestamp < ?');
      params.push(parseInt(before));
    }
    
    if (source) {
      conditions.push('source = ?');
      params.push(source);
    }
    
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    
    await sqlDatabase.run(query, params);
    
    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error('[AI Log] Delete error:', error);
    return NextResponse.json({ error: 'Failed to delete logs' }, { status: 500 });
  }
}