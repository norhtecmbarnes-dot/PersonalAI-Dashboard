/**
 * Resolves API keys for creator services with DB-first, env-fallback semantics.
 *
 * The Settings UI stores keys under `api_key_<provider>` in the settings table.
 * Env vars remain the production escape hatch. A DB key takes precedence so
 * creators can add or rotate keys without restarting the server.
 *
 * Server-only. Callers must run under the nodejs runtime.
 */

let cached: { provider: string; key: string | undefined; ts: number } | null = null;
const TTL = 60000;

function readFromDb(provider: string): string | undefined {
  try {
    // Indirect so webpack does not statically bundle better-sqlite3 into
    // client builds that import modules which use this resolver.
    const mod = (eval('require') as (id: string) => unknown)('@/lib/database/sqlite') as {
      sqlDatabase: { initialize: () => void; getApiKey: (p: string) => string | null };
    };
    mod.sqlDatabase.initialize();
    const key = mod.sqlDatabase.getApiKey(provider);
    return key && key.length > 0 ? key : undefined;
  } catch {
    return undefined;
  }
}

export function resolveApiKey(provider: string, envVar: string): string | undefined {
  const now = Date.now();
  if (cached && cached.provider === provider && now - cached.ts < TTL) {
    return cached.key;
  }
  const key = readFromDb(provider) || process.env[envVar];
  cached = { provider, key, ts: now };
  return key;
}

export function clearApiKeyCache(): void {
  cached = null;
}