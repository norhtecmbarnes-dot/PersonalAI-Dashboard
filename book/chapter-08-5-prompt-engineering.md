# Chapter 8.5: Prompt Engineering for Small Models

> The difference between a good prompt and a great prompt can make a small model perform like a large one.

## Why This Matters

**Small local models are powerful but limited.** They might have:
• Less training data
• Shorter context windows
• Less ability to understand vague instructions

**Large frontier models are great at prompt engineering.** They can take your rough idea and turn it into a precise prompt that works well on smaller models.

**The strategy:** Use free frontier models to improve prompts, then use those prompts on free local models.

---

## The Two-Model Workflow

```
┌─────────────────────────────────────────────────────────────┐
│                 PROMPT EXPANSION WORKFLOW                  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Step 1: Write rough idea                                   │
│          "I want to analyze my sales data"                  │
│                      ↓                                      │
│  Step 2: Use FREE frontier model                            │
│          (ChatGPT free, Gemini free, Grok free)             │
│          to expand the prompt                               │
│                      ↓                                      │
│  Step 3: Get detailed prompt                                │
│          with clear sections, examples, output format       │
│                      ↓                                      │
│  Step 4: Use expanded prompt                                │
│          on your LOCAL model                                │
│          (works much better!)                               │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## The Prompt Expander

Here's a prompt you can paste into ChatGPT (free), Gemini, Grok, or Claude:

### PROMPT: Expand My Prompt

```
I need you to help me create a better prompt for a smaller AI model.

## My Rough Prompt
[PASTE YOUR ROUGH IDEA HERE]

## What I Need
Create a detailed prompt that:
1. Has clear sections with headers
2. Defines the role the AI should take
3. Provides context and background
4. Includes 1-2 examples of expected inputs/outputs
5. Specifies the exact output format
6. Uses markdown formatting
7. Handles edge cases explicitly

## Output Format
Return ONLY the improved prompt, ready to copy and use.

Make it comprehensive enough that a model with limited context can understand what to do.
```

---

## Example: Before and After

### Before (Rough Prompt)

```
Analyze my sales data and tell me what's wrong.
```

**Problem:** Too vague. Small model won't know what analysis you want.

### After (Expanded Prompt)

```markdown
# Sales Data Analysis Task

## Role
You are a business analyst specializing in retail sales analysis.

## Context
I have a CSV file with sales data including: date, product, quantity, price, region.

## Task
Analyze the sales data and identify:
1. **Trends** — Which products are growing/declining?
2. **Anomalies** — Any unusual spikes or drops?
3. **Seasonality** — Are there patterns by month/week?
4. **Opportunities** — Where could we improve?

## Input Data Format
```csv
date,product,quantity,price,region
2024-01-15,Widget A,100,25.99,North
2024-01-15,Widget B,50,15.99,South
```

## Output Format
Provide your analysis in this exact format:

### Summary
[2-3 sentence overview]

### Key Findings
- **Finding 1**: [description]
- **Finding 2**: [description]

### Recommendations
1. [specific action]
2. [specific action]

### Data Quality Notes
[Any issues with the data]
```

## Edge Cases
- If data is missing, note it but continue analysis
- If no clear trends, state that clearly
- If uncertain about a finding, say "possible" not definite
```

**Result:** A small model can now give excellent results because the prompt is structured.

---

## Why Markdown Matters

Markdown is a lightweight format that LLMs understand extremely well.

### What is Markdown?

```markdown
# This is a heading
## This is a subheading

This is normal text.

- This is a bullet point
- Another bullet point

| Table | Header |
|-------|--------|
| Data  | Value  |

**Bold text** and *italic text* work too.

```code block```
```

### Why LLMs Love Markdown

| Feature | Plain Text | Markdown |
|---------|------------|----------|
| Structure | Ambiguous | Clear headers |
| Tables | Confusing | Structured |
| Lists | Unclear hierarchy | Clear nesting |
| Code mixing | Hard to parse | Code blocks |
| Context for LLM | Low | High |

**Result:** Less hallucination, better answers.

---

## Reducing Hallucinations with Markdown

### The Problem with Unstructured Input

```
My company does consulting. We have 5 consultants. Revenue is down 15%. Help me figure out why.
```

**LLM might hallucinate:**
• Invent reasons you didn't mention
• Make assumptions about your business
• Give generic advice that doesn't apply

### The Solution: Structured Input

```markdown
# Business Context

## Company Overview
- **Industry**: Consulting
- **Size**: 5 consultants
- **Primary Service**: [specify type]
- **Client Base**: [B2B/B2C/both]

## Problem Statement
- Revenue down 15% in last quarter
- Started: [date]
- Affected: [specific service/region]

## Data Available
- Revenue by month: [table or describe]
- Client count: [number]
- Average project value: [amount]

## What I Need
Identify the most likely causes based on this information and suggest 3 specific actions I should take first.
```

**LLM Response:**
• Focused on your actual situation
• Uses data you provided
• Gives actionable suggestions
• Less likely to invent irrelevant ideas

---

## Converting Documents to Markdown

### PROMPT: Convert Complex Document

```
Convert the following document to clean markdown format:

[PASTE YOUR DOCUMENT]

Requirements:
1. Use proper heading hierarchy (# ## ###)
2. Convert tables to markdown tables
3. Preserve all important information
4. Remove formatting artifacts
5. Add a table of contents if long
6. Keep bullet points as proper markdown lists
```

### Example: Converting a PDF Report

**Before (PDF content):**

> The Quarterly Sales Review document contains detailed analysis of our three product lines: Widget A, Widget B, and Widget C. Revenue for Q1 was $5.2M (up 12%), Q2 was $4.8M (down 7%), and Q3 was $5.5M (up 15%). Key findings include: increased marketing spend correlated with Q1 and Q3 gains, while Q2 had supply chain issues. The executive summary recommends...

**After (Markdown):**

```markdown
# Quarterly Sales Review

## Executive Summary
Revenue performance across Q1-Q3 with key findings and recommendations.

## Revenue by Quarter

| Quarter | Revenue | Change |
|---------|---------|--------|
| Q1 | $5.2M | +12% |
| Q2 | $4.8M | -7% |
| Q3 | $5.5M | +15% |

## Key Findings
- Marketing spend correlated with Q1 and Q3 gains
- Q2 supply chain issues caused revenue drop
- Widget A performed best across all quarters

## Recommendations
1. Increase marketing budget by 10%
2. Address supply chain weaknesses
3. Focus on Widget A messaging
```

**Why this matters:**
• LLMs process markdown more reliably
• Each section is clearly defined
• Tables are structured data, not text blobs
• Hallucinations are reduced because structure guides interpretation

---

## MCP: Model Context Protocol

**MCP (Model Context Protocol)** is an open standard that connects AI tools to data sources and APIs in a standardized way.

### What MCP Does

Think of MCP as a smart adapter between your AI and the outside world:

```
┌─────────────────────────────────────────────────────────────┐
│                    MCP ARCHITECTURE                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  AI Tools (OpenCode, Claude Code, Cursor)                   │
│                      ↕ MCP                                  │
│  MCP Server (your_dashboard)                               │
│       ┌─────────────┬─────────────┬─────────────┐           │
│       │ Tools       │ Resources   │ Prompts    │           │
│       │             │             │             │           │
│       │ • get_doc   │ • documents │ • templates│           │
│       │ • search    │ • brands    │ • prompts  │           │
│       │ • create    │ • memory    │             │           │
│       └─────────────┴─────────────┴─────────────┘           │
│                      ↓                                      │
│  Your Data                                                  │
│  (Documents, Brand Voice, Tasks, Memory)                    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Three Main Capabilities

**1. Tools — Functions the AI can call:**

```python
@mcp.tool()
async def search_documents(query: str) -> str:
    """Search through uploaded documents."""
    results = await search_index(query)
    return json.dumps(results)

@mcp.tool()
async def get_brand_voice(brand_id: str) -> str:
    """Get brand voice guidelines."""
    brand = await get_brand(brand_id)
    return brand.voice_guide
```

**2. Resources — Data the AI can reference:**

```python
@mcp.resource("docs://all")
async def get_all_documents() -> str:
    """Return all uploaded documents."""
    return json.dumps(documents)

@mcp.resource("memory://context")
async def get_memory_context() -> str:
    """Return AI's persistent memory."""
    return json.dumps(memory_store)
```

**3. Prompt Templates — Pre-written prompts:**

```python
@mcp.prompt()
async def summarize_document(doc_id: str) -> str:
    """Prompt to summarize a document."""
    doc = await get_document(doc_id)
    return f"""Summarize this document:

{doc.content}

Provide:
1. Main thesis
2. Key points
3. Action items"""
```

### Why MCP Matters

| Without MCP | With MCP |
|------------|----------|
| Each AI tool has its own context | All tools share your context |
| You repeat yourself everywhere | AI remembers across tools |
| Copy-paste between tools | Seamless integration |
| Tool-specific integrations | Standard protocol |
| Vendor lock-in | Open standard |

### Building an MCP Server for Your Dashboard

Your AI Dashboard can expose an MCP server so other tools can use your data:

### PROMPT: Create MCP Server for AI Dashboard

```
Create an MCP server that exposes my AI Dashboard's data:

The server should provide:

TOOLS:
- search_documents(query: str) - Search uploaded documents
- get_note(note_id: str) - Get a specific note
- create_task(title: str, description: str) - Create a new task
- get_memory(key: str) - Get persistent memory value
- set_memory(key: str, value: str) - Store in persistent memory

RESOURCES:
- documents://all - All uploaded documents
- brands://all - All brand voices
- tasks://all - All tasks
- notes://all - All notes

PROMPTS:
- summarize_document(doc_id: str) - Summarize a document
- apply_brand_voice(brand_id: str, text: str) - Rewrite text in brand voice

Use the official MCP Python SDK or Node.js SDK.
Connect to the existing SQLite database at data/assistant.db.

Create at: src/lib/mcp/server.ts
```

### Python MCP Server Example

```python
# mcp_server.py - For your AI Dashboard
import json
from mcp.server.fastmcp import FastMCP
import sqlite3

# Initialize MCP server
mcp = FastMCP("ai-dashboard")

# Connect to your dashboard's database
db = sqlite3.connect("data/assistant.db")

# Tool: Search documents
@mcp.tool()
async def search_documents(query: str) -> str:
    """Search through uploaded documents for relevant content."""
    cursor = db.execute(
        "SELECT id, title, content FROM notes WHERE category = 'document' AND content LIKE ?",
        (f"%{query}%",)
    )
    results = cursor.fetchall()
    return json.dumps([{"id": r[0], "title": r[1]} for r in results])

# Tool: Get brand voice
@mcp.tool()
async def get_brand_voice(brand_id: str) -> str:
    """Get brand voice guidelines for a specific brand."""
    cursor = db.execute(
        "SELECT name, voice_guide FROM brands WHERE id = ?",
        (brand_id,)
    )
    result = cursor.fetchone()
    if result:
        return json.dumps({"name": result[0], "voice_guide": result[1]})
    return json.dumps({"error": "Brand not found"})

# Resource: All documents
@mcp.resource("documents://all")
async def get_all_documents() -> str:
    """Return metadata for all uploaded documents."""
    cursor = db.execute(
        "SELECT id, title, created_at FROM notes WHERE category = 'document'"
    )
    return json.dumps([{"id": r[0], "title": r[1], "created": r[2]} for r in cursor.fetchall()])

# Run the server
if __name__ == "__main__":
    mcp.run(transport='stdio')
```

### Connecting OpenCode to Your MCP Server

Once your MCP server is running, OpenCode can use it:

**1. Run your MCP server:**
```bash
python mcp_server.py
```

**2. Configure OpenCode** (in opencode.json):
```json
{
  "mcpServers": {
    "ai-dashboard": {
      "command": "python",
      "args": ["mcp_server.py"]
    }
  }
}
```

**3. OpenCode can now:**
- Search your documents
- Get brand voice guidelines
- Create tasks
- Access your memory
- All without leaving OpenCode!

### The Power of MCP Integration

```
┌─────────────────────────────────────────────────────────────┐
│                 BEFORE MCP                                 │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  User in OpenCode: "Search my documents for 'budget'"      │
│                      ↓                                      │
│  OpenCode: "I don't have access to your documents"         │
│                      ↓                                      │
│  User: Copy-pastes documents manually                      │
│                                                             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                  WITH MCP                                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  User in OpenCode: "Search my documents for 'budget'"      │
│                      ↓                                      │
│  OpenCode calls MCP tool: search_documents('budget')       │
│                      ↓                                      │
│  MCP Server queries your SQLite database                   │
│                      ↓                                      │
│  Returns: "Found 3 documents matching 'budget'"            │
│                      ↓                                      │
│  OpenCode: Summarizes results for you automatically        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### MCP Inspection and Testing

Use the MCP Inspector to test your server:

```bash
# Start your MCP server in development mode
mcp dev mcp_server.py

# Opens browser at localhost:6274
# Click "Connect" to test your tools
```

The Inspector lets you:
- See all available tools
- Test each tool with inputs
- View tool responses
- Debug issues interactively

### MCP Clients That Support It

| Client | MCP Support | Notes |
|--------|-------------|-------|
| OpenCode | ✅ Yes | Free, recommended |
| Claude Code | ✅ Yes | Paid, from Anthropic |
| Cursor | ✅ Yes | Freemium IDE |
| Cline | ✅ Yes | VS Code extension |
| Aider | Partial | Limited support |

---

## Command Line (CL) for AI

The **command line** is how you interact with many AI tools.

### Why Command Line?

| GUI (Graphical) | Command Line |
|-----------------|---------------|
| Click buttons | Type commands |
| Limited options | Full flexibility |
| Hard to automate | Easy to script |
| Good for beginners | Essential for power users |

### Common AI CL Tools

```bash
# OpenCode - AI coding assistant
opencode "Help me fix this bug"

# Ollama - Run local models
ollama run qwen3.5:9b "Write a hello world program"

# Aider - AI pair programmer
aider --model ollama/qwen3.5:9b

# Git automation with AI
git commit -m "$(opencode 'Write a commit message for these changes')"
```

### When to Use CL vs GUI

**Use Command Line (CL) when:**
• Automating tasks with scripts
• Working with servers (no GUI)
• Integrating AI into pipelines
• Batch processing multiple files

**Use GUI when:**
• Visual editing (documents, images)
• Browsing content
• Learning (easier to explore)

### PROMPT: Generate Command Line Script

```
I want to automate this task with a command line script:

[DESCRIBE YOUR TASK]

Create a bash script (or PowerShell for Windows) that:
1. Takes input parameters
2. Processes files/data
3. Outputs results
4. Handles errors gracefully
5. Logs what it does

Include comments explaining each step.
```

---

## Z.ai and Other Free AI Platforms

**Z.ai** (z.ai) is another free AI platform you can use for prompt expansion.

### Free AI Platforms for Prompt Expansion

| Platform | Free Tier | Best For |
|----------|-----------|----------|
| ChatGPT Free | GPT-4o limited | General use |
| Gemini Free | 15K tokens/day | Long documents |
| Grok Free | Rate limited | Current events |
| Claude Free | Message limit | Writing quality |
| Z.ai | Free tier available | Quick queries |
| Perplexity Free | Limited | Research with sources |

### Strategy for Free AI Use

1. **Write your rough prompt** in your AI Dashboard
2. **Export as markdown** (copy the text)
3. **Paste into free AI** (ChatGPT Free, Gemini, etc.)
4. **Ask: "Expand this prompt for clearer instructions"**
5. **Get the improved prompt**
6. **Use in local model** (Qwen, GLM, Kimi)
7. **Get better results** from smaller model

---

## Key Takeaways

✅ **Use frontier models to improve prompts** — Free tiers exist

✅ **Small models need structured prompts** — Expand vague ideas

✅ **Markdown reduces hallucinations** — Clear structure = better answers

✅ **Convert documents to markdown** — Before sending to LLM

✅ **MCP enables context sharing** — Future standard for AI tools

✅ **Command line is essential** — Learn basic CL for power usage

✅ **Multi-platform workflow** — Use different AIs for different strengths

---

## Quick Reference

### Prompt Expansion Prompt

```
Expand this prompt for a smaller AI model:

[YOUR PROMPT]

Create a detailed prompt with:
1. Clear sections with headers
2. Defined role for AI
3. Context and background
4. Example inputs/outputs
5. Exact output format
6. Edge case handling
```

### Document to Markdown Prompt

```
Convert this document to clean markdown:

[YOUR DOCUMENT]

Use proper heading hierarchy, markdown tables, and lists.
Preserve all information. Add table of contents if long.
```

---

**Next: Chapter 9 - Getting Your First Chat Working**