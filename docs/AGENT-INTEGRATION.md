# Agent Integration — Giving the Dashboard an Agent (and Hands)

**Status:** decision note · **Applies to:** Proposal Genie (PersonalAI-Dashboard)
and, where noted, the Director sub-project.

This document answers two questions:

1. Which **agent runtime** do we build agent capabilities on — **Hermes Agent**
   (Nous Research) or **OpenMuse** (CopilotKit)?
2. How do we **give the agent a browser** — an **agentic browser** (BrowserOS neo)
   or **the agent's own computer** (a Docker/VM sandbox, as OpenMuse does)?

---

## 1. Recommendation (short version)

- **Runtime: Hermes Agent.** It is the more capable and more mature option, and it
  already covers the three things we need in one package: a browser, an isolated
  "own computer," and a long-running agent with memory, skills, scheduling, and
  multi-platform access.
- **Browser: start with BrowserOS neo** (an agentic browser that uses *your real
  logins*) when the job is behind a login — government portals, email, a CRM.
  Fall back to Hermes's **built-in headless browser** for public pages where no
  login is needed. Both are reachable from Hermes; BrowserOS neo over MCP.
- **"Own computer": use Hermes's Docker terminal backend** (one hardened, persistent
  container with a `/workspace`). It is the same idea OpenMuse implements, but it is
  already built into Hermes and switchable with one config line.
- **Keep OpenMuse on the shortlist** only if we specifically want an agent UI
  *embedded inside* the Next.js app via AG-UI/CopilotKit. It is alpha and requires a
  CopilotKit Intelligence key; adopting it means also adopting its server + browser
  worker architecture.

---

## 2. Comparison — Hermes Agent vs OpenMuse

| Dimension | **Hermes Agent** (Nous Research) | **OpenMuse** (CopilotKit) |
|---|---|---|
| What it is | A standalone autonomous **agent** (CLI + desktop + messaging gateway) with a closed learning loop | A self-hosted **agent application + framework** built on AG-UI / CopilotKit |
| Fit with our Next.js dashboard | Agent runs beside/behind the app; we integrate over CLI/gateway/MCP | Built to be built on: AG-UI + CopilotKit React hooks in the app |
| Browser automation | Built-in headless browser tools (`browser_*`, Browser Use CLI) **plus** `computer_use` for the desktop | A token-protected **Playwright/Chromium** browser worker with persistent profiles; agent browses, you can "take control" |
| Agentic browser pairing | **BrowserOS neo lists Hermes as a supported agent** (drives it over MCP) | Uses its own browser worker; not positioned as a BrowserOS neo client |
| "Its own computer" | **6 terminal backends**: local, **Docker**, ssh, singularity, modal, daytona, vercel_sandbox. Docker = one persistent, hardened container with `/workspace` | Optional **Docker "computer"**: nonroot Linux container, `/workspace`, no host mounts, no credentials, networking disabled, 30 s command cap |
| Memory & learning | Closed loop: curated memory, **autonomous skill creation + self-improvement**, cross-session recall | SQLite memory; goals with steps |
| Autonomy & scheduling | Built-in **cron**, Bot Mode, delegation/subagents, background processes | Durable **task engine** + background worker; action reviews/approvals |
| Interfaces | CLI, desktop, 20+ messaging platforms (Telegram, Discord, Slack, Teams, …) | Web app (installable), Android/iOS app |
| Safety model | Approval modes (smart/manual/off), hardline blocklist, `approvals.deny` globs, container isolation, MCP credential filtering | **Sentinel** allow/ask/deny, taint tracking, egress allowlist, scoped approvals |
| Secrets handling | Credential vault; MCP subprocess env isolation | Encrypted vault, `{{vault:NAME}}` placeholders, output redaction |
| Local-first / privacy | Yes — runs on your machine, VPS, or serverless | Yes — self-hosted |
| Maturity | Mature, actively documented | **Alpha** (self-hosting and building on) |
| License | See project | MIT |
| Dependencies / cost | Installer; any model endpoint (Nous Portal, OpenRouter, OpenAI, local) | Node 24 LTS + pnpm + a **CopilotKit Intelligence key** |
| Best for | Making the product agentic end-to-end with one powerful, ops-ready agent | Embedding an agent experience inside a web product with AG-UI |

> **Two products named OpenMuse.** The table above describes **CopilotKit/OpenMuse**
> (browser + terminal + files + durable tasks, AG-UI). A separate project,
> **OpenMuseAgent/OpenMuse** (now **nanoMuse**, `pip install nanomuse`), is a
> phone-first Python personal agent (FastAPI + Android app + Sentinel + vault).
> Do not conflate the two when reading docs.

---

## 3. The two ways to give an agent a browser

**Approach A — an agentic browser (BrowserOS neo).**
Install BrowserOS neo and use it like a normal browser; sign in to the sites you
actually use. Your agent then drives it over **MCP**, working in its own tabs with
**your real logins**. You watch the session live on the new-tab dashboard and can
replay any run as a video. Runs entirely on your machine (AGPL-3.0, local sessions).
*Best when the work is behind a login.* BrowserOS neo explicitly lists Claude Code,
Codex, Cursor, OpenClaw, **Hermes** and others as supported agents.

**Approach B — give the agent its own computer (OpenMuse's Docker model).**
The agent gets its own isolated environment: a persistent Chromium profile for
browsing, and an optional **Linux container** for commands and files. OpenMuse's
computer is a nonroot container with a read-only root filesystem, no host mounts, no
credentials, and networking disabled; commands run under `/workspace` with a 30-second
cap. You can open its terminal and take over. *Best when you want strong isolation
and don't need your personal logins.*

**A third option worth naming — drive the user's actual desktop.**
Hermes's `computer_use` (cua-driver) drives your real native apps in the **background**
without stealing focus or the cursor. Use it for non-web apps (Outlook, Explorer,
Figma) or browser *chrome* (address bar, permission prompts) — not for page content,
which is better handled by the browser tools.

| | Agentic browser (BrowserOS neo) | Agent's own computer (Docker/VM) | Drive the real desktop (Hermes `computer_use`) |
|---|---|---|---|
| Uses your real logins | **Yes** | No (isolated) | Yes (it *is* your machine) |
| Isolation from your machine | Medium (it's a browser on your box) | **High** | None |
| Watch / replay sessions | **Yes** (built-in) | Via screenshots/logs | Via screenshots you request |
| Non-web native apps | No | No | **Yes** |
| Setup | Install a browser, one-click MCP connect | `terminal.backend: docker` (one config line) | Install cua-driver |

**How this maps to Hermes, concretely**
- *Browser:* built-in headless `browser_*` tools cover public pages; connect
  **BrowserOS neo as an MCP server** (Hermes is an MCP client and discovers its
  tools at startup/`/reload-mcp`) for logged-in work.
- *Own computer:* set `terminal.backend: docker` in `~/.hermes/config.yaml`. Hermes
  starts **one** long-lived container (`docker run -d … sleep infinity`) and routes
  every terminal/file/`execute_code` call into it via `docker exec`; installs, `cd`,
  and `/workspace` files persist for the life of the process (and across sessions
  with `container_persistent: true`). Alternative isolated backends for the same
  idea: `ssh`, `daytona`, `modal`, `singularity`, `vercel_sandbox`.
- *Safety:* approvals (`smart`/`manual`/`off`), the hardline blocklist,
  `approvals.deny` globs, and container hardening (read-only rootfs, dropped caps,
  no privilege escalation, PID limits) all apply.

---

## 4. Integration patterns with the dashboard

Pick one (they compose):

1. **Agent-as-operator (fastest).** Run Hermes alongside the app. The dashboard (or
   you, from Telegram) hands Hermes a task — "search SAM.gov for X, draft the
   capability statement" — and Hermes drives the browser/computer and reports back.
   Lowest code change; the agent is a separate process.
2. **Dashboard-as-tools (most integrated).** Expose dashboard capabilities
   (opportunity search, document store, brand vault) as **MCP tools**; Hermes
   discovers and calls them, so the agent acts with your data. Requires an MCP server
   shim over the existing API routes.
3. **Embedded agent UI (heaviest).** Adopt **OpenMuse/CopilotKit + AG-UI** inside the
   Next.js app for an in-app agent pane. Most work, adds a CopilotKit dependency and
   key; choose only if the in-app UX is the point.

**Recommendation:** start at (1) to prove value, add (2) so the agent can *use* the
dashboard's data, and treat (3) as a later product decision.

---

## 5. Open questions / to verify before committing

- Confirm BrowserOS neo's MCP endpoint works from this Windows box with Hermes
  (`hermes mcp test <server>`), and whether AGPL-3.0 terms suit distribution of the
  dashboard.
- Decide the dashboard's own auth/allowlist posture before any agent gets write
  access to the brand vault or CRM.
- If embedded UI is wanted, budget for OpenMuse's alpha status (pinned commits) and
  the CopilotKit Intelligence key.
