# Chapter 24: Local-First, and Never Ask the Model for Knowledge

*Read this after Chapter 23. This chapter is the philosophy underneath everything else
you've built — the two rules that decide where the AI goes and where it must never go.
Get these right and your dashboard is trustworthy. Get them wrong and you've built a
very confident machine that is sometimes wrong in ways you can't see.*

## What You'll Learn in This Chapter

- Why the **option to run locally** is the most important feature in the whole system
- How to give your dashboard a **local-only switch** that provably never calls the cloud
- The rule that changes everything: **never ask the LLM for knowledge**
- The **division of labour** — what the model does, what tools and code do
- How to *tell the model where to look and give it the information* instead of hoping it
  remembers
- How to attach a **knowledge policy** to every model call
- How to tell the difference between a grounded answer and a confident guess

## Part 1: Local-First Is the Point

You can build a dashboard that only works because it phones a big model in a data center.
Many people do. It has three problems, and only one of them is about privacy.

**Privacy.** Every prompt that leaves your machine goes somewhere. If you're working on a
solicitation, a customer's documents, a debrief, or anything marked competition-sensitive,
that's a real cost — and for government contracting it can be a compliance problem.

**Cost.** Cloud models bill by use. A dashboard that runs all day, every day, on someone
else's meter gets expensive quietly.

**Dependence.** If the network is down, or the provider changes its terms, or the price
goes up, or the model is retired — your dashboard stops. A tool that only works when a
third party says so isn't really yours.

Running locally fixes all three. The model lives in your computer's memory. No network, no
account, no meter, no one to ask permission from. It's the difference between owning your
dashboard and renting it.

### The install-and-vibe-code path

The whole promise of this book is that a reader with domain experience and no programming
background can build this. For that to be true, the starting point has to be simple:

1. **Install Ollama** (one download, one installer).
2. **Pull one model** — `ollama pull qwen3.5:9b` (or a bigger one if your machine can
   take it).
3. **Run your dashboard** — `npm run dev`.

That's it. No API key, no account, no credit card. The dashboard finds the local model,
prefers it, and works. Cloud models are something you *add later, on purpose*, if you ever
want them — never something you need to get started.

> **Try It Yourself.** Unplug your network cable (or turn off Wi-Fi) and ask your
> dashboard a question. If a local model is running, it answers. That single test — work
> with the network off — is the whole definition of local-first, and most AI tools fail
> it.

### The local-only switch

"Prefers local" is good. "**Cannot** reach the cloud" is better, for work that must never
leave the machine. So we build one switch:

```
LOCAL_ONLY=true
```

When it's on, two things happen. First, the model list stops offering cloud models at all
— they're hidden, not just discouraged. Second, every model call passes through one gate
that refuses a cloud model with a plain-English reason:

> *Local-only mode is ON, so the cloud model "…" will not be called — nothing leaves this
> machine. Pick a local Ollama model, or set LOCAL_ONLY=false to allow cloud models.*

Two design lessons hide in that:

- **One chokepoint.** Route *every* model call through a single function, so one gate can
  enforce the rule everywhere. If you scatter raw API calls around your code, no single
  rule can cover them.
- **Refuse out loud.** Don't silently swap in a different model. Tell the user exactly
  what happened and how to change it. Silent substitutions are how trust dies.

> **Try It Yourself.** Set `LOCAL_ONLY=true`, restart, and try to chat with a cloud model.
> You should get the refusal — not an answer. Then set it back to `false` and watch the
> cloud model come back. You've just proven your own system keeps its promise.

## Part 2: Never Ask the Model for Knowledge

Here is the rule that separates a trustworthy dashboard from a confident one:

> **The LLM never supplies the facts. It supplies the language.**

An LLM is fluent, fast, and *unaccountable for the truth of what it says*. It has no
internal signal that separates "I remember this and it's correct" from "I'm producing
something that sounds right." To you, those look identical. That's the danger: the model
is right often enough to be trusted, and wrong often enough to hurt — a wrong NAICS code,
a wrong page limit, a citation to a section that doesn't exist.

So we never put the model in the position of being the authority. We decide what it's
allowed to know by *giving* it the information, and we use tools and code for anything
that has to be true.

### The division of labour

Write this on the wall above your desk:

| The job | Who does it |
|---|---|
| Understand a request in plain English | **The LLM** |
| Decide what information is needed | **The LLM**, with you |
| **Look the information up** | **A tool or code** |
| **Compute a number** | **Code** |
| **Perform an action** (open, click, call, run) | **A tool or an agent** |
| Structure, summarise, draft, translate | **The LLM** |
| **Verify a claim** | **You**, the human |
| **Supply the facts** | **The context you inject** |

Read the bottom two rows twice. **The human brings domain experience and final judgement.
The model brings language and structure.** That is the entire deal — and it's why a
person with deep domain knowledge and no programming background can build this: the
software handles the mechanics, the model handles the words, and *you* handle knowing
what's true.

### "Tell it where to look and give it the information"

This is the practical form of the rule. Instead of asking *"what is the page limit for
this solicitation?"* and hoping, you:

1. **Tell it where to look** — "check the uploaded RFP," or trigger the document lookup
   tool.
2. **Give it the information** — the retrieved passage goes into the prompt as context.
3. **Ask it to use only that** — and to say so if the answer isn't there.

Now the model isn't recalling; it's *reading* — and reading something you can inspect. If
the answer is wrong, the fault is visible in the source, not hidden in the model's memory.

### Attaching the policy

We make this a single line of code you can attach to any model call:

```ts
import { withKnowledgePolicy } from '@/lib/config/knowledge-policy';

const systemPrompt = withKnowledgePolicy(basePrompt);
```

The policy tells the model, in plain terms:

- Never answer a factual question from your own memory or training.
- Use the information you were given — documents, retrieved context, memory, tool output.
- When you need something you weren't given, **go get it with a tool, or ask**.
- **Never fill a gap with a guess.** State the gap instead.
- Attribute every specific claim; if you can't point to a source, don't make it.

And it names what the model *may* do freely — understand, organise, summarise, draft,
rewrite, translate, calculate, reason, and ask questions. It's not a muzzle; it's a job
description. You give it the facts, you get back something people can read.

### What a grounded answer looks like

Ask a *grounded* dashboard and a *guessing* chatbot the same question and watch the
difference:

> **Guessing chatbot:** "The page limit is 30 pages." *(sounds authoritative; may be
> invented)*
>
> **Grounded dashboard:** "Your uploaded RFP states 30 pages for the Technical Volume
> (Section L.2.3). I don't see a limit stated for the Management Volume in the documents
> I have — want me to check the amendments?"

The second one is longer, slightly less satisfying, and *usable*. It cites its source and
names its gap. That's the whole difference.

> **Try It Yourself.** Ask your dashboard for a specific fact that is **not** in its
> context or memory — something recent, or something only you would know. A well-built
> dashboard should say it doesn't have it and offer to look it up. If instead it answers
> confidently, your knowledge policy isn't attached — go attach it.

## Common Pitfalls

- **Mistaking fluency for accuracy.** The better the writing, the more trustworthy it
  *feels* — and the more a fabrication costs you. Judge the source, not the prose.
- **"It runs locally" without a hard switch.** A preference can be overridden by a
  fallback you forgot about. If it must never leave, use `LOCAL_ONLY`, and route every
  call through one gate.
- **Silently swapping models.** Never quietly replace the model the user asked for. Refuse
  out loud.
- **Attaching the policy to chat only.** Any path that can state a fact needs it — writing,
  document summaries, office generation, your expert agents.
- **Forgetting that tools can be wrong too.** A tool that scrapes a page can misread it. The
  policy makes the model *cite*, which lets you catch a bad source. Keep the human in the
  loop on the last mile.
- **Asking the model to "be accurate."** Useless — it can't see which parts are wrong. Tell
  it *where to look* and *give it the information* instead.

## Summary

Two rules, and everything else sits on them.

**Local-first:** the model runs on your machine, the switch to forbid the cloud is real
(one gate, refuses out loud), and a reader can go from install to a working dashboard
without an account or a credit card. That's what makes it *yours*.

**Never ask the model for knowledge:** the LLM supplies language, not facts. It understands,
organises, drafts, and asks. **Tools and code** retrieve, compute, and act. **You** decide
what's true. You tell the model where to look and give it the information — and when it
doesn't have something, it says so instead of inventing it.

Hold those two lines and you have something rare: an AI system you can actually trust,
running on hardware you own, whose failures are visible instead of hidden.

*That's the dashboard. Now go build yours.*
