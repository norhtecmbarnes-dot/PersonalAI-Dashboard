export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { documentProcessor, DocumentContext } from '@/lib/storage/document-processor';
import { sqlDatabase } from '@/lib/database/sqlite';
import { validateString, sanitizeString } from '@/lib/utils/validation';

export async function POST(request: Request) {
  try {
    await sqlDatabase.initialize();
    
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const remember = formData.get('remember') === 'true';

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file
    const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 50MB' },
        { status: 400 }
      );
    }

    // Validate file name
    const fileNameValidation = validateString(file.name, 'file name', {
      maxLength: 255,
      required: true
    });
    if (!fileNameValidation.valid) {
      return NextResponse.json(
        { error: fileNameValidation.error },
        { status: 400 }
      );
    }

    // Validate file type
    const ALLOWED_TYPES = [
      'text/plain',
      'text/markdown',
      'text/csv',
      'application/json',
      'application/xml',
      'text/html',
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    const fileType = file.name.split('.').pop()?.toLowerCase();
    const VALID_EXTENSIONS = ['txt', 'md', 'csv', 'json', 'xml', 'html', 'pdf', 'docx'];
    
    if (!VALID_EXTENSIONS.includes(fileType || '')) {
      return NextResponse.json(
        { error: 'Invalid file type. Allowed: ' + VALID_EXTENSIONS.join(', ') },
        { status: 400 }
      );
    }

    let content = '';
    const sanitizedFileName = sanitizeString(file.name);
    
    if (fileType === 'txt' || fileType === 'md' || fileType === 'csv' || fileType === 'json' || fileType === 'xml' || fileType === 'html') {
      content = await file.text();
    } else if (fileType === 'pdf') {
      const text = await file.text();
      content = text || `[PDF Document: ${sanitizedFileName}]\n\nNote: Full PDF parsing requires server-side processing. The document has been imported with available text content.`;
    } else if (fileType === 'docx') {
      const text = await file.text();
      content = text || `[Word Document: ${sanitizedFileName}]\n\nNote: Full Word parsing requires server-side processing. The document has been imported with available text content.`;
    } else {
      content = await file.text();
    }

    const docContext = await documentProcessor.processDocument({
      name: sanitizedFileName,
      content,
      type: file.type,
      size: file.size,
    });

    docContext.remember = remember;

    if (remember) {
      await documentProcessor.saveDocumentContext(docContext);
    }

    const note = sqlDatabase.addNote({
      title: docContext.title,
      content: docContext.content,
      category: 'document',
      tags: [
        ...docContext.tags,
        `importance:${docContext.importance}`,
        `type:${docContext.type}`,
        remember ? 'remembered' : 'temporary',
      ],
    });

    return NextResponse.json({
      success: true,
      document: {
        id: note.id,
        title: docContext.title,
        type: docContext.type,
        summary: docContext.summary,
        tags: docContext.tags,
        importance: docContext.importance,
        briefingNotes: docContext.briefingNotes,
        remember,
        vectorized: true,
      },
    });
  } catch (error) {
    console.error('Document import error:', error);
    return NextResponse.json(
      { error: 'Failed to import document', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    try {
      await sqlDatabase.initialize();
    } catch (dbError) {
      console.error('Database init error:', dbError);
      return NextResponse.json({ 
        error: 'Database initialization failed', 
        details: dbError instanceof Error ? dbError.message : 'Unknown error' 
      }, { status: 500 });
    }

    switch (action) {
      case 'list': {
        const notes = sqlDatabase.getNotes('document');
        return NextResponse.json({ documents: notes });
      }

      case 'search': {
        const query = searchParams.get('query') || '';
        const results = documentProcessor.searchDocuments(query);
        return NextResponse.json({ documents: results });
      }

      case 'briefing': {
        const briefing = documentProcessor.generateWeeklyBriefing();
        const items = documentProcessor.getDocumentsForBriefing('medium');
        return NextResponse.json({ briefing, items });
      }

      case 'importance': {
        const notes = sqlDatabase.getNotes('document');
        const byImportance = {
          critical: notes.filter(n => n.tags && n.tags.includes('importance:critical')).length,
          high: notes.filter(n => n.tags && n.tags.includes('importance:high')).length,
          medium: notes.filter(n => n.tags && n.tags.includes('importance:medium')).length,
          low: notes.filter(n => n.tags && n.tags.includes('importance:low')).length,
        };
        return NextResponse.json({ byImportance });
      }

      default:
        return NextResponse.json({
          endpoints: {
            '?action=list': 'List all documents',
            '?action=search&query=...': 'Search documents',
            '?action=briefing': 'Generate weekly briefing',
            '?action=importance': 'Get importance stats',
          },
        });
    }
  } catch (error) {
    console.error('Document API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
