# AI Dashboard - Complete Feature Documentation

## Project Philosophy

**"AI that knows your business and gets better at its job."**

This project is a personal AI productivity suite focused on business use cases. Unlike generic chatbots:
- It knows your brand/company context
- It uses tools efficiently and improves over time
- It can generate proposals, quotes, and reports in your brand voice
- It tracks government contracting opportunities

---

## Core Features

### 1. Brand Workspace (NotebookLM-style)

**Location:** `/brand-workspace`

**What it does:**
- Organizes knowledge by Brand → Project → Documents
- Stores documents (PDF, TXT, MD, HTML, URLs)
- Chats with AI using your documents as context
- Generates proposals and quotes in your brand voice

**Key Concepts:**
- **Brand**: Company/client with voice profile, settings, documents
- **Project**: Specific bid, proposal, campaign linked to a brand
- **Documents**: Knowledge base for context

**API Endpoints:**
- `GET/POST /api/brand-workspace/brands` - Brand CRUD
- `GET/POST /api/brand-workspace/projects` - Project management
- `GET/POST /api/brand-workspace/chat` - Context-aware chat

**Database Tables:**
- `brands_v2` - Brand profiles with voice settings
- `brand_documents` - Document storage with compaction
- `projects_v2` - Projects linked to brands
- `chat_sessions` - Chat history per project
- `generated_outputs` - Saved proposals/quotes

---

### 2. Tool Efficiency System

**Location:** `/self-improvement`

**What it does:**
- Tracks how AI uses its tools (vector search, SQL, calculate, etc.)
- Analyzes efficiency patterns
- Suggests optimizations (combine queries, cache results)

**Philosophy:**
> "Humans aren't powerful without tools. We can't fly but build airplanes. AI isn't powerful without tools either. This system learns to use tools more efficiently."

**Built-in Tools:**
- `vector_search` - Semantic search through knowledge base
- `sql_query` - Query structured data
- `document_read` - Read stored documents
- `calculate` - Perform math accurately
- `web_search` - Find current information
- `web_fetch` - Extract content from URLs

**Metrics Tracked:**
- API calls, response times, errors
- Model usage, tokens, efficiency
- Feature usage patterns
- Tool call sequences
- Cache hit rates

**New Files:**
- `src/lib/services/metrics.ts` - Usage tracking
- `src/lib/services/tool-efficiency.ts` - Analysis
- `src/lib/services/tool-registry.ts` - Tool management
- `src/app/self-improvement/page.tsx` - Dashboard

---

### 3. Task Scheduler

**Location:** `/tasks`

**What it does:**
- Schedules recurring tasks (daily, hourly, weekly)
- Replaces hard-coded heartbeat intervals
- Configurable via UI
- Tracks execution history

**Task Types:**
- `intelligence` - Daily intelligence report
- `security` - Security scans
- `research` - AI agent research
- `reflection` - Self-improvement analysis
- `sam_check` - SAM.gov opportunity checks
- `brand_task` - Brand-specific tasks
- `custom` - User-defined with natural language

**Schedule Formats:**
- `daily` - Once per day
- `every:N:hours` - Every N hours
- `every:N:minutes` - Every N minutes
- `at:HH:MM` - At specific time
- `weekly` - Once per week
- `weekly:monday` - On specific day
- `manual` - Only run manually

**Database Table:**
- `scheduled_tasks` - Task definitions and history

**New Files:**
- `src/lib/services/task-scheduler.ts` - Scheduler service
- `src/app/api/tasks/route.ts` - Task management API
- `src/app/tasks/page.tsx` - Task management UI
- Updated `src/app/api/heartbeat/route.ts` - Uses scheduler

---

### 4. SAM.gov Integration

**Location:** `/sam`

**What it does:**
- Search government contracting opportunities
- Save search queries
- Track opportunities over time
- Alert on new matches

**Persistence:**
- Now uses SQLite (not localStorage)
- Data persists across page refreshes and server restarts

**Database Tables:**
- `sam_searches` - Saved search queries
- `sam_opportunities` - Search results
- `sam_api_keys` - API key management

---

### 5. Documents

**Location:** `/documents`

**What it does:**
- Upload and store documents
- Multi-format support (PDF, TXT, MD, HTML)
- Vector search integration

**Persistence:**
- Now uses SQLite (not localStorage)
- Documents persist properly

**Database Table:**
- `documents` - Document storage

---

## Data Architecture

### SQLite Database

**Location:** `data/assistant.db`

**Why SQLite:**
- No external server needed
- Perfect for personal/single-user applications
- Easy backup (single file)
- Fast for local queries
- sql.js runs in browser or Node

**Tables:**
```sql
-- Core
contacts, events, tasks, notes, activities, raw_data, folders, projects

-- Brand Workspace
brands_v2, brand_documents, projects_v2, chat_sessions, generated_outputs

-- SAM.gov
sam_searches, sam_opportunities, sam_api_keys

-- Documents
documents

-- Scheduled Tasks
scheduled_tasks
```

### Storage Layers

1. **SQLite** - Structured data, relationships, queries
2. **Vector Store** - Semantic search (in-memory with localStorage backup)
3. **localStorage** - User preferences, metrics

---

## API Reference

### Brand Workspace
```
GET  /api/brand-workspace/brands?id=...          - Get brand details
POST /api/brand-workspace/brands                  - Create/update brand
POST /api/brand-workspace/brands (addDocument)    - Add document
POST /api/brand-workspace/brands (addDocumentFromUrl) - Import from URL

GET  /api/brand-workspace/projects?brandId=...   - List projects
POST /api/brand-workspace/projects               - Create project

GET  /api/brand-workspace/chat?projectId=...     - Get chat sessions
POST /api/brand-workspace/chat (chat)            - Send message
POST /api/brand-workspace/chat (generateProposal) - Generate proposal
```

### Task Scheduler
```
GET  /api/tasks?action=list           - List tasks
GET  /api/tasks?action=templates      - Get task templates
GET  /api/tasks?action=status         - Scheduler status
GET  /api/tasks?action=due            - Tasks due now
POST /api/tasks (create)              - Create task
POST /api/tasks (update)              - Update task
POST /api/tasks (enable/disable)      - Toggle task
POST /api/tasks (run)                 - Run task now
POST /api/tasks (start/stop)          - Start/stop scheduler
```

### Metrics & Efficiency
```
GET  /api/metrics?action=metrics      - Get usage metrics
GET  /api/metrics?action=health       - System health
POST /api/metrics (record-event)      - Record usage event
POST /api/metrics (generate-report)   - Generate efficiency report

GET  /api/self-improvement?action=report   - Get efficiency report
POST /api/self-improvement (generate-report) - Generate new report
```

### SAM.gov
```
GET  /api/sam?action=opportunities    - Get opportunities
GET  /api/sam?action=queries          - Get saved searches
GET  /api/sam?action=keys             - API key status
POST /api/sam (addQuery)              - Add search query
POST /api/sam (runSearch)             - Execute search
```

---

## Configuration

### Environment Variables (`.env.local`)

```bash
# AI Models (optional - defaults to Ollama)
OPENROUTER_API_KEY=sk-or-...
DEEPSEEK_API_KEY=sk-...
OPENAI_API_KEY=sk-...

# Optional integrations
TELEGRAM_BOT_TOKEN=...
SAM_API_KEY=...

# No database config needed - uses SQLite
```

---

## Plugin Architecture

Personal plugins are separated from core features:

**Core Features** (enabled by default):
- Brand Workspace
- Tool Efficiency
- Documents
- Notes
- Calendar

**Personal Plugins** (optional):
- Book Writer - CC-licensed documentation
- SAM.gov - Government contracts
- Intelligence Reports
- Research Agent
- Security Scanner

**Configuration:** `src/config/plugins.ts`

---

## Security Notes

### Current State
- All data stored locally (SQLite)
- No external API keys required for core functionality
- Server-side API routes
- No authentication (single-user assumption)

### For Enterprise (GovBotics)
Add:
1. Docker sandboxing for tool execution
2. Role-based access control
3. Single sign-on (SAML, OAuth)
4. Audit logging
5. Encryption at rest
6. Input sanitization

---

## Comparison with OpenClaw

| Aspect | OpenClaw | AI Dashboard |
|--------|----------|--------------|
| Target | Developers wanting AI everywhere | Professionals wanting focused workspace |
| Setup Complexity | High (Gateway, channels, Docker) | Low (npm run dev) |
| Messaging | 10+ platforms | Web only |
| Business Context | None | Brands, projects, proposals |
| Tools | Bash, browser, files | SQL, vector search, documents |
| Self-Improvement | No | Tool efficiency tracking |
| Code Modification | No | Planned via Opencode |
| Government Integration | No | SAM.gov built-in |

**Takeaway:** Different use cases. OpenClaw for multi-channel messaging, AI Dashboard for business productivity.

---

## Future Roadmap

### Short Term
- [ ] Desktop wrapper (Tauri) for one-click startup
- [ ] Opencode integration for self-modification
- [ ] Tool sandboxing (Docker execution)
- [ ] Enhanced security

### Medium Term  
- [ ] Canvas/A2UI for agent-generated UI
- [ ] Voice interface
- [ ] Mobile app
- [ ] Multi-user support

### Long Term (Enterprise)
- [ ] Multi-tenancy
- [ ] SSO integration
- [ ] Compliance reporting
- [ ] On-premise deployment

---

## File Structure

```
src/
├── app/
│   ├── api/
│   │   ├── brand-workspace/    # Brand/project/document/chat APIs
│   │   ├── metrics/             # Usage tracking API
│   │   ├── self-improvement/    # Efficiency analysis API
│   │   ├── tasks/               # Task scheduler API
│   │   └── sam/                 # SAM.gov API
│   ├── brand-workspace/         # Brand workspace UI
│   ├── self-improvement/        # Tool efficiency UI
│   ├── tasks/                   # Task management UI
│   └── sam/                     # SAM.gov UI
├── lib/
│   ├── database/
│   │   └── sqlite.ts            # SQLite with all tables
│   ├── services/
│   │   ├── brand-workspace.ts   # Brand/project management
│   │   ├── document-processor.ts # Multi-format processing
│   │   ├── metrics.ts           # Usage tracking
│   │   ├── self-improvement.ts  # Analysis & insights
│   │   ├── task-scheduler.ts    # Scheduled task execution
│   │   ├── tool-efficiency.ts   # Tool usage analysis
│   │   └── tool-registry.ts     # Tool definitions
│   └── integrations/
│       └── sam-gov.ts           # SAM.gov service
├── config/
│   └── plugins.ts               # Plugin configuration
└── types/
    ├── brand-workspace.ts       # Brand types
    └── tools.ts                 # Tool types
```

---

## Getting Started

```bash
# Clone and install
git clone https://github.com/user/ai-dashboard.git
cd ai-dashboard
npm install

# Start development server
npm run dev

# Open http://localhost:3000
```

That's it. No database setup, no Docker, no external services.

---

## License

MIT License - Free for personal and commercial use.

For enterprise versions, contact GovBotics.