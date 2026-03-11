# Chapter 8: Prompt Templates - How to Talk to AI Tools

You've installed everything and understand the project structure. Now comes the most important skill: **how to communicate with AI tools**. This chapter teaches you the art of prompting — the difference between mediocre results and exceptional ones.

## What You'll Learn

• Why **prompts matter** (garbage in, garbage out)
• The **anatomy of a good prompt**
• **Prompt templates** you can reuse
• **Context windows** and why they matter
• **Chain-of-thought** prompting
• **Role prompting** and persona design
• Common prompting mistakes
• Building your own prompt library

---

## The Waiter Analogy

Imagine you're at a restaurant. The AI is your waiter, and your prompt is your order.

**Bad Order (Vague Prompt):**
"Bring me food."

**What You Get:** Random surprise. Might be good, probably not what you wanted.

**Better Order (Specific Prompt):**
"I'd like a grilled chicken sandwich with lettuce, tomato, and mayo on wheat bread. No onions. Side of fries."

**What You Get:** Exactly what you asked for.

**Best Order (Complete Prompt with Context):**
"I have a gluten allergy. Please bring me a grilled chicken sandwich with lettuce and tomato on a gluten-free bun. No mayo — I'm watching calories. Side salad instead of fries, balsamic dressing on the side. I'm in a hurry — meeting in 20 minutes."

**What You Get:** Safe, appropriate, and timely.

**A good prompt includes:**
• **Role** — Who the AI should be
• **Context** — Background information
• **Task** — What to do specifically
• **Format** — How to structure the output
• **Constraints** — What to avoid or include

---

## The Anatomy of a Great Prompt

Here's a template that works every time:

```
ROLE: [Who should the AI be?]

CONTEXT: [What background does it need?]

TASK: [What specific action should it take?]

FORMAT: [How should the output look?]

CONSTRAINTS: [What to avoid or include?]

EXAMPLE: [Show it what good looks like]
```

### Let's Break This Down

**ROLE:**
• "You are an expert software architect"
• "You are a patient teacher explaining to a beginner"
• "You are a code reviewer focused on security"

**CONTEXT:**
• "This is a Next.js application using TypeScript"
• "The user is a complete beginner who has never programmed"
• "We're building a feature for healthcare compliance"

**TASK:**
• "Write a function that validates email addresses"
• "Explain what a database is using analogies"
• "Review this code for potential bugs"

**FORMAT:**
• "Provide your answer as bullet points"
• "Show code first, then explanation"
• "Use a before/after comparison table"

**CONSTRAINTS:**
• "Do not use external libraries"
• "Keep it under 100 lines"
• "Avoid jargon; explain technical terms"

**EXAMPLE:**
• Show what the output should look like

---

## Real Examples from the AI Dashboard

### Example 1: Code Generation

```
ROLE: You are an expert TypeScript developer specializing in Next.js applications.

CONTEXT: We are building an AI Dashboard with SQLite database. The user needs to 
upload documents and store them in the database with metadata.

TASK: Create a Next.js API route that:
1. Accepts file uploads via POST request
2. Validates file type (PDF, DOCX, TXT only)
3. Saves file to local storage
4. Creates a database record with metadata
5. Returns success/error response

FORMAT: Provide:
• Complete code for src/app/api/documents/upload/route.ts
• Brief comments explaining key parts
• Error handling for edge cases

CONSTRAINTS:
• Use TypeScript with proper types
• Include input validation
• Handle file size limits (max 10MB)
• Return proper HTTP status codes

EXAMPLE:
Success response: { success: true, documentId: "uuid", filename: "report.pdf" }
Error response: { success: false, error: "File too large" }
```

### Example 2: Explanation with Analogies

```
ROLE: You are a patient teacher who explains technical concepts using everyday analogies.

CONTEXT: The reader is a complete beginner who has never programmed before. They 
are learning about APIs for the first time.

TASK: Explain what an API is and why it's useful.

FORMAT: 
• Start with a relatable analogy (restaurant, vending machine, etc.)
• Explain the analogy in detail
• Connect it back to actual APIs
• Provide a simple code example
• End with "Key Takeaways" bullet points

CONSTRAINTS:
• No jargon without explanation
• Keep analogies concrete and relatable
• Use plain English
• Maximum 500 words

EXAMPLE:
"Think of an API like a waiter at a restaurant..."
```

### Example 3: Code Review

```
ROLE: You are a senior code reviewer focused on security, performance, and maintainability.

CONTEXT: This code is from an AI Dashboard application. It handles user authentication 
and database queries. Security is critical.

TASK: Review the following code and provide:
1. Security concerns (if any)
2. Performance issues (if any)
3. Code style improvements
4. Overall grade (A-F) with explanation

FORMAT:
• Use emoji indicators: 🚨 Security, ⚡ Performance, 🎨 Style, ✅ Good
• Group by severity: Critical, Warning, Suggestion
• Provide code examples for fixes

CONSTRAINTS:
• Be direct but constructive
• Explain why each issue matters
• Prioritize security issues first

EXAMPLE:
🚨 CRITICAL: SQL Injection Risk
Current code: db.query(`SELECT * FROM users WHERE id = ${userId}`)
Fix: Use parameterized queries: db.query("SELECT * FROM users WHERE id = ?", [userId])
Why: User input is directly inserted into SQL, allowing malicious injection.
```

---

## Understanding Context Windows

AI models have **context windows** — a limit on how much text they can "remember" at once.

### The Notebook Analogy

Imagine you're solving a math problem, but you can only have one page of notebook paper. You have to fit:
• The problem statement
• Your work
• The answer

If the problem is too long, you run out of space.

**Context Window Sizes:**
• GPT-3.5: ~4,000 tokens (~3,000 words)
• GPT-4: ~8,000-32,000 tokens
• Claude: ~100,000+ tokens
• Local models (Llama, etc.): ~2,000-8,000 tokens

**One token ≈ 0.75 words**

### Implications for Prompting

**What this means:**
1. **Be concise** — Don't repeat yourself
2. **Prioritize** — Most important info first
3. **Summarize** — Replace long examples with summaries
4. **Chunk work** — Break large tasks into smaller ones

**Example: Bad (Wastes Context)**
```
Here is my entire codebase:
[paste 5000 lines of code]
Now I have a question about line 10...
```

**Example: Good (Efficient)**
```
I have a function at src/lib/database.ts line 45 that queries users.

function getUser(id: string) {
  return db.query(`SELECT * FROM users WHERE id = ${id}`);
}

Is this vulnerable to SQL injection? If yes, show me the fix.
```

---

## Chain-of-Thought Prompting

Sometimes you want the AI to **show its work** — not just give an answer, but explain how it got there.

### When to Use It

• Complex logic or calculations
• Debugging mysterious bugs
• Understanding the AI's reasoning
• Learning from the AI's approach

### How to Do It

Add this to your prompt:
```
"Think step by step and explain your reasoning before giving the final answer."
```

### Example

```
TASK: Debug why this function returns the wrong date.

function getNextMonday(date: Date): Date {
  const day = date.getDay();
  const daysUntilMonday = 8 - day;
  const nextMonday = new Date(date);
  nextMonday.setDate(date.getDate() + daysUntilMonday);
  return nextMonday;
}

Think step by step and explain your reasoning before giving the final answer.
```

**Why this helps:**
• You see where the AI's logic might be wrong
• You learn debugging techniques
• The AI catches its own mistakes
• You can correct misunderstandings

---

## Role Prompting and Personas

The AI can adopt different personas. Choose based on what you need:

### Common Personas

| Persona | Use Case |
|---------|----------|
| **Expert Developer** | Code review, architecture decisions |
| **Patient Teacher** | Explaining concepts to beginners |
| **Security Analyst** | Finding vulnerabilities |
| **Technical Writer** | Documentation and guides |
| **DevOps Engineer** | Deployment and infrastructure |
| **Product Manager** | Feature planning and user stories |
| **UX Designer** | Interface and user experience |

### Advanced: Layering Personas

You can combine roles:

```
ROLE: You are a security-focused developer who explains findings like a patient 
teacher. Find vulnerabilities in my code, then explain each one as if I'm a 
beginner who wants to learn why it's dangerous and how to fix it.
```

---

## Common Prompting Mistakes

### ❌ Mistake 1: Being Too Vague

**Bad:** "Make this better"

**Better:** "Refactor this function to use async/await instead of callbacks, 
add input validation, and handle the case where the database returns null"

### ❌ Mistake 2: Not Providing Context

**Bad:** "Fix this error: Cannot read property 'name' of undefined"

**Better:** "I'm getting 'Cannot read property name of undefined' on line 23 
of src/components/UserProfile.tsx. Here's the code: [paste code]. The user 
object comes from an API that sometimes returns null for deleted users. 
How should I handle this?"

### ❌ Mistake 3: Asking for Too Much at Once

**Bad:** "Build me a complete e-commerce website with user auth, payments, 
inventory, and admin dashboard"

**Better:** "Let's start with the user authentication. Create a simple login 
page with email and password fields, and an API route that validates 
credentials against a SQLite database."

### ❌ Mistake 4: Not Providing Examples

**Bad:** "Format this data nicely"

**Better:** "Format this data as a markdown table with columns: Name, Email, 
Role. Example:
| Name | Email | Role |
|------|-------|------|
| Alice | alice@example.com | Admin |"

### ❌ Mistake 5: Ignoring Constraints

**Bad:** "Write a function to process data"

**Better:** "Write a TypeScript function that processes an array of user 
objects. Constraints:
• Must handle up to 10,000 users efficiently
• Should not use external libraries
• Must return results in under 100ms
• Include error handling for malformed data"

---

## Building Your Prompt Library

As you work on the AI Dashboard, you'll reuse prompts. Create a personal library:

### Organize by Purpose

```
prompts/
├── code-generation/
│   ├── api-route.txt
│   ├── react-component.txt
│   ├── database-query.txt
│   └── test-file.txt
├── code-review/
│   ├── security-review.txt
│   ├── performance-review.txt
│   └── general-review.txt
├── explanation/
│   ├── explain-concept.txt
│   ├── debug-error.txt
│   └── compare-approaches.txt
└── documentation/
    ├── api-docs.txt
    ├── readme.txt
    └── changelog.txt
```

### Template Format

Each prompt file should include:

```markdown
# Prompt: Generate API Route

## Purpose
Create a Next.js API route with proper error handling

## Variables
• {ENDPOINT_NAME}: Name of the endpoint (e.g., "users", "documents")
• {HTTP_METHOD}: GET, POST, PUT, DELETE
• {REQUIREMENTS}: Specific functionality needed

## Template
ROLE: You are an expert Next.js developer...

CONTEXT: We are building an AI Dashboard...

TASK: Create an API route for {ENDPOINT_NAME} that handles {HTTP_METHOD} requests. 
Requirements: {REQUIREMENTS}

FORMAT: Provide complete code for src/app/api/{ENDPOINT_NAME}/route.ts

CONSTRAINTS:
• Use TypeScript with proper types
• Include error handling
• Return appropriate HTTP status codes

## Example Usage
Variables:
• ENDPOINT_NAME: documents
• HTTP_METHOD: POST
• REQUIREMENTS: Accept file uploads, validate PDF/DOCX/TXT, save to database

## Version History
• v1.0: Initial template
• v1.1: Added file upload example
```

---

## PROMPT YOU CAN USE

Here's a meta-prompt to help you write better prompts:

```
ROLE: You are an expert prompt engineer who helps others write better prompts.

CONTEXT: I'm building an AI Dashboard with Next.js, TypeScript, and SQLite. 
I need to communicate effectively with AI coding assistants.

TASK: Review this prompt and suggest improvements:

[PASTE YOUR PROMPT HERE]

FORMAT: Provide:
1. What's working well
2. Specific improvements with before/after examples
3. Missing elements (role, context, format, constraints, examples)
4. A rewritten version incorporating all improvements

CONSTRAINTS:
• Be specific and actionable
• Explain why each suggestion helps
• Keep suggestions practical for a busy developer
```

---

## Key Takeaways

✅ **Good prompts have structure**: Role, Context, Task, Format, Constraints

✅ **Be specific**: Vague prompts = vague results

✅ **Provide examples**: Show the AI what good looks like

✅ **Mind the context window**: Be concise, prioritize important info

✅ **Use chain-of-thought**: Ask the AI to show its work for complex tasks

✅ **Choose the right persona**: Different tasks need different roles

✅ **Avoid common mistakes**: Vagueness, missing context, asking for too much

✅ **Build a prompt library**: Reuse and refine prompts over time

✅ **Practice**: Prompting is a skill that improves with practice

---

**Next: Chapter 9 - Getting Your First Chat Working**
