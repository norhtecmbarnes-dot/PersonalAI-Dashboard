import { NextResponse } from 'next/server';
import { systemManager } from '@/lib/system/manager';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    switch (action) {
      case 'status':
        return NextResponse.json(systemManager.getStatus());

      case 'health':
        const health = await systemManager.checkHealth();
        return NextResponse.json(health);

      case 'isRunning':
        return NextResponse.json({ running: systemManager.isRunning() });

      default:
        return NextResponse.json({
          endpoints: {
            '?action=status': 'Get system status',
            '?action=health': 'Check system health',
            '?action=isRunning': 'Check if system is running',
          },
          status: systemManager.getStatus(),
        });
    }
  } catch (error) {
    console.error('System API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action } = body;

    switch (action) {
      case 'start': {
        const status = await systemManager.start();
        return NextResponse.json({ success: true, status });
      }

      case 'shutdown': {
        const status = await systemManager.shutdown();
        return NextResponse.json({ success: true, status });
      }

      case 'restart': {
        await systemManager.shutdown();
        const status = await systemManager.start();
        return NextResponse.json({ success: true, status });
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (error) {
    console.error('System API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
