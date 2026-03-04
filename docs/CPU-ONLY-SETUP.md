# Running PersonalAI Dashboard Without GPU

## Overview

PersonalAI Dashboard is designed to work **without a GPU**. There are two ways to run AI models without dedicated graphics hardware:

1. **Ollama Cloud API** - Use Ollama's hosted API service (requires API key)
2. **CPU-Only Local Models** - Run small models locally on CPU

Both methods work perfectly fine for most use cases!

---

## Method 1: Ollama Cloud API (Recommended for Non-Technical Users)

### What is Ollama Cloud?

Ollama offers a cloud API service that lets you run models on their servers. Your computer doesn't need a GPU - all the heavy lifting happens in the cloud.

### Setup Steps

1. **Create an Ollama Account**
   - Go to: https://ollama.com
   - Sign up for a free account
   - No credit card required

2. **Get Your API Key**
   - Log in to https://ollama.com
   - Go to Settings → API Keys
   - Click "Create API Key"
   - Copy the key (looks like: `ollama_abc123xyz...`)

3. **Configure PersonalAI Dashboard**
   - Open your `.env.local` file
   - Add your API key:
     ```
     OLLAMA_API_KEY=your-ollama-api-key-here
     ```
   - Save the file

4. **Restart the Server**
   ```bash
   cd C:\ai_dashboard
   npm run dev
   ```

### Costs

- **Free Tier**: Generous free tier available
- **Paid Plans**: Available if you need higher limits
- **Much cheaper** than OpenAI, Anthropic, etc.

### Ollama Cloud Free Tokens

Ollama Cloud provides a **generous free tier** that you can use alongside your local CPU models:

#### **What's Included in Free Tier:**
- ✅ **Free tokens** every month
- ✅ **Access to all models** in Ollama's library
- ✅ **No credit card** required to start
- ✅ **Rate limits** apply (sufficient for personal use)

#### **How Free Tokens Work:**
- You get a monthly allocation of free tokens
- Use them for any model size (2B to 70B+)
- Tokens reset monthly
- No subscription required to use free tier

#### **Best Strategy: Combine Free Cloud + Local CPU**

**For Everyday Tasks:**
- Use local 2B-7B models (unlimited, private)

**For Occasional Heavy Tasks:**
- Use Ollama Cloud free tokens (larger models, better quality)
- Complex document analysis
- Long-form content generation
- When you need GPT-4 level performance

**Example Monthly Usage:**
```
Daily chat → Local qwen3.5:2b (FREE, unlimited)
Weekly reports → Ollama Cloud qwen3.5:32b (FREE tokens)
Coding tasks → Local qwen2.5-coder:7b (FREE, unlimited)
Research → Ollama Cloud llama3.1:70b (FREE tokens)
```

**Total Cost: $0.00** 🎉

### Available Models on Ollama Cloud

Ollama Cloud supports most models in their library, including:
- ✅ **Qwen 3.5 series** (2B, 7B, 14B, 27B, 32B)
- ✅ **Llama 3.2** (1B, 3B)
- ✅ **Llama 3.1** (8B, 70B)
- ✅ **Gemma 2** (2B, 9B, 27B)
- ✅ **Phi-3** (Mini, Small, Medium)
- ✅ **Mistral** (7B)
- ✅ **DeepSeek** (R1)
- ✅ **And more** - Any model Ollama supports

---

## Available Models You Can Download

### Complete Model List for CPU Users

Here are all the models available through Ollama that work well on CPU:

#### **Ultra-Lightweight Models (2B-3B)** ⭐ Best for CPU

| Model | Parameters | Speed | Quality | Best For |
|-------|------------|-------|---------|----------|
| **qwen3.5:2b** | 2B | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | Chat, writing, basic tasks |
| **qwen3.5:3b** | 3B | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | General purpose, better reasoning |
| **llama3.2:3b** | 3B | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | Chat, instructions |
| **llama3.2:1b** | 1B | ⭐⭐⭐⭐⭐ | ⭐⭐ | Ultra-fast, simple tasks |
| **gemma2:2b** | 2B | ⭐⭐⭐⭐ | ⭐⭐⭐ | Google's efficient model |
| **phi3:mini** | 3.8B | ⭐⭐⭐⭐ | ⭐⭐⭐ | Microsoft's model |

**Installation:**
```bash
ollama pull qwen3.5:2b
ollama pull qwen3.5:3b
ollama pull llama3.2:3b
ollama pull gemma2:2b
```

#### **Lightweight Models (7B-9B)** ⚖️ Good Balance

| Model | Parameters | Speed | Quality | Best For |
|-------|------------|-------|---------|----------|
| **qwen2.5:7b** | 7B | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | Coding, analysis, complex tasks |
| **llama3.1:8b** | 8B | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | General purpose, reasoning |
| **gemma2:9b** | 9B | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | High quality, slower |
| **mistral:7b** | 7B | ⭐⭐⭐ | ⭐⭐⭐⭐ | French/English, coding |
| **deepseek-r1:7b** | 7B | ⭐⭐ | ⭐⭐⭐⭐⭐ | Reasoning, math, science |

**Installation:**
```bash
ollama pull qwen2.5:7b
ollama pull llama3.1:8b
ollama pull gemma2:9b
ollama pull mistral:7b
```

#### **Qwen Model Series** 🏆 Recommended for CPU

The **Qwen (Tongyi Qianwen)** series by Alibaba Cloud is excellent for CPU usage:

- **Qwen 2.5 Series:**
  - `qwen2.5:0.5b` - Ultra-tiny (0.5B) - Very fast
  - `qwen2.5:1.5b` - Small (1.5B) - Good for simple tasks
  - `qwen2.5:7b` - Medium (7B) - Best balance for CPU
  - `qwen2.5:14b` - Large (14B) - Slower on CPU
  - `qwen2.5:32b` - Extra large (32B) - Not recommended for CPU

- **Qwen 2.5 Coder Series:**
  - `qwen2.5-coder:1.5b` - Coding-focused, small
  - `qwen2.5-coder:7b` - Coding-focused, best balance
  - `qwen2.5-coder:14b` - Coding-focused, larger

- **Qwen 3.5 Series:**
  - `qwen3.5:2b` - ⭐ **Top recommendation** - Near GPT-4 mini performance
  - `qwen3.5:3b` - Better reasoning
  - `qwen3.5:7b` - More capable, still CPU-friendly

**Download Qwen models:**
```bash
# Recommended for CPU - start with these:
ollama pull qwen3.5:2b          # Best overall for CPU
ollama pull qwen2.5-coder:7b    # Best for coding
ollama pull qwen2.5:7b            # Best for general tasks
```

---

## Recommended Strategy: CPU + Ollama Cloud Hybrid

### The Best Approach for Most Users

**Why not just use Ollama Cloud for everything?**
- ✅ Free tokens available
- ✅ Fast (runs on cloud GPUs)
- ❌ Requires internet
- ❌ Data goes to cloud
- ❌ Rate limits apply

**Why not just use local CPU models?**
- ✅ 100% private
- ✅ Works offline
- ✅ No rate limits
- ❌ Slower than cloud
- ❌ Limited to smaller models

### Hybrid Approach (Recommended) 🎯

**Use BOTH methods together:**

1. **Keep small models locally (2B-7B)** for everyday tasks
   - Fast enough for chat
   - Complete privacy
   - Works offline

2. **Use Ollama Cloud API** for occasional large model tasks
   - When you need better quality
   - Complex reasoning
   - Large document processing

3. **Free Ollama Cloud tokens** supplement local models
   - Use free tier for occasional cloud tasks
   - No subscription required
   - Best of both worlds

### Example Hybrid Setup

**Local Models (Download these):**
```bash
# Essential models for CPU
ollama pull qwen3.5:2b          # Fast chat
ollama pull qwen2.5-coder:7b    # Coding tasks
ollama pull llama3.2:3b          # Backup option
```

**Ollama Cloud (Free tier):**
- Sign up at https://ollama.com
- Add API key to `.env.local`
- Use for: complex analysis, large documents, when you need more power

### Cost Comparison

| Approach | Cost | Speed | Privacy | Quality |
|----------|------|-------|---------|---------|
| CPU-Only (2B-7B) | **FREE** | Moderate | ⭐⭐⭐⭐⭐ | Good |
| Ollama Cloud | **FREE tier** | Fast | ☁️ Cloud | Excellent |
| Hybrid | **FREE** | Variable | Mixed | Excellent |
| OpenAI/Claude | **$20+/month** | Fast | ☁️ Cloud | Excellent |

**Recommendation:** Start with the **Hybrid approach** - it's completely FREE and gives you the best of both worlds!

---

## Method 2: CPU-Only Local Models (For Privacy)

### Can You Run Models on CPU?

**Yes!** Modern AI models are designed to run on both GPU and CPU. While GPU is faster, CPU works fine for:
- Small models (2B-7B parameters)
- Text generation and chat
- Document processing
- Most AI tasks

### What About GGUF Format?

**Yes, Ollama supports GGUF!**

Ollama internally uses the GGUF format (GGML Universal Format). When you run:
```bash
ollama pull qwen3.5:2b
```

Ollama downloads the model in GGUF format. You don't need to do anything special.

### Recommended CPU-Only Models

These models run excellently on CPU without GPU:

#### **Ultra-Lightweight (2B-3B)** - Fastest on CPU
- **`qwen3.5:2b`** - 2B parameters, GPT-4 mini level performance
- **`qwen3.5:3b`** - 3B parameters, slightly more capable
- **`llama3.2:3b`** - Meta's 3B model
- **`llama3.2:1b`** - Ultra-fast 1B model
- **`gemma2:2b`** - Google's 2B model
- **`phi3:mini`** - Microsoft's mini model (3.8B)

#### **Lightweight (7B-9B)** - Good Balance
- **`qwen2.5:7b`** - 7B, excellent balance
- **`llama3.1:8b`** - 8B, great performance
- **`gemma2:9b`** - 9B, very capable
- **`qwen3.5:7b`** - 7B, fast and capable

#### **Skip These (Too Large for CPU)**
- ❌ Models over 14B (too slow on CPU)
- ❌ 70B models (impossible on consumer CPU)

### Performance Expectations on CPU

| Model Size | Speed | Use Case |
|------------|-------|----------|
| 2B | Very Fast (tokens/sec) | Chat, simple tasks |
| 3B | Fast | General purpose |
| 7B | Moderate | Most tasks |
| 9B | Moderate | Better quality |
| 14B+ | Slow | Not recommended for CPU |

### System Requirements for CPU-Only

**Minimum:**
- 4GB RAM
- Modern CPU (Intel i5/i7, AMD Ryzen 5/7, or Apple Silicon)
- Windows 10/11, macOS, or Linux

**Recommended:**
- 8-16GB RAM
- SSD storage
- Multi-core processor

### Setting Up CPU-Only Mode

1. **Install Ollama**
   ```bash
   # Windows (PowerShell as Admin)
   winget install Ollama.Ollama
   
   # macOS
   brew install ollama
   
   # Linux
   curl -fsSL https://ollama.com/install.sh | sh
   ```

2. **Pull a Lightweight Model**
   ```bash
   # Best for CPU - Qwen 3.5 2B
   ollama pull qwen3.5:2b
   
   # Or try these:
   ollama pull llama3.2:3b
   ollama pull gemma2:2b
   ```

3. **Verify It Works**
   ```bash
   ollama run qwen3.5:2b
   ```
   Type a test message, then `/bye` to exit.

4. **Start PersonalAI Dashboard**
   The system will automatically detect and use your local models.

---

## Comparing Ollama Cloud vs Local CPU

| Feature | Ollama Cloud | Local CPU |
|---------|-------------|-------------|
| **Requires GPU** | ❌ No | ❌ No |
| **Internet Required** | ✅ Yes | ❌ No (after setup) |
| **Privacy** | ☁️ Data goes to cloud | 🔒 100% private |
| **Cost** | Free tier available | Completely free |
| **Speed** | Fast (cloud GPUs) | Moderate (CPU) |
| **Setup Complexity** | Easy | Slightly more technical |
| **Works Offline** | ❌ No | ✅ Yes |

---

## Qwen 3.5:2B Specifics

### Does It Work?

**Yes!** Qwen 3.5:2B works perfectly with Ollama:

- **Ollama Cloud**: ✅ Supported via API
- **Local CPU**: ✅ Runs very well
- **GGUF Format**: ✅ Ollama uses GGUF internally

### Performance

- **Speed**: ~20-50 tokens/second on modern CPU
- **Memory**: Uses ~2-3GB RAM
- **Quality**: Surprisingly good for 2B parameters
- **Use Cases**: Chat, writing, analysis, coding assistance

### Installing Qwen 3.5:2B

```bash
# Local installation
ollama pull qwen3.5:2b

# Test it
ollama run qwen3.5:2b
```

---

## Troubleshooting

### Issue: "Model is too large for my system"

**Solution:** Use smaller models (2B-3B)

```bash
# Use these instead of larger models
ollama pull qwen3.5:2b
ollama pull llama3.2:3b
ollama pull gemma2:2b
```

### Issue: "Ollama Cloud API not working"

**Solution:**
1. Check your `.env.local` has the correct key
2. Verify key format: `ollama_xxxxxxxxxxxxxxxx`
3. Restart the server after adding the key
4. Check Ollama account is verified

### Issue: "CPU is too slow"

**Solution:**
1. Use smaller models (2B instead of 7B)
2. Reduce context length
3. Use Ollama Cloud instead

### Issue: "Out of memory"

**Solution:**
1. Close other applications
2. Use smaller models
3. Increase virtual memory (Windows) or swap (Linux)

---

## Recommended Configuration

### For CPU-Only Users (No GPU)

**Option A: Maximum Privacy (Local Only)**
- Install: `ollama pull qwen3.5:2b`
- Default model: `ollama/qwen3.5:2b`
- Backup: `ollama/qwen2.5:7b`

**Option B: Best Performance (Ollama Cloud)**
- Get Ollama API key
- Add to `.env.local`
- Default model: `ollama/qwen3.5:2b` (runs in cloud)
- Can use larger models without local hardware

**Option C: Hybrid (Best of Both)**
- Keep small models locally (2B-3B)
- Use Ollama Cloud for occasional large model tasks
- Set in Settings → API Keys

---

## Summary

**Can I run PersonalAI Dashboard without GPU?**
✅ **YES!** Absolutely.

**Does Ollama support GGUF?**
✅ **YES!** Ollama uses GGUF internally.

**Will Qwen 3.5:2B work?**
✅ **YES!** It runs excellently on CPU.

**What's the best setup?**
- **Privacy-focused**: Local 2B-3B models
- **Performance**: Ollama Cloud API
- **Balanced**: Hybrid approach

---

## Quick Start Guide (No GPU Required)

1. **Install Ollama**: `winget install Ollama.Ollama`
2. **Pull lightweight model**: `ollama pull qwen3.5:2b`
3. **Test**: `ollama run qwen3.5:2b`
4. **Start PersonalAI Dashboard**: `npm run dev`
5. **Done!** The system works without GPU.

---

**Questions?**
- Check Ollama docs: https://ollama.com/docs
- Ollama models: https://ollama.com/library
- GitHub Issues: https://github.com/norhtecmbarnes-dot/PersonalAI-Dashboard/issues

---

**PersonalAI Dashboard: Your AI, Your Way - With or Without GPU!** 🚀
