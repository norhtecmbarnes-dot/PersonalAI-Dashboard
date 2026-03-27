import { telegramService } from '@/lib/integrations/telegram';
import { loadTelegramConfig } from '@/lib/storage/telegram-config';

export interface SendTelegramMessageOptions {
  chatId?: number;
  text: string;
  parseMode?: 'Markdown' | 'HTML';
}

export interface TelegramNotificationConfig {
  enabled: boolean;
  dailyBriefing: boolean;
  taskCompletion: boolean;
  security: boolean;
  intelligence: boolean;
  errors: boolean;
}

const NOTIFICATION_CONFIG_KEY = 'telegram_notifications';

export async function getNotificationConfig(): Promise<TelegramNotificationConfig> {
  try {
    const fs = await import('fs');
    const path = await import('path');
    const configFile = path.join(process.cwd(), 'data', 'telegram_notifications.json');

    if (!fs.existsSync(configFile)) {
      return {
        enabled: false,
        dailyBriefing: true,
        taskCompletion: false,
        security: true,
        intelligence: true,
        errors: true,
      };
    }

    const content = fs.readFileSync(configFile, 'utf-8');
    const data = JSON.parse(content);
    return { ...data };
  } catch {
    return {
      enabled: false,
      dailyBriefing: true,
      taskCompletion: false,
      security: true,
      intelligence: true,
      errors: true,
    };
  }
}

export async function saveNotificationConfig(config: TelegramNotificationConfig): Promise<void> {
  const fs = await import('fs');
  const path = await import('path');
  const dataDir = path.join(process.cwd(), 'data');
  const configFile = path.join(dataDir, 'telegram_notifications.json');

  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  fs.writeFileSync(configFile, JSON.stringify(config, null, 2));
}

export async function isTelegramEnabled(): Promise<boolean> {
  const config = await loadTelegramConfig();
  return !!(config?.enabled && config?.botToken && config?.chatId);
}

export async function sendTelegramMessage(options: SendTelegramMessageOptions): Promise<boolean> {
  try {
    const config = await loadTelegramConfig();

    if (!config || !config.enabled || !config.botToken) {
      return false;
    }

    const chatId = options.chatId || config.chatId;
    if (!chatId) {
      return false;
    }

    telegramService.setConfig({
      botToken: config.botToken,
      enabled: true,
      webhookUrl: config.webhookUrl,
      allowedUsers: config.allowedUsers || [],
      chatWithAI: true,
    });

    return await telegramService.sendMessage(chatId, options.text, options.parseMode || 'Markdown');
  } catch (error) {
    console.error('[Telegram] Error sending message:', error);
    return false;
  }
}

export async function sendBriefingNotification(briefing: {
  topNews?: Array<{ title: string; summary: string; url: string }>;
  taskReports?: { completed: number; recentReports: Array<{ taskName: string; success: boolean }> };
  upcomingEvents?: Array<{ title: string; date: string }>;
}): Promise<boolean> {
  const notifConfig = await getNotificationConfig();
  if (!notifConfig.enabled || !notifConfig.dailyBriefing) {
    return false;
  }

  if (!(await isTelegramEnabled())) {
    return false;
  }

  const lines: string[] = [`📰 *Daily Briefing*`, `📅 ${new Date().toLocaleDateString()}`, ''];

  if (briefing.topNews && briefing.topNews.length > 0) {
    lines.push('📰 *Top News:*');
    briefing.topNews.slice(0, 3).forEach((news, i) => {
      const title = news.title.length > 60 ? news.title.slice(0, 57) + '...' : news.title;
      lines.push(`${i + 1}. ${title}`);
    });
    lines.push('');
  }

  if (briefing.taskReports && briefing.taskReports.completed > 0) {
    lines.push(`✅ *Tasks Completed:* ${briefing.taskReports.completed}`);
    lines.push('');
  }

  if (briefing.upcomingEvents && briefing.upcomingEvents.length > 0) {
    lines.push('📅 *Upcoming Events:*');
    briefing.upcomingEvents.slice(0, 3).forEach(event => {
      lines.push(`• ${event.title} - ${event.date}`);
    });
  }

  return sendTelegramMessage({
    text: lines.join('\n'),
    parseMode: 'Markdown',
  });
}

export async function sendTaskCompletionNotification(task: {
  name: string;
  taskType: string;
  success: boolean;
  result?: string;
}): Promise<boolean> {
  const notifConfig = await getNotificationConfig();
  if (!notifConfig.enabled || !notifConfig.taskCompletion) {
    return false;
  }

  if (!(await isTelegramEnabled())) {
    return false;
  }

  const emoji = task.success ? '✅' : '❌';
  const status = task.success ? 'Completed' : 'Failed';

  let text = `${emoji} *Task ${status}*\n`;
  text += `📋 ${task.name}\n`;
  text += `📁 Type: ${task.taskType}\n`;

  if (task.result) {
    const shortResult = task.result.length > 200 ? task.result.slice(0, 197) + '...' : task.result;
    text += `📊 Result: ${shortResult}\n`;
  }

  return sendTelegramMessage({ text, parseMode: 'Markdown' });
}

export async function sendSecurityNotification(findings: {
  count: number;
  riskScore: number;
  critical?: number;
  high?: number;
}): Promise<boolean> {
  const notifConfig = await getNotificationConfig();
  if (!notifConfig.enabled || !notifConfig.security) {
    return false;
  }

  if (!(await isTelegramEnabled())) {
    return false;
  }

  let text = '🔒 *Security Scan Results*\n';
  text += `📊 Risk Score: ${findings.riskScore}/100\n`;
  text += `🔍 Findings: ${findings.count}\n`;

  if (findings.critical) text += `🔴 Critical: ${findings.critical}\n`;
  if (findings.high) text += `🟠 High: ${findings.high}\n`;

  if (findings.riskScore > 50) {
    text += '\n⚠️ *Action Required*\n';
  }

  return sendTelegramMessage({ text, parseMode: 'Markdown' });
}

export async function sendIntelligenceNotification(report: {
  articles?: number;
  opportunities?: number;
  summary?: string;
}): Promise<boolean> {
  const notifConfig = await getNotificationConfig();
  if (!notifConfig.enabled || !notifConfig.intelligence) {
    return false;
  }

  if (!(await isTelegramEnabled())) {
    return false;
  }

  let text = '🔍 *Intelligence Report*\n';
  text += `📰 Articles: ${report.articles || 0}\n`;
  text += `📋 Opportunities: ${report.opportunities || 0}\n`;

  if (report.summary) {
    const shortSummary =
      report.summary.length > 300 ? report.summary.slice(0, 297) + '...' : report.summary;
    text += `\n📝 Summary:\n${shortSummary}\n`;
  }

  return sendTelegramMessage({ text, parseMode: 'Markdown' });
}

export async function sendErrorNotification(error: {
  task?: string;
  message: string;
  timestamp?: number;
}): Promise<boolean> {
  const notifConfig = await getNotificationConfig();
  if (!notifConfig.enabled || !notifConfig.errors) {
    return false;
  }

  if (!(await isTelegramEnabled())) {
    return false;
  }

  let text = '⚠️ *Error Alert*\n';

  if (error.task) {
    text += `📋 Task: ${error.task}\n`;
  }

  const shortMessage =
    error.message.length > 300 ? error.message.slice(0, 297) + '...' : error.message;
  text += `❌ ${shortMessage}\n`;
  text += `🕐 ${new Date(error.timestamp || Date.now()).toLocaleString()}`;

  return sendTelegramMessage({ text, parseMode: 'Markdown' });
}

export async function getTelegramChatId(): Promise<number | null> {
  try {
    const config = await loadTelegramConfig();
    return config?.chatId || null;
  } catch (error) {
    console.error('[Telegram] Error getting chatId:', error);
    return null;
  }
}

export async function setTelegramChatId(chatId: number): Promise<void> {
  try {
    const config = await loadTelegramConfig();
    const updatedConfig = {
      ...config,
      chatId,
    };

    const fs = await import('fs');
    const path = await import('path');
    const dataDir = path.join(process.cwd(), 'data');
    const configFile = path.join(dataDir, 'telegram_config.json');

    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    fs.writeFileSync(
      configFile,
      JSON.stringify(
        {
          telegram: updatedConfig,
          updatedAt: Date.now(),
        },
        null,
        2
      )
    );

    console.log('[Telegram] ChatId saved:', chatId);
  } catch (error) {
    console.error('[Telegram] Error saving chatId:', error);
    throw error;
  }
}
