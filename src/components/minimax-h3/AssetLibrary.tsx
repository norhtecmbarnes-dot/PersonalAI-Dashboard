'use client';

import { useState, useEffect, useCallback } from 'react';

interface Character {
  id: string;
  name: string;
  description: string;
  refImageName?: string;
  refImageSubfolder?: string;
  refImageType?: string;
  tags?: string;
  createdAt: number;
}

interface Scene {
  id: string;
  name: string;
  description: string;
  imageName?: string;
  imageSubfolder?: string;
  imageType?: string;
  prompt?: string;
  tags?: string;
  createdAt: number;
}

type Tab = 'characters' | 'scenes';

export function AssetLibrary({ onPickCharacter, onPickScene }: {
  onPickCharacter?: (c: Character) => void;
  onPickScene?: (s: Scene) => void;
}) {
  const [tab, setTab] = useState<Tab>('characters');
  const [characters, setCharacters] = useState<Character[]>([]);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingName, setEditingName] = useState('');
  const [editingDesc, setEditingDesc] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [charRes, sceneRes] = await Promise.all([
        fetch('/api/director/characters'),
        fetch('/api/director/scenes'),
      ]);
      const charData = await charRes.json();
      const sceneData = await sceneRes.json();
      if (charData.ok) setCharacters(charData.characters || []);
      if (sceneData.ok) setScenes(sceneData.scenes || []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!editingName.trim()) return;
    const endpoint = tab === 'characters' ? '/api/director/characters' : '/api/director/scenes';
    try {
      await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: editingId ? 'update' : 'create',
          data: { id: editingId, name: editingName, description: editingDesc },
        }),
      });
      setShowForm(false);
      setEditingId(null);
      setEditingName('');
      setEditingDesc('');
      load();
    } catch {
      // ignore
    }
  };

  const remove = async (id: string) => {
    const endpoint = tab === 'characters' ? '/api/director/characters' : '/api/director/scenes';
    await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete', data: { id } }),
    });
    load();
  };

  const imageUrl = (name?: string, subfolder?: string, type?: string) => {
    if (!name) return '';
    const params = new URLSearchParams({ filename: name, subfolder: subfolder || '', type: type || 'output' });
    return `/api/comfyui/view?${params.toString()}`;
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 mb-3">
        <h3 className="text-sm font-semibold text-white">Asset Library</h3>
        <div className="flex bg-slate-700 rounded overflow-hidden text-xs">
          <button
            onClick={() => setTab('characters')}
            className={`px-2 py-1 ${tab === 'characters' ? 'bg-purple-600 text-white' : 'text-slate-400'}`}
          >
            👤 Characters ({characters.length})
          </button>
          <button
            onClick={() => setTab('scenes')}
            className={`px-2 py-1 ${tab === 'scenes' ? 'bg-purple-600 text-white' : 'text-slate-400'}`}
          >
            🏞 Scenes ({scenes.length})
          </button>
        </div>
        <button
          onClick={() => { setShowForm(true); setEditingId(null); setEditingName(''); setEditingDesc(''); }}
          className="ml-auto text-xs px-2 py-1 bg-green-700 text-green-100 rounded hover:bg-green-600"
        >
          + New
        </button>
      </div>

      {showForm && (
        <div className="mb-3 p-3 bg-slate-800 rounded border border-slate-600 space-y-2">
          <input
            type="text"
            placeholder={tab === 'characters' ? 'Character name…' : 'Scene name…'}
            value={editingName}
            onChange={e => setEditingName(e.target.value)}
            className="w-full px-2 py-1 bg-slate-900 text-white text-sm rounded border border-slate-600"
            autoFocus
          />
          <textarea
            placeholder="Description (optional)…"
            value={editingDesc}
            onChange={e => setEditingDesc(e.target.value)}
            className="w-full px-2 py-1 bg-slate-900 text-white text-sm rounded border border-slate-600"
            rows={2}
          />
          <div className="flex gap-2">
            <button onClick={save} className="px-3 py-1 bg-purple-600 text-white text-xs rounded hover:bg-purple-500">
              Save
            </button>
            <button onClick={() => setShowForm(false)} className="px-3 py-1 bg-slate-700 text-slate-300 text-xs rounded hover:bg-slate-600">
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto space-y-2">
        {loading && <p className="text-xs text-slate-500">Loading…</p>}

        {tab === 'characters' && characters.map(c => (
          <div key={c.id} className="bg-slate-800 rounded p-2 border border-slate-700 group">
            <div className="flex items-start gap-2">
              {c.refImageName && (
                <img
                  src={imageUrl(c.refImageName, c.refImageSubfolder, c.refImageType)}
                  alt={c.name}
                  className="w-12 h-12 rounded object-cover flex-shrink-0"
                />
              )}
              <div className="flex-1 min-w-0">
                <div className="text-sm text-white font-medium truncate">{c.name}</div>
                {c.description && <div className="text-xs text-slate-400 truncate">{c.description}</div>}
              </div>
            </div>
            <div className="flex gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {onPickCharacter && (
                <button
                  onClick={() => onPickCharacter(c)}
                  className="text-xs px-2 py-0.5 bg-purple-700 text-purple-100 rounded hover:bg-purple-600"
                >
                  Use
                </button>
              )}
              <button
                onClick={() => { setEditingId(c.id); setEditingName(c.name); setEditingDesc(c.description); setShowForm(true); }}
                className="text-xs px-2 py-0.5 bg-slate-700 text-slate-300 rounded hover:bg-slate-600"
              >
                Edit
              </button>
              <button
                onClick={() => remove(c.id)}
                className="text-xs px-2 py-0.5 bg-red-700 text-red-100 rounded hover:bg-red-600"
              >
                Delete
              </button>
            </div>
          </div>
        ))}

        {tab === 'scenes' && scenes.map(s => (
          <div key={s.id} className="bg-slate-800 rounded p-2 border border-slate-700 group">
            <div className="flex items-start gap-2">
              {s.imageName && (
                <img
                  src={imageUrl(s.imageName, s.imageSubfolder, s.imageType)}
                  alt={s.name}
                  className="w-12 h-12 rounded object-cover flex-shrink-0"
                />
              )}
              <div className="flex-1 min-w-0">
                <div className="text-sm text-white font-medium truncate">{s.name}</div>
                {s.description && <div className="text-xs text-slate-400 truncate">{s.description}</div>}
                {s.prompt && <div className="text-xs text-slate-500 truncate mt-0.5">📝 {s.prompt.slice(0, 60)}</div>}
              </div>
            </div>
            <div className="flex gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {onPickScene && (
                <button
                  onClick={() => onPickScene(s)}
                  className="text-xs px-2 py-0.5 bg-purple-700 text-purple-100 rounded hover:bg-purple-600"
                >
                  Use
                </button>
              )}
              <button
                onClick={() => { setEditingId(s.id); setEditingName(s.name); setEditingDesc(s.description); setShowForm(true); }}
                className="text-xs px-2 py-0.5 bg-slate-700 text-slate-300 rounded hover:bg-slate-600"
              >
                Edit
              </button>
              <button
                onClick={() => remove(s.id)}
                className="text-xs px-2 py-0.5 bg-red-700 text-red-100 rounded hover:bg-red-600"
              >
                Delete
              </button>
            </div>
          </div>
        ))}

        {!loading && tab === 'characters' && characters.length === 0 && (
          <p className="text-xs text-slate-500 text-center py-4">No characters saved yet.</p>
        )}
        {!loading && tab === 'scenes' && scenes.length === 0 && (
          <p className="text-xs text-slate-500 text-center py-4">No scenes saved yet.</p>
        )}
      </div>
    </div>
  );
}