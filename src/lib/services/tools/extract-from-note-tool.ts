import type { Tool } from '@/types/tools';

export const extractFromNoteTool: Tool = {
  name: 'extract_from_note',
  description:
    'Extract structured data from text/notes. Finds contacts, tasks, events, API keys, and other information. Saves to database automatically.',
  parameters: {
    content: {
      type: 'string',
      description: 'The text content to extract data from',
      required: true,
    },
    saveToDb: {
      type: 'boolean',
      description: 'Whether to save extracted data to database (default: true)',
      required: false,
    },
  },
  execute: async params => {
    try {
      const response = await fetch('/api/notes/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: params.content,
          saveToDb: params.saveToDb !== false,
        }),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        const extracted = data.extracted;
        const saved = data.saved;

        let summary = 'Extracted:\n';
        if (extracted.contacts?.length) summary += `- ${extracted.contacts.length} contact(s)\n`;
        if (extracted.tasks?.length) summary += `- ${extracted.tasks.length} task(s)\n`;
        if (extracted.events?.length) summary += `- ${extracted.events.length} event(s)\n`;
        if (extracted.emails?.length) summary += `- ${extracted.emails.length} email(s)\n`;
        if (extracted.phones?.length) summary += `- ${extracted.phones.length} phone number(s)\n`;
        if (extracted.urls?.length) summary += `- ${extracted.urls.length} URL(s)\n`;

        if ((saved && saved.contacts > 0) || saved?.tasks > 0 || saved?.events > 0) {
          summary += `\nSaved to database: ${saved.contacts || 0} contacts, ${saved.tasks || 0} tasks, ${saved.events || 0} events`;
        }

        return {
          success: true,
          data: {
            extracted,
            saved,
            summary,
            message: data.message || 'Content processed successfully.',
          },
        };
      }
      return { success: false, error: data.error || 'Failed to extract' };
    } catch (error) {
      return { success: false, error: 'Failed to extract content' };
    }
  },
};
