# PersonalAI Dashboard

> **A Gift to the World** — Build Your Own AI Assistant. Runs Locally. Protects Your Privacy.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![License: CC BY-SA 4.0](https://img.shields.io/badge/License-CC%20BY--SA%204.0-lightgrey.svg)](https://creativecommons.org/licenses/by-sa/4.0/)
[![Next.js](https://img.shields.io/badge/Next.js-16+-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue)](https://www.typescriptlang.org/)

---

## Purpose

This project is a **gift to the world** — open source code (MIT) with Creative Commons documentation (CC BY-SA 4.0).

We believe everyone deserves:
- **Privacy** — Your data stays on your machine
- **Freedom** — No subscriptions, no vendor lock-in
- **Control** — Customize everything for your needs
- **Learning** — Understand how AI systems work

Build your own personalized AI dashboard. Use it as a ChatGPT replacement. Create automated tasks. Write documents. Manage your knowledge.

---

## Core Features

| Feature | Purpose |
|---------|---------|
| **Home** | ChatGPT replacement — local LLM, web search, memory |
| **Heartbeat** | Cron system for automated task execution |
| **Writing Studio** | Document editor with AI assistance |
| **Office** | AI file generator (PowerPoint, Excel, Word, PDF) |
| **Brand Voice** | Knowledge bases for context injection |
| **Builder** | Visual UI generation + database forms |
| **Telegram** | Remote system communication |

---

## ⚡ Quick Start (5 Minutes)

```bash
# 1. Clone the repository
git clone https://github.com/norhtecmbarnes-dot/PersonalAI-Dashboard.git
cd PersonalAI-Dashboard

# 2. Install dependencies
npm install

# 3. Install Ollama (for local AI)
# Visit https://ollama.com and download

# 4. Pull a model
ollama pull qwen3.5:9b

# 5. Start the dashboard
npm run dev
```

Open **http://localhost:3000** and start chatting!

**Want FREE cloud models?** Get your API key at https://ollama.com/settings/keys and add to `.env.local`:
```
OLLAMA_API_KEY=your-key-here
```

---

## 🚀 What's New

### v2.6.3 (Current) - Builder Integration
- **Unified Builder**: Combined Canvas and Forms into one page
- **Security**: Replaced unsafe Function() with mathjs.evaluate()
- **Cleanup**: Removed 30+ duplicate files

### v2.6.2 - PDF Processing Fix
- Updated pdf-parse to v2 API
- Added proper resource cleanup

### Performance (v2.6.0)
- **50% Token Reduction**: Context from 4096 to 2048 tokens
- **40% Faster**: Response time 3.5s → 2.1s
- **Smart Routing**: Task-based model selection
- **Memory Optimized**: 800 token injection limit

---

## Philosophy

### Token Efficiency
Every token costs money or compute. We minimize usage:
- Context window limited to essential content
- Memory injection capped at 800 tokens
- Conversation history auto-trimmed
- Smart model routing (small models for simple tasks)

### No Memory Leaks
All intervals and event listeners cleaned up:
```typescript
useEffect(() => {
  const interval = setInterval(fn, 30000);
  return () => clearInterval(interval); // Always clean up
}, []);
```

### Privacy First
- All data stored locally in SQLite
- No telemetry or tracking
- No cloud required (works offline)
- Your data never leaves your machine

---

## Documentation

- **Book**: `book/` — Full tutorial for beginners (CC BY-SA 4.0)
- **CHANGELOG.md** — Version history
- **PROJECT_STATUS.md** — Current state and goals
- **docs/** — Technical documentation

---

## Contributing

This is a gift. We welcome:
- Bug fixes
- Performance improvements
- Documentation improvements
- New features that help users

Please ensure:
1. No memory leaks (clean up intervals, listeners)
2. Token efficiency (minimal context usage)
3. Privacy (no external calls without consent)
4. Documentation (update the book if needed)

---

## License

- **Code**: MIT License — use freely for any purpose
- **Book**: CC BY-SA 4.0 — share and adapt with attribution

---

## Support

- **Issues**: https://github.com/norhtecmbarnes-dot/PersonalAI-Dashboard/issues
- **Discussions**: Use GitHub Discussions for questions

---

*Building the future, one token at a time.*

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 💬 **Chat Interface** | Streaming responses, model selection, web search |
| 📄 **Document Management** | Upload PDFs, Word docs, chat with them |
| 🎨 **Canvas Builder** | Generate UI components with natural language |
| ✍️ **Writing Assistant** | Expand, outline, rewrite, simplify text |
| 📊 **Presentations** | AI-generated PowerPoint slides |
| 📅 **Task Scheduler** | Automated recurring tasks with priority system |
| 🧠 **Memory System** | Persistent AI knowledge across sessions |
| 🔐 **Security Scanner** | Automatic vulnerability detection |
| 📝 **Notes Board** | Drag-and-drop notes with AI organization |
| 💼 **Brand Workspace** | Manage multiple brands and projects |
| 🔍 **Web Search** | Real-time web search integrated with chat |
| 🤖 **Model Router** | Smart model selection based on task |
| 📈 **Quick Insights** | Real-time dashboard metrics at `/quick-insights` |
| 📰 **Daily Briefing** | Aggregated intelligence at `/daily-briefing` |
| ⚡ **Performance Mode** | 50% token reduction, 40% faster responses |

---

## 🤖 AI Model Support

### FREE Cloud Models (Ollama Cloud)

| Model | Parameters | Best For |
|-------|------------|----------|
| `kimi-k2.5` | 1.1T | **Writing** (Claude-distilled, excellent English) |
| `glm-5` | 756B | Complex reasoning |
| `deepseek-v3.2` | 671B | Code generation |
| `qwen3.5:397b` | 397B | General purpose |
| `devstral-small-2` | 24B | Code agent tasks |

*Get your FREE API key at https://ollama.com/settings/keys*

### Local Models (No API Key Required)

| Model | Size | Hardware | Speed |
|-------|------|----------|-------|
| `qwen3.5:2b` | 2B | CPU (4GB RAM) | Very fast |
| `gemma3:4b` | 4B | CPU (8GB RAM) | Fast |
| `qwen3.5:9b` | 9B | CPU (16GB RAM) | Moderate |
| `qwen3.5:27b` | 27B | GPU (24GB VRAM) | Slow on CPU |
| `gpt-oss:20b` | 20B | GPU (16GB VRAM) | Moderate |

---

## 📚 Documentation

### The Complete Book (v2.6)

📖 **[Building Your AI Dashboard: The Complete Beginner's Guide](book/)**

A comprehensive book for beginners - no programming experience required!

**Chapters:**
1. Introduction - Your Journey Starts Here
2. What is an API?
3. What is a Container?
4. **Setup Guide** - Step-by-step instructions
5. What is Programming?
6. **Database vs Datalake** - Understanding data storage
7. Project Structure
8. Prompt Templates
9. Getting Your First Chat Working
10. Adding Document Upload
11. Creating Brand Voice System
12-20. Advanced Features
21. **Security System** - Protecting your dashboard
22. **Writing Assistant** - AI-Powered Content Creation
23. **Government Bid Workflow** - From RFP to proposal
24. **Performance Optimization** - Token efficiency & speed (NEW v2.6)

### Additional Docs

- [Quick Start Guide](docs/QUICK-START.md)
- [API Reference](docs/API-REFERENCE.md)
- [Customization Guide](docs/CUSTOMIZATION.md)
- [Performance Guide](book/chapter-24-performance.md)

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────┐
│                  PersonalAI Dashboard                │
│                                                      │
│  ┌─────────────────────────────────────────────┐    │
│  │        Next.js 16 + TypeScript              │    │
│  │   • 20+ Pages    • 40+ API Routes          │    │
│  │   • Tailwind CSS • Real-time Streaming      │    │
│  └─────────────────────────────────────────────┘    │
│                         ↕                            │
│  ┌─────────────────────────────────────────────┐    │
│  │           Services Layer                     │    │
│  │   • Model Router (smart model selection)    │    │
│  │   • Database (SQLite)                       │    │
│  │   • Datalake (Vector Store)                 │    │
│  │   • Memory.md (Persistent context)          │    │
│  │   • Task Scheduler                          │    │
│  │   • Security Scanner                        │    │
│  └─────────────────────────────────────────────┘    │
│                         ↕                            │
│  ┌─────────────────────────────────────────────┐    │
│  │              AI Models                       │    │
│  │   • Ollama Local (free, offline)            │    │
│  │   • Ollama Cloud (free API, 32 models)      │    │
│  │   • OpenRouter, DeepSeek, etc. (paid)       │    │
│  └─────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────┘
```

### Three-Tier Data Storage

| Layer | Purpose | Technology |
|-------|---------|------------|
| **Database** | Structured human data | SQLite |
| **Datalake** | AI-searchable content | Vector Store |
| **Memory.md** | Persistent AI knowledge | Markdown |

---

## 🔒 Security

The dashboard includes comprehensive security measures:

- **Input Validation** - Type checking, length limits
- **Prompt Injection Defense** - Sanitization of all user inputs
- **SQL Injection Prevention** - Parameterized queries
- **Security Scanner** - Run `/security scan` in chat

See [Chapter 21: Security System](book/chapter-21-security.md) for details.

---

## 📖 Project Structure

```
PersonalAI-Dashboard/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/               # 40+ API endpoints
│   │   ├── page.tsx           # Home page
│   │   ├── writing/           # Writing assistant
│   │   ├── canvas/            # Visual builder
│   │   ├── brand-workspace/   # Brand management
│   │   ├── notes/             # Notes board
│   │   └── ...                # 15+ more pages
│   │
│   ├── lib/                   # Core libraries
│   │   ├── database/          # SQLite operations
│   │   ├── models/            # Model routing
│   │   ├── services/          # Business logic
│   │   ├── security/          # Security scanning
│   │   ├── utils/             # Utilities (validation, etc.)
│   │   ├── storage/           # Document storage
│   │   └── agent/             # AI agents
│   │
│   └── components/            # React components
│
├── book/                      # Complete documentation book
├── data/                      # SQLite database + memory
├── docs/                      # Additional docs
└── .env.local                # Your configuration
```

---

## 🛠️ Requirements

| Requirement | Minimum | Recommended |
|-------------|---------|-------------|
| **OS** | Windows 10, macOS 10.15, Linux | Any modern OS |
| **RAM** | 4 GB | 16 GB |
| **Disk** | 10 GB | 20 GB |
| **Node.js** | v18+ | v20+ |

**For Local AI:**
- **4GB RAM:** `qwen2.5:1.5b` (small, fast, CPU-only)
- **8GB RAM:** `qwen2.5:3b` (better quality)
- **16GB+ RAM:** `qwen2.5:7b` or `qwen2.5:9b` (best local quality)

**For Cloud AI (Recommended for Low-RAM Systems):**
- Just need internet and free Ollama API key
- Models like `kimi-k2.5` and `glm-5` are FREE and better than local small models

📖 **[CPU-Only Setup Guide (4GB RAM)](docs/CPU-ONLY-SETUP.md)** - Complete guide for low-RAM systems

---

## 🌟 Getting Started

### 1. Install Node.js

Download from https://nodejs.org (version 18+ required)

### 2. Install Ollama

```bash
# macOS/Linux
curl -fsSL https://ollama.com/install.sh | sh

# Windows: download from https://ollama.com
```

### 3. Pull a Model (Choose Based on Your RAM)

```bash
# 4GB RAM - Best choice
ollama pull qwen2.5:1.5b

# 8GB RAM - Better quality
ollama pull qwen2.5:3b

# 16GB+ RAM - Best local quality
ollama pull qwen2.5:9b
```

### 4. Clone and Run

```bash
git clone https://github.com/norhtecmbarnes-dot/PersonalAI-Dashboard.git
cd PersonalAI-Dashboard
npm install
npm run dev
```

### 5. (Recommended) Add FREE Cloud Models

Get your FREE API key at https://ollama.com/settings/keys - this gives you access to powerful models that don't use your RAM!

```bash
# Create .env.local
cp .env.example .env.local

# Edit and add:
OLLAMA_API_KEY=your-key-here
```

---

## 📜 License

**Code:** [MIT License](LICENSE) - Free to use, modify, and distribute

**Documentation:** [CC BY-SA 4.0](LICENSE-CONTENT) - Free to share with attribution

---

## 🙏 Acknowledgments

- **Ollama** - Local AI made easy
- **Next.js** - Amazing framework
- **Open Source Community** - All contributors

---

## 📞 Support

- 🐛 [Report Issues](https://github.com/norhtecmbarnes-dot/PersonalAI-Dashboard/issues)
- 💬 [Discussions](https://github.com/norhtecmbarnes-dot/PersonalAI-Dashboard/discussions)

---

## 📖 Citation

```bibtex
@software{personala_dashboard_2026,
  title = {PersonalAI Dashboard: Privacy-First AI Assistant},
  author = {Michael C. Barnes and Contributors},
  year = {2026},
  url = {https://github.com/norhtecmbarnes-dot/PersonalAI-Dashboard}
}
```

---

<p align="center">
  <strong>Star ⭐ this repo if you find it helpful!</strong>
</p>

<p align="center">
  Made with ❤️ for privacy-conscious AI users
</p>