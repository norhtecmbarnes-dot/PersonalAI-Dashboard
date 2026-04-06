import type { ScheduledTask, TaskExecutionResult } from '@/lib/services/task-scheduler';

export async function executeCustomTask(task: ScheduledTask): Promise<TaskExecutionResult> {
  if (!task.prompt) {
    return { success: false, error: 'Custom task requires a prompt' };
  }

  try {
    const baseUrl =
      typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama3.2',
        message: task.prompt,
      }),
    });

    if (!response.ok) {
      throw new Error(`Chat API returned ${response.status}`);
    }

    const data = await response.json();
    const content = data.message?.content || data.message || data.response || '';

    return {
      success: true,
      result: content.substring(0, 500) + (content.length > 500 ? '...' : ''),
      data: { fullResponse: content },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to execute custom task',
    };
  }
}
