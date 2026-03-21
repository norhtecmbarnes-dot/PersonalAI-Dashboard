# Chapter 27: Mixing and Matching LLMs - Match the Model to the Task

**Use the right model for the right job. Expensive isn't always better.**

## What You'll Learn

• How to **route tasks to different models** based on requirements
• Why **small models** are better for simple tasks
• **Free LLMs** available through Ollama
• **GGUF models** for resource-constrained systems
• Building a **cost-effective model routing strategy**

---

## The Philosophy: Right Model, Right Task

Not every task needs a large model. A heartbeat check doesn't need DeepSeek-v3. A simple classification doesn't need GPT-4.

**Think of it like tools:**
• Use a hammer for nails, not a sledgehammer
• Use a small model for simple tasks
• Save large models for complex reasoning

```
┌─────────────────────────────────────────────────────────────┐
│                    TASK COMPLEXITY                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Simple          Medium            Complex                  │
│  ─────────       ─────────         ─────────               │
│  qwen:0.5b       qwen:7b           deepseek-v3              │
│  gemma:2b        qwen:14b          glm-4                    │
│  tiny-llama      glm-5             gpt-oss:20b              │
│                                                             │
│  Heartbeat       Draft text       Complex reasoning        │
│  Classification  Code help        Multi-step logic          │
│  Simple chat     Analysis         Creative writing         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Free LLMs Through Ollama

This system runs **completely free** using Ollama's model library:

### Small Models (CPU-Friendly)

| Model | Size | Best For | Speed |
|-------|------|----------|-------|
| `qwen3.5:0.5b` | 0.5B | Ultra-fast responses, heartbeat | Instant |
| `qwen3.5:2b` | 2B | Quick chat, simple tasks | Very fast |
| `gemma3:4b` | 4B | Balanced chat, summarization | Fast |
| `phi4` | 4B | Code help, reasoning | Fast |
| `AngelSlim` | 1.8B | Minimal resources | Very fast |

### Medium Models (16GB+ RAM)

| Model | Size | Best For | Speed |
|-------|------|----------|-------|
| `qwen3.5:9b` | 9B | General chat, code | Moderate |
| `glm-5` | 9B | Chinese/English, reasoning | Moderate |
| `kimi-k2.5` | 9B | Writing, English quality | Moderate |
| `gpt-oss:20b` | 20B | Complex reasoning | Slower |

### The Author's Tested Free Models

These are the models tested and working in this system:

| Model | Parameters | Use Case | Quality | Speed |
|-------|------------|----------|---------|-------|
| **GLM-5** | 9B | General assistant, bilingual | ⭐⭐⭐⭐ | Fast |
| **GPT-OSS:20B** | 20B | Complex reasoning | ⭐⭐⭐⭐⭐ | Moderate |
| **Qwen 3.5** | 0.5B - 32B | Versatile, many sizes | ⭐⭐⭐⭐ | Varies |
| **Kimi 2.5** | 9B | Writing, English fluency | ⭐⭐⭐⭐⭐ | Moderate |
| **AngelSlim** | 1.8B | Minimal resources, CPU | ⭐⭐⭐ | Very fast |

All of these are **free** through Ollama.

---

## GGUF Models for Modest Hardware

GGUF is a quantized format that lets you run large models on small hardware.

### What is GGUF?

GGUF (GGML Universal Format) is a quantization method that:
• Reduces model size by 4-8x
• Runs on CPU efficiently
• Maintains reasonable quality

### Quantization Levels

| Quantization | Size Reduction | Quality | Speed |
|--------------|----------------|---------|-------|
| Q8_0 | 25% smaller | Near original | Slow |
| Q6_K | 30% smaller | Excellent | Moderate |
| Q5_K_M | 35% smaller | Good | Fast |
| Q4_K_M | 50% smaller | Acceptable | Fast |
| Q4_0 | 50% smaller | Acceptable | Fast |
| Q3_K | 60% smaller | Degraded | Very fast |
| Q2_K | 75% smaller | Poor | Very fast |

### The AngelSlim Model

A tiny but capable model tested in this system:

```bash
# Pull AngelSlim (1.8B parameters, 2-bit quantization)
ollama pull angelslim

# Specs:
# - Parameters: 1.8 billion
# - Quantization: Q4_0 (2-bit effective)
# - RAM: ~1.5 GB
# - Runs on: Any modern CPU
# - Speed: Instant responses
```

**When to use AngelSlim:**
• Heartbeat checks
• Simple classification
• Quick formatting
• Testing and development
• Resource-constrained environments

**When NOT to use AngelSlim:**
• Complex reasoning
• Code generation
• Long context
• Creative writing

---

## Task-Based Model Routing

### Step 1: Define Your Task Types

```typescript
// src/lib/models/task-types.ts

export const TASK_TYPES = {
  // Simple - use smallest model
  HEARTBEAT: {
    complexity: 'simple',
    suggestedModel: 'qwen3.5:0.5b',
    maxTokens: 100,
  },
  CLASSIFICATION: {
    complexity: 'simple',
    suggestedModel: 'qwen3.5:0.5b',
    maxTokens: 50,
  },
  
  // Medium - use balanced model
  CHAT: {
    complexity: 'medium',
    suggestedModel: 'qwen3.5:9b',
    maxTokens: 1000,
  },
  SUMMARIZATION: {
    complexity: 'medium',
    suggestedModel: 'glm-5',
    maxTokens: 500,
  },
  CODE_HELP: {
    complexity: 'medium',
    suggestedModel: 'qwen3.5:9b',
    maxTokens: 2000,
  },
  
  // Complex - use larger model
  REASONING: {
    complexity: 'complex',
    suggestedModel: 'gpt-oss:20b',
    maxTokens: 4000,
  },
  CREATIVE_WRITING: {
    complexity: 'complex',
    suggestedModel: 'kimi-k2.5',
    maxTokens: 4000,
  },
  CODE_GENERATION: {
    complexity: 'complex',
    suggestedModel: 'deepseek-v3.2',
    maxTokens: 4000,
  },
};
```

### Step 2: Configure Model Router

```typescript
// src/lib/models/model-router.ts

export class ModelRouter {
  private costPreference: 'free' | 'balanced' | 'quality';
  
  selectModel(task: TaskType): string {
    const taskConfig = TASK_TYPES[task];
    
    if (this.costPreference === 'free') {
      return this.selectFreeModel(taskConfig);
    }
    
    if (this.costPreference === 'quality' && taskConfig.complexity === 'complex') {
      return 'deepseek-v3.2'; // Or your preferred large model
    }
    
    return taskConfig.suggestedModel;
  }
  
  private selectFreeModel(config: TaskConfig): string {
    // All free through Ollama
    switch (config.complexity) {
      case 'simple':
        return 'qwen3.5:0.5b'; // Smallest free model
      case 'medium':
        return 'qwen3.5:9b'; // Good balance, free
      case 'complex':
        return 'gpt-oss:20b'; // Complex but still free locally
      default:
        return 'qwen3.5:9b';
    }
  }
}
```

### Step 3: Use in Your Code

```typescript
// Example: Heartbeat check (uses tiny model)
const result = await modelRouter.chat({
  task: 'HEARTBEAT',
  message: 'System status check. All services OK?',
  // Router selects qwen3.5:0.5b automatically
});

// Example: Complex reasoning (uses large model)
const result = await modelRouter.chat({
  task: 'REASONING',
  message: 'Analyze the trade-offs between REST and GraphQL for an e-commerce API.',
  // Router selects gpt-oss:20b automatically
});
```

---

## Building with Free Models

### The Free Stack

You can build and run this entire system with **zero cost** using:

```
┌─────────────────────────────────────────────────────────────┐
│                    FREE MODEL STACK                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Development/Testing                                        │
│  ├── qwen3.5:0.5b     Quick iteration, instant response    │
│  └── angelslim        Tiny model for minimal hardware      │
│                                                             │
│  Production (CPU)                                           │
│  ├── qwen3.5:2b       Basic chat and tasks                 │
│  └── gemma3:4b        Balanced performance                 │
│                                                             │
│  Production (GPU/16GB+)                                     │
│  ├── qwen3.5:9b       Main assistant                        │
│  ├── glm-5            Bilingual, reasoning                  │
│  └── kimi-k2.5       Writing quality                        │
│                                                             │
│  Complex Tasks                                              │
│  └── gpt-oss:20b      Deep reasoning (free, local)         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Cost Comparison

| Stack | Monthly Cost | Quality | Speed |
|-------|-------------|---------|-------|
| All Free (Ollama) | **$0** | Good-Excellent | Varies |
| OpenAI API | $20-200 | Excellent | Fast |
| Anthropic API | $20-200 | Excellent | Fast |
| Hybrid (Free + API) | $5-50 | Excellent | Fast |

**The free stack builds the system AND runs it.**

---

## Practical Model Selection

### Prompt: Set Up Free Model Stack

```
Configure my AI Dashboard to use only free local models:

1. For heartbeat/system checks: qwen3.5:0.5b (instant, free)
2. For basic chat: qwen3.5:9b (good quality, free)
3. For writing: kimi-k2.5 (excellent English, free)
4. For complex reasoning: gpt-oss:20b (large but free)

Create the model router configuration at:
src/lib/models/model-router.ts

Include fallback logic if a model isn't available.
```

### Example: Heartbeat with Tiny Model

```typescript
// Heartbeat check - uses smallest model
async function runHeartbeat(): Promise<void> {
  // Don't waste tokens on expensive model!
  const result = await fetch('/api/chat', {
    method: 'POST',
    body: JSON.stringify({
      model: 'qwen3.5:0.5b', // Tiny, instant
      message: 'Heartbeat check. Return "OK" if healthy.',
      maxTokens: 10,
    }),
  });
  // Cost: ~5 tokens, instant response
}
```

### Example: Writing with Quality Model

```typescript
// Creative writing - uses appropriate model
async function generateWriting(prompt: string): Promise<string> {
  const result = await fetch('/api/chat', {
    method: 'POST',
    body: JSON.stringify({
      model: 'kimi-k2.5', // Great for writing
      message: prompt,
      maxTokens: 4000,
    }),
  });
  // Worth the extra compute for quality
}
```

---

## GGUF Models in Ollama

### Installing GGUF Models

```bash
# Many GGUF models are available directly
ollama pull qwen2.5:0.5b
ollama pull phi3:mini

# For custom GGUF files, create a Modelfile:
cat > Modelfile << EOF
FROM ./angelslim-q4_0.gguf
PARAMETER temperature 0.7
PARAMETER num_ctx 2048
EOF

ollama create angelslim -f Modelfile
```

### When to Use GGUF

| Hardware | GGUF Choice | Quality Tradeoff |
|----------|-------------|-------------------|
| 4GB RAM | Q4_0, tiny model | Acceptable for simple tasks |
| 8GB RAM | Q5_K_M, small model | Good quality |
| 16GB RAM | Full model or Q8 | Excellent quality |
| 32GB+ | Run multiple models | No compromise |

---

## Model Router Implementation

### PROMPT: Build Smart Model Router

```
Create a model router that matches models to tasks:

Tasks:
1. Heartbeat - use smallest model (qwen3.5:0.5b)
2. Quick chat - use balanced model (qwen3.5:9b)  
3. Writing - use quality model (kimi-k2.5)
4. Complex reasoning - use large model (gpt-oss:20b)
5. Code generation - use code model (deepseek-v3)

Features:
• Fallback if model not available
• Cost preference (free/balanced/quality)
• Token limits per task
• Logging of model selection

Create at: src/lib/models/smart-router.ts
```

---

## Testing Your Model Selection

### Verify Model Works

```bash
# Test each model
ollama run qwen3.5:0.5b "Hello, respond with 'OK'"
ollama run qwen3.5:9b "What is 2+2?"
ollama run kimi-k2.5 "Write a haiku"
ollama run gpt-oss:20b "Explain quantum computing"
```

### Benchmark Response Time

```typescript
// Simple benchmark
async function benchmarkModel(model: string): Promise<number> {
  const start = Date.now();
  await fetch('/api/chat', {
    method: 'POST',
    body: JSON.stringify({
      model,
      message: 'Say "done"',
      maxTokens: 5,
    }),
  });
  return Date.now() - start;
}

// Results will guide model selection
const times = {
  'qwen3.5:0.5b': await benchmarkModel('qwen3.5:0.5b'), // ~100ms
  'qwen3.5:9b': await benchmarkModel('qwen3.5:9b'),     // ~2s
  'gpt-oss:20b': await benchmarkModel('gpt-oss:20b'),   // ~10s
};
```

---

## The Model Message Bus - Hierarchical LLM Communication

Beyond simple routing, you can build a **message bus** where models communicate with each other, delegating tasks up the chain when needed.

### The Concept

Small local models can **delegate to cloud models** when they feel overwhelmed. This saves tokens and lets small models access smarter systems:

```
┌─────────────────────────────────────────────────────────────┐
│                    MODEL MESSAGE BUS                         │
│                                                             │
│  ┌──────────────┐                                          │
│  │ Local Small  │ ←── Triage/Preprocess (qwen3.5:2b)       │
│  │   Model      │                                          │
│  └──────┬───────┘                                          │
│         │                                                   │
│         │ "This is complex, need help"                     │
│         ▼                                                   │
│  ┌────────────────────────────────────────────┐            │
│  │           TASK ROUTER/DISPATCHER            │            │
│  │  • Analyze complexity                      │            │
│  │  • Check token budget                      │            │
│  │  • Route to appropriate model             │            │
│  └──────────────────┬───────────────────────┘            │
│                      │                                      │
│         ┌────────────┼────────────┐                        │
│         ▼            ▼            ▼                        │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                 │
│  │  Local   │  │  Cloud   │  │  Cloud    │                 │
│  │  Large   │  │  Fast    │  │  Smart    │                 │
│  │  Model   │  │  (Groq)  │  │  (GPT-4)  │                 │
│  └──────────┘  └──────────┘  └──────────┘                 │
└─────────────────────────────────────────────────────────────┘
```

### Why Build a Message Bus?

**Benefits:**
• **Save tokens** - Small model does triage, only expensive models when needed
• **Overwhelm detection** - Model decides when it needs help
• **Hierarchical processing** - Results flow back up the chain
• **Cost savings** - Local processing for simple tasks
• **Access to smarter models** - Small models can use cloud models as "consultants"

### How It Works

**Step 1: Triage (Local Small Model)**

The small model acts as a preprocessor:

```
SYSTEM: You are a triage assistant. Determine if the user's question
requires escalation to a more capable model.

RULES:
• If question is simple (what, who, when, list): NO escalation
• If question requires analysis, research, or multi-step: ESCALATE
• If context is long (>2000 chars): ESCALATE

Respond with:
1. COMPLEXITY: low/medium/high
2. ESCALATE: yes/no
3. REASON: brief explanation
```

**Step 2: Complexity Assessment**

The small model analyzes:
• Number of complexity indicators (analyze, research, compare)
• Context length
• Current token budget remaining

**Step 3: Delegation Decision**

Based on complexity:

| Complexity | Action | Model Used |
|------------|--------|------------|
| Low | Process locally | `qwen3.5:2b` |
| Medium | Process locally | `qwen3.5:9b` |
| High | Escalate to cloud | `gpt-4o` or `groq/llama` |
| Budget Low | Force local | Any available |

**Step 4: Response Aggregation**

Results flow back:
1. Cloud model processes complex task
2. Response returns to small model
3. Small model formats/validates result
4. User receives unified response

### Implementation

```typescript
// src/lib/services/model-bus.ts

interface DelegationRequest {
  originalQuery: string;
  context: string;
  sourceModel: string;
}

interface DelegationResponse {
  success: boolean;
  messageId: string;
  finalResponse: string;
  delegationPath: string[];  // Track what models handled it
  totalTokens: number;
  costSavings?: {
    localTokens: number;
    cloudTokens: number;
  };
}

class ModelMessageBus {
  private messageLog: ModelMessage[] = [];

  async process(request: DelegationRequest): Promise<DelegationResponse> {
    // Step 1: Triage with small model
    const triage = await this.triage(request.originalQuery);
    
    // Step 2: Decide escalation
    if (triage.requiresEscalation) {
      // Step 3: Delegate to cloud
      const cloudResponse = await this.delegateToCloud(
        request.originalQuery,
        triage.complexity
      );
      return {
        ...cloudResponse,
        delegationPath: ['local-small', 'cloud-smart']
      };
    }
    
    // Step 4: Process locally
    return await this.processLocally(request.originalQuery);
  }
}
```

### PROMPT: Implement Model Message Bus

```
Create a model message bus that allows hierarchical LLM communication:

1. Small model (qwen3.5:2b) does initial triage
2. Assesses complexity (low/medium/high)
3. If high complexity OR budget allows:
   - Delegate to cloud model (groq, openai, or anthropic)
   - Include full context
   - Receive response
4. Log the delegation path (which models handled)
5. Track token usage (local vs cloud)
6. Return aggregated response

Create at: src/lib/services/model-bus.ts

Include:
- Token budget tracking per day
- Fallback if cloud fails
- Cost estimation
- Message history for debugging
```

### Practical Use Cases

**1. Research Assistant**
```
User: "Compare REST vs GraphQL for e-commerce, include pros/cons"
  ↓
Small model triage: COMPLEX, ESCALATE
  ↓
Cloud model (GPT-4): Detailed analysis
  ↓
User receives comprehensive response
```

**2. Quick Question**
```
User: "What is my dog's name?" (from context)
  ↓
Small model triage: LOW, process locally
  ↓
Small model answers from memory
  ↓
No cloud cost, instant response
```

**3. Document Analysis**
```
User: [Uploaded 50-page contract]
  ↓
Small model triage: HIGH complexity (long context)
  ↓
Cloud model: Full analysis
  ↓
Small model: Format summary
  ↓
User receives structured summary
```

### Cost Savings Example

| Without Message Bus | With Message Bus |
|---------------------|-----------------|
| Every query → GPT-4 | Simple → Local (free) |
| 100 queries/day | Complex → Cloud |
| Cost: ~$0.50/day | Cost: ~$0.10/day |
| Monthly: $15 | Monthly: $3 |

### Setting Up Cloud Delegation

```bash
# Configure cloud models in .env.local
OLLAMA_BASE_URL=http://localhost:11434
OPENAI_API_KEY=sk-...           # For GPT-4 escalation
GROQ_API_KEY=gsk_...            # For fast cloud fallback
ANTHROPIC_API_KEY=sk-ant...     # For Claude escalation

# Enable cloud fallback (optional)
ENABLE_CLOUD_ESCALATION=true
```

### Testing the Message Bus

```bash
# Test triage
curl -X POST http://localhost:3000/api/message-bus/triage \
  -d '{"query": "What is 2+2?"}'

# Test escalation
curl -X POST http://localhost:3000/api/message-bus/process \
  -d '{"query": "Analyze this code for security issues...", "context": "..."}'

# Check token budget
curl http://localhost:3000/api/message-bus/budget
```

---

## Key Takeaways

✅ **Match model to task** - Small for simple, large for complex

✅ **Free models work** - Entire system runs on free Ollama models

✅ **GGUF for minimal hardware** - Run larger models quantized

✅ **Heartbeat = tiny model** - Don't waste tokens on status checks

✅ **Test before deploying** - Verify each model works on your hardware

✅ **Cost preference setting** - Let user choose free/balanced/quality

---

## Quick Reference

### Free Models (Ollama)

```bash
# Pull all free models
ollama pull qwen3.5:0.5b    # Tiny - heartbeat
ollama pull qwen3.5:2b      # Small - simple tasks
ollama pull qwen3.5:9b      # Medium - general
ollama pull glm-5           # Medium - bilingual
ollama pull kimi-k2.5       # Medium - writing
ollama pull gpt-oss:20b     # Large - reasoning
```

### Model Selection Rules

| Task | Model | Reason |
|------|-------|--------|
| Heartbeat | qwen:0.5b | Smallest, instant |
| Classification | qwen:2b | Fast, simple |
| Chat | qwen:9b | Good balance |
| Writing | kimi-k2.5 | Best English |
| Reasoning | gpt-oss:20b | Large context |
| Code | deepseek-v3 | Code-focused |

---

**The key insight: You don't need expensive models for every task. Mix and match to optimize cost, speed, and quality.**

**Next: Chapter 28 - Advanced Configuration**