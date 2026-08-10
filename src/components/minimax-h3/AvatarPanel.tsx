'use client';

import { useState, useCallback, useEffect } from 'react';
import {
  AvatarShot,
  defaultAvatarShot,
  buildAvatarGraph,
} from '@/lib/comfyui/avatar-graph';
import {
  LocalAvatarShot,
  defaultLocalAvatarShot,
  buildLocalAvatarGraph,
} from '@/lib/comfyui/local-avatar-graph';
import type { UploadedImage } from '@/lib/comfyui/client';
import { VoicePicker } from './VoicePicker';
import { ClonePanel } from './ClonePanel';

interface AvatarJob {
  id: string;
  promptId?: string;
  shot: AvatarShot;
  photoName?: string;
  status: 'running' | 'done' | 'failed' | 'cancelled';
  startedAt?: number;
  finishedAt?: number;
  message?: string;
  outputs?: {
    videos: Array<{ filename: string; subfolder: string; type: string; format: string }>;
    gifs: Array<{ filename: string; subfolder: string; type: string; format: string }>;
  };
}

interface Props {
  comfyOnline: boolean;
}

export function AvatarPanel({ comfyOnline }: Props) {
  const [shot, setShot] = useState<AvatarShot>(defaultAvatarShot);
  const [jobs, setJobs] = useState<AvatarJob[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [vocallabStatus, setVocallabStatus] = useState<{ ok: boolean; points?: number; error?: string } | null>(null);
  const [generatingTts, setGeneratingTts] = useState(false);
  const [avatarMode, setAvatarMode] = useState<'heygen' | 'local' | 'clone'>('local');
  const [localShot, setLocalShot] = useState<LocalAvatarShot>(defaultLocalAvatarShot);

  // Check VocalLab status on mount
  useEffect(() => {
    fetch('/api/vocallab/tts')
      .then(r => r.json())
      .then(setVocallabStatus)
      .catch(() => setVocallabStatus({ ok: false, error: 'unreachable' }));
  }, []);

  // Upload photo to ComfyUI
  const handlePhotoUpload = useCallback(async (file: File) => {
    setError(null);
    try {
      const form = new FormData();
      form.append('image', file);
      const res = await fetch('/api/comfyui/upload', { method: 'POST', body: form });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || 'upload failed');
      const img: UploadedImage = data.image;
      setShot(s => ({ ...s, photoFile: img }));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'photo upload failed');
    }
  }, []);

  // Generate TTS via VocalLab and upload to ComfyUI
  const generateTts = useCallback(async () => {
    if (!shot.text.trim()) {
      setError('Enter text to generate speech');
      return;
    }
    setError(null);
    setGeneratingTts(true);
    try {
      const res = await fetch('/api/vocallab/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: shot.text, voice: shot.voice, format: 'MP3' }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || 'TTS failed');
      setShot(s => ({
        ...s,
        audioFile: { name: data.audio.name, subfolder: data.audio.subfolder, type: data.audio.type },
        speechSource: 'audio',
      }));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'TTS failed');
    } finally {
      setGeneratingTts(false);
    }
  }, [shot.text, shot.voice]);

  // Poll ComfyUI for avatar job completion
  const pollAvatarJob = useCallback(async (jobId: string, promptId: string) => {
    let attempts = 0;
    const doPoll = async () => {
      attempts++;
      if (attempts > 120) {
        setJobs(prev => prev.map(j => (j.id === jobId ? { ...j, status: 'failed', message: 'timed out' } : j)));
        return;
      }
      try {
        const res = await fetch(`/api/comfyui/queue?prompt_id=${encodeURIComponent(promptId)}`);
        const data = await res.json();
        if (!data.ok) {
          setJobs(prev => prev.map(j => (j.id === jobId ? { ...j, status: 'failed', message: data.error } : j)));
          return;
        }
        if (data.failed) {
          setJobs(prev => prev.map(j => (j.id === jobId ? { ...j, status: 'failed', message: data.status, finishedAt: Date.now() } : j)));
          return;
        }
        if (data.done) {
          setJobs(prev =>
            prev.map(j => (j.id === jobId ? { ...j, status: 'done', outputs: data.outputs, finishedAt: Date.now() } : j))
          );
          return;
        }
        setTimeout(doPoll, 5000);
      } catch {
        setTimeout(doPoll, 8000);
      }
    };
    doPoll();
  }, []);

  // Submit avatar render to ComfyUI
  const submitAvatar = useCallback(async () => {
    if (!shot.photoFile) {
      setError('Upload a photo first');
      return;
    }
    if (shot.speechSource === 'audio' && !shot.audioFile) {
      setError('Generate TTS audio first');
      return;
    }
    if (shot.speechSource === 'script' && !shot.text.trim()) {
      setError('Enter text for the avatar to speak');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const graph = buildAvatarGraph(shot);
      const res = await fetch('/api/comfyui/queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: graph }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || 'submit failed');
      const job: AvatarJob = {
        id: `avatar_${Date.now()}`,
        promptId: data.prompt_id,
        shot: { ...shot },
        photoName: shot.photoFile.name,
        status: 'running',
        startedAt: Date.now(),
      };
      setJobs(prev => [job, ...prev]);
      pollAvatarJob(job.id, data.prompt_id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'submit failed');
    } finally {
      setSubmitting(false);
    }
  }, [shot, pollAvatarJob]);

  // Generate TTS for local avatar mode (same VocalLab endpoint)
  const generateLocalTts = useCallback(async () => {
    if (!localShot.scriptText.trim()) {
      setError('Enter script text to generate speech');
      return;
    }
    setError(null);
    setGeneratingTts(true);
    try {
      const res = await fetch('/api/vocallab/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: localShot.scriptText, voice: localShot.voice, format: 'MP3' }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || 'TTS failed');
      setLocalShot(s => ({
        ...s,
        audioFile: { name: data.audio.name, subfolder: data.audio.subfolder, type: data.audio.type },
      }));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'TTS failed');
    } finally {
      setGeneratingTts(false);
    }
  }, [localShot.scriptText, localShot.voice]);

  // Upload photo for local avatar face
  const handleLocalPhotoUpload = useCallback(async (file: File) => {
    setError(null);
    try {
      const form = new FormData();
      form.append('image', file);
      const res = await fetch('/api/comfyui/upload', { method: 'POST', body: form });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || 'upload failed');
      setLocalShot(s => ({ ...s, faceImageFile: data.image }));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'photo upload failed');
    }
  }, []);

  // Submit local avatar render
  const submitLocalAvatar = useCallback(async () => {
    if (!localShot.audioFile) {
      setError('Generate TTS audio first');
      return;
    }
    if (!localShot.faceImageFile && !localShot.facePrompt.trim()) {
      setError('Either upload a face photo or enter a face generation prompt');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const graph = buildLocalAvatarGraph(localShot);
      const res = await fetch('/api/comfyui/queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: graph }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || 'submit failed');
      const job: AvatarJob = {
        id: `local_avatar_${Date.now()}`,
        promptId: data.prompt_id,
        shot: { ...shot, text: localShot.scriptText, voice: localShot.voice },
        photoName: localShot.faceImageFile?.name || '(generated face)',
        status: 'running',
        startedAt: Date.now(),
      };
      setJobs(prev => [job, ...prev]);
      pollAvatarJob(job.id, data.prompt_id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'submit failed');
    } finally {
      setSubmitting(false);
    }
  }, [localShot, shot, pollAvatarJob]);

  const doneJobs = jobs.filter(j => j.status === 'done' || j.status === 'failed');
  const activeJobs = jobs.filter(j => j.status === 'running');

  return (
    <div className="space-y-4">
      {/* Sub-tab switcher */}
      <div className="flex gap-2">
        <button
          onClick={() => setAvatarMode('local')}
          className={`px-3 py-1.5 text-sm rounded font-medium ${avatarMode === 'local' ? 'bg-purple-600 text-white' : 'bg-slate-700 text-slate-400 hover:text-white'}`}
        >
          🏠 Local Avatar (Qwen-Image + Wan InfiniteTalk)
        </button>
        <button
          onClick={() => setAvatarMode('heygen')}
          className={`px-3 py-1.5 text-sm rounded font-medium ${avatarMode === 'heygen' ? 'bg-purple-600 text-white' : 'bg-slate-700 text-slate-400 hover:text-white'}`}
        >
          ☁️ HeyGen Avatar (cloud)
        </button>
        <button
          onClick={() => setAvatarMode('clone')}
          className={`px-3 py-1.5 text-sm rounded font-medium ${avatarMode === 'clone' ? 'bg-purple-600 text-white' : 'bg-slate-700 text-slate-400 hover:text-white'}`}
        >
          🧬 Duix Clone (offline)
        </button>
      </div>

      {avatarMode === 'clone' ? (
        <ClonePanel />
      ) : avatarMode === 'local' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Local avatar config */}
          <div className="bg-slate-800/60 rounded-lg border border-slate-700 p-4 space-y-4">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <span className="text-purple-400">🏠</span> Local Avatar Studio
            </h2>
            <p className="text-xs text-slate-400">
              Fully open-source pipeline: Qwen-Image generates a face → VocalLab generates voice →
              Wan InfiniteTalk does lip-sync. No API credits, runs entirely on your GPU.
            </p>

            {/* VocalLab status */}
            <div className="flex items-center gap-2 text-xs">
              <span className={`px-2 py-0.5 rounded ${vocallabStatus?.ok ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'}`}>
                {vocallabStatus?.ok ? '● VocalLab OK' : '● VocalLab ' + (vocallabStatus?.error || 'offline')}
              </span>
            </div>

            {/* Face: upload or generate */}
            <div>
              <label className="block text-xs text-slate-400 mb-1">Face source</label>
              <div className="flex gap-2 mb-2">
                <button
                  onClick={() => setLocalShot(s => ({ ...s, faceImageFile: undefined }))}
                  className={`px-2 py-1 text-xs rounded ${!localShot.faceImageFile ? 'bg-purple-600 text-white' : 'bg-slate-700 text-slate-400'}`}
                >
                  Generate from prompt
                </button>
                <button
                  onClick={() => {
                    const inp = document.createElement('input');
                    inp.type = 'file';
                    inp.accept = 'image/*';
                    inp.onchange = e => {
                      const f = (e.target as HTMLInputElement).files?.[0];
                      if (f) handleLocalPhotoUpload(f);
                    };
                    inp.click();
                  }}
                  className={`px-2 py-1 text-xs rounded ${localShot.faceImageFile ? 'bg-purple-600 text-white' : 'bg-slate-700 text-slate-400'}`}
                >
                  Upload photo
                </button>
              </div>
              {localShot.faceImageFile ? (
                <div className="text-xs text-green-400">📎 {localShot.faceImageFile.name}</div>
              ) : (
                <input
                  type="text"
                  value={localShot.facePrompt}
                  onChange={e => setLocalShot(s => ({ ...s, facePrompt: e.target.value }))}
                  placeholder="A professional headshot of a 30-year-old woman with short dark hair, neutral background, soft studio lighting"
                  className="w-full bg-slate-900 text-slate-100 rounded p-2 border border-slate-600 text-sm"
                />
              )}
            </div>

            {/* Script + voice */}
            <div>
              <label className="block text-xs text-slate-400 mb-1">Script (what the avatar says)</label>
              <textarea
                value={localShot.scriptText}
                onChange={e => setLocalShot(s => ({ ...s, scriptText: e.target.value }))}
                rows={3}
                placeholder="Hello, welcome to my channel. Today I want to talk about…"
                className="w-full bg-slate-900 text-slate-100 rounded p-2 border border-slate-600 text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <VoicePicker
                  value={localShot.voice}
                  provider="vocallab"
                  onChange={(voiceId) => setLocalShot(s => ({ ...s, voice: voiceId }))}
                  label="Voice (searchable)"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Video length (frames)</label>
                <input
                  type="number"
                  value={localShot.length}
                  min={1}
                  max={3600}
                  step={4}
                  onChange={e => setLocalShot(s => ({ ...s, length: parseInt(e.target.value) || 81 }))}
                  className="w-full bg-slate-700 text-white rounded px-2 py-2 text-sm border border-slate-600"
                />
              </div>
            </div>

            {/* TTS audio status */}
            {localShot.audioFile && (
              <div className="text-xs text-green-400">🎙️ TTS audio ready: {localShot.audioFile.name}</div>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <button
                onClick={generateLocalTts}
                disabled={generatingTts || !localShot.scriptText.trim() || !vocallabStatus?.ok}
                className="px-3 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded text-sm"
              >
                {generatingTts ? 'Generating…' : '🎙️ Generate voice'}
              </button>
              <button
                onClick={submitLocalAvatar}
                disabled={submitting || !comfyOnline || !localShot.audioFile}
                className="px-3 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded text-sm font-medium"
              >
                {submitting ? 'Submitting…' : '🎬 Generate avatar video'}
              </button>
            </div>

            {/* Model filenames (collapsible) */}
            <details className="text-xs">
              <summary className="text-slate-300 cursor-pointer">Model filenames</summary>
              <div className="grid grid-cols-1 gap-2 mt-2">
                <input value={localShot.faceModel} onChange={e => setLocalShot(s => ({ ...s, faceModel: e.target.value }))} placeholder="Qwen-Image model" className="bg-slate-700 text-white rounded px-2 py-1 border border-slate-600" />
                <input value={localShot.faceClip} onChange={e => setLocalShot(s => ({ ...s, faceClip: e.target.value }))} placeholder="Qwen-Image CLIP" className="bg-slate-700 text-white rounded px-2 py-1 border border-slate-600" />
                <input value={localShot.faceVae} onChange={e => setLocalShot(s => ({ ...s, faceVae: e.target.value }))} placeholder="Qwen-Image VAE" className="bg-slate-700 text-white rounded px-2 py-1 border border-slate-600" />
                <input value={localShot.talkModel} onChange={e => setLocalShot(s => ({ ...s, talkModel: e.target.value }))} placeholder="Wan talk model" className="bg-slate-700 text-white rounded px-2 py-1 border border-slate-600" />
                <input value={localShot.talkModelPatch} onChange={e => setLocalShot(s => ({ ...s, talkModelPatch: e.target.value }))} placeholder="InfiniteTalk model patch" className="bg-slate-700 text-white rounded px-2 py-1 border border-slate-600" />
                <input value={localShot.talkClip} onChange={e => setLocalShot(s => ({ ...s, talkClip: e.target.value }))} placeholder="Wan CLIP" className="bg-slate-700 text-white rounded px-2 py-1 border border-slate-600" />
                <input value={localShot.talkVae} onChange={e => setLocalShot(s => ({ ...s, talkVae: e.target.value }))} placeholder="Wan VAE" className="bg-slate-700 text-white rounded px-2 py-1 border border-slate-600" />
                <input value={localShot.audioEncoder} onChange={e => setLocalShot(s => ({ ...s, audioEncoder: e.target.value }))} placeholder="Audio encoder" className="bg-slate-700 text-white rounded px-2 py-1 border border-slate-600" />
              </div>
            </details>
          </div>

          {/* Jobs + results (shared) */}
          <div className="space-y-4">
            {activeJobs.length > 0 && (
              <div className="bg-slate-800/60 rounded-lg border border-slate-700 p-3">
                <h3 className="text-sm font-semibold text-white mb-2">Rendering</h3>
                {activeJobs.map(job => (
                  <div key={job.id} className="flex items-center gap-2 text-sm">
                    <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
                    <span className="truncate">{job.photoName} — {Math.floor((Date.now() - (job.startedAt || 0)) / 1000)}s</span>
                  </div>
                ))}
              </div>
            )}
            <div className="bg-slate-800/60 rounded-lg border border-slate-700 p-3">
              <h3 className="text-sm font-semibold text-white mb-2">Avatar Videos</h3>
              {doneJobs.length === 0 ? (
                <p className="text-sm text-slate-500">No avatar videos yet.</p>
              ) : (
                <div className="space-y-3">
                  {doneJobs.map(job => (
                    <div key={job.id} className="bg-slate-900/50 rounded p-2 border border-slate-700">
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-xs px-2 py-0.5 rounded ${job.status === 'done' ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'}`}>
                          {job.status}
                        </span>
                        <span className="text-xs text-slate-500 truncate">{job.photoName}</span>
                      </div>
                      {job.status === 'done' && job.outputs?.videos?.[0] && (
                        <video
                          src={`/api/comfyui/view?filename=${encodeURIComponent(job.outputs.videos[0].filename)}&subfolder=${encodeURIComponent(job.outputs.videos[0].subfolder)}&type=${encodeURIComponent(job.outputs.videos[0].type)}`}
                          controls
                          className="w-full rounded"
                        />
                      )}
                      {job.status === 'failed' && job.message && (
                        <p className="text-xs text-red-400">{job.message}</p>
                      )}
                      <p className="text-xs text-slate-500 mt-1 line-clamp-1">{job.shot.text.slice(0, 80)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Config */}
      <div className="bg-slate-800/60 rounded-lg border border-slate-700 p-4 space-y-4">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <span className="text-purple-400">🧑‍💼</span> Avatar Studio
        </h2>

        {/* VocalLab status */}
        <div className="flex items-center gap-2 text-xs">
          <span className={`px-2 py-0.5 rounded ${vocallabStatus?.ok ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'}`}>
            {vocallabStatus?.ok ? '● VocalLab OK' : '● VocalLab ' + (vocallabStatus?.error || 'offline')}
          </span>
          {vocallabStatus?.ok && vocallabStatus.points !== undefined && (
            <span className="text-slate-400">{vocallabStatus.points} points</span>
          )}
        </div>

        {/* Photo upload */}
        <div>
          <label className="block text-xs text-slate-400 mb-1">Photo (face to animate)</label>
          <label className="block cursor-pointer">
            <input
              type="file"
              accept="image/*"
              onChange={e => {
                const f = e.target.files?.[0];
                if (f) handlePhotoUpload(f);
                e.target.value = '';
              }}
              className="hidden"
              disabled={!comfyOnline}
            />
            <div className={`w-full px-3 py-2 rounded text-sm border border-slate-600 text-center ${comfyOnline ? 'bg-slate-700 hover:bg-slate-600 text-slate-300' : 'bg-slate-800 text-slate-600 cursor-not-allowed'}`}>
              {shot.photoFile ? `📎 ${shot.photoFile.name}` : '📷 Upload photo…'}
            </div>
          </label>
        </div>

        {/* Script / TTS */}
        <div>
          <label className="block text-xs text-slate-400 mb-1">Script (what the avatar says)</label>
          <textarea
            value={shot.text}
            onChange={e => setShot(s => ({ ...s, text: e.target.value }))}
            rows={3}
            placeholder="Hello, I'm here to tell you about…"
            className="w-full bg-slate-900 text-slate-100 rounded p-2 border border-slate-600 text-sm"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <VoicePicker
              value={shot.voice}
              provider="vocallab"
              onChange={(voiceId) => setShot(s => ({ ...s, voice: voiceId }))}
              label="Voice (searchable)"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Resolution</label>
            <select
              value={shot.resolution}
              onChange={e => setShot(s => ({ ...s, resolution: e.target.value as '720p' | '1080p' }))}
              className="w-full bg-slate-700 text-white rounded px-2 py-2 text-sm border border-slate-600"
            >
              <option value="720p">720p</option>
              <option value="1080p">1080p</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Aspect ratio</label>
            <select
              value={shot.aspectRatio}
              onChange={e => setShot(s => ({ ...s, aspectRatio: e.target.value as typeof shot.aspectRatio }))}
              className="w-full bg-slate-700 text-white rounded px-2 py-2 text-sm border border-slate-600"
            >
              {['auto', '16:9', '9:16', '1:1', '4:5', '5:4'].map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Expressiveness</label>
            <select
              value={shot.expressiveness}
              onChange={e => setShot(s => ({ ...s, expressiveness: e.target.value as 'low' | 'medium' | 'high' }))}
              className="w-full bg-slate-700 text-white rounded px-2 py-2 text-sm border border-slate-600"
            >
              <option value="low">low</option>
              <option value="medium">medium</option>
              <option value="high">high</option>
            </select>
          </div>
        </div>

        {/* TTS audio status */}
        {shot.audioFile && shot.speechSource === 'audio' && (
          <div className="text-xs text-green-400">🎙️ TTS audio ready: {shot.audioFile.name}</div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <button
            onClick={generateTts}
            disabled={generatingTts || !shot.text.trim() || !vocallabStatus?.ok}
            className="px-3 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded text-sm"
          >
            {generatingTts ? 'Generating…' : '🎙️ Generate voice (VocalLab)'}
          </button>
          <button
            onClick={submitAvatar}
            disabled={submitting || !comfyOnline || !shot.photoFile}
            className="px-3 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded text-sm font-medium"
          >
            {submitting ? 'Submitting…' : '🎬 Animate avatar'}
          </button>
        </div>
        <p className="text-xs text-slate-500">
          Workflow: VocalLab generates speech → HeyGen animates the photo with lip-sync → video saved to ComfyUI output.
        </p>
      </div>

      {/* Jobs + results */}
      <div className="space-y-4">
        {/* Active */}
        {activeJobs.length > 0 && (
          <div className="bg-slate-800/60 rounded-lg border border-slate-700 p-3">
            <h3 className="text-sm font-semibold text-white mb-2">Rendering</h3>
            {activeJobs.map(job => (
              <div key={job.id} className="flex items-center gap-2 text-sm">
                <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
                <span className="truncate">{job.photoName} — {Math.floor((Date.now() - (job.startedAt || 0)) / 1000)}s</span>
              </div>
            ))}
          </div>
        )}

        {/* Results */}
        <div className="bg-slate-800/60 rounded-lg border border-slate-700 p-3">
          <h3 className="text-sm font-semibold text-white mb-2">Avatar Videos</h3>
          {doneJobs.length === 0 ? (
            <p className="text-sm text-slate-500">No avatar videos yet.</p>
          ) : (
            <div className="space-y-3">
              {doneJobs.map(job => (
                <div key={job.id} className="bg-slate-900/50 rounded p-2 border border-slate-700">
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-xs px-2 py-0.5 rounded ${job.status === 'done' ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'}`}>
                      {job.status}
                    </span>
                    <span className="text-xs text-slate-500 truncate">{job.photoName}</span>
                  </div>
                  {job.status === 'done' && job.outputs?.videos?.[0] && (
                    <video
                      src={`/api/comfyui/view?filename=${encodeURIComponent(job.outputs.videos[0].filename)}&subfolder=${encodeURIComponent(job.outputs.videos[0].subfolder)}&type=${encodeURIComponent(job.outputs.videos[0].type)}`}
                      controls
                      className="w-full rounded"
                    />
                  )}
                  {job.status === 'failed' && job.message && (
                    <p className="text-xs text-red-400">{job.message}</p>
                  )}
                  <p className="text-xs text-slate-500 mt-1 line-clamp-1">{job.shot.text.slice(0, 80)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
        </div>
        )}
    </div>
  );
}