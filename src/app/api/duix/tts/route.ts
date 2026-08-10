export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { synthesizeSpeech } from '@/lib/duix/client';

const DUIX_FACE2FACE_DATA = 'D:\\duix_avatar_data\\face2face\\temp';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text, referenceAudio, referenceText } = body as {
      text: string;
      referenceAudio: string;
      referenceText: string;
    };
    if (!text?.trim() || !referenceAudio || !referenceText) {
      return NextResponse.json({ ok: false, error: 'Missing text, referenceAudio, or referenceText' }, { status: 400 });
    }

    const audioBuf = await synthesizeSpeech(referenceAudio, referenceText, text);
    await mkdir(DUIX_FACE2FACE_DATA, { recursive: true });

    const audioName = `tts_${Date.now()}.wav`;
    await writeFile(join(DUIX_FACE2FACE_DATA, audioName), audioBuf);

    return NextResponse.json({ ok: true, audioPath: audioName });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'TTS failed' },
      { status: 500 },
    );
  }
}