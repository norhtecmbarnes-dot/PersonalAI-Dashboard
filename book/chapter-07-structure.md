# Chapter 7: Understanding the Project Structure

When you first see all the folders and files, it can feel overwhelming. Let's break it down, piece by piece. By the end of this chapter, you'll know exactly what each file does.

## What You'll Learn

• The **folder structure** and what each folder means
• Key **configuration files** and their purpose
• The **src/app** directory (Next.js pages)
• The **src/lib** directory (reusable code)
• How files connect to each other
• Understanding imports and exports

---

## The Big Picture

Here's your AI Dashboard structure (as of March 2026):

```
ai-dashboard/
├── .env.local              # Secret settings (API keys)
├── .env.example            # Template for .env.local
├── .gitignore              # Files Git should ignore
├── next.config.js          # Next.js configuration
├── package.json            # Project dependencies
├── tsconfig.json           # TypeScript settings
├── README.md               # Project documentation
├── CHANGELOG.md            # Version history
│
├── src/
│   ├── app/                # Next.js App Router
│   │   ├── page.tsx        # Home page (/)
│   │   ├── layout.tsx      # Root layout
│   │   ├── globals.css     # Global styles
│   │   │
│   │   ├── api/            # Backend API routes
│   │   │   ├── chat/       # Chat API (/api/chat)
│   │   │   ├── models/     # Models API (/api/models)
│   │   │   ├── writing/    # Writing API (/api/writing)
│   │   │   ├── database/   # Database API (/api/database)
│   │   │   ├── documents/  # Documents API
│   │   │   ├── canvas/     # Canvas API
│   │   │   ├── security/   # Security scan API
│   │   │   └── ...         # 40+ API endpoints
│   │   │
│   │   ├── documents/      # Documents page
│   │   ├── brand-workspace/ # Brand workspace
│   │   ├── notes/          # Notes board
│   │   ├── calendar/       # Calendar
│   │   ├── tasks/          # Task scheduler
│   │   ├── canvas/         # Visual builder
│   │   ├── writing/        # Writing assistant
│   │   ├── memory/         # Memory management
│   │   ├── settings/       # Settings page
│   │   ├── intelligence/   # Intelligence reports
│   │   ├── security/       # Security dashboard
│   │   ├── office/         # OnlyOffice integration
│   │   ├── book-writer/    # Book writing
│   │   ├── research/       # Research agent
│   │   └── ...             # 20+ pages total
│   │
│   ├── lib/                # Core libraries
│   │   ├── database/       # SQLite operations
│   │   │   └── sqlite.ts   # Main database (3500+ lines)
│   │   ├── models/         # AI model integration
│   │   │   ├── sdk.server.ts # Model SDK (server)
│   │   │   ├── sdk.ts      # Model SDK (client)
│   │   │   └── model-router.ts # Smart model selection
│   │   ├── services/       # Business logic
│   │   │   ├── task-scheduler.ts # Scheduled tasks
│   │   │   ├── memory-file.ts # Persistent memory
│   │   │   └── ...         # 15+ services
│   │   ├── agent/          # AI agents
│   │   │   ├── book-writer.ts
│   │   │   ├── security-agent.ts
│   │   │   └── ...         # 10+ agents
│   │   ├── security/       # Security scanning
│   │   │   └── ai-security-scanner.ts
│   │   ├── utils/          # Utilities
│   │   │   └── validation.ts # Input sanitization
│   │   ├── storage/        # Data storage
│   │   │   ├── vector-lake.ts # Semantic search
│   │   │   └── documents.ts # Document storage
│   │   ├── memory/         # Memory system
│   │   ├── browser/        # Browser automation
│   │   ├── integrations/   # External services
│   │   ├── writing/        # Writing tools
│   │   ├── config/         # Configuration
│   │   ├── middleware/     # Express middleware
│   │   ├── hooks/          # React hooks
│   │   └── components/     # React components
│   │
│   └── instrumentation.ts  # Server startup
│
├── data/                   # Data storage
│   ├── assistant.db        # SQLite database
│   ├── MEMORY.md           # AI persistent memory
│   └── uploads/            # Uploaded files
│
├── book/                   # This book
│   ├── README.md           # Book overview
│   ├── chapter-01-introduction.md
│   ├── chapter-04-setup.md # Detailed setup
│   ├── chapter-06-database.md # Database guide
│   ├── chapter-21-security.md # Security guide
│   └── ...                 # 21 chapters
│
├── docs/                   # Technical docs
├── public/                 # Static files
└── CHANGELOG.md            # Version history
```

---

## Key Files Explained

### package.json
Like a shopping list for your project. Lists:
• Dependencies (libraries you use)
• Scripts (commands you can run)
• Project metadata

```json
{
  "name": "ai-dashboard",
  "version": "1.0.0",
  "dependencies": {
    "next": "^15.0.0",
    "react": "^19.0.0",
    "sqlite3": "^5.1.0"
  },
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start"
  }
}
```

### next.config.js
Settings for Next.js:
```javascript
const nextConfig = {
  experimental: {
    instrumentationHook: true,  // Enable instrumentation
  },
  // ... other settings
};
```

### .env.local
**Secret settings** — never commit this to Git!
```
OLLAMA_API_URL=http://localhost:11434
OPENROUTER_API_KEY=your_secret_key_here
```

### tsconfig.json
TypeScript compiler settings. Don't worry about this for now.

---

## The src/app Directory

This is where your **pages** live. In Next.js:

• **Files = Pages** — Every file becomes a route
• **Folders = Routes** — Folders create URL paths

### How It Works

| File Path | URL Path | What It Does |
|-----------|----------|--------------|
| `src/app/page.tsx` | `/` | Home page |
| `src/app/documents/page.tsx` | `/documents` | Documents page |
| `src/app/brand-workspace/page.tsx` | `/brand-workspace` | Brand workspace |
| `src/app/api/chat/route.ts` | `/api/chat` | Chat API endpoint |

### Example Page

```typescript
// src/app/page.tsx
export default function HomePage() {
  return (
    <div>
      <h1>Welcome to AI Dashboard</h1>
      <p>Your personal AI assistant</p>
    </div>
  );
}
```

### API Routes

Files in `src/app/api/` create backend endpoints:

```typescript
// src/app/api/chat/route.ts
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const body = await request.json();
  const { message } = body;
  
  // Call AI model...
  const response = await getAIResponse(message);
  
  return NextResponse.json({ response });
}
```

---

## The src/lib Directory

This is where **reusable code** lives.

### src/lib/database/
Database operations:
```typescript
// src/lib/database/sqlite.ts
export function getMessages() {
  // Query database
}

export function saveMessage(msg) {
  // Insert into database
}
```

### src/lib/services/
Business logic:
```typescript
// src/lib/services/task-scheduler.ts
export class TaskScheduler {
  async runTask(task) {
    // Run scheduled tasks
  }
}
```

### src/lib/agent/
AI agents:
```typescript
// src/lib/agent/book-writer.ts
export function writeChapter(chapterNum) {
  // Generate book content
}
```

---

## How Files Talk to Each Other

### Imports

Use `@/` to reference the `src` folder:

```typescript
// In src/app/page.tsx
import { sqlDatabase } from '@/lib/database/sqlite';
import { ChatComponent } from '@/components/chat/ChatComponent';
```

### Exports

```typescript
// In src/lib/utils.ts
export function formatDate(date) {
  return date.toLocaleDateString();
}

// Default export (only one per file)
export default function mainFunction() {
  // ...
}
```

### Using Exports

```typescript
// Named imports
import { formatDate } from '@/lib/utils';

// Default import
import mainFunction from '@/lib/utils';

// Both
import mainFunction, { formatDate } from '@/lib/utils';
```

---

## The One File, One Responsibility Principle

Good code organization means each file does **one thing**:

✅ **Good:**
```
src/
├── lib/
│   ├── database/
│   │   ├── sqlite.ts          # Database connection
│   │   └── queries.ts         # Query functions
│   ├── services/
│   │   ├── chat.ts            # Chat logic
│   │   └── documents.ts       # Document logic
```

❌ **Bad:**
```
src/
├── lib/
│   └── everything.ts          # All code in one file (messy!)
```

---

## PROMPT YOU CAN USE

Want to generate a project structure?

```
Create a Next.js app router structure for an AI dashboard with:
1. Home page (src/app/page.tsx)
2. Documents page (src/app/documents/page.tsx)
3. Chat API (src/app/api/chat/route.ts)
4. Database utilities (src/lib/database/index.ts)
5. Chat component (src/components/chat/Chat.tsx)

Show the folder structure and provide a brief description of each file's purpose.
```

---

## Key Takeaways

✅ **src/app/** — Pages and API routes

✅ **src/lib/** — Shared code and utilities

✅ **src/components/** — Reusable UI components

✅ **data/** — Database and persistent storage

✅ **package.json** — Dependencies and scripts

✅ **.env.local** — Secret settings (never commit!)

✅ **@/** — Shortcut to src folder

---

**Next: Chapter 8 - Prompt Templates**
