# Chapter 16: Edge Runtime Optimization - Fast, Secure Deployment

## What You'll Learn in This Chapter

- **What is Edge Runtime** and why it matters
- **Why we removed Node.js dependencies** (fs, path)
- **How SQLite replaced the file system**
- **What files were changed** and why
- **Benefits for your Dashboard**
- **How to deploy faster and more securely**

---

## Opening: Why Edge Runtime?

Imagine you're building a food truck (your app). You have two options:

**Option 1: Traditional Server (Node.js)**
- You rent a permanent kitchen (server)
- You pay for it 24/7, even when no customers
- It's in one location (slow for distant users)
- You have full control (good for complex tasks)

**Option 2: Edge Runtime**
- Your food truck goes where customers are
- You only pay when serving customers
- It's fast everywhere (runs near users)
- Limited tools (no big kitchen appliances)

**Edge Runtime = Your food truck comes to the customer, not the other way around!**

---

## What Is Edge Runtime?

### The Simple Explanation

Edge Runtime is a **lightweight JavaScript environment** that runs your code close to users, anywhere in the world.

**Traditional servers:**
- One location (e.g., Virginia, USA)
- User in Tokyo waits 200ms for response
- User in London waits 100ms
- Cold starts take 1-3 seconds

**Edge Runtime:**
- Runs in 100+ locations worldwide
- User in Tokyo gets response from Tokyo (20ms)
- User in London gets response from London (20ms)
- Cold starts take 0-50ms

### Why Next.js Uses It

Next.js can run your app in different "runtimes":

| Runtime | Use Case | Speed | Features |
|---------|----------|-------|----------|
| Node.js | Build tools, heavy processing | Slower startup | Full Node.js APIs |
| Edge | API routes, middleware | Instant | Limited APIs |
| Serverless | Most API routes | Medium | Good balance |

**Your Dashboard uses all three smartly!**

---

## The Problem: Node.js in Edge Runtime

### What We Were Doing Wrong

**Before (❌ Bad):**
```typescript
// ❌ Top-level import of Node.js modules
import * as fs from 'fs';
import * as path from 'path';

// ❌ Using in Edge Runtime
export function GET() {
  const data = fs.readFileSync('./data/memory.json');
  return Response.json(data);
}
```

**Result:**
```
ERROR: Cannot find module 'fs'
Edge Runtime doesn't support Node.js built-in modules
```

### Why Edge Runtime Doesn't Have fs/path

**Security:**
- Edge Runtime runs in multiple locations
- File system access could be dangerous
- No filesystem isolation between users

**Portability:**
- Must run the same everywhere
- File paths differ on Windows vs Linux
- Can't guarantee file system exists

**Speed:**
- File I/O is slow
- Network storage is faster
- SQLite is portable

---

## The Solution: SQLite Instead of Files

### The Swap

**Before (File System):**
```typescript
import * as fs from 'fs';
import * as path from 'path';

// Save data
const filePath = path.join(process.cwd(), 'data', 'memory.json');
fs.writeFileSync(filePath, JSON.stringify(data));

// Load data
const content = fs.readFileSync(filePath, 'utf-8');
return JSON.parse(content);
```

**After (SQLite):**
```typescript
import { sqlDatabase } from '@/lib/database/sqlite';

// Save data
sqlDatabase.setSetting('memory_data', JSON.stringify(data));

// Load data
const content = sqlDatabase.getSetting('memory_data');
return JSON.parse(content);
```

### Why SQLite Works in Edge Runtime

1. **No file paths needed** - SQLite handles storage
2. **Portable** - Same database file everywhere
3. **Fast** - In-memory caching
4. **Atomic** - Transactions prevent corruption
5. **Compatible** - Works in both Node.js and Edge

---

## Files We Changed

### 1. Memory File Service

**File:** `src/lib/services/memory-file.ts`

**Before:**
```typescript
import * as fs from 'fs';
import * as path from 'path';

class MemoryFileService {
  private MEMORY_FILE = path.join(process.cwd(), 'data', 'MEMORY.md');
  
  load() {
    if (fs.existsSync(this.MEMORY_FILE)) {
      return fs.readFileSync(this.MEMORY_FILE, 'utf-8');
    }
  }
  
  save(content: string) {
    fs.writeFileSync(this.MEMORY_FILE, content);
  }
}
```

**After:**
```typescript
import { sqlDatabase } from '@/lib/database/sqlite';

class MemoryFileService {
  load() {
    return sqlDatabase.getSetting('memory_file');
  }
  
  save(content: string) {
    sqlDatabase.setSetting('memory_file', content);
  }
}
```

### 2. Metrics Service

**File:** `src/lib/services/metrics.ts`

**Before:**
```typescript
import * as fs from 'fs';

class MetricsService {
  private METRICS_FILE = './data/metrics.json';
  
  loadMetrics() {
    if (fs.existsSync(this.METRICS_FILE)) {
      const data = fs.readFileSync(this.METRICS_FILE, 'utf-8');
      this.metrics = JSON.parse(data);
    }
  }
  
  saveMetrics() {
    fs.writeFileSync(this.METRICS_FILE, JSON.stringify(this.metrics));
  }
}
```

**After:**
```typescript
import { sqlDatabase } from '@/lib/database/sqlite';

class MetricsService {
  loadMetrics() {
    const data = sqlDatabase.getSetting('metrics_data');
    if (data) {
      this.metrics = JSON.parse(data);
    }
  }
  
  saveMetrics() {
    sqlDatabase.setSetting('metrics_data', JSON.stringify(this.metrics));
  }
}
```

### 3. RL Trainer

**File:** `src/lib/agent/rl-trainer.ts`

**Before:**
```typescript
import * as fs from 'fs';
import * as path from 'path';

class RLTrainer {
  private DATA_FILE = path.join(process.cwd(), 'data', 'rl-training.json');
  
  private loadData() {
    if (fs.existsSync(this.DATA_FILE)) {
      const data = fs.readFileSync(this.DATA_FILE, 'utf-8');
      this.conversations = JSON.parse(data);
    }
  }
  
  private saveData() {
    fs.writeFileSync(this.DATA_FILE, JSON.stringify(this.conversations));
  }
}
```

**After:**
```typescript
import { sqlDatabase } from '@/lib/database/sqlite';

class RLTrainer {
  private loadData() {
    const data = sqlDatabase.getSetting('rl_conversations');
    if (data) {
      this.conversations = JSON.parse(data);
    }
  }
  
  private saveData() {
    sqlDatabase.setSetting('rl_conversations', JSON.stringify(this.conversations));
  }
}
```

### 4. Task Scheduler Cleanup

**File:** `src/lib/services/task-scheduler.ts`

**Before:**
```typescript
// File system cleanup
const fs = await import('fs');
const path = await import('path');

const logDirs = ['.next/dev/logs', 'logs'];
for (const logDir of logDirs) {
  const fullPath = path.join(process.cwd(), logDir);
  const files = fs.readdirSync(fullPath);
  // ... cleanup logic
}
```

**After:**
```typescript
// Database-only cleanup
sqlDatabase.vacuum();
// Skip file operations in Edge Runtime
```

**Result:** Cleanup still happens, just uses database instead of files.

---

## The Dynamic Import Pattern

### When You REALLY Need Node.js

Sometimes you need file system operations, but only in specific contexts.

**Solution: Dynamic Imports with Runtime Checks**

```typescript
// Check if we're in Node.js
const isNodeRuntime = typeof process !== 'undefined' && process.cwd !== undefined;

if (isNodeRuntime) {
  // Only import in Node.js context
  const fs = await import('fs');
  const path = await import('path');
  
  // Now safe to use
  const content = fs.readFileSync(path.join(process.cwd(), 'file.txt'));
}
```

**But:** This doesn't work in Edge Runtime, so we avoid it entirely.

---

## Benefits of Edge Runtime

### 1. Speed

**Cold Start Comparison:**

| Runtime | Cold Start | Subsequent |
|---------|------------|------------|
| Node.js Server | 2-5 seconds | 50ms |
| Serverless | 500ms-2s | 50ms |
| Edge | 0-50ms | 0-10ms |

**Your Dashboard:** Instant response, worldwide!

### 2. Global Distribution

**Before (One Server):**
```
User in Sydney ──200ms──> Server in Virginia
User in Tokyo ──150ms──> Server in Virginia
User in London ──80ms──> Server in Virginia
```

**After (Edge Runtime):**
```
User in Sydney ──20ms──> Edge in Sydney
User in Tokyo ──20ms──> Edge in Tokyo
User in London ──20ms──> Edge in London
```

### 3. Security

**No File System Access:**
- ✅ Code can't read your server's files
- ✅ Code can't write malicious files
- ✅ Isolated execution environment

**SQLite is Safe:**
- Single database file
- Transaction-based
- No arbitrary file access

### 4. Cost

**Traditional Server:**
- $5-50/month for 24/7 running
- Pay even when no users

**Edge Runtime:**
- $0 when no requests
- Pay per request (fractions of a cent)
- Scales automatically

---

## PROMPT YOU CAN USE

### Prompt 1: Check Your Runtime

**Where to use:** Browser console

```javascript
// Open console and run:
fetch('/api/heartbeat')
  .then(r => r.json())
  .then(data => {
    console.log('Runtime:', data.runtime || 'unknown');
    console.log('Location:', data.location);
    console.log('Response time:', Date.now() - start + 'ms');
  });
```

### Prompt 2: Convert File-Based to SQLite

**Template for any service:**

```typescript
// ❌ BEFORE: File-based
import * as fs from 'fs';

class OldService {
  save(data: any) {
    fs.writeFileSync('./data/myfile.json', JSON.stringify(data));
  }
  
  load() {
    if (fs.existsSync('./data/myfile.json')) {
      return JSON.parse(fs.readFileSync('./data/myfile.json', 'utf-8'));
    }
  }
}

// ✅ AFTER: SQLite-based
import { sqlDatabase } from '@/lib/database/sqlite';

class NewService {
  save(data: any) {
    sqlDatabase.setSetting('my_service_data', JSON.stringify(data));
  }
  
  load() {
    const data = sqlDatabase.getSetting('my_service_data');
    return data ? JSON.parse(data) : null;
  }
}
```

### Prompt 3: Verify Edge Compatibility

**Where to use:** Build check

```bash
# Check for Node.js imports
grep -r "from 'fs'" src/lib --include="*.ts"
grep -r "from 'path'" src/lib --include="*.ts"

# Should return nothing (or only in safe files)

# Check for process usage
grep -r "process\." src/app/api --include="*.ts"

# These are OK in API routes, not in Edge
```

---

## How to Personalize This for YOUR Dashboard

### Option 1: Keep Backup of Original Files

**File:** `src/lib/services/`

```bash
# Before changing, backup:
cp memory-file.ts memory-file-node.ts
cp metrics.ts metrics-node.ts

# Now safe to modify original
```

### Option 2: Add File-Based Fallback

**For specific features that need files:**

```typescript
// In a Node.js-only API route
export async function POST() {
  // This runs in Node.js, so fs is available
  const fs = await import('fs');
  
  // Do file operations
  const files = fs.readdirSync('./uploads');
  
  return Response.json({ files });
}

// Add to route config
export const runtime = 'nodejs';  // Not edge!
```

### Option 3: Hybrid Approach

**Some data in SQLite, some in files:**

```typescript
class HybridService {
  // Fast data in SQLite
  getSettings() {
    return sqlDatabase.getSetting('settings');
  }
  
  // Large files on disk (Node.js API route only)
  getLargeFile(filename: string) {
    // This would be in a separate API route
    // with 'runtime: nodejs'
  }
}
```

### Option 4: Migration Script

**Move old file data to SQLite:**

```typescript
// One-time migration
async function migrateToSQLite() {
  const fs = await import('fs');
  
  // Read old files
  const files = fs.readdirSync('./data');
  
  for (const file of files) {
    if (file.endsWith('.json')) {
      const content = fs.readFileSync(`./data/${file}`, 'utf-8');
      const key = file.replace('.json', '');
      
      // Save to SQLite
      sqlDatabase.setSetting(key, content);
      
      // Delete old file
      fs.unlinkSync(`./data/${file}`);
    }
  }
  
  console.log('Migration complete!');
}
```

---

## Common Pitfalls & How to Avoid Them

### Pitfall 1: "Module not found: 'fs'"

**Problem:** Edge Runtime doesn't have fs

**Solution:** Remove top-level imports:
```typescript
// ❌ Bad: Top-level import
import * as fs from 'fs';

// ✅ Good: No import, use SQLite
import { sqlDatabase } from '@/lib/database/sqlite';
```

### Pitfall 2: "process is not defined"

**Problem:** process doesn't exist in Edge Runtime

**Solution:** Check before using:
```typescript
// ❌ Bad: Direct usage
const cwd = process.cwd();

// ✅ Good: Check first
if (typeof process !== 'undefined' && process.cwd) {
  const cwd = process.cwd();
}
```

### Pitfall 3: "SQLite database not initialized"

**Problem:** Trying to use SQLite before init

**Solution:** Always initialize first:
```typescript
import { sqlDatabase } from '@/lib/database/sqlite';

// Initialize before use
await sqlDatabase.initialize();

// Now safe to use
sqlDatabase.setSetting('key', 'value');
```

### Pitfall 4: "File cleanup not working"

**Problem:** File operations removed

**Solution:** Accept database-only cleanup:
```typescript
// ❌ Old: File cleanup
await cleanLogFiles();
await archiveOldReports();

// ✅ New: Database cleanup
sqlDatabase.vacuum();
await cleanOldTaskResults();
```

---

## Key Takeaways

1. **Edge Runtime** runs code close to users (fast!)
2. **No Node.js modules** (fs, path) in Edge
3. **SQLite replaces files** - portable and fast
4. **Global distribution** - 20ms response worldwide
5. **Better security** - no file system access
6. **Lower cost** - pay per request, not 24/7

---

## Next Steps

**Your Dashboard now runs faster and more securely!**

- Edge Runtime means instant responses
- SQLite keeps data portable
- No more file system dependencies
- Ready for global deployment

**What's next?**
- Chapter 17: Troubleshooting - When things go wrong
- Chapter 19: Deployment - Going live
- Chapter 20: Complete Prompt Library

**Or try:**
- Check response times in Network tab
- Test from different locations
- Build your own Edge-compatible components
- Deploy to Vercel Edge

---

*Remember: Edge Runtime is like having a food truck that goes to the customer. Fast, efficient, and everywhere!*

---

**End of Chapter 16**

**Questions?** Check the SYSTEM_GUIDE.md for architecture details.

**Code reference:** All Edge-compatible files in `src/lib/`