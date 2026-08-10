export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { checkDuixStatus } from '@/lib/duix/client';

export async function GET() {
  try {
    const status = await checkDuixStatus();
    return NextResponse.json({ ok: true, ...status });
  } catch (error) {
    return NextResponse.json(
      { ok: false, online: false, error: error instanceof Error ? error.message : 'status check failed' },
      { status: 502 },
    );
  }
}