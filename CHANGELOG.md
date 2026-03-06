# Change Log - AI Dashboard

## Version 2.3.1 (March 6, 2026)

---

### Model Selection and Writing Improvements

**Writing Model Fallback Chain:**
- Primary: `kimi-k2.5` (Claude-distilled, best for English writing)
- Fallback 1: `glm-5` (GPT-like, 756B parameters)
- Fallback 2: `gpt-oss:20b` (requires GPU VRAM)
- Fallback 3: `gemma3:4b` (runs on CPU, no GPU needed)

**Model Requirements Documented:**

| Model | Size | Hardware | Speed |
|-------|------|----------|-------|
| `qwen3.5:2b` | 2B | CPU (4GB RAM) | Very fast |
| `gemma3:4b` | 4B | CPU (8GB RAM) | Fast |
| `qwen3.5:9b` | 9B | CPU (16GB RAM) | Moderate |
| `qwen3.5:27b` | 27B | GPU (24GB VRAM) | Slow on CPU |
| `gpt-oss:20b` | 20B | GPU (16GB VRAM) | Moderate |

**Ollama Cloud Models Added:**
- `kimi-k2.5` - 1.1T parameters, Claude-distilled
- `glm-5` - 756B parameters, GPT-like
- `deepseek-v3.2`, `cogito-2.1`, `mistral-large-3`, etc.
- `gemma3:4b`, `gemma3:12b`, `gemma3:27b` available

**Fixes:**
- Writing assistant now defaults to `kimi-k2.5` for best English
- Fallback chain ensures writing works without GPU
- Removed unavailable models (ministral, gemini-3-flash)
- Task scheduler staggers new tasks to prevent all running at once
- Writing assistant outputs render correctly in result window

**Files Modified:**
- `src/lib/models/model-router.ts` - Added getWritingModel() with proper fallbacks
- `src/app/api/writing/route.ts` - Default to kimi-k2.5
- `src/app/writing/page.tsx` - Updated default model
- `src/lib/database/sqlite.ts` - Stagger new tasks on first run
- `book/chapter-13-model-router.md` - Documented GPU vs CPU requirements

---

## Version 2.3.0 (March 5, 2026)

---

### Task Priority System - Session-Aware Background Tasks

Background tasks now pause automatically during active chat sessions:

**Priority Levels:**
- `critical` - Always runs (system-critical operations)
- `high` - Runs when idle (security scans)
- `normal` - Runs when idle (intelligence, brand tasks)
- `low` - Runs when idle (research, reflection, memory, RL training, cleanup)

**How It Works:**
- `taskScheduler.startSession()` called when user sends message
- Low/normal/high tasks pause during active session
- `taskScheduler.endSession()` called after response completes
- 5-minute auto-timeout for inactive sessions

**Benefits:**
- Faster chat responses (no background task contention)
- Lower memory usage during interactions
- Better resource prioritization

**Files Modified:**
- `src/lib/services/task-scheduler.ts` - Added priority system and session tracking
- `src/app/api/chat/route.ts` - Added session start/end calls

---

### Web Search Improvements

**Ollama Web Search Prioritized:**
- Now checks Ollama API first (requires `OLLAMA_API_KEY`)
- Falls back to Tavily → DuckDuckGo → Brave → SearXNG

**Search Toggle Control:**
- Web search via function calling only works when toggle is ON
- When OFF, AI cannot auto-search the web

**Fixes:**
- Fixed duplicate `fetchTimeout` declaration error in `web-search-tool.ts`
- Fixed TypeScript error for missing `description` field

**Files Modified:**
- `src/lib/websearch.ts` - Added Ollama priority, search mode parameter
- `src/lib/browser/web-search-tool.ts` - Fixed duplicate declaration
- `src/app/api/chat/route.ts` - Search mode controls tool availability

---

### Model Selection Improvements

**Cloud Models in Dropdown:**
- External models (Gemini, OpenAI, Claude, Groq, etc.) now appear in model selector
- Only models with configured API keys are shown

**Fixes:**
- Fixed double provider prefix bug (`gemini/gemini/...`)
- Filtered models to show only those with valid API keys

**Files Modified:**
- `src/app/api/models/route.ts` - Filter external models by API key availability
- `src/lib/hooks/useModels.ts` - Fixed ID prefix handling
- `src/app/page.tsx` - Load external models into dropdown

---

### SAM.gov Removal

- Removed `sam_check` from task scheduler (integration previously disabled)
- Removed from task types, priorities, and templates
- Removed `executeSAMCheckTask` method stub

---

## Version 2.2.0 (March 3, 2026)

---

### Major Feature: Persistent Memory System

Three-layer memory architecture for context retention across sessions:

**Layer 1: Scratchpad (1ms load)**
- Ultra-fast JSON storage: `data/memory/scratchpad.json`
- User profile, active projects, recent decisions
- Loaded instantly on every chat

**Layer 2: Persistent Memory (10-50ms)**
- Hybrid search: keyword + semantic embeddings
- Stored in `data/memory/vectors.json`
- Categories: user, project, brand, decision, knowledge, security

**Layer 3: Archive**
- Long-term storage in `data/memory/archive/YYYY-MM/`
- Auto-compaction of old memories

**Files Created:**
- `src/lib/memory/scratchpad.ts` - Ultra-fast scratchpad layer
- `src/lib/memory/persistent-store.ts` - Hybrid search storage
- `src/lib/memory/memory-injector.ts` - Chat context injection
- `src/lib/memory/memory-archiver.ts` - Background capture/compaction

**API Endpoints Added:**
- `POST /api/memory` with actions: `persistent_search`, `persistent_save`, `scratchpad_get`, `inject_context`

---

### Major Feature: Browser Automation (Playwright)

Free, unlimited web search without API keys:

**Capabilities:**
- Search Google, Bing, DuckDuckGo
- Scrape any webpage content
- Take screenshots
- Session persistence for authenticated services

**Files Created:**
- `src/lib/browser/search.ts` - Playwright browser service
- `src/app/api/browser/route.ts` - Browser control API

**API Endpoints:**
- `POST /api/browser` with actions: `search`, `scrape`, `screenshot`

---

### Feature: Additional AI Models

New model providers added:

| Provider | Model Prefix | Features |
|----------|--------------|----------|
| Google Gemini | `gemini/` | Free tier, fast, multimodal |
| OpenAI GPT | `openai/`, `gpt-` | GPT-4o, GPT-4o-mini |
| Anthropic Claude | `anthropic/`, `claude-` | Claude 3.5 Sonnet |
| Groq | `groq/` | Ultra-fast inference |
| Mistral | `mistral/` | Open models |

**Files Modified:**
- `src/lib/models/sdk.server.ts` - Added model routing functions
- `src/lib/database/sqlite.ts` - Added new API key providers

---

### UI Improvements: Chat Page Redesign

- Full-width chat window (`max-w-6xl`)
- Text input expanded to 3 lines
- Action buttons repositioned below input
- Model/Expert selection moved to top

**File Modified:**
- `src/app/page.tsx`

---

### Bug Fixes

**SAM.gov API**
- Fixed 400 error - date format changed to `MM/DD/YYYY`

**Microphone Permission**
- Added user-friendly error message for denied permissions

**Web Search**
- Improved handling of Tavily rate limits (432 errors)
- Added fallback messaging

**Experts Page**
- Fixed TypeScript errors for missing `messages` state

---

### Configuration

**New API Keys (Settings page):**
- Gemini (`gemini`)
- OpenAI (`openai`)
- Anthropic (`anthropic`)
- Groq (`groq`)
- Mistral (`mistral`)

**Installation for Browser Automation:**
```bash
npm install playwright --legacy-peer-deps
npx playwright install chromium
```

---

## Version 2.1.0 (March 2026)

---

### Major Feature: AI-Powered Document Generation

**New Office Page**
- Complete rewrite of the `/office` page
- Three document types: Word (.docx), Excel (.xlsx), PowerPoint (.pptx)
- Two modes: AI Generate and Convert Content
- Specialized prompts for each document type
- Download generated documents directly

**New API Endpoint: `/api/documents/generate/ai`**
- Generate documents from AI prompts
- Convert raw content into formatted documents
- Specialized system prompts per document type

**Files Created:**
- `src/lib/services/ai-document-generator.ts` - AI-powered document generation
- `src/app/office/page.tsx` - Redesigned office page
- `src/app/api/documents/generate/ai/route.ts` - New API endpoint
- `docs/DOCUMENT-GENERATION.md` - Complete documentation

### Telegram Integration Fixes

- Fixed message deduplication (bot was sending duplicate responses)
- Fixed config storage (switched from SQLite to file-based storage)
- Fixed AI response function (changed from `streamChatCompletion` to `chatCompletion`)
- File-based config storage: `data/telegram_config.json`

### Security Fixes

- Removed hardcoded default passwords in authentication
- Migrated all localStorage usage to file-based storage
- Fixed API key persistence issues

### Storage Improvements

**Telegram Config**
- Now stored in `data/telegram_config.json`
- Persists correctly across server restarts

**Self-Reflection Reports**
- Now stored in `data/self-reflection-reports.json`

**Metrics**
- Now stored in `data/metrics.json`

**Book Writer Progress**
- Now stored in `data/book_progress.json`

### Web Search Improvements

- DuckDuckGo Instant Answers API (free, no key required)
- Priority order: DuckDuckGo → Tavily → Brave
- Fixed timeout handling in search requests
- Better error handling and fallbacks

### Heartbeat & Task Scheduler

**Verified Working:**
- Heartbeat endpoint returns task status
- Task scheduler runs reflection, research, security, intelligence tasks
- Tasks persist in SQLite database
- Status: `{"status":"healthy","totalTasks":170}`

**Task Storage:**
- All tasks stored in SQLite `scheduled_tasks` table
- Personalization in `user_preference` document category
- No user data in source code repository

### Documentation Updates

| File | Description |
|------|-------------|
| `docs/DOCUMENTATION.md` | Complete system documentation |
| `docs/API-REFERENCE.md` | Full API reference |
| `docs/QUICK-START.md` | 5-minute setup guide |
| `docs/TELEGRAM-SETUP.md` | Telegram bot setup |
| `docs/CUSTOMIZATION.md` | How to customize for your needs |
| `docs/DOCUMENT-GENERATION.md` | Document generation guide |
| `docs/SYSTEM-STATUS.md` | System health status |

---

## Session Progress

### Office/Document Generation - COMPLETED ✅

- AI-powered document generation working
- All three formats tested and working
- Specialized prompts for slides, word, excel
- Frontend page redesigned

### Telegram Bot - COMPLETED ✅

- Bot responds correctly to messages
- Config persists in `data/telegram_config.json`
- Message deduplication implemented
- AI responses working

### Heartbeat/Tasks - VERIFIED ✅

- Heartbeat endpoint working
- Tasks stored in database
- Scheduler running

### Personalization Storage - IMPLEMENTED ✅

- User preferences in SQLite `user_preference` category
- API keys in SQLite
- Telegram config in file (`data/telegram_config.json`)
- No personal data in Git repository

---

## Version 2.0.0 (March 2026)

---

### Major Documentation Update

**New Documentation Files:**

| File | Description |
|------|-------------|
| `docs/DOCUMENTATION.md` | Complete system documentation (500+ lines) |
| `docs/API-REFERENCE.md` | Full API reference with examples |
| `docs/QUICK-START.md` | 5-minute setup guide |
| `docs/SYSTEM-STATUS.md` | System health and status |
| `docs/TELEGRAM-SETUP.md` | Telegram bot setup guide |
| `docs/CRITICAL-FIXES-2026-03-02.md` | Security fixes documentation |

**Updated Documentation:**

| File | Changes |
|------|---------|
| `README.md` | Added links to new documentation |
| `CHANGELOG.md` | Comprehensive version history |

---

### Session 2026-03-02 (Security Fixes & Storage Migration)

---

### Critical Security Fixes

**1. Hardcoded Default Passwords (CRITICAL)**
- **File:** `src/lib/middleware/auth.ts`
- **Issue:** Default passwords `admin123` and `user123` were hard-coded fallbacks
- **Fix:** Removed default fallbacks, now requires `DEFAULT_ADMIN_PASSWORD` env var
- **Impact:** Users MUST set password via environment variable for authentication

**2. localStorage in Server-Side Code (CRITICAL)**
- **Issue:** Multiple files used `localStorage` which doesn't exist in Node.js
- **Fix:** Migrated all server-side storage to file-based persistence
- **Files affected:**
  - `src/lib/agent/self-reflection.ts` → `data/self-reflection-reports.json`
  - `src/lib/agent/book-writer.ts` → `data/book_progress.json`
  - `src/lib/services/metrics.ts` → `data/metrics.json`
  - `src/lib/storage/vector.ts` → `data/vector_store.json`
  - `src/config/user-preferences.ts` → SQLite via API

### Telegram Integration Fixed

**Issue:** Telegram config saved to SQLite but loaded from localStorage (mismatch)
- **Fix:** Unified to use SQLite storage for both read and write
- **Files:** `src/app/api/telegram/route.ts`, `src/lib/config/user-preferences.ts`
- **Status:** ✅ Fully working

### API Key Storage Fixed

**Issue:** API keys not persisting across restarts
- **Root Cause:** `app-config.ts` used localStorage which doesn't work server-side
- **Fix:** Migrated API key storage to SQLite database
- **Files:** `src/app/api/user/route.ts`, `src/lib/config/app-config.ts`
- **New Endpoints:** `setApiKey`, `getApiKeys`, `removeApiKey`
- **Test:** API keys now persist correctly in SQLite

### Web Search Improved

**Issue:** DuckDuckGo Instant Answer API doesn't support general web search
- **Root Cause:** DuckDuckGo API is for instant answers, not web search
- **Priority:** Now tries DuckDuckGo first (free), then Tavily/Brave (requires key)
- **Documentation:** Added `docs/CUSTOMIZATION.md` for user modifications
- **Recommendation:** For full web search, set `TAVILY_API_KEY` or `BRAVE_API_KEY`

---

### Session 2026-03-01 (System Review & Telegram Fix)

---

### Documentation Improvements

**1. Added SYSTEM-STATUS.md**
- Comprehensive system status document
- API endpoint health verification
- Model availability listing
- Testing commands documented
- Performance metrics included

**2. Added IMPROVEMENT-REPORT-2026-03-01.md**
- Full system audit results
- Working features documented
- Areas for improvement identified
- Security recommendations
- Architecture suggestions
- Performance optimization ideas
- Testing framework recommendations

**3. Added TELEGRAM-SETUP.md**
- Complete setup guide for Telegram bot
- Architecture diagram
- API endpoints documentation
- Troubleshooting guide
- Security considerations

### Core Systems Verified Working

| Component | Status | Notes |
|-----------|--------|-------|
| Chat API (streaming) | ✅ Working | SSE streaming fully functional |
| Chat API (non-streaming) | ✅ Fixed | Now uses chatCompletion properly |
| Writing Assistant | ✅ Working | All 7 actions operational |
| Document Generation | ✅ Working | .docx, .xlsx, .pptx all generating |
| ONLYOFFICE Integration | ✅ Working | Local mode works without Docker |
| Model Integration | ✅ Working | 13 models available via Ollama |
| Memory System | ✅ Working | MEMORY.md context loads |
| Task Scheduler | ✅ Working | Runs scheduled tasks |
| Self-Reflection | ✅ Fixed | Now uses file-based storage |
| Telegram Integration | ✅ Fixed | Config now persists correctly |

### Bugs Fixed

**1. Non-Streaming Chat Returns Empty**
- **Root Cause:** Using `streamChatCompletion` for non-streaming mode
- **Fix:** Changed to use `chatCompletion` with proper temperature and maxTokens
- **File:** `src/app/api/chat/route.ts`

**2. Self-Reflection Uses localStorage**
- **Root Cause:** localStorage doesn't work server-side
- **Fix:** Changed to file-based storage in `data/self-reflection-reports.json`
- **File:** `src/lib/agent/self-reflection.ts`

**3. Telegram Config Not Persisting**
- **Root Cause:** user-preferences.ts used localStorage; routes used SQLite, causing mismatch
- **Fix:** Unified config storage to use SQLite for all Telegram config operations
- **Files:** `src/app/api/telegram/route.ts`, `src/lib/config/user-preferences.ts`

### Enhancements Made

1. **Added proper temperature and maxTokens** to chat completion
2. **Added error logging** with stack traces for debugging
3. **Added console logging** to memory file initialization
4. **Verified all core paths** - build compiles successfully
5. **Unified Telegram config storage** to SQLite for persistence

### Files Created

| File | Purpose |
|------|---------|
| `docs/SYSTEM-STATUS.md` | System health and status |
| `docs/IMPROVEMENT-REPORT-2026-03-01.md` | Full system audit |
| `docs/TELEGRAM-SETUP.md` | Telegram bot setup guide |

### Files Modified

| File | Change |
|------|--------|
| `src/app/api/chat/route.ts` | Fixed non-streaming, added error logging |
| `src/lib/agent/self-reflection.ts` | Fixed storage to use file system |
| `src/lib/services/memory-file.ts` | Added logging for initialization |
| `src/app/api/telegram/route.ts` | Fixed config loading to use SQLite |
| `src/lib/config/user-preferences.ts` | Simplified Telegram config storage |
| `CHANGELOG.md` | Added this session documentation |

### Telegram Setup

To set up Telegram:

1. Create bot via **@BotFather** on Telegram
2. Go to `http://localhost:3000/telegram`
3. Enter your bot token
4. Enable the bot and save
5. Click **Start Polling**
6. Chat with your bot!

### Recommendations for Future Sessions

1. **Add Rate Limiting** - Use existing `src/lib/middleware/rate-limit.ts`
2. **Add Authentication** - For multi-user scenarios
3. **Add Unit Tests** - For core document generation functions
4. **Implement Caching** - Vector Lake already handles semantic caching
5. **Add CORS Policy** - For API security

---

## Session: 2026-02-28 (Session 5 - Bug Fixes)

---

### Issues Fixed

**1. Placeholder Text Too Long**
- Changed from "Type your message... (Type /doc <id> to chat with a document)" 
- To simple "Type your message..."
- Document command help moved to document panel

**2. User/Assistant Names Not Persisting**
- **Root Cause:** `localStorage` doesn't work server-side
- **Fix:** Changed user preferences to use SQLite via `/api/user` endpoint
- Name, assistant name, and Telegram config now persist across restarts

**3. SAM.gov Showing "Fake" Data**
- All demo opportunities now marked with `[DEMO]` prefix
- Added warning banner: "Demo Data - Configure SAM.gov API key in Settings"
- Status shows "Demo Mode" instead of "No Active Key"

**4. Telegram Bot Token Not Saving**
- **Root Cause:** Same localStorage issue
- **Fix:** Telegram config now persists to SQLite
- Updated `/api/telegram/config` and `/api/telegram/polling` routes

**5. Streaming Added to Chat**
- Created `/api/chat/stream` endpoint for server-side streaming
- Chat now streams responses character by character
- Removed streaming toggle - streaming is now default

---

### Files Modified

| File | Change |
|------|--------|
| `src/app/page.tsx` | Streaming chat, removed streaming toggle, simplified placeholder |
| `src/app/api/user/route.ts` | SQLite persistence for user preferences |
| `src/app/api/telegram/config/route.ts` | SQLite persistence for Telegram |
| `src/app/api/telegram/polling/route.ts` | SQLite persistence for Telegram |
| `src/lib/config/user-preferences.ts` | Separated Telegram config storage |
| `src/lib/integrations/sam-gov.ts` | Marked demo data clearly |
| `src/components/SAMGovIntegration.tsx` | Added demo data warning banner |
| `src/app/api/chat/stream/route.ts` | NEW: Streaming chat endpoint |

---

## Session: 2026-02-28 (Session 5 - ONLYOFFICE Integration)

---

### ONLYOFFICE Document Integration
**Feature:** Create Word documents, Excel spreadsheets, and PowerPoint presentations via AI.

**AI Tools Added:**
| Tool | Purpose | Example |
|------|---------|---------|
| `create_word_document` | Create Word docs | "Create a meeting notes document" |
| `create_spreadsheet` | Create Excel files | "Make a budget spreadsheet with columns: Item, Cost, Date" |
| `create_presentation` | Create PowerPoint | "Create a pitch deck with 3 slides about AI" |
| `list_documents` | List all documents | "What documents do I have?" |
| `append_to_spreadsheet` | Add rows to Excel | "Add more rows to my budget sheet" |

**How It Works:**
1. AI receives natural language request
2. Parses content and structure
3. Calls ONLYOFFICE service to create document
4. Document saved to SQLite
5. User can view/edit in browser

**Example Commands:**
```
"Write a meeting summary document for today's standup"
"Create a spreadsheet tracking project tasks with columns: Task, Owner, Status, Due Date"
"Make a 5-slide presentation about our product roadmap"
"Add a new row to my expenses spreadsheet: Lunch, $15, 2026-02-28"
```

**Files Added:**
- `src/lib/integrations/onlyoffice.ts` - ONLYOFFICE service
- `src/app/api/onlyoffice/documents/route.ts` - Document API
- `src/app/api/onlyoffice/download/[documentId]/route.ts` - Download handler
- `src/components/OnlyOfficeEditor.tsx` - Editor component
- `src/app/onlyoffice/page.tsx` - Documents page

**Files Modified:**
- `src/lib/services/tool-registry.ts` - Added 5 new AI tools
- `ONLYOFFICE_INTEGRATION.md` - Complete implementation guide

**Note:** Uses ONLYOFFICE Cloud CDN by default. Self-hosted Docker deployment recommended for on-premise.

---

## Session: 2026-02-28 (Session 4 - Voice Interface)

---

### Voice Input/Output Added
**Feature:** Voice capabilities added to main chat using browser APIs.

**Voice Input (Speech-to-Text):**
- 🎤 Mic button - click to speak, auto-transcribes to text
- Uses Web Speech API (Chrome/Edge)
- Speech appears in input field, press Enter to send

**Voice Output (Text-to-Speech):**
- 🔊 Speaker button - toggle voice output on/off
- 🎵 Read button - reads last AI response aloud
- Uses browser speechSynthesis API
- 1000 character limit per response

**How to Use:**
1. Click mic button (🎤) to start voice input
2. Speak your message
3. Text appears in input - press Enter to send
4. Toggle speaker button (🔊) to enable voice responses
5. Click read button (🎵) to hear last response

**Browser Support:**
- Chrome, Edge: Full support
- Firefox, Safari: Limited support
- Mobile: Works in Chrome on Android

**File Changed:** `src/app/page.tsx`

---

## Session: 2026-02-28 (Session 3 - Natural Language Tasks)

---

### Natural Language Task Scheduling
**Feature:** Users can describe tasks in plain English, AI parses and schedules them.

**Example:** "Check the DISP SBIR website every Wednesday for new SBIRs from Space Force dealing with space domain awareness."

**Files Added:**
- `src/app/api/task-instruction/route.ts` - Parse natural language task instructions
- `src/components/TaskInstruction.tsx` - UI for natural language task creation

**Files Modified:**
- `src/app/tasks/page.tsx` - Integrated TaskInstruction component
- `src/lib/services/task-scheduler.ts` - Added `web_check` task type
- `src/components/TopNav.tsx` - Simplified navigation

**How it works:**
1. User types natural language instruction
2. AI parses into: name, description, schedule, action type, keywords
3. Task created in scheduler with `web_check` type
4. On scheduled run: web search → AI analysis → report

---

## Session: 2026-02-28 (Session 2 - Autonomous Improvements)

---

### Memory Leak Fixed - Metrics Service
**Problem:** `setInterval` never cleared, causing memory leak.

**Fix:** Added `cleanupInterval` reference and `cleanup()` method.

**File Changed:** `src/lib/services/metrics.ts`

---

### Dangerous Auto-Modification Removed
**Problem:** Self-improvement agent could remove TODOs and comments.

**Fix:** Disabled automatic code modification. Only analyzes now.

**File Changed:** `src/lib/agent/self-improvement.ts`

---

### Document Upload & Chat Integration
**Problem:** Documents page too complex, chat window too small.

**Fix:**
- Added 📄 upload button to main chat
- Expandable documents panel
- AI chats with documents via `/doc <id>`

**Files Changed:** `src/app/page.tsx`, `src/lib/services/tool-registry.ts`

---

### Calendar AI Integration
**Problem:** Calendar disconnected from AI.

**Fix:** Added calendar tools:
- `calendar_add_event` - "Schedule dentist appointment tomorrow at 9am"
- `calendar_get_events` - "What's on my calendar?"
- `calendar_delete_event` - "Cancel my meeting"

**File Changed:** `src/lib/services/tool-registry.ts`

---

### System Analysis Completed

**OpenClaw vs AI Dashboard:**
- AI Dashboard: Business focus, tool efficiency, knowledge management
- OpenClaw: Messaging focus, multi-channel, Docker security

**Recommendations:**
1. Add authentication for multi-user
2. Add rate limiting
3. Add unit tests
4. Port Docker sandboxing from OpenClaw
5. Consider Canvas/A2UI for agent-generated UIs

---

## Session: 2026-02-28

---

### Calendar Tickler / Daily Briefing
**Added:** Tickler screen on calendar page showing today's events at a glance.

Features:
- Greeting based on time of day (morning/afternoon/evening)
- Today's schedule with times and locations
- Quick stats: today's events, this week's events, pending tasks
- "Generate Briefing" button - AI creates personalized daily briefing
- Automatically refreshes when events are added/edited

**Files Added:**
- `src/app/api/tickler/route.ts` - Tickler API endpoint

**Files Modified:**
- `src/app/calendar/page.tsx` - Added tickler UI at top
- `src/components/Calendar.tsx` - Added refreshKey prop for auto-refresh

---

### Documentation: Messaging Platform Flexibility
**Note:** Documented that Telegram is one of many possible messaging integrations.

The system is platform-agnostic. Users can connect via:
- Telegram (implemented)
- Slack (same architecture)
- Discord (same architecture)  
- WhatsApp (same architecture)
- Notion (same architecture)

Each service implements the same interface, making it easy to swap platforms.

**Files Updated:**
- `SYSTEM_GUIDE.md` - Added messaging layer architecture diagram
- `README.md` - Added messaging integrations section

---

### Telegram Polling Support
**Problem**: Webhook requires public URL, doesn't work on restricted networks.

**Fix**: Added polling mode - bot actively fetches messages from Telegram API:
- New `/api/telegram/polling` endpoint for start/stop controls
- `startPolling()` and `stopPolling()` methods in TelegramService
- UI updated with "Start Polling" button
- Works without any public URL or tunnel
- Polling runs continuously checking for new messages every 3 seconds

**Files Changed**:
- `src/lib/integrations/telegram.ts` - Added polling methods
- `src/app/api/telegram/polling/route.ts` - New polling API
- `src/app/telegram/page.tsx` - Updated UI with polling controls

---

## Session: 2026-02-27 (Continued 2)

---

### Security Agent - Real File Scanning
**Problem**: Security agent returned static/mock findings, not actually scanning code.

**Fix**: Rewrote security-agent.ts to perform real file system scans:
- Scans `.gitignore` for required patterns (.env, node_modules, etc.)
- Detects `NEXT_PUBLIC_` secrets exposed to client
- Scans for hardcoded API keys, tokens, passwords using regex patterns
- Detects SQL injection patterns (string interpolation in queries)
- Detects command injection in exec/spawn calls
- Detects XSS vulnerabilities (dangerouslySetInnerHTML)
- Checks next.config.js for security headers
- Checks dependencies for known vulnerable packages
- Persists reports to `data/security.db.json` (works server-side)

**Files Changed**:
- `src/lib/agent/security-agent.ts` - Complete rewrite with actual scanning

---

### Features/OpenCode - Server-Side AI Call Fix
**Problem**: `generateProposedChanges()` used `fetch('/api/chat')` which fails server-side (relative URLs don't work).

**Fix**: Import and call `streamChatCompletion()` directly from the SDK instead of making HTTP call.

**Files Changed**:
- `src/app/api/features/request/route.ts` - Direct SDK call, added `checkAvailability()` endpoint

---

### OpenCode Dependency Validation
**Problem**: No validation that opencode package is installed before attempting to execute.

**Fix**: Added `checkAvailability()` method to OpenCodeAgent that:
- Checks if opencode is available via `npx opencode --version`
- Caches the status to avoid repeated checks
- Returns version or error message
- API endpoint `GET /api/features/request?action=opencode-status` to check status

**Files Changed**:
- `src/lib/agent/opencode-agent.ts` - Added `checkAvailability()` and `OpenCodeStatus` interface
- `src/app/api/features/request/route.ts` - Added validation before implement

---

### Telegram Config Persistence
**Problem**: Webhook route used `telegramService.getConfig()` which returned null after server restart.

**Fix**: Added `loadTelegramConfig()` function that reads from `userPreferences.getTelegramConfig()` at the start of each webhook request, then calls `telegramService.setConfig()` before processing.

**Files Changed**:
- `src/app/api/telegram/route.ts` - Load config from persistence at start of POST handler

---

### Telegram /chat Command Removal
**Problem**: Help text mentioned `/chat` command but it wasn't implemented.

**Fix**: Removed `/chat` command from help and DEFAULT_COMMANDS. Users can just message directly - AI responds to all messages anyway.

**Files Changed**:
- `src/app/api/telegram/route.ts` - Updated help text
- `src/lib/integrations/telegram.ts` - Removed from DEFAULT_COMMANDS
- `src/app/api/telegram/config/route.ts` - Removed from setup commands

---

### Features Page Improvements
**Problem**: No visibility into OpenCode availability, no error handling, requests not loaded on page load.

**Fix**: 
- Added OpenCode status check on mount
- Display status badge (Available/Unavailable)
- Disable "Implement" button if OpenCode unavailable
- Show error messages to user
- Load existing requests from API on mount

**Files Changed**:
- `src/components/FeatureRequest.tsx` - Added status check, error display, initial load

---

## Verified Complete Systems

| System | Status | Notes |
|--------|--------|-------|
| Security Agent | ✅ Working | Real file scanning, auto-scheduled via Task Scheduler |
| Telegram | ✅ Working | Config persists, `/search`, `/status`, AI chat |
| Features/OpenCode | ✅ Working | Status check, implementation flow |
| Task Scheduler | ✅ Working | Security scans every 12h |

---

## Session: 2026-02-27

---

### Security Agent - Real File Scanning
**Problem**: Security agent returned static/mock findings, not actually scanning code.

**Fix**: Rewrote security-agent.ts to perform real file system scans:
- Scans `.gitignore` for required patterns (.env, node_modules, etc.)
- Detects `NEXT_PUBLIC_` secrets exposed to client
- Scans for hardcoded API keys, tokens, passwords using regex patterns
- Detects SQL injection patterns (string interpolation in queries)
- Detects command injection in exec/spawn calls
- Detects XSS vulnerabilities (dangerouslySetInnerHTML)
- Checks next.config.js for security headers
- Checks dependencies for known vulnerable packages
- Persists reports to `data/security.db.json` (works server-side)

**Files Changed**:
- `src/lib/agent/security-agent.ts` - Complete rewrite with actual scanning

---

### Features/OpenCode - Server-Side AI Call Fix
**Problem**: `generateProposedChanges()` used `fetch('/api/chat')` which fails server-side (relative URLs don't work).

**Fix**: Import and call `streamChatCompletion()` directly from the SDK instead of making HTTP call.

**Files Changed**:
- `src/app/api/features/request/route.ts` - Direct SDK call, added `checkAvailability()` endpoint

---

### OpenCode Dependency Validation
**Problem**: No validation that opencode package is installed before attempting to execute.

**Fix**: Added `checkAvailability()` method to OpenCodeAgent that:
- Checks if opencode is available via `npx opencode --version`
- Caches the status to avoid repeated checks
- Returns version or error message
- API endpoint `GET /api/features/request?action=opencode-status` to check status

**Files Changed**:
- `src/lib/agent/opencode-agent.ts` - Added `checkAvailability()` and `OpenCodeStatus` interface
- `src/app/api/features/request/route.ts` - Added validation before implement

---

### Telegram Config Persistence
**Problem**: Webhook route used `telegramService.getConfig()` which returned null after server restart.

**Fix**: Added `loadTelegramConfig()` function that reads from `userPreferences.getTelegramConfig()` at the start of each webhook request, then calls `telegramService.setConfig()` before processing.

**Files Changed**:
- `src/app/api/telegram/route.ts` - Load config from persistence at start of POST handler

---

### Telegram /chat Command Removal
**Problem**: Help text mentioned `/chat` command but it wasn't implemented.

**Fix**: Removed `/chat` command from help and DEFAULT_COMMANDS. Users can just message directly - AI responds to all messages anyway.

**Files Changed**:
- `src/app/api/telegram/route.ts` - Updated help text
- `src/lib/integrations/telegram.ts` - Removed from DEFAULT_COMMANDS
- `src/app/api/telegram/config/route.ts` - Removed from setup commands

---

## Session: 2026-02-27

---

## Bug Fixes

### SAM.gov Data Not Persisting
**Problem**: Search queries and opportunities disappeared after page refresh.

**Cause**: Used `localStorage` (client-side) but API routes run server-side.

**Fix**: Added SQLite tables for SAM data:
- `sam_searches` - Saved search queries
- `sam_opportunities` - Search results
- `sam_api_keys` - API key management

**Files Changed**:
- `src/lib/database/sqlite.ts` - Added SAM tables and methods
- `src/lib/integrations/sam-gov.ts` - Rewrote to use SQLite instead of localStorage

---

### Documents Not Persisting
**Problem**: Uploaded documents disappeared after page refresh.

**Cause**: Same issue - used `localStorage` for document storage.

**Fix**: Added SQLite `documents` table and converted DocumentStore to async.

**Files Changed**:
- `src/lib/database/sqlite.ts` - Added documents table and methods
- `src/lib/storage/documents.ts` - Converted to async, uses SQLite
- `src/lib/storage/knowledge.ts` - Updated for async document methods
- `src/app/api/documents/route.ts` - Using async methods
- `src/app/api/brand-chat/route.ts` - Await document calls
- `src/app/api/memory/route.ts` - Await document calls
- `src/components/DocumentManager.tsx` - Await document creation

---

### TypeScript Type Errors
**Files Fixed**:
- `src/components/ChatMessage.tsx` - Added 'expert' to role type, fixed rendering logic
- `src/components/ExpertChat.tsx` - Pass string content instead of JSX
- `src/lib/config/user-preferences.ts` - Added index signature to ApiKeys interface

---

### Server-Side localStorage Errors
**Problem**: Code attempted to access `localStorage` during server-side rendering.

**Fix**: Added `typeof window === 'undefined'` guard checks.

**Files Fixed**:
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

## New Features

### 1. Brand Workspace System
**Purpose**: NotebookLM-style knowledge management with hierarchy: Brand → Projects → Documents → Chat

**Files Created**:
- `src/types/brand-workspace.ts` - Type definitions
- `src/lib/services/brand-workspace.ts` - Core service (brands, projects, documents, chat sessions)
- `src/lib/services/document-processor.ts` - Multi-format document processing (PDF, TXT, MD, HTML, URL)
- `src/app/api/brand-workspace/brands/route.ts` - Brand management API
- `src/app/api/brand-workspace/projects/route.ts` - Project management API
- `src/app/api/brand-workspace/chat/route.ts` - Context-aware chat API
- `src/app/brand-workspace/page.tsx` - UI dashboard

**Database Tables Added**:
- `brands_v2` - Enhanced brand storage with voice profiles
- `brand_documents` - Document storage with compaction support
- `projects_v2` - Projects linked to brands
- `chat_sessions` - Chat history per project
- `generated_outputs` - Saved proposals/quotes

**Features**:
- Document sources: File upload, URL import, text paste
- Markdown compaction for context windows
- AI chat using brand documents as context
- Generate proposals and quotes from brand knowledge
- Voice profiles: tone, style, key messages, avoid phrases

**Access**: `/brand-workspace`

---

### 2. Tool Efficiency System
**Purpose**: Analyze how efficiently the AI uses its tools (not abstract self-reflection).

**Philosophy**: AI power comes from using tools efficiently, not from self-reflection. Like humans need calculators and airplanes, AI needs vector search, SQL, and math tools.

**Files Created**:
- `src/lib/services/metrics.ts` - Real-time usage metrics tracking
- `src/lib/services/code-health.ts` - Client-side health analysis
- `src/lib/services/self-improvement.ts` - Actionable insights generation
- `src/lib/services/tool-efficiency.ts` - Tool usage analysis
- `src/lib/services/tool-registry.ts` - Tool management and execution
- `src/types/tools.ts` - Tool type definitions
- `src/app/api/metrics/route.ts` - Metrics API endpoint
- `src/app/api/self-improvement/route.ts` - Efficiency analysis API
- `src/app/self-improvement/page.tsx` - Tool efficiency dashboard

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

### 3. Plugin Architecture
**Purpose**: Separate core features from personal plugins.

**Files Created**:
- `src/config/plugins.ts` - Plugin configuration

**Core Features** (always available):
- Brand Workspace
- Tool Efficiency
- Documents
- Notes
- Calendar

**Personal Plugins** (optional, user-specific):
- Book Writer - Generate AI Assistant documentation
- SAM.gov - Government contracts
- Intelligence Reports
- Research Agent
- Security Scanner

---

### 4. Book Writer Plugin Refactored
**Purpose Changed**: Now generates documentation for this AI Assistant project (not generic book writing).

**Output**: Creative Commons BY-SA 4.0 licensed book teaching beginners to build their own AI assistant.

**Files Changed**:
- `src/plugins/book-writer/index.ts` - Refactored for project documentation

**Chapter Outline**:
1. Introduction - What is an AI Assistant?
2. Understanding the Architecture
3. Setting Up Your Development Environment
4. Building the Chat Interface
5. Connecting to AI Models
6. Adding Memory with Vector Storage
7. The Power of Tools
8. Working with Documents
9. Brand Voice - NotebookLM Style
10. Tool Efficiency - Making AI Work Better
11. Adding External Integrations
12. Storing Data with SQLite
13. Deploying Your Assistant
14. Extending and Customizing
15. Troubleshooting Common Issues
16. What's Next - The Future of AI Assistants
17. Appendix A: Quick Reference

---

## Removed/Dangerous Code

### Deleted Dangerous Auto-Modification
**File**: `src/lib/agent/self-improvement.ts` (OLD VERSION)

**Why Removed**:
- Auto-modified code files
- Removed comments automatically
- Could break codebase

**Replaced With**: Safe analysis-only system that provides recommendations without modifying code.

---

## Documentation Created

- `PROJECT_CHANGES.md` - Detailed change log
- `ARCHITECTURE.md` - Plugin system architecture
- `BUGFIX_SAM_STORAGE.md` - SAM/Documents storage fix details
- `SESSION_SUMMARY.md` - What was built and why

---

## Database Schema Changes

### New Tables

```sql
-- Brand Workspace
CREATE TABLE brands_v2 (...);
CREATE TABLE brand_documents (...);
CREATE TABLE projects_v2 (...);
CREATE TABLE chat_sessions (...);
CREATE TABLE generated_outputs (...);

-- SAM.gov
CREATE TABLE sam_searches (...);
CREATE TABLE sam_opportunities (...);
CREATE TABLE sam_api_keys (...);

-- Documents
CREATE TABLE documents (...);
```

### New Methods in SQLDatabase Class

**Brand Workspace**:
- Brand CRUD operations
- Document management
- Project management
- Chat session management
- Generated outputs

**SAM.gov**:
- Search query management
- Opportunity storage
- API key management

**Documents**:
- Full CRUD operations
- Search functionality
- Type filtering

**Utility**:
- `run(sql, params)` - Execute SQL
- `get(sql, params)` - Get single row
- `all(sql, params)` - Get all rows

---

## API Endpoints Added

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/brand-workspace/brands` | GET/POST | Brand CRUD |
| `/api/brand-workspace/projects` | GET/POST | Project management |
| `/api/brand-workspace/chat` | GET/POST | Context-aware chat |
| `/api/metrics` | GET/POST | Usage metrics |
| `/api/self-improvement` | GET/POST | Tool efficiency |

---

## Configuration

**No new environment variables required.**

All data stored in SQLite at `data/assistant.db`.

---

## Migration Notes

1. Run `npm run build` to create new database tables
2. Old localStorage data for SAM.gov and documents is **not migrated** (would be lost)
3. Old brand chat data (`/brand-chat`) exists separately from new brand workspace (`/brand-workspace`)
4. Old self-reflection reports in localStorage won't appear in new system