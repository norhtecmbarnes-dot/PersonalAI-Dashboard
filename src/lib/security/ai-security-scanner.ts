import * as fs from 'fs';
import * as path from 'path';

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

interface ScanHistory {
  scans: Array<{
    id: string;
    timestamp: number;
    riskScore: number;
    summary: SecurityScanResult['summary'];
  }>;
  issues: SecurityIssue[];
}

const SCAN_PATHS = [
  'src/lib/agent/',
  'src/lib/tools/',
  'src/lib/skills/',
  'src/lib/config/',
  'src/lib/browser/',
  'src/lib/integrations/',
  'src/lib/security/',
  'src/app/api/',
  'data/memory/',
  'data/rl-training/',
];

const EXCLUDE_PATTERNS = [
  'node_modules',
  '.git',
  '.next',
  '__tests__',
  '.test.',
  '.spec.',
];

const SECURITY_DATA_DIR = path.join(process.cwd(), 'data', 'security');
const SECURITY_DATA_FILE = path.join(SECURITY_DATA_DIR, 'scans.json');

// Detection rules based on Snyk Agent-Scan patterns
const DETECTION_RULES: Array<{
  code: string;
  name: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  patterns: RegExp[];
  description: string;
  remediation: string;
}> = [
  // E001: Prompt Injection (Critical)
  {
    code: 'E001',
    name: 'Prompt Injection Risk',
    severity: 'critical',
    patterns: [
      /\$\{.*user.*input.*\}/gi,
      /`[^`]*\$\{[^}]*\}[^`]*`/gi,
      /systemPrompt\s*\+\s*user/gi,
      /context\s*\+=\s*message/gi,
      /eval\s*\(\s*.*user/gi,
    ],
    description: 'User input directly concatenated into system prompt or evaluated code',
    remediation: 'Sanitize all user input before including in prompts. Use structured templates with escaped placeholders.',
  },
  // E002: Tool Shadowing (Critical)
  {
    code: 'E002',
    name: 'Tool Shadowing Risk',
    severity: 'critical',
    patterns: [
      /registerTool\s*\(\s*['"][^'"]+['"]\s*,/gi,
      /tools\s*\[\s*['"][^'"]+['"]\s*\]\s*=/gi,
      /defineTool\s*\(/gi,
    ],
    description: 'Tool registration without namespace protection allows overriding',
    remediation: 'Use namespaced tool names and validate tool definitions before registration.',
  },
  // E003: Tool Poisoning (High)
  {
    code: 'E003',
    name: 'Tool Poisoning Risk',
    severity: 'high',
    patterns: [
      /execute\s*\(\s*.*command/gi,
      /exec\s*\(\s*['"`]/gi,
      /spawn\s*\(\s*['"`]/gi,
      /child_process/gi,
      /shell\s*:\s*true/gi,
      /eval\s*\(/gi,
      /Function\s*\(/gi,
    ],
    description: 'Tool executes shell commands or evaluates dynamic code',
    remediation: 'Use command whitelists, avoid shell:true, validate all inputs.',
  },
  // E004: Indirect Prompt Injection (High)
  {
    code: 'E004',
    name: 'Indirect Prompt Injection',
    severity: 'high',
    patterns: [
      /readFileSync\s*\(\s*.*\+.*\)/gi,
      /fetch\s*\(\s*.*\+.*\)/gi,
      /\.innerHTML\s*=/gi,
      /dangerouslySetInnerHTML/gi,
    ],
    description: 'External content loaded without sanitization',
    remediation: 'Sanitize all external content before processing. Strip prompt-injection patterns.',
  },
  // E005: Unrestricted Tool Access (High)
  {
    code: 'E005',
    name: 'Unrestricted Tool Access',
    severity: 'high',
    patterns: [
      /tools\s*:\s*\*\s*/gi,
      /allowedTools\s*:\s*\[.*\*/gi,
      /allTools/gi,
    ],
    description: 'Tools accessible without restrictions',
    remediation: 'Implement tool permission system and explicit allowlists.',
  },
  // E006: Malware Payload in Skills (Critical)
  {
    code: 'E006',
    name: 'Malware Payload Risk',
    severity: 'critical',
    patterns: [
      /base64/gi,
      /atob\s*\(/gi,
      /btoa\s*\(/gi,
      /Buffer\s*\.\s*from\s*\(\s*['"][A-Za-z0-9+/=]{50,}/gi,
      /\\x[0-9a-f]{2}/gi,
    ],
    description: 'Obfuscated or encoded payload detected',
    remediation: 'Review and decode all suspicious content. Avoid base64 encoded executable logic.',
  },
  // TF001: Toxic Flow (Critical)
  {
    code: 'TF001',
    name: 'Toxic Flow Risk',
    severity: 'critical',
    patterns: [
      /delete\s+.*all/gi,
      /drop\s+table/gi,
      /truncate\s+table/gi,
      /rm\s+-rf/gi,
      /format\s+disk/gi,
      /shutdown/gi,
      /reboot/gi,
    ],
    description: 'Dangerous action patterns that could cause data loss',
    remediation: 'Add confirmation prompts and undo capabilities for destructive actions.',
  },
  // TF002: Credential Extraction Risk (High)
  {
    code: 'TF002',
    name: 'Credential Extraction Risk',
    severity: 'high',
    patterns: [
      /password\s*[=:]/gi,
      /api[_-]?key\s*[=:]/gi,
      /secret\s*[=:]/gi,
      /token\s*[=:]/gi,
      /credential\s*[=:]/gi,
      /private[_-]?key/gi,
    ],
    description: 'Credential handling patterns detected',
    remediation: 'Use environment variables and secure credential storage. Never log credentials.',
  },
  // W007: Hardcoded Secrets (Medium)
  {
    code: 'W007',
    name: 'Hardcoded Secrets',
    severity: 'medium',
    patterns: [
      /['"][a-zA-Z0-9]{32,}['"]/g,
      /['"]sk-[a-zA-Z0-9]{20,}['"]/g,
      /['"]ghp_[a-zA-Z0-9]{36,}['"]/g,
      /['"]xox[baprs]-[a-zA-Z0-9-]+['"]/g,
    ],
    description: 'Potential hardcoded API key or token',
    remediation: 'Move secrets to environment variables or secure vault.',
  },
  // W008: Insecure Credential Handling (Medium)
  {
    code: 'W008',
    name: 'Insecure Credential Handling',
    severity: 'medium',
    patterns: [
      /\.env['"]/gi,
      /fs\.readFileSync\s*\(\s*['"]\.env/gi,
      /process\.env\.\w+\s*\+/gi,
      /console\.log\s*\(\s*.*process\.env/gi,
    ],
    description: 'Insecure handling of environment variables or secrets',
    remediation: 'Never log or concatenate environment variables. Use secure secret management.',
  },
  // W009: Excessive Permissions (Medium)
  {
    code: 'W009',
    name: 'Excessive Permissions',
    severity: 'medium',
    patterns: [
      /fs\.writeFileSync\s*\(\s*['"]/gi,
      /fs\.mkdirSync\s*\(\s*['"]/gi,
      /fs\.rmSync\s*\(/gi,
      /chmod\s*\(/gi,
    ],
    description: 'File system operations with broad permissions',
    remediation: 'Restrict file operations to specific directories. Validate paths.',
  },
  // W010: Missing Input Validation (Medium)
  {
    code: 'W010',
    name: 'Missing Input Validation',
    severity: 'medium',
    patterns: [
      /req\.body\.\w+/gi,
      /request\.json\s*\(\s*\)/gi,
      /params\.\w+/gi,
      /query\.\w+/gi,
    ],
    description: 'User input used without visible validation',
    remediation: 'Add validateString, validateArray, or schema validation before use.',
  },
  // I011: Untrusted Content Integration (Medium)
  {
    code: 'I011',
    name: 'Untrusted Content Integration',
    severity: 'medium',
    patterns: [
      /fetch\s*\(\s*['"`]https?:/gi,
      /\.innerHTML\s*=/gi,
      /dangerouslySetInnerHTML/gi,
      /DOMPurify/gi,
    ],
    description: 'External content integration without visible sanitization',
    remediation: 'Sanitize all external content before rendering or processing.',
  },
  // I012: Rug Pull Risk (Low)
  {
    code: 'I012',
    name: 'Rug Pull Risk',
    severity: 'low',
    patterns: [
      /import\s*\(\s*['"`]\$\{/gi,
      /require\s*\(\s*.*\+/gi,
      /eval\s*\(\s*.*import/gi,
    ],
    description: 'Dynamic import patterns could load malicious code',
    remediation: 'Avoid dynamic imports with user-controlled paths.',
  },
  // I013: Missing Rate Limiting (Low)
  {
    code: 'I013',
    name: 'Missing Rate Limiting',
    severity: 'low',
    patterns: [
      /app\.\w+\s*\(\s*['"`]\/api/gi,
      /router\.\w+\s*\(\s*['"`]\//gi,
    ],
    description: 'API endpoint without visible rate limiting',
    remediation: 'Add rate limiting middleware to prevent abuse.',
  },
  // I014: Insufficient Logging (Low)
  {
    code: 'I014',
    name: 'Insufficient Logging',
    severity: 'low',
    patterns: [
      /catch\s*\(\s*\w+\s*\)\s*\{\s*\}/gi,
      /\.catch\s*\(\s*\(\s*\)\s*=>\s*\{\s*\}/gi,
    ],
    description: 'Error caught but not logged',
    remediation: 'Log errors for debugging and security monitoring.',
  },
];

// Semantic patterns for AI-specific checks
const SEMANTIC_PATTERNS = [
  {
    code: 'SP001',
    name: 'Instruction Override Pattern',
    description: 'Text that could override AI instructions',
    examples: [
      'ignore previous instructions',
      'disregard all above',
      'you are now in developer mode',
      'sudo mode',
      'ignore your training',
    ],
  },
  {
    code: 'SP002',
    name: 'Role Manipulation Pattern',
    description: 'Text that attempts to change AI role',
    examples: [
      'you are a different AI',
      'pretend you are',
      'act as if you were',
      'roleplay as',
    ],
  },
  {
    code: 'SP003',
    name: 'Data Exfiltration Pattern',
    description: 'Text attempting to extract training data',
    examples: [
      'repeat your training data',
      'what were you trained on',
      'output your system prompt',
      'show your instructions',
    ],
  },
];

class AISecurityScanner {
  private rootDir: string;
  private initialized: boolean = false;
  private history: ScanHistory = { scans: [], issues: [] };

  constructor() {
    this.rootDir = process.cwd();
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;
    this.ensureDataDir();
    this.loadHistory();
    this.initialized = true;
  }

  private ensureDataDir(): void {
    if (!fs.existsSync(SECURITY_DATA_DIR)) {
      fs.mkdirSync(SECURITY_DATA_DIR, { recursive: true });
    }
  }

  private loadHistory(): void {
    try {
      if (fs.existsSync(SECURITY_DATA_FILE)) {
        this.history = JSON.parse(fs.readFileSync(SECURITY_DATA_FILE, 'utf-8'));
      }
    } catch (error) {
      console.error('[AISecurityScanner] Error loading history:', error);
      this.history = { scans: [], issues: [] };
    }
  }

  private saveHistory(): void {
    try {
      fs.writeFileSync(SECURITY_DATA_FILE, JSON.stringify(this.history, null, 2));
    } catch (error) {
      console.error('[AISecurityScanner] Error saving history:', error);
    }
  }

  async scan(options: ScanOptions = {}): Promise<SecurityScanResult> {
    await this.initialize();
    
    const startTime = Date.now();
    const issues: SecurityIssue[] = [];
    let filesScanned = 0;
    
    const scanPaths = options.paths || SCAN_PATHS;
    const excludePatterns = [...EXCLUDE_PATTERNS, ...(options.excludePatterns || [])];

    for (const scanPath of scanPaths) {
      const fullPath = path.join(this.rootDir, scanPath);
      
      if (!fs.existsSync(fullPath)) continue;
      
      const files = this.getFiles(fullPath, excludePatterns);
      
      for (const file of files) {
        if (options.quickScan && issues.filter(i => i.severity === 'critical').length >= 3) {
          break;
        }
        
        const fileIssues = this.scanFile(file);
        issues.push(...fileIssues);
        filesScanned++;
      }
      
      if (options.quickScan && issues.filter(i => i.severity === 'critical').length >= 3) {
        break;
      }
    }

    const riskScore = this.calculateRiskScore(issues);

    const result: SecurityScanResult = {
      id: `scan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      riskScore,
      issues,
      filesScanned,
      scanDurationMs: Date.now() - startTime,
      summary: {
        critical: issues.filter(i => i.severity === 'critical').length,
        high: issues.filter(i => i.severity === 'high').length,
        medium: issues.filter(i => i.severity === 'medium').length,
        low: issues.filter(i => i.severity === 'low').length,
      },
    };

    if (!options.dryRun) {
      this.saveScan(result);
    }

    return result;
  }

  private getFiles(dir: string, excludePatterns: string[]): string[] {
    const files: string[] = [];
    
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        const shouldExclude = excludePatterns.some(pattern => {
          if (pattern.startsWith('*.')) {
            return entry.name.endsWith(pattern.slice(1));
          }
          return entry.name.includes(pattern);
        });
        
        if (shouldExclude) continue;
        
        if (entry.isDirectory()) {
          files.push(...this.getFiles(fullPath, excludePatterns));
        } else if (entry.isFile() && /\.(ts|tsx|js|jsx|json|md)$/.test(entry.name)) {
          files.push(fullPath);
        }
      }
    } catch {
      // Ignore permission errors
    }
    
    return files;
  }

  private scanFile(filePath: string): SecurityIssue[] {
    const issues: SecurityIssue[] = [];
    
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');
      const relativePath = path.relative(this.rootDir, filePath);
      
      for (const rule of DETECTION_RULES) {
        for (const pattern of rule.patterns) {
          pattern.lastIndex = 0;
          
          let match;
          while ((match = pattern.exec(content)) !== null) {
            const lineNumber = content.substring(0, match.index).split('\n').length;
            
            const snippet = lines
              .slice(Math.max(0, lineNumber - 2), lineNumber + 1)
              .join('\n');
            
            issues.push({
              code: rule.code,
              name: rule.name,
              severity: rule.severity,
              description: rule.description,
              file: relativePath,
              line: lineNumber,
              snippet: snippet.slice(0, 300),
              remediation: rule.remediation,
            });
          }
        }
      }
      
      const semanticIssues = this.checkSemanticPatterns(content, relativePath);
      issues.push(...semanticIssues);
      
    } catch {
      // Ignore file read errors
    }
    
    return issues;
  }

  private checkSemanticPatterns(content: string, filePath: string): SecurityIssue[] {
    const issues: SecurityIssue[] = [];
    const lowerContent = content.toLowerCase();
    
    for (const pattern of SEMANTIC_PATTERNS) {
      for (const example of pattern.examples) {
        if (lowerContent.includes(example.toLowerCase())) {
          const lines = content.split('\n');
          const lineNumber = lines.findIndex(line => 
            line.toLowerCase().includes(example.toLowerCase())
          ) + 1;
          
          const contextLine = lines[lineNumber - 1] || '';
          if (contextLine.includes('user') || 
              contextLine.includes('input') || 
              contextLine.includes('prompt') ||
              contextLine.includes('message')) {
            issues.push({
              code: pattern.code,
              name: pattern.name,
              severity: 'high',
              description: pattern.description,
              file: filePath,
              line: lineNumber,
              snippet: contextLine.slice(0, 200),
              remediation: 'Review and sanitize prompts for injection attempts. Use structured templates.',
            });
          }
        }
      }
    }
    
    return issues;
  }

  private calculateRiskScore(issues: SecurityIssue[]): number {
    const weights = {
      critical: 25,
      high: 15,
      medium: 5,
      low: 1,
    };
    
    let score = 0;
    for (const issue of issues) {
      score += weights[issue.severity];
    }
    
    return Math.min(100, score);
  }

  private saveScan(result: SecurityScanResult): void {
    this.history.scans.push({
      id: result.id,
      timestamp: result.timestamp,
      riskScore: result.riskScore,
      summary: result.summary,
    });
    
    // Keep only last 50 scans
    if (this.history.scans.length > 50) {
      this.history.scans = this.history.scans.slice(-50);
    }
    
    // Store issues
    this.history.issues.push(...result.issues);
    
    // Keep only last 1000 issues
    if (this.history.issues.length > 1000) {
      this.history.issues = this.history.issues.slice(-1000);
    }
    
    this.saveHistory();
  }

  getScanHistory(limit: number = 10): Array<{
    id: string;
    timestamp: number;
    riskScore: number;
    summary: SecurityScanResult['summary'];
  }> {
    return this.history.scans.slice(-limit);
  }

  getLatestScan(): { id: string; timestamp: number; riskScore: number; summary: SecurityScanResult['summary'] } | null {
    const scans = this.history.scans;
    return scans[scans.length - 1] || null;
  }

  getIssuesByScan(scanId: string): SecurityIssue[] {
    return this.history.issues.filter(i => true); // All issues for now
  }

  clearHistory(): void {
    this.history = { scans: [], issues: [] };
    this.saveHistory();
  }

  generateReport(result: SecurityScanResult): string {
    let report = `## Security Scan Results\n\n`;
    report += `**Risk Score:** ${result.riskScore}/100`;
    
    if (result.riskScore < 20) {
      report += ` (Low) ✓\n`;
    } else if (result.riskScore < 50) {
      report += ` (Medium) ⚠️\n`;
    } else if (result.riskScore < 75) {
      report += ` (High) ⚠️\n`;
    } else {
      report += ` (Critical) 🔴\n`;
    }
    
    report += `**Files Scanned:** ${result.filesScanned}\n`;
    report += `**Duration:** ${(result.scanDurationMs / 1000).toFixed(2)}s\n`;
    report += `**Timestamp:** ${new Date(result.timestamp).toLocaleString()}\n\n`;
    
    const { critical, high, medium, low } = result.summary;
    
    report += `### Summary\n`;
    report += `- **Critical:** ${critical}\n`;
    report += `- **High:** ${high}\n`;
    report += `- **Medium:** ${medium}\n`;
    report += `- **Low:** ${low}\n\n`;
    
    const severities: Array<'critical' | 'high' | 'medium' | 'low'> = ['critical', 'high', 'medium', 'low'];
    
    for (const severity of severities) {
      const issues = result.issues.filter(i => i.severity === severity);
      if (issues.length === 0) {
        report += `### ${severity.charAt(0).toUpperCase() + severity.slice(1)} Issues\nNone found ✓\n\n`;
        continue;
      }
      
      report += `### ${severity.charAt(0).toUpperCase() + severity.slice(1)} Issues (${issues.length})\n`;
      
      for (let i = 0; i < Math.min(issues.length, 5); i++) {
        const issue = issues[i];
        report += `${i + 1}. **${issue.code}: ${issue.name}**`;
        if (issue.file) {
          report += ` - ${issue.file}`;
          if (issue.line) {
            report += `:${issue.line}`;
          }
        }
        report += `\n   ${issue.description}\n`;
        report += `   **Remediation:** ${issue.remediation}\n\n`;
      }
      
      if (issues.length > 5) {
        report += `   *...and ${issues.length - 5} more ${severity} issues*\n\n`;
      }
    }
    
    return report;
  }

  getDetectionRules(): typeof DETECTION_RULES {
    return DETECTION_RULES;
  }

  getSemanticPatterns(): typeof SEMANTIC_PATTERNS {
    return SEMANTIC_PATTERNS;
  }
}

export const aiSecurityScanner = new AISecurityScanner();

export async function runSecurityScan(options?: ScanOptions): Promise<SecurityScanResult> {
  return aiSecurityScanner.scan(options);
}

export async function getSecurityStatus(): Promise<{
  lastScan: { id: string; timestamp: number; riskScore: number; summary: SecurityScanResult['summary'] } | null;
  issueCount: number;
  riskLevel: string;
}> {
  await aiSecurityScanner.initialize();
  
  const lastScan = aiSecurityScanner.getLatestScan();
  const issueCount = aiSecurityScanner.getIssuesByScan('').length;
  
  let riskLevel = 'unknown';
  if (lastScan) {
    if (lastScan.riskScore < 20) riskLevel = 'low';
    else if (lastScan.riskScore < 50) riskLevel = 'medium';
    else if (lastScan.riskScore < 75) riskLevel = 'high';
    else riskLevel = 'critical';
  }
  
  return { lastScan, issueCount, riskLevel };
}