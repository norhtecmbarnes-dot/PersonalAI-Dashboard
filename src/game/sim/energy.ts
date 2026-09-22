import { TUNING } from '../data/schema';
import { SYSTEM_KEYS, type PlayerState, type SystemKey, type Systems } from '../core/types';
import { randRange } from '../core/vec';

/**
 * Energy is the real clock, and damaged systems are what make a long run feel
 * like attrition. Everything here reads its numbers from tuning.json.
 */

/** Energy burned per second by the current ship configuration. */
export function drainPerSecond(player: PlayerState, computerOn: boolean): number {
  const t = TUNING.energy;
  let drain = t.speedPerSecondBase + t.speedPerSecondPerUnit * player.speed;
  if (player.shields && player.systems.shields !== 'dead') drain += t.shieldsPerSecond;
  if (computerOn && player.systems.computer !== 'dead') drain += t.computerPerSecond;
  return drain * t.drainScale;
}

/** Engines damaged caps you at cruise; dead leaves a crawl even at speed 9. */
export function maxSpeedFor(systems: Systems): number {
  if (systems.engines === 'dead') return TUNING.ship.deadStickEngines;
  if (systems.engines === 'damaged') return TUNING.ship.cruiseSpeed;
  return TUNING.ship.maxSpeed;
}

/** Weapons dead = no fire. Damaged = one tube, slower cycling. */
export function canFire(systems: Systems): boolean {
  return systems.weapons !== 'dead';
}

export function fireIntervalScale(systems: Systems): number {
  return systems.weapons === 'damaged' ? TUNING.weapons.damagedTubePenalty : 1;
}

/** Shield effectiveness multiplier: 1 healthy, partial when damaged, 0 dead. */
export function shieldEffectiveness(systems: Systems): number {
  if (systems.shields === 'dead') return 0;
  if (systems.shields === 'damaged') return 0.55;
  return 1;
}

/** Attack-computer assist strength. Dead computer still shoots — just manually. */
export function trackingAssistFor(systems: Systems): number {
  if (systems.computer === 'dead') return 0;
  if (systems.computer === 'damaged') return TUNING.weapons.damagedTrackingAssist;
  return TUNING.weapons.trackingAssist;
}

export interface HitResult {
  systemLost: SystemKey | null;
  absorbedByShield: boolean;
  destroyed: boolean;
  energyLost: number;
  hullLost: number;
}

/**
 * Per-shooter bolt damage. The engine fills this from the firing ship's
 * tuning entry, so a Dart's bolt and an Anvil's bolt do not hit the same.
 * `pierce` is the fraction of hull damage that bleeds through a live shield —
 * the Anvil's whole identity, and zero for everyone else.
 */
export interface BoltDamage {
  hull: number;
  energy: number;
  pierce?: number;
}

/**
 * Apply a hit to the player. A live shield eats the energy and protects the
 * hull; an unshielded hit is lethal in one or two strikes, exactly as the
 * brief specifies.
 */
export function applyPlayerHit(
  player: PlayerState,
  kind: 'enemy-bolt' | 'asteroid',
  random: () => number = Math.random,
  bolt?: BoltDamage,
): HitResult {
  const d = TUNING.damage;
  const shieldUp = player.shields && player.systems.shields !== 'dead';

  let energyLost: number;
  let hullLost: number;

  if (kind === 'asteroid') {
    energyLost = randRange(d.asteroidEnergy[0], d.asteroidEnergy[1]);
    hullLost = d.asteroidHull * (shieldUp ? 0.4 : 1);
  } else if (bolt) {
    // Per-shooter damage: the heavy classes carry their own numbers.
    energyLost = bolt.energy;
    hullLost = shieldUp ? bolt.hull * (bolt.pierce ?? 0) : bolt.hull;
  } else if (shieldUp) {
    energyLost = d.shieldedHitEnergy;
    hullLost = 0;
  } else {
    energyLost = randRange(d.unshieldedHitEnergy[0], d.unshieldedHitEnergy[1]);
    hullLost = randRange(d.unshieldedHitHull[0], d.unshieldedHitHull[1]);
  }

  player.energy = Math.max(0, player.energy - energyLost);
  player.hull = Math.max(0, player.hull - hullLost);

  // Systems take collateral damage — this is what wears a ship down over a run.
  const degradeChance = d.systemDegradeChance * (shieldUp ? 0.25 : 1);
  const systemLost = random() < degradeChance ? degradeRandomSystem(player.systems, random) : null;

  return {
    systemLost,
    absorbedByShield: shieldUp,
    destroyed: player.hull <= 0,
    energyLost,
    hullLost,
  };
}

/** Knock a random living system down a notch. Returns the affected system. */
export function degradeRandomSystem(systems: Systems, random: () => number = Math.random): SystemKey | null {
  const candidates = SYSTEM_KEYS.filter(key => systems[key] !== 'dead');
  if (candidates.length === 0) return null;
  const key = candidates[Math.floor(random() * candidates.length)];
  const killed = random() < TUNING.damage.systemKillChance;
  systems[key] = killed || systems[key] === 'damaged' ? 'dead' : 'damaged';
  return key;
}

/** Docking restores the ship completely. */
export function repairAll(player: PlayerState): void {
  player.energy = TUNING.energy.baseRestore;
  player.hull = TUNING.hull.start;
  for (const key of SYSTEM_KEYS) player.systems[key] = 'ok';
}

export function systemStatusClass(state: Systems[SystemKey]): 'ok' | 'damaged' | 'dead' {
  return state;
}
