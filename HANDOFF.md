# Handoff Note — PersonalAI Dashboard
**Last updated:** September 1, 2026

---

## Project Locations

| Project | Path | Status |
|---------|------|--------|
| **PersonalAI Dashboard** | `C:\ai_assistant` | Running on port 3000 |
| **Presentation Canvas** | `C:\presentation-canvas` | Runs on port 8080 |
| **AOP Excel Workbook** | `C:\digantara_aop\Digantara_US_AOP_FY27-FY30.xlsx` | Complete |
| **CRM API Updater** | `C:\digantara_crm` | 12 deals updated via NinjaPipe API |
| **OpenCode** | System-wide | Configured via Bun 1.4.0 |

## GitHub Repos

- **PersonalAI Dashboard:** https://github.com/norhtecmbarnes-dot/PersonalAI-Dashboard (master branch)
- **Presentation Canvas:** https://github.com/norhtecmbarnes-dot/presentation-canvas
- **AOP/Digantara:** https://github.com/norhtecmbarnes-dot/PersonalAI-Dashboard (private — AOP is local only)

## Current State of PersonalAI Dashboard

### What it is
Proposal Genie — an AI-powered dashboard for Zenith Space Technologies LLC (dba Digantara U.S.) to win government contracts. The soul/mission is in `C:\ai_assistant\soul.md`.

### What was built/changed recently

1. **Hydration fix** — Added `suppressHydrationWarning` to `<html>` in `src/app/layout.tsx` to fix browser extension (Solvely) injecting `data-solvely-extension` attribute.

2. **Ollama Cloud models** — Updated `src/lib/models/sdk.server.ts` with 19 activated cloud models (GLM 5.3, DeepSeek V4, Kimi K3, etc.). Only activated models shown — not the full catalog.

3. **Cloud model routing** — Fixed chat API to route cloud models to `https://ollama.com/v1/chat/completions` (OpenAI-compatible endpoint) instead of local Ollama.

4. **Streaming fix** — Added `TransformStream` in `sdk.server.ts` to convert OpenAI-format SSE chunks (`delta.content` + `delta.reasoning`) to the app's `{"chunk":"...","done":false}` format.

5. **Thinking tag stripping** — Created `src/lib/utils/clean-ai-response.ts` with `stripThinkingTags()`. Applied in three layers:
   - Server non-streaming (`chatCompletion`)
   - Server streaming (TransformStream)
   - Client-side (`page.tsx` as safety net)

6. **Context size fix** — Added `max_tokens: 16384` to cloud API requests (was defaulting to 4096, causing 400 errors on longer conversations).

7. **NinjaPipe CRM integration** — Built but **not committed to GitHub** (in `.gitignore`):
   - `src/lib/integrations/ninjapipe.ts` — API client
   - `src/app/api/ninjapipe/route.ts` — REST endpoints
   - `docs/NINJAPIPE-INTEGRATION.md` — Documentation
   - API key stored in `.env.local` (not in repo)

### Key files to know

| File | Purpose |
|------|---------|
| `src/lib/models/sdk.server.ts` | All model providers — Ollama local, Ollama Cloud, OpenRouter, DeepSeek, GLM |
| `src/app/page.tsx` | Main chat UI — streaming, message display, brand selection |
| `src/app/api/chat/stream/route.ts` | Streaming chat endpoint (used by page.tsx) |
| `src/app/api/chat/route.ts` | Non-streaming chat endpoint (used by tool calls) |
| `src/components/MarkdownRenderer.tsx` | ReactMarkdown with remark-gfm — renders bold, bullets, tables, code |
| `src/lib/utils/clean-ai-response.ts` | Thinking tag stripping utility |
| `src/lib/config/system-prompt.ts` | System prompt with {{USER_NAME}} / {{ASSISTANT_NAME}} placeholders |
| `src/lib/storage/experts.ts` | Expert agents (Capture Manager, Proposal Writer, etc.) |
| `.env.local` | API keys (Ollama, NinjaPipe) — not in repo |

### Ollama setup
- **Local Ollama:** `http://127.0.0.1:11434` — 6+ models installed (gemma4:latest, gemma3:27b, gpt-oss:20b, etc.)
- **Ollama Cloud:** API key in `.env.local` as `OLLAMA_API_KEY`
- **Default model:** `ollama/glm-5.3:cloud` (753B, 1M context)

### NinjaPipe CRM
- **API base:** `https://app.ninjapipe.app/api`
- **API key:** `np_IZtguhLJ88kUimhaDC3CsgV6553Spphk`
- **12 deals updated** with AOP-aligned fields (STTR, FLOKI, Shield, Honeywell, etc.)
- **Weighting system:** engaged=15%, proposed=30%, negotiating=60%, awarded=85%, contracted=100%

### OpenCode
- Installed via Bun 1.4.0 (ARM64 Windows fix for TinyCC/dlopen)
- Config at `C:\Users\mbarn\.config\opencode\opencode.json`
- Default model: `ollama/glm-5.3:cloud`
- Run: `opencode` in a new terminal, or `C:\Users\mbarn\.bun\bin\bun.exe x opencode-ai`

## AOP Workbook
Complete at `C:\digantara_aop\Digantara_US_AOP_FY27-FY30.xlsx`:
- 9 sheets: ReadMe, Assumptions, Revenue Growth, Key Accounts, Tech/Product, Health, Behaviours, Funnel, Risks
- FY27 TARGET: $5,000,000 | COMMIT: $0 (+$500 Shield) | STTR pending: $140K Zenith
- Color-coded: green=COMMIT, yellow=PLAN, blue=FY30, orange=TARGET

## Company context
- **Zenith Space Technologies LLC** (dba Digantara U.S.)
- U.S. citizen-owned (51%), CEO day-to-day
- Differentiation: edge compute + onboard software (Shift & Stack, WatchDog/MRAM)
- Key partners: York Space, Honeywell, Northrop Grumman (FLOKI), Anduril, Penn State (STTR)
- AOP streams: Software, GBS Telescope, Space Systems, Payloads, Onboard Processing, Data Services

## What to do next when resuming

1. Start the dashboard: `cd C:\ai_assistant && npx next dev -p 3000`
2. Check GitHub for any new commits since last session
3. Pending items from AOP/CRM work:
   - Contact field updates (military rank, title, phone/mobile) — schema ready, not applied
   - Workspace AOP settings object — code ready, not pushed to CRM
   - Pipeline reports (weighted/unweighted, commit total, gap to $5M) — code ready
   - Weighting workshop needed before filling yellow PLAN cells
4. Dashboard features to potentially build:
   - NinjaPipe integration live activation (docs written, code in .gitignore)
   - SAM.gov integration alignment with AOP streams
   - Proposal Genie soul.md integration with expert agents
