import type { ScheduledTask, TaskExecutionResult } from '@/lib/services/task-scheduler';

export async function executeSecurityFixTask(task: ScheduledTask): Promise<TaskExecutionResult> {
  try {
    const { securityAgent } = await import('@/lib/agent/security-agent');
    const { securityAutofix } = await import('@/lib/security/security-autofix');

    console.log('[SecurityFix] Running security scan...');
    const scanResult = await securityAgent.performSecurityScan();

    if (!scanResult.findings || scanResult.findings.length === 0) {
      return {
        success: true,
        result: 'No security issues found',
        data: { riskScore: scanResult.riskScore, findings: 0 },
      };
    }

    console.log(`[SecurityFix] Found ${scanResult.findings.length} issues, attempting auto-fix...`);

    // Convert SecurityFinding to SecurityIssue format for autofix
    const issuesToFix = scanResult.findings.map(finding => ({
      code: finding.category.toUpperCase().substring(0, 4) || 'W001',
      name: finding.title,
      severity: finding.severity as any,
      description: finding.description,
      file: finding.location?.split(':')[0] || 'unknown',
      line: parseInt(finding.location?.split(':')[1] || '0'),
      remediation: finding.recommendation,
    }));

    // Apply fixes to all issues
    const fixResults = await securityAutofix.batchApplyFixes(issuesToFix);

    // Generate summary
    const summary = [
      `Security scan complete. Risk score: ${scanResult.riskScore}/100`,
      `Total issues: ${fixResults.total}`,
      `✅ Fixed: ${fixResults.fixed} (${fixResults.llmFixed} by LLM)`,
      `⚠️ Skipped: ${fixResults.skipped}`,
      `❌ Failed: ${fixResults.failed}`,
    ].join('\n');

    // Send Telegram notification if enabled
    try {
      const { sendSecurityNotification, getNotificationConfig } =
        await import('@/lib/integrations/telegram-notify');
      const notifConfig = await getNotificationConfig();

      if (notifConfig.enabled && notifConfig.security) {
        const criticalCount = scanResult.findings.filter(f => f.severity === 'critical').length;
        const highCount = scanResult.findings.filter(f => f.severity === 'high').length;

        await sendSecurityNotification({
          count: scanResult.findings.length,
          riskScore: scanResult.riskScore,
          critical: criticalCount,
          high: highCount,
        });
      }
    } catch (e) {
      console.log('[SecurityFix] Telegram notification failed:', e);
    }

    return {
      success: true,
      result: summary,
      data: {
        riskScore: scanResult.riskScore,
        totalIssues: fixResults.total,
        fixed: fixResults.fixed,
        llmFixed: fixResults.llmFixed,
        skipped: fixResults.skipped,
        failed: fixResults.failed,
        details: fixResults.results.map(r => ({
          issue: r.issue.code,
          action: r.action,
          success: r.success,
          llmUsed: r.llmUsed || false,
        })),
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Security fix task failed',
    };
  }
}
