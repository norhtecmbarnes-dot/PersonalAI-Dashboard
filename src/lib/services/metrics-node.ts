import fs from 'fs';
import path from 'path';

export interface MetricEvent {
  id: string;
  timestamp: number;
  type: 'api_call' | 'model_response' | 'error' | 'user_action' | 'feature_use' | 'document_upload' | 'chat_message';
  category: string;
  action: string;
  metadata: Record<string, any>;
  duration?: number;
  success: boolean;
  errorMessage?: string;
}

export interface AggregatedMetrics {
  period: 'hour' | 'day' | 'week' | 'month';
  startTime: number;
  endTime: number;
  
  apiCalls: {
    total: number;
    successful: number;
    failed: number;
    avgResponseTime: number;
    byEndpoint: Record<string, { count: number; avgTime: number; errors: number }>;
  };
  
  modelUsage: {
    byModel: Record<string, { calls: number; tokens: number; avgTime: number; errors: number }>;
    totalTokens: number;
    totalCalls: number;
    avgResponseTime: number;
  };
  
  features: {
    byFeature: Record<string, { uses: number; lastUsed: number }>;
    totalInteractions: number;
  };
  
  errors: {
    total: number;
    byType: Record<string, number>;
    recentErrors: Array<{ timestamp: number; message: string; category: string }>;
  };
  
  documents: {
    uploaded: number;
    byType: Record<string, number>;
    totalSize: number;
  };
  
  chats: {
    total: number;
    avgLength: number;
    byBrand: Record<string, number>;
  };
  
  health: {
    uptime: number;
    errorRate: number;
    avgLoadTime: number;
    lastUpdated: number;
  };
}

export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  score: number;
  issues: Array<{
    severity: 'low' | 'medium' | 'high';
    category: string;
    message: string;
    recommendation: string;
  }>;
  checks: Array<{
    name: string;
    status: 'pass' | 'warn' | 'fail';
    value: string | number;
    threshold: string | number;
  }>;
}

const METRICS_FILE = path.join(process.cwd(), 'data', 'metrics.json');

function ensureDataDir(): void {
  const dataDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

class MetricsService {
  private static instance: MetricsService;
  private events: MetricEvent[] = [];
  private readonly MAX_EVENTS = 10000;
  private cleanupInterval: NodeJS.Timeout | null = null;
  
  private constructor() {
    this.loadEvents();
    this.startPeriodicCleanup();
  }

  static getInstance(): MetricsService {
    if (!MetricsService.instance) {
      MetricsService.instance = new MetricsService();
    }
    return MetricsService.instance;
  }

  private loadEvents(): void {
    try {
      ensureDataDir();
      if (fs.existsSync(METRICS_FILE)) {
        const stored = fs.readFileSync(METRICS_FILE, 'utf-8');
        this.events = JSON.parse(stored);
        console.log('[Metrics] Loaded', this.events.length, 'events from file');
      }
    } catch (error) {
      console.error('[Metrics] Error loading events:', error);
      this.events = [];
    }
  }

  private saveEvents(): void {
    try {
      ensureDataDir();
      fs.writeFileSync(METRICS_FILE, JSON.stringify(this.events, null, 2));
    } catch (error) {
      console.error('[Metrics] Error saving events:', error);
      // Storage full, trim old events
      this.events = this.events.slice(-this.MAX_EVENTS / 2);
      try {
        fs.writeFileSync(METRICS_FILE, JSON.stringify(this.events, null, 2));
      } catch (error2) {
        console.error('[Metrics] Error saving trimmed events:', error2);
      }
    }
  }

  private startPeriodicCleanup(): void {
    // Clear any existing interval
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    
    this.cleanupInterval = setInterval(() => {
      const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      this.events = this.events.filter(e => e.timestamp > oneWeekAgo);
      this.saveEvents();
    }, 60 * 60 * 1000); // Clean every hour
  }

  cleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  recordEvent(event: Omit<MetricEvent, 'id' | 'timestamp'>): void {
    const fullEvent: MetricEvent = {
      ...event,
      id: `${event.type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
    };

    this.events.push(fullEvent);

    if (this.events.length > this.MAX_EVENTS) {
      this.events = this.events.slice(-this.MAX_EVENTS);
    }

    this.saveEvents();
  }

  recordApiCall(endpoint: string, duration: number, success: boolean, metadata?: Record<string, any>): void {
    this.recordEvent({
      type: 'api_call',
      category: 'api',
      action: endpoint,
      duration,
      success,
      metadata: metadata || {},
    });
  }

  recordModelResponse(model: string, tokens: number, duration: number, success: boolean, error?: string): void {
    this.recordEvent({
      type: 'model_response',
      category: 'ai',
      action: model,
      duration,
      success,
      metadata: { tokens },
      errorMessage: error,
    });
  }

  recordError(category: string, message: string, metadata?: Record<string, any>): void {
    this.recordEvent({
      type: 'error',
      category,
      action: 'error',
      success: false,
      errorMessage: message,
      metadata: metadata || {},
    });
  }

  recordFeatureUse(feature: string, metadata?: Record<string, any>): void {
    this.recordEvent({
      type: 'feature_use',
      category: 'feature',
      action: feature,
      success: true,
      metadata: metadata || {},
    });
  }

  recordDocumentUpload(fileType: string, size: number, success: boolean): void {
    this.recordEvent({
      type: 'document_upload',
      category: 'document',
      action: 'upload',
      success,
      metadata: { fileType, size },
    });
  }

  recordChatMessage(brandId: string, messageLength: number, model: string): void {
    this.recordEvent({
      type: 'chat_message',
      category: 'chat',
      action: 'message',
      success: true,
      metadata: { brandId, messageLength, model },
    });
  }

  getAggregatedMetrics(period: 'hour' | 'day' | 'week' | 'month' = 'day'): AggregatedMetrics {
    const now = Date.now();
    const periodMs: Record<string, number> = {
      hour: 60 * 60 * 1000,
      day: 24 * 60 * 60 * 1000,
      week: 7 * 24 * 60 * 60 * 1000,
      month: 30 * 24 * 60 * 60 * 1000,
    };

    const startTime = now - periodMs[period];
    const relevantEvents = this.events.filter(e => e.timestamp >= startTime);

    const apiCalls = this.aggregateApiCalls(relevantEvents);
    const modelUsage = this.aggregateModelUsage(relevantEvents);
    const features = this.aggregateFeatures(relevantEvents);
    const errors = this.aggregateErrors(relevantEvents);
    const documents = this.aggregateDocuments(relevantEvents);
    const chats = this.aggregateChats(relevantEvents);

    const health: AggregatedMetrics['health'] = {
      uptime: now - (this.events[0]?.timestamp || now),
      errorRate: relevantEvents.length > 0 ? errors.total / relevantEvents.length : 0,
      avgLoadTime: apiCalls.avgResponseTime,
      lastUpdated: now,
    };

    return {
      period,
      startTime,
      endTime: now,
      apiCalls,
      modelUsage,
      features,
      errors,
      documents,
      chats,
      health,
    };
  }

  private aggregateApiCalls(events: MetricEvent[]): AggregatedMetrics['apiCalls'] {
    const apiEvents = events.filter(e => e.type === 'api_call');
    const byEndpoint: Record<string, { count: number; avgTime: number; errors: number }> = {};

    let totalTime = 0;
    let successful = 0;
    let failed = 0;

    for (const event of apiEvents) {
      const endpoint = event.action;
      if (!byEndpoint[endpoint]) {
        byEndpoint[endpoint] = { count: 0, avgTime: 0, errors: 0 };
      }

      byEndpoint[endpoint].count++;
      if (event.duration) {
        byEndpoint[endpoint].avgTime = 
          (byEndpoint[endpoint].avgTime * (byEndpoint[endpoint].count - 1) + event.duration) / 
          byEndpoint[endpoint].count;
        totalTime += event.duration;
      }

      if (event.success) {
        successful++;
      } else {
        failed++;
        byEndpoint[endpoint].errors++;
      }
    }

    return {
      total: apiEvents.length,
      successful,
      failed,
      avgResponseTime: apiEvents.length > 0 ? totalTime / apiEvents.length : 0,
      byEndpoint,
    };
  }

  private aggregateModelUsage(events: MetricEvent[]): AggregatedMetrics['modelUsage'] {
    const modelEvents = events.filter(e => e.type === 'model_response');
    const byModel: Record<string, { calls: number; tokens: number; avgTime: number; errors: number }> = {};

    let totalTokens = 0;
    let totalTime = 0;

    for (const event of modelEvents) {
      const model = event.action;
      if (!byModel[model]) {
        byModel[model] = { calls: 0, tokens: 0, avgTime: 0, errors: 0 };
      }

      byModel[model].calls++;
      byModel[model].tokens += event.metadata?.tokens || 0;
      
      if (event.duration) {
        byModel[model].avgTime = 
          (byModel[model].avgTime * (byModel[model].calls - 1) + event.duration) / 
          byModel[model].calls;
        totalTime += event.duration;
      }

      if (!event.success) {
        byModel[model].errors++;
      }

      totalTokens += event.metadata?.tokens || 0;
    }

    return {
      byModel,
      totalTokens,
      totalCalls: modelEvents.length,
      avgResponseTime: modelEvents.length > 0 ? totalTime / modelEvents.length : 0,
    };
  }

  private aggregateFeatures(events: MetricEvent[]): AggregatedMetrics['features'] {
    const featureEvents = events.filter(e => e.type === 'feature_use');
    const byFeature: Record<string, { uses: number; lastUsed: number }> = {};

    for (const event of featureEvents) {
      const feature = event.action;
      if (!byFeature[feature]) {
        byFeature[feature] = { uses: 0, lastUsed: 0 };
      }
      byFeature[feature].uses++;
      byFeature[feature].lastUsed = Math.max(byFeature[feature].lastUsed, event.timestamp);
    }

    return {
      byFeature,
      totalInteractions: featureEvents.length,
    };
  }

  private aggregateErrors(events: MetricEvent[]): AggregatedMetrics['errors'] {
    const errorEvents = events.filter(e => !e.success || e.type === 'error');
    const byType: Record<string, number> = {};
    const recentErrors: Array<{ timestamp: number; message: string; category: string }> = [];

    for (const event of errorEvents) {
      const errorType = event.errorMessage || 'Unknown error';
      byType[errorType] = (byType[errorType] || 0) + 1;

      if (recentErrors.length < 20) {
        recentErrors.push({
          timestamp: event.timestamp,
          message: event.errorMessage || 'Unknown error',
          category: event.category,
        });
      }
    }

    return {
      total: errorEvents.length,
      byType,
      recentErrors: recentErrors.sort((a, b) => b.timestamp - a.timestamp),
    };
  }

  private aggregateDocuments(events: MetricEvent[]): AggregatedMetrics['documents'] {
    const docEvents = events.filter(e => e.type === 'document_upload');
    const byType: Record<string, number> = {};
    let totalSize = 0;
    let uploaded = 0;

    for (const event of docEvents) {
      if (event.success) {
        uploaded++;
        const fileType = event.metadata?.fileType || 'unknown';
        byType[fileType] = (byType[fileType] || 0) + 1;
        totalSize += event.metadata?.size || 0;
      }
    }

    return { uploaded, byType, totalSize };
  }

  private aggregateChats(events: MetricEvent[]): AggregatedMetrics['chats'] {
    const chatEvents = events.filter(e => e.type === 'chat_message');
    const byBrand: Record<string, number> = {};
    let totalLength = 0;

    for (const event of chatEvents) {
      const brandId = event.metadata?.brandId || 'unknown';
      byBrand[brandId] = (byBrand[brandId] || 0) + 1;
      totalLength += event.metadata?.messageLength || 0;
    }

    return {
      total: chatEvents.length,
      avgLength: chatEvents.length > 0 ? totalLength / chatEvents.length : 0,
      byBrand,
    };
  }

  getSystemHealth(): SystemHealth {
    const metrics = this.getAggregatedMetrics('day');
    const issues: SystemHealth['issues'] = [];
    const checks: SystemHealth['checks'] = [];

    // Check error rate
    const errorRate = metrics.apiCalls.total > 0 
      ? metrics.apiCalls.failed / metrics.apiCalls.total 
      : 0;
    
    checks.push({
      name: 'API Error Rate',
      status: errorRate < 0.05 ? 'pass' : errorRate < 0.15 ? 'warn' : 'fail',
      value: `${(errorRate * 100).toFixed(1)}%`,
      threshold: '< 5%',
    });

    if (errorRate >= 0.15) {
      issues.push({
        severity: 'high',
        category: 'reliability',
        message: `High error rate: ${(errorRate * 100).toFixed(1)}% of API calls failing`,
        recommendation: 'Review recent error logs and check external service status',
      });
    } else if (errorRate >= 0.05) {
      issues.push({
        severity: 'medium',
        category: 'reliability',
        message: `Elevated error rate: ${(errorRate * 100).toFixed(1)}%`,
        recommendation: 'Monitor for patterns in failing requests',
      });
    }

    // Check response time
    const avgResponseTime = metrics.apiCalls.avgResponseTime;
    checks.push({
      name: 'Avg Response Time',
      status: avgResponseTime < 2000 ? 'pass' : avgResponseTime < 5000 ? 'warn' : 'fail',
      value: `${Math.round(avgResponseTime)}ms`,
      threshold: '< 2000ms',
    });

    if (avgResponseTime >= 5000) {
      issues.push({
        severity: 'high',
        category: 'performance',
        message: `Slow API responses: avg ${Math.round(avgResponseTime)}ms`,
        recommendation: 'Consider caching, query optimization, or model selection changes',
      });
    }

    // Check model errors
    for (const [model, data] of Object.entries(metrics.modelUsage.byModel)) {
      const modelErrorRate = data.calls > 0 ? data.errors / data.calls : 0;
      if (modelErrorRate > 0.1) {
        issues.push({
          severity: 'medium',
          category: 'model',
          message: `Model "${model}" has ${(modelErrorRate * 100).toFixed(1)}% error rate`,
          recommendation: 'Consider switching models or checking API configuration',
        });
      }
    }

    // Check unused features
    const unusedFeatures = Object.entries(metrics.features.byFeature)
      .filter(([, data]) => data.uses === 0)
      .map(([feature]) => feature);

    checks.push({
      name: 'Feature Utilization',
      status: unusedFeatures.length < 5 ? 'pass' : 'warn',
      value: `${Object.keys(metrics.features.byFeature).length} features used`,
      threshold: 'Active engagement',
    });

    // Calculate overall health score
    let score = 100;
    for (const issue of issues) {
      score -= issue.severity === 'high' ? 20 : issue.severity === 'medium' ? 10 : 5;
    }
    score = Math.max(0, score);

    let status: SystemHealth['status'] = 'healthy';
    if (score < 50) status = 'unhealthy';
    else if (score < 80) status = 'degraded';

    return {
      status,
      score,
      issues,
      checks,
    };
  }

  getRecentEvents(limit: number = 100): MetricEvent[] {
    return this.events.slice(-limit).reverse();
  }

  clearMetrics(): void {
    this.events = [];
    try {
      ensureDataDir();
      if (fs.existsSync(METRICS_FILE)) {
        fs.unlinkSync(METRICS_FILE);
      }
    } catch (error) {
      console.error('[Metrics] Error clearing metrics:', error);
    }
  }

  exportMetrics(): string {
    return JSON.stringify({
      exportedAt: Date.now(),
      events: this.events,
      metrics: this.getAggregatedMetrics('week'),
    }, null, 2);
  }
}

export const metricsService = MetricsService.getInstance();