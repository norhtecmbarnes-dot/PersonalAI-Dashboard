# 📚 Building Your AI Dashboard: The Complete Beginner's Guide

**Location:** `C:\ai_dashboard\book\`

---

## About This Book

A comprehensive guide to building your own AI Research Assistant from scratch. Written for complete beginners who have never programmed before.

**Author:** Michael C. Barnes  
**License:** CC BY-SA 4.0 (text) / MIT (code)  
**Target Audience:** Complete beginners with no programming experience  
**Last Updated:** March 2026

---

## What's New in Version 2.3

- **Chapter 4 rewritten**: Step-by-step setup guide with Ollama Cloud integration
- **Chapter 6 rewritten**: Database vs Datalake architecture explanation
- **New Chapter 21**: Security System - Input validation, prompt injection defense
- Updated code examples throughout
- Model requirements table (CPU vs GPU)
- Writing assistant fallback chain documentation

---

## Chapters

| Chapter | Title | Status |
|---------|-------|--------|
| 1 | [Introduction - Your Journey Starts Here](./chapter-01-introduction.md) | ✅ Complete |
| 2 | [What is an API? (The Foundation)](./chapter-02-api.md) | ✅ Complete |
| 3 | [What is a Container? (Docker Explained)](./chapter-03-containers.md) | ✅ Complete |
| 4 | [Setting Up Your Computer - Step by Step](./chapter-04-setup.md) | ✅ Updated v2.3 |
| 5 | [What is Programming? (Learning to Give Instructions)](./chapter-05-programming.md) | ✅ Complete |
| 6 | [Database vs Datalake - How Data is Stored](./chapter-06-database.md) | ✅ Updated v2.3 |
| 7 | [Understanding the Project Structure](./chapter-07-structure.md) | ✅ Complete |
| 8 | [Prompt Templates - How to Talk to AI Tools](./chapter-08-prompts.md) | ✅ Complete |
| 9 | [Getting Your First Chat Working](./chapter-09-chat.md) | ✅ Complete |
| 10 | [Adding Document Upload Features](./chapter-10-documents.md) | ✅ Complete |
| 11 | [Creating Your Brand Voice System](./chapter-11-brand-voice.md) | ✅ Complete |
| 12 | [Building Intelligence Reports](./chapter-12-intelligence.md) | ✅ Complete |
| 13 | [Model Router - Choosing the Right AI](./chapter-13-model-router.md) | ✅ Complete |
| 14 | [Canvas - Fullscreen Dashboard Builder](./chapter-14-canvas-fullscreen.md) | ✅ Complete |
| 15 | [Presentations - Styling Your Content](./chapter-15-presentation-styling.md) | ✅ Complete |
| 16 | [Edge Runtime - Running at the Edge](./chapter-16-edge-runtime.md) | ✅ Complete |
| 17 | [Building with AI - Writing Assistant](./chapter-17-building-with-ai.md) | ✅ Complete |
| 18 | [Messaging Integrations - Telegram Bot](./chapter-18-messaging-integrations.md) | ✅ Complete |
| 19 | [Knowledge Extraction](./chapter-19-knowledge-extraction.md) | ✅ Complete |
| 20 | [Memory and Tasks - Persistent AI](./chapter-20-memory-tasks.md) | ✅ Complete |
| 21 | [Security System - Protecting Your Dashboard](./chapter-21-security.md) | 🆕 New v2.3 |

**Legend:**
- ✅ Complete
- 🆕 New/Updated
- 🔄 In Progress
- ⏳ Pending

---

## Key Concepts Explained

### The Three-Layer Data Architecture

The AI Dashboard uses a sophisticated data storage approach:

| Layer | Purpose | Technology |
|-------|---------|------------|
| **Database** | Structured human data | SQLite |
| **Datalake** | AI-searchable content | Vector Store |
| **Memory.md** | Persistent AI knowledge | Markdown file |

**Why Three Layers?**
- **Database**: Fast exact queries (WHERE name = 'Alice')
- **Datalake**: Semantic search (Find discussions about "pricing")
- **Memory.md**: Context AI always needs (User preferences, brand guidelines)

### The Security System

All user input flows through multiple security layers:

```
User Input
    ↓
[Input Validation] Check type, length, format
    ↓
[Sanitization] Remove injection patterns
    ↓
[AI Filter] Block prompt injection
    ↓
[Database Protection] Parameterized queries
```

### Model Selection

The dashboard intelligently selects models based on task:

| Task Type | Model Choice | Reason |
|-----------|--------------|--------|
| Quick responses | `qwen3.5:2b` | Small, fast, CPU-friendly |
| Chat | `qwen3.5:9b` | Good balance of speed/quality |
| Writing | `kimi-k2.5` | Claude-distilled, excellent English |
| Complex reasoning | `glm-5` or `deepseek-v3.2` | Large, capable |

---

## Project Structure

```
PersonalAI-Dashboard/
├── book/                        # This book
│   ├── chapter-01-introduction.md
│   ├── chapter-04-setup.md      # Step-by-step setup
│   ├── chapter-06-database.md   # Database vs Datalake
│   └── chapter-21-security.md   # Security system
│
├── src/
│   ├── app/                     # Pages and API routes
│   │   ├── page.tsx             # Home page
│   │   ├── api/                 # Backend endpoints
│   │   │   ├── chat/            # Chat API
│   │   │   ├── writing/         # Writing assistant API
│   │   │   └── ...
│   │   └── ...
│   │
│   ├── lib/                     # Core libraries
│   │   ├── database/            # SQLite operations
│   │   ├── models/              # Model routing
│   │   ├── services/            # Business logic
│   │   ├── security/            # Security scanning
│   │   ├── utils/               # Utilities
│   │   │   └── validation.ts    # Input sanitization
│   │   └── ...
│   │
│   └── components/              # UI components
│
├── data/                        # Data storage
│   ├── assistant.db             # SQLite database
│   └── MEMORY.md                # AI memory
│
└── .env.local                   # Your settings
```

---

## How to Read This Book

1. **Start with Chapter 1** - Even if you're tempted to skip ahead
2. **Follow Chapter 4 carefully** - Setup is critical
3. **Read Chapter 6** - Understand how data flows
4. **Reference Chapter 21** - Security is important
5. **Try the prompts** - Copy and paste them into AI assistants
6. **Build as you go** - Each chapter adds to your Dashboard

---

## Book Features

- **Plain English** - Every concept explained simply
- **Analogies** - Complex ideas compared to everyday things
- **Copy-Paste Prompts** - Ready-to-use prompts throughout
- **Hands-On Building** - Create your Dashboard chapter by chapter
- **Real Code** - Based on actual working codebase
- **Beginner-Friendly** - No prior experience required
- **Security-Focused** - Learn proper input handling from day one

---

## System Requirements

| Requirement | Minimum | Recommended |
|-------------|---------|-------------|
| RAM | 8 GB | 16 GB |
| Storage | 10 GB | 20 GB |
| OS | Windows 10+, macOS 10.15+, Linux | Any modern OS |
| Node.js | v18+ | v20+ |
| For local AI | Any computer | 16GB+ RAM for larger models |

**Free Cloud AI Option:** Sign up at https://ollama.com/settings/keys for free cloud models - no GPU required!

---

## Quick Start

```bash
# Clone the repo
git clone https://github.com/norhtecmbarnes/PersonalAI-Dashboard.git
cd PersonalAI-Dashboard

# Install dependencies
npm install

# Copy environment template
cp .env.example .env.local

# Start development
npm run dev

# Open in browser
# http://localhost:3000
```

See **Chapter 4** for detailed setup instructions.

---

## Contributing

This book is open-source under CC BY-SA 4.0 / MIT license:

1. Fork the repository
2. Improve the chapters
3. Submit a pull request
4. Help others learn!

**Share your improvements** — that's how open source works.

---

## Support

- **Issues:** https://github.com/norhtecmbarnes/PersonalAI-Dashboard/issues
- **Discussions:** Use GitHub Discussions for questions
- **Security Issues:** See Chapter 21 for security best practices

---

## License

- **Book Content:** CC BY-SA 4.0 (share and adapt with attribution)
- **Code:** MIT License (use freely)

---

**Ready to start?** Open [Chapter 1](./chapter-01-introduction.md)!

---

*Building real enterprise-grade AI power — one chapter at a time.*