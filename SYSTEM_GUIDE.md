# AI Dashboard - Complete System Guide

> **On-Premise AI Assistant** - $0/month, fully local, government/enterprise ready

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Architecture](#architecture)
3. [Working Systems](#working-systems)
4. [API Reference](#api-reference)
5. [Configuration](#configuration)
6. [GovBotics Architecture](#govbotics-architecture)
7. [Geppetto & Agent Jukebox](#geppetto--agent-jukebox)
8. [Deployment Guide](#deployment-guide)
9. [Future Roadmap](#future-roadmap)

---

## System Overview

### What This Is

A complete on-premise AI assistant dashboard that:
- Runs entirely on your hardware
- Uses only free, open-source tools
- Never sends data to external servers
- Can modify its own code via OpenCode integration
- Targets government, healthcare, and finance sectors

### Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| Frontend | Next.js 14 + React + Tailwind | UI/UX |
| Backend | Next.js API Routes | Server logic |
| Database | SQLite | All persistence |
| AI Models | Ollama (GLM-5, Qwen 2.5 Coder) | Local LLM |
| Code Modification | OpenCode | Autonomous coding |
| Web Search | DuckDuckGo + Tavily | External data |
| Cost | $0/month | Free forever |

### Key Features

- **Chat with AI** - Multiple local models
- **Web Search** - DuckDuckGo + Tavily integration
- **SAM.gov** - Government contracting opportunities
- **Brand Workspace** - Projects, documents, knowledge management
- **Security Scanner** - Real code vulnerability detection
- **Feature Requests** - OpenCode auto-implementation
- **Telegram Bot** - Mobile access
- **Task Scheduler** - Automated periodic tasks
- **Metrics Dashboard** - Usage analytics

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND (React)                         │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐   │
│  │  Chat   │ │ Security│ │Features │ │Telegram │ │  SAM    │   │
│  │  Page   │ │  Page   │ │  Page   │ │  Page   │ │  Page   │   │
│  └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘   │
└───────┼──────────┼──────────┼──────────┼──────────┼─────────────┘
        │          │          │          │          │
        ▼          ▼          ▼          ▼          ▼
┌─────────────────────────────────────────────────────────────────┐
│                     API LAYER (Next.js Routes)                   │
│  /api/chat  /api/security  /api/features  /api/telegram  /api/sam│
└─────────────────────────────────────────────────────────────────┘
        │          │          │          │          │
        ▼          ▼          ▼          ▼          ▼
┌─────────────────────────────────────────────────────────────────┐
│                      SERVICES LAYER                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ Security     │  │ Task         │  │ OpenCode     │          │
│  │ Agent        │  │ Scheduler    │  │ Agent        │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ Brand        │  │ Tool         │  │ Metrics      │          │
│  │ Workspace    │  │ Registry     │  │ Service      │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────────────────┐
│                      DATA LAYER (SQLite)                         │
│  brands | projects | documents | tasks | metrics | sam_searches │
└─────────────────────────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────────────────┐
│                      AI LAYER (Ollama)                           │
│  GLM-5 (chat) | Qwen 2.5 Coder (code) | Embedding models        │
└─────────────────────────────────────────────────────────────────┘
```

---

## Working Systems

### 1. Chat System (`/chat`)

**Files:**
- `src/app/page.tsx` - Main chat UI with document upload
- `src/app/api/chat/route.ts` - Chat API
- `src/lib/models/sdk.server.ts` - AI SDK wrapper
- `src/lib/services/tool-registry.ts` - AI tools

**AI Tools (Automatic):**
The AI can now use tools without explicit commands:
- `calendar_add_event` - "Schedule appointment with dentist tomorrow at 9am"
- `calendar_get_events` - "What's on my calendar today?"
- `calendar_delete_event` - "Cancel my meeting on Friday"
- `document_list` - "What documents do I have?"
- `document_chat` - "Ask my project proposal document about budget"
- `web_search` - "Search for latest AI news"
- `web_fetch` - "Get content from this URL"
- `vector_search` - Search knowledge base
- `sql_query` - Query database
- `calculate` - Math operations

**Document Upload:**
- Upload PDF, Word, TXT, MD directly in chat
- Click 📄 icon to upload
- Chat with documents: `/doc <id> your question`
- Documents panel shows available docs

**Usage:**
```
POST /api/chat
{
  "model": "ollama/qwen2.5-coder",
  "message": "Your message here",
  "useVectorLake": true
}
```

**Example Commands:**
```
"Schedule a meeting with John tomorrow at 2pm"
"What's on my calendar for this week?"
"Upload this document and summarize it"
"Search the web for AI news"
```

---

### 2. Security Agent (`/security`)

**Files:**
- `src/app/security/page.tsx` - Security UI
- `src/lib/agent/security-agent.ts` - Scanning logic
- `src/app/api/security/route.ts` - API endpoint

**Scans Performed:**
| Check | Description |
|-------|-------------|
| `.gitignore` | Verifies .env, node_modules are ignored |
| Environment Exposure | NEXT_PUBLIC_ secrets |
| Hardcoded Secrets | API keys, passwords, tokens |
| SQL Injection | String interpolation in queries |
| Command Injection | User input in exec/spawn |
| XSS | dangerouslySetInnerHTML usage |
| Security Headers | next.config.js configuration |
| Dependencies | Known vulnerable packages |

**Scheduled:** Every 12 hours via Task Scheduler

**Usage:**
```
POST /api/security { "action": "scan" }
GET /api/security (latest report)
```

---

### 3. Features/OpenCode (`/features`)

**Files:**
- `src/app/features/page.tsx` - Features UI
- `src/components/FeatureRequest.tsx` - Request component
- `src/lib/agent/opencode-agent.ts` - OpenCode integration
- `src/app/api/features/request/route.ts` - API

**Workflow:**
1. User submits feature request
2. System checks OpenCode availability
3. OpenCode explores codebase and implements feature
4. Changes tracked in `data/feature-requests.json`

**OpenCode Availability Check:**
```
GET /api/features/request?action=opencode-status
Response: { "status": { "available": true, "version": "x.x.x" } }
```

---

### 4. Messaging Integration (`/telegram`)

**Important:** Telegram is just one example of many possible messaging integrations. The system supports multiple platforms:

| Platform | Status | Notes |
|----------|--------|-------|
| Telegram | ✅ Implemented | Current implementation |
| Slack | 🔲 Template ready | Same architecture |
| Discord | 🔲 Template ready | Same architecture |
| WhatsApp | 🔲 Template ready | Same architecture |
| Notion | 🔲 Template ready | Same architecture |

**Users choose their preferred platform.** The integration layer is designed to be platform-agnostic - swap in any messaging service that fits your workflow.

---

**Files:**
- `src/app/telegram/page.tsx` - Configuration UI
- `src/lib/integrations/telegram.ts` - Messaging service
- `src/app/api/telegram/route.ts` - Webhook/polling handler
- `src/app/api/telegram/config/route.ts` - Config API

**How to Add a New Platform:**

1. Create `src/lib/integrations/slack.ts` (copy telegram.ts as template)
2. Create `src/app/api/slack/route.ts` (copy telegram/route.ts)
3. Update the service methods for your platform's API
4. Add UI page in `src/app/slack/page.tsx`

**Architecture:**
```
┌─────────────────────────────────────────────────────────────┐
│                    Messaging Layer                          │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐        │
│  │Telegram │  │  Slack  │  │ Discord │  │WhatsApp │        │
│  │ Service │  │ Service │  │ Service │  │ Service │        │
│  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘        │
│       │            │            │            │              │
│       └────────────┴────────────┴────────────┘              │
│                          │                                   │
│                          ▼                                   │
│              ┌─────────────────────┐                        │
│              │   Core AI Engine    │                        │
│              │  (Chat, Search, etc)│                        │
│              └─────────────────────┘                        │
└─────────────────────────────────────────────────────────────┘
```

Each messaging service implements the same interface:
- `sendMessage()` - Send response to user
- `receiveMessage()` - Handle incoming message
- `setConfig()` - Configure the integration
- `polling/startPolling()` - For platforms without webhooks

---

**Telegram Commands:**
| Command | Action |
|---------|--------|
| `/start` | Welcome message |
| `/help` | Show commands |
| `/search <query>` | Web search |
| `/status` | System status |
| (any message) | AI chat response |

**Setup:**
1. Create bot via @BotFather
2. Enter bot token in UI
3. Click "Setup Webhook"
4. Bot receives messages at `/api/telegram`

---

### 5. SAM.gov Integration (`/sam`)

**Files:**
- `src/app/sam/page.tsx` - SAM UI
- `src/lib/integrations/sam-gov.ts` - SAM service
- `src/app/api/sam/route.ts` - API

**Features:**
- Search government opportunities
- Save search queries
- SQLite persistence
- API key management

---

### 6. Brand Workspace (`/brand-workspace`)

**Files:**
- `src/app/brand-workspace/page.tsx` - Workspace UI
- `src/lib/services/brand-workspace.ts` - Service
- `src/lib/storage/knowledge.ts` - Knowledge base

**Features:**
- Create brands and projects
- Upload documents to projects
- NotebookLM-style knowledge chat
- Context-aware AI responses

---

### 7. Task Scheduler (`/tasks`)

**Files:**
- `src/app/tasks/page.tsx` - Tasks UI
- `src/lib/services/task-scheduler.ts` - Scheduler

**Default Tasks:**
| Task | Schedule | Purpose |
|------|----------|---------|
| Intelligence Report | Daily | Space industry news |
| Security Scan | Every 12h | Vulnerability scan |
| Self-Reflection | Every 6h | Performance analysis |
| SAM.gov Check | Daily | New opportunities |

---

## Model Router System

### Overview

The AI Dashboard implements an intelligent three-tier model routing system that automatically selects the most appropriate AI model based on task requirements:

**Tier 1: Housekeeping (Qwen 3.5-2B)**
- Ultra-lightweight (2B parameters)
- Runs on CPU without GPU
- Near GPT-4 mini performance
- Used for: scheduled tasks, heartbeats, monitoring, cleanup operations
- Cost: $0 (local)

**Tier 2: Capable Local**
- Best available local model
- Examples: Qwen 3.5-27B, Qwen 2.5-14B, Llama 3.2
- Used for: coding, document generation, chat, research
- Auto-selected based on installed models
- Cost: $0 (local)

**Tier 3: Cloud Thinking**
- Cloud-based models
- Examples: GLM-5 Cloud, Kimi K2.5 Cloud
- Used for: complex reasoning, strategic planning, system design
- Budget-aware with fallback to local
- Cost: Pay-per-use

### Implementation

```typescript
// src/lib/models/model-router.ts
import { ModelRouter } from '@/lib/models/model-router';

const router = new ModelRouter();

// Get model for specific task
const model = router.getModel('chat', { 
  preferCloud: false,
  minCapabilities: ['chat', 'code']
});

// Automatic escalation
// - 'heartbeat' → Qwen 3.5-2B
// - 'coding' → Best local model (27B if available)
// - 'planning' → Cloud model (if budget allows)
```

### Dynamic Model Loading

Models are fetched dynamically from Ollama:

```typescript
// Use the useModels hook
import { useModels } from '@/lib/hooks/useModels';

const { 
  models,           // All available models
  ollamaModels,     // Local Ollama models
  externalModels,   // Cloud/external models
  selectedModel,
  setSelectedModel,
  getCapableModel   // Get best model for task
} = useModels();
```

### API

```
GET /api/models
Response: {
  ollama: { available: boolean, models: [...] },
  external: [...],
  allModels: [...],
  defaultModel: string
}
```

---

## Canvas / A2UI Fullscreen Mode

### Overview

The Canvas component supports fullscreen mode for better viewing of generated UIs:

**Features:**
- Fullscreen toggle button in preview header
- Dynamic height adjustment (fills viewport in fullscreen)
- Device preview modes (mobile, tablet, desktop)
- Maintains responsive design in fullscreen

### Usage

```typescript
const [isFullscreen, setIsFullscreen] = useState(false);
const canvasContainerRef = useRef<HTMLDivElement>(null);

// Toggle fullscreen
const toggleFullscreen = () => {
  if (!isFullscreen) {
    canvasContainerRef.current?.requestFullscreen();
  } else {
    document.exitFullscreen();
  }
};
```

### UI Controls

- **Fullscreen Button**: Toggle between normal and fullscreen modes
- **Device Toggle**: Switch between mobile/tablet/desktop previews (hidden in fullscreen)
- **View Code**: Toggle between preview and raw HTML

---

## Presentation Styling System

### Overview

The Office AI Presentation tools include comprehensive styling options:

### Templates

| Template | Description | Best For |
|----------|-------------|----------|
| Corporate | Professional, clean, business-focused | Business meetings |
| Modern Dark | Dark background, white text, sleek | Tech presentations |
| Minimal | White background, simple, elegant | Academic, clean designs |
| Creative | Bold colors, dynamic, eye-catching | Marketing, pitches |
| Tech | Blue gradients, modern, innovative | Developer talks |
| Elegant | Black background, gold accents, premium | Executive presentations |

### Color Schemes

- **Default**: Uses template colors
- **Black/White**: Black background, white text
- **White/Black**: White background, black text
- **Blue/White**: Blue background, white text
- **Dark Blue/White**: Dark blue background, white text
- **Green/White**: Green background, white text

### Brand Logo Upload

```typescript
// Upload logo
const [logo, setLogo] = useState<string | null>(null);

// Logo appears on:
// - Title slide
// - Footer of each slide
// - Consistent branding throughout
```

### Brand Profile Integration

- Select from existing brand profiles
- Auto-loads brand logo and colors
- Maintains brand consistency across presentations

### API

```
POST /api/office-ai
Body: {
  type: "presentation",
  action: "bullets" | "outline" | "create-from-outline",
  data: { ... },
  styling: {
    template: "corporate" | "modern-dark" | "minimal" | ...,
    colorScheme: "default" | "black-white" | "blue-white" | ...,
    logo: "base64_encoded_logo",
    brandId: "brand_id"
  }
}
```

---

## Edge Runtime Compatibility

### Overview

The system has been optimized to run in Next.js Edge Runtime without Node.js dependencies:

### Changes Made

**File System → SQLite**
- `memory-file.ts`: Uses SQLite instead of file system
- `metrics.ts`: Database-based metrics storage
- `rl-trainer.ts`: SQLite for training data

**Top-level Imports Removed**
- ❌ `import * as fs from 'fs'`
- ❌ `import * as path from 'path'`
- ✅ Dynamic imports with runtime checks

**Runtime Detection**
```typescript
const isNodeRuntime = typeof process !== 'undefined' && process.cwd !== undefined;

if (!isNodeRuntime) {
  // Skip file operations in Edge Runtime
  return { success: true, skipped: true };
}
```

### Benefits

- ✅ Runs in Edge Runtime (faster, distributed)
- ✅ No file system dependencies
- ✅ Consistent behavior across environments
- ✅ Better security (no file system access)

---

## API Reference

### Chat
```
POST /api/chat
Body: { model, message, conversationHistory?, useVectorLake? }
Response: { message, done, vectorLakeUsed? }
```

### Security
```
POST /api/security
Body: { action: "scan" | "history" }
Response: { success, report? }

GET /api/security
Response: { latestReport, shouldRunScan }
```

### Features
```
POST /api/features/request
Body: { action, request?, requestId?, changeIndex? }
Actions: create, implement, approveChange, rejectChange, apply

GET /api/features/request?action=list|get|opencode-status
```

### Telegram
```
POST /api/telegram (webhook)
Body: Telegram Update object

POST /api/telegram/config
Body: { action: "save"|"setWebhook"|"setup"|"test", config? }

GET /api/telegram?action=setWebhook&url=...|webhookInfo|botInfo|setup
```

### SAM.gov
```
GET /api/sam?keyword=...
GET /api/sam?action=saved-searches
POST /api/sam { action: "save-query", keyword }
```

### Brand Workspace
```
GET /api/brand-workspace?action=brands
POST /api/brand-workspace { action: "create-brand", name }
GET /api/brand-workspace?action=projects&brandId=...
POST /api/brand-workspace { action: "create-project", brandId, name }
POST /api/brand-workspace { action: "chat", brandId, projectId, message }
```

---

## Configuration

### Environment Variables (`.env`)
```bash
# Ollama
OLLAMA_BASE_URL=http://localhost:11434

# Web Search (optional)
TAVILY_API_KEY=tvly-xxx

# SAM.gov (optional)
SAM_API_KEY=xxx

# Base URL for server-side requests
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

### User Preferences
Stored in `data/user-preferences.json`:
```json
{
  "userName": "User",
  "assistantName": "AI Assistant",
  "telegram": {
    "botToken": "xxx",
    "enabled": true,
    "webhookUrl": "https://..."
  }
}
```

---

## GovBotics Architecture

### Overview

GovBotics is the enterprise/commercial version targeting:
- Government agencies
- Healthcare organizations
- Financial institutions
- Any organization requiring on-premise AI

### Value Proposition

| Feature | Cloud AI (OpenAI, etc.) | GovBotics |
|---------|------------------------|-----------|
| Data Privacy | ❌ Data leaves premise | ✅ Never leaves |
| Cost | $20-200+/month | $0 after setup |
| Compliance | ❌ May not meet FedRAMP | ✅ Full control |
| Customization | Limited | Full |
| Offline | ❌ Requires internet | ✅ Works offline |

### Architecture Extensions

```
┌─────────────────────────────────────────────────────┐
│                  GovBotics Layer                     │
├─────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │
│  │ Audit Log   │  │ Compliance  │  │ SSO/SAML    │ │
│  │ Service     │  │ Manager     │  │ Integration │ │
│  └─────────────┘  └─────────────┘  └─────────────┘ │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │
│  │ Data        │  │ Encryption  │  │ Role-Based  │ │
│  │ Masking     │  │ Service     │  │ Access      │ │
│  └─────────────┘  └─────────────┘  └─────────────┘ │
└─────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────┐
│              Base AI Dashboard                       │
│  (This project - Reference Implementation)           │
└─────────────────────────────────────────────────────┘
```

### GovBotics Features (Enterprise)

1. **Audit Logging**
   - Every AI interaction logged
   - Who, what, when, which model
   - Exportable for compliance

2. **SSO/SAML Integration**
   - Active Directory
   - Okta
   - Custom identity providers

3. **Data Masking**
   - Auto-detect PII
   - Mask before AI processing
   - Configurable patterns

4. **Role-Based Access Control**
   - Admin, User, Viewer roles
   - Feature-level permissions
   - Department-level isolation

5. **Compliance Manager**
   - FedRAMP controls mapping
   - HIPAA compliance checks
   - SOC 2 audit trails

6. **Enterprise Deployment**
   - Docker/Kubernetes ready
   - Air-gapped installation
   - High availability support

---

## Geppetto & Agent Jukebox

### Concepts (from Randy)

These are architectural concepts that will be documented but not yet implemented.

### Geppetto - The Orchestrator

**Purpose:** A master orchestration system that coordinates multiple AI agents.

**Architecture:**
```
                    ┌──────────────┐
                    │  Geppetto    │
                    │ Orchestrator │
                    └──────┬───────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
        ▼                  ▼                  ▼
  ┌──────────┐      ┌──────────┐      ┌──────────┐
  │ Security │      │ Research │      │  Code    │
  │  Agent   │      │  Agent   │      │  Agent   │
  └──────────┘      └──────────┘      └──────────┘
        │                  │                  │
        ▼                  ▼                  ▼
  ┌──────────┐      ┌──────────┐      ┌──────────┐
  │  Tasks   │      │   Web    │      │   Git    │
  │  Tools   │      │  Tools   │      │  Tools   │
  └──────────┘      └──────────┘      └──────────┘
```

**Geppetto Responsibilities:**
- Task distribution to appropriate agents
- Inter-agent communication
- Conflict resolution
- Resource management
- Progress tracking

**Implementation Plan:**
```typescript
interface GeppettoOrchestrator {
  registerAgent(agent: Agent): void;
  assignTask(task: Task): Agent;
  monitorProgress(taskId: string): TaskStatus;
  resolveConflicts(conflict: Conflict): Resolution;
  broadcastMessage(message: Message): void;
}
```

---

### Agent Jukebox - Agent Repository

**Purpose:** A repository/registry of available agents with their capabilities.

**Architecture:**
```
┌─────────────────────────────────────────────────────┐
│                  Agent Jukebox                       │
├─────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────┐│
│  │              Agent Registry                      ││
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐           ││
│  │  │Security │ │Research │ │  Code   │           ││
│  │  │ Agent   │ │ Agent   │ │ Agent   │           ││
│  │  │v1.2.0   │ │v2.0.1   │ │v1.0.0   │           ││
│  │  └─────────┘ └─────────┘ └─────────┘           ││
│  └─────────────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────────────┐│
│  │              Capability Matcher                  ││
│  │  Query: "I need to scan code for vulnerabilities"│
│  │  Match: Security Agent + Code Agent             ││
│  └─────────────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────────────┐│
│  │              Performance Metrics                 ││
│  │  Agent success rates, latency, accuracy         ││
│  └─────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────┘
```

**Agent Manifest Schema:**
```typescript
interface AgentManifest {
  id: string;
  name: string;
  version: string;
  description: string;
  capabilities: string[];
  dependencies: string[];
  resourceRequirements: {
    memory: string;
    cpu: string;
    gpu?: boolean;
  };
  endpoints: {
    execute: string;
    status: string;
    results: string;
  };
  author: string;
  license: string;
}
```

**Jukebox Operations:**
```typescript
interface AgentJukebox {
  register(manifest: AgentManifest): void;
  unregister(agentId: string): void;
  query(capabilities: string[]): AgentMatch[];
  deploy(agentId: string, config: AgentConfig): DeploymentResult;
  update(agentId: string, version: string): void;
  getMetrics(agentId: string): AgentMetrics;
}
```

---

### Integration: Geppetto + Jukebox

```
User Request: "Scan my codebase for security vulnerabilities and fix them"

                    ┌──────────────┐
                    │  Geppetto    │
                    │ Orchestrator │
                    └──────┬───────┘
                           │
                    1. Query Jukebox for capable agents
                           │
                           ▼
              ┌────────────────────────┐
              │    Agent Jukebox       │
              │                        │
              │  Capabilities needed:  │
              │  - security_scan       │
              │  - code_modification   │
              │                        │
              │  Matches:              │
              │  - Security Agent      │
              │  - Code Agent          │
              └────────────┬───────────┘
                           │
                    2. Deploy agents
                           │
        ┌──────────────────┴──────────────────┐
        │                                      │
        ▼                                      ▼
  ┌──────────┐                         ┌──────────┐
  │ Security │  3. Scan codebase       │  Code    │
  │  Agent   │ ─────────────────────▶  │  Agent   │
  └──────────┘                         └──────────┘
        │                                      │
        │  4. Found 5 vulnerabilities          │
        │                                      │
        └──────────────────────────────────────┘
                           │
                    5. Apply fixes
                           │
                           ▼
                    ┌──────────────┐
                    │   Results    │
                    │  - 5 fixed   │
                    │  - 0 failed  │
                    └──────────────┘
```

---

## Deployment Guide

### Development

```bash
# Install dependencies
npm install

# Start Ollama (required)
ollama serve

# Pull models
ollama pull glm-5
ollama pull qwen2.5-coder

# Start development
npm run dev
```

### Production

```bash
# Build
npm run build

# Start production
npm start

# Or use PM2
pm2 start npm --name "ai-dashboard" -- start
```

### Docker (Future)

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

### Air-Gapped Deployment

1. Pre-download Ollama models on connected machine
2. Export models: `ollama save glm-5 > glm-5.tar`
3. Transfer to air-gapped machine
4. Import: `ollama load < glm-5.tar`
5. Deploy AI Dashboard

---

## Future Roadmap

### Phase 1: Complete Core (Done ✅)
- [x] SQLite persistence
- [x] Security Agent with real scanning
- [x] Telegram integration
- [x] OpenCode integration
- [x] Task Scheduler
- [x] Brand Workspace

### Phase 2: Enterprise Features (GovBotics)
- [ ] Audit logging
- [ ] SSO/SAML integration
- [ ] Role-based access control
- [ ] Data masking
- [ ] Compliance manager

### Phase 3: Advanced Agents
- [ ] Geppetto orchestrator
- [ ] Agent Jukebox registry
- [ ] Multi-agent workflows
- [ ] Agent marketplace

### Phase 4: Desktop & Deployment
- [ ] Tauri desktop wrapper
- [ ] Docker/Kubernetes setup
- [ ] High availability config
- [ ] Backup/restore system

---

## Book: Building Your Own AI Assistant

### Proposed Title
**"Building Your Own AI Assistant: A Complete On-Premise System"**

### License
Creative Commons Attribution 4.0 (CC BY 4.0)
- Free to share and adapt
- Commercial use allowed
- Attribution required
- Free on Amazon Kindle

### Target Audience
- Government IT managers
- Healthcare IT teams
- Financial institutions
- Privacy-conscious organizations
- AI enthusiasts

### Chapter Outline

1. **Introduction**
   - Why on-premise AI?
   - Cost comparison: Cloud vs. Local
   - Who this book is for

2. **Getting Started**
   - Hardware requirements
   - Installing Ollama
   - Model selection guide

3. **Core Architecture**
   - Next.js + TypeScript setup
   - SQLite for persistence
   - API design patterns

4. **Building the Chat Interface**
   - React components
   - Message streaming
   - Context management

5. **Adding AI Capabilities**
   - Tool use patterns
   - Web search integration
   - Document processing

6. **Security & Compliance**
   - Vulnerability scanning
   - Audit logging
   - Data masking

7. **On-Premise Deployment**
   - Air-gapped installation
   - Docker containerization
   - High availability setup

8. **Enterprise Extensions**
   - SSO integration
   - Role-based access
   - FedRAMP compliance

9. **Advanced Features**
   - Geppetto orchestrator
   - Agent Jukebox
   - Self-improving systems

10. **Case Studies**
    - Government agency deployment
    - Hospital system implementation
    - Bank AI assistant

### Appendix A: GovBotics Architecture
- Commercial extensions
- Enterprise features
- Support model

### Appendix B: OpenClaw Comparison
- Different use cases
- Integration possibilities
- When to use each

---

## Contact & Resources

### Key Files Reference

| Purpose | File |
|---------|------|
| Main Chat | `src/app/page.tsx` |
| Security Agent | `src/lib/agent/security-agent.ts` |
| Task Scheduler | `src/lib/services/task-scheduler.ts` |
| OpenCode Agent | `src/lib/agent/opencode-agent.ts` |
| Database | `src/lib/database/sqlite.ts` |
| AI SDK | `src/lib/models/sdk.server.ts` |
| Telegram Service | `src/lib/integrations/telegram.ts` |
| Brand Workspace | `src/lib/services/brand-workspace.ts` |

### Data Files

| Purpose | Location |
|---------|----------|
| User Preferences | `data/user-preferences.json` |
| Feature Requests | `data/feature-requests.json` |
| Security Reports | `data/security.db.json` |
| SQLite Database | `data/database.sqlite` |

---

*Last Updated: 2026-02-27*