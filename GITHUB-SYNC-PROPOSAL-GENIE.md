# GitHub sync guide for Proposal Genie and related projects

This Windows workspace contains several independent projects. Each project keeps its own Git history and GitHub repository; **do not initialize a Git repository at `C:\ai\Proposal Genie`** or combine these repositories.

## Projects and remotes

| Local folder | GitHub repository |
|---|---|
| `PersonalAI-Dashboard` (Proposal Genie) | `https://github.com/norhtecmbarnes-dot/PersonalAI-Dashboard.git` |
| `Director-Dashboard` | `https://github.com/norhtecmbarnes-dot/Director-Dashboard.git` |
| `You-Are-Using-AI-Wrong` (book project) | `https://github.com/norhtecmbarnes-dot/You-Are-Using-AI-Wrong.git` |

These are the repositories verified for this workspace. Other projects can be synced by adding each as its own Git repository and remote.

## Local AI/agent setup notes

- You downloaded Docker and tried OpenMuse, but OpenMuse did not recognize that it could use this PC. Re-check the local-runtime and Docker integration/configuration when reproducing that setup on another machine; installing Docker alone did not make OpenMuse detect the host machine in your experience.
- You have also worked with Hermes and had great success. Preserve the working Hermes setup/configuration as a reference when moving agent workflows between computers. Keep machine-specific settings and credentials out of the repositories.
- These notes record your reported experience, not a diagnosis of the OpenMuse issue.

## First-time setup on another computer

1. Install Git for Windows and sign in to GitHub (Git Credential Manager is recommended; never put a token in a remote URL).
2. Clone each repository into a workspace folder:

   ```powershell
   New-Item -ItemType Directory -Force 'C:\ai\Proposal Genie' | Out-Null
   Set-Location 'C:\ai\Proposal Genie'
   git clone https://github.com/norhtecmbarnes-dot/PersonalAI-Dashboard.git
   git clone https://github.com/norhtecmbarnes-dot/Director-Dashboard.git
   git clone https://github.com/norhtecmbarnes-dot/You-Are-Using-AI-Wrong.git
   ```

3. For each app, install the required Node version/dependencies according to its README. Local environment files such as `.env.local`, local databases, model weights, and generated output are machine-specific; recreate them from documented examples rather than copying secrets into GitHub.

## Normal sync routine (run separately inside each project)

Before starting work:

```powershell
Set-Location 'C:\ai\Proposal Genie\PersonalAI-Dashboard' # choose one repo
git status --short --branch
git pull --ff-only
```

After working:

```powershell
git status --short
git add <specific-files>
git commit -m "Describe the change"
git push
```

Repeat in each repository that changed. Prefer `git add <specific-files>` over `git add .` so local databases, credentials, and generated files are not accidentally staged. If `git status` says a branch has diverged or a push is rejected, stop and inspect before rebasing, resetting, force-pushing, or merging.

## Important: current Director divergence

On this computer, `Director-Dashboard` was observed on `master` with **7 local commits ahead and 31 commits behind** `origin/master`. Do not run `git pull`, `git push`, `git reset`, or a rebase there until the two histories and intended changes have been reviewed. Use a backup and inspect the commit graph first; avoid force-pushing because that can discard remote work.

## What GitHub syncs—and what it does not

GitHub syncs committed source and documentation. It does not automatically sync uncommitted work, ignored files, installed dependencies, local databases, model files, or environment secrets. Check each project's `.gitignore` and `git status` before committing. Do not commit API keys, passwords, `.env.local`, personal/private data, or large model weights. For machine-specific configuration, keep `.env.example` sanitized and create a private `.env.local` separately on each machine.

## New project checklist

1. Create/open the project folder and initialize Git **inside that project only** (`git init -b main`) if it is not already a repository.
2. Add a `.gitignore` before staging files. Exclude at minimum `.env*` except sanitized `.env.example`, dependency/build directories, local databases and their journals, generated output, and model weights.
3. Review `git status --short --ignored`; inspect staged files with `git diff --cached`.
4. Create a GitHub repository (private by default when source/data are not intended to be public), add its remote, then push the chosen branch. Never force-push as a routine sync step.
