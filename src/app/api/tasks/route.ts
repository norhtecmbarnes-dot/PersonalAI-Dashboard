export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { taskScheduler, TASK_TEMPLATES } from '@/lib/services/task-scheduler';
import { sqlDatabase } from '@/lib/database/sqlite';

export async function GET(request: Request) {
  try {
    sqlDatabase.initialize();
    
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    switch (action) {
      case 'list': {
        const enabledOnly = searchParams.get('enabledOnly') === 'true';
        const tasks = taskScheduler.getTasks(enabledOnly);
        return NextResponse.json({ tasks, count: tasks.length });
      }

      case 'get': {
        const id = searchParams.get('id');
        if (!id) {
          return NextResponse.json({ error: 'Task ID required' }, { status: 400 });
        }
        const task = taskScheduler.getTask(id);
        if (!task) {
          return NextResponse.json({ error: 'Task not found' }, { status: 404 });
        }
        return NextResponse.json({ task });
      }

      case 'results': {
        const id = searchParams.get('id');
        if (!id) {
          return NextResponse.json({ error: 'Task ID required' }, { status: 400 });
        }
        const limit = parseInt(searchParams.get('limit') || '10');
        const results = taskScheduler.getTaskResults(id, limit);
        return NextResponse.json({ results, count: results.length });
      }

      case 'latest-result': {
        const id = searchParams.get('id');
        if (!id) {
          return NextResponse.json({ error: 'Task ID required' }, { status: 400 });
        }
        const result = taskScheduler.getLatestTaskResult(id);
        return NextResponse.json({ result });
      }

      case 'templates': {
        return NextResponse.json({ templates: TASK_TEMPLATES });
      }

      case 'status': {
        const status = taskScheduler.getStatus();
        return NextResponse.json({
          ...status,
          sessionTimeout: 5 * 60 * 1000, // 5 minutes in ms
          taskTimeouts: {
            intelligence: '10 minutes',
            security: '5 minutes',
            research: '15 minutes',
            reflection: '5 minutes',
            brand_task: '10 minutes',
            web_check: '2 minutes',
            memory_capture: '3 minutes',
            memory_archive: '5 minutes',
            rl_training: '30 minutes',
            cleanup: '10 minutes',
            custom: '10 minutes',
          },
        });
      }

      case 'due': {
        const dueTasks = sqlDatabase.getTasksDueNow();
        return NextResponse.json({ tasks: dueTasks, count: dueTasks.length });
      }

      default:
        return NextResponse.json({
          endpoints: {
            'GET ?action=list': 'List all tasks',
            'GET ?action=get&id=...': 'Get a specific task',
            'GET ?action=results&id=...': 'Get task execution history',
            'GET ?action=latest-result&id=...': 'Get latest task result',
            'GET ?action=templates': 'Get task templates',
            'GET ?action=status': 'Get scheduler status',
            'GET ?action=due': 'Get tasks due now',
            'POST with action': 'Create, update, run, or delete tasks',
          },
        });
    }
  } catch (error) {
    console.error('Task scheduler API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    sqlDatabase.initialize();
    const body = await request.json();
    const { action, ...data } = body;

    switch (action) {
      case 'create': {
        if (!data.name || !data.taskType || !data.schedule) {
          return NextResponse.json(
            { error: 'name, taskType, and schedule are required' },
            { status: 400 }
          );
        }

        const task = taskScheduler.createTask({
          name: data.name,
          description: data.description,
          prompt: data.prompt,
          taskType: data.taskType,
          schedule: data.schedule,
          brandId: data.brandId,
          projectId: data.projectId,
          config: data.config,
          enabled: data.enabled !== false,
          permanent: data.permanent ?? false,
          expiresAt: data.expiresAt,
        });

        return NextResponse.json({ success: true, task });
      }

      case 'update': {
        if (!data.id) {
          return NextResponse.json({ error: 'Task ID required' }, { status: 400 });
        }

        const task = taskScheduler.updateTask(data.id, {
          name: data.name,
          description: data.description,
          prompt: data.prompt,
          schedule: data.schedule,
          enabled: data.enabled,
          permanent: data.permanent,
          expiresAt: data.expiresAt,
          config: data.config,
        });

        if (!task) {
          return NextResponse.json({ error: 'Task not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true, task });
      }

      case 'delete': {
        if (!data.id) {
          return NextResponse.json({ error: 'Task ID required' }, { status: 400 });
        }

        const deleted = taskScheduler.deleteTask(data.id);
        if (!deleted) {
          return NextResponse.json({ 
            error: 'Cannot delete permanent task or task not found',
            hint: 'Set permanent=false to allow deletion'
          }, { status: 400 });
        }
        return NextResponse.json({ success: true });
      }

      case 'enable': {
        if (!data.id) {
          return NextResponse.json({ error: 'Task ID required' }, { status: 400 });
        }

        taskScheduler.enableTask(data.id);
        return NextResponse.json({ success: true });
      }

      case 'disable': {
        if (!data.id) {
          return NextResponse.json({ error: 'Task ID required' }, { status: 400 });
        }

        taskScheduler.disableTask(data.id);
        return NextResponse.json({ success: true });
      }

      case 'run': {
        if (!data.id) {
          return NextResponse.json({ error: 'Task ID required' }, { status: 400 });
        }

        const result = await taskScheduler.runTaskNow(data.id);
        return NextResponse.json({ success: result.success, result });
      }

      case 'start': {
        taskScheduler.start();
        return NextResponse.json({ success: true, message: 'Scheduler started' });
      }

      case 'stop': {
        taskScheduler.stop();
        return NextResponse.json({ success: true, message: 'Scheduler stopped' });
      }

      case 'cleanup': {
        const daysToKeep = data.daysToKeep || 30;
        taskScheduler.cleanupOldResults(daysToKeep);
        return NextResponse.json({ success: true, message: `Cleaned up results older than ${daysToKeep} days` });
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Task scheduler API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}