/**
 * Calendar Get Events Tool
 * Retrieve calendar events for a date range
 */

import type { Tool, ToolResult } from './tool-types';

export const calendarGetEventsTool: Tool = {
  name: 'calendar_get_events',
  description:
    'Get calendar events for a date range. Use when user asks about their schedule or upcoming events.',
  parameters: {
    start_date: {
      type: 'string',
      description: 'Start date (ISO format or "today", "tomorrow")',
      required: false,
    },
    end_date: { type: 'string', description: 'End date (ISO format)', required: false },
    days: {
      type: 'number',
      description: 'Number of days to look ahead (default 7)',
      required: false,
    },
  },
  execute: async (params): Promise<ToolResult> => {
    try {
      const { sqlDatabase } = await import('@/lib/database/sqlite');
      sqlDatabase.initialize();

      const now = new Date();
      let startDate: number;
      let endDate: number;

      if (params.start_date === 'today') {
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      } else if (params.start_date === 'tomorrow') {
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime();
      } else if (params.start_date) {
        startDate = new Date(params.start_date).getTime();
      } else {
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      }

      const days = params.days || 7;
      endDate = startDate + days * 24 * 60 * 60 * 1000;

      const events = sqlDatabase.getEvents(startDate, endDate);

      const formattedEvents = events.map((e: any) => ({
        id: e.id,
        title: e.title,
        date: new Date(e.startDate).toLocaleDateString(),
        time: new Date(e.startDate).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        }),
        location: e.location,
      }));

      return {
        success: true,
        data: { events: formattedEvents, count: formattedEvents.length },
      };
    } catch (error) {
      return { success: false, error: 'Failed to get events' };
    }
  },
};
