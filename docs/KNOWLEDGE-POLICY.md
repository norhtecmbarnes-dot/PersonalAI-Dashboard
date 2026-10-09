# Knowledge Policy & Local-First — the two rules the system is built on

Two principles shape everything in this dashboard. They are not features; they are
constraints we design around.

1. **Local-first.** The system runs entirely on the user's own machine with Ollama.
   Cloud models are an option the user turns on — never a requirement.
2. **Never ask the LLM for knowledge.** The model is a **communications manager**, not
   a source of facts. When we want information we tell it *where to look* and *give it
   the information to use*.

---

## 1. The division of labour

The core insight: **an LLM is fluent, confident, and unaccountable for the truth of
what it says.** It cannot tell you which of its claims are remembered-and-correct and
which are fluent fabrication — there is no signal in the output. So we never put it in
the position of being the authority. We put it where it is genuinely world-class, and we
put **tools and code** where *they* are world-class.

| Job | Who does it | Why |
|---|---|---|
| Understand a request written in plain English | **LLM** | Language is its home turf |
| Decide *what* information is needed | **LLM** + human | It can reason about the task |
| *Retrieve* the information (search, lookup, query, read a file) | **Tool / code** | Deterministic, inspectable, current |
| *Compute* (prices, dates, arithmetic, totals) | **Code** | Never wrong-by-vibes |
| *Act* (open a page, call an API, run a command) | **Tool / agent** | Auditable, repeatable |
| Structure, summarise, draft, translate, format | **LLM** | Its strength |
| Verify a claim against a source | **Human** + code | The last mile is human |
| Keep the facts it may state | **Injected context** | We choose what it knows |

Read the table as a rule: **the LLM never supplies the facts; it supplies the language.**
We hand it the facts — documents, retrieved context, memory, tool output — and it turns
them into an answer a person can use.

### Why this matters more than it sounds

A chatbot that "knows things" feels impressive and is quietly dangerous: it is right
often enough to be trusted, and wrong often enough to cost you — a wrong NAICS code, a
wrong page limit, a citation to a section that doesn't exist. In a proposal, one
fabricated fact is a failed proposal. The knowledge policy removes that failure mode at
the source: if the fact isn't in front of the model, the model says so.

---

## 2. The knowledge policy (what the model is told)

The canonical text lives in `src/lib/config/knowledge-policy.ts` and is attached to the
system prompt of every chat path. In short, the model is told:

- Never answer a factual question from your own memory or training.
- Use the information you were given (documents, retrieved context, memory, tools).
- When you need information you weren't given, *go get it with a tool, or ask*.
- Never fill a gap with a guess — state the gap instead.
- Attribute every specific claim to its source; if you can't, don't make it.

And, explicitly, what it **may** do freely: understand, organise, summarise, draft,
rewrite, translate, calculate (via the compute tools), reason about logic, and ask
questions.

Attach it anywhere with one call:

```ts
import { withKnowledgePolicy } from '@/lib/config/knowledge-policy';

const systemPrompt = withKnowledgePolicy(basePrompt);
```

It is idempotent (attaching twice does nothing). It is wired into:

- `src/app/api/chat/route.ts` (the tool-calling chat path)
- `src/app/api/chat/stream/route.ts` (the streaming chat path)

Attach it to any new LLM call that can state facts (writing, office, canvas, experts).

---

## 3. Local-first

### The default posture

The app already prefers a local model: `PREFER_LOCAL` defaults to `true`, and the models
endpoint now picks a **local** default (`gemma4:latest`, `qwen3.5:9b`, …) rather than a
cloud model. If no local model exists, it may fall back to cloud — but only when cloud is
allowed.

### The hard switch: `LOCAL_ONLY`

Set `LOCAL_ONLY=true` and the system becomes incapable of calling the cloud:

- `/api/models` **hides** every cloud model and reports `localFirst.localOnly: true`.
- Any attempt to call a cloud model is **refused** with an actionable message, at the one
  chokepoint every model call passes through (`gateModel` in
  `src/lib/config/local-first.ts`, enforced inside `chatCompletion` and
  `streamChatCompletion` in `src/lib/models/sdk.server.ts`).

```bash
# .env.local
LOCAL_ONLY=true     # nothing leaves this machine
PREFER_LOCAL=true   # (default) prefer local, cloud still allowed
```

### Verified behaviour

With `LOCAL_ONLY=true` and Ollama running:

- `GET /api/models` → `localFirst: {localOnly: true, ...}`, `external: []`,
  `defaultModel: ollama/gemma4:latest`.
- `POST /api/chat/stream` with `model: "ollama/glm-5.3:cloud"` →
  `{"error":"Local-only mode is ON (LOCAL_ONLY=true), so the cloud model \"ollama/glm-5.3:cloud\" will not be called — nothing leaves this machine. Pick a local Ollama model, or set LOCAL_ONLY=false to allow cloud models."}`

That's the whole promise, in one response: **nothing leaves the machine, and it tells you
why.**

---

## 4. How to build your own the same way

If you're vibe-coding your own dashboard, these are the load-bearing choices:

1. **Start local.** Ship with Ollama as the default provider. Make cloud opt-in. Test on a
   machine with the network unplugged.
2. **One chokepoint.** Route every model call through a single function so one gate can
   enforce local-only (and budgets, and logging) everywhere. Never scatter raw API calls.
3. **Inject, don't recall.** Build the context (documents, retrieved passages, memory) and
   put the facts in the prompt; tell the model to use only those and to say when something
   is missing.
4. **Tools for truth.** Anything that must be correct — a number, a date, a lookup —
   comes from code or a tool, never from the model's memory.
5. **Attribute.** Ask for the source of each claim. A claim with no source is a claim you
   should not ship.
6. **Keep the human in the loop.** The human brings domain experience and the final
   judgement; the model brings language and structure. That's the deal.

## 5. Known behaviours / notes

- **`/api/chat` uses a local "fast" model for its tool loop** (it forces
  `ollama/qwen3.5:9b` unless the requested model is a qwen3.5 variant). This is
  local-first by accident and by design; the user's cloud selection is not used on that
  path. The streaming path honours the selected model — and the gate.
- **Greetings short-circuit.** A message like "hi" returns a canned greeting without
  calling a model at all, so it can't be used to test the gate; send a substantive prompt.
- **The gate is a guardrail, not a sandbox.** It stops the app from *choosing* a cloud
  model. True isolation (no egress at all) is a network/firewall concern.
