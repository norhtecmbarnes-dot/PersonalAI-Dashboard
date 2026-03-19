# Chapter 23: Creating Your Own Workflow - Automating Your Job

**Build a workflow system that matches how YOU work, not how someone else works.**

## What You'll Learn

• What is a **custom workflow** and why you need one
• How to **analyze your job** for automation opportunities
• Building **stage-based workflows** for any process
• Using AI to **extract, track, and generate** work products
• Creating **document templates** for your specific needs
• Integrating with **external systems** (email, APIs, databases)

---

## The Philosophy: Your Job, Your Workflow

The Bid Workflow in this dashboard is **one example** of a custom workflow. It was built for government contracting, but the same patterns work for:

| Your Job | Your Workflow |
|----------|---------------|
| Freelance designer | Client intake → Proposal → Design → Revision → Invoice |
| Real estate agent | Lead → Showing → Offer → Inspection → Closing |
| Consultant | Discovery → Analysis → Report → Presentation → Follow-up |
| Software developer | Requirements → Design → Code → Review → Deploy |
| Writer | Pitch → Outline → Draft → Edit → Publish |
| Teacher | Lesson Plan → Materials → Teach → Assess → Report |

**The principle is the same: Break your job into stages, then automate each stage with AI.**

---

## Why Build Your Own Workflow?

You spend hours on repetitive tasks:

• Reading long documents to find key information
• Tracking requirements or tasks across spreadsheets
• Writing similar documents over and over
• Following up on deadlines
• Converting information between formats

**A custom workflow automates the repetitive parts so you focus on what matters.**

---

## Step 1: Analyze Your Job

Before writing code, map out your work. Ask:

### Questions to Ask Yourself

1. **What documents do I work with?**
   - PDFs, Word docs, emails, spreadsheets, APIs?

2. **What are the stages I repeat?**
   - List them in order: Stage 1 → Stage 2 → Stage 3

3. **What do I produce at each stage?**
   - Reports, proposals, emails, summaries, invoices?

4. **What decisions do I make?**
   - Go/No-go, priority, assignment, deadline?

5. **What external systems do I use?**
   - Email, CRM, databases, APIs, spreadsheets?

### Example: Freelance Designer

```
Documents: Client briefs (PDF), inspiration (images), contracts (Word)

Stages:
  Stage 1: INTAKE - Receive client brief, extract requirements
  Stage 2: PROPOSAL - Estimate hours, create quote, send contract
  Stage 3: DESIGN - Create mockups, iterate on feedback
  Stage 4: DELIVERY - Final files, invoice, archive

Outputs per stage:
  - Intake: Requirements document, timeline
  - Proposal: Quote PDF, contract
  - Design: Mockup images, revision notes
  - Delivery: Final files, invoice, portfolio entry

External: Email, Google Drive, accounting software
```

---

## Step 2: Define Your Workflow Stages

Create a workflow configuration file:

```typescript
// src/lib/workflows/my-workflow.ts

export const MY_WORKFLOW_STAGES = [
  {
    id: 'intake',
    name: 'Intake',
    description: 'Receive and process initial request',
    outputs: ['requirements-document', 'timeline'],
    aiTasks: ['extract-requirements', 'estimate-timeline'],
  },
  {
    id: 'proposal',
    name: 'Proposal',
    description: 'Create and send proposal',
    outputs: ['quote', 'contract'],
    aiTasks: ['generate-quote', 'draft-contract'],
  },
  {
    id: 'delivery',
    name: 'Delivery',
    description: 'Complete work and deliver',
    outputs: ['final-deliverable', 'invoice'],
    aiTasks: ['summarize-work', 'generate-invoice'],
  },
  {
    id: 'archived',
    name: 'Archived',
    description: 'Work completed and stored',
    outputs: ['portfolio-entry', 'lessons-learned'],
    aiTasks: ['write-case-study', 'extract-lessons'],
  },
];
```

---

## Step 3: Create the Workflow Page

### PROMPT: Build a Custom Workflow Page

```
I want to create a workflow page for my job: [describe your job]

My stages are:
1. [Stage 1 name] - [what happens] - produces: [outputs]
2. [Stage 2 name] - [what happens] - produces: [outputs]
3. [Stage 3 name] - [what happens] - produces: [outputs]

Please create a Next.js page at src/app/my-workflow/page.tsx that:
1. Shows all my workflow items in a kanban-style board
2. Lets me create new items with a form
3. Shows stage-based progress
4. Has buttons to advance items to next stage
5. Stores data in SQLite via existing sqlDatabase

Use the existing patterns from src/app/bid-workflow/page.tsx as reference.
```

---

## Step 4: Create Stage-Specific Actions

Each stage has AI-assisted actions. Example for "Intake":

```typescript
// src/lib/workflows/stages/intake.ts

export async function processIntakeDocument(
  documentPath: string,
  workflowId: string
): Promise<IntakeResult> {
  // 1. Extract text from document
  const text = await extractText(documentPath);
  
  // 2. Send to AI for extraction
  const prompt = `Analyze this document and extract:
• Client name and contact info
• Project requirements (listed)
• Budget range if mentioned
• Timeline/deadline
• Key stakeholders

Document:
${text}

Return as JSON.`;

  const extraction = await callAI(prompt, 'ollama/qwen3.5:9b');
  
  // 3. Save to database
  const saved = await sqlDatabase.addNote({
    title: `Intake: ${extraction.clientName}`,
    content: JSON.stringify(extraction),
    category: 'workflow-intake',
    tags: [workflowId, 'intake', extraction.clientName],
  });
  
  return { extraction, noteId: saved.id };
}
```

---

## Step 5: Create Document Templates

You probably write similar documents repeatedly. Create templates:

### PROMPT: Create Document Templates

```
I frequently create [document type, e.g., "project proposals"].

My proposals need:
1. Executive summary (2-3 paragraphs)
2. Scope of work (bullet list)
3. Timeline (weeks with milestones)
4. Pricing table
5. Terms and conditions

Create a template generator at src/lib/templates/proposal.ts that:
1. Takes input: clientName, projectDescription, weeks, budget
2. Generates a markdown proposal
3. Uses the AI to write natural language sections
4. Returns ready-to-send document

Also create an API endpoint at src/app/api/templates/proposal/route.ts
that uses this template.
```

---

## Example: The Bid Workflow (Government Contracting)

The dashboard includes a Bid Workflow as an example. Here's how it works:

### Bid Workflow Stages

| Stage | Purpose | AI Actions |
|-------|---------|------------|
| Capture | Extract RFP information | Summarize RFP, identify due dates |
| Compliance | Map requirements | Create compliance matrix |
| Outline | Structure proposal | Generate section outline |
| Writing | Draft sections | Write proposal sections |
| Review | Quality check | Check against requirements |
| Submitted | Track status | Log submission |
| Archived | Learn lessons | Extract what worked/didn't |

### How to Adapt It

If you're not in government contracting, change the stages:

**For Consulting:**
```
Discovery → Analysis → Report → Presentation → Follow-up
```

**For Real Estate:**
```
Lead → Qualification → Showing → Offer → Inspection → Closing
```

**For Software Development:**
```
Requirements → Design → Implementation → Testing → Deployment
```

---

## Creating Your Workflow: Practical Steps

### 1. Start with a Simple List Page

```tsx
// src/app/my-workflow/page.tsx
'use client';

import { useState, useEffect } from 'react';

interface WorkItem {
  id: string;
  title: string;
  stage: string;
  createdAt: number;
  data: Record<string, any>;
}

export default function MyWorkflowPage() {
  const [items, setItems] = useState<WorkItem[]>([]);
  const [stage, setStage] = useState('all');

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    const res = await fetch('/api/my-workflow');
    const data = await res.json();
    setItems(data.items || []);
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">My Workflow</h1>
      {/* Your UI here */}
    </div>
  );
}
```

### 2. Add Stage Columns (Kanban)

```tsx
const STAGES = ['intake', 'in-progress', 'review', 'done'];

return (
  <div className="flex gap-4 overflow-x-auto">
    {STAGES.map(stage => (
      <div key={stage} className="flex-shrink-0 w-72">
        <h2 className="font-bold mb-2">{stage}</h2>
        <div className="space-y-2">
          {items.filter(i => i.stage === stage).map(item => (
            <div key={item.id} className="bg-white p-3 rounded shadow">
              {item.title}
            </div>
          ))}
        </div>
      </div>
    ))}
  </div>
);
```

### 3. Add AI Actions per Stage

```tsx
const advanceStage = async (itemId: string, nextStage: string) => {
  // Get current item
  const item = items.find(i => i.id === itemId);
  
  // Call AI to generate stage output
  const prompt = `Generate a ${STAGE_OUTPUTS[nextStage]} for:
${JSON.stringify(item.data)}

Format as JSON.`;

  const output = await fetch('/api/chat', {
    method: 'POST',
    body: JSON.stringify({ message: prompt }),
  }).then(r => r.json());

  // Update item
  await fetch('/api/my-workflow', {
    method: 'POST',
    body: JSON.stringify({
      id: itemId,
      stage: nextStage,
      output: output.message,
    }),
  });
  
  fetchItems(); // Refresh
};
```

---

## PROMPT: Create My Workflow

Use this prompt to build your custom workflow:

```
I need a custom workflow for my job as [your job title].

Here's my workflow:
1. [Stage 1] - [What happens] - Outputs: [what you deliver]
2. [Stage 2] - [What happens] - Outputs: [what you deliver]
3. [Stage 3] - [What happens] - Outputs: [what you deliver]

Documents I work with: [PDF, Word, email, etc.]
External systems: [email, CRM, databases, APIs]

Please create:
1. A TypeScript type definition for my workflow items
2. A Next.js page at src/app/my-workflow/page.tsx
3. An API endpoint at src/app/api/my-workflow/route.ts
4. Stage-specific AI prompt templates

Use the existing bid-workflow system as a reference pattern.
The project uses Next.js 15, TypeScript, Tailwind CSS, and SQLite.
```

---

## Integration Tips

### Email Integration

Connect your workflow to email:

```typescript
// src/lib/integrations/email.ts

export async function sendStageNotification(
  item: WorkItem,
  stage: string,
  recipient: string
): Promise<void> {
  const templates: Record<string, string> = {
    intake: `New intake received: ${item.title}`,
    proposal: `Proposal ready for review: ${item.title}`,
    // Add your templates
  };

  // Use your email provider's API
  await sendEmail({
    to: recipient,
    subject: templates[stage],
    body: generateEmailBody(item),
  });
}
```

### CRM Integration

Sync workflow status to your CRM:

```typescript
// src/lib/integrations/crm.ts

export async function syncToCRM(item: WorkItem): Promise<void> {
  await fetch('https://your-crm.com/api/opportunities', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${CRM_API_KEY}` },
    body: JSON.stringify({
      name: item.title,
      stage: item.stage,
      value: item.data.budget,
    }),
  });
}
```

---

## Key Takeaways

✅ **Your job, your workflow** — Customize for how YOU work

✅ **Stages break down complexity** — Each stage handles one part

✅ **AI amplifies each stage** — Extract, generate, summarize

✅ **Templates save time** — Stop writing the same documents

✅ **External integrations connect systems** — Email, CRM, APIs

✅ **Start simple, add complexity** — Begin with a list, grow from there

---

## Next Steps

1. List your job's stages on paper
2. Identify what each stage produces
3. Use the PROMPT above to generate your workflow
4. Test with real work items
5. Add AI assistance for repetitive tasks
6. Integrate with your existing tools

---

**The Bid Workflow in this dashboard is just one example. Your workflow should reflect YOUR work, not someone else's.**

---

**Next: Chapter 24 - Performance Optimization**