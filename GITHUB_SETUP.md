# Setting Up Your GitHub Repository

This guide will help you create a clean, professional GitHub repository for OpenAI Dashboard.

## Prerequisites

1. GitHub account (create one at https://github.com if needed)
2. Git installed on your computer
3. This project cloned locally

## Step 1: Create Repository on GitHub

1. Go to https://github.com/new
2. **Repository name**: `openai-dashboard` (or your preferred name)
3. **Description**: "A comprehensive, privacy-first AI assistant that runs entirely on your local machine"
4. **Visibility**: Public (for open source)
5. **DO NOT** initialize with:
   - README (we already have one)
   - .gitignore (we already have one)
   - License (we already have LICENSE files)
6. Click "Create repository"

## Step 2: Link Your Local Repository

Run these commands in your terminal (in the project directory):

```bash
# Add the GitHub remote
git remote add origin https://github.com/YOUR_USERNAME/openai-dashboard.git

# Verify the remote was added
git remote -v
```

## Step 3: Prepare Files

Before committing, ensure these files are ready:

✅ `README.md` - Project description  
✅ `LICENSE` - MIT License  
✅ `LICENSE-CONTENT` - CC BY-SA 4.0 for docs  
✅ `CITATION.cff` - Citation file  
✅ `.gitignore` - Properly configured  

## Step 4: Initial Commit

```bash
# Stage all files
git add .

# Commit with a clear message
git commit -m "Initial release: OpenAI Dashboard v0.1.0

Features:
- Complete privacy-first AI assistant
- Local model support via Ollama
- Document management and chat
- Canvas builder and writing assistant
- Security scanning and self-reflection
- Task scheduler and calendar
- 16-chapter comprehensive guide

License: MIT (code) + CC BY-SA 4.0 (docs)"

# Push to GitHub
git push -u origin main
```

## Step 5: Configure Repository Settings

Go to your repository on GitHub and configure:

### General Settings
1. **Repository name**: openai-dashboard
2. **Social preview**: Upload an image (1200x630 recommended)
3. **Topics**: Add these tags:
   - ai-assistant
   - local-ai
   - ollama
   - nextjs
   - typescript
   - privacy
   - self-hosted
   - document-management
   - open-source

### Branch Protection (Optional but Recommended)
1. Go to Settings → Branches
2. Click "Add rule" for `main` branch:
   - Require pull request reviews before merging
   - Require status checks to pass
   - Include administrators

### Security Settings
1. Go to Security → Security overview
2. Enable:
   - Dependency graph
   - Dependabot alerts
   - Secret scanning

## Step 6: Create Issue Templates

Create `.github/ISSUE_TEMPLATE/bug_report.md`:

```markdown
---
name: Bug report
about: Create a report to help us improve
title: '[BUG] '
labels: bug
assignees: ''
---

**Describe the bug**
A clear description of what the bug is.

**To Reproduce**
Steps to reproduce:
1. Go to '...'
2. Click on '....'
3. See error

**Expected behavior**
What you expected to happen.

**Screenshots**
If applicable, add screenshots.

**Environment:**
 - OS: [e.g., Windows, macOS, Linux]
 - Browser: [e.g., Chrome, Safari]
 - Node Version: [e.g., 18.0.0]
 - Ollama Version: [e.g., 0.1.0]

**Additional context**
Add any other context here.
```

Create `.github/ISSUE_TEMPLATE/feature_request.md`:

```markdown
---
name: Feature request
about: Suggest an idea for this project
title: '[FEATURE] '
labels: enhancement
assignees: ''
---

**Is your feature request related to a problem?**
A clear description of what the problem is.

**Describe the solution you'd like**
A clear description of what you want to happen.

**Describe alternatives you've considered**
A clear description of any alternative solutions or features.

**Additional context**
Add any other context or screenshots here.
```

## Step 7: Create Pull Request Template

Create `.github/pull_request_template.md`:

```markdown
## Description
Please include a summary of the changes and which issue is fixed.

Fixes # (issue)

## Type of change
- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update

## Checklist
- [ ] My code follows the style guidelines of this project
- [ ] I have performed a self-review of my own code
- [ ] I have commented my code, particularly in hard-to-understand areas
- [ ] I have made corresponding changes to the documentation
- [ ] My changes generate no new warnings
- [ ] I have added tests that prove my fix is effective or that my feature works
- [ ] New and existing unit tests pass locally with my changes

## License
By submitting this PR, I agree that my contributions will be licensed under the MIT License (code) and CC BY-SA 4.0 (documentation).
```

## Step 8: Configure GitHub Actions (Optional)

Create `.github/workflows/ci.yml` for automated testing:

```yaml
name: CI

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  build:
    runs-on: ubuntu-latest

    strategy:
      matrix:
        node-version: [18.x, 20.x]

    steps:
    - uses: actions/checkout@v3
    
    - name: Use Node.js ${{ matrix.node-version }}
      uses: actions/setup-node@v3
      with:
        node-version: ${{ matrix.node-version }}
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Build
      run: npm run build
    
    - name: Run linter
      run: npm run lint
```

## Step 9: Add a CONTRIBUTING.md

See CONTRIBUTING.md in this repository for guidelines.

## Step 10: Configure Discussions

1. Go to Settings → Discussions
2. Enable Discussions
3. Configure categories:
   - Q&A
   - Ideas
   - General
   - Show and tell

## Step 11: Final Verification

Check that everything is working:

```bash
# Verify GitHub connection
git remote -v

# Check status
git status

# Verify your email/username
git config user.name
git config user.email
```

## Troubleshooting

### Permission denied
```bash
# Use SSH instead of HTTPS
git remote set-url origin git@github.com:YOUR_USERNAME/openai-dashboard.git
```

### Large files rejected
Make sure `.gitignore` excludes:
- `node_modules/`
- `.next/`
- `data/`
- Large binaries

### Authentication issues
Consider using GitHub CLI:
```bash
gh auth login
gh repo create openai-dashboard --public --source=. --push
```

## Next Steps

After setup:
1. 🌟 Star your own repository
2. 📢 Share on social media
3. 📝 Write a blog post about your experience
4. 🎥 Create a demo video
5. 🤝 Join discussions and help others

## Questions?

If you have questions about setup:
- Check [GitHub Docs](https://docs.github.com)
- Visit [GitHub Community](https://github.community)
- Open an issue in this repository

---

**Congratulations!** Your OpenAI Dashboard is now publicly available on GitHub.
