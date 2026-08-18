export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { procurementResearch } from '@/lib/services/procurement-research';
import { brandWorkspace } from '@/lib/services/brand-workspace';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId, model } = body;

    if (!projectId) {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
    }

    const result = await procurementResearch.runResearch(projectId, model);

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error('Procurement research API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Research failed' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
    }

    const outputs = await brandWorkspace.getGeneratedOutputs(projectId);
    const research = outputs
      .filter(o => o.type === 'report' && o.title.startsWith('Market Research'))
      .sort((a, b) => b.createdAt - a.createdAt);

    return NextResponse.json({ success: true, research });
  } catch (error) {
    console.error('Procurement research API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load research' },
      { status: 500 }
    );
  }
}
