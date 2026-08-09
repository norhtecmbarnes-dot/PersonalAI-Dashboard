/**
 * ElevenLabs TTS client.
 *
 * Reads the API key from the SQLite settings table (provider "elevenlabs")
 * via the shared api-key-resolver, falling back to ELEVENLABS_API_KEY.
 *
 * Docs: https://elevenlabs.io/docs/api-reference/text-to-speech
 */

import { resolveApiKey } from '@/lib/services/api-key-resolver';

const ELEVENLABS_BASE = 'https://api.elevenlabs.io/v1';

export function getElevenLabsKey(): string | undefined {
  return resolveApiKey('elevenlabs', 'ELEVENLABS_API_KEY');
}

export interface ElevenLabsTtsParams {
  text: string;
  voiceId: string;
  modelId?: string;
  stability?: number;
  similarityBoost?: number;
  style?: number;
  useSpeakerBoost?: boolean;
  format?: 'mp3_44100_128' | 'mp3_44100_64' | 'pcm_16000' | 'pcm_24000';
}

export async function elevenLabsTts(params: ElevenLabsTtsParams): Promise<Buffer> {
  const key = getElevenLabsKey();
  if (!key) throw new Error('ElevenLabs API key not set. Add it in Settings or set ELEVENLABS_API_KEY.');

  const body: Record<string, unknown> = {
    text: params.text,
    model_id: params.modelId || 'eleven_multilingual_v2',
    voice_settings: {
      stability: params.stability ?? 0.5,
      similarity_boost: params.similarityBoost ?? 0.75,
      style: params.style ?? 0,
      use_speaker_boost: params.useSpeakerBoost ?? true,
    },
  };

  const url = `${ELEVENLABS_BASE}/text-to-speech/${encodeURIComponent(params.voiceId)}${
    params.format ? `?output_format=${params.format}` : ''
  }`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'xi-api-key': key,
      'Content-Type': 'application/json',
      Accept: 'audio/mpeg',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`ElevenLabs ${res.status}: ${text.slice(0, 300)}`);
  }

  const arrayBuf = await res.arrayBuffer();
  return Buffer.from(arrayBuf);
}

export async function elevenLabsListVoices(): Promise<unknown> {
  const key = getElevenLabsKey();
  if (!key) throw new Error('ElevenLabs API key not set');
  const res = await fetch(`${ELEVENLABS_BASE}/voices`, {
    headers: { 'xi-api-key': key },
  });
  if (!res.ok) throw new Error(`ElevenLabs ${res.status}`);
  return res.json();
}

export async function elevenLabsPing(): Promise<{ ok: boolean; error?: string }> {
  const key = getElevenLabsKey();
  if (!key) return { ok: false, error: 'ElevenLabs API key not set' };
  try {
    const res = await fetch(`${ELEVENLABS_BASE}/user`, {
      headers: { 'xi-api-key': key },
    });
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'unreachable' };
  }
}