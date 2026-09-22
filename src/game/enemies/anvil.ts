import { TUNING, rand, type Difficulty } from '../data/schema';
import type { EnemyShip, PlayerState } from '../core/types';
import {
  addScaled,
  copy,
  dist,
  dot,
  normalize,
  sub,
  v3,
  type Vec3,
} from '../core/vec';

/**
 * The Anvil. Slow, heavy, and patient: it hangs back at sniper range and
 * fires shield-piercing volleys — the only shots in the game that bleed
 * through shields and hurt hull directly. Darts and Lances do the moving;
 * the Anvil does the punishing. It turns like a freighter, so it can be
 * out-flown easily — until its volley lands and your shields stop mattering.
 */

export interface AnvilFireOrder {
  pos: Vec3;
  dir: Vec3;
  speed: number;
  life: number;
}

const scratchA = v3();
const scratchB = v3();
const toPlayer = v3();
const desired = v3();

export interface AnvilSpawnOptions {
  pos: Vec3;
  difficulty: Difficulty;
  seed: number;
}

export function spawnAnvil({ pos, difficulty, seed }: AnvilSpawnOptions): EnemyShip {
  const cfg = TUNING.enemies.anvil;

  return {
    active: true,
    kind: 'anvil',
    pos: copy(v3(), pos),
    vel: v3(),
    heading: v3(0, 0, 1),
    hull: cfg.hull * difficulty.enemyHpScale,
    maxHull: cfg.hull * difficulty.enemyHpScale,
    state: 'approach',
    fireTimer: rand(cfg.fireCooldown),
    jinkTimer: 0,
    stateTimer: 0,
    jinkDir: v3(1, 0, 0),
    detail: false,
    queueTimer: 0,
    seed,
    prefersAft: false,
    // Deep red engine: "heavy" should read before the shape resolves.
    engineHue: 0.0,
    drone: false,
  };
}

/**
 * Step one Anvil. Holds standoff range, snipes slow shield-piercing volleys.
 * Returns the fire orders (a volley of 2-3 bolts) when it shoots this tick.
 */
export function updateAnvil(
  enemy: EnemyShip,
  player: PlayerState,
  playerVel: Vec3,
  dt: number,
  difficulty: Difficulty,
): AnvilFireOrder[] {
  const cfg = TUNING.enemies.anvil;
  const orders: AnvilFireOrder[] = [];
  if (!enemy.active) return orders;

  const range = dist(enemy.pos, player.pos);
  sub(scratchA, player.pos, enemy.pos);
  normalize(toPlayer, scratchA);

  // ---- state transitions --------------------------------------------------
  // The Anvil never flees — it is too heavy to bother. It just stops.
  if (enemy.state === 'approach' && range <= cfg.standoffRange) {
    enemy.state = 'attack';
  }
  if (enemy.state === 'attack' && range > cfg.standoffRange * 1.35) {
    enemy.state = 'approach';
  }

  // ---- desired heading ----------------------------------------------------
  if (enemy.state === 'approach') {
    copy(desired, toPlayer);
  } else {
    // Hold station: match the player's bearing, keep the nose on them.
    copy(desired, toPlayer);
  }
  normalize(desired, desired);

  // ---- turn + move (freighter-rate turn) ----------------------------------
  const turnAlpha = 1 - Math.exp(-cfg.turnRate * dt);
  enemy.heading.x += (desired.x - enemy.heading.x) * turnAlpha;
  enemy.heading.y += (desired.y - enemy.heading.y) * turnAlpha;
  enemy.heading.z += (desired.z - enemy.heading.z) * turnAlpha;
  normalize(enemy.heading, enemy.heading);

  const speed = cfg.speed + ((enemy.seed % 1000) / 1000 - 0.5) * 2 * cfg.speedVariance;
  // Stop advancing inside standoff: a sniping platform, not a charger.
  const advance = enemy.state === 'approach' ? 1 : 0.15;
  enemy.pos.x += enemy.heading.x * speed * advance * dt;
  enemy.pos.y += enemy.heading.y * speed * advance * dt;
  enemy.pos.z += enemy.heading.z * speed * advance * dt;
  enemy.vel.x = enemy.heading.x * speed * advance;
  enemy.vel.y = enemy.heading.y * speed * advance;
  enemy.vel.z = enemy.heading.z * speed * advance;

  // ---- fire control -------------------------------------------------------
  enemy.fireTimer -= dt;
  const facing = dot(enemy.heading, toPlayer);
  if (
    enemy.state === 'queue' ||
    enemy.fireTimer > 0 ||
    range >= cfg.engageRange ||
    facing <= 0.98
  ) {
    return orders;
  }
  enemy.fireTimer = rand(cfg.fireCooldown);

  // Volley: 2-3 bolts in a tight fan. Lead confidently — slow bolts mean the
  // aim must predict, which is exactly what makes dodging at speed matter.
  const travel = range / cfg.boltSpeed;
  addScaled(scratchA, player.pos, playerVel, travel * cfg.leadFudge);
  sub(scratchB, scratchA, enemy.pos);
  normalize(scratchB, scratchB);

  const volleyCount = Math.round(rand(cfg.volley));
  const spread = (1 - Math.min(difficulty.enemyAccuracy, cfg.accuracy)) * 0.05;
  for (let i = 0; i < volleyCount; i++) {
    const fan = (i - (volleyCount - 1) / 2) * cfg.volleySpread;
    // Fan the volley perpendicular to the aim direction.
    const dir = copy(v3(), scratchB);
    dir.y += fan;
    dir.x += (Math.random() - 0.5) * spread;
    dir.z += (Math.random() - 0.5) * spread;
    normalize(dir, dir);
    orders.push({
      pos: copy(v3(), enemy.pos),
      dir,
      speed: cfg.boltSpeed,
      life: cfg.boltLife,
    });
  }
  return orders;
}
