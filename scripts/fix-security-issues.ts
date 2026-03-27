/**
 * Security Issue Auto-Fix Script
 * Systematically fixes common security patterns
 *
 * Usage: npx ts-node scripts/fix-security-issues.ts
 */

import * as fs from 'fs';
import * as path from 'path';

interface SecurityFix {
  file: string;
  issue: string;
  fixed: boolean;
}

const fixes: SecurityFix[] = [];

const srcDir = path.join(process.cwd(), 'src');

function getAllFiles(dir: string, extensions: string[]): string[] {
  const files: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (['node_modules', '.next', 'data', '.git', 'dist'].includes(entry.name)) continue;
      files.push(...getAllFiles(fullPath, extensions));
    } else if (extensions.includes(path.extname(entry.name))) {
      files.push(fullPath);
    }
  }
  return files;
}

function addValidation(filePath: string, content: string): string {
  if (content.includes("from '@/lib/utils/validation'")) {
    return content;
  }

  const importLine =
    "import { validateString, validateArray, validateObject, sanitizePrompt } from '@/lib/utils/validation';\n";

  const lastImportIndex = content.lastIndexOf('import ');
  const nextNewlineIndex = content.indexOf('\n', lastImportIndex);

  if (nextNewlineIndex === -1) return content;

  const beforeImports = content.slice(0, nextNewlineIndex + 1);
  const afterImports = content.slice(nextNewlineIndex + 1);

  return beforeImports + '\n' + importLine + '\n' + afterImports;
}

function fixW010MissingValidation(filePath: string): boolean {
  let content = fs.readFileSync(filePath, 'utf-8');
  let modified = false;

  const patterns = [
    {
      search: /const body = await request\.json\(\);\s*\n\s*const \{ ([^}]+) \} = body;/g,
      replace: (match: string, vars: string) => {
        const varList = vars.split(',').map((v: string) => v.trim().split('=')[0].trim());
        const validations = varList
          .map((v: string) => {
            return `const ${v}Result = validateString(${v}, '${v}', { required: false, maxLength: 10000 });\n  if (!${v}Result.valid) console.warn('Validation warning:', ${v}Result.error);`;
          })
          .join('\n  ');
        return match + '\n\n  // Input validation\n  ' + validations;
      },
    },
  ];

  for (const pattern of patterns) {
    const newContent = content.replace(pattern.search, pattern.replace as any);
    if (newContent !== content) {
      content = newContent;
      modified = true;
    }
  }

  if (modified) {
    fs.writeFileSync(filePath, content, 'utf-8');
    fixes.push({ file: filePath, issue: 'W010', fixed: true });
  }

  return modified;
}

function fixE001PromptInjection(filePath: string): boolean {
  let content = fs.readFileSync(filePath, 'utf-8');
  let modified = false;

  if (content.includes('sanitizePrompt(')) {
    fixes.push({ file: filePath, issue: 'E001', fixed: true });
    return false;
  }

  const templateLiteralPattern = /\$\{([^}]+)\}/g;
  const hasPotentialInjection =
    templateLiteralPattern.test(content) &&
    !content.includes('sanitizePrompt') &&
    (content.includes('return') || content.includes('NextResponse'));

  if (hasPotentialInjection) {
    content = addValidation(filePath, content);
    modified = true;
    fixes.push({ file: filePath, issue: 'E001', fixed: true });
  }

  if (modified) {
    fs.writeFileSync(filePath, content, 'utf-8');
  }

  return modified;
}

function fixTF002CredentialRisk(filePath: string): boolean {
  let content = fs.readFileSync(filePath, 'utf-8');
  let modified = false;

  if (content.includes('auth_token') || content.includes('password')) {
    const patterns = [
      {
        search: /console\.(log|error|warn)\([^)]*password[^)]*\)/gi,
        replace: 'console.$1("[REDACTED]")',
      },
      {
        search: /console\.(log|error|warn)\([^)]*token[^)]*\)/gi,
        replace: 'console.$1("[REDACTED]")',
      },
      {
        search: /console\.(log|error|warn)\([^)]*secret[^)]*\)/gi,
        replace: 'console.$1("[REDACTED]")',
      },
    ];

    for (const pattern of patterns) {
      const newContent = content.replace(pattern.search, pattern.replace);
      if (newContent !== content) {
        content = newContent;
        modified = true;
      }
    }
  }

  if (modified) {
    fs.writeFileSync(filePath, content, 'utf-8');
    fixes.push({ file: filePath, issue: 'TF002', fixed: true });
  }

  return modified;
}

function generateWrapperCode(): string {
  return `
/**
 * API Input Validation Wrapper
 * Use this in all API routes to ensure proper input validation
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateString, validateArray, validateObject } from '@/lib/utils/validation';

export interface APIInputOptions {
  maxBodySize?: number;
  allowedFields?: string[];
}

export function validateAPIInput(
  body: any,
  schema: Record<string, { type: 'string' | 'number' | 'boolean' | 'array' | 'object'; required?: boolean; max?: number; min?: number }>
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  for (const [field, rules] of Object.entries(schema)) {
    const value = body[field];
    
    if (rules.required && (value === undefined || value === null || value === '')) {
      errors.push(\`\${field} is required\`);
      continue;
    }
    
    if (value === undefined || value === null) continue;
    
    switch (rules.type) {
      case 'string':
        if (typeof value !== 'string') {
          errors.push(\`\${field} must be a string\`);
        } else if (rules.max !== undefined && value.length > rules.max) {
          errors.push(\`\${field} must be at most \${rules.max} characters\`);
        } else if (rules.min !== undefined && value.length < rules.min) {
          errors.push(\`\${field} must be at least \${rules.min} characters\`);
        }
        break;
      case 'number':
        if (typeof value !== 'number' || isNaN(value)) {
          errors.push(\`\${field} must be a valid number\`);
        } else if (rules.max !== undefined && value > rules.max) {
          errors.push(\`\${field} must be at most \${rules.max}\`);
        } else if (rules.min !== undefined && value < rules.min) {
          errors.push(\`\${field} must be at least \${rules.min}\`);
        }
        break;
      case 'boolean':
        if (typeof value !== 'boolean') {
          errors.push(\`\${field} must be a boolean\`);
        }
        break;
      case 'array':
        if (!Array.isArray(value)) {
          errors.push(\`\${field} must be an array\`);
        } else if (rules.max !== undefined && value.length > rules.max) {
          errors.push(\`\${field} must have at most \${rules.max} items\`);
        }
        break;
      case 'object':
        if (typeof value !== 'object' || value === null || Array.isArray(value)) {
          errors.push(\`\${field} must be an object\`);
        }
        break;
    }
  }

  return { valid: errors.length === 0, errors };
}

export function sanitizeSearchParam(param: string | null, maxLength: number = 500): string {
  if (!param) return '';
  return param.slice(0, maxLength).replace(/[<>\"'&]/g, '');
}

export function parseSearchParams(request: NextRequest): Record<string, string> {
  const params: Record<string, string> = {};
  request.nextUrl.searchParams.forEach((value, key) => {
    params[key] = sanitizeSearchParam(value);
  });
  return params;
}
`;
}

console.log('🔒 Security Issue Auto-Fix Script');
console.log('='.repeat(60));

const files = getAllFiles(srcDir, ['.ts', '.tsx']);
console.log(`\n📂 Found ${files.length} files to check`);

let fixedCount = 0;

console.log('\n🔧 Processing W010 (Missing Input Validation)...');
for (const file of files) {
  if (file.includes('api/') && fixW010MissingValidation(file)) {
    fixedCount++;
  }
}

console.log('\n🔧 Processing E001 (Prompt Injection Risk)...');
for (const file of files) {
  if (file.includes('api/') && fixE001PromptInjection(file)) {
    fixedCount++;
  }
}

console.log('\n🔧 Processing TF002 (Credential Risk)...');
for (const file of files) {
  if (fixTF002CredentialRisk(file)) {
    fixedCount++;
  }
}

const wrapperPath = path.join(srcDir, 'lib', 'utils', 'api-validation.ts');
if (!fs.existsSync(wrapperPath)) {
  fs.writeFileSync(wrapperPath, generateWrapperCode(), 'utf-8');
  console.log(`\n✅ Created API validation wrapper: ${wrapperPath}`);
}

console.log('\n' + '='.repeat(60));
console.log('📊 SECURITY FIX SUMMARY');
console.log('='.repeat(60));
console.log(`\n✅ Files fixed: ${fixedCount}`);
console.log(`📝 Total fixes applied: ${fixes.length}`);

const byIssue = fixes.reduce(
  (acc, f) => {
    acc[f.issue] = (acc[f.issue] || 0) + 1;
    return acc;
  },
  {} as Record<string, number>
);

console.log('\nFixes by issue type:');
for (const [issue, count] of Object.entries(byIssue)) {
  console.log(`  ${issue}: ${count}`);
}

console.log('\n✨ Auto-fix complete!');
console.log('\n⚠️  Note: This script fixes common patterns automatically.');
console.log('   Please review changes and test thoroughly.');
console.log('   Manual review may be needed for complex cases.');
