/**
 * Local-first posture.
 *
 * The dashboard is designed to run entirely on the user's own machine with
 * Ollama. Cloud models are an OPTION the user turns on, never a requirement for
 * the system to work. Two switches:
 *
 *   LOCAL_ONLY=true     Hard block: no cloud model is ever called. Use this for
 *                       private/regulated work, or for an air-gapped demo.
 *   PREFER_LOCAL=true   Soft: prefer a local model when one is available
 *                       (this is already the app default). Cloud still allowed.
 *
 * See docs/KNOWLEDGE-POLICY.md and book/Chapter-24.
 */

const EXTERNAL_PROVIDER_PREFIXES = [
  'openrouter/',
  'deepseek/',
  'glm/',
  'openai/',
  'anthropic/',
  'gemini/',
  'groq/',
  'mistral/',
  'together/',
  'perplexity/',
  'cohere/',
];

/** True when the user has demanded that nothing leaves the machine. */
export function isLocalOnly(): boolean {
  return String(process.env.LOCAL_ONLY || '').toLowerCase() === 'true';
}

/** True when the app should prefer local models but may still use cloud. */
export function preferLocal(): boolean {
  const v = String(process.env.PREFER_LOCAL ?? 'true').toLowerCase();
  return v !== 'false';
}

/** Is this model id a CLOUD model (Ollama Cloud or an external provider)? */
export function isCloudModelId(modelId: string): boolean {
  if (!modelId) return false;
  const s = modelId.toLowerCase();
  // Ollama Cloud models carry a :cloud (or -cloud) tag.
  if (s.includes(':cloud') || s.includes('-cloud')) return true;
  // External API providers are addressed with a provider/ prefix.
  if (EXTERNAL_PROVIDER_PREFIXES.some(p => s.startsWith(p))) return true;
  // Everything else is treated as a local Ollama tag (the app prefixes local
  // models as "ollama/<tag>").
  return false;
}

/** Is this model id a LOCAL model? */
export function isLocalModelId(modelId: string): boolean {
  return !!modelId && !isCloudModelId(modelId);
}

export interface ModelGate {
  allowed: boolean;
  reason?: string;
}

/**
 * The gate every model call passes through. In local-only mode, any cloud model
 * is refused with a clear, actionable reason.
 */
export function gateModel(modelId: string): ModelGate {
  if (!isLocalOnly()) return { allowed: true };
  if (!modelId) return { allowed: true }; // unresolved; defaulting happens later
  if (isLocalModelId(modelId)) return { allowed: true };
  return {
    allowed: false,
    reason:
      `Local-only mode is ON (LOCAL_ONLY=true), so the cloud model "${modelId}" ` +
      `will not be called — nothing leaves this machine. Pick a local Ollama model, ` +
      `or set LOCAL_ONLY=false to allow cloud models.`,
  };
}

const LOCAL_PREFERENCE_ORDER = [
  'gemma4:latest',
  'gemma3:27b',
  'qwen3.5:9b',
  'qwen3.5:latest',
  'glm-4.7-flash',
  'llama3.2:latest',
];

/**
 * Pick the best local model from a list of available model ids. Returns null if
 * none are local.
 */
export function pickLocalModel(available: string[]): string | null {
  const locals = (available || []).filter(isLocalModelId);
  if (locals.length === 0) return null;
  for (const wanted of LOCAL_PREFERENCE_ORDER) {
    const hit = locals.find(id => id === wanted || id === `ollama/${wanted}`);
    if (hit) return hit;
  }
  return locals[0];
}

/** Snapshot for status surfaces and diagnostics. */
export function localFirstStatus() {
  return {
    localOnly: isLocalOnly(),
    preferLocal: preferLocal(),
    note: isLocalOnly()
      ? 'Local-only: cloud models are blocked. Nothing leaves this machine.'
      : 'Cloud models are allowed but a local model is preferred when available.',
  };
}
