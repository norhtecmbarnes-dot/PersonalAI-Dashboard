export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import PDFDocument from 'pdfkit';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { content, title } = body;

    if (!content) {
      return NextResponse.json({ error: 'content required' }, { status: 400 });
    }

    return new Promise<NextResponse>(resolve => {
      const doc = new PDFDocument({
        size: 'LETTER',
        margins: {
          top: 72,
          bottom: 72,
          left: 72,
          right: 72,
        },
      });

      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(chunks);
        resolve(
          new NextResponse(pdfBuffer, {
            headers: {
              'Content-Type': 'application/pdf',
              'Content-Disposition': `attachment; filename="${title || 'document'}.pdf"`,
            },
          })
        );
      });

      // Title
      doc
        .fontSize(18)
        .font('Helvetica-Bold')
        .text(title || 'Document', { align: 'center' });
      doc.moveDown();

      // Content - strip HTML tags and render as plain text
      const plainText = content.replace(/<[^>]*>/g, '');
      const paragraphs = plainText.split(/\n+/).filter((p: string) => p.trim());

      doc.fontSize(12).font('Helvetica');
      paragraphs.forEach((paragraph: string, idx: number) => {
        if (paragraph.trim()) {
          doc.text(paragraph.trim(), {
            align: 'left',
            indent: 0,
            paragraphGap: 10,
          });
          if (idx < paragraphs.length - 1) {
            doc.moveDown(0.5);
          }
        }
      });

      doc.end();
    });
  } catch (error) {
    console.error('PDF export error:', error);
    return NextResponse.json(
      {
        error: 'Failed to export PDF',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
