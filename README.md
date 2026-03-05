# PersonalAI Dashboard

> A comprehensive, privacy-first AI assistant that runs entirely on your local machine.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![License: CC BY-SA 4.0](https://img.shields.io/badge/License-CC%20BY--SA%204.0-lightgrey.svg)](https://creativecommons.org/licenses/by-sa/4.0/)
[![Next.js](https://img.shields.io/badge/Next.js-16+-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue)](https://www.typescriptlang.org/)

## Overview

PersonalAI Dashboard is a self-hosted AI assistant that gives you complete control over your AI interactions. Unlike cloud-based solutions, your data never leaves your computer, making it ideal for sensitive workflows, research, and enterprise applications.

**Why PersonalAI Dashboard?**
- 🔒 **100% Private** - All data stays on your machine
- 💰 **Zero Subscription Fees** - Free to run forever
- 🌐 **Works Offline** - No internet required after setup
- 🎨 **Fully Customizable** - Modify every aspect
- 📚 **Open Source** - Free to use, modify, and share

## Features

### Core Capabilities

- **💬 Intelligent Chat** - Conversational AI with streaming responses
- **📄 Document Management** - Upload and chat with PDFs, Word docs, and text files
- **🎨 Canvas Builder** - Generate UI components with natural language
- **📝 Writing Assistant** - Expand, outline, rewrite, and enhance text
- **🔍 OCR & Image Recognition** - Extract text from images and documents
- **📊 Presentation Generator** - Create PowerPoint presentations with AI
- **📅 Task Scheduler** - Automated recurring tasks
- **🤖 Self-Reflection** - AI analyzes its own performance
- **🔐 Security Scanning** - Automatic vulnerability detection
- **📚 Memory & Notes** - Integrated knowledge management

### Model Support

- **Local Models** (via Ollama): Qwen, Llama, Mistral, and more
- **Cloud Models**: OpenAI GPT, Anthropic Claude
- **Smart Routing**: Automatically selects the best model for each task

## Quick Start

### Prerequisites

- Node.js 18+ and npm
- Git
- Ollama (for local AI models)

### Installation

```bash
# Clone the repository
git clone https://github.com/norhtecmbarnes-dot/PersonalAI-Dashboard.git
cd PersonalAI-Dashboard

# Install dependencies
npm install

# Configure environment
cp .env.example .env.local
# Edit .env.local with your API keys (optional)

# Initialize database
npm run db:init

# Start development server
npm run dev
```

Visit `http://localhost:3000` to access your dashboard.

## Documentation

- 📖 [System Guide](SYSTEM_GUIDE.md) - Complete feature documentation
- 🚀 [Quick Start](docs/QUICK-START.md) - Get up and running fast
- 🔧 [API Reference](docs/API-REFERENCE.md) - API endpoints and usage
- 🎨 [Customization](docs/CUSTOMIZATION.md) - Make it yours

## Architecture

```
┌─────────────────────────────────────────────┐
│         PersonalAI Dashboard                 │
│  ┌───────────────────────────────────────┐  │
│  │  Next.js + TypeScript Frontend        │  │
│  │  • React Components                   │  │
│  │  • Tailwind CSS Styling               │  │
│  │  • Real-time Streaming                │  │
│  └───────────────────────────────────────┘  │
│                    ↕                         │
│  ┌───────────────────────────────────────┐  │
│  │  API Routes (Edge + Node.js Runtime)  │  │
│  │  • Chat Processing                    │  │
│  │  • Document Generation                │  │
│  │  • Security Scanning                  │  │
│  └───────────────────────────────────────┘  │
│                    ↕                         │
│  ┌───────────────────────────────────────┐  │
│  │  Services Layer                        │  │
│  │  • Model Router (3-tier system)       │  │
│  │  • SQLite Database                    │  │
│  │  • Task Scheduler                     │  │
│  └───────────────────────────────────────┘  │
│                    ↕                         │
│  ┌───────────────────────────────────────┐  │
│  │  AI Models                             │  │
│  │  • Local (Ollama)                     │  │
│  │  • Cloud APIs                         │  │
│  └───────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
```

## Project Structure

```
personala-dashboard/
├── src/
│   ├── app/                 # Next.js App Router
│   │   ├── api/            # API routes
│   │   └── [...]/          # Page routes
│   ├── components/          # React components
│   ├── lib/                # Core libraries
│   │   ├── agent/          # AI agents
│   │   ├── database/       # SQLite wrapper
│   │   ├── models/         # Model management
│   │   └── services/       # Business logic
│   └── hooks/              # React hooks
├── book/                   # Documentation book
├── docs/                   # Additional documentation
├── scripts/                # Build scripts
└── public/                 # Static assets
```

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Setup

```bash
# Fork and clone
git clone https://github.com/norhtecmbarnes-dot/PersonalAI-Dashboard.git
cd PersonalAI-Dashboard

# Install dependencies
npm install

# Create branch
git checkout -b feature/your-feature

# Make changes and commit
git commit -m "Add: your feature description"

# Push and create PR
git push origin feature/your-feature
```

## Roadmap

- [x] Core chat interface
- [x] Document management
- [x] Canvas builder
- [x] Writing assistant
- [x] Model routing system
- [x] Security scanning
- [ ] Voice interface
- [ ] Plugin system
- [ ] Mobile app
- [ ] Multi-language support

## Book

This project includes a complete book that teaches you how to build AI applications:

📚 **[OpenAI Dashboard: The Complete Guide](book/)**

Available formats:
- Markdown (source)
- Word (.docx) - generate with `npm run book:generate`

## License

**Code**: [MIT License](LICENSE)

**Documentation**: [CC BY-SA 4.0](LICENSE-CONTENT)

This means:
- ✅ You can use this commercially
- ✅ You can modify and distribute
- ✅ You must give attribution
- ✅ ShareAlike (if you modify, use same license)

## Acknowledgments

This project incorporates insights from enterprise AI architecture patterns and builds upon the excellent work of the open source community.

Special thanks to:
- Next.js team for the framework
- Ollama team for local AI
- All contributors and users

## Support

- 🐛 [Report Issues](../../issues)
- 💡 [Request Features](../../discussions)
- 📧 [Discussions](../../discussions)

## Citation

If you use this project in your work, please cite:

```bibtex
@software{personala_dashboard_2026,
  title = {PersonalAI Dashboard: Privacy-First AI Assistant},
  author = {PersonalAI Dashboard Contributors},
  year = {2026},
  url = {https://github.com/norhtecmbarnes/personala-dashboard}
}
```

---

<p align="center">
  Made with ❤️ by the community
</p>

<p align="center">
  <a href="https://github.com/yourusername/openai-dashboard/stargazers">
    ⭐ Star us on GitHub!
  </a>
</p>
