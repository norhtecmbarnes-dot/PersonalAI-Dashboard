# Project Changes Log

## 2026-02-27 - Major Restructuring

### Bug Fixes

#### TypeScript Type Errors
- **File**: `src/components/ChatMessage.tsx`
  - Added `'expert'` to role type union
  - Fixed rendering logic to show Markdown for expert role

- **File**: `src/components/ExpertChat.tsx`
  - Fixed passing string content instead of JSX element to ChatMessage

- **File**: `src/lib/config/user-preferences.ts`
  - Added index signature to `ApiKeys` interface for dynamic key access

#### Server-Side localStorage Errors
Added `typeof window === 'undefined'` guard checks to prevent localStorage access during SSR:
- `src/lib/integrations/sam-gov.ts`
- `src/lib/agent/book-writer.ts`
- `src/lib/agent/self-reflection.ts`
- `src/lib/agent/research-agent.ts`
- `src/lib/agent/security-agent.ts`
- `src/lib/intelligence/report-generator.ts`
- `src/lib/database/sql-db.ts`
- `src/lib/config/app-config.ts`
- `src/lib/storage/vector.ts`
- `src/lib/storage/notes.ts`
- `src/lib/storage/documents.ts`

---

### New Features

#### 1. Brand Workspace System (NotebookLM-style)
**Purpose**: Knowledge management with hierarchy: Brand → Projects → Documents → Chat

**New Files**:
- `src/types/brand-workspace.ts` - Type definitions
- `src/lib/services/brand-workspace.ts` - Core service for brands, projects, documents
- `src/lib/services/document-processor.ts` - Multi-format document processing (PDF, TXT, MD, URL, HTML)
- `src/app/api/brand-workspace/brands/route.ts` - Brand management API
- `src/app/api/brand-workspace/projects/route.ts` - Project management API
- `src/app/api/brand-workspace/chat/route.ts` - Context-aware chat API
- `src/app/brand-workspace/page.tsx` - UI dashboard

**Database Schema Added** (SQLite):
- `brands_v2` - Enhanced brand storage with voice profiles
- `brand_documents` - Document storage with compaction support
- `projects_v2` - Projects linked to brands
- `chat_sessions` - Chat history per project
- `generated_outputs` - Saved proposals/quotes

**Key Capabilities**:
- Document sources: File upload, URL import, text paste
- Markdown compaction for context windows
- AI chat using brand documents as context
- Generate proposals and quotes from brand knowledge
- Voice profiles: tone, style, key messages, avoid phrases

**Access**: `/brand-workspace`

---

#### 2. Self-Improvement → Tool Efficiency System
**Purpose**: Analyze how efficiently the AI uses its tools, not abstract self-reflection

**New Files**:
- `src/lib/services/metrics.ts` - Real-time usage metrics tracking
- `src/lib/services/code-health.ts` - Client-side health analysis
- `src/lib/services/self-improvement.ts` - Actionable insights generation
- `src/lib/services/tool-efficiency.ts` - Tool usage efficiency analysis
- `src/lib/services/tool-registry.ts` - Tool management and execution
- `src/types/tools.ts` - Tool type definitions
- `src/app/api/metrics/route.ts` - Metrics API endpoint
- `src/app/api/self-improvement/route.ts` - Unified efficiency API
- `src/app/self-improvement/page.tsx` - Tool efficiency dashboard

**Philosophy**: Humans aren't powerful without tools (airplanes, submarines, calculators). The same applies to AI - its power comes from knowing how to use tools efficiently.

**Built-in Tools**:
- `vector_search` - Semantic search through knowledge base
- `sql_query` - Query structured data
- `document_read` - Read stored documents
- `calculate` - Perform math accurately
- `web_search` - Find current information
- `web_fetch` - Extract content from URLs

**Metrics Tracked**:
- API calls, response times, errors
- Model usage, tokens, efficiency
- Feature usage patterns
- Tool call sequences and workflows
- Cache hit rates

**Access**: `/self-improvement`

---

### Removed/Dangerous Code

#### Deleted Dangerous Auto-Modification
**File**: `src/lib/agent/self-improvement.ts` (OLD VERSION)
- Removed code that auto-modified source files
- Removed automatic comment stripping
- Removed import deduplication that could break code

**Replaced With**: Safe analysis-only system that provides recommendations without modifying code.

---

### API Routes Added

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/brand-workspace/brands` | GET/POST | Brand CRUD and document upload |
| `/api/brand-workspace/projects` | GET/POST | Project management and outputs |
| `/api/brand-workspace/chat` | GET/POST | Context-aware chat sessions |
| `/api/metrics` | GET/POST | Usage metrics and events |
| `/api/self-improvement` | GET/POST | Tool efficiency and insights |

---

### Database Changes

Added tables to SQLite:
```sql
-- Brand Workspace
CREATE TABLE brands_v2 (...)
CREATE TABLE brand_documents (...)
CREATE TABLE projects_v2 (...)
CREATE TABLE chat_sessions (...)
CREATE TABLE generated_outputs (...)
```

Added methods to `SQLDatabase` class:
- `run(sql, params)` - Execute SQL
- `get(sql, params)` - Get single row
- `all(sql, params)` - Get all rows

---

### Configuration

No new environment variables required. All data stored in SQLite at `data/assistant.db`.

---

### Breaking Changes

- **Old Brand Chat** (`/brand-chat`) still exists but superseded by `/brand-workspace`
- **Old Self-Reflection** (`/self-reflection`) replaced by `/self-improvement`
- Old routes maintained for backward compatibility during transition

---

### Migration Notes

1. Run `npm run build` to create new database tables
2. Brand data from old `brands` table needs manual migration to `brands_v2` if needed
3. Old self-reflection reports in localStorage won't appear in new system

---

## Comparison: AI Dashboard vs OpenClaw

### Fundamental Difference

```
OpenClaw: "AI that can talk to you anywhere"
     ↓
AI Dashboard: "AI that knows your business and gets better at its job"
```

**OpenClaw** is infrastructure for messaging. It solves:
- "I want AI in my WhatsApp"
- "I want to control AI from Discord, Slack, Telegram"
- "I want 24/7 always-on assistant"

**AI Dashboard** is a productivity suite. It solves:
- "I want AI to know my brand/company documents"
- "I want AI to write proposals using our voice"
- "I want AI to track government contracts"
- "I want to see how efficiently my AI uses its tools"

### Feature Comparison

| Aspect | OpenClaw | AI Dashboard |
|--------|----------|--------------|
| **Target User** | Developers/power users who want AI everywhere | Professionals who want focused AI workspace |
| **Setup** | Complex - Gateway, channels, pairing, Docker | Simple - npm run dev |
| **Messaging** | ✅ 10+ platforms (WhatsApp, Telegram, Discord, Slack, iMessage) | ❌ Web only |
| **Tools** | Bash, browser, files | Vector search, SQL, documents, calculate, web search |
| **Memory** | MEMORY.md + semantic search | Brand documents + vector lake + SQLite |
| **Security** | Docker sandbox, device pairing, access control | Basic (needs work) |
| **Self-Improvement** | ❌ | ✅ Tool efficiency analysis |
| **Business Context** | ❌ Personal assistant | ✅ Brands, projects, proposals |
| **Code Modification** | ❌ | ⏳ Planned via Opencode |
| **Scheduling** | ✅ Cron jobs | ✅ Task Scheduler |
| **Complexity** | High - microservices architecture | Medium - single Next.js app |
| **Deploy** | Needs Docker, multiple processes | Single process, SQLite |

### What OpenClaw Does Better

1. **Omnichannel access** - Same AI in WhatsApp, Discord, Slack, iMessage
2. **Security** - Docker sandboxing, device pairing, access control
3. **Real-time voice** - Push-to-talk, wake word detection
4. **Agent-generated UI** - Canvas/A2UI for interactive responses
5. **Enterprise-ready** - Multi-agent, isolation, audit trails

### What AI Dashboard Does Better

1. **Business focus** - Brands, projects, proposals, SAM.gov integration
2. **Tool efficiency** - Learns to use tools better over time
3. **Knowledge management** - NotebookLM-style document context
4. **Simplicity** - One command to start, SQLite persistence
5. **Self-awareness** - Knows its own performance metrics
6. **Government contracting** - SAM.gov integration built-in

### Architecture Philosophy

**OpenClaw:**
- Hub-and-spoke with Gateway as control plane
- WebSocket-based messaging
- Each channel adapter normalizes to common format
- Agent runtime handles context, tools, persistence
- Docker sandboxing for security

**AI Dashboard:**
- Single Next.js application
- SQLite for all persistence
- Brand/Project/Document hierarchy
- Tool Registry with efficiency tracking
- No Docker required

### What to Adopt From OpenClaw

1. **Sandboxing** - Docker execution for untrusted inputs
2. **Canvas/A2UI** - Let AI generate interactive UI
3. **SOUL.md/MEMORY.md** - Structured memory files concept
4. **Device pairing** - For future multi-user support

### What to NOT Copy

1. **Their complexity** - They have 10+ channel adapters
2. **Their Gateway architecture** - Single app is simpler
3. **Their plugin system** - Ours is sufficient

### Enterprise Considerations (GovBotics)

For enterprise versions, add:
- Multi-tenancy (multiple companies)
- Role-based access control
- Audit logging
- SSO integration (SAML, OAuth)
- On-premise deployment options
- Data encryption at rest
- Compliance reporting (FedRAMP, SOC2)
- API rate limiting
- Custom model fine-tuning support

### GitHub Publishing Checklist

- [ ] README with screenshots
- [ ] MIT or Apache license
- [ ] CONTRIBUTING.md
- [ ] Demo video
- [ ] Docker compose for easy start
- [ ] Environment variable documentation
- [ ] API documentation