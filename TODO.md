# PersonalAI Dashboard - Development TODO

This document tracks planned features, improvements, and roadmap items for PersonalAI Dashboard.

## 🚀 Current Status: v1.0 - Core Features Complete

**Last Updated:** March 5, 2026  
**Current Version:** 0.1.0

---

## ✅ Completed Features

### Core Functionality
- [x] Chat interface with streaming
- [x] Document management and chat with documents
- [x] Brand Workspace with voice profiles
- [x] Canvas builder for UI generation
- [x] Writing assistant
- [x] Office AI (documents, presentations)
- [x] Database forms
- [x] Task scheduler
- [x] Telegram bot integration
- [x] OCR and image processing
- [x] Security scanning
- [x] Self-reflection system
- [x] Model routing and selection
- [x] Per-service model preferences
- [x] Edge Runtime compatibility

### Infrastructure
- [x] SQLite database with persistence
- [x] TypeScript codebase
- [x] Next.js 16 with App Router
- [x] GitHub repository setup
- [x] MIT License
- [x] Documentation

---

## 📋 Short Term (Next 2-4 Weeks)

### High Priority
- [ ] **Fix Model Selector Persistence** - Ensure model selections persist correctly across restarts
- [ ] **Add phi-4 Support** - Document and support phi-4-reasoning-vision-15B model
- [ ] **Image Upload for Qwen 3.5** - Enable multimodal chat with vision models
- [ ] **Brand Workspace Chat Button** - Fix chat button visibility in brand view
- [ ] **Model Health Indicators** - Show when Ollama is offline or model unavailable

### Medium Priority
- [ ] **Export Chat History** - Allow users to export conversations
- [ ] **Import/Export Brands** - Backup and restore brand configurations
- [ ] **Mobile Responsive** - Improve mobile experience
- [ ] **Keyboard Shortcuts** - Add hotkeys for common actions
- [ ] **Search in Documents** - Better document search functionality

---

## 🎯 Medium Term (1-3 Months)

### Features
- [ ] **Voice Interface** - Speech-to-text and text-to-speech
- [ ] **Plugin System** - Allow third-party extensions
- [ ] **Multi-language Support** - i18n for different languages
- [ ] **Advanced Security** - 2FA, audit logs
- [ ] **Team Collaboration** - Multiple users, permissions
- [ ] **Version Control for Documents** - Track document changes

### Integrations
- [ ] **Slack Integration** - Bot for Slack workspaces
- [ ] **Discord Integration** - Bot for Discord servers
- [ ] **Email Integration** - Read and respond to emails
- [ ] **Calendar Integration** - Google/Outlook calendar sync
- [ ] **Webhook System** - Custom integrations

### Performance
- [ ] **Lazy Loading** - Improve initial page load
- [ ] **Caching Layer** - Redis for better performance
- [ ] **Background Jobs** - Queue system for heavy tasks

---

## 🏢 Enterprise Features (v2.0+)

### Backend Alternatives
- [ ] **vLLM Support** - High-performance inference for enterprise
  - **Priority:** Medium
  - **Effort:** 3-5 hours
  - **Note:** For users needing 100+ concurrent requests
  - **Implementation:** Add vLLM client, settings toggle, auto-detection
  
### Enterprise Management
- [ ] **User Management** - Admin panel, roles, permissions
- [ ] **Organization Support** - Multi-tenant architecture
- [ ] **Audit Logging** - Track all actions
- [ ] **SSO Integration** - SAML, OAuth providers
- [ ] **Compliance** - GDPR, SOC2 features

### Advanced AI
- [ ] **Agent System** - Autonomous task execution
- [ ] **Fine-tuning Interface** - Custom model training
- [ ] **RAG Pipeline** - Advanced retrieval systems
- [ ] **Multi-modal** - Video, audio processing
- [ ] **API Access** - REST API for external apps

---

## 🔬 Experimental / Future Ideas

### Research
- [ ] **Local Training** - Fine-tune models on-device
- [ ] **Federated Learning** - Collaborative model improvement
- [ ] **Privacy-Preserving AI** - Differential privacy features

### Hardware
- [ ] **Apple Silicon Optimization** - Better M1/M2/M3 support
- [ ] **AMD GPU Support** - ROCm integration
- [ ] **Edge Device Support** - Raspberry Pi, etc.

### AI Capabilities
- [ ] **Code Execution** - Run generated code safely
- [ ] **Web Browsing** - Live internet access
- [ ] **Screen Understanding** - Analyze screen captures
- [ ] **Meeting Assistant** - Join calls, take notes

---

## 📝 Contribution Guidelines

### How to Contribute
1. Check this TODO list for items marked `[ ]`
2. Comment on the issue you'd like to work on
3. Fork the repository
4. Create a feature branch
5. Submit a pull request

### Priority Labels
- 🔴 **High** - Critical for v1.0 release
- 🟡 **Medium** - Important for user experience
- 🟢 **Low** - Nice to have, can wait
- 🏢 **Enterprise** - v2.0+ features

---

## 🎓 Learning Resources for Contributors

### Getting Started
- [Next.js Documentation](https://nextjs.org/docs)
- [Ollama API Reference](https://github.com/ollama/ollama/blob/main/docs/api.md)
- [vLLM Documentation](https://docs.vllm.ai/)
- [Tailwind CSS](https://tailwindcss.com/docs)

### Advanced Topics
- [Streaming LLM Responses](https://github.com/vercel/ai)
- [SQLite with Next.js](https://github.com/vercel/next.js/tree/canary/examples/with-sqlite)
- [Edge Runtime](https://nextjs.org/docs/app/building-your-application/rendering/edge-and-nodejs-runtimes)

---

## 🤝 Community

- **GitHub Issues:** [Report bugs or request features](../../issues)
- **Discussions:** [Ask questions](../../discussions)
- **Discord:** Coming soon

---

**Want to help?** Pick any unchecked item and start contributing! 🚀
