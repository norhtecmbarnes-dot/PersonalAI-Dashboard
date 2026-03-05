# AI Dashboard - Implementation Documentation

## Table of Contents
1. [Brand Workspace (NotebookLM-Style)](#brand-workspace)
2. [Telegram Integration](#telegram-integration)
3. [AI Provider Agnostic Routing](#ai-provider-routing)
4. [Command Menu Integration](#command-menu)
5. [Main Chat Integration](#main-chat-integration)

---

## Brand Workspace (NotebookLM-Style)

### Overview
The Brand Workspace provides a NotebookLM-style document organization system where users can:
- Create **Brands** (e.g., Digantara) with company information
- Create **Projects** under each Brand (e.g., NASA Satellite Bid)
- Upload documents to either **Brand Voice** (shared) or **Project** (specific)
- Chat with AI using combined Brand Voice + Project document context

### Architecture

#### Data Model
```
Brand (Digantara)
├── Brand Voice Documents (shared across all projects)
│   ├── Company overview
│   ├── Brand guidelines
│   └── URLs/resources
│
├── Project 1 (NASA Satellite Bid)
│   ├── Project Documents (specific to this project)
│   │   ├── RFP.pdf
│   │   ├── Technical specs.docx
│   │   └── Quote requirements
│   └── Chat Sessions
│
└── Project 2 (Other Bid)
    └── Project Documents
```

#### Key Components

**Types** (`src/types/brand-workspace.ts`):
- `Brand` - Company profile with voice settings
- `Project` - Project-specific data
- `BrandDocument` - Document with source ('brand' or 'project')
- `ChatSession` - Conversation context tracking

**Service** (`src/lib/services/brand-workspace.ts`):
- `createBrand()` - Create new brand
- `createProject()` - Create project under brand
- `addDocument()` - Upload to brand or project
- `buildContextForChat()` - Combines brand voice + project docs

**Context Building**:
```typescript
// Automatically includes both Brand Voice and Project documents
const context = await buildContextForChat(brandId, projectId);
// Returns: systemPrompt + documents array
```

### UI Features

**Brand Workspace Page** (`/brand-workspace`):
- Two-section document view:
  - **Brand Voice Documents** (purple styling) - Shared across all projects
  - **Project Documents** (blue styling) - Specific to current project
- Upload toggle: "To Project" or "To Brand Voice"
- Chat interface with automatic context

**Visual Indicators**:
- Purple gradient cards = Brand Voice documents
- Gray cards = Project documents
- Chat header shows: "X sources available (Y brand, Z project)"

### Usage Workflow

1. **Create Brand**: Navigate to `/brand-workspace`, click "New Brand"
2. **Add Brand Voice**: Upload company info, URLs (select "To Brand Voice")
3. **Create Project**: Under the brand, click "New Project"
4. **Add Project Docs**: Upload RFPs, specs (select "To Project")
5. **Start Chat**: Chat automatically uses Brand Voice + Project context

---

## Telegram Integration

### Overview
A sample implementation of external platform integration. Telegram serves as the reference implementation - the same pattern can be applied to Notion, Slack, WhatsApp, etc.

### Architecture

**Integration Pattern**:
```
External Platform (Telegram)
    ↓
Webhook/Polling Handler
    ↓
AI Service (using user's preferred model)
    ↓
Response back to Platform
```

### Components

**1. Service Layer** (`src/lib/integrations/telegram.ts`):
```typescript
class TelegramService {
  - setConfig(config)           // Configure bot token
  - startPolling()              // Poll for messages
  - stopPolling()               // Stop polling
  - sendMessage()               // Send response
  - getUpdates()                // Fetch new messages
  - isUserAllowed(userId)       // Authorization check
}
```

**2. Configuration** (`src/lib/storage/telegram-config.ts`):
- Stores config in database (unified with user preferences)
- Not in separate file (consolidated storage)
- Fields: botToken, enabled, webhookUrl, allowedUsers

**3. Handlers**:
- `src/app/api/telegram/polling/route.ts` - Polling mode handler
- `src/app/api/telegram/route.ts` - Webhook handler
- `src/app/api/telegram/config/route.ts` - Configuration API

**4. UI Page** (`/telegram`):
- Bot token input
- Enable/disable toggle
- Start/Stop polling buttons
- Webhook configuration
- Allowed users management

### AI Integration

**Model Selection** (provider agnostic):
```typescript
// Uses whatever AI provider the user has configured
const model = modelPrefs.defaultModel || autoSelectAvailable();
// Supports: Ollama, GLM, OpenRouter, etc.
```

**Response Flow**:
1. Receive message from Telegram
2. Check user authorization
3. Get AI response using user's preferred model
4. Send response back to Telegram

### Setup Instructions

1. **Get Bot Token**: Message @BotFather on Telegram, create new bot
2. **Configure**: Go to `/telegram`, enter bot token
3. **Enable**: Check "Enable Telegram Bot"
4. **Start**: Click "Start Polling" (or "Set Webhook")
5. **Chat**: Message your bot on Telegram!

### Available Commands

- `/start` - Welcome message
- `/help` - Show commands
- `/status` - System status
- `/search <query>` - Web search
- Any other text → AI chat response

---

## AI Provider Agnostic Routing

### Overview
The system dynamically routes AI requests to whatever provider the user has configured:
- **Local**: Ollama (qwen2.5-coder, llama3.2, etc.)
- **Cloud**: GLM (glm-4.7-flash, glm-5:cloud)
- **Third-party**: OpenRouter, DeepSeek, etc.

### Implementation

**SDK Routing** (`src/lib/models/sdk.server.ts`):
```typescript
chatCompletion({
  model: 'ollama/qwen2.5-coder',  // Or any configured model
  messages: [...]
});
// SDK automatically routes to correct provider based on model prefix
```

**Provider Detection**:
- `ollama/*` → Local Ollama instance
- `glm-*` or `glm/*` → GLM Cloud API
- `openrouter/*` → OpenRouter API
- No prefix → Check availability and route accordingly

**Fallback Chain**:
1. Use user's default model preference
2. If unavailable, try local Ollama models
3. If no local models, try cloud GLM
4. Final fallback: error message

### Configuration

Users set their preference via:
- Settings UI (`/settings`)
- Database stored in `model_preferences`
- Supports: defaultModel, autoRoute, preferLocal, cloudForChat

---

## Command Menu Integration

### Overview
The `/` command menu in main chat provides quick access to features.

### Brand Commands

**Added Commands**:
- `/brand` - Navigate to Brand Workspace
- `/brand-chat` - Quick access to brand chat

**Implementation** (`src/components/CommandMenu.tsx`):
```typescript
COMMANDS = [
  { name: '/brand', description: 'Open Brand Workspace', action: 'brand_workspace', icon: '🏢' },
  { name: '/brand-chat', description: 'Chat with Brand Voice', action: 'brand_chat', icon: '💬' },
  // ... other commands
]
```

**Handler** (`src/app/page.tsx`):
```typescript
case 'brand_workspace':
  window.location.href = '/brand-workspace';
  break;
case 'brand_chat':
  window.location.href = '/brand-chat';
  break;
```

---

## Main Chat Integration

### Overview
Brand Voice selector added to main chat UI for quick brand context.

### Components

**BrandVoiceSelector** (`src/components/BrandVoiceSelector.tsx`):
- Dropdown of available brands
- Shows brand voice details (tone, style, key messages)
- "Manage" link to Brand Workspace

**Integration** (`src/app/page.tsx`):
```typescript
// In the Model/Expert section
<BrandVoiceSelector 
  onBrandSelect={setSelectedBrandId}
  selectedBrandId={selectedBrandId}
/>
```

**Features**:
- Select brand from dropdown
- View voice profile details
- Clear selection
- Link to manage brands

---

## Database Schema

### Brand Workspace Tables

**brands_v2**:
- id, name, description, industry, website, logo
- voice_profile (JSON: tone, style, keyMessages, avoidPhrases)
- settings (JSON: defaultModel, temperature)
- tags, created_at, updated_at

**projects_v2**:
- id, brand_id, name, description
- type, status, requirements, deliverables
- deadline, metadata, tags
- created_at, updated_at

**brand_documents**:
- id, brand_id, project_id (nullable)
- title, type, source ('brand' or 'project')
- content, compacted_content
- metadata (JSON), vectorized
- created_at, updated_at

**chat_sessions**:
- id, project_id, brand_id, title
- messages (JSON array)
- context (JSON: brandDocumentsUsed, projectDocumentsUsed)
- created_at, updated_at

### User Preferences

Stored as JSON in documents table (category: 'user_preference'):
```json
{
  "userName": "John",
  "assistantName": "AI Assistant",
  "telegram": {
    "botToken": "...",
    "enabled": true,
    "allowedUsers": []
  },
  "apiKeys": {
    "openrouter": "...",
    "deepseek": "..."
  }
}
```

---

## Testing

### Brand Workspace
1. Navigate to `/brand-workspace`
2. Create a brand (e.g., "TestCorp")
3. Upload document with "To Brand Voice" selected
4. Create project under the brand
5. Upload document with "To Project" selected
6. Start chat - verify both contexts appear

### Telegram
1. Create bot with @BotFather
2. Go to `/telegram`
3. Enter bot token
4. Click "Save Configuration"
5. Click "Start Polling"
6. Send message to bot on Telegram
7. Verify AI response uses correct model

### Build Verification
```bash
npm run build
# Should complete without errors
```

---

## Future Enhancements

### Other Platform Integrations
Apply the Telegram pattern to:
- **Notion** - Read/write pages, databases
- **Slack** - Channel messages, direct messages
- **WhatsApp** - WhatsApp Business API
- **Discord** - Bot integration
- **Email** - IMAP/SMTP integration

### Brand Workspace Enhancements
- Document templates
- Collaborative editing
- Version history
- Export to various formats
- Integration with external storage (Google Drive, Dropbox)

---

## Files Modified/Created

### Brand Workspace
- `src/types/brand-workspace.ts` - Type definitions
- `src/lib/services/brand-workspace.ts` - Service layer
- `src/app/brand-workspace/page.tsx` - UI implementation
- `src/app/api/brand-workspace/brands/route.ts` - Brand API
- `src/app/api/brand-workspace/projects/route.ts` - Project API
- `src/app/api/brand-workspace/chat/route.ts` - Chat API

### Telegram
- `src/lib/integrations/telegram.ts` - Telegram service
- `src/lib/storage/telegram-config.ts` - Config storage
- `src/app/api/telegram/route.ts` - Webhook handler
- `src/app/api/telegram/polling/route.ts` - Polling handler
- `src/app/api/telegram/config/route.ts` - Config API
- `src/app/telegram/page.tsx` - UI page

### Main Chat Integration
- `src/components/CommandMenu.tsx` - Added /brand, /brand-chat commands
- `src/components/BrandVoiceSelector.tsx` - Brand selector component
- `src/app/page.tsx` - Integrated BrandVoiceSelector

### Database
- SQLite tables: `brands_v2`, `projects_v2`, `brand_documents`, `chat_sessions`

---

## Key Design Decisions

1. **Unified Storage**: Telegram config stored in user preferences (not separate file)
2. **Provider Agnostic**: AI routing uses whatever model user configured
3. **Context Combination**: Chat automatically combines Brand Voice + Project docs
4. **Visual Distinction**: Purple for Brand Voice, blue for Project docs
5. **Extensible Pattern**: Telegram serves as template for other integrations

---

*Last Updated: 2026-03-03*
