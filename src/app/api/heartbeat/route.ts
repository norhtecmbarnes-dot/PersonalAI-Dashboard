export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { streamChatCompletion, checkOllamaHealth } from '@/lib/models/sdk.server';
import { taskScheduler } from '@/lib/services/task-scheduler';
import { sqlDatabase } from '@/lib/database/sqlite';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const runNow = searchParams.get('run') === 'true';
  
  const healthCheck = {
    timestamp: Date.now(),
    status: 'healthy',
    model: 'ollama/qwen2.5-coder',
  };

  try {
    const isHealthy = await checkOllamaHealth();
    
    if (!isHealthy) {
      return NextResponse.json({
        ...healthCheck,
        status: 'unhealthy',
        error: 'Ollama is not responding',
      }, { status: 503 });
    }

    // Only initialize once
    if (!sqlDatabase['initialized']) {
      await sqlDatabase.initialize();
    }
    
    // Only initialize scheduler once
    const status = taskScheduler.getStatus();
    if (!status.isRunning) {
      await taskScheduler.initialize();
      taskScheduler.start();
    }

    // If run=true, execute all due tasks immediately
    if (runNow) {
      try {
        await sqlDatabase.initialize();
        const dueTasks = sqlDatabase.getTasksDueNow();
        for (const task of dueTasks) {
          try {
            await taskScheduler.executeTask(task);
          } catch (err) {
            console.error(`[Heartbeat] Task ${task.name} failed:`, err);
          }
        }
      } catch (error) {
        console.error('[Heartbeat] Error running tasks:', error);
      }
    }

    // Get task statuses - only if already initialized
    let taskResults: Record<string, any> = {};
    try {
      const tasks = taskScheduler.getTasks();
      for (const task of tasks) {
        taskResults[task.taskType] = {
          lastRun: task.lastRun,
          success: task.successCount > 0 && task.failCount === 0,
          runCount: task.runCount,
          lastError: task.lastError,
        };
      }
    } catch (error) {
      console.error('[Heartbeat] Error getting task status:', error);
    }

    return NextResponse.json({
      ...healthCheck,
      schedulerRunning: status.isRunning,
      tasks: taskResults,
      totalTasks: Object.keys(taskResults).length,
    });
  } catch (error) {
    console.error('Health check failed:', error);
    return NextResponse.json({
      ...healthCheck,
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 503 });
  }
}