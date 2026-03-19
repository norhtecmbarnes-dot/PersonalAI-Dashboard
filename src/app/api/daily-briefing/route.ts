import { NextResponse } from 'next/server';
import { intelligenceService } from '@/lib/intelligence/report-generator';
import { sqlDatabase } from '@/lib/database/sqlite';
import { memoryStore } from '@/lib/memory/persistent-store';
import { taskScheduler } from '@/lib/services/task-scheduler';

export interface DailyBriefing {
  date: string;
  generatedAt: number;
  intelligence: {
    topNews: Array<{ title: string; summary: string; url: string; source: string }>;
    bidOpportunities: Array<{
      title: string;
      agency: string;
      amount?: string;
      deadline?: string;
      url?: string;
    }>;
  };
  tasks: {
    pending: Array<{ title: string; dueDate?: string; priority: string; id?: string }>;
    completed: number;
  };
  calendar: {
    upcoming: Array<{ title: string; date: string; type: string; id?: string }>;
  };
  memory: {
    recentLearnings: Array<{ key: string; content: string; category: string }>;
  };
}

export async function GET() {
  try {
    // Get or generate intelligence report
    let intelligenceReport;
    try {
      intelligenceReport = await intelligenceService.generateReport();
    } catch (e) {
      intelligenceReport = intelligenceService.getLastReport();
    }

    // Get pending tasks from database
    let tasks: {
      pending: Array<{ title: string; dueDate?: string; priority: string; id?: string }>;
      completed: number;
    } = { pending: [], completed: 0 };
    try {
      const db = sqlDatabase;
      db.initialize();
      const pendingTasks = db.getTasks('pending');
      const completedTasks = db.getTasks('completed');

      tasks = {
        pending: (pendingTasks || []).map((t: any) => ({
          id: t.id,
          title: t.title,
          dueDate: t.dueDate ? new Date(t.dueDate).toLocaleDateString() : undefined,
          priority: t.priority || 'medium',
        })),
        completed: (completedTasks || []).length,
      };
    } catch (e) {
      console.error('Error loading tasks:', e);
    }

    // Get upcoming events from calendar
    let calendar: { upcoming: Array<{ title: string; date: string; type: string; id?: string }> } =
      { upcoming: [] };
    try {
      const db = sqlDatabase;
      const now = Date.now();
      const future = now + 7 * 24 * 60 * 60 * 1000; // Next 7 days
      const events = db.getEvents(now, future);
      calendar.upcoming = (events || []).slice(0, 5).map((e: any) => ({
        id: e.id,
        title: e.title,
        date: new Date(e.startDate).toLocaleDateString(),
        type: e.eventType || 'Event',
      }));
    } catch (e) {
      console.error('Error loading calendar:', e);
    }

    // Get recent memories/learnings
    let memory: { recentLearnings: Array<{ key: string; content: string; category: string }> } = {
      recentLearnings: [],
    };
    try {
      const memories = await memoryStore.search('learning', { limit: 5, category: 'knowledge' });
      memory.recentLearnings = (memories || []).map((m: any) => ({
        key: m.memory.key,
        content: m.memory.content.slice(0, 150),
        category: m.memory.category,
      }));
    } catch (e) {
      console.error('Error loading memory:', e);
    }

    // Build briefing
    const briefing: DailyBriefing = {
      date: new Date().toLocaleDateString(),
      generatedAt: Date.now(),
      intelligence: {
        topNews: (intelligenceReport?.newsSummary?.spaceDomainAwareness || [])
          .slice(0, 5)
          .map((article: any) => ({
            title: article.title,
            summary: article.summary?.slice(0, 200) || '',
            url: article.url,
            source: article.source,
          })),
        bidOpportunities: (intelligenceReport?.bidOpportunities?.samGov || [])
          .slice(0, 5)
          .map((opp: any) => ({
            title: opp.title,
            agency: opp.agency || 'Unknown',
            amount: opp.awardAmount,
            deadline: opp.responseDeadline,
            url: opp.url,
          })),
      },
      tasks,
      calendar,
      memory,
    };

    return NextResponse.json({ briefing });
  } catch (error) {
    console.error('Error generating daily briefing:', error);
    return NextResponse.json({ error: 'Failed to generate daily briefing' }, { status: 500 });
  }
}

export async function POST() {
  try {
    // Regenerate intelligence report
    await intelligenceService.generateReport();

    // Return updated briefing
    return GET();
  } catch (error) {
    console.error('Error regenerating briefing:', error);
    return NextResponse.json({ error: 'Failed to regenerate briefing' }, { status: 500 });
  }
}
