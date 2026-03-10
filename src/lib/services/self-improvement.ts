export interface ImprovementInsight {
  id: string;
  type: 'performance' | 'reliability' | 'usage' | 'feature' | 'security' | 'optimization';
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  impact: string;
  recommendation: string;
  actionableSteps: string[];
  metric?: {
    current: number;
    threshold: number;
    unit: string;
  };
  relatedFeature?: string;
  detectedAt: number;
}

export interface ImprovementReport {
  id: string;
  generatedAt: number;
  healthScore: number;
  insights: ImprovementInsight[];
  quickWins: ImprovementInsight[];
  priorities: {
    immediate: ImprovementInsight[];
    shortTerm: ImprovementInsight[];
    longTerm: ImprovementInsight[];
  };
  trend: {
    direction: 'improving' | 'stable' | 'declining';
    change: number;
  };
  featureHealth: Array<{
    feature: string;
    status: 'healthy' | 'warning' | 'unused' | 'broken';
    usage: number;
    lastUsed: number | null;
  }>;
  modelEfficiency: Array<{
    model: string;
    calls: number;
    avgTime: number;
    errorRate: number;
    recommendation: string;
  }>;
}

export interface SystemSnapshot {
  timestamp: number;
  metrics: {
    totalApiCalls: number;
    errorRate: number;
    avgResponseTime: number;
    totalTokens: number;
    activeUsers: number;
  };
  features: Record<string, { uses: number; errors: number }>;
  models: Record<string, { calls: number; avgTime: number; errors: number }>;
}

class SelfImprovementService {
  private static instance: SelfImprovementService;
  private reports: ImprovementReport[] = [];
  private snapshots: SystemSnapshot[] = [];
  private readonly MAX_REPORTS = 30;
  private readonly MAX_SNAPSHOTS = 168; // One per hour for a week
  private readonly STORAGE_KEY = 'ai_improvement_reports';
  private readonly SNAPSHOT_KEY = 'ai_system_snapshots';

  private constructor() {
    this.loadReports();
    this.loadSnapshots();
    this.startPeriodicSnapshot();
  }

  static getInstance(): SelfImprovementService {
    if (!SelfImprovementService.instance) {
      SelfImprovementService.instance = new SelfImprovementService();
    }
    return SelfImprovementService.instance;
  }

  private loadReports(): void {
    if (typeof window === 'undefined') return;
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        this.reports = JSON.parse(stored);
      }
    } catch {
      this.reports = [];
    }
  }

  private saveReports(): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.reports.slice(-this.MAX_REPORTS)));
    } catch {
      // Storage full or unavailable
    }
  }

  private loadSnapshots(): void {
    if (typeof window === 'undefined') return;
    try {
      const stored = localStorage.getItem(this.SNAPSHOT_KEY);
      if (stored) {
        this.snapshots = JSON.parse(stored);
      }
    } catch {
      this.snapshots = [];
    }
  }

  private saveSnapshots(): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(this.SNAPSHOT_KEY, JSON.stringify(this.snapshots.slice(-this.MAX_SNAPSHOTS)));
    } catch {
      // Storage full or unavailable
    }
  }

  private startPeriodicSnapshot(): void {
    if (typeof window === 'undefined') return;
    
    // Take snapshot every hour
    setInterval(() => {
      this.takeSnapshot();
    }, 60 * 60 * 1000);
  }

  private takeSnapshot(): void {
    if (typeof window === 'undefined') return;

    try {
      const metricsData = localStorage.getItem('ai_dashboard_metrics');
      const events = metricsData ? JSON.parse(metricsData) : [];

      const hourAgo = Date.now() - 60 * 60 * 1000;
      const recentEvents = events.filter((e: any) => e.timestamp > hourAgo);

      const apiCalls = recentEvents.filter((e: any) => e.type === 'api_call');
      const modelCalls = recentEvents.filter((e: any) => e.type === 'model_response');
      const errors = recentEvents.filter((e: any) => !e.success);

      const features: Record<string, { uses: number; errors: number }> = {};
      for (const event of recentEvents.filter((e: any) => e.type === 'feature_use')) {
        const feature = event.action;
        if (!features[feature]) {
          features[feature] = { uses: 0, errors: 0 };
        }
        features[feature].uses++;
      }

      const models: Record<string, { calls: number; avgTime: number; errors: number }> = {};
      for (const event of modelCalls) {
        const model = event.action;
        if (!models[model]) {
          models[model] = { calls: 0, avgTime: 0, errors: 0 };
        }
        models[model].calls++;
        if (event.duration) {
          models[model].avgTime = (models[model].avgTime + event.duration) / 2;
        }
        if (!event.success) {
          models[model].errors++;
        }
      }

      const snapshot: SystemSnapshot = {
        timestamp: Date.now(),
        metrics: {
          totalApiCalls: apiCalls.length,
          errorRate: apiCalls.length > 0 ? errors.length / apiCalls.length : 0,
          avgResponseTime: apiCalls.length > 0 
            ? apiCalls.reduce((sum: number, e: any) => sum + (e.duration || 0), 0) / apiCalls.length 
            : 0,
          totalTokens: modelCalls.reduce((sum: number, e: any) => sum + (e.metadata?.tokens || 0), 0),
          activeUsers: 1, // Single user for now
        },
        features,
        models,
      };

      this.snapshots.push(snapshot);
      this.saveSnapshots();
    } catch {
      // Snapshot failed
    }
  }

  async generateReport(metrics: any, codeHealth: any): Promise<ImprovementReport> {
    const insights = this.analyzeMetrics(metrics);
    insights.push(...this.analyzeCodeHealth(codeHealth));
    insights.push(...this.analyzeSnapshots());
    insights.push(...this.analyzeFeatures(metrics));

    const quickWins = insights
      .filter(i => i.severity === 'low' || i.severity === 'medium')
      .filter(i => i.actionableSteps.length <= 3)
      .slice(0, 5);

    const priorities = {
      immediate: insights.filter(i => i.severity === 'critical' || i.severity === 'high'),
      shortTerm: insights.filter(i => i.severity === 'medium'),
      longTerm: insights.filter(i => i.severity === 'low'),
    };

    const trend = this.calculateTrend();

    const featureHealth = this.getFeatureHealthHealth(metrics);

    const modelEfficiency = this.getModelEfficiency(metrics);

    const healthScore = this.calculateHealthScore(insights, metrics);

    const report: ImprovementReport = {
      id: `report_${Date.now()}`,
      generatedAt: Date.now(),
      healthScore,
      insights,
      quickWins,
      priorities,
      trend,
      featureHealth,
      modelEfficiency,
    };

    this.reports.push(report);
    this.saveReports();

    return report;
  }

  private analyzeMetrics(metrics: any): ImprovementInsight[] {
    const insights: ImprovementInsight[] = [];
    const now = Date.now();

    // High error rate
    if (metrics?.apiCalls?.total > 0) {
      const errorRate = metrics.apiCalls.failed / metrics.apiCalls.total;
      if (errorRate > 0.1) {
        insights.push({
          id: 'high_error_rate',
          type: 'reliability',
          severity: errorRate > 0.25 ? 'critical' : 'high',
          title: 'High API Error Rate',
          description: `${(errorRate * 100).toFixed(1)}% of API calls are failing`,
          impact: 'Users may experience broken functionality and poor experience',
          recommendation: 'Review error logs, check external service status, implement retry logic',
          actionableSteps: [
            'Check recent error logs in the dashboard',
            'Verify external API integrations are working',
            'Add error boundaries and fallback UIs',
            'Implement automatic retry with exponential backoff',
          ],
          metric: {
            current: errorRate * 100,
            threshold: 5,
            unit: '%',
          },
          detectedAt: now,
        });
      }
    }

    // Slow response times
    if (metrics?.apiCalls?.avgResponseTime > 3000) {
      insights.push({
        id: 'slow_responses',
        type: 'performance',
        severity: metrics.apiCalls.avgResponseTime > 5000 ? 'high' : 'medium',
        title: 'Slow API Response Times',
        description: `Average response time is ${Math.round(metrics.apiCalls.avgResponseTime)}ms`,
        impact: 'Users experience laggy interactions and may abandon tasks',
        recommendation: 'Optimize queries, add caching, or consider faster models for simple tasks',
        actionableSteps: [
          'Enable response caching for frequently requested data',
          'Use lighter models for simple queries',
          'Implement pagination for large data sets',
          'Add loading indicators to improve perceived performance',
        ],
        metric: {
          current: metrics.apiCalls.avgResponseTime,
          threshold: 2000,
          unit: 'ms',
        },
        detectedAt: now,
      });
    }

    // Model efficiency
    if (metrics?.modelUsage?.byModel) {
      for (const [model, data] of Object.entries(metrics.modelUsage.byModel)) {
        const modelData = data as any;
        if (modelData.calls > 5 && modelData.avgTime > 5000) {
          insights.push({
            id: `slow_model_${model.replace(/[^a-z0-9]/gi, '_')}`,
            type: 'optimization',
            severity: 'medium',
            title: `Slow Model: ${model}`,
            description: `${model} has average response time of ${Math.round(modelData.avgTime)}ms across ${modelData.calls} calls`,
            impact: 'Increased wait times and potentially higher costs',
            recommendation: 'Consider using a faster model for this use case or optimizing prompts',
            actionableSteps: [
              'Review what tasks are using this model',
              'Consider switching to a lighter model for simple queries',
              'Optimize prompt length and complexity',
              'Enable streaming for better perceived performance',
            ],
            metric: {
              current: modelData.avgTime,
              threshold: 3000,
              unit: 'ms',
            },
            detectedAt: now,
          });
        }
      }
    }

    return insights;
  }

  private analyzeCodeHealth(codeHealth: any): ImprovementInsight[] {
    const insights: ImprovementInsight[] = [];
    const now = Date.now();

    if (!codeHealth?.issues) return insights;

    // Group issues by category
    const byCategory: Record<string, any[]> = {};
    for (const issue of codeHealth.issues) {
      if (!byCategory[issue.category]) {
        byCategory[issue.category] = [];
      }
      byCategory[issue.category].push(issue);
    }

    for (const [category, issues] of Object.entries(byCategory)) {
      const criticalCount = issues.filter((i: any) => i.severity === 'error').length;
      if (criticalCount > 0) {
        insights.push({
          id: `code_health_${category}`,
          type: category === 'security' ? 'security' : 'reliability',
          severity: category === 'security' ? 'critical' : 'high',
          title: `${category.charAt(0).toUpperCase() + category.slice(1)} Issues Detected`,
          description: `${criticalCount} critical ${category} issue(s) found`,
          impact: category === 'security' 
            ? 'Potential security vulnerabilities could expose data or allow attacks'
            : 'May cause runtime errors or unexpected behavior',
          recommendation: issues[0]?.suggestion || 'Review and fix the identified issues',
          actionableSteps: [
            'Review the code health report for details',
            'Fix critical issues first',
            'Add automated tests to prevent regressions',
          ],
          detectedAt: now,
        });
      }
    }

    return insights;
  }

  private analyzeSnapshots(): ImprovementInsight[] {
    const insights: ImprovementInsight[] = [];
    const now = Date.now();

    if (this.snapshots.length < 2) return insights;

    // Compare last 24 hours vs previous 24 hours
    const dayAgo = now - 24 * 60 * 60 * 1000;
    const twoDaysAgo = now - 48 * 60 * 60 * 1000;

    const recent = this.snapshots.filter(s => s.timestamp > dayAgo);
    const previous = this.snapshots.filter(s => s.timestamp > twoDaysAgo && s.timestamp <= dayAgo);

    if (recent.length === 0 || previous.length === 0) return insights;

    const recentAvg = this.averageSnapshots(recent);
    const previousAvg = this.averageSnapshots(previous);

    // Check for degradation
    if (recentAvg.errorRate > previousAvg.errorRate * 1.5 && previousAvg.errorRate > 0) {
      insights.push({
        id: 'error_rate_increase',
        type: 'reliability',
        severity: 'high',
        title: 'Error Rate Increasing',
        description: `Error rate increased from ${(previousAvg.errorRate * 100).toFixed(1)}% to ${(recentAvg.errorRate * 100).toFixed(1)}%`,
        impact: 'System reliability is degrading - users are seeing more failures',
        recommendation: 'Investigate recent changes, check external service status',
        actionableSteps: [
          'Review recent deployments or changes',
          'Check external API status pages',
          'Add monitoring alerts for error thresholds',
        ],
        detectedAt: now,
      });
    }

    if (recentAvg.avgResponseTime > previousAvg.avgResponseTime * 1.5) {
      insights.push({
        id: 'performance_degradation',
        type: 'performance',
        severity: 'medium',
        title: 'Performance Degradation Detected',
        description: `Response times increased from ${Math.round(previousAvg.avgResponseTime)}ms to ${Math.round(recentAvg.avgResponseTime)}ms`,
        impact: 'User experience is getting worse',
        recommendation: 'Investigate what changed, consider performance optimizations',
        actionableSteps: [
          'Check for resource bottlenecks',
          'Review database query performance',
          'Consider implementing caching',
        ],
        detectedAt: now,
      });
    }

    return insights;
  }

  private averageSnapshots(snapshots: SystemSnapshot[]): { errorRate: number; avgResponseTime: number } {
    if (snapshots.length === 0) return { errorRate: 0, avgResponseTime: 0 };

    const errorRate = snapshots.reduce((sum, s) => sum + s.metrics.errorRate, 0) / snapshots.length;
    const avgResponseTime = snapshots.reduce((sum, s) => sum + s.metrics.avgResponseTime, 0) / snapshots.length;

    return { errorRate, avgResponseTime };
  }

  private analyzeFeatures(metrics: any): ImprovementInsight[] {
    const insights: ImprovementInsight[] = [];
    const now = Date.now();

    if (!metrics?.features?.byFeature) return insights;

    const features = metrics.features.byFeature;
    const totalUses = Object.values(features).reduce((sum: number, f: any) => sum + (f.uses || 0), 0);

    // Find unused features
    const knownFeatures = [
      'main_chat', 'brand_workspace', 'documents', 'experts', 'notes',
      'calendar', 'settings', 'research', 'self_improvement', 'book_writer',
    ];

    for (const feature of knownFeatures) {
      if (!features[feature] || features[feature].uses === 0) {
        insights.push({
          id: `unused_feature_${feature}`,
          type: 'feature',
          severity: 'low',
          title: `Unused Feature: ${feature.replace(/_/g, ' ')}`,
          description: `"${feature}" has not been used in the analysis period`,
          impact: 'Unused features add complexity and maintenance burden',
          recommendation: 'Consider whether this feature is needed or if it needs better discovery',
          actionableSteps: [
            'Evaluate if the feature provides value',
            'Consider removing if not needed',
            'Add to navigation or documentation if underdiscovered',
          ],
          relatedFeature: feature,
          detectedAt: now,
        });
      }
    }

    // Find broken features
    for (const [feature, data] of Object.entries(features)) {
      const featureData = data as any;
      if (featureData.uses > 0 && featureData.errors > 0) {
        const errorRate = featureData.errors / featureData.uses;
        if (errorRate > 0.25) {
          insights.push({
            id: `broken_feature_${feature}`,
            type: 'feature',
            severity: 'high',
            title: `Feature Issues: ${feature.replace(/_/g, ' ')}`,
            description: `${feature} has a ${(errorRate * 100).toFixed(1)}% error rate`,
            impact: 'Users cannot reliably use this feature',
            recommendation: 'Debug and fix the issues with this feature immediately',
            actionableSteps: [
              'Review error logs for this feature',
              'Test the feature manually',
              'Fix the root cause of errors',
            ],
            metric: {
              current: errorRate * 100,
              threshold: 5,
              unit: '%',
            },
            relatedFeature: feature,
            detectedAt: now,
          });
        }
      }
    }

    return insights;
  }

  private calculateTrend(): { direction: 'improving' | 'stable' | 'declining'; change: number } {
    if (this.reports.length < 2) {
      return { direction: 'stable', change: 0 };
    }

    const recent = this.reports[this.reports.length - 1].healthScore;
    const previous = this.reports[this.reports.length - 2].healthScore;
    const change = recent - previous;

    if (change > 5) return { direction: 'improving', change };
    if (change < -5) return { direction: 'declining', change };
    return { direction: 'stable', change };
  }

  private getFeatureHealthHealth(metrics: any): ImprovementReport['featureHealth'] {
    const result: ImprovementReport['featureHealth'] = [];
    const features = metrics?.features?.byFeature || {};

    const knownFeatures = [
      { name: 'Main Chat', key: 'main_chat' },
      { name: 'Brand Workspace', key: 'brand_workspace' },
      { name: 'Documents', key: 'documents' },
      { name: 'Experts', key: 'experts' },
      { name: 'Notes', key: 'notes' },
      { name: 'Calendar', key: 'calendar' },
      { name: 'Research', key: 'research' },
      { name: 'Intelligence', key: 'intelligence' },
      { name: 'Self Improvement', key: 'self_improvement' },
      { name: 'Document Creator', key: 'book_writer' },
    ];

    for (const feature of knownFeatures) {
      const data = features[feature.key] as any;
      const usage = data?.uses || 0;
      const lastUsed = data?.lastUsed || null;

      let status: 'healthy' | 'warning' | 'unused' | 'broken' = 'unused';
      if (usage > 0) {
        const errors = data?.errors || 0;
        const errorRate = errors / usage;
        status = errorRate > 0.25 ? 'broken' : errorRate > 0.1 ? 'warning' : 'healthy';
      }

      result.push({
        feature: feature.name,
        status,
        usage,
        lastUsed,
      });
    }

    return result;
  }

  private getModelEfficiency(metrics: any): ImprovementReport['modelEfficiency'] {
    const result: ImprovementReport['modelEfficiency'] = [];
    const models = metrics?.modelUsage?.byModel || {};

    for (const [model, data] of Object.entries(models)) {
      const modelData = data as any;
      const errorRate = modelData.calls > 0 ? modelData.errors / modelData.calls : 0;

      let recommendation = 'Good performance';
      if (modelData.avgTime > 5000) {
        recommendation = 'Consider using a faster model for simple queries';
      } else if (errorRate > 0.1) {
        recommendation = 'High error rate - check API configuration';
      } else if (modelData.calls > 100 && modelData.avgTime < 1000) {
        recommendation = 'Efficient model for high-volume use';
      }

      result.push({
        model,
        calls: modelData.calls || 0,
        avgTime: Math.round(modelData.avgTime || 0),
        errorRate,
        recommendation,
      });
    }

    return result.sort((a, b) => b.calls - a.calls);
  }

  private calculateHealthScore(insights: ImprovementInsight[], metrics: any): number {
    let score = 100;

    for (const insight of insights) {
      switch (insight.severity) {
        case 'critical':
          score -= 25;
          break;
        case 'high':
          score -= 15;
          break;
        case 'medium':
          score -= 5;
          break;
        case 'low':
          score -= 1;
          break;
      }
    }

    // Factor in error rate
    if (metrics?.apiCalls?.total > 0) {
      const errorRate = metrics.apiCalls.failed / metrics.apiCalls.total;
      score -= errorRate * 20;
    }

    return Math.max(0, Math.min(100, score));
  }

  getLatestReport(): ImprovementReport | null {
    return this.reports[this.reports.length - 1] || null;
  }

  getReportHistory(): ImprovementReport[] {
    return this.reports.slice(-10).reverse();
  }

  getSnapshots(): SystemSnapshot[] {
    return this.snapshots.slice(-24);
  }

  clearReports(): void {
    this.reports = [];
    if (typeof window !== 'undefined') {
      localStorage.removeItem(this.STORAGE_KEY);
    }
  }
}

export const selfImprovementService = SelfImprovementService.getInstance();