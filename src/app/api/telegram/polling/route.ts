export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { telegramService } from '@/lib/integrations/telegram';
import { chatCompletion, getOllamaModels } from '@/lib/models/sdk.server';
import { performWebSearch } from '@/lib/websearch';
import { loadTelegramConfig } from '@/lib/storage/telegram-config';
import { sqlDatabase } from '@/lib/database/sqlite';

type TelegramConfig = {
  botToken: string;
  enabled: boolean;
  webhookUrl?: string;
  chatWithAI: boolean;
  allowedUsers: string[];
};

async function handleMessage(message: any) {
  const chatId = message.chat.id;
  const text = message.text?.trim() || '';
  const user = message.from;

  if (!user) return;

  const prefs = await loadTelegramConfig();
  if (!prefs || !prefs.enabled) return;

  const config: TelegramConfig = {
    botToken: prefs.botToken,
    enabled: prefs.enabled,
    webhookUrl: prefs.webhookUrl,
    chatWithAI: true,
    allowedUsers: [],
  };

  telegramService.setConfig(config);

  if (!telegramService.isUserAllowed(user.id)) {
    await telegramService.sendMessage(chatId, 'You are not authorized to use this bot.');
    return;
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
    return;
  }

  if (text.startsWith('/help')) {
    const helpMessage = `*Available Commands*:

/start - Start the bot
/help - Show this help
/search <query> - Search the web
/status - Check system status

You can also just send me a message and I'll respond using AI!`;
    await telegramService.sendMessage(chatId, helpMessage, 'Markdown');
    return;
  }

  if (text.startsWith('/status')) {
    const statusMessage = `*System Status*:

• 🤖 AI Assistant: Online
• 🔍 Web Search: Available
• 📚 Knowledge Base: Connected`;
    await telegramService.sendMessage(chatId, statusMessage, 'Markdown');
    return;
  }

  if (text.startsWith('/search ')) {
    const query = text.replace('/search ', '').trim();
    const results = await performWebSearch(query);
    
    const formattedResults = results.slice(0, 5).map((r, i) => 
      `${i + 1}. *${r.title}*\n   ${r.url}\n   ${r.excerpt?.slice(0, 100)}...`
    ).join('\n\n');

    const response = `*Search Results for:* "${query}"\n\n${formattedResults}`;
    await telegramService.sendMessage(chatId, response, 'Markdown');
    return;
  }

  const aiResponse = await getAIResponse(text);
  await telegramService.sendMessage(chatId, aiResponse, 'Markdown');
}

async function getAIResponse(message: string): Promise<string> {
  try {
    // Get user's default model preference - use whatever they have configured
    await sqlDatabase.initialize();
    const modelPrefs = sqlDatabase.getModelPreferences();
    
    // Use the user's configured default model, or let the system choose
    let model = modelPrefs.defaultModel;
    
    // If no default model is set, let the SDK choose the best available
    if (!model) {
      const ollamaModels = await getOllamaModels();
      if (ollamaModels.length > 0) {
        // Prefer qwen2.5-coder if available, otherwise use first available
        const preferredModel = ollamaModels.find(m => m.name.includes('qwen2.5-coder')) || ollamaModels[0];
        model = preferredModel.name.startsWith('ollama/') ? preferredModel.name : `ollama/${preferredModel.name}`;
      }
    }
    
    // The SDK will handle routing to the appropriate provider (Ollama, GLM, OpenRouter, etc.)
    const result = await chatCompletion({
      model: model || 'ollama/qwen2.5-coder', // Final fallback
      messages: [{ role: 'user', content: message }],
    });

    let content = result.message?.content || 'Sorry, I could not generate a response.';
    if (typeof content === 'object') {
      content = JSON.stringify(content);
    }

    if (content.length > 4000) {
      content = content.slice(0, 4000) + '...\n\n(Message truncated)';
    }

    return content;
  } catch (error) {
    console.error('[Telegram] AI response error:', error);
    return 'Sorry, I encountered an error processing your request. Please try again.';
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    const prefs = await loadTelegramConfig();
    if (!prefs?.botToken) {
      return NextResponse.json({ error: 'Bot not configured' }, { status: 400 });
    }

    const config: TelegramConfig = {
      botToken: prefs.botToken,
      enabled: prefs.enabled,
      webhookUrl: prefs.webhookUrl,
      chatWithAI: true,
      allowedUsers: [],
    };

    telegramService.setConfig(config);

    if (action === 'start') {
      telegramService.setOnMessage(handleMessage);
      telegramService.startPolling();
      return NextResponse.json({ success: true, status: 'polling' });
    }

    if (action === 'stop') {
      telegramService.stopPolling();
      return NextResponse.json({ success: true, status: 'stopped' });
    }

    return NextResponse.json({ error: 'Invalid action. Use: start or stop' }, { status: 400 });
  } catch (error) {
    console.error('Telegram polling error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const prefs = await loadTelegramConfig();
  
  if (!prefs?.botToken) {
    return NextResponse.json({ 
      polling: false, 
      error: 'Bot not configured' 
    });
  }

  const config: TelegramConfig = {
    botToken: prefs.botToken,
    enabled: prefs.enabled,
    webhookUrl: prefs.webhookUrl,
    chatWithAI: true,
    allowedUsers: [],
  };

  telegramService.setConfig(config);

  return NextResponse.json({
    polling: telegramService.isPolling(),
    enabled: prefs.enabled,
  });
}