'use client';

import type { GameSettings } from '../engine';

interface ControlsPanelProps {
  settings: GameSettings;
  onClose: () => void;
  onChange: (patch: Partial<GameSettings>) => void;
  onReplayBriefing: () => void;
}

const KEY_ROWS: [string, string][] = [
  ['Mouse / Arrow keys', 'Pitch and yaw'],
  ['0 – 9', 'Set speed (6 is efficient cruise, 9 is a sprint)'],
  ['[ / ]', 'Speed down / up one step'],
  ['Left mouse or Space', 'Fire photons'],
  ['F  /  A  /  V', 'Fore view / aft view / cycle'],
  ['G', 'Galactic chart'],
  ['H  (hold)', 'Hyperwarp — hold through the tunnel'],
  ['L', 'Short-range scan'],
  ['C', 'Attack computer on / off'],
  ['T', 'Track the selected target (lock)'],
  ['M', 'Select next target'],
  ['S', 'Shields on / off'],
  ['P', 'Pause'],
  ['Escape', 'Cancel warp / leave a panel'],
  ['Gamepad', 'Right stick aims · triggers fire · shoulders change speed'],
];

/** Settings and the full key reference. Deliberately not shown on first run. */
export function ControlsPanel({ settings, onClose, onChange, onReplayBriefing }: ControlsPanelProps) {
  return (
    <div className="absolute inset-0 z-30 flex items-start justify-center overflow-y-auto bg-black/85 p-6 backdrop-blur-sm">
      <div className="w-full max-w-3xl rounded-lg border border-slate-600/70 bg-slate-950/95 p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-mono text-[10px] tracking-[0.4em] text-cyan-300/80">COCKPIT REFERENCE</p>
            <h2 className="mt-1 font-mono text-xl font-bold tracking-widest text-amber-300">CONTROLS</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-slate-600 px-4 py-2 font-mono text-xs tracking-widest text-slate-300 transition-colors hover:bg-slate-700/50"
          >
            CLOSE
          </button>
        </div>

        <div className="mt-5 grid gap-6 md:grid-cols-2">
          <div>
            <dl className="space-y-1.5 font-mono text-[11px]">
              {KEY_ROWS.map(([key, action]) => (
                <div key={key} className="flex gap-3">
                  <dt className="w-40 shrink-0 text-amber-300/90">{key}</dt>
                  <dd className="text-slate-300">{action}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-4 rounded border border-cyan-400/25 bg-cyan-400/5 p-2 font-mono text-[10px] leading-relaxed text-cyan-200/80">
              Flight is mouse or arrow keys — never WASD. Every letter key does exactly one job, which is why
              A means &ldquo;aft view&rdquo; and S means &ldquo;shields&rdquo;.
            </p>
          </div>

          <div>
            <h3 className="font-mono text-[11px] tracking-widest text-cyan-300/90">SETTINGS</h3>
            <div className="mt-3 space-y-3">
              <Toggle
                label="Invert yaw in aft view"
                hint="Authentic to the original. Turn off if it fights your hands."
                checked={settings.invertAft}
                onChange={value => onChange({ invertAft: value })}
              />
              <Toggle
                label="Damage numbers"
                hint="Show energy lost as floating numbers on impact."
                checked={settings.damageNumbers}
                onChange={value => onChange({ damageNumbers: value })}
              />
              <Toggle
                label="Film grain"
                hint="Subtle cockpit noise. Purely atmospheric."
                checked={settings.filmGrain}
                onChange={value => onChange({ filmGrain: value })}
              />
              <Toggle
                label="Audio"
                hint="Synthesized cockpit hum, photons and radio."
                checked={settings.audio}
                onChange={value => onChange({ audio: value })}
              />
              <Toggle
                label="Performance readout"
                hint="Frame rate and draw calls in the corner."
                checked={settings.showDebug}
                onChange={value => onChange({ showDebug: value })}
              />

              <label className="block">
                <span className="font-mono text-[11px] text-slate-300">Mouse sensitivity</span>
                <input
                  type="range"
                  min={0.3}
                  max={2.5}
                  step={0.1}
                  value={settings.sensitivity}
                  onChange={event => onChange({ sensitivity: Number(event.target.value) })}
                  className="mt-2 w-full accent-amber-400"
                />
                <span className="font-mono text-[10px] text-slate-500">{settings.sensitivity.toFixed(1)}×</span>
              </label>
            </div>

            <button
              type="button"
              onClick={onReplayBriefing}
              className="mt-4 w-full rounded border border-slate-600 px-4 py-2 font-mono text-[11px] tracking-widest text-slate-300 transition-colors hover:bg-slate-700/50"
            >
              REPLAY FLIGHT BRIEFING
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Toggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3">
      <input
        type="checkbox"
        checked={checked}
        onChange={event => onChange(event.target.checked)}
        className="mt-0.5 h-4 w-4 accent-amber-400"
      />
      <span>
        <span className="block font-mono text-[11px] text-slate-200">{label}</span>
        <span className="block text-[10px] leading-snug text-slate-500">{hint}</span>
      </span>
    </label>
  );
}
