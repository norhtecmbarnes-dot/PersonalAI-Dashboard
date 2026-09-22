'use client';

import { useEffect, useRef, useState } from 'react';
import { StarRaidersGame, type UiState } from '@/game/engine';
import { seedFromLocation } from '@/game/core/seed';
import type { DifficultyId } from '@/game/data/schema';
import { TitlePanel } from '@/game/ui/TitlePanel';
import { ChartPanel } from '@/game/ui/ChartPanel';
import { ScanPanel } from '@/game/ui/ScanPanel';
import { RankPanel } from '@/game/ui/RankPanel';
import { FirstRunOverlay } from '@/game/ui/FirstRunOverlay';
import { ControlsPanel } from '@/game/ui/ControlsPanel';

/**
 * The React shell. The game itself (simulation, WebGL world, cockpit HUD) lives
 * in `src/game/` and never touches React's render path — this component only
 * swaps full-screen panels in and out as the engine's mode changes.
 */
export function StarRaiders() {
  const containerRef = useRef<HTMLDivElement>(null);
  const webglRef = useRef<HTMLCanvasElement>(null);
  const hudRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<StarRaidersGame | null>(null);

  const [ui, setUi] = useState<UiState | null>(null);
  const [seed, setSeed] = useState(0);
  const [showHelp, setShowHelp] = useState(false);
  const [briefingReplay, setBriefingReplay] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    const webgl = webglRef.current;
    const hud = hudRef.current;
    if (!container || !webgl || !hud) return;

    const resolvedSeed =
      seedFromLocation(window.location.search) ?? ((Date.now() ^ (Math.random() * 0xffffffff)) >>> 0);
    setSeed(resolvedSeed);

    let game: StarRaidersGame;
    try {
      game = new StarRaidersGame({
        webglCanvas: webgl,
        hudCanvas: hud,
        container,
        difficulty: 'novice',
        seed: resolvedSeed,
      });
    } catch (cause) {
      setError(
        cause instanceof Error
          ? `This machine could not start the renderer: ${cause.message}`
          : 'This machine could not start the renderer.',
      );
      return;
    }

    gameRef.current = game;
    const unsubscribe = game.state.subscribe(setUi);
    game.start();

    if (process.env.NODE_ENV !== 'production') {
      (window as unknown as { __starRaiders?: StarRaidersGame }).__starRaiders = game;
    }

    return () => {
      unsubscribe();
      game.destroy();
      gameRef.current = null;
    };
  }, []);

  const beginMission = () => {
    setBriefingReplay(false);
    gameRef.current?.beginMission();
  };

  return (
    <div
      ref={containerRef}
      className="relative h-[calc(100vh-2.5rem)] w-full select-none overflow-hidden bg-[#03040a]"
    >
      <canvas ref={webglRef} className="absolute inset-0 h-full w-full" />
      <canvas ref={hudRef} className="pointer-events-none absolute inset-0 h-full w-full" />

      {ui?.settings.filmGrain && <FilmGrain />}

      {/* Always-available chrome. Kept small and out of the reticle's way. */}
      <div className="absolute right-3 top-3 z-40 flex items-center gap-1.5">
        {ui?.missionActive && (
          <ChromeButton label={ui.paused ? 'Resume (P)' : 'Pause (P)'} onClick={() => gameRef.current?.togglePause()} />
        )}
        <ChromeButton
          label={ui?.audioOn ? 'Sound on' : 'Sound off'}
          onClick={() => gameRef.current?.toggleAudio()}
          active={ui?.audioOn}
        />
        <ChromeButton label="Controls" onClick={() => setShowHelp(true)} />
      </div>

      {ui?.showFirstRun && <FirstRunOverlay onDismiss={() => gameRef.current?.dismissFirstRun()} />}

      {briefingReplay && (
        <FirstRunOverlay
          onDismiss={() => {
            setBriefingReplay(false);
            gameRef.current?.dismissFirstRun();
          }}
        />
      )}

      {showHelp && ui && (
        <ControlsPanel
          settings={ui.settings}
          onClose={() => setShowHelp(false)}
          onChange={patch => gameRef.current?.updateSettings(patch)}
          onReplayBriefing={() => {
            setShowHelp(false);
            setBriefingReplay(true);
          }}
        />
      )}

      {ui?.mode === 'title' && !ui.showFirstRun && !briefingReplay && !showHelp && (
        <TitlePanel
          difficulty={ui.difficulty}
          bestScores={ui.bestScores}
          seed={seed}
          onSelectDifficulty={(id: DifficultyId) => gameRef.current?.setDifficulty(id)}
          onBegin={beginMission}
          onShowHelp={() => setShowHelp(true)}
        />
      )}

      {ui?.mode === 'chart' && ui.chart && (
        <ChartPanel
          chart={ui.chart}
          onMove={(dx, dy) => gameRef.current?.moveCursor(dx, dy)}
          onSelect={(x, y) => gameRef.current?.setCursor(x, y)}
          onWarp={() => gameRef.current?.confirmWarp()}
          onClose={() => gameRef.current?.closeChart()}
        />
      )}

      {ui?.mode === 'scan' && ui.scan && (
        <ScanPanel scan={ui.scan} onClose={() => gameRef.current?.closeScan()} />
      )}

      {ui?.mode === 'rank' && ui.rank && (
        <RankPanel
          rank={ui.rank}
          onReplay={() => gameRef.current?.beginMission()}
          onChangeDifficulty={() => gameRef.current?.backToTitle()}
        />
      )}

      {ui?.paused && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/75 backdrop-blur-sm">
          <div className="w-full max-w-xs rounded-lg border border-slate-600 bg-slate-950/95 p-6 text-center">
            <p className="font-mono text-lg font-bold tracking-[0.3em] text-amber-300">PAUSED</p>
            <div className="mt-5 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => gameRef.current?.togglePause()}
                className="rounded border border-amber-400/70 bg-amber-400/15 px-4 py-2 font-mono text-xs tracking-widest text-amber-200 transition-colors hover:bg-amber-400/25"
              >
                RESUME (P)
              </button>
              <button
                type="button"
                onClick={() => {
                  gameRef.current?.togglePause();
                  setShowHelp(true);
                }}
                className="rounded border border-slate-600 px-4 py-2 font-mono text-xs tracking-widest text-slate-300 transition-colors hover:bg-slate-700/50"
              >
                CONTROLS
              </button>
              <button
                type="button"
                onClick={() => gameRef.current?.backToTitle()}
                className="rounded border border-slate-700 px-4 py-2 font-mono text-xs tracking-widest text-slate-400 transition-colors hover:bg-slate-700/50"
              >
                ABORT TO TITLE
              </button>
            </div>
          </div>
        </div>
      )}

      {ui?.mode === 'flying' && !ui.pointerLocked && !ui.paused && (
        <button
          type="button"
          onClick={() => gameRef.current?.requestPointerLock()}
          className="absolute bottom-3 left-1/2 z-30 -translate-x-1/2 rounded border border-cyan-400/40 bg-black/70 px-4 py-2 font-mono text-[11px] tracking-widest text-cyan-200 transition-colors hover:bg-cyan-400/10"
        >
          CLICK FOR MOUSE AIM · ARROWS FLY TOO
        </button>
      )}

      {error && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/90 p-6">
          <div className="max-w-md rounded border border-red-500/50 bg-red-950/40 p-5">
            <p className="font-mono text-sm text-red-300">{error}</p>
            <p className="mt-2 text-xs text-slate-400">
              Star Raiders Reborn needs WebGL. Try a different browser, or enable hardware acceleration.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function ChromeButton({ label, onClick, active }: { label: string; onClick: () => void; active?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded border px-2.5 py-1 font-mono text-[10px] tracking-widest transition-colors ${
        active === false
          ? 'border-slate-700 text-slate-500 hover:bg-slate-700/40'
          : 'border-slate-600/80 bg-black/50 text-slate-300 hover:bg-slate-700/50'
      }`}
    >
      {label}
    </button>
  );
}

function FilmGrain() {
  return (
    <>
      <style>{`
        @keyframes star-raiders-grain {
          0%   { transform: translate(0, 0); }
          20%  { transform: translate(-3%, 2%); }
          40%  { transform: translate(2%, -3%); }
          60%  { transform: translate(-2%, -2%); }
          80%  { transform: translate(3%, 1%); }
          100% { transform: translate(0, 0); }
        }
      `}</style>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -inset-[10%] z-10 opacity-[0.07] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='140' height='140' filter='url(%23n)'/%3E%3C/svg%3E\")",
          animation: 'star-raiders-grain 0.9s steps(6) infinite',
        }}
      />
    </>
  );
}

export default StarRaiders;
