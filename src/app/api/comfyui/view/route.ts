export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getComfyUIBaseUrl } from '@/lib/comfyui/client';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const filename = searchParams.get('filename');
  const subfolder = searchParams.get('subfolder') || '';
  const type = searchParams.get('type') || 'output';
  if (!filename) {
    return NextResponse.json({ ok: false, error: 'Missing filename' }, { status: 400 });
  }
  const root = getComfyUIBaseUrl().replace(/\/$/, '');
  const params = new URLSearchParams({ filename, subfolder, type });
  try {
    const upstream = await fetch(`${root}/view?${params.toString()}`);
    if (!upstream.ok) {
      return NextResponse.json(
        { ok: false, error: `ComfyUI view ${upstream.status}` },
        { status: 502 }
      );
    }
    const contentType = upstream.headers.get('content-type') || 'application/octet-stream';
    const buf = Buffer.from(await upstream.arrayBuffer());
    return new NextResponse(buf, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'private, max-age=3600',
      },
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'view failed' },
      { status: 502 }
    );
  }
}