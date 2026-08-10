'use client';

import { useState, useEffect, useCallback } from 'react';

interface DuixModel {
  videoPath: string;
  referenceAudio: string;
  referenceText: string;
}

interface CloneJob {
  id: string;
  taskCode?: string;
  text: string;
  status: 'cloning' | 'synthesizing' | 'rendering' | 'done' | 'failed';
  message?: string;
  resultPath?: string;
  startedAt: number;
}

export function ClonePanel() {
  const [duixStatus, setDuixStatus] = useState<{ online: boolean; ttsOnline?: boolean; videoOnline?: boolean } | null>(null);
  const [model, setModel] = useState<DuixModel | null>(null);
  const [text, setText] = useState('');
  const [lang, setLang] = useState('en');
  const [cloning, setCloning] = useState(false);
  const [synthesizing, setSynthesizing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [jobs, setJobs] = useState<CloneJob[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/duix/status')
      .then(r => r.json())
      .then(d => setDuixStatus(d))
      .catch(() => setDuixStatus({ online: false }));
    const interval = setInterval(() => {
      fetch('/api/duix/status')
        .then(r => r.json())
        .then(d => setDuixStatus(d))
        .catch(() => {});
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleClone = useCallback(async (file: File) => {
    setError(null);
    setCloning(true);
    try {
      const form = new FormData();
      form.append('video', file);
      form.append('lang', lang);
      const res = await fetch('/api/duix/clone', { method: 'POST', body: form });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || 'clone failed');
      setModel(data.model);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'clone failed');
    } finally {
      setCloning(false);
    }
  }, [lang]);

  const handleSynthesize = useCallback(async () => {
    if (!model || !text.trim()) return;
    setError(null);
    setSynthesizing(true);
    try {
      const res = await fetch('/api/duix/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          referenceAudio: model.referenceAudio,
          referenceText: model.referenceText,
        }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || 'TTS failed');
      await submitVideo(data.audioPath, model.videoPath, text);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'TTS failed');
    } finally {
      setSynthesizing(false);
    }
  }, [model, text]);

  const submitVideo = useCallback(async (audioPath: string, videoPath: string, scriptText: string) => {
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch('/api/duix/video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audioPath, videoPath }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || 'video submit failed');
      const job: CloneJob = {
        id: `clone_${Date.now()}`,
        taskCode: data.taskCode,
        text: scriptText,
        status: 'rendering',
        startedAt: Date.now(),
      };
      setJobs(prev => [job, ...prev]);
      pollJob(job.id, data.taskCode);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'submit failed');
    } finally {
      setSubmitting(false);
    }
  }, []);

  const pollJob = useCallback(async (jobId: string, taskCode: string) => {
    let attempts = 0;
    const doPoll = async () => {
      attempts++;
      if (attempts > 120) {
        setJobs(prev => prev.map(j => (j.id === jobId ? { ...j, status: 'failed', message: 'timed out' } : j)));
        return;
      }
      try {
        const res = await fetch(`/api/duix/video?taskCode=${encodeURIComponent(taskCode)}`);
        const data = await res.json();
        if (!data.ok) {
          setJobs(prev => prev.map(j => (j.id === jobId ? { ...j, status: 'failed', message: data.error } : j)));
          return;
        }
        if (data.status === 'success') {
          setJobs(prev => prev.map(j => (j.id === jobId ? { ...j, status: 'done', resultPath: data.resultPath } : j)));
          return;
        }
        if (data.status === 'failed') {
          setJobs(prev => prev.map(j => (j.id === jobId ? { ...j, status: 'failed', message: data.msg } : j)));
          return;
        }
        setTimeout(doPoll, 5000);
      } catch {
        setTimeout(doPoll, 8000);
      }
    };
    doPoll();
  }, []);

  const online = duixStatus?.online;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-slate-800/60 rounded-lg border border-slate-700 p-4 space-y-4">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <span className="text-purple-400">🧬</span> Duix Avatar Clone
        </h2>
        <p className="text-xs text-slate-400">
          Clone a real person's face and voice from a short video clip, then drive the digital human with text.
          Fully offline via the Duix.Avatar Docker stack.
        </p>

        <div className="flex items-center gap-2 text-xs">
          <span className={`px-2 py-0.5 rounded ${online ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'}`}>
            {online ? '● Duix Online' : '● Duix Offline'}
          </span>
          {duixStatus && (
            <span className="text-slate-500 text-[10px]">
              TTS {duixStatus.ttsOnline ? '✓' : '✗'} · Video {duixStatus.videoOnline ? '✓' : '✗'}
            </span>
          )}
        </div>

        {!online && (
          <div className="text-xs text-amber-400 bg-amber-900/20 border border-amber-700/50 rounded p-2">
            Duix.Avatar Docker stack not detected. Start it with <code className="text-amber-300">docker-compose up -d</code> in the <code className="text-amber-300">/deploy</code> directory.
            Requires D:\duix_avatar_data volume mount.
          </div>
        )}

        <div>
          <label className="block text-xs text-slate-400 mb-1">Training video (15-60s of the person speaking)</label>
          <label className="block cursor-pointer">
            <input
              type="file"
              accept="video/*"
              disabled={!online || cloning}
              onChange={e => {
                const f = e.target.files?.[0];
                if (f) handleClone(f);
                e.target.value = '';
              }}
              className="hidden"
            />
            <div className={`w-full px-3 py-2 rounded text-sm border border-slate-600 text-center ${online && !cloning ? 'bg-slate-700 hover:bg-slate-600 text-slate-300' : 'bg-slate-800 text-slate-600 cursor-not-allowed'}`}>
              {cloning ? 'Cloning…' : model ? '✅ Model cloned — upload another?' : '📹 Upload training video…'}
            </div>
          </label>
        </div>

        <div>
          <label className="block text-xs text-slate-400 mb-1">Language</label>
          <select
            value={lang}
            onChange={e => setLang(e.target.value)}
            className="w-full bg-slate-700 text-white rounded px-2 py-2 text-sm border border-slate-600"
          >
            {['en', 'zh', 'ja', 'ko', 'fr', 'de', 'ar', 'es'].map(l => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>

        {model && (
          <div className="text-xs text-green-400 bg-green-900/20 border border-green-700/50 rounded p-2">
            <div>✅ Voice cloned from reference audio</div>
            <div className="text-slate-400 mt-1 text-[10px]">Reference text: {model.referenceText.slice(0, 80)}…</div>
          </div>
        )}

        <div>
          <label className="block text-xs text-slate-400 mb-1">Script (what the avatar says)</label>
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            rows={3}
            placeholder="Hello, I&apos;m a digital clone. I can speak in 8 languages…"
            className="w-full bg-slate-900 text-slate-100 rounded p-2 border border-slate-600 text-sm"
          />
        </div>

        <button
          onClick={handleSynthesize}
          disabled={!model || !text.trim() || synthesizing || submitting || !online}
          className="w-full px-3 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded text-sm font-medium"
        >
          {synthesizing ? 'Synthesizing voice…' : submitting ? 'Submitting…' : '🎬 Generate clone video'}
        </button>
      </div>

      <div className="space-y-4">
        {jobs.filter(j => j.status === 'rendering').length > 0 && (
          <div className="bg-slate-800/60 rounded-lg border border-slate-700 p-3">
            <h3 className="text-sm font-semibold text-white mb-2">Rendering</h3>
            {jobs.filter(j => j.status === 'rendering').map(job => (
              <div key={job.id} className="flex items-center gap-2 text-sm">
                <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
                <span className="truncate">{job.text.slice(0, 50)} — {Math.floor((Date.now() - job.startedAt) / 1000)}s</span>
              </div>
            ))}
          </div>
        )}
        <div className="bg-slate-800/60 rounded-lg border border-slate-700 p-3">
          <h3 className="text-sm font-semibold text-white mb-2">Clone Videos</h3>
          {jobs.filter(j => j.status === 'done' || j.status === 'failed').length === 0 ? (
            <p className="text-sm text-slate-500">No clone videos yet.</p>
          ) : (
            <div className="space-y-3">
              {jobs.filter(j => j.status === 'done' || j.status === 'failed').map(job => (
                <div key={job.id} className="bg-slate-900/50 rounded p-2 border border-slate-700">
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-xs px-2 py-0.5 rounded ${job.status === 'done' ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'}`}>
                      {job.status}
                    </span>
                  </div>
                  {job.status === 'done' && job.resultPath && (
                    <video
                      src={`file:///D:/duix_avatar_data/face2face/temp/${job.resultPath}`}
                      controls
                      className="w-full rounded"
                    />
                  )}
                  {job.status === 'failed' && job.message && (
                    <p className="text-xs text-red-400">{job.message}</p>
                  )}
                  <p className="text-xs text-slate-500 mt-1 line-clamp-1">{job.text.slice(0, 80)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}