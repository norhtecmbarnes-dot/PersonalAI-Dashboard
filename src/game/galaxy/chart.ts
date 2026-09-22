import { TUNING, type Difficulty } from '../data/schema';
import { createRng, rngInt, rngRange, rngShuffle, type Rng } from '../core/rng';
import type { CellKind, Galaxy, GalaxyCell, WarpPlan } from '../core/types';

/**
 * The galactic chart model. Pure data plus rules — no rendering, no Three.js.
 *
 * Win: every enemy group destroyed.
 * Lose: the last friendly base falls.
 */

export interface GalaxyEvent {
  kind: 'surrounded' | 'base-lost';
  x: number;
  y: number;
  text: string;
}

export interface GalaxyOptions {
  difficulty: Difficulty;
  seed: number;
}

/** How long a base survives once 3+ enemy groups sit next to it. */
export const SURROUND_TIMER_SECONDS = 60;

export function createGalaxy({ difficulty, seed }: GalaxyOptions): Galaxy {
  const rng = createRng(seed);
  const width = TUNING.sector.gridWidth;
  const height = TUNING.sector.gridHeight;

  const cells: GalaxyCell[] = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      cells.push({
        x,
        y,
        kind: 'empty',
        enemies: 0,
        base: false,
        baseAlive: false,
        surroundSeconds: 0,
        visited: false,
        seed: Math.floor(rng() * 2 ** 31),
      });
    }
  }

  const index = (x: number, y: number) => y * width + x;
  const playerX = 0;
  const playerY = Math.floor(height / 2);

  // Candidates for placement, excluding the player's start cell.
  const all: { x: number; y: number }[] = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (x === playerX && y === playerY) continue;
      all.push({ x, y });
    }
  }

  // Bases sit in the friendlier (left) half; enemies mass on the frontier.
  const homeHalf = all.filter(p => p.x < width / 2);
  const frontier = all.filter(p => p.x >= width / 2 - 1);

  const baseSpots = rngShuffle(rng, homeHalf).slice(0, Math.min(difficulty.baseCount, homeHalf.length));
  for (const spot of baseSpots) {
    const cell = cells[index(spot.x, spot.y)];
    cell.base = true;
    cell.baseAlive = true;
    cell.kind = 'base';
  }
  const baseKeys = new Set(baseSpots.map(p => `${p.x},${p.y}`));

  // Enemy groups: `fleets` of them are full 4-ship fleets, the rest alternate
  // patrol (2) and task force (3).
  const enemySpots = rngShuffle(
    rng,
    frontier.filter(p => !baseKeys.has(`${p.x},${p.y}`)),
  ).slice(0, Math.min(difficulty.enemyGroups, frontier.length));

  enemySpots.forEach((spot, i) => {
    const cell = cells[index(spot.x, spot.y)];
    cell.enemies = i < difficulty.fleets ? 4 : i % 2 === 0 ? 2 : 3;
    if (cell.base) {
      // "rarely base + enemies" — a base can start already contested.
      cell.baseAlive = true;
    } else {
      cell.kind = cell.enemies >= 4 ? 'fleet' : cell.enemies === 3 ? 'taskforce' : 'patrol';
    }
  });

  // Asteroid-heavy sectors are purely a flavour/variation choice.
  for (const cell of cells) {
    if (cell.base || cell.enemies > 0) continue;
    if (rng() < 0.18) {
      cell.kind = 'asteroids';
    }
  }

  // The opening sector always has rock in it. An empty first sector teaches
  // nothing and looks like a bug; a belt gives the player something to weave
  // through and shoot at while they learn the controls.
  const startCell = cells[index(playerX, playerY)];
  if (!startCell.base && startCell.enemies === 0) startCell.kind = 'asteroids';

  return {
    width,
    height,
    cells,
    playerX,
    playerY,
    startingEnemyGroups: enemySpots.length,
    startingBases: baseSpots.length,
    starDate: 1,
    starDateTimer: difficulty.starDateIntervalSeconds,
  };
}

export function cellAt(galaxy: Galaxy, x: number, y: number): GalaxyCell | null {
  if (x < 0 || y < 0 || x >= galaxy.width || y >= galaxy.height) return null;
  return galaxy.cells[y * galaxy.width + x];
}

export function totalEnemies(galaxy: Galaxy): number {
  return galaxy.cells.reduce((sum, c) => sum + c.enemies, 0);
}

export function aliveBases(galaxy: Galaxy): GalaxyCell[] {
  return galaxy.cells.filter(c => c.base && c.baseAlive);
}

export function enemyCells(galaxy: Galaxy): GalaxyCell[] {
  return galaxy.cells.filter(c => c.enemies > 0);
}

export function allEnemiesCleared(galaxy: Galaxy): boolean {
  return totalEnemies(galaxy) === 0;
}

export function playerCell(galaxy: Galaxy): GalaxyCell {
  return galaxy.cells[galaxy.playerY * galaxy.width + galaxy.playerX];
}

/** Warp cost for a jump: 25 x distance by default (tuning.json). */
export function planWarp(galaxy: Galaxy, toX: number, toY: number, energy: number): WarpPlan {
  const fromX = galaxy.playerX;
  const fromY = galaxy.playerY;
  const dx = toX - fromX;
  const dy = toY - fromY;
  const distance = Math.sqrt(dx * dx + dy * dy);
  const cost = Math.round(distance * TUNING.energy.warpPerDistance);
  return { fromX, fromY, toX, toY, distance, cost, affordable: cost <= energy };
}

/** Threat label + colour-keyed shape for the chart legend. */
export function threatOf(cell: GalaxyCell): number {
  return cell.enemies;
}

export function cellLabel(cell: GalaxyCell): string {
  if (cell.base && cell.baseAlive) return cell.enemies > 0 ? 'BASE (CONTESTED)' : 'BASE';
  if (cell.enemies >= 4) return 'FLEET';
  if (cell.enemies === 3) return 'TASK FORCE';
  if (cell.enemies === 2) return 'PATROL';
  if (cell.kind === 'asteroids') return 'ASTEROIDS';
  return 'EMPTY';
}

/** Neighbouring cells with live enemies — used for the surrounded rule. */
export function adjacentEnemyGroups(galaxy: Galaxy, x: number, y: number): number {
  let count = 0;
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue;
      const cell = cellAt(galaxy, x + dx, y + dy);
      if (cell && cell.enemies > 0) count++;
    }
  }
  return count;
}

/**
 * Advance the star-date clock. Enemy groups creep toward your bases, and a base
 * with 3+ adjacent enemy groups starts a countdown to being lost.
 */
export function tickStarDate(galaxy: Galaxy, dt: number, difficulty: Difficulty): GalaxyEvent[] {
  const events: GalaxyEvent[] = [];

  for (const cell of galaxy.cells) {
    if (!cell.base || !cell.baseAlive) continue;
    if (cell.enemies > 0 || adjacentEnemyGroups(galaxy, cell.x, cell.y) >= 3) {
      cell.surroundSeconds += dt;
      if (
        cell.surroundSeconds >= SURROUND_TIMER_SECONDS * 0.5 &&
        cell.surroundSeconds - dt < SURROUND_TIMER_SECONDS * 0.5
      ) {
        events.push({
          kind: 'surrounded',
          x: cell.x,
          y: cell.y,
          text: `BASE SURROUNDED  GRID ${cell.x + 1}-${cell.y + 1}`,
        });
      }
      if (cell.surroundSeconds >= SURROUND_TIMER_SECONDS) {
        cell.baseAlive = false;
        cell.surroundSeconds = 0;
        events.push({
          kind: 'base-lost',
          x: cell.x,
          y: cell.y,
          text: `BASE LOST  GRID ${cell.x + 1}-${cell.y + 1}`,
        });
      }
    } else if (cell.surroundSeconds > 0) {
      cell.surroundSeconds = Math.max(0, cell.surroundSeconds - dt * 2);
    }
  }

  galaxy.starDateTimer -= dt;
  if (galaxy.starDateTimer <= 0) {
    galaxy.starDateTimer = difficulty.starDateIntervalSeconds;
    galaxy.starDate += 1;
    migrateEnemies(galaxy, difficulty);
  }

  return events;
}

/**
 * Enemy migration: each group steps toward the nearest surviving base, with a
 * probability set by the difficulty's aggression. Groups already sitting on a
 * base stay put — that is how a base gets taken.
 */
export function migrateEnemies(galaxy: Galaxy, difficulty: Difficulty): void {
  const sources = enemyCells(galaxy);

  for (const source of sources) {
    if (Math.random() > difficulty.migrationAggression * 0.5) continue;

    const targets = aliveBases(galaxy);
    if (targets.length === 0) continue;

    let best: GalaxyCell | null = null;
    let bestDist = Infinity;
    for (const target of targets) {
      const d = Math.abs(target.x - source.x) + Math.abs(target.y - source.y);
      if (d < bestDist) {
        bestDist = d;
        best = target;
      }
    }
    if (!best || best === source) continue;

    const stepX = Math.sign(best.x - source.x);
    const stepY = Math.sign(best.y - source.y);

    // Prefer the axis with the larger gap so groups visibly close in.
    const options: { x: number; y: number }[] = [];
    if (Math.abs(best.x - source.x) >= Math.abs(best.y - source.y)) {
      if (stepX) options.push({ x: source.x + stepX, y: source.y });
      if (stepY) options.push({ x: source.x, y: source.y + stepY });
    } else {
      if (stepY) options.push({ x: source.x, y: source.y + stepY });
      if (stepX) options.push({ x: source.x + stepX, y: source.y });
    }

    for (const option of options) {
      const dest = cellAt(galaxy, option.x, option.y);
      if (!dest || dest === source) continue;
      dest.enemies += source.enemies;
      source.enemies = 0;
      if (!dest.base) {
        dest.kind =
          dest.enemies >= 4 ? 'fleet' : dest.enemies === 3 ? 'taskforce' : dest.enemies === 2 ? 'patrol' : 'empty';
      }
      if (source.kind !== 'base' && source.kind !== 'asteroids') source.kind = 'empty';
      break;
    }
  }

  // Keep each cell's kind consistent with its enemy count after shuffling.
  for (const cell of galaxy.cells) {
    if (cell.base) {
      cell.kind = 'base';
      continue;
    }
    if (cell.enemies === 0 && cell.kind !== 'asteroids') cell.kind = 'empty';
  }
}

/** Difficulty-scaled enemy attributes for a freshly spawned ship. */
export function enemyHullFor(difficulty: Difficulty): number {
  return TUNING.enemies.dart.hull * difficulty.enemyHpScale;
}

/** A stable, human-facing name for a cell's contents (for radio/UI copy). */
export function cellDisplayName(galaxy: Galaxy, x: number, y: number): string {
  const cell = cellAt(galaxy, x, y);
  if (!cell) return 'UNKNOWN';
  const kindLabel: Record<CellKind, string> = {
    empty: 'EMPTY SPACE',
    asteroids: 'ASTEROID FIELD',
    patrol: 'PATROL',
    taskforce: 'TASK FORCE',
    fleet: 'FLEET',
    base: 'HELION BASE',
  };
  return kindLabel[cell.kind];
}

/** Deterministic per-cell variation used by sector generation. */
export function cellSeed(galaxy: Galaxy, x: number, y: number): number {
  return cellAt(galaxy, x, y)?.seed ?? 1;
}

export function randomAsteroidField(rng: Rng): number {
  return rngRange(rng, 0, 1) < 0.5 ? rngInt(rng, 3) : rngInt(rng, 9);
}
