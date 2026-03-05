export interface BookChapter {
  id: string;
  number: number;
  title: string;
  content: string;
  status: 'pending' | 'writing' | 'completed' | 'needs_review';
  wordCount: number;
  lastUpdated: number;
}

export interface BookProgress {
  id: string;
  title: string;
  subtitle: string;
  author: string;
  license: string;
  description: string;
  chapters: BookChapter[];
  currentChapter: number;
  startedAt: number;
  lastUpdated: number;
  status: 'planning' | 'writing' | 'completed' | 'paused';
  totalWords: number;
  targetAudience: string;
}

const BOOK_CONFIG = {
  title: 'Building Your Own AI Assistant',
  subtitle: 'A Complete On-Premise AI System',
  author: 'Michael C. Barnes',
  license: 'Creative Commons BY-SA 4.0',
  targetAudience: 'Developers and organizations who need AI that runs entirely on their own infrastructure',
  dedication: 'To everyone who believes AI should be accessible to all, not just tech giants. And to organizations that need AI but cannot send sensitive data to the cloud.',
  tools: {
    llm: 'Ollama with GLM-5 and Qwen 2.5 Coder',
    codeAssistant: 'OpenCode',
    stack: 'Next.js, React, SQLite, TypeScript',
    cost: '$0 - Everything runs locally',
    dataPrivacy: 'Your data never leaves your servers',
  },
};

const CHAPTER_OUTLINE = [
  {
    number: 1,
    title: 'Introduction - Why Build Your Own AI',
    prompt: `Write Chapter 1 of "${BOOK_CONFIG.title}" for ${BOOK_CONFIG.targetAudience}.

This book demonstrates building a complete AI assistant using ONLY free, local tools:
- Ollama with GLM-5 and Qwen 2.5 Coder (no API keys needed)
- OpenCode for code assistance
- SQLite for data storage
- Next.js for the interface

Key points:
- Why you should control your own AI
- Privacy benefits vs using ChatGPT, Claude, etc.
- What "from scratch" really means - not starting from zero, but understanding every layer
- Cost comparison: $0/month vs $20-200/month for cloud AI
- This is a REFERENCE system - a complete working example you can study and modify

Tone: Empowering, practical. Show that anyone can do this.
Length: 1500-2000 words.`,
  },
  {
    number: 2,
    title: 'The Stack That Costs Nothing',
    prompt: `Write Chapter 2 of "${BOOK_CONFIG.title}" for ${BOOK_CONFIG.targetAudience}.

Cover the free tools we use:
- Ollama: What it is, how to install, which models to use
- GLM-5: A powerful open-source model from Zhipu
- Qwen 2.5 Coder: Excellent for code and technical tasks
- OpenCode: Your AI coding companion (built with this very stack)
- SQLite: Why it's perfect for personal AI projects
- Next.js: The framework that makes it all work

Emphasize: NO API KEYS. NO MONTHLY FEES. Everything runs on YOUR hardware.

Include installation commands and verification steps.
Tone: Practical, step-by-step.
Length: 2000-2500 words.`,
  },
  {
    number: 2,
    title: 'Understanding the Architecture',
    prompt: `Write Chapter 2 of "${BOOK_CONFIG.title}" for ${BOOK_CONFIG.targetAudience}.

Explain the high-level architecture using analogies:
- The Brain (LLM) - like having a smart consultant
- The Memory (Vector Store) - like a filing cabinet of knowledge
- The Tools (Functions) - like giving the assistant capabilities
- The Interface (UI) - how you communicate

Include a simple diagram description showing how components connect.
Tone: Conceptual, no code yet, build understanding.
Length: 1500-2000 words.`
  },
  {
    number: 3,
    title: 'Setting Up Your Development Environment',
    prompt: `Write Chapter 3 of "${BOOK_CONFIG.title}" for ${BOOK_CONFIG.targetAudience}.

Cover:
- Installing Node.js and npm
- Choosing a code editor (VS Code recommended)
- Understanding the terminal
- Creating your first project
- Project structure overview

Include step-by-step instructions for Windows and Mac.
Tone: Patient, detailed, assume reader is new to development.
Length: 2000-2500 words.`
  },
  {
    number: 4,
    title: 'Building the Chat Interface',
    prompt: `Write Chapter 4 of "${BOOK_CONFIG.title}" for ${BOOK_CONFIG.targetAudience}.

Cover:
- What is React and why we use it
- Creating a simple chat UI
- Handling user input
- Displaying messages
- Connecting to an AI model

Include simple, well-commented code examples.
Tone: Teaching by doing, explain each piece.
Length: 2000-2500 words with code examples.`
  },
  {
    number: 5,
    title: 'Connecting to AI Models',
    prompt: `Write Chapter 5 of "${BOOK_CONFIG.title}" for ${BOOK_CONFIG.targetAudience}.

Cover:
- What is an API and how it works
- Different AI model options (OpenAI, Ollama, OpenRouter)
- API keys and security
- Making your first AI request
- Handling responses

Include practical code for connecting to multiple providers.
Tone: Demystify APIs, make it feel approachable.
Length: 2000-2500 words with code examples.`
  },
  {
    number: 6,
    title: 'Adding Memory with Vector Storage',
    prompt: `Write Chapter 6 of "${BOOK_CONFIG.title}" for ${BOOK_CONFIG.targetAudience}.

Explain vector storage in simple terms:
- What are embeddings (like fingerprints for text)
- How similarity search works
- Building a simple vector store
- Adding documents to memory
- Searching your knowledge base

Use the library analogy throughout.
Tone: Build intuition before technical details.
Length: 2000-2500 words with code examples.`
  },
  {
    number: 7,
    title: 'The Power of Tools',
    prompt: `Write Chapter 7 of "${BOOK_CONFIG.title}" for ${BOOK_CONFIG.targetAudience}.

Key insight: AI isn't powerful without tools. Neither are humans.
We can't fly, but we build airplanes. We can't breathe underwater, but we build submarines.
The same applies to AI.

Cover:
- Why tools matter more than raw intelligence
- Types of tools: calculators, web search, databases
- How to define a tool for your AI
- Tool efficiency and choosing the right tool
- Real examples from this project

Tone: Philosophical but practical.
Length: 2000-2500 words.`
  },
  {
    number: 8,
    title: 'Working with Documents',
    prompt: `Write Chapter 8 of "${BOOK_CONFIG.title}" for ${BOOK_CONFIG.targetAudience}.

Cover:
- Why documents matter for context
- Processing different file types (PDF, Word, text)
- Chunking strategies
- Building a document management system
- Chat with your documents

Include code for document upload and processing.
Tone: Practical, solve real problems.
Length: 2000-2500 words with code examples.`
  },
  {
    number: 9,
    title: 'Brand Voice - NotebookLM Style',
    prompt: `Write Chapter 9 of "${BOOK_CONFIG.title}" for ${BOOK_CONFIG.targetAudience}.

Cover:
- What is NotebookLM and why it's powerful
- Creating brand/company knowledge bases
- Projects within brands
- Chat that uses your documents as context
- Generating proposals, quotes, reports

This is a key chapter - show how this enables real productivity.
Tone: Show the practical business value.
Length: 2000-2500 words.`
  },
  {
    number: 10,
    title: 'Tool Efficiency - Making AI Work Better',
    prompt: `Write Chapter 10 of "${BOOK_CONFIG.title}" for ${BOOK_CONFIG.targetAudience}.

Cover:
- Why efficiency matters (tokens cost money, time matters)
- Analyzing tool usage patterns
- Identifying redundant calls
- Caching strategies
- Workflow optimization
- Real metrics from this project

Tone: Analytical, show real improvements.
Length: 1500-2000 words with examples.`
  },
  {
    number: 11,
    title: 'Adding External Integrations',
    prompt: `Write Chapter 11 of "${BOOK_CONFIG.title}" for ${BOOK_CONFIG.targetAudience}.

Cover:
- APIs and webhooks
- Example: Government contract integration (SAM.gov)
- Example: Telegram bot
- Handling authentication
- Rate limits and error handling

Tone: Show practical extensions.
Length: 1500-2000 words.`
  },
  {
    number: 12,
    title: 'Storing Data Persistence with SQLite',
    prompt: `Write Chapter 12 of "${BOOK_CONFIG.title}" for ${BOOK_CONFIG.targetAudience}.

Cover:
- Why SQLite is perfect for personal projects
- Basic SQL in simple terms
- Designing your database schema
- CRUD operations
- Moving to PostgreSQL when you grow

Tone: Keep it simple, this is often over-engineered.
Length: 1500-2000 words.`
  },
  {
    number: 13,
    title: 'Deploying Your Assistant',
    prompt: `Write Chapter 13 of "${BOOK_CONFIG.title}" for ${BOOK_CONFIG.targetAudience}.

Cover:
- Deployment options (Vercel, Railway, self-hosted)
- Environment variables and secrets
- Security considerations
- Monitoring and logging
- Cost management

Tone: Practical steps, real options.
Length: 1500-2000 words.`
  },
  {
    number: 14,
    title: 'Extending and Customizing',
    prompt: `Write Chapter 14 of "${BOOK_CONFIG.title}" for ${BOOK_CONFIG.targetAudience}.

Cover:
- The plugin architecture
- Adding your own features
- Contributing back
- Building features for your specific needs
- Personal vs core features

Tone: Empower the reader to make it their own.
Length: 1500-2000 words.`
  },
  {
    number: 15,
    title: 'On-Premise Deployment for Organizations',
    prompt: `Write Chapter 15 of "${BOOK_CONFIG.title}" for ${BOOK_CONFIG.targetAudience}.

This is a KEY chapter for enterprise adoption. Cover:

**Why On-Premise Matters:**
- Data privacy regulations (GDPR, HIPAA, FedRAMP)
- Sensitive data cannot leave organization
- Compliance requirements
- Cost control at scale
- No vendor lock-in — you're not forced into proprietary systems, you default to what works best for you

**Deployment Options:**
- Single server (VPS, bare metal)
- Docker containers
- Kubernetes for scale
- Air-gapped networks

**Security Hardening:**
- Network isolation
- Authentication and authorization
- Audit logging
- Encryption at rest and in transit
- Input validation and sanitization

**Customization for Organizations:**
- Brand-specific integrations
- Custom data sources
- Industry-specific tools
- Integration with existing systems

**Case Studies:**
- Government contractor tracking SAM.gov opportunities
- Healthcare provider with HIPAA requirements
- Financial services with audit requirements

Tone: Professional, addresses IT/security concerns directly.
Length: 2500-3000 words.`,
  },
  {
    number: 16,
    title: 'Troubleshooting Common Issues',
    prompt: `Write Chapter 16 of "${BOOK_CONFIG.title}" for ${BOOK_CONFIG.targetAudience}.

Cover common problems with solutions:
- "My API calls are failing"
- "Vector search returns nothing"
- "The AI doesn't use my tools"
- "Too many tokens / running out of context"
- "Slow response times"

Format: Problem → Diagnosis → Solution.
Length: 1500-2000 words.`
  },
  {
    number: 17,
    title: 'What\'s Next - The Future of AI Assistants',
    prompt: `Write Chapter 17 of "${BOOK_CONFIG.title}" for ${BOOK_CONFIG.targetAudience}.

Cover:
- Emerging trends in AI assistants
- Multi-modal AI (images, audio, video)
- Smaller, more efficient models
- Local AI and privacy
- How to stay current

Tone: Exciting but grounded.
Length: 1000-1500 words.`
  },
  {
    number: 17,
    title: 'Appendix A: OpenCode - Building This Book',
    prompt: `Write Appendix A of "${BOOK_CONFIG.title}".

This book itself was written using the AI assistant being described. Cover:
- How this book was generated using Ollama + Qwen 2.5 Coder
- The iterative process of AI-assisted writing
- How to use your own assistant for documentation
- Transparency about AI-generated content

Tone: Meta, honest, and transparent.
Length: 1000-1500 words.`,
  },
  {
    number: 18,
    title: 'Appendix B: Comparison with OpenClaw',
    prompt: `Write Appendix B of "${BOOK_CONFIG.title}" for ${BOOK_CONFIG.targetAudience}.

Cover:
- What OpenClaw is and why it went viral
- Fundamental difference: messaging platform vs productivity suite
- Feature-by-feature comparison table
- What OpenClaw does better (omnichannel, security, voice)
- What this project does better (business context, tool efficiency, knowledge management)
- Architecture comparison (Gateway vs single app)
- When to use which
- How to combine the best of both

Be honest and fair. This is not about winning, it's about understanding trade-offs.
Tone: Objective, balanced, practical guidance.
Length: 2000-2500 words.`,
  },
  {
    number: 19,
    title: 'Appendix C: Quick Reference',
    prompt: `Write Appendix C of "${BOOK_CONFIG.title}".

Include:
- Command cheat sheet
- API quick reference
- Common code snippets
- Troubleshooting checklist
- Resources for further learning

Format: Easy to scan, practical reference.
Length: 2000-2500 words.`,
  },
];

class BookWriterPlugin {
  private static instance: BookWriterPlugin;
  private progress: BookProgress | null = null;
  private isWriting: boolean = false;

  private constructor() {
    this.loadProgress();
  }

  static getInstance(): BookWriterPlugin {
    if (!BookWriterPlugin.instance) {
      BookWriterPlugin.instance = new BookWriterPlugin();
    }
    return BookWriterPlugin.instance;
  }

  private loadProgress(): void {
    if (typeof window === 'undefined') return;
    try {
      const stored = localStorage.getItem('book_progress');
      if (stored) {
        this.progress = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Error loading book progress:', error);
    }
  }

  private saveProgress(): void {
    if (typeof window === 'undefined') return;
    try {
      if (this.progress) {
        localStorage.setItem('book_progress', JSON.stringify(this.progress));
      }
    } catch (error) {
      console.error('Error saving book progress:', error);
    }
  }

  initializeBook(): BookProgress {
    const chapters: BookChapter[] = CHAPTER_OUTLINE.map(ch => ({
      id: `chapter_${ch.number}`,
      number: ch.number,
      title: ch.title,
      content: '',
      status: 'pending' as const,
      wordCount: 0,
      lastUpdated: 0,
    }));

    this.progress = {
      id: 'book_' + Date.now(),
      title: BOOK_CONFIG.title,
      subtitle: BOOK_CONFIG.subtitle,
      author: BOOK_CONFIG.author,
      license: BOOK_CONFIG.license,
      description: `A comprehensive guide for ${BOOK_CONFIG.targetAudience}. Learn to build your own AI assistant with memory, tools, and document understanding.`,
      chapters,
      currentChapter: 1,
      startedAt: Date.now(),
      lastUpdated: Date.now(),
      status: 'planning',
      totalWords: 0,
      targetAudience: BOOK_CONFIG.targetAudience,
    };

    this.saveProgress();
    return this.progress;
  }

  getProgress(): BookProgress | null {
    return this.progress;
  }

  async writeChapter(chapterNumber: number, model: string = 'ollama/qwen3.5:9b'): Promise<BookChapter | null> {
    if (!this.progress || this.isWriting) return null;
    if (chapterNumber < 1 || chapterNumber > CHAPTER_OUTLINE.length) return null;

    const chapterIndex = chapterNumber - 1;
    const chapterOutline = CHAPTER_OUTLINE[chapterIndex];
    const chapter = this.progress.chapters[chapterIndex];

    if (!chapterOutline || !chapter) return null;

    this.isWriting = true;
    chapter.status = 'writing';
    this.saveProgress();

    try {
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
      const response = await fetch(`${baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          message: chapterOutline.prompt,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const content = data.message?.content || data.message || '';
        
        chapter.content = content;
        chapter.wordCount = content.split(/\s+/).length;
        chapter.status = 'completed';
        chapter.lastUpdated = Date.now();

        this.progress.lastUpdated = Date.now();
        this.progress.totalWords = this.progress.chapters.reduce((sum, ch) => sum + ch.wordCount, 0);

        if (chapterNumber >= this.progress.chapters.length) {
          this.progress.status = 'completed';
        } else {
          this.progress.currentChapter = chapterNumber + 1;
          this.progress.status = 'writing';
        }

        this.saveProgress();
        return chapter;
      }
    } catch (error) {
      console.error('Error writing chapter:', error);
      chapter.status = 'needs_review';
    } finally {
      this.isWriting = false;
    }

    return null;
  }

  async writeNextChapter(model?: string): Promise<BookChapter | null> {
    if (!this.progress) {
      this.initializeBook();
    }
    if (!this.progress) return null;

    const nextChapter = this.progress.currentChapter;
    return this.writeChapter(nextChapter, model);
  }

  async regenerateChapter(chapterNumber: number, model?: string): Promise<BookChapter | null> {
    if (!this.progress) return null;
    const chapter = this.progress.chapters[chapterNumber - 1];
    if (!chapter) return null;

    chapter.status = 'pending';
    chapter.content = '';
    chapter.wordCount = 0;
    this.saveProgress();

    return this.writeChapter(chapterNumber, model);
  }

  getChapterOutline() {
    return CHAPTER_OUTLINE;
  }

  getFullBook(): string {
    if (!this.progress) return '';

    let fullBook = `# ${this.progress.title}\n\n`;
    fullBook += `## ${this.progress.subtitle}\n\n`;
    fullBook += `*By ${this.progress.author}*\n\n`;
    fullBook += `**License:** ${this.progress.license}\n\n`;
    fullBook += `---\n\n`;
    fullBook += `${this.progress.description}\n\n`;
    fullBook += `---\n\n`;

    for (const chapter of this.progress.chapters) {
      if (chapter.content) {
        fullBook += `# Chapter ${chapter.number}: ${chapter.title}\n\n`;
        fullBook += chapter.content + '\n\n';
        fullBook += `---\n\n`;
      }
    }

    return fullBook;
  }

  exportMarkdown(): string {
    return this.getFullBook();
  }

  shouldContinueWriting(): boolean {
    if (!this.progress) return true;
    if (this.progress.status === 'completed') return false;
    if (this.isWriting) return false;
    return true;
  }

  getNextChapterNumber(): number {
    return this.progress?.currentChapter || 1;
  }

  updateChapterContent(chapterNumber: number, content: string): BookChapter | null {
    if (!this.progress) return null;
    const chapter = this.progress.chapters[chapterNumber - 1];
    if (!chapter) return null;

    chapter.content = content;
    chapter.wordCount = content.split(/\s+/).length;
    chapter.lastUpdated = Date.now();
    
    this.progress.totalWords = this.progress.chapters.reduce((sum, ch) => sum + ch.wordCount, 0);
    this.saveProgress();

    return chapter;
  }

  updateChapterStatus(chapterNumber: number, status: BookChapter['status']): BookChapter | null {
    if (!this.progress) return null;
    const chapter = this.progress.chapters[chapterNumber - 1];
    if (!chapter) return null;

    chapter.status = status;
    chapter.lastUpdated = Date.now();
    this.saveProgress();

    return chapter;
  }
}

export const bookWriterPlugin = BookWriterPlugin.getInstance();