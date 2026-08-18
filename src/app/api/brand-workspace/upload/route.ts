import { NextRequest, NextResponse } from 'next/server';
import { brandWorkspace } from '@/lib/services/brand-workspace';
import { bidWorkflowService } from '@/lib/services/bid-workflow';
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

    // Extract knowledge if requested (for text-based documents). When a
    // document is loaded into a procurement (projectId), skip the generic
    // knowledge pass — the solicitation processor below supersedes it.
    let knowledge = null;
    if (extractKnowledge && processed.type !== 'image' && !projectId) {
      try {
        knowledge = await knowledgeExtractor.extractKnowledge(processed.content, brandId);
      } catch (keError) {
        console.error('[Upload] Knowledge extraction failed:', keError);
        // Don't fail the upload if knowledge extraction fails
      }
    }

    // Auto-process solicitations loaded into a procurement:
    // name the opportunity, extract the due date into the calendar, generate a
    // format guide markdown, and create the capture document.
    let solicitation = null;
    let dissection = null;
    if (projectId && extractKnowledge && processed.type !== 'image') {
      try {
        solicitation = await bidWorkflowService.processSolicitation(projectId);
      } catch (solError) {
        console.error('[Upload] Solicitation processing failed:', solError);
        // Don't fail the upload if solicitation processing fails
      }

      // Dissect the solicitation into compliance, scoring, milestones, and
      // format intelligence. Idempotent: skips when already dissected for
      // this exact document set.
      try {
        dissection = await bidWorkflowService.dissectSolicitation(projectId);
      } catch (disError) {
        console.error('[Upload] Solicitation dissection failed:', disError);
        // Don't fail the upload if dissection fails
      }
    }

    return NextResponse.json({
      success: true,
      document,
      knowledge,
      solicitation,
      dissection,
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
