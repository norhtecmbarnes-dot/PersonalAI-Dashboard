'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface Note {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  positionX: number;
  positionY: number;
  width: number;
  height: number;
  color: string;
  createdAt: number;
  updatedAt: number;
}

interface DragState {
  noteId: string | null;
  startX: number;
  startY: number;
  startLeft: number;
  startTop: number;
}

interface ResizeState {
  noteId: string | null;
  startX: number;
  startY: number;
  startWidth: number;
  startHeight: number;
}

const NOTE_COLORS = [
  { value: 'yellow', bg: 'bg-yellow-100', border: 'border-yellow-300', text: 'text-yellow-900', pin: 'bg-red-500' },
  { value: 'blue', bg: 'bg-blue-100', border: 'border-blue-300', text: 'text-blue-900', pin: 'bg-green-500' },
  { value: 'green', bg: 'bg-green-100', border: 'border-green-300', text: 'text-green-900', pin: 'bg-yellow-500' },
  { value: 'pink', bg: 'bg-pink-100', border: 'border-pink-300', text: 'text-pink-900', pin: 'bg-blue-500' },
  { value: 'purple', bg: 'bg-purple-100', border: 'border-purple-300', text: 'text-purple-900', pin: 'bg-orange-500' },
  { value: 'orange', bg: 'bg-orange-100', border: 'border-orange-300', text: 'text-orange-900', pin: 'bg-purple-500' },
];

interface NotesBoardProps {
  onEditNote?: (note: Note) => void;
}

export function NotesBoard({ onEditNote }: NotesBoardProps) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [dragState, setDragState] = useState<DragState>({ noteId: null, startX: 0, startY: 0, startLeft: 0, startTop: 0 });
  const [resizeState, setResizeState] = useState<ResizeState>({ noteId: null, startX: 0, startY: 0, startWidth: 0, startHeight: 0 });
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const [boardOffset, setBoardOffset] = useState({ x: 0, y: 0 });

  const loadNotes = useCallback(async () => {
    try {
      const response = await fetch('/api/database?action=notes');
      const data = await response.json();
      setNotes(data.notes || []);
    } catch (error) {
      console.error('Error loading notes:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  const saveNotePosition = useCallback(async (id: string, positionX: number, positionY: number, width?: number, height?: number) => {
    try {
      const response = await fetch('/api/database', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'updateNote',
          data: { id, updates: { positionX, positionY, width: width || 300, height: height || 200 } },
        }),
      });
      const result = await response.json();
      if (!result.success) {
        console.error('[NotesBoard] Failed to save position:', result.error);
      }
    } catch (error) {
      console.error('[NotesBoard] Error saving note position:', error);
    }
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent, noteId: string) => {
    if ((e.target as HTMLElement).closest('.resize-handle')) return;
    
    const note = notes.find(n => n.id === noteId);
    if (!note) return;

    setDragState({
      noteId,
      startX: e.clientX,
      startY: e.clientY,
      startLeft: note.positionX,
      startTop: note.positionY,
    });
    setSelectedNoteId(noteId);
    e.preventDefault();
  }, [notes]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (dragState.noteId) {
      const deltaX = e.clientX - dragState.startX;
      const deltaY = e.clientY - dragState.startY;
      
      const newX = Math.max(0, dragState.startLeft + deltaX);
      const newY = Math.max(0, dragState.startTop + deltaY);

      setNotes(prev => prev.map(note =>
        note.id === dragState.noteId
          ? { ...note, positionX: newX, positionY: newY }
          : note
      ));
    }

    if (resizeState.noteId) {
      const deltaX = e.clientX - resizeState.startX;
      const deltaY = e.clientY - resizeState.startY;
      
      const newWidth = Math.max(200, resizeState.startWidth + deltaX);
      const newHeight = Math.max(150, resizeState.startHeight + deltaY);

      setNotes(prev => prev.map(note =>
        note.id === resizeState.noteId
          ? { ...note, width: newWidth, height: newHeight }
          : note
      ));
    }
  }, [dragState, resizeState]);

  const handleMouseUp = useCallback(() => {
    // Get current note state using functional update
    setNotes(currentNotes => {
      if (dragState.noteId) {
        const note = currentNotes.find(n => n.id === dragState.noteId);
        if (note) {
          saveNotePosition(note.id, note.positionX, note.positionY, note.width, note.height);
        }
      }
      
      if (resizeState.noteId) {
        const note = currentNotes.find(n => n.id === resizeState.noteId);
        if (note) {
          saveNotePosition(note.id, note.positionX, note.positionY, note.width, note.height);
        }
      }
      
      return currentNotes; // Return unchanged state
    });
    
    setDragState({ noteId: null, startX: 0, startY: 0, startLeft: 0, startTop: 0 });
    setResizeState({ noteId: null, startX: 0, startY: 0, startWidth: 0, startHeight: 0 });
  }, [dragState, resizeState, saveNotePosition]);

  useEffect(() => {
    if (dragState.noteId || resizeState.noteId) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [dragState.noteId, resizeState.noteId, handleMouseMove, handleMouseUp]);

  const handleResizeStart = useCallback((e: React.MouseEvent, noteId: string) => {
    e.stopPropagation();
    const note = notes.find(n => n.id === noteId);
    if (!note) return;

    setResizeState({
      noteId,
      startX: e.clientX,
      startY: e.clientY,
      startWidth: note.width || 300,
      startHeight: note.height || 200,
    });
  }, [notes]);

  const deleteNote = useCallback(async (id: string) => {
    const confirmed = window.confirm('Delete this note?');
    if (!confirmed) return;
    
    try {
      await fetch('/api/database', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'deleteNote', data: { id } }),
      });
      setNotes(prev => prev.filter(n => n.id !== id));
    } catch (error) {
      console.error('Error deleting note:', error);
    }
  }, []);

  const getNoteColor = useCallback((color: string) => {
    return NOTE_COLORS.find(c => c.value === color) || NOTE_COLORS[0];
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-400">Loading notes...</div>
      </div>
    );
  }

  return (
    <div
      ref={boardRef}
      className="relative h-full min-h-[600px] bg-gray-800 rounded-lg overflow-hidden"
      style={{
        backgroundImage: 'radial-gradient(circle, #374151 1px, transparent 1px)',
        backgroundSize: '20px 20px',
      }}
      onClick={() => setSelectedNoteId(null)}
    >
      {notes.length === 0 ? (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center text-gray-500">
            <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-lg">No notes yet</p>
            <p className="text-sm mt-2">Click "New Note" to create one</p>
          </div>
        </div>
      ) : (
        notes.map(note => {
          const colorStyle = getNoteColor(note.color);
          const isSelected = selectedNoteId === note.id;
          
          return (
            <div
              key={note.id}
              className={`absolute cursor-move shadow-lg hover:shadow-xl transition-shadow ${colorStyle.bg} ${colorStyle.border} border rounded-sm overflow-hidden ${isSelected ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-gray-800' : ''}`}
              style={{
                left: note.positionX || 0,
                top: note.positionY || 0,
                width: note.width || 300,
                height: note.height || 200,
                zIndex: isSelected ? 100 : 1,
              }}
              onMouseDown={(e) => handleMouseDown(e, note.id)}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedNoteId(note.id);
              }}
              onDoubleClick={() => onEditNote?.(note)}
            >
              {/* Pin */}
              <div className={`absolute -top-1.5 left-1/2 transform -translate-x-1/2 w-4 h-4 rounded-full ${colorStyle.pin}`}
                   style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.3)' }} />
              
              {/* Header - Inline Editable Title */}
              <div className={`${colorStyle.border} border-b px-3 py-2 flex items-center justify-between`}>
                <input
                  type="text"
                  value={note.title || 'Untitled'}
                  onChange={(e) => {
                    e.stopPropagation();
                    const newTitle = e.target.value;
                    setNotes(prev => prev.map(n =>
                      n.id === note.id ? { ...n, title: newTitle } : n
                    ));
                  }}
                  onBlur={async () => {
                    const noteToUpdate = notes.find(n => n.id === note.id);
                    if (noteToUpdate) {
                      try {
                        const response = await fetch('/api/database', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            action: 'updateNote',
                            data: { id: note.id, updates: { title: noteToUpdate.title } },
                          }),
                        });
                        const result = await response.json();
                        if (!result.success) {
                          console.error('[NotesBoard] Failed to save title:', result.error);
                        }
                      } catch (err) {
                        console.error('[NotesBoard] Error saving title:', err);
                      }
                    }
                  }}
                  className={`flex-1 font-medium ${colorStyle.text} bg-transparent border-none focus:outline-none text-sm mr-2`}
                  onClick={(e) => e.stopPropagation()}
                />
                <button
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    deleteNote(note.id);
                  }}
                  className={`p-1 ${colorStyle.text} opacity-60 hover:opacity-100 hover:bg-red-500/20 rounded transition-colors`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
               {/* Content - Inline Editable */}
               <div 
                 className="p-3 overflow-hidden cursor-text" 
                 style={{ height: 'calc(100% - 60px)' }}
                 onClick={(e) => {
                   e.stopPropagation();
                   setSelectedNoteId(note.id);
                 }}
               >
                 <textarea
                   value={note.content}
                   onChange={(e) => {
                     e.stopPropagation();
                     const newContent = e.target.value;
                     setNotes(prev => prev.map(n =>
                       n.id === note.id ? { ...n, content: newContent } : n
                     ));
                   }}
                    onBlur={async () => {
                      const noteToUpdate = notes.find(n => n.id === note.id);
                      if (noteToUpdate) {
                        try {
                          const response = await fetch('/api/database', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              action: 'updateNote',
                              data: { id: note.id, updates: { content: noteToUpdate.content } },
                            }),
                          });
                          const result = await response.json();
                          if (!result.success) {
                            console.error('[NotesBoard] Failed to save content:', result.error);
                          }
                        } catch (err) {
                          console.error('[NotesBoard] Error saving content:', err);
                        }
                      }
                    }}
                   className={`w-full h-full bg-transparent ${colorStyle.text} text-sm resize-none focus:outline-none placeholder-gray-500/50`}
                   placeholder="Start typing..."
                   onClick={(e) => e.stopPropagation()}
                 />
               </div>
              
              {/* Footer - Category & Tags */}
              <div className={`absolute bottom-0 left-0 right-0 px-2 py-1 flex items-center gap-1 ${colorStyle.bg} border-t ${colorStyle.border}`}>
                <span className={`text-xs px-1.5 py-0.5 ${colorStyle.text} bg-white/50 rounded`}>
                  {note.category}
                </span>
                {note.tags?.slice(0, 2).map((tag: string) => (
                  <span key={tag} className={`text-xs px-1.5 py-0.5 ${colorStyle.text} bg-black/10 rounded truncate max-w-[60px]`}>
                    {tag}
                  </span>
                ))}
              </div>
              
              {/* Resize handle */}
              {isSelected && (
                <div
                  className="resize-handle absolute bottom-0 right-0 w-4 h-4 cursor-se-resize"
                  onMouseDown={(e) => handleResizeStart(e, note.id)}
                >
                  <svg className="w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M22 22H20V20H22V22ZM22 18H18V22H22V18ZM18 22H14V20H18V22Z" />
                  </svg>
                </div>
              )}
            </div>
          );
        })
      )}
      
      {/* Instructions overlay */}
      <div className="absolute bottom-4 right-4 text-xs text-gray-500 bg-gray-900/80 px-3 py-2 rounded">
        Drag to move • Click to edit • Type directly on note
      </div>
    </div>
  );
}