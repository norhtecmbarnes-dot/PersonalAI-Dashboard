import { NextRequest, NextResponse } from 'next/server';
import { metricsService } from '@/lib/services/metrics';
import { codeHealthService } from '@/lib/services/code-health';
import { selfImprovementService } from '@/lib/services/self-improvement';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'metrics';

    switch (action) {
      case 'metrics': {
        const period = (searchParams.get('period') || 'day') as 'hour' | 'day' | 'week' | 'month';
        const metrics = metricsService.getAggregatedMetrics(period);
        return NextResponse.json({ metrics });
      }

      case 'health': {
        const health = metricsService.getSystemHealth();
        return NextResponse.json({ health });
      }

      case 'code-health': {
        const codeHealth = await codeHealthService.analyzeCodeHealth();
        return NextResponse.json({ codeHealth });
      }

      case 'features': {
        const features = codeHealthService.getFeatureStatus();
        return NextResponse.json({ features });
      }

      case 'report': {
        const report = selfImprovementService.getLatestReport();
        return NextResponse.json({ report });
      }

      case 'history': {
        const reports = selfImprovementService.getReportHistory();
        return NextResponse.json({ reports });
      }

      case 'snapshots': {
        const snapshots = selfImprovementService.getSnapshots();
        return NextResponse.json({ snapshots });
      }

      case 'events': {
        const limit = parseInt(searchParams.get('limit') || '100');
        const events = metricsService.getRecentEvents(limit);
        return NextResponse.json({ events });
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Metrics API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, ...data } = body;

    switch (action) {
      case 'record-event': {
        metricsService.recordEvent(data);
        return NextResponse.json({ success: true });
      }

      case 'record-api': {
        metricsService.recordApiCall(
          data.endpoint,
          data.duration,
          data.success,
          data.metadata
        );
        return NextResponse.json({ success: true });
      }

      case 'record-model': {
        metricsService.recordModelResponse(
          data.model,
          data.tokens,
          data.duration,
          data.success,
          data.error
        );
        return NextResponse.json({ success: true });
      }

      case 'record-feature': {
        metricsService.recordFeatureUse(data.feature, data.metadata);
        return NextResponse.json({ success: true });
      }

      case 'record-error': {
        metricsService.recordError(data.category, data.message, data.metadata);
        return NextResponse.json({ success: true });
      }

      case 'record-document': {
        metricsService.recordDocumentUpload(data.fileType, data.size, data.success);
        return NextResponse.json({ success: true });
      }

      case 'record-chat': {
        metricsService.recordChatMessage(data.brandId, data.messageLength, data.model);
        return NextResponse.json({ success: true });
      }

      case 'generate-report': {
        const metrics = metricsService.getAggregatedMetrics('day');
        const codeHealth = await codeHealthService.analyzeCodeHealth();
        const report = await selfImprovementService.generateReport(metrics, codeHealth);
        return NextResponse.json({ report });
      }

      case 'clear-metrics': {
        metricsService.clearMetrics();
        return NextResponse.json({ success: true });
      }

      case 'clear-reports': {
        selfImprovementService.clearReports();
        return NextResponse.json({ success: true });
      }

      case 'export': {
        const exported = metricsService.exportMetrics();
        return NextResponse.json({ data: exported });
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Metrics API POST error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}