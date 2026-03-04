export interface CodeIssue {
  id: string;
  file: string;
  line?: number;
  column?: number;
  severity: 'error' | 'warning' | 'info' | 'suggestion';
  category: 'typescript' | 'security' | 'performance' | 'maintainability' | 'best-practice';
  message: string;
  suggestion?: string;
  fixAvailable: boolean;
}

export interface CodeHealthReport {
  timestamp: number;
  summary: {
    totalFiles: number;
    filesWithIssues: number;
    totalIssues: number;
    errors: number;
    warnings: number;
    suggestions: number;
    score: number;
  };
  issues: CodeIssue[];
  byCategory: Record<string, number>;
  bySeverity: Record<string, number>;
  topIssues: CodeIssue[];
  recommendations: Array<{
    priority: 'high' | 'medium' | 'low';
    title: string;
    description: string;
    affectedFiles: number;
    action: string;
  }>;
}

export interface FeatureUsage {
  name: string;
  route: string;
  uses: number;
  lastUsed: number | null;
  avgResponseTime: number;
  errorRate: number;
  status: 'active' | 'inactive' | 'broken';
}

class CodeHealthService {
  private static instance: CodeHealthService;
  private lastReport: CodeHealthReport | null = null;

  private constructor() {}

  static getInstance(): CodeHealthService {
    if (!CodeHealthService.instance) {
      CodeHealthService.instance = new CodeHealthService();
    }
    return CodeHealthService.instance;
  }

  async analyzeCodeHealth(): Promise<CodeHealthReport> {
    if (typeof window === 'undefined') {
      return this.createServerSideReport();
    }

    const issues: CodeIssue[] = [];

    issues.push(...await this.checkClientSideIssues());
    issues.push(...await this.checkFeatureUsage());

    const report = this.buildReport(issues);
    this.lastReport = report;
    return report;
  }

  private async checkClientSideIssues(): Promise<CodeIssue[]> {
    const issues: CodeIssue[] = [];

    if ('PerformanceObserver' in window) {
      try {
        const perfEntries = performance.getEntriesByType('navigation');
        if (perfEntries.length > 0) {
          const nav = perfEntries[0] as PerformanceNavigationTiming;
          if (nav.loadEventEnd - nav.fetchStart > 5000) {
            issues.push({
              id: 'perf_slow_load',
              file: 'application',
              severity: 'warning',
              category: 'performance',
              message: `Slow initial page load: ${Math.round(nav.loadEventEnd - nav.fetchStart)}ms`,
              suggestion: 'Consider code splitting, lazy loading, or reducing initial bundle size',
              fixAvailable: false,
            });
          }
        }
      } catch {
        // Performance API not available
      }
    }

    if ('memory' in performance) {
      const memory = (performance as any).memory;
      if (memory) {
        const usedMB = memory.usedJSHeapSize / (1024 * 1024);
        const limitMB = memory.jsHeapSizeLimit / (1024 * 1024);
        const usagePercent = (usedMB / limitMB) * 100;

        if (usagePercent > 80) {
          issues.push({
            id: 'perf_memory_high',
            file: 'application',
            severity: 'warning',
            category: 'performance',
            message: `High memory usage: ${Math.round(usedMB)}MB (${Math.round(usagePercent)}% of limit)`,
            suggestion: 'Check for memory leaks, clear unused data, implement pagination',
            fixAvailable: false,
          });
        }
      }
    }

    try {
      const stored = localStorage.length;
      let totalSize = 0;
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          totalSize += localStorage.getItem(key)?.length || 0;
        }
      }

      const sizeMB = (totalSize * 2) / (1024 * 1024); // UTF-16 = 2 bytes per char
      if (sizeMB > 4) {
        issues.push({
          id: 'storage_large',
          file: 'localStorage',
          severity: 'warning',
          category: 'performance',
          message: `Large localStorage usage: ${sizeMB.toFixed(2)}MB (${stored} keys)`,
          suggestion: 'Consider using IndexedDB for large data or implementing cleanup',
          fixAvailable: false,
        });
      }
    } catch {
      // Storage check failed
    }

    return issues;
  }

  private async checkFeatureUsage(): Promise<CodeIssue[]> {
    const issues: CodeIssue[] = [];

    try {
      const metricsData = localStorage.getItem('ai_dashboard_metrics');
      if (!metricsData) return issues;

      const events = JSON.parse(metricsData);
      if (!Array.isArray(events)) return issues;

      const recentEvents = events.filter((e: any) => 
        e.timestamp > Date.now() - 7 * 24 * 60 * 60 * 1000
      );

      const featureEvents = recentEvents.filter((e: any) => e.type === 'feature_use');
      const errorEvents = recentEvents.filter((e: any) => !e.success);

      const featureUsage: Record<string, number> = {};
      for (const event of featureEvents) {
        featureUsage[event.action] = (featureUsage[event.action] || 0) + 1;
      }

      const expectedFeatures = [
        'main_chat', 'brand_workspace', 'documents', 'experts', 'notes',
        'calendar', 'settings', 'research', 'self_reflection',
      ];

      for (const feature of expectedFeatures) {
        if (!featureUsage[feature]) {
          issues.push({
            id: `unused_feature_${feature}`,
            file: 'features',
            severity: 'info',
            category: 'best-practice',
            message: `Feature "${feature}" has not been used in the past 7 days`,
            suggestion: 'Consider removing unused features or investigating why they are not used',
            fixAvailable: false,
          });
        }
      }

      const errorRate = recentEvents.length > 0 
        ? errorEvents.length / recentEvents.length 
        : 0;

      if (errorRate > 0.1) {
        issues.push({
          id: 'high_error_rate',
          file: 'application',
          severity: 'warning',
          category: 'maintainability',
          message: `High error rate in the past 7 days: ${(errorRate * 100).toFixed(1)}%`,
          suggestion: 'Review error logs and fix recurring issues',
          fixAvailable: false,
        });
      }
    } catch {
      // Metrics analysis failed
    }

    return issues;
  }

  private createServerSideReport(): CodeHealthReport {
    return {
      timestamp: Date.now(),
      summary: {
        totalFiles: 0,
        filesWithIssues: 0,
        totalIssues: 0,
        errors: 0,
        warnings: 0,
        suggestions: 0,
        score: 100,
      },
      issues: [],
      byCategory: {},
      bySeverity: {},
      topIssues: [],
      recommendations: [],
    };
  }

  private buildReport(issues: CodeIssue[]): CodeHealthReport {
    const errors = issues.filter(i => i.severity === 'error').length;
    const warnings = issues.filter(i => i.severity === 'warning').length;
    const suggestions = issues.filter(i => i.severity === 'suggestion' || i.severity === 'info').length;

    const score = Math.max(0, 100 - (errors * 20) - (warnings * 5) - (suggestions * 1));

    const byCategory: Record<string, number> = {};
    const bySeverity: Record<string, number> = {};

    for (const issue of issues) {
      byCategory[issue.category] = (byCategory[issue.category] || 0) + 1;
      bySeverity[issue.severity] = (bySeverity[issue.severity] || 0) + 1;
    }

    const topIssues = issues
      .sort((a, b) => {
        const severityOrder = { error: 0, warning: 1, info: 2, suggestion: 3 };
        return severityOrder[a.severity] - severityOrder[b.severity];
      })
      .slice(0, 10);

    const recommendations = this.generateRecommendations(issues);

    return {
      timestamp: Date.now(),
      summary: {
        totalFiles: 1,
        filesWithIssues: issues.length > 0 ? 1 : 0,
        totalIssues: issues.length,
        errors,
        warnings,
        suggestions,
        score,
      },
      issues,
      byCategory,
      bySeverity,
      topIssues,
      recommendations,
    };
  }

  private generateRecommendations(issues: CodeIssue[]): Array<{
    priority: 'high' | 'medium' | 'low';
    title: string;
    description: string;
    affectedFiles: number;
    action: string;
  }> {
    const recommendations: Array<{
      priority: 'high' | 'medium' | 'low';
      title: string;
      description: string;
      affectedFiles: number;
      action: string;
    }> = [];

    const errors = issues.filter(i => i.severity === 'error');
    const performance = issues.filter(i => i.category === 'performance');
    const security = issues.filter(i => i.category === 'security');

    if (errors.length > 0) {
      recommendations.push({
        priority: 'high',
        title: 'Fix Critical Errors',
        description: `${errors.length} error(s) found that may cause application instability`,
        affectedFiles: new Set(errors.map(i => i.file)).size,
        action: 'Review and fix error-level issues immediately',
      });
    }

    if (security.length > 0) {
      recommendations.push({
        priority: 'high',
        title: 'Address Security Concerns',
        description: `${security.length} security-related issue(s) detected`,
        affectedFiles: new Set(security.map(i => i.file)).size,
        action: 'Review security recommendations and implement fixes',
      });
    }

    if (performance.length > 0) {
      recommendations.push({
        priority: 'medium',
        title: 'Optimize Performance',
        description: `${performance.length} performance issue(s) identified`,
        affectedFiles: new Set(performance.map(i => i.file)).size,
        action: 'Address slow loads, memory issues, or large data operations',
      });
    }

    const unusedFeatures = issues.filter(i => i.id.startsWith('unused_feature'));
    if (unusedFeatures.length > 3) {
      recommendations.push({
        priority: 'low',
        title: 'Remove Unused Features',
        description: `${unusedFeatures.length} features appear to be unused`,
        affectedFiles: 0,
        action: 'Consider removing or consolidating unused functionality',
      });
    }

    return recommendations;
  }

  getLastReport(): CodeHealthReport | null {
    return this.lastReport;
  }

  getFeatureStatus(): FeatureUsage[] {
    const features: FeatureUsage[] = [
      { name: 'Main Chat', route: '/', uses: 0, lastUsed: null, avgResponseTime: 0, errorRate: 0, status: 'active' },
      { name: 'Brand Workspace', route: '/brand-workspace', uses: 0, lastUsed: null, avgResponseTime: 0, errorRate: 0, status: 'active' },
      { name: 'Documents', route: '/documents', uses: 0, lastUsed: null, avgResponseTime: 0, errorRate: 0, status: 'active' },
      { name: 'Experts', route: '/experts', uses: 0, lastUsed: null, avgResponseTime: 0, errorRate: 0, status: 'active' },
      { name: 'Notes', route: '/notes', uses: 0, lastUsed: null, avgResponseTime: 0, errorRate: 0, status: 'active' },
      { name: 'Calendar', route: '/calendar', uses: 0, lastUsed: null, avgResponseTime: 0, errorRate: 0, status: 'active' },
      { name: 'Research', route: '/research', uses: 0, lastUsed: null, avgResponseTime: 0, errorRate: 0, status: 'active' },
      { name: 'Intelligence', route: '/intelligence', uses: 0, lastUsed: null, avgResponseTime: 0, errorRate: 0, status: 'active' },
      { name: 'SAM.gov', route: '/sam', uses: 0, lastUsed: null, avgResponseTime: 0, errorRate: 0, status: 'active' },
      { name: 'Book Writer', route: '/book-writer', uses: 0, lastUsed: null, avgResponseTime: 0, errorRate: 0, status: 'active' },
    ];

    if (typeof window === 'undefined') return features;

    try {
      const metricsData = localStorage.getItem('ai_dashboard_metrics');
      if (!metricsData) return features;

      const events = JSON.parse(metricsData);
      if (!Array.isArray(events)) return features;

      const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      const recentEvents = events.filter((e: any) => e.timestamp > weekAgo);

      for (const feature of features) {
        const featureEvents = recentEvents.filter((e: any) => 
          e.action === feature.route || e.metadata?.route === feature.route
        );

        feature.uses = featureEvents.length;
        
        if (featureEvents.length > 0) {
          feature.lastUsed = Math.max(...featureEvents.map((e: any) => e.timestamp));
        }

        const apiEvents = featureEvents.filter((e: any) => e.type === 'api_call' && e.duration);
        if (apiEvents.length > 0) {
          feature.avgResponseTime = apiEvents.reduce((sum: number, e: any) => sum + e.duration, 0) / apiEvents.length;
        }

        const errors = featureEvents.filter((e: any) => !e.success);
        feature.errorRate = featureEvents.length > 0 ? errors.length / featureEvents.length : 0;

        if (feature.uses === 0) {
          feature.status = 'inactive';
        } else if (feature.errorRate > 0.25) {
          feature.status = 'broken';
        }
      }
    } catch {
      // Return default features
    }

    return features;
  }
}

export const codeHealthService = CodeHealthService.getInstance();