import { TUNING, rand, type Difficulty } from '../data/schema';
import type { EnemyShip, PlayerState } from '../core/types';
import {
  addScaled,
  copy,
  cross,
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
 * The Dart. Small, fast, and a dedicated flanker: roughly two thirds of them
 * are temperamentally drawn to a point behind the player, which is what makes
 * flipping to the aft view a real tactical need rather than a novelty.
 *
 * Readability rule from the brief: only `maxDetailedAttackers` ships are ever
 * simulated at full fidelity and drawn. The rest wait in a queue and fly in as
 * their wingmates die, so the screen never becomes an unreadable mess.
 */

export interface DartFireOrder {
  pos: Vec3;
  dir: Vec3;
  speed: number;
  life: number;
}

const WORLD_UP: Vec3 = { x: 0, y: 1, z: 0 };

// Scratch vectors — the sim is single-threaded, so reuse is safe and avoids
// allocating inside the hot loop.
const toPlayer = v3();
const desired = v3();
const scratchA = v3();
const scratchB = v3();
const scratchC = v3();
const scratchD = v3();
const scratchE = v3();

export interface DartSpawnOptions {
  pos: Vec3;
  difficulty: Difficulty;
  seed: number;
  /** Training drones never fire and never score. */
  drone?: boolean;
}

export function spawnDart({ pos, difficulty, seed, drone = false }: DartSpawnOptions): EnemyShip {
  const cfg = TUNING.enemies.dart;
  const variance = ((seed % 1000) / 1000 - 0.5) * 2 * cfg.speedVariance;
  const hue = seed % 2 === 0 ? 0.02 : 0.58; // amber vs violet engine glow

  return {
    active: true,
    kind: 'dart',
    pos: copy(v3(), pos),
    vel: v3(),
    heading: v3(0, 0, 1),
    hull: cfg.hull * difficulty.enemyHpScale,
    maxHull: cfg.hull * difficulty.enemyHpScale,
    state: 'queue',
    fireTimer: rand(cfg.fireCooldown) * 0.6,
    jinkTimer: rand(cfg.jinkInterval),
    stateTimer: 0,
    jinkDir: v3(1, 0, 0),
    detail: false,
    queueTimer: rand(TUNING.enemies.queueSpawnDelay),
    seed,
    prefersAft: drone ? false : (seed % 1000) / 1000 < cfg.aftBias,
    engineHue: drone ? 0.35 : hue,
    drone,
  };
}

/**
 * Step one Dart. Returns a fire order when it should shoot this tick, or null.
 * `others` is used only for separation so darts do not stack into one blob.
 */
export function updateDart(
  enemy: EnemyShip,
  player: PlayerState,
  playerVel: Vec3,
  dt: number,
  difficulty: Difficulty,
  others: EnemyShip[],
): DartFireOrder | null {
  const cfg = TUNING.enemies.dart;
  if (!enemy.active) return null;

  if (enemy.state === 'queue') {
    enemy.queueTimer -= dt;
    return null;
  }

  // Training drones fly and take hits, but never shoot back.
  if (enemy.drone) {
    sub(scratchA, player.pos, enemy.pos);
    normalize(desired, scratchA);
    const drift = 1 - Math.exp(-cfg.turnRate * 0.5 * dt);
    enemy.heading.x += (desired.x - enemy.heading.x) * drift;
    enemy.heading.y += (desired.y - enemy.heading.y) * drift;
    enemy.heading.z += (desired.z - enemy.heading.z) * drift;
    normalize(enemy.heading, enemy.heading);
    const speed = cfg.speed * 0.55;
    enemy.pos.x += enemy.heading.x * speed * dt;
    enemy.pos.y += enemy.heading.y * speed * dt;
    enemy.pos.z += enemy.heading.z * speed * dt;
    enemy.vel.x = enemy.heading.x * speed;
    enemy.vel.y = enemy.heading.y * speed;
    enemy.vel.z = enemy.heading.z * speed;
    return null;
  }

  const range = dist(enemy.pos, player.pos);
  sub(scratchA, player.pos, enemy.pos);
  normalize(toPlayer, scratchA);

  // ---- state transitions --------------------------------------------------
  if (enemy.state === 'approach' && range < cfg.engageRange * 0.5) {
    enemy.state = 'attack';
    enemy.jinkTimer = rand(cfg.jinkInterval);
  }
  if ((enemy.state === 'attack' || enemy.state === 'jink') && enemy.hull <= enemy.maxHull * 0.3) {
    enemy.state = 'break';
    enemy.stateTimer = 2.2 + Math.random() * 1.4;
  }
  if (enemy.state === 'break') {
    enemy.stateTimer -= dt;
    if (enemy.stateTimer <= 0) enemy.state = 'approach';
  }
  if (enemy.state === 'jink') {
    enemy.stateTimer -= dt;
    if (enemy.stateTimer <= 0) {
      enemy.state = 'attack';
      enemy.jinkTimer = rand(cfg.jinkInterval);
    }
  }
  if (enemy.state === 'attack') {
    enemy.jinkTimer -= dt;
    if (enemy.jinkTimer <= 0) {
      // Break the player's lock: peel off on a random perpendicular.
      cross(scratchB, toPlayer, WORLD_UP);
      normalize(scratchB, scratchB);
      const sign = Math.random() < 0.5 ? 1 : -1;
      const vertical = (Math.random() - 0.5) * 0.6;
      set(
        enemy.jinkDir,
        scratchB.x * sign,
        scratchB.y * sign + vertical,
        scratchB.z * sign,
      );
      normalize(enemy.jinkDir, enemy.jinkDir);
      enemy.state = 'jink';
      enemy.stateTimer = rand([0.9, 1.7]);
    }
  }

  // ---- desired heading ----------------------------------------------------
  switch (enemy.state) {
    case 'approach': {
      if (enemy.prefersAft) {
        // Aim at a point behind the player: this is the aft-pressure mechanic.
        addScaled(scratchC, player.pos, player.heading, -1400);
        sub(scratchD, scratchC, enemy.pos);
        normalize(desired, scratchD);
      } else {
        copy(desired, toPlayer);
      }
      break;
    }
    case 'attack': {
      const radialWeight = range < cfg.standoffRange ? -1 : 0.55;
      cross(scratchB, toPlayer, WORLD_UP);
      normalize(scratchB, scratchB);
      const orbit = enemy.seed % 2 === 0 ? 1 : -1;
      set(
        desired,
        toPlayer.x * radialWeight + scratchB.x * orbit,
        toPlayer.y * radialWeight + scratchB.y * orbit,
        toPlayer.z * radialWeight + scratchB.z * orbit,
      );
      normalize(desired, desired);
      break;
    }
    case 'jink': {
      copy(desired, enemy.jinkDir);
      break;
    }
    case 'break': {
      scale(desired, toPlayer, -1);
      break;
    }
    default:
      copy(desired, toPlayer);
  }

  // ---- separation ---------------------------------------------------------
  for (const other of others) {
    if (other === enemy || !other.active || !other.detail) continue;
    const d = dist(other.pos, enemy.pos);
    if (d < cfg.separation && d > 1e-3) {
      sub(scratchE, enemy.pos, other.pos);
      normalize(scratchE, scratchE);
      desired.x += scratchE.x * 1.2;
      desired.y += scratchE.y * 1.2;
      desired.z += scratchE.z * 1.2;
    }
  }
  normalize(desired, desired);

  // ---- turn + move --------------------------------------------------------
  const turnAlpha = 1 - Math.exp(-cfg.turnRate * dt);
  enemy.heading.x += (desired.x - enemy.heading.x) * turnAlpha;
  enemy.heading.y += (desired.y - enemy.heading.y) * turnAlpha;
  enemy.heading.z += (desired.z - enemy.heading.z) * turnAlpha;
  normalize(enemy.heading, enemy.heading);

  const speed = cfg.speed + ((enemy.seed % 1000) / 1000 - 0.5) * 2 * cfg.speedVariance;
  const speedNow = enemy.state === 'jink' ? speed * cfg.jinkStrength : speed;
  enemy.pos.x += enemy.heading.x * speedNow * dt;
  enemy.pos.y += enemy.heading.y * speedNow * dt;
  enemy.pos.z += enemy.heading.z * speedNow * dt;
  enemy.vel.x = enemy.heading.x * speedNow;
  enemy.vel.y = enemy.heading.y * speedNow;
  enemy.vel.z = enemy.heading.z * speedNow;

  // ---- fire control -------------------------------------------------------
  enemy.fireTimer -= dt;
  const facing = dot(enemy.heading, toPlayer);
  const canShoot =
    enemy.state !== 'break' &&
    range < cfg.engageRange &&
    facing > 0.96 &&
    enemy.fireTimer <= 0;

  if (!canShoot) return null;

  enemy.fireTimer = rand(cfg.fireCooldown);

  // Fire at where the player WILL be, not where they are.
  const travel = range / cfg.boltSpeed;
  addScaled(scratchC, player.pos, playerVel, travel * cfg.leadFudge);
  sub(scratchD, scratchC, enemy.pos);
  normalize(scratchD, scratchD);

  // Accuracy sets a small cone of error; Novice enemies genuinely miss.
  const spread = (1 - difficulty.enemyAccuracy) * 0.075;
  scratchD.x += (Math.random() - 0.5) * spread;
  scratchD.y += (Math.random() - 0.5) * spread;
  scratchD.z += (Math.random() - 0.5) * spread;
  normalize(scratchD, scratchD);

  return {
    pos: copy(v3(), enemy.pos),
    dir: copy(v3(), scratchD),
    speed: cfg.boltSpeed,
    life: cfg.boltLife,
  };
}

/**
 * Decide which ships are detailed this frame. Two detailed attackers plus one
 * aft cue is the cap the brief asks for; everything else waits its turn.
 */
export function assignDetails(enemies: EnemyShip[]): void {
  const max = TUNING.enemies.maxDetailedAttackers;
  const ready = enemies.filter(e => e.active && !e.drone && e.state !== 'queue');

  // Keep existing detailed ships; only promote when there is room.
  let detailed = ready.filter(e => e.detail).length;

  for (const enemy of ready) {
    if (detailed >= max) break;
    if (enemy.detail) continue;
    enemy.detail = true;
    detailed++;
  }

  // Anything detailed beyond the cap (should not happen) is demoted.
  let seen = 0;
  for (const enemy of ready) {
    if (!enemy.detail) continue;
    seen++;
    if (seen > max) enemy.detail = false;
  }
}

/** Promote the queued ship that has waited longest into a real attacker. */
export function promoteQueued(enemies: EnemyShip[]): EnemyShip | null {
  let best: EnemyShip | null = null;
  for (const enemy of enemies) {
    if (!enemy.active || enemy.state !== 'queue') continue;
    if (enemy.queueTimer > 0) continue;
    if (!best || enemy.queueTimer < best.queueTimer) best = enemy;
  }
  if (!best) return null;
  best.state = 'approach';
  best.detail = false;
  return best;
}
