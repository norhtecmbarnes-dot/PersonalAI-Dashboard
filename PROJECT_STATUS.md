# AI Research Assistant Project - Documentation

## Project Overview
A web-based AI research assistant with modular architecture, supporting both "out of the box" usage and customizable features with user-provided API keys.

## Work Documentation - Version 5.15

### Latest Changes (March 1, 2026)

#### Fixed Issues
1. **Chat API** - Fixed `[object Object]` response bug by properly extracting message content from `chatCompletion` result
2. **Writing API** - Switched from `streamChatCompletion` to `chatCompletion` for reliable non-streaming responses  
3. **Canvas API** - Fixed result extraction, now generates proper HTML dashboards
4. **Office Integration** - Added real document generation with `docx`, `xlsx`, `pptxgenjs` libraries
5. **Document Downloads** - Fixed download route to serve actual Office files
6. **Telegram Config** - Fixed database storage to use `getDocuments()` instead of `getNotes()`
7. **Book Writer** - Fixed corrupted code in `book-writer.ts`

#### New Features
1. **ONLYOFFICE Editor Integration** - Full in-browser editing via `/office/editor` connecting to ONLYOFFICE Document Server
2. **Document Generator Service** - Creates real `.docx`, `.xlsx`, `.pptx` files
3. **Security Assessment** - Comprehensive security review with findings and recommendations
4. **Function Test Suite** - Automated testing of all major API endpoints

#### What Has Been Completed ✅

#### 1. Project Setup and Configuration
- Created Next.js 14 project structure
- Configured TypeScript with path aliases (@/*)
- Set up Tailwind CSS with dark theme gradient
- Configured PostCSS and Autoprefixer
- Created package.json with all necessary dependencies

#### 2. Frontend Components
- **Main Chat Interface** (`src/app/page.tsx`):
  - User interface for AI chat interactions
  - Real-time message display with user/assistant role differentiation
  - Model selection dropdown with multiple AI model options
  - Ollama health status indicator (online/offline)
  - Loading state indicators
  - Keyboard handling (Enter to send, Shift+Enter for new line)
  - Responsive design with gradient backgrounds

- **Global Styles** (`src/app/globals.css`):
  - Tailwind CSS configuration
  - Dark theme with purple slate gradients
  - Responsive typography settings

- **Layout** (`src/app/layout.tsx`):
  - Next.js root layout with metadata
  - Inter font integration
  - Dark theme configuration

#### 3. Backend API Endpoints
- **Chat API** (`src/app/api/chat/route.ts`):
  - Handles chat message processing
  - Manages conversation history
  - Integrates with AI model for responses

- **Heartbeat API** (`src/app/api/heartbeat/route.ts`):
  - Monitors AI model availability
  - Provides real-time system health status

- **Documents API** (`src/app/api/documents/route.ts`):
  - Document CRUD operations

- **Models API** (`src/app/api/models/route.ts`):
  - Lists available AI models including GLM-4.7-flash
  - Checks Ollama health status

- **Memory API** (`src/app/api/memory/route.ts`):
  - Import and index documents
  - Search vector memory
  - Get context for queries
  - Optimize token usage
  - Sync memory with storage

- **Config API** (`src/app/api/config/route.ts`):
  - Feature management
  - API key management
  - Settings management
  - Configuration export/import

- **System API** (`src/app/api/system/route.ts`):
  - System startup/shutdown
  - Status monitoring
  - Health checks
  - Service management

#### 4. Configuration System
- **Feature Flags** (`src/lib/config/features.ts`):
  - Modular feature system
  - Enable/disable features
  - Feature dependencies
  - Category-based organization

- **App Config** (`src/lib/config/app-config.ts`):
  - API key management for providers
  - Out-of-the-box vs custom mode
  - Settings management
  - Config export/import

- **Plugin System** (`src/lib/config/plugins.ts`):
  - Plugin registration
  - Plugin lifecycle management
  - Feature-based plugin loading

#### 5. Supporting Libraries and Utilities
- **Model SDK Server** (`src/lib/models/sdk.server.ts`):
  - Server-side SDK for API routes
  - Chat completion and streaming
  - Model listing and health checking
  - Get Ollama models (real-time)
  - External model support (GLM, OpenRouter, DeepSeek)

- **Web Search Integration** (`src/lib/websearch.ts`):
  - Research features for enhanced AI capabilities

#### 6. Document & Knowledge Management
- **Document Storage** (`src/lib/storage/documents.ts`):
  - Import documents (TXT, MD, JSON, CSV, XML)
  - Auto-categorize by type
  - Store tags, metadata, and summary
  - Search and filter functionality

- **Notes Storage** (`src/lib/storage/notes.ts`):
  - Create notes with custom categories
  - Add importance levels (low/medium/high)
  - Tag-based organization

- **Vector Store** (`src/lib/storage/vector.ts`):
  - Semantic memory using embeddings
  - Cosine similarity search
  - Context retrieval for queries
  - Conversation history storage
  - Automatic sync with documents and notes

#### 7. Expert Agents System
- **Expert Storage** (`src/lib/storage/experts.ts`):
  - Pre-prompted expert agents (Legal, Finance, HR, Sales, Research, Marketing)
  - Each expert has specialized prompts and capabilities

#### 8. Self-Improving Agent
- **Agent System** (`src/lib/agent/self-improvement.ts`):
  - Analyzes and improves its own code
  - Only modifies files in root directory
  - Security rules to prevent dangerous operations
  - Performance metrics tracking
  - Improvement logging

#### 9. Token Optimization
- **Token Optimizer** (`src/lib/utils/tokens.ts`):
  - Estimate token usage
  - Compress messages
  - Optimize context within token limits
  - Summarize long content
  - Cost estimation

- **System Manager** (`src/lib/system/manager.ts`):
  - System startup/shutdown
  - Service lifecycle management
  - Health check monitoring
  - Graceful shutdown hooks

#### 10. UI Components
- **DocumentManager** - Document upload UI
- **MarkdownRenderer** - Proper text formatting
- **ExpertExplorer/ExpertChat/ExpertProfile** - Expert components
- **SystemControls** - Start/shutdown, model selection
- **SAMGovIntegration** - SAM.gov opportunities search

#### 13. Database & Information Management
- **SQLite Database** (`src/lib/database/sqlite.ts`):
  - SQL database using sql.js (pure JavaScript SQLite)
  - Persistent storage in `data/assistant.db`
  - Contacts management (add, update, delete, search)
  - Calendar events management
  - Tasks with priorities and due dates
  - Notes with categories and tags
  - Activity logging
  - Raw data storage for processing
  - Full-text search across all data
  - Export/import functionality

- **Database Initialization** (`src/lib/database/init.js`):
  - Database schema creation
  - Table and index setup
  - Run with `npm run db:init`

#### 14. Vector Lake (Smart Cache)
- **Vector Lake** (`src/lib/storage/vector-lake.ts`):
  - Intelligent query caching system
  - Uses embeddings to find similar queries
  - LLM generates search terms from user questions
  - Performs searches and caches results
  - Organizes search results into SQL database
  - Tracks access counts for frequently asked questions
  - 30-day cache expiry with automatic cleanup

- **Vector Lake API** (`src/app/api/vector-lake/route.ts`):
  - Search with vector lake processing
  - Save organized data to SQL
  - Get statistics and popular/recent queries
  - Clear expired entries

- **Chat Integration** (`src/app/api/chat/route.ts`):
  - Optional `useVectorLake` flag in chat requests
  - Returns vector lake data with responses

- **Data Processor** (`src/lib/database/processor.ts`):
  - LLM-powered email/message processing
  - Extract contacts from emails
  - Identify events and meetings
  - Create tasks from action items
  - Generate summaries
  - Extract important dates
  - Activity logging

- **Database API** (`src/app/api/database/route.ts`):
  - CRUD operations for all data types
  - Process emails/messages with LLM
  - Generate activity summaries
  - Search and statistics

- **Data Manager UI** (`src/components/DataManager.tsx`):
  - Dashboard with stats
  - Contacts list
  - Tasks with completion toggle
  - Events calendar view
  - Notes with categories

#### 14. Documentation
- **Startup Guide** (`docs/STARTUP.md`):
  - Installation instructions
  - Starting/stopping system
  - Troubleshooting
  - Environment variables
  - Production deployment

#### 11. Security Measures
- Path restrictions (only root directory)
- Pattern blocking for dangerous operations
- Content validation
- API key protection rules

#### 12. SAM.gov Integration
- **SAM.gov Service** (`src/lib/integrations/sam-gov.ts`):
  - SAM.gov API integration for government contracting opportunities
  - Keyword-based search queries
  - API key management with 90-day rotation
  - Expiring key warnings
  - Search query management (add, pause, resume, delete)
  - Results storage and filtering

- **SAM API** (`src/app/api/sam/route.ts`):
  - Add/remove/rotate API keys
  - Manage search queries
  - Run searches
  - Get opportunities

- **SAM.gov UI** (`src/components/SAMGovIntegration.tsx`):
  - Search query management interface
  - Opportunity listings with filters
  - API key status display

#### 13. Telegram Integration
- **Telegram Service** (`src/lib/integrations/telegram.ts`):
  - Telegram Bot API integration
  - Message send/receive
  - Webhook management
  - Bot commands registration
  - User authorization

- **Telegram API** (`src/app/api/telegram/route.ts`):
  - Webhook handler for incoming messages
  - AI chat processing
  - Web search via Telegram
  - Status and help commands

- **Telegram Config API** (`src/app/api/telegram/config/route.ts`):
  - Bot token configuration
  - Webhook setup
  - Connection testing
  - Bot info retrieval

- **Telegram Page** (`src/app/telegram/page.tsx`):
  - Bot connection status
  - Configuration UI
  - User whitelist management
  - Setup instructions

#### 15. Feature Request System (OpenCode Integration)
- **Feature Request Component** (`src/components/FeatureRequest.tsx`):
  - UI for submitting feature requests
  - View existing requests and their status
  - Direct "Implement with OpenCode" button
  - Simplified flow (no approval step)

- **Feature Request API** (`src/app/api/features/request/route.ts`):
  - Create new feature requests
  - Direct OpenCode execution (no LLM in middle)
  - Execute features with full authorization context
  - Path restrictions for security

- **OpenCode Agent** (`src/lib/agent/opencode-agent.ts`):
  - Spawn OpenCode as sub-agent for implementation
  - Execute tasks with timeout (10 minutes for complex features)
  - Track modified files
  - Secure execution with path restrictions

- **Features Page** (`src/app/features/page.tsx`):
  - Main UI for feature request system

- **How It Works**:
  1. Submit feature request (title + description)
  2. Click "Implement with OpenCode"
  3. OpenCode explores codebase and implements directly
  4. No LLM proposal step - direct execution
  5. Cost efficient: cheap models for chat, capable model only for building

#### 16. Note Taking System
- **Note Editor Component** (`src/components/NoteEditor.tsx`):
  - Rich text note editing modal
  - Title, content, category, and tags
  - Preview mode
  - Word/character count
  - LLM-powered contextualization on save
  - Export to ICS calendar format
  - Notes list with search and filtering

- **Notes Page** (`src/app/notes/page.tsx`):
  - Browse and manage all notes
  - Create, edit, delete notes
  - Category and tag filtering

- **Note Contextualization API** (`src/app/api/notes/contextualize/route.ts`):
  - LLM analyzes note content
  - Extracts relevant tags
  - Identifies category
  - Detects linked contacts
  - Generates summary

#### 17. Calendar System
- **Calendar Components** (`src/components/Calendar.tsx`):
  - CalendarView - Monthly calendar grid
  - EventEditor - Create/edit events modal
  - UpcomingEvents - List of upcoming events
  - Event details: title, description, location, attendees
  - ICS file generation for calendar export

- **Calendar Page** (`src/app/calendar/page.tsx`):
  - Monthly calendar view
  - Event creation and management
  - Upcoming events sidebar
  - Export instructions

- **ICS Generation**:
  - Download .ics files for:
    - Microsoft Outlook
    - Google Calendar
    - Apple Calendar
    - Any iCalendar compatible app

#### 18. Enhanced Document Management
- **Document Processor** (`src/lib/storage/document-processor.ts`):
  - Multi-format document support: PDF, Word (DOCX), TXT, MD, CSV, JSON, XML, HTML
  - Automatic document type detection
  - LLM-powered contextualization and summarization
  - Importance evaluation for weekly briefing (critical/high/medium/low)
  - Vector embeddings for semantic search
  - Chat with documents functionality

- **Enhanced Document Manager** (`src/components/EnhancedDocumentManager.tsx`):
  - File upload with format support
  - Remember/Forget toggle for persistent storage
  - Document list with importance indicators
  - Search functionality
  - Chat interface for each document
  - Content preview

- **Document Import API** (`src/app/api/documents/import/route.ts`):
  - Multi-format file parsing
  - Automatic vectorization
  - Contextualization and tagging
  - Importance evaluation
  - Storage in SQLite database

- **Document Chat API** (`src/app/api/documents/chat/route.ts`):
  - Question answering about documents
  - Context-aware responses using LLM

- **Weekly Briefing**:
  - Auto-generated briefing from important documents
  - Priority-based sorting (critical, high, medium, low)
  - Key points extraction

- **Documents Page** (`src/app/documents/page.tsx`):
  - Full document management interface
  - Import, search, chat, briefing features

#### 19. Workspace Organization
- **Folder System**:
  - Create folders and subfolders for organizing documents
  - Hierarchical structure
  - Color coding

- **Brand/Identity Profiles**:
  - Build knowledge base about companies or people
  - Store brochures, weblinks, and information
  - Contact information
  - Notes and tags
  - Reference for proposals

- **Projects**:
  - Working sets for RFPs, quotes, proposals
  - Link to brand profiles
  - Link to folders
  - Status tracking (active, completed, archived)

- **Workspace API**:
  - `/api/folders` - Folder CRUD operations
  - `/api/brands` - Brand profile management
  - `/api/projects` - Project management

- **Workspace Manager** (`src/components/WorkspaceManager.tsx`):
  - Tab-based interface for folders, brands, projects, documents
  - Create and manage all workspace items
  - View details and relationships

- **Workspace Page** (`src/app/workspace/page.tsx`):
  - Full workspace organization interface

#### 20. OCR & Image Recognition
- **OCR API** (`src/app/api/ocr/route.ts`):
  - Tesseract.js integration for client-side OCR
  - Supports PNG, JPG, and other image formats
  - Returns text, confidence score, and word-level data

- **OCR in Chat Interface** (`src/app/page.tsx`):
  - Image upload button in chat input area
  - Automatic text extraction from images
  - Extracted text populates chat input

#### 21. Intelligence Report Generator
- **Intelligence Service** (`src/lib/intelligence/report-generator.ts`):
  - Automated daily intelligence scanning
  - News monitoring on:
    - Space Domain Awareness (SDA)
    - Commercial Space
    - NOAA Office of Commercial Space
    - Joint Commercial Office
    - Golden Dome (missile defense)
  - Key individual identification from news articles
  - LinkedIn profile search links generation

- **Bid Opportunity Scanning**:
  - **SAM.gov Integration**:
    - Daily searches for space, missile defense, EO payloads
    - Keywords: space domain awareness, SDA, SSA, electro-optical, missile defense
  - **Canada Buys Integration** (`src/lib/integrations/canada-buys.ts`):
    - Missile defense opportunities
    - Space domain awareness
    - Electro-optical payloads
    - Satellite surveillance

- **Intelligence API** (`src/app/api/intelligence/route.ts`):
  - Generate reports on demand
  - View report history
  - Get latest report

- **Intelligence Page** (`src/app/intelligence/page.tsx`):
  - News browsing by category
  - Key people with LinkedIn links
  - Bid opportunities from SAM.gov and Canada Buys
  - Generate new report button

- **Heartbeat Integration** (`src/app/api/heartbeat/route.ts`):
  - Auto-generates intelligence report every 24 hours
  - Can be triggered manually with `?intelligence=true`

- **Command Menu** (`src/components/CommandMenu.tsx`):
  - New `/intelligence` command
  - Navigates to intelligence dashboard
  - `/documents` command now navigates to documents page

#### 22. Brand Voice Chat (NotebookLM-style)
- **Brand Voice System**:
  - Each brand can have its own voice/persona
  - Voice styles: professional, casual, technical, friendly, formal
  - Custom system prompts for brand-specific instructions
  - Industry classification
  - Persona description for tone

- **Brand Documents**:
  - Assign documents to specific brands
  - Each brand has its own document library
  - Documents used as context in brand chats

- **Brand Chat API** (`src/app/api/brand-chat/route.ts`):
  - Chat with specific brand's voice and documents
  - System prompt includes brand persona and instructions
  - Documents are injected as context for answering

- **Brand Chat Page** (`src/app/brand-chat/page.tsx`):
  - Select brand from list
  - Chat interface with brand's identity
  - Shows voice style, industry, document count
  - AI uses brand's documents and voice settings

- **Workspace Integration** (`src/components/WorkspaceManager.tsx`):
  - Configure brand voice (persona, style, instructions)
  - Add/remove documents to brands
  - Visual indicators for brands with voice configured

#### 23. Self-Reflection System
- **Self-Reflection Service** (`src/lib/agent/self-reflection.ts`):
  - LLM analyzes its own capabilities and gaps
  - Identifies system inefficiencies
  - Generates improvement suggestions
  - Recommends new tools/features
  - Provides model usage recommendations
  - Runs every 6 hours via heartbeat

- **Self-Reflection API** (`src/app/api/self-reflection/route.ts`):
  - Run self-analysis on demand
  - View report history
  - Get latest analysis

- **Self-Reflection Page** (`src/app/self-reflection/page.tsx`):
  - Overall system health score (0-100)
  - Current capabilities display
  - Identified gaps and inefficiencies
  - Prioritized suggestions
  - Tool/feature recommendations
  - Model recommendations

- **Heartbeat Integration**:
  - Auto-runs self-reflection every 6 hours
  - Can be triggered manually with `?reflection=true`

- **Command Menu**:
  - `/reflect` command navigates to self-reflection page

#### 24. Math Tools
- **Math Tools Library** (`src/lib/utils/math-tools.ts`):
  - Using mathjs library
  - Basic calculations (evaluate, simplify)
  - Derivatives
  - Matrix operations (create, inverse, multiply)
  - Vector operations (dot product, cross product)

- **Math API** (`src/app/api/tools/math/route.ts`):
  - All math operations accessible via API
  - `/math` command in chat

#### 25. Security Agent
- **Security Agent** (`src/lib/agent/security-agent.ts`):
  - Periodic vulnerability scanning
  - Checks for: prompt injection, command injection, SQL injection, XSS
  - Environment variable exposure
  - API key exposure
  - Best practice recommendations
  - Risk score (0-100)
  - Runs every 12 hours via heartbeat

- **Security API** (`src/app/api/security/route.ts`):
  - Run security scans on demand
  - View scan history

- **Security Page** (`src/app/security/page.tsx`):
  - Display findings by severity
  - Risk score visualization
  - Recommendations

#### 26. Book Writer
- **Book Writer Service** (`src/lib/agent/book-writer.ts`):
  - Auto-generating "Building Your Own AI Research Assistant"
  - 25+ chapters covering everything from basics to enterprise
  - Includes prompt templates, development environments, scaling
  - Credits to Randolph Hill (GovBotics)
  - Runs every 2 hours via heartbeat

- **Book Writer API** (`src/app/api/book-writer/route.ts`):
  - Initialize, write chapters, export book
  - Export to Markdown

- **Book Writer Page** (`src/app/book-writer/page.tsx)`:
  - View chapter progress
  - Write individual chapters
  - Export full book

#### 27. User Preferences & Setup
- **User Preferences Service** (`src/lib/config/user-preferences.ts`):
  - Store user name and assistant name
  - Personalized system prompts
  - Stored in localStorage

- **User API** (`src/app/api/user/route.ts`):
  - Setup, update, check preferences

- **Setup Page** (`src/app/setup/page.tsx`):
  - First-run wizard
  - Collects user name and assistant name
  - Redirects if not completed

- **Personalized System Prompt**:
  - Uses {{USER_NAME}} and {{ASSISTANT_NAME}} placeholders
  - Greeting personalized for each user

#### 28. MEMORY.md System
- **Memory File Service** (`src/lib/services/memory-file.ts`):
  - Structured persistent memory across sessions
  - Stores user profile, preferences, projects, brands
  - Knowledge base with importance levels
  - Conversation context and action items
  - Auto-generated system prompts for AI context

- **Memory File API** (`src/app/api/memory-file/route.ts`):
  - CRUD operations for memory sections
  - Import/export MEMORY.md
  - System prompt generation

- **Memory Page** (`src/app/memory/page.tsx`):
  - View and edit user profile
  - Manage projects and brands
  - Add knowledge entries
  - Edit SOUL.md (AI personality)

- **SOUL.md**:
  - Defines AI personality and behavior
  - Customizable behavioral guidelines
  - Capability declarations
  - Limitations documentation

#### 29. Canvas/A2UI System
- **Canvas Service** (`src/lib/services/canvas.ts`):
  - AI-generated interactive UI components
  - Templates: cards, tables, forms, charts, lists, timelines, metrics
  - Natural language to component generation
  - Responsive grid layouts
  - HTML/Chart.js output

- **Canvas API** (`src/app/api/canvas/route.ts`):
  - Generate layout from description
  - Add/remove/update components
  - Render to HTML
  - Template listing

- **Canvas Page** (`src/app/canvas/page.tsx`):
  - Natural language UI description
  - Live preview in iframe
  - Quick templates (Dashboard, Form, Charts, etc.)
  - Download generated HTML
  - Layout details panel

#### 30. ONLYOFFICE Integration
- **OnlyOffice Service** (`src/lib/integrations/onlyoffice.ts`):
  - Document creation (Word, Excel, PowerPoint)
  - Spreadsheet data operations
  - Presentation slide generation
  - AI-powered document generation from prompts
  - Callback handling for document saves

- **OnlyOffice Documents API** (`src/app/api/onlyoffice/documents/route.ts`):
  - Create, list, get, delete documents
  - Generate documents from AI prompts
  - Append text and spreadsheet data
  - Store documents in SQLite

- **OnlyOffice AI Proxy** (`src/app/api/onlyoffice/ai/route.ts`):
  - OpenAI-compatible API for ONLYOFFICE AI plugin
  - Supports streaming responses
  - Integrates MEMORY.md context
  - Model selection (GLM, Qwen)

- **Office Page** (`src/app/office/page.tsx`):
  - Create documents (Word, Spreadsheet, Presentation)
  - AI-generated documents from prompts
  - Document list with view/delete

- **Office Config Page** (`src/app/office/config/page.tsx`):
  - ONLYOFFICE AI plugin setup instructions
  - Connection testing
  - Configuration for desktop/server

#### 31. Writing Assistant
- **Writing API** (`src/app/api/writing/route.ts`):
  - Expand: Add detail, examples, depth (2-3x longer)
  - Outline: Create hierarchical outlines
  - Continue: Continue writing naturally
  - Rewrite: Rewrite in different styles
  - Simplify: Make easier to understand
  - Elaborate: Add examples and evidence
  - Structure: Organize with headers and bullets
  - Integrates MEMORY.md context

- **Writing Page** (`src/app/writing/page.tsx`):
  - Action selection (7 writing modes)
  - Style selection for rewrite
  - Model selection
  - Input/output interface
  - Copy and "Use as Input" features

#### Personal Features (Not Part of Out-of-Box)
- **Book Writer** (`src/lib/agent/book-writer.ts`):
  - Personal feature for writing the user manual
  - Auto-generates "Building Your Own AI Research Assistant"
  - 25+ chapters covering everything from basics to enterprise
  - Includes prompt templates, development environments, scaling
  - Credits to Randolph Hill (GovBotics)
  - Runs every 2 hours via heartbeat
  - Export to Markdown

---

### Architecture: Out of the Box Mode

#### Default Features (Enabled)
- **Core**: Chat interface
- **AI**: Ollama integration, GLM-4.7-flash
- **Storage**: Document import, Vector memory, Notes
- **Utility**: Token optimization

#### Extensible Features (Disabled by Default)
- **AI**: OpenRouter, DeepSeek (requires API key)
- **Integration**: Web search (requires API key)
- **Utility**: Self-improving agent

#### Customization
Users can:
1. Add their own API keys (OpenRouter, DeepSeek, etc.)
2. Enable/disable features via config API
3. Import/export configurations
4. LLM can add new features programmatically

---

### File Structure
```
ai_dashboard/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── chat/route.ts
│   │   ├── vector-lake/route.ts
│   │   │   ├── documents/
│   │   │   │   ├── route.ts
│   │   │   │   ├── import/
│   │   │   │   │   └── route.ts
│   │   │   │   └── chat/
│   │   │   │       └── route.ts
│   │   │   ├── heartbeat/route.ts
│   │   │   ├── models/route.ts
│   │   │   ├── memory/route.ts
│   │   │   ├── config/route.ts
│   │   │   ├── system/route.ts
│   │   │   ├── sam/route.ts
│   │   │   ├── database/route.ts
│   │   │   ├── ocr/route.ts
│   │   │   ├── intelligence/route.ts
│   │   │   ├── brand-chat/route.ts
│   │   │   ├── features/
│   │   │   ├── telegram/
│   │   │   │   ├── route.ts
│   │   │   │   └── config/
│   │   │   │       └── route.ts
│   │   │   ├── notes/
│   │   ├── contextualize/
│   │   │   │   └── route.ts
│   │   │   └── page.tsx
│   │   ├── calendar/
│   │   │   └── page.tsx
│   │   ├── workspace/
│   │   │   └── page.tsx
│   │   ├── intelligence/
│   │   │   └── page.tsx
│   │   ├── experts/
│   │   │   ├── page.tsx
│   │   │   └── expert-explorer.css
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/
│   │   ├── ChatMessage.tsx
│   │   ├── DocumentManager.tsx
│   │   ├── ExpertChat.tsx
│   │   ├── ExpertExplorer.tsx
│   │   ├── ExpertProfile.tsx
│   │   └── MarkdownRenderer.tsx
│   ├── lib/
│   │   ├── agent/
│   │   │   ├── self-improvement.ts
│   │   │   ├── opencode-agent.ts
│   │   │   ├── agent-config.json
│   │   │   └── agent-metrics.json
│   │   ├── config/
│   │   │   ├── features.ts
│   │   │   ├── app-config.ts
│   │   │   └── plugins.ts
│   │   ├── database/
│   │   │   ├── sqlite.ts
│   │   │   ├── init.js
│   │   │   └── processor.ts
│   │   ├── storage/
│   │   │   ├── vector.ts
│   │   │   ├── vector-lake.ts
│   │   ├── integrations/
│   │   │   ├── sam-gov.ts
│   │   │   ├── telegram.ts
│   │   │   └── canada-buys.ts
│   │   ├── intelligence/
│   │   │   └── report-generator.ts
│   │   ├── models/
│   │   │   ├── sdk.ts
│   │   │   └── sdk.server.ts
│   │   ├── storage/
│   │   │   ├── documents.ts
│   │   │   ├── experts.ts
│   │   │   ├── knowledge.ts
│   │   │   ├── notes.ts
│   │   │   └── vector.ts
│   │   ├── utils/
│   │   │   ├── id.ts
│   │   │   └── tokens.ts
│   │   └── websearch.ts
│   └── types/
│       ├── index.ts
│       └── ui.ts
├── agent-config.json
├── agent-metrics.json
├── tailwind.config.js
├── tsconfig.json
├── package.json
└── postcss.config.js
```

---

### What Needs to Be Done (Version 4.0) 🔧

#### High Priority
1. **Connect Ollama** - Ensure proper connection to Ollama running locally
2. **Test End-to-End** - Verify all features work together
3. **Create Settings UI** - User interface for managing features and API keys

#### Medium Priority
1. **Expert Chat Integration** - Connect expert chat to AI model API
2. **Notes UI** - Create interface for creating and managing notes
3. **Memory System Integration** - Connect vector store to chat responses

#### Low Priority
1. **Authentication** - Implement user authentication and conversation persistence
2. **Response Streaming** - Enhance chat response streaming for better UX
3. **Testing** - Write unit and integration tests
4. **Deployment Configuration** - Set up production deployment

---

### Version History
- **Version 5.14** - Added Database Form Builder for creating SQLite-connected forms. Added Office AI tools for spreadsheets (analyze, formula, clean, chart, predict, generate) and presentations (bullets, speaker notes, outline, improve, summary). Added System Control page with start/stop all services. Enhanced ONLYOFFICE integration with custom plugin and AI proxy. Connected MEMORY.md to chat for persistent context.
- **Version 5.13** - Added ONLYOFFICE integration with AI plugin support, Writing Assistant (expand, outline, continue, rewrite, simplify, elaborate, structure). AI Dashboard now serves as an AI backend for ONLYOFFICE documents.
- **Version 5.12** - Added MEMORY.md system for structured persistent memory (stores user profile, projects, brands, knowledge entries, conversation context). Added Canvas/A2UI system for AI-generated interactive UI components (dashboards, forms, tables, charts, timelines). Both features adopted from OpenClaw architecture.
- **Version 5.11** - Added Math Tools (mathjs library), Security Agent (periodic vulnerability scanning), User Setup wizard with personalized prompts. Math, Security scanning, and User Preferences integrated into heartbeat and command menu.
- **Version 5.10** - Added Self-Reflection system: LLM periodically analyzes itself to identify gaps, inefficiencies, and improvement suggestions. Auto-runs every 6 hours via heartbeat. Provides overall system health score, tool/feature recommendations, and model usage guidance. Added to heartbeat, command menu, and new UI page.
- **Version 5.9** - Added Intelligence Report Generator with daily space/commercial space news scanning, key individual identification with LinkedIn links, SAM.gov and Canada Buys bid opportunities for missile defense, SDA/SSA, and electro-optical payloads. Added OCR/Image recognition via Tesseract.js. Fixed /d command to navigate to documents page. Heartbeat now auto-generates intelligence reports every 24 hours. Added Brand Voice Chat feature with NotebookLM-style document chat per brand. Updated Feature Request system to use direct OpenCode execution (no LLM middleman).
- **Version 5.8** - Fixed web search fallback to use DuckDuckGo API, improved Workspace document upload UI with drag-and-drop and progress, fixed chat scrolling with auto-scroll, added Telegram integration for bot messaging
- **Version 5.7** - Fixed model loading from Ollama, fixed message rendering bug, expanded note editor text area
- **Version 5.6** - Added Command Menu (/commands) with keyboard shortcuts, integrated into main chat, web search API route added
- **Version 5.5** - Added Workspace Organization with Folders, Brand Profiles, and Projects
- **Version 5.4** - Enhanced Document Management with PDF/Word support, vectorization, chat, and weekly briefing
- **Version 5.3** - Added Note Taking and Calendar features with ICS export
- **Version 5.2** - Added Feature Request System with OpenCode Integration for implementing new features
- **Version 5.1** - Added Vector Lake (Smart Cache) for intelligent query caching and data organization
- **Version 5.0** - Migrated from localStorage to SQLite (sql.js) for persistent data storage
- **Version 4.3** - Added SQL Database with LLM-Powered Data Processing, Information Organization
- **Version 4.2** - Added SAM.gov Integration with API Key Rotation
- **Version 4.1** - Added Startup/Shutdown System, Real-time Ollama Model Listing
- **Version 4.0** - Added Modular Architecture, Feature Flags, API Key Management, Plugin System
- **Version 3.0** - Added Vector Store, Self-Improving Agent, Token Optimization, Security
- **Version 2.0** - Added Expert Agents, Document Management, Notes, Knowledge Base
- **Version 1.0** - Initial setup with complete frontend and backend APIs

## Notes
- **Out of the Box Mode**: Works immediately with Ollama and GLM-4.7-flash
- **Custom Mode**: Users can add API keys for OpenRouter, DeepSeek, etc.
- **LLM-Controlled**: The LLM can enable/disable features and customize the solution
- **SAM.gov Integration**: Government contracting opportunities with keyword search and 90-day API key rotation
- **Database**: SQLite (sql.js) for persistent data storage with LLM-powered email/message processing
- **Vector Lake**: Smart caching system that stores query results, uses embeddings for similarity matching, automatically organizes search results into SQL database
- **Feature Request System**: Users describe features, OpenCode directly implements them (no LLM middleman)
- **Note Taking**: Rich text editor with LLM-powered contextualization, categorization, and tagging
- **Calendar**: Event management with ICS export for all major calendar applications
- **Document Management**: Import PDF, Word, TXT and other formats with vectorization, contextualization, importance evaluation, and chat capability
- **Workspace**: Organize documents in folders, create brand/identity profiles for companies and people, manage projects (RFPs, quotes, proposals) linked to brands
- **Weekly Briefing**: Auto-generated briefings from important documents sorted by priority
- **Data Migration**: Migrated from localStorage to SQLite in V5.0 for better data persistence and reliability
- **Information Organization**: The LLM can process raw data (emails, messages) and automatically create contacts, tasks, events, notes, and activity logs
- **Telegram Bot**: Connect Telegram to chat with AI assistant, run web searches, get status updates via bot commands
- **Web Search**: Uses Tavily API with Brave Search and DuckDuckGo as fallbacks
- **OCR & Image Recognition**: Extract text from images using Tesseract.js, integrated into chat interface
- **Intelligence Report Generator**: Automated daily scanning of space/commercial space news, key individual identification with LinkedIn links, SAM.gov and Canada Buys bid opportunities for missile defense, SDA/SSA, and electro-optical payloads
- **Heartbeat Automation**: Daily intelligence report generation via heartbeat, with manual trigger option
- **Brand Voice Chat**: NotebookLM-style document chat per brand with customizable voice/persona
- **Self-Reflection**: AI periodically analyzes itself for gaps, inefficiencies, and improvements with a health score
- **MEMORY.md**: Structured persistent memory that stores user profile, projects, brands, knowledge, and conversation context; generates personalized system prompts
- **Canvas/A2UI**: AI-generated interactive UI components from natural language descriptions; supports dashboards, forms, tables, charts, timelines
- **ONLYOFFICE Integration**: OpenAI-compatible API at `/api/onlyoffice/ai` for document AI features; custom plugin at `/onlyoffice-plugin/`
- **Office AI Tools**: Spreadsheet analysis (analyze, formula, clean, chart, predict, generate) and presentation tools (bullets, outline, speaker notes, improve, summary)
- **Writing Assistant**: Expand, outline, continue, rewrite, simplify, elaborate, and structure text
- **Database Form Builder**: Visual form builder for SQLite tables with auto-generation from schema
- **System Control**: Start/stop all services (Database, Task Scheduler, Security Scanner, Intelligence Service) from UI
- **Dual-Model Architecture**: Cheap/fast models (Ollama, GLM) for daily chat, OpenCode (capable model) only for feature building - cost efficient
- Modular architecture allows easy extension with new features
- Feature dependencies are automatically managed
- **Telegram Bot**: Connect Telegram to chat with AI assistant, run web searches, get status updates via bot commands
- **Web Search**: Uses Tavily API with Brave Search and DuckDuckGo as fallbacks
- **OCR & Image Recognition**: Extract text from images using Tesseract.js, integrated into chat interface
- **Intelligence Report Generator**: Automated daily scanning of space/commercial space news, key individual identification with LinkedIn links, SAM.gov and Canada Buys bid opportunities for missile defense, SDA/SSA, and electro-optical payloads
- **Heartbeat Automation**: Daily intelligence report generation via heartbeat, with manual trigger option
- **Brand Voice Chat**: NotebookLM-style document chat per brand with customizable voice/persona
- **Self-Reflection**: AI periodically analyzes itself for gaps, inefficiencies, and improvements with a health score
- **MEMORY.md**: Structured persistent memory that stores user profile, projects, brands, knowledge, and conversation context; generates personalized system prompts
- **Canvas/A2UI**: AI-generated interactive UI components from natural language descriptions; supports dashboards, forms, tables, charts, timelines
- **Dual-Model Architecture**: Cheap/fast models (Ollama, GLM) for daily chat, OpenCode (capable model) only for feature building - cost efficient
- Modular architecture allows easy extension with new features
- Feature dependencies are automatically managed
