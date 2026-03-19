# Chapter 25: Running Without GPU or Internet

Your AI Dashboard can run completely offline on machines without dedicated graphics cards. This chapter covers all the options for CPU-only and offline operation.

## What You'll Learn

• Running AI models on CPU-only machines
• BitNet: 1.58-bit models for efficient CPU inference
• Offline model management
• Performance optimization for low-resource environments

---

## The Challenge

Not every machine has:
• A dedicated GPU (NVIDIA/AMD)
• Constant internet access
• Unlimited RAM

Yet you still want AI capabilities for:
• Development laptops without discrete graphics
• Office workstations with integrated graphics
• Air-gapped secure environments
• Remote locations with unreliable connectivity

---

## Solution 1: BitNet - CPU-Optimized 1.58-bit Models

### What is BitNet?

BitNet is Microsoft's official inference framework for 1-bit LLMs. It uses 1.58-bit quantization (ternary weights: -1, 0, +1) to achieve:

| Metric | Standard FP16 | BitNet 1.58-bit |
|--------|---------------|-----------------|
| Memory | 100% | ~25% |
| Energy | 100% | 18-45% |
| Speed | Baseline | 1.37x-6.17x faster |
| Quality | Baseline | ~95% of original |

### Installation

**Prerequisites:**
• Python 3.9+
• CMake 3.22+
• Clang 18+ (or Visual Studio 2022 on Windows)

**Step 1: Clone BitNet**

```bash
git clone --recursive https://github.com/microsoft/BitNet.git
cd BitNet
```

**Step 2: Install Dependencies**

```bash
# Create conda environment (recommended)
conda create -n bitnet-cpp python=3.9
conda activate bitnet-cpp

# Install requirements
pip install -r requirements.txt
```

**Step 3: Download Model**

```bash
# Download the 2B model (recommended)
huggingface-cli download microsoft/BitNet-b1.58-2B-4T-gguf --local-dir models/BitNet-b1.58-2B-4T

# Setup for inference
python setup_env.py -md models/BitNet-b1.58-2B-4T -q i2_s
```

**Step 4: Configure in AI Dashboard**

1. Go to **Settings** → **Model Settings**
2. Find the **BitNet** section
3. Enter the path to your BitNet installation
4. Click **Check** to verify
5. Select your model (2B recommended)
6. Click **Save Configuration**

### Available Models

| Model | Parameters | RAM Required | Speed | Quality |
|-------|-----------|--------------|------|---------|
| BitNet b1.58 Large | 0.7B | ~2GB | Fastest | Good |
| BitNet b1.58 2B | 2.4B | ~4GB | Fast | Better |
| BitNet b1.58 3B | 3.3B | ~6GB | Moderate | Best |

### When to Use BitNet

✅ **Perfect for:**
• Laptops without discrete GPUs
• Office workstations
• Development machines
• Quick simple tasks
• Backup when GPU unavailable

⚠️ **Not ideal for:**
• Complex code generation
• Large context windows (>4K tokens)
• Tasks requiring nuanced understanding

---

## Solution 2: GGUF Models for Minimal Hardware

GGUF (GGML Universal Format) lets you run large models on small hardware through quantization.

### What is GGUF?

GGUF compresses models to run on modest hardware:

| Quantization | Size | Quality | Speed | Use Case |
|--------------|------|---------|-------|----------|
| Q4_0 | 50% smaller | Acceptable | Fast | Production |
| Q4_K_M | 50% smaller | Good | Fast | Recommended |
| Q5_K_M | 35% smaller | Very Good | Moderate | Quality |
| Q2_K | 75% smaller | Poor | Very Fast | Testing only |

### AngelSlim - Tested Tiny Model

The AngelSlim model runs on minimal hardware:

```bash
# Pull AngelSlim (1.8B parameters, Q4_0)
ollama pull angelslim

# Specs:
# - 1.8 billion parameters
# - ~1.5 GB RAM
# - Runs on any modern CPU
# - Instant response speed
```

**Use AngelSlim for:**
• Heartbeat checks ✓
• Simple classification ✓
• Quick formatting ✓
• Development/testing ✓

**Don't use for:**
• Complex reasoning ✗
• Code generation ✗
• Long context ✗

### Other GGUF Models in Ollama

```bash
# Small models that run on CPU
ollama pull qwen2.5:0.5b    # Fastest
ollama pull qwen2.5:1.5b    # Very fast
ollama pull phi3:mini       # Small but capable
ollama pull gemma2:2b       # Google's small model
```

---

## Solution 3: Ollama CPU-Optimized Models

### Small Models for CPU

Ollama provides several models specifically optimized for CPU inference:

```bash
# Ultra-small (1-2GB RAM)
ollama pull qwen3.5:2b

# Small (4-8GB RAM)
ollama pull gemma3:4b
ollama pull glm-4-flash

# Medium (8-16GB RAM)
ollama pull qwen3.5:9b
```

### Performance Tips

**1. Use Flash Attention**

Ollama automatically uses flash attention when available, reducing memory:

```bash
# Check if flash attention is enabled
ollama show qwen3.5:2b --modelfile | grep flash
```

**2. Reduce Context Size**

For limited RAM, reduce context window:

```bash
# Create a modelfile with smaller context
cat > Modelfile << EOF
FROM qwen3.5:2b
PARAMETER num_ctx 2048
EOF

ollama create qwen-small -f Modelfile
```

**3. Quantized Models**

Use pre-quantized models for lower memory:

```bash
# Q4_K_M quantization (good balance)
ollama pull qwen3.5:2b-q4

# Q2_K quantization (smallest, lower quality)
ollama pull qwen3.5:2b-q2
```

---

## Solution 3: Offline Model Management

### Pre-Download Models

Before going offline, pull all needed models:

```bash
# Essential models
ollama pull qwen3.5:2b      # Quick tasks
ollama pull qwen3.5:9b      # Better quality
ollama pull gemma3:4b       # Alternative

# Vision model for OCR
ollama pull llava

# Optional: Larger models if you have RAM
ollama pull qwen3.5:27b
```

### Export/Import Models

To transfer models between machines:

```bash
# Export a model
ollama save qwen3.5:9b -o qwen-9b.tar

# Transfer to another machine (USB, network)
# Then import:
ollama load qwen-9b.tar
```

---

## Performance Optimization

### RAM Management

| RAM Available | Recommended Setup |
|--------------|-------------------|
| 4GB | BitNet Large + gemma3:4b |
| 8GB | BitNet 2B + qwen3.5:9b |
| 16GB | BitNet 3B + qwen3.5:9b + llava |
| 32GB+ | Multiple large models |

### CPU Optimization

**1. Set Number of Threads**

```bash
# In AI Dashboard .env.local
OLLAMA_NUM_THREADS=4
```

**2. Close Background Apps**

BitNet and CPU-based inference need all available resources.

**3. Use SSD for Model Storage**

Model loading is 2-3x faster from SSD vs HDD.

### Memory-Mapped Models

Ollama and BitNet use memory mapping, meaning models don't need to fully fit in RAM:

```bash
# Check model size
ollama show qwen3.5:2b --modelfile | grep size

# The model is loaded on-demand
# Only active layers are in RAM
```

---

## Running Completely Offline

### For Air-Gapped Environments

**1. Pre-pull Everything**

```bash
# All required models
ollama pull qwen3.5:2b
ollama pull qwen3.5:9b
ollama pull llava
ollama pull gemma3:4b

# Download BitNet models
git clone --recursive https://github.com/microsoft/BitNet.git
cd BitNet
pip install -r requirements.txt
python setup_env.py -md models/BitNet-b1.58-2B-4T -q i2_s
```

**2. Configure AI Dashboard**

Set in `.env.local`:

```
# Disable web features
NO_INTERNET_MODE=true

# Local-only models
PREFER_LOCAL_MODELS=true

# BitNet path
BITNET_PATH=/path/to/BitNet
```

**3. Document Search**

With no internet, document search uses local embedding:

```typescript
// Local embeddings via Ollama
ollama pull nomic-embed-text

// Configure in AI Dashboard
// Settings → Search → Use Local Embeddings
```

### Internet-Optional Features

| Feature | Offline? | Notes |
|---------|----------|-------|
| AI Chat | ✅ | Use local models |
| Document Processing | ✅ | All local |
| Code Generation | ✅ | Use qwen3.5:9b+ |
| Web Search | ❌ | Requires internet |
| OCR | ✅ | Use llava |
| Model Download | ❌ | Pre-download |

---

## Fallback Chain

The AI Dashboard automatically falls back when GPU is unavailable:

```
┌─────────────────────────────────────────┐
│          GPU Available?                  │
└─────────────────┬───────────────────────┘
                  │
        ┌─────────▼─────────┐
        │                   │
       YES                  NO
        │                   │
        ▼                   ▼
┌────────────────┐  ┌────────────────────┐
│ Ollama GPU     │  │ Try BitNet         │
│ Models         │  │ (CPU-optimized)    │
│                │  │                    │
│ qwen3.5:27b    │  │ bitnet-b1.58-2b    │
│ gpt-oss:20b    │  └────────────────────┘
│ glm-5         │           │
└────────────────┘           │
                             ▼
                    ┌────────────────────┐
                    │ BitNet Fallback?    │
                    └─────────┬───────────┘
                              │
                    ┌─────────▼─────────┐
                    │                   │
                   YES                  NO
                    │                   │
                    ▼                   ▼
            ┌────────────────┐  ┌────────────────┐
            │ Use BitNet     │  │ Use Ollama CPU │
            │                │  │ Models         │
            │ bitnet-b1.58   │  │                │
            └────────────────┘  │ qwen3.5:2b    │
                                │ gemma3:4b     │
                                └────────────────┘
```

---

## Model Selection Guide

### For Code Generation

| Available RAM | Recommended Model |
|---------------|------------------|
| 4GB | BitNet 2B + qwen3.5:2b |
| 8GB | qwen3.5:9b |
| 16GB | qwen3.5:27b |
| 32GB+ | qwen3.5:27b or cloud |

### For Chat/Assistance

| Available RAM | Recommended Model |
|---------------|------------------|
| 4GB | gemma3:4b |
| 8GB | qwen3.5:9b |
| 16GB | qwen3.5:27b |

### For Document Analysis

| Available RAM | Recommended Model |
|---------------|------------------|
| 8GB | qwen3.5:9b |
| 16GB | qwen3.5:27b |
| With OCR need | llava (add to any) |

---

## Troubleshooting

### "Out of Memory" Errors

```bash
# Reduce context window
ollama create small-context -f - << EOF
FROM qwen3.5:2b
PARAMETER num_ctx 1024
EOF
```

### Slow Inference

1. Check CPU usage - close other apps
2. Reduce thread count if CPU is maxed
3. Use smaller model or smaller context

### BitNet Won't Start

1. Verify Python 3.9+ is installed
2. Check CMake and Clang versions
3. Re-run `python setup_env.py`

### Model Quality is Poor

1. Try larger model (2B → 3B)
2. Increase context window
3. Use qwen3.5:9b instead of BitNet for complex tasks

---

## PROMPT YOU CAN USE

Generate a system configuration for offline AI:

```
Create a configuration for my AI Dashboard that:

1. Runs on a machine with 8GB RAM and no GPU
2. Must work completely offline
3. Needs to handle:
   - Document analysis
   - Code assistance
   - Simple chat
4. Should be as fast as possible

Include:
• Model recommendations
• Memory settings
• Configuration file contents
```

---

## Key Takeaways

✅ **BitNet** = CPU-optimized models for machines without GPU

✅ **Ollama small models** = Good fallback (2B-4B parameters)

✅ **Pre-download models** = Run offline with no issues

✅ **Reduce context** = Lower memory for limited RAM

✅ **Use fallback chain** = Automatic model selection based on resources

✅ **Test before going offline** = Verify everything works

---

## Quick Reference

### BitNet Commands

```bash
# Clone and setup
git clone --recursive https://github.com/microsoft/BitNet.git
cd BitNet && pip install -r requirements.txt

# Download model
huggingface-cli download microsoft/BitNet-b1.58-2B-4T-gguf --local-dir models/BitNet-b1.58-2B-4T
python setup_env.py -md models/BitNet-b1.58-2B-4T -q i2_s

# Run inference
python run_inference.py -m models/BitNet-b1.58-2B-4T/ggml-model-i2_s.gguf -p "Hello" -cnv
```

### Ollama Commands

```bash
# Pull small models
ollama pull qwen3.5:2b
ollama pull gemma3:4b

# Export for offline transfer
ollama save qwen3.5:2b -o model.tar

# Check memory usage
ollama ps
```

---

**Next: Chapter 26 - Advanced Configuration**