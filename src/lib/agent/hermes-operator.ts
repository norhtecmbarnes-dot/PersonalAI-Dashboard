import { spawn } from 'child_process';

/**
 * Hermes Operator — Pattern 1 of the agent integration (see docs/AGENT-INTEGRATION.md).
 *
 * Hands a natural-language task to the Hermes Agent CLI running as a separate
 * process, and returns its final answer. This is the "agent-as-operator" pattern:
 * the dashboard stays a dashboard, and Hermes does the multi-step work
 * (browsing, running commands, editing files) using its own tools.
 *
 * Security notes:
 *  - The task string is passed as a single argv element (no shell), so it cannot
 *    inject shell commands.
 *  - Which tools the operator may use is controlled by HERMES_OPERATOR_TOOLSETS
 *    (default: "web"). Widen deliberately.
 *  - The command is bounded by a timeout; a runaway run is killed.
 */

export interface HermesTaskOptions {
  /** Natural-language task for the agent. */
  task: string;
  /** Hermes toolsets to enable (default: HERMES_OPERATOR_TOOLSETS or "web"). */
  toolsets?: string;
  /** Optional model override, e.g. "ollama/qwen3.5:9b". */
  model?: string;
  /** Kill the run after this many ms (default 180000). */
  timeoutMs?: number;
  /** Working directory for the agent (default: the dashboard repo). */
  cwd?: string;
}

export interface HermesTaskResult {
  ok: boolean;
  output: string;
  error?: string;
  sessionId?: string;
  durationMs: number;
}

const DEFAULT_TIMEOUT_MS = 180_000;
const MAX_TASK_LENGTH = 8_000;

function defaultToolsets(): string {
  return process.env.HERMES_OPERATOR_TOOLSETS || 'web';
}

/** Resolve the Hermes executable, allowing an override via HERMES_CLI. */
function resolveHermesBin(): string {
  if (process.env.HERMES_CLI) return process.env.HERMES_CLI;
  // On Windows the console script is hermes.exe; elsewhere it is `hermes`.
  return process.platform === 'win32' ? 'hermes.exe' : 'hermes';
}

/**
 * Strip Hermes CLI noise from a one-shot response and pull out the session id.
 * Observed footer: "session_id: 20261009_185802_78a793".
 */
function cleanOutput(raw: string): { output: string; sessionId?: string } {
  const lines = raw.replace(/\r\n/g, '\n').split('\n');
  let sessionId: string | undefined;
  const kept: string[] = [];
  for (const line of lines) {
    const m = line.match(/^\s*session_id:\s*(\S+)\s*$/);
    if (m) {
      sessionId = m[1];
      continue;
    }
    // Drop bare internal log tags like "cli.startup.warning".
    if (/^cli\.[a-z0-9_.]+$/i.test(line.trim())) continue;
    kept.push(line);
  }
  return { output: kept.join('\n').trim(), sessionId };
}

/** Quick health probe: is the Hermes CLI runnable? */
export function hermesAvailable(): Promise<boolean> {
  return new Promise(resolve => {
    let settled = false;
    const done = (v: boolean) => {
      if (!settled) {
        settled = true;
        resolve(v);
      }
    };
    try {
      const child = spawn(resolveHermesBin(), ['--version'], {
        shell: false,
        windowsHide: true,
      });
      child.on('error', () => done(false));
      child.on('close', code => done(code === 0));
      setTimeout(() => {
        child.kill();
        done(false);
      }, 15_000);
    } catch {
      done(false);
    }
  });
}

/** Run one task through Hermes and return the final answer. */
export function runHermesTask(opts: HermesTaskOptions): Promise<HermesTaskResult> {
  const started = Date.now();
  const task = (opts.task || '').trim();

  if (!task) {
    return Promise.resolve({ ok: false, output: '', error: 'task is required', durationMs: 0 });
  }
  if (task.length > MAX_TASK_LENGTH) {
    return Promise.resolve({
      ok: false,
      output: '',
      error: `task exceeds ${MAX_TASK_LENGTH} characters`,
      durationMs: 0,
    });
  }

  const args = ['chat', '-q', task, '-Q', '--format', 'text'];
  const toolsets = opts.toolsets || defaultToolsets();
  if (toolsets) args.push('--toolsets', toolsets);
  if (opts.model) args.push('-m', opts.model);

  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  return new Promise(resolve => {
    let stdout = '';
    let stderr = '';
    let finished = false;

    const finish = (result: HermesTaskResult) => {
      if (finished) return;
      finished = true;
      resolve(result);
    };

    let child;
    try {
      child = spawn(resolveHermesBin(), args, {
        shell: false,
        windowsHide: true,
        cwd: opts.cwd || process.cwd(),
        env: process.env,
      });
    } catch (e) {
      finish({
        ok: false,
        output: '',
        error: e instanceof Error ? e.message : 'failed to spawn Hermes',
        durationMs: Date.now() - started,
      });
      return;
    }

    const timer = setTimeout(() => {
      try {
        child.kill();
      } catch {
        /* ignore */
      }
      finish({
        ok: false,
        output: cleanOutput(stdout).output,
        error: `Hermes task timed out after ${timeoutMs}ms`,
        durationMs: Date.now() - started,
      });
    }, timeoutMs);

    child.stdout?.on('data', d => (stdout += d.toString()));
    child.stderr?.on('data', d => (stderr += d.toString()));

    child.on('error', err => {
      clearTimeout(timer);
      finish({
        ok: false,
        output: '',
        error: err.message,
        durationMs: Date.now() - started,
      });
    });

    child.on('close', code => {
      clearTimeout(timer);
      const cleaned = cleanOutput(stdout);
      finish({
        ok: code === 0,
        output: cleaned.output,
        sessionId: cleaned.sessionId,
        error: code === 0 ? undefined : cleanOutput(stderr).output || `exit code ${code}`,
        durationMs: Date.now() - started,
      });
    });
  });
}
