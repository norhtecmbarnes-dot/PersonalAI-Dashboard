/**
 * Book Writer Service - Safe version for all runtimes
 * Uses SQLite instead of file system
 * No top-level Node.js imports
 */

import { sqlDatabase } from '@/lib/database/sqlite';
import { deaiify, analyzeText, DeAiMode } from '@/lib/writing/de-ai-ify';
import { chatCompletion } from '@/lib/models/sdk.server';

export interface BookChapter {
  id: string;
  number: number;
  title: string;
  content: string;
  status: 'pending' | 'writing' | 'completed' | 'needs_review';
  lastUpdated: number;
  humanScore?: number;
}

export interface BookProgress {
  id: string;
  title: string;
  author: string;
  subtitle: string;
  description: string;
  chapters: BookChapter[];
  currentChapter: number;
  startedAt: number;
  lastUpdated: number;
  status: 'planning' | 'writing' | 'completed' | 'paused';
  totalWords: number;
  deaiifyEnabled: boolean;
  deaiifyMode: DeAiMode;
}

export interface WritingTask {
  chapterId: string;
  prompt: string;
  completed: boolean;
}

const AUTHOR = 'Michael C. Barnes';
const BOOK_TITLE = 'Building Your AI Dashboard: The Complete Beginner\'s Guide';
const SUBTITLE = 'From Zero to Enterprise-Grade AI — On Your Own Server';
const DEDICATION = 'To Randolph (Randy) Hill, Founder & CTO of GovBotics — your enterprise AI concepts now run locally, for free, in everyone\'s hands.';
const CREDITS = 'Key enterprise AI concepts adapted from Randolph Hill, Founder & CTO of GovBotics. Released under CC BY-SA 4.0 (text) and MIT License (code).';
const GOVBOTICS = 'For enterprise AI integration needs, visit www.govbotics.com — connecting legacy systems to AI capabilities with security and scale.';

function getGlobalBookInstructions(): string {
  return `You are writing a chapter for the book "Building Your AI Dashboard: The Complete Beginner's Guide" by Michael C. Barnes, with key enterprise AI concepts adapted from Randolph (Randy) Hill, Founder & CTO of GovBotics.

The entire book and project are released under Creative Commons Attribution-ShareAlike 4.0 International (CC BY-SA 4.0) for the text and MIT License for source code examples. Readers are explicitly invited to copy, adapt, fork, remix, and improve everything.

BASE ALL FACTS ON:
- The current file data/PROJECT_OVERVIEW_BOOK_PROMPT.md (project name, 30+ features, architecture, stack, heartbeat, agents, etc.)
- The actual live source code in the repo (scan files as needed)

Target audience: COMPLETE BEGINNERS who have never coded or used AI before. Write warm, conversational, encouraging — like chatting with a patient friend over coffee. Short paragraphs, "you" language, everyday analogies, gentle humor.

IMPORTANT - WRITE LIKE A HUMAN:
- Avoid AI cliches: "In today's fast-paced world", "harness the power", "unlock potential", "game-changer"
- Avoid formal transitions: "Moreover," "Furthermore," "Additionally" - use natural transitions instead
- Use contractions: "it's" not "it is", "you're" not "you are"
- Be direct: "This works because..." not "It is important to note that..."
- Use specific examples: "Salesforce cut 30%" not "various companies saw results"
- Vary sentence length: mix short (5-10 words) and long (20-30 words) sentences
- Avoid hedging: "The key is..." not "One might argue that..."
- Write like you're explaining to a smart friend, not writing a formal document

RULES FOR EVERY CHAPTER:
- Define EVERY technical term the FIRST time: **bold** it, 1-2 sentence plain-English definition + 1-2 analogies + why it matters for YOUR AI Dashboard.
- Exact chapter structure:
  1. Friendly opening + "What You'll Learn in This Chapter" (bullets)
  2. Clear explanations with analogies
  3. Step-by-step instructions using CURRENT codebase
  4. Full copy-pasteable code blocks with line-by-line comments
  5. At least THREE "Try It Yourself" boxes with exact prompts the reader can paste into THIS AI Dashboard right now
  6. "How to Personalize This for YOUR Own Dashboard" (emphasize prompt engineering — "code is just the starting point")
  7. "Common Pitfalls & How to Avoid Them"
  8. Chapter Summary + "Next Steps" + "Fork this and make it yours!"
- Word count: 2,500–4,500 (Chapter 5: 5,000–6,000)
- Celebrate the heartbeat: every 2 hours /bookwriter scans changes and updates this very book automatically.
- Highlight how Randy Hill's enterprise concepts (Generative AI Strategy, Multi-Agent Systems, secure RAG, etc.) are now available locally and for free.

Never assume knowledge. End every chapter with: "You now hold real enterprise-grade AI power in your hands — and the best part? You can make this Dashboard completely yours with simple prompts."

NOTE: Your writing will be processed through a de-AI-ification filter to ensure it sounds natural and human. Focus on content accuracy and helpful explanations.`;
}

const CHAPTER_OUTLINE = [
  { number: 1, title: 'Introduction - Your Journey Starts Here' },
  { number: 2, title: 'What is an API? (The Foundation)' },
  { number: 3, title: 'What is a Container? (Docker Explained Simply)' },
  { number: 4, title: 'Setting Up Your Computer - Step by Step' },
  { number: 5, title: 'What is Programming? (Learning to Give Instructions)' },
  { number: 6, title: 'What is a Database? (Storing Information)' },
  { number: 7, title: 'Understanding the Project Structure' },
  { number: 8, title: 'Prompt Templates - How to Talk to AI Tools' },
  { number: 9, title: 'Getting Your First Chat Working' },
  { number: 10, title: 'Adding Document Upload Features' },
  { number: 11, title: 'Creating Your Brand Voice System' },
  { number: 12, title: 'Building Intelligence Reports' },
  { number: 13, title: 'Adding Self-Reflection - Your AI Checks Itself' },
  { number: 14, title: 'Security Scanning and Problem Detection' },
  { number: 15, title: 'Connecting to Outside Services' },
  { number: 16, title: 'Docker and Containers - Running Services Safely' },
  { number: 17, title: 'Using OpenCode and AI Development Tools' },
  { number: 18, title: 'Customizing the Prompts for YOUR Needs' },
  { number: 19, title: 'Troubleshooting - When Things Go Wrong' },
  { number: 20, title: 'Appendix: Complete Prompt Library' },
];

// Database keys for storage
const DB_KEY_BOOK_PROGRESS = 'book_progress';
const DB_KEY_PROJECT_OVERVIEW = 'book_project_overview';

class BookWriterService {
  private static instance: BookWriterService;
  private progress: BookProgress | null = null;
  private isWriting: boolean = false;
  private lastChapterWritten: number = 0;

  private constructor() {
    this.loadProgress();
  }

  static getInstance(): BookWriterService {
    if (!BookWriterService.instance) {
      BookWriterService.instance = new BookWriterService();
    }
    return BookWriterService.instance;
  }

  private loadProgress(): void {
    try {
      // Load from SQLite database
      const stored = sqlDatabase.getSetting(DB_KEY_BOOK_PROGRESS);
      if (stored) {
        this.progress = JSON.parse(stored);
        console.log('[BookWriter] Loaded progress from database');
      }
    } catch (error) {
      console.error('[BookWriter] Error loading book progress:', error);
      this.progress = null;
    }
  }

  private saveProgress(): void {
    try {
      if (this.progress) {
        sqlDatabase.setSetting(DB_KEY_BOOK_PROGRESS, JSON.stringify(this.progress));
        console.log('[BookWriter] Saved progress to database');
      }
    } catch (error) {
      console.error('[BookWriter] Error saving book progress:', error);
    }
  }

  initializeBook(): BookProgress {
    const chapters: BookChapter[] = CHAPTER_OUTLINE.map(ch => ({
      id: `chapter_${ch.number}`,
      number: ch.number,
      title: ch.title,
      content: '',
      status: 'pending' as const,
      lastUpdated: 0,
    }));

    this.progress = {
      id: 'book_' + Date.now(),
      title: BOOK_TITLE,
      author: AUTHOR,
      subtitle: SUBTITLE,
      description: `A comprehensive guide to building your own AI Research Assistant, written for beginners. This book covers everything from understanding the underlying technology to deploying a fully functional AI assistant.`,
      chapters,
      currentChapter: 1,
      startedAt: Date.now(),
      lastUpdated: Date.now(),
      status: 'planning',
      totalWords: 0,
      deaiifyEnabled: true,
      deaiifyMode: 'preserve-formal' as DeAiMode,
    };

    this.saveProgress();
    return this.progress;
  }

  getProgress(): BookProgress | null {
    return this.progress;
  }

  setDeAiMode(enabled: boolean, mode: DeAiMode = 'preserve-formal'): void {
    if (this.progress) {
      this.progress.deaiifyEnabled = enabled;
      this.progress.deaiifyMode = mode;
      this.saveProgress();
    }
  }

  async writeChapter(chapterNumber: number): Promise<BookChapter | null> {
    if (!this.progress || this.isWriting) return null;

    const chapter = this.progress.chapters.find(c => c.number === chapterNumber);
    if (!chapter) return null;

    this.isWriting = true;
    chapter.status = 'writing';

    try {
      const content = await this.generateChapterContent(chapter);
      
      // Apply de-ai-ify if enabled (default: true)
      let finalContent = content;
      let humanScore = 0;
      
      if (this.progress.deaiifyEnabled) {
        console.log(`[BookWriter] Applying de-ai-ify to chapter ${chapterNumber}...`);
        const result = deaiify(content, this.progress.deaiifyMode);
        finalContent = result.revisedText;
        humanScore = result.revisedScore;
        console.log(`[BookWriter] Human score: ${result.originalScore.toFixed(1)} → ${result.revisedScore.toFixed(1)}`);
        console.log(`[BookWriter] Changes: transitions=${result.changes.transitionsRemoved}, cliches=${result.changes.clichesRemoved}, buzzwords=${result.changes.buzzwordsReplaced}`);
      }
      
      chapter.content = finalContent;
      chapter.humanScore = humanScore;
      chapter.status = 'completed';
      chapter.lastUpdated = Date.now();

      this.progress.lastUpdated = Date.now();
      this.progress.totalWords = this.progress.chapters.reduce((sum, ch) => 
        sum + (ch.content ? ch.content.split(/\s+/).length : 0), 0
      );

      if (chapterNumber >= this.progress.chapters.length) {
        this.progress.status = 'completed';
      } else {
        this.progress.currentChapter = chapterNumber + 1;
      }

      this.lastChapterWritten = Date.now();
      this.saveProgress();
      return chapter;
    } catch (error) {
      console.error('Error writing chapter:', error);
      chapter.status = 'needs_review';
      return null;
    } finally {
      this.isWriting = false;
    }
  }

  private async generateChapterContent(chapter: BookChapter): Promise<string> {
    const chapterPrompts: { [key: number]: string } = {
      1: this.getChapter1Prompt(),
      2: this.getChapter2Prompt(),
      3: this.getChapter3Prompt(),
      4: this.getChapterPrompt(
        'Setting Up Your Computer - Step by Step',
        `Guide the reader through setting up their development environment. 
        
        COVER:
        - What is a code editor (recommend VS Code) and why you need one
        - What is the terminal/command line (explain like they've never seen it)
        - How to navigate the file system (cd, ls/dir, mkdir)
        - What are environment variables (concept of "settings that programs need")
        
        REQUIREMENTS:
        - Step-by-step instructions for both Windows AND Mac
        - Describe what screenshots would show (e.g., "You'll see a window that looks like...")
        - Include troubleshooting tips for common issues
        - 2500-3500 words
        - Start with: "Before we build anything, we need the right tools. Think of this like setting up a kitchen before cooking."`
      ),
      5: this.getChapter5Prompt(),
      6: this.getChapter6Prompt(),
      7: this.getChapter7Prompt(),
      8: this.getChapter8Prompt(),
    };

    const prompt = chapterPrompts[chapter.number] || this.getDefaultChapterPrompt(chapter);
    
    // Call AI model to generate content
    console.log(`[BookWriter] Generating content for chapter ${chapter.number}: ${chapter.title}`);
    
    try {
      const response = await chatCompletion({
        model: 'glm-4-flash',
        messages: [
          { role: 'system', content: getGlobalBookInstructions() },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        maxTokens: 6000,
      });

      return response.message.content;
    } catch (error) {
      console.error(`[BookWriter] Error generating chapter ${chapter.number}:`, error);
      throw error;
    }
  }

  private getChapter1Prompt(): string {
    return `Write Chapter 1: "Introduction - Your Journey Starts Here"

This is the FIRST chapter - make it welcoming and exciting!

COVER:
1. Welcome the reader warmly - they're about to do something amazing
2. What IS an AI Research Assistant (explain like they're 10 years old)
3. What they'll have built by the end of the book (paint a vivid picture)
4. What they DON'T need (no programming experience, no expensive hardware, etc.)
5. How this book works (hands-on, plain English, lots of examples)
6. What is a "prompt" (this is crucial - everything builds on this!)

ANALOGIES TO USE:
- AI Research Assistant = having a super-smart intern who never sleeps
- Prompts = giving instructions to a helpful robot
- Building the Dashboard = assembling LEGO bricks (each chapter adds pieces)

MUST INCLUDE:
- At least 3 "Try It Yourself" boxes with prompts readers can use NOW
- A section on "What do YOU want your Dashboard to do?" (get them thinking personally)
- Common pitfalls (like "I need to understand everything first" - no, you don't!)

END WITH:
"You now hold the roadmap for building real enterprise-grade AI power. Ready for Chapter 2?"

Word count: 3000-4500 words`;
  }

  private getChapter2Prompt(): string {
    return `Write Chapter 2: "What is an API? (The Foundation)"

This chapter is THE FOUNDATION - make it crystal clear!

COVER:
1. What is an API (use the RESTAURANT analogy throughout - you/customer = your app, waiter = API, kitchen = server)
2. Why APIs exist (different programs talking, don't rebuild everything)
3. What is JSON (explain like it's a standardized form)
4. HTTP methods: GET (asking for info), POST (creating), PUT (updating), DELETE (removing)
5. Status codes: 200 (success!), 404 (not found), 500 (server error)
6. Your first API call example (show actual code!)

ANALOGIES:
- API = waiter in a restaurant
- JSON = standardized menu with prices and descriptions
- HTTP methods = different ways to order ("What's on the menu?", "I'd like to order", "Change my order", "Cancel")

MUST INCLUDE:
- Step-by-step: "Try It Yourself" - actually make an API call
- Show the request/response cycle with diagrams
- Connect to YOUR Dashboard: "Every feature uses APIs"
- Common mistakes (404 means "not found", 500 means "server crashed")

Word count: 3000-4000 words`;
  }

  private getChapter3Prompt(): string {
    return `Write Chapter 3: "What is a Container? (Docker Explained Simply)"

Solve the "it works on my machine" problem forever!

COVER:
1. What is a container (LUNCHBOX analogy - everything packed together)
2. Why containers matter (consistent environments, no "works here but not there")
3. What is Docker (most popular container tool)
4. Containers vs Virtual Machines (VMs are heavy, containers are light)
5. Your first Dockerfile (copy-pasteable example)
6. Running containers (docker run, docker ps, docker stop)

ANALOGIES:
- Container = lunchbox (everything you need in one box)
- Docker = the company that makes lunchboxes
- VM = packing your entire kitchen vs container = just packing lunch

MUST INCLUDE:
- "Try It Yourself" - build and run a simple container
- Show actual Dockerfile from YOUR Dashboard
- Explain when to use containers (deploying to production)
- Common pitfalls (don't put secrets in containers!)

Word count: 2500-3500 words`;
  }

  private getChapter5Prompt(): string {
    return `Write Chapter 5: "What is Programming? (Learning to Give Instructions)"

Teaching the fundamentals without overwhelming!

COVER:
1. What programming actually is (giving precise instructions to computers)
2. Why computers are so literal (they don't "fill in the gaps")
3. Basic concepts: variables (storage boxes), functions (reusable recipes), conditionals (if/else), loops (repeat)
4. Your first lines of code (console.log("Hello, World!"))
5. How to read error messages (they're helpful, not scary!)
6. Debugging basics (finding and fixing problems)

ANALOGIES:
- Programming = writing recipes for a robot chef
- Variables = labeled storage boxes
- Functions = recipes you can reuse
- Debugging = finding where the recipe went wrong

MUST INCLUDE:
- At least 3 "Try It Yourself" with actual code to type
- Encouragement: "Everyone gets errors. Errors mean you're learning!"
- Show how to run code (node hello.js)
- Common beginner mistakes (missing semicolons, typos)

Word count: 5000-6000 words (this chapter needs extra depth)`;
  }

  private getChapter6Prompt(): string {
    return `Write Chapter 6: "What is a Database? (Storing Information)"

Make databases approachable!

COVER:
1. What is a database (FILING CABINET analogy)
2. SQL vs NoSQL (relational vs flexible)
3. Tables, rows, columns (spreadsheets but powerful)
4. Basic SQL: SELECT, INSERT, UPDATE, DELETE
5. SQLite - the database we'll use (lightweight, file-based)
6. Connecting your app to the database

ANALOGIES:
- Database = super-powered filing cabinet
- Table = folder in the cabinet
- Row = document in the folder
- Column = field on the form

MUST INCLUDE:
- "Try It Yourself" - create a table and add data
- Show YOUR Dashboard's database schema
- Explain why SQLite (no server to manage, perfect for local apps)
- Common pitfalls (forgetting WHERE in UPDATE, SQL injection basics)

Word count: 3000-4000 words`;
  }

  private getChapter7Prompt(): string {
    return `Write Chapter 7: "Understanding the Project Structure"

Map out the codebase!

COVER:
1. Overview of folder structure (src/app, src/lib, data, docs)
2. What each folder means and what goes there
3. Key files explained: package.json, next.config.js, tsconfig.json
4. How files connect to each other (imports/exports)
5. Understanding the API routes structure
6. Where to add new features

MUST INCLUDE:
- Visual diagram of the folder structure
- "Try It Yourself" - navigate the codebase
- Explain configuration files in plain English
- Tips for finding what you need

Word count: 2500-3500 words`;
  }

  private getChapter8Prompt(): string {
    return `Write Chapter 8: "Prompt Templates - How to Talk to AI Tools"

The art of prompt engineering!

COVER:
1. What makes a good prompt (specificity, context, format)
2. Prompt structure: context + instruction + format + examples
3. System prompts vs user prompts
4. Common prompt patterns (zero-shot, few-shot, chain-of-thought)
5. YOUR Dashboard's prompt templates (look at actual files)
6. Testing and iterating prompts

ANALOGIES:
- Good prompt = giving directions to someone who's never been to your city
- System prompt = setting the stage/rules
- User prompt = the actual question/task

MUST INCLUDE:
- Before/after examples (bad prompt → good prompt)
- "Try It Yourself" - improve a weak prompt
- Show actual prompts from YOUR Dashboard
- Template for readers to use

Word count: 3000-4500 words`;
  }

  private getChapterPrompt(title: string, content: string): string {
    return `Write Chapter: "${title}"

${content}

Word count: 2500-4000 words
- Be encouraging and supportive
- Include sample prompts the reader can use with AI coding assistants
- If the chapter involves code, include the prompt the reader can use to generate it

WRITING STYLE:
- Conversational tone like talking to a friend who's smart but new to this
- Use "you" frequently - address the reader directly
- Include the author's perspective with useful tips
- Be thorough - this is a book, not an article
- 2500-4000 words per chapter`;
  }

  private getDefaultChapterPrompt(chapter: BookChapter): string {
    const chapterDetails: { [key: number]: string } = {
      9: `Building chat functionality. Cover: How chat works, WebSocket vs HTTP, message history, streaming responses. Include sample prompt for creating a chat component.`,
      10: `Adding document upload features. Cover: File upload basics, file types, storage, processing documents. Include sample prompt for document upload API.`,
      11: `Creating your brand voice system. Cover: What is a brand voice, storing voice profiles, applying voice to content. Include sample prompt for brand voice template.`,
      12: `Building intelligence reports. Cover: Scheduled tasks, data collection, summarization. Include sample prompt for report generation.`,
      13: `Adding self-reflection - your AI checks itself. Cover: Why self-reflection matters, analyzing outputs, suggesting improvements. Include sample prompt for reflection analysis.`,
      14: `Security scanning and problem detection. Cover: What to scan for, automated checks, fixing issues, escalating to AI assistants. Include sample prompt for security check.`,
      15: `Connecting to outside services. Cover: API integration, authentication, rate limiting. Include sample prompt for service integration.`,
      16: `Docker and containers - running services safely. Cover: When to use Docker, creating containers, security. Include sample prompt for Docker setup.`,
      17: `Using OpenCode and AI development tools. Cover: What is OpenCode, how AI coding assistants work, best practices. Include sample prompt for AI coding assistant.`,
      18: `Customizing the prompts for YOUR needs. Cover: Understanding the prompt library, making it your own, testing changes. Include examples of modified prompts.`,
      19: `Troubleshooting - when things go wrong. Cover: Common errors, reading error messages, debugging strategies, getting help. Include troubleshooting checklist.`,
      20: `Appendix: Complete prompt library. Cover: All prompts from the book in one place, organized by feature, ready to copy and modify.`,
    };
    
    const details = chapterDetails[chapter.number] || `Cover: The topic thoroughly for beginners. Include practical examples and sample prompts.`;
    
    return `Write Chapter ${chapter.number}: "${chapter.title}" for the book "${BOOK_TITLE}" by ${AUTHOR}.

${details}

WRITING STYLE:
- Conversational and encouraging
- Every technical term explained
- Include sample prompts the reader can use
- 2500-3500 words`;
  }

  async writeNextChapter(): Promise<BookChapter | null> {
    if (!this.progress) {
      this.initializeBook();
    }

    if (!this.progress) return null;

    const nextChapter = this.progress.currentChapter;
    return await this.writeChapter(nextChapter);
  }

  getFullBook(): string {
    if (!this.progress) return '';

    let fullBook = `# ${this.progress.title}\n\n`;
    fullBook += `## ${this.progress.subtitle}\n\n`;
    fullBook += `*By ${this.progress.author}*\n\n`;
    fullBook += `---\n\n`;
    fullBook += `**Dedication:** ${DEDICATION}\n\n`;
    fullBook += `**Credits:** ${CREDITS}\n\n`;
    fullBook += `---\n\n`;
    fullBook += `${this.progress.description}\n\n`;
    fullBook += `*${GOVBOTICS}*\n\n`;
    fullBook += `---\n\n`;

    for (const chapter of this.progress.chapters) {
      if (chapter.content) {
        fullBook += `## Chapter ${chapter.number}: ${chapter.title}\n\n`;
        fullBook += chapter.content + '\n\n';
        fullBook += `---\n\n`;
      }
    }

    return fullBook;
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
}

export const bookWriterService = BookWriterService.getInstance();
