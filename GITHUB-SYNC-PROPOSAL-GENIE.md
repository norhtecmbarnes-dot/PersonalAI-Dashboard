# GitHub sync guide for Proposal Genie and related projects

This workspace contains separate Git repositories nested under `C:\ai\Proposal Genie`. Do not initialize one combined repository at the workspace root.

## Projects and GitHub repositories

| Local folder | Repository | Notes |
|---|---|---|
| `C:\ai\Proposal Genie\PersonalAI-Dashboard` | `https://github.com/norhtecmbarnes-dot/PersonalAI-Dashboard.git` | Proposal Genie dashboard |
| `C:\ai\Proposal Genie\Director-Dashboard` | `https://github.com/norhtecmbarnes-dot/Director-Dashboard.git` | Separate project |
| `C:\ai\Proposal Genie\You-Are-Using-AI-Wrong` | `https://github.com/norhtecmbarnes-dot/You-Are-Using-AI-Wrong.git` | Your book in progress; intentionally here for now and planned to move out of this workspace when complete |

The book has its own GitHub repository and history. Its current location under this workspace is temporary; moving its local folder later does not require combining histories or changing its remote.

## First-time setup on another computer

Install Git for Windows and sign in using Git Credential Manager. Never place a GitHub token in a remote URL. Clone the repositories you want to work with:

```powershell
New-Item -ItemType Directory -Force 'C:\ai\Proposal Genie' | Out-Null
Set-Location 'C:\ai\Proposal Genie'
git clone https://github.com/norhtecmbarnes-dot/PersonalAI-Dashboard.git
git clone https://github.com/norhtecmbarnes-dot/Director-Dashboard.git
# Optional while the book is being written here:
git clone https://github.com/norhtecmbarnes-dot/You-Are-Using-AI-Wrong.git
```

When the book is complete and moved, clone it into its new location instead. Each clone retains the same GitHub remote. Install each app’s dependencies as described in its README. Recreate machine-specific environment files from sanitized examples; do not copy secrets into GitHub.

## Routine sync (run inside each repository separately)

Before working:

```powershell
Set-Location 'C:\ai\Proposal Genie\PersonalAI-Dashboard' # change to the repo you are syncing
 git status --short --branch
git pull --ff-only
```

After changes:

```powershell
git status --short
git add <specific-files>
git diff --cached
git commit -m "Describe the change"
git push
```

Use specific file paths rather than `git add .` to reduce the chance of staging secrets, databases, or generated files. If Git reports divergence or rejects a push, stop and inspect; do not reset, force-push, or merge blindly.

## Important: Director-Dashboard history divergence

At the time of inspection, `Director-Dashboard` on `master` was **7 local commits ahead and 31 commits behind** `origin/master`. Do not pull, push, reset, or rebase this repository until the local and remote histories and intended changes have been reviewed. Back it up and inspect the commit graph first. This is a snapshot; recheck the status before taking action.

## What GitHub syncs—and does not

GitHub syncs committed source and documentation. It does not sync uncommitted work, ignored files, installed dependencies, local databases, model weights, or environment secrets. Check `.gitignore` and `git status` before every commit. Never commit API keys, passwords, `.env.local`, private user data, or large model weights. Keep `.env.example` sanitized and create private local environment files separately on each computer.

## Local AI/agent setup notes

- You downloaded Docker and tried OpenMuse, but OpenMuse did not recognize that it could use this PC. Installing Docker alone did not make OpenMuse detect the host in your experience. Re-check the local-runtime and Docker integration/configuration when reproducing that setup; this records your experience, not a diagnosis.
- You have also worked with Hermes and had great success. Preserve the working Hermes setup/configuration as a reference when moving agent workflows between computers. Keep machine-specific settings and credentials out of Git.

## Future goal: personal website as an agent front end

You want your personal website to let an agent use tools to create documents, presentations, and videos. A safe architecture is a website UI calling an authenticated backend/agent service; that backend invokes explicitly approved tools and returns generated files for download. Do not expose desktop tools, unrestricted shell access, local filesystem access, or credentials directly to a public website. For long-running or credit-metered generation, provide job status, user confirmation, quotas, and private storage. This is a future integration goal—not implemented by this sync guide.

## New project checklist

1. Initialize Git inside the project only (`git init -b main`) if it is not already a repository.
2. Add `.gitignore` before staging files: exclude environment files (except sanitized `.env.example`), dependencies/build output, local databases and journals, generated output, and model weights.
3. Review `git status --short --ignored` and inspect staged changes with `git diff --cached`.
4. Create a GitHub repository (private by default when source or data are not meant to be public), add its remote, then push the chosen branch. Never force-push as routine synchronization.
