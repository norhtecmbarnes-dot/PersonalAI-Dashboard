export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { content, title } = body;

    if (!content) {
      return NextResponse.json({ error: 'content required' }, { status: 400 });
    }

    // Strip HTML tags and create paragraphs
    const plainText = content.replace(/<[^>]*>/g, '');
    const paragraphs = plainText.split(/\n+/).filter((p: string) => p.trim());

    const doc = new Document({
      sections: [
        {
          properties: {},
          children: [
            new Paragraph({
              text: title || 'Document',
              heading: HeadingLevel.TITLE,
              spacing: { after: 400 },
            }),
            ...paragraphs.map(
              (text: string) =>
                new Paragraph({
                  children: [
                    new TextRun({
                      text: text.trim(),
                      size: 24, // 12pt
                    }),
                  ],
                  spacing: { after: 200 },
                })
            ),
          ],
        },
      ],
    });

    const buffer = await Packer.toBuffer(doc);

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${title || 'document'}.docx"`,
      },
    });
  } catch (error) {
    console.error('DOCX export error:', error);
    return NextResponse.json(
      {
        error: 'Failed to export DOCX',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
