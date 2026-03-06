# Chapter 20: Memory Tasks & Automated System Maintenance

## The Vision: Self-Maintaining AI

Your AI assistant doesn't just respond to queries — it maintains itself. Memory tasks run automatically to capture knowledge, archive old memories, and keep the system running optimally.

## What You'll Learn

- **Memory Capture** - Extracting knowledge from conversations automatically
- **Memory Archive** - Compressing and storing long-term memories
- **Task Scheduler** - How scheduled tasks work with priority system
- **Session-Aware Task Pausing** - Background tasks pause during active use
- **Memory Persistence** - How memories survive across sessions
- **System Health** - Monitoring automated task execution

---

## Task Priority System (March 2026)

**Critical Update:** Tasks now have priorities that control when they run:

### Priority Levels

| Priority | When Runs | Use Case |
|----------|-----------|----------|
| `critical` | Always, even during active sessions | Essential system operations |
| `high` | Only when session is idle (5+ min of inactivity) | Security scans |
| `normal` | Only when session is idle | Intelligence reports, brand tasks |
| `low` | Only when session is idle | Research, reflection, memory tasks |

### How It Works

When you're actively chatting with the AI:
1. **Session starts** - `taskScheduler.startSession()` called
2. **Background tasks pause** - Low/normal priority tasks wait
3. **Chat completes** - `taskScheduler.endSession()` called
4. **Tasks resume** - After 5 minutes of inactivity, all tasks run normally

```typescript
// In chat API - src/app/api/chat/route.ts
export async function POST(request: Request) {
  // Mark session as active - pause low-priority background tasks
  taskScheduler.startSession();
  
  try {
    // ... process chat ...
    
    // End session - resume background tasks
    taskScheduler.endSession();
    
    return NextResponse.json({ message: finalContent });
  } catch (error) {
    // Always end session, even on error
    taskScheduler.endSession();
    throw error;
  }
}
```

### Priority Assignment

```typescript
const TASK_PRIORITIES: Record<ScheduledTask['taskType'], 'critical' | 'high' | 'normal' | 'low'> = {
  intelligence: 'normal',    // Can wait
  security: 'high',          // Important but not urgent
  research: 'low',           // Background, pause during use
  reflection: 'low',        // Background, pause during use
  brand_task: 'normal',     // User initiated
  web_check: 'low',         // Background monitor
  memory_capture: 'low',    // Background, not time-sensitive
  memory_archive: 'low',    // Background, not time-sensitive
  rl_training: 'low',       // Heavy computation, pause during use
  cleanup: 'low',           // Maintenance, pause during use
  custom: 'normal',
};
```

### Benefits

- **Faster Chat Responses** - No background tasks competing for CPU
- **Lower Memory Usage** - Heavy tasks don't run during interactions
- **Better Resource Management** - AI prioritizes user over maintenance
- **Smoother Experience** - No lag from research or training tasks

---

## The Memory System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     User Interaction                          │
│                          ▼                                    │
│                    Chat Messages                              │
│                          ▼                                    │
│         ┌─────────────────────────────────┐                 │
│         │   Memory Capture Task (10 min)   │                 │
│         │  - Analyzes recent messages      │                 │
│         │  - Extracts facts/decisions      │                 │
│         │  - Saves to persistent memory    │                 │
│         └─────────────────────────────────┘                 │
│                          ▼                                    │
│              ┌─────────────────┐                             │
│              │ Active Memory   │ ◄─── Scratchpad (Instant)  │
│              │  - Recent facts  │                             │
│              │  - Decisions     │                             │
│              │  - Preferences   │                             │
│              └─────────────────┘                             │
│                          ▼                                    │
│         ┌─────────────────────────────────┐                 │
│     │   Memory Archive Task (24 hrs)    │                 │
│         │  - Compresses old memories      │                 │
│         │  - Archives low-importance      │                 │
│         │  - Maintains searchability      │                 │
│         └─────────────────────────────────┘                 │
│                          ▼                                    │
│              ┌─────────────────┐                             │
│              │ Long-term Store │                             │
│              │  - Weekly sums  │                             │
│              │  - Compacted    │                             │
│              └─────────────────┘                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Memory Capture Task

### File: `src/lib/services/task-scheduler.ts`

The memory capture task runs every 10 minutes to extract important information from recent conversations:

```typescript
private async executeMemoryCaptureTask(task: ScheduledTask): Promise<TaskExecutionResult> {
  try {
    const { sqlDatabase } = await import('@/lib/database/sqlite');
    const { streamChatCompletion } = await import('@/lib/models/sdk.server');
    
    // Get recent chat messages from last 10 minutes
    const recentMessages = await sqlDatabase.all(`
      SELECT * FROM chat_messages 
      WHERE timestamp > ? 
      ORDER BY timestamp DESC 
      LIMIT 50
    `, [Date.now() - 10 * 60 * 1000]);
    
    if (recentMessages.length === 0) {
      return { success: true, result: 'No recent messages to capture' };
    }
    
    // Analyze with AI to extract important facts
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
      model: router.getModelId('memory_capture'),
      messages: [{ role: 'user', content: prompt }],
    });
    
    const response = result.message?.content || String(result.message);
    
    // Parse and save memories
    try {
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const memories = JSON.parse(jsonMatch[0]);
        for (const memory of memories.slice(0, 5)) {
          await sqlDatabase.addMemory({
            content: memory.content,
            category: memory.category || 'knowledge',
            importance: memory.importance || 5,
            source: 'memory_capture',
          });
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
```

### How It Works

1. **Fetches** last 10 minutes of chat messages
2. **Analyzes** with AI to extract:
   - User facts (name, preferences, interests)
   - Important decisions made
   - Key topics discussed
   - Action items mentioned
3. **Parses** AI response as JSON
4. **Saves** up to 5 memories to database
5. **Returns** success/failure status

### Example Extraction

**User says:** "I prefer Python for backend development and I'm working on a project using FastAPI."

**Memory Capture extracts:**
```json
[
  {
    "category": "user",
    "content": "User prefers Python for backend development",
    "importance": 7
  },
  {
    "category": "knowledge",
    "content": "User is working on a FastAPI project",
    "importance": 6
  }
]
```

---

## Memory Archive Task

### File: `src/lib/services/task-scheduler.ts`

The archive task runs daily to compress old memories:

```typescript
private async executeMemoryArchiveTask(task: ScheduledTask): Promise<TaskExecutionResult> {
  try {
    const { sqlDatabase } = await import('@/lib/database/sqlite');
    const { memoryArchiver } = await import('@/lib/memory/memory-archiver');
    
    // Archive memories older than 30 days with low importance
    const cutoffDate = Date.now() - (30 * 24 * 60 * 60 * 1000);
    
    const oldMemories = await sqlDatabase.all(`
      SELECT * FROM memory 
      WHERE created_at < ? AND importance <= 5
      ORDER BY created_at ASC
      LIMIT 100
    `, [cutoffDate]);
    
    if (oldMemories.length === 0) {
      return { success: true, result: 'No memories to archive' };
    }
    
    // Archive memories
    let archivedCount = 0;
    for (const memory of oldMemories) {
      try {
        await memoryArchiver.archiveMemory(memory.id);
        archivedCount++;
      } catch (e) {
        console.log('[MemoryArchive] Failed to archive:', memory.id, e);
      }
    }
    
    return {
      success: true,
      result: `Archived ${archivedCount} memories`,
      data: { archivedCount },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Memory archive failed',
    };
  }
}
```

### Archive Strategy

| Memory Type | Age Threshold | Importance | Action |
|------------|---------------|------------|--------|
| Active | < 30 days | Any | Keep in active store |
| Low Priority | > 30 days | ≤ 5 | Archive to long-term |
| High Priority | > 30 days | > 5 | Keep in active store |
| Archived | > 90 days | Any | Compact to weekly summary |

---

## Task Scheduler System

### File: `src/lib/services/task-scheduler.ts`

The task scheduler manages all automated tasks:

```typescript
const TASK_TEMPLATES: TaskTemplate[] = [
  {
    type: 'intelligence',
    name: 'Intelligence Report',
    description: 'Generate intelligence report',
    defaultSchedule: 'every:24:hours',
  },
  {
    type: 'memory_capture',
    name: 'Memory Auto-Capture',
    description: 'Analyze recent messages and capture important facts',
    defaultSchedule: 'every:10:minutes',
  },
  {
    type: 'memory_archive',
    name: 'Memory Archive',
    description: 'Compact and archive old memories',
    defaultSchedule: 'every:24:hours',
  },
  {
    type: 'rl_training',
    name: 'RL Training',
    description: 'Learn from conversation feedback',
    defaultSchedule: 'every:30:minutes',
  },
  {
    type: 'security',
    name: 'Security Scan',
    description: 'Scan system for vulnerabilities',
    defaultSchedule: 'every:12:hours',
  },
];
```

### Task Execution Flow

```typescript
async executeTask(task: ScheduledTask): Promise<TaskExecutionResult> {
  try {
    switch (task.taskType) {
      case 'intelligence':
        return await this.executeIntelligenceTask(task);
      case 'security':
        return await this.executeSecurityTask(task);
      case 'memory_capture':
        return await this.executeMemoryCaptureTask(task);
      case 'memory_archive':
        return await this.executeMemoryArchiveTask(task);
      case 'rl_training':
        return await this.executeRLTrainingTask(task);
      default:
        throw new Error(`Unknown task type: ${task.taskType}`);
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
}
```

---

## Integration with System Prompt

### File: `src/lib/config/system-prompt.ts`

The AI knows about its scheduled task capabilities:

```typescript
#### 2. create_scheduled_task
Create recurring automated tasks that run on a schedule.
**Parameters:**
- name (required): Task name
- description: What the task does
- prompt (required): The task to execute (natural language description)
- schedule (required): Cron schedule (e.g., "0 9 * * *" for daily at 9 AM)
- task_type: 'intelligence', 'research', 'memory', 'custom'

**When to use:**
- Periodic research updates (e.g., "Check for news about X daily")
- Automated monitoring (e.g., "Check stock prices every hour")
- Recurring reports (e.g., "Generate weekly summary")
- Data collection (e.g., "Fetch competitor prices weekly")

**Example call:**
\`\`\`json
{
  "name": "create_scheduled_task",
  "arguments": {
    "name": "Daily News Check",
    "prompt": "Search for the latest news about AI developments and summarize key points",
    "schedule": "0 9 * * *",
    "task_type": "intelligence"
  }
}
\`\`\`

**You CAN create scheduled tasks!** When users ask for recurring tasks, automated monitoring, periodic updates, or anything that should happen "every X", use this tool.
```

---

## Monitoring Task Health

### Heartbeat Endpoint

File: `src/app/api/heartbeat/route.ts`

```bash
GET /api/heartbeat
```

Response:
```json
{
  "timestamp": 1772694016681,
  "status": "healthy",
  "model": "ollama/qwen2.5-coder",
  "schedulerRunning": true,
  "tasks": {
    "memory_capture": {
      "lastRun": 1772694006245,
      "success": true,
      "runCount": 42,
      "lastError": null
    },
    "memory_archive": {
      "lastRun": 1772694011474,
      "success": true,
      "runCount": 7,
      "lastError": null
    },
    "intelligence": {
      "lastRun": 1772694006084,
      "success": true,
      "runCount": 3,
      "lastError": null
    }
  },
  "totalTasks": 204,
  "enabledTasks": 176
}
```

### Task Results Table

Every task execution is logged to `task_results`:

```sql
CREATE TABLE task_results (
  id TEXT PRIMARY KEY,
  task_id TEXT,
  result TEXT,
  data JSON,
  success INTEGER,
  created_at INTEGER,
  FOREIGN KEY (task_id) REFERENCES scheduled_tasks(id)
);
```

Query recent task results:
```typescript
const results = taskScheduler.getTaskResults(taskId, limit: 10);
const latest = taskScheduler.getLatestTaskResult(taskId);
```

---

## Memory Persistence Layers

### Layer 1: Scratchpad (Instant Access ~1ms)

Loaded every chat, contains:
- User profile (name, preferences)
- Active projects
- Recent decisions (last 5-10)
- Current focus

### Layer 2: Persistent Memory (Fast Search ~50ms)

Hybrid keyword + semantic search:
- Stored facts and knowledge
- Project details
- Brand voice profiles
- Security rules
- User decisions

### Layer 3: Archive (Long-term)

Weekly summaries and compacted knowledge:
- Compressed conversations
- Historical patterns
- Long-term trends

---

## Common Issues and Fixes

### Issue: "Unknown task type: memory_capture"

**Problem:** Task scheduler missing the case for memory tasks.

**Solution:** Add to switch statement:
```typescript
case 'memory_capture':
  return await this.executeMemoryCaptureTask(task);
case 'memory_archive':
  return await this.executeMemoryArchiveTask(task);
```

### Issue: Memory tasks not running

**Problem:** Task scheduler not initialized.

**Solution:** Check heartbeat endpoint:
```bash
curl http://localhost:3000/api/heartbeat
```

If `schedulerRunning: false`, call the init endpoint:
```bash
curl -X POST http://localhost:3000/api/system/start
```

### Issue: AI doesn't know about scheduled tasks

**Problem:** System prompt missing the `create_scheduled_task` tool.

**Solution:** Add to system prompt:
```typescript
You CAN create scheduled tasks! When users ask for recurring tasks,
automated monitoring, periodic updates, or anything that should happen
"every X", use this tool.
```

---

## Best Practices

1. **Set appropriate intervals:**
   - Memory capture: 10 minutes (captures ongoing context)
   - Memory archive: 24 hours (compresses old data)
   - Intelligence reports: 24 hours (news updates)

2. **Use fast models for frequent tasks:**
   ```typescript
   model: router.getModelId('memory_capture')  // Small, fast model
   ```

3. **Limit scope:**
   ```typescript
   LIMIT 50  // Don't process thousands of messages
   ```

4. **Handle errors gracefully:**
   ```typescript
   return {
     success: false,
     error: error.message
   };
   ```

5. **Log task results:**
   ```typescript
   sqlDatabase.addTaskResult(task.id, {
     result: 'Archived 25 memories',
     data: { archivedCount: 25 },
     success: true,
   });
   ```

---

## Summary

Memory tasks are the autonomous workers that keep your AI assistant intelligent:

- **Memory Capture**: Extracts knowledge every 10 minutes
- **Memory Archive**: Compresses old memories daily
- **Task Scheduler**: Manages all automated tasks
- **Health Monitoring**: Check via `/api/heartbeat`
- **Persistence**: Three layers for instant to long-term storage

These tasks run silently in the background, ensuring your AI remembers what matters and forgets what doesn't.