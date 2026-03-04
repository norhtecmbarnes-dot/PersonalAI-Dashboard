import { NextRequest, NextResponse } from 'next/server';
import { remotionService } from '@/lib/integrations/remotion';
import { validateString, validateObject } from '@/lib/utils/validation';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');
  const renderId = searchParams.get('renderId');

  try {
    switch (action) {
      case 'status':
        const status = await remotionService.checkStatus();
        return NextResponse.json(status);

      case 'compositions':
        const compositions = await remotionService.listCompositions();
        return NextResponse.json({ compositions, count: compositions.length });

      case 'templates':
        const templates = await remotionService.listTemplates();
        return NextResponse.json({ templates, count: templates.length });

      case 'render-status':
        if (!renderId) {
          return NextResponse.json({ error: 'renderId required' }, { status: 400 });
        }
        const renderStatus = await remotionService.getRenderStatus(renderId);
        return NextResponse.json(renderStatus);

      case 'download':
        if (!renderId) {
          return NextResponse.json({ error: 'renderId required' }, { status: 400 });
        }
        const downloadUrl = await remotionService.getDownloadUrl(renderId);
        return NextResponse.json({ downloadUrl });

      case 'capabilities':
        const capStatus = await remotionService.checkStatus();
        return NextResponse.json({
          configured: remotionService.isConfigured(),
          apiUrl: remotionService.getApiUrl(),
          connected: capStatus.connected,
          compositions: capStatus.compositions,
        });

      default:
        return NextResponse.json({
          configured: remotionService.isConfigured(),
          apiUrl: remotionService.getApiUrl(),
          endpoints: {
            'GET ?action=status': 'Check Remotion connection status',
            'GET ?action=compositions': 'List available compositions',
            'GET ?action=templates': 'List video templates',
            'GET ?action=render-status&renderId=X': 'Check render progress',
            'GET ?action=download&renderId=X': 'Get download URL',
            'POST action=create': 'Create and render video',
            'POST action=preview': 'Preview composition',
            'POST action=ai-generate': 'Generate video from AI prompt',
            'POST action=cancel': 'Cancel active render',
          },
        });
    }
  } catch (error) {
    console.error('[Remotion API] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, data } = body;

    switch (action) {
      case 'create': {
        const templateValidation = validateString(data?.template, 'template', { required: true, maxLength: 100 });
        if (!templateValidation.valid) {
          return NextResponse.json({ error: templateValidation.error }, { status: 400 });
        }

        const compositionValidation = validateString(data?.composition, 'composition', { required: true, maxLength: 100 });
        if (!compositionValidation.valid) {
          return NextResponse.json({ error: compositionValidation.error }, { status: 400 });
        }

        const propsValidation = validateObject(data?.props, 'props', { required: true });
        if (!propsValidation.valid) {
          return NextResponse.json({ error: propsValidation.error }, { status: 400 });
        }

        const result = await remotionService.createVideo({
          template: data.template,
          composition: data.composition,
          props: data.props,
          format: data.format || 'mp4',
          quality: data.quality,
          fps: data.fps,
          durationInFrames: data.durationInFrames,
          width: data.width,
          height: data.height,
          audio: data.audio,
        });

        return NextResponse.json({
          success: true,
          renderId: result.renderId,
        });
      }

      case 'preview': {
        const compositionValidation = validateString(data?.composition, 'composition', { required: true, maxLength: 100 });
        if (!compositionValidation.valid) {
          return NextResponse.json({ error: compositionValidation.error }, { status: 400 });
        }

        const result = await remotionService.previewComposition(data.composition, data.props || {});

        return NextResponse.json({
          success: true,
          previewUrl: result.previewUrl,
        });
      }

      case 'ai-generate': {
        const promptValidation = validateString(data?.prompt, 'prompt', { required: true, maxLength: 5000 });
        if (!promptValidation.valid) {
          return NextResponse.json({ error: promptValidation.error }, { status: 400 });
        }

        const result = await remotionService.renderFromAiPrompt(data.prompt, {
          template: data.template,
          duration: data.duration,
          format: data.format,
        });

        return NextResponse.json({
          success: true,
          renderId: result.renderId,
          interpretation: result.interpretation,
        });
      }

      case 'cancel': {
        const renderIdValidation = validateString(data?.renderId, 'renderId', { required: true, maxLength: 100 });
        if (!renderIdValidation.valid) {
          return NextResponse.json({ error: renderIdValidation.error }, { status: 400 });
        }

        const cancelled = await remotionService.cancelRender(data.renderId);

        return NextResponse.json({
          success: cancelled,
        });
      }

      default:
        return NextResponse.json(
          { error: 'Unknown action. Use: create, preview, ai-generate, cancel' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('[Remotion API] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}