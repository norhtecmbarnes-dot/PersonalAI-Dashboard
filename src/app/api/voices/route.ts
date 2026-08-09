export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { fetchVoiceCatalog, searchVoices } from '@/lib/voices/catalog';
import { getVocalLabKey } from '@/lib/vocallab/client';

// In-memory catalog cache: TTS voice lists change rarely, so a 5-minute cache
// keeps the voice picker snappy without hammering provider APIs.
let cached: { ts: number; data: Awaited<ReturnType<typeof fetchVoiceCatalog>> } | null = null;
const CACHE_TTL = 5 * 60 * 1000;

async function getCatalog() {
  const now = Date.now();
  if (cached && now - cached.ts < CACHE_TTL) return cached.data;
  const data = await fetchVoiceCatalog();
  cached = { ts: now, data };
  return data;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action') || 'list';
  const query = searchParams.get('q') || '';
  const provider = searchParams.get('provider');
  const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10) || 50, 200);

  try {
    const catalog = await getCatalog();

    if (action === 'search') {
      let voices = catalog.voices;
      if (provider) voices = voices.filter(v => v.provider === provider);
      voices = searchVoices(voices, query, limit);
      return NextResponse.json({ ok: true, query, count: voices.length, voices });
    }

    // default: list
    let voices = catalog.voices;
    if (provider) voices = voices.filter(v => v.provider === provider);
    return NextResponse.json({
      ok: true,
      count: voices.length,
      voices: voices.slice(0, limit),
      providers: catalog.providers,
      errors: catalog.errors,
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'failed' },
      { status: 500 }
    );
  }
}

/**
 * Sample preview: returns a short audio clip of a voice so creators can hear
 * it before committing. ElevenLabs voices carry a previewUrl the client can
 * play directly; VocalLab voices have none, so we synthesize a ~3s sample
 * server-side and stream the mp3 back.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { provider, voiceId, text } = body as { provider: string; voiceId: string; text?: string };

    if (provider === 'elevenlabs') {
      // ElevenLabs exposes preview URLs; if the caller passed one, redirect to it.
      if (body.previewUrl) {
        return NextResponse.json({ ok: true, previewUrl: body.previewUrl });
      }
      // Otherwise generate a short sample via the TTS endpoint logic.
      const { elevenLabsTts } = await import('@/lib/elevenlabs/client');
      const sample = await elevenLabsTts({
        text: text || 'Hello, this is a voice sample.',
        voiceId,
        format: 'mp3_44100_64',
      });
      return new Response(new Uint8Array(sample), {
        headers: { 'Content-Type': 'audio/mpeg', 'Cache-Control': 'no-store' },
      });
    }

    if (provider === 'vocallab') {
      const key = getVocalLabKey();
      if (!key) {
        return NextResponse.json({ ok: false, error: 'VocalLab key not set' }, { status: 502 });
      }
      const res = await fetch('https://api.vocallab.ai/api/v1/tts', {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: text || 'Hello, this is a voice sample.',
          voice: voiceId,
          format: 'MP3',
        }),
      });
      if (!res.ok) {
        const t = await res.text().catch(() => '');
        return NextResponse.json({ ok: false, error: `VocalLab ${res.status}: ${t.slice(0, 200)}` }, { status: 502 });
      }
      const buf = Buffer.from(await res.arrayBuffer());
      return new Response(new Uint8Array(buf), {
        headers: { 'Content-Type': 'audio/mpeg', 'Cache-Control': 'no-store' },
      });
    }

    return NextResponse.json({ ok: false, error: 'Unknown provider' }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'sample failed' },
      { status: 502 }
    );
  }
}