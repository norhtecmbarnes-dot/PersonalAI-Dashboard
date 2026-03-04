import { NextRequest, NextResponse } from 'next/server';
import { telegramService } from '@/lib/integrations/telegram';
import { saveTelegramConfig, loadTelegramConfig, verifyTelegramToken } from '@/lib/storage/telegram-config';

export async function GET() {
  const config = await loadTelegramConfig();
  
  return NextResponse.json({
    config: {
      enabled: config?.enabled || false,
      botToken: config?.botToken || '',
      chatWithAI: true,
      allowedUsers: [],
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, config } = body;

    switch (action) {
      case 'save': {
        const botToken = config?.botToken || '';
        const enabled = config?.enabled || false;

        if (!botToken) {
          return NextResponse.json({ error: 'Bot token required' }, { status: 400 });
        }

        try {
          const botInfo = await verifyTelegramToken(botToken);

          if (!botInfo) {
            return NextResponse.json({ error: 'Invalid bot token' }, { status: 400 });
          }

          await saveTelegramConfig({
            botToken,
            enabled,
            webhookUrl: config?.webhookUrl,
            username: botInfo.username,
          });

          telegramService.setConfig({
            botToken,
            enabled,
            chatWithAI: true,
            allowedUsers: [],
          });

          return NextResponse.json({
            success: true,
            bot: {
              id: botInfo.id,
              username: botInfo.username,
              first_name: botInfo.first_name,
            },
            message: `Connected to bot @${botInfo.username}`,
          });
        } catch (error) {
          console.error('[Telegram Config] Verify error:', error);
          return NextResponse.json({ 
            error: 'Failed to connect to Telegram: ' + (error instanceof Error ? error.message : 'Unknown error')
          }, { status: 500 });
        }
      }

      case 'setWebhook': {
        const currentConfig = await loadTelegramConfig();
        if (!currentConfig?.botToken) {
          return NextResponse.json({ error: 'Bot not configured' }, { status: 400 });
        }

        const webhookUrl = config?.webhookUrl;
        if (!webhookUrl) {
          return NextResponse.json({ error: 'Webhook URL required' }, { status: 400 });
        }

        telegramService.setConfig({
          botToken: currentConfig.botToken,
          enabled: currentConfig.enabled,
          chatWithAI: true,
          allowedUsers: [],
        });

        const success = await telegramService.setWebhook(webhookUrl);
        return NextResponse.json({ success });
      }

      case 'deleteWebhook': {
        const currentConfig = await loadTelegramConfig();
        if (!currentConfig?.botToken) {
          return NextResponse.json({ error: 'Bot not configured' }, { status: 400 });
        }

        telegramService.setConfig({
          botToken: currentConfig.botToken,
          enabled: currentConfig.enabled,
          chatWithAI: true,
          allowedUsers: [],
        });

        const success = await telegramService.deleteWebhook();
        return NextResponse.json({ success });
      }

      case 'setup': {
        const currentConfig = await loadTelegramConfig();
        if (!currentConfig?.botToken) {
          return NextResponse.json({ error: 'Bot not configured' }, { status: 400 });
        }

        telegramService.setConfig({
          botToken: currentConfig.botToken,
          enabled: currentConfig.enabled,
          chatWithAI: true,
          allowedUsers: [],
        });

        await telegramService.setCommands([
          { command: 'start', description: 'Start the bot' },
          { command: 'help', description: 'Get help' },
          { command: 'status', description: 'Check system status' },
          { command: 'search', description: 'Search the web' },
        ]);

        return NextResponse.json({ success: true, message: 'Commands registered' });
      }

      case 'test': {
        const currentConfig = await loadTelegramConfig();
        if (!currentConfig?.botToken) {
          return NextResponse.json({ 
            connected: false,
            error: 'Bot not configured' 
          });
        }

        telegramService.setConfig({
          botToken: currentConfig.botToken,
          enabled: currentConfig.enabled,
          chatWithAI: true,
          allowedUsers: [],
        });

        const botInfo = await telegramService.getMe();
        const webhookInfo = await telegramService.getWebhookInfo();

        return NextResponse.json({
          connected: !!botInfo,
          bot: botInfo,
          webhook: webhookInfo,
        });
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('[Telegram Config] Error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}