import type { ScheduledTask, TaskExecutionResult } from '@/lib/services/task-scheduler';

export async function executeRLTrainingTask(task: ScheduledTask): Promise<TaskExecutionResult> {
  try {
    const { rlTrainer } = await import('@/lib/agent/rl-trainer');
    const { agent } = await import('@/lib/agent/self-improvement');

    if (!agent.isRLEnabled()) {
      return {
        success: false,
        error: 'RL training is disabled in agent config',
      };
    }

    const result = await rlTrainer.runTrainingSession();
    const stats = rlTrainer.getStats();
    const recommendations = await rlTrainer.getRecommendations();

    return {
      success: true,
      result: `RL training complete: ${result.pairsProcessed} pairs, ${result.lessonsExtracted} lessons, ${result.memoriesUpdated} memories updated. Total conversations: ${stats.totalConversations}, Avg score: ${stats.averageScore.toFixed(2)}`,
      data: {
        pairsProcessed: result.pairsProcessed,
        lessonsExtracted: result.lessonsExtracted,
        memoriesUpdated: result.memoriesUpdated,
        stats,
        recommendations,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'RL training failed',
    };
  }
}
