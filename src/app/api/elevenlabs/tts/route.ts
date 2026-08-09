export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { elevenLabsTts, elevenLabsListVoices, elevenLabsPing } from '@/lib/elevenlabs/client';
import { getComfyUIBaseUrl } from '@/lib/comfyui/client';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action') || 'ping';

  try {
    if (action === 'voices') {
      const voices = await elevenLabsListVoices();
      return NextResponse.json({ ok: true, voices });
    }
    const result = await elevenLabsPing();
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'failed' },
      { status: 502 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text, voiceId, modelId, stability, similarityBoost, style, format } = body;

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ ok: false, error: 'Missing text' }, { status: 400 });
    }
    if (!voiceId || typeof voiceId !== 'string') {
      return NextResponse.json({ ok: false, error: 'Missing voiceId' }, { status: 400 });
    }

    const audioBuffer = await elevenLabsTts({
      text,
      voiceId,
      modelId,
      stability,
      similarityBoost,
      style,
      format,
    });

    // Upload the audio to ComfyUI so it can be used in avatar/lip-sync workflows
    const comfyRoot = getComfyUIBaseUrl().replace(/\/$/, '');
    const filename = `elevenlabs_tts_${Date.now()}.mp3`;
    const form = new FormData();
    form.append('image', new Blob([new Uint8Array(audioBuffer)], { type: 'audio/mpeg' }), filename);
    const uploadRes = await fetch(`${comfyRoot}/upload/image`, { method: 'POST', body: form });
    if (!uploadRes.ok) {
      const txt = await uploadRes.text().catch(() => '');
      return NextResponse.json(
        { ok: false, error: `ComfyUI upload failed: ${uploadRes.status} ${txt.slice(0, 200)}` },
        { status: 502 }
      );
    }
    const uploadData = await uploadRes.json();

    return NextResponse.json({
      ok: true,
      audio: uploadData,
      filename,
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'TTS failed' },
      { status: 502 }
    );
  }
}