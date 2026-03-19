# Chapter 26: Self-Reflection - AI That Suggests Improvements

## A Gift to the World

This project is open source (MIT license) with Creative Commons documentation (CC BY-SA 4.0). We believe:

• **Privacy** — Your data stays on your machine
• **Freedom** — No subscriptions, no vendor lock-in
• **Control** — Customize everything for your needs
• **Learning** — Understand how AI systems work

**Important:** Self-reflection **suggests** improvements but never auto-modifies code. The human stays in control, working with an AI partner (like OpenCode or ChatGPT) to decide what to implement.

---

## What You'll Learn

• How self-reflection works
• Reading suggestion reports
• Using "Copy as Prompt" to implement changes
• Human-in-the-loop improvement workflow

---

## The Self-Reflection Philosophy

### Why Not Auto-Modify?

AI systems that modify their own code can:
• Break things unexpectedly
• Make changes the user doesn't approve
• Create security vulnerabilities
• Lose context about why changes were made

### Better Approach: Suggest, Then Human Approves

```
┌─────────────────────────────────────────────────────────────┐
│                   SELF-REFLECTION CYCLE                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. AI analyzes the system                                  │
│     ↓                                                       │
│  2. Generates suggestions with priorities                   │
│     ↓                                                       │
│  3. Human reviews suggestions                               │
│     ↓                                                       │
│  4. Human copies suggestion as prompt                        │
│     ↓                                                       │
│  5. Human + AI partner implement the change                 │
│     ↓                                                       │
│  6. System is tested and committed                          │
│     ↓                                                       │
│  Loop: Return to step 1 after some time                     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Accessing Self-Reflection

Navigate to **System → Self-Reflection** or visit `/self-reflection`.

You'll see:
• **Overall System Health Score** (0-100)
• **Current Capabilities** — What the system can do
• **Identified Gaps** — What's missing
• **Inefficiencies** — What's slow or wasteful
• **Suggestions** — Improvement recommendations
• **Suggested Tools** — New features to consider
• **Model Recommendations** — AI model suggestions

---

## Understanding the Report

### Health Score

| Score | Meaning |
|-------|---------|
| 80-100 | System is healthy, minor improvements possible |
| 60-79 | System is functional, some areas need attention |
| 40-59 | System has issues, prioritize improvements |
| 0-39 | Critical issues, review and fix immediately |

### Suggestion Priorities

| Priority | Meaning |
|----------|---------|
| **High** | Fix or add soon - significant impact |
| **Medium** | Consider when convenient |
| **Low** | Nice to have, not urgent |

### Tool Complexity

| Level | Effort |
|-------|--------|
| **Simple** | 1-2 hours, few files |
| **Medium** | 2-4 hours, moderate changes |
| **Complex** | 4+ hours, major feature |

---

## Using "Copy as Prompt"

Each suggestion has a **📋 Copy as Prompt** button.

### Example Workflow

1. **Review Suggestion:**
   ```
   Title: Add keyboard shortcuts for common actions
   Priority: Medium
   Impact: Users can work faster without mouse
   ```

2. **Click "Copy as Prompt"**

3. **Paste into your AI assistant** (OpenCode, ChatGPT, Claude, etc.)

4. **AI generates code:**
   ```typescript
   // In src/app/page.tsx
   useEffect(() => {
     const handleKeyDown = (e: KeyboardEvent) => {
       if (e.ctrlKey && e.key === 'k') {
         e.preventDefault();
         // Focus search
       }
     };
     window.addEventListener('keydown', handleKeyDown);
     return () => window.removeEventListener('keydown', handleKeyDown);
   }, []);
   ```

5. **Review, test, commit**

---

## PROMPT: Implement a Suggestion

After copying a suggestion prompt, work with your AI:

```
I want to improve my AI Dashboard. Please help me implement this suggestion:

**Title:** [Pasted from Self-Reflection]

**Description:** [Pasted from Self-Reflection]

**Priority:** [Pasted from Self-Reflection]

Please:
1. Explain the implementation approach
2. Show me the code changes needed
3. Consider token efficiency and memory safety
4. Ensure no memory leaks (clean up intervals, event listeners)

The project is at C:\ai_dashboard and uses Next.js 15, TypeScript, and SQLite.
```

---

## How It Works (For Developers)

### Self-Reflection Service

Located at `src/lib/agent/self-reflection.ts`:

```typescript
// Analyzes system and generates suggestions
async performSelfReflection(): Promise<SelfReflectionReport> {
  const prompt = this.buildReflectionPrompt();
  
  const response = await fetch('/api/chat', {
    method: 'POST',
    body: JSON.stringify({
      model: 'ollama/qwen3.5:9b',
      message: prompt,
    }),
  });
  
  const report = this.parseLLMResponse(response);
  this.saveReports(); // Saves to data/self-reflection-reports.json
  
  return report;
}
```

### Key Points:

1. **Read-Only Analysis** — Only reads files, never modifies
2. **Saves Reports** — Stores in `data/self-reflection-reports.json`
3. **Periodic Checks** — Runs every 6 hours (configurable)
4. **Human Approval Required** — All changes go through user

---

## Configuration

### Adjust Reflection Interval

```typescript
// In src/lib/agent/self-reflection.ts
private readonly REFLECTION_INTERVAL = 6 * 60 * 60 * 1000; // 6 hours

// Change to:
private readonly REFLECTION_INTERVAL = 24 * 60 * 60 * 1000; // Daily
// Or:
private readonly REFLECTION_INTERVAL = 60 * 60 * 1000; // Hourly
```

### Clear Reports

Reports are stored in `data/self-reflection-reports.json`. Delete this file to clear history.

---

## Best Practices

### DO

✅ Review all suggestions before implementing  
✅ Copy prompts to your AI assistant  
✅ Test changes in development  
✅ Commit with clear messages  
✅ Consider token efficiency  

### DON'T

❌ Blindly implement every suggestion  
❌ Skip testing  
❌ Ignore priority levels  
❌ Forget to clean up intervals/listeners  

---

## Token Efficiency Tips

When implementing improvements, always consider:

### 1. Clean Up Resources

```typescript
// BAD: Memory leak
useEffect(() => {
  setInterval(() => fetchStatus(), 30000);
}, []);

// GOOD: Proper cleanup
useEffect(() => {
  const interval = setInterval(() => fetchStatus(), 30000);
  return () => clearInterval(interval);
}, []);
```

### 2. Event Listeners

```typescript
// BAD: Listener never removed
useEffect(() => {
  window.addEventListener('resize', handleResize);
}, []);

// GOOD: Clean up listener
useEffect(() => {
  window.addEventListener('resize', handleResize);
  return () => window.removeEventListener('resize', handleResize);
}, []);
```

### 3. Limit Context Size

```typescript
// BAD: Unbounded history
const [messages, setMessages] = useState([]);

// GOOD: Trimmed history
const MAX_HISTORY = 20;
const trimmed = messages.slice(-MAX_HISTORY);
```

---

## Self-Improvement API

### Run Reflection Manually

```bash
curl -X POST http://localhost:3000/api/self-reflection \
  -H "Content-Type: application/json" \
  -d '{"action": "run"}'
```

### Get Latest Report

```bash
curl http://localhost:3000/api/self-reflection
```

### Get History

```bash
curl -X POST http://localhost:3000/api/self-reflection \
  -H "Content-Type: application/json" \
  -d '{"action": "history"}'
```

---

## Key Takeaways

✅ **Self-reflection suggests, humans approve** — Safe improvement cycle

✅ **Copy as Prompt** — Easy integration with AI assistants

✅ **Token efficiency** — Always consider resource usage

✅ **No auto-modification** — Prevents unexpected breakage

✅ **Regular analysis** — Helps catch inefficiencies

✅ **Human oversight** — You control all changes

---

## Next Steps

1. Visit `/self-reflection` and run analysis
2. Review the generated suggestions
3. Copy prompts to implement improvements
4. Test changes before committing
5. Share useful improvements with the community!

---

**This project is a gift. Improve it, share it, learn from it.**

**Next: Appendix A - Quick Reference**