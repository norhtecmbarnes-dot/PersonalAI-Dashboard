export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { telegramService, TelegramUpdate, TelegramMessage, DEFAULT_COMMANDS, TelegramConfig } from '@/lib/integrations/telegram';
import { streamChatCompletion, getOllamaModels } from '@/lib/models/sdk.server';
import { performWebSearch } from '@/lib/websearch';
import { loadTelegramConfig as loadTelegramConfigFromFile } from '@/lib/storage/telegram-config';
import { sqlDatabase } from '@/lib/database/sqlite';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const update = body as TelegramUpdate;

    if (!update.message) {
      return NextResponse.json({ ok: true });
    }

    const message = update.message;
    const chatId = message.chat.id;
    const text = message.text?.trim() || '';
    const user = message.from;

    if (!user) {
      return NextResponse.json({ ok: true });
    }

    const fileConfig = await loadTelegramConfigFromFile();
    if (!fileConfig || !fileConfig.enabled) {
      return NextResponse.json({ ok: true });
    }
    
    const config: TelegramConfig = {
      botToken: fileConfig.botToken,
      enabled: fileConfig.enabled,
      webhookUrl: fileConfig.webhookUrl,
      chatWithAI: true,
      allowedUsers: [],
    };
    
    telegramService.setConfig(config);

    if (!telegramService.isUserAllowed(user.id)) {
      await telegramService.sendMessage(chatId, 'You are not authorized to use this bot.');
      return NextResponse.json({ ok: true });
    }

    await telegramService.sendChatAction(chatId, 'typing');

    if (text.startsWith('/start')) {
      const welcomeMessage = `*Welcome to AI Research Assistant!* 🤖

I'm your AI-powered assistant that can help you with:
• 💬 Chat with AI
• 🔍 Web Search
• 📊 Research & Analysis

Just send me a message and I'll respond using AI!`;
      await telegramService.sendMessage(chatId, welcomeMessage, 'Markdown');
      return NextResponse.json({ ok: true });
    }

    if (text.startsWith('/help')) {
      const helpMessage = `*Available Commands*:

/start - Start the bot
/help - Show this help
/search <query> - Search the web
/status - Check system status

You can also just send me a message and I'll respond using AI!`;
      await telegramService.sendMessage(chatId, helpMessage, 'Markdown');
      return NextResponse.json({ ok: true });
    }

    if (text.startsWith('/status')) {
      const statusMessage = `*System Status*:

• 🤖 AI Assistant: Online
• 🔍 Web Search: Available
• 📚 Knowledge Base: Connected`;
      await telegramService.sendMessage(chatId, statusMessage, 'Markdown');
      return NextResponse.json({ ok: true });
    }

    if (text.startsWith('/search ')) {
      const query = text.replace('/search ', '').trim();
      const results = await performWebSearch(query);
      
      const formattedResults = results.slice(0, 5).map((r, i) => 
        `${i + 1}. *${r.title}*\n   ${r.url}\n   ${r.excerpt?.slice(0, 100)}...`
      ).join('\n\n');

      const response = `*Search Results for:* "${query}"\n\n${formattedResults}`;
      await telegramService.sendMessage(chatId, response, 'Markdown');
      return NextResponse.json({ ok: true });
    }

    const aiResponse = await getAIResponse(text);
    await telegramService.sendMessage(chatId, aiResponse, 'Markdown');

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Telegram webhook error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function getAIResponse(message: string): Promise<string> {
  try {
    // Get user's default model preference
    sqlDatabase.initialize();
    const modelPrefs = sqlDatabase.getModelPreferences();
    
    // Use the user's configured default model, or let the system choose
    let model = modelPrefs.defaultModel;
    
    // If no default model is set, let the SDK choose the best available
    if (!model) {
      const ollamaModels = await getOllamaModels();
      if (ollamaModels.length > 0) {
        // Prefer qwen3.5:9b if available, otherwise use first available
        const preferredModel = ollamaModels.find(m => m.name.includes('qwen3.5:9b')) || ollamaModels[0];
        model = preferredModel.name.startsWith('ollama/') ? preferredModel.name : `ollama/${preferredModel.name}`;
      }
    }
    
    // The SDK will handle routing to the appropriate provider (Ollama, GLM, OpenRouter, etc.)
    const result = await streamChatCompletion({
      model: model || 'ollama/qwen3.5:9b', // Final fallback
      messages: [
        { role: 'user', content: message }
      ],
    });

    let content = result.message?.content || 'Sorry, I could not generate a response.';

    if (content.length > 4000) {
      content = content.slice(0, 4000) + '...\n\n(Message truncated)';
    }

    return content;
  } catch (error) {
    console.error('AI response error:', error);
    return 'Sorry, I encountered an error processing your request. Please try again.';
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const action = searchParams.get('action');

  // Load config for all actions that require bot token
  const loadConfigForAction = async (): Promise<boolean> => {
    const fileConfig = await loadTelegramConfigFromFile();
    if (!fileConfig?.botToken) {
      return false;
    }
    
    const config: TelegramConfig = {
      botToken: fileConfig.botToken,
      enabled: fileConfig.enabled,
      webhookUrl: fileConfig.webhookUrl,
      chatWithAI: true,
      allowedUsers: [],
    };
    
    telegramService.setConfig(config);
    return true;
  };

  switch (action) {
    case 'setWebhook': {
      const webhookUrl = searchParams.get('url');
      if (!webhookUrl) {
        return NextResponse.json({ error: 'Webhook URL required' }, { status: 400 });
      }
      if (!await loadConfigForAction()) {
        return NextResponse.json({ error: 'Bot not configured' }, { status: 400 });
      }
      const success = await telegramService.setWebhook(webhookUrl);
      return NextResponse.json({ success });
    }

    case 'deleteWebhook': {
      if (!await loadConfigForAction()) {
        return NextResponse.json({ error: 'Bot not configured' }, { status: 400 });
      }
      const success = await telegramService.deleteWebhook();
      return NextResponse.json({ success });
    }

    case 'webhookInfo': {
      if (!await loadConfigForAction()) {
        return NextResponse.json({ error: 'Bot not configured' }, { status: 400 });
      }
      const info = await telegramService.getWebhookInfo();
      return NextResponse.json(info);
    }

    case 'botInfo': {
      if (!await loadConfigForAction()) {
        return NextResponse.json({ error: 'Bot not configured' }, { status: 400 });
      }
      const info = await telegramService.getMe();
      return NextResponse.json(info);
    }

    case 'setup': {
      if (!await loadConfigForAction()) {
        return NextResponse.json({ error: 'Bot not configured' }, { status: 400 });
      }
      await telegramService.setCommands(DEFAULT_COMMANDS);
      return NextResponse.json({ success: true, message: 'Commands registered' });
    }

    default:
      return NextResponse.json({
        endpoints: {
          'POST': 'Handle incoming Telegram updates (webhook)',
          '?action=setWebhook&url=...': 'Set webhook URL',
          '?action=deleteWebhook': 'Delete webhook',
          '?action=webhookInfo': 'Get webhook info',
          '?action=botInfo': 'Get bot info',
          '?action=setup': 'Register bot commands',
        },
      });
  }
}
