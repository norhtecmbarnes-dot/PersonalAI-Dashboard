import { SecurityIssue } from './ai-security-scanner';

export interface AutofixResult {
  success: boolean;
  issue: SecurityIssue;
  action: string;
  file?: string;
  backupFile?: string;
  error?: string;
  llmUsed?: boolean;
}

export interface SecurityFixRequest {
  issue: SecurityIssue;
  fileContent: string;
  filePath: string;
}

export interface SecurityFixResponse {
  fixed: boolean;
  fixedContent?: string;
  explanation: string;
  confidence: 'high' | 'medium' | 'low';
}

export class SecurityAutofix {
  private projectRoot: string;

  constructor() {
    this.projectRoot = process.cwd();
  }

  async applyFix(issue: SecurityIssue): Promise<AutofixResult> {
    try {
      const filePath = this.projectRoot + '/' + issue.file;

      // Check if file exists
      const fs = await import('fs');
      if (!fs.existsSync(filePath)) {
        return {
          success: false,
          issue,
          action: 'File not found',
          error: `Cannot find ${issue.file}`,
        };
      }

      const fileContent = fs.readFileSync(filePath, 'utf-8');

      // Use LLM via message bus for intelligent fixes
      const fixResult = await this.requestLLMFix({
        issue,
        fileContent,
        filePath,
      });

      if (fixResult.fixed && fixResult.fixedContent) {
        // Create backup
        const backupFile = filePath + '.backup-' + Date.now();
        fs.writeFileSync(backupFile, fileContent, 'utf-8');

        // Apply fix
        fs.writeFileSync(filePath, fixResult.fixedContent, 'utf-8');

        return {
          success: true,
          issue,
          action: fixResult.explanation,
          file: filePath,
          backupFile,
          llmUsed: true,
        };
      }

      // If LLM couldn't fix, try simple pattern-based fixes
      return await this.applySimpleFix(issue, filePath, fileContent);
    } catch (error) {
      return {
        success: false,
        issue,
        action: 'Fix failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private async requestLLMFix(request: SecurityFixRequest): Promise<SecurityFixResponse> {
    try {
      const prompt = `You are a security expert. Fix this security issue in the code.

**Issue:** ${request.issue.code} - ${request.issue.name}
**Severity:** ${request.issue.severity}
**Description:** ${request.issue.description}
**Remediation:** ${request.issue.remediation}

**File:** ${request.filePath}

**Current Code:**
\`\`\`typescript
${request.fileContent}
\`\`\`

**Task:**
1. Fix the security issue while maintaining functionality
2. Return the COMPLETE fixed code
3. Explain what you changed

Return ONLY valid JSON (no markdown):
{
  "fixed": boolean,
  "fixedContent": "complete fixed code here",
  "explanation": "what you changed and why",
  "confidence": "high|medium|low"
}`;

      // Use Model Message Bus for intelligent cloud/local orchestration
      const { getModelBus } = await import('@/lib/services/model-bus');
      const messageBus = getModelBus();

      // Set GLM as preferred cloud model for security fixes
      messageBus.setPreferredCloudModel('glm-4-flash');

      // Send security fix request through message bus
      // It will intelligently route to cloud (GLM) or local (Ollama) based on complexity
      const delegationResult = await messageBus.process({
        originalQuery: prompt,
        context: `Security Issue: ${request.issue.code} - ${request.issue.name}\nSeverity: ${request.issue.severity}\nFile: ${request.filePath}`,
        sourceModel: 'security-autofix',
        preferredCloudModel: 'glm-4-flash',
      });

      const llmResponse = delegationResult.finalResponse;

      // Parse response
      const fixResult = this.parseLLMResponse(llmResponse);
      return fixResult;
    } catch (error) {
      console.error('[SecurityAutofix] LLM fix failed:', error);
      return {
        fixed: false,
        explanation: 'LLM unavailable, falling back to simple fixes',
        confidence: 'low',
      };
    }
  }

  private parseLLMResponse(response: string): SecurityFixResponse {
    try {
      // Extract JSON from response
      const content = response;
      const jsonMatch = content.match(/\{[\s\S]*\}/);

      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          fixed: parsed.fixed || false,
          fixedContent: parsed.fixedContent,
          explanation: parsed.explanation || 'Code fixed by LLM',
          confidence: parsed.confidence || 'medium',
        };
      }

      // If response is code, assume it's a fix
      if (
        content.includes('export') ||
        content.includes('import') ||
        content.includes('function')
      ) {
        return {
          fixed: true,
          fixedContent: content,
          explanation: 'Code fixed by LLM',
          confidence: 'medium',
        };
      }

      return {
        fixed: false,
        explanation: 'No valid fix returned',
        confidence: 'low',
      };
    } catch {
      return {
        fixed: false,
        explanation: 'Failed to parse LLM response',
        confidence: 'low',
      };
    }
  }

  private async applySimpleFix(
    issue: SecurityIssue,
    filePath: string,
    content: string
  ): Promise<AutofixResult> {
    const fs = await import('fs');

    // Simple pattern-based fixes for common issues
    switch (issue.code) {
      case 'I014': // Missing error logging
        return this.addErrorLogging(issue, filePath, content);

      case 'W008': // Insecure env handling
        return this.secureENVHandling(issue, filePath, content);

      case 'I013': // Missing rate limiting
        return this.addRateLimitingComment(issue, filePath, content);

      default:
        return {
          success: false,
          issue,
          action: 'No simple fix available',
          error: `Manual fix required for ${issue.code}`,
        };
    }
  }

  private async addErrorLogging(
    issue: SecurityIssue,
    filePath: string,
    content: string
  ): Promise<AutofixResult> {
    const fs = await import('fs');

    // Find empty catch blocks
    const emptyCatchPattern = /catch\s*\(\s*(\w+)\s*\)\s*\{\s*\}/g;
    if (!emptyCatchPattern.test(content)) {
      return {
        success: true,
        issue,
        action: 'No empty catch blocks found',
        file: filePath,
      };
    }

    const newContent = content.replace(
      /catch\s*\(\s*(\w+)\s*\)\s*\{\s*\}/g,
      "catch ($1) { console.error('[Error]', $1); }"
    );

    const backupFile = filePath + '.backup-' + Date.now();
    fs.writeFileSync(backupFile, content, 'utf-8');
    fs.writeFileSync(filePath, newContent, 'utf-8');

    return {
      success: true,
      issue,
      action: 'Added error logging to catch blocks',
      file: filePath,
      backupFile,
      llmUsed: false,
    };
  }

  private async secureENVHandling(
    issue: SecurityIssue,
    filePath: string,
    content: string
  ): Promise<AutofixResult> {
    const fs = await import('fs');

    // Remove console.log with process.env
    const envLogPattern = /console\.log\s*\(\s*process\.env\.\w+\s*\)/g;
    if (!envLogPattern.test(content)) {
      return {
        success: true,
        issue,
        action: 'No insecure env logging found',
        file: filePath,
      };
    }

    const newContent = content.replace(
      /console\.log\s*\(\s*process\.env\.\w+\s*\)/g,
      '// console.log(REDACTED)'
    );

    const backupFile = filePath + '.backup-' + Date.now();
    fs.writeFileSync(backupFile, content, 'utf-8');
    fs.writeFileSync(filePath, newContent, 'utf-8');

    return {
      success: true,
      issue,
      action: 'Removed environment variable logging',
      file: filePath,
      backupFile,
      llmUsed: false,
    };
  }

  private async addRateLimitingComment(
    issue: SecurityIssue,
    filePath: string,
    content: string
  ): Promise<AutofixResult> {
    const fs = await import('fs');

    // Add TODO comment for rate limiting
    const todoComment = `// TODO: Add rate limiting - import { rateLimit } from '@/lib/middleware/rate-limit'\n`;
    const newContent = todoComment + content;

    const backupFile = filePath + '.backup-' + Date.now();
    fs.writeFileSync(backupFile, content, 'utf-8');
    fs.writeFileSync(filePath, newContent, 'utf-8');

    return {
      success: true,
      issue,
      action: 'Added TODO comment for rate limiting',
      file: filePath,
      backupFile,
      llmUsed: false,
    };
  }

  async batchApplyFixes(issues: SecurityIssue[]): Promise<{
    total: number;
    fixed: number;
    failed: number;
    skipped: number;
    llmFixed: number;
    results: AutofixResult[];
  }> {
    const results: AutofixResult[] = [];
    let fixed = 0;
    let failed = 0;
    let skipped = 0;
    let llmFixed = 0;

    for (const issue of issues) {
      const result = await this.applyFix(issue);
      results.push(result);

      if (result.success) {
        fixed++;
        if (result.llmUsed) {
          llmFixed++;
        }
      } else if (result.error?.includes('Manual fix required')) {
        skipped++;
      } else {
        failed++;
      }
    }

    return {
      total: issues.length,
      fixed,
      failed,
      skipped,
      llmFixed,
      results,
    };
  }
}

export const securityAutofix = new SecurityAutofix();
