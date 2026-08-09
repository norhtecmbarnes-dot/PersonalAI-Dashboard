const VOCALLAB_BASE = 'https://api.vocallab.ai/api';

export function getVocalLabKey(): string | undefined {
  return process.env.VOCALLAB_API_KEY;
}

export interface VocalLabTtsParams {
  text: string;
  voice: string;
  format?: 'MP3' | 'WAV' | 'PCM';
  speed?: number;
  temperature?: number;
}

export async function vocallabTts(params: VocalLabTtsParams): Promise<Buffer> {
  const key = getVocalLabKey();
  if (!key) throw new Error('VOCALLAB_API_KEY not set');

  const body: Record<string, unknown> = {
    text: params.text,
    voice: params.voice,
    format: params.format || 'MP3',
  };
  if (params.speed !== undefined) body.speed = params.speed;
  if (params.temperature !== undefined) body.temperature = params.temperature;

  const res = await fetch(`${VOCALLAB_BASE}/v1/tts`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`VocalLab ${res.status}: ${text.slice(0, 300)}`);
  }

  const arrayBuf = await res.arrayBuffer();
  return Buffer.from(arrayBuf);
}

export async function vocallabListVoices(): Promise<unknown> {
  const key = getVocalLabKey();
  if (!key) throw new Error('VOCALLAB_API_KEY not set');
  const res = await fetch(`${VOCALLAB_BASE}/v1/voices?limit=50`, {
    headers: { 'Authorization': `Bearer ${key}` },
  });
  if (!res.ok) throw new Error(`VocalLab ${res.status}`);
  return res.json();
}

export async function vocallabPing(): Promise<{ ok: boolean; points?: number; error?: string }> {
  const key = getVocalLabKey();
  if (!key) return { ok: false, error: 'VOCALLAB_API_KEY not set' };
  try {
    const res = await fetch(`${VOCALLAB_BASE}/v1/ping`, {
      headers: { 'Authorization': `Bearer ${key}` },
    });
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
    const data = await res.json();
    return { ok: true, points: data.points };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'unreachable' };
  }
}