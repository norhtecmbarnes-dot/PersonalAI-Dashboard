import { NextRequest, NextResponse } from 'next/server';
import { documentGenerator } from '@/lib/services/document-generator';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, type, content, headers, rows, slides, prompt } = body;

    let generated: { buffer: Buffer; filename: string; mimeType: string };

    if (type === 'word') {
      const paragraphs = content 
        ? (Array.isArray(content) ? content : content.split('\n').filter((p: string) => p.trim()))
        : ['Document created by AI Dashboard'];
      generated = await documentGenerator.createWordDocument(title || 'Document', paragraphs);
    } else if (type === 'cell') {
      generated = documentGenerator.createSpreadsheet(title || 'Spreadsheet', {
        headers: headers || ['Column 1', 'Column 2', 'Column 3'],
        rows: rows || [['Data 1', 'Data 2', 'Data 3']]
      });
    } else if (type === 'slide') {
      generated = await documentGenerator.createPresentation(title || 'Presentation', slides || [
        { title: 'Title Slide', bulletPoints: ['Created by AI Dashboard'] }
      ]);
    } else {
      generated = documentGenerator.createText(title || 'Document', content || 'Generated content');
    }

    return new NextResponse(new Uint8Array(generated.buffer), {
      headers: {
        'Content-Type': generated.mimeType,
        'Content-Disposition': `attachment; filename="${encodeURIComponent(generated.filename)}"`,
        'Content-Length': generated.buffer.length.toString(),
      },
    });
  } catch (error) {
    console.error('Document generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate document', details: String(error) },
      { status: 500 }
    );
  }
}
