export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { streamChatCompletion } from '@/lib/models/sdk.server';
import { taskScheduler } from '@/lib/services/task-scheduler';
import { sqlDatabase } from '@/lib/database/sqlite';

interface ParsedTask {
  name: string;
  description: string;
  action: string;
  schedule: string;
  scheduleCron?: string;
  source?: string;
  keywords?: string[];
  url?: string;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, instruction, taskId } = body;

    await sqlDatabase.initialize();

    if (action === 'parse') {
      const parsed = await parseInstruction(instruction);
      return NextResponse.json({ success: true, task: parsed });
    }

    if (action === 'create') {
      const parsed = await parseInstruction(instruction);
      
      const task = taskScheduler.createTask({
        name: parsed.name,
        description: parsed.description,
        prompt: instruction,
        taskType: 'custom',
        schedule: parsed.schedule,
        config: {
          originalInstruction: instruction,
          action: parsed.action,
          source: parsed.source,
          keywords: parsed.keywords,
          url: parsed.url,
        },
        enabled: true,
      });

      return NextResponse.json({ 
        success: true, 
        task,
        message: `Task "${parsed.name}" created. It will run ${parsed.schedule}.`,
      });
    }

    if (action === 'list') {
      const tasks = taskScheduler.getTasks();
      return NextResponse.json({ success: true, tasks });
    }

    if (action === 'run') {
      const result = await taskScheduler.runTaskNow(taskId);
      return NextResponse.json({ success: true, result });
    }

    if (action === 'delete') {
      const deleted = taskScheduler.deleteTask(taskId);
      return NextResponse.json({ success: deleted });
    }

    if (action === 'toggle') {
      const task = sqlDatabase.getScheduledTaskById(taskId);
      if (!task) {
        return NextResponse.json({ error: 'Task not found' }, { status: 404 });
      }
      
      if (task.enabled) {
        taskScheduler.disableTask(taskId);
      } else {
        taskScheduler.enableTask(taskId);
      }
      
      return NextResponse.json({ success: true, enabled: !task.enabled });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('Task instruction error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    await sqlDatabase.initialize();

    if (action === 'list') {
      const tasks = taskScheduler.getTasks();
      return NextResponse.json({ success: true, tasks });
    }

    if (action === 'templates') {
      const templates = taskScheduler.getTaskTemplates();
      return NextResponse.json({ success: true, templates });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('Task instruction error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

async function parseInstruction(instruction: string): Promise<ParsedTask> {
  const prompt = `Parse this task instruction and extract structured data. Return only valid JSON.

Instruction: "${instruction}"

Extract:
1. A short name for the task (3-5 words)
2. A description of what the task does
3. The action type: "web_check", "sam_check", "intelligence", "research", "security", or "custom"
4. The schedule in a format like: "daily", "weekly", "every:3:days", "every:monday", or specific time like "at:09:00"
5. Source website or system (if mentioned)
6. Keywords or topics to look for (if mentioned)
7. URL if a specific website is mentioned

Schedule parsing rules:
- "every wednesday" -> "every:wednesday"
- "weekly" or "every week" -> "weekly"
- "daily" -> "daily"
- "every monday and friday" -> "every:monday"
- "every month" -> "every:30:days"
- "at 9am every day" -> "daily"
- Add time context if specified: "every:monday:09:00"

Return JSON format:
{
  "name": "short task name",
  "description": "what the task does",
  "action": "action type",
  "schedule": "schedule string",
  "source": "source website or system",
  "keywords": ["keyword1", "keyword2"],
  "url": "specific url if mentioned"
}

Return ONLY the JSON object, no explanation.`;

  try {
    const result = await streamChatCompletion({
      model: 'ollama/qwen2.5-coder',
      messages: [{ role: 'user', content: prompt }],
    });

    let content = result.message?.content || String(result.message) || '';
    
    // Extract JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        name: parsed.name || 'Custom Task',
        description: parsed.description || instruction,
        action: parsed.action || 'custom',
        schedule: parsed.schedule || 'weekly',
        source: parsed.source,
        keywords: parsed.keywords,
        url: parsed.url,
      };
    }
  } catch (error) {
    console.error('Error parsing instruction:', error);
  }

  // Fallback to simple parsing
  return {
    name: 'Custom Task',
    description: instruction.slice(0, 100),
    action: 'custom',
    schedule: 'weekly',
  };
}