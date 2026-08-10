'use client';

import { useRef } from 'react';
import { UploadedImage } from '@/lib/comfyui/minimax-graph';

interface CharacterRefSlotsProps {
  refs: UploadedImage[];
  enabled: boolean;
  refImageSize: 'match' | 'max';
  onToggleEnabled: (enabled: boolean) => void;
  onSetRefs: (refs: UploadedImage[]) => void;
  onSetRefImageSize: (size: 'match' | 'max') => void;
  comfyOnline: boolean;
}

const MAX_REFS = 3;

export function CharacterRefSlots({
  refs,
  enabled,
  refImageSize,
  onToggleEnabled,
  onSetRefs,
  onSetRefImageSize,
  comfyOnline,
}: CharacterRefSlotsProps) {
  const fileRefs = useRef<(HTMLInputElement | null)[]>([]);

  const upload = async (file: File, slot: number) => {
    try {
      const form = new FormData();
      form.append('image', file);
      const res = await fetch('/api/comfyui/upload', { method: 'POST', body: form });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || 'upload failed');
      const img: UploadedImage = { name: data.image.name, subfolder: data.image.subfolder, type: data.image.type };
      const next = [...refs];
      next[slot] = img;
      onSetRefs(next);
      if (!enabled) onToggleEnabled(true);
    } catch (e) {
      console.error('ref upload failed', e);
    }
  };

  const removeSlot = (slot: number) => {
    const next = refs.filter((_, i) => i !== slot);
    onSetRefs(next);
  };

  return (
    <div className="border border-slate-700 rounded-lg p-2 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-300 flex items-center gap-1">
          🎭 Character refs
        </span>
        <button
          onClick={() => onToggleEnabled(!enabled)}
          disabled={!comfyOnline}
          className={`text-xs px-2 py-0.5 rounded font-medium disabled:opacity-50 ${
            enabled
              ? 'bg-green-700 text-green-100 hover:bg-green-600'
              : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
          }`}
          title={enabled ? 'Refs ON — prompt can reference <Picture 1>, <Picture 2>, <Picture 3>' : 'Refs OFF — standard text-to-video'}
        >
          {enabled ? 'Refs ON' : 'Refs OFF'}
        </button>
      </div>
      {enabled && (
        <>
          <div className="grid grid-cols-3 gap-1.5">
            {Array.from({ length: MAX_REFS }).map((_, i) => {
              const ref = refs[i];
              return (
                <div key={i} className="relative">
                  {ref ? (
                    <div className="relative group aspect-square">
                      <img
                        src={`/api/comfyui/view?filename=${encodeURIComponent(ref.name)}&subfolder=${encodeURIComponent(ref.subfolder)}&type=${encodeURIComponent(ref.type)}`}
                        alt={`Character ${i + 1}`}
                        className="w-full h-full object-cover rounded border border-slate-600"
                      />
                      <button
                        onClick={() => removeSlot(i)}
                        className="absolute top-0 right-0 bg-red-700/80 text-white text-xs rounded-bl px-1 opacity-0 group-hover:opacity-100"
                        title="Remove"
                      >
                        ✕
                      </button>
                      <span className="absolute bottom-0 left-0 bg-slate-900/80 text-slate-200 text-[10px] px-1 rounded-tr">
                        #{i + 1}
                      </span>
                    </div>
                  ) : (
                    <label
                      className={`aspect-square flex items-center justify-center border border-dashed border-slate-600 rounded cursor-pointer text-slate-500 hover:text-slate-300 hover:border-slate-500 ${
                        comfyOnline ? '' : 'opacity-50 cursor-not-allowed'
                      }`}
                      title={`Upload character ${i + 1}`}
                    >
                      <input
                        ref={el => { fileRefs.current[i] = el; }}
                        type="file"
                        accept="image/*"
                        disabled={!comfyOnline}
                        onChange={e => {
                          const f = e.target.files?.[0];
                          if (f) upload(f, i);
                          e.target.value = '';
                        }}
                        className="hidden"
                      />
                      <span className="text-xs">+ #{i + 1}</span>
                    </label>
                  )}
                </div>
              );
            })}
          </div>
          <div className="flex items-center gap-1 text-[10px] text-slate-400">
            <span>Fidelity:</span>
            <button
              onClick={() => onSetRefImageSize('match')}
              className={`px-1.5 py-0.5 rounded ${refImageSize === 'match' ? 'bg-slate-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}
              title="Scale refs to the shot size — fast"
            >
              match
            </button>
            <button
              onClick={() => onSetRefImageSize('max')}
              className={`px-1.5 py-0.5 rounded ${refImageSize === 'max' ? 'bg-slate-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}
              title="Use the reference pipeline's 2048px short edge — best identity fidelity, slower"
            >
              max
            </button>
          </div>
          <p className="text-[10px] text-slate-500 leading-tight">
            Write <code className="text-slate-400">&lt;Picture 1&gt;</code> in the prompt for character 1, etc.
          </p>
        </>
      )}
    </div>
  );
}