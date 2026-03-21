# OpenCode AI Dashboard Installer

## Overview

This script provides step-by-step instructions for OpenCode (or any AI assistant) to install the AI Dashboard on a user's computer.

## What This Does

1. **Clones the repository** from GitHub to the user's local drive
2. **Installs dependencies** (Node.js, npm packages)
3. **Sets up the environment** (environment variables, database)
4. **Verifies the installation** by starting the system

## Prerequisites

Before starting, ensure:
- User has **Git** installed (or install it)
- User has **Node.js v18+** installed (or install it)
- User has **10GB free disk space**
- User has **8GB+ RAM** (16GB recommended)

---

## Installation Steps for OpenCode

### Step 1: Clone the Repository

```
ACTION: Clone the AI Dashboard repository to the user's preferred location

COMMAND: git clone https://github.com/norhtecmbarnes-dot/PersonalAI-Dashboard.git <TARGET_DIRECTORY>

EXAMPLE: git clone https://github.com/norhtecmbarnes-dot/PersonalAI-Dashboard.git C:\Users\USER\AI-Dashboard
```

### Step 2: Navigate to the Project

```
ACTION: Change into the project directory

COMMAND: cd <TARGET_DIRECTORY>

EXAMPLE: cd C:\Users\USER\AI-Dashboard
```

### Step 3: Install Node.js Dependencies

```
ACTION: Install all required npm packages

COMMAND: npm install

EXPECTED_OUTPUT: This may take 3-5 minutes depending on internet speed
```

### Step 4: Set Up Environment File

```
ACTION: Copy the environment template and configure

COMMAND: cp .env.example .env.local

ON WINDOWS: Copy-Item .env.example .env.local
```

### Step 5: Configure Environment Variables

```
ACTION: Edit .env.local with required settings

REQUIRED_VARIABLES:
- OLLAMA_BASE_URL (default: http://localhost:11434)
- OPENAI_API_KEY (optional, for cloud models)
- DATABASE_PATH (default: ./data/assistant.db)

RECOMMENDED_SETTINGS:
- NODE_ENV=development
- NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Step 6: Initialize Database

```
ACTION: Start the application to auto-create database

COMMAND: npm run dev

FIRST_RUN_NOTES:
- SQLite database will be created automatically
- The database file will be at: data/assistant.db
- Initial setup takes about 30 seconds
```

### Step 7: Verify Installation

```
ACTION: Check that the system is running

HEALTH_CHECK_URL: http://localhost:3000
EXPECTED: Dashboard should load without errors

API_VERIFICATION:
- http://localhost:3000/api/health - Should return {status: "ok"}
- http://localhost:3000/api/tasks - Should return {tasks: []}
```

---

## Platform-Specific Instructions

### Windows

```powershell
# Install Git if not present
winget install -e --id Git.Git

# Install Node.js if not present  
winget install -e --id OpenJS.NodeJS.LTS

# Clone repository
git clone https://github.com/norhtecmbarnes-dot/PersonalAI-Dashboard.git

# Install
cd PersonalAI-Dashboard
npm install

# Configure
Copy-Item .env.example .env.local
# Edit .env.local with text editor

# Run
npm run dev
```

### macOS

```bash
# Install Homebrew if not present
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install Git and Node.js
brew install git node

# Clone repository
git clone https://github.com/norhtecmbarnes-dot/PersonalAI-Dashboard.git

# Install
cd PersonalAI-Dashboard
npm install

# Configure
cp .env.example .env.local
# Edit .env.local with text editor

# Run
npm run dev
```

### Linux (Ubuntu/Debian)

```bash
# Install prerequisites
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs git

# Clone repository
git clone https://github.com/norhtecmbarnes-dot/PersonalAI-Dashboard.git

# Install
cd PersonalAI-Dashboard
npm install

# Configure
cp .env.example .env.local
nano .env.local  # Or use your preferred editor

# Run
npm run dev
```

---

## Troubleshooting Installation Issues

### "npm command not found"

**Problem:** Node.js is not installed  
**Solution:** Install Node.js from https://nodejs.org or use package manager above

### "git command not found"

**Problem:** Git is not installed  
**Solution:** Install Git from https://git-scm.com or use package manager above

### "Port 3000 is already in use"

**Problem:** Another application is using port 3000  
**Solution:** 
- Find and stop the other application, OR
- Change the port in .env.local: `PORT=3001`

### "Cannot connect to Ollama"

**Problem:** Ollama is not running or not accessible  
**Solution:**
- Install Ollama from https://ollama.com
- Run `ollama serve` in a separate terminal
- Ensure OLLAMA_BASE_URL in .env.local is correct

### "Database error"

**Problem:** SQLite database issue  
**Solution:**
- Delete the data/assistant.db file
- Restart the application with `npm run dev`
- The database will be recreated automatically

### "Permission denied"

**Problem:** Cannot write to the project directory  
**Solution:**
- Run terminal as Administrator (Windows)
- Use `sudo` (Linux/macOS)
- Or change ownership: `sudo chown -R $USER:$USER <project-directory>`

---

## Post-Installation Setup

### 1. Configure Ollama (Recommended)

```bash
# Pull a model for local AI
ollama pull qwen3.5:9b

# Or use cloud models (no setup needed)
# Just set OPENAI_API_KEY in .env.local
```

### 2. Run Initial Security Scan

```
Navigate to: http://localhost:3000/security
Click "Run Security Scan"
Review and address any findings
```

### 3. Set Up Daily Briefing

```
Navigate to: http://localhost:3000/daily-briefing
Review the briefing configuration
Enable/disable sections as needed
```

---

## Verification Checklist

After installation, verify:

- [ ] Dashboard loads at http://localhost:3000
- [ ] No error messages in console
- [ ] Can send and receive chat messages
- [ ] Can upload a test document
- [ ] Can view daily briefing
- [ ] Security scan runs successfully

---

## Uninstallation

To remove the AI Dashboard:

```bash
# Stop the server (Ctrl+C in terminal)

# Delete the project folder
rm -rf <project-directory>

# Optionally remove data folder (contains user data)
rm -rf ~/.ai-dashboard  # or wherever data is stored
```

---

## Getting Help

If installation fails after trying troubleshooting:

1. **Check the logs:** Look at terminal output for error messages
2. **Search existing issues:** https://github.com/norhtecmbarnes-dot/PersonalAI-Dashboard/issues
3. **Create a new issue:** Include error messages and your operating system

---

## Next Steps After Installation

Once installed, refer to the **Operator's Manual** (`book-operators/`) for:
- Chapter 3: Dashboard Interface Guide
- Chapter 4: Getting Your Daily Briefing
- Chapter 5: Working with Documents
- Chapter 9: Best Practices

---

*This installer is designed for use with OpenCode AI assistant. It provides plain-language instructions that AI can execute on behalf of the user.*
