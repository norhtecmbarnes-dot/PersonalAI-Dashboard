'use client';

import { useState, useEffect } from 'react';

interface NoteEditorProps {
  isOpen: boolean;
  onClose: () => void;
  initialNote?: {
    id: string;
    title: string;
    content: string;
    category: string;
    tags: string[];
    color?: string;
  };
}

interface ContextualizedNote {
  title: string;
  content: string;
  category: string;
  tags: string[];
  linkedContacts: string[];
  relatedTasks: string[];
  summary: string;
  color?: string;
  positionX?: number;
  positionY?: number;
  width?: number;
  height?: number;
}

interface ExtractedData {
  contacts: Array<{ name: string; email?: string; phone?: string; company?: string }>;
  tasks: Array<{ title: string; dueDate?: string; priority: string; description?: string }>;
  events: Array<{ title: string; date?: string; time?: string; description?: string }>;
  emails: string[];
  phones: string[];
  urls: string[];
  summary: string;
  keywords: string[];
}

const NOTE_COLORS = [
  { value: 'yellow', label: 'Yellow', bg: 'bg-yellow-100', border: 'border-yellow-400', text: 'text-yellow-800', preview: 'bg-yellow-200' },
  { value: 'blue', label: 'Blue', bg: 'bg-blue-100', border: 'border-blue-400', text: 'text-blue-800', preview: 'bg-blue-200' },
  { value: 'green', label: 'Green', bg: 'bg-green-100', border: 'border-green-400', text: 'text-green-800', preview: 'bg-green-200' },
  { value: 'pink', label: 'Pink', bg: 'bg-pink-100', border: 'border-pink-400', text: 'text-pink-800', preview: 'bg-pink-200' },
  { value: 'purple', label: 'Purple', bg: 'bg-purple-100', border: 'border-purple-400', text: 'text-purple-800', preview: 'bg-purple-200' },
  { value: 'orange', label: 'Orange', bg: 'bg-orange-100', border: 'border-orange-400', text: 'text-orange-800', preview: 'bg-orange-200' },
  { value: 'red', label: 'Red', bg: 'bg-red-100', border: 'border-red-400', text: 'text-red-800', preview: 'bg-red-200' },
  { value: 'teal', label: 'Teal', bg: 'bg-teal-100', border: 'border-teal-400', text: 'text-teal-800', preview: 'bg-teal-200' },
];

export function NoteEditor({ isOpen, onClose, initialNote }: NoteEditorProps) {
  const [title, setTitle] = useState(initialNote?.title || '');
  const [content, setContent] = useState(initialNote?.content || '');
  const [category, setCategory] = useState(initialNote?.category || 'general');
  const [tags, setTags] = useState<string[]>(initialNote?.tags || []);
  const [color, setColor] = useState(initialNote?.color || 'yellow');
  const [newTag, setNewTag] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [contextualizing, setContextualizing] = useState(false);

  useEffect(() => {
    if (initialNote) {
      setTitle(initialNote.title);
      setContent(initialNote.content);
      setCategory(initialNote.category);
      setTags(initialNote.tags);
      setColor(initialNote.color || 'yellow');
    } else {
      setTitle('');
      setContent('');
      setCategory('general');
      setTags([]);
      setColor('yellow');
    }
  }, [initialNote, isOpen]);

  const addTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(t => t !== tagToRemove));
  };

  const generateICS = () => {
    const now = new Date();
    const timestamp = now.getTime();
    const uid = `${timestamp}-${Math.random().toString(36).substr(2, 9)}`;
    
    const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//AI Research Assistant//Note//EN
BEGIN:VEVENT
UID:${uid}
DTSTAMP:${now.toISOString().replace(/[-:]/g, '').split('.')[0]}Z
SUMMARY:${title}
DESCRIPTION:${content.replace(/\n/g, '\\n')}
END:VEVENT
END:VCALENDAR`;

    const blob = new Blob([icsContent], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.replace(/[^a-z0-9]/gi, '_')}.ics`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const contextualizeAndSave = async () => {
    if (!title.trim() || !content.trim()) return;

    setContextualizing(true);
    setIsSaving(true);

    try {
      // First, extract structured data from content
      let extractedData: ExtractedData | null = null;
      try {
        const extractResponse = await fetch('/api/notes/extract', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content, saveToDb: true }),
        });
        if (extractResponse.ok) {
          const extractData = await extractResponse.json();
          extractedData = extractData.extracted;
        }
      } catch (e) {
        console.error('Extraction failed:', e);
      }

      // Then contextualize the note
      const response = await fetch('/api/notes/contextualize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content, existingTags: tags }),
      });

      let contextualizedNote: ContextualizedNote;

      if (response.ok) {
        const data = await response.json();
        contextualizedNote = data.note;
      } else {
        contextualizedNote = {
          title,
          content,
          category,
          tags,
          linkedContacts: [],
          relatedTasks: [],
          summary: content.substring(0, 200),
        };
      }

      // Merge extracted keywords into tags
      if (extractedData?.keywords?.length) {
        contextualizedNote.tags = [...new Set([...contextualizedNote.tags, ...extractedData.keywords.slice(0, 5)])];
      }

      // Include color
      contextualizedNote.color = color;

      // For new notes, set random position on the board
      if (!initialNote) {
        contextualizedNote.positionX = Math.floor(Math.random() * 400) + 50;
        contextualizedNote.positionY = Math.floor(Math.random() * 300) + 50;
        contextualizedNote.width = 300;
        contextualizedNote.height = 200;
      }

      const saveResponse = await fetch('/api/database', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: initialNote ? 'updateNote' : 'addNote',
          data: initialNote
            ? { id: initialNote.id, updates: contextualizedNote }
            : contextualizedNote,
        }),
      });

      if (saveResponse.ok) {
        onClose();
      }
    } catch (error) {
      console.error('Error saving note:', error);
    } finally {
      setContextualizing(false);
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  const categories = [
    { value: 'general', label: 'General' },
    { value: 'meeting', label: 'Meeting Notes' },
    { value: 'research', label: 'Research' },
    { value: 'idea', label: 'Ideas' },
    { value: 'project', label: 'Project' },
    { value: 'personal', label: 'Personal' },
    { value: 'work', label: 'Work' },
  ];

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      {/* Sticky note style editor */}
      <div className="bg-yellow-100 rounded-sm shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col relative"
           style={{
             backgroundImage: 'linear-gradient(to bottom, rgba(255,255,0,0.1) 0%, transparent 5%)',
             boxShadow: '0 10px 30px rgba(0,0,0,0.3), 0 0 0 1px rgba(0,0,0,0.05)'
           }}>
        {/* Pin effect */}
        <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-6 h-6 rounded-full bg-red-500 shadow-md z-10"
             style={{ boxShadow: '0 2px 4px rgba(0,0,0,0.3), inset 0 -2px 4px rgba(0,0,0,0.2)' }} />
        
        <div className="flex items-center justify-between p-4 border-b border-yellow-300">
          <h2 className="text-xl font-semibold text-yellow-900">
            {initialNote ? 'Edit Note' : 'New Note'}
          </h2>
          <div className="flex gap-2">
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="px-3 py-1 text-sm bg-yellow-200 hover:bg-yellow-300 text-yellow-900 rounded"
            >
              {showPreview ? 'Edit' : 'Preview'}
            </button>
            <button
              onClick={onClose}
              className="px-3 py-1 text-sm bg-yellow-200 hover:bg-yellow-300 text-yellow-900 rounded"
            >
              Cancel
            </button>
          </div>
        </div>

        <div className="p-4 border-b border-yellow-300">
          <input
            type="text"
            placeholder="Note title..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full text-lg font-medium bg-transparent border-none text-yellow-900 placeholder-yellow-600/50 focus:outline-none"
          />
          
          <div className="flex gap-4 mt-3 items-center">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="px-3 py-1 bg-yellow-200 border border-yellow-400 rounded text-yellow-900 text-sm"
            >
              {categories.map((cat) => (
                <option key={cat.value} value={cat.value}>{cat.label}</option>
              ))}
            </select>
            
            {/* Color selector */}
            <div className="flex items-center gap-1">
              <span className="text-xs text-yellow-700 mr-1">Color:</span>
              {NOTE_COLORS.map((c) => (
                <button
                  key={c.value}
                  onClick={() => setColor(c.value)}
                  className={`w-6 h-6 rounded-full ${c.preview} border-2 transition-transform ${
                    color === c.value ? 'border-gray-800 scale-110' : 'border-transparent hover:scale-105'
                  }`}
                  title={c.label}
                />
              ))}
            </div>
            
            <div className="flex-1 flex flex-wrap gap-2">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-1 bg-yellow-300/70 text-yellow-900 text-xs rounded-full flex items-center gap-1"
                >
                  {tag}
                  <button onClick={() => removeTag(tag)} className="hover:text-red-600">×</button>
                </span>
              ))}
              <input
                type="text"
                placeholder="Add tag..."
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addTag()}
                className="px-2 py-1 bg-yellow-200 border border-yellow-400 rounded text-yellow-900 text-xs w-24 focus:outline-none focus:border-yellow-500"
              />
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-hidden bg-yellow-50" style={{ minHeight: '300px' }}>
          {showPreview ? (
            <div className="h-full p-4 overflow-y-auto text-yellow-900 prose max-w-none">
              <h3>{title || 'Untitled'}</h3>
              <p className="text-yellow-700 text-sm">{category} • {tags.join(', ')}</p>
              <div className="mt-4 whitespace-pre-wrap">{content}</div>
            </div>
          ) : (
            <textarea
              placeholder="Start writing your note...

Use Markdown for formatting:
- **bold** for bold
- *italic* for italic
- # Heading
- - bullet points
- 1. numbered lists
- `code` for inline code"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full h-64 p-4 bg-yellow-50 text-yellow-900 placeholder-yellow-600/50 resize-none focus:outline-none font-mono text-sm"
            />
          )}
        </div>

        <div className="flex items-center justify-between p-4 border-t border-yellow-300 bg-yellow-100">
          <div className="text-xs text-yellow-700">
            {content.split(/\s+/).filter(Boolean).length} words • {content.length} characters
          </div>
          <div className="flex gap-2">
            <button
              onClick={generateICS}
              disabled={!title.trim() || !content.trim()}
              className="px-4 py-2 bg-yellow-300 hover:bg-yellow-400 disabled:bg-yellow-200 text-yellow-900 rounded text-sm"
            >
              Export to Calendar
            </button>
            <button
              onClick={contextualizeAndSave}
              disabled={isSaving || !title.trim() || !content.trim()}
              className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 disabled:bg-yellow-300 text-yellow-900 rounded text-sm font-medium"
            >
              {contextualizing ? 'Analyzing...' : isSaving ? 'Saving...' : 'Save Note'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface Note {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  createdAt: number;
  updatedAt: number;
}

interface NotesListProps {
  onEdit: (note: Note) => void;
}

export function NotesList({ onEdit }: NotesListProps) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  useEffect(() => {
    loadNotes();
  }, []);

  const loadNotes = async () => {
    try {
      const response = await fetch('/api/database?action=notes');
      const data = await response.json();
      setNotes(data.notes || []);
    } catch (error) {
      console.error('Error loading notes:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteNote = async (id: string) => {
    if (!confirm('Are you sure you want to delete this note?')) return;
    
    try {
      await fetch('/api/database', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'deleteNote', data: { id } }),
      });
      loadNotes();
    } catch (error) {
      console.error('Error deleting note:', error);
    }
  };

  const categories = ['all', 'general', 'meeting', 'research', 'idea', 'project', 'personal', 'work'];

  const filteredNotes = notes.filter(note => {
    const matchesSearch = note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          note.content.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || note.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        <input
          type="text"
          placeholder="Search notes..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 px-4 py-2 bg-gray-800 border border-gray-700 rounded text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
        />
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="px-4 py-2 bg-gray-800 border border-gray-700 rounded text-white focus:outline-none"
        >
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat === 'all' ? 'All Categories' : cat.charAt(0).toUpperCase() + cat.slice(1)}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="text-gray-400">Loading notes...</div>
      ) : filteredNotes.length === 0 ? (
        <div className="text-gray-400 text-center py-8">
          {searchQuery || selectedCategory !== 'all' 
            ? 'No notes match your search' 
            : 'No notes yet. Click "New Note" to create one!'}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredNotes.map((note, index) => {
            // Rotate notes slightly for organic feel
            const rotations = ['-1deg', '0.5deg', '1deg', '-0.5deg', '0deg', '1.5deg', '-1.5deg', '0.25deg'];
            const rotation = rotations[index % rotations.length];
            
            return (
              <div
                key={note.id}
                className="p-4 bg-yellow-100 rounded-sm shadow-lg hover:shadow-xl transition-all cursor-pointer group relative"
                style={{
                  transform: `rotate(${rotation})`,
                  backgroundImage: 'linear-gradient(to bottom, rgba(255,255,0,0.05) 0%, transparent 3%)',
                }}
                onClick={() => onEdit(note)}
              >
                {/* Pin */}
                <div className="absolute -top-1.5 left-1/2 transform -translate-x-1/2 w-4 h-4 rounded-full bg-red-500 opacity-80"
                     style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.3)' }} />
                
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-medium text-yellow-900 truncate flex-1">{note.title}</h3>
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteNote(note.id); }}
                    className="p-1 text-yellow-700 opacity-0 group-hover:opacity-100 hover:text-red-600 transition-opacity"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
                <p className="text-sm text-yellow-800 line-clamp-3 mb-2">{note.content}</p>
                <div className="flex flex-wrap gap-1 mb-2">
                  <span className="text-xs px-2 py-0.5 bg-yellow-200 text-yellow-800 rounded">
                    {note.category}
                  </span>
                  {note.tags.slice(0, 2).map((tag) => (
                    <span key={tag} className="text-xs px-2 py-0.5 bg-yellow-300/50 text-yellow-700 rounded">
                      {tag}
                    </span>
                  ))}
                </div>
                <p className="text-xs text-yellow-600">
                  {new Date(note.updatedAt).toLocaleDateString()}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
