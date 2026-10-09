/**
 * The Alpha — the best model available to the system, and the mechanism that
 * keeps the title honest.
 *
 * Rule (from the project owner): there is one **Alpha** model at a time, used for
 * the highest-value reasoning (contextualising research, writing reports, hard
 * judgement). But **no Alpha rests on its laurels**: any model may be challenged,
 * and the winner of a periodic challenge becomes the Alpha. See docs/SELF-EDUCATION.md
 * and book/Chapter-25.
 *
 * The challenge is deterministic on purpose: fixed prompts with checkable answers,
 * scored by code — not by another model's opinion. That keeps it cheap, repeatable,
 * and immune to flattery.
 */

import { sqlDatabase } from '@/lib/database/sqlite';
import { chatCompletion } from '@/lib/models/sdk.server';

const KEY_ALPHA_MODEL = 'alpha_model';
const KEY_ALPHA_SCORE = 'alpha_score';
const KEY_ALPHA_SET_AT = 'alpha_set_at';
const KEY_ALPHA_CHALLENGES = 'alpha_challenges';
const KEY_ALPHA_HISTORY = 'alpha_history';

const DEFAULT_ALPHA = process.env.ALPHA_MODEL || 'ollama/qwen3.5:9b';

export interface AlphaState {
  modelId: string;
  score: number;
  setAt: number;
  challenges: number;
  history: { modelId: string; score: number; at: number }[];
}

/* ------------------------------------------------------------------ */
/* Benchmark                                                           */
/* ------------------------------------------------------------------ */

interface BenchCase {
  id: string;
  prompt: string;
  /** Deterministic check — returns true when the answer is correct. */
  check: (answer: string) => boolean;
}

const norm = (s: string) => s.trim().toLowerCase().replace(/[.。!]+$/g, '').trim();

export const BENCHMARK: BenchCase[] = [
  {
    id: 'exact',
    prompt: 'Reply with exactly the text ALPHA-OK and nothing else.',
    check: a => norm(a) === 'alpha-ok',
  },
  {
    id: 'arithmetic',
    prompt: 'Compute 17 * 23. Reply with only the number.',
    check: a => /\b391\b/.test(a),
  },
  {
    id: 'json',
    prompt: 'Reply with exactly this JSON and nothing else: {"ok":true}',
    check: a => a.replace(/\s/g, '').includes('{"ok":true}'),
  },
  {
    id: 'constraint',
    prompt: 'Name three primary colours. Reply with exactly three words, nothing else.',
    check: a => a.trim().split(/\s+/).length === 3,
  },
  {
    id: 'grounding',
    prompt:
      'What is the capital city of the fictional, non-existent country of Zubrowka? ' +
      'If you do not know, reply with exactly UNKNOWN.',
    // Tests the knowledge policy: a grounded model admits it does not know.
    check: a => norm(a).includes('unknown'),
  },
];

export interface AlphaBenchmarkResult {
  modelId: string;
  score: number;
  passed: number;
  total: number;
  details: { id: string; ok: boolean; answer: string }[];
  error?: string;
}

/** Score one model against the fixed benchmark. */
export async function benchmarkModel(modelId: string): Promise<AlphaBenchmarkResult> {
  const details: AlphaBenchmarkResult['details'] = [];
  let passed = 0;
  try {
    for (const c of BENCHMARK) {
      let answer = '';
      try {
        const res = await chatCompletion({
          model: modelId,
          messages: [
            { role: 'system', content: 'Answer literally and briefly. No preamble.' },
            { role: 'user', content: c.prompt },
          ],
          temperature: 0,
          maxTokens: 128,
        });
        answer = typeof (res as any).message === 'string'
          ? (res as any).message
          : (res as any).message?.content || '';
      } catch (e) {
        answer = `[[error: ${e instanceof Error ? e.message : 'unknown'}]]`;
      }
      const ok = c.check(answer);
      if (ok) passed++;
      details.push({ id: c.id, ok, answer: String(answer).slice(0, 120) });
    }
    return { modelId, score: passed / BENCHMARK.length, passed, total: BENCHMARK.length, details };
  } catch (e) {
    return {
      modelId,
      score: 0,
      passed,
      total: BENCHMARK.length,
      details,
      error: e instanceof Error ? e.message : 'benchmark failed',
    };
  }
}

/* ------------------------------------------------------------------ */
/* Alpha state (persisted in the settings table)                       */
/* ------------------------------------------------------------------ */

function readSetting(key: string, fallback = ''): string {
  try {
    sqlDatabase.initialize();
    return sqlDatabase.getSetting(key) ?? fallback;
  } catch {
    return fallback;
  }
}

function writeSetting(key: string, value: string): void {
  try {
    sqlDatabase.initialize();
    sqlDatabase.setSetting(key, value, 'alpha');
  } catch {
    /* settings are best-effort; alpha falls back to the default */
  }
}

export function getAlphaModel(): string {
  return readSetting(KEY_ALPHA_MODEL) || DEFAULT_ALPHA;
}

export function getAlphaState(): AlphaState {
  let history: AlphaState['history'] = [];
  try {
    history = JSON.parse(readSetting(KEY_ALPHA_HISTORY, '[]'));
  } catch {
    history = [];
  }
  return {
    modelId: getAlphaModel(),
    score: Number(readSetting(KEY_ALPHA_SCORE, '0')) || 0,
    setAt: Number(readSetting(KEY_ALPHA_SET_AT, '0')) || 0,
    challenges: Number(readSetting(KEY_ALPHA_CHALLENGES, '0')) || 0,
    history,
  };
}

export function setAlpha(modelId: string, score: number): AlphaState {
  const prev = getAlphaState();
  const at = Date.now();
  writeSetting(KEY_ALPHA_MODEL, modelId);
  writeSetting(KEY_ALPHA_SCORE, String(score));
  writeSetting(KEY_ALPHA_SET_AT, String(at));
  const history = [...prev.history, { modelId, score, at }].slice(-50);
  writeSetting(KEY_ALPHA_HISTORY, JSON.stringify(history));
  return getAlphaState();
}

export interface AlphaChallengeResult {
  challengers: AlphaBenchmarkResult[];
  incumbent: string;
  incumbentScore: number;
  winner: string;
  changed: boolean;
  reason: string;
}

/**
 * Hold a challenge: benchmark every candidate plus the incumbent, and the best
 * score wins the title. Ties go to the incumbent (no change without a reason).
 */
export async function challengeAlpha(candidateModelIds: string[]): Promise<AlphaChallengeResult> {
  const incumbent = getAlphaModel();
  const candidates = Array.from(new Set([incumbent, ...candidateModelIds])).filter(Boolean);

  const results: AlphaBenchmarkResult[] = [];
  for (const m of candidates) {
    results.push(await benchmarkModel(m));
  }

  writeSetting(KEY_ALPHA_CHALLENGES, String((Number(readSetting(KEY_ALPHA_CHALLENGES, '0')) || 0) + 1));

  const incumbentResult = results.find(r => r.modelId === incumbent);
  const incumbentScore = incumbentResult?.score ?? 0;

  let winner = incumbent;
  let best = incumbentScore;
  for (const r of results) {
    if (r.score > best) {
      best = r.score;
      winner = r.modelId;
    }
  }

  const changed = winner !== incumbent;
  if (changed) setAlpha(winner, best);
  else writeSetting(KEY_ALPHA_SCORE, String(best));

  return {
    challengers: results,
    incumbent,
    incumbentScore,
    winner,
    changed,
    reason: changed
      ? `${winner} scored ${(best * 100).toFixed(0)}% vs the incumbent ${incumbent}'s ${(
          incumbentScore * 100
        ).toFixed(0)}% — the Alpha title changes hands.`
      : `${incumbent} defended the title (${(best * 100).toFixed(0)}%). No Alpha rests on its laurels — but none was beaten today.`,
  };
}
