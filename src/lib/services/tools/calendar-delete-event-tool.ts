/**
 * Calendar Delete Event Tool
 * Delete events from the calendar
 */

import type { Tool, ToolResult } from './tool-types';

export const calendarDeleteEventTool: Tool = {
  name: 'calendar_delete_event',
  description:
    'Delete an event from the calendar. Use when user wants to cancel or remove an event.',
  parameters: {
    event_id: { type: 'string', description: 'ID of the event to delete', required: true },
  },
  execute: async (params): Promise<ToolResult> => {
    try {
      const { sqlDatabase } = await import('@/lib/database/sqlite');
      sqlDatabase.initialize();

      const deleted = sqlDatabase.deleteEvent(params.event_id);
      return {
        success: deleted,
        data: { message: deleted ? 'Event deleted' : 'Event not found' },
      };
    } catch (error) {
      return { success: false, error: 'Failed to delete event' };
    }
  },
};
