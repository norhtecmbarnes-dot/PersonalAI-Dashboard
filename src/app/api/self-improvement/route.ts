import { NextResponse } from 'next/server';
import { metricsService } from '@/lib/services/metrics';
import { codeHealthService } from '@/lib/services/code-health';
import { selfImprovementService } from '@/lib/services/self-improvement';
import { toolEfficiencyAnalyzer } from '@/lib/services/tool-efficiency';
import { toolRegistry } from '@/lib/services/tool-registry';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'report';

    switch (action) {
      case 'report': {
        const metrics = metricsService.getAggregatedMetrics('day');
        const codeHealth = await codeHealthService.analyzeCodeHealth();
        const report = await selfImprovementService.generateReport(metrics, codeHealth);
        const toolEfficiency = toolEfficiencyAnalyzer.generateReport();
        const toolStats = toolRegistry.getStats();
        
        return NextResponse.json({
          report,
          toolEfficiency,
          toolStats,
        });
      }

      case 'tools': {
        const tools = toolRegistry.getToolDescriptions();
        const stats = toolRegistry.getStats();
        const efficiency = toolEfficiencyAnalyzer.generateReport();
        
        return NextResponse.json({ tools, stats, efficiency });
      }

      case 'recommendations': {
        const query = searchParams.get('query') || '';
        const recommendations = toolEfficiencyAnalyzer.getRecommendationsForQuery(
          query, 
          toolRegistry.getAllTools().map(t => t.name)
        );
        return NextResponse.json({ recommendations });
      }

      case 'metrics': {
        const period = (searchParams.get('period') || 'day') as 'hour' | 'day' | 'week';
        const metrics = metricsService.getAggregatedMetrics(period);
        return NextResponse.json({ metrics });
      }

      case 'health': {
        const health = metricsService.getSystemHealth();
        return NextResponse.json({ health });
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Self-improvement API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, ...data } = body;

    switch (action) {
      case 'execute-tool': {
        const result = await toolRegistry.executeTool(data.tool, data.parameters || {});
        return NextResponse.json(result);
      }

      case 'record-workload': {
        toolEfficiencyAnalyzer.recordWorkload(
          data.query,
          data.toolsUsed,
          data.totalDuration,
          data.totalTokens,
          data.success
        );
        return NextResponse.json({ success: true });
      }

      case 'generate-report': {
        const metrics = metricsService.getAggregatedMetrics('day');
        const codeHealth = await codeHealthService.analyzeCodeHealth();
        const report = await selfImprovementService.generateReport(metrics, codeHealth);
        const toolEfficiency = toolEfficiencyAnalyzer.generateReport();
        
        metricsService.recordFeatureUse('self_improvement', { action: 'generate_report' });
        
        return NextResponse.json({ report, toolEfficiency });
      }

      case 'clear': {
        if (data.clearMetrics) metricsService.clearMetrics();
        if (data.clearReports) selfImprovementService.clearReports();
        if (data.clearToolData) toolEfficiencyAnalyzer.clearData();
        return NextResponse.json({ success: true });
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Self-improvement API POST error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}