export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { spawn } from 'child_process';
import ffmpegStatic from 'ffmpeg-static';
import { preprocessAudio } from '@/lib/duix/client';

const DUIX_VOICE_DATA = 'D:\\duix_avatar_data\\voice\\data';
const DUIX_FACE2FACE_DATA = 'D:\\duix_avatar_data\\face2face\\temp';

export async function POST(request: NextRequest) {
  try {
    const form = await request.formData();
    const file = form.get('video');
    const lang = (form.get('lang') as string) || 'en';
    if (!(file instanceof File)) {
      return NextResponse.json({ ok: false, error: 'Missing video file' }, { status: 400 });
    }

    await mkdir(DUIX_VOICE_DATA, { recursive: true });
    await mkdir(DUIX_FACE2FACE_DATA, { recursive: true });

    const ts = Date.now();
    const ext = (file.name.split('.').pop() || 'mp4').toLowerCase();
    const videoName = `clone_${ts}.${ext}`;
    const audioName = `clone_${ts}.wav`;
    const videoPath = join(DUIX_FACE2FACE_DATA, videoName);
    const audioPath = join(DUIX_VOICE_DATA, audioName);

    const buf = Buffer.from(await file.arrayBuffer());
    await writeFile(videoPath, buf);

    // Extract audio with ffmpeg-static
    await new Promise<void>((resolve, reject) => {
      const ff = spawn(ffmpegStatic as string, [
        '-y', '-i', videoPath, '-vn', '-acodec', 'pcm_s16le', '-ar', '16000', '-ac', '1', audioPath,
      ]);
      let stderr = '';
      ff.stderr.on('data', (d: Buffer) => { stderr += d.toString(); });
      ff.on('close', (code: number) => {
        if (code === 0) resolve();
        else reject(new Error(`ffmpeg exited ${code}: ${stderr.slice(-500)}`));
      });
      ff.on('error', reject);
    });

    // Preprocess: ASR + reference text extraction (runs in the Duix TTS container)
    const relativeAudioPath = audioName; // relative to D:\duix_avatar_data\voice\data
    const preprocessed = await preprocessAudio(relativeAudioPath, lang);

    return NextResponse.json({
      ok: true,
      model: {
        videoPath: videoName, // relative to face2face\temp
        referenceAudio: preprocessed.asr_format_audio_url,
        referenceText: preprocessed.reference_audio_text,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'clone failed' },
      { status: 500 },
    );
  }
}