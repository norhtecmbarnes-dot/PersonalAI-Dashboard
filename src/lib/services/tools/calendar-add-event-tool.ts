/**
 * Calendar Add Event Tool
 * Add events to the calendar
 */

import type { Tool, ToolResult } from './tool-types';

export const calendarAddEventTool: Tool = {
  name: 'calendar_add_event',
  description:
    'Add an event to the calendar. Use this when the user wants to schedule something, make an appointment, or add a reminder.',
  parameters: {
    title: { type: 'string', description: 'Event title/name', required: true },
    start_date: {
      type: 'string',
      description:
        'Start date and time in ISO format or natural language (e.g., "2024-03-02T09:00:00" or "March 2nd at 9am")',
      required: true,
    },
    end_date: { type: 'string', description: 'End date and time (optional)', required: false },
    description: { type: 'string', description: 'Event description', required: false },
    location: { type: 'string', description: 'Event location', required: false },
    attendees: {
      type: 'string',
      description: 'Comma-separated list of attendee emails',
      required: false,
    },
  },
  execute: async (params): Promise<ToolResult> => {
    try {
      const { sqlDatabase } = await import('@/lib/database/sqlite');
      sqlDatabase.initialize();

      const parseDate = (dateStr: string): number => {
        if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(dateStr)) {
          return new Date(dateStr).getTime();
        }
        const parsed = new Date(dateStr);
        if (!isNaN(parsed.getTime())) {
          return parsed.getTime();
        }
        const now = new Date();
        const match = dateStr.match(
          /(?:march|april|may|june|july|august|september|october|november|december|january|february)\s+(\d{1,2})(?:st|nd|rd|th)?(?:\s+at\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?)?/i
        );
        if (match) {
          const months = [
            'january',
            'february',
            'march',
            'april',
            'may',
            'june',
            'july',
            'august',
            'september',
            'october',
            'november',
            'december',
          ];
          const monthName = dateStr
            .toLowerCase()
            .match(
              /(?:march|april|may|june|july|august|september|october|november|december|january|february)/i
            )?.[0]
            ?.toLowerCase();
          const month = months.indexOf(monthName || '');
          const day = parseInt(match[1]);
          const hour = match[2] ? parseInt(match[2]) : 9;
          const minute = match[3] ? parseInt(match[3]) : 0;
          const ampm = match[4];
          const year = now.getMonth() < month ? now.getFullYear() : now.getFullYear() + 1;
          return new Date(
            year,
            month,
            day,
            ampm === 'pm' && hour !== 12 ? hour + 12 : hour,
            minute
          ).getTime();
        }
        return now.getTime();
      };

      const startDate = parseDate(params.start_date);
      const endDate = params.end_date ? parseDate(params.end_date) : startDate + 60 * 60 * 1000;

      const event = sqlDatabase.addEvent({
        title: params.title,
        description: params.description,
        startDate,
        endDate,
        location: params.location,
        attendees:
          params.attendees
            ?.split(',')
            .map((e: string) => e.trim())
            .filter(Boolean) || [],
        status: 'confirmed',
      });

      return {
        success: true,
        data: {
          id: event.id,
          title: event.title,
          startDate: new Date(startDate).toISOString(),
          message: `Event "${params.title}" added to calendar for ${new Date(startDate).toLocaleString()}`,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to add event',
      };
    }
  },
};
