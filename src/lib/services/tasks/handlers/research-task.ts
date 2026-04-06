import type { ScheduledTask, TaskExecutionResult } from '@/lib/services/task-scheduler';

export async function executeResearchTask(task: ScheduledTask): Promise<TaskExecutionResult> {
  const { researchAgent } = await import('@/lib/agent/research-agent');

  const report = await researchAgent.performResearch();

  return {
    success: true,
    result: `Research completed. Found ${report.totalFindings} articles`,
    data: { findings: report.totalFindings },
  };
}
