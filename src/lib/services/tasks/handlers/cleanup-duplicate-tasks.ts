import type { ScheduledTask, TaskExecutionResult } from '@/lib/services/task-scheduler';

export async function executeCleanupDuplicateTasksTask(
  task: ScheduledTask
): Promise<TaskExecutionResult> {
  try {
    const { sqlDatabase } = await import('@/lib/database/sqlite');

    const regularTasks = sqlDatabase.getTasks();
    const scheduledTasks = sqlDatabase.getScheduledTasks();

    const duplicates: Array<{ table: string; id: string; title: string; createdAt: number }> = [];

    const taskMap = new Map<string, number>();
    for (const t of regularTasks) {
      const key = t.title.toLowerCase().trim();
      if (taskMap.has(key)) {
        if (t.createdAt < taskMap.get(key)!) {
          duplicates.push({ table: 'tasks', id: t.id, title: t.title, createdAt: t.createdAt });
        }
      } else {
        taskMap.set(key, t.createdAt);
      }
    }

    const schedMap = new Map<string, { id: string; createdAt: number }>();
    for (const t of scheduledTasks) {
      const key = `${t.task_type}:${t.name}`.toLowerCase().trim();
      if (schedMap.has(key)) {
        const existing = schedMap.get(key)!;
        if (t.createdAt < existing.createdAt) {
          duplicates.push({
            table: 'scheduled_tasks',
            id: t.id,
            title: t.name,
            createdAt: t.createdAt,
          });
        }
      } else {
        schedMap.set(key, { id: t.id, createdAt: t.createdAt });
      }
    }

    let removedCount = 0;
    for (const dup of duplicates) {
      try {
        if (dup.table === 'tasks') {
          sqlDatabase.deleteTask(dup.id);
          removedCount++;
        } else {
          sqlDatabase.deleteScheduledTask(dup.id);
          removedCount++;
        }
      } catch (e) {
        // Skip if can't delete
      }
    }

    return {
      success: true,
      result: `Found and removed ${duplicates.length} duplicate tasks. ${removedCount} removed.`,
      data: { found: duplicates.length, removed: removedCount },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to cleanup duplicates',
    };
  }
}
