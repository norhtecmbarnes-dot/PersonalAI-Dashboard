export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { sqlDatabase } from '@/lib/database/sqlite';
import { streamChatCompletion } from '@/lib/models/sdk.server';

export async function GET(request: Request) {
  try {
    await sqlDatabase.initialize();

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const todayEnd = todayStart + 24 * 60 * 60 * 1000;
    const weekEnd = todayStart + 7 * 24 * 60 * 60 * 1000;

    // Get today's events
    const todayEvents = sqlDatabase.getEvents(todayStart, todayEnd) || [];

    // Get upcoming events (next 7 days)
    const upcomingEvents = sqlDatabase.getEvents(todayStart, weekEnd) || [];

    // Get pending tasks
    const allTasks = sqlDatabase.getTasks() || [];
    const pendingTasks = allTasks.filter((t: any) => t.status === 'pending' || t.status === 'in_progress');

    // Get recent documents (last 7 days)
    const recentDocs = sqlDatabase.getDocuments 
      ? (sqlDatabase.getDocuments() || []).filter((d: any) => d.createdAt > Date.now() - 7 * 24 * 60 * 60 * 1000)
      : [];

    const tickler = {
      date: now.toISOString().split('T')[0],
      dayOfWeek: now.toLocaleDateString('en-US', { weekday: 'long' }),
      greeting: getGreeting(),
      today: {
        events: todayEvents.map(formatEvent),
        eventCount: todayEvents.length,
      },
      upcoming: {
        events: upcomingEvents.slice(0, 10).map(formatEvent),
        eventCount: upcomingEvents.length,
      },
      tasks: {
        pending: pendingTasks.length,
        list: pendingTasks.slice(0, 5),
      },
      documents: {
        recent: recentDocs.length,
      },
    };

    if (action === 'briefing') {
      return await generateBriefing(tickler);
    }

    return NextResponse.json(tickler);
  } catch (error) {
    console.error('Tickler error:', error);
    return NextResponse.json({ error: 'Failed to get tickler data' }, { status: 500 });
  }
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function formatEvent(event: any): any {
  const date = new Date(event.startDate);
  return {
    id: event.id,
    title: event.title,
    time: date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
    location: event.location,
    status: event.status,
  };
}

async function generateBriefing(tickler: any): Promise<Response> {
  const prompt = `Generate a brief, professional daily briefing for ${tickler.dayOfWeek}, ${tickler.date}.

Today's schedule:
${tickler.today.events.map((e: any) => `- ${e.time}: ${e.title}${e.location ? ` at ${e.location}` : ''}`).join('\n') || 'No events scheduled'}

Upcoming this week:
${tickler.upcoming.events.slice(0, 5).map((e: any) => `- ${e.title}`).join('\n') || 'No upcoming events'}

Pending tasks: ${tickler.tasks.pending}

Generate a concise daily briefing that:
1. Greets the user appropriately for the time of day
2. Summarizes today's schedule in a natural way
3. Mentions any upcoming important events this week
4. Notes how many pending tasks there are
5. Offers helpful suggestions for the day

Keep it under 200 words. Be professional but friendly.`;

  try {
    const result = await streamChatCompletion({
      model: 'ollama/qwen3.5:9b',
      messages: [{ role: 'user', content: prompt }],
    });

    const content = result.message?.content || String(result.message) || '';
    
    return NextResponse.json({
      ...tickler,
      briefing: content,
    });
  } catch (error) {
    // Fallback to static briefing if AI fails
    const fallback = generateFallbackBriefing(tickler);
    return NextResponse.json({
      ...tickler,
      briefing: fallback,
    });
  }
}

function generateFallbackBriefing(tickler: any): string {
  const parts = [`${tickler.greeting}! It's ${tickler.dayOfWeek}, ${tickler.date}.`];

  if (tickler.today.eventCount > 0) {
    parts.push(`You have ${tickler.today.eventCount} event${tickler.today.eventCount > 1 ? 's' : ''} scheduled for today.`);
    tickler.today.events.forEach((e: any) => {
      parts.push(`  • ${e.time} - ${e.title}${e.location ? ` at ${e.location}` : ''}`);
    });
  } else {
    parts.push('You have no events scheduled for today.');
  }

  if (tickler.upcoming.eventCount > tickler.today.eventCount) {
    parts.push(`You have ${tickler.upcoming.eventCount - tickler.today.eventCount} more events coming up this week.`);
  }

  if (tickler.tasks.pending > 0) {
    parts.push(`You have ${tickler.tasks.pending} pending task${tickler.tasks.pending > 1 ? 's' : ''} to complete.`);
  }

  return parts.join('\n\n');
}