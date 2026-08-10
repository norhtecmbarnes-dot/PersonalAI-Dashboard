export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { sqlDatabase } from '@/lib/database/sqlite';
import * as lib from '@/lib/director/asset-library';

export async function GET(request: Request) {
  try {
    sqlDatabase.initialize();
    const { searchParams } = new URL(request.url);
    const chainId = searchParams.get('chain_id') || undefined;
    const shots = lib.listShots(chainId);
    return NextResponse.json({ ok: true, shots });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    sqlDatabase.initialize();
    const body = await request.json();
    const { action, data } = body;

    switch (action) {
      case 'create': {
        const shot = lib.createShot(data || {});
        return NextResponse.json({ ok: true, shot });
      }
      case 'update': {
        if (!data?.id) return NextResponse.json({ ok: false, error: 'id required' }, { status: 400 });
        lib.updateShot(data.id, data);
        return NextResponse.json({ ok: true });
      }
      case 'delete': {
        if (!data?.id) return NextResponse.json({ ok: false, error: 'id required' }, { status: 400 });
        lib.deleteShot(data.id);
        return NextResponse.json({ ok: true });
      }
      default:
        return NextResponse.json({ ok: false, error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}