export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { sqlDatabase } from '@/lib/database/sqlite';
import { dataProcessor } from '@/lib/database/processor';

export async function GET(request: Request) {
  try {
    sqlDatabase.initialize();
    
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    switch (action) {
      case 'stats':
        return NextResponse.json(sqlDatabase.getStats());

      case 'contacts':
        const contactsQuery = searchParams.get('query');
        return NextResponse.json({ contacts: sqlDatabase.getContacts(contactsQuery || undefined) });

      case 'tasks':
        const taskStatus = searchParams.get('status') as any;
        return NextResponse.json({ tasks: sqlDatabase.getTasks(taskStatus) });

      case 'events':
        const startDate = parseInt(searchParams.get('start') || '0');
        const endDate = parseInt(searchParams.get('end') || '0');
        return NextResponse.json({ events: sqlDatabase.getEvents(startDate || undefined, endDate || undefined) });

      case 'notes':
        const category = searchParams.get('category') || undefined;
        return NextResponse.json({ notes: sqlDatabase.getNotes(category) });

      case 'activities':
        const days = parseInt(searchParams.get('days') || '7');
        const type = searchParams.get('type') as any;
        return NextResponse.json({ activities: sqlDatabase.getActivities(type, days) });

      case 'summary':
        const summaryDays = parseInt(searchParams.get('days') || '7');
        const summary = dataProcessor.generateActivitySummary(summaryDays);
        return NextResponse.json({ summary });

      case 'search':
        const query = searchParams.get('query') || '';
        return NextResponse.json(sqlDatabase.search(query));

      default:
        return NextResponse.json({
          endpoints: {
            '?action=stats': 'Get database statistics',
            '?action=contacts': 'Get contacts (optional: query)',
            '?action=tasks': 'Get tasks (optional: status)',
            '?action=events': 'Get events (optional: start, end)',
            '?action=notes': 'Get notes (optional: category)',
            '?action=activities': 'Get activities (optional: type, days)',
            '?action=summary': 'Get activity summary (optional: days)',
            '?action=search': 'Search all data (query)',
          },
        });
    }
  } catch (error) {
    console.error('Database API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    sqlDatabase.initialize();
    
    const body = await request.json();
    const { action, data } = body;

    switch (action) {
      // Contacts
      case 'addContact':
        const contact = sqlDatabase.addContact(data);
        return NextResponse.json({ success: true, contact });

      case 'updateContact':
        const updated = sqlDatabase.updateContact(data.id, data.updates);
        return NextResponse.json({ success: !!updated, contact: updated });

      case 'deleteContact':
        const deleted = sqlDatabase.deleteContact(data.id);
        return NextResponse.json({ success: deleted });

      // Events
      case 'addEvent':
        const event = sqlDatabase.addEvent(data);
        return NextResponse.json({ success: true, event });

      case 'updateEvent':
        const updatedEvent = sqlDatabase.updateEvent(data.id, data.updates);
        return NextResponse.json({ success: !!updatedEvent, event: updatedEvent });

      case 'deleteEvent':
        const deletedEvent = sqlDatabase.deleteEvent(data.id);
        return NextResponse.json({ success: deletedEvent });

      // Tasks
      case 'addTask':
        const task = sqlDatabase.addTask(data);
        return NextResponse.json({ success: true, task });

      case 'updateTask':
        const updatedTask = sqlDatabase.updateTask(data.id, data.updates);
        return NextResponse.json({ success: !!updatedTask, task: updatedTask });

      case 'deleteTask':
        const deletedTask = sqlDatabase.deleteTask(data.id);
        return NextResponse.json({ success: deletedTask });

      // Notes
      case 'addNote':
        const note = sqlDatabase.addNote(data);
        return NextResponse.json({ success: true, note });

      case 'updateNote':
        const updatedNote = sqlDatabase.updateNote(data.id, data.updates);
        return NextResponse.json({ success: !!updatedNote, note: updatedNote });

      case 'deleteNote':
        const deletedNote = sqlDatabase.deleteNote(data.id);
        return NextResponse.json({ success: deletedNote });

      // Activities
      case 'addActivity':
        const activity = sqlDatabase.addActivity(data);
        return NextResponse.json({ success: true, activity });

      // Data Processing
      case 'processEmail':
        const { sender, subject, content, date } = data;
        const processed = await dataProcessor.processEmail(sender, subject, content, date);
        return NextResponse.json({ success: true, processed });

      case 'processMessage':
        const { messageContent, messageSender, messageDate } = data;
        const processedMsg = await dataProcessor.processMessage(messageContent, messageSender, messageDate);
        return NextResponse.json({ success: true, processed: processedMsg });

      // Export/Import
      case 'export':
        const exported = sqlDatabase.exportAll();
        return NextResponse.json({ data: exported });

      case 'import':
        const imported = sqlDatabase.importAll(data.json);
        return NextResponse.json({ success: imported });

      case 'clear':
        sqlDatabase.clearAll();
        return NextResponse.json({ success: true });

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Database API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
