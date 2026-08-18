import type { ScheduledTask, TaskExecutionResult } from '@/lib/services/task-scheduler';

export async function executeIntelligenceTask(task: ScheduledTask): Promise<TaskExecutionResult> {
  const { intelligenceService } = await import('@/lib/intelligence/report-generator');

  const report = await intelligenceService.generateReport();
  const articleCount =
    report.newsSummary?.spaceDomainAwareness?.length ||
    0 + (report.newsSummary?.commercialSpace?.length || 0);

  return {
    success: true,
    result: `Intelligence report generated with ${articleCount} articles`,
    data: { articleCount, reportId: report.id },
  };
}
