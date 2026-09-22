'use client';

import type { RankResult } from '../core/types';

interface RankPanelProps {
  rank: RankResult;
  onReplay: () => void;
  onChangeDifficulty: () => void;
}

/**
 * The addiction hook: the recap is the reason to go again. Every number that
 * changed your score is shown, so "one more for a better rank" is a decision
 * the player can actually reason about.
 */
export function RankPanel({ rank, onReplay, onChangeDifficulty }: RankPanelProps) {
  const { stats } = rank;
  const outcomeLabel =
    stats.outcome === 'success' ? rank.reason : `${rank.reason}`;
  const headline =
    stats.outcome === 'success' ? 'MISSION COMPLETED' : stats.outcome === 'destroyed' ? 'STARSHIP DESTROYED' : 'MISSION ENDED';

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center overflow-y-auto bg-black/85 p-6 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-lg border border-amber-400/40 bg-slate-950/90 p-6">
        <p className="font-mono text-[11px] tracking-[0.4em] text-amber-400/80">{headline}</p>
        <h2 className="mt-2 font-mono text-2xl font-bold tracking-widest text-amber-300">{rank.title}</h2>
        <p className="mt-1 font-mono text-xs text-slate-400">
          {rank.difficulty} · SCORE {rank.score}
          {rank.isPersonalBest ? ' · NEW PERSONAL BEST' : rank.previousBest !== null ? ` · BEST ${rank.previousBest}` : ''}
        </p>

        <p className="mt-3 font-mono text-[11px] text-slate-400">{outcomeLabel}</p>

        <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-2 font-mono text-[11px]">
          <Row label="KILLS" value={String(stats.kills)} />
          <Row label="ENERGY USED" value={String(Math.round(stats.energyUsed))} />
          <Row label="TIME" value={`${stats.seconds}s`} />
          <Row label="WARPS" value={String(stats.warps)} />
          <Row label="WARP MISSES" value={String(stats.warpMisses)} />
          <Row label="BASES LOST" value={String(stats.basesLostToEnemy)} />
          <Row label="BASES YOU DESTROYED" value={String(stats.basesYouKilled)} />
          <Row label="SHIP LOSSES" value={String(stats.deaths)} />
        </dl>

        <p className="mt-5 border-t border-slate-700/70 pt-3 font-mono text-[10px] leading-relaxed text-slate-500">
          SCORE = RANK BASE + 6×KILLS − ENERGY/100 − SECONDS/100 − 18×BASES LOST − 3×BASES YOU KILLED
        </p>

        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={onReplay}
            className="flex-1 rounded border border-amber-400/70 bg-amber-400/15 px-5 py-2.5 font-mono text-xs tracking-widest text-amber-200 transition-colors hover:bg-amber-400/25"
          >
            FLY AGAIN
          </button>
          <button
            type="button"
            onClick={onChangeDifficulty}
            className="flex-1 rounded border border-slate-600 px-5 py-2.5 font-mono text-xs tracking-widest text-slate-300 transition-colors hover:bg-slate-700/50"
          >
            CHANGE DIFFICULTY
          </button>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2 text-slate-400">
      <dt className="truncate">{label}</dt>
      <dd className="text-slate-200">{value}</dd>
    </div>
  );
}
