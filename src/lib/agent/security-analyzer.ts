export interface SecurityIssue {
  id: string;
  type: 'vulnerability' | 'misconfiguration' | 'dependency' | 'code-smell' | 'best-practice';
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  location: {
    file?: string;
    line?: number;
    snippet?: string;
  };
  recommendation: string;
  autoFixable: boolean;
  fixComplexity: 'trivial' | 'simple' | 'moderate' | 'complex';
  references?: string[];
  discoveredAt: number;
  status: 'open' | 'fixed' | 'wontfix' | 'escalated';
}

export interface SecurityScanResult {
  id: string;
  timestamp: number;
  issues: SecurityIssue[];
  summary: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    autoFixable: number;
    escalatedToOpenCode: number;
  };
  recommendations: string[];
}

export interface OpenCodeTask {
  id: string;
  securityIssueId: string;
  description: string;
  priority: 'urgent' | 'high' | 'normal';
  createdAt: number;
  status: 'pending' | 'in_progress' | 'completed';
  resolution?: string;
}

const SECURITY_PATTERNS = [
  {
    type: 'vulnerability' as const,
    patterns: [
      { regex: /eval\s*\(/gi, title: 'Dangerous eval() usage', severity: 'critical' as const, recommendation: 'Replace eval() with safer alternatives like JSON.parse() or Function constructor' },
      { regex: /Function\s*\(/gi, title: 'Dynamic function creation', severity: 'high' as const, recommendation: 'Avoid dynamic function creation - use predefined functions instead' },
      { regex: /innerHTML\s*=/gi, title: 'Potential XSS via innerHTML', severity: 'high' as const, recommendation: 'Use textContent or sanitize HTML before assignment' },
      { regex: /dangerouslySetInnerHTML/gi, title: 'React dangerouslySetInnerHTML', severity: 'high' as const, recommendation: 'Ensure content is properly sanitized before rendering' },
      { regex: /document\.write/gi, title: 'document.write usage', severity: 'medium' as const, recommendation: 'Avoid document.write - use DOM manipulation methods instead' },
      { regex: /localStorage\.setItem\([^,]+,\s*[^;]*\+[^;]*\)/gi, title: 'Unsanitized localStorage write', severity: 'medium' as const, recommendation: 'Validate and sanitize data before storing' },
    ],
    autoFixable: false,
  },
  {
    type: 'vulnerability' as const,
    patterns: [
      { regex: /password\s*[=:]\s*['"`][^'"`]+['"`]/gi, title: 'Hardcoded password', severity: 'critical' as const, recommendation: 'Use environment variables or secure secret management' },
      { regex: /api[_-]?key\s*[=:]\s*['"`][^'"`]+['"`]/gi, title: 'Hardcoded API key', severity: 'critical' as const, recommendation: 'Move API keys to environment variables' },
      { regex: /secret\s*[=:]\s*['"`][^'"`]+['"`]/gi, title: 'Hardcoded secret', severity: 'critical' as const, recommendation: 'Use environment variables or secure vault' },
      { regex: /token\s*[=:]\s*['"`][^'"`]+['"`]/gi, title: 'Hardcoded token', severity: 'high' as const, recommendation: 'Store tokens in environment variables' },
    ],
    autoFixable: false,
  },
  {
    type: 'misconfiguration' as const,
    patterns: [
      { regex: /cors\s*:?\s*['"`]\*['"`]/gi, title: 'Overly permissive CORS', severity: 'high' as const, recommendation: 'Specify allowed origins instead of wildcard' },
      { regex: /credentials\s*:?\s*['"`]include['"`]/gi, title: 'Credentials in CORS requests', severity: 'medium' as const, recommendation: 'Only include credentials when necessary' },
      { regex: /http:\/\//gi, title: 'HTTP instead of HTTPS', severity: 'medium' as const, recommendation: 'Use HTTPS for secure communication' },
    ],
    autoFixable: false,
  },
  {
    type: 'code-smell' as const,
    patterns: [
      { regex: /console\.log\([^)]*\)/gi, title: 'Console.log in production code', severity: 'low' as const, recommendation: 'Remove or use proper logging library' },
      { regex: /TODO|FIXME|HACK|XXX/gi, title: 'Technical debt marker', severity: 'low' as const, recommendation: 'Address or document these items properly' },
      { regex: /catch\s*\([^)]*\)\s*\{\s*\}/gi, title: 'Empty catch block', severity: 'medium' as const, recommendation: 'Handle errors properly or at least log them' },
      { regex: /async\s+function\s+\w+\([^)]*\)\s*\{[^}]*await[^}]*\.then\(/gi, title: 'Mixed async/await and promises', severity: 'low' as const, recommendation: 'Use consistent async/await pattern' },
    ],
    autoFixable: true,
  },
  {
    type: 'best-practice' as const,
    patterns: [
      { regex: /var\s+\w+\s*=/gi, title: 'Using var instead of let/const', severity: 'low' as const, recommendation: 'Use let or const for better scoping' },
      { regex: /==\s*['"`]|['"`]\s*==/gi, title: 'Loose equality comparison', severity: 'low' as const, recommendation: 'Use strict equality (===) instead' },
      { regex: /!=\s*['"`]|['"`]\s*!=/gi, title: 'Loose inequality comparison', severity: 'low' as const, recommendation: 'Use strict inequality (!==) instead' },
    ],
    autoFixable: true,
  },
];

const TRIVIAL_FIXES: Map<string, (code: string) => string> = new Map([
  ['Console.log in production code', (code) => code.replace(/console\.log\([^)]*\);?/g, '')],
  ['Using var instead of let/const', (code) => code.replace(/\bvar\s+(\w+)\s*=/g, 'const $1 =')],
]);

class SecurityAnalyzer {
  private scanHistory: SecurityScanResult[] = [];
  private openCodeQueue: OpenCodeTask[] = [];
  private fixedIssues: Set<string> = new Set();

  constructor() {
    this.loadHistory();
  }

  private loadHistory(): void {
    try {
      if (typeof window !== 'undefined') {
        const history = localStorage.getItem('security_scan_history');
        if (history) {
          this.scanHistory = JSON.parse(history);
        }
        const fixed = localStorage.getItem('security_fixed_issues');
        if (fixed) {
          this.fixedIssues = new Set(JSON.parse(fixed));
        }
      }
    } catch {
      // Load failed
    }
  }

  private saveHistory(): void {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('security_scan_history', JSON.stringify(this.scanHistory.slice(-30)));
        localStorage.setItem('security_fixed_issues', JSON.stringify([...this.fixedIssues]));
      }
    } catch {
      // Save failed
    }
  }

  async scanForIssues(files: Array<{ path: string; content: string }>): Promise<SecurityScanResult> {
    const issues: SecurityIssue[] = [];
    const now = Date.now();

    for (const file of files) {
      const fileIssues = this.scanFile(file.path, file.content);
      issues.push(...fileIssues);
    }

    const summary = {
      critical: issues.filter(i => i.severity === 'critical').length,
      high: issues.filter(i => i.severity === 'high').length,
      medium: issues.filter(i => i.severity === 'medium').length,
      low: issues.filter(i => i.severity === 'low').length,
      autoFixable: issues.filter(i => i.autoFixable && i.status === 'open').length,
      escalatedToOpenCode: 0,
    };

    const recommendations = this.generateRecommendations(issues);

    const result: SecurityScanResult = {
      id: `scan_${now}`,
      timestamp: now,
      issues,
      summary,
      recommendations,
    };

    this.scanHistory.unshift(result);
    this.saveHistory();

    return result;
  }

  private scanFile(filePath: string, content: string): SecurityIssue[] {
    const issues: SecurityIssue[] = [];
    const lines = content.split('\n');
    const now = Date.now();

    for (const category of SECURITY_PATTERNS) {
      for (const pattern of category.patterns) {
        let match;
        const regex = new RegExp(pattern.regex.source, pattern.regex.flags);
        
        while ((match = regex.exec(content)) !== null) {
          const lineNumber = content.substring(0, match.index).split('\n').length;
          const lineContent = lines[lineNumber - 1] || '';
          const issueId = this.generateIssueId(filePath, pattern.title, lineNumber);

          if (this.fixedIssues.has(issueId)) {
            continue;
          }

          issues.push({
            id: issueId,
            type: category.type,
            severity: pattern.severity,
            title: pattern.title,
            description: `Found in ${filePath}`,
            location: {
              file: filePath,
              line: lineNumber,
              snippet: lineContent.trim().slice(0, 100),
            },
            recommendation: pattern.recommendation,
            autoFixable: category.autoFixable,
            fixComplexity: category.autoFixable ? 'simple' : 'moderate',
            discoveredAt: now,
            status: 'open',
          });
        }
      }
    }

    return issues;
  }

  async attemptAutoFix(issueId: string, filePath: string, content: string): Promise<{
    success: boolean;
    newContent?: string;
    message: string;
  }> {
    const issue = this.findIssue(issueId);
    if (!issue) {
      return { success: false, message: 'Issue not found' };
    }

    if (!issue.autoFixable) {
      return { success: false, message: 'Issue cannot be auto-fixed' };
    }

    const fixFunction = TRIVIAL_FIXES.get(issue.title);
    if (!fixFunction) {
      return { 
        success: false, 
        message: 'No auto-fix available for this issue type. Escalating to OpenCode.' 
      };
    }

    try {
      const newContent = fixFunction(content);
      
      if (newContent === content) {
        return { 
          success: false, 
          message: 'Auto-fix applied but no changes made. Escalating to OpenCode.' 
        };
      }

      this.fixedIssues.add(issueId);
      this.saveHistory();

      return {
        success: true,
        newContent,
        message: 'Successfully applied auto-fix',
      };
    } catch (error) {
      return { 
        success: false, 
        message: 'Auto-fix failed. Escalating to OpenCode.' 
      };
    }
  }

  async escalateToOpenCode(issue: SecurityIssue): Promise<OpenCodeTask> {
    const priority = issue.severity === 'critical' ? 'urgent' : 
                      issue.severity === 'high' ? 'high' : 'normal';

    const task: OpenCodeTask = {
      id: `opencode_${Date.now()}`,
      securityIssueId: issue.id,
      description: `Fix ${issue.severity} security issue: ${issue.title}\n\nLocation: ${issue.location.file}${issue.location.line ? `:${issue.location.line}` : ''}\n\n${issue.description}\n\nRecommendation: ${issue.recommendation}`,
      priority,
      createdAt: Date.now(),
      status: 'pending',
    };

    this.openCodeQueue.push(task);
    issue.status = 'escalated';

    return task;
  }

  private findIssue(issueId: string): SecurityIssue | null {
    for (const scan of this.scanHistory) {
      const issue = scan.issues.find(i => i.id === issueId);
      if (issue) return issue;
    }
    return null;
  }

  private generateIssueId(filePath: string, title: string, line: number): string {
    const normalized = filePath.replace(/[\/\\]/g, '_');
    return `${normalized}_${title.toLowerCase().replace(/\s+/g, '_')}_${line}`;
  }

  private generateRecommendations(issues: SecurityIssue[]): string[] {
    const recommendations: string[] = [];
    
    const critical = issues.filter(i => i.severity === 'critical');
    if (critical.length > 0) {
      recommendations.push(`🚨 ${critical.length} critical security issues found. Review and fix immediately.`);
    }

    const high = issues.filter(i => i.severity === 'high');
    if (high.length > 0) {
      recommendations.push(`⚠️ ${high.length} high-severity issues require attention.`);
    }

    const autoFixable = issues.filter(i => i.autoFixable && i.status === 'open');
    if (autoFixable.length > 0) {
      recommendations.push(`💡 ${autoFixable.length} issues can be auto-fixed.`);
    }

    const newIssues = issues.filter(i => {
      const recent = Date.now() - i.discoveredAt < 24 * 60 * 60 * 1000;
      return recent;
    });
    if (newIssues.length > 0) {
      recommendations.push(`📊 ${newIssues.length} new issues discovered in the last 24 hours.`);
    }

    if (issues.length === 0) {
      recommendations.push('✅ No security issues found in the scanned files.');
    }

    return recommendations;
  }

  getOpenCodeQueue(): OpenCodeTask[] {
    return this.openCodeQueue.filter(t => t.status === 'pending');
  }

  markTaskComplete(taskId: string, resolution: string): void {
    const task = this.openCodeQueue.find(t => t.id === taskId);
    if (task) {
      task.status = 'completed';
      task.resolution = resolution;
      
      const issue = this.findIssue(task.securityIssueId);
      if (issue) {
        issue.status = 'fixed';
        this.fixedIssues.add(issue.id);
        this.saveHistory();
      }
    }
  }

  getLatestScan(): SecurityScanResult | null {
    return this.scanHistory[0] || null;
  }

  getScanHistory(): SecurityScanResult[] {
    return this.scanHistory;
  }

  dismissIssue(issueId: string): void {
    this.fixedIssues.add(issueId);
    this.saveHistory();
  }
}

export const securityAnalyzer = new SecurityAnalyzer();