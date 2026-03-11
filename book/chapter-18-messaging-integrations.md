# Chapter 18: Connecting to Messaging Systems - Telegram, Slack, Notion, and More

Your AI Dashboard doesn't have to live in a web browser. You can connect it to messaging platforms like Telegram, Slack, Discord, Notion, or any other communication tool. This chapter shows you how.

## What You'll Learn

• **Why messaging integration matters** — Meet users where they are
• **Telegram integration** — Step-by-step bot setup
• **The integration pattern** — Apply to any platform
• **Slack integration** — Adapting the same approach
• **Notion integration** — Document-based AI
• **Security considerations** — Keeping your system safe
• **Multi-platform strategy** — One AI, many channels

---

## The Restaurant Delivery Analogy

Imagine you run a great restaurant (your AI Dashboard).

**Traditional approach:** Customers must come to your restaurant (web interface).

**Messaging integration:** You deliver to where customers are:
• Telegram → Like food delivery to someone's home
• Slack → Like a food truck at their office
• Notion → Like meal prep delivered weekly
• Discord → Like catering their party

**Same kitchen (AI), different delivery methods (integrations).**

---

## Why Messaging Integration?

### Benefits

| Benefit | Explanation |
|---------|-------------|
| **Meet users where they are** | They already use Telegram/Slack |
| **Instant notifications** | Push messages without email |
| **Mobile-friendly** | Messaging apps are mobile-first |
| **Familiar interface** | No new app to learn |
| **Always available** | AI responds 24/7 |

### Use Cases

• **Daily briefings** — AI sends summary each morning
• **Alerts** — Notify when something important happens
• **Chat interface** — Have conversations in your favorite app
• **Commands** — Issue commands via message
• **Document sharing** — Send files to AI for processing

---

## The Integration Pattern

All messaging integrations follow the same pattern:

```
┌─────────────────┐
│   Your AI       │
│   Dashboard     │
│   (The Brain)   │
└────────┬────────┘
         │
         │ API Routes
         │
┌────────┴────────┐
│   Integration   │
│   Service       │
│   (The Bridge)  │
└────────┬────────┘
         │
         │ Webhook/Polling
         │
┌────────┴────────┐
│   Messaging     │
│   Platform      │
│   (Telegram,    │
│    Slack, etc.) │
└─────────────────┘
```

### Key Components

1. **Platform (Messaging App)** — Where users interact
2. **Webhook/Polling** — How messages get to your server
3. **Integration Service** — Translates between platform and AI
4. **API Routes** — Handle incoming messages
5. **AI Dashboard** — Processes and responds

---

## Telegram Integration (Complete Guide)

Telegram is one of the easiest platforms to integrate with. Let's build a complete Telegram bot.

### Step 1: Create a Telegram Bot

1. Open Telegram and search for **@BotFather**
2. Send `/newbot`
3. Give your bot a name (e.g., "MyAI Dashboard")
4. Give your bot a username (e.g., "myai_dashboard_bot")
5. **Save the bot token!** It looks like: `1234567890:ABCdefGHIjk...`

### Step 2: Add Configuration

Add to your `.env.local`:

```env
# Telegram Bot Configuration
TELEGRAM_BOT_TOKEN=your_bot_token_here
TELEGRAM_WEBHOOK_URL=https://your-domain.com/api/telegram/webhook
TELEGRAM_ENABLED=true
```

### Step 3: Database Storage for Telegram

The AI Dashboard stores Telegram configuration in SQLite:

```typescript
// Already implemented in src/lib/storage/telegram-config.ts

interface TelegramConfig {
  botToken: string;
  enabled: boolean;
  webhookUrl?: string;
  allowedUsers?: string[];
  chatWithAI: boolean;
}
```

### Step 4: Integration Service

The Telegram service (at `src/lib/integrations/telegram.ts`) handles:

```typescript
class TelegramService {
  // Send a message to a chat
  async sendMessage(chatId: number, text: string): Promise<void>
  
  // Get updates (long polling)
  async getUpdates(timeout: number): Promise<TelegramUpdate[]>
  
  // Set up webhook (alternative to polling)
  async setWebhook(url: string): Promise<void>
  
  // Handle incoming message
  async handleMessage(message: TelegramMessage): Promise<void>
  
  // Register commands
  async setMyCommands(commands: TelegramBotCommand[]): Promise<void>
}
```

### Step 5: API Route for Webhooks

Create `src/app/api/telegram/webhook/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { telegramService } from '@/lib/integrations/telegram';
import { getDatabase } from '@/lib/database/sqlite';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Verify this is a valid Telegram update
    if (!body.update_id) {
      return NextResponse.json({ error: 'Invalid update' }, { status: 400 });
    }
    
    // Process the message
    if (body.message?.text) {
      await handleTelegramMessage(body.message);
    }
    
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Telegram webhook error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

async function handleTelegramMessage(message: any) {
  const chatId = message.chat.id;
  const text = message.text;
  
  // Commands
  if (text.startsWith('/')) {
    await handleCommand(chatId, text, message);
  } else {
    // Chat with AI
    const response = await chatWithAI(text, message.from);
    await telegramService.sendMessage(chatId, response);
  }
}

async function handleCommand(chatId: number, command: string, message: any) {
  const cmd = command.split(' ')[0].toLowerCase();
  
  switch (cmd) {
    case '/start':
      await telegramService.sendMessage(
        chatId,
        'Welcome to AI Dashboard! Send me any message to chat with the AI.'
      );
      break;
      
    case '/help':
      await telegramService.sendMessage(
        chatId,
        'Commands:\n/start - Start the bot\n/help - Show this help\n/schedule - Set up scheduled messages\n/status - Check system status'
      );
      break;
      
    case '/status':
      const status = await getSystemStatus();
      await telegramService.sendMessage(chatId, status);
      break;
      
    default:
      await telegramService.sendMessage(chatId, 'Unknown command. Send /help for available commands.');
  }
}
```

### Step 6: Polling Alternative (Easier for Development)

For local development (no public URL), use long polling:

```typescript
// src/lib/integrations/telegram.ts (excerpt)

async startPolling() {
  if (this.pollingInterval) return;
  
  console.log('[Telegram] Starting polling...');
  
  this.pollingInterval = setInterval(async () => {
    try {
      const updates = await this.getUpdates(30);
      
      for (const update of updates) {
        if (update.message && !this.processedMessages.has(update.message.message_id)) {
          this.processedMessages.add(update.message.message_id);
          
          if (this.onMessageHandler) {
            await this.onMessageHandler(update.message);
          }
        }
      }
    } catch (error) {
      console.error('[Telegram] Polling error:', error);
    }
  }, 1000);
}
```

### Step 7: Telegram Management Page

Create `src/app/telegram/page.tsx` (already in project):

```typescript
// This page lets you:
// - Enable/disable Telegram integration
// - Set bot token
// - Configure allowed users
// - View message history
// - Test the connection
```

### Step 8: Test Your Bot

```bash
# Start your AI Dashboard
npm run dev

# In Telegram, find your bot
# Send: /start

# Send any message
# The AI should respond
```

---

## The Universal Integration Pattern

Notice how Telegram integration works? Here's the pattern you can apply to ANY messaging platform:

### Pattern Components

1. **Configuration Storage**
   - API credentials (tokens, keys)
   - Webhook URLs
   - Enabled/disabled toggles
   - User permissions

2. **Integration Service**
   - Send messages
   - Receive messages (webhook or polling)
   - Parse commands
   - Format responses

3. **API Routes**
   - Receive webhooks from platform
   - Process incoming messages
   - Send responses

4. **User Interface**
   - Configuration page
   - Message history
   - Test functionality

### Code Template for Any Platform

```typescript
// src/lib/integrations/[platform].ts

interface [Platform]Config {
  apiKey: string;
  enabled: boolean;
  webhookUrl?: string;
  allowedUsers?: string[];
}

class [Platform]Service {
  private config: [Platform]Config | null = null;
  
  setConfig(config: [Platform]Config) {
    this.config = config;
  }
  
  async sendMessage(recipientId: string, text: string): Promise<void> {
    // Platform-specific API call
  }
  
  async handleWebhook(payload: any): Promise<void> {
    // Parse platform webhook format
    // Route to appropriate handler
  }
  
  async setWebhook(url: string): Promise<void> {
    // Register webhook with platform
  }
}

export const [platform]Service = new [Platform]Service();
```

---

## Slack Integration

Let's apply the same pattern to Slack.

### Step 1: Create a Slack App

1. Go to https://api.slack.com/apps
2. Click "Create New App"
3. Choose "From a manifest" or "From scratch"
4. Name it (e.g., "AI Dashboard")
5. Add Bot Token Scopes: `chat:write`, `im:history`, `im:read`
6. Install to your workspace
7. **Save the Bot User OAuth Token!**

### Step 2: Add to Configuration

```env
# Slack Bot Configuration
SLACK_BOT_TOKEN=xoxb-your-token-here
SLACK_SIGNING_SECRET=your-signing-secret
SLACK_ENABLED=true
```

### Step 3: Slack Integration Service

```typescript
// src/lib/integrations/slack.ts

interface SlackConfig {
  botToken: string;
  signingSecret: string;
  enabled: boolean;
}

class SlackService {
  private config: SlackConfig | null = null;
  private baseUrl = 'https://slack.com/api';
  
  setConfig(config: SlackConfig) {
    this.config = config;
  }
  
  async sendMessage(channel: string, text: string): Promise<void> {
    if (!this.config?.botToken) throw new Error('Slack not configured');
    
    const response = await fetch(`${this.baseUrl}/chat.postMessage`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.botToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ channel, text }),
    });
    
    const data = await response.json();
    if (!data.ok) throw new Error(data.error);
  }
  
  async handleWebhook(payload: any): Promise<void> {
    // Verify signature
    // Parse Slack event format
    // Route to handler
  }
}

export const slackService = new SlackService();
```

### Step 4: Slack API Route

```typescript
// src/app/api/slack/events/route.ts

export async function POST(request: NextRequest) {
  const body = await request.text();
  
  // Verify Slack signature
  const timestamp = request.headers.get('X-Slack-Request-Timestamp');
  const signature = request.headers.get('X-Slack-Signature');
  
  // ... verification logic ...
  
  const payload = JSON.parse(body);
  
  // Handle URL verification
  if (payload.type === 'url_verification') {
    return NextResponse.json({ challenge: payload.challenge });
  }
  
  // Handle events
  if (payload.event?.type === 'message') {
    await handleSlackMessage(payload.event);
  }
  
  return NextResponse.json({ ok: true });
}
```

---

## Notion Integration

Notion is different — it's document-based, not chat-based.

### Use Cases

• **Daily journaling** — AI helps you write
• **Knowledge base** — AI retrieves and summarizes
• **Task management** — AI updates databases
• **Meeting notes** — AI transcribes and organizes

### Step 1: Create Notion Integration

1. Go to https://www.notion.so/my-integrations
2. Click "New integration"
3. Name it, select workspace
4. **Save the Internal Integration Token!**
5. Share pages with your integration

### Step 2: Configuration

```env
# Notion Integration
NOTION_API_KEY=secret_your_key_here
NOTION_ENABLED=true
NOTION_DATABASE_ID=your_database_id
```

### Step 3: Notion Integration Service

```typescript
// src/lib/integrations/notion.ts

interface NotionConfig {
  apiKey: string;
  databaseId?: string;
  enabled: boolean;
}

class NotionService {
  private config: NotionConfig | null = null;
  private baseUrl = 'https://api.notion.com/v1';
  
  async createPage(parentId: string, title: string, content: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}/pages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28',
      },
      body: JSON.stringify({
        parent: { database_id: parentId },
        properties: {
          Name: { title: [{ text: { content: title } }] },
        },
        children: [
          {
            object: 'block',
            type: 'paragraph',
            paragraph: { text: [{ text: { content } }] },
          },
        ],
      }),
    });
    
    return response.json();
  }
  
  async queryDatabase(databaseId: string, filter?: any): Promise<any[]> {
    const response = await fetch(`${this.baseUrl}/databases/${databaseId}/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28',
      },
      body: JSON.stringify({ filter }),
    });
    
    const data = await response.json();
    return data.results;
  }
  
  async appendBlock(pageId: string, content: string): Promise<void> {
    // Add content to existing page
  }
}

export const notionService = new NotionService();
```

### Step 4: Notion Use Cases

**Daily Journal:**
```typescript
// Create a daily journal entry
await notionService.createPage(
  databaseId,
  new Date().toLocaleDateString(),
  aiGeneratedContent
);
```

**Search Knowledge Base:**
```typescript
// Query Notion database
const pages = await notionService.queryDatabase(databaseId, {
  property: 'Tags',
  contains: 'important'
});

// Summarize for user
const summary = await ai.summarize(pages);
```

---

## Discord Integration

Discord is similar to Telegram but designed for communities.

### Step 1: Create Discord Bot

1. Go to https://discord.com/developers/applications
2. Click "New Application"
3. Navigate to "Bot"
4. Click "Add Bot"
5. **Save the Token!**
6. Enable "Message Content Intent"

### Step 2: Configuration

```env
# Discord Bot
DISCORD_BOT_TOKEN=your_token_here
DISCORD_CLIENT_ID=your_client_id
DISCORD_ENABLED=true
```

### Step 3: Discord Integration Service

```typescript
// src/lib/integrations/discord.ts

class DiscordService {
  private config: DiscordConfig | null = null;
  private baseUrl = 'https://discord.com/api/v10';
  
  async sendMessage(channelId: string, content: string): Promise<void> {
    await fetch(`${this.baseUrl}/channels/${channelId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bot ${this.config.botToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ content }),
    });
  }
  
  // Discord uses websockets for real-time, consider discord.js library
}

export const discordService = new DiscordService();
```

---

## Security Considerations

When connecting to external platforms, security is critical.

### 1. Verify Webhook Signatures

```typescript
// Always verify requests come from the platform

function verifyTelegramSignature(token: string, body: string): boolean {
  // Telegram doesn't sign webhooks, but you can verify the bot token
  return true; // In production, add IP whitelist
}

function verifySlackSignature(secret: string, body: string, signature: string, timestamp: string): boolean {
  const crypto = require('crypto');
  const base = `v0:${timestamp}:${body}`;
  const hmac = crypto.createHmac('sha256', secret).update(base).digest('hex');
  return `v0=${hmac}` === signature;
}

function verifyDiscordSignature(publicKey: string, body: string, signature: string, timestamp: string): boolean {
  // Use tweetnacl or similar for Ed25519 verification
}
```

### 2. Authorized Users Only

```typescript
// Only allow specific users

const ALLOWED_USERS = process.env.ALLOWED_TELEGRAM_USERS?.split(',') || [];

async function handleTelegramMessage(message: TelegramMessage) {
  const userId = message.from?.id?.toString();
  
  if (ALLOWED_USERS.length > 0 && !ALLOWED_USERS.includes(userId)) {
    console.log(`[Telegram] Unauthorized user: ${userId}`);
    return; // Ignore unauthorized users
  }
  
  // Process authorized message
}
```

### 3. Never Expose Secrets in Logs

```typescript
// Bad
console.log('Sending message with token:', botToken);

// Good
console.log('Sending message to chat:', chatId);
```

### 4. Rate Limiting

```typescript
// Prevent spam

const MESSAGE_COOLDOWN = 3000; // 3 seconds per user
const lastMessage = new Map<string, number>();

async function handleTelegramMessage(message: TelegramMessage) {
  const userId = message.from?.id?.toString();
  const now = Date.now();
  const last = lastMessage.get(userId) || 0;
  
  if (now - last < MESSAGE_COOLDOWN) {
    return; // Ignore messages during cooldown
  }
  
  lastMessage.set(userId, now);
  
  // Process message
}
```

---

## Multi-Platform Strategy

### Single Brain, Many Channels

Your AI Dashboard can handle all platforms simultaneously:

```
                 ┌─────────────┐
                 │   AI Core   │
                 │  (One Brain) │
                 └──────┬──────┘
                        │
        ┌───────────────┼───────────────┐
        │               │               │
   ┌────┴───┐    ┌─────┴─────┐    ┌─────┴────┐
   │Telegram│    │  Slack    │    │  Notion  │
   │Service │    │  Service  │    │ Service  │
   └────┬───┘    └─────┬─────┘    └─────┬────┘
        │               │               │
   ┌────┴───┐    ┌─────┴─────┐    ┌─────┴────┐
   │ Bot    │    │  Slack    │    │ Notion   │
   │API     │    │  API      │    │ API      │
   └────────┘    └───────────┘    └──────────┘
```

### Unified Message Handler

```typescript
// src/lib/integrations/unified-handler.ts

interface UnifiedMessage {
  platform: 'telegram' | 'slack' | 'discord' | 'notion';
  userId: string;
  userName: string;
  content: string;
  attachments?: File[];
  timestamp: number;
}

class UnifiedHandler {
  async process(message: UnifiedMessage): Promise<string> {
    // Log incoming message
    await this.logMessage(message);
    
    // Get conversation history
    const history = await this.getHistory(message.userId);
    
    // Generate AI response
    const response = await this.generateAIResponse(message, history);
    
    // Log outgoing message
    await this.logResponse(message.userId, response);
    
    return response;
  }
  
  private async generateAIResponse(message: UnifiedMessage, history: Message[]): Promise<string> {
    // Use your AI Dashboard's model router
    const modelRouter = getModelRouter();
    return await modelRouter.chat(message.content, { history });
  }
}

export const unifiedHandler = new UnifiedHandler();
```

---

## Platform Comparison

| Feature | Telegram | Slack | Discord | Notion |
|---------|----------|-------|---------|--------|
| **Cost** | Free | Free tier | Free | Free tier |
| **Setup Difficulty** | Easy | Medium | Medium | Medium |
| **Real-time Chat** | ✅ | ✅ | ✅ | ❌ |
| **File Support** | ✅ | ✅ | ✅ | ✅ |
| **Rich Formatting** | Markdown | Markdown | Markdown | Rich Text |
| **User Base** | General | Business | Gaming/Community | Productivity |
| **Best For** | Personal bots | Team notifications | Community | Knowledge base |
| **Webhook Security** | Basic | HMAC signatures | Ed25519 | Internal only |

---

## PROMPT YOU CAN USE

Here's a prompt to create a new messaging integration:

```
Create a messaging integration for [PLATFORM NAME] in my AI Dashboard.

## Platform Details
• Name: [PLATFORM NAME]
• API Documentation: [LINK TO API DOCS]
• Authentication: [OAuth / API Key / Token]

## What I Need
1. Integration service at src/lib/integrations/[platform].ts
2. Type definitions for:
   - Configuration
   - Messages
   - Events
3. API route for webhooks at src/app/api/[platform]/route.ts
4. Management page at src/app/[platform]/page.tsx
5. Environment variables in .env.example

## Requirements
• Send messages to platform
• Receive messages via webhook
• Parse commands (/[command] format)
• Route to AI for response
• Log all messages
• Handle errors gracefully
• Support message threading

## Security
• Verify webhook signatures
• Rate limiting per user
• Authorized user whitelist

Include TypeScript types and error handling.
```

---

## Key Takeaways

✅ **Same pattern for all platforms** — Config, Service, API Route, UI

✅ **Telegram is easiest** — Great for learning the pattern

✅ **Slack for business** — Perfect for team notifications

✅ **Notion for documents** — Knowledge base integration

✅ **Security matters** — Verify signatures, rate limit, whitelist

✅ **Unified core** — One AI handles all platforms

✅ **Use the prompt template** — Create new integrations quickly

---

**Next: Chapter 19 - Troubleshooting Common Issues**