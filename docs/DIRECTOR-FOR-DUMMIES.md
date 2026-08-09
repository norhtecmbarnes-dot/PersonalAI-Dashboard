# MiniMax H3 Director Dashboard For Dummies

**A friendly, step-by-step guide to directing AI-generated video with your dashboard.**

*Part of the "Building Your AI Dashboard" book series by Michael C. Barnes*

---

## Table of Contents

1. [What Is the Director Dashboard?](#1-what-is-the-director-dashboard)
2. [What You Need Before You Start](#2-what-you-need-before-you-start)
3. [One-Click Startup](#3-one-click-startup)
4. [Your First Video: A 5-Minute Walkthrough](#4-your-first-video-a-5-minute-walkthrough)
5. [Talking to the Auteur](#5-talking-to-the-auteur)
6. [Prototype vs. Final Mode](#6-prototype-vs-final-mode)
7. [Making Long-Form Videos (Shot Chaining)](#7-making-long-form-videos-shot-chaining)
8. [Avatar Studio: Talking Heads and UGC](#8-avatar-studio-talking-heads-and-ugc)
9. [The Shot Config Drawer](#9-the-shot-config-drawer)
10. [Troubleshooting](#10-troubleshooting)
11. [Glossary](#11-glossary)

---

## 1. What Is the Director Dashboard?

Imagine you're a film director. You sit in a chair, describe what you want to see,
and a crew makes it happen. The Director Dashboard is your crew.

Instead of cameras, lights, and actors, you have:

- **MiniMax H3** — an AI video model that generates video *with sound* from a text description
- **The Auteur** — an AI director persona that writes scripts and designs shots for you
- **ComfyUI** — the engine that renders your video (it runs in the background)
- **Ollama** — the local AI that powers the Auteur's brain

You type what you want in plain English. The Auteur writes the script, designs the
visual prompt, and sends it to ComfyUI to render. When it's done, you watch the video
right in the dashboard.

> **💡 Tip: You don't need to know anything about ComfyUI, nodes, or workflows.**
> The dashboard handles all of that. You just talk to the Auteur like a producer
> talking to a director.

---

## 2. What You Need Before You Start

### Hardware

| Requirement | Minimum | Recommended |
|---|---|---|
| **GPU** | 8GB VRAM (RTX 3060) | 12GB+ VRAM (RTX 4070 or better) |
| **RAM** | 16 GB | 32 GB+ |
| **Storage** | 20 GB free (for models) | 50 GB+ |

### Software

| Software | What It Does | Where to Get It |
|---|---|---|
| **ComfyUI** | Renders the video | [github.com/comfyanonymous/ComfyUI](https://github.com/comfyanonymous/ComfyUI) |
| **Ollama** | Runs the local AI for the Auteur | [ollama.com](https://ollama.com) |
| **Node.js 18+** | Runs the dashboard | [nodejs.org](https://nodejs.org) |
| **MiniMax H3 models** | The video model files | See "Model Files" below |

### Model Files

You need these in your ComfyUI `models/` folders:

```
ComfyUI/
└── models/
    ├── diffusion_models/
    │   └── minimax_h3_v1.safetensors          ← the video model
    ├── text_encoders/
    │   └── minimax_h3_text_encoder.safetensors  ← the text encoder
    ├── vae/
    │   ├── minimax_h3_vae.safetensors          ← video VAE
    │   └── minimax_h3_audio_vae.safetensors     ← audio VAE
    └── loras/
        └── minimax_h3_fl2v_lightx2v_turbo_4step_v0.1_comfy.safetensors  ← 4-step turbo (optional but recommended)
```

> **💡 Tip: Don't have these files?** Download them from
> [huggingface.co/Comfy-Org/MiniMax-H3](https://huggingface.co/Comfy-Org/MiniMax-H3).
> The turbo LoRA is from
> [huggingface.co/Kijai/MiniMax-H3_comfy](https://huggingface.co/Kijai/MiniMax-H3_comfy).

> **⚠️ Warning: Filenames must match exactly.** If your file is named
> `minimax_h3_fl2va_pruned_int8_convrot.safetensors`, update the filename in the
> Shot Config drawer (see Chapter 9).

### Optional: VocalLab (for avatar voice)

If you want to use the Avatar Studio, you need a VocalLab API key:

1. Sign up at [vocallab.ai](https://vocallab.ai)
2. Create an API key (starts with `vl_live_`)
3. Put it in `.env.local`:
   ```
   VOCALLAB_API_KEY=vl_live_your_key_here
   ```

> **💡 Tip: The API key stays on your computer.** It's in `.env.local`, which is
> gitignored — it never gets uploaded to GitHub.

---

## 3. One-Click Startup

### The Easy Way (recommended)

Double-click **`start-director.bat`** in the PersonalAI-Dashboard folder.

That's it. The script will:

1. Start **Ollama** (your local AI)
2. Start **ComfyUI** (your video renderer)
3. Start **the dashboard** (your control panel)
4. Open your browser to `http://localhost:3000/minimax-h3`

> **💡 Tip: Already have Ollama or ComfyUI running?** The script detects them
> and skips starting a second copy. You can run it any time.

### The Manual Way

If you prefer to start things yourself:

```bash
# Terminal 1: Start Ollama
ollama serve

# Terminal 2: Start ComfyUI
cd C:\ComfyUI\ComfyUI
.\venv\Scripts\python.exe main.py --listen 0.0.0.0 --port 8188

# Terminal 3: Start the dashboard
cd C:\PersonalAI-Dashboard
npm run dev
```

Then open `http://localhost:3000/minimax-h3` in your browser.

> **⚠️ Warning: ComfyUI takes 30-90 seconds to load.** It has to load the model
> into your GPU memory. Wait for the status indicator to turn green ("ComfyUI Online")
> before trying to render.

---

## 4. Your First Video: A 5-Minute Walkthrough

Ready to make your first video? Here's the quick version:

### Step 1: Check the status bar

Look at the top of the page. You should see:

- **● ComfyUI Online** (green) — ComfyUI is ready
- **⚡ Prototype** (orange) — fast 4-step mode is on (good for your first try)

If ComfyUI shows "Offline", start it first (see Chapter 3).

### Step 2: Type a prompt

In the chat box at the bottom, type something like:

> Write me a 5-second shot of a lone astronaut standing on a red planet at dusk, wind blowing dust across the landscape.

Press **Enter** (or click the send button).

### Step 3: Watch the Auteur work

The Auteur (your AI director) will:

1. Write a **scene context** (the emotional goal)
2. Design a **MiniMax H3 prompt** (dense, optimized for the video model)
3. Write **script & dialogue** (in screenplay format)

The prompt automatically loads into your shot config.

### Step 4: Render

Click **🎬 Render shot** in the sidebar (or say "render it" to the Auteur).

The render appears in the **Render Queue** with a pulsing yellow dot. When it's done,
it moves to **Rushes** at the bottom of the screen with a video player.

> **💡 Tip: In Prototype mode, a 5-second video takes about 1-2 minutes.**
> In Final mode, the same video takes 7-10 minutes. Always prototype first!

> **⏱️ Remember: The first render is slower** because ComfyUI has to load the model
> into GPU memory. Subsequent renders are faster.

---

## 5. Talking to the Auteur

The Auteur understands plain English. Here are some things you can say:

### Writing scripts

| You say... | The Auteur does... |
|---|---|
| "Write a script for a car chase scene" | Breaks it into shots with visual prompts and dialogue |
| "Write a 3-scene short film about a robot learning to paint" | Three shots, each with its own MiniMax H3 prompt |
| "Give me a moody noir scene in a diner" | One shot with chiaroscuro lighting and a screenplay excerpt |

### Designing shots

| You say... | The Auteur does... |
|---|---|
| "Design a shot of a cyberpunk city at night" | Returns one optimized MiniMax H3 prompt |
| "Make it more cinematic, add anamorphic lens flare" | Rewrites the prompt with the new look |
| "Add a low-angle tracking shot through the crowd" | Updates the camera direction in the prompt |

### Rendering

| You say... | The Auteur does... |
|---|---|
| "Render it" or "prototype it" | Queues the shot in 4-step Prototype mode |
| "Render the final cut" | Queues in full 30-step Final mode |
| "Make an avatar video" | Switches to the Avatar Studio tab |

> **💡 Tip: The Auteur follows the "Minimax Generation Mode" format.** Every
> creative response has:
> - **SCENE HEADING** (location and time of day)
> - **NARRATIVE CONTEXT** (the emotional beat)
> - **SHOT 1, SHOT 2, ...** — each shot has a visual prompt, sound design, and dialogue

> **⚠️ Remember: The Auteur's quality depends on your Ollama model.**
> A bigger model (like llama4:maverick) writes better scripts. A smaller model
> (gemma3:4b) is faster but less creative. Pick the tradeoff that works for you.

---

## 6. Prototype vs. Final Mode

This is the most important concept in the dashboard. Learn it and you'll save hours.

### What's the difference?

| | ⚡ Prototype | 🎬 Final |
|---|---|---|
| **Steps** | 4 | 30 |
| **Speed** | ~1-2 min per 5s clip | ~7-10 min per 5s clip |
| **Quality** | Good enough to review | Production-ready |
| **Uses LoRA?** | Yes (LightX2V 4-step turbo) | No |
| **Best for** | Iterating, reviewing the cut | The finished render |

### How to switch

Click the **⚡ Prototype** or **🎬 Final** button in the header bar.

> **💡 Tip: The dashboard starts in Prototype mode by default.** This is on purpose —
> you should always prototype first, review, adjust, then render the final.

### The workflow

```
1. Describe your shot to the Auteur
2. Prototype it (⚡) — see if the composition and motion look right
3. Adjust the prompt, seed, or settings
4. Prototype again until you're happy
5. Switch to Final (🎬) and render the real thing
```

> **⏱️ Remember: Prototype is ~7x faster.** If you render a 6-shot script in
> Prototype mode first, you'll see the whole film in ~10 minutes. Then render
> Final only on the shots that worked.

---

## 7. Making Long-Form Videos (Shot Chaining)

### What is shot chaining?

When the Auteur writes a multi-shot script, each shot generates a separate 5-15
second clip. But how do you make them flow together as one seamless video?

**Shot chaining** takes the last frame of Shot 1 and uses it as the first frame
of Shot 2. The result is a continuous, flowing video.

### How to do it

1. Ask the Auteur for a multi-shot script: *"Write a 3-scene short film about a
   detective discovering a clue"*
2. The Auteur returns Shot 1, Shot 2, Shot 3 — each with its own prompt
3. Above the shot list, you'll see two buttons:
   - **⚡ Prototype all (3 shots, chained)** — fast preview of the whole chain
   - **🎬 Final all (3 shots, chained)** — the full-quality cut
4. Click one. The dashboard renders each shot in sequence, automatically
   feeding the last frame into the next shot.

> **💡 Tip: Prototype all first.** See if the story flows. If a shot doesn't
> work, ask the Auteur to rewrite that shot, then re-chain.

> **⚠️ Warning: Chaining renders one shot at a time.** A 5-shot chain takes
> 5x as long as a single shot. In Prototype mode, a 5-shot chain takes about
> 10 minutes. In Final mode, it can take an hour.

### What you'll see in the queue

Each chained shot shows:
- **🔗 Chain 2/5** — which shot in the chain is currently rendering
- **📎 from prev last frame** — this shot's first frame came from the previous shot's last frame

---

## 8. Avatar Studio: Talking Heads and UGC

The Avatar Studio creates talking-head videos — a face that lip-syncs to speech.

### Two modes

| | 🏠 Local Avatar | ☁️ HeyGen Avatar |
|---|---|---|
| **Runs on** | Your GPU (free) | HeyGen cloud (paid) |
| **Face** | Qwen-Image generates from text, or upload a photo | Upload a photo |
| **Voice** | VocalLab TTS | VocalLab TTS or HeyGen's built-in voices |
| **Lip-sync** | Wan InfiniteTalk (open source) | HeyGen Avatar IV (cloud) |
| **Quality** | Good, improving | Excellent |
| **Speed** | Slow (minutes) | Fast (seconds) |
| **Cost** | Free | Uses Comfy credits |

### Local Avatar: step by step

1. Click the **🧑‍💼 Avatar Studio** tab at the top
2. Click **🏠 Local Avatar** (it's the default)
3. **Face source**: either type a description ("A professional headshot of a
   30-year-old woman with short dark hair") or click **Upload photo** to use a
   real photo
4. **Script**: type what you want the avatar to say
5. **Voice**: pick a VocalLab voice (Ashley, Jessica, Eric, etc.)
6. Click **🎙️ Generate voice** — VocalLab creates the audio and uploads it to ComfyUI
7. Click **🎬 Generate avatar video** — ComfyUI runs the full pipeline:
   - Qwen-Image generates the face (if you didn't upload one)
   - Wan InfiniteTalk animates the face, lip-synced to the audio
   - The result video appears in the "Avatar Videos" panel

> **⚠️ Warning: Local avatar needs extra model files.** The Local Avatar pipeline
> requires Wan InfiniteTalk model, model patch, and audio encoder files in ComfyUI.
> See the "Model filenames" section in the avatar panel for the exact filenames needed.

> **💡 Tip: You can also use the Auteur to write avatar scripts.** In the main
> Director chat, say "make an avatar video" and the Auteur will switch you to the
> Avatar Studio tab and suggest a script.

---

## 9. The Shot Config Drawer

Click the **⚙ Shot config** button in the top-right corner to open the config drawer.

### What's in there

| Field | What it does | Default |
|---|---|---|
| **Prompt** | The MiniMax H3 visual prompt | (from the Auteur or your own text) |
| **Negative prompt** | What to avoid | "blurry, low quality, distorted, watermark, text" |
| **Resolution** | Video size | 1344×768 (landscape) |
| **Duration** | Length in frames (24fps) | 124 frames (~5 seconds) |
| **Steps** | Sampling steps (4=prototype, 30=final) | 4 (prototype) or 30 (final) |
| **CFG** | How closely to follow the prompt | 1.0 (prototype) or 7.0 (final) |
| **Sampler** | The denoising algorithm | euler |
| **Scheduler** | Noise schedule | normal |
| **Video/Audio shift** | Flow shift parameters | 3.0/1.5 (prototype) or 12.0/3.0 (final) |
| **Model filenames** | Must match your ComfyUI models/ folder | (see Chapter 2) |
| **LoRA** | 4-step turbo LoRA filename + strength | (set by Prototype mode) |

> **⏱️ Remember: Most settings are auto-configured by Prototype/Final mode.**
> You only need to touch these if you're fine-tuning or your model files have
> different names.

### Changing model filenames

If your ComfyUI model files have different names than the defaults:

1. Open the Shot Config drawer (⚙ button)
2. Expand **Model filenames**
3. Type the exact filenames from your `ComfyUI/models/` folders
4. Expand **LoRA (4-step turbo)** to set the turbo LoRA filename

> **⚠️ Warning: A wrong filename = a failed render.** ComfyUI will return an
> error like "File not found." Double-check spelling and extensions.

---

## 10. Troubleshooting

### "ComfyUI Offline" in the header

**ComfyUI is not running or not reachable.**

1. Check ComfyUI is running: open `http://127.0.0.1:8188` in your browser
2. If it's not running, start it:
   ```bash
   cd C:\ComfyUI\ComfyUI
   .\venv\Scripts\python.exe main.py --listen 0.0.0.0 --port 8188
   ```
3. Wait 30-90 seconds for it to load
4. If the dashboard still shows offline, check `COMFYUI_URL` in `.env.local`

### "Ollama is offline"

**The Auteur can't respond.**

1. Check Ollama is running: open `http://localhost:11434/api/tags` in your browser
2. If it's not running, start it: `ollama serve`
3. Make sure you have a model loaded: `ollama pull gemma3:4b` (or your preferred model)
4. Select a model in the top-right model selector in the dashboard

### Render fails immediately

**The most common cause is a wrong model filename.**

1. Open Shot Config (⚙)
2. Expand "Model filenames"
3. Compare each filename with what's actually in your ComfyUI `models/` folders
4. Fix any mismatches
5. Try again

### Render is very slow

**You're probably in Final mode.**

1. Check the header — does it say **🎬 Final** (purple)?
2. Switch to **⚡ Prototype** (orange) for 7x faster renders
3. Prototype first, then Final only on the shots you want to keep

### The Auteur gives bad prompts

**Your Ollama model might be too small.**

The Auteur needs a model that understands creative writing and cinematography.
Try a bigger model:

```bash
ollama pull llama4:maverick    # better quality, needs more RAM
# or
ollama pull gemma3:12b         # good balance
```

### Avatar video has no lip movement

**The audio encoder model might be missing.**

1. In the Avatar Studio, expand "Model filenames"
2. Check the "Audio encoder" field
3. Make sure that file exists in `ComfyUI/models/audio_encoders/`
4. If not, download the audio encoder model for Wan InfiniteTalk

### VocalLab shows "offline"

**Your API key isn't set or is invalid.**

1. Open `.env.local` in the PersonalAI-Dashboard folder
2. Check that `VOCALLAB_API_KEY=vl_live_...` is present
3. Restart the dashboard (`npm run dev`)
4. If the key is invalid, create a new one at [vocallab.ai](https://vocallab.ai)

### The dashboard page is blank

**The dev server might not be running.**

1. Open a terminal in `C:\PersonalAI-Dashboard`
2. Run `npm run dev`
3. Wait for "Ready" to appear
4. Open `http://localhost:3000/minimax-h3`

---

## 11. Glossary

| Term | What it means |
|---|---|
| **Auteur** | The AI director persona that writes scripts and designs shots. Read its "soul" in `soul.md`. |
| **ComfyUI** | The open-source video/image generation engine that renders your shots. |
| **MiniMax H3** | A video generation model that produces video with synchronized audio. |
| **Ollama** | A local AI runtime — lets you run LLMs on your own computer. |
| **Prototype mode** | 4-step fast rendering using the LightX2V turbo LoRA. For iteration. |
| **Final mode** | Full 30-step rendering. For the finished product. |
| **LoRA** | A small model patch that modifies a bigger model. The 4-step turbo LoRA makes MiniMax H3 7x faster. |
| **Shot chaining** | Feeding each shot's last frame into the next shot's first frame for seamless long-form video. |
| **VocalLab** | A text-to-speech API used for avatar voices. |
| **Wan InfiniteTalk** | An open-source lip-sync model that animates a face to match audio. |
| **Qwen-Image** | An open-source image model used to generate avatar faces from text. |
| **HeyGen** | A cloud avatar service (paid) that does high-quality lip-sync. |
| **Seed** | A number that controls randomness. Same seed + same prompt = same video. Click 🎲 to reroll. |
| **CFG** | "Classifier-free guidance" — how strictly the model follows your prompt. High = more literal. |
| **Sigma shift** | Controls the noise schedule for video vs. audio streams. Auto-set by Prototype/Final mode. |

---

## Quick Reference Card

```
┌─────────────────────────────────────────────────────┐
│           MiniMax H3 Director — Quick Card          │
├─────────────────────────────────────────────────────┤
│                                                     │
│  START:    Double-click start-director.bat           │
│  OPEN:     http://localhost:3000/minimax-h3          │
│                                                     │
│  TALK:     Type in the chat box, press Enter         │
│  RENDER:   Click 🎬 Render shot (sidebar)            │
│  MODE:     ⚡ Prototype (fast) / 🎬 Final (quality)  │
│  CONFIG:   Click ⚙ Shot config (top right)          │
│  AVATAR:   Click 🧑‍💼 Avatar Studio tab              │
│                                                     │
│  PROTOTYPE FIRST → REVIEW → FINAL ONLY GOOD SHOTS   │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

*This guide is part of the "Building Your AI Dashboard" series by Michael C. Barnes,
author of 5 books on Generative AI. The full 384-page book is included free in the
[PersonalAI-Dashboard repository](https://github.com/norhtecmbarnes-dot/PersonalAI-Dashboard).*

*For technical details on the ComfyUI API integration, see the source code in
`src/lib/comfyui/` and `src/lib/director/`.*