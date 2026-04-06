import type { ScheduledTask, TaskExecutionResult } from '@/lib/services/task-scheduler';

export async function executeBrandTask(task: ScheduledTask): Promise<TaskExecutionResult> {
  if (!task.brandId) {
    return { success: false, error: 'Brand task requires brandId' };
  }

  const { brandWorkspace } = await import('@/lib/services/brand-workspace');
  const brand = await brandWorkspace.getBrandById(task.brandId);

  if (!brand) {
    return { success: false, error: 'Brand not found' };
  }

  const projects = await brandWorkspace.getProjects(task.brandId);
  const project = projects[0];

  if (!project) {
    return { success: false, error: 'No project found for brand' };
  }

  const session = await brandWorkspace.createChatSession(project.id, task.brandId, task.name);
  const context = await brandWorkspace.buildContextForChat(task.brandId, project.id);

  return {
    success: true,
    result: `Brand task initialized for ${brand.name}`,
    data: { sessionId: session.id, brandId: task.brandId },
  };
}
