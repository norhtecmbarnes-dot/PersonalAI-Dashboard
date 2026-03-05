# Task System Cleanup Plan

## Current State Analysis

### Three Overlapping Task Systems

**1. Scheduled Tasks (Heartbeat System)**
- Location: `src/lib/services/task-scheduler.ts`
- Storage: `scheduled_tasks` table
- Purpose: Automated recurring system tasks
- 12 built-in task types

**2. Calendar/To-Do Tasks**  
- Location: `src/lib/database/sqlite.ts` (tasks table)
- Storage: `tasks` table (separate from scheduled_tasks)
- Purpose: User to-do items with due dates

**3. Legacy LocalStorage Tasks**
- Location: `src/lib/database/sql-db.ts`
- Storage: localStorage
- Status: Likely deprecated

---

## Task Categorization

### Heartbeat Tasks (Recurring System Tasks)
These should stay in the heartbeat system and be documented in markdown:

1. **intelligence** - Daily intelligence reports
2. **security** - Security scans (every 12 hours)
3. **research** - External research (daily)
4. **reflection** - Self-reflection analysis (every 6 hours)
5. **sam_check** - SAM.gov opportunity checks (daily)
6. **memory_capture** - Auto-capture important facts (every 10 minutes)
7. **memory_archive** - Compact old memories (daily)
8. **rl_training** - Reinforcement learning (every 30 minutes)
9. **cleanup** - System cleanup (weekly)
10. **web_check** - Website monitoring (daily)

### Calendar Tasks (Single Occurrence)
These should be one-time events in the calendar:

1. **brand_task** - One-time brand-specific tasks (proposals, quotes)
2. **custom** - User-defined one-time tasks

---

## Cleanup Actions Required

### 1. Consolidate Duplicate Methods
**Files to review:**
- `src/lib/database/sqlite.ts` - `getTasks()`, `addTask()`, `updateTask()`
- `src/lib/services/task-scheduler.ts` - `getTasks()`, `createTask()`, `updateTask()`

**Action:** 
- [ ] Merge duplicate task methods into TaskScheduler
- [ ] Update all references to use unified interface
- [ ] Remove deprecated localStorage task methods

### 2. Create Task Documentation
**Create:** `docs/tasks/heartbeat-tasks.md`

```markdown
# Heartbeat Tasks

## Overview
Automated recurring tasks that run on schedule via the TaskScheduler.

## Task Types

### 1. Intelligence Report
**Schedule:** Daily
**Purpose:** Generate intelligence reports on space/commercial space news
**Function:** `executeIntelligenceTask()`

### 2. Security Scan
**Schedule:** Every 12 hours
**Purpose:** Scan system for security vulnerabilities
**Function:** `executeSecurityTask()`

### 3. External Research
**Schedule:** Daily
**Purpose:** Research AI agent developments and improvements
**Function:** `executeResearchTask()`

### 4. Self-Reflection
**Schedule:** Every 6 hours
**Purpose:** Analyze system performance and suggest improvements
**Function:** `executeReflectionTask()`

### 5. SAM.gov Check
**Schedule:** Daily
**Purpose:** Check for new contracting opportunities
**Function:** `executeSAMCheckTask()`

### 6. Memory Auto-Capture
**Schedule:** Every 10 minutes
**Purpose:** Analyze messages and capture important facts
**Function:** `executeMemoryCaptureTask()`

### 7. Memory Archive
**Schedule:** Daily
**Purpose:** Compact and archive old memories
**Function:** `executeMemoryArchiveTask()`

### 8. RL Training
**Schedule:** Every 30 minutes
**Purpose:** Run reinforcement learning on conversation history
**Function:** `executeRLTrainingTask()`

### 9. System Cleanup
**Schedule:** Weekly
**Purpose:** Clean logs, archive reports, optimize database
**Function:** `executeCleanupTask()`

### 10. Website Monitor
**Schedule:** Daily
**Purpose:** Monitor websites for changes
**Function:** `executeWebCheckTask()`
```

### 3. Update Calendar Integration
**Create:** `docs/tasks/calendar-tasks.md`

```markdown
# Calendar Tasks

## Overview
One-time tasks that appear on the calendar and tickler.

## Task Types

### 1. Brand Task
**Type:** Single occurrence
**Purpose:** AI task for specific brand/project
**Examples:**
- Generate proposal
- Create quote
- Competitive analysis
- Due diligence report

**Note:** These should be scheduled via the calendar, not heartbeat.

### 2. Custom Task
**Type:** Single occurrence
**Purpose:** User-defined task with custom prompt
**Examples:**
- "Remind me to call client tomorrow"
- "Review documents by Friday"
- Any user-created to-do item
```

### 4. Database Schema Review
**Current Issues:**
- Two separate tables: `scheduled_tasks` and `tasks`
- Similar columns but different purposes

**Recommendation:**
- Keep `scheduled_tasks` for heartbeat tasks
- Keep `tasks` for calendar/to-do items
- Add clear documentation distinguishing them

### 5. API Consolidation
**Current Endpoints:**
- `/api/heartbeat` - Triggers task execution
- `/api/tasks` - Full CRUD for scheduled tasks
- `/api/task-instruction` - Natural language task creation
- `/api/tickler` - Daily briefing (includes task counts)

**Issues:**
- `/api/task-instruction` overlaps with `/api/tasks` create
- Tickler shows scheduled task counts but uses different table

**Recommendations:**
- [ ] Deprecate `/api/task-instruction`, merge functionality into `/api/tasks`
- [ ] Update tickler to query correct task table
- [ ] Add heartbeat status endpoint separate from task management

---

## Implementation Steps

### Phase 1: Documentation (Immediate)
1. Create `docs/tasks/heartbeat-tasks.md` with all 10 task types
2. Create `docs/tasks/calendar-tasks.md` for single-occurrence tasks
3. Update README to explain the two task systems

### Phase 2: Code Cleanup
1. Remove duplicate `getTasks()` methods in sqlite.ts
2. Update all imports to use TaskScheduler methods
3. Remove deprecated localStorage task code
4. Consolidate `/api/task-instruction` into `/api/tasks`

### Phase 3: Calendar Integration
1. Update calendar to show one-time brand/custom tasks
2. Remove recurring heartbeat tasks from calendar view
3. Update tickler daily briefing to query correct tables

### Phase 4: Testing
1. Test all 10 heartbeat tasks execute correctly
2. Test calendar task creation and completion
3. Verify no duplicate task entries
4. Check task results are stored correctly

---

## Files to Modify

### Core Task System
- `src/lib/services/task-scheduler.ts` - Consolidate methods
- `src/lib/database/sqlite.ts` - Remove duplicate task methods
- `src/lib/database/sql-db.ts` - Remove deprecated localStorage code

### API Routes
- `src/app/api/tasks/route.ts` - Add natural language support
- `src/app/api/task-instruction/route.ts` - Deprecate/merge
- `src/app/api/heartbeat/route.ts` - Clean up
- `src/app/api/tickler/route.ts` - Fix table queries

### UI Components
- `src/app/tasks/page.tsx` - Update to use consolidated API
- `src/app/calendar/page.tsx` - Show only calendar tasks
- `src/components/TaskInstruction.tsx` - Update to use /api/tasks

### Documentation (New)
- `docs/tasks/heartbeat-tasks.md`
- `docs/tasks/calendar-tasks.md`
- `docs/tasks/README.md`

---

## Expected Outcomes

1. **Clear separation:** Heartbeat tasks vs Calendar tasks clearly distinguished
2. **No duplicates:** Single source of truth for each task type
3. **Better documentation:** Markdown docs explain each task type
4. **Cleaner code:** Removed ~500 lines of duplicate/deprecated code
5. **Improved UX:** Calendar shows only relevant one-time tasks

---

## Questions to Resolve

1. Should we keep the `permanent` flag on heartbeat tasks, or make all heartbeat tasks permanent?
2. Should brand tasks be moved entirely to calendar, or keep the option for recurring brand tasks?
3. Do we need task categories/tags beyond the taskType field?
4. Should task results be stored indefinitely or auto-expire after X days?

---

*Created: 2026-03-03*
*Status: Planning Phase*
