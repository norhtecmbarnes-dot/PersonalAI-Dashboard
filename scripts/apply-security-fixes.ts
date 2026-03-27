/**
 * Apply Security Fixes to API Routes
 * This script adds sanitization to template literals with user-controlled values
 *
 * Usage: npx ts-node scripts/apply-security-fixes.ts
 */

import * as fs from 'fs';
import * as path from 'path';

const srcDir = path.join(process.cwd(), 'src');

interface Fix {
  file: string;
  pattern: RegExp;
  replacement: string;
  description: string;
}

const fixes: Fix[] = [];

function addSanitizeImport(content: string): string {
  if (content.includes("from '@/lib/utils/validation'")) {
    return content;
  }

  const lastImportMatch = content.match(/^import .+?;?\s*$/gm);
  if (!lastImportMatch) return content;

  const lastImport = lastImportMatch[lastImportMatch.length - 1];
  const lastImportIndex = content.lastIndexOf(lastImport);
  const insertPoint = content.indexOf('\n', lastImportIndex) + 1;

  const newImport = "import { sanitizePrompt } from '@/lib/utils/validation';\n";

  return content.slice(0, insertPoint) + newImport + content.slice(insertPoint);
}

function sanitizeTemplateLiterals(content: string): string {
  const patterns: Array<{
    pattern: RegExp;
    replacement: string;
  }> = [
    {
      pattern: /\$\{brand\.systemPrompt\}/g,
      replacement: '${sanitizePrompt(brand.systemPrompt || "", 5000)}',
    },
    {
      pattern: /\$\{brand\.voiceProfile\.keyMessages\.join\([^)]+\)\}/g,
      replacement: '${sanitizePrompt(brand.voiceProfile.keyMessages.join(", "), 1000)}',
    },
    {
      pattern: /\$\{brand\.voiceProfile\.avoidPhrases\.join\([^)]+\)\}/g,
      replacement: '${sanitizePrompt(brand.voiceProfile.avoidPhrases.join(", "), 1000)}',
    },
    {
      pattern: /\$\{brand\.persona\}/g,
      replacement: '${sanitizePrompt(brand.persona || "", 2000)}',
    },
    {
      pattern: /\$\{brand\.voiceStyle\}/g,
      replacement: '${sanitizePrompt(brand.voiceStyle || "", 500)}',
    },
    {
      pattern: /\$\{brand\.name\}/g,
      replacement: '${sanitizePrompt(brand.name, 200)}',
    },
    {
      pattern: /\$\{brand\.description\}/g,
      replacement: '${sanitizePrompt(brand.description || "", 2000)}',
    },
    {
      pattern: /\$\{brand\.website\}/g,
      replacement: '${sanitizePrompt(brand.website || "", 500)}',
    },
    {
      pattern: /\$\{project\.name\}/g,
      replacement: '${sanitizePrompt(project.name, 200)}',
    },
    {
      pattern: /\$\{project\.description\}/g,
      replacement: '${sanitizePrompt(project.description || "", 2000)}',
    },
    {
      pattern: /\$\{promptTitle\}/g,
      replacement: '${sanitizePrompt(promptTitle, 100)}',
    },
    {
      pattern: /\$\{brand\.voiceProfile\.tone\}/g,
      replacement: '${sanitizePrompt(brand.voiceProfile?.tone || "", 100)}',
    },
    {
      pattern: /\$\{brand\.voiceProfile\.style\}/g,
      replacement: '${sanitizePrompt(brand.voiceProfile?.style || "", 200)}',
    },
  ];

  let modified = content;
  for (const { pattern, replacement } of patterns) {
    if (pattern.test(modified)) {
      modified = modified.replace(pattern, replacement);
    }
  }

  return modified;
}

function processFile(filePath: string): { changed: boolean; fixesApplied: number } {
  let content = fs.readFileSync(filePath, 'utf-8');
  let modified = content;
  let fixesApplied = 0;

  if (content.includes('brand.') || content.includes('project.')) {
    const withImports = addSanitizeImport(modified);
    if (withImports !== modified) {
      modified = withImports;
      fixesApplied++;
    }

    const withSanitization = sanitizeTemplateLiterals(modified);
    if (withSanitization !== modified) {
      modified = withSanitization;
      fixesApplied++;
    }
  }

  if (modified !== content) {
    fs.writeFileSync(filePath, modified, 'utf-8');
    return { changed: true, fixesApplied };
  }

  return { changed: false, fixesApplied: 0 };
}

function findApiFiles(dir: string): string[] {
  const files: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (['node_modules', '.next', 'data', '.git'].includes(entry.name)) continue;
      files.push(...findApiFiles(fullPath));
    } else if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) {
      files.push(fullPath);
    }
  }

  return files;
}

console.log('🔒 Applying Security Fixes to API Routes');
console.log('='.repeat(60));

const apiDir = path.join(srcDir, 'app', 'api');
const files = findApiFiles(apiDir);

console.log(`\n📂 Found ${files.length} API files to process`);

let totalFiles = 0;
let totalFixes = 0;

for (const file of files) {
  const result = processFile(file);
  if (result.changed) {
    totalFiles++;
    totalFixes += result.fixesApplied;
    const relativePath = path.relative(process.cwd(), file);
    console.log(`  ✅ Fixed: ${relativePath}`);
  }
}

console.log('\n' + '='.repeat(60));
console.log('📊 SECURITY FIX SUMMARY');
console.log('='.repeat(60));
console.log(`\n✅ Files modified: ${totalFiles}`);
console.log(`📝 Total fixes applied: ${totalFixes}`);

console.log('\n⚠️  Remaining issues to address manually:');
console.log('  1. W010: Missing input validation on request.json() bodies');
console.log('  2. E001: Prompt injection in dynamic error messages');
console.log('  3. TF002: Credential handling patterns');
console.log('\n✨ Script complete!');
