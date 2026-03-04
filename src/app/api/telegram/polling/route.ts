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

  console.log('[Telegram Polling] Received message:', { chatId, text: text.substring(0, 50), user: user?.username || user?.id });

  if (!user) {
    console.log('[Telegram Polling] No user info, skipping');
    return;
  }

  try {
    const prefs = await loadTelegramConfig();
    console.log('[Telegram Polling] Config loaded:', { hasConfig: !!prefs, enabled: prefs?.enabled });
    
    if (!prefs || !prefs.enabled) {
      console.log('[Telegram Polling] Bot not enabled, skipping');
      return;
    }

    const config: TelegramConfig = {
      botToken: prefs.botToken,
      enabled: prefs.enabled,
      webhookUrl: prefs.webhookUrl,
      chatWithAI: true,
      allowedUsers: [],
    };

    telegramService.setConfig(config);

    if (!telegramService.isUserAllowed(user.id)) {
      console.log('[Telegram Polling] User not allowed:', user.id);
      await telegramService.sendMessage(chatId, 'You are not authorized to use this bot.');
      return;
    }

    console.log('[Telegram Polling] User authorized, sending typing action');
    await telegramService.sendChatAction(chatId, 'typing');

    if (text.startsWith('/start')) {
      console.log('[Telegram Polling] Handling /start command');
      const welcomeMessage = `*Welcome to PersonalAI Dashboard!* 🤖

I'm your AI-powered assistant that can help you with:
• 💬 Chat with AI
• 🔍 Web Search
• 📊 Research & Analysis

Just send me a message and I'll respond using AI!`;
      await telegramService.sendMessage(chatId, welcomeMessage, 'Markdown');
      return;
    }

    if (text.startsWith('/help')) {
      console.log('[Telegram Polling] Handling /help command');
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
      console.log('[Telegram Polling] Handling /status command');
      const statusMessage = `*System Status*:

• 🤖 AI Assistant: Online
• 🔍 Web Search: Available
• 📚 Knowledge Base: Connected`;
      await telegramService.sendMessage(chatId, statusMessage, 'Markdown');
      return;
    }

    if (text.startsWith('/search ')) {
      console.log('[Telegram Polling] Handling /search command');
      const query = text.replace('/search ', '').trim();
      const results = await performWebSearch(query);
      
      const formattedResults = results.slice(0, 5).map((r, i) => 
        `${i + 1}. *${r.title}*\n   ${r.url}\n   ${r.excerpt?.slice(0, 100)}...`
      ).join('\n\n');

      const response = `*Search Results for:* "${query}"\n\n${formattedResults}`;
      await telegramService.sendMessage(chatId, response, 'Markdown');
      return;
    }

    console.log('[Telegram Polling] Getting AI response for:', text.substring(0, 50));
    const aiResponse = await getAIResponse(text);
    console.log('[Telegram Polling] AI response received:', aiResponse.substring(0, 100));
    
    console.log('[Telegram Polling] Sending response to Telegram');
    const sent = await telegramService.sendMessage(chatId, aiResponse, 'Markdown');
    console.log('[Telegram Polling] Message sent:', sent);
    
  } catch (error) {
    console.error('[Telegram Polling] Error in handleMessage:', error);
    try {
      await telegramService.sendMessage(chatId, 'Sorry, I encountered an error processing your message. Please try again.');
    } catch (sendError) {
      console.error('[Telegram Polling] Failed to send error message:', sendError);
    }
  }
}

async function getAIResponse(message: string): Promise<string> {
  console.log('[Telegram Polling] getAIResponse called with:', message.substring(0, 50));
  
  try {
    // Get user's default model preference - use whatever they have configured
    console.log('[Telegram Polling] Initializing database...');
    await sqlDatabase.initialize();
    
    console.log('[Telegram Polling] Getting model preferences...');
    const modelPrefs = sqlDatabase.getModelPreferences();
    console.log('[Telegram Polling] Model preferences:', modelPrefs);
    
    // Use the user's configured default model, or let the system choose
    let model = modelPrefs.defaultModel;
    console.log('[Telegram Polling] Default model from prefs:', model);
    
    // If no default model is set, let the SDK choose the best available
    if (!model) {
      console.log('[Telegram Polling] No default model, checking Ollama...');
      const ollamaModels = await getOllamaModels();
      console.log('[Telegram Polling] Available Ollama models:', ollamaModels.length);
      
      if (ollamaModels.length > 0) {
        // Prefer qwen2.5-coder if available, otherwise use first available
        const preferredModel = ollamaModels.find(m => m.name.includes('qwen2.5-coder')) || ollamaModels[0];
        model = preferredModel.name.startsWith('ollama/') ? preferredModel.name : `ollama/${preferredModel.name}`;
        console.log('[Telegram Polling] Selected model:', model);
      } else {
        console.log('[Telegram Polling] No Ollama models available');
        return 'No AI models available. Please check that Ollama is running and has models installed.';
      }
    }
    
    // Final fallback
    if (!model) {
      model = 'ollama/qwen2.5-coder';
      console.log('[Telegram Polling] Using fallback model:', model);
    }
    
    // The SDK will handle routing to the appropriate provider (Ollama, GLM, OpenRouter, etc.)
    console.log('[Telegram Polling] Calling chatCompletion with model:', model);
    const result = await chatCompletion({
      model: model,
      messages: [{ role: 'user', content: message }],
    });

    console.log('[Telegram Polling] chatCompletion result:', result ? 'success' : 'null');
    
    let content = result.message?.content || 'Sorry, I could not generate a response.';
    console.log('[Telegram Polling] Response content:', content.substring(0, 100));
    
    if (typeof content === 'object') {
      content = JSON.stringify(content);
    }

    if (content.length > 4000) {
      content = content.slice(0, 4000) + '...\n\n(Message truncated)';
    }

    return content;
  } catch (error) {
    console.error('[Telegram Polling] AI response error:', error);
    if (error instanceof Error) {
      return `Sorry, I encountered an error: ${error.message}`;
    }
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