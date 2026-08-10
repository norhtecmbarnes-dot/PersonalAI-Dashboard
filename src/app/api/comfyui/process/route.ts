export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { comfyProcessManager } from '@/lib/comfyui/process';

export async function GET() {
  return NextResponse.json(comfyProcessManager.getStatus());
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const action = body.action;

    switch (action) {
      case 'start': {
        const status = await comfyProcessManager.start();
        return NextResponse.json({ success: true, status });
      }
      case 'stop': {
        const status = await comfyProcessManager.stop();
        return NextResponse.json({ success: true, status });
      }
      case 'restart': {
        const status = await comfyProcessManager.restart();
        return NextResponse.json({ success: true, status });
      }
      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: start, stop, restart' },
          { status: 400 }
        );
    }
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        status: comfyProcessManager.getStatus(),
      },
      { status: 500 }
    );
  }
}