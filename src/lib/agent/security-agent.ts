import { aiSecurityScanner, runSecurityScan, getSecurityStatus, SecurityScanResult, SecurityIssue } from '@/lib/security/ai-security-scanner';

export interface SecurityFinding {
  id?: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  category: 'vulnerability' | 'injection' | 'configuration' | 'exposure' | 'best_practice' | 'ai_security';
  title: string;
  description: string;
  location?: string;
  recommendation: string;
  detectedAt: number;
  code?: string;
}

export interface SecurityReport {
  id: string;
  timestamp: number;
  status: 'completed' | 'failed';
  scanDuration: number;
  findings: SecurityFinding[];
  summary: string;
  riskScore: number;
  recommendations: string[];
}

const API_KEY_PATTERNS = [
  /(?:api[_-]?key|apikey)\s*[=:]\s*['"][a-zA-Z0-9]{20,}['"]/gi,
  /(?:secret[_-]?key|secretkey)\s*[=:]\s*['"][a-zA-Z0-9]{8,}['"]/gi,
  /(?:password|passwd|pwd)\s*[=:]\s*['"][a-zA-Z0-9]{4,}['"]/gi,
  /(?:token|auth[_-]?token)\s*[=:]\s*['"][a-zA-Z0-9]{20,}['"]/gi,
  /sk-[a-zA-Z0-9]{48,}/g,
  /xox[baprs]-[a-zA-Z0-9-]{10,}/g,
  /ghp_[a-zA-Z0-9]{36}/g,
  /AKIA[A-Z0-9]{16}/g,
];

const SQL_INJECTION_PATTERNS = [
  /\$\{[^}]*\}.*(?:SELECT|INSERT|UPDATE|DELETE|DROP)\s+/gi,
  /['"`]\s*\+\s*(?:req|params|body|query)\s*\+/gi,
  /query\s*\(\s*['"`][^'"`]*\+\s*(?:req|params|body)/gi,
  /db\.run\s*\(\s*['"`][^'"`]*\+/gi,
  /db\.exec\s*\(\s*['"`][^'"`]*\+/gi,
];

const COMMAND_INJECTION_PATTERNS = [
  /exec\s*\(\s*['"`][^'"`]*\$\{[^}]+\}/gi,
  /spawn\s*\(\s*['"`][^'"`]*\+/gi,
  /execSync\s*\(\s*[^)]*\+/gi,
  /execFileSync\s*\(\s*[^)]*\+/gi,
];

const XSS_PATTERNS = [
  /dangerouslySetInnerHTML\s*=/gi,
  /innerHTML\s*=/gi,
  /document\.write\s*\(/gi,
];

class SecurityAgent {
  private static instance: SecurityAgent;
  private reports: SecurityReport[] = [];
  private lastScan: number = 0;
  private readonly SCAN_INTERVAL = 12 * 60 * 60 * 1000;
  private projectRoot: string = '';

  private constructor() {
    // Defer initialization to avoid top-level fs/path usage
    this.initializeProjectRoot();
  }

  private async initializeProjectRoot(): Promise<void> {
    if (typeof process !== 'undefined' && process.cwd) {
      this.projectRoot = process.cwd();
      await this.loadReports();
    }
  }

  static getInstance(): SecurityAgent {
    if (!SecurityAgent.instance) {
      SecurityAgent.instance = new SecurityAgent();
    }
    return SecurityAgent.instance;
  }

  private async loadReports(): Promise<void> {
    if (typeof process === 'undefined' || !process.cwd) return;
    
    try {
      const path = await import('path');
      const fs = await import('fs');
      
      const dbPath = path.join(this.projectRoot, 'data', 'security.db.json');
      if (fs.existsSync(dbPath)) {
        const data = fs.readFileSync(dbPath, 'utf-8');
        this.reports = JSON.parse(data);
      }
    } catch {
      this.reports = [];
    }
  }

  private async saveReports(): Promise<void> {
    if (typeof process === 'undefined' || !process.cwd) return;
    
    try {
      const path = await import('path');
      const fs = await import('fs');
      
      const dataDir = path.join(this.projectRoot, 'data');
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      const recent = this.reports.slice(0, 30);
      fs.writeFileSync(
        path.join(dataDir, 'security.db.json'),
        JSON.stringify(recent, null, 2)
      );
    } catch (error) {
      console.error('Error saving security reports:', error);
    }
  }

  async performSecurityScan(): Promise<SecurityReport> {
    const startTime = Date.now();
    const findings: SecurityFinding[] = [];
    let findingId = 1;

    try {
      // Run AI Security Scanner (Snyk-style)
      const aiScanResult = await aiSecurityScanner.scan({ quickScan: false });
      const aiFindings = this.convertAIIssuesToFindings(aiScanResult.issues);
      aiFindings.forEach(f => {
        f.id = `ai_${findingId++}`;
        findings.push(f);
      });

      const gitignoreFindings = await this.checkGitignore();
      gitignoreFindings.forEach(f => {
        f.id = `scan_${findingId++}`;
        findings.push(f);
      });

      const envFindings = await this.scanForEnvExposure();
      envFindings.forEach(f => {
        f.id = `scan_${findingId++}`;
        findings.push(f);
      });

      const apiKeyFindings = await this.scanForSecrets();
      apiKeyFindings.forEach(f => {
        f.id = `scan_${findingId++}`;
        findings.push(f);
      });

      const sqlFindings = await this.scanForSQLInjection();
      sqlFindings.forEach(f => {
        f.id = `scan_${findingId++}`;
        findings.push(f);
      });

      const cmdFindings = await this.scanForCommandInjection();
      cmdFindings.forEach(f => {
        f.id = `scan_${findingId++}`;
        findings.push(f);
      });

      const xssFindings = await this.scanForXSS();
      xssFindings.forEach(f => {
        f.id = `scan_${findingId++}`;
        findings.push(f);
      });

      const configFindings = await this.checkNextConfig();
      configFindings.forEach(f => {
        f.id = `scan_${findingId++}`;
        findings.push(f);
      });

      const depFindings = await this.checkDependencies();
      depFindings.forEach(f => {
        f.id = `scan_${findingId++}`;
        findings.push(f);
      });

      const middlewareFindings = await this.checkSecurityMiddleware();
      middlewareFindings.forEach(f => {
        f.id = `scan_${findingId++}`;
        findings.push(f);
      });

      const riskScore = this.calculateRiskScore(findings);
      const recommendations = this.generateRecommendations(findings);

      const report: SecurityReport = {
        id: 'security_' + Date.now(),
        timestamp: Date.now(),
        status: 'completed',
        scanDuration: Date.now() - startTime,
        findings,
        summary: this.generateSummary(findings),
        riskScore,
        recommendations,
      };

      this.reports.unshift(report);
      await this.saveReports();
      this.lastScan = Date.now();

      return report;
    } catch (error) {
      console.error('Security scan error:', error);
      return {
        id: 'security_error_' + Date.now(),
        timestamp: Date.now(),
        status: 'failed',
        scanDuration: Date.now() - startTime,
        findings: [],
        summary: 'Security scan failed: ' + (error instanceof Error ? error.message : 'Unknown error'),
        riskScore: 100,
        recommendations: ['Fix security scanner errors'],
      };
    }
  }

  private convertAIIssuesToFindings(issues: SecurityIssue[]): SecurityFinding[] {
    return issues.map(issue => ({
      severity: issue.severity as SecurityFinding['severity'],
      category: 'ai_security' as const,
      title: `${issue.code}: ${issue.name}`,
      description: issue.description,
      location: issue.file + (issue.line ? `:${issue.line}` : ''),
      recommendation: issue.remediation,
      detectedAt: Date.now(),
      code: issue.code,
    }));
  }

  async performQuickScan(): Promise<SecurityScanResult> {
    return aiSecurityScanner.scan({ quickScan: true });
  }

  getAISecurityStatus(): Promise<{
    lastScan: { id: string; timestamp: number; riskScore: number; summary: SecurityScanResult['summary'] } | null;
    issueCount: number;
    riskLevel: string;
  }> {
    return getSecurityStatus();
  }

  private async checkGitignore(): Promise<SecurityFinding[]> {
    if (typeof process === 'undefined' || !process.cwd) return [];
    
    const findings: SecurityFinding[] = [];
    const path = await import('path');
    const fs = await import('fs');
    
    const gitignorePath = path.join(this.projectRoot, '.gitignore');

    if (!fs.existsSync(gitignorePath)) {
      findings.push({
        severity: 'high',
        category: 'configuration',
        title: 'Missing .gitignore',
        description: 'No .gitignore file found. Sensitive files may be committed to version control.',
        recommendation: 'Create a .gitignore file with entries for .env, node_modules, and other sensitive paths.',
        detectedAt: Date.now(),
      });
      return findings;
    }

    const gitignoreContent = fs.readFileSync(gitignorePath, 'utf-8');
    const requiredPatterns = ['.env', 'node_modules', '.env.local', '*.pem', '*.key'];

    for (const pattern of requiredPatterns) {
      if (!gitignoreContent.includes(pattern)) {
        findings.push({
          severity: 'medium',
          category: 'configuration',
          title: `Missing ${pattern} in .gitignore`,
          description: `The pattern '${pattern}' is not in .gitignore and may be accidentally committed.`,
          location: '.gitignore',
          recommendation: `Add '${pattern}' to your .gitignore file.`,
          detectedAt: Date.now(),
        });
      }
    }

    return findings;
  }

  private async scanForEnvExposure(): Promise<SecurityFinding[]> {
    if (typeof process === 'undefined' || !process.cwd) return [];
    
    const findings: SecurityFinding[] = [];
    const path = await import('path');
    const fs = await import('fs');
    
    const srcDir = path.join(this.projectRoot, 'src');

    if (!fs.existsSync(srcDir)) return findings;

    const scanDir = (dir: string) => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.isDirectory()) {
          scanDir(path.join(dir, entry.name));
          continue;
        }

        if (!entry.name.endsWith('.ts') && !entry.name.endsWith('.tsx') && !entry.name.endsWith('.js')) {
          continue;
        }

        const filePath = path.join(dir, entry.name);
        const content = fs.readFileSync(filePath, 'utf-8');

        if (content.includes('NEXT_PUBLIC_') && (content.includes('KEY') || content.includes('SECRET') || content.includes('TOKEN'))) {
          findings.push({
            severity: 'high',
            category: 'exposure',
            title: 'Sensitive env var exposed to client',
            description: `NEXT_PUBLIC_ variable containing sensitive keyword found. These are exposed to the browser.`,
            location: path.relative(this.projectRoot, filePath),
            recommendation: 'Remove sensitive values from NEXT_PUBLIC_ variables or use server-side only env vars.',
            detectedAt: Date.now(),
          });
        }
      }
    };

    scanDir(srcDir);
    return findings;
  }

  private async scanForSecrets(): Promise<SecurityFinding[]> {
    if (typeof process === 'undefined' || !process.cwd) return [];
    
    const findings: SecurityFinding[] = [];
    const path = await import('path');
    const fs = await import('fs');
    
    const srcDir = path.join(this.projectRoot, 'src');

    if (!fs.existsSync(srcDir)) return findings;

    const scanDir = (dir: string) => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.isDirectory() && entry.name !== 'node_modules') {
          scanDir(path.join(dir, entry.name));
          continue;
        }

        if (!entry.name.endsWith('.ts') && !entry.name.endsWith('.tsx') && !entry.name.endsWith('.js')) {
          continue;
        }

        const filePath = path.join(dir, entry.name);
        const content = fs.readFileSync(filePath, 'utf-8');
        const lines = content.split('\n');

        lines.forEach((line, lineNum) => {
          for (const pattern of API_KEY_PATTERNS) {
            const matches = line.match(pattern);
            if (matches) {
              if (entry.name.includes('.example') || entry.name.includes('.sample')) continue;
              if (line.includes('process.env.') || line.includes('import.meta.env.')) continue;

              findings.push({
                severity: 'critical',
                category: 'exposure',
                title: 'Hardcoded secret detected',
                description: `Potential hardcoded secret found: ${matches[0].substring(0, 30)}...`,
                location: `${path.relative(this.projectRoot, filePath)}:${lineNum + 1}`,
                recommendation: 'Move this secret to an environment variable. Rotate the exposed key immediately.',
                detectedAt: Date.now(),
              });
            }
          }
        });
      }
    };

    scanDir(srcDir);
    return findings;
  }

  private async scanForSQLInjection(): Promise<SecurityFinding[]> {
    if (typeof process === 'undefined' || !process.cwd) return [];
    
    const findings: SecurityFinding[] = [];
    const path = await import('path');
    const fs = await import('fs');
    
    const srcDir = path.join(this.projectRoot, 'src');

    if (!fs.existsSync(srcDir)) return findings;

    const scanDir = (dir: string) => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.isDirectory() && entry.name !== 'node_modules') {
          scanDir(path.join(dir, entry.name));
          continue;
        }

        if (!entry.name.endsWith('.ts') && !entry.name.endsWith('.tsx') && !entry.name.endsWith('.js')) {
          continue;
        }

        const filePath = path.join(dir, entry.name);
        const content = fs.readFileSync(filePath, 'utf-8');
        const lines = content.split('\n');

        lines.forEach((line, lineNum) => {
          // Skip fetch calls with template literals that are just URLs
          if (line.includes('fetch(') && line.includes('`/api/')) return;
          if (line.includes('fetch(') && line.includes('encodeURIComponent')) return;
          if (line.includes('fetch(') && line.includes('${id}')) return;
          
          for (const pattern of SQL_INJECTION_PATTERNS) {
            if (pattern.test(line)) {
              findings.push({
                severity: 'high',
                category: 'injection',
                title: 'Potential SQL injection',
                description: `Possible SQL injection pattern detected: ${line.trim().substring(0, 60)}...`,
                location: `${path.relative(this.projectRoot, filePath)}:${lineNum + 1}`,
                recommendation: 'Use parameterized queries or prepared statements. Ensure user input is properly escaped.',
                detectedAt: Date.now(),
              });
            }
          }
        });
      }
    };

    scanDir(srcDir);
    return findings;
  }

  private async scanForCommandInjection(): Promise<SecurityFinding[]> {
    if (typeof process === 'undefined' || !process.cwd) return [];
    
    const findings: SecurityFinding[] = [];
    const path = await import('path');
    const fs = await import('fs');
    
    const srcDir = path.join(this.projectRoot, 'src');

    if (!fs.existsSync(srcDir)) return findings;

    const scanDir = (dir: string) => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.isDirectory() && entry.name !== 'node_modules') {
          scanDir(path.join(dir, entry.name));
          continue;
        }

        if (!entry.name.endsWith('.ts') && !entry.name.endsWith('.tsx') && !entry.name.endsWith('.js')) {
          continue;
        }

        const filePath = path.join(dir, entry.name);
        const content = fs.readFileSync(filePath, 'utf-8');
        const lines = content.split('\n');

        lines.forEach((line, lineNum) => {
          for (const pattern of COMMAND_INJECTION_PATTERNS) {
            if (pattern.test(line)) {
              if (line.includes('execSync(') && !line.includes('+') && !line.includes('${')) continue;

              findings.push({
                severity: 'critical',
                category: 'injection',
                title: 'Potential command injection',
                description: `Dynamic input in exec/spawn detected: ${line.trim().substring(0, 50)}...`,
                location: `${path.relative(this.projectRoot, filePath)}:${lineNum + 1}`,
                recommendation: 'Avoid passing user input to shell commands. Use spawn with array args or validate input strictly.',
                detectedAt: Date.now(),
              });
            }
          }
        });
      }
    };

    scanDir(srcDir);
    return findings;
  }

  private async scanForXSS(): Promise<SecurityFinding[]> {
    if (typeof process === 'undefined' || !process.cwd) return [];
    
    const findings: SecurityFinding[] = [];
    const path = await import('path');
    const fs = await import('fs');
    
    const srcDir = path.join(this.projectRoot, 'src');

    if (!fs.existsSync(srcDir)) return findings;

    const scanDir = (dir: string) => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.isDirectory() && entry.name !== 'node_modules') {
          scanDir(path.join(dir, entry.name));
          continue;
        }

        if (!entry.name.endsWith('.tsx') && !entry.name.endsWith('.jsx')) {
          continue;
        }

        const filePath = path.join(dir, entry.name);
        const content = fs.readFileSync(filePath, 'utf-8');
        const lines = content.split('\n');

        lines.forEach((line, lineNum) => {
          for (const pattern of XSS_PATTERNS) {
            if (pattern.test(line)) {
              if (line.includes('DOMPurify') || line.includes('sanitize')) continue;

              findings.push({
                severity: 'medium',
                category: 'vulnerability',
                title: 'Potential XSS vulnerability',
                description: `Unsafe HTML rendering detected: ${line.trim().substring(0, 50)}...`,
                location: `${path.relative(this.projectRoot, filePath)}:${lineNum + 1}`,
                recommendation: 'Sanitize HTML content with DOMPurify before rendering, or avoid using dangerouslySetInnerHTML.',
                detectedAt: Date.now(),
              });
            }
          }
        });
      }
    };

    scanDir(srcDir);
    return findings;
  }

  private async checkNextConfig(): Promise<SecurityFinding[]> {
    if (typeof process === 'undefined' || !process.cwd) return [];
    
    const findings: SecurityFinding[] = [];
    const path = await import('path');
    const fs = await import('fs');
    
    const configPath = path.join(this.projectRoot, 'next.config.js');
    const configMjsPath = path.join(this.projectRoot, 'next.config.mjs');

    if (!fs.existsSync(configPath) && !fs.existsSync(configMjsPath)) {
      findings.push({
        severity: 'high',
        category: 'configuration',
        title: 'No Next.js config file found',
        description: 'Missing next.config.js or next.config.mjs. Security headers cannot be configured.',
        recommendation: 'Create next.config.js with security headers configuration.',
        detectedAt: Date.now(),
      });
      return findings;
    }

    const configFile = fs.existsSync(configPath) ? configPath : configMjsPath;
    const content = fs.readFileSync(configFile, 'utf-8');

    if (!content.includes('headers()') || !content.includes('X-Frame-Options')) {
      findings.push({
        severity: 'medium',
        category: 'configuration',
        title: 'Missing security headers',
        description: 'next.config.js does not configure security headers like X-Frame-Options, CSP.',
        location: 'next.config.js',
        recommendation: 'Add security headers configuration to prevent clickjacking and XSS attacks.',
        detectedAt: Date.now(),
      });
    }

    if (content.includes('poweredByHeader: false')) {
      // Good - X-Powered-By header is disabled
    } else {
      findings.push({
        severity: 'low',
        category: 'configuration',
        title: 'X-Powered-By header not disabled',
        description: 'The X-Powered-By header reveals framework information.',
        location: 'next.config.js',
        recommendation: 'Add `poweredByHeader: false` to hide framework information.',
        detectedAt: Date.now(),
      });
    }

    return findings;
  }

  private async checkSecurityMiddleware(): Promise<SecurityFinding[]> {
    if (typeof process === 'undefined' || !process.cwd) return [];
    
    const findings: SecurityFinding[] = [];
    const path = await import('path');
    const fs = await import('fs');
    
    const middlewareDir = path.join(this.projectRoot, 'src', 'lib', 'middleware');

    if (!fs.existsSync(middlewareDir)) {
      findings.push({
        severity: 'medium',
        category: 'configuration',
        title: 'No security middleware directory',
        description: 'Missing src/lib/middleware directory. Security middleware for rate limiting, CSRF, and auth should be implemented.',
        location: 'src/lib/middleware',
        recommendation: 'Create middleware files for rate-limit.ts, csrf.ts, auth.ts, and validation.ts',
        detectedAt: Date.now(),
      });
      return findings;
    }

    const files = fs.readdirSync(middlewareDir);
    
    if (!files.includes('rate-limit.ts')) {
      findings.push({
        severity: 'medium',
        category: 'configuration',
        title: 'No rate limiting middleware',
        description: 'Missing rate-limit.ts in middleware directory. API endpoints are vulnerable to DoS attacks.',
        location: 'src/lib/middleware/rate-limit.ts',
        recommendation: 'Implement rate limiting to protect against brute force and DoS attacks.',
        detectedAt: Date.now(),
      });
    }

    if (!files.includes('csrf.ts')) {
      findings.push({
        severity: 'medium',
        category: 'vulnerability',
        title: 'No CSRF protection',
        description: 'Missing csrf.ts in middleware directory. Application may be vulnerable to CSRF attacks.',
        location: 'src/lib/middleware/csrf.ts',
        recommendation: 'Implement CSRF token validation for state-changing operations.',
        detectedAt: Date.now(),
      });
    }

    if (!files.includes('validation.ts')) {
      findings.push({
        severity: 'low',
        category: 'best_practice',
        title: 'No input validation middleware',
        description: 'Missing validation.ts in middleware directory. Consider implementing centralized input validation.',
        location: 'src/lib/middleware/validation.ts',
        recommendation: 'Create a validation utility for sanitizing and validating all user inputs.',
        detectedAt: Date.now(),
      });
    }

    if (!files.includes('auth.ts')) {
      findings.push({
        severity: 'high',
        category: 'configuration',
        title: 'No authentication middleware',
        description: 'Missing auth.ts in middleware directory. Application lacks authentication system.',
        location: 'src/lib/middleware/auth.ts',
        recommendation: 'Implement authentication to protect sensitive operations.',
        detectedAt: Date.now(),
      });
    }

    return findings;
  }

  private async checkDependencies(): Promise<SecurityFinding[]> {
    if (typeof process === 'undefined' || !process.cwd) return [];
    
    const findings: SecurityFinding[] = [];
    const path = await import('path');
    const fs = await import('fs');
    
    const packageJsonPath = path.join(this.projectRoot, 'package.json');

    if (!fs.existsSync(packageJsonPath)) return findings;

    try {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
      const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };

      const knownVulnerablePackages: Record<string, string> = {
        'event-stream': 'Known malicious package (npm event-stream 3.3.6)',
        'lodash': 'Versions < 4.17.21 vulnerable to prototype pollution',
      };

      for (const [pkg, info] of Object.entries(knownVulnerablePackages)) {
        if (deps[pkg]) {
          findings.push({
            severity: 'high',
            category: 'vulnerability',
            title: `Known vulnerable package: ${pkg}`,
            description: info,
            recommendation: `Run 'npm audit' to check for vulnerabilities and update ${pkg} to a safe version.`,
            detectedAt: Date.now(),
          });
        }
      }
    } catch {
      findings.push({
        severity: 'low',
        category: 'configuration',
        title: 'Could not parse package.json',
        description: 'Unable to check dependencies for known vulnerabilities.',
        recommendation: 'Run npm audit manually to check for dependency vulnerabilities.',
        detectedAt: Date.now(),
      });
    }

    return findings;
  }

  private calculateRiskScore(findings: SecurityFinding[]): number {
    const weights: { [key: string]: number } = {
      critical: 25,
      high: 15,
      medium: 7,
      low: 3,
      info: 1,
    };

    let score = 0;
    for (const finding of findings) {
      score += weights[finding.severity] || 1;
    }

    return Math.min(100, score);
  }

  private generateRecommendations(findings: SecurityFinding[]): string[] {
    const recommendations: string[] = [];
    const critical = findings.filter(f => f.severity === 'critical');
    const high = findings.filter(f => f.severity === 'high');

    if (critical.length > 0) {
      recommendations.push(`Address ${critical.length} critical security issues immediately`);
    }

    if (high.length > 0) {
      recommendations.push(`Review ${high.length} high-priority security findings`);
    }

    recommendations.push('Run security scans regularly');
    recommendations.push('Keep dependencies updated (npm audit)');
    recommendations.push('Review and rotate any exposed secrets');

    return recommendations;
  }

  private generateSummary(findings: SecurityFinding[]): string {
    const critical = findings.filter(f => f.severity === 'critical').length;
    const high = findings.filter(f => f.severity === 'high').length;
    const medium = findings.filter(f => f.severity === 'medium').length;
    const low = findings.filter(f => f.severity === 'low').length;

    if (critical > 0) {
      return `Security scan found ${critical} critical, ${high} high, ${medium} medium issues. Immediate action required.`;
    }

    if (high > 0) {
      return `Security scan found ${high} high, ${medium} medium, ${low} low priority issues.`;
    }

    if (findings.length === 0) {
      return 'No security issues found. System appears secure.';
    }

    return `Security scan found ${medium + low} minor issues. System is reasonably secure.`;
  }

  shouldRunScan(): boolean {
    return Date.now() - this.lastScan > this.SCAN_INTERVAL;
  }

  getLatestReport(): SecurityReport | null {
    return this.reports[0] || null;
  }

  getReportHistory(): SecurityReport[] {
    return this.reports;
  }
}

export const securityAgent = SecurityAgent.getInstance();
