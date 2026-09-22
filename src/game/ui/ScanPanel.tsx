'use client';

import type { ScanSnapshot } from '../engine';

interface ScanPanelProps {
  scan: ScanSnapshot;
  onClose: () => void;
}

const SIZE = 440;
const CENTER = SIZE / 2;
const PLOT_RADIUS = CENTER - 26;

/** Short-range scan: a top-down look at the sector, replaced by the cockpit view. */
export function ScanPanel({ scan, onClose }: ScanPanelProps) {
  const scale = PLOT_RADIUS / scan.range;

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="rounded-lg border border-cyan-400/30 bg-slate-950/85 p-4">
        <div className="mb-2 flex items-center justify-between font-mono text-[11px] tracking-widest text-cyan-300/90">
          <span>SHORT-RANGE SCAN</span>
          <span className={scan.degraded ? 'text-amber-300' : 'text-slate-400'}>
            {scan.degraded ? 'SCANNER DEGRADED' : 'SCANNER NOMINAL'}
          </span>
        </div>

        <svg
          width={SIZE}
          height={SIZE}
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          className="max-w-full"
          role="img"
          aria-label="Top-down scan of the current sector showing contacts and your ship at the centre."
        >
          <rect x="0" y="0" width={SIZE} height={SIZE} rx="8" fill="#050d14" />
          <circle cx={CENTER} cy={CENTER} r={PLOT_RADIUS} fill="none" stroke="rgba(120,170,200,0.25)" />
          {[1 / 3, 2 / 3].map(fraction => (
            <circle
              key={fraction}
              cx={CENTER}
              cy={CENTER}
              r={PLOT_RADIUS * fraction}
              fill="none"
              stroke="rgba(120,170,200,0.14)"
              strokeDasharray="3 5"
            />
          ))}
          <line x1={CENTER} y1={CENTER - PLOT_RADIUS} x2={CENTER} y2={CENTER + PLOT_RADIUS} stroke="rgba(120,170,200,0.12)" />
          <line x1={CENTER - PLOT_RADIUS} y1={CENTER} x2={CENTER + PLOT_RADIUS} y2={CENTER} stroke="rgba(120,170,200,0.12)" />

          {scan.base && (
            <circle
              cx={CENTER + scan.base.x * scale}
              cy={CENTER + scan.base.y * scale}
              r="9"
              fill="none"
              stroke="#66ffcc"
              strokeWidth="2.5"
            />
          )}

          {scan.contacts.map((contact, index) => {
            const cx = CENTER + contact.x * scale;
            const cy = CENTER + contact.y * scale;
            if (contact.ghost) {
              return (
                <circle
                  key={`ghost-${index}`}
                  cx={cx}
                  cy={cy}
                  r="6"
                  fill="none"
                  stroke={contact.hostile ? 'rgba(255,90,77,0.45)' : 'rgba(150,190,215,0.4)'}
                  strokeWidth="1.5"
                  strokeDasharray="3 3"
                />
              );
            }
            if (!contact.hostile) {
              return <circle key={`rock-${index}`} cx={cx} cy={cy} r="3.5" fill="#6f675e" />;
            }
            // Hostiles are triangles: readable without relying on colour.
            return (
              <polygon
                key={`hostile-${index}`}
                points={`${cx},${cy - 6} ${cx + 6},${cy + 5} ${cx - 6},${cy + 5}`}
                fill="#ff5a4d"
              />
            );
          })}

          <polygon
            points={`${CENTER},${CENTER - 9} ${CENTER + 7},${CENTER + 8} ${CENTER - 7},${CENTER + 8}`}
            fill="#ffffff"
          />
        </svg>

        <div className="mt-2 flex items-center justify-between font-mono text-[10px] text-slate-400">
          <span>
            ▲ HOSTILE · ● ROCK · ⌾ BASE · WHITE = YOU
          </span>
          <span>{scan.range} M RANGE</span>
        </div>

        {scan.ghosts && (
          <p className="mt-2 rounded border border-amber-500/40 bg-amber-500/10 p-2 font-mono text-[10px] text-amber-300">
            DASHED CONTACTS ARE UNRELIABLE — SCANNER DAMAGED
          </p>
        )}

        <button
          type="button"
          onClick={onClose}
          className="mt-3 w-full rounded border border-slate-600 px-4 py-2 font-mono text-xs tracking-widest text-slate-300 transition-colors hover:bg-slate-700/50"
        >
          RETURN TO COCKPIT (L)
        </button>
      </div>
    </div>
  );
}
