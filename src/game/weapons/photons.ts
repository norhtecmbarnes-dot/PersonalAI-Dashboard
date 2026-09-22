import { TUNING } from '../data/schema';
import type { Projectile } from '../core/types';
import { distSq, type Vec3 } from '../core/vec';

/**
 * Photon torpedoes live in a fixed-size pool: no allocation during combat, so
 * a long firefight cannot cause a GC hitch.
 *
 * Player fantasy from the brief — "clip an incoming bolt with your own shot" —
 * is implemented as a real interception: when a friendly bolt and a hostile
 * bolt pass within `interceptRadius`, both detonate.
 */

export class PhotonPool {
  readonly items: Projectile[] = [];
  private cursor = 0;

  constructor(size = 256) {
    for (let i = 0; i < size; i++) {
      this.items.push({
        active: false,
        friendly: true,
        pos: { x: 0, y: 0, z: 0 },
        vel: { x: 0, y: 0, z: 0 },
        life: 0,
        maxLife: TUNING.weapons.photonLife,
      });
    }
  }

  spawn(friendly: boolean, pos: Vec3, dir: Vec3, speed: number, life: number): Projectile | null {
    // Linear scan from the rotating cursor so we always find a free slot fast.
    for (let i = 0; i < this.items.length; i++) {
      const index = (this.cursor + i) % this.items.length;
      const bolt = this.items[index];
      if (bolt.active) continue;
      this.cursor = (index + 1) % this.items.length;
      bolt.active = true;
      bolt.friendly = friendly;
      bolt.pos.x = pos.x;
      bolt.pos.y = pos.y;
      bolt.pos.z = pos.z;
      bolt.vel.x = dir.x * speed;
      bolt.vel.y = dir.y * speed;
      bolt.vel.z = dir.z * speed;
      bolt.life = life;
      bolt.maxLife = life;
      return bolt;
    }
    return null;
  }

  update(dt: number): void {
    for (const bolt of this.items) {
      if (!bolt.active) continue;
      bolt.pos.x += bolt.vel.x * dt;
      bolt.pos.y += bolt.vel.y * dt;
      bolt.pos.z += bolt.vel.z * dt;
      bolt.life -= dt;
      if (bolt.life <= 0) bolt.active = false;
    }
  }

  clear(): void {
    for (const bolt of this.items) bolt.active = false;
  }

  countActive(friendly: boolean): number {
    let count = 0;
    for (const bolt of this.items) {
      if (bolt.active && bolt.friendly === friendly) count++;
    }
    return count;
  }
}

/**
 * Detonate hostile bolts that a friendly bolt has clipped.
 * Returns how many interceptions happened this tick (the engine charges
 * `energy.boltIntercept` for each one).
 */
export function resolveInterceptions(pool: PhotonPool): number {
  const radiusSq = TUNING.weapons.interceptRadius * TUNING.weapons.interceptRadius;
  let intercepts = 0;

  for (const friendly of pool.items) {
    if (!friendly.active || !friendly.friendly) continue;
    for (const hostile of pool.items) {
      if (!hostile.active || hostile.friendly) continue;
      if (distSq(friendly.pos, hostile.pos) <= radiusSq) {
        friendly.active = false;
        hostile.active = false;
        intercepts++;
        break;
      }
    }
  }
  return intercepts;
}

/** Find the nearest active bolt of the requested allegiance within radius. */
export function findHit(
  pool: PhotonPool,
  friendly: boolean,
  center: Vec3,
  radius: number,
): Projectile | null {
  const radiusSq = radius * radius;
  let best: Projectile | null = null;
  let bestSq = Infinity;
  for (const bolt of pool.items) {
    if (!bolt.active || bolt.friendly !== friendly) continue;
    const d = distSq(bolt.pos, center);
    if (d <= radiusSq && d < bestSq) {
      bestSq = d;
      best = bolt;
    }
  }
  return best;
}
