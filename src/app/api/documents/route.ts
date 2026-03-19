import { NextRequest, NextResponse } from 'next/server';
import { sqlDatabase } from '@/lib/database/sqlite';

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Document ID required' }, { status: 400 });
    }

    sqlDatabase.initialize();
    const deleted = sqlDatabase.deleteNote(id);

    if (!deleted) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Document deleted',
      id,
    });
  } catch (error) {
    console.error('Document delete error:', error);
    return NextResponse.json(
      {
        error: 'Failed to delete document',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    sqlDatabase.initialize();
    const notes = sqlDatabase.getNotes('document');
    return NextResponse.json({ documents: notes || [] });
  } catch (error) {
    console.error('Document list error:', error);
    return NextResponse.json({ error: 'Failed to list documents' }, { status: 500 });
  }
}
