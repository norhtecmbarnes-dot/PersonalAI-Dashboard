import { NextRequest, NextResponse } from 'next/server';
import { brandWorkspace } from '@/lib/services/brand-workspace';
import { documentProcessor } from '@/lib/services/document-processor';
import { knowledgeExtractor } from '@/lib/services/knowledge-extractor';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const brandId = formData.get('brandId') as string;
    const projectId = formData.get('projectId') as string | null;
    const title = formData.get('title') as string;
    const extractKnowledge = formData.get('extractKnowledge') !== 'false';

    if (!file || !brandId) {
      return NextResponse.json({ error: 'File and brandId are required' }, { status: 400 });
    }

    // Process the file using document processor
    const processed = await documentProcessor.processFile(file);

    // Add the document to the brand workspace
    const document = await brandWorkspace.addDocument(brandId, {
      title: title || processed.title,
      content: processed.content,
      type: processed.type,
      projectId: projectId || undefined,
      metadata: {
        size: processed.metadata.size,
        mimeType: processed.metadata.mimeType,
        importedAt: Date.now(),
        tags: processed.metadata.tags,
        summary: processed.metadata.summary,
      },
    });

    // Extract knowledge if requested (for text-based documents)
    let knowledge = null;
    if (extractKnowledge && processed.type !== 'image') {
      try {
        knowledge = await knowledgeExtractor.extractKnowledge(processed.content, brandId);
      } catch (keError) {
        console.error('[Upload] Knowledge extraction failed:', keError);
        // Don't fail the upload if knowledge extraction fails
      }
    }

    return NextResponse.json({
      success: true,
      document,
      knowledge,
      processed: {
        title: processed.title,
        type: processed.type,
        summary: processed.metadata.summary,
        tags: processed.metadata.tags,
      },
    });
  } catch (error) {
    console.error('[Upload] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Upload failed' },
      { status: 500 }
    );
  }
}
