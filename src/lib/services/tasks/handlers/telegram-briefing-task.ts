import type { ScheduledTask, TaskExecutionResult } from '@/lib/services/task-scheduler';

export async function executeTelegramBriefingTask(
  task: ScheduledTask
): Promise<TaskExecutionResult> {
  try {
    const { sendBriefingNotification, getNotificationConfig, isTelegramEnabled } =
      await import('@/lib/integrations/telegram-notify');
    const { intelligenceService } = await import('@/lib/intelligence/report-generator');
    const { sqlDatabase } = await import('@/lib/database/sqlite');

    if (!(await isTelegramEnabled())) {
      return {
        success: false,
        error: 'Telegram not configured or disabled',
      };
    }

    const notifConfig = await getNotificationConfig();
    if (!notifConfig.enabled || !notifConfig.dailyBriefing) {
      return {
        success: true,
        result: 'Telegram briefing notifications disabled',
      };
    }

    let intelligenceReport;
    try {
      intelligenceReport = await intelligenceService.generateReport();
    } catch (e) {
      intelligenceReport = intelligenceService.getLastReport();
    }

    const recentResults = sqlDatabase.getAllRecentTaskResults(5);
    const successfulResults = recentResults.filter(r => r.success);

    const now = Date.now();
    const future = now + 7 * 24 * 60 * 60 * 1000;
    const events = sqlDatabase.getEvents(now, future);

    const briefing = {
      topNews: (intelligenceReport?.newsSummary?.spaceDomainAwareness || [])
        .slice(0, 3)
        .map((article: any) => ({
          title: article.title,
          summary: article.summary?.slice(0, 100) || '',
          url: article.url,
        })),
      taskReports: {
        completed: successfulResults.length,
        recentReports: recentResults.slice(0, 5).map(r => ({
          taskName: r.task_name || r.task_id,
          success: !!r.success,
        })),
      },
      upcomingEvents: (events || []).slice(0, 3).map((e: any) => ({
        title: e.title,
        date: new Date(e.startDate).toLocaleDateString(),
      })),
    };

    const sent = await sendBriefingNotification(briefing);

    return {
      success: sent,
      result: sent ? 'Daily briefing sent to Telegram' : 'Failed to send briefing to Telegram',
      data: {
        newsCount: briefing.topNews.length,
        taskCount: briefing.taskReports.completed,
        eventCount: briefing.upcomingEvents.length,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send Telegram briefing',
    };
  }
}
