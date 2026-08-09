export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getComfyUIBaseUrl } from '@/lib/comfyui/client';

export async function POST(request: NextRequest) {
  try {
    const form = await request.formData();
    const file = form.get('image');
    if (!(file instanceof File)) {
      return NextResponse.json({ ok: false, error: 'Missing image file' }, { status: 400 });
    }
    const root = getComfyUIBaseUrl().replace(/\/$/, '');
    const upForm = new FormData();
    upForm.append('image', file, file.name);
    const upstream = await fetch(`${root}/upload/image`, { method: 'POST', body: upForm });
    if (!upstream.ok) {
      const txt = await upstream.text().catch(() => '');
      return NextResponse.json(
        { ok: false, error: `ComfyUI upload ${upstream.status}: ${txt.slice(0, 200)}` },
        { status: 502 }
      );
    }
    const data = await upstream.json();
    return NextResponse.json({ ok: true, image: data });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'upload failed' },
      { status: 500 }
    );
  }
}