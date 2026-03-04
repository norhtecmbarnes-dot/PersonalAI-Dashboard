import { NextResponse } from 'next/server';
import { researchAgent } from '@/lib/agent/research-agent';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const action = body.action;

    if (action === 'research') {
      const report = await researchAgent.performResearch();
      return NextResponse.json({ success: true, report });
    }

    if (action === 'history') {
      const history = researchAgent.getReportHistory();
      return NextResponse.json({ success: true, reports: history });
    }

    return NextResponse.json(
      { error: 'Invalid action. Use: research or history' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Research API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const report = researchAgent.getLatestReport();
    const shouldRun = researchAgent.shouldRunResearch();

    return NextResponse.json({
      success: true,
      latestReport: report,
      shouldRunResearch: shouldRun,
      lastResearch: report?.timestamp || null,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
