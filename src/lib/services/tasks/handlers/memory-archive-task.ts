import type { ScheduledTask, TaskExecutionResult } from '@/lib/services/task-scheduler';

export async function executeMemoryArchiveTask(task: ScheduledTask): Promise<TaskExecutionResult> {
  try {
    const { sqlDatabase } = await import('@/lib/database/sqlite');

    const cutoffDate = Date.now() - 30 * 24 * 60 * 60 * 1000;

    const oldMemories = await sqlDatabase.all(
      `
      SELECT * FROM memory 
      WHERE created_at < ? AND importance <= 5
      ORDER BY created_at ASC
      LIMIT 100
    `,
      [cutoffDate]
    );

    if (oldMemories.length === 0) {
      return { success: true, result: 'No memories to archive' };
    }

    let archivedCount = 0;
    for (const memory of oldMemories) {
      try {
        await sqlDatabase.run(
          `
          UPDATE memory 
          SET category = 'archived', 
              importance = 1,
              updated_at = ?
          WHERE id = ?
        `,
          [Date.now(), memory.id]
        );
        archivedCount++;
      } catch (e) {
        console.log('[MemoryArchive] Failed to archive:', memory.id, e);
      }
    }

    return {
      success: true,
      result: `Archived ${archivedCount} memories`,
      data: { archivedCount },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Memory archive failed',
    };
  }
}
