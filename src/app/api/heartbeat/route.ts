export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { streamChatCompletion, checkOllamaHealth } from '@/lib/models/sdk.server';
import { taskScheduler } from '@/lib/services/task-scheduler';
import sqlDatabase from '@/lib/database/sqlite-edge';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const runNow = searchParams.get('run') === 'true';
  
  const healthCheck = {
    timestamp: Date.now(),
    status: 'healthy',
    model: 'ollama/qwen3.5:9b',
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

    let dbInitialized = false;
    // Try to initialize database - disabled due to SQLite compatibility issues
    // try {
    //   await sqlDatabase.initialize();
    //   dbInitialized = true;
    // } catch (error) {
    //   console.error('[Heartbeat] Database initialization failed:', error);
    //   dbInitialized = false;
    // }
    
    // Only initialize scheduler once
    let schedulerRunning = false;
    let schedulerInitialized = false;
    try {
      const schedulerStatus = taskScheduler.getStatus();
      if (!schedulerStatus.isRunning) {
        await taskScheduler.initialize();
        taskScheduler.start();
        schedulerRunning = true;
        schedulerInitialized = true;
      } else {
        schedulerRunning = true;
        schedulerInitialized = true;
      }
    } catch (error) {
      console.error('[Heartbeat] Task scheduler initialization failed:', error);
      schedulerRunning = false;
      schedulerInitialized = false;
    }
    const status = taskScheduler.getStatus();

    // If run=true, execute all due tasks immediately (only if db initialized)
    // Note: sqlite-edge doesn't have getTasksDueNow method, skip task execution for now
    if (runNow && dbInitialized) {
      console.log('[Heartbeat] runNow requested but task execution not implemented for edge database');
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
      schedulerRunning: schedulerRunning,
      schedulerInitialized: schedulerInitialized,
      sessionActive: status.sessionActive,
      runningTasks: status.runningTasks,
      maxConcurrentTasks: status.maxConcurrentTasks,
      resources: status.resources,
      databaseInitialized: dbInitialized,
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