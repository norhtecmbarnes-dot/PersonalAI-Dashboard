# Chapter 22: Giving Your AI Hands — Agents and Browsers

*Read this after Chapter 21. You've built a private dashboard that answers questions
about your documents. This chapter is about the next step: an AI that doesn't just
answer, it **acts** — it opens a browser, fills in a form, downloads a file, runs a
command, and comes back with the job done. We'll look at the two honest ways to give
an AI hands, and at how the pieces fit together.*

## What You'll Learn in This Chapter

- The difference between a **chatbot** (answers) and an **agent** (does)
- The agent loop: think → act → look → think again
- Why the hard part isn't intelligence — it's **hands** (and knowing where they are)
- The two ways to give an agent a browser: an **agentic browser** vs **its own computer**
- A third option: letting the agent drive **your actual desktop**
- How this maps onto a real agent (Hermes) and a real framework (OpenMuse)
- Which one to pick for which job
- The safety rules that keep an agent with hands from becoming a liability

## From Answering to Doing

Your dashboard, as built, is a very good **assistant**. You ask, it answers. It reads
your documents, it drafts, it summarizes. That's power, and it's already more than
most people have.

But notice what it can't do. Ask it to *"find the latest solicitation on SAM.gov and
download the attachment"* and a chat model has to stop: it can talk about the page, but
it can't press the button. Ask it to *"rename every file in this folder and email me
the list"* and it can write the instructions, but it can't carry them out.

The gap between those two things has a name. An AI that only answers is a **chatbot**.
An AI that takes actions — in a loop, using tools, until the job is done — is an
**agent**.

## The Agent Loop (the one idea that explains everything)

An agent is not magic. It's a loop, and you've seen every part of it already:

1. **Think** — the model reads the goal and decides the next step ("I should open the
   page and find the search box").
2. **Act** — it uses a **tool** to do that step (open a browser, type text, click a
   button, run a command).
3. **Look** — it examines the result (the page changed, a file appeared, an error came
   back).
4. **Repeat** — back to step 1 with new information, until the goal is met.

A chatbot runs one turn of that loop and stops. An agent runs it as many times as it
takes. The intelligence was never the missing piece — the models are smart enough
today. The missing piece is **hands**: the tools the agent can actually use, and a
clear boundary around where those hands are allowed to reach.

That's what the rest of this chapter is about. An agent needs two hands more than any
others: a **browser** (to work the web) and a **computer** (to run commands and touch
files).

## Two Ways to Give an Agent a Browser

There are two serious, honest approaches. They solve different problems, and most
people will eventually want both.

### Approach A — An Agentic Browser

An **agentic browser** is a real browser that you install and use like any other —
except it also lets an AI drive it. You sign in to the sites you actually use (email,
your CRM, a government portal). Because *you're* signed in, the agent, when you ask it
to, can use those same logins to do real work in its own tabs.

The clearest example today is **BrowserOS neo**. You install it, sign in to the sites
you care about, and connect your agent with **one click over MCP** (you met MCP in
Chapter 21 — it's the universal plug). Then:

- the agent opens its **own tabs**, side by side with yours;
- a **dashboard on the new-tab page** shows every agent working right now, on which
  site, doing what;
- every finished session becomes a **replayable video** — if it went wrong, you rewind
  and see where;
- it all runs **on your machine**; browsing data doesn't go to someone's server.

**Best when the work is behind a login.** Booking, filing, downloading an invoice,
pulling numbers out of a portal — the chores that stop today because of a login screen.

### Approach B — Give the Agent Its Own Computer

The other approach doesn't touch your logins or your browser at all. Instead, you give
the agent its **own isolated computer**: a small sandbox (usually a **Docker
container**) with its own browser, its own files, and its own command line.

This is how **OpenMuse** does it. Its agent gets a **persistent Chromium** for
browsing and an optional **Linux container** for commands and files. That container is
deliberately locked down:

- it runs as a **nonroot** user, with a **read-only** system;
- it has **no access** to your folders, your keys, or your accounts;
- **networking is disabled** inside it — the agent browses through a separate,
  controlled browser service instead;
- commands run in a **`/workspace`** folder with a **30-second limit**, and every
  command's output and exit code are saved so you can see exactly what ran.

You can open its terminal and **take over** whenever you like.

**Best when you want strong isolation** and you *don't* need your personal logins. It's
a clean room: nothing the agent does can touch your real machine.

### A Third Option — Drive Your Real Desktop

There's a third approach worth naming. Instead of a special browser or a sandbox, the
agent can drive **your actual computer** — clicking and typing in the apps you already
have open. Done well, this runs in the **background**: your cursor doesn't jump, your
keystrokes aren't stolen, you can keep working while it clicks in another window. It's
the right tool for **non-web apps** (Outlook, Explorer, Figma) and for the browser's own
chrome (the address bar, a permission pop-up) — but for reading a web page, the browser
tools are steadier.

### The Three, Side by Side

| | Agentic browser | Its own computer | Drive your real desktop |
|---|---|---|---|
| Uses your real logins | **Yes** | No — isolated | Yes (it *is* you) |
| Isolation from your machine | Medium | **High** | None |
| Watch / replay what it did | **Yes**, built in | Via screenshots and logs | Via screenshots you ask for |
| Works with non-web apps | No | No | **Yes** |
| Setup effort | Install a browser, one-click connect | One config line | Install a driver |

## How This Maps to a Real Agent: Hermes

Let's make it concrete with **Hermes Agent** (the agent this book's dashboard can grow
into). Hermes gives you all three options above, from one place:

- **A browser, built in.** Hermes ships with headless browser tools for public pages.
  For logged-in work, connect **BrowserOS neo as an MCP server** — Hermes is an MCP
  client, so it discovers BrowserOS neo's browser tools and uses them like its own.
  (BrowserOS neo actually lists Hermes among the agents it supports.)

- **Its own computer, one line away.** In Hermes's config you set
  `terminal.backend: docker`. Hermes then starts **one** long-lived container and runs
  every command, file edit, and script inside it. Install a package once and it stays;
  change folders and the next command is still there. The container is hardened the
  same way OpenMuse's is: read-only system, no extra privileges, process limits. Other
  isolated backends — an **SSH** server, or cloud sandboxes like **Daytona** and
  **Modal** — give the same idea with different plumbing.

- **The real desktop, on request.** Hermes's **computer use** drives your native apps
  in the background when a job leaves the web.

- **A safety floor.** Before any risky command runs, Hermes can ask you to approve it
  (three modes: smart, manual, off), it keeps a hardcoded list of commands it will
  never run no matter what, and you can add your own "never do this" patterns. An agent
  with hands is only useful if the hands have a boundary — this is that boundary.

> **The two OpenMuses.** There are two projects with this name. **CopilotKit/OpenMuse**
> is the browser + terminal + files agent we've been describing. A different project
> (**nanoMuse**, formerly OpenMuseAgent/OpenMuse) is a phone-first Python agent. When
> you read their docs, make sure you're on the right one.

## Which Should You Pick?

A simple decision guide:

- **The job is behind a login** (a portal, your email, a CRM) → **agentic browser**
  (BrowserOS neo).
- **The job is public** and you want no setup → the agent's **built-in headless
  browser**.
- **The job runs commands or touches files**, and you want a clean wall between the
  agent and your machine → **the agent's own computer** (Docker).
- **The job is in a non-web app** → **drive the real desktop**.
- **You're not sure** → start with the built-in browser and the Docker sandbox; add the
  agentic browser the first time a login screen blocks you.

## Try It Yourself

1. **Watch the loop once.** Ask your dashboard's agent a task that needs two steps —
   "open example.com and tell me the page title." Watch it think, act, look, and go
   again. Seeing the loop once makes every agent feel less mysterious.

2. **Draw the boundary.** Write down the three things you'd *never* let an agent do
   unsupervised (send an email on your behalf? spend money? delete files?). Those
   three belong in your approval rules, not in your memory.

3. **Name your first real chore.** Pick one 15-minute web chore you do every week that
   is stuck behind a login. That's your first agentic-browser candidate — and the
   fastest way to feel the difference between a chatbot and an agent.

## Common Pitfalls

- **Confusing a chatbot with an agent.** If it can't take a second step, it's not an
  agent, no matter how smart it sounds.
- **Handing over logins carelessly.** An agentic browser works *because* it uses your
  real accounts. Treat "which agent may use which login" as a real decision, not a
  default.
- **Skipping isolation.** Running an agent's shell commands directly on your own
  machine is the single most common avoidable mistake. Give it a container.
- **Expecting perfection.** An agent will sometimes take a wrong path. The fix is
  watching and replaying its work — which is exactly why the "watch every step"
  features exist. Use them.
- **Forgetting the boundary.** Autonomy without approval rules is how a helpful agent
  becomes an expensive accident.

## Summary

Your dashboard already answers questions. This chapter was about the next rung: an AI
that **acts**. An agent is just a loop — think, act, look, repeat — and the thing that
makes it possible is **hands**. For the web, you give it a browser in one of two ways:
an **agentic browser** that uses your real logins (BrowserOS neo) when the job is
behind a login, or **its own computer** — a hardened Docker sandbox (as OpenMuse does)
— when you want a clean wall between the agent and your machine. A real agent like
Hermes gives you both, plus the option to drive your own desktop and a safety floor of
approvals. The pattern to remember for the rest of the book: **a capable agent on one
side, a firm boundary on the other.**

*Next time you catch yourself doing the same 15-minute web chore by hand, you'll know
exactly what to hand to your agent — and how to keep it on a leash.*
