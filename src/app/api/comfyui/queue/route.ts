export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { submitPrompt, getHistory, cancelPrompt, HistoryEntry } from '@/lib/comfyui/client';

interface SubmitBody {
  prompt: Record<string, unknown>;
  action?: 'submit';
}

function extractOutput(history: HistoryEntry) {
  const outputs = history.outputs || {};
  const videos: Array<{ filename: string; subfolder: string; type: string; format: string }> = [];
  const images: Array<{ filename: string; subfolder: string; type: string }> = [];
  const audios: Array<{ filename: string; subfolder: string; type: string; format?: string; sample_rate?: number }> = [];
  for (const nodeOut of Object.values(outputs)) {
    if (nodeOut.videos) videos.push(...nodeOut.videos);
    if (nodeOut.images) images.push(...nodeOut.images);
    if (nodeOut.audios) audios.push(...nodeOut.audios);
  }
  return { videos, images, audios };
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as SubmitBody;
    if (!body.prompt || typeof body.prompt !== 'object') {
      return NextResponse.json({ ok: false, error: 'Missing prompt graph' }, { status: 400 });
    }
    const res = await submitPrompt(body.prompt);
    return NextResponse.json({ ok: true, prompt_id: res.prompt_id, number: res.number });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'submit failed' },
      { status: 502 }
    );
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const promptId = searchParams.get('prompt_id');
  const action = searchParams.get('action');
  const baseUrl = searchParams.get('base') || undefined;

  if (action === 'cancel' && promptId) {
    try {
      await cancelPrompt(promptId, baseUrl || undefined);
      return NextResponse.json({ ok: true });
    } catch (error) {
      return NextResponse.json(
        { ok: false, error: error instanceof Error ? error.message : 'cancel failed' },
        { status: 502 }
      );
    }
  }

  if (!promptId) {
    return NextResponse.json({ ok: false, error: 'Missing prompt_id' }, { status: 400 });
  }
  try {
    const history = await getHistory(promptId, baseUrl || undefined);
    const entry = history[promptId];
    if (!entry) {
      return NextResponse.json({ ok: true, done: false, prompt_id: promptId });
    }
    const done = entry.status?.completed === true;
    const failed = entry.status?.status_str && entry.status.status_str !== 'success' && entry.status.status_str !== 'success_seedready';
    return NextResponse.json({
      ok: true,
      done,
      failed,
      status: entry.status?.status_str,
      prompt_id: promptId,
      outputs: done ? extractOutput(entry) : undefined,
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'history fetch failed' },
      { status: 502 }
    );
  }
}