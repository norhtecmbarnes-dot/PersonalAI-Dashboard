import { TUNING } from '../data/schema';

/**
 * Docking keeps the original ritual: get the base in the fore view, hold a
 * docking speed of 3-5, and let the brackets fill. Once they lock, the stick
 * freezes for a few seconds while the base restores you.
 *
 * Moving during the transfer cancels it — the ritual costs you something, which
 * is what makes slipping in under fire tense.
 */

export type DockPhase = 'acquire' | 'bracket' | 'transfer' | 'complete';

export interface DockState {
  active: boolean;
  phase: DockPhase;
  /** 0..1 bracket fill. */
  fill: number;
  elapsed: number;
  baseX: number;
  baseY: number;
  cancelled: boolean;
}

export interface DockInput {
  speed: number;
  /** dot(baseDirection, shipHeading): 1 is dead centre. */
  centeredness: number;
  /** Distance to the base, in world units. */
  range: number;
  /** True when the player touched the stick or throttle this frame. */
  moving: boolean;
}

export function beginDock(baseX: number, baseY: number): DockState {
  return {
    active: true,
    phase: 'acquire',
    fill: 0,
    elapsed: 0,
    baseX,
    baseY,
    cancelled: false,
  };
}

export function updateDock(state: DockState, input: DockInput, dt: number): DockState {
  const cfg = TUNING.base;
  if (!state.active) return state;

  if (state.phase === 'transfer') {
    if (input.moving) {
      return { ...state, active: false, cancelled: true };
    }
    state.elapsed += dt;
    if (state.elapsed >= cfg.transferSeconds) {
      return { ...state, phase: 'complete', active: false };
    }
    return state;
  }

  const inSpeedWindow = input.speed >= cfg.bracketSpeedMin && input.speed <= cfg.bracketSpeedMax;
  const centered = input.centeredness >= cfg.acquireDot;
  const inRange = input.range <= cfg.dockRange;

  if (state.phase === 'acquire') {
    if (inSpeedWindow && centered && inRange) {
      state.phase = 'bracket';
      state.fill = 0;
    }
    return state;
  }

  // bracket phase: the brackets only fill while you hold the approach. A
  // wobble decays progress rather than erasing it — the ritual should demand
  // concentration, not a perfect first pass.
  const holding = inRange && centered && inSpeedWindow;
  if (holding) {
    state.fill = Math.min(1, state.fill + dt / cfg.bracketFillSeconds);
  } else {
    state.fill = Math.max(0, state.fill - dt / (cfg.bracketFillSeconds * 1.5));
  }

  if (state.fill <= 0) {
    state.phase = 'acquire';
    return state;
  }

  if (state.fill >= 1) {
    state.phase = 'transfer';
    state.elapsed = 0;
  }

  return state;
}

export function dockPrompt(state: DockState, centered: boolean, inRange: boolean): string {
  const cfg = TUNING.base;
  if (state.phase === 'transfer') return 'ORBIT ESTABLISHED — FREEZE STICK';
  if (!inRange) return 'CLOSING ON BASE';
  if (!centered) return 'CENTRE BASE IN RETICLE';
  if (state.phase === 'bracket') return `DOCKING ${Math.round(state.fill * 100)}%`;
  return `SET SPEED ${cfg.bracketSpeedMin}-${cfg.bracketSpeedMax} TO DOCK`;
}
