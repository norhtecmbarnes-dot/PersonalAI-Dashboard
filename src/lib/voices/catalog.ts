/**
 * Unified voice catalog.
 *
 * Normalizes voices from every configured TTS provider (VocalLab, ElevenLabs,
 * and future providers) into a single shape the dashboard can search, preview,
 * and select from. A creator describes the voice they want ("warm female
 * narrator, British accent") and the catalog returns matching voices across
 * all providers — so a project keeps a consistent voice even when it mixes
 * providers.
 */

export type VoiceProvider = 'vocallab' | 'elevenlabs' | 'custom';

export interface Voice {
  id: string;            // provider-native voice id or name
  provider: VoiceProvider;
  name: string;          // human-friendly display name
  description: string;    // plain-English description for search + display
  gender?: 'male' | 'female' | 'neutral';
  accent?: string;        // e.g. "British", "American", "Indian"
  language?: string;      // BCP-47 tag e.g. "en-US"
  style?: string[];       // e.g. ["narration", "warm", "documentary"]
  previewUrl?: string;    // sample audio URL if the provider exposes one
  labels?: Record<string, string>;
}

// Static fallback catalog for VocalLab's named voices (the /v1/voices endpoint
// does not return descriptions, so we keep a curated set here). These are the
// voices surfaced in the Avatar Studio today.
const VOCALLAB_VOICE_DESCRIPTIONS: Record<string, Omit<Voice, 'id' | 'provider'>> = {
  Ashley:   { name: 'Ashley',   description: 'Warm, friendly young female narrator. Clear American English. Good for explainers and UGC.', gender: 'female', accent: 'American', language: 'en-US', style: ['warm', 'friendly', 'narration'] },
  Jessica:  { name: 'Jessica',  description: 'Bright, energetic female voice. Upbeat American English. Good for ads and social.',          gender: 'female', accent: 'American', language: 'en-US', style: ['energetic', 'upbeat', 'ads'] },
  Eric:     { name: 'Eric',     description: 'Calm, deep male narrator. Measured American English. Good for documentary and corporate.',  gender: 'male',   accent: 'American', language: 'en-US', style: ['calm', 'deep', 'documentary'] },
  Brian:    { name: 'Brian',    description: 'Confident, mid-range male voice. Neutral American English. Good for product demos.',         gender: 'male',   accent: 'American', language: 'en-US', style: ['confident', 'neutral', 'demo'] },
  Daniel:   { name: 'Daniel',   description: 'Authoritative, mature male narrator. American English. Good for news and trailers.',         gender: 'male',   accent: 'American', language: 'en-US', style: ['authoritative', 'mature', 'news'] },
  Lily:     { name: 'Lily',     description: 'Soft, gentle young female voice. American English. Good for meditation and children.',       gender: 'female', accent: 'American', language: 'en-US', style: ['soft', 'gentle', 'meditation'] },
  Adam:    { name: 'Adam',    description: 'Neutral, versatile male voice. American English. Good for tutorials and e-learning.',       gender: 'male',   accent: 'American', language: 'en-US', style: ['neutral', 'versatile', 'tutorial'] },
  Bill:    { name: 'Bill',    description: 'Gravelly, older male voice. American English. Good for rugged character work.',              gender: 'male',   accent: 'American', language: 'en-US', style: ['gravelly', 'older', 'character'] },
  Sarah:   { name: 'Sarah',   description: 'Professional, clear female voice. American English. Good for corporate and IVR.',          gender: 'female', accent: 'American', language: 'en-US', style: ['professional', 'clear', 'corporate'] },
  Charlie: { name: 'Charlie', description: 'Youthful, casual male voice. American English. Good for gaming and casual UGC.',           gender: 'male',   accent: 'American', language: 'en-US', style: ['youthful', 'casual', 'gaming'] },
};

// Known VocalLab voice names. If the /v1/voices endpoint returns more, they
// are merged in with a generic description.
const KNOWN_VOCALLAB_VOICES = Object.keys(VOCALLAB_VOICE_DESCRIPTIONS);

function normalizeVocallabVoices(raw: any): Voice[] {
  const list: Voice[] = [];
  const seen = new Set<string>();

  // VocalLab /v1/voices returns { voices: [...] } or a bare array. Each item
  // usually has at least a name/id; descriptions are rare so we enrich from
  // the curated table above.
  const rawVoices: any[] = Array.isArray(raw) ? raw : raw?.voices || raw?.data || [];
  for (const v of rawVoices) {
    const id: string = String(v.id || v.name || v.voice_id || '').trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    const meta = VOCALLAB_VOICE_DESCRIPTIONS[id];
    list.push({
      id,
      provider: 'vocallab',
      name: v.name || id,
      description: meta?.description || v.description || `${v.name || id} — VocalLab voice.`,
      gender: meta?.gender || (v.gender as Voice['gender']),
      accent: meta?.accent || v.accent,
      language: meta?.language || v.language || 'en-US',
      style: meta?.style || (Array.isArray(v.tags) ? v.tags : undefined),
      previewUrl: v.preview_url || v.sample,
      labels: v.labels,
    });
  }

  // Ensure curated voices are always present even if the API omits some.
  for (const id of KNOWN_VOCALLAB_VOICES) {
    if (seen.has(id)) continue;
    list.push({ id, provider: 'vocallab', ...VOCALLAB_VOICE_DESCRIPTIONS[id] });
  }

  return list;
}

function normalizeElevenLabsVoices(raw: any): Voice[] {
  const rawVoices: any[] = Array.isArray(raw) ? raw : raw?.voices || [];
  const list: Voice[] = [];
  for (const v of rawVoices) {
    const id = String(v.voice_id || v.id || '').trim();
    if (!id) continue;
    const labels = v.labels || {};
    const gender = (labels.gender as Voice['gender']) || undefined;
    const accent = labels.accent || labels.region;
    const styleParts = [labels.description, labels.use_case, labels.type].filter(Boolean);
    const description = v.description
      || (styleParts.length ? styleParts.join('. ') : `${v.name} — ElevenLabs voice.`);
    list.push({
      id,
      provider: 'elevenlabs',
      name: v.name || id,
      description,
      gender,
      accent,
      language: labels.language || 'en',
      style: v.category ? [v.category] : undefined,
      previewUrl: v.preview_url,
      labels,
    });
  }
  return list;
}

export interface VoiceCatalogResult {
  voices: Voice[];
  providers: VoiceProvider[];
  errors: Array<{ provider: VoiceProvider; error: string }>;
}

/**
 * Fetch the full voice catalog across all providers with a configured key.
 * Each provider is fetched best-effort; a missing key or a failed fetch only
 * removes that provider's voices — it never fails the whole catalog.
 */
export async function fetchVoiceCatalog(): Promise<VoiceCatalogResult> {
  const voices: Voice[] = [];
  const errors: VoiceCatalogResult['errors'] = [];
  const providers: VoiceProvider[] = [];

  // VocalLab
  try {
    const { vocallabListVoices } = await import('@/lib/vocallab/client');
    const raw = await vocallabListVoices();
    voices.push(...normalizeVocallabVoices(raw));
    providers.push('vocallab');
  } catch (e) {
    errors.push({ provider: 'vocallab', error: e instanceof Error ? e.message : 'failed' });
  }

  // ElevenLabs
  try {
    const { elevenLabsListVoices } = await import('@/lib/elevenlabs/client');
    const raw = await elevenLabsListVoices();
    voices.push(...normalizeElevenLabsVoices(raw));
    providers.push('elevenlabs');
  } catch (e) {
    errors.push({ provider: 'elevenlabs', error: e instanceof Error ? e.message : 'failed' });
  }

  return { voices, providers, errors };
}

/** Lightweight scoring: how well a voice matches a free-text description. */
export function scoreVoice(voice: Voice, query: string): number {
  if (!query.trim()) return 1;
  const q = query.toLowerCase();
  const haystack = [
    voice.name,
    voice.description,
    voice.gender || '',
    voice.accent || '',
    voice.language || '',
    (voice.style || []).join(' '),
  ].join(' ').toLowerCase();

  let score = 0;
  const terms = q.split(/\s+/).filter(Boolean);
  for (const term of terms) {
    if (haystack.includes(term)) score += 1;
  }
  // Exact phrase match is a strong signal.
  if (haystack.includes(q)) score += terms.length;
  return score;
}

export function searchVoices(voices: Voice[], query: string, limit = 20): Voice[] {
  if (!query.trim()) return voices.slice(0, limit);
  return voices
    .map(v => ({ v, s: scoreVoice(v, query) }))
    .filter(x => x.s > 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, limit)
    .map(x => x.v);
}