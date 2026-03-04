import { NextResponse } from 'next/server';
import { metricsService } from '@/lib/services/metrics';
import { codeHealthService } from '@/lib/services/code-health';
import { selfImprovementService } from '@/lib/services/self-improvement';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const action = body.action;

    if (action === 'run' || action === 'generate-report') {
      const metrics = metricsService.getAggregatedMetrics('day');
      const codeHealth = await codeHealthService.analyzeCodeHealth();
      const report = await selfImprovementService.generateReport(metrics, codeHealth);
      
      metricsService.recordFeatureUse('self_improvement', { action: 'generate_report' });
      
      return NextResponse.json({ success: true, report });
    } else if (action === 'history') {
      const history = selfImprovementService.getReportHistory();
      return NextResponse.json({ success: true, reports: history });
    }

    return NextResponse.json(
      { error: 'Invalid action. Use: run or history' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Self-improvement API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const report = selfImprovementService.getLatestReport();
    const history = selfImprovementService.getReportHistory();
    const health = metricsService.getSystemHealth();
    const codeHealth = codeHealthService.getLastReport();
    
    return NextResponse.json({
      success: true,
      latestReport: report,
      reportCount: history.length,
      systemHealth: health,
      codeHealth,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}