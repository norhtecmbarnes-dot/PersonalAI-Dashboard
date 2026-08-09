export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getSystemStats, getQueue } from '@/lib/comfyui/client';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const part = searchParams.get('part') || 'system';
  try {
    if (part === 'queue') {
      const queue = await getQueue();
      return NextResponse.json({ ok: true, queue });
    }
    if (part === 'all') {
      const [system, queue] = await Promise.all([getSystemStats(), getQueue()]);
      return NextResponse.json({ ok: true, system, queue });
    }
    const system = await getSystemStats();
    return NextResponse.json({ ok: true, system });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'ComfyUI unreachable' },
      { status: 502 }
    );
  }
}