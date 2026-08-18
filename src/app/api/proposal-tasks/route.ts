export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { proposalTasks } from '@/lib/services/proposal-tasks';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId') || '';
    if (!projectId) {
      return NextResponse.json({ success: false, error: 'projectId is required' }, { status: 400 });
    }
    const tasks = proposalTasks.getTasks(projectId);
    return NextResponse.json({ success: true, tasks });
  } catch (error) {
    console.error('[ProposalTasks API] GET error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, projectId, brandId, model, task, id, updates, markdown } = body || {};

    switch (action) {
      case 'generate': {
        if (!projectId || !brandId) {
          return NextResponse.json(
            { success: false, error: 'projectId and brandId are required' },
            { status: 400 }
          );
        }
        const tasks = await proposalTasks.generateTasks(brandId, projectId, markdown, model);
        return NextResponse.json({ success: true, tasks });
      }

      case 'add': {
        if (!projectId || !task?.title) {
          return NextResponse.json(
            { success: false, error: 'projectId and task.title are required' },
            { status: 400 }
          );
        }
        const created = proposalTasks.addTask({
          projectId,
          section: task.section || 'General',
          title: task.title,
          assignee: task.assignee || undefined,
          status: task.status || 'pending',
          orderIndex: proposalTasks.getTasks(projectId).length,
        });
        return NextResponse.json({ success: true, task: created });
      }

      case 'update': {
        if (!id || !updates) {
          return NextResponse.json({ success: false, error: 'id and updates are required' }, { status: 400 });
        }
        const updated = proposalTasks.updateTask(id, updates);
        if (!updated) {
          return NextResponse.json({ success: false, error: 'Task not found' }, { status: 404 });
        }
        return NextResponse.json({ success: true, task: updated });
      }

      case 'delete': {
        if (!id) {
          return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 });
        }
        proposalTasks.deleteTask(id);
        return NextResponse.json({ success: true });
      }

      default:
        return NextResponse.json(
          { success: false, error: 'Unknown action. Use: generate, add, update, delete' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('[ProposalTasks API] POST error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
