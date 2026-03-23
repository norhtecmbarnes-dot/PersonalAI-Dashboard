# PersonalAI Dashboard

**All the power of AI-assisted development — running 100% locally.**

Chat with your documents, generate beautiful presentations, automate tasks, and build your own AI assistants.  
**No cloud dependencies. No usage limits. No monthly fees.** Just pure AI productivity that you control.

## 🚀 Quick Start

```bash
git clone https://github.com/norhtecmbarnes-dot/PersonalAI-Dashboard.git
cd PersonalAI-Dashboard
npm install
ollama pull qwen3.5:2b
npm run dev
```

Open http://localhost:3000 — you're ready!

## Core Features

- **Smart Model Router** (2B → 108B + Cloud)
- **Model Message Bus** (self-escalating LLM-to-LLM communication)
- **Vector Lake** (intelligent memory cache)
- **Canvas UI Builder**
- **Presentation Generator**
- **Daily Briefing + Task Automation**

## The Book (included)

Full book chapters live in `/book/`. Start with:

- Chapter 3: What is a Container?
- Chapter 5: Introducing Vector Lake
- Chapter 30: Smart Model Selection and the Model Message Bus

**Model Message Bus Tiers:**
- Tier 1: Local Small (qwen3.5:2b) → Triage
- Tier 2: Local Large (qwen2.5:14b)
- Tier 3: Cloud Fast (groq/llama-3.1-8b)
- Tier 4: Cloud Smart (gpt-4o, claude-3.5)

## Technologies

Next.js 14 • Ollama • Tailwind • TypeScript • SQLite + Vector Lake

---

Star ⭐ this repo if you want local AI that actually saves money and protects your data!

Made with ❤️ by Michael C. Barnes
