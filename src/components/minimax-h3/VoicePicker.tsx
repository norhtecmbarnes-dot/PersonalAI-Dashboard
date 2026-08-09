'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

export interface CatalogVoice {
  id: string;
  provider: string;
  name: string;
  description: string;
  gender?: 'male' | 'female' | 'neutral';
  accent?: string;
  language?: string;
  style?: string[];
  previewUrl?: string;
}

interface VoicePickerProps {
  value: string;            // currently selected voice id/name
  provider: string;         // preferred provider filter ('vocallab' | 'elevenlabs' | '')
  onChange: (voiceId: string, provider: string) => void;
  label?: string;
  compact?: boolean;
}

export function VoicePicker({ value, provider, onChange, label = 'Voice', compact = false }: VoicePickerProps) {
  const [voices, setVoices] = useState<CatalogVoice[]>([]);
  const [filtered, setFiltered] = useState<CatalogVoice[]>([]);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [previewing, setPreviewing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const loadVoices = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const url = provider
        ? `/api/voices?provider=${encodeURIComponent(provider)}&limit=200`
        : '/api/voices?limit=200';
      const res = await fetch(url);
      const data = await res.json();
      if (data.ok) {
        setVoices(data.voices);
        setFiltered(data.voices);
      } else {
        setError(data.error || 'failed to load voices');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'unreachable');
    } finally {
      setLoading(false);
    }
  }, [provider]);

  useEffect(() => {
    loadVoices();
  }, [loadVoices]);

  // Filter locally as the user types — keeps the picker snappy and works offline.
  useEffect(() => {
    if (!query.trim()) {
      setFiltered(voices);
      return;
    }
    const q = query.toLowerCase();
    const terms = q.split(/\s+/).filter(Boolean);
    setFiltered(
      voices
        .map(v => {
          const haystack = [
            v.name, v.description, v.gender || '', v.accent || '', v.language || '', (v.style || []).join(' '),
          ].join(' ').toLowerCase();
          let score = 0;
          for (const t of terms) if (haystack.includes(t)) score += 1;
          if (haystack.includes(q)) score += terms.length;
          return { v, score };
        })
        .filter(x => x.score > 0)
        .sort((a, b) => b.score - a.score)
        .map(x => x.v)
    );
  }, [query, voices]);

  // Close the dropdown when clicking outside.
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const playPreview = async (voice: CatalogVoice) => {
    // Stop any existing playback.
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setPreviewing(voice.id);

    try {
      // If the provider gave us a direct preview URL, play it.
      if (voice.previewUrl) {
        const audio = new Audio(voice.previewUrl);
        audioRef.current = audio;
        audio.onended = () => setPreviewing(null);
        audio.onerror = () => setPreviewing(null);
        await audio.play();
        return;
      }

      // Otherwise synthesize a short sample through the /api/voices sample endpoint.
      const res = await fetch('/api/voices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: voice.provider, voiceId: voice.id }),
      });
      if (!res.ok) {
        setPreviewing(null);
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => { setPreviewing(null); URL.revokeObjectURL(url); };
      audio.onerror = () => { setPreviewing(null); URL.revokeObjectURL(url); };
      await audio.play();
    } catch {
      setPreviewing(null);
    }
  };

  const stopPreview = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setPreviewing(null);
  };

  const selected = voices.find(v => v.id === value);

  return (
    <div ref={containerRef} className="relative">
      <label className="block text-xs text-slate-400 mb-1">{label}</label>
      <div className="flex gap-1">
        <input
          type="text"
          value={open ? query : (selected ? `${selected.name} (${selected.provider})` : value)}
          onChange={e => { setQuery(e.target.value); if (!open) setOpen(true); }}
          onFocus={() => { setOpen(true); setQuery(''); }}
          placeholder={loading ? 'Loading voices…' : 'Search voices (e.g. warm British female)…'}
          className="w-full bg-slate-700 text-white rounded px-2 py-2 text-sm border border-slate-600 placeholder-slate-500"
        />
        {previewing && (
          <button
            type="button"
            onClick={stopPreview}
            className="px-2 py-1 bg-red-600/70 hover:bg-red-600 text-white rounded text-xs"
            title="Stop preview"
          >
            ■
          </button>
        )}
      </div>

      {open && (
        <div className="absolute z-30 mt-1 w-full max-h-72 overflow-y-auto bg-slate-800 border border-slate-600 rounded shadow-lg">
          {error && (
            <div className="px-3 py-2 text-xs text-red-400">{error}</div>
          )}
          {!error && filtered.length === 0 && !loading && (
            <div className="px-3 py-2 text-xs text-slate-400">No voices match “{query}”.</div>
          )}
          {filtered.map(voice => (
            <div
              key={`${voice.provider}:${voice.id}`}
              onClick={() => {
                onChange(voice.id, voice.provider);
                setOpen(false);
                setQuery('');
              }}
              className={`px-3 py-2 cursor-pointer hover:bg-slate-700 border-b border-slate-700/50 ${
                voice.id === value ? 'bg-purple-900/40' : ''
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-white text-sm font-medium truncate">
                    {voice.name} <span className="text-slate-500 text-xs">· {voice.provider}</span>
                  </div>
                  {!compact && (
                    <div className="text-slate-400 text-xs truncate">{voice.description}</div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={e => { e.stopPropagation(); playPreview(voice); }}
                  className="shrink-0 px-2 py-1 bg-blue-600/70 hover:bg-blue-600 text-white rounded text-xs"
                  title="Play sample"
                >
                  {previewing === voice.id ? '▶…' : '▶'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}