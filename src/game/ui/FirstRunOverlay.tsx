'use client';

import { useState } from 'react';

interface FirstRunOverlayProps {
  onDismiss: () => void;
}

/**
 * Four steps, shown once, never again. The brief is explicit — "No wall of
 * text. Teach with a 4-step overlay on first run only" — so this is the whole
 * tutorial and it is skippable at every point.
 */
const STEPS = [
  {
    title: '1 · FLY',
    body: 'Move the mouse to aim (click the view first to capture it), or fly with the arrow keys. Press 0–9 to set speed.',
    detail: '6 is efficient cruise. 9 is a sprint that burns energy hard. F looks forward, A looks aft.',
  },
  {
    title: '2 · WARP',
    body: 'Press G for the galactic chart. Pick a sector with the arrows, then press Enter to warp.',
    detail: 'Hold H once the tunnel starts. Keep the white nose pip on the drifting gate ring — miss, and you come out somewhere you did not choose.',
  },
  {
    title: '3 · FIGHT',
    body: 'Left mouse button fires photons. Press C for the attack computer, T to lock the target it picks.',
    detail: 'A locked target fires both tubes as a paired burst. Shields are S. You can even shoot an incoming bolt out of the sky.',
  },
  {
    title: '4 · SURVIVE',
    body: 'Energy is the real clock. When it runs low, warp to a base and dock.',
    detail: 'Match docking speed 3–5 with the base centred in your reticle. The brackets will fill, and the base restores everything.',
  },
];

export function FirstRunOverlay({ onDismiss }: FirstRunOverlayProps) {
  const [index, setIndex] = useState(0);
  const step = STEPS[index];
  const isLast = index === STEPS.length - 1;

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/85 p-6 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-lg border border-cyan-400/40 bg-slate-950/95 p-6">
        <p className="font-mono text-[10px] tracking-[0.4em] text-cyan-300/80">FLIGHT BRIEFING</p>
        <h2 className="mt-2 font-mono text-lg font-bold tracking-widest text-amber-300">{step.title}</h2>
        <p className="mt-3 text-sm leading-relaxed text-slate-200">{step.body}</p>
        <p className="mt-3 text-xs leading-relaxed text-slate-400">{step.detail}</p>

        <div className="mt-5 flex items-center gap-1">
          {STEPS.map((item, i) => (
            <span
              key={item.title}
              className={`h-1 flex-1 rounded ${i <= index ? 'bg-amber-400/80' : 'bg-slate-700'}`}
            />
          ))}
        </div>

        <div className="mt-4 flex gap-2">
          {index > 0 && (
            <button
              type="button"
              onClick={() => setIndex(i => i - 1)}
              className="rounded border border-slate-600 px-4 py-2 font-mono text-xs tracking-widest text-slate-300 transition-colors hover:bg-slate-700/50"
            >
              BACK
            </button>
          )}
          <button
            type="button"
            onClick={() => (isLast ? onDismiss() : setIndex(i => i + 1))}
            className="flex-1 rounded border border-amber-400/70 bg-amber-400/15 px-4 py-2 font-mono text-xs tracking-widest text-amber-200 transition-colors hover:bg-amber-400/25"
          >
            {isLast ? 'GOT IT — LAUNCH' : 'NEXT'}
          </button>
          {!isLast && (
            <button
              type="button"
              onClick={onDismiss}
              className="rounded border border-slate-700 px-4 py-2 font-mono text-xs tracking-widest text-slate-400 transition-colors hover:bg-slate-700/50"
            >
              SKIP
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
