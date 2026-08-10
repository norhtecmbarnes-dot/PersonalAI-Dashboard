'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import {
  MiniMaxH3Shot,
  UploadedImage,
  defaultShot,
  buildMiniMaxH3Graph,
  applyTurboPreset,
  setRenderMode,
  getRenderMode,
  RESOLUTION_PRESETS,
  LENGTH_PRESETS,
  SAMPLERS,
  SCHEDULERS,
  TURBO_PRESETS,
  RenderMode,
} from '@/lib/comfyui/minimax-graph';
import { useGlobalModel } from '@/lib/context/ModelContext';
import { MarkdownRenderer } from '@/components/MarkdownRenderer';
import { AvatarPanel } from '@/components/minimax-h3/AvatarPanel';
import { CharacterRefSlots } from '@/components/minimax-h3/CharacterRefSlots';

interface RenderJob {
  id: string;
  promptId?: string;
  shot: MiniMaxH3Shot;
  shotIndex?: number;
  totalShots?: number;
  status: 'queued' | 'running' | 'done' | 'failed' | 'cancelled';
  startedAt?: number;
  finishedAt?: number;
  message?: string;
  outputs?: {
    videos: Array<{ filename: string; subfolder: string; type: string; format: string }>;
    images: Array<{ filename: string; subfolder: string; type: string }>;
    audios: Array<{ filename: string; subfolder: string; type: string }>;
  };
  lastFrameImage?: { filename: string; subfolder: string; type: string };
}

interface ComfyStatus {
  online: boolean;
  vramFree?: number;
  vramTotal?: number;
  queueRunning: number;
  queuePending: number;
}

type Action = 'WRITE_SCRIPT' | 'CREATE_SHOT' | 'LOAD_IMAGE' | 'LOAD_REFS' | 'RENDER' | 'AVATAR' | null;

interface AuteurShotData {
  prompt: string;
  negativePrompt?: string;
  soundDesign?: string;
  dialogue?: string;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  action?: Action;
  shotPrompt?: string;
  negativePrompt?: string;
  shots?: AuteurShotData[];
  sceneHeading?: string;
  narrativeContext?: string;
  pending?: boolean;
  attachedImage?: { name: string; preview: string };
}

const STORAGE_KEY = 'minimax_h3_director_jobs_v1';

export default function MiniMaxH3DirectorPage() {
  const { selectedModel, ollamaHealthy, initialized } = useGlobalModel();
  const [activeTab, setActiveTab] = useState<'director' | 'avatar'>('director');
  const [shot, setShot] = useState<MiniMaxH3Shot>(defaultShot);
  const [jobs, setJobs] = useState<RenderJob[]>([]);
  const [status, setStatus] = useState<ComfyStatus>({
    online: false,
    queueRunning: 0,
    queuePending: 0,
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const pollRef = useRef<Map<string, number>>(new Map());

  // Chat state (mirrors home page prototype)
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [attachedImage, setAttachedImage] = useState<{
    file: File;
    name: string;
    preview: string;
  } | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load saved jobs
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed: RenderJob[] = JSON.parse(saved);
        setJobs(parsed.filter(j => j.status !== 'queued' && j.status !== 'running'));
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const persistJobs = useCallback((next: RenderJob[]) => {
    try {
      const toSave = next
        .filter(j => j.status === 'done' || j.status === 'failed' || j.status === 'cancelled')
        .slice(0, 50);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
    } catch {
      // ignore
    }
  }, []);

  // Poll ComfyUI status
  useEffect(() => {
    let cancelled = false;
    const poll = async () => {
      try {
        const res = await fetch('/api/comfyui/status?part=all');
        const data = await res.json();
        if (cancelled) return;
        if (data.ok) {
          const dev = data.system?.devices?.[0] || data.system?.system?.devices?.[0];
          setStatus({
            online: true,
            vramFree: dev?.vram_free,
            vramTotal: dev?.vram_total,
            queueRunning: data.queue?.queue_running?.length || 0,
            queuePending: data.queue?.queue_pending?.length || 0,
          });
        } else {
          setStatus({ online: false, queueRunning: 0, queuePending: 0 });
        }
      } catch {
        if (!cancelled) setStatus({ online: false, queueRunning: 0, queuePending: 0 });
      }
    };
    poll();
    const t = setInterval(poll, 5000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, []);

  // ----- Render job helpers (unchanged) -----
  const pollJob = useCallback(async (jobId: string, promptId: string) => {
    const attempt = (pollRef.current.get(jobId) || 0) + 1;
    pollRef.current.set(jobId, attempt);
    if (attempt > 240) {
      setJobs(prev =>
        prev.map(j => (j.id === jobId ? { ...j, status: 'failed', message: 'Polling timed out' } : j))
      );
      pollRef.current.delete(jobId);
      return;
    }
    try {
      const res = await fetch(`/api/comfyui/queue?prompt_id=${encodeURIComponent(promptId)}`);
      const data = await res.json();
      if (!data.ok) {
        setJobs(prev => prev.map(j => (j.id === jobId ? { ...j, status: 'failed', message: data.error } : j)));
        pollRef.current.delete(jobId);
        return;
      }
      if (data.failed) {
        setJobs(prev =>
          prev.map(j => (j.id === jobId ? { ...j, status: 'failed', message: data.status, finishedAt: Date.now() } : j))
        );
        pollRef.current.delete(jobId);
        return;
      }
      if (data.done) {
        const lastFrame = data.outputs?.images?.find((img: { filename: string }) =>
          img.filename.startsWith('minimax_h3_chain_frame')
        );
        setJobs(prev =>
          prev.map(j =>
            j.id === jobId
              ? { ...j, status: 'done', outputs: data.outputs, lastFrameImage: lastFrame, finishedAt: Date.now() }
              : j
          )
        );
        pollRef.current.delete(jobId);
        return;
      }
      setTimeout(() => pollJob(jobId, promptId), 3000);
    } catch {
      setTimeout(() => pollJob(jobId, promptId), 5000);
    }
  }, []);

  const submitShot = useCallback(
    async (overrideShot?: MiniMaxH3Shot) => {
      const useShot = overrideShot || shot;
      if (!useShot.prompt.trim()) {
        setError('Prompt is required');
        return;
      }
      setError(null);
      setSubmitting(true);
      try {
        const graph = buildMiniMaxH3Graph(useShot);
        const res = await fetch('/api/comfyui/queue', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: graph }),
        });
        const data = await res.json();
        if (!data.ok) throw new Error(data.error || 'submit failed');
        const job: RenderJob = {
          id: `job_${Date.now()}`,
          promptId: data.prompt_id,
          shot: { ...useShot },
          status: 'running',
          startedAt: Date.now(),
        };
        setJobs(prev => {
          const next = [job, ...prev];
          persistJobs(next);
          return next;
        });
        pollJob(job.id, data.prompt_id);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'submit failed');
      } finally {
        setSubmitting(false);
      }
    },
    [shot, persistJobs, pollJob]
  );

  /**
   * Render a sequence of shots chained together: each shot's generated last frame
   * becomes the next shot's first frame, producing seamless long-form video.
   */
  const renderChainedShots = useCallback(
    async (shotsData: AuteurShotData[], baseShot: MiniMaxH3Shot) => {
      if (shotsData.length === 0) return;
      setError(null);
      setSubmitting(true);
      const chainId = `chain_${Date.now()}`;
      let prevLastFrame: UploadedImage | undefined;

      for (let i = 0; i < shotsData.length; i++) {
        const sd = shotsData[i];
        const shotConfig: MiniMaxH3Shot = {
          ...baseShot,
          prompt: sd.prompt,
          negativePrompt: sd.negativePrompt || baseShot.negativePrompt,
          firstFrameFile: prevLastFrame,
          seed: Math.floor(Math.random() * 2_147_483_647),
          id: `${chainId}_shot${i + 1}`,
        };

        try {
          const graph = buildMiniMaxH3Graph(shotConfig);
          const res = await fetch('/api/comfyui/queue', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: graph }),
          });
          const data = await res.json();
          if (!data.ok) throw new Error(data.error || 'submit failed');

          const job: RenderJob = {
            id: `${chainId}_job${i + 1}`,
            promptId: data.prompt_id,
            shot: { ...shotConfig },
            shotIndex: i,
            totalShots: shotsData.length,
            status: 'running',
            startedAt: Date.now(),
          };
          setJobs(prev => [job, ...prev]);

          // Poll until done, then extract the last frame for the next shot.
          await new Promise<void>((resolve, reject) => {
            const doPoll = async (attempt: number) => {
              if (attempt > 240) {
                reject(new Error('Polling timed out'));
                return;
              }
              try {
                const pollRes = await fetch(`/api/comfyui/queue?prompt_id=${encodeURIComponent(data.prompt_id)}`);
                const pollData = await pollRes.json();
                if (!pollData.ok) {
                  reject(new Error(pollData.error));
                  return;
                }
                if (pollData.failed) {
                  reject(new Error(pollData.status || 'render failed'));
                  return;
                }
                if (pollData.done) {
                  const lastFrame = pollData.outputs?.images?.find(
                    (img: { filename: string }) => img.filename.startsWith('minimax_h3_chain_frame')
                  );
                  setJobs(prev =>
                    prev.map(j =>
                      j.id === job.id
                        ? { ...j, status: 'done', outputs: pollData.outputs, lastFrameImage: lastFrame, finishedAt: Date.now() }
                        : j
                    )
                  );
                  if (lastFrame) {
                    prevLastFrame = { name: lastFrame.filename, subfolder: lastFrame.subfolder, type: lastFrame.type };
                  }
                  resolve();
                  return;
                }
                setTimeout(() => doPoll(attempt + 1), 3000);
              } catch (e) {
                setTimeout(() => doPoll(attempt + 1), 5000);
              }
            };
            doPoll(1);
          });
        } catch (e) {
          setJobs(prev =>
            prev.map(j =>
              j.id === `${chainId}_job${i + 1}` ? { ...j, status: 'failed', message: e instanceof Error ? e.message : 'failed' } : j
            )
          );
          setError(`Chain stopped at shot ${i + 1}: ${e instanceof Error ? e.message : 'failed'}`);
          break;
        }
      }
      setSubmitting(false);
    },
    []
  );

  const cancelJob = async (jobId: string, promptId?: string) => {
    if (!promptId) return;
    try {
      await fetch(`/api/comfyui/queue?action=cancel&prompt_id=${encodeURIComponent(promptId)}`);
      pollRef.current.delete(jobId);
      setJobs(prev => prev.map(j => (j.id === jobId ? { ...j, status: 'cancelled', finishedAt: Date.now() } : j)));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'cancel failed');
    }
  };

  const removeJob = (jobId: string) => {
    setJobs(prev => {
      const next = prev.filter(j => j.id !== jobId);
      persistJobs(next);
      return next;
    });
  };

  const rerollSeed = () => setShot(s => ({ ...s, seed: Math.floor(Math.random() * 2_147_483_647) }));

  // ----- Image upload (LOAD_IMAGE) -----
  const handleImageUpload = useCallback(async (file: File) => {
    setError(null);
    try {
      const form = new FormData();
      form.append('image', file);
      const res = await fetch('/api/comfyui/upload', { method: 'POST', body: form });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || 'upload failed');
      const img = data.image;
      setShot(s => ({ ...s, firstFrameFile: { name: img.name, subfolder: img.subfolder, type: img.type } }));
      const preview = URL.createObjectURL(file);
      setAttachedImage({ file, name: file.name, preview });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'upload failed');
    }
  }, []);

  // ----- Chat (Auteur) -----
  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if ((!text && !attachedImage) || streaming || !selectedModel) return;

    const userMsg: ChatMessage = {
      role: 'user',
      content: attachedImage ? `[Attached image: ${attachedImage.name}]\n\n${text}` : text,
      attachedImage: attachedImage ? { name: attachedImage.name, preview: attachedImage.preview } : undefined,
    };
    setMessages(prev => [...prev, userMsg]);
    const currentInput = input;
    const currentImage = attachedImage;
    setInput('');
    setAttachedImage(null);
    setStreaming(true);

    const history = messages
      .filter(m => !m.pending && m.content)
      .map(m => ({ role: m.role, content: m.content }));

    // If an image is attached, instruct the Auteur that we loaded a reference frame.
    let effectiveInput = currentInput;
    if (currentImage) {
      effectiveInput = `I have loaded a reference image "${currentImage.name}" as the first frame of the shot. ${currentInput}`.trim();
    }

    try {
      const res = await fetch('/api/director/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: effectiveInput, model: selectedModel, history }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const reader = res.body?.getReader();
      if (!reader) throw new Error('no stream');
      const decoder = new TextDecoder();
      let full = '';
      let parsedShot: AuteurShotData | null = null;
      let parsedShots: AuteurShotData[] | null = null;
      let action: Action = null;
      let sceneHeading = '';
      let narrativeContext = '';

      setMessages(prev => [...prev, { role: 'assistant', content: '', pending: true }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split('\n\n')) {
          if (!line.startsWith('data: ')) continue;
          try {
            const json = JSON.parse(line.slice(6));
            if (json.chunk) {
              full += json.chunk;
              setMessages(prev => {
                const next = [...prev];
                next[next.length - 1] = { ...next[next.length - 1], content: full, pending: false };
                return next;
              });
            }
            if (json.error) throw new Error(json.error);
            if (json.done) {
              if (json.shot) parsedShot = json.shot;
              if (json.shots) parsedShots = json.shots;
              if (json.action) action = json.action;
              if (json.sceneHeading) sceneHeading = json.sceneHeading;
              if (json.narrativeContext) narrativeContext = json.narrativeContext;
            }
          } catch {
            // skip malformed
          }
        }
      }

      setMessages(prev => {
        const next = [...prev];
        next[next.length - 1] = {
          ...next[next.length - 1],
          content: full,
          pending: false,
          action: action || undefined,
          shotPrompt: parsedShot?.prompt || undefined,
          negativePrompt: parsedShot?.negativePrompt || undefined,
          shots: parsedShots || undefined,
          sceneHeading: sceneHeading || undefined,
          narrativeContext: narrativeContext || undefined,
        };
        return next;
      });

      // If the Auteur emitted a CREATE_SHOT action with a prompt, auto-load it into the shot config.
      if (action === 'CREATE_SHOT' && parsedShot?.prompt) {
        setShot(s => ({
          ...s,
          prompt: parsedShot.prompt!,
          negativePrompt: parsedShot.negativePrompt || s.negativePrompt,
        }));
      }
      // If the Auteur emitted RENDER, fire the render immediately using the current shot config.
      if (action === 'RENDER') {
        submitShot({ ...shot, prompt: parsedShot?.prompt || shot.prompt });
      }
      // If the Auteur suggests an avatar, switch to the Avatar Studio tab.
      if (action === 'AVATAR') {
        setActiveTab('avatar');
      }
    } catch (e) {
      setMessages(prev => {
        const next = [...prev];
        next[next.length - 1] = {
          ...next[next.length - 1],
          content: `⚠️ ${e instanceof Error ? e.message : 'Auteur failed'}`,
          pending: false,
        };
        return next;
      });
    } finally {
      setStreaming(false);
    }
  }, [input, attachedImage, streaming, selectedModel, messages, shot, submitShot]);

  // ----- Derived -----
  const fmtBytes = (b?: number) => {
    if (b === undefined) return '--';
    if (b >= 1 << 30) return `${(b / (1 << 30)).toFixed(1)} GB`;
    if (b >= 1 << 20) return `${(b / (1 << 20)).toFixed(0)} MB`;
    return `${b} B`;
  };

  const activeJobs = jobs.filter(j => j.status === 'running' || j.status === 'queued');
  const doneJobs = jobs.filter(j => j.status === 'done' || j.status === 'failed' || j.status === 'cancelled');
  const canChat = !!selectedModel && ollamaHealthy && initialized;
  const loadShotFromMessage = (msg: ChatMessage) => {
    if (msg.shotPrompt) {
      setShot(s => ({ ...s, prompt: msg.shotPrompt!, negativePrompt: msg.negativePrompt || s.negativePrompt }));
    }
  };

  const startNewChat = () => {
    setMessages([]);
    setInput('');
    setAttachedImage(null);
    inputRef.current?.focus();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex">
      {/* Sidebar (mirrors home prototype) */}
      <div
        className={`${sidebarOpen ? 'w-72' : 'w-16'} bg-slate-900/80 backdrop-blur border-r border-slate-700 flex flex-col transition-all duration-300`}
      >
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-3 hover:bg-slate-800 text-gray-400 hover:text-white transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        {sidebarOpen && (
          <>
            <div className="px-3 py-2">
              <button
                onClick={startNewChat}
                className="w-full flex items-center gap-2 px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span>New Direction</span>
              </button>
            </div>

            {/* Quick actions */}
            <div className="px-3 py-2 border-t border-slate-700 space-y-1">
              <p className="text-xs text-gray-500 px-1 mb-1">Director Actions</p>
              <QuickAction
                label="Write script"
                hint="Ask the Auteur to write a scene"
                onClick={() => {
                  setInput('Write me a short script for a 5-second scene. ');
                  inputRef.current?.focus();
                }}
              />
              <QuickAction
                label="Create shot"
                hint="Generate a MiniMax H3 video prompt"
                onClick={() => {
                  setInput('Design a shot: ');
                  inputRef.current?.focus();
                }}
              />
              <label className="block">
                <span className="sr-only">Load image</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={e => {
                    const f = e.target.files?.[0];
                    if (f) handleImageUpload(f);
                    e.target.value = '';
                  }}
                  className="hidden"
                  disabled={!status.online}
                />
                <div
                  className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded cursor-pointer ${
                    status.online ? 'text-gray-400 hover:text-white hover:bg-slate-800' : 'text-gray-600 cursor-not-allowed'
                  }`}
                >
                  <span>🖼️</span>
                  <span>Load image (first frame)</span>
                </div>
              </label>
              <QuickAction
                label={`Render (${getRenderMode(shot) === 'prototype' ? '⚡ 4-step' : '🎬 30-step'})`}
                hint="Queue the current shot to ComfyUI"
                onClick={() => submitShot()}
                disabled={!status.online || !shot.prompt.trim() || submitting}
              />
            </div>

            {/* Current shot summary */}
            <div className="px-3 py-2 border-t border-slate-700">
              <p className="text-xs text-gray-500 px-1 mb-1">Current Shot</p>
              <div className="text-xs text-gray-400 space-y-0.5">
                <div className="truncate">
                  <span className="text-gray-500">Prompt:</span>{' '}
                  {shot.prompt.slice(0, 40) || '(empty)'}
                </div>
                <div>
                  {shot.width}×{shot.height} · {shot.length}f · seed {shot.seed}
                </div>
                <div>
                  <span className={getRenderMode(shot) === 'prototype' ? 'text-orange-400' : 'text-purple-400'}>
                    {getRenderMode(shot) === 'prototype' ? '⚡ Prototype' : '🎬 Final'}
                  </span>
                  {' · '}
                  {shot.steps} steps{shot.loraName ? ' + LoRA' : ''}
                </div>
                {shot.firstFrameFile && (
                  <div className="text-green-400">📎 {shot.firstFrameFile.name}</div>
                )}
              </div>
            </div>

            {/* Render queue */}
            <div className="flex-1 overflow-y-auto px-3 py-2">
              <p className="text-xs text-gray-500 px-1 mb-2">Render Queue</p>
              {activeJobs.length === 0 && (
                <p className="text-xs text-gray-600 text-center py-2">No active renders</p>
              )}
              {activeJobs.map(job => (
                <div key={job.id} className="bg-slate-900/50 rounded p-2 border border-slate-700 mb-1">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
                    <span className="truncate flex-1">{job.shot.prompt.slice(0, 50) || '(no prompt)'}</span>
                    <button
                      onClick={() => cancelJob(job.id, job.promptId)}
                      className="text-red-400 hover:text-red-300"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    {job.shot.width}×{job.shot.height} · {job.shot.length}f
                    {job.startedAt && ` · ${Math.floor((Date.now() - job.startedAt) / 1000)}s`}
                  </div>
                  {job.totalShots && (
                    <div className="text-xs text-purple-400 mt-0.5">
                      🔗 Chain {job.shotIndex! + 1}/{job.totalShots}
                    </div>
                  )}
                  {job.shot.firstFrameFile && (
                    <div className="text-xs text-green-500 mt-0.5">📎 from prev last frame</div>
                  )}
                </div>
              ))}
            </div>

            {/* Stats */}
            <div className="px-3 py-2 border-t border-slate-700 text-xs text-gray-500 space-y-1">
              <div className="flex justify-between">
                <span>Renders done:</span>
                <span className="text-gray-400">{doneJobs.length}</span>
              </div>
              <div className="flex justify-between">
                <span>ComfyUI:</span>
                <span className={status.online ? 'text-green-400' : 'text-red-400'}>
                  {status.online ? 'online' : 'offline'}
                </span>
              </div>
              {status.online && (
                <div className="flex justify-between">
                  <span>VRAM:</span>
                  <span className="text-gray-400">{fmtBytes(status.vramFree)}</span>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Main chat (mirrors home prototype layout) */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Header */}
        <div className="bg-slate-800/50 backdrop-blur border-b border-slate-700 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-white flex items-center gap-2">
                <span className="text-purple-400">🎬</span> MiniMax H3 Director
              </h1>
              <span
                className={`text-xs px-2 py-1 rounded ${status.online ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'}`}
              >
                {status.online ? '● ComfyUI Online' : '● Offline'}
              </span>
              {status.online && (
                <span className="text-xs text-slate-400">
                  Queue: {status.queueRunning} running / {status.queuePending} pending
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs">
              {/* Prototype / Final mode switcher */}
              <div className="flex items-center bg-slate-700 rounded overflow-hidden border border-slate-600">
                <button
                  onClick={() => setShot(prev => setRenderMode(prev, 'prototype'))}
                  className={`px-2 py-1 font-medium ${
                    getRenderMode(shot) === 'prototype'
                      ? 'bg-orange-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="4-step LoRA — fast iteration, lower quality (~7x faster)"
                >
                  ⚡ Prototype
                </button>
                <button
                  onClick={() => setShot(prev => setRenderMode(prev, 'final'))}
                  className={`px-2 py-1 font-medium ${
                    getRenderMode(shot) === 'final'
                      ? 'bg-purple-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="Full 30-step — final quality render"
                >
                  🎬 Final
                </button>
              </div>
              <button
                onClick={() => setShot(s => ({ ...s, refsEnabled: !s.refsEnabled }))}
                className={`px-2 py-1 rounded text-xs font-medium border ${
                  shot.refsEnabled
                    ? 'bg-green-800 text-green-200 border-green-600'
                    : 'bg-slate-700 text-slate-400 border-slate-600 hover:text-white'
                }`}
                title={shot.refsEnabled ? 'Character refs ON — prompt can use <Picture 1..3>' : 'Character refs OFF — standard text-to-video'}
              >
                🎭 Refs {shot.refsEnabled ? 'ON' : 'OFF'}
                {(shot.refImages ?? []).filter(r => r && r.name).length > 0 && shot.refsEnabled && (
                  <span className="ml-1 text-green-300">
                    ({(shot.refImages ?? []).filter(r => r && r.name).length})
                  </span>
                )}
              </button>
              <button
                onClick={rerollSeed}
                className="px-2 py-1 bg-slate-700 hover:bg-slate-600 rounded text-slate-300"
                title="Randomize seed"
              >
                🎲 seed: {shot.seed}
              </button>
              <button
                onClick={() => setShot(s => ({ ...s, width: s.width, height: s.height }))}
                className="px-2 py-1 bg-slate-700 hover:bg-slate-600 rounded text-slate-300"
                title="Toggle shot config"
                onClickCapture={() => {
                  const el = document.getElementById('shot-config');
                  el?.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                ⚙ Shot config
              </button>
            </div>
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex border-b border-slate-700 bg-slate-800/30">
          <button
            onClick={() => setActiveTab('director')}
            className={`px-4 py-2 text-sm font-medium border-b-2 ${
              activeTab === 'director'
                ? 'border-purple-500 text-white'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            🎬 MiniMax H3 Director
          </button>
          <button
            onClick={() => setActiveTab('avatar')}
            className={`px-4 py-2 text-sm font-medium border-b-2 ${
              activeTab === 'avatar'
                ? 'border-purple-500 text-white'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            🧑‍💼 Avatar Studio
          </button>
        </div>

        {activeTab === 'avatar' ? (
          <div className="flex-1 overflow-y-auto p-4">
            <AvatarPanel comfyOnline={status.online} />
          </div>
        ) : (
        <>
        {error && (
          <div className="mx-4 mt-3 p-3 bg-red-900/40 border border-red-700 rounded text-red-200 text-sm">
            {error}
            <button onClick={() => setError(null)} className="float-right text-red-300 hover:text-white">
              ✕
            </button>
          </div>
        )}

        {/* Chat container */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="max-w-4xl mx-auto">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-12">
                <div className="text-6xl mb-4">🎭</div>
                <h2 className="text-2xl font-bold text-white mb-2">The Auteur is ready</h2>
                <p className="text-gray-400 mb-6 max-w-md">
                  Tell the Auteur what you want to make. Describe a shot, a scene, or a beat —
                  in plain language. The Auteur will write the script, design the MiniMax H3 prompt,
                  and queue the render to ComfyUI.
                </p>
                <div className="bg-slate-800/50 rounded-lg p-4 max-w-md text-left text-sm text-slate-300 space-y-2">
                  <p>
                    <strong className="text-white">Try:</strong> &ldquo;Write me a moody 5-second shot
                    of a lone astronaut on a red planet at dusk.&rdquo;
                  </p>
                  <p>
                    <strong className="text-white">Or:</strong> &ldquo;Generate a cyberpunk car chase
                    and render it.&rdquo;
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((msg, idx) => (
                  <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[85%] rounded-lg p-4 ${
                        msg.role === 'user' ? 'bg-purple-600 text-white' : 'bg-slate-800 text-gray-200'
                      }`}
                    >
                      {msg.attachedImage && (
                        <img
                          src={msg.attachedImage.preview}
                          alt={msg.attachedImage.name}
                          className="w-32 h-20 object-cover rounded mb-2"
                        />
                      )}
                      {msg.role === 'user' ? (
                        <div className="whitespace-pre-wrap text-sm">{msg.content}</div>
                      ) : (
                        <div className="text-sm">
                          {msg.action && (
                            <div className="inline-block text-xs px-2 py-0.5 rounded bg-purple-900/60 text-purple-300 mb-2">
                              {actionLabel(msg.action)}
                            </div>
                          )}
                          <MarkdownRenderer content={msg.content} />
                          {/* Multi-shot script: render per-shot action buttons */}
                          {msg.shots && msg.shots.length > 0 && (
                            <div className="mt-3 pt-2 border-t border-slate-700 space-y-2">
                              {msg.shots.length > 1 && (
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => renderChainedShots(msg.shots!, setRenderMode({ ...shot }, 'prototype'))}
                                    disabled={!status.online || submitting}
                                    className="flex-1 px-3 py-2 text-xs bg-orange-700 hover:bg-orange-600 disabled:opacity-50 text-white rounded font-medium"
                                    title="Render all shots in 4-step prototype mode — fast preview of the whole chain"
                                  >
                                    ⚡ Prototype all ({msg.shots.length} shots, chained)
                                  </button>
                                  <button
                                    onClick={() => renderChainedShots(msg.shots!, setRenderMode({ ...shot }, 'final'))}
                                    disabled={!status.online || submitting}
                                    className="flex-1 px-3 py-2 text-xs bg-purple-700 hover:bg-purple-600 disabled:opacity-50 text-white rounded font-medium"
                                    title="Render all shots in full 30-step quality — the final cut"
                                  >
                                    🎬 Final all ({msg.shots.length} shots, chained)
                                  </button>
                                </div>
                              )}
                              {msg.shots.map((s, i) => (
                                <div key={i} className="flex items-center justify-between gap-2 bg-slate-900/40 rounded px-2 py-1.5">
                                  <span className="text-xs text-slate-400 truncate flex-1">
                                    Shot {i + 1}: {s.prompt.slice(0, 70)}…
                                  </span>
                                  <div className="flex gap-1 flex-shrink-0">
                                    <button
                                      onClick={() =>
                                        setShot(prev => ({
                                          ...prev,
                                          prompt: s.prompt,
                                          negativePrompt: s.negativePrompt || prev.negativePrompt,
                                        }))
                                      }
                                      className="px-2 py-1 text-xs bg-green-700 hover:bg-green-600 text-white rounded"
                                    >
                                      ⬇ Load
                                    </button>
                                    <button
                                      onClick={() =>
                                        submitShot({
                                          ...shot,
                                          prompt: s.prompt,
                                          negativePrompt: s.negativePrompt || shot.negativePrompt,
                                        })
                                      }
                                      disabled={!status.online || submitting}
                                      className="px-2 py-1 text-xs bg-purple-700 hover:bg-purple-600 disabled:opacity-50 text-white rounded"
                                    >
                                      🎬 Render
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                          {/* Single-shot fallback */}
                          {!msg.shots && msg.shotPrompt && (
                            <div className="mt-3 pt-2 border-t border-slate-700 flex flex-wrap gap-2">
                              <button
                                onClick={() => loadShotFromMessage(msg)}
                                className="px-2 py-1 text-xs bg-green-700 hover:bg-green-600 text-white rounded"
                              >
                                ⬇ Load into shot
                              </button>
                              <button
                                onClick={() => {
                                  loadShotFromMessage(msg);
                                  submitShot({
                                    ...shot,
                                    prompt: msg.shotPrompt!,
                                    negativePrompt: msg.negativePrompt || shot.negativePrompt,
                                  });
                                }}
                                disabled={!status.online || submitting}
                                className="px-2 py-1 text-xs bg-purple-700 hover:bg-purple-600 disabled:opacity-50 text-white rounded"
                              >
                                🎬 Load & Render
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>
        </div>

        {/* Input area (mirrors home prototype) */}
        <div className="bg-slate-800/50 backdrop-blur border-t border-slate-700 p-4">
          <div className="max-w-4xl mx-auto">
            {attachedImage && (
              <div className="mb-2 flex items-center gap-2 px-2 py-1 bg-slate-700/50 rounded">
                <img src={attachedImage.preview} alt="" className="w-8 h-8 object-cover rounded" />
                <span className="text-xs text-slate-300">📎 {attachedImage.name}</span>
                <button onClick={() => setAttachedImage(null)} className="text-slate-400 hover:text-white text-xs">
                  ✕
                </button>
              </div>
            )}
            <div className="relative">
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                placeholder={
                  canChat
                    ? 'Tell the Auteur what to make…  (e.g. "write a script", "design a shot", "render it")'
                    : 'Select a model in the top bar first'
                }
                className="w-full bg-slate-700 text-white border-0 rounded-lg px-4 py-3 pr-40 resize-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
                rows={3}
                disabled={streaming || !canChat}
              />
              <div className="absolute bottom-2 right-2 flex items-center gap-1">
                <label
                  className={`p-2 rounded-lg cursor-pointer ${status.online ? 'bg-slate-600 text-gray-400 hover:text-white' : 'bg-slate-700 text-gray-600 cursor-not-allowed'}`}
                  title="Load reference image"
                >
                  <input
                    type="file"
                    accept="image/*"
                    onChange={e => {
                      const f = e.target.files?.[0];
                      if (f) handleImageUpload(f);
                      e.target.value = '';
                    }}
                    className="hidden"
                    disabled={!status.online}
                  />
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                </label>
                <button
                  onClick={sendMessage}
                  disabled={streaming || !canChat || (!input.trim() && !attachedImage)}
                  className="p-2 rounded-lg bg-purple-600 text-white hover:bg-purple-500 disabled:opacity-50"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                    />
                  </svg>
                </button>
              </div>
            </div>
            {streaming && (
              <div className="flex items-center gap-2 mt-2 text-gray-400 text-sm">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                  <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" style={{ animationDelay: '200ms' }} />
                  <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" style={{ animationDelay: '400ms' }} />
                </div>
                <span>The Auteur is directing…</span>
              </div>
            )}
            {!ollamaHealthy && (
              <p className="text-xs text-amber-400 mt-2">
                Ollama is offline. Start it (or <Link href="/settings" className="underline">configure a cloud model</Link>) to chat with the Auteur.
              </p>
            )}
          </div>
        </div>
        </>
        )}
      </div>

      {/* Shot config drawer (collapsible, slides in from right) */}
      <ShotConfigDrawer
        shot={shot}
        setShot={setShot}
        status={status}
        submitting={submitting}
        submitShot={submitShot}
        rerollSeed={rerollSeed}
      />

      {/* Rushes gallery */}
      {doneJobs.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-slate-900/95 border-t border-slate-700 p-3 max-h-40 overflow-y-auto z-20">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-white">Rushes</h3>
              <span className="text-xs text-slate-500">{doneJobs.length} completed</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
              {doneJobs.slice(0, 12).map(job => (
                <div key={job.id} className="relative group bg-slate-800 rounded overflow-hidden">
                  {job.status === 'done' && job.outputs?.videos?.[0] ? (
                    <video
                      src={`/api/comfyui/view?filename=${encodeURIComponent(job.outputs.videos[0].filename)}&subfolder=${encodeURIComponent(job.outputs.videos[0].subfolder)}&type=${encodeURIComponent(job.outputs.videos[0].type)}`}
                      controls
                      className="w-full h-20 object-cover"
                    />
                  ) : (
                    <div className="w-full h-20 flex items-center justify-center text-xs text-slate-500">
                      {job.status}
                    </div>
                  )}
                  <button
                    onClick={() => removeJob(job.id)}
                    className="absolute top-1 right-1 text-xs text-red-400 opacity-0 group-hover:opacity-100"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function actionLabel(action: NonNullable<Action>): string {
  switch (action) {
    case 'WRITE_SCRIPT':
      return '✍ Script';
    case 'CREATE_SHOT':
      return '🎬 Shot';
    case 'LOAD_IMAGE':
      return '🖼 Image';
    case 'LOAD_REFS':
      return '🎭 Refs';
    case 'RENDER':
      return '▶ Render';
    case 'AVATAR':
      return '🧑‍💼 Avatar';
  }
}

function QuickAction({
  label,
  hint,
  onClick,
  disabled,
}: {
  label: string;
  hint?: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={hint}
      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-400 hover:text-white hover:bg-slate-800 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-left"
    >
      <span>{label}</span>
    </button>
  );
}

function ShotConfigDrawer({
  shot,
  setShot,
  status,
  submitting,
  submitShot,
  rerollSeed,
}: {
  shot: MiniMaxH3Shot;
  setShot: (fn: (s: MiniMaxH3Shot) => MiniMaxH3Shot) => void;
  status: ComfyStatus;
  submitting: boolean;
  submitShot: (override?: MiniMaxH3Shot) => Promise<void>;
  rerollSeed: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        className="fixed top-12 right-2 z-30 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-xs rounded border border-slate-600"
      >
        ⚙ Shot config
      </button>
      {open && (
        <div className="fixed top-20 right-2 z-30 w-80 max-h-[80vh] overflow-y-auto bg-slate-800 rounded-lg border border-slate-700 p-3 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">Shot Config</h3>
            <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-white">
              ✕
            </button>
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Prompt</label>
            <textarea
              value={shot.prompt}
              onChange={e => setShot(s => ({ ...s, prompt: e.target.value }))}
              rows={3}
              className="w-full bg-slate-900 text-slate-100 rounded p-2 border border-slate-600 text-xs"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Negative</label>
            <textarea
              value={shot.negativePrompt}
              onChange={e => setShot(s => ({ ...s, negativePrompt: e.target.value }))}
              rows={2}
              className="w-full bg-slate-900 text-slate-100 rounded p-2 border border-slate-600 text-xs"
            />
          </div>
          <CharacterRefSlots
            refs={shot.refImages ?? []}
            enabled={!!shot.refsEnabled}
            refImageSize={shot.refImageSize ?? 'match'}
            onToggleEnabled={enabled => setShot(s => ({ ...s, refsEnabled: enabled }))}
            onSetRefs={refs => setShot(s => ({ ...s, refImages: refs }))}
            onSetRefImageSize={size => setShot(s => ({ ...s, refImageSize: size }))}
            comfyOnline={status.online}
          />
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Resolution</label>
              <select
                value={`${shot.width}x${shot.height}`}
                onChange={e => {
                  const p = RESOLUTION_PRESETS.find(p => `${p.width}x${p.height}` === e.target.value);
                  if (p) setShot(s => ({ ...s, width: p.width, height: p.height }));
                }}
                className="w-full bg-slate-700 text-white rounded px-2 py-1 text-xs border border-slate-600"
              >
                {RESOLUTION_PRESETS.map(p => (
                  <option key={p.label} value={`${p.width}x${p.height}`}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Duration</label>
              <select
                value={shot.length}
                onChange={e => setShot(s => ({ ...s, length: parseInt(e.target.value) }))}
                className="w-full bg-slate-700 text-white rounded px-2 py-1 text-xs border border-slate-600"
              >
                {LENGTH_PRESETS.map(p => (
                  <option key={p.label} value={p.length}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Steps</label>
              <input
                type="number"
                value={shot.steps}
                min={1}
                max={100}
                onChange={e => setShot(s => ({ ...s, steps: parseFloat(e.target.value) || 0 }))}
                className="w-full bg-slate-700 text-white rounded px-2 py-1 text-xs border border-slate-600"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">CFG</label>
              <input
                type="number"
                value={shot.cfg}
                min={0}
                max={20}
                step={0.1}
                onChange={e => setShot(s => ({ ...s, cfg: parseFloat(e.target.value) || 0 }))}
                className="w-full bg-slate-700 text-white rounded px-2 py-1 text-xs border border-slate-600"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Sampler</label>
              <select
                value={shot.sampler}
                onChange={e => setShot(s => ({ ...s, sampler: e.target.value }))}
                className="w-full bg-slate-700 text-white rounded px-2 py-1 text-xs border border-slate-600"
              >
                {SAMPLERS.map(s => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Scheduler</label>
              <select
                value={shot.scheduler}
                onChange={e => setShot(s => ({ ...s, scheduler: e.target.value }))}
                className="w-full bg-slate-700 text-white rounded px-2 py-1 text-xs border border-slate-600"
              >
                {SCHEDULERS.map(s => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Video shift</label>
              <input
                type="number"
                value={shot.shiftVideo}
                min={0.01}
                max={100}
                step={0.01}
                onChange={e => setShot(s => ({ ...s, shiftVideo: parseFloat(e.target.value) || 0 }))}
                className="w-full bg-slate-700 text-white rounded px-2 py-1 text-xs border border-slate-600"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Audio shift</label>
              <input
                type="number"
                value={shot.shiftAudio}
                min={0.01}
                max={100}
                step={0.01}
                onChange={e => setShot(s => ({ ...s, shiftAudio: parseFloat(e.target.value) || 0 }))}
                className="w-full bg-slate-700 text-white rounded px-2 py-1 text-xs border border-slate-600"
              />
            </div>
          </div>
          <details className="text-xs">
            <summary className="text-slate-300 cursor-pointer">Model filenames</summary>
            <div className="grid grid-cols-1 gap-2 mt-2">
              <input
                value={shot.model}
                onChange={e => setShot(s => ({ ...s, model: e.target.value }))}
                placeholder="DiT checkpoint"
                className="w-full bg-slate-700 text-white rounded px-2 py-1 text-xs border border-slate-600"
              />
              <input
                value={shot.clip}
                onChange={e => setShot(s => ({ ...s, clip: e.target.value }))}
                placeholder="CLIP"
                className="w-full bg-slate-700 text-white rounded px-2 py-1 text-xs border border-slate-600"
              />
              <input
                value={shot.vae}
                onChange={e => setShot(s => ({ ...s, vae: e.target.value }))}
                placeholder="VAE"
                className="w-full bg-slate-700 text-white rounded px-2 py-1 text-xs border border-slate-600"
              />
              <input
                value={shot.audioVae}
                onChange={e => setShot(s => ({ ...s, audioVae: e.target.value }))}
                placeholder="Audio VAE"
                className="w-full bg-slate-700 text-white rounded px-2 py-1 text-xs border border-slate-600"
              />
            </div>
          </details>
          <details className="text-xs">
            <summary className="text-slate-300 cursor-pointer">
              LoRA (4-step turbo) {!shot.loraName || shot.loraName.trim() === '' ? '' : '⚡'}
            </summary>
            <div className="grid grid-cols-1 gap-2 mt-2">
              <input
                value={shot.loraName || ''}
                onChange={e => setShot(s => ({ ...s, loraName: e.target.value }))}
                placeholder="LoRA filename (e.g. minimax_h3_fl2v_lightx2v_turbo_4step_v0.1_comfy.safetensors)"
                className="w-full bg-slate-700 text-white rounded px-2 py-1 text-xs border border-slate-600"
              />
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-400 mb-0.5">Model strength</label>
                  <input
                    type="number"
                    value={shot.loraStrengthModel ?? 1.0}
                    min={0}
                    max={2}
                    step={0.01}
                    onChange={e => setShot(s => ({ ...s, loraStrengthModel: parseFloat(e.target.value) || 0 }))}
                    className="w-full bg-slate-700 text-white rounded px-2 py-1 text-xs border border-slate-600"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-0.5">CLIP strength</label>
                  <input
                    type="number"
                    value={shot.loraStrengthClip ?? 1.0}
                    min={0}
                    max={2}
                    step={0.01}
                    onChange={e => setShot(s => ({ ...s, loraStrengthClip: parseFloat(e.target.value) || 0 }))}
                    className="w-full bg-slate-700 text-white rounded px-2 py-1 text-xs border border-slate-600"
                  />
                </div>
              </div>
              <button
                onClick={() => setShot(prev => applyTurboPreset(prev, TURBO_PRESETS[0]))}
                className="w-full px-2 py-1 bg-orange-700 hover:bg-orange-600 text-white rounded text-xs"
              >
                ⚡ Apply LightX2V 4-step preset
              </button>
              <button
                onClick={() => setShot(s => ({
                  ...s,
                  loraName: '',
                  steps: 30,
                  cfg: 7.0,
                  shiftVideo: 12.0,
                  shiftAudio: 3.0,
                }))}
                className="w-full px-2 py-1 bg-slate-600 hover:bg-slate-500 text-slate-300 rounded text-xs"
              >
                Reset to standard (30-step)
              </button>
            </div>
          </details>
          <button
            onClick={() => submitShot()}
            disabled={submitting || !status.online || !shot.prompt.trim()}
            className={`w-full px-3 py-2 disabled:opacity-50 text-white rounded text-sm ${
              getRenderMode(shot) === 'prototype'
                ? 'bg-orange-600 hover:bg-orange-500'
                : 'bg-purple-600 hover:bg-purple-500'
            }`}
          >
            {submitting
              ? 'Submitting…'
              : getRenderMode(shot) === 'prototype'
                ? '⚡ Prototype render (4 steps)'
                : '🎬 Final render (30 steps)'}
          </button>
          <button
            onClick={rerollSeed}
            className="w-full px-3 py-1 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded text-xs"
          >
            🎲 Reroll seed ({shot.seed})
          </button>
        </div>
      )}
    </>
  );
}