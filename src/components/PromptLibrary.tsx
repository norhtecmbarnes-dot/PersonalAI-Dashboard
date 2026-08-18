'use client';

import { useState, useEffect, useCallback } from 'react';

export interface PromptVariable {
  name: string;
  description?: string;
  default?: string;
}

export interface Prompt {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  variables: PromptVariable[];
  use_count: number;
  createdAt: number;
  updatedAt: number;
}

const DEFAULT_CATEGORIES = ['general', 'proposal', 'writing', 'research', 'coding', 'custom'];

export default function PromptLibrary() {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [filterCategory, setFilterCategory] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Prompt | null>(null);
  const [message, setMessage] = useState('');

  // Editor form state
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('general');
  const [tags, setTags] = useState('');
  const [variables, setVariables] = useState<PromptVariable[]>([]);

  const loadPrompts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterCategory) params.set('category', filterCategory);
      const response = await fetch(`/api/prompts?${params.toString()}`);
      const data = await response.json();
      let list: Prompt[] = data.prompts || [];
      if (search.trim()) {
        const q = search.toLowerCase();
        list = list.filter(
          p =>
            p.title.toLowerCase().includes(q) ||
            p.content.toLowerCase().includes(q) ||
            (p.tags || []).some(t => t.toLowerCase().includes(q))
        );
      }
      setPrompts(list);
    } catch (error) {
      console.error('Error loading prompts:', error);
    } finally {
      setLoading(false);
    }
  }, [filterCategory, search]);

  useEffect(() => {
    loadPrompts();
  }, [loadPrompts]);

  const openNew = () => {
    setEditing(null);
    setTitle('');
    setContent('');
    setCategory('general');
    setTags('');
    setVariables([]);
    setEditorOpen(true);
  };

  const openEdit = (prompt: Prompt) => {
    setEditing(prompt);
    setTitle(prompt.title);
    setContent(prompt.content);
    setCategory(prompt.category || 'general');
    setTags((prompt.tags || []).join(', '));
    setVariables(prompt.variables || []);
    setEditorOpen(true);
  };

  const savePrompt = async () => {
    if (!title.trim() || !content.trim()) {
      setMessage('Title and content are required');
      return;
    }
    try {
      const response = await fetch('/api/prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: editing ? 'update' : 'create',
          id: editing?.id,
          title: title.trim(),
          content: content.trim(),
          category,
          tags: tags
            .split(',')
            .map(t => t.trim())
            .filter(Boolean),
          variables: variables.filter(v => v.name.trim()),
        }),
      });
      const data = await response.json();
      if (data.success) {
        setEditorOpen(false);
        setMessage(editing ? 'Prompt updated.' : 'Prompt saved to the database.');
        loadPrompts();
      } else {
        setMessage(data.error || 'Failed to save prompt');
      }
    } catch (error) {
      console.error('Error saving prompt:', error);
      setMessage('Failed to save prompt');
    }
  };

  const deletePrompt = async (prompt: Prompt) => {
    if (!confirm(`Delete prompt "${prompt.title}"?`)) return;
    try {
      await fetch('/api/prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', id: prompt.id }),
      });
      loadPrompts();
    } catch (error) {
      console.error('Error deleting prompt:', error);
    }
  };

  const incrementUse = async (prompt: Prompt) => {
    try {
      await fetch('/api/prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'increment', id: prompt.id }),
      });
    } catch {
      // Non-fatal
    }
  };

  const copyPrompt = async (prompt: Prompt) => {
    try {
      await navigator.clipboard.writeText(prompt.content);
      incrementUse(prompt);
      setMessage(`Copied "${prompt.title}" to clipboard.`);
    } catch (error) {
      console.error('Copy failed:', error);
      setMessage('Copy failed — clipboard unavailable.');
    }
  };

  // Fill variables and copy the final prompt text
  const applyPrompt = (prompt: Prompt) => {
    const openEditorWithFill = () => {
      openEdit(prompt);
      setMessage('');
    };
    // If the prompt has variables, open the editor for filling; otherwise copy directly.
    if (prompt.variables && prompt.variables.length > 0) {
      openEditorWithFill();
      setMessage(
        `Prompt "${prompt.title}" has variables — fill them in the editor, then use "Apply & Copy".`
      );
    } else {
      copyPrompt(prompt);
    }
  };

  const fillAndCopy = () => {
    let finalText = content;
    variables.forEach(v => {
      const value = v.default || '';
      finalText = finalText.split(`{{${v.name}}}`).join(value);
    });
    // Any remaining placeholders are left as-is for the user to fill manually.
    try {
      navigator.clipboard.writeText(finalText);
      incrementUse(editing!);
      setMessage('Prompt filled with variables and copied to clipboard.');
    } catch (error) {
      console.error('Copy failed:', error);
      setMessage('Copy failed — clipboard unavailable.');
    }
  };

  const setVariable = (index: number, field: keyof PromptVariable, value: string) => {
    const next = [...variables];
    next[index] = { ...next[index], [field]: value };
    setVariables(next);
  };

  return (
    <div className="space-y-4">
      {message && (
        <div className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-sm text-gray-300">
          {message}
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setFilterCategory('')}
            className={`px-3 py-1 rounded text-sm ${!filterCategory ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
          >
            All
          </button>
          {DEFAULT_CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setFilterCategory(filterCategory === cat ? '' : cat)}
              className={`px-3 py-1 rounded text-sm capitalize ${filterCategory === cat ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
            >
              {cat}
            </button>
          ))}
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search prompts..."
            className="ml-2 px-3 py-1.5 bg-gray-800 border border-gray-700 rounded text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
          />
        </div>
        <button
          onClick={openNew}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium"
        >
          + New Prompt
        </button>
      </div>

      {/* Prompt list */}
      {loading ? (
        <p className="text-gray-500 text-sm">Loading prompts...</p>
      ) : prompts.length === 0 ? (
        <div className="bg-gray-800/50 border border-dashed border-gray-600 rounded-lg p-12 text-center">
          <p className="text-gray-400 mb-2">No prompts yet.</p>
          <p className="text-sm text-gray-500">
            Create reusable prompts for proposals, research, and writing. They are stored in the
            database and available to the AI in chat.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {prompts.map(prompt => (
            <div
              key={prompt.id}
              className="bg-gray-800 rounded-lg p-4 border border-gray-700 flex flex-col"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="font-medium text-white truncate">{prompt.title}</h3>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="text-xs px-2 py-0.5 bg-purple-900/50 text-purple-300 rounded capitalize">
                      {prompt.category || 'general'}
                    </span>
                    {(prompt.tags || []).slice(0, 4).map(tag => (
                      <span key={tag} className="text-xs px-1.5 py-0.5 bg-gray-600 rounded">
                        {tag}
                      </span>
                    ))}
                    <span className="text-xs text-gray-500">
                      {prompt.use_count || 0} uses
                    </span>
                  </div>
                </div>
              </div>

              <p className="text-sm text-gray-400 mt-2 line-clamp-3 whitespace-pre-line">
                {prompt.content}
              </p>

              {prompt.variables && prompt.variables.length > 0 && (
                <p className="text-xs text-gray-500 mt-1">
                  Variables:{' '}
                  {prompt.variables.map(v => `{{${v.name}}}`).join(' ')}
                </p>
              )}

              <div className="flex gap-2 mt-3 pt-3 border-t border-gray-700">
                <button
                  onClick={() => applyPrompt(prompt)}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded text-xs text-white"
                >
                  Use
                </button>
                <button
                  onClick={() => copyPrompt(prompt)}
                  className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-xs text-white"
                >
                  Copy
                </button>
                <button
                  onClick={() => openEdit(prompt)}
                  className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-xs text-white"
                >
                  Edit
                </button>
                <button
                  onClick={() => deletePrompt(prompt)}
                  className="px-3 py-1.5 bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white rounded text-xs"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Editor Modal */}
      {editorOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-white mb-4">
              {editing ? 'Edit Prompt' : 'New Prompt'}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Title</label>
                <input
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="e.g., Proposal Win Theme Generator"
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white text-sm focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Category</label>
                  <select
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white text-sm"
                  >
                    {DEFAULT_CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">
                    Tags <span className="text-gray-600">(comma separated)</span>
                  </label>
                  <input
                    value={tags}
                    onChange={e => setTags(e.target.value)}
                    placeholder="SBIR, win-theme"
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white text-sm focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">Prompt content</label>
                <textarea
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  rows={8}
                  placeholder="Write the prompt. Use {{variableName}} for reusable fields."
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white text-sm font-mono focus:outline-none focus:border-purple-500 resize-y"
                />
              </div>

              {/* Variables */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm text-gray-400">Variables</label>
                  <button
                    onClick={() =>
                      setVariables([...variables, { name: '', description: '', default: '' }])
                    }
                    className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs text-white"
                  >
                    + Add Variable
                  </button>
                </div>
                {variables.length === 0 && (
                  <p className="text-xs text-gray-500">
                    No variables. Use {'{{example}}'} in the prompt content to add a reusable
                    field.
                  </p>
                )}
                {variables.map((v, i) => (
                  <div key={i} className="grid grid-cols-[1fr_1.5fr_1fr_auto] gap-2 mb-2 items-center">
                    <input
                      value={v.name}
                      onChange={e => setVariable(i, 'name', e.target.value)}
                      placeholder="name"
                      className="px-2 py-1.5 bg-gray-900 border border-gray-700 rounded text-white text-xs focus:outline-none focus:border-purple-500"
                    />
                    <input
                      value={v.description || ''}
                      onChange={e => setVariable(i, 'description', e.target.value)}
                      placeholder="description"
                      className="px-2 py-1.5 bg-gray-900 border border-gray-700 rounded text-white text-xs focus:outline-none focus:border-purple-500"
                    />
                    <input
                      value={v.default || ''}
                      onChange={e => setVariable(i, 'default', e.target.value)}
                      placeholder="default"
                      className="px-2 py-1.5 bg-gray-900 border border-gray-700 rounded text-white text-xs focus:outline-none focus:border-purple-500"
                    />
                    <button
                      onClick={() => setVariables(variables.filter((_, idx) => idx !== i))}
                      className="px-2 py-1.5 bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white rounded text-xs"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              {editing && variables.filter(v => v.name.trim()).length > 0 && (
                <button
                  onClick={fillAndCopy}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded text-sm text-white"
                >
                  Apply Variables & Copy
                </button>
              )}
              <button
                onClick={() => setEditorOpen(false)}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm text-white"
              >
                Cancel
              </button>
              <button
                onClick={savePrompt}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded text-sm text-white"
              >
                Save to Database
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
