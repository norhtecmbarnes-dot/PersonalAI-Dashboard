import type { ScheduledTask, TaskExecutionResult } from '@/lib/services/task-scheduler';

export async function executeSecurityTask(task: ScheduledTask): Promise<TaskExecutionResult> {
  const { securityAgent } = await import('@/lib/agent/security-agent');

  const report = await securityAgent.performSecurityScan();

  return {
    success: true,
    result: `Security scan completed. Risk score: ${report.riskScore}`,
    data: { riskScore: report.riskScore, findings: report.findings?.length || 0 },
  };
}
