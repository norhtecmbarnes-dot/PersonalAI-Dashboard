import type { ScheduledTask, TaskExecutionResult } from '@/lib/services/task-scheduler';

export async function executeCleanupTask(task: ScheduledTask): Promise<TaskExecutionResult> {
  if (typeof process === 'undefined' || typeof process.cwd !== 'function') {
    console.log('[TaskScheduler] Cleanup skipped - not in Node.js runtime');
    return {
      success: true,
      result: 'Cleanup skipped - file system operations require Node.js runtime',
    };
  }

  try {
    const { sqlDatabase } = await import('@/lib/database/sqlite');
    const results: string[] = [];

    try {
      sqlDatabase.vacuum();
      results.push('Database optimized (VACUUM)');
    } catch (e) {
      // Database vacuum is optional
    }

    const ninetyDaysAgo = Date.now() - 90 * 24 * 60 * 60 * 1000;
    const oldTasks = sqlDatabase
      .getScheduledTasks(false)
      .filter(t => t.lastRun && t.lastRun < ninetyDaysAgo && !t.permanent);

    let tasksCleaned = 0;
    for (const task of oldTasks) {
      if (task.runCount === 0) {
        sqlDatabase.deleteTask(task.id);
        tasksCleaned++;
      }
    }

    if (tasksCleaned > 0 && process.env.NODE_ENV === 'development') {
      results.push(`Removed ${tasksCleaned} old unused tasks`);
    }

    return {
      success: true,
      result: results.length > 0 ? results.join(', ') : 'No cleanup needed',
      data: { actions: results },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Cleanup failed',
    };
  }
}
