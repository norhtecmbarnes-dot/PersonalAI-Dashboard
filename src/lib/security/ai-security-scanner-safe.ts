/**
 * AI Security Scanner - Safe version for Edge Runtime
 * No top-level Node.js imports
 * Uses pattern matching instead of file system access
 */

export interface SecurityIssue {
  code: string;
  name: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  file: string;
  line?: number;
  snippet?: string;
  remediation: string;
  references?: string[];
}

export interface SecurityScanResult {
  id: string;
  timestamp: number;
  riskScore: number;
  issues: SecurityIssue[];
  filesScanned: number;
  scanDurationMs: number;
  summary: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
}

export interface ScanOptions {
  quickScan?: boolean;
  paths?: string[];
  excludePatterns?: string[];
  dryRun?: boolean;
}

// Security patterns for static analysis (no file system required)
const SECURITY_PATTERNS = {
  // Hardcoded secrets
  hardcodedSecrets: {
    pattern: /(?:api[_-]?key|apikey|secret[_-]?key|secretkey|password|pwd|token)\s*[=:]\s*['"`][a-zA-Z0-9]{8,}['"`]/i,
    severity: 'critical' as const,
    code: 'HARDCODED_SECRET',
    description: 'Hardcoded credential detected',
    remediation: 'Move to environment variables or secure vault',
  },
  
  // SQL Injection
  sqlInjection: {
    pattern: /(?:query|exec|run)\s*\(\s*[`'"][^`'"]*\$\{|[`'"][^`'"]*\+\s*\w+/i,
    severity: 'critical' as const,
    code: 'SQL_INJECTION',
    description: 'Potential SQL injection vulnerability',
    remediation: 'Use parameterized queries or prepared statements',
  },
  
  // XSS
  xssVulnerability: {
    pattern: /dangerouslySetInnerHTML|innerHTML\s*=|document\.write/i,
    severity: 'high' as const,
    code: 'XSS_VULNERABILITY',
    description: 'Cross-site scripting risk',
    remediation: 'Use textContent instead of innerHTML, sanitize user input',
  },
  
  // Command Injection
  commandInjection: {
    pattern: /(?:exec|execSync|spawn)\s*\([^)]*\+|(?:exec|execSync|spawn)\s*\([^)]*\$/i,
    severity: 'critical' as const,
    code: 'COMMAND_INJECTION',
    description: 'Command injection vulnerability',
    remediation: 'Avoid executing user input, use allowlists',
  },
  
  // Insecure HTTP
  insecureHttp: {
    pattern: /http:\/\/(?!localhost|127\.0\.0\.1)/i,
    severity: 'medium' as const,
    code: 'INSECURE_HTTP',
    description: 'Insecure HTTP connection',
    remediation: 'Use HTTPS for all external connections',
  },
  
  // Weak Crypto
  weakCrypto: {
    pattern: /md5|sha1|des\s*\(|rc4/i,
    severity: 'high' as const,
    code: 'WEAK_CRYPTO',
    description: 'Weak cryptographic algorithm',
    remediation: 'Use SHA-256, AES, or stronger algorithms',
  },
  
  // Debug Info
  debugInfo: {
    pattern: /console\.log\s*\([^)]*(?:password|secret|key|token)/i,
    severity: 'high' as const,
    code: 'DEBUG_INFO_LEAK',
    description: 'Sensitive data may be logged',
    remediation: 'Remove debug logging of sensitive data',
  },
  
  // Eval Usage
  evalUsage: {
    pattern: /\beval\s*\(|\bFunction\s*\(\s*['"`]/i,
    severity: 'high' as const,
    code: 'EVAL_USAGE',
    description: 'Dangerous eval() or Function() usage',
    remediation: 'Avoid eval(), use safer alternatives',
  },
};

// Security rules that don't require file system
const SECURITY_RULES = Object.entries(SECURITY_PATTERNS).map(([name, config]) => ({
  name,
  ...config,
}));

export class AISecurityScannerSafe {
  private scanHistory: Array<{ id: string; timestamp: number; riskScore: number; summary: any }> = [];

  /**
   * Scan code content for security issues (no file system access)
   */
  async scanContent(content: string, filename: string = 'unknown'): Promise<SecurityScanResult> {
    const startTime = Date.now();
    const issues: SecurityIssue[] = [];
    
    const lines = content.split('\n');
    
    for (const rule of SECURITY_RULES) {
      lines.forEach((line, index) => {
        if (rule.pattern.test(line)) {
          issues.push({
            code: rule.code,
            name: rule.name,
            severity: rule.severity,
            description: rule.description,
            file: filename,
            line: index + 1,
            snippet: line.trim().substring(0, 100),
            remediation: rule.remediation,
            references: this.getReferences(rule.code),
          });
        }
      });
    }

    // Calculate risk score
    const weights = { critical: 10, high: 5, medium: 2, low: 1 };
    const riskScore = Math.min(100, issues.reduce((sum, issue) => sum + weights[issue.severity], 0));

    const result: SecurityScanResult = {
      id: `scan_${Date.now()}`,
      timestamp: Date.now(),
      riskScore,
      issues,
      filesScanned: 1,
      scanDurationMs: Date.now() - startTime,
      summary: {
        critical: issues.filter(i => i.severity === 'critical').length,
        high: issues.filter(i => i.severity === 'high').length,
        medium: issues.filter(i => i.severity === 'medium').length,
        low: issues.filter(i => i.severity === 'low').length,
      },
    };

    this.saveToHistory(result);
    return result;
  }

  /**
   * Quick security check (Edge Runtime compatible)
   */
  async quickScan(code: string): Promise<SecurityIssue[]> {
    const criticalPatterns = [
      { pattern: /eval\s*\(/, code: 'EVAL', severity: 'critical' as const },
      { pattern: /innerHTML\s*=/, code: 'XSS', severity: 'high' as const },
      { pattern: /password\s*[=:]\s*['"`]/, code: 'HARDCODED', severity: 'critical' as const },
    ];
    
    const issues: SecurityIssue[] = [];
    const lines = code.split('\n');
    
    criticalPatterns.forEach(({ pattern, code, severity }) => {
      lines.forEach((line, index) => {
        if (pattern.test(line)) {
          issues.push({
            code,
            name: code,
            severity,
            description: `Security issue: ${code}`,
            file: 'input',
            line: index + 1,
            snippet: line.trim().substring(0, 80),
            remediation: 'Review and fix this security issue',
          });
        }
      });
    });
    
    return issues;
  }

  /**
   * Get security status
   */
  getStatus(): { isHealthy: boolean; lastScan: number | null; riskScore: number } {
    return {
      isHealthy: this.scanHistory.length === 0 || this.scanHistory[this.scanHistory.length - 1]?.riskScore < 50,
      lastScan: this.scanHistory.length > 0 ? this.scanHistory[this.scanHistory.length - 1].timestamp : null,
      riskScore: this.scanHistory.length > 0 ? this.scanHistory[this.scanHistory.length - 1].riskScore : 0,
    };
  }

  /**
   * Get last scan result
   */
  getLastScan(): SecurityScanResult | null {
    return null; // In-memory only in Edge Runtime
  }

  /**
   * Should run scan (always return true for Edge Runtime compatibility)
   */
  shouldRunScan(): boolean {
    return this.scanHistory.length === 0 || 
           Date.now() - (this.scanHistory[this.scanHistory.length - 1]?.timestamp || 0) > 24 * 60 * 60 * 1000;
  }

  private saveToHistory(result: SecurityScanResult): void {
    this.scanHistory.push({
      id: result.id,
      timestamp: result.timestamp,
      riskScore: result.riskScore,
      summary: result.summary,
    });
    
    // Keep only last 10 scans
    if (this.scanHistory.length > 10) {
      this.scanHistory.shift();
    }
  }

  private getReferences(code: string): string[] {
    const refs: Record<string, string[]> = {
      'HARDCODED_SECRET': ['https://owasp.org/www-community/vulnerabilities/Use_of_hard-coded_password'],
      'SQL_INJECTION': ['https://owasp.org/www-community/attacks/SQL_Injection'],
      'XSS_VULNERABILITY': ['https://owasp.org/www-community/attacks/xss/'],
      'COMMAND_INJECTION': ['https://owasp.org/www-community/attacks/Command_Injection'],
      'INSECURE_HTTP': ['https://owasp.org/www-community/vulnerabilities/Information_exposure_through_HTTP_headers'],
      'WEAK_CRYPTO': ['https://owasp.org/www-community/vulnerabilities/Using_a_broken_or_risky_cryptographic_algorithm'],
      'DEBUG_INFO_LEAK': ['https://owasp.org/www-community/vulnerabilities/Information_exposure_through_debug_messages'],
      'EVAL_USAGE': ['https://owasp.org/www-community/attacks/Code_Injection'],
    };
    return refs[code] || [];
  }
}

// Export singleton
export const aiSecurityScanner = new AISecurityScannerSafe();

// Export convenience functions
export const runSecurityScan = (content: string, filename?: string) => 
  aiSecurityScanner.scanContent(content, filename);

export const getSecurityStatus = () => aiSecurityScanner.getStatus();

export default aiSecurityScanner;
