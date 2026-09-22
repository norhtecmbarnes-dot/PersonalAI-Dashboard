/**
 * Quick sim-level verification of the Lance and Anvil classes (no browser):
 * composition rules, movement sanity, and firing behaviour over 600 ticks.
 */
import { groupComposition } from '../src/game/galaxy/sector';
import { spawnLance, updateLance } from '../src/game/enemies/lance';
import { spawnAnvil, updateAnvil } from '../src/game/enemies/anvil';
import { spawnDart, updateDart } from '../src/game/enemies/dart';
import { getDifficulty } from '../src/game/data/schema';
import type { PlayerState } from '../src/game/core/types';

const cell = (seed: number) => ({
  seed,
  x: 0,
  y: 0,
  kind: 'fleet' as const,
  enemies: 0,
  base: false,
  baseAlive: false,
  visited: false,
  surroundSeconds: 0,
  asteroids: false,
});

console.log('patrol(2):', JSON.stringify(groupComposition(2, cell(7))));
console.log('taskforce(3):', JSON.stringify(groupComposition(3, cell(8))));
console.log('fleet(4):', JSON.stringify(groupComposition(4, cell(9))));
console.log('fleet(6):', JSON.stringify(groupComposition(6, cell(10))));

const diff = getDifficulty('pilot');
const player = {
  pos: { x: 0, y: 0, z: 0 },
  vel: { x: 100, y: 0, z: 0 },
  heading: { x: 0, y: 0, z: 1 },
  speed: 6,
  energy: 9999,
  hull: 100,
  shields: true,
  systems: { weapons: 'ok', engines: 'ok', shields: 'ok', computer: 'ok', scanner: 'ok', radio: 'ok' },
} as unknown as PlayerState;

const lance = spawnLance({ pos: { x: 3000, y: 0, z: 3000 }, difficulty: diff, seed: 42 });
const anvil = spawnAnvil({ pos: { x: -4000, y: 0, z: -4000 }, difficulty: diff, seed: 77 });
const dart = spawnDart({ pos: { x: 1000, y: 0, z: -1000 }, difficulty: diff, seed: 5 });

let lanceShots = 0;
let anvilBolts = 0;
let dartShots = 0;
const pv = { x: 0, y: 0, z: 0 };
for (let i = 0; i < 600; i++) {
  lance.detail = anvil.detail = dart.detail = true;
  const lo = updateLance(lance, player, pv, 1 / 60, diff);
  if (lo) lanceShots++;
  const ao = updateAnvil(anvil, player, pv, 1 / 60, diff);
  anvilBolts += ao.length;
  const doOrder = updateDart(dart, player, pv, 1 / 60, diff, [dart]);
  if (doOrder) dartShots++;
}

const finite = [lance.pos, anvil.pos, dart.pos].every(p => [p.x, p.y, p.z].every(Number.isFinite));
console.log('600 ticks, positions finite:', finite);
console.log('lance shots:', lanceShots, '| anvil volley bolts:', anvilBolts, '| dart shots:', dartShots);
console.log('lance closed from 4243 to', Math.round(Math.hypot(lance.pos.x, lance.pos.z)));
console.log('anvil held near', Math.round(Math.hypot(anvil.pos.x, anvil.pos.z)));
