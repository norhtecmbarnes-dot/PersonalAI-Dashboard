export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { sqlDatabase } from '@/lib/database/sqlite';

export async function GET() {
  try {
    sqlDatabase.initialize();

    // Get all documents
    const docs = sqlDatabase.getDocuments();

    // Get document content from notes table (where documents are stored)
    const notes = sqlDatabase.getNotes('document');

    return NextResponse.json({
      success: true,
      documents: docs.map((d: any) => ({
        id: d.id,
        title: d.title,
        type: d.type,
        size: d.size,
        content_preview: d.content?.substring(0, 500),
        content_length: d.content?.length || 0,
        full_content: d.content,
        created_at: d.created_at,
      })),
      notes: notes.map((n: any) => ({
        id: n.id,
        title: n.title,
        category: n.category,
        content_preview: n.content?.substring(0, 500),
        content_length: n.content?.length || 0,
        tags: n.tags,
      })),
      debug_info: {
        total_documents: docs.length,
        total_notes: notes.length,
        has_pdf: docs.some((d: any) => d.type === 'pdf'),
        database_path: 'data/assistant.db',
      },
    });
  } catch (error) {
    console.error('Debug error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
