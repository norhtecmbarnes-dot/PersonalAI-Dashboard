import { resolveApiKey } from '@/lib/services/api-key-resolver';

const DEFAULT_TTS_PORT = 18180;
const DEFAULT_VIDEO_PORT = 8383;

export function getDuixBaseUrl(): { tts: string; video: string } {
  const envPort = process.env.DUIX_TTS_PORT;
  const envVideoPort = process.env.DUIX_VIDEO_PORT;
  const ttsPort = envPort ? parseInt(envPort) : DEFAULT_TTS_PORT;
  const videoPort = envVideoPort ? parseInt(envVideoPort) : DEFAULT_VIDEO_PORT;
  return {
    tts: `http://127.0.0.1:${ttsPort}`,
    video: `http://127.0.0.1:${videoPort}`,
  };
}

export interface DuixStatus {
  ttsOnline: boolean;
  videoOnline: boolean;
  online: boolean;
}

export async function checkDuixStatus(): Promise<DuixStatus> {
  const { tts, video } = getDuixBaseUrl();
  const [ttsRes, videoRes] = await Promise.allSettled([
    fetch(`${tts}/v1/invoke`, { method: 'POST', body: JSON.stringify({}), signal: AbortSignal.timeout(3000) }),
    fetch(`${video}/easy/query?code=ping`, { signal: AbortSignal.timeout(3000) }),
  ]);
  const ttsOnline = ttsRes.status === 'fulfilled';
  const videoOnline = videoRes.status === 'fulfilled';
  return { ttsOnline, videoOnline, online: ttsOnline && videoOnline };
}

export interface DuixPreprocessResult {
  code: number;
  asr_format_audio_url: string;
  reference_audio_text: string;
}

export async function preprocessAudio(
  audioPath: string,
  lang: string = 'en',
): Promise<DuixPreprocessResult> {
  const { tts } = getDuixBaseUrl();
  const res = await fetch(`${tts}/v1/preprocess_and_tran`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      format: audioPath.split('.').pop() || 'wav',
      reference_audio: audioPath,
      lang,
    }),
  });
  if (!res.ok) throw new Error(`Duix preprocess ${res.status}`);
  const data = await res.json();
  if (data.code !== 0) throw new Error(data.msg || 'preprocess failed');
  return data;
}

export interface DuixTtsResult {
  audioPath: string;
}

export async function synthesizeSpeech(
  referenceAudio: string,
  referenceText: string,
  text: string,
): Promise<Buffer> {
  const { tts } = getDuixBaseUrl();
  const res = await fetch(`${tts}/v1/invoke`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      speaker: crypto.randomUUID(),
      text,
      format: 'wav',
      topP: 0.7,
      max_new_tokens: 1024,
      chunk_length: 100,
      repetition_penalty: 1.2,
      temperature: 0.7,
      need_asr: false,
      streaming: false,
      is_fixed_seed: 0,
      is_norm: 1,
      reference_audio: referenceAudio,
      reference_text: referenceText,
    }),
  });
  if (!res.ok) throw new Error(`Duix TTS ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

export interface DuixVideoSubmitResult {
  code: number;
  msg?: string;
  taskCode: string;
}

export async function submitVideoJob(
  audioPath: string,
  videoPath: string,
): Promise<DuixVideoSubmitResult> {
  const { video } = getDuixBaseUrl();
  const taskCode = crypto.randomUUID();
  const res = await fetch(`${video}/easy/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      audio_url: audioPath,
      video_url: videoPath,
      code: taskCode,
      chaofen: 0,
      watermark_switch: 0,
      pn: 1,
    }),
  });
  if (!res.ok) throw new Error(`Duix video submit ${res.status}`);
  const data = await res.json();
  if (data.code !== 10000) throw new Error(data.msg || 'video submit failed');
  return { code: data.code, msg: data.msg, taskCode };
}

export interface DuixVideoStatus {
  status: 'pending' | 'success' | 'failed';
  progress?: string;
  msg?: string;
  resultPath?: string;
}

export async function pollVideoStatus(taskCode: string): Promise<DuixVideoStatus> {
  const { video } = getDuixBaseUrl();
  const res = await fetch(`${video}/easy/query?code=${encodeURIComponent(taskCode)}`);
  if (!res.ok) throw new Error(`Duix video poll ${res.status}`);
  const data = await res.json();
  if (data.code !== 10000) {
    return { status: 'failed', msg: data.msg || 'poll error' };
  }
  const inner = data.data;
  if (inner.status === 1) return { status: 'pending', progress: inner.progress, msg: inner.msg };
  if (inner.status === 2) return { status: 'success', resultPath: inner.result, msg: inner.msg };
  if (inner.status === 3) return { status: 'failed', msg: inner.msg };
  return { status: 'pending', msg: inner.msg };
}