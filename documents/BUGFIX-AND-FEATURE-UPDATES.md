# Bug Fixes & UI Updates - February 2026

## Summary

This document covers multiple bug fixes and UI improvements made to the AI Research Assistant dashboard.

---

## Bug Fix: Expert Dropdown Blur Issue

### Problem
The expert dropdown selector text appeared blurred/unclear due to parent container having `backdrop-blur` CSS property which was applying to the dropdown content as well.

### Root Cause
The `backdrop-blur` class on the parent container (`bg-slate-800/50 backdrop-blur`) was blurring content that appeared on top of it, including the dropdown menu.

### Fix
**File:** `src/app/page.tsx` (lines 516-550)

1. Removed `z-50` from dropdown which didn't prevent blur
2. Added dynamic `zIndex` to the dropdown container:
```typescript
<div className="relative" style={{ zIndex: showExpertSelector ? 100 : 1 }}>
```
3. Removed `z-50` from the dropdown menu itself since parent controls z-index

---

## Bug Fix: Notes Contextualization API

### Problem
The Notes page contextualization AI feature was failing because the API route was using browser-side `fetch('/api/chat')` which doesn't work in server-side code.

### Root Cause
Server-side API route (`/api/notes/contextualize`) cannot call frontend routes via relative URLs. The fetch was being called on the server where `/api/chat` doesn't resolve correctly.

### Fix
**File:** `src/app/api/notes/contextualize/route.ts`

Changed from:
```typescript
const response = await fetch('/api/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({...}),
});
```

To:
```typescript
import { streamChatCompletion } from '@/lib/models/sdk.server';

const result = await streamChatCompletion({
  model: 'ollama/qwen2.5-coder',
  messages: [{ role: 'user', content: prompt }],
});
```

Now uses the server-side model SDK directly instead of making HTTP requests.

---

## Feature: Task Report Links

### Problem
Tasks page showed success/failure messages but provided no way to view the actual generated reports (Intelligence, Security, Self-Reflection, Research).

### Fix
**File:** `src/app/tasks/page.tsx`

Added helper function to generate report links based on task type:
```typescript
const getTaskResultLink = (task: ScheduledTask): { label: string; href: string } | null => {
  if (!task.lastResult || !task.lastRun) return null;
  
  switch (task.taskType) {
    case 'intelligence':
      return { label: 'View Intelligence Report', href: '/intelligence' };
    case 'security':
      return { label: 'View Security Report', href: '/security' };
    case 'reflection':
      return { label: 'View Self-Reflection', href: '/self-reflection' };
    case 'research':
      return { label: 'View Research', href: '/research' };
    default:
      return null;
  }
};
```

Added link display in task card template (line 191):
```typescript
{getTaskResultLink(task) && (
  <a 
    href={getTaskResultLink(task)!.href}
    className="inline-block mt-2 text-sm text-blue-400 hover:text-blue-300 underline"
  >
    {getTaskResultLink(task)!.label}
  </a>
)}
```

---

## Task Scheduler Architecture

### How Tasks Work

1. **Task Types**: intelligence, security, research, reflection, sam_check, brand_task, web_check, custom

2. **Storage**: Tasks stored in SQLite `scheduled_tasks` table

3. **Scheduling**: Supports:
   - `daily` - runs once per day
   - `weekly` - runs once per week
   - `every:N:hours|days|weeks` - runs every N units
   - `at:HH:MM` - runs at specific time
   - `manual` - only runs when triggered manually

4. **Heartbeat API**: `/api/heartbeat` initializes and starts the scheduler

5. **Task Execution**: Each task type has a handler in `task-scheduler.ts`:
   - `executeIntelligenceTask` - Generates daily intelligence report
   - `executeSecurityTask` - Runs security scan
   - `executeResearchTask` - Performs AI research
   - `executeReflectionTask` - Self-improvement analysis
   - `executeSAMCheckTask` - Checks SAM.gov for opportunities
   - `executeBrandTask` - Brand-specific tasks
   - `executeWebCheckTask` - Monitors websites for changes
   - `executeCustomTask` - Custom prompts

### Why Tasks May Fail

1. **Ollama not running** - All tasks require Ollama
2. **Database not initialized** - Scheduler requires SQLite
3. **Network issues** - External API calls may timeout
4. **Model not available** - qwen2.5-coder model may not be pulled

### Debugging Tasks

Check the API directly:
```bash
# List all tasks
curl http://localhost:3000/api/tasks?action=list

# Get scheduler status
curl http://localhost:3000/api/tasks?action=status

# Run a specific task
curl -X POST http://localhost:3000/api/tasks -d '{"action":"run","id":"task-id"}'
```

---

## File Changes Summary

| File | Change |
|------|--------|
| `src/app/page.tsx` | Fixed expert dropdown z-index/blur |
| `src/app/api/notes/contextualize/route.ts` | Use server-side model SDK |
| `src/app/tasks/page.tsx` | Added report link display |
| `src/components/CommandMenu.tsx` | Added `/notes` command |

---

## Related Files

- `src/lib/services/task-scheduler.ts` - Task scheduling logic
- `src/app/api/heartbeat/route.ts` - Scheduler initialization
- `src/app/api/task-instruction/route.ts` - Natural language task creation
- `src/lib/database/sqlite.ts` - Task storage methods

---

## Notes Page Status

The Notes page (`src/app/notes/page.tsx`) is functional with:
- Note creation/editing via `NoteEditor` component
- Category selection (general, meeting, research, etc.)
- Tag management
- AI contextualization (now fixed to use server SDK)
- Calendar export (.ics file)
- Search and filter

API Endpoints:
- `GET /api/database?action=notes` - List notes
- `POST /api/database` with `action: 'addNote'` - Create note
- `POST /api/database` with `action: 'updateNote'` - Update note
- `POST /api/database` with `action: 'deleteNote'` - Delete note
- `POST /api/notes/contextualize` - AI-powered note analysis