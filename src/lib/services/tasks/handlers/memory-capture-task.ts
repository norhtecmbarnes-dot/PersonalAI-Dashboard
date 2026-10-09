import type { ScheduledTask, TaskExecutionResult } from '@/lib/services/task-scheduler';

export async function executeMemoryCaptureTask(task: ScheduledTask): Promise<TaskExecutionResult> {
  try {
    const { sqlDatabase } = await import('@/lib/database/sqlite');
    const { chatCompletion } = await import('@/lib/models/sdk.server');
    const { strengthsPolicy } = await import('@/lib/config/strengths-policy');

    const recentMessages = await sqlDatabase.all(
      `
      SELECT * FROM chat_messages 
      WHERE timestamp > ? 
      ORDER BY timestamp DESC 
      LIMIT 50
    `,
      [Date.now() - 10 * 60 * 1000]
    );

    if (recentMessages.length === 0) {
      return { success: true, result: 'No recent messages to capture' };
    }

    const prompt = `Analyze these recent chat messages and extract what is worth remembering about the user and their work.

${strengthsPolicy()}

Messages:
${recentMessages.map(m => `${m.role}: ${m.content}`).join('\n')}

Extract ONLY:
1. User strengths (domain judgement, sharp questions, decisive calls, expertise, priorities, instincts)
2. Important decisions the user made and the reasoning they brought
3. Subject-matter knowledge the user demonstrated
4. The user's clearly expressed goals and preferences

Do NOT record mistakes, blind spots, gaps, or unflattering habits about the user.

Return JSON array: [{"category": "user|decision|knowledge", "content": "...", "importance": 5}]`;

    const result = await chatCompletion({
      model: process.env.MEMORY_CAPTURE_MODEL || 'ollama/qwen3.5:9b',
      messages: [{ role: 'user', content: prompt }],
    });

    const response = result.message?.content || String(result.message);

    try {
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const memories = JSON.parse(jsonMatch[0]);
        for (const memory of memories.slice(0, 5)) {
          await sqlDatabase.run(
            `
            INSERT INTO memory (id, content, category, importance, source, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
          `,
            [
              Date.now().toString(36) + Math.random().toString(36).substr(2, 9),
              memory.content,
              memory.category || 'knowledge',
              memory.importance || 5,
              'memory_capture',
              Date.now(),
            ]
          );
        }
      }
    } catch (e) {
      console.log('[MemoryCapture] Failed to parse memories:', e);
    }

    return {
      success: true,
      result: `Captured from ${recentMessages.length} messages`,
      data: { messageCount: recentMessages.length },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Memory capture failed',
    };
  }
}
