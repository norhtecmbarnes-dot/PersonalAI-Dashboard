/**
 * Security Cleanup Script
 * Runs a comprehensive security scan and auto-fixes common issues
 *
 * Usage: npx ts-node scripts/security-cleanup.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

interface SecurityIssue {
  file: string;
  line: number;
  type: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  fixed: boolean;
}

const issues: SecurityIssue[] = [];

// Common security patterns to check and fix
const securityPatterns = [
  {
    name: 'dangerous-function',
    pattern: /new\s+Function\s*\(/g,
    severity: 'critical' as const,
    description: 'Dangerous Function() constructor - allows arbitrary code execution',
  },
  {
    name: 'eval-usage',
    pattern: /\beval\s*\(/g,
    severity: 'critical' as const,
    description: 'eval() usage - potential code injection',
  },
  {
    name: 'innerHTML-assignment',
    pattern: /\.innerHTML\s*=\s*[^"'`]/g,
    severity: 'high' as const,
    description: 'Direct innerHTML assignment - potential XSS',
  },
  {
    name: 'dangerouslySetInnerHTML',
    pattern: /dangerouslySetInnerHTML/g,
    severity: 'medium' as const,
    description: 'React dangerouslySetInnerHTML - ensure content is sanitized',
  },
  {
    name: 'hardcoded-secrets',
    pattern: /(password|secret|api[_-]?key|token|credential)\s*[=:]\s*["'][^"']+["']/gi,
    severity: 'critical' as const,
    description: 'Hardcoded credentials or secrets',
  },
  {
    name: 'sql-concat',
    pattern: /["'`]\s*\+\s*\w+\s*\+\s*["'`]/g,
    severity: 'high' as const,
    description: 'SQL string concatenation - potential SQL injection',
  },
  {
    name: 'console-log-cred',
    pattern: /console\.(log|error|warn)\([^)]*(password|token|secret|key|credential)[^)]*\)/gi,
    severity: 'medium' as const,
    description: 'Console logging of sensitive data',
  },
  {
    name: 'http-url',
    pattern: /http:\/\/(?!localhost|127\.0\.0\.1)[^"'\s]+/g,
    severity: 'low' as const,
    description: 'Insecure HTTP URL (not localhost)',
  },
  {
    name: 'no-input-validation',
    pattern: /req\.(body|query|params)\.\w+\s*(?!&&|\|\|)/g,
    severity: 'medium' as const,
    description: 'Request parameter used without validation',
  },
];

// Auto-fix patterns
const autoFixes: Record<string, (content: string, filePath: string) => string> = {
  'dangerous-function': (content, filePath) => {
    // Already fixed - just warn
    if (content.includes('new Function(')) {
      console.log(`  ⚠️  ${filePath}: Contains Function() - already using mathjs?`);
    }
    return content;
  },

  'console-log-cred': (content, filePath) => {
    // Remove sensitive logging
    return content.replace(
      /console\.(log|error|warn)\(([^)]*(password|token|secret|key|credential)[^)]*)\)/gi,
      (match, method, args) => {
        // Replace with safe logging
        return `console.${method}('[REDACTED]')`;
      }
    );
  },

  'hardcoded-secrets': (content, filePath) => {
    // Replace hardcoded secrets with env vars
    return content.replace(
      /(password|secret|api[_-]?key|token|credential)\s*[=:]\s*["']([^"']+)["']/gi,
      (match, name, value) => {
        const envName = name.toUpperCase().replace(/[^A-Z]/g, '_');
        return `${name}: process.env.${envName} || '${value.substring(0, 4)}...'`;
      }
    );
  },

  'http-url': (content, filePath) => {
    // Convert HTTP to HTTPS for external URLs
    return content.replace(/http:\/\/(?!localhost|127\.0\.0\.1)([^"'\s]+)/g, 'https://$1');
  },
};

function scanDirectory(dir: string, extensions: string[]): void {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    // Skip node_modules, .next, data directories
    if (entry.isDirectory()) {
      if (['node_modules', '.next', 'data', '.git', 'dist', 'build'].includes(entry.name)) {
        continue;
      }
      scanDirectory(fullPath, extensions);
      continue;
    }

    // Only scan specified extensions
    const ext = path.extname(entry.name);
    if (!extensions.includes(ext)) continue;

    const content = fs.readFileSync(fullPath, 'utf-8');
    const lines = content.split('\n');

    for (const pattern of securityPatterns) {
      let match;
      const regex = new RegExp(pattern.pattern.source, pattern.pattern.flags);

      while ((match = regex.exec(content)) !== null) {
        const lineNumber = content.substring(0, match.index).split('\n').length;

        issues.push({
          file: fullPath,
          line: lineNumber,
          type: pattern.name,
          severity: pattern.severity,
          description: pattern.description,
          fixed: false,
        });
      }
    }
  }
}

function applyFixes(): void {
  const filesFixed = new Set<string>();

  for (const issue of issues) {
    if (autoFixes[issue.type] && !issue.fixed) {
      try {
        const content = fs.readFileSync(issue.file, 'utf-8');
        const fixed = autoFixes[issue.type](content, issue.file);

        if (content !== fixed) {
          fs.writeFileSync(issue.file, fixed, 'utf-8');
          issue.fixed = true;
          filesFixed.add(issue.file);
          console.log(`  ✅ Fixed: ${issue.file} (${issue.type})`);
        }
      } catch (err) {
        console.log(`  ❌ Could not fix: ${issue.file}`);
      }
    }
  }

  if (filesFixed.size > 0) {
    console.log(`\n📊 Fixed issues in ${filesFixed.size} file(s)`);
  }
}

function generateReport(): void {
  const bySeverity = {
    critical: issues.filter(i => i.severity === 'critical'),
    high: issues.filter(i => i.severity === 'high'),
    medium: issues.filter(i => i.severity === 'medium'),
    low: issues.filter(i => i.severity === 'low'),
  };

  console.log('\n' + '='.repeat(60));
  console.log('📊 SECURITY SCAN REPORT');
  console.log('='.repeat(60));

  console.log(`\n📋 Summary:`);
  console.log(`   Critical: ${bySeverity.critical.length}`);
  console.log(`   High:     ${bySeverity.high.length}`);
  console.log(`   Medium:   ${bySeverity.medium.length}`);
  console.log(`   Low:      ${bySeverity.low.length}`);
  console.log(`   Total:    ${issues.length}`);
  console.log(`   Fixed:    ${issues.filter(i => i.fixed).length}`);

  // Group by type
  const byType: Record<string, SecurityIssue[]> = {};
  for (const issue of issues) {
    if (!byType[issue.type]) byType[issue.type] = [];
    byType[issue.type].push(issue);
  }

  console.log('\n📁 Issues by Type:');
  for (const [type, typeIssues] of Object.entries(byType)) {
    console.log(`\n  ${type} (${typeIssues.length}):`);
    for (const issue of typeIssues.slice(0, 5)) {
      const status = issue.fixed ? '✅' : '⚠️ ';
      console.log(`    ${status} ${path.relative(process.cwd(), issue.file)}:${issue.line}`);
    }
    if (typeIssues.length > 5) {
      console.log(`    ... and ${typeIssues.length - 5} more`);
    }
  }

  // Recommendations
  console.log('\n💡 Recommendations:');

  if (bySeverity.critical.length > 0) {
    console.log('   🔴 Critical issues found - review and fix immediately');
  }
  if (bySeverity.high.length > 0) {
    console.log('   🟠 High severity issues - should be addressed soon');
  }
  if (issues.some(i => i.type === 'hardcoded-secrets')) {
    console.log('   🔐 Move hardcoded secrets to environment variables');
  }
  if (issues.some(i => i.type === 'console-log-cred')) {
    console.log('   📝 Remove or redact sensitive data from console.log');
  }
  if (issues.some(i => i.type === 'dangerous-function')) {
    console.log('   ⚡ Replace Function() with safe alternatives (mathjs, etc.)');
  }

  console.log('\n' + '='.repeat(60));
}

// Additional checks
function checkEnvExample(): void {
  const envExamplePath = path.join(process.cwd(), '.env.example');
  if (fs.existsSync(envExamplePath)) {
    const content = fs.readFileSync(envExamplePath, 'utf-8');
    const neededVars = ['GLM_API_KEY', 'OPENROUTER_API_KEY', 'DEEPSEEK_API_KEY'];

    for (const varName of neededVars) {
      if (!content.includes(varName)) {
        console.log(`  ⚠️  .env.example missing: ${varName}`);
      }
    }
  }
}

function checkGitignore(): void {
  const gitignorePath = path.join(process.cwd(), '.gitignore');
  if (fs.existsSync(gitignorePath)) {
    const content = fs.readFileSync(gitignorePath, 'utf-8');
    const neededEntries = ['.env', '*.env', '.env.local', 'data/', '*.log', 'credentials.json'];

    console.log('\n📁 Checking .gitignore...');
    for (const entry of neededEntries) {
      if (!content.includes(entry)) {
        console.log(`  ⚠️  Missing: ${entry}`);
        // Auto-add
        fs.appendFileSync(gitignorePath, `\n# Added by security cleanup\n${entry}\n`);
        console.log(`  ✅ Added: ${entry}`);
      }
    }
  }
}

// Main execution
console.log('🔒 Security Cleanup Script');
console.log('='.repeat(60));
console.log('\n📂 Scanning directories...');

const srcDir = path.join(process.cwd(), 'src');
if (fs.existsSync(srcDir)) {
  scanDirectory(srcDir, ['.ts', '.tsx', '.js', '.jsx']);
}

console.log('📂 Checking configuration files...');
checkEnvExample();
checkGitignore();

console.log('\n🔧 Applying auto-fixes...');
applyFixes();

generateReport();

console.log('\n✨ Security cleanup complete!');
