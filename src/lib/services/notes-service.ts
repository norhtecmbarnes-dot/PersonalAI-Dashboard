import { sqlDatabase } from '@/lib/database/sqlite';
import { v4 as uuidv4 } from 'uuid';

export interface Note {
  id: string;
  title: string;
  content: string;
  category: 'note' | 'email' | 'meeting' | 'idea' | 'reference' | 'processed';
  source?: 'paste' | 'manual' | 'email' | 'import';
  extracted?: {
    events?: ExtractedEvent[];
    contacts?: ExtractedContact[];
    tasks?: ExtractedTask[];
    entities?: ExtractedEntity[];
    keywords?: string[];
    summary?: string;
  };
  processedContent?: string;
  createdAt: number;
  updatedAt: number;
}

export interface ExtractedEvent {
  title: string;
  date: string;
  time?: string;
  location?: string;
  description?: string;
}

export interface ExtractedContact {
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  role?: string;
}

export interface ExtractedTask {
  title: string;
  dueDate?: string;
  priority?: 'low' | 'medium' | 'high';
  context?: string;
}

export interface ExtractedEntity {
  name: string;
  type: 'person' | 'company' | 'project' | 'topic' | 'location';
  context?: string;
}

class NotesService {
  private static instance: NotesService;

  private constructor() {}

  static getInstance(): NotesService {
    if (!NotesService.instance) {
      NotesService.instance = new NotesService();
    }
    return NotesService.instance;
  }

  async createNote(note: Partial<Note>): Promise<Note> {
    sqlDatabase.initialize();

    const id = uuidv4();
    const now = Date.now();

    const newNote: Note = {
      id,
      title: note.title || 'Untitled Note',
      content: note.content || '',
      category: note.category || 'note',
      source: note.source || 'manual',
      extracted: note.extracted,
      createdAt: now,
      updatedAt: now,
    };

    sqlDatabase.addDocument({
      title: newNote.title,
      content: newNote.content,
      category: 'note',
      tags: [newNote.category, newNote.source || 'manual'],
    });

    return newNote;
  }

  async getNotes(category?: string): Promise<Note[]> {
    sqlDatabase.initialize();

    const notes = sqlDatabase.getNotes('note');
    
    return notes
      .filter(n => !category || n.tags?.includes(category))
      .map(n => ({
        id: n.id,
        title: n.title,
        content: n.content,
        category: (n.tags?.find(t => ['note', 'email', 'meeting', 'idea', 'reference', 'processed'].includes(t)) || 'note') as 'note' | 'email' | 'meeting' | 'idea' | 'reference' | 'processed',
        source: (n.tags?.find(t => ['paste', 'manual', 'email', 'import'].includes(t)) || 'manual') as 'paste' | 'manual' | 'email' | 'import',
        createdAt: n.createdAt,
        updatedAt: n.updatedAt,
      }));
  }

  async getNote(id: string): Promise<Note | null> {
    sqlDatabase.initialize();

    const notes = sqlDatabase.getNotes('note');
    const note = notes.find(n => n.id === id);

    if (!note) return null;

    return {
      id: note.id,
      title: note.title,
      content: note.content,
      category: note.tags?.find(t => ['note', 'email', 'meeting', 'idea', 'reference', 'processed'].includes(t)) as any || 'note',
      source: note.tags?.find(t => ['paste', 'manual', 'email', 'import'].includes(t)) as any,
      createdAt: note.createdAt,
      updatedAt: note.updatedAt,
    };
  }

  async updateNote(id: string, updates: Partial<Note>): Promise<Note | null> {
    sqlDatabase.initialize();

    sqlDatabase.updateDocument(id, {
      title: updates.title,
      content: updates.content,
      tags: updates.category ? [updates.category, updates.source || 'manual'] : undefined,
    });

    return this.getNote(id);
  }

  async deleteNote(id: string): Promise<void> {
    sqlDatabase.initialize();
    sqlDatabase.deleteDocument(id);
  }

  // Smart extraction - processes content and extracts structured data
  async processNote(content: string): Promise<{
    extracted: {
      events: ExtractedEvent[];
      contacts: ExtractedContact[];
      tasks: ExtractedTask[];
      entities: ExtractedEntity[];
      keywords: string[];
      summary: string;
    };
    suggestedActions: string[];
  }> {
    const extracted = {
      events: this.extractEvents(content),
      contacts: this.extractContacts(content),
      tasks: this.extractTasks(content),
      entities: this.extractEntities(content),
      keywords: this.extractKeywords(content),
      summary: this.generateSummary(content),
    };

    const suggestedActions = this.suggestActions(extracted);

    return { extracted, suggestedActions };
  }

  private extractEvents(content: string): ExtractedEvent[] {
    const events: ExtractedEvent[] = [];
    const lines = content.split('\n');

    // Date patterns
    const datePatterns = [
      /(?:on\s+)?(\w+ \d{1,2}(?:st|nd|rd|th)?,? \d{4})/gi,
      /(?:on\s+)?(\d{1,2}\/\d{1,2}\/\d{4})/g,
      /(?:on\s+)?(\d{4}-\d{2}-\d{2})/g,
      /(?:next\s+)?(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/gi,
      /(tomorrow|today)/gi,
      /(?:on\s+)?(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2}(?:st|nd|rd|th)?/gi,
    ];

    // Time patterns
    const timePattern = /(?:at\s+)?(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/gi;

    // Extract event-like sentences
    const eventKeywords = ['meeting', 'call', 'appointment', 'deadline', 'conference', 'session', 'workshop', 'webinar', 'presentation', 'review', 'sync', 'standup', 'stand-up', 'demo', 'interview'];
    
    for (const line of lines) {
      const lowerLine = line.toLowerCase();
      const hasEventKeyword = eventKeywords.some(kw => lowerLine.includes(kw));
      
      if (hasEventKeyword || datePatterns.some(p => p.test(line))) {
        // Try to extract date
        let dateMatch = '';
        for (const pattern of datePatterns) {
          const match = line.match(pattern);
          if (match) {
            dateMatch = this.normalizeDate(match[0]);
            break;
          }
        }

        // Extract time
        const timeMatch = line.match(timePattern);
        const time = timeMatch ? this.normalizeTime(timeMatch[0]) : undefined;

        // Extract title (first significant words)
        let title = line.replace(/(?:on|at|meeting|call|with|from|to)\s+/gi, '').trim().slice(0, 100);

        if (dateMatch) {
          events.push({
            title: title || 'Event',
            date: dateMatch,
            time,
            description: line.trim(),
          });
        }
      }
    }

    return this.deduplicateEvents(events);
  }

  private extractContacts(content: string): ExtractedContact[] {
    const contacts: ExtractedContact[] = [];

    // Email pattern
    const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

    // Phone patterns
    const phonePatterns = [
      /\+?1?[-.\s]?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g,
      /\d{3}[-.\s]\d{3}[-.\s]\d{4}/g,
    ];

    // Name patterns (simplified)
    const namePatterns = [
      /(?:contact|name|organizer|from|with|speaker|host|attendee):\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/gi,
      /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s*<[^>]+>/g,
      /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s*\([^)]+@[^)]+\)/g,
    ];

    // Extract emails
    const emails = content.match(emailPattern) || [];
    
    for (const email of emails) {
      // Try to find associated name
      const emailIndex = content.indexOf(email);
      const beforeEmail = content.substring(Math.max(0, emailIndex - 50), emailIndex);
      
      let name = '';
      for (const pattern of namePatterns) {
        const match = beforeEmail.match(pattern);
        if (match) {
          name = match[match.length - 1];
          break;
        }
      }

      contacts.push({
        name: name || email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
        email: email.toLowerCase(),
      });
    }

    // Extract phones
    for (const pattern of phonePatterns) {
      const phones = content.match(pattern) || [];
      for (const phone of phones) {
        const existingContact = contacts.find(c => !c.phone);
        if (existingContact) {
          existingContact.phone = phone;
        }
      }
    }

    return this.deduplicateContacts(contacts);
  }

  private extractTasks(content: string): ExtractedTask[] {
    const tasks: ExtractedTask[] = [];
    const lines = content.split('\n');

    const taskPatterns = [
      /^(?:todo|task|action item|next step|follow.?up|reminder|need to|must|should|will)\s*[:\-]?\s*(.+)/gi,
      /^[-•*]\s*\[?\s*\]\s*(.+)/gm,  // Checkbox items
      /^[-•*]\s*(.+)/gm,  // Bullet points that might be tasks
    ];

    const highKeywords = ['urgent', 'important', 'critical', 'asap', 'priority', 'deadline'];
    const mediumKeywords = ['should', 'need to', 'follow-up', 'review'];
    
    for (const line of lines) {
      for (const pattern of taskPatterns) {
        const match = line.match(pattern);
        if (match && match[1]) {
          const taskText = match[1].trim();
          if (taskText.length < 5) continue; // Skip very short items

          const lowerText = taskText.toLowerCase();
          let priority: 'low' | 'medium' | 'high' = 'low';

          if (highKeywords.some(kw => lowerText.includes(kw))) {
            priority = 'high';
          } else if (mediumKeywords.some(kw => lowerText.includes(kw))) {
            priority = 'medium';
          }

          // Try to extract due date
          const datePatterns = [
            /by\s+(\w+ \d{1,2})/gi,
            /before\s+(\w+ \d{1,2})/gi,
            /due\s+(\w+ \d{1,2})/gi,
            /(\d{4}-\d{2}-\d{2})/g,
          ];

          let dueDate: string | undefined;
          for (const dp of datePatterns) {
            const dm = taskText.match(dp);
            if (dm) {
              dueDate = this.normalizeDate(dm[0]);
              break;
            }
          }

          tasks.push({
            title: taskText,
            dueDate,
            priority,
            context: line,
          });
          break;
        }
      }
    }

    return this.deduplicateTasks(tasks);
  }

  private extractEntities(content: string): ExtractedEntity[] {
    const entities: ExtractedEntity[] = [];
    const entityMap = new Map<string, ExtractedEntity>();

    // Company patterns
    const companyPattern = /(?:at|with|from|for|by)\s+([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)*(?:\s+(?:Inc|LLC|Corp|Ltd|Company))?)\b/g;

    // Project patterns
    const projectPattern = /(?:project|initiative|program)\s+([A-Z][a-zA-Z]+(?:\s+[a-zA-Z]+)*)/gi;

    // Topic detection
    const topicPatterns = [
      /(?:subject|topic|regarding|about):\s*([^.]+)/gi,
      /(?:discussed|covered|talked about):\s*([^.]+)/gi,
    ];

    // Extract companies
    const companyMatches = content.matchAll(companyPattern);
    for (const match of companyMatches) {
      const name = match[1].trim();
      if (!entityMap.has(name)) {
        entityMap.set(name, {
          name,
          type: 'company',
          context: match[0],
        });
      }
    }

    // Extract projects
    const projectMatches = content.matchAll(projectPattern);
    for (const match of projectMatches) {
      const name = match[1].trim();
      if (!entityMap.has(name)) {
        entityMap.set(name, {
          name,
          type: 'project',
          context: match[0],
        });
      }
    }

    // Extract topics
    for (const pattern of topicPatterns) {
      const matches = content.matchAll(pattern);
      for (const match of matches) {
        const topic = match[1].trim().slice(0, 50);
        if (topic.length > 3 && !entityMap.has(topic)) {
          entityMap.set(topic, {
            name: topic,
            type: 'topic',
            context: match[0],
          });
        }
      }
    }

    return Array.from(entityMap.values());
  }

  private extractKeywords(content: string): string[] {
    const keywords: string[] = [];
    
    // Stop words
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with',
      'by', 'from', 'up', 'about', 'into', 'over', 'after', 'is', 'are', 'was', 'were',
      'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
      'could', 'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'dare', 'ought',
      'used', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they',
      'what', 'which', 'who', 'whom', 'whose', 'where', 'when', 'why', 'how', 'all', 'each',
      'every', 'both', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not',
      'only', 'own', 'same', 'so', 'than', 'too', 'very', 'just', 'also', 'now', 'here',
      'there', 'then', 'once', 'if', 'because', 'until', 'while', 'although', 'though',
    ]);

    // Extract words (including hyphenated words)
    const words = content.toLowerCase().match(/\b[a-z]+(?:-[a-z]+)*\b/g) || [];
    
    // Count word frequency
    const wordFreq = new Map<string, number>();
    for (const word of words) {
      if (word.length > 3 && !stopWords.has(word)) {
        wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
      }
    }

    // Sort by frequency and take top 20
    const sortedWords = Array.from(wordFreq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([word]) => word);

    // Also extract capitalized phrases
    const capitalizedPhrases = content.match(/[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+/g) || [];
    
    const allKeywords = new Set([...sortedWords, ...capitalizedPhrases.map(p => p.toLowerCase())]);
    
    return Array.from(allKeywords).slice(0, 20);
  }

  private generateSummary(content: string): string {
    // Extract first substantial paragraph
    const paragraphs = content.split(/\n\s*\n/).filter(p => p.trim().length > 50);
    
    if (paragraphs.length === 0) {
      return content.trim().slice(0, 200) + (content.length > 200 ? '...' : '');
    }

    // Return first paragraph, cleaned up
    return paragraphs[0].trim().slice(0, 300) + (paragraphs[0].length > 300 ? '...' : '');
  }

  private suggestActions(extracted: {
    events: ExtractedEvent[];
    contacts: ExtractedContact[];
    tasks: ExtractedTask[];
    entities: ExtractedEntity[];
    keywords: string[];
    summary: string;
  }): string[] {
    const actions: string[] = [];

    if (extracted.events.length > 0) {
      actions.push(`Add ${extracted.events.length} event(s) to calendar`);
    }

    if (extracted.contacts.length > 0) {
      actions.push(`Save ${extracted.contacts.length} contact(s)`);
    }

    if (extracted.tasks.length > 0) {
      actions.push(`Create ${extracted.tasks.length} task(s)`);
      if (extracted.tasks.some(t => t.priority === 'high')) {
        actions.push('Review high-priority tasks');
      }
    }

    if (extracted.entities.length > 3) {
      actions.push(`Index ${extracted.entities.length} entities in knowledge base`);
    }

    return actions;
  }

  private normalizeDate(dateStr: string): string {
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
    
    // Handle relative dates
    const lower = dateStr.toLowerCase();
    if (lower === 'today') return new Date().toISOString().split('T')[0];
    if (lower === 'tomorrow') {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      return tomorrow.toISOString().split('T')[0];
    }

    // Handle "next Monday", etc
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayIndex = days.findIndex(d => lower.includes(d));
    if (dayIndex !== -1) {
      const result = new Date();
      const currentDay = result.getDay();
      const daysUntil = (dayIndex + 7 - currentDay) % 7 || 7;
      if (lower.includes('next')) {
        result.setDate(result.getDate() + daysUntil + 7);
      } else {
        result.setDate(result.getDate() + daysUntil);
      }
      return result.toISOString().split('T')[0];
    }

    // Try parsing various formats
    const monthNames = ['january', 'february', 'march', 'april', 'may', 'june',
                        'july', 'august', 'september', 'october', 'november', 'december'];
    
    for (const month of monthNames) {
      if (lower.includes(month)) {
        const year = dateStr.match(/\d{4}/);
        const day = dateStr.match(/\d{1,2}/);
        if (year && day) {
          const monthIndex = monthNames.indexOf(month);
          return `${year[0]}-${String(monthIndex + 1).padStart(2, '0')}-${String(parseInt(day[0])).padStart(2, '0')}`;
        }
      }
    }

    return dateStr;
  }

  private normalizeTime(timeStr: string): string {
    const match = timeStr.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
    if (!match) return timeStr;

    let hour = parseInt(match[1]);
    const minute = match[2] ? parseInt(match[2]) : 0;
    const meridiem = match[3]?.toLowerCase();

    if (meridiem === 'pm' && hour !== 12) hour += 12;
    if (meridiem === 'am' && hour === 12) hour = 0;

    return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
  }

  private deduplicateEvents(events: ExtractedEvent[]): ExtractedEvent[] {
    const seen = new Set<string>();
    return events.filter(event => {
      const key = `${event.title}-${event.date}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  private deduplicateContacts(contacts: ExtractedContact[]): ExtractedContact[] {
    const seen = new Set<string>();
    return contacts.filter(contact => {
      const key = contact.email?.toLowerCase() || contact.name.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  private deduplicateTasks(tasks: ExtractedTask[]): ExtractedTask[] {
    const seen = new Set<string>();
    return tasks.filter(task => {
      const key = task.title.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  async processAndStore(content: string, source: 'paste' | 'manual' = 'paste'): Promise<Note> {
    const processed = await this.processNote(content);
    
    const note = await this.createNote({
      title: processed.extracted.summary.slice(0, 100),
      content,
      source,
      category: 'note',
      extracted: processed.extracted,
    });

    return note;
  }

  async searchNotes(query: string): Promise<Note[]> {
    sqlDatabase.initialize();
    
    const allNotes = await this.getNotes();
    const lowerQuery = query.toLowerCase();
    
    return allNotes.filter(note => 
      note.title.toLowerCase().includes(lowerQuery) ||
      note.content.toLowerCase().includes(lowerQuery) ||
      note.extracted?.keywords?.some(k => k.includes(lowerQuery))
    );
  }
}

export const notesService = NotesService.getInstance();