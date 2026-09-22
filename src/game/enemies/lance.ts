import { TUNING, rand, type Difficulty } from '../data/schema';
import type { EnemyShip, PlayerState } from '../core/types';
import {
  addScaled,
  copy,
  dist,
  dot,
  normalize,
  scale,
  set,
  sub,
  v3,
  type Vec3,
} from '../core/vec';

/**
 * The Lance. A duelist: it comes straight at you, nose-first, and dares you
 * into a photon duel at dueling range. Where the Dart trades safety for your
 * six, the Lance trades everything for the head-on — its whole silhouette
 * reads "I am going to be in front of you", so fore-view combat is never
 * optional. It breaks away only when badly hurt, and then comes straight back.
 */

export interface LanceFireOrder {
  pos: Vec3;
  dir: Vec3;
  speed: number;
  life: number;
}

const scratchA = v3();
const scratchB = v3();
const toPlayer = v3();
const desired = v3();

export interface LanceSpawnOptions {
  pos: Vec3;
  difficulty: Difficulty;
  seed: number;
}

export function spawnLance({ pos, difficulty, seed }: LanceSpawnOptions): EnemyShip {
  const cfg = TUNING.enemies.lance;
  const variance = ((seed % 1000) / 1000 - 0.5) * 2 * cfg.speedVariance;

  return {
    active: true,
    kind: 'lance',
    pos: copy(v3(), pos),
    vel: v3(),
    heading: v3(0, 0, 1),
    hull: cfg.hull * difficulty.enemyHpScale,
    maxHull: cfg.hull * difficulty.enemyHpScale,
    state: 'approach',
    fireTimer: rand(cfg.fireCooldown) * 0.5,
    jinkTimer: 0,
    stateTimer: 0,
    jinkDir: v3(1, 0, 0),
    detail: false,
    queueTimer: 0,
    seed,
    prefersAft: false,
    // Violet-white engine: distinct from the Dart's amber/blue at a glance.
    engineHue: 0.75,
    drone: false,
  };
}

/**
 * Step one Lance. Fires fast, accurate, head-on shots at dueling range.
 * Lances never jink: their threat is the straight, committed line.
 */
export function updateLance(
  enemy: EnemyShip,
  player: PlayerState,
  playerVel: Vec3,
  dt: number,
  difficulty: Difficulty,
): LanceFireOrder | null {
  const cfg = TUNING.enemies.lance;
  if (!enemy.active) return null;

  const range = dist(enemy.pos, player.pos);
  sub(scratchA, player.pos, enemy.pos);
  normalize(toPlayer, scratchA);

  // ---- state transitions --------------------------------------------------
  // Badly hurt: a long committed break, then right back down your throat.
  if (enemy.state === 'approach' && enemy.hull <= enemy.maxHull * 0.25) {
    enemy.state = 'break';
    enemy.stateTimer = 2.6 + Math.random() * 1.6;
  }
  if (enemy.state === 'break') {
    enemy.stateTimer -= dt;
    if (enemy.stateTimer <= 0) enemy.state = 'approach';
  }

  // ---- desired heading ----------------------------------------------------
  if (enemy.state === 'break') {
    scale(desired, toPlayer, -1);
  } else if (range > cfg.standoffRange) {
    // Close nose-first: pure pursuit, no flanking.
    copy(desired, toPlayer);
  } else {
    // Dueling orbit: hold the head-on line, bleed a little sideways so the
    // pip is not a solved problem, but keep the nose on the player.
    const radial = range < cfg.standoffRange * 0.55 ? 0.5 : 0.12;
    crossOrthonormal(scratchB, toPlayer, enemy.seed % 2 === 0 ? 1 : -1);
    set(
      desired,
      toPlayer.x * radial + scratchB.x,
      toPlayer.y * radial + scratchB.y,
      toPlayer.z * radial + scratchB.z,
    );
    normalize(desired, desired);
  }
  normalize(desired, desired);

  // ---- turn + move --------------------------------------------------------
  const turnAlpha = 1 - Math.exp(-cfg.turnRate * dt);
  enemy.heading.x += (desired.x - enemy.heading.x) * turnAlpha;
  enemy.heading.y += (desired.y - enemy.heading.y) * turnAlpha;
  enemy.heading.z += (desired.z - enemy.heading.z) * turnAlpha;
  normalize(enemy.heading, enemy.heading);

  const speed = cfg.speed + ((enemy.seed % 1000) / 1000 - 0.5) * 2 * cfg.speedVariance;
  enemy.pos.x += enemy.heading.x * speed * dt;
  enemy.pos.y += enemy.heading.y * speed * dt;
  enemy.pos.z += enemy.heading.z * speed * dt;
  enemy.vel.x = enemy.heading.x * speed;
  enemy.vel.y = enemy.heading.y * speed;
  enemy.vel.z = enemy.heading.z * speed;

  // ---- fire control -------------------------------------------------------
  enemy.fireTimer -= dt;
  const facing = dot(enemy.heading, toPlayer);
  const canShoot =
    enemy.state !== 'break' &&
    range < cfg.engageRange &&
    facing > 0.985 && // Lances only shoot when truly nose-on.
    enemy.fireTimer <= 0;

  if (!canShoot) return null;
  enemy.fireTimer = rand(cfg.fireCooldown);

  // Lead the player like the Dart does, but with more confidence: the Lance's
  // whole identity is the head-on shot you have to dodge, not out-fly.
  const travel = range / cfg.boltSpeed;
  addScaled(scratchA, player.pos, playerVel, travel * cfg.leadFudge);
  sub(scratchB, scratchA, enemy.pos);
  normalize(scratchB, scratchB);

  const spread = (1 - Math.min(difficulty.enemyAccuracy, cfg.accuracy)) * 0.06;
  scratchB.x += (Math.random() - 0.5) * spread;
  scratchB.y += (Math.random() - 0.5) * spread;
  scratchB.z += (Math.random() - 0.5) * spread;
  normalize(scratchB, scratchB);

  return {
    pos: copy(v3(), enemy.pos),
    dir: copy(v3(), scratchB),
    speed: cfg.boltSpeed,
    life: cfg.boltLife,
  };
}

/** Perpendicular direction to `to`, biased left or right by `sign`. */
function crossOrthonormal(out: Vec3, to: Vec3, sign: number): Vec3 {
  // Pick the world axis least aligned with `to` for a stable perpendicular.
  const ax = Math.abs(to.x);
  const ay = Math.abs(to.y);
  const az = Math.abs(to.z);
  if (ax <= ay && ax <= az) set(out, 1, 0, 0);
  else if (ay <= az) set(out, 0, 1, 0);
  else set(out, 0, 0, 1);
  const d = out.x * to.x + out.y * to.y + out.z * to.z;
  set(out, out.x - to.x * d, out.y - to.y * d, out.z - to.z * d);
  normalize(out, out);
  scale(out, out, sign);
  return out;
}
