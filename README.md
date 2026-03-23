# PersonalAI Dashboard

**All the power of AI-assisted development — 100% local, private, and token-efficient.**

Chat with your documents, generate beautiful presentations, automate tasks, and build your own intelligent AI assistants.  
**No cloud lock-in. No monthly fees. No data leaks.** Just pure AI that you control.

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

## The Model Message Bus (Chapter 30)

This is the unique architecture at the heart of the book. Your tiny local model decides when it's overwhelmed, escalates across the bus, gets a high-quality answer, validates it, and returns the final response — all while tracking tokens and keeping everything private.

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

## The Book

Full chapters are in the `/book/` folder. Start here:

- Chapter 3: What is a Container?
- Chapter 5: Introducing Vector Lake
- Chapter 30: Smart Model Selection and the Model Message Bus

## Technologies

Next.js 14 • TypeScript • Ollama • Tailwind • SQLite + Vector Lake • Docker

---

Star ⭐ this repo if you believe in local-first AI that saves money and protects your data.

Made with ❤️ by Michael C. Barnes (@norhtecmbarnes)
