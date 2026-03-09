# Chapter 17: Building with AI - Don't Be Overwhelmed

**Important:** Before you worry about writing code, remember this book's philosophy from Chapter 1: **AI is your tool manager, not your replacement.** You direct, AI builds.

## The Truth About This Code

When you first see this project's codebase — hundreds of files, thousands of lines — it can feel overwhelming. **Don't worry.** Here's the secret:

**You don't need to write all this code yourself.**

The code in this repository is a **sample implementation** — a working reference you can learn from. But the real power is having AI build similar systems for you.

### You Are the Architect, Not the Builder

Think of building software like building a house:

| Your Role | AI's Role |
|-----------|-----------|
| Architect | Construction Worker |
| Decide what to build | Build what you ask |
| Set requirements | Implement features |
| Review and test | Generate code |
| Make decisions | Suggest alternatives |
| Approve changes | Document choices |

**You don't need to lay every brick yourself. You just need to know what you want.**

---

## What You'll Learn

- **Don't panic** — You don't need to understand every line
- **Prompt-driven development** — Describe what you want, AI builds it
- **The master prompt** — A complete prompt to build the system
- **Iterative building** — Start small, add features
- **When to dive deep** — Which parts deserve your attention
- **Learning by reviewing** — How to read AI-generated code

---

## The Master Prompt: Building the Foundation

Here's a prompt you can copy and paste into OpenCode, Claude, ChatGPT, or any AI assistant. This will build the **foundation** of your AI Dashboard from scratch.

### Copy This Prompt:

```
I want to build a Personal AI Dashboard - a privacy-first AI assistant 
that runs entirely on my local machine. Build me the foundation.

## What I Want

A Next.js application with:

1. **Project Structure**
   - src/app/ for pages and API routes (App Router)
   - src/lib/ for shared code and utilities
   - src/components/ for React components
   - data/ for SQLite database storage

2. **Database Foundation**
    - SQLite database (using @sqlite.org/sqlite-wasm for Node.js and sql.js for Edge Runtime compatibility)
   - Tables for: messages, documents, brands, projects, tasks, notes
   - A database service (src/lib/database/sqlite.ts)
   - Save/load from data/assistant.db

3. **Chat System**
   - API route at src/app/api/chat/route.ts
   - Streaming responses (SSE)
   - Support for local models via Ollama
   - Support for cloud models (OpenRouter, GLM API, DeepSeek)
   - Model router that picks the right model for each task

4. **Features to Scaffold**
   - Chat interface (src/app/page.tsx)
   - Document upload and management
   - Brand voice management
   - Task scheduling
   - Memory/notes storage

5. **Core Utilities**
   - Environment variable handling (.env.example)
   - Model configuration (src/lib/models/)
   - ID generation (using uuid)

## Technical Requirements

- TypeScript (strict mode)
- Next.js 15+ (App Router)
- React 18+
 - SQLite with @sqlite.org/sqlite-wasm (Node.js) and sql.js (Edge Runtime)
- Streaming responses
- No authentication (local use)

## Style

- Clean, modular code
- TypeScript types for everything
- Comments explaining key decisions
- Error handling throughout
- Logging for debugging

## Output

1. Create the folder structure
2. Write the core files (package.json, tsconfig.json, etc.)
3. Implement the database service
4. Create the chat API with streaming
5. Add the model router
6. Build a simple chat UI

Start with a working foundation. We'll add features incrementally.

After you create each file, explain briefly what it does and why.
```

---

## How to Use This Prompt

### Option 1: OpenCode (Terminal)
```bash
cd ~/projects
mkdir ai-dashboard
cd ai-dashboard
ollama run opencode

# Paste the prompt above
# Watch AI build the foundation
```

### Option 2: Claude / ChatGPT (Web)
1. Copy the prompt
2. Paste into Claude or ChatGPT
3. Ask for one section at a time if output is too long
4. Copy each file to your project

### Option 3: Cursor IDE
1. Open Cursor in your project folder
2. Press Cmd+K (Mac) or Ctrl+K (Windows)
3. Paste the prompt
4. Accept each file suggestion

---

## Iterative Building: Add One Feature at a Time

The master prompt builds the foundation. After that, add features incrementally:

### Adding Document Management

```
Add document management to the AI Dashboard:

1. Database table for documents (id, title, content, type, tags, metadata)
2. API route at src/app/api/documents/route.ts
   - GET: list documents
   - POST: upload new document
3. API route at src/app/api/documents/[id]/route.ts
   - GET: get document by ID
   - PUT: update document
   - DELETE: remove document
4. A simple document list page at src/app/documents/page.tsx
5. Upload functionality (support PDF, Word, plain text)

Include error handling and types.
```

### Adding Brand Voice System

```
Add a brand voice management system:

1. Database table for brands:
   - id, name, voice_instructions, sample_content, created_at
2. API routes for CRUD operations
3. A page to create and edit brand voices
4. Store brand voice prompts
5. Integrate with chat API (option to use brand voice)

The brand voice should modify how AI responds — tone, style, vocabulary.
```

### Adding Task Scheduling

```
Add a task scheduling system:

1. Database table for scheduled tasks:
   - id, type, schedule (cron), last_run, next_run, enabled, config
2. Task types:
   - intelligence_report: daily summary
   - security_scan: scan for vulnerabilities
   - self_reflection: AI analyzes its own responses
3. A task scheduler service (src/lib/services/task-scheduler.ts)
4. API routes to manage tasks
5. A page to view and manage tasks

Run tasks on schedule, log results to database.
```

---

## When to Pay Attention

You don't need to read every line of code. Focus on these key areas:

### Must Understand

| File/Folder | Why It Matters |
|-------------|----------------|
| `package.json` | What packages are used |
| `src/lib/database/sqlite.ts` | How data is stored |
| `src/app/api/chat/route.ts` | How AI responds |
| `src/lib/models/` | How models are configured |
| `.env.example` | What settings are available |

### Can Skim

| File/Folder | Why You Can Skim |
|-------------|------------------|
| UI Components | Visual only, logic is elsewhere |
| Type definitions | Auto-generated or boilerplate |
| Config files | Standard Next.js setup |
| Utility helpers | Self-explanatory names |

### Never Ignore

| Issue | Why |
|-------|-----|
| Security warnings | Could expose your data |
| Error handling | Prevents crashes |
| API keys | Never commit real keys |
| Database migrations | Data integrity |

---

## Learning by Reviewing AI Code

Even though AI generates most code, **you should review it**. Here's how:

### 1. Read the Function Names

```typescript
// Good: Clear names
async function sendMessageToModel(message: string): Promise<string>
async function saveDocumentToDatabase(doc: Document): Promise<void>
async function loadUserPreferences(userId: string): Promise<Preferences>

// Bad: Unclear names
async function process(input: any): Promise<any>
async function handle(data: any): Promise<void>
async function run(id: string): Promise<any>
```

**If names are unclear, ask AI to rename them:**
```
Refactor these functions to have clearer names:
- `process` → describe what it processes
- `handle` → what does it handle?
- `run` → run what?
```

### 2. Check Types

```typescript
// Good: Explicit types
interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant' | 'system';
  timestamp: number;
}

// Bad: No types
function sendMessage(message) { // What type is message?
  return fetch('/api/chat', { body: message })
}
```

**Ask AI to add types:**
```
Add TypeScript types and interfaces for all parameters and return values.
Explain the shape of the data at each step.
```

### 3. Look for Error Handling

```typescript
// Good: Handles errors
try {
  const response = await fetch('/api/chat', { body: message })
  if (!response.ok) {
    throw new Error(`API returned ${response.status}`)
  }
  return await response.json()
} catch (error) {
  console.error('Failed to send message:', error)
  throw error // Re-throw so caller can handle
}

// Bad: No error handling
const response = await fetch('/api/chat', { body: message })
return await response.json() // What if response is not ok?
```

**Ask AI to add error handling:**
```
Add comprehensive error handling to this function. 
Handle: network errors, invalid responses, timeouts.
Log errors appropriately. Re-throw with context.
```

### 4. Comments Matter

```typescript
// Bad: No comments
function processMessage(msg: Message): ProcessedMessage {
  const cleaned = msg.content.trim().toLowerCase()
  const tokens = cleaned.split(/\s+/)
  return { original: msg, cleaned, tokens }
}

// Good: Explains why
/**
 * Prepares a message for AI processing.
 * 
 * Why: AI models perform better with clean, normalized input.
 * - Trim whitespace (avoids empty tokens)
 * - Lowercase (case-insensitive matching)
 * - Split into tokens (for context limiting)
 */
function processMessage(msg: Message): ProcessedMessage {
  const cleaned = msg.content.trim().toLowerCase()
  const tokens = cleaned.split(/\s+/)
  return { original: msg, cleaned, tokens }
}
```

---

## The Sample Code Philosophy

This repository contains a complete, working implementation. Think of it as:

### What the Code Is

- ✅ A **working reference** — Everything runs
- ✅ A **learning tool** — See how features connect
- ✅ A **starting point** — Modify for your needs
- ✅ A **test bed** — Try experiments safely

### What the Code Is NOT

- ❌ The only way to build this
- ❌ Perfect code (no code is perfect)
- ❌ Something you must memorize
- ❌ Something you must write from scratch

### How to Use the Sample

1. **Clone it** — Get it running locally
2. **Explore it** — Click around, see features
3. **Break it** — Change things, see what happens
4. **Learn from it** — Read key files
5. **Build your own** — Use prompts to create your version

---

## Prompt Library: Building Blocks

Here are prompts for common building blocks. Use these as starting points:

### Database Table

```
Create a database table for [PURPOSE] with these fields:
- id: unique identifier (string)
- [field2]: [type] - [description]
- [field3]: [type] - [description]
- created_at: timestamp
- updated_at: timestamp

Add to src/lib/database/sqlite.ts
Include: create, read, update, delete functions
```

### API Route

```
Create a Next.js API route at src/app/api/[NAME]/route.ts

Endpoints:
- GET: [describe what it returns]
- POST: [describe what it accepts and does]

Include:
- Input validation
- Error handling
- TypeScript types
- Database integration
```

### React Component

```
Create a React component for [PURPOSE] at src/components/[NAME].tsx

Props:
- [prop1]: [type] - [description]
- [prop2]: [type] - [description]

Features:
- [feature 1]
- [feature 2]

Style with Tailwind CSS.
Include loading and error states.
```

### Service Class

```
Create a service class for [PURPOSE] at src/lib/services/[NAME].ts

Methods:
- [method1]: [description]
- [method2]: [description]

Include:
- Singleton pattern
- Error handling
- Logging
- TypeScript types
```

---

## Common Patterns Reused

Throughout this codebase, you'll see patterns repeated. Learn these:

### Pattern 1: Database Access

```typescript
// Every database operation follows this pattern
async function getItem(id: string): Promise<Item | null> {
  if (!db) throw new Error('Database not initialized')
  
  const result = db.exec('SELECT * FROM items WHERE id = ?', [id])
  
  if (result.length === 0 || result[0].values.length === 0) {
    return null
  }
  
  return mapRowToItem(result[0].columns, result[0].values[0])
}
```

### Pattern 2: API Route Handler

```typescript
// Every API route follows this pattern
export async function POST(request: Request) {
  try {
    const body = await request.json()
    
    // Validate input
    if (!body.field) {
      return NextResponse.json({ error: 'Missing field' }, { status: 400 })
    }
    
    // Do work
    const result = await doSomething(body)
    
    // Return success
    return NextResponse.json({ result })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
```

### Pattern 3: Streaming Response

```typescript
// Streaming AI responses
const encoder = new TextEncoder()
const stream = new ReadableStream({
  async start(controller) {
    for await (const chunk of aiResponse) {
      controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`))
    }
    controller.close()
  }
})

return new Response(stream, {
  headers: { 'Content-Type': 'text/event-stream' }
})
```

---

## Don't Be Overwhelmed: A Checklist

When you feel overwhelmed by the code:

- [ ] Remember: You're the architect, not the bricklayer
- [ ] Start with the master prompt — let AI build the foundation
- [ ] Add features one at a time with focused prompts
- [ ] Review only what matters: database, API routes, model config
- [ ] Use the sample code as reference, not requirement
- [ ] Break things — that's how you learn
- [ ] Ask AI to explain anything confusing

---

## Key Takeaways

✅ **Don't write from scratch** — Use prompts to generate code

✅ **You're the architect** — Direct, review, approve

✅ **Sample code = reference** — Not the only way

✅ **Key files matter most** — Database, API routes, model config

✅ **Iterative building wins** — One feature at a time

✅ **Learn by reviewing** — Read names, types, error handling

✅ **Break the code** — Experiment safely

---

**Next: Chapter 18 - Connecting to Messaging Systems (Telegram, Slack, Notion)**