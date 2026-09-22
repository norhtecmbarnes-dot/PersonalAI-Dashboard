'use client';

import type { ChartCellView, ChartSnapshot } from '../engine';

interface ChartPanelProps {
  chart: ChartSnapshot;
  onMove: (dx: number, dy: number) => void;
  onSelect: (x: number, y: number) => void;
  onWarp: () => void;
  onClose: () => void;
}

const CELL = 66;
const PAD = 10;

/**
 * The chart is the second half of the game. It is drawn as crisp SVG rather
 * than in-world geometry so it stays readable at any resolution — and so the
 * whole war is legible in about two seconds, which is the real requirement.
 */
export function ChartPanel({ chart, onMove, onSelect, onWarp, onClose }: ChartPanelProps) {
  const boardW = chart.width * CELL;
  const boardH = chart.height * CELL;

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/78 p-4 backdrop-blur-sm">
      <div className="flex w-full max-w-5xl flex-col gap-4 lg:flex-row">
        <div className="rounded-lg border border-cyan-400/30 bg-slate-950/80 p-3">
          <div className="mb-2 flex items-center justify-between font-mono text-[11px] tracking-widest text-cyan-300/90">
            <span>GALACTIC CHART</span>
            <span className="text-slate-400">
              STARDATE {chart.starDate} · ENERGY {chart.energy}
            </span>
          </div>

          <svg
            width={boardW + PAD * 2}
            height={boardH + PAD * 2}
            viewBox={`${-PAD} ${-PAD} ${boardW + PAD * 2} ${boardH + PAD * 2}`}
            className="max-w-full"
            role="img"
            aria-label={`Galactic chart, ${chart.width} by ${chart.height} sectors. You are in sector ${chart.playerX + 1} by ${chart.playerY + 1}.`}
          >
            <defs>
              <radialGradient id="chartGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#0b2a38" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#05080f" stopOpacity="0.95" />
              </radialGradient>
            </defs>
            <rect x={-PAD} y={-PAD} width={boardW + PAD * 2} height={boardH + PAD * 2} fill="url(#chartGlow)" />

            {chart.cells.map(cell => (
              <ChartCell
                key={`${cell.x}-${cell.y}`}
                cell={cell}
                isCursor={cell.x === chart.cursorX && cell.y === chart.cursorY}
                onSelect={() => onSelect(cell.x, cell.y)}
              />
            ))}
          </svg>

          <p className="mt-2 font-mono text-[10px] text-slate-500">
            ARROWS MOVE · CLICK A CELL · ENTER (OR HOLD H) TO WARP · G CLOSES
          </p>
        </div>

        <div className="w-full shrink-0 rounded-lg border border-cyan-400/30 bg-slate-950/80 p-4 lg:w-72">
          <h2 className="font-mono text-[11px] tracking-widest text-cyan-300/90">SELECTED SECTOR</h2>
          <p className="mt-2 font-mono text-sm text-white">
            {chart.cursorX + 1}-{chart.cursorY + 1}
          </p>

          {chart.plan ? (
            <>
              <p className="mt-1 font-mono text-xs text-amber-300">{chart.plan.label}</p>
              <dl className="mt-4 space-y-2 font-mono text-[11px]">
                <div className="flex justify-between text-slate-400">
                  <dt>DISTANCE</dt>
                  <dd className="text-slate-200">{chart.plan.distance.toFixed(1)}</dd>
                </div>
                <div className="flex justify-between text-slate-400">
                  <dt>WARP COST</dt>
                  <dd className={chart.plan.affordable ? 'text-emerald-300' : 'text-red-400'}>
                    {chart.plan.cost}
                  </dd>
                </div>
                <div className="flex justify-between text-slate-400">
                  <dt>ENERGY LEFT</dt>
                  <dd className={chart.plan.affordable ? 'text-slate-200' : 'text-red-400'}>
                    {chart.energy - chart.plan.cost}
                  </dd>
                </div>
              </dl>
            </>
          ) : (
            <p className="mt-3 font-mono text-xs text-slate-400">YOU ARE HERE — STATION KEEPING</p>
          )}

          {chart.hostilesInSector > 0 && (
            <p className="mt-4 rounded border border-red-500/50 bg-red-500/10 p-2 font-mono text-[11px] text-red-300">
              {chart.hostilesInSector} HOSTILE{chart.hostilesInSector === 1 ? '' : 'S'} STILL IN THIS SECTOR
            </p>
          )}

          <div className="mt-4 flex flex-col gap-2">
            <button
              type="button"
              onClick={onWarp}
              disabled={!chart.plan?.affordable || !chart.plan}
              className="rounded border border-amber-400/70 bg-amber-400/15 px-4 py-2 font-mono text-xs tracking-widest text-amber-200 transition-colors hover:bg-amber-400/25 disabled:cursor-not-allowed disabled:border-slate-700 disabled:bg-transparent disabled:text-slate-600"
            >
              ENGAGE WARP
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded border border-slate-600 px-4 py-2 font-mono text-xs tracking-widest text-slate-300 transition-colors hover:bg-slate-700/50"
            >
              RETURN TO COCKPIT
            </button>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-1 font-mono text-[9px] text-slate-400">
            <MoveButton label="◀" onClick={() => onMove(-1, 0)} />
            <MoveButton label="▲" onClick={() => onMove(0, -1)} />
            <MoveButton label="▼" onClick={() => onMove(0, 1)} />
            <MoveButton label="▶" onClick={() => onMove(1, 0)} />
          </div>

          <Legend />
        </div>
      </div>
    </div>
  );
}

function MoveButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded border border-slate-700 py-1.5 text-slate-300 transition-colors hover:bg-slate-700/50"
    >
      {label}
    </button>
  );
}

function Legend() {
  return (
    <div className="mt-4 space-y-1.5 border-t border-slate-700/70 pt-3 font-mono text-[9px] text-slate-400">
      <LegendRow label="PATROL (2)" shape="triangle" tone="#ff8a5c" />
      <LegendRow label="TASK FORCE (3)" shape="square" tone="#ff5a4d" />
      <LegendRow label="FLEET (4)" shape="diamond" tone="#ff2d55" />
      <LegendRow label="HELION BASE" shape="ring" tone="#66ffcc" />
      <LegendRow label="ASTEROIDS" shape="dots" tone="#8b8377" />
      <LegendRow label="YOU" shape="arrow" tone="#ffffff" />
    </div>
  );
}

function LegendRow({
  label,
  shape,
  tone,
}: {
  label: string;
  shape: 'triangle' | 'square' | 'diamond' | 'ring' | 'dots' | 'arrow';
  tone: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
        {shape === 'triangle' && <polygon points="7,2 12,11 2,11" fill={tone} />}
        {shape === 'square' && <rect x="2.5" y="2.5" width="9" height="9" fill={tone} />}
        {shape === 'diamond' && <polygon points="7,1 13,7 7,13 1,7" fill={tone} />}
        {shape === 'ring' && <circle cx="7" cy="7" r="5" fill="none" stroke={tone} strokeWidth="2" />}
        {shape === 'dots' && (
          <>
            <circle cx="4" cy="5" r="1.6" fill={tone} />
            <circle cx="9" cy="9" r="1.6" fill={tone} />
          </>
        )}
        {shape === 'arrow' && <polygon points="7,1 11,12 7,9 3,12" fill={tone} />}
      </svg>
      <span>{label}</span>
    </div>
  );
}

function ChartCell({
  cell,
  isCursor,
  onSelect,
}: {
  cell: ChartCellView;
  isCursor: boolean;
  onSelect: () => void;
}) {
  const x = cell.x * CELL;
  const y = cell.y * CELL;
  const cx = x + CELL / 2;
  const cy = y + CELL / 2;

  return (
    <g onClick={onSelect} style={{ cursor: 'pointer' }}>
      <rect x={x + 2} y={y + 2} width={CELL - 4} height={CELL - 4} rx={4} fill="#0a1520" />
      <rect
        x={x + 2}
        y={y + 2}
        width={CELL - 4}
        height={CELL - 4}
        rx={4}
        fill="none"
        stroke={isCursor ? '#ffb347' : 'rgba(120,170,200,0.25)'}
        strokeWidth={isCursor ? 2 : 1}
      />

      {/* Threat: shape AND colour, so the cue survives colour blindness. */}
      {!cell.base && cell.enemies >= 4 && <polygon points={`${cx},${cy - 17} ${cx + 17},${cy} ${cx},${cy + 17} ${cx - 17},${cy}`} fill="#ff2d55" />}
      {!cell.base && cell.enemies === 3 && <rect x={cx - 14} y={cy - 14} width={28} height={28} fill="#ff5a4d" />}
      {!cell.base && cell.enemies === 2 && <polygon points={`${cx},${cy - 16} ${cx + 15},${cy + 12} ${cx - 15},${cy + 12}`} fill="#ff8a5c" />}

      {/* Base: a ring, struck through when destroyed. */}
      {cell.base && (
        <>
          <circle
            cx={cx}
            cy={cy}
            r={16}
            fill="none"
            stroke={cell.baseAlive ? '#66ffcc' : '#3d4a55'}
            strokeWidth={3}
          />
          {cell.baseAlive && <circle cx={cx} cy={cy} r={5} fill="#66ffcc" />}
          {!cell.baseAlive && (
            <path d={`M${cx - 12},${cy - 12} L${cx + 12},${cy + 12} M${cx + 12},${cy - 12} L${cx - 12},${cy + 12}`} stroke="#7a2b2b" strokeWidth="3" />
          )}
        </>
      )}

      {cell.kind === 'asteroids' && !cell.base && cell.enemies === 0 && (
        <>
          <circle cx={cx - 9} cy={cy - 6} r="4" fill="#8b8377" />
          <circle cx={cx + 8} cy={cy + 4} r="6" fill="#6f675e" />
          <circle cx={cx + 3} cy={cy - 12} r="3" fill="#8b8377" />
        </>
      )}

      {cell.kind === 'empty' && !cell.base && cell.enemies === 0 && (
        <circle cx={cx} cy={cy} r="2" fill="rgba(150,190,215,0.22)" />
      )}

      {cell.enemies > 0 && (
        <text x={cx} y={cy + 5} textAnchor="middle" fontSize="13" fontFamily="ui-monospace, monospace" fontWeight="bold" fill="#0b0f14">
          {cell.enemies}
        </text>
      )}

      {cell.surrounded && (
        <circle cx={cx} cy={cy} r="22" fill="none" stroke="#ff5a4d" strokeWidth="1.5" strokeDasharray="4 4" />
      )}

      {cell.isPlayer && (
        <polygon points={`${cx - 26},${cy - 8} ${cx - 26},${cy + 8} ${cx - 15},${cy}`} fill="#ffffff" />
      )}

      {!cell.visited && <circle cx={x + 9} cy={y + 9} r="2" fill="rgba(150,190,215,0.35)" />}
    </g>
  );
}
