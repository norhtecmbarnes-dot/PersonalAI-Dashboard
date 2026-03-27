# PersonalAI Dashboard

**All the power of AI-assisted development — 100% local, private, and token-efficient.**

Chat with your documents, generate beautiful presentations, automate tasks, and build your own intelligent AI assistants.  
**No cloud lock-in. No monthly fees. No data leaks.** Just pure AI that you control.

---

## ✨ Dashboard Features

Here's what the PersonalAI Dashboard looks like in action:

### AI Research Assistant & Chat
![AI Research Assistant](./screenshots/Home%20--%20Chat%20Windows.png)

### Visual Builder (AI-Powered UI Generation)
Create UIs with natural language — describe what you want and AI builds it.
![Visual Builder](./screenshots/Visual%20Builder.png)

### Writing Studio & Outliner
Full-featured writing environment with AI assistance, grammar checking, and document generation.
![Writing Studio](./screenshots/writing%20Studio.png)
![Outliner](./screenshots/outliner.png)

### Brand Workspace (NotebookLM-style)
Knowledge management with AI-powered insights and context injection.
![Brand Workspace](./screenshots/Brand%20Workspace.png)

### LLM Leaderboard & Free Token Sources
Compare models, track usage, and find free AI resources.
![LLM Leaderboard](./screenshots/llm%20leaderboard.png)

### Task Scheduler
Automate tasks with cron-based scheduling and AI context.
![Task Scheduler](./screenshots/Task%20Scehduler.png)

### Calendar with AI Briefing
Event management with AI-generated insights and daily briefings.
![Calendar](./screenshots/calandar%20page.png)

### Notes System
Intelligent note-taking with AI-powered search and organization.
![Notes](./screenshots/notes.png)

### Telegram Integration
Control your AI dashboard remotely via Telegram bot.
![Telegram Integration](./screenshots/Telegram.png)

---

## 🚀 Quick Start

```bash
git clone https://github.com/norhtecmbarnes-dot/PersonalAI-Dashboard.git
cd PersonalAI-Dashboard
npm install
ollama pull qwen3.5:2b
npm run dev
```

**Docker option (one command):**
```bash
docker compose up
```

## What Makes This Different

- **Smart Model Router** — automatically picks the right brain (2B → 108B)
- **Model Message Bus** — the small local model can "chat with its own ChatGPT" when it needs help
- **Vector Lake** — your AI's growing, intelligent memory (never forgets)
- **Canvas UI Builder**, **Presentation Generator**, **Daily Briefing**, **Task Automation**
- **Linguix Integration** — grammar and style checking for your writing

## The Model Message Bus

This is the unique architecture at the heart of the system. Your tiny local model decides when it's overwhelmed, escalates across the bus, gets a high-quality answer, validates it, and returns the final response — all while tracking tokens and keeping everything private.

```
┌─────────────────────────────────────────────────────────────┐
│                    MODEL MESSAGE BUS                         │
│  Tier 1: Local Small (qwen3.5:2b)     ← Triage & simple tasks│
│  Tier 2: Local Large (qwen2.5:14b)                           │
│  Tier 3: Cloud Fast (groq/llama-3.1-8b)                      │
│  Tier 4: Cloud Smart (gpt-4o, claude-3.5, glm-5)           │
└─────────────────────────────────────────────────────────────┘
```

Self-assessment + budget awareness + bidirectional validation = truly novel in open source.

## 📖 Documentation

- **[User Guide](./docs/USER-GUIDE.md)** — Complete walkthrough with screenshots
- **[Book (PDF)](./docs/Building_Your_AI_Dashboard.pdf)** — Full guide to building local AI systems
- **[Book (Online)](https://designrr.page/?id=493295&token=3520346906&type=FP&h=9144)** — Web version with rich formatting

## Technologies

Next.js 14 • TypeScript • Ollama • Tailwind • SQLite + Vector Lake • Docker

---

Star ⭐ this repo if you believe in local-first AI that saves money and protects your data.

Made with ❤️ by Michael C. Barnes (@norhtecmbarnes)