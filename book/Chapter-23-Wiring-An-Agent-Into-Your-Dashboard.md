# Chapter 23: Wiring an Agent Into Your Dashboard — Both Ways

*Read this after Chapter 22. There you learned what an agent is and the two ways to give
it hands. This chapter is the workbench: you'll build **both** ways to connect an agent
to your dashboard, on your own machine, with the real code. By the end you'll have an
agent you can hand a task to, and a dashboard the agent can read for itself.*

## What You'll Learn in This Chapter

- **Pattern 1 — agent-as-operator:** your dashboard hands a plain-English task to an
  agent running next to it, and gets the answer back
- **Pattern 2 — dashboard-as-tools:** your dashboard publishes its own data as **MCP
  tools**, so any agent can use what your dashboard knows
- How to wire each one with real code (a service, an API route, an MCP server)
- How to keep an agent with hands **on a leash** — timeouts, narrow toolsets, no shells
- How to test both without trusting them blindly

You do not have to pick one. They stack: Pattern 1 gives your dashboard an agent to
*command*; Pattern 2 gives your agent your dashboard to *read*. Most useful dashboards
end up with both.

---

## Pattern 1 — Agent-as-Operator

**The idea in one sentence:** your dashboard puts a sentence into an agent, and the
agent — which has its own browser, its own computer, its own tools — goes and does the
multi-step work, then hands back the result.

Think of it like hiring a contractor. You don't teach your dashboard to hammer nails.
You call the contractor, describe the job, and they show up with their own tools.

### Step 1 — A service that runs the agent

Hermes can answer a single question and exit, which is exactly what we need. In your
project, create `src/lib/agent/hermes-operator.ts`. The heart of it is one line:

```ts
const args = ['chat', '-q', task, '-Q', '--format', 'text'];
const child = spawn(resolveHermesBin(), args, { shell: false, windowsHide: true });
```

That's `hermes chat`, with `-q` (the query), `-Q` (quiet mode, for programs, not humans),
and `--format text` (plain answer, no decoration). A few things make this a *service*
rather than a script:

- **`shell: false`.** The task is passed as **one argument**, not a shell string. That
  means a task can never smuggle in a shell command — no `;`, no `&&`, no backticks. This
  is the single most important safety decision in the whole chapter. Whenever you build
  a bridge like this, pass arguments as an array, never as a shell line.
- **A timeout.** A run is killed if it goes longer than allowed, so one stuck job can't
  hang your dashboard.
- **Output cleaning.** The CLI prints a `session_id:` footer and a log tag; the service
  strips those so you get just the answer.
- **A toolset switch.** The agent can be given different sets of tools. We default to
  `web` and read the real value from an environment variable, so widening the agent's
  power is a **deliberate, visible choice**:

```ts
const toolsets = opts.toolsets || process.env.HERMES_OPERATOR_TOOLSETS || 'web';
```

> **Try It Yourself.** Open `src/lib/agent/hermes-operator.ts` and find `shell: false`.
> Change it (mentally) to `true` and imagine a task that reads: *"List the files; rm -rf
> /tmp/important"*. With `shell: false` the whole thing is one harmless argument. With a
> shell, it's two commands. That's the difference.

### Step 2 — An API route to call it

Now expose it. Create `src/app/api/agent/operator/route.ts`. A `GET` reports whether the
agent is installed; a `POST` runs a task:

```ts
export async function POST(request: NextRequest) {
  const body = await request.json();
  const task = typeof body?.task === 'string' ? body.task.trim() : '';
  if (!task) {
    return NextResponse.json({ success: false, error: 'task is required' }, { status: 400 });
  }
  const result = await runHermesTask({ task, toolsets: body.toolsets, model: body.model });
  return NextResponse.json({ success: result.ok, output: result.output, error: result.error },
    { status: result.ok ? 200 : 500 });
}
```

Two habits worth copying into your own code: **validate the input** (reject a missing or
empty task before doing any work), and **cap the timeout** so a caller can't ask for an
agent run that never ends.

### Step 3 — Try it

With your dashboard running, ask if the agent is available:

```bash
curl http://localhost:3000/api/agent/operator
# {"available":true,"bin":"hermes.exe","defaultToolsets":"web", ...}
```

Then hand it a task:

```bash
curl -X POST http://localhost:3000/api/agent/operator \
  -H "Content-Type: application/json" \
  -d '{"task":"Reply with exactly: OPERATOR_OK"}'
# {"success":true,"output":"OPERATOR_OK","durationMs":7181}
```

That round trip is your dashboard *commanding an agent*. Now make it earn its keep:
`{"task":"Search the web for the latest news about space domain awareness and summarize
it in three bullets"}` — and Hermes will browse, read, and answer.

---

## Pattern 2 — Dashboard-as-Tools (an MCP Server)

**The idea in one sentence:** your dashboard publishes its own data as **MCP tools**, so
any agent can ask your dashboard questions and use the answers.

Pattern 1 was you telling an agent what to do. Pattern 2 is the reverse: the agent
reaching into *your* system. And the beautiful part is that you already built the hard
half — your dashboard has API routes. Exposing them as MCP tools is mostly plumbing.

Chapter 21 introduced MCP as "the universal plug." Here's how to make your dashboard plug
in.

### Step 1 — Install the MCP toolkit

An MCP server is a small program that speaks a standard protocol. There's an official
library for that; add it to your project:

```bash
npm install @modelcontextprotocol/sdk
```

The server runs as a **separate process** that the agent starts. It doesn't reach into
your database — it calls your dashboard's **HTTP API**, so it inherits every check your
API already does.

### Step 2 — Write the server

Create `scripts/dashboard-mcp-server.mjs`. The shape is: connect, then register one
function per tool.

```js
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

const BASE = process.env.DASHBOARD_URL || 'http://localhost:3000';

// One helper: GET a dashboard API path, parse JSON, throw on error.
async function api(path) {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`Dashboard ${path} -> HTTP ${res.status}`);
  return res.json();
}

const server = new McpServer({ name: 'proposal-genie-dashboard', version: '1.0.0' });

server.registerTool(
  'list_brands',
  { title: 'List companies', description: 'List the companies in the corporate vault.',
    inputSchema: {} },
  async () => {
    const data = await api('/api/brand-workspace/brands');
    const brands = data.brands || [];
    return { content: [{ type: 'text',
      text: JSON.stringify({ count: brands.length,
        brands: brands.map(b => ({ id: b.id, name: b.name, industry: b.industry })) }, null, 2) }] };
  }
);

await server.connect(new StdioServerTransport());
```

Each tool is three parts: a **name**, a **description the agent reads to decide when to
use it**, and an **input schema** (built with `zod`) that tells the agent what arguments
to send. The description matters more than beginners expect — it's the agent's only clue
about what your tool does, so write it like a help-wanted ad: *what it does, when to use
it.*

In the real file we register five tools, all calling existing routes:

| Tool | Calls | Returns |
|---|---|---|
| `dashboard_status` | `GET /api/heartbeat` | is the dashboard healthy |
| `list_documents` | `GET /api/documents` | the stored documents |
| `list_brands` | `GET /api/brand-workspace/brands` | the companies in the vault |
| `get_brand` | `GET /api/brand-workspace/brands` | one company, in full |
| `search_opportunities` | `GET /api/sam?keyword=…` | SAM.gov opportunities |

> **Try It Yourself.** Add a sixth tool. Pick any `GET` route in `src/app/api` that
> returns JSON you'd want an agent to see, and copy the `list_brands` shape — swap the
> name, the description, the path, and the fields you return. You've now extended your
> agent's reach with about ten lines.

### Step 3 — Test it before you trust it

You don't need an agent to test an MCP server. A test client does a handshake, lists the
tools, and calls them — proving the server works before anything else depends on it:

```
initialize → { name: 'proposal-genie-dashboard', version: '1.0.0' }
tools/list → dashboard_status, list_documents, list_brands, get_brand, search_opportunities
dashboard_status → { "reachable": true, "status": "healthy", ... }
list_brands → { "count": 1, "brands": [ { "id": "…", "name": "digantara", ... } ] }
```

That output is from this book's dashboard, on the machine it was written on. When the
handshake works and your tools return real data, the server is correct — *before* an
agent is in the loop. Testing the piece in isolation is how you keep debugging sane.

### Step 4 — Connect it to your agent

Now tell your agent the server exists. With Hermes, one command does it:

```bash
hermes mcp add proposal_genie \
  --command node \
  --args "C:/ai/proposal genie/PersonalAI-Dashboard/scripts/dashboard-mcp-server.mjs" \
  --env DASHBOARD_URL=http://localhost:3000
```

Then confirm it connected:

```bash
hermes mcp test proposal_genie
```

From now on, when you ask your agent something your dashboard knows — *"what companies
are in my vault?"* — it doesn't guess. It calls `list_brands`, reads the real answer, and
tells you. **Your dashboard just became the agent's memory.**

---

## Which Pattern, When?

- **You want your dashboard to *do* something it can't** (browse, run commands, work a
  portal) → **Pattern 1**. You're borrowing the agent's hands.
- **You want your agent to *know* what your dashboard knows** (documents, companies,
  opportunities) → **Pattern 2**. You're lending the agent your dashboard's memory.
- **Both** → build both, as we did. That's the natural end state: an agent with hands and
  a dashboard with a brain, each able to reach the other.

Chapter 22 covered *where the agent's hands are* (its own browser, its own computer). This
chapter covered *how the two systems talk*. Together they're the full picture.

## Common Pitfalls

- **Passing the task through a shell.** The single worst mistake. Always `spawn(bin,
  argsArray, { shell: false })`. A task is data, never a command line.
- **Forgetting the timeout.** An agent run can hang. Without a timeout, one stubborn job
  freezes your dashboard. Bound every run.
- **Starting with too many tools.** Give the operator `web` first. Widening to `terminal`
  or `file` should feel like unlocking a door, not flipping a switch.
- **Writing vague tool descriptions.** The agent picks tools by their description. "Gets
  data" gets you nothing; *"List the companies in the corporate vault, with industry and
  voice settings"* gets you the right call.
- **Letting the MCP server touch the database directly.** Route it through your API. Then
  it inherits your validation, your auth, and your error handling for free — and it can't
  corrupt anything your API wouldn't allow.
- **Testing only with the agent.** Test the piece alone first (the curl calls, the test
  client). When something breaks later, you'll already know which half is solid.

## Summary

You connected an agent to your dashboard both ways. **Pattern 1 (agent-as-operator)**
hands a plain-English task from your dashboard to an agent that does the work — safely,
by passing the task as data, bounding it with a timeout, and starting with a narrow
toolset. **Pattern 2 (dashboard-as-tools)** publishes your dashboard's data as **MCP
tools** so any agent can read what you know — tested in isolation first, then connected
to your agent with a single command. The rule underneath both: **let them talk, but give
each one a boundary.**

You've now built the whole conversation: your dashboard can command an agent, and your
agent can read your dashboard. That's the shape of every serious AI system from here on.

*Next time you wish your dashboard could just do something — or your agent just knew
something — you'll know exactly which pattern to reach for.*
