# Chapter 23: Government Bid Workflow - From Opportunity to Proposal

**Streamline government contracting with AI-powered proposal management.**

## What You'll Learn in This Chapter

• How to access the **Bid Workflow** system in your AI Dashboard
• Creating **Capture Documents** from RFP documents
• Building **Compliance Matrices** to track requirements
• Generating **Proposal Outlines** with AI assistance
• Tracking workflow stages from capture to submission
• How to personalize the workflow for your specific needs

---

## Why a Bid Workflow System?

Government contracting involves complex, deadline-driven processes:

• **RFPs can span hundreds of pages** — AI extracts key information automatically
• **Compliance requirements are strict** — Track every requirement in a matrix
• **Deadlines are non-negotiable** — Stage-based workflow keeps you on track
• **Historical proposals are valuable** — Reference past wins for new opportunities

The **Bid Workflow** system transforms PDF RFPs into structured proposals with AI assistance.

---

## Accessing the Bid Workflow

Navigate to:

```
http://localhost:3000/bid-workflow
```

Or use the command menu (`Ctrl+K` or `Cmd+K`) and type `/bid`.

The workflow page shows:
• Brand selector — Each bid is organized under a brand (company)
• Active workflows — List of ongoing proposals with their stages
• Quick actions — Generate capture docs, compliance matrices, outlines

---

## The Bid Workflow Stages

| Stage | Description | Output |
|-------|-------------|--------|
| `Capture` | Extract opportunity details from RFP | Capture Document |
| `Compliance` | Map all RFP requirements | Compliance Matrix |
| `Outline` | Generate proposal structure | Outline Document |
| `Writing` | Draft proposal sections | Draft Sections |
| `Review` | Internal quality check | Review Notes |
| `Submitted` | Proposal sent to agency | Confirmation |
| `Archived` | Win/loss recorded | Lessons Learned |

---

## Starting a New Bid

### Step 1: Create a Brand

Bids are organized under brands. If you haven't created one:

1. Go to `/brand-workspace`
2. Click "Create Brand"
3. Enter your company name and details

### Step 2: Upload RFP Documents

1. In Brand Workspace, upload your RFP PDFs
2. The AI will process and extract text automatically

### Step 3: Start the Bid

1. Go to `/bid-workflow`
2. Select your brand
3. Click "Start New Bid"
4. Fill in opportunity details:

| Field | Description |
|-------|-------------|
| Project Name | Descriptive name for the bid |
| Agency | Government agency issuing RFP |
| Solicitation # | RFP reference number |
| Response Deadline | When proposal is due |
| Award Amount | Estimated contract value |

### Try It Yourself:

```
PROMPT YOU CAN USE:
Create a new bid for "DOD Cloud Infrastructure Support" 
with solicitation number "RFP-2024-CLOUD-001"
due on "2024-06-30"
with award amount "$5,000,000"
```

---

## Capture Documents: AI-Powered RFP Analysis

The **Capture Document** extracts key information from uploaded RFPs:

### What It Extracts:

• **Program Name** — The official program title
• **Agency** — The customer organization
• **Scope of Work** — What they want you to do
• **Key Requirements** — Must-have deliverables
• **Evaluation Criteria** — How they'll judge proposals
• **Milestones** — Important dates
• **Risk Factors** — Potential challenges

### How to Generate:

1. Upload RFP documents to your brand
2. Open the bid workflow for your project
3. Click "Generate Capture"
4. AI processes all documents and creates a structured summary

### The Output:

```markdown
# Capture Document

## Program: DOD Cloud Infrastructure Support

### Customer
Department of Defense - DISA

### Scope of Work
Provide cloud infrastructure services including compute, storage, 
networking, and security for classified workloads...

### Key Requirements
• FedRAMP High certification required
• IL5/IL6 impact levels
• Continuous monitoring and incident response
• 99.99% uptime SLA
```

---

## Compliance Matrix: Track Every Requirement

The **Compliance Matrix** maps every RFP requirement to your proposal:

### Matrix Structure:

| Requirement ID | Section | Requirement Text | Proposal Section | Status |
|----------------|---------|-----------------|------------------|--------|
| REQ-001 | L.3.1 | Offeror shall provide... | Section 3.1 | Pending |
| REQ-002 | L.3.2 | Technical approach must... | Section 4.2 | Addressed |
| REQ-003 | M.2.1 | Past performance... | Section 5.1 | Pending |

### Status Options:

• **Pending** — Not yet addressed
• **Addressed** — Completed
• **Needs Review** — Requires verification
• **Not Applicable** — Doesn't apply to this bid

### How to Generate:

1. Generate a Capture Document first
2. Click "Generate Compliance"
3. AI scans RFP for all "shall" and "must" statements
4. Requirements populate the matrix automatically

---

## Proposal Outlines: AI-Generated Structure

The **Outline** creates a proposal structure based on RFP requirements:

### Standard Outline Sections:

1. **Executive Summary** — Win theme and key differentiators
2. **Understanding of Requirements** — Show you understand their needs
3. **Technical Approach** — Your solution
4. **Management Plan** — How you'll execute
5. **Past Performance** — Relevant experience
6. **Pricing Strategy** — Your cost proposal
7. **Compliance Matrix Reference** — Where each requirement is addressed
8. **Appendices** — Supporting documentation

### How to Generate:

1. Have both Capture Document and Compliance Matrix ready
2. Click "Generate Outline"
3. AI creates a detailed outline with section headings
4. Review and customize for your approach

---

## Workflow Stage Management

### Updating Stages:

1. Click "Update Stage" on any bid
2. Select the new stage from the modal
3. The workflow tracks your progress

### Stage Color Codes:

| Color | Stage |
|-------|-------|
| Blue | Capture |
| Yellow | Compliance |
| Purple | Outline |
| Green | Writing |
| Orange | Review |
| Teal | Submitted |
| Gray | Archived |

---

## Government Writing Templates

Your AI Dashboard includes specialized templates for government proposals:

### Available Templates:

| Template | Purpose |
|----------|---------|
| **SBIR Proposal** | Small Business Innovation Research grants |
| **Capture Plan** | Executive summary for go/no-go decisions |
| **Deadline Finder** | Extract all key dates from RFP |
| **Evaluation Factors** | Parse Section M evaluation criteria |
| **Compliance Matrix** | Generate requirement tracking table |
| **Proposal Outline** | Full proposal structure from RFP |
| **Past Performance** | Write past performance narratives |
| **Risk Identification** | Identify and document risks |

### Using Templates:

1. Go to `/writing`
2. Select a brand (optional)
3. Paste RFP content or notes
4. Choose a template from the actions panel
5. AI generates the structured output

---

## Integration with Brand Workspace

### How They Work Together:

• **Brand Workspace** holds your company info, past proposals, and voice profiles
• **Bid Workflow** uses brand documents for context when generating proposals
• **Historical Bids** — Reference past wins stored under the brand

### Best Practice:

Before starting a new bid:
1. Upload your company's past proposals to Brand Workspace
2. The AI can reference similar work
3. Maintain consistent voice across all proposals

---

## How It Works Behind the Scenes

### Technology Stack:

| Component | Technology |
|-----------|------------|
| Database Tables | `bid_workflows`, `capture_documents`, `compliance_matrices` |
| Knowledge Extraction | AI-powered entity and requirement extraction |
| Outline Generation | LLM with RFP context |
| Frontend | React with TypeScript |
| API | Next.js API routes |

### Key Files:

```
src/
├── app/
│   ├── bid-workflow/
│   │   └── page.tsx           # Workflow UI
│   └── api/bid-workflow/
│       └── route.ts           # API endpoints
├── lib/services/
│   └── bid-workflow.ts        # Business logic
└── types/
    └── brand-workspace.ts     # Type definitions
```

---

## Common Pitfalls & How to Avoid Them

**Pitfall #1:** Not uploading RFP documents before generating capture
**Solution:** Always upload and process documents in Brand Workspace first

**Pitfall #2:** Skipping the compliance matrix
**Solution:** Generate the matrix early — it guides your entire proposal

**Pitfall #3:** Not reviewing AI-generated content
**Solution:** AI provides a starting point — always review and customize

**Pitfall #4:** Forgetting to update workflow stage
**Solution:** Keep your workflow status current for accurate tracking

---

## Chapter Summary

You've learned how to:

• Create and manage government bid workflows
• Generate **Capture Documents** from RFP PDFs
• Build **Compliance Matrices** to track requirements
• Create **Proposal Outlines** with AI assistance
• Use government writing templates
• Track progress through workflow stages

---

## Next Steps

1. **Upload an RFP** to your brand workspace
2. **Create a test bid** to practice the workflow
3. **Generate each artifact** (Capture, Compliance, Outline)
4. **Customize** the outputs for your approach

---

## Fork This and Make It Yours!

The bid workflow is fully customizable:

• **Add custom stages** for your process
• **Create templates** for your industry
• **Integrate** with your CRM or proposal software
• **Automate** repetitive tasks

You now hold real enterprise-grade AI power in your hands — and the best part? You can make this Dashboard completely yours with simple prompts.

---

*Next: Continue exploring with personalized prompts for YOUR use cases!*