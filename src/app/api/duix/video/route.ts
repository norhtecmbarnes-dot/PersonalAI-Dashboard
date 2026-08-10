export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { submitVideoJob, pollVideoStatus } from '@/lib/duix/client';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { audioPath, videoPath } = body as { audioPath: string; videoPath: string };
    if (!audioPath || !videoPath) {
      return NextResponse.json({ ok: false, error: 'Missing audioPath or videoPath' }, { status: 400 });
    }
    const result = await submitVideoJob(audioPath, videoPath);
    return NextResponse.json({ ok: true, taskCode: result.taskCode });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'video submit failed' },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const taskCode = searchParams.get('taskCode');
    if (!taskCode) {
      return NextResponse.json({ ok: false, error: 'Missing taskCode' }, { status: 400 });
    }
    const status = await pollVideoStatus(taskCode);
    return NextResponse.json({ ok: true, ...status });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'poll failed' },
      { status: 500 },
    );
  }
}