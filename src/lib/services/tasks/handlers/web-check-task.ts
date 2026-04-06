import type { ScheduledTask, TaskExecutionResult } from '@/lib/services/task-scheduler';

export async function executeWebCheckTask(task: ScheduledTask): Promise<TaskExecutionResult> {
  return {
    success: true,
    result: 'Web check is disabled. Use manual search via chat for current information.',
    data: {
      message: 'External web checking disabled to reduce system traffic',
      suggestion: 'Use the web search feature in chat for current information',
    },
  };
}
