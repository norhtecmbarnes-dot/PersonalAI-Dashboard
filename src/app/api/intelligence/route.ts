import { NextResponse } from 'next/server';
import { intelligenceService } from '@/lib/intelligence/report-generator';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const action = body.action;

    if (action === 'generate') {
      const report = await intelligenceService.generateReport();
      return NextResponse.json({ success: true, report });
    } else if (action === 'history') {
      const history = intelligenceService.getRecentReports();
      return NextResponse.json({ success: true, reports: history });
    } else if (action === 'latest') {
      const report = intelligenceService.getLastReport();
      return NextResponse.json({ success: true, report });
    }

    return NextResponse.json(
      { error: 'Invalid action. Use: generate, history, or latest' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Intelligence API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const report = intelligenceService.getLastReport();
    const history = intelligenceService.getRecentReports();
    
    return NextResponse.json({
      success: true,
      latestReport: report,
      reportCount: history.length,
      lastGenerated: report?.createdAt || null,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
