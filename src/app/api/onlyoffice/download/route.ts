import { NextRequest, NextResponse } from 'next/server';
import { onlyOfficeService } from '@/lib/integrations/onlyoffice';
import { documentGenerator } from '@/lib/services/document-generator';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get('id');
    const format = searchParams.get('format') || 'original';

    if (!documentId) {
      return NextResponse.json({ error: 'Document ID required. Use ?id=xxx' }, { status: 400 });
    }

    const doc = await onlyOfficeService.getDocument(documentId);
    
    if (!doc) {
      return NextResponse.json({ error: 'Document not found', id: documentId }, { status: 404 });
    }

    let generated: { buffer: Buffer; filename: string; mimeType: string };

    switch (doc.fileType) {
      case 'docx':
        if (format === 'pdf') {
          return NextResponse.json({ 
            error: 'PDF export requires ONLYOFFICE Document Server. Download as .docx instead.' 
          }, { status: 400 });
        }
        const content = doc.content || '';
        const paragraphs = content.split('\n').filter(p => p.trim());
        generated = await documentGenerator.createWordDocument(doc.title, paragraphs);
        break;

      case 'xlsx':
        const xlsxContent = doc.content || '';
        const xlsxLines = xlsxContent.split('\n').filter(l => l.trim() && !l.startsWith('###'));
        const xlsxRows = xlsxLines.map(line => line.split(',').map(cell => cell.trim()));
        if (xlsxRows.length === 0) {
          xlsxRows.push(['Column 1', 'Column 2', 'Column 3']);
        }
        generated = documentGenerator.createSpreadsheet(doc.title, {
          headers: xlsxRows[0] || ['Column'],
          rows: xlsxRows.slice(1)
        });
        break;

      case 'pptx':
        try {
          const pptxContent = doc.content || '';
          const pptxLines = pptxContent.split('\n').filter(l => l.trim());
          const slides: { title: string; bulletPoints: string[] }[] = [];
          
          let currentSlide: { title: string; bulletPoints: string[] } | null = null;
          for (const line of pptxLines) {
            if (line.match(/^Slide \d+:/) || line.match(/^=== Slide \d+:/)) {
              if (currentSlide) slides.push(currentSlide);
              currentSlide = {
                title: line.replace(/^===?\s*Slide \d+:\s*/, '').replace(/^Slide \d+:\s*/, '').trim(),
                bulletPoints: []
              };
            } else if (line.match(/^[-*•]\s/) && currentSlide) {
              currentSlide.bulletPoints.push(line.replace(/^[-*•]\s*/, '').trim());
            }
          }
          if (currentSlide) slides.push(currentSlide);
          
          if (slides.length === 0) {
            slides.push({ title: doc.title.replace('.pptx', ''), bulletPoints: ['Created by AI Dashboard'] });
          }
          
          generated = await documentGenerator.createPresentation(doc.title, slides);
        } catch (pptxError) {
          console.error('PPTX generation error:', pptxError);
          generated = await documentGenerator.createPresentation(doc.title, [
            { title: doc.title.replace('.pptx', ''), bulletPoints: ['Created by AI Dashboard'] }
          ]);
        }
        break;

      default:
        generated = documentGenerator.createText(doc.title, doc.content || '');
    }

    return new NextResponse(new Uint8Array(generated.buffer), {
      headers: {
        'Content-Type': generated.mimeType,
        'Content-Disposition': `attachment; filename="${encodeURIComponent(generated.filename)}"`,
        'Content-Length': generated.buffer.length.toString(),
      },
    });
  } catch (error) {
    console.error('Download error:', error);
    return NextResponse.json({ error: 'Failed to download document', details: String(error) }, { status: 500 });
  }
}