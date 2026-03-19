import { NextRequest, NextResponse } from 'next/server';
import { DocumentProcessor } from '@/lib/services/document-processor';
import { DocumentStore } from '@/lib/storage/documents';

export const runtime = 'nodejs'; // Required for file system access

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'text/plain',
      'text/markdown',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    if (!allowedTypes.includes(file.type) && !file.name.endsWith('.pdf')) {
      return NextResponse.json(
        {
          error: 'Unsupported file type',
          supported: ['PDF', 'TXT', 'MD', 'DOCX'],
        },
        { status: 400 }
      );
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 400 });
    }

    // Process the document
    const processor = DocumentProcessor.getInstance();
    const processed = await processor.processFile(file);

    // Store in database
    const doc = await DocumentStore.create({
      title: processed.title,
      content: processed.content,
      size: processed.content.length,
      type: processed.type,
      metadata: processed.metadata,
    });

    return NextResponse.json({
      success: true,
      document: {
        id: doc.id,
        title: processed.title,
        type: processed.type,
        size: file.size,
        content: processed.content,
        summary: processed.metadata.summary,
        tags: processed.metadata.tags,
      },
    });
  } catch (error) {
    console.error('Document upload error:', error);
    return NextResponse.json(
      {
        error: 'Failed to process document',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
