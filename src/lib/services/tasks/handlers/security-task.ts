import type { ScheduledTask, TaskExecutionResult } from '@/lib/services/task-scheduler';

export async function executeSecurityTask(task: ScheduledTask): Promise<TaskExecutionResult> {
  const { securityAgent } = await import('@/lib/agent/security-agent');

  const report = await securityAgent.performSecurityScan();

  try {
    const { sendSecurityNotification, getNotificationConfig } =
      await import('@/lib/integrations/telegram-notify');
    const notifConfig = await getNotificationConfig();
    if (notifConfig.enabled && notifConfig.security) {
      const criticalCount = report.findings?.filter(f => f.severity === 'critical').length || 0;
      const highCount = report.findings?.filter(f => f.severity === 'high').length || 0;
      await sendSecurityNotification({
        count: report.findings?.length || 0,
        riskScore: report.riskScore,
        critical: criticalCount,
        high: highCount,
      });
    }
  } catch (e) {
    console.log('[TaskScheduler] Telegram notification failed:', e);
  }

  return {
    success: true,
    result: `Security scan completed. Risk score: ${report.riskScore}`,
    data: { riskScore: report.riskScore, findings: report.findings?.length || 0 },
  };
}
