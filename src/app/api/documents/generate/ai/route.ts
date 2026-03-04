import { NextRequest, NextResponse } from 'next/server';
import { generateDocumentFromPrompt } from '@/lib/services/ai-document-generator';
import { brandWorkspace } from '@/lib/services/brand-workspace';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, title, prompt, rawContent, brandId } = body;

    // Log only essential request info, not full content
    console.log('[Document AI] Request:', { type, title: title?.substring(0, 30) });

    if (!type || !['word', 'cell', 'slide'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid document type. Use word, cell, or slide.' },
        { status: 400 }
      );
    }

    if (!title) {
      return NextResponse.json(
        { error: 'Title is required.' },
        { status: 400 }
      );
    }

    if (!prompt && !rawContent) {
      return NextResponse.json(
        { error: 'Either prompt or rawContent is required.' },
        { status: 400 }
      );
    }

    let brandContext = '';
    if (brandId) {
      try {
        const brand = await brandWorkspace.getBrandById(brandId);
        if (brand) {
          const contextParts: string[] = [];
          contextParts.push(`BRAND: ${brand.name}`);
          if (brand.description) {
            contextParts.push(`Description: ${brand.description}`);
          }
          if (brand.industry) {
            contextParts.push(`Industry: ${brand.industry}`);
          }
          if (brand.voiceProfile) {
            if (brand.voiceProfile.tone) {
              contextParts.push(`Tone: ${brand.voiceProfile.tone}`);
            }
            if (brand.voiceProfile.style) {
              contextParts.push(`Style: ${brand.voiceProfile.style}`);
            }
            if (brand.voiceProfile.keyMessages?.length) {
              contextParts.push(`Key Messages: ${brand.voiceProfile.keyMessages.join(', ')}`);
            }
            if (brand.voiceProfile.avoidPhrases?.length) {
              contextParts.push(`Avoid: ${brand.voiceProfile.avoidPhrases.join(', ')}`);
            }
            if (brand.voiceProfile.customInstructions) {
              contextParts.push(`Additional: ${brand.voiceProfile.customInstructions}`);
            }
          }
          brandContext = '\n\n' + contextParts.join('\n') + '\n\nIMPORTANT: Use this brand voice and style in your document.';
        }
      } catch (error) {
        console.error('[Document AI] Error loading brand:', error);
      }
    }

    const finalPrompt = brandContext 
      ? (prompt || '') + brandContext
      : prompt || '';

    console.log(`[Document AI] Generating ${type} document: "${title}"`);

    const result = await generateDocumentFromPrompt({
      type,
      title,
      prompt: finalPrompt,
      rawContent: brandContext ? (rawContent || '') + brandContext : rawContent,
    });

    console.log(`[Document AI] Successfully generated ${result.filename}, size: ${result.buffer.length} bytes`);

    return new NextResponse(new Uint8Array(result.buffer), {
      headers: {
        'Content-Type': result.mimeType,
        'Content-Disposition': `attachment; filename="${result.filename}"`,
        'Content-Length': result.buffer.length.toString(),
      },
    });
  } catch (error) {
    console.error('[Document AI] Generation error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : '';
    console.error('[Document AI] Stack:', errorStack);
    
    return NextResponse.json(
      { 
        error: 'Failed to generate document',
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}