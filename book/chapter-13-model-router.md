# Chapter 13: Smart Model Selection - Choosing the Right AI Brain

## What You'll Learn in This Chapter

• **How the Model Router works** - Automatic selection of the best AI model
• **Three-tier system** - Housekeeping, capable local, and cloud thinking models
• **Your options** - From 2B to 108B parameters, local to cloud
• **Why tools matter** - How small models + tools beat large models alone
• **How to customize** - Making the system work for YOUR needs

---

## Opening: The Big Question - Does Size Matter?

You've probably heard that "bigger is better" when it comes to AI models. The largest models (GPT-4, Claude, Llama-4) have hundreds of billions of parameters. They're incredibly capable. They're also:

• **Expensive** to run ($0.03-0.20 per 1,000 tokens)
• **Slow** on consumer hardware
• **Resource-hungry** (need expensive GPUs)
• **Overkill** for simple tasks

**But here's the secret:** You don't need a massive model for most tasks. In fact, you can build a system that outperforms large models alone by using **small models + the right tools**.

---

## The Philosophy: Tools Beat Memory

Remember Randy Hill's insight from Chapter 1: **Don't ask the LLM to know everything. Give it tools to find what it needs.**

**The Old Way (Large Models):**
• Model tries to remember everything in its training data
• Information gets compressed and lost
• Asks model: "What was the capital of France in 1850?"
• Model might be wrong or unsure

**The New Way (Small Models + Tools):**
• Model has access to SQL database (perfect memory)
• Model has access to web search (real-time info)
• Model has access to documents (your specific knowledge)
• Asks model: "Use the database to find the capital of France in 1850"
• Model queries database, gets exact answer

**This is why we can use 2B parameter models successfully.** The model doesn't need to know everything—it needs to know HOW to use tools.

---

## The Three-Tier Model System

Your AI Dashboard uses a smart system that automatically picks the right model for each job.

### Tier 1: Housekeeping (Qwen 3.5-2B or Similar)

**Think of this as your efficient intern.**

**What it is:**
• Ultra-lightweight model (only 2 billion parameters)
• Runs on CPU (no expensive GPU needed)
• Completely free to use
• Fast responses (5-15 seconds)

**Perfect for:**
• Scheduled tasks and heartbeats
• System monitoring
• Routine maintenance
• Quick Q&A
• Document summaries

**Models you can use:**
• `qwen3.5:2b` — Our default, near GPT-4 mini performance
• `gemma3:4b` — Google's efficient model, runs on CPU
• `llama3.2:1b` — Meta's tiny model, very fast
• `phi3:mini` — Microsoft's compact model

### Tier 2: Capable Local (7B-14B Parameters)

**Think of this as your skilled professional.**

**What it is:**
• Medium-sized local models
• Still runs on CPU (slower but manageable)
• Better reasoning and writing quality
• Good for production work

**Perfect for:**
• Writing and editing
• Document generation
• Analysis tasks
• Code generation
• Reasoning problems

**Models you can use:**
• `qwen2.5:7b` — Excellent balance of speed and quality
• `qwen2.5:14b` — Higher quality for demanding tasks
• `llama3.1:8b` — Meta's capable model
• `gemma2:9b` — Google's strong performer

### Tier 3: Cloud Thinking (27B-70B+ Parameters)

**Think of this as your expert consultant (on speed dial).**

**What it is:**
• Large models via API or Ollama Cloud
• Best quality available
• Costs money per use (or use free tokens)
• Reserved for complex tasks

**Perfect for:**
• Complex reasoning
• Creative writing
• Difficult problems
• Tasks where accuracy is critical

**Models you can use:**
• `qwen3.5:32b` — Very capable, reasonable cost
• `qwen3.5:27b` — High quality via Ollama Cloud
• `llama4:scout` — 108B parameters (requires GPU or patience!)
• `glm-4.7-flash` — 29B parameters, excellent multilingual
• `kimi-k2.5` — 1.1T parameters (Claude-distilled), via Ollama Cloud
• `glm-5` — 756B parameters (GPT-like), via Ollama Cloud
• Cloud APIs: GPT-4, Claude, etc.

---

## Your Options: From Minimal to Maximum

### Option A: Minimal Setup (Recommended for Beginners)

**Hardware:** Any modern laptop (4GB+ RAM)
**Models:** 2B-7B parameters only
**Cost:** $0/month
**Speed:** Fast (5-30 second responses)

**Works great for:**
• Personal assistant
• Document chat
• Writing help
• Learning and experimentation

**Models:**
```bash
ollama pull qwen3.5:2b      # Default, 2.3B parameters
ollama pull qwen2.5:7b      # For better quality, 7B parameters
```

### Option B: Balanced Setup (What This Book Demonstrates)

**Hardware:** Laptop with 8GB+ RAM
**Models:** 2B-14B local + occasional cloud
**Cost:** $0-20/month (cloud for heavy tasks)
**Speed:** Fast local, slower cloud

**Works great for:**
• Professional use
• Document processing
• Research assistance
• Content creation

**Models:**
```bash
# Local (free)
ollama pull qwen3.5:2b
ollama pull qwen2.5:14b
ollama pull phi4:14b        # Microsoft's model with reasoning

# Cloud (when needed)
# Uses Ollama Cloud free tokens
# Or API keys for specific providers
```

### Option C: Maximum Capability (Power User)

**Hardware:** Desktop with 16GB+ RAM or GPU
**Models:** Everything up to 108B parameters
**Cost:** $0 (if patient) or $20-100/month
**Speed:** Varies (2B = fast, 108B = very slow on CPU)

**Works great for:**
• Complex analysis
• Professional writing
• Code generation
• Research

**Models:**
```bash
# Large local (slow on CPU)
ollama pull qwen3.5:32b     # 32B parameters
ollama pull llama4:scout    # 108B parameters (very slow!)

# Use smaller models for speed, large for difficult tasks
```

### GPU vs CPU Requirements

**Can run on CPU (no dedicated GPU needed):**

| Model | Size | RAM Needed | Speed |
|-------|------|-----------|-------|
| `qwen3.5:2b` | 2B | ~4GB | Very fast |
| `gemma3:4b` | 4B | ~8GB | Fast |
| `qwen3.5:9b` | 9B | ~16GB | Moderate |

**Requires GPU with VRAM:**

| Model | Size | VRAM Needed | Notes |
|-------|------|--------------|-------|
| `qwen3.5:27b` | 27B | ~24GB | RTX 4090 or better |
| `qwen3.5:32b` | 32B | ~32GB | High-end GPU |
| `llama4:scout` | 108B | ~80GB | Multi-GPU or cloud |

**Cloud models (use via API):**

| Model | Provider | Notes |
|-------|----------|-------|
| `kimi-k2.5` | Ollama Cloud | Claude-distilled, best for English writing |
| `glm-5` | Ollama Cloud | GPT-like, 756B parameters |
| `deepseek-v3.2` | Ollama Cloud | 671B, excellent reasoning |

### Writing Model Fallback Chain

The system automatically selects the best model for writing tasks:

```typescript
// Writing model priority:
// 1. kimi-k2.5 (Cloud) - Claude-distilled, best for English
// 2. glm-5 (Cloud) - GPT-like, excellent quality
// 3. gpt-oss:20b (Local) - Requires GPU VRAM
// 4. gemma3:4b (Local) - Runs on CPU, no GPU needed
```

**Why this chain:**
• Cloud models give best quality
• Falls back to local when cloud unavailable
• `gemma3:4b` ensures writing works without GPU

### Option D: Enterprise Setup (Future Chapter)

**Hardware:** Server with GPU(s)
**Backend:** vLLM for serving
**Cost:** Depends on usage
**Speed:** Fast for many users

**Works great for:**
• Teams
• High-throughput APIs
• Production services
• Many concurrent users

**We'll cover this in Chapter 21: Scaling to Enterprise**

---

## Why Not Just Use the Biggest Model?

**The short answer:** You could, but you'd be wasting resources.

**Analogy:**
• Sending a text message? Use your phone (lightweight model)
• Writing a novel? Use your laptop (capable model)
• Calculating rocket trajectories? Use a supercomputer (large model)

**Different tasks need different tools.** Using a 108B parameter model to answer "What time is it?" is like using a nuclear reactor to toast bread.

**The Smart Approach:**
1. Use 2B-7B models for 80% of tasks (fast, free)
2. Use 14B models for 15% of tasks (quality, still free)
3. Use 27B+ models for 5% of tasks (when accuracy matters most)

**Result:** Better performance, lower cost, faster responses.

---

## How the Model Router Works

[Rest of chapter continues with existing content about the implementation...]

**Why it's smart:**
These tasks happen every few hours. Using a big model would waste money and resources. The 2B model is perfect — fast, efficient, and free.

**Real example:**
```
Every 2 hours, your Dashboard checks:
• Is everything running?
• Are there old log files to clean up?
• Should we archive old reports?

Cost: $0
Time: Under 1 second
```

### Tier 2: Capable Local (Best Available)

**Think of this as your skilled professional.**

**What it is:**
• The best model installed on YOUR computer
• Examples: Qwen 3.5-27B, Qwen 2.5-14B, Llama 3.2
• Runs locally (data never leaves your machine)
• Also completely free after installation

**Perfect for:**
• Writing documents
• Coding and debugging
• Chat conversations
• Data analysis
• Research tasks

**Why it's smart:**
These are your day-to-day tasks. The system automatically picks the largest model you have installed, giving you the best quality without cloud costs.

**Real example:**
```
You ask: "Write a Python function to analyze CSV data"

System checks: "What's the best local model available?"
• Found: Qwen 3.5-27B (27 billion parameters)
• Using it for coding task

Response quality: Excellent
Cost: $0
Privacy: ✅ Data never leaves your computer
```

### Tier 3: Cloud Thinking (GLM-5, Kimi-K2.5)

**Think of this as your expert consultant.**

**What it is:**
• Cloud-based models (run on powerful servers)
• Much larger (50+ billion parameters)
• Best reasoning capabilities
• Costs money per use (but only when needed)

**Perfect for:**
• Strategic planning
• Complex problem solving
• System architecture design
• Advanced debugging
• Creative brainstorming

**Why it's smart:**
You only pay when you REALLY need the brainpower. The system uses these sparingly and falls back to local models when possible.

**Real example:**
```
You ask: "Design a complete microservices architecture 
          for a banking application with security requirements"

System thinks: "This needs serious reasoning power"
• Escalating to GLM-5 Cloud
• Will cost approximately $0.02
• But worth it for complex architecture

Response quality: Expert-level
Cost: $0.02
Reasoning: Deep and thorough
```

---

## How the Model Router Decides

The router is like a smart receptionist that knows which "doctor" to send you to:

```typescript
// Behind the scenes, the system does this:

function getModel(taskType, options) {
  // Task: "heartbeat"
  if (taskType === "heartbeat") {
    return "qwen3.5:2b";  // Fast, cheap, efficient
  }
  
  // Task: "coding"
  if (taskType === "coding") {
    return getBestLocalModel();  // qwen3.5:27b if available
  }
  
  // Task: "strategic_planning"
  if (taskType === "strategic_planning") {
    if (budgetAllows()) {
      return "glm-5:cloud";  // Expert model
    } else {
      return getBestLocalModel();  // Fallback
    }
  }
}
```

**You don't need to think about this** — it happens automatically!

---

## Dynamic Model Loading

### The Problem with Hardcoded Models

Old way (bad):
```typescript
const models = [
  "glm-4.7-flash",
  "glm-5:cloud",
  "qwen2.5:14b",  // What if this isn't installed?
];
```

**Problem:** The app crashes if a model isn't installed!

### The Solution: Dynamic Discovery

New way (smart):
```typescript
// System asks Ollama: "What models do you have?"
const response = await fetch('/api/models');
const { models } = await response.json();

// Result: Only shows ACTUALLY available models
// ["qwen3.5:2b", "llama3.2"] - Just what you have!
```

**Benefits:**
• ✅ Never shows models you can't use
• ✅ Automatically detects new models
• ✅ Updates in real-time
• ✅ Works with ANY Ollama model

### The useModels Hook

Your Dashboard includes a powerful React hook:

```typescript
import { useModels } from '@/lib/hooks/useModels';

function MyComponent() {
  const {
    models,              // All available models
    selectedModel,       // Currently selected
    setSelectedModel,    // Change selection
    getCapableModel,     // Get best for task
    ollamaHealthy,       // Is Ollama running?
    loading,             // Still loading?
  } = useModels();

  // Dropdown automatically populated!
  return (
    <select value={selectedModel} onChange={e => setSelectedModel(e.target.value)}>
      {models.map(model => (
        <option key={model.id} value={model.id}>
          {model.name}
        </option>
      ))}
    </select>
  );
}
```

**Magic:** The dropdown fills itself with whatever models you have!

---

## Expert-Based Escalation

### The Idea

When you select an **expert** (like "Researcher" or "Copywriter"), the system knows you want high quality. It automatically escalates to a more powerful model.

### How It Works

```typescript
// You select: "Researcher" expert
const expert = {
  id: "researcher",
  name: "Researcher",
  role: "Research Specialist"
};

// System thinks: "Research needs brainpower!"
if (expert && expert.id !== "general-assistant") {
  // Prioritize best models
  const preferredModels = [
    "qwen3.5:27b",      // Most capable local
    "qwen2.5:14b",      // Second best
    "glm-5:cloud",      // Cloud thinking
  ];
  
  // Use the best available
  modelToUse = preferredModels.find(m => availableModels.includes(m));
}
```

**Real example:**

| Your Selection | Model Used | Why |
|----------------|------------|-----|
| General Assistant | qwen3.5:2b | Simple Q&A |
| Researcher | qwen3.5:27b | Needs deep analysis |
| Marketing Expert | qwen3.5:27b | Creative writing |
| Code Reviewer | qwen3.5:27b | Complex reasoning |

**You don't need to manually select models anymore!**

---

## PROMPT YOU CAN USE

### Prompt 1: Add a New Model to Your System

**Where to use:** Terminal with Ollama

```bash
# Install a new model
ollama pull qwen2.5:14b

# Verify it's available
ollama list

# Refresh your Dashboard - the model appears automatically!
```

### Prompt 2: Check Which Model Was Used

**Where to use:** Browser console

```javascript
// Open browser console (F12) and run:
fetch('/api/models')
  .then(r => r.json())
  .then(data => {
    console.log("Available models:", data.ollama.models);
    console.log("Default model:", data.defaultModel);
  });
```

### Prompt 3: Force a Specific Model

**Where to use:** In your code

```typescript
// If you really want a specific model:
import { useModels } from '@/lib/hooks/useModels';

function ChatComponent() {
  const { models, setSelectedModel } = useModels();
  
  // Override automatic selection
  useEffect(() => {
    setSelectedModel("qwen3.5:27b");
  }, []);
}
```

---

## How to Personalize This for YOUR Dashboard

### Option 1: Adjust the Priority List

**File:** `src/lib/hooks/useModels.ts`

Find this section:
```typescript
const priorityModels = [
  'qwen3.5:27b',
  'qwen2.5:14b', 
  'qwen3.5:2b',
  'llama3.2',
];
```

**Change it to prefer your favorites:**
```typescript
const priorityModels = [
  'llama3.2',         // You prefer Llama
  'mistral:7b',       // Try Mistral
  'qwen3.5:2b',       // Fallback to Qwen
];
```

### Option 2: Change Task-to-Model Mapping

**File:** `src/lib/models/model-router.ts`

Find `TASK_MODEL_MAP` and customize:
```typescript
const TASK_MODEL_MAP = {
  'heartbeat': 'local-fast',           // Keep this - saves money
  'chat': 'local-capable',             // Change to 'cloud-thinking' for better chat
  'coding': 'local-capable',           // Keep local - good for privacy
  'document_generation': 'cloud-thinking', // Add cloud for documents
};
```

### Option 3: Set Your Default Model

**File:** `src/lib/config/app-config.ts`

```typescript
// Change the default when no preference exists
const DEFAULT_MODEL = 'llama3.2';  // Instead of 'glm-4.7-flash'
```

---

## Common Pitfalls & How to Avoid Them

### Pitfall 1: "I selected a model but it's not working"

**Problem:** Model isn't installed in Ollama

**Solution:**
```bash
# Check what's installed
ollama list

# Install the missing model
ollama pull qwen3.5:27b
```

### Pitfall 2: "Everything is using cloud models and costing money"

**Problem:** `cloudForChat` or `cloudForComplex` is enabled

**Solution:**
```typescript
// In your settings or config
config.cloudForChat = false;      // Disable for chat
config.cloudForComplex = false;   // Disable for complex tasks
```

### Pitfall 3: "The model dropdown is empty"

**Problem:** Ollama isn't running

**Solution:**
```bash
# Start Ollama
ollama serve

# Or check if it's running
curl http://localhost:11434/api/tags
```

### Pitfall 4: "Small tasks are using big models"

**Problem:** Task classification is wrong

**Solution:** Check `TASK_MODEL_MAP` in model-router.ts and ensure tasks are categorized correctly.

---

## Key Takeaways

1. **Three-tier system** automatically optimizes cost and quality
2. **Housekeeping** (2B model) for routine tasks — fast and free
3. **Capable local** (largest installed) for daily work — free and private
4. **Cloud thinking** only for complex tasks — pay only when needed
5. **Dynamic loading** shows only available models
6. **Expert escalation** automatically uses better models

---

## Next Steps

**You now hold the key to efficient AI model management!**

• Your system automatically saves money by using small models for simple tasks
• You get expert-level quality when you actually need it
• Everything adapts to whatever models you have installed

**What's next?**
• Chapter 14: Canvas Fullscreen Mode — Better viewing for your generated UIs
• Chapter 15: Presentation Styling — Creating beautiful, branded presentations

**Or explore:**
• Try installing different models and watch them appear in the dropdown
• Test the expert escalation by selecting different experts
• Check your browser console to see which model was used

---

*Remember: The best model is the one that gets the job done efficiently. Let the router do the thinking!*

---

**End of Chapter 13**

**Questions?** Check the SYSTEM_GUIDE.md for detailed API reference.

**Want to dive deeper?** Look at `src/lib/models/model-router.ts` and `src/lib/hooks/useModels.ts` in your codebase.