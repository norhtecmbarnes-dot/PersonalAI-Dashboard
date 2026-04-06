import type { ScheduledTask, TaskExecutionResult } from '@/lib/services/task-scheduler';

export async function executeMemoryCaptureTask(task: ScheduledTask): Promise<TaskExecutionResult> {
  try {
    const { sqlDatabase } = await import('@/lib/database/sqlite');
    const { streamChatCompletion } = await import('@/lib/models/sdk.server');

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

    const prompt = `Analyze these recent chat messages and extract important facts, decisions, and preferences to save to memory.

Messages:
${recentMessages.map(m => `${m.role}: ${m.content}`).join('\n')}

Extract:
1. User facts (name, preferences, interests)
2. Important decisions made
3. Key topics discussed
4. Action items or tasks mentioned

Return JSON array: [{"category": "user|decision|knowledge", "content": "...", "importance": 5}]`;

    const result = await streamChatCompletion({
      model: 'llama3.2',
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
