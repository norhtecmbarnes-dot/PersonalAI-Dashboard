import type { Vec3 } from './vec';

/**
 * Shared simulation types. Deliberately renderer-agnostic: nothing in here
 * imports Three.js, so the sim can be stepped without a canvas.
 */

/** PESCLR-style damageable systems. Order matters: it is the HUD row order. */
export type SystemKey = 'weapons' | 'engines' | 'shields' | 'computer' | 'scanner' | 'radio';

export const SYSTEM_KEYS: SystemKey[] = [
  'weapons',
  'engines',
  'shields',
  'computer',
  'scanner',
  'radio',
];

export const SYSTEM_LABELS: Record<SystemKey, string> = {
  weapons: 'WEAPONS',
  engines: 'ENGINES',
  shields: 'SHIELDS',
  computer: 'COMPUTER',
  scanner: 'SCANNER',
  radio: 'RADIO',
};

export type SystemState = 'ok' | 'damaged' | 'dead';

export type Systems = Record<SystemKey, SystemState>;

export function healthySystems(): Systems {
  return {
    weapons: 'ok',
    engines: 'ok',
    shields: 'ok',
    computer: 'ok',
    scanner: 'ok',
    radio: 'ok',
  };
}

/**
 * Modes replace the cockpit view (chart, scan) or freeze it (docking,
 * rank). 'flying' is the only mode that runs combat.
 */
export type Mode = 'title' | 'flying' | 'chart' | 'scan' | 'warp' | 'docking' | 'docked' | 'rank';

export type ViewMode = 'fore' | 'aft';

export type CellKind = 'empty' | 'asteroids' | 'patrol' | 'taskforce' | 'fleet' | 'base';

export interface GalaxyCell {
  x: number;
  y: number;
  kind: CellKind;
  /** Enemy ships still alive in this cell. */
  enemies: number;
  base: boolean;
  baseAlive: boolean;
  /** Seconds an enemy group has been sitting on this base. */
  surroundSeconds: number;
  visited: boolean;
  /** Seeded visual variation for this cell's sector. */
  seed: number;
}

export interface Galaxy {
  width: number;
  height: number;
  cells: GalaxyCell[];
  playerX: number;
  playerY: number;
  startingEnemyGroups: number;
  startingBases: number;
  starDate: number;
  starDateTimer: number;
}

export interface Projectile {
  active: boolean;
  friendly: boolean;
  pos: Vec3;
  vel: Vec3;
  life: number;
  maxLife: number;
  /** Per-shooter damage (heavy classes hit harder, Anvil pierces shields). */
  damage?: { hull: number; energy: number; pierce?: number };
}

export type EnemyKind = 'dart' | 'lance' | 'anvil';
export type EnemyState = 'queue' | 'approach' | 'attack' | 'jink' | 'break';

export interface EnemyShip {
  active: boolean;
  kind: EnemyKind;
  pos: Vec3;
  vel: Vec3;
  heading: Vec3;
  hull: number;
  maxHull: number;
  state: EnemyState;
  fireTimer: number;
  jinkTimer: number;
  /** General-purpose timer for the current state (jink length, break length). */
  stateTimer: number;
  /** True when this ship's temperament is to swing behind the player. */
  prefersAft: boolean;
  jinkDir: Vec3;
  /** Only detailed attackers are drawn and simulated at full fidelity. */
  detail: boolean;
  queueTimer: number;
  seed: number;
  engineHue: number;
  /**
   * A training drone: shoots at nothing and scores nothing. One is seeded into
   * the opening sector so a brand-new player can practise gunnery with zero
   * risk — this is what makes the 90-second comprehension goal reachable.
   */
  drone: boolean;
}

export interface Asteroid {
  pos: Vec3;
  radius: number;
  spin: Vec3;
  angle: number;
  seed: number;
}

export interface PlayerState {
  pos: Vec3;
  heading: Vec3;
  up: Vec3;
  right: Vec3;
  pitch: number;
  yaw: number;
  roll: number;
  speed: number;
  targetSpeed: number;
  shields: boolean;
  energy: number;
  hull: number;
  systems: Systems;
  fireTimer: number;
  tube: 0 | 1;
  tracking: boolean;
  targetIndex: number;
}

export interface MissionStats {
  kills: number;
  energyUsed: number;
  seconds: number;
  basesLostToEnemy: number;
  basesYouKilled: number;
  warpMisses: number;
  warps: number;
  deaths: number;
  outcome: 'success' | 'abort' | 'destroyed';
}

export interface RankResult {
  score: number;
  title: string;
  reason: string;
  difficulty: string;
  previousBest: number | null;
  isPersonalBest: boolean;
  stats: MissionStats;
}

export interface ChartCursor {
  x: number;
  y: number;
}

export interface WarpPlan {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  distance: number;
  cost: number;
  affordable: boolean;
}
