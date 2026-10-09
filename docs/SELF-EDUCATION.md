# Self-Education — the system that keeps itself current

The dashboard is built to **improve itself** — watching the tools and models it depends
on, noticing what the user does well, and proposing upgrades — while **never changing
anything without the human's approval**.

Three ideas make it work:

1. **Code fetches the facts.** No model is asked to "remember" a version number. We ask
   GitHub. (This is the knowledge policy in action — see `KNOWLEDGE-POLICY.md`.)
2. **A cheap model does the cheap thinking.** Ranking and filtering raw findings is a
   low-cost job; it runs on a small local model.
3. **The Alpha model does the hard thinking.** Contextualising findings into a real
   recommendation is the highest-value reasoning in the system, so it goes to the best
   model available — the **Alpha**.

---

## The loop

```
inventory (tools + models)
      │
      ▼
1. RESEARCH  (code)              GitHub releases API per tool; diff against last seen
      │
      ▼
2. RANK      (low-cost model)    relevance 0-10 + one-line note per change
      │
      ▼
3. CONTEXTUALISE (Alpha model)   writes a markdown improvement report, grounded in
      │                          the findings AND in what the user actually does
      ▼
4. REPORT    (disk)              data/improvements/<timestamp>.md  +  latest.md
      │
      ▼
5. QUEUE     (disk)              proposals.json — status: pending → approved/rejected
      │
      ▼
6. HUMAN APPROVES               nothing is implemented automatically
```

### 1. Research — code, not a model

`TOOL_INVENTORY` (`src/lib/agent/tool-inventory.ts`) is a declarative list of the tools the
system watches — ComfyUI, Ollama, llama.cpp, Next.js, better-sqlite3, the MCP SDK,
Playwright, and more — each with its GitHub repo. For each one we call
`/repos/{owner}/{name}/releases/latest`, compare the tag to the last version we recorded
(`edu_seen_<tool>` in settings), and emit a finding when it changes.

**First run establishes baselines** and reports no changes — that's deliberate, so a fresh
install isn't flooded with false "updates". Add the tools *you* care about to the inventory
and they join the watch automatically. (The user's own example — watching ComfyUI and
MiniMax H3 for better models and graphs — is exactly this list.)

### 2. Rank — the low-cost model

For each update, a small local model (`SELF_EDU_RANK_MODEL`, default `ollama/qwen3.5:9b`)
returns `{relevance 0-10, note}`. It is told to judge only from the changelog text it was
given — never to invent facts.

### 3. Contextualise — the Alpha model

The Alpha writes the report (`src/lib/agent/self-education.ts` → `contextualize`). It is
given the raw findings, the ranking, the tracked models, and **workflow signals** (what the
user actually does), and it must produce exactly:

- **Summary** — what was found, what matters.
- **Suggested improvements** — per item: What / Why it matters for *this* user / Impact /
  Effort / How to verify. It is told to skip trivia and say so.
- **Workflow suggestions** — grounded in the signals, and **built only on the user's
  strengths** (see `STRENGTHS-POLICY.md`).
- **Needs human approval** — a checklist.

### 4–6. Report, queue, approve

Reports land in **`data/improvements/`** as timestamped markdown, with a stable
`latest.md` pointer "available for the Alpha LLM" (and for you). Each update also becomes a
**proposal** in `data/improvements/proposals.json` with status `pending`. You approve,
reject, or mark applied. **Nothing is ever implemented without that decision.**

---

## The Alpha

> There is one **Alpha** model at a time — the best available — used for the system's
> hardest thinking. But **no Alpha rests on its laurels**: any model may challenge, and the
> winner takes the title.

Implementation: `src/lib/models/alpha.ts`.

A **challenge** benchmarks every candidate against a fixed, deterministic test — scored by
**code**, not by another model's opinion, so it is cheap, repeatable, and can't be flattered:

| Test | What it checks |
|---|---|
| `exact` | Follow an exact-output instruction |
| `arithmetic` | Get a computation right (and not in prose) |
| `json` | Emit valid, exact structured output |
| `constraint` | Obey a format constraint (exactly three words) |
| `grounding` | **Admit it does not know** a fictional fact instead of inventing one |

That last one is the knowledge policy as a **pass/fail test** — and it earns its place:
in the first live challenge, `gpt-oss:20b` scored 4/5, the only model to fabricate a capital
city for a country that does not exist. `qwen3.5:9b`, `gemma4:latest` and `gemma3:27b` each
scored 5/5; the incumbent defended the title.

Ties go to the incumbent (no change without a reason). History is kept so you can see the
title move over time.

---

## Using it

**API** (`src/app/api/self-education/route.ts`):

```bash
# status: alpha, last run, report count, pending proposals, tracked tools
curl "http://localhost:3000/api/self-education?action=status"

# run the loop now
curl -X POST http://localhost:3000/api/self-education -H "Content-Type: application/json" \
  -d '{"action":"run"}'

# hold an Alpha challenge
curl -X POST http://localhost:3000/api/self-education -H "Content-Type: application/json" \
  -d '{"action":"challenge"}'

# read the newest report
curl "http://localhost:3000/api/self-education?action=latest"

# approve / reject a proposal
curl -X POST http://localhost:3000/api/self-education -H "Content-Type: application/json" \
  -d '{"action":"decide","id":"prop_...","status":"approved"}'
```

**Automatically:** the `self_education` task type runs the loop on a schedule (default
weekly, low priority so it pauses while you work). It appears in the task scheduler
alongside the other heartbeat tasks.

**Environment:**

```
SELF_EDU_RANK_MODEL=ollama/qwen3.5:9b   # low-cost ranking model
ALPHA_MODEL=ollama/qwen3.5:9b           # the starting Alpha (before any challenge)
```

---

## Verified behaviour (live)

- `POST {action:'run'}` → `checked: 10`, `baselines: 9`, report written to
  `data/improvements/…-improvement-report.md`; the report correctly grounded every claim in
  the fetched data and even declined to invent workflow strengths when the signals were empty.
- `POST {action:'challenge'}` → four models benchmarked; the grounding test caught one
  model fabricating; the incumbent defended at 100%.
- One tool (`ComfyUI-Manager`) reports "no release information" — expected, since it does
  not publish GitHub releases. It is logged as an error, not treated as a finding.

## Extending it

- **Track a new tool:** add an entry to `TOOL_INVENTORY` (a GitHub repo is all it needs).
- **Watch a service that isn't on GitHub** (a Hugging Face model repo, a vendor page):
  add a `source` variant and a fetcher; the rest of the loop is unchanged.
- **Change who thinks:** the ranking model and the Alpha are both configurable, and the
  Alpha is decided by challenge, not by hand.
