import { sqlDatabase, Contact, CalendarEvent, Task, Note, Activity } from './sqlite';

export interface ProcessedEmail {
  contacts: Array<{ name: string; email?: string; company?: string; title?: string }>;
  events: Array<{ title: string; description?: string; startDate?: number; attendees?: string[] }>;
  tasks: Array<{ title: string; description?: string; dueDate?: number; priority?: 'low' | 'medium' | 'high' }>;
  notes: Array<{ title: string; content: string; category: string }>;
  summary: string;
  actionItems: string[];
  importantDates: Array<{ description: string; date: number }>;
}

export class DataProcessor {
  private static instance: DataProcessor;

  private constructor() {}

  static getInstance(): DataProcessor {
    if (!DataProcessor.instance) {
      DataProcessor.instance = new DataProcessor();
    }
    return DataProcessor.instance;
  }

  async processEmail(
    sender: string,
    subject: string,
    body: string,
    date?: number
  ): Promise<ProcessedEmail> {
    const result = await this.extractWithLLM(sender, subject, body);
    
    const createdContacts: Contact[] = [];
    const createdEvents: CalendarEvent[] = [];
    const createdTasks: Task[] = [];
    const createdNotes: Note[] = [];
    
    // Create contacts
    for (const contact of result.contacts) {
      const c = sqlDatabase.findOrCreateContact(contact.name, contact.email);
      if (contact.company) {
        sqlDatabase.updateContact(c.id, { company: contact.company });
      }
      if (contact.title) {
        sqlDatabase.updateContact(c.id, { title: contact.title });
      }
      sqlDatabase.updateContact(c.id, { source: 'email', tags: ['email', 'auto-import'] });
      createdContacts.push(c);
    }

    // Create events
    for (const event of result.events) {
      const e = sqlDatabase.addEvent({
        title: event.title,
        description: event.description,
        startDate: event.startDate || date || Date.now(),
        attendees: event.attendees,
        status: 'pending',
        source: 'email',
      });
      createdEvents.push(e);
    }

    // Create tasks
    for (const task of result.tasks) {
      const t = sqlDatabase.addTask({
        title: task.title,
        description: task.description,
        dueDate: task.dueDate,
        priority: task.priority || 'medium',
        status: 'pending',
        tags: ['email', 'auto-import'],
        source: 'email',
      });
      createdTasks.push(t);
    }

    // Create note with summary
    const note = sqlDatabase.addNote({
      title: `Email: ${subject}`,
      content: result.summary + '\n\n---\n\nOriginal Email:\nFrom: ' + sender + '\nSubject: ' + subject + '\n\n' + body,
      category: 'email',
      tags: ['email', 'auto-import', ...result.actionItems.map(a => a.substring(0, 20))],
      linkedContacts: createdContacts.map(c => c.id),
    });
    createdNotes.push(note);

    // Create activity
    const activity = sqlDatabase.addActivity({
      type: 'email',
      title: subject,
      description: result.summary,
      participants: [sender, ...result.contacts.map(c => c.email || c.name)],
      date: date || Date.now(),
      outcome: result.actionItems.join('; '),
      tags: ['email', 'auto-import'],
      source: 'email',
      rawData: JSON.stringify({ sender, subject, body: body.substring(0, 500) }),
    });

    // Store raw data for reference
    sqlDatabase.addRawData({
      type: 'email',
      content: `Subject: ${subject}\n\n${body}`,
      sender,
      date: date,
      metadata: { subject },
    });

    return {
      ...result,
      contacts: createdContacts,
      events: createdEvents,
      tasks: createdTasks,
      notes: createdNotes,
    };
  }

  private async extractWithLLM(
    sender: string,
    subject: string,
    body: string
  ): Promise<ProcessedEmail> {
    const prompt = `You are a data extraction assistant. Analyze the following email and extract structured information.

Email Details:
- From: ${sender}
- Subject: ${subject}
- Body: ${body}

Extract and return a JSON object with:
1. contacts: Array of contacts mentioned (name, email, company, title)
2. events: Any events/meetings mentioned (title, description, date)
3. tasks: Any action items/tasks mentioned (title, description, due date, priority)
4. notes: Any important information to note (title, content, category)
5. summary: A 2-3 sentence summary of the email
6. actionItems: Array of action items mentioned
7. importantDates: Any dates mentioned with descriptions

Return ONLY valid JSON, no other text. Use null for missing values.`;

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'ollama/qwen2.5:14b',
          message: prompt,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const parsed = this.parseLLMResponse(data.message);
        return parsed;
      }
    } catch (error) {
      console.error('LLM extraction error:', error);
    }

    return this.fallbackExtraction(sender, subject, body);
  }

  private parseLLMResponse(response: string): ProcessedEmail {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      console.error('Parse error:', error);
    }
    return this.fallbackExtraction('', '', '');
  }

  private fallbackExtraction(sender: string, subject: string, body: string): ProcessedEmail {
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const emails = body.match(emailRegex) || [];
    
    const contacts = emails.map(email => ({
      name: email.split('@')[0],
      email,
    }));

    const dateRegex = /\d{1,2}\/\d{1,2}\/\d{2,4}|\w+\s+\d{1,2},?\s+\d{4}/g;
    const dates = body.match(dateRegex) || [];

    const importantDates = dates.map(d => ({
      description: d,
      date: Date.now(),
    }));

    return {
      contacts,
      events: [],
      tasks: [],
      notes: [{
        title: subject,
        content: body.substring(0, 500),
        category: 'uncategorized',
      }],
      summary: subject,
      actionItems: [],
      importantDates,
    };
  }

  async processMessage(
    content: string,
    sender?: string,
    date?: number
  ): Promise<ProcessedEmail> {
    return this.processEmail(sender || 'Unknown', 'Message', content, date);
  }

  generateActivitySummary(days: number = 7): string {
    const activities = sqlDatabase.getActivities(undefined, days);
    const tasks = sqlDatabase.getTasks('completed', undefined);
    const events = sqlDatabase.getUpcomingEvents(days);
    
    let summary = `# Activity Summary - Last ${days} Days\n\n`;
    
    summary += `## Activities (${activities.length})\n`;
    const byType = activities.reduce((acc, a) => {
      acc[a.type] = (acc[a.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    Object.entries(byType).forEach(([type, count]) => {
      summary += `- ${type}: ${count}\n`;
    });

    summary += `\n## Tasks Completed\n`;
    summary += `- Total: ${tasks.length}\n`;

    summary += `\n## Upcoming Events\n`;
    summary += `- Next ${days} days: ${events.length}\n`;
    events.slice(0, 5).forEach(e => {
      summary += `- ${e.title} (${new Date(e.startDate).toLocaleDateString()})\n`;
    });

    return summary;
  }

  getContactsList(): Contact[] {
    return sqlDatabase.getContacts();
  }

  getTasksList(status?: Task['status']): Task[] {
    return sqlDatabase.getTasks(status);
  }

  getCalendarEvents(startDate?: number, endDate?: number): CalendarEvent[] {
    return sqlDatabase.getEvents(startDate, endDate);
  }

  getNotesList(category?: string): Note[] {
    return sqlDatabase.getNotes(category);
  }

  searchDatabase(query: string) {
    return sqlDatabase.search(query);
  }

  getStatistics() {
    return sqlDatabase.getStats();
  }
}

export const dataProcessor = DataProcessor.getInstance();
