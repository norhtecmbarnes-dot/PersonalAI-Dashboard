import fs from 'fs';
import path from 'path';
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
const PROJECT_OVERVIEW_FILE = path.join(process.cwd(), 'data', 'PROJECT_OVERVIEW_BOOK_PROMPT.md');

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

const BOOK_PROGRESS_FILE = path.join(process.cwd(), 'data', 'book_progress.json');

function ensureDataDir(): void {
  const dataDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

function loadProjectOverview(): string {
  try {
    if (fs.existsSync(PROJECT_OVERVIEW_FILE)) {
      return fs.readFileSync(PROJECT_OVERVIEW_FILE, 'utf-8');
    }
  } catch (error) {
    console.error('[BookWriter] Error loading project overview:', error);
  }
  return '';
}

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
      ensureDataDir();
      if (fs.existsSync(BOOK_PROGRESS_FILE)) {
        const stored = fs.readFileSync(BOOK_PROGRESS_FILE, 'utf-8');
        this.progress = JSON.parse(stored);
        console.log('[BookWriter] Loaded progress from file');
      }
    } catch (error) {
      console.error('[BookWriter] Error loading book progress:', error);
      this.progress = null;
    }
  }

  private saveProgress(): void {
    try {
      ensureDataDir();
      if (this.progress) {
        fs.writeFileSync(BOOK_PROGRESS_FILE, JSON.stringify(this.progress, null, 2));
        console.log('[BookWriter] Saved progress to file');
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
    
    const systemPrompt = getGlobalBookInstructions();
    
    try {
      const result = await chatCompletion({
        model: 'glm-4.7-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        temperature: 0.8,
        maxTokens: 6000,
      });

      if (result.message && typeof result.message === 'object' && result.message.content) {
        console.log(`[BookWriter] Chapter ${chapter.number} generated successfully (${result.message.content.length} chars)`);
        return result.message.content;
      } else if (typeof result.message === 'string') {
        console.log(`[BookWriter] Chapter ${chapter.number} generated successfully`);
        return result.message;
      } else {
        throw new Error('Invalid response from AI model');
      }
    } catch (error) {
      console.error(`[BookWriter] Failed to generate chapter ${chapter.number}:`, error);
      throw error;
    }
  }

  private getChapter1Prompt(): string {
    return `Write Chapter 1 of the book "${BOOK_TITLE}" by ${AUTHOR}.

THIS IS THE FIRST CHAPTER. Assume the reader has NEVER programmed before and may be intimidated.

COVER IN ORDER:
1. A Warm Welcome - Tell them they CAN do this, no matter their background
2. What IS an AI Research Assistant? 
   - Use the analogy of a super-smart librarian who never sleeps
   - Explain it's software YOU control
   - Compare to ChatGPT but customized for YOUR needs
3. What You Will Build in This Book
   - List the features they'll create (chat, documents, brand voice, etc.)
   - Explain each feature in ONE simple sentence
4. What You DON'T Need
   - No math required (promise!)
   - No programming experience (we'll teach you)
   - No expensive software (it's all free)
   - No special computer (works on laptop)
5. How This Book Works
   - We explain concepts in plain English
   - We provide prompts you can copy
   - YOU can modify prompts to build YOUR system
   - When stuck, feed the prompts to AI coding assistants
6. What is a Prompt? (Crucial concept)
   - A prompt is just instructions you give to AI
   - Like giving directions to a smart intern
   - This book teaches you to write BETTER prompts
7. The Author's Promise - You will succeed if you follow along

WRITING STYLE:
- Warm, encouraging, non-intimidating
- If you use ANY technical term, explain it immediately
- 2500-3500 words
- Start with: "Welcome. You're about to embark on an exciting journey, and I'm going to guide you every step of the way. Don't worry if you've never programmed before - that's exactly who this book is for."`;
  }

  private getChapter2Prompt(): string {
    return `Write Chapter 2 of the book "${BOOK_TITLE}" by ${AUTHOR}.

THIS CHAPTER IS CRITICAL - APIs are the foundation of everything. Take time to explain well.

EXPLAIN USING ANALOGIES:

1. What IS an API?
   - Restaurant analogy: Waiter = API. You order → waiter → kitchen → food back. You don't go into the kitchen.
   - TV remote analogy: You press a button, something happens. You don't need to know how the TV works inside.
   - USB port analogy: Plug things in, they just work. APIs are like USB ports for software.
   - Phone call analogy: You dial a number, someone answers, you talk, they respond. You don't know how phones work.

2. Why do APIs Exist?
   - So different programs can communicate
   - So you don't have to build everything from scratch
   - So companies can share services safely

3. REST APIs Made Simple
   - URLs = Addresses on the internet (like home addresses)
   - HTTP Methods = Verbs (GET = ask, POST = send, PUT = update, DELETE = remove)
   - Status Codes = Responses (200 = success, 404 = not found, 500 = error)
   - Include "Real world" examples (fetching weather data, sending a message)

4. What is JSON?
   - Explain it's a format for data
   - Like a structured shopping list: { "item": "milk", "quantity": 2 }
   - Show simple examples

5. The Request/Response Cycle
   - Your program sends a request
   - The server processes it
   - The server sends back data
   - Your program uses the data

INCLUDE A SAMPLE PROMPT:
\`\`\`
PROMPT YOU CAN USE:
"Create a simple API endpoint that accepts a user's name and returns a greeting. Use Express.js and include error handling."
\`\`\`

WRITING STYLE:
- 3500-4500 words - this is foundational
- Every concept has at least 2 analogies
- Include "Key Takeaways" at the end
- Start with: "API - you'll hear this word a lot. Let's make sure you understand it completely."`;
  }

  private getChapter3Prompt(): string {
    return `Write Chapter 3 of the book "${BOOK_TITLE}" by ${AUTHOR}.

EXPLAIN CONTAINERS AND DOCKER FROM SCRATCH.

COVER:
1. What is a Container? (Multiple analogies)
   - Shipping container analogy: Standardized box that works everywhere
   - Lunchbox analogy: Everything you need in one package
   - Virtual machine vs container (simplified - VM is like whole house, container is like a room)

2. Why Do We Need Containers?
   - "But it works on MY computer" problem
   - Consistent environment
   - Isolation and safety
   - Easy to share

3. What is Docker? (The main container tool)
   - Software that runs containers
   - Why it's popular
   - Docker Desktop for beginners

4. Do You NEED Docker for This Book?
   - No! Most of the book works without Docker
   - Docker is optional for advanced features
   - We'll show both ways

5. Container Diagram Description
   - Visual description of containers communicating

INCLUDE SAMPLE PROMPT:
\`\`\`
PROMPT YOU CAN USE:
"Create a Dockerfile for a Node.js application. Include comments explaining each line."
\`\`\`

WRITING STYLE:
- 3000-4000 words
- If reader skips this, they should still understand the basics
- Start with: "Containers sound technical, but the concept is beautifully simple."`;
  }

  private getChapter5Prompt(): string {
    return `Write Chapter 5 of the book "${BOOK_TITLE}" by ${AUTHOR}.

TEACH PROGRAMMING FROM ZERO. Many readers have NEVER programmed.

EXPLAIN IN ORDER:

1. What IS Programming?
   - Giving instructions to a computer
   - Like a recipe for a computer
   - Computers are "dumb but fast" - they do EXACTLY what you say
   
2. What is "Code"?
   - Text that computers can read
   - Written in programming languages
   - Gets translated to computer instructions

3. What is JavaScript? (Our programming language)
   - The language of the web
   - Runs in browsers AND servers
   - Why we chose it for this book
   
4. What is TypeScript? (Our ACTUAL language)
   - JavaScript with types (explain "types" simply)
   - Helps catch mistakes before running
   - Makes code easier to understand

5. Variables - Storing Information
   - Named boxes that hold values
   - Examples: name = "John", age = 25
   - const vs let (const = can't change, let = can change)

6. Data Types
   - Strings (text): "Hello world"
   - Numbers: 42, 3.14
   - Booleans (true/false): Is this correct?
   - Objects (collections): { name: "John", age: 25 }
   - Arrays (lists): ["apple", "banana", "orange"]

7. Functions - Reusable Instructions
   - A named set of instructions
   - Like a saved recipe
   - Input → Process → Output

8. Conditional Logic - Making Decisions
   - if/else: If it's raining, bring an umbrella
   - Comparison operators: ===, !==, <, >

9. Loops - Doing Things Repeatedly
   - for, while
   - "Do this 10 times"

10. Async/Await - Waiting for Things
    - Some operations take time (API calls)
    - We need to wait for them
    - async/await is like saying "pause until this finishes"

INCLUDE SAMPLE PROMPT:
\`\`\`
PROMPT YOU CAN USE:
"Create a TypeScript function that takes a name and age, then returns a greeting. Include error handling."
\`\`\`

WRITING STYLE:
- 5000-6000 words - this is foundational
- Every concept has an example
- Include "Try It Yourself" boxes
- Start with: "Programming is giving instructions to a computer. The computer will do EXACTLY what you tell it - nothing more, nothing less."`;
  }

  private getChapter6Prompt(): string {
    return `Write Chapter 6 of the book "${BOOK_TITLE}" by ${AUTHOR}.

EXPLAIN DATABASES FROM SCRATCH.

COVER:

1. What IS a Database?
   - Organized storage for information
   - Like a filing cabinet, but searchable
   - Your AI Assistant's memory

2. Why Do We Need Databases?
   - To remember things permanently
   - To search through data quickly
   - To organize related information

3. Types of Databases
   - Flat files (like CSV - explain what CSV is)
   - SQL databases (structured data)
   - NoSQL databases (flexible data)

4. What is SQL?
   - A language for talking to databases
   - SELECT, INSERT, UPDATE, DELETE (explain each)
   
5. Tables, Rows, and Columns
   - Table = spreadsheet
   - Row = one record
   - Column = one type of data

6. What is SQLite? (Our database)
   - A simple SQL database
   - No server needed (explain why that's good)
   - Perfect for beginners

7. Plain English to SQL Translations
   - "Get all users" → SELECT * FROM users
   - "Add a new user named John" → INSERT INTO users (name) VALUES ('John')
   - "Change John's email" → UPDATE users SET email='new@email.com' WHERE name='John'

INCLUDE SAMPLE PROMPT:
\`\`\`
PROMPT YOU CAN USE:
"Create a SQLite database schema for users and their documents. Include relationships and indexes."
\`\`\`

WRITING STYLE:
- 3000-4000 words
- Use "library" analogies
- Start with: "Every AI Assistant needs to remember things. That's what databases are for."`;
  }

  private getChapter7Prompt(): string {
    return `Write Chapter 7 of the book "${BOOK_TITLE}" by ${AUTHOR}.

EXPLAIN PROJECT STRUCTURE - WHAT ALL THESE FILES MEAN.

COVER:

1. Understanding the Folder Structure
   - What each folder means (src, app, lib, etc.)
   - Why files are organized this way
   - Don't panic about the number of files!

2. Key Configuration Files
   - package.json (project dependencies - like a shopping list)
   - tsconfig.json (TypeScript settings)
   - next.config.js (Next.js settings)
   - .env (your secret settings - passwords, API keys)

3. The src/app Directory
   - What is "app router" (how URLs map to files)
   - page.tsx files (what users SEE)
   - route.ts files (API endpoints)

4. The src/lib Directory
   - Services (reusable code)
   - Integrations (connecting to outside services)

5. How Files Talk to Each Other
   - Imports and exports
   - "One file, one responsibility" principle

INCLUDE SAMPLE PROMPT:
\`\`\`
PROMPT YOU CAN USE:
"Create a Next.js app router structure for an AI chat application. Include pages for: /chat, /documents, /settings. Show the folder structure with file names."
\`\`\`

WRITING STYLE:
- 2500-3500 words
- Include a visual description of folder structure
- Start with: "When you first see all these folders and files, it can feel overwhelming. Let's break it down, piece by piece."`;
  }

  private getChapter8Prompt(): string {
    return `Write Chapter 8 of the book "${BOOK_TITLE}" by ${AUTHOR}.

THIS CHAPTER IS CRUCIAL - PROMPT TEMPLATES ARE HOW THE USER WILL BUILD THEIR OWN SYSTEM.

EXPLAIN PROMPT TEMPLATES IN DETAIL.

COVER:

1. What is a Prompt Template?
   - A reusable pattern for prompts
   - Like a form letter - fill in the blanks
   - Why templates save time and improve quality

2. Components of a Good Prompt
   - Context (who/what the AI is acting as)
   - Task (what you want it to do)
   - Constraints (rules it must follow)
   - Format (how you want the response)
   - Examples (sample inputs/outputs)

3. The PROMPT Framework
   - P - Purpose (what's this for?)
   - R - Role (who should AI be?)
   - O - Output (what format?)
   - M - Model (which AI model?)
   - P - Parameters (temperature, etc.)
   - T - Tone (professional? casual?)

4. Sample Prompt Templates from This Project
   - Document generation prompts
   - Chat system prompts
   - Brand voice prompts
   - Security analysis prompts

5. Customizing Prompts for YOUR Needs
   - Changing the role
   - Adjusting output format
   - Adding your own constraints

INCLUDE ACTUAL PROMPT TEMPLATES USER CAN COPY:
\`\`\`
PROMPT TEMPLATE: Chat System
---
You are {{ROLE}}.
Your task is to {{TASK}}.
Constraints:
- {{CONSTRAINT_1}}
- {{CONSTRAINT_2}}
Format your response as {{FORMAT}}.
---

PROMPT TEMPLATE: Document Generation
---
Create a {{DOCUMENT_TYPE}} about {{TOPIC}}.
Brand voice: {{BRAND_VOICE}}
Include: {{REQUIREMENTS}}
Length: {{LENGTH}}
---
\`\`\`

WRITING STYLE:
- 4000-5000 words
- This is a KEY chapter - go deep
- Include many examples
- Start with: "Prompts are how you control AI. The better your prompts, the better your results. This chapter teaches you to write prompts like a pro."`;
  }

  private getChapterPrompt(title: string, requirements: string): string {
    return `Write a chapter titled "${title}" for the book "${BOOK_TITLE}" by ${AUTHOR}.

${requirements}

IMPORTANT INSTRUCTIONS FOR YOUR WRITING:
- This is a book for COMPLETE BEGINNERS - assume ZERO prior knowledge
- Every technical term MUST be explained immediately when first used
- Use analogies and real-world comparisons for every concept
- Include "Try This" boxes where appropriate
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
