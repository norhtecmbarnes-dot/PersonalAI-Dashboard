import { TUNING } from '../data/schema';
import { createRng, rngInt, rngRange, type Rng } from '../core/rng';
import type { Asteroid, GalaxyCell } from '../core/types';
import { normalize, v3, type Vec3 } from '../core/vec';

/**
 * Sector layout: what physically exists when you arrive in a cell. Pure data —
 * the renderer turns it into meshes and the simulation uses it for collisions.
 * Seeded from the cell, so the same cell always looks the same.
 */

export interface SectorLayout {
  seed: number;
  asteroids: Asteroid[];
  enemySpawns: { pos: Vec3; seed: number }[];
  droneSpawns: { pos: Vec3; seed: number }[];
  base: { pos: Vec3; radius: number } | null;
  sun: { direction: Vec3; color: number; intensity: number };
  firstVisit: boolean;
}

export function generateAsteroids(rng: Rng, sectorRadius: number, countScale = 1): Asteroid[] {
  const cfg = TUNING.asteroids;
  const total = Math.max(1, Math.round(cfg.count * countScale));
  const asteroids: Asteroid[] = [];
  for (let i = 0; i < total; i++) {
    const radius = rngRange(rng, cfg.radiusMin, cfg.radiusMax);
    asteroids.push({
      pos: randomShellPoint(rng, sectorRadius, 0.95),
      radius,
      spin: v3(
        rngRange(rng, -cfg.spinMax, cfg.spinMax),
        rngRange(rng, -cfg.spinMax, cfg.spinMax),
        rngRange(rng, -cfg.spinMax, cfg.spinMax),
      ),
      angle: rngRange(rng, 0, Math.PI * 2),
      seed: rngInt(rng, 1 << 30),
    });
  }
  return asteroids;
}

/** A point inside a shell of the given radius, biased away from the origin. */
function randomShellPoint(rng: Rng, sectorRadius: number, shellFraction: number): Vec3 {
  // Direction on the unit sphere.
  const z = rngRange(rng, -1, 1);
  const theta = rngRange(rng, 0, Math.PI * 2);
  const r = Math.sqrt(Math.max(0, 1 - z * z));
  const dir = v3(r * Math.cos(theta), z, r * Math.sin(theta));

  const distance = rngRange(rng, sectorRadius * 0.18, sectorRadius * shellFraction);
  return { x: dir.x * distance, y: dir.y * distance, z: dir.z * distance };
}

export interface BuildSectorOptions {
  cell: GalaxyCell;
  sectorRadius: number;
  droneCount: number;
  enemyShipCount: number;
  hasBase: boolean;
}

export function buildSectorLayout({
  cell,
  sectorRadius,
  droneCount,
  enemyShipCount,
  hasBase,
}: BuildSectorOptions): SectorLayout {
  const rng = createRng(cell.seed);

  // A cell's charted kind is its *dominant* content. Rock is a local hazard
  // that can coexist with a patrol, so combat sectors get sparse fields and a
  // charted asteroid field gets the full dense belt.
  const dense = cell.kind === 'asteroids';
  const sparse = !dense && rng() < 0.45;
  const asteroids =
    dense || sparse
      ? generateAsteroids(createRng(cell.seed + 17), sectorRadius, dense ? 1 : 0.45)
      : [];

  // Enemy ships arrive from the outer edge and fly in — no popping into view.
  const enemySpawns: { pos: Vec3; seed: number }[] = [];
  for (let i = 0; i < enemyShipCount; i++) {
    const angle = (i / Math.max(1, enemyShipCount)) * Math.PI * 2 + rngRange(rng, -0.4, 0.4);
    const elevation = rngRange(rng, -0.45, 0.45);
    const distance = sectorRadius * 0.82;
    const dir = v3(Math.cos(angle) * Math.cos(elevation), Math.sin(elevation), Math.sin(angle) * Math.cos(elevation));
    normalize(dir, dir);
    enemySpawns.push({
      pos: { x: dir.x * distance - distance * 0.0, y: dir.y * distance, z: dir.z * distance },
      seed: rngInt(rng, 1 << 30) + i * 977,
    });
  }

  const droneSpawns: { pos: Vec3; seed: number }[] = [];
  for (let i = 0; i < droneCount; i++) {
    const angle = rngRange(rng, 0, Math.PI * 2);
    const distance = sectorRadius * 0.2;
    droneSpawns.push({
      pos: v3(Math.cos(angle) * distance, rngRange(rng, -400, 400), Math.sin(angle) * distance),
      seed: rngInt(rng, 1 << 30) + 5000 + i,
    });
  }

  const base = hasBase
    ? { pos: v3(rngRange(rng, -1200, 1200), 0, rngRange(rng, -2500, -1400)), radius: TUNING.base.radius }
    : null;

  // One distant sun per sector, with a stable direction and warm/cool tint.
  const sunAngle = rngRange(rng, 0, Math.PI * 2);
  const sunElevation = rngRange(rng, -0.35, 0.55);
  const sunDir = v3(
    Math.cos(sunAngle) * Math.cos(sunElevation),
    Math.sin(sunElevation),
    Math.sin(sunAngle) * Math.cos(sunElevation),
  );
  normalize(sunDir, sunDir);
  const warm = rng() < 0.5;

  return {
    seed: cell.seed,
    asteroids,
    enemySpawns,
    droneSpawns,
    base,
    sun: {
      direction: sunDir,
      color: warm ? 0xfff0d0 : 0xcfe4ff,
      intensity: rngRange(rng, 2.4, 3.6),
    },
    firstVisit: !cell.visited,
  };
}

/**
 * A field of points on a shell — used for both the far starfield and the near
 * dust motes that give speed parallax its bite. Seeded, so it is stable
 * across resizes.
 */
export function buildPointField(count: number, radius: number, seed: number): Float32Array {
  const rng = createRng(seed);
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const p = randomShellPoint(rng, radius, 1);
    positions[i * 3] = p.x;
    positions[i * 3 + 1] = p.y;
    positions[i * 3 + 2] = p.z;
  }
  return positions;
}
