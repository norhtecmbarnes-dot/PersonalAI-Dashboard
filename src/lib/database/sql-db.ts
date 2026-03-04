export interface Contact {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  title?: string;
  notes?: string;
  tags: string[];
  source?: string;
  createdAt: number;
  updatedAt: number;
}

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  startDate: number;
  endDate?: number;
  location?: string;
  attendees?: string[];
  reminder?: number;
  status: 'pending' | 'confirmed' | 'cancelled';
  source?: string;
  createdAt: number;
  updatedAt: number;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  dueDate?: number;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'in_progress' | 'completed';
  assignee?: string;
  tags: string[];
  source?: string;
  createdAt: number;
  updatedAt: number;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  linkedContacts?: string[];
  linkedEvents?: string[];
  linkedTasks?: string[];
  createdAt: number;
  updatedAt: number;
}

export interface Activity {
  id: string;
  type: 'email' | 'call' | 'meeting' | 'message' | 'note' | 'task' | 'other';
  title: string;
  description?: string;
  participants: string[];
  date: number;
  duration?: number;
  outcome?: string;
  tags: string[];
  source?: string;
  rawData?: string;
  createdAt: number;
}

export interface RawData {
  id: string;
  type: 'email' | 'message' | 'text' | 'other';
  content: string;
  sender?: string;
  recipients?: string[];
  date?: number;
  metadata?: Record<string, any>;
  processed: boolean;
  processingResult?: string;
  createdAt: number;
}

export interface DatabaseSchema {
  contacts: Contact[];
  events: CalendarEvent[];
  tasks: Task[];
  notes: Note[];
  activities: Activity[];
  rawData: RawData[];
}

const STORAGE_KEY = 'ai_assistant_database';

export class DatabaseService {
  private static instance: DatabaseService;
  private data: DatabaseSchema;

  private constructor() {
    this.data = this.loadFromStorage();
  }

  static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  private loadFromStorage(): DatabaseSchema {
    if (typeof window === 'undefined') {
      return {
        contacts: [],
        events: [],
        tasks: [],
        notes: [],
        activities: [],
        rawData: [],
      };
    }
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error('Error loading database:', error);
    }
    return {
      contacts: [],
      events: [],
      tasks: [],
      notes: [],
      activities: [],
      rawData: [],
    };
  }

  private saveToStorage(): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    } catch (error) {
      console.error('Error saving database:', error);
    }
  }

  generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  // Contact Methods
  addContact(contact: Omit<Contact, 'id' | 'createdAt' | 'updatedAt'>): Contact {
    const newContact: Contact = {
      ...contact,
      id: this.generateId(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    this.data.contacts.push(newContact);
    this.saveToStorage();
    return newContact;
  }

  updateContact(id: string, updates: Partial<Contact>): Contact | null {
    const index = this.data.contacts.findIndex(c => c.id === id);
    if (index === -1) return null;
    this.data.contacts[index] = {
      ...this.data.contacts[index],
      ...updates,
      updatedAt: Date.now(),
    };
    this.saveToStorage();
    return this.data.contacts[index];
  }

  deleteContact(id: string): boolean {
    const index = this.data.contacts.findIndex(c => c.id === id);
    if (index === -1) return false;
    this.data.contacts.splice(index, 1);
    this.saveToStorage();
    return true;
  }

  getContacts(query?: string): Contact[] {
    if (!query) return this.data.contacts;
    const lower = query.toLowerCase();
    return this.data.contacts.filter(c =>
      c.name.toLowerCase().includes(lower) ||
      (c.email?.toLowerCase().includes(lower)) ||
      (c.company?.toLowerCase().includes(lower)) ||
      c.tags.some(t => t.toLowerCase().includes(lower))
    );
  }

  findOrCreateContact(name: string, email?: string): Contact {
    const existing = this.data.contacts.find(c => 
      c.email === email || c.name.toLowerCase() === name.toLowerCase()
    );
    if (existing) return existing;
    return this.addContact({ name, email, tags: [], source: 'auto' });
  }

  // Event Methods
  addEvent(event: Omit<CalendarEvent, 'id' | 'createdAt' | 'updatedAt'>): CalendarEvent {
    const newEvent: CalendarEvent = {
      ...event,
      id: this.generateId(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    this.data.events.push(newEvent);
    this.saveToStorage();
    return newEvent;
  }

  updateEvent(id: string, updates: Partial<CalendarEvent>): CalendarEvent | null {
    const index = this.data.events.findIndex(e => e.id === id);
    if (index === -1) return null;
    this.data.events[index] = {
      ...this.data.events[index],
      ...updates,
      updatedAt: Date.now(),
    };
    this.saveToStorage();
    return this.data.events[index];
  }

  deleteEvent(id: string): boolean {
    const index = this.data.events.findIndex(e => e.id === id);
    if (index === -1) return false;
    this.data.events.splice(index, 1);
    this.saveToStorage();
    return true;
  }

  getEvents(startDate?: number, endDate?: number): CalendarEvent[] {
    let events = this.data.events;
    if (startDate) {
      events = events.filter(e => e.startDate >= startDate);
    }
    if (endDate) {
      events = events.filter(e => !e.endDate || e.endDate <= endDate);
    }
    return events.sort((a, b) => a.startDate - b.startDate);
  }

  getUpcomingEvents(days: number = 7): CalendarEvent[] {
    const now = Date.now();
    const future = now + (days * 24 * 60 * 60 * 1000);
    return this.getEvents(now, future);
  }

  // Task Methods
  addTask(task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Task {
    const newTask: Task = {
      ...task,
      id: this.generateId(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    this.data.tasks.push(newTask);
    this.saveToStorage();
    return newTask;
  }

  updateTask(id: string, updates: Partial<Task>): Task | null {
    const index = this.data.tasks.findIndex(t => t.id === id);
    if (index === -1) return null;
    this.data.tasks[index] = {
      ...this.data.tasks[index],
      ...updates,
      updatedAt: Date.now(),
    };
    this.saveToStorage();
    return this.data.tasks[index];
  }

  deleteTask(id: string): boolean {
    const index = this.data.tasks.findIndex(t => t.id === id);
    if (index === -1) return false;
    this.data.tasks.splice(index, 1);
    this.saveToStorage();
    return true;
  }

  getTasks(status?: Task['status'], priority?: Task['priority']): Task[] {
    let tasks = this.data.tasks;
    if (status) tasks = tasks.filter(t => t.status === status);
    if (priority) tasks = tasks.filter(t => t.priority === priority);
    return tasks.sort((a, b) => {
      if (a.dueDate && b.dueDate) return a.dueDate - b.dueDate;
      if (a.dueDate) return -1;
      if (b.dueDate) return 1;
      return 0;
    });
  }

  // Note Methods
  addNote(note: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>): Note {
    const newNote: Note = {
      ...note,
      id: this.generateId(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    this.data.notes.push(newNote);
    this.saveToStorage();
    return newNote;
  }

  updateNote(id: string, updates: Partial<Note>): Note | null {
    const index = this.data.notes.findIndex(n => n.id === id);
    if (index === -1) return null;
    this.data.notes[index] = {
      ...this.data.notes[index],
      ...updates,
      updatedAt: Date.now(),
    };
    this.saveToStorage();
    return this.data.notes[index];
  }

  deleteNote(id: string): boolean {
    const index = this.data.notes.findIndex(n => n.id === id);
    if (index === -1) return false;
    this.data.notes.splice(index, 1);
    this.saveToStorage();
    return true;
  }

  getNotes(category?: string, tags?: string[]): Note[] {
    let notes = this.data.notes;
    if (category) notes = notes.filter(n => n.category === category);
    if (tags?.length) {
      notes = notes.filter(n => tags.some(t => n.tags.includes(t)));
    }
    return notes.sort((a, b) => b.updatedAt - a.updatedAt);
  }

  // Activity Methods
  addActivity(activity: Omit<Activity, 'id' | 'createdAt'>): Activity {
    const newActivity: Activity = {
      ...activity,
      id: this.generateId(),
      createdAt: Date.now(),
    };
    this.data.activities.push(newActivity);
    this.saveToStorage();
    return newActivity;
  }

  getActivities(type?: Activity['type'], days?: number): Activity[] {
    let activities = this.data.activities;
    if (type) activities = activities.filter(a => a.type === type);
    if (days) {
      const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000);
      activities = activities.filter(a => a.date >= cutoff);
    }
    return activities.sort((a, b) => b.date - a.date);
  }

  getActivitySummary(days: number = 7): {
    total: number;
    byType: Record<string, number>;
    byDate: Record<string, number>;
  } {
    const activities = this.getActivities(undefined, days);
    const byType: Record<string, number> = {};
    const byDate: Record<string, number> = {};

    for (const activity of activities) {
      byType[activity.type] = (byType[activity.type] || 0) + 1;
      const date = new Date(activity.date).toLocaleDateString();
      byDate[date] = (byDate[date] || 0) + 1;
    }

    return {
      total: activities.length,
      byType,
      byDate,
    };
  }

  // Raw Data Methods
  addRawData(raw: Omit<RawData, 'id' | 'createdAt' | 'processed'>): RawData {
    const newRaw: RawData = {
      ...raw,
      id: this.generateId(),
      processed: false,
      createdAt: Date.now(),
    };
    this.data.rawData.push(newRaw);
    this.saveToStorage();
    return newRaw;
  }

  markProcessed(id: string, result: string): boolean {
    const raw = this.data.rawData.find(r => r.id === id);
    if (!raw) return false;
    raw.processed = true;
    raw.processingResult = result;
    this.saveToStorage();
    return true;
  }

  getUnprocessedRawData(): RawData[] {
    return this.data.rawData.filter(r => !r.processed);
  }

  // Search
  search(query: string): {
    contacts: Contact[];
    events: CalendarEvent[];
    tasks: Task[];
    notes: Note[];
    activities: Activity[];
  } {
    const lower = query.toLowerCase();
    return {
      contacts: this.data.contacts.filter(c =>
        c.name.toLowerCase().includes(lower) ||
        (c.email?.toLowerCase().includes(lower))
      ),
      events: this.data.events.filter(e =>
        e.title.toLowerCase().includes(lower) ||
        (e.description?.toLowerCase().includes(lower))
      ),
      tasks: this.data.tasks.filter(t =>
        t.title.toLowerCase().includes(lower) ||
        (t.description?.toLowerCase().includes(lower))
      ),
      notes: this.data.notes.filter(n =>
        n.title.toLowerCase().includes(lower) ||
        n.content.toLowerCase().includes(lower)
      ),
      activities: this.data.activities.filter(a =>
        a.title.toLowerCase().includes(lower) ||
        (a.description?.toLowerCase().includes(lower))
      ),
    };
  }

  // Statistics
  getStats(): {
    contacts: number;
    events: number;
    tasks: number;
    notes: number;
    activities: number;
    pendingTasks: number;
    upcomingEvents: number;
  } {
    return {
      contacts: this.data.contacts.length,
      events: this.data.events.length,
      tasks: this.data.tasks.length,
      notes: this.data.notes.length,
      activities: this.data.activities.length,
      pendingTasks: this.data.tasks.filter(t => t.status !== 'completed').length,
      upcomingEvents: this.getUpcomingEvents(7).length,
    };
  }

  // Export/Import
  exportAll(): string {
    return JSON.stringify(this.data, null, 2);
  }

  importAll(json: string): boolean {
    try {
      const imported = JSON.parse(json);
      this.data = { ...this.data, ...imported };
      this.saveToStorage();
      return true;
    } catch {
      return false;
    }
  }

  clearAll(): void {
    this.data = {
      contacts: [],
      events: [],
      tasks: [],
      notes: [],
      activities: [],
      rawData: [],
    };
    this.saveToStorage();
  }
}

export const database = DatabaseService.getInstance();
