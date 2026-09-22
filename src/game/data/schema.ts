import tuningJson from './tuning.json';
import difficultiesJson from './difficulties.json';

/**
 * Typed accessors for the two data files that drive the whole game.
 *
 * The brief's rule: "Expose all drains, enemy HP, warp drift in a single
 * tuning.json so iteration does not require code change." So nothing in the
 * game may hard-code a gameplay number — it comes from here.
 */

export type Range = [number, number];

export interface Tuning {
  sector: {
    radius: number;
    gridWidth: number;
    gridHeight: number;
    dustCount: number;
    starCount: number;
    droneCount: number;
  };
  ship: {
    maxSpeed: number;
    cruiseSpeed: number;
    defaultSpeedAfterWarp: number;
    unitsPerSpeed: number;
    speedLerp: number;
    pitchRate: number;
    yawRate: number;
    aftYawInvert: boolean;
    bankFactor: number;
    mouseSensitivity: number;
    deadStickEngines: number;
  };
  energy: {
    start: number;
    drainScale: number;
    photon: number;
    boltIntercept: number;
    shieldsPerSecond: number;
    computerPerSecond: number;
    speedPerSecondBase: number;
    speedPerSecondPerUnit: number;
    warpPerDistance: number;
    warpAbortFee: number;
    baseRestore: number;
  };
  hull: { start: number };
  weapons: {
    photonSpeed: number;
    photonLife: number;
    photonDamage: number;
    tubeCooldown: number;
    hitRadius: number;
    interceptRadius: number;
    damagedTubePenalty: number;
    trackingAssist: number;
    damagedTrackingAssist: number;
  };
  damage: {
    unshieldedHitHull: Range;
    unshieldedHitEnergy: Range;
    shieldedHitEnergy: number;
    asteroidHull: number;
    asteroidEnergy: Range;
    systemDegradeChance: number;
    systemKillChance: number;
  };
  enemies: {
    dart: {
      hull: number;
      speed: number;
      speedVariance: number;
      turnRate: number;
      engageRange: number;
      standoffRange: number;
      fireCooldown: Range;
      boltSpeed: number;
      boltLife: number;
      boltHull: number;
      boltEnergy: number;
      accuracy: number;
      leadFudge: number;
      aftBias: number;
      jinkInterval: Range;
      jinkStrength: number;
      separation: number;
    };
    lance: {
      hull: number;
      speed: number;
      speedVariance: number;
      turnRate: number;
      engageRange: number;
      standoffRange: number;
      fireCooldown: Range;
      boltSpeed: number;
      boltLife: number;
      boltHull: number;
      boltEnergy: number;
      accuracy: number;
      leadFudge: number;
      separation: number;
    };
    anvil: {
      hull: number;
      speed: number;
      speedVariance: number;
      turnRate: number;
      engageRange: number;
      standoffRange: number;
      fireCooldown: Range;
      boltSpeed: number;
      boltLife: number;
      boltHull: number;
      boltEnergy: number;
      accuracy: number;
      leadFudge: number;
      separation: number;
      /** Fraction of shield damage that bleeds through to hull. */
      shieldPierce: number;
      volley: Range;
      volleySpread: number;
    };
    maxDetailedAttackers: number;
    queueSpawnDelay: Range;
  };
  asteroids: { count: number; radiusMin: number; radiusMax: number; spinMax: number };
  base: {
    radius: number;
    acquireDot: number;
    dockRange: number;
    bracketSpeedMin: number;
    bracketSpeedMax: number;
    bracketFillSeconds: number;
    transferSeconds: number;
  };
  warp: {
    minSeconds: number;
    maxSeconds: number;
    gateDriftRate: number;
    gateRadius: number;
    alignTolerance: number;
    missAdjacentChance: number;
    tunnelStarStretch: number;
  };
  scan: { range: number; ghostChanceDamaged: number; ghostChanceDead: number };
  score: {
    kills: number;
    energyDivisor: number;
    secondsDivisor: number;
    baseLostPenalty: number;
    baseKilledPenalty: number;
    outcome: { success: number; abort: number; destroyed: number };
  };
  rank: { min: number; title: string }[];
}

export interface Difficulty {
  id: DifficultyId;
  label: string;
  tagline: string;
  skillFactor: number;
  enemyGroups: number;
  fleets: number;
  baseCount: number;
  migrationAggression: number;
  starDateIntervalSeconds: number;
  enemyHpScale: number;
  enemyAccuracy: number;
  autoAlign: boolean;
}

export type DifficultyId = 'novice' | 'pilot' | 'warrior' | 'commander';

export const TUNING = tuningJson as unknown as Tuning;

export const DIFFICULTIES = difficultiesJson as unknown as Record<string, Difficulty | string>;

export const DIFFICULTY_ORDER: DifficultyId[] = ['novice', 'pilot', 'warrior', 'commander'];

export function getDifficulty(id: DifficultyId): Difficulty {
  const raw = DIFFICULTIES[id];
  if (!raw || typeof raw === 'string') {
    return DIFFICULTIES.novice as unknown as Difficulty;
  }
  return raw as unknown as Difficulty;
}

export function difficultyList(): Difficulty[] {
  return DIFFICULTY_ORDER.map(getDifficulty);
}

/** Uniform random in [lo, hi). */
export function rand(range: Range): number {
  return range[0] + Math.random() * (range[1] - range[0]);
}

/** Resolve a score to a rank title using the ladder in tuning.json. */
export function rankForScore(score: number): string {
  let title = TUNING.rank[0].title;
  for (const step of TUNING.rank) {
    if (score >= step.min) title = step.title;
  }
  return title;
}
