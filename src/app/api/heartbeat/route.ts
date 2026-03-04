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

    // Initialize task scheduler and ensure default tasks exist
    await sqlDatabase.initialize();
    await taskScheduler.initialize();
    
    // Start the scheduler if not running
    const status = taskScheduler.getStatus();
    if (!status.isRunning) {
      taskScheduler.start();
    }

    // If run=true, execute all due tasks immediately
    if (runNow) {
      const dueTasks = sqlDatabase.getTasksDueNow();
      for (const task of dueTasks) {
        try {
          await taskScheduler.executeTask(task);
        } catch (err) {
          console.error(`[Heartbeat] Task ${task.name} failed:`, err);
        }
      }
    }

    // Get task statuses
    const tasks = taskScheduler.getTasks();
    const taskResults: Record<string, any> = {};
    
    for (const task of tasks) {
      taskResults[task.taskType] = {
        lastRun: task.lastRun,
        success: task.successCount > 0 && task.failCount === 0,
        runCount: task.runCount,
        lastError: task.lastError,
      };
    }

    return NextResponse.json({
      ...healthCheck,
      schedulerRunning: status.isRunning,
      tasks: taskResults,
      totalTasks: tasks.length,
      enabledTasks: tasks.filter(t => t.enabled).length,
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