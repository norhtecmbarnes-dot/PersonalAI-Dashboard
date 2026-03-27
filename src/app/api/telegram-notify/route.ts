export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import {
  sendTelegramMessage,
  getTelegramChatId,
  setTelegramChatId,
  getNotificationConfig,
  saveNotificationConfig,
  sendBriefingNotification,
} from '@/lib/integrations/telegram-notify';
import { loadTelegramConfig } from '@/lib/storage/telegram-config';
import { telegramService } from '@/lib/integrations/telegram';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, chatId, text, parseMode, notificationConfig } = body;

    switch (action) {
      case 'send': {
        if (!text) {
          return NextResponse.json({ error: 'Text is required' }, { status: 400 });
        }
        const success = await sendTelegramMessage({ text, parseMode });
        return NextResponse.json({ success, message: success ? 'Message sent' : 'Failed to send' });
      }

      case 'registerChat': {
        if (!chatId) {
          return NextResponse.json({ error: 'chatId is required' }, { status: 400 });
        }
        await setTelegramChatId(chatId);
        await sendTelegramMessage({
          chatId,
          text: '✅ Your chat has been registered for updates!',
          parseMode: 'Markdown',
        });
        return NextResponse.json({ success: true, message: 'Chat registered' });
      }

      case 'getChatId': {
        const storedChatId = await getTelegramChatId();
        return NextResponse.json({ chatId: storedChatId });
      }

      case 'test': {
        const success = await sendTelegramMessage({
          text: '🧪 *Test Message*\n\nThis is a test from your AI Research Assistant.',
          parseMode: 'Markdown',
        });
        return NextResponse.json({
          success,
          message: success ? 'Test message sent' : 'Failed to send',
        });
      }

      case 'testBriefing': {
        const success = await sendBriefingNotification({
          topNews: [{ title: 'Sample News Article', summary: 'This is a test briefing', url: '' }],
          taskReports: { completed: 5, recentReports: [] },
          upcomingEvents: [{ title: 'Sample Event', date: new Date().toLocaleDateString() }],
        });
        return NextResponse.json({
          success,
          message: success ? 'Test briefing sent' : 'Failed to send briefing',
        });
      }

      case 'setWebhook': {
        const config = await loadTelegramConfig();
        if (!config?.botToken) {
          return NextResponse.json({ error: 'Bot token not configured' }, { status: 400 });
        }

        const webhookUrl = body.url;
        if (!webhookUrl) {
          return NextResponse.json({ error: 'Webhook URL required' }, { status: 400 });
        }

        telegramService.setConfig({
          botToken: config.botToken,
          enabled: true,
          webhookUrl,
          allowedUsers: config.allowedUsers || [],
          chatWithAI: true,
          chatId: config.chatId,
        });

        const success = await telegramService.setWebhook(webhookUrl);
        return NextResponse.json({
          success,
          message: success ? 'Webhook set' : 'Failed to set webhook',
        });
      }

      case 'saveNotificationConfig': {
        if (!notificationConfig) {
          return NextResponse.json({ error: 'notificationConfig is required' }, { status: 400 });
        }
        await saveNotificationConfig(notificationConfig);
        return NextResponse.json({ success: true, message: 'Notification settings saved' });
      }

      default:
        return NextResponse.json(
          {
            error: 'Invalid action',
            availableActions: [
              'send',
              'registerChat',
              'getChatId',
              'test',
              'testBriefing',
              'setWebhook',
              'saveNotificationConfig',
            ],
          },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('[Telegram Notify] Error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  const chatId = await getTelegramChatId();
  const config = await loadTelegramConfig();
  const notifConfig = await getNotificationConfig();

  return NextResponse.json({
    configured: !!(config?.botToken && config?.enabled),
    hasChatId: !!chatId,
    chatId,
    botUsername: config?.username,
    notificationConfig: notifConfig,
  });
}
