export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { runHermesTask, hermesAvailable } from '@/lib/agent/hermes-operator';

/**
 * Agent Operator endpoint — Pattern 1 (agent-as-operator).
 *
 * GET  /api/agent/operator            → { available, bin, defaultToolsets }
 * POST /api/agent/operator            → run a task through Hermes
 *   body: { task: string, toolsets?: string, model?: string, timeoutMs?: number }
 *
 * The dashboard hands a plain-English task to the Hermes Agent CLI, which does
 * the multi-step work with its own tools and returns the final answer.
 */

const MAX_TIMEOUT_MS = 600_000;

export async function GET() {
  const available = await hermesAvailable();
  return NextResponse.json({
    available,
    bin: process.env.HERMES_CLI || (process.platform === 'win32' ? 'hermes.exe' : 'hermes'),
    defaultToolsets: process.env.HERMES_OPERATOR_TOOLSETS || 'web',
    hint: available
      ? 'POST { task } to run a task through the agent.'
      : 'Hermes CLI not found. Install Hermes or set HERMES_CLI to its path.',
  });
}

export async function POST(request: NextRequest) {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 });
  }

  const task = typeof body?.task === 'string' ? body.task.trim() : '';
  if (!task) {
    return NextResponse.json({ success: false, error: 'task is required' }, { status: 400 });
  }

  const timeoutMs =
    typeof body?.timeoutMs === 'number' && body.timeoutMs > 0
      ? Math.min(body.timeoutMs, MAX_TIMEOUT_MS)
      : undefined;

  const result = await runHermesTask({
    task,
    toolsets: typeof body?.toolsets === 'string' ? body.toolsets : undefined,
    model: typeof body?.model === 'string' ? body.model : undefined,
    timeoutMs,
  });

  return NextResponse.json(
    {
      success: result.ok,
      output: result.output,
      sessionId: result.sessionId,
      durationMs: result.durationMs,
      error: result.error,
    },
    { status: result.ok ? 200 : 500 }
  );
}
