import type { ScheduledTask, TaskExecutionResult } from '@/lib/services/task-scheduler';

export async function executeReflectionTask(task: ScheduledTask): Promise<TaskExecutionResult> {
  const { metricsService } = await import('@/lib/services/metrics');
  const { codeHealthService } = await import('@/lib/services/code-health');
  const { selfImprovementService } = await import('@/lib/services/self-improvement');

  const metrics = metricsService.getAggregatedMetrics('day');
  const codeHealth = await codeHealthService.analyzeCodeHealth();
  const report = await selfImprovementService.generateReport(metrics, codeHealth);

  return {
    success: true,
    result: `Self-reflection completed. Score: ${report.healthScore}`,
    data: { score: report.healthScore, insights: report.insights?.length || 0 },
  };
}
