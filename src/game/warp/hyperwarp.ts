import { TUNING, type Difficulty } from '../data/schema';
import { clamp } from '../core/vec';

/**
 * Hyperwarp, keeping the original's mini-game. The gate marker drifts; you keep
 * the nose pip on it and hold Warp. Miss, and you come out of the tunnel in a
 * neighbouring cell — possibly worse than the one you wanted.
 *
 * Novice auto-alignment is a real assist (the aim is dragged onto the gate),
 * not a difficulty flag that changes numbers behind your back.
 */

export interface WarpState {
  active: boolean;
  elapsed: number;
  duration: number;
  /** Gate position in aim space, roughly -0.5..0.5. */
  gateX: number;
  gateY: number;
  targetX: number;
  targetY: number;
  driftTimer: number;
  /** Player nose pip position in the same space. */
  aimX: number;
  aimY: number;
  aligned: boolean;
  alignedSeconds: number;
  aborted: boolean;
  autoAlign: boolean;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  distance: number;
  cost: number;
}

export interface WarpAimInput {
  yaw: number;
  pitch: number;
  mouseDx: number;
  mouseDy: number;
}

export function beginWarp(
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  difficulty: Difficulty,
): WarpState {
  const cfg = TUNING.warp;
  const dx = toX - fromX;
  const dy = toY - fromY;
  const distance = Math.sqrt(dx * dx + dy * dy);
  const gate = randomGateOffset(cfg.gateRadius);

  return {
    active: true,
    elapsed: 0,
    duration: cfg.minSeconds + Math.random() * (cfg.maxSeconds - cfg.minSeconds),
    gateX: gate.x,
    gateY: gate.y,
    targetX: gate.x,
    targetY: gate.y,
    driftTimer: 1,
    aimX: 0,
    aimY: 0,
    aligned: false,
    alignedSeconds: 0,
    aborted: false,
    autoAlign: difficulty.autoAlign,
    fromX,
    fromY,
    toX,
    toY,
    distance,
    cost: Math.round(distance * TUNING.energy.warpPerDistance),
  };
}

function randomGateOffset(radius: number): { x: number; y: number } {
  const angle = Math.random() * Math.PI * 2;
  const magnitude = radius * (0.35 + Math.random() * 0.65);
  return { x: Math.cos(angle) * magnitude, y: Math.sin(angle) * magnitude };
}

export function updateWarp(warp: WarpState, dt: number, input: WarpAimInput): void {
  if (!warp.active || warp.aborted) return;
  const cfg = TUNING.warp;

  // The gate never sits still — it wanders, slowly enough to be trackable.
  warp.driftTimer -= dt;
  if (warp.driftTimer <= 0) {
    warp.driftTimer = 0.9 + Math.random() * 1.3;
    const next = randomGateOffset(cfg.gateRadius);
    warp.targetX = next.x;
    warp.targetY = next.y;
  }
  const driftAlpha = 1 - Math.exp(-cfg.gateDriftRate * 6 * dt);
  warp.gateX += (warp.targetX - warp.gateX) * driftAlpha;
  warp.gateY += (warp.targetY - warp.gateY) * driftAlpha;

  // Player pip control: rate from keyboard/gamepad, direct from the mouse.
  warp.aimX += input.yaw * 0.75 * dt + input.mouseDx * 0.0013;
  warp.aimY -= input.pitch * 0.75 * dt + input.mouseDy * 0.0013;
  warp.aimX = clamp(warp.aimX, -0.5, 0.5);
  warp.aimY = clamp(warp.aimY, -0.5, 0.5);

  if (warp.autoAlign) {
    const drag = 1 - Math.exp(-3.2 * dt);
    warp.aimX += (warp.gateX - warp.aimX) * drag;
    warp.aimY += (warp.gateY - warp.aimY) * drag;
  }

  const error = Math.hypot(warp.aimX - warp.gateX, warp.aimY - warp.gateY);
  warp.aligned = error < cfg.alignTolerance;
  if (warp.aligned) warp.alignedSeconds += dt;

  warp.elapsed += dt;
}

export type WarpOutcome = 'pending' | 'aligned' | 'miss' | 'aborted';

export function warpOutcome(warp: WarpState): WarpOutcome {
  if (warp.aborted) return 'aborted';
  if (warp.elapsed < warp.duration) return 'pending';
  return warp.aligned ? 'aligned' : 'miss';
}

/**
 * A missed warp drops you in a neighbouring cell — sometimes worse than the one
 * you aimed at, which is the whole point of getting it right.
 */
export function missedDestination(
  warp: WarpState,
  gridWidth: number,
  gridHeight: number,
): { x: number; y: number } {
  const options: { x: number; y: number }[] = [];
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue;
      const x = warp.toX + dx;
      const y = warp.toY + dy;
      if (x < 0 || y < 0 || x >= gridWidth || y >= gridHeight) continue;
      options.push({ x, y });
    }
  }
  if (options.length === 0) return { x: warp.toX, y: warp.toY };

  if (Math.random() < TUNING.warp.missAdjacentChance) {
    return options[Math.floor(Math.random() * options.length)];
  }
  return {
    x: clamp(warp.toX + Math.floor((Math.random() - 0.5) * 5), 0, gridWidth - 1),
    y: clamp(warp.toY + Math.floor((Math.random() - 0.5) * 5), 0, gridHeight - 1),
  };
}
