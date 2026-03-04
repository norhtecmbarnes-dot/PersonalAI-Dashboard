/**
 * Metrics Service - Safe version for all runtimes
 * Uses SQLite database instead of file system
 */

import { sqlDatabase } from '@/lib/database/sqlite';

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

class MetricsServiceSafe {
  private static instance: MetricsServiceSafe;
  private events: MetricEvent[] = [];
  private readonly MAX_EVENTS = 1000; // Keep in memory only
  private isNodeRuntime = typeof process !== 'undefined' && typeof process.cwd === 'function';
  
  private constructor() {
    // Load from database on init
    this.loadFromDatabase();
  }
  
  static getInstance(): MetricsServiceSafe {
    if (!MetricsServiceSafe.instance) {
      MetricsServiceSafe.instance = new MetricsServiceSafe();
    }
    return MetricsServiceSafe.instance;
  }
  
  private loadFromDatabase(): void {
    try {
      // Load recent events from database
      const eventsJson = sqlDatabase.getSetting('metrics_events');
      if (eventsJson) {
        this.events = JSON.parse(eventsJson);
      }
    } catch (e) {
      console.log('[Metrics] Could not load from database');
      this.events = [];
    }
  }
  
  private saveToDatabase(): void {
    try {
      // Keep only last 1000 events
      const eventsToSave = this.events.slice(-this.MAX_EVENTS);
      sqlDatabase.setSetting('metrics_events', JSON.stringify(eventsToSave));
    } catch (e) {
      console.error('[Metrics] Could not save to database:', e);
    }
  }
  
  recordEvent(event: Omit<MetricEvent, 'id' | 'timestamp'>): void {
    const fullEvent: MetricEvent = {
      ...event,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
    };
    
    this.events.push(fullEvent);
    
    // Keep only recent events in memory
    if (this.events.length > this.MAX_EVENTS) {
      this.events = this.events.slice(-this.MAX_EVENTS);
    }
    
    // Save to database periodically
    if (this.events.length % 10 === 0) {
      this.saveToDatabase();
    }
  }
  
  getEvents(
    startTime?: number,
    endTime?: number,
    type?: MetricEvent['type'],
    limit: number = 100
  ): MetricEvent[] {
    let filtered = this.events;
    
    if (startTime) {
      filtered = filtered.filter(e => e.timestamp >= startTime);
    }
    
    if (endTime) {
      filtered = filtered.filter(e => e.timestamp <= endTime);
    }
    
    if (type) {
      filtered = filtered.filter(e => e.type === type);
    }
    
    return filtered.slice(-limit);
  }
  
  aggregateMetrics(period: 'hour' | 'day' | 'week' | 'month' = 'day'): AggregatedMetrics {
    const now = Date.now();
    const periodMs = {
      hour: 60 * 60 * 1000,
      day: 24 * 60 * 60 * 1000,
      week: 7 * 24 * 60 * 60 * 1000,
      month: 30 * 24 * 60 * 60 * 1000,
    };
    
    const startTime = now - periodMs[period];
    const events = this.getEvents(startTime, now, undefined, 10000);
    
    const apiEvents = events.filter(e => e.type === 'api_call');
    const modelEvents = events.filter(e => e.type === 'model_response');
    const errorEvents = events.filter(e => e.type === 'error');
    const chatEvents = events.filter(e => e.type === 'chat_message');
    const docEvents = events.filter(e => e.type === 'document_upload');
    
    return {
      period,
      startTime,
      endTime: now,
      
      apiCalls: {
        total: apiEvents.length,
        successful: apiEvents.filter(e => e.success).length,
        failed: apiEvents.filter(e => !e.success).length,
        avgResponseTime: this.avg(apiEvents.map(e => e.duration || 0)),
        byEndpoint: this.groupByEndpoint(apiEvents),
      },
      
      modelUsage: {
        byModel: this.groupByModel(modelEvents),
        totalTokens: modelEvents.reduce((sum, e) => sum + (e.metadata?.tokens || 0), 0),
        totalCalls: modelEvents.length,
        avgResponseTime: this.avg(modelEvents.map(e => e.duration || 0)),
      },
      
      features: {
        byFeature: this.groupByFeature(events),
        totalInteractions: events.filter(e => e.type === 'feature_use').length,
      },
      
      errors: {
        total: errorEvents.length,
        byType: this.groupByErrorType(errorEvents),
        recentErrors: errorEvents.slice(-10).map(e => ({
          timestamp: e.timestamp,
          message: e.errorMessage || 'Unknown error',
          category: e.category,
        })),
      },
      
      documents: {
        uploaded: docEvents.length,
        byType: this.countByType(docEvents, 'documentType'),
        totalSize: docEvents.reduce((sum, e) => sum + (e.metadata?.size || 0), 0),
      },
      
      chats: {
        total: chatEvents.length,
        avgLength: this.avg(chatEvents.map(e => e.metadata?.messageLength || 0)),
        byBrand: this.countBy(chatEvents, 'brandId'),
      },
      
      health: {
        uptime: 100,
        errorRate: events.length > 0 ? (errorEvents.length / events.length) * 100 : 0,
        avgLoadTime: this.avg(apiEvents.map(e => e.duration || 0)),
        lastUpdated: now,
      },
    };
  }
  
  private avg(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((a, b) => a + b, 0) / values.length;
  }
  
  private groupByEndpoint(events: MetricEvent[]): Record<string, { count: number; avgTime: number; errors: number }> {
    const grouped: Record<string, { times: number[]; errors: number }> = {};
    
    for (const event of events) {
      const endpoint = event.metadata?.endpoint || 'unknown';
      if (!grouped[endpoint]) {
        grouped[endpoint] = { times: [], errors: 0 };
      }
      grouped[endpoint].times.push(event.duration || 0);
      if (!event.success) {
        grouped[endpoint].errors++;
      }
    }
    
    const result: Record<string, { count: number; avgTime: number; errors: number }> = {};
    for (const [endpoint, data] of Object.entries(grouped)) {
      result[endpoint] = {
        count: data.times.length,
        avgTime: this.avg(data.times),
        errors: data.errors,
      };
    }
    
    return result;
  }
  
  private groupByModel(events: MetricEvent[]): Record<string, { calls: number; tokens: number; avgTime: number; errors: number }> {
    const grouped: Record<string, { calls: number; tokens: number; times: number[]; errors: number }> = {};
    
    for (const event of events) {
      const model = event.metadata?.model || 'unknown';
      if (!grouped[model]) {
        grouped[model] = { calls: 0, tokens: 0, times: [], errors: 0 };
      }
      grouped[model].calls++;
      grouped[model].tokens += event.metadata?.tokens || 0;
      grouped[model].times.push(event.duration || 0);
      if (!event.success) {
        grouped[model].errors++;
      }
    }
    
    const result: Record<string, { calls: number; tokens: number; avgTime: number; errors: number }> = {};
    for (const [model, data] of Object.entries(grouped)) {
      result[model] = {
        calls: data.calls,
        tokens: data.tokens,
        avgTime: this.avg(data.times),
        errors: data.errors,
      };
    }
    
    return result;
  }
  
  private groupByFeature(events: MetricEvent[]): Record<string, { uses: number; lastUsed: number }> {
    const grouped: Record<string, { uses: number; lastUsed: number }> = {};
    
    for (const event of events.filter(e => e.type === 'feature_use')) {
      const feature = event.metadata?.feature || event.action || 'unknown';
      if (!grouped[feature]) {
        grouped[feature] = { uses: 0, lastUsed: 0 };
      }
      grouped[feature].uses++;
      grouped[feature].lastUsed = Math.max(grouped[feature].lastUsed, event.timestamp);
    }
    
    return grouped;
  }
  
  private groupByErrorType(events: MetricEvent[]): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const event of events) {
      const type = event.metadata?.errorType || 'unknown';
      counts[type] = (counts[type] || 0) + 1;
    }
    return counts;
  }
  
  private countByType(events: MetricEvent[], typeKey: string): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const event of events) {
      const type = event.metadata?.[typeKey] || 'unknown';
      counts[type] = (counts[type] || 0) + 1;
    }
    return counts;
  }
  
  private countBy(events: MetricEvent[], key: string): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const event of events) {
      const value = event.metadata?.[key] || 'unknown';
      counts[value] = (counts[value] || 0) + 1;
    }
    return counts;
  }
  
  getSystemHealth(): SystemHealth {
    const metrics = this.aggregateMetrics('hour');
    const issues: SystemHealth['issues'] = [];
    const checks: SystemHealth['checks'] = [];
    
    // Error rate check
    const errorRate = metrics.health.errorRate;
    checks.push({
      name: 'Error Rate',
      status: errorRate < 5 ? 'pass' : errorRate < 15 ? 'warn' : 'fail',
      value: errorRate.toFixed(2) + '%',
      threshold: '5%',
    });
    
    if (errorRate > 5) {
      issues.push({
        severity: errorRate > 15 ? 'high' : 'medium',
        category: 'Reliability',
        message: `Error rate is ${errorRate.toFixed(2)}%`,
        recommendation: errorRate > 15 
          ? 'Investigate recent errors immediately'
          : 'Monitor error trends',
      });
    }
    
    // Response time check
    const avgResponseTime = metrics.apiCalls.avgResponseTime;
    checks.push({
      name: 'Response Time',
      status: avgResponseTime < 500 ? 'pass' : avgResponseTime < 2000 ? 'warn' : 'fail',
      value: avgResponseTime.toFixed(0) + 'ms',
      threshold: '500ms',
    });
    
    if (avgResponseTime > 500) {
      issues.push({
        severity: avgResponseTime > 2000 ? 'high' : 'medium',
        category: 'Performance',
        message: `Average response time is ${avgResponseTime.toFixed(0)}ms`,
        recommendation: avgResponseTime > 2000
          ? 'Check model availability and system resources'
          : 'Consider using faster models for time-sensitive operations',
      });
    }
    
    // Calculate health score
    const score = Math.max(0, 100 - (errorRate * 2) - (avgResponseTime > 500 ? (avgResponseTime - 500) / 50 : 0));
    
    return {
      status: score > 80 ? 'healthy' : score > 50 ? 'degraded' : 'unhealthy',
      score: Math.round(score),
      issues,
      checks,
    };
  }
  
  flush(): void {
    this.saveToDatabase();
  }

  // Additional methods for API compatibility
  getAggregatedMetrics(period: 'hour' | 'day' | 'week' | 'month' = 'day'): AggregatedMetrics {
    return this.aggregateMetrics(period);
  }

  getRecentEvents(limit: number = 100): MetricEvent[] {
    return this.getEvents(undefined, undefined, undefined, limit);
  }

  recordApiCall(endpoint: string, duration: number, success: boolean, metadata?: Record<string, any>): void {
    this.recordEvent({
      type: 'api_call',
      category: 'api',
      action: endpoint,
      metadata: { endpoint, duration, ...metadata },
      duration,
      success,
    });
  }

  recordModelResponse(model: string, tokens: number, duration: number, success: boolean, error?: string): void {
    this.recordEvent({
      type: 'model_response',
      category: 'model',
      action: 'response',
      metadata: { model, tokens },
      duration,
      success,
      errorMessage: error,
    });
  }

  recordFeatureUse(feature: string, metadata?: Record<string, any>): void {
    this.recordEvent({
      type: 'feature_use',
      category: 'feature',
      action: feature,
      metadata: metadata || {},
      success: true,
    });
  }

  recordError(category: string, message: string, metadata?: Record<string, any>): void {
    this.recordEvent({
      type: 'error',
      category,
      action: 'error',
      metadata: metadata || {},
      success: false,
      errorMessage: message,
    });
  }

  recordDocumentUpload(fileType: string, size: number, success: boolean): void {
    this.recordEvent({
      type: 'document_upload',
      category: 'document',
      action: 'upload',
      metadata: { fileType, size },
      success,
    });
  }

  recordChatMessage(brandId: string | undefined, messageLength: number, model: string): void {
    this.recordEvent({
      type: 'chat_message',
      category: 'chat',
      action: 'message',
      metadata: { brandId, messageLength, model },
      success: true,
    });
  }

  clearMetrics(): void {
    this.events = [];
    this.saveToDatabase();
  }

  exportMetrics(): string {
    return JSON.stringify(this.events, null, 2);
  }
}

export const metricsService = MetricsServiceSafe.getInstance();

// Backward compatible exports
export const recordMetric = (event: Omit<MetricEvent, 'id' | 'timestamp'>) => 
  metricsService.recordEvent(event);

export const getMetrics = (period?: 'hour' | 'day' | 'week') => 
  metricsService.aggregateMetrics(period);

export const getSystemHealth = () => metricsService.getSystemHealth();
