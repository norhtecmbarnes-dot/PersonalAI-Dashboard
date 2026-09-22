import { SYSTEM_KEYS, SYSTEM_LABELS, type Mode, type SystemState, type Systems, type ViewMode } from '../core/types';

/**
 * The cockpit: a 2D overlay painted on top of the WebGL world.
 *
 * Why 2D rather than a modelled interior? Crisp text at 4K, zero geometry cost,
 * and complete control over the 1979-style information density the brief asks
 * for. It also never touches React, so the instruments cannot cause a render
 * storm at 60 Hz.
 */

export interface HudContact {
  /** Horizontal offset, -1 (left) .. 1 (right). */
  angle: number;
  /** Vertical offset, -1 (below) .. 1 (above). */
  elevation: number;
  hostile: boolean;
  fore: boolean;
  /** Ships queued out of view are shown as a count, not individual dots. */
  range: number;
}

export interface HudLockBox {
  /** Normalised screen position, -1..1. */
  x: number;
  y: number;
  locked: boolean;
  hostile: boolean;
  label: string;
  range: number;
}

export interface HudDockBox {
  x: number;
  y: number;
  fill: number;
  phase: 'acquire' | 'bracket' | 'transfer' | 'complete';
}

export interface HudState {
  width: number;
  height: number;
  mode: Mode;
  view: ViewMode;
  energy: number;
  energyMax: number;
  hull: number;
  speed: number;
  targetSpeed: number;
  shields: boolean;
  systems: Systems;
  computerOn: boolean;
  tracking: boolean;
  alert: boolean;
  alertPulse: number;
  hitFlash: number;
  message: string;
  prompt: string;
  atBoundary: boolean;
  starDate: number;
  sectorLabel: string;
  enemiesLeft: number;
  basesLeft: number;
  kills: number;
  contacts: HudContact[];
  lockBox: HudLockBox | null;
  dockBox: HudDockBox | null;
  warp: {
    gateX: number;
    gateY: number;
    aimX: number;
    aimY: number;
    aligned: boolean;
    secondsLeft: number;
    cost: number;
    destination: string;
  } | null;
  showDebug: boolean;
  fps: number;
  drawCalls: number;
}

const AMBER = '#ffb347';
const AMBER_DIM = 'rgba(255,179,71,0.28)';
const GREEN = '#7dffb0';
const GREEN_DIM = 'rgba(125,255,176,0.3)';
const RED = '#ff5a4d';
const RED_DIM = 'rgba(255,90,77,0.3)';
const STEEL = '#213040';
const PANEL = 'rgba(10,18,26,0.72)';
const MONO = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';

function systemColor(state: SystemState): { fill: string; dim: string } {
  if (state === 'dead') return { fill: RED, dim: RED_DIM };
  if (state === 'damaged') return { fill: AMBER, dim: AMBER_DIM };
  return { fill: GREEN, dim: GREEN_DIM };
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

export function drawCockpit(ctx: CanvasRenderingContext2D, s: HudState): void {
  const { width: w, height: h } = s;
  // Everything is laid out against a 1280x720 reference and scaled to fit.
  const k = Math.min(w / 1280, h / 720);

  ctx.clearRect(0, 0, w, h);
  ctx.save();
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';

  drawVignette(ctx, w, h, s);
  drawCanopy(ctx, w, h, k, s);
  drawSystemsPanel(ctx, w, k, s);
  drawEnergyPanel(ctx, w, h, k, s);
  drawSpeedLadder(ctx, w, h, k, s);
  drawStatusStrip(ctx, w, h, k, s);
  drawCompass(ctx, w, k, s);
  drawReticle(ctx, w, h, k, s);
  if (s.dockBox) drawDockBox(ctx, w, h, k, s.dockBox);
  if (s.warp) drawWarpGate(ctx, w, h, s.warp);
  if (s.alert) drawAlert(ctx, w, k, s);
  if (s.hitFlash > 0.01) drawHitFlash(ctx, w, h, s.hitFlash);
  if (s.showDebug) drawDebug(ctx, w, h, k, s);

  ctx.restore();
}

function drawVignette(ctx: CanvasRenderingContext2D, w: number, h: number, s: HudState) {
  const gradient = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.32, w / 2, h / 2, Math.max(w, h) * 0.72);
  gradient.addColorStop(0, 'rgba(0,0,0,0)');
  gradient.addColorStop(1, 'rgba(0,0,0,0.6)');

  // A dying hull flickers the frame — damage you can feel without a health bar.
  const flicker = s.hull < 40 ? 0.5 + 0.5 * Math.sin(performance.now() * 0.02) : 1;
  ctx.fillStyle = gradient;
  ctx.globalAlpha = flicker;
  ctx.fillRect(0, 0, w, h);
  ctx.globalAlpha = 1;
}

function drawCanopy(ctx: CanvasRenderingContext2D, w: number, h: number, k: number, s: HudState) {
  // Wear marks on the canopy struts: brighter bars, subtle scuffing.
  ctx.strokeStyle = 'rgba(150,180,210,0.14)';
  ctx.lineWidth = 2 * k;
  ctx.beginPath();
  ctx.moveTo(0, h * 0.08);
  ctx.lineTo(w * 0.14, h * 0.02);
  ctx.moveTo(w, h * 0.08);
  ctx.lineTo(w * 0.86, h * 0.02);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(120,150,180,0.1)';
  ctx.lineWidth = 1 * k;
  for (let i = 0; i < 5; i++) {
    const y = h * (0.16 + i * 0.04);
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w * (0.05 + (i % 3) * 0.01), y + 3 * k);
    ctx.stroke();
  }

  const shieldOn = s.shields && s.systems.shields !== 'dead';
  if (shieldOn) {
    // Hexagonal sheen: visible, never opaque.
    const strength = s.systems.shields === 'damaged' ? 0.07 : 0.12;
    ctx.strokeStyle = `rgba(120,220,255,${strength})`;
    ctx.lineWidth = 1.2 * k;
    const size = 46 * k;
    const dx = size * 1.5;
    const dy = size * Math.sqrt(3);
    for (let row = -1; row < h / dy + 1; row++) {
      for (let col = -1; col < w / dx + 1; col++) {
        const cx = col * dx + (row % 2 ? dx / 2 : 0);
        const cy = row * dy * 0.5;
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const angle = (Math.PI / 3) * i + Math.PI / 6;
          const px = cx + Math.cos(angle) * size * 0.5;
          const py = cy + Math.sin(angle) * size * 0.5;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.stroke();
      }
    }
  }
}

function panel(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, k: number) {
  const gradient = ctx.createLinearGradient(x, y, x, y + h);
  gradient.addColorStop(0, 'rgba(26,40,54,0.85)');
  gradient.addColorStop(1, 'rgba(8,14,20,0.88)');
  ctx.fillStyle = gradient;
  roundRect(ctx, x, y, w, h, 6 * k);
  ctx.fill();
  ctx.strokeStyle = 'rgba(140,175,205,0.22)';
  ctx.lineWidth = 1 * k;
  ctx.stroke();
}

function drawSystemsPanel(ctx: CanvasRenderingContext2D, w: number, k: number, s: HudState) {
  const pw = 132 * k;
  const rowH = 15 * k;
  const pad = 10 * k;
  const ph = SYSTEM_KEYS.length * rowH + pad * 2;
  const x = w - pw - 16 * k;
  const y = 96 * k;

  panel(ctx, x, y, pw, ph, k);

  ctx.font = `${9 * k}px ${MONO}`;
  ctx.fillStyle = 'rgba(190,215,240,0.66)';
  ctx.textAlign = 'left';
  ctx.fillText('SYSTEMS', x + pad, y + pad + 2 * k);

  SYSTEM_KEYS.forEach((key, i) => {
    const rowY = y + pad + 14 * k + i * rowH;
    const { fill, dim } = systemColor(s.systems[key]);

    ctx.fillStyle = fill;
    ctx.font = `${10 * k}px ${MONO}`;
    ctx.fillText(SYSTEM_LABELS[key], x + pad, rowY);

    const barX = x + pw - pad - 34 * k;
    ctx.fillStyle = dim;
    ctx.fillRect(barX, rowY - 3.5 * k, 34 * k, 7 * k);
    ctx.fillStyle = fill;
    const fillWidth = s.systems[key] === 'ok' ? 34 * k : s.systems[key] === 'damaged' ? 19 * k : 6 * k;
    ctx.fillRect(barX, rowY - 3.5 * k, fillWidth, 7 * k);
  });
}

const ENERGY_BAR_WIDTH = 360;

function drawEnergyPanel(ctx: CanvasRenderingContext2D, w: number, h: number, k: number, s: HudState) {
  const pw = ENERGY_BAR_WIDTH * k;
  const ph = 46 * k;
  const x = 20 * k;
  const y = h - ph - 20 * k;
  panel(ctx, x, y, pw, ph, k);

  ctx.font = `${9 * k}px ${MONO}`;
  ctx.fillStyle = 'rgba(190,215,240,0.66)';
  ctx.textAlign = 'left';
  ctx.fillText('ENERGY', x + 12 * k, y + 12 * k);

  const ratio = Math.max(0, Math.min(1, s.energy / s.energyMax));
  const barX = x + 12 * k;
  const barY = y + 24 * k;
  const barW = pw - 24 * k;
  const barH = 12 * k;

  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  ctx.fillRect(barX, barY, barW, barH);

  // Energy colour is a warning system in itself.
  const energyColor = ratio > 0.55 ? GREEN : ratio > 0.22 ? AMBER : RED;
  ctx.fillStyle = energyColor;
  ctx.fillRect(barX, barY, barW * ratio, barH);

  ctx.strokeStyle = 'rgba(140,175,205,0.25)';
  ctx.lineWidth = 1 * k;
  ctx.strokeRect(barX, barY, barW, barH);

  ctx.font = `${13 * k}px ${MONO}`;
  ctx.fillStyle = energyColor;
  ctx.textAlign = 'right';
  ctx.fillText(String(Math.max(0, Math.round(s.energy))), x + pw - 12 * k, y + 12 * k);

  // Hull as a thin sliver under the energy bar — you should notice it, not stare at it.
  const hullRatio = Math.max(0, Math.min(1, s.hull / 100));
  const hullY = y + ph - 4 * k;
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  ctx.fillRect(barX, hullY, barW, 3 * k);
  ctx.fillStyle = hullRatio > 0.6 ? 'rgba(190,215,240,0.7)' : RED;
  ctx.fillRect(barX, hullY, barW * hullRatio, 3 * k);
}

function drawSpeedLadder(ctx: CanvasRenderingContext2D, w: number, h: number, k: number, s: HudState) {
  const cellW = 22 * k;
  const cellH = 22 * k;
  const gap = 3 * k;
  const pw = cellW * 10 + gap * 9 + 20 * k;
  const ph = cellH + 26 * k;
  const x = w - pw - 20 * k;
  const y = h - ph - 20 * k;
  panel(ctx, x, y, pw, ph, k);

  ctx.font = `${9 * k}px ${MONO}`;
  ctx.fillStyle = 'rgba(190,215,240,0.66)';
  ctx.textAlign = 'left';
  ctx.fillText('SPEED', x + 10 * k, y + 12 * k);
  ctx.textAlign = 'right';
  ctx.fillStyle = AMBER;
  ctx.font = `${13 * k}px ${MONO}`;
  ctx.fillText(String(Math.round(s.speed)), x + pw - 10 * k, y + 12 * k);

  for (let i = 0; i < 10; i++) {
    const cx = x + 10 * k + i * (cellW + gap);
    const cy = y + 24 * k;
    const active = i <= Math.round(s.speed);
    const commanded = i === s.targetSpeed;

    ctx.fillStyle = active ? 'rgba(255,179,71,0.85)' : 'rgba(255,255,255,0.07)';
    ctx.fillRect(cx, cy, cellW, cellH);
    if (commanded) {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5 * k;
      ctx.strokeRect(cx, cy, cellW, cellH);
    }
    ctx.fillStyle = active ? 'rgba(10,18,26,0.9)' : 'rgba(190,215,240,0.45)';
    ctx.font = `${10 * k}px ${MONO}`;
    ctx.textAlign = 'center';
    ctx.fillText(String(i), cx + cellW / 2, cy + cellH / 2);
  }
}

function drawStatusStrip(ctx: CanvasRenderingContext2D, w: number, h: number, k: number, s: HudState) {
  const line = `${s.sectorLabel}   STARDATE ${s.starDate}   HOSTILES ${s.enemiesLeft}   BASES ${s.basesLeft}   KILLS ${s.kills}`;
  ctx.font = `${11 * k}px ${MONO}`;
  ctx.textAlign = 'left';
  ctx.fillStyle = 'rgba(190,215,240,0.72)';
  ctx.fillText(line, 20 * k, 20 * k);

  // View indicator: always tell the player which way they are looking.
  const label = s.view === 'fore' ? 'FORE' : 'AFT';
  ctx.textAlign = 'center';
  ctx.font = `${13 * k}px ${MONO}`;
  ctx.fillStyle = s.view === 'aft' ? AMBER : 'rgba(190,215,240,0.8)';
  ctx.fillText(label, w / 2, h - 96 * k);

  if (s.prompt) {
    ctx.font = `${12 * k}px ${MONO}`;
    ctx.fillStyle = GREEN;
    ctx.fillText(s.prompt, w / 2, h - 74 * k);
  }

  if (s.message) {
    ctx.font = `${13 * k}px ${MONO}`;
    ctx.fillStyle = AMBER;
    ctx.fillText(s.message, w / 2, h - 52 * k);
  }

  if (s.atBoundary) {
    ctx.font = `${12 * k}px ${MONO}`;
    ctx.fillStyle = RED;
    ctx.fillText('SECTOR BOUNDARY', w / 2, 44 * k);
  }
}

function drawCompass(ctx: CanvasRenderingContext2D, w: number, k: number, s: HudState) {
  const stripW = 420 * k;
  const x = (w - stripW) / 2;
  const y = 40 * k;
  const horizon = y + 22 * k;

  ctx.fillStyle = PANEL;
  roundRect(ctx, x, y, stripW, 44 * k, 4 * k);
  ctx.fill();

  ctx.strokeStyle = 'rgba(190,215,240,0.3)';
  ctx.lineWidth = 1 * k;
  ctx.beginPath();
  ctx.moveTo(x + 8 * k, horizon);
  ctx.lineTo(x + stripW - 8 * k, horizon);
  ctx.stroke();

  ctx.font = `${8 * k}px ${MONO}`;
  ctx.fillStyle = 'rgba(190,215,240,0.5)';
  ctx.textAlign = 'left';
  ctx.fillText('FORE', x + 8 * k, y + 9 * k);
  ctx.fillText('AFT', x + 8 * k, y + 35 * k);

  for (const contact of s.contacts) {
    const angle = Math.max(-1, Math.min(1, contact.angle));
    const cx = x + stripW / 2 + angle * (stripW / 2 - 14 * k);
    // Fore contacts sit above the horizon line, aft contacts below it.
    const offset = Math.max(-1, Math.min(1, contact.elevation)) * 10 * k;
    const cy = contact.fore ? horizon - 10 * k - offset : horizon + 10 * k + offset;

    ctx.beginPath();
    if (contact.hostile) {
      // Shape as well as colour, so the cue survives colour blindness.
      ctx.moveTo(cx, cy - 5 * k);
      ctx.lineTo(cx + 5 * k, cy + 4 * k);
      ctx.lineTo(cx - 5 * k, cy + 4 * k);
      ctx.closePath();
      ctx.fillStyle = RED;
    } else {
      ctx.arc(cx, cy, 4.5 * k, 0, Math.PI * 2);
      ctx.fillStyle = '#66ffcc';
    }
    ctx.fill();
  }
}

function drawReticle(ctx: CanvasRenderingContext2D, w: number, h: number, k: number, s: HudState) {
  const cx = w / 2;
  const cy = h / 2;

  ctx.strokeStyle = s.computerOn ? GREEN : 'rgba(190,215,240,0.55)';
  ctx.lineWidth = 1.4 * k;
  ctx.beginPath();
  ctx.arc(cx, cy, 22 * k, 0, Math.PI * 2);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(cx - 34 * k, cy);
  ctx.lineTo(cx - 12 * k, cy);
  ctx.moveTo(cx + 12 * k, cy);
  ctx.lineTo(cx + 34 * k, cy);
  ctx.moveTo(cx, cy - 34 * k);
  ctx.lineTo(cx, cy - 12 * k);
  ctx.moveTo(cx, cy + 12 * k);
  ctx.lineTo(cx, cy + 34 * k);
  ctx.stroke();

  if (!s.lockBox) return;

  const lock = s.lockBox;
  const lx = cx + Math.max(-1, Math.min(1, lock.x)) * (w / 2);
  const ly = cy - Math.max(-1, Math.min(1, lock.y)) * (h / 2);
  const size = Math.max(14, 90 * k * (2000 / Math.max(400, lock.range)));

  ctx.strokeStyle = lock.locked ? (lock.hostile ? RED : '#66ffcc') : 'rgba(190,215,240,0.5)';
  ctx.lineWidth = 1.6 * k;
  const half = size / 2;
  const arm = half * 0.5;
  ctx.beginPath();
  // Corner brackets, not a full box — keeps the pip readable.
  ctx.moveTo(lx - half, ly - half + arm);
  ctx.lineTo(lx - half, ly - half);
  ctx.lineTo(lx - half + arm, ly - half);
  ctx.moveTo(lx + half - arm, ly - half);
  ctx.lineTo(lx + half, ly - half);
  ctx.lineTo(lx + half, ly - half + arm);
  ctx.moveTo(lx + half, ly + half - arm);
  ctx.lineTo(lx + half, ly + half);
  ctx.lineTo(lx + half - arm, ly + half);
  ctx.moveTo(lx - half + arm, ly + half);
  ctx.lineTo(lx - half, ly + half);
  ctx.lineTo(lx - half, ly + half - arm);
  ctx.stroke();

  if (lock.locked && lock.hostile) {
    ctx.fillStyle = RED;
    ctx.beginPath();
    ctx.arc(lx, ly, 3 * k, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.font = `${10 * k}px ${MONO}`;
  ctx.fillStyle = lock.locked ? (lock.hostile ? RED : GREEN) : 'rgba(190,215,240,0.7)';
  ctx.textAlign = 'center';
  ctx.fillText(`${lock.label}  ${Math.round(lock.range)}m`, lx, ly + half + 12 * k);
  ctx.fillText(s.tracking ? 'TRACK' : s.computerOn ? 'COMPUTER' : 'MANUAL', lx, ly - half - 10 * k);
}

function drawDockBox(ctx: CanvasRenderingContext2D, w: number, h: number, k: number, box: HudDockBox) {
  const cx = w / 2 + Math.max(-1, Math.min(1, box.x)) * (w / 2);
  const cy = h / 2 - Math.max(-1, Math.min(1, box.y)) * (h / 2);
  const outer = 150 * k;
  const inner = outer * (1 - box.fill * 0.72);

  ctx.strokeStyle = box.phase === 'transfer' ? GREEN : AMBER;
  ctx.lineWidth = 2 * k;
  for (const sign of [-1, 1]) {
    for (const vsign of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(cx + sign * outer, cy + vsign * inner);
      ctx.lineTo(cx + sign * outer, cy + vsign * outer);
      ctx.lineTo(cx + sign * inner, cy + vsign * outer);
      ctx.stroke();
    }
  }
}

function drawWarpGate(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  warp: NonNullable<HudState['warp']>,
) {
  const cx = w / 2;
  const cy = h / 2;
  const gx = cx + warp.gateX * w;
  const gy = cy - warp.gateY * h;
  const ax = cx + warp.aimX * w;
  const ay = cy - warp.aimY * h;

  // The gate: a ring that closes as it drifts away from the pip.
  const color = warp.aligned ? GREEN : AMBER;
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(gx, gy, warp.aligned ? 26 : 34, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(gx, gy, 7, 0, Math.PI * 2);
  ctx.stroke();

  // The nose pip.
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(ax - 12, ay);
  ctx.lineTo(ax + 12, ay);
  ctx.moveTo(ax, ay - 12);
  ctx.lineTo(ax, ay + 12);
  ctx.stroke();

  ctx.font = `13px ${MONO}`;
  ctx.textAlign = 'center';
  ctx.fillStyle = color;
  ctx.fillText(
    `${warp.destination}   ${Math.max(0, warp.secondsLeft).toFixed(1)}s   ${warp.cost} ENERGY`,
    cx,
    h - 130,
  );
  ctx.fillStyle = warp.aligned ? GREEN : AMBER;
  ctx.fillText(warp.aligned ? 'ALIGNED — HOLD WARP' : 'ALIGN NOSE PIP ON GATE', cx, h - 110);
}

function drawAlert(ctx: CanvasRenderingContext2D, w: number, k: number, s: HudState) {
  const alpha = 0.45 + 0.55 * Math.abs(Math.sin(s.alertPulse * 4));
  ctx.globalAlpha = alpha;
  ctx.fillStyle = RED;
  ctx.font = `${20 * k}px ${MONO}`;
  ctx.textAlign = 'center';
  ctx.fillText('RED ALERT', w / 2, 74 * k);
  ctx.globalAlpha = 1;
}

function drawHitFlash(ctx: CanvasRenderingContext2D, w: number, h: number, flash: number) {
  ctx.fillStyle = `rgba(255,90,60,${0.28 * flash})`;
  ctx.fillRect(0, 0, w, h);
}

function drawDebug(ctx: CanvasRenderingContext2D, w: number, h: number, k: number, s: HudState) {
  ctx.font = `${10 * k}px ${MONO}`;
  ctx.fillStyle = 'rgba(125,255,176,0.75)';
  ctx.textAlign = 'right';
  ctx.fillText(`${s.fps.toFixed(0)} fps   ${s.drawCalls} calls   ${s.mode}   ${s.view}`, w - 16 * k, h - 12 * k);
}
