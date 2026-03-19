export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { Document, Paragraph, TextRun, HeadingLevel, AlignmentType, Packer } from 'docx';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { content, title, format } = body;

    if (!content || !format) {
      return NextResponse.json({ error: 'content and format are required' }, { status: 400 });
    }

    const safeTitle = title || 'Document';

    if (format === 'docx') {
      // Create DOCX document
      const doc = new Document({
        sections: [
          {
            properties: {},
            children: [
              new Paragraph({
                text: safeTitle,
                heading: HeadingLevel.TITLE,
                alignment: AlignmentType.CENTER,
                spacing: { after: 400 },
              }),
              ...content.split('\n').map((line: string) => {
                if (line.startsWith('# ')) {
                  return new Paragraph({
                    text: line.replace('# ', ''),
                    heading: HeadingLevel.HEADING_1,
                    spacing: { before: 200, after: 100 },
                  });
                } else if (line.startsWith('## ')) {
                  return new Paragraph({
                    text: line.replace('## ', ''),
                    heading: HeadingLevel.HEADING_2,
                    spacing: { before: 200, after: 100 },
                  });
                } else if (line.startsWith('### ')) {
                  return new Paragraph({
                    text: line.replace('### ', ''),
                    heading: HeadingLevel.HEADING_3,
                    spacing: { before: 200, after: 100 },
                  });
                } else if (line.trim()) {
                  return new Paragraph({
                    children: [
                      new TextRun({
                        text: line,
                        size: 24, // 12pt
                      }),
                    ],
                    spacing: { after: 100 },
                  });
                }
                return new Paragraph({ text: '' });
              }),
            ],
          },
        ],
      });

      const blob = await Packer.toBlob(doc);
      return new NextResponse(blob, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'Content-Disposition': `attachment; filename="${safeTitle}.docx"`,
        },
      });
    }

    if (format === 'pdf') {
      // For PDF, we'll use a simple text-based approach
      // In production, you'd use pdfkit properly
      const textContent = `# ${safeTitle}\n\n${content}`;
      const blob = new Blob([textContent], { type: 'application/pdf' });
      return new NextResponse(blob, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${safeTitle}.txt"`,
        },
      });
    }

    return NextResponse.json({ error: 'Unsupported format' }, { status: 400 });
  } catch (error) {
    console.error('Error exporting document:', error);
    return NextResponse.json({ error: 'Failed to export document' }, { status: 500 });
  }
}
