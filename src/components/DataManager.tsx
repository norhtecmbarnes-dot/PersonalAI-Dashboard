import { useState, useEffect } from 'react';

interface Contact {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  title?: string;
  tags: string[];
}

interface Task {
  id: string;
  title: string;
  description?: string;
  dueDate?: number;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'in_progress' | 'completed';
}

interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  startDate: number;
  endDate?: number;
  location?: string;
  status: string;
}

interface Note {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  updatedAt: number;
}

interface Stats {
  contacts: number;
  events: number;
  tasks: number;
  notes: number;
  activities: number;
  pendingTasks: number;
  upcomingEvents: number;
}

export function DataManager() {
  const [activeTab, setActiveTab] = useState<'contacts' | 'tasks' | 'events' | 'notes' | 'summary'>('summary');
  const [stats, setStats] = useState<Stats | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [summary, setSummary] = useState('');
  const [loading, setLoading] = useState(false);

  // Form states
  const [newContact, setNewContact] = useState({ name: '', email: '', company: '', title: '' });
  const [newTask, setNewTask] = useState({ title: '', description: '', dueDate: '', priority: 'medium' });
  const [newNote, setNewNote] = useState({ title: '', content: '', category: 'general' });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [statsRes, contactsRes, tasksRes, eventsRes, notesRes, summaryRes] = await Promise.all([
        fetch('/api/database?action=stats'),
        fetch('/api/database?action=contacts'),
        fetch('/api/database?action=tasks'),
        fetch('/api/database?action=events'),
        fetch('/api/database?action=notes'),
        fetch('/api/database?action=summary&days=7'),
      ]);

      setStats(await statsRes.json());
      setContacts((await contactsRes.json()).contacts);
      setTasks((await tasksRes.json()).tasks);
      setEvents((await eventsRes.json()).events);
      setNotes((await notesRes.json()).notes);
      setSummary((await summaryRes.json()).summary);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddContact = async () => {
    if (!newContact.name) return;
    await fetch('/api/database', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'addContact', data: newContact }),
    });
    setNewContact({ name: '', email: '', company: '', title: '' });
    loadData();
  };

  const handleAddTask = async () => {
    if (!newTask.title) return;
    await fetch('/api/database', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'addTask',
        data: {
          ...newTask,
          dueDate: newTask.dueDate ? new Date(newTask.dueDate).getTime() : undefined,
          status: 'pending',
          tags: [],
        },
      }),
    });
    setNewTask({ title: '', description: '', dueDate: '', priority: 'medium' });
    loadData();
  };

  const handleToggleTask = async (task: Task) => {
    const newStatus = task.status === 'completed' ? 'pending' : 'completed';
    await fetch('/api/database', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'updateTask', data: { id: task.id, updates: { status: newStatus } } }),
    });
    loadData();
  };

  const handleAddNote = async () => {
    if (!newNote.title) return;
    await fetch('/api/database', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'addNote', data: { ...newNote, tags: [] } }),
    });
    setNewNote({ title: '', content: '', category: 'general' });
    loadData();
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString();
  };

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-slate-800/50 rounded-lg p-4">
            <p className="text-2xl font-bold text-white">{stats.contacts}</p>
            <p className="text-gray-400 text-sm">Contacts</p>
          </div>
          <div className="bg-slate-800/50 rounded-lg p-4">
            <p className="text-2xl font-bold text-white">{stats.pendingTasks}</p>
            <p className="text-gray-400 text-sm">Pending Tasks</p>
          </div>
          <div className="bg-slate-800/50 rounded-lg p-4">
            <p className="text-2xl font-bold text-white">{stats.upcomingEvents}</p>
            <p className="text-gray-400 text-sm">Upcoming Events</p>
          </div>
          <div className="bg-slate-800/50 rounded-lg p-4">
            <p className="text-2xl font-bold text-white">{stats.notes}</p>
            <p className="text-gray-400 text-sm">Notes</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-700 pb-2">
        {['summary', 'contacts', 'tasks', 'events', 'notes'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              activeTab === tab
                ? 'bg-purple-600 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Summary Tab */}
      {activeTab === 'summary' && (
        <div className="bg-slate-800/50 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-white mb-4">Activity Summary</h3>
          <pre className="text-gray-300 whitespace-pre-wrap text-sm">{summary || 'No activities yet.'}</pre>
        </div>
      )}

      {/* Contacts Tab */}
      {activeTab === 'contacts' && (
        <div className="space-y-4">
          <div className="bg-slate-800/50 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-white mb-4">Add Contact</h3>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="Name *"
                value={newContact.name}
                onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
                className="bg-slate-700 text-white rounded px-3 py-2"
              />
              <input
                type="email"
                placeholder="Email"
                value={newContact.email}
                onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
                className="bg-slate-700 text-white rounded px-3 py-2"
              />
              <input
                type="text"
                placeholder="Company"
                value={newContact.company}
                onChange={(e) => setNewContact({ ...newContact, company: e.target.value })}
                className="bg-slate-700 text-white rounded px-3 py-2"
              />
              <input
                type="text"
                placeholder="Title"
                value={newContact.title}
                onChange={(e) => setNewContact({ ...newContact, title: e.target.value })}
                className="bg-slate-700 text-white rounded px-3 py-2"
              />
            </div>
            <button
              onClick={handleAddContact}
              className="mt-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg"
            >
              Add Contact
            </button>
          </div>

          <div className="grid gap-2">
            {contacts.map((contact) => (
              <div key={contact.id} className="bg-slate-800/50 rounded-lg p-3 flex justify-between items-center">
                <div>
                  <p className="text-white font-medium">{contact.name}</p>
                  <p className="text-gray-400 text-sm">{contact.email} {contact.company && `• ${contact.company}`}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tasks Tab */}
      {activeTab === 'tasks' && (
        <div className="space-y-4">
          <div className="bg-slate-800/50 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-white mb-4">Add Task</h3>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="Title *"
                value={newTask.title}
                onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                className="bg-slate-700 text-white rounded px-3 py-2"
              />
              <input
                type="date"
                value={newTask.dueDate}
                onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
                className="bg-slate-700 text-white rounded px-3 py-2"
              />
              <select
                value={newTask.priority}
                onChange={(e) => setNewTask({ ...newTask, priority: e.target.value as any })}
                className="bg-slate-700 text-white rounded px-3 py-2"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            <button
              onClick={handleAddTask}
              className="mt-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg"
            >
              Add Task
            </button>
          </div>

          <div className="space-y-2">
            {tasks.map((task) => (
              <div key={task.id} className="bg-slate-800/50 rounded-lg p-3 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={task.status === 'completed'}
                    onChange={() => handleToggleTask(task)}
                    className="w-4 h-4"
                  />
                  <div>
                    <p className={`text-white ${task.status === 'completed' ? 'line-through' : ''}`}>
                      {task.title}
                    </p>
                    {task.dueDate && (
                      <p className="text-gray-400 text-xs">Due: {formatDate(task.dueDate)}</p>
                    )}
                  </div>
                </div>
                <span className={`text-xs px-2 py-1 rounded ${
                  task.priority === 'high' ? 'bg-red-900 text-red-300' :
                  task.priority === 'medium' ? 'bg-yellow-900 text-yellow-300' :
                  'bg-green-900 text-green-300'
                }`}>
                  {task.priority}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Events Tab */}
      {activeTab === 'events' && (
        <div className="space-y-2">
          {events.length === 0 ? (
            <p className="text-gray-400">No upcoming events</p>
          ) : (
            events.map((event) => (
              <div key={event.id} className="bg-slate-800/50 rounded-lg p-3">
                <p className="text-white font-medium">{event.title}</p>
                <p className="text-gray-400 text-sm">{formatDate(event.startDate)}</p>
                {event.location && <p className="text-gray-500 text-xs">{event.location}</p>}
              </div>
            ))
          )}
        </div>
      )}

      {/* Notes Tab */}
      {activeTab === 'notes' && (
        <div className="space-y-4">
          <div className="bg-slate-800/50 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-white mb-4">Add Note</h3>
            <div className="space-y-2">
              <input
                type="text"
                placeholder="Title *"
                value={newNote.title}
                onChange={(e) => setNewNote({ ...newNote, title: e.target.value })}
                className="w-full bg-slate-700 text-white rounded px-3 py-2"
              />
              <textarea
                placeholder="Content"
                value={newNote.content}
                onChange={(e) => setNewNote({ ...newNote, content: e.target.value })}
                className="w-full bg-slate-700 text-white rounded px-3 py-2 h-24"
              />
              <select
                value={newNote.category}
                onChange={(e) => setNewNote({ ...newNote, category: e.target.value })}
                className="bg-slate-700 text-white rounded px-3 py-2"
              >
                <option value="general">General</option>
                <option value="email">Email</option>
                <option value="meeting">Meeting</option>
                <option value="project">Project</option>
              </select>
            </div>
            <button
              onClick={handleAddNote}
              className="mt-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg"
            >
              Add Note
            </button>
          </div>

          <div className="space-y-2">
            {notes.map((note) => (
              <div key={note.id} className="bg-slate-800/50 rounded-lg p-3">
                <p className="text-white font-medium">{note.title}</p>
                <p className="text-gray-400 text-sm line-clamp-2">{note.content}</p>
                <p className="text-gray-500 text-xs mt-1">{note.category} • {formatDate(note.updatedAt)}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
