# Chapter 4: Setting Up Your Computer - Step by Step

Before we build anything, we need the right tools. Think of this like setting up a kitchen before cooking. In this chapter, we'll install everything you need — step by step, with screenshots described.

## What You'll Learn

- Installing **VS Code** (your code editor)
- Understanding the **terminal/command line**
- Basic navigation commands (cd, ls, mkdir)
- Installing **Node.js** and **npm**
- What **environment variables** are
- Setting up your project folder
- Verifying everything works
- **What GitHub is and how to use it**
- **Cloning and running this project's code**
- **Setting up AI-assisted development** with OpenCode, GLM-5, and Kimi
- **Why multiple AI models** can improve your code quality

---

## Step 1: Install VS Code

**VS Code** is the most popular code editor. It's free and works on Windows, Mac, and Linux.

### Download
1. Go to: https://code.visualstudio.com
2. Click the big blue "Download" button
3. Run the installer

### What You'll See
When you open VS Code, you'll see:
- **Left sidebar** — File explorer, search, extensions
- **Center** — Where you edit files
- **Top menu** — File, Edit, View, etc.
- **Bottom panel** — Terminal, problems, output

### Extensions to Install
Click the Extensions icon (four squares) on the left, then search for:
- **ES7+ React/Redux/React-Native snippets**
- **Prettier - Code: formatter**
- **TypeScript Importer**

Click "Install" for each.

---

## Step 2: Open the Terminal

The **terminal** (also called command line or console) is where you type commands.

### On Windows
- Press `Win + X`
- Select "Windows Terminal" or "Command Prompt"
- Or press `Win + R`, type `cmd`, press Enter

### On Mac
- Press `Cmd + Space`
- Type "Terminal"
- Press Enter

### What You'll See
A black (or colored) window with something like:
```
C:\Users\YourName>
```
or
```
YourName@ComputerName ~ %
```

This is your **command prompt**. The text before the `>` or `%` shows where you are.

---

## Step 3: Basic Commands

Type these commands and press Enter:

### See where you are (Print Working Directory)
```bash
pwd
```
Shows your current location.

### List files
```bash
ls
```
(on Windows, you can also use `dir`)

Shows files and folders in your current location.

### Change directory
```bash
cd Documents
```
Moves into the Documents folder.

### Go up one level
```bash
cd ..
```

### Make a new folder
```bash
mkdir my-project
```
Creates a new folder called "my-project".

### Practice
Try this sequence:
```bash
pwd                    # See where you are
mkdir projects         # Make a folder
cd projects            # Enter it
pwd                    # Verify you're inside
mkdir ai-dashboard     # Make another folder
cd ai-dashboard        # Enter that
ls                     # See what's inside (empty!)
```

---

## Step 4: Install Node.js

**Node.js** runs JavaScript on your computer (not just in browsers).

### Download
1. Go to: https://nodejs.org
2. Click the green "LTS" (Long Term Support) button
3. Run the installer
4. Click "Next" through all the prompts

### Verify Installation
Open a terminal and type:
```bash
node --version
```

You should see something like:
```
v18.17.0
```

Also check npm:
```bash
npm --version
```

Should show:
```
9.6.7
```

**If you see version numbers, you're good!**

---

## Step 5: What Are Environment Variables?

Think of **environment variables** as settings that programs need. Like "secret notes" your computer keeps.

### Real-World Analogy
Imagine you have a robot assistant. Instead of telling it your address every time, you write it on a sticky note and stick it on the robot. Now the robot always knows where you live.

**Environment variables are like those sticky notes.**

### Common Uses
- **API Keys** — Secret passwords for services
- **Database URLs** — Where your data lives
- **Port Numbers** — Which network port to use
- **Configuration** — Settings that change by computer

### Setting Them (Windows)
1. Open Start Menu
2. Search for "Environment Variables"
3. Click "Edit the system environment variables"
4. Click "Environment Variables" button
5. Click "New" under User variables
6. Name: `MY_VARIABLE`
7. Value: `my_value`
8. Click OK

### Setting Them (Mac/Linux)
In terminal:
```bash
export MY_VARIABLE="my_value"
```

To make it permanent, add to `~/.bashrc` or `~/.zshrc`.

### Using in Code
In your AI Dashboard, you'll create a `.env` file:
```
OLLAMA_API_URL=http://localhost:11434
OPENROUTER_API_KEY=your_key_here
DATABASE_PATH=./data/assistant.db
```

Your code reads these automatically.

---

## Step 6: Set Up Your Project

Now let's create your AI Dashboard project folder.

### Create the Folder Structure
```bash
# Go to your home directory
cd ~

# Create the main folder
mkdir ai-dashboard
cd ai-dashboard

# Create subfolders
mkdir src
mkdir src/app
mkdir src/lib
mkdir src/components
mkdir data
mkdir docs
mkdir public

# Check your work
ls
```

You should see: `data`, `docs`, `public`, `src`

---

## Step 7: Verify Everything Works

Let's create a simple test file.

### Create a Test File
In VS Code:
1. Click "Open Folder" and select your `ai-dashboard` folder
2. Click the "New File" icon in the left sidebar
3. Name it `test.js`
4. Type this code:

```javascript
console.log('Hello, AI Dashboard!');
console.log('Node version:', process.version);
console.log('Current directory:', process.cwd());
```

### Run It
In terminal:
```bash
node test.js
```

**You should see:**
```
Hello, AI Dashboard!
Node version: v18.17.0
Current directory: C:\Users\YourName\ai-dashboard
```

**If you see this output, everything works!**

---

## Step 8: Getting the Code from GitHub

This book comes with a complete, working codebase you can download and run. Let's learn about **GitHub** and how to use it.

### What is GitHub?

**GitHub** is like Google Drive for code, but better:
- Stores code online (cloud backup)
- Tracks all changes (version control)
- Lets many people collaborate
- Shows issues and features (project management)
- Free for open-source projects

**Think of it as:**
- A backup of your code
- A history of every change
- A way to share with others
- A place to report bugs and request features

### What is Git?

**Git** is the tool that tracks changes. GitHub is the website that hosts Git repositories.

**The Difference:**
| Git | GitHub |
|-----|--------|
| The tool | The service |
| Runs locally | Runs in the cloud |
| Tracks changes | Hosts repositories |
| Free software | Freemium service |

You need both: Git for tracking, GitHub for sharing.

---

### Installing Git

#### On Windows
1. Go to: https://git-scm.com/download/win
2. Download the installer
3. Run it and click "Next" through all prompts
4. Git Bash will be installed (a terminal for Git commands)

#### On Mac
1. Open Terminal
2. Type: `git --version`
3. If not installed, macOS will prompt you to install Xcode Tools
4. Click "Install"

#### On Linux (Ubuntu/Debian)
```bash
sudo apt update
sudo apt install git
```

#### Verify Installation
```bash
git --version
```
You should see: `git version 2.x.x`

---

### Getting This Project's Code

The complete code for this book is on GitHub. Here's how to get it:

#### Option 1: Clone with Git (Recommended)

```bash
# Navigate to where you want the project
cd ~/projects

# Clone the repository
git clone https://github.com/norhtecmbarnes/personalai-dashboard.git

# Enter the project folder
cd personalai-dashboard

# Install dependencies
npm install

# Copy the example environment file
cp .env.example .env.local

# Start the development server
npm run dev
```

**What Each Command Does:**
- `git clone` — Downloads a copy of the entire project
- `npm install` — Installs all required packages
- `cp .env.example .env.local` — Creates your local settings file
- `npm run dev` — Starts the development server

#### Option 2: Download ZIP

If you don't want to use Git:

1. Go to: https://github.com/norhtecmbarnes/personalai-dashboard
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

#### Option 3: GitHub Desktop

If you prefer a graphical interface:

1. Download GitHub Desktop: https://desktop.github.com
2. Sign in with your GitHub account
3. Click "Clone a repository from the Internet"
4. Paste: `https://github.com/norhtecmbarnes/personalai-dashboard`
5. Click "Clone"

---

### Understanding the Repository

When you clone this project, you get:

```
personalai-dashboard/
├── src/                  # Source code
│   ├── app/             # Pages and API routes
│   ├── lib/             # Core libraries
│   └── components/      # UI components
├── book/                # This book (lessons)
├── docs/                # Documentation
├── data/                # SQLite database (auto-created)
├── public/              # Static files
├── package.json         # Dependencies list
├── .env.example         # Environment template
├── README.md            # Project overview
└── LICENSE              # MIT License
```

**Key Files to Know:**
- `package.json` — Lists all packages needed
- `.env.example` — Template for environment variables
- `README.md` — Quick start guide
- `src/app/` — Where pages live

---

### Setting Up Environment Variables

This project needs some configuration. Copy the example file:

```bash
cp .env.example .env.local
```

Then edit `.env.local` with your settings:

```bash
# Open in your editor
nano .env.local
# Or in VS Code
code .env.local
```

**What You'll Configure:**
| Variable | What It Does | Required? |
|----------|--------------|-----------|
| `OLLAMA_API_URL` | Where Ollama runs | Yes (default works) |
| `OLLAMA_API_KEY` | For Ollama Cloud web search | Optional |
| `OPENROUTER_API_KEY` | Cloud model access | Optional |
| `GLM_API_KEY` | GLM model access | Optional |
| `DEEPSEEK_API_KEY` | DeepSeek model access | Optional |

**For local-only (free) use:**
You don't need any API keys! Just use local models with Ollama.

**For cloud models:**
1. Get an API key from the provider (OpenRouter, GLM, etc.)
2. Add it to your `.env.local` file
3. Restart the dev server

---

### Installing Dependencies

The `npm install` command downloads all required packages:

```bash
npm install
```

**What It Does:**
1. Reads `package.json` 
2. Downloads all packages listed
3. Creates `node_modules/` folder
4. Creates `package-lock.json` (exact versions)

**If You Get Errors:**
- Make sure Node.js is installed
- Try: `npm cache clean --force`
- Delete `node_modules` and `package-lock.json`, then run `npm install` again

---

### Running the Development Server

```bash
npm run dev
```

**What Happens:**
1. Next.js starts a local server
2. Opens at: http://localhost:3000
3. Watches for file changes
4. Auto-reloads when you save

**Open in Browser:**
```
http://localhost:3000
```

You should see the AI Dashboard interface!

---

### Common Git Commands

Here are the Git commands you'll use most:

| Command | What It Does |
|---------|--------------|
| `git clone [url]` | Download a project |
| `git status` | See what changed |
| `git pull` | Get latest updates |
| `git log` | View history |
| `git diff` | See differences |

**For Contributors:**
| Command | What It Does |
|---------|--------------|
| `git add [file]` | Stage changes |
| `git commit -m "message"` | Save changes |
| `git push` | Upload to GitHub |

---

### Keeping Your Code Updated

As this project improves, you'll want the latest changes:

```bash
# In the project folder
git pull origin master
npm install  # In case new packages were added
npm run dev   # Restart with new code
```

**If You Made Changes:**
```bash
# Save your changes
git stash

# Get updates
git pull origin master

# Restore your changes
git stash pop
```

---

### Reporting Issues and Getting Help

Found a bug? Want a feature?

1. Go to: https://github.com/norhtecmbarnes/personalai-dashboard/issues
2. Click "New Issue"
3. Describe the problem or feature
4. Submit

**Good Bug Reports Include:**
- What you were trying to do
- What happened instead
- Steps to reproduce
- Your system (Windows/Mac/Linux, Node version)

---

### Forking and Customizing

Want to make your own version?

**What is a Fork?**
A fork is your personal copy of someone else's project. You can modify it without affecting the original.

**How to Fork:**
1. Go to the repository on GitHub
2. Click "Fork" (top-right)
3. GitHub creates your copy
4. Clone your fork:
```bash
git clone https://github.com/YOUR-USERNAME/personalai-dashboard.git
```

**Keep Your Fork Updated:**
```bash
# Add the original as "upstream"
git remote add upstream https://github.com/norhtecmbarnes/personalai-dashboard.git

# Get updates from upstream
git fetch upstream
git merge upstream/master
```

---

### The License: Open Source Freedom

This project uses dual licensing:

**Code: MIT License**
- ✅ Use commercially
- ✅ Modify freely
- ✅ Distribute
- ✅ No warranty

**Book Content: CC BY-SA 4.0**
- ✅ Share and adapt
- ✅ Commercial use allowed
- ⚠️ Must give attribution
- ⚠️ Changes must use same license

**What This Means:**
You can use this code for anything — personal projects, business products, teaching. Just don't sue us if something breaks!

---

### PROMPT YOU CAN USE

```
Create a README.md file for an open-source project that:
1. Explains what the project does in one sentence
2. Lists prerequisites (Node.js, etc.)
3. Shows installation steps with commands
4. Explains basic usage
5. Links to documentation
6. Includes a "Contributing" section
7. Shows the license and how to attribute

The project is: [your project description]
```

---

## Step 9: AI-Assisted Development Environment

Here's where this book takes a different path. Instead of just using VS Code alone, you'll learn to use **AI assistants** that help you write code. This dramatically speeds up development and helps you learn faster.

### Why AI-Assisted Development?

Remember the philosophy from Chapter 1? We treat AI as a **tool manager**. The same applies here — you're not replacing yourself with AI, you're managing tools that make you more productive.

**The benefits:**
- **Faster learning** — AI explains concepts as you go
- **Fewer errors** — AI catches mistakes before they happen
- **Better code** — AI suggests improvements you might not know about
- **24/7 help** — AI doesn't sleep, take breaks, or get frustrated

### Choosing Your AI Assistant

You have several options for AI-assisted development:

#### Option 1: OpenCode (Used in This Book)

**OpenCode** is a terminal-based AI coding assistant that runs locally with Ollama. This is what I used to write most of this book and the accompanying code.

**Why OpenCode?**
- Runs entirely on your machine (privacy first)
- Works with local models (no subscription required)
- Terminal-based (stays out of your way)
- Can read and edit files directly

**How I Set It Up:**
1. Install Ollama: https://ollama.com
2. Open terminal in your project folder
3. Run: `ollama run opencode`

That's it! Now you have an AI assistant in your terminal.

#### Option 2: VS Code with GitHub Copilot

If you prefer VS Code, GitHub Copilot is a popular choice:
1. Install VS Code
2. Install the GitHub Copilot extension
3. Sign in with your GitHub account (requires subscription)

**Pros:** Deep integration with VS Code
**Cons:** Requires subscription, data sent to cloud

#### Option 3: Cursor IDE

**Cursor** is a VS Code fork with AI built in:
1. Download from: https://cursor.sh
2. Open your project folder
3. Use Cmd+K (Mac) or Ctrl+K (Windows) to invoke AI

**Pros:** Very polished, good context awareness
**Cons:** Requires subscription for best features

---

### My Development Setup: GLM-5 + Kimi 2.5

Here's exactly how I developed this project. I used **two different AI models**, switching between them based on their strengths:

#### Primary Model: GLM-5 (via OpenCode)

**When to use GLM-5:**
- Writing TypeScript and JavaScript code
- Explaining technical concepts
- Debugging complex logic
- Refactoring code structure
- Writing documentation

**Strengths:**
- Excellent at code generation
- Good at explaining *why* something works
- Handles complex multi-file projects well
- Strong reasoning capabilities

**How I used it:**
```bash
ollama run opencode
# At the OpenCode prompt:
> "Create a Next.js API route that handles chat messages with streaming responses"
```

#### Secondary Model: Kimi 2.5 (Moonshot)

**When to use Kimi 2.5:**
- Long context tasks (reading entire files)
- Research and explanations
- Alternative perspective on problems
- When GLM-5 gets stuck

**Strengths:**
- Very long context window (can read more at once)
- Good at summarizing
- Different "thinking style" provides backup opinions
- Often catches things GLM-5 misses

**How I used it:**
```bash
> "Review the database schema we just created. What optimization opportunities do you see?"
```

#### The Workflow

Here's my typical development flow:

1. **Start with GLM-5**
   - Generate initial code
   - Get structure and logic right
   
2. **Switch to Kimi 2.5**
   - Review the code
   - Look for edge cases
   - Get a second opinion
   
3. **Iterate Back and Forth**
   - GLM-5: "Here's what Kimi suggested. Implement these changes."
   - Kimi: "Review the changes. Are there any issues?"
   
4. **Manual Testing**
   - I review and test the code personally
   - Make sure it meets my requirements
   - Adjust as needed

---

### Example Session

Here's a real example of how I developed a feature:

**Step 1: Start OpenCode**
```bash
cd ai-dashboard
ollama run opencode
```

**Step 2: Describe What I Want (GLM-5)**
```
> I need to add a task scheduler to the AI Dashboard. 
> It should:
> 1. Run tasks at scheduled intervals
> 2. Support recurring tasks (daily, weekly, etc.)
> 3. Log task results
> 4. Handle failures gracefully
> 
> Create the scheduler service in src/lib/services/task-scheduler.ts
```

**Step 3: Review with Kimi 2.5**
```
> Switch to kimi-2.5
> Review the task scheduler code. What edge cases might we have missed?
> What error handling should we add?
```

**Step 4: Implement Feedback (back to GLM-5)**
```
> Switch to glm-5
> Kimi suggested adding retry logic and better logging. 
> Implement those changes.
```

**Step 5: Test Manually**
```bash
# Exit OpenCode (Ctrl+D or 'exit')
npm run test
npm run dev
# Test in browser
```

---

### Other AI Models You Can Use

The beauty of this approach is you can use whatever models work best for you:

**Free/Local Models (via Ollama):**
| Model | Size | Best For |
|-------|------|----------|
| `qwen3.5:2b` | 2.3B | Fast responses, simple tasks |
| `qwen2.5:14b` | 14.8B | More capable, better reasoning |
| `llama4:scout` | 108.6B | Very capable (needs GPU) |
| `glm-4.7-flash` | 29.9B | Excellent multilingual |
| `deepseek-r1` | varies | Reasoning and analysis |

**Cloud Models (require API keys):**
| Model | Provider | Best For |
|-------|----------|----------|
| Claude | Anthropic | Complex reasoning, long context |
| GPT-4o | OpenAI | General purpose, multimodal |
| Gemini | Google | Multimodal, long context |
| DeepSeek | DeepSeek | Code generation, reasoning |

---

### Tips for AI-Assisted Development

#### DO:
- ✅ **Be specific** — The more detail you provide, the better the output
- ✅ **Ask for explanations** — "Explain how this works" helps you learn
- ✅ **Request alternatives** — "Show me three ways to do this"
- ✅ **Review code yourself** — Never blindly trust AI output
- ✅ **Use multiple models** — Get different perspectives

#### DON'T:
- ❌ **Copy without understanding** — You won't learn
- ❌ **Ignore security** — AI can produce insecure code
- ❌ **Skip testing** — Always verify AI output works
- ❌ **Ask for malware** — AI assistants refuse harmful code

---

### How This Book Uses AI

Throughout this book, you'll see **"PROMPT YOU CAN USE"** boxes. These are ready-to-paste prompts for AI assistants:

```
PROMPT YOU CAN USE:
"Create a function that validates email addresses. 
Return true if valid, false otherwise. 
Include tests for common edge cases."
```

You can copy these prompts and paste them into:
- OpenCode (terminal)
- Claude (web)
- ChatGPT (web)
- Cursor IDE
- GitHub Copilot chat

The prompts are designed to give you **working code** that you can then study, modify, and learn from.

---

### Why Two Models Works Better Than One

Using multiple AI models is like having a team of consultants:

**GLM-5** is your primary developer:
- Fast and competent
- Good at generating code
- Understands project structure

**Kimi 2.5** is your code reviewer:
- Catches things others miss
- Different perspective
- Good at finding edge cases

**You** are the project manager:
- Make final decisions
- Ensure quality
- Understand business requirements
- Take responsibility

This three-party approach produces better code than any single AI alone.

---

### Setting Up Your AI Environment

**Option A: Free & Private (Recommended for this book)**

```bash
# 1. Install Ollama
# Visit https://ollama.com and download

# 2. Pull the models
ollama pull glm-4.7-flash
ollama pull qwen2.5:14b

# 3. Create your .env file with API keys (optional)
# See .env.example for available options

# 4. Start the AI Dashboard
npm run dev
```

**Option B: Cloud-Based (Requires subscription)**

1. Sign up for Claude (Anthropic) or ChatGPT Plus (OpenAI)
2. Use VS Code with Copilot or Cursor IDE
3. Keep this book open alongside your editor

**Option C: Hybrid (Best of both)**

```bash
# Local models for daily development (free)
ollama run glm-4.7-flash

# Cloud models for complex tasks (paid)
# Use API keys in .env.local for:
# - OPENROUTER_API_KEY (Claude, GPT-4, etc.)
# - GLM_API_KEY (GLM models)
# - DEEPSEEK_API_KEY (DeepSeek)
```

---

### PROMPT YOU CAN USE

Here's a prompt to set up AI-assisted development:

```
I want to set up an AI-assisted development environment.

My setup:
- Operating System: [Windows/Mac/Linux]
- Code Editor: [VS Code/Cursor/Other]
- Goal: Build AI applications locally

Recommend:
1. Which AI models should I use?
2. How do I install them?
3. What's the best workflow for my situation?

Consider: I want privacy (local models preferred) but high quality output.
```

---

Want to generate a setup script? Use this:

```
Create a shell script (setup.sh for Mac/Linux or setup.bat for Windows) that:
1. Creates a project folder structure
2. Creates src/, data/, docs/, public/ folders
3. Creates a README.md with project description
4. Outputs "Setup complete!" when finished

Include comments explaining each command.
```

---

## Key Takeaways

✅ **VS Code** — Your code editor (free and powerful)

✅ **Terminal** — Where you type commands

✅ **Basic commands** — pwd, ls, cd, mkdir

✅ **Node.js** — Runs JavaScript on your computer

✅ **Environment variables** — Settings programs need

✅ **Project structure** — Organized folders for your code

✅ **GitHub** — Cloud storage for code with version control

✅ **Git clone** — Download projects from GitHub

✅ **AI-assisted development** — Use AI as a tool manager, code faster

✅ **Multiple models** — GLM-5 for code, Kimi for review (or your choice)

---

**Next: Chapter 5 - What is Programming?**
