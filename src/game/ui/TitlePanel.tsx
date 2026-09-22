'use client';

import { difficultyList, type DifficultyId } from '../data/schema';

interface TitlePanelProps {
  difficulty: DifficultyId;
  bestScores: Partial<Record<DifficultyId, number>>;
  onSelectDifficulty: (id: DifficultyId) => void;
  onBegin: () => void;
  onShowHelp: () => void;
  seed: number;
}

export function TitlePanel({
  difficulty,
  bestScores,
  onSelectDifficulty,
  onBegin,
  onShowHelp,
  seed,
}: TitlePanelProps) {
  const levels = difficultyList();

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center overflow-y-auto bg-gradient-to-b from-black/70 via-black/55 to-black/80 p-6">
      <div className="w-full max-w-3xl">
        <div className="text-center">
          <p className="font-mono text-[11px] tracking-[0.45em] text-amber-400/80">HELION FLEET · SECTOR COMMAND</p>
          <h1 className="mt-2 font-mono text-4xl font-bold tracking-[0.18em] text-amber-300 sm:text-5xl">
            STAR RAIDERS
          </h1>
          <p className="mt-1 font-mono text-lg tracking-[0.35em] text-cyan-300/90">REBORN</p>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-slate-300">
            You are one ship. Clear the galaxy before the Veydrim take every base.
          </p>
        </div>

        <div className="mt-7 grid gap-3 sm:grid-cols-2">
          {levels.map(level => {
            const selected = level.id === difficulty;
            const best = bestScores[level.id];
            return (
              <button
                key={level.id}
                type="button"
                onClick={() => onSelectDifficulty(level.id)}
                aria-pressed={selected}
                className={`rounded-md border p-3 text-left transition-colors ${
                  selected
                    ? 'border-amber-400/70 bg-amber-400/10'
                    : 'border-slate-600/60 bg-slate-900/50 hover:border-slate-400/70'
                }`}
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span className={`font-mono text-sm font-bold tracking-widest ${selected ? 'text-amber-300' : 'text-slate-200'}`}>
                    {level.label.toUpperCase()}
                  </span>
                  <span className="font-mono text-[10px] text-slate-400">
                    {best === undefined ? 'NO RECORD' : `BEST ${best}`}
                  </span>
                </div>
                <p className="mt-1 text-[11px] leading-snug text-slate-400">{level.tagline}</p>
                <p className="mt-2 font-mono text-[10px] text-slate-500">
                  {level.enemyGroups} HOSTILE GROUPS · {level.baseCount} BASES
                  {level.autoAlign ? ' · WARP ASSIST' : ''}
                </p>
              </button>
            );
          })}
        </div>

        <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={onBegin}
            className="w-full rounded-md border border-amber-400/70 bg-amber-400/15 px-8 py-3 font-mono text-sm font-bold tracking-[0.25em] text-amber-200 transition-colors hover:bg-amber-400/25 sm:w-auto"
          >
            BEGIN MISSION
          </button>
          <button
            type="button"
            onClick={onShowHelp}
            className="w-full rounded-md border border-slate-600 px-6 py-3 font-mono text-xs tracking-[0.2em] text-slate-300 transition-colors hover:bg-slate-700/50 sm:w-auto"
          >
            CONTROLS &amp; SETTINGS
          </button>
        </div>

        <p className="mt-6 text-center font-mono text-[10px] leading-relaxed text-slate-500">
          SEED {seed} · INSPIRED BY THE 8-BIT SPACE COMBAT GAMES OF 1979
          <br />
          A session is 8–20 minutes. Mastery is steering, energy discipline, and map judgement.
        </p>
      </div>
    </div>
  );
}
