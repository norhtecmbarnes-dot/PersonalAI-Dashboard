# Chapter 4: Setting Up Your Computer - Step by Step Guide

Before we build anything, we need the right tools. This chapter provides a comprehensive, step-by-step guide to setting up your AI Dashboard environment.

## What You'll Learn

• Installing **Node.js** (JavaScript runtime)
• Installing **Ollama** (local AI models)
• Installing **VS Code** (code editor)
• Setting up the **project files**
• Configuring **environment variables**
• Understanding the **database** and **datalake**
• **Running the AI Dashboard** for the first time
• **Testing your setup** with a simple prompt

---

## Prerequisites Check

Before starting, make sure you have:

| Requirement | Check Command | What You Need |
|-------------|---------------|---------------|
| Operating System | Any modern OS | Windows 10+, macOS 10.15+, or Linux |
| RAM | Task Manager / Activity Monitor | At least 8GB (16GB recommended) |
| Disk Space | File Explorer / Finder | At least 10GB free |
| Internet | Any browser | Required for initial setup |

---

## Step 1: Install Node.js

**Node.js** runs JavaScript outside the browser. This is essential.

### Windows

1. **Open your browser** and go to: https://nodejs.org
2. **Download the LTS version** (Long Term Support) - currently v20.x or v22.x
3. **Run the installer** and click "Next" through all prompts
4. **Check the box** for "Automatically install the necessary tools" if prompted
5. **Restart your terminal** (close and reopen)

### macOS

```bash
# Option 1: Using Homebrew (recommended)
brew install node

# Option 2: Download from nodejs.org
# Follow the Windows instructions above
```

### Linux (Ubuntu/Debian)

```bash
# Using NodeSource (recommended)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version
npm --version
```

### Verify Installation

Open your terminal and run:

```bash
node --version
```

You should see: `v20.x.x` or `v22.x.x`

```bash
npm --version
```

You should see: `10.x.x` or higher

**If you see version numbers, Node.js is installed correctly!**

> **⚠️ Important Note about Node.js Version**
> 
> The AI Dashboard uses Next.js 15, which requires **Node.js version 20.9.0 or higher**. If you have an older version (like 20.8.1), you may encounter errors when starting the server.
> 
> **How to check your version:**
> ```bash
> node --version
> ```
> 
> **If you need to upgrade:**
> - **Windows/macOS**: Download the latest LTS version from [nodejs.org](https://nodejs.org)
> - **Using nvm (Node Version Manager)**:
>   ```bash
>   nvm install 20.11.0
>   nvm use 20.11.0
>   ```
> 
> **Common error to watch for:**
> ```
> You are using Node.js 20.8.1. For Next.js, Node.js version ">=20.9.0" is required.
> ```
> If you see this, simply upgrade Node.js.

---

## Step 2: Install Ollama (Local AI Models)

**Ollama** runs AI models on your computer. This is what makes local AI possible.

### Windows

1. Go to: https://ollama.com/download
2. Download the Windows installer
3. Run the installer and follow the prompts
4. Ollama will start automatically

### macOS

```bash
# Download and install
curl -fsSL https://ollama.com/install.sh | sh

# Or use Homebrew
brew install ollama
```

### Linux

```bash
curl -fsSL https://ollama.com/install.sh | sh
```

### Pull Your First Model

After installing Ollama, open a terminal and download a model:

```bash
# Pull Qwen 3.5 - 2B (smallest, fastest - runs on CPU)
ollama pull qwen3.5:2b

# Or pull a larger model (requires more RAM)
ollama pull qwen3.5:9b    # 9B parameters
ollama pull glm-4.7-flash  # GLM model

# Test it works
ollama run qwen3.5:2b
>>> Hello!
```

### Get Free Cloud Models (Optional but Recommended)

Ollama also offers FREE cloud API access to powerful models:

1. Go to: https://ollama.com/settings/keys
2. Create an account or sign in
3. Generate an API key
4. Save it for later - you'll add it to `.env.local`

**Free Cloud Models Available:**
• `kimi-k2.5` - Claude-distilled, excellent for writing
• `glm-5` - 756B parameters, GPT-like reasoning
• `deepseek-v3.2` - Great for code
• `qwen3.5:397b` - Massive 397B parameter model

---

## Step 3: Install VS Code

**VS Code** is a free, powerful code editor.

### All Platforms

1. Go to: https://code.visualstudio.com
2. Download for your OS
3. Run the installer
4. Open VS Code

### Essential Extensions

Click the Extensions icon (four squares) in the left sidebar, then search and install:

| Extension | Why You Need It |
|-----------|-----------------|
| **Prettier** | Formats code automatically |
| **ESLint** | Catches JavaScript errors |
| **TypeScript** | Better TypeScript support |
| **Tailwind CSS IntelliSense** | CSS autocomplete |

---

## Step 4: Get the Project Code

Now let's download the AI Dashboard code.

### Option A: Clone with Git (Recommended)

```bash
# Navigate to where you want the project
cd ~
mkdir projects
cd projects

# Clone the repository
git clone https://github.com/norhtecmbarnes-dot/PersonalAI-Dashboard.git

# Enter the project folder
cd PersonalAI-Dashboard
```

### Option B: Download ZIP

If you don't want to use Git:

1. Go to: https://github.com/norhtecmbarnes-dot/PersonalAI-Dashboard
2. Click the green "Code" button
3. Select "Download ZIP"
4. Extract the ZIP file
5. Open the folder in VS Code
6. Open terminal and run:
```bash
npm install
cp .env.example .env.local
npm run dev
```

**What this does:**
• Reads `package.json` (your shopping list)
• Downloads all required packages
• Creates `node_modules/` folder
• Creates `package-lock.json` (exact versions)

**If you see errors:**

```bash
# Clear cache and try again
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

---

## Step 6: Configure Environment Variables

Environment variables are your secret settings. Create your `.env.local` file:

### For Windows (Command Prompt)

```cmd
copy .env.example .env.local
```

### For Mac/Linux

```bash
cp .env.example .env.local
```

### Edit the File

Open `.env.local` in VS Code and add your settings:

```bash
# AI Model API Keys
# Local Ollama (required)
OLLAMA_API_URL=http://localhost:11434/api

# Ollama Cloud - FREE at https://ollama.com/settings/keys
OLLAMA_API_KEY=your-ollama-api-key-here

# Optional cloud providers (paid)
OPENROUTER_API_KEY=your-openrouter-key
GLM_API_KEY=your-glm-key
DEEPSEEK_API_KEY=your-deepseek-key

# Application settings
NEXT_PUBLIC_BASE_URL=http://localhost:3000
DATABASE_PATH=./data/assistant.db

# OnlyOffice (optional)
NEXT_PUBLIC_ONLYOFFICE_URL=http://localhost:8080
ONLYOFFICE_JWT_SECRET=your-secret-key-here
```

### Minimum Required Settings

For local-only use (completely free):

```bash
OLLAMA_API_URL=http://localhost:11434/api
DATABASE_PATH=./data/assistant.db
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

That's it! No API keys required for local models.

### For Ollama Cloud (Free API)

```bash
# Get your key from https://ollama.com/settings/keys
OLLAMA_API_KEY=ollama-xxxx-xxxx-xxxx
```

**Important:** Never commit `.env.local` to Git! It's already in `.gitignore`.

---

## Step 7: Understand the Data Architecture

This project uses TWO data storage systems:

### The Database (SQLite)

**What it is:** A traditional SQL database stored in a single file.

**Purpose:** Structured data that humans organize:
• User settings
• Brand information
• Project details
• Scheduled tasks
• Chat history
• Document metadata
• Notes and calendar events

**Location:** `data/assistant.db`

**How it works:**
```sql
-- Example: Saving a brand
INSERT INTO brands_v2 (id, name, created_at) 
VALUES ('brand-123', 'My Brand', 1709847600000);

-- Example: Querying brands
SELECT * FROM brands_v2 WHERE id = 'brand-123';
```

### The Datalake (Vector Store)

**What it is:** A semantic search index that the AI can understand.

**Purpose:** Unstructured data that the AI needs to search:
• Document content
• Conversation context
• Memory entries
• Knowledge base articles
• Research summaries

**How it works:**

Unlike a database where you search by exact matches (WHERE name = 'Alice'), the datalake searches by **meaning**:

```javascript
// You ask: "What did we discuss about pricing?"
// The AI searches: embeddings similar to "pricing discussion"
// Returns: Relevant paragraphs from documents, chat logs, notes
```

**Key difference:**

| Database | Datalake |
|----------|----------|
| SQL queries | Semantic search |
| Exact matches | Similarity search |
| Human-organized | AI-indexed |
| Structured data | Unstructured content |
| Fast CRUD operations | Fast semantic queries |

### Memory.md (Another AI-Readable Store)

**What it is:** A structured Markdown file for persistent AI memory.

**Purpose:** Long-term knowledge:
• User preferences
• Brand guidelines
• Project context
• Operating procedures
• Lessons learned

**Location:** `data/MEMORY.md`

**Example:**
```markdown
# User Profile
• Name: Michael
• Role: AI Developer
• Preferences: Prefers local models, no cloud subscriptions

# Projects
## AI Dashboard
• Goal: Personal AI assistant
• Status: Active development
• Key decisions: Using SQLite for simplicity
```

---

## Step 8: Initialize the Database

On first run, the database is automatically created. But you can verify:

```bash
# Run the initialization script
npm run db:init

# Or just start the server (database auto-creates)
npm run dev
```

The database will be created at: `data/assistant.db`

### Verify Database Tables

The database automatically creates these tables:

| Table | Purpose |
|-------|---------|
| `brands_v2` | Brand information |
| `projects_v2` | Project data |
| `chat_sessions` | Chat history |
| `documents` | Uploaded files metadata |
| `scheduled_tasks` | Automated tasks |
| `contacts` | Contact directory |
| `notes` | User notes |
| `calendar_events` | Calendar items |
| `vector_lake` | Search index |
| `custom_tools` | Custom tool definitions |
| `prompts` | Saved prompts |
| `experts` | Expert system profiles |
| `settings` | System settings |

---

## Step 9: Start the Development Server

Now let's run your AI Dashboard!

```bash
npm run dev
```

**What you'll see:**

```
   ▲ Next.js 16.1.6
   - Local:        http://localhost:3000
   - Environments: .env.local

 ✓ Starting...
 ✓ Ready in 3.2s
```

### Open in Browser

Go to: **http://localhost:3000**

You should see the **AI Dashboard** homepage!

### First-Time Setup

The first time you visit, you'll see a setup wizard. Fill in:

1. **Your Name** - How the AI should address you
2. **Assistant Name** - What to call your AI
3. **Select a Model** - Choose from available models

Click "Save" and you're ready!

---

## Step 10: Test Your Setup

Let's verify everything works:

### Test 1: Check the Chat

1. Go to http://localhost:3000
2. Type a message in the chat box
3. You should see a response from the AI

**If you see an error:**
• Check that Ollama is running: `ollama serve`
• Verify model is pulled: `ollama list`
• Check `.env.local` has correct settings

### Test 2: Check the Database

```bash
# View database contents
sqlite3 data/assistant.db ".tables"
sqlite3 data/assistant.db "SELECT * FROM settings;"
```

### Test 3: Check the Models Page

1. Navigate to http://localhost:3000/settings
2. You should see available models
3. Local models show size (e.g., "4.7 GB")
4. Cloud models are marked with "(Cloud)"

---

## Step 11: Install Additional Models

### Recommended Model Sizes

| Model | Size | RAM Needed | Best For |
|-------|------|------------|----------|
| `qwen3.5:2b` | 2.3 GB | 4 GB RAM | Quick responses, simple tasks |
| `gemma3:4b` | 4 GB | 8 GB RAM | General purpose, good balance |
| `qwen3.5:9b` | 9 GB | 16 GB RAM | Complex reasoning, coding |
| `glm-4.7-flash` | 29 GB | 32 GB RAM | Multilingual, fast |

### Install Commands

```bash
# Small model (runs on most computers)
ollama pull qwen3.5:2b

# Medium model (recommended)
ollama pull qwen3.5:9b
ollama pull gemma3:4b

# Check what you have
ollama list

# Remove a model you don't need
ollama rm unused-model
```

---

## Troubleshooting Common Issues

### "Module not found" Error

```bash
# Solution: Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

### "Ollama connection refused"

```bash
# Solution: Start Ollama
ollama serve

# In another terminal, pull a model
ollama pull qwen3.5:2b
```

### "Port 3000 already in use"

```bash
# Solution: Use a different port
PORT=3001 npm run dev

# Or kill the process using port 3000
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Mac/Linux
lsof -i :3000
kill -9 <PID>
```

### "Database locked" Error

```bash
# Solution: Only one process can use SQLite
# Stop the dev server, then restart
# Make sure no other Node process is running
```

---

## Directory Structure Overview

After setup, your project looks like this:

```
PersonalAI-Dashboard/
├── .env.local              # Your secret settings
├── .env.example            # Template for .env.local
├── package.json            # Dependencies
├── next.config.js          # Next.js configuration
├── tsconfig.json           # TypeScript configuration
│
├── src/
│   ├── app/                # Pages and API routes
│   │   ├── page.tsx        # Home page
│   │   ├── layout.tsx     # Layout wrapper
│   │   └── api/            # Backend endpoints
│   │       ├── chat/       # Chat API
│   │       ├── models/     # Models API
│   │       └── ...
│   │
│   ├── lib/                # Core libraries
│   │   ├── database/       # Database operations
│   │   ├── models/         # AI model routing
│   │   ├── services/       # Business logic
│   │   ├── utils/          # Utility functions
│   │   └── security/        # Security scanning
│   │
│   ├── components/         # UI components
│   │   ├── chat/           # Chat components
│   │   ├── documents/      # Document components
│   │   └── ui/              # Generic UI
│   │
│   └── instrumentation.ts  # Startup code
│
├── data/                   # Data storage
│   ├── assistant.db        # SQLite database
│   ├── MEMORY.md           # AI memory file
│   └── uploads/            # Uploaded files
│
├── book/                   # This book
├── docs/                   # Documentation
└── public/                 # Static files
```

---

## PROMPT YOU CAN USE

Generate a setup verification script:

```
Create a shell script (setup-check.sh) that:
1. Checks if Node.js is installed (show version)
2. Checks if npm is installed (show version)
3. Checks if Ollama is running (test connection)
4. Lists installed Ollama models
5. Checks if .env.local exists
6. Verifies database exists
7. Tests database connection
8. Outputs a summary with ✓ or ✗ for each check

Include comments explaining each command.
```

---

## Key Takeaways

✅ **Node.js** — Runs JavaScript on your computer

✅ **Ollama** — Runs AI models locally (free)

✅ **VS Code** — Best free code editor

✅ **Environment variables** — Secret settings in `.env.local`

✅ **Database** — Structured data in SQLite

✅ **Datalake** — AI-searchable content (semantic search)

✅ **Memory.md** — Persistent AI knowledge

✅ **npm run dev** — Start your development server

✅ **localhost:3000** — Where your app runs

---

## Troubleshooting Common Issues

Even with careful setup, you might encounter some issues. Here are common problems and how to fix them:

### 1. Node.js Version Too Old
**Error:** `You are using Node.js 20.8.1. For Next.js, Node.js version ">=20.9.0" is required.`

**Solution:** Upgrade Node.js to version 20.9.0 or higher. Download from [nodejs.org](https://nodejs.org) or use nvm:
```bash
nvm install 20.11.0
nvm use 20.11.0
```

### 2. EPERM Permission Errors
**Error:** `EPERM: operation not permitted, open '.next\trace'`

**Solution:** This happens when Next.js tries to write trace files. Clear the `.next` cache and rebuild:
```bash
rm -rf .next
npm run build
```

### 3. Port Already in Use
**Error:** `Error: listen EADDRINUSE: address already in use :::3000`

**Solution:** Another process is using port 3000. Either:
• Stop the other process: Find it with `netstat -ano | findstr :3000` (Windows) or `lsof -i :3000` (macOS/Linux)
• Use a different port: `npm run dev -- -p 3001`

### 4. Database Initialization Errors
**Error:** `Database not initialized` or SQLite errors

**Solution:** Initialize the database manually:
```bash
npm run db:init
```

### 5. Setup Wizard Won't Accept Input
**Problem:** The setup page asks for your name and assistant name but won't let you submit.

**Solution:** This happens when the user preferences database fails. The system now uses a JSON file. Restart the server and try again, or manually delete `data/user-preferences.json` if it exists.

### 6. Heartbeat API Error
**Error:** `"a is not a function"` in heartbeat response

**Solution:** This is an Ollama SDK compatibility issue. Check that Ollama is running: `curl http://localhost:11434/api/tags`. If Ollama isn't running, start it first.

### Getting More Help
If you're stuck, check:
• The project's GitHub Issues: https://github.com/norhtecmbarnes-dot/PersonalAI-Dashboard/issues
• The `ai-dashboard-errors.log` file for detailed error logs
• The browser's Developer Tools Console (F12) for JavaScript errors

---

## Next Steps

Now that everything is set up:

1. **Try the chat** at http://localhost:3000
2. **Upload a document** and chat with it
3. **Create a brand** in the Brand Workspace
4. **Set up scheduled tasks** for automation

In the next chapter, we'll dive into **what programming actually is** and how code works.

---

**Next: Chapter 5 - What is Programming?**