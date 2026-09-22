/**
 * Seed handling for the debug/repro hook.
 *
 * `?seed=12345` in the URL makes a run reproducible: the galaxy layout and every
 * sector's contents come from seeded generation, so a bug you report can be
 * replayed exactly rather than described.
 */

export function seedFromQueryValue(raw: string | null): number | null {
  if (!raw) return null;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed)) return null;
  return Math.abs(parsed) >>> 0;
}

/** Derive a stable seed from a string, so `?seed=kepler` also works. */
export function seededFromHash(text: string): number {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/** Read a seed out of the current URL, or null when there is not one. */
export function seedFromLocation(search: string | null | undefined): number | null {
  if (!search) return null;
  const params = new URLSearchParams(search);
  const raw = params.get('seed') ?? params.get('sector');
  if (!raw) return null;
  return seedFromQueryValue(raw) ?? seededFromHash(raw);
}
