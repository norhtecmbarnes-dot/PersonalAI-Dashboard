/**
 * Seeded PRNG (mulberry32). Used for galaxy and sector generation so a run can
 * be reproduced exactly from a seed — the debug URL `?seed=12345` in the game
 * relies on this, which is what makes a reported bug reproducible.
 */

export type Rng = () => number;

export function createRng(seed: number): Rng {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Random float in [lo, hi) from a seeded Rng. */
export function rngRange(rng: Rng, lo: number, hi: number): number {
  return lo + rng() * (hi - lo);
}

/** Random integer in [0, n) from a seeded Rng. */
export function rngInt(rng: Rng, n: number): number {
  return Math.floor(rng() * n);
}

/** Fisher-Yates shuffle of a copy, using the seeded Rng. */
export function rngShuffle<T>(rng: Rng, items: readonly T[]): T[] {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = rngInt(rng, i + 1);
    const t = out[i];
    out[i] = out[j];
    out[j] = t;
  }
  return out;
}

/** Parse a seed from a URL query string, falling back to a time-based seed. */
export function seedFromQuery(search: string): number {
  try {
    const params = new URLSearchParams(search);
    const raw = params.get('seed');
    if (raw) {
      const parsed = Number.parseInt(raw, 10);
      if (Number.isFinite(parsed)) return parsed >>> 0;
    }
    const sector = params.get('sector');
    if (sector) return (Number.parseInt(sector, 10) >>> 0) * 7919;
  } catch {
    /* ignore malformed query strings */
  }
  return (Date.now() ^ (Math.random() * 0xffffffff)) >>> 0;
}
