# Chapter 28: LLM Research - Keeping Your Dashboard Current

**The LLM landscape changes constantly. Your dashboard should help you stay informed.**

## What You'll Learn

• Why **model research matters** for your workflow
• How to create a **leaderboard tracking system**
• Finding **free token sources** before they expire
• Setting up **automated research tasks**
• Using **open-source models** as free alternatives

---

## The Problem: L Landscape Changes Fast

| What Changes | How Often | Impact |
|-------------|-----------|--------|
| New model releases | Weekly | Better options available |
| Benchmark scores | Monthly | Know which models improve |
| Free token offers | Varied | Save money |
| Model prices | Quarterly | Budget planning |
| API changes | Occasionally | Breaking changes |

**What worked last month may not be optimal today.**

---

## Solution: Model Leaderboard Dashboard

Navigate to `/model-leaderboard` to see:

```
┌─────────────────────────────────────────────────────────────┐
│                    LLM LEADERBOARD                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  🎁 FREE TOKEN SOURCES                                      │
│  ┌──────────────┬─────────────┬─────────────────────┐     │
│  │ Provider     │ Free Tokens │ Conditions           │     │
│  ├──────────────┼─────────────┼─────────────────────┤     │
│  │ Ollama       │ Unlimited   │ Local, free models   │     │
│  │ OpenRouter   │ 1M tokens   │ New accounts         │     │
│  │ Together AI  │ 25M tokens  │ Monthly free tier    │     │
│  │ Groq         │ Rate limit  │ Free tier            │     │
│  │ Google AI    │ 15K/day     │ Gemini models        │     │
│  └──────────────┴─────────────┴─────────────────────┘     │
│                                                             │
│  📊 MODEL BENCHMARKS                                        │
│  ┌──────────────┬────────┬──────┬────────┬─────────┐     │
│  │ Model        │ Type   │ MMLU │ HumanEval│ Price  │     │
│  ├──────────────┼────────┼──────┼─────────┼─────────┤     │
│  │ DeepSeek V3  │ OSS    │ 90.2 │   82.6  │ $0.27   │     │
│  │ Llama 405B   │ OSS    │ 88.6 │   89.0  │ Free    │     │
│  │ GPT-4o       │ Front. │ 88.7 │   91.0  │ $5/$15  │     │
│  │ Claude 3.5   │ Front. │ 88.7 │   92.0  │ $3/$15  │     │
│  │ Qwen 3.5     │ Free   │ 82.1 │   78.0  │ Free    │     │
│  │ GLM-5        │ Free   │ 81.6 │   73.2  │ Free    │     │
│  └──────────────┴────────┴──────┴─────────┴─────────┘     │
│                                                             │
│  Last Updated: March 18, 2026                               │
│  [Refresh] [Create Research Task]                           │
└─────────────────────────────────────────────────────────────┘
```

---

## Free Token Sources (As of 2026)

### Always Free: Ollama

**Best source for this project.** Run open-source models locally:

```bash
# Install once, use forever
ollama pull qwen3.5:9b
ollama pull glm-5
ollama pull kimi-k2.5
ollama pull gpt-oss:20b
```

**No limits. No tokens. Just free.**

### Free Tiers (Check Current Offers)

| Provider | Free Amount | Models | Notes |
|----------|------------|--------|-------|
| OpenRouter | ~1M tokens | Many | Good for API testing |
| Together AI | ~25M tokens/month | Llama, Mistral | Generous tier |
| Groq | Rate limited | Llama, Mixtral | Very fast inference |
| Google AI Studio | 15K/day | Gemini | Good for testing |
| Hugging Face | 5M/month | Various | Use Inference API |

---

## Creating a Research Task

### PROMPT: Set Up Model Research Task

```
Create a scheduled task that runs weekly to:

1. Fetch latest model releases from:
   - Hugging Face Open LLM Leaderboard
   - LMSYS ChatBot Arena
   - OpenRouter models page

2. Extract for each model:
   - Name and provider
   - Parameter count
   - Context window
   - Benchmark scores (MMLU, HumanEval, GSM8K)
   - Pricing per 1M tokens

3. Track free token offers from:
   - OpenRouter (check /credits page)
   - Together AI (free tier page)
   - Groq (free tier)
   - Google AI Studio
   - Any new providers

4. Save to SQLite (table: model_research)

5. Compare with previous week:
   - New models since last check
   - Models removed/deprecated
   - Price changes
   - Free token offer changes

Schedule: Every Monday at 9 AM
Store results in the model_research note category.
```

### Setting Up the Schedule

```typescript
// In scheduled task configuration
{
  name: 'Model Research Update',
  schedule: '0 9 * * 1', // Monday 9 AM
  action: 'model-research',
  enabled: true,
}
```

---

## Understanding Benchmarks

### MMLU (Massive Multitask Language Understanding)

Tests knowledge across 57 subjects:
• STEM: Physics, Chemistry, Biology
• Humanities: History, Philosophy
• Social Sciences: Economics, Psychology
• Other: Law, Medicine, Business

**Score interpretation:**
• 90+ = Expert level
• 80-89 = Strong knowledge
• 70-79 = Competent
• 60-69 = Basic understanding

### HumanEval (Code Generation)

Tests Python code generation:
• 164 programming problems
• Function signatures + docstrings
• Must pass test cases

**Score interpretation:**
• 90+ = Professional coding ability
• 80-89 = Good programmer
• 70-79 = Competent
• 60-69 = Learning

### GSM8K (Math Reasoning)

Tests multi-step math problems:
• Grade school level
• Requires reasoning, not just calculation

**Score interpretation:**
• 95+ = Excellent reasoning
• 90-94 = Strong
• 80-89 = Good
• 70-79 = Adequate

---

## Open Source vs Frontier Models

### When to Use Open Source

✅ **Use Open Source When:**
• Running locally (privacy)
• No budget constraints
• Learning/experimenting
• Simple to medium tasks
• High volume (no per-token cost)

✅ **Best Open Source Models (2026):**

| Model | Size | Best For | Quality |
|-------|------|----------|---------|
| DeepSeek V3 | 685B | Reasoning | Matches GPT-4 |
| Llama 3.1 405B | 405B | General | Excellent |
| Qwen 2.5 72B | 72B | Balanced | Very Good |
| Qwen 3.5 | 0.5B-72B | Many sizes | Good |
| GLM-5 | 9B | Bilingual | Good |

### When to Use Frontier Models

✅ **Use Frontier When:**
• Complex reasoning required
• Highest quality needed
• Time-sensitive (fast API)
• Cost is acceptable

✅ **Best Frontier Models (2026):**

| Model | Best For | Cost |
|-------|----------|------|
| GPT-4o | General excellence | $5/$15 per 1M |
| Claude 3.5 Sonnet | Writing, reasoning | $3/$15 per 1M |
| Gemini 1.5 Pro | Long context | $1.25/$5 per 1M |

---

## Matching Model to Task

```typescript
// In your model router
function selectModel(task: string, complexity: 'simple' | 'medium' | 'complex'): string {
  // Simple tasks -> small model
  if (complexity === 'simple') {
    return 'qwen3.5:0.5b'; // Free, instant
  }
  
  // Medium tasks -> balanced model
  if (complexity === 'medium') {
    return 'qwen3.5:9b'; // Free via Ollama
  }
  
  // Complex tasks -> large model
  if (complexity === 'complex') {
    if (hasBudget()) {
      return 'gpt-4o'; // Or subscription
    } else {
      return 'deepseek-v3'; // Free tier available
    }
  }
  
  return 'qwen3.5:9b'; // Default free
}
```

---

## Adding to Your Dashboard

The leaderboard page is at `/model-leaderboard`. To add to navigation:

```tsx
// In TopNav.tsx
<NavLink href="/model-leaderboard">Leaderboard</NavLink>
```

---

## PROMPT: Build Model Router from Leaderboard

```
Based on the model leaderboard at /model-leaderboard:

1. Create a model router that selects:
   - Smallest free model for simple tasks
   - Best free model for medium tasks
   - Best available model for complex tasks

2. Include fallback logic:
   - If Ollama unavailable, use API
   - If free tier exhausted, warn user
   - If model not installed, suggest install

3. Track usage:
   - Log which models are used
   - Track token consumption
   - Estimate costs

4. Allow user configuration:
   - Preference: free/balanced/quality
   - Budget limit (if using paid APIs)
   - Available models on system

Create at src/lib/models/smart-router.ts
```

---

# Chapter 28: Keeping Current in a Changing World

> "The best model today might not be the best model next month. Your dashboard should help you stay informed without spending hours researching."

## A Personal Note

I built this system using only free models. GLM-5, Qwen 3.5, Kimi K2.5, GPT-OSS 20B — all free through Ollama. This entire dashboard runs on free software.

But I also track when free tokens become available from OpenRouter, Together AI, and other providers. Sometimes they offer millions of free tokens. It's worth checking.

The leaderboard in this dashboard is my way of keeping track. I hope it helps you too.

---

## The Problem We're Solving

Let me be honest about the LLM landscape:

| What Changes | How Often | Why It Matters |
|-------------|-----------|----------------|
| New models | Weekly | Something better might be available |
| Benchmark scores | Monthly | Which models actually perform well? |
| Free token offers | Random | Save money when you can |
| Prices | Quarterly | Budget planning |
| Deprecations | Occasionally | Your workflow might break |

**The model I used yesterday might not be the best choice today.**

---

## What the Leaderboard Shows You

When you go to `/model-leaderboard`, you'll see something like this:

**Free Token Sources** — Where to get free API access:

| Provider | What You Get | Conditions |
|----------|-------------|------------|
| **Ollama** | Unlimited local inference | Free forever |
| OpenRouter | ~1M tokens | New accounts |
| Together AI | ~25M tokens/month | Monthly tier |
| Groq | Rate-limited free tier | Fast inference |
| Google AI Studio | 15K tokens/day | Gemini models |

**Model Benchmarks** — How models compare:

| Model | Type | MMLU | Best For |
|-------|------|------|----------|
| DeepSeek V3 | Open Source | 90.2 | Complex reasoning |
| GPT-4o | Frontier | 88.7 | General excellence |
| Qwen 3.5 (9B) | Free/Ollama | 82.1 | Balanced tasks |
| GLM-5 (9B) | Free/Ollama | 81.6 | Bilingual chat |

---

## How I Use Free Models

Here's my actual setup — no paid APIs required:

**For quick responses (heartbeat, simple tasks):**
```bash
ollama pull qwen3.5:0.5b   # Tiny, instant
```

**For normal chat and work:**
```bash
ollama pull qwen3.5:9b     # Good balance
ollama pull glm-5          # Bilingual
```

**For writing:**
```bash
ollama pull kimi-k2.5      # Excellent English
```

**For complex reasoning:**
```bash
ollama pull deepseek-v3    # Frontier-level, free
ollama pull gpt-oss:20b    # Large context
```

**All free. No API keys. No usage limits.**

---

## The Export → Free AI Workflow

Here's something I do often that costs nothing:

**Step 1: Let your dashboard do the heavy lifting**

Your dashboard can:
• Search the web
• Process documents
• Organize research
• Compare models
• Track investments

**Step 2: Export as clean markdown**

Click the "Export" button on any page. You get something like:

```markdown
# Research Summary - AI Market Trends

## Key Findings
1. Market projected at $500B by 2027
2. Major players: OpenAI, Anthropic, Google
3. Key trend: Edge deployment growing

## Sources Reviewed
• Industry Report Q1 2026.pdf
• Gartner AI Predictions.pdf

## My Notes
• Focus on enterprise adoption
• Cost reduction is driving growth
```

**Step 3: Paste into a free AI**

Go to any of these (they have free tiers):
• **chat.openai.com** — GPT-4o limited access
• **gemini.google.com** — 15K tokens/day free
• **x.ai/grok** — Free tier available
• **claude.ai** — Message limits but good quality

**Step 4: Ask the frontier model to analyze**

```
Here's my research on AI market trends. Please analyze and tell me:
1. Investment risks I should consider
2. Companies worth watching
3. Your prediction for 5 years out
```

**Result:** You get frontier-model analysis without paying for API access.

---

## Why This Matters

Think about what you're doing:

• Your dashboard collects data (locally, privately)
• You export it in a clean format
• Free frontier AI analyzes it
• You get insights worth hundreds of dollars per month

**The dashboard + free AI combo is powerful.**

---

## Investment Tracking Example

The same approach works for investments:

1. Use dashboard to track:
   - Stock prices
   - Portfolio value
   - Transaction history

2. Export as markdown:
   ```markdown
   ## Portfolio Summary
   
   | Ticker | Shares | Cost | Current | Gain |
   |--------|--------|------|---------|------|
   | AAPL   | 50     | $150 | $178    | +18.7% |
   
   **Total:** $10,550 (+$1,650)
   ```

3. Paste into free AI:
   ```
   Analyze my portfolio. What should I adjust? Any risks?
   ```

---

## What About Benchmarks?

You'll see scores like MMLU, HumanEval, GSM8K. Here's what they mean:

**MMLU** — Tests general knowledge across 57 subjects
• 90+ = Expert level
• 80-89 = Strong
• 70-79 = Competent

**HumanEval** — Tests Python coding
• 90+ = Professional coder
• 80-89 = Good programmer
• 70-79 = Learning

**GSM8K** — Tests math reasoning
• 95+ = Excellent
• 90-94 = Strong
• 80-89 = Good

**Don't obsess over benchmarks.** A model with lower MMLU might be better for your specific use. Test it.

---

## Keeping the Leaderboard Updated

The leaderboard should update weekly. Here's how:

**Create a scheduled task:**

```
Task: Update Model Leaderboard
Schedule: Every Monday, 9:00 AM

Steps:
1. Check Hugging Face Open LLM Leaderboard
2. Check LMSYS ChatBot Arena
3. Check OpenRouter for free token offers
4. Update SQLite database
5. Show notification if significant changes
```

---

## When to Use What

**Simple tasks (heartbeat, formatting, simple questions):**
→ Use small free models (qwen:0.5b, angelslim)

**Medium tasks (chat, drafting, analysis):**
→ Use balanced free models (qwen:9b, glm-5)

**Complex tasks (reasoning, writing, code):**
→ Use larger free models (deepseek-v3, gpt-oss:20b)

**Or export to free AI:**
→ Use frontier models without paying (ChatGPT free, Gemini free)

---

## My Honest Recommendation

If you're reading this and thinking "which model should I use?" — here's what I actually do:

1. **Daily work:** Qwen 3.5 (9B) through Ollama — free, fast, good enough
2. **Writing:** Kimi K2.5 — excellent English, free, runs locally
3. **Complex reasoning:** DeepSeek V3 or export to ChatGPT free
4. **Quick tasks:** Qwen 3.5 (0.5B) — instant responses

I haven't paid for LLM API access in months. Everything in this dashboard runs on free models. That's the point.

---

## What's Next

The leaderboard page at `/model-leaderboard` shows you current data. It's a starting point — add your own research, track what matters to you, and export when you need deeper analysis.

**Next: Chapter 29 - Contributing to the Project**

---

## Quick Reference

### Free Models (Ollama)

```bash
ollama pull qwen3.5:0.5b   # Tiny - instant
ollama pull qwen3.5:9b     # Medium - balanced
ollama pull glm-5          # Good for chat
ollama pull kimi-k2.5      # Good for writing
ollama pull deepseek-v3   # Complex reasoning
```

### Check Free Tiers

• **OpenRouter**: https://openrouter.ai
• **Together AI**: https://together.ai
• **Groq**: https://groq.com
• **Google AI**: https://aistudio.google.com

### Benchmark Sources

• **Open LLM Leaderboard**: https://huggingface.co/spaces/HuggingFaceH4/open_llm_leaderboard
• **ChatBot Arena**: https://chat.lmsys.org/?leaderboard

---

**Next: Chapter 29 - Contributing to the Project**