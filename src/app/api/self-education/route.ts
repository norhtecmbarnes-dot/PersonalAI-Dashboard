export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import {
  runSelfEducation,
  getSelfEducationStatus,
  listReports,
  readReport,
  listProposals,
  setProposalStatus,
  type ImprovementProposal,
} from '@/lib/agent/self-education';
import { challengeAlpha, getAlphaState } from '@/lib/models/alpha';
import { getOllamaModels, getExternalModels } from '@/lib/models/sdk.server';
import { isLocalOnly, isCloudModelId } from '@/lib/config/local-first';

/**
 * Self-Education API.
 *
 * GET  /api/self-education?action=status|reports|latest|proposals|alpha
 * POST /api/self-education
 *   { action: 'run' }                                  → research → rank → report
 *   { action: 'challenge', models?: string[] }          → hold an Alpha challenge
 *   { action: 'decide', id, status }                    → approve/reject a proposal
 *   { action: 'read', name }                            → read one report
 */

/** Candidate models for an Alpha challenge (local first; cloud only if allowed). */
async function candidateModels(): Promise<string[]> {
  const out: string[] = [];
  try {
    const ollama = await getOllamaModels().catch(() => [] as any[]);
    for (const m of ollama || []) {
      const id = `ollama/${m.name}`;
      if (!isCloudModelId(id)) out.push(id);
    }
  } catch {
    /* ignore */
  }
  if (!isLocalOnly()) {
    for (const m of getExternalModels() || []) out.push(m.id);
  }
  // Prefer a small, fast, representative set.
  const preferred = ['ollama/qwen3.5:9b', 'ollama/gemma4:latest', 'ollama/gemma3:27b'];
  const picked = preferred.filter(p => out.includes(p));
  const rest = out.filter(o => !picked.includes(o));
  return [...picked, ...rest].slice(0, 4);
}

export async function GET(request: NextRequest) {
  const action = new URL(request.url).searchParams.get('action') || 'status';

  switch (action) {
    case 'status':
      return NextResponse.json({ success: true, status: getSelfEducationStatus() });
    case 'alpha':
      return NextResponse.json({ success: true, alpha: getAlphaState() });
    case 'reports':
      return NextResponse.json({ success: true, reports: listReports() });
    case 'latest': {
      const md = readReport('latest.md');
      return NextResponse.json({ success: true, report: md });
    }
    case 'proposals':
      return NextResponse.json({ success: true, proposals: listProposals() });
    default:
      return NextResponse.json({ success: false, error: `Unknown action: ${action}` }, { status: 400 });
  }
}

export async function POST(request: NextRequest) {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 });
  }
  const action = body?.action;

  switch (action) {
    case 'run': {
      const result = await runSelfEducation();
      return NextResponse.json({ success: true, result });
    }
    case 'challenge': {
      const models =
        Array.isArray(body.models) && body.models.length > 0 ? body.models : await candidateModels();
      if (models.length === 0) {
        return NextResponse.json(
          { success: false, error: 'No candidate models available (is Ollama running?)' },
          { status: 400 }
        );
      }
      const result = await challengeAlpha(models);
      return NextResponse.json({ success: true, result });
    }
    case 'decide': {
      const { id, status } = body as { id?: string; status?: ImprovementProposal['status'] };
      if (!id || !status) {
        return NextResponse.json({ success: false, error: 'id and status are required' }, { status: 400 });
      }
      if (!['pending', 'approved', 'rejected', 'applied'].includes(status)) {
        return NextResponse.json({ success: false, error: `Invalid status: ${status}` }, { status: 400 });
      }
      const updated = setProposalStatus(id, status);
      if (!updated) {
        return NextResponse.json({ success: false, error: `No proposal with id ${id}` }, { status: 404 });
      }
      return NextResponse.json({ success: true, proposal: updated });
    }
    case 'read': {
      const name = String(body?.name || 'latest.md');
      const md = readReport(name);
      if (md == null) {
        return NextResponse.json({ success: false, error: `No report named ${name}` }, { status: 404 });
      }
      return NextResponse.json({ success: true, report: md });
    }
    default:
      return NextResponse.json(
        { success: false, error: `Unknown action: ${action ?? '(none)'}` },
        { status: 400 }
      );
  }
}
