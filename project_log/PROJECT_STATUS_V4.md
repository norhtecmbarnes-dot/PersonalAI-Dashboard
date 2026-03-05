# AI Research Assistant Project - Documentation

## Project Overview
A web-based AI research assistant with modular architecture, supporting both "out of the box" usage and customizable features with user-provided API keys.

## Work Documentation - Version 4.0

### What Has Been Completed ✅

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

#### 10. UI Components
- **DocumentManager** - Document upload UI
- **MarkdownRenderer** - Proper text formatting
- **ExpertExplorer/ExpertChat/ExpertProfile** - Expert components

#### 11. Security Measures
- Path restrictions (only root directory)
- Pattern blocking for dangerous operations
- Content validation
- API key protection rules

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
│   │   │   ├── documents/route.ts
│   │   │   ├── heartbeat/route.ts
│   │   │   ├── models/route.ts
│   │   │   ├── memory/route.ts
│   │   │   └── config/route.ts
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
│   │   │   └── self-improvement.ts
│   │   ├── config/
│   │   │   ├── features.ts
│   │   │   ├── app-config.ts
│   │   │   └── plugins.ts
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

## Version History
- **Version 4.0** - Added Modular Architecture, Feature Flags, API Key Management, Plugin System
- **Version 3.0** - Added Vector Store, Self-Improving Agent, Token Optimization, Security
- **Version 2.0** - Added Expert Agents, Document Management, Notes, Knowledge Base
- **Version 1.0** - Initial setup with complete frontend and backend APIs

## Notes
- **Out of the Box Mode**: Works immediately with Ollama and GLM-4.7-flash
- **Custom Mode**: Users can add API keys for OpenRouter, DeepSeek, etc.
- **LLM-Controlled**: The LLM can enable/disable features and customize the solution
- Modular architecture allows easy extension with new features
- Feature dependencies are automatically managed
