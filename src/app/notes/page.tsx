'use client';

import { useState, useEffect } from 'react';
import { NoteEditor, NotesList } from '@/components/NoteEditor';
import { NotesBoard } from '@/components/NotesBoard';
import { ModelSelector } from '@/components/ModelSelector';

interface Note {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  color?: string;
  positionX?: number;
  positionY?: number;
  width?: number;
  height?: number;
  createdAt: number;
  updatedAt: number;
}

export default function NotesPage() {
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | undefined>();
  const [viewMode, setViewMode] = useState<'board' | 'list'>('board');
  const [selectedModel, setSelectedModel] = useState('');

  const handleModelChange = (modelId: string) => {
    setSelectedModel(modelId);
    // Persist to localStorage for consistency across tabs
    if (typeof window !== 'undefined') {
      localStorage.setItem('selectedModel', modelId);
    }
  };

  // Load saved model on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('selectedModel');
      if (saved) setSelectedModel(saved);
    }
  }, []);

  const handleNewNote = () => {
    setEditingNote(undefined);
    setIsEditorOpen(true);
  };

  const handleEditNote = (note: Note) => {
    setEditingNote(note);
    setIsEditorOpen(true);
  };

  const handleCloseEditor = () => {
    setIsEditorOpen(false);
    setEditingNote(undefined);
  };

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white">Notes</h1>
            <p className="text-gray-400 mt-1">
              Drag notes to move • Double-click to edit • Resize from corner
            </p>
          </div>
          <div className="flex gap-2 items-center">
            {/* View toggle */}
            <div className="flex bg-gray-800 rounded-lg p-1">
              <button
                onClick={() => setViewMode('board')}
                className={`px-3 py-1 rounded text-sm ${
                  viewMode === 'board' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                Board
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-1 rounded text-sm ${
                  viewMode === 'list' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                List
              </button>
            </div>
            <button
              onClick={handleNewNote}
              className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Note
            </button>
          </div>
        </div>

        {viewMode === 'board' ? (
          <div className="h-[calc(100vh-180px)]">
            <NotesBoard onEditNote={handleEditNote} />
          </div>
        ) : (
          <NotesList onEdit={handleEditNote} />
        )}

        <NoteEditor
          isOpen={isEditorOpen}
          onClose={handleCloseEditor}
          initialNote={editingNote}
        />
      </div>
    </div>
  );
}
