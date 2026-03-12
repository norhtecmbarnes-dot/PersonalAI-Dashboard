export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { bitnetService, BITNET_MODELS } from '@/lib/services/bitnet';
import { sqlDatabase } from '@/lib/database/sqlite';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    switch (action) {
      case 'status':
        return NextResponse.json(bitnetService.getStatus());

      case 'models':
        return NextResponse.json({
          models: BITNET_MODELS,
          currentModel: bitnetService.getConfig().model,
        });

      case 'check':
        const installPath = searchParams.get('path');
        if (!installPath) {
          return NextResponse.json({ error: 'Path parameter required' }, { status: 400 });
        }
        const checkResult = await bitnetService.checkInstallation(installPath);
        return NextResponse.json(checkResult);

      case 'config':
        return NextResponse.json(bitnetService.getConfig());

      default:
        return NextResponse.json({
          status: bitnetService.getStatus(),
          config: bitnetService.getConfig(),
          models: BITNET_MODELS,
        });
    }
  } catch (error) {
    console.error('[BitNet API] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, installPath, model, enabled, prompt, options } = body;

    switch (action) {
      case 'configure':
        sqlDatabase.initialize();
        
        if (installPath !== undefined) {
          sqlDatabase.setSetting('bitnet_install_path', installPath, 'models');
        }
        if (model !== undefined) {
          sqlDatabase.setSetting('bitnet_model', model, 'models');
        }
        if (enabled !== undefined) {
          sqlDatabase.setSetting('bitnet_enabled', String(enabled), 'models');
        }

        bitnetService.saveConfig({ installPath, model, enabled });
        return NextResponse.json({ success: true, config: bitnetService.getConfig() });

      case 'inference':
        if (!prompt) {
          return NextResponse.json({ error: 'Prompt required' }, { status: 400 });
        }

        const result = await bitnetService.inference(prompt, options);
        return NextResponse.json({ success: true, response: result });

      case 'stop':
        bitnetService.stopInference();
        return NextResponse.json({ success: true });

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('[BitNet API] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}