'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useGlobalModel } from '@/lib/context/ModelContext';
import { MarkdownRenderer } from '@/components/MarkdownRenderer';
import {
  MermaidDiagram,
  tableToMermaid,
  parseCSV,
  MERMAID_PROMPTS,
} from '@/components/MermaidDiagram';
import { saveAs } from 'file-saver';

interface ActionResult {
  action: string;
  result: string;
  model: string;
}

interface DocumentChange {
  id: string;
  original: string;
  edited: string;
  changeType: 'addition' | 'deletion' | 'modification';
  suggestion?: string;
  reason?: string;
  accepted: boolean;
  rejected: boolean;
}

export default function WritingAssistantPage() {
  const [input, setInput] = useState('');
  const [action, setAction] = useState<
    | 'expand'
    | 'outline'
    | 'continue'
    | 'rewrite'
    | 'simplify'
    | 'elaborate'
    | 'structure'
    | 'diagram'
    | 'blog_post'
    | 'social_media'
    | 'ad_copy'
    | 'product_description'
    | 'email_template'
    | 'review'
    | 'track_changes'
  >('expand');
  const [style, setStyle] = useState('professional');
  const { selectedModel: model } = useGlobalModel();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ActionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Mode toggle: 'templates' or 'chat'
  const [mode, setMode] = useState<'templates' | 'chat'>('templates');

  // Chat mode state
  const [chatMessages, setChatMessages] = useState<
    Array<{ role: 'user' | 'assistant'; content: string }>
  >([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Theme state
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  // Track changes state
  const [changes, setChanges] = useState<DocumentChange[]>([]);
  const [showChanges, setShowChanges] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [documentTitle, setDocumentTitle] = useState('Untitled Document');

  // Save state
  const [saveMenuOpen, setSaveMenuOpen] = useState(false);
  const saveMenuRef = useRef<HTMLDivElement>(null);

  // Mermaid diagram state
  const [mermaidCode, setMermaidCode] = useState('');
  const [showMermaidPreview, setShowMermaidPreview] = useState(false);

  // Preview state for outline content
  const [showPreview, setShowPreview] = useState(false);
  const [fromOutliner, setFromOutliner] = useState(false);
  const [outlineTitle, setOutlineTitle] = useState<string | null>(null);

  // Load saved theme and outline content on mount
  useEffect(() => {
    // Give React time to hydrate
    const timer = setTimeout(() => {
      if (typeof window !== 'undefined') {
        const savedTheme = localStorage.getItem('writing-theme');
        if (savedTheme) setTheme(savedTheme as 'dark' | 'light');

        // Check for outline content from outline-creator via URL param or localStorage
        const urlParams = new URLSearchParams(window.location.search);
        const outlineParam = urlParams.get('outline');
        const fromOutlinerParam = urlParams.get('from') === 'outliner';
        const actionParam = urlParams.get('action');
        const storedTitle = localStorage.getItem('outline-title');

        console.log('[Writing] URL search:', window.location.search);
        console.log('[Writing] outlineParam exists:', !!outlineParam);
        if (outlineParam) {
          console.log('[Writing] outlineParam length:', outlineParam.length);
          try {
            const decoded = decodeURIComponent(outlineParam);
            console.log('[Writing] Decoded content length:', decoded.length);
            setInput(decoded);
            setShowPreview(true);
            if (storedTitle) setOutlineTitle(storedTitle);
            if (fromOutlinerParam) {
              setFromOutliner(true);
              if (actionParam) setAction(actionParam as any);
            }
            // Clean URL
            window.history.replaceState({}, '', window.location.pathname);
          } catch (e) {
            console.error('[Writing] Decode error:', e);
            const outlineContent = localStorage.getItem('outline-content');
            if (outlineContent) {
              setInput(outlineContent);
              setShowPreview(true);
              if (storedTitle) setOutlineTitle(storedTitle);
              if (fromOutlinerParam) setFromOutliner(true);
              localStorage.removeItem('outline-content');
            }
          }
        } else {
          const outlineContent = localStorage.getItem('outline-content');
          if (outlineContent) {
            setInput(outlineContent);
            setShowPreview(true);
            if (storedTitle) setOutlineTitle(storedTitle);
            setFromOutliner(true);
            localStorage.removeItem('outline-content');
            localStorage.removeItem('outline-title');
          }
        }
      }
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    if (typeof window !== 'undefined') {
      localStorage.setItem('writing-theme', newTheme);
    }
  };

  // Close save menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (saveMenuRef.current && !saveMenuRef.current.contains(event.target as Node)) {
        setSaveMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSubmit = async () => {
    if (!input.trim() && !['review', 'track_changes'].includes(action)) {
      if (!input.trim() && ['review', 'track_changes'].includes(action)) {
        setError('Please enter text to review');
        return;
      }
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    setChanges([]);

    const modelToUse = model || 'ollama/llama3.2:latest';

    try {
      const response = await fetch('/api/writing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          text: input,
          style: action === 'rewrite' ? style : undefined,
          model: modelToUse,
          stream: false,
          trackChanges: action === 'track_changes' || action === 'review',
        }),
      });

      const data = await response.json();

      if (data.success) {
        setResult(data);

        // Process track changes
        if (data.changes && Array.isArray(data.changes)) {
          setChanges(data.changes);
          setShowChanges(true);
        }
      } else {
        setError(data.error || 'Failed to process');
      }
    } catch (err) {
      console.error('[Writing] Error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    }

    setLoading(false);
  };

  // Convert table data to Mermaid diagram
  const handleCreateDiagram = async (type: 'flowchart' | 'sequence' | 'state') => {
    if (!input.trim()) {
      setError('Please enter data to convert to diagram');
      return;
    }

    // Try to parse as CSV or table
    let tableData: string[][] = [];

    // Check if input looks like CSV
    if (input.includes(',') || input.includes('\t')) {
      tableData = parseCSV(input);
    } else {
      // Try to parse as markdown table
      const lines = input.trim().split('\n');
      tableData = lines.map(line =>
        line
          .split('|')
          .map(cell => cell.trim())
          .filter(cell => cell)
      );
    }

    if (tableData.length < 2) {
      // If no table data, use AI to generate Mermaid from text
      setLoading(true);
      try {
        const response = await fetch('/api/writing', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'diagram',
            text: input,
            style: type,
            model: model || 'ollama/qwen3.5:2b',
          }),
        });
        const data = await response.json();
        if (data.success) {
          setMermaidCode(data.result);
          setShowMermaidPreview(true);
        } else {
          setError(data.error || 'Failed to generate diagram');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to generate diagram');
      }
      setLoading(false);
      return;
    }

    // Convert table to Mermaid
    const mermaidCode = tableToMermaid(tableData, { tableType: type });
    setMermaidCode(mermaidCode);
    setShowMermaidPreview(true);
  };

  // Insert Mermaid code into result
  const insertMermaidToResult = () => {
    if (mermaidCode) {
      const mermaidBlock = `\`\`\`mermaid\n${mermaidCode}\n\`\`\``;
      setInput(prev => prev + (prev ? '\n\n' : '') + mermaidBlock);
      setShowMermaidPreview(false);
    }
  };

  const copyResult = () => {
    if (result?.result) {
      navigator.clipboard.writeText(result.result);
    }
  };

  const useAsInput = () => {
    if (result?.result) {
      setInput(result.result);
      setResult(null);
    }
  };

  // Save functions
  const saveAsTxt = () => {
    if (!result?.result) return;
    const blob = new Blob([result.result], { type: 'text/plain' });
    saveAs(blob, `${documentTitle}.txt`);
    setSaveMenuOpen(false);
  };

  const saveAsDocx = async () => {
    if (!result?.result) return;

    try {
      const response = await fetch('/api/writing/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: result.result,
          title: documentTitle,
          format: 'docx',
        }),
      });

      if (response.ok) {
        const blob = await response.blob();
        saveAs(blob, `${documentTitle}.docx`);
      }
      setSaveMenuOpen(false);
    } catch (err) {
      console.error('Error saving as DOCX:', err);
      setError('Failed to save as DOCX');
    }
  };

  const saveAsPdf = async () => {
    if (!result?.result) return;

    // For now, save as text with .pdf extension
    // In production, would use proper PDF generation
    const blob = new Blob([result.result], { type: 'application/pdf' });
    saveAs(blob, `${documentTitle}.pdf`);
    setSaveMenuOpen(false);
  };

  const acceptChange = (changeId: string) => {
    setChanges(
      changes.map(c => (c.id === changeId ? { ...c, accepted: true, rejected: false } : c))
    );
  };

  const rejectChange = (changeId: string) => {
    setChanges(
      changes.map(c => (c.id === changeId ? { ...c, accepted: false, rejected: true } : c))
    );
  };

  const acceptAllChanges = () => {
    setChanges(changes.map(c => ({ ...c, accepted: true, rejected: false })));
  };

  const rejectAllChanges = () => {
    setChanges(changes.map(c => ({ ...c, accepted: false, rejected: true })));
  };

  const themeClasses =
    theme === 'dark'
      ? 'bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white'
      : 'bg-gradient-to-br from-blue-50 via-white to-purple-50 text-gray-900';

  const cardClasses =
    theme === 'dark' ? 'bg-slate-800/50 backdrop-blur' : 'bg-white/80 backdrop-blur shadow-lg';

  const inputClasses =
    theme === 'dark'
      ? 'bg-slate-900 text-white border-slate-700 focus:border-purple-500'
      : 'bg-white text-gray-900 border-gray-300 focus:border-purple-500';

  return (
    <div className={`min-h-screen ${themeClasses} p-6 transition-colors duration-300`}>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-3">
              <h1
                className={`text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}
              >
                Writing Assistant
              </h1>
              <input
                type="text"
                value={documentTitle}
                onChange={e => setDocumentTitle(e.target.value)}
                className={`px-3 py-1 rounded border ${
                  theme === 'dark'
                    ? 'bg-slate-800 border-slate-600 text-white'
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
                placeholder="Document Title"
              />
            </div>
            <p className={`${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'} mt-1`}>
              Expand, outline, and enhance your writing with AI • Track Changes & Review
            </p>
          </div>
          <div className="flex gap-2 items-center">
            {/* Outliner Banner */}
            {fromOutliner && (
              <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-600/20 border border-purple-500/50 text-purple-300">
                <span>📋</span>
                <span className="text-sm">
                  {outlineTitle ? `Outline: ${outlineTitle}` : 'Outline loaded'}
                </span>
                <span className="text-xs text-purple-400">• Ready to expand</span>
              </div>
            )}

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className={`p-2 rounded-lg ${
                theme === 'dark'
                  ? 'bg-slate-700 text-yellow-400 hover:bg-slate-600'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
              title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
            >
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>

            {/* Save Button with Dropdown */}
            <div className="relative" ref={saveMenuRef}>
              <button
                onClick={() => setSaveMenuOpen(!saveMenuOpen)}
                className={`px-4 py-2 rounded-lg ${
                  theme === 'dark'
                    ? 'bg-green-600 hover:bg-green-700 text-white'
                    : 'bg-green-500 hover:bg-green-600 text-white'
                }`}
              >
                💾 Save
              </button>

              {saveMenuOpen && result?.result && (
                <div
                  className={`absolute right-0 mt-2 w-48 rounded-lg shadow-xl z-50 ${
                    theme === 'dark'
                      ? 'bg-slate-800 border border-slate-700'
                      : 'bg-white border border-gray-200'
                  }`}
                >
                  <button
                    onClick={saveAsTxt}
                    className={`w-full px-4 py-2 text-left ${
                      theme === 'dark'
                        ? 'text-white hover:bg-slate-700'
                        : 'text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    📄 Save as TXT
                  </button>
                  <button
                    onClick={saveAsDocx}
                    className={`w-full px-4 py-2 text-left ${
                      theme === 'dark'
                        ? 'text-white hover:bg-slate-700'
                        : 'text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    📝 Save as DOCX
                  </button>
                  <button
                    onClick={saveAsPdf}
                    className={`w-full px-4 py-2 text-left ${
                      theme === 'dark'
                        ? 'text-white hover:bg-slate-700'
                        : 'text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    📕 Save as PDF
                  </button>
                </div>
              )}
            </div>

            <Link
              href="/outline-creator"
              className={`px-4 py-2 rounded-lg ${
                theme === 'dark'
                  ? 'bg-purple-600 text-white hover:bg-purple-700'
                  : 'bg-purple-500 text-white hover:bg-purple-600'
              }`}
            >
              📋 Outline Creator
            </Link>
            <Link
              href="/outline-creator"
              className={`px-4 py-2 rounded-lg ${
                theme === 'dark'
                  ? 'bg-purple-600 text-white hover:bg-purple-700'
                  : 'bg-purple-500 text-white hover:bg-purple-600'
              }`}
            >
              📋 Outline Creator
            </Link>
            <Link
              href="/office"
              className={`px-4 py-2 rounded-lg ${
                theme === 'dark'
                  ? 'bg-slate-700 text-white hover:bg-slate-600'
                  : 'bg-gray-200 text-gray-900 hover:bg-gray-300'
              }`}
            >
              Office
            </Link>
            <Link
              href="/"
              className={`px-4 py-2 rounded-lg ${
                theme === 'dark'
                  ? 'bg-slate-700 text-white hover:bg-slate-600'
                  : 'bg-gray-200 text-gray-900 hover:bg-gray-300'
              }`}
            >
              ← Chat
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Input Section */}
          <div className="space-y-4">
            {/* Action Selection */}
            <div className={`${cardClasses} rounded-xl p-4`}>
              <h2
                className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-3`}
              >
                Select Action
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-96 overflow-y-auto">
                {[
                  {
                    id: 'expand',
                    name: 'Expand',
                    icon: '📄',
                    desc: 'Add more detail, examples, depth',
                  },
                  {
                    id: 'outline',
                    name: 'Outline',
                    icon: '📋',
                    desc: 'Detailed hierarchical outline',
                  },
                  {
                    id: 'continue',
                    name: 'Continue',
                    icon: '✍️',
                    desc: 'Continue writing naturally',
                  },
                  {
                    id: 'rewrite',
                    name: 'Rewrite',
                    icon: '🔄',
                    desc: 'Rewrite in different style',
                  },
                  {
                    id: 'simplify',
                    name: 'Simplify',
                    icon: '💡',
                    desc: 'Make easier to understand',
                  },
                  {
                    id: 'elaborate',
                    name: 'Elaborate',
                    icon: '📝',
                    desc: 'Add examples and evidence',
                  },
                  { id: 'structure', name: 'Structure', icon: '📊', desc: 'Organize with headers' },
                  {
                    id: 'review',
                    name: 'Review',
                    icon: '👁️',
                    desc: 'AI reviews and suggests improvements',
                  },
                  {
                    id: 'track_changes',
                    name: 'Track Changes',
                    icon: '✏️',
                    desc: 'AI edits with tracked changes',
                  },
                  { id: 'blog_post', name: 'Blog Post', icon: '📝', desc: 'Generate blog post' },
                  { id: 'social_media', name: 'Social', icon: '🐦', desc: 'Social media content' },
                  {
                    id: 'email_template',
                    name: 'Email',
                    icon: '📧',
                    desc: 'Professional email template',
                  },
                ].map(a => (
                  <button
                    key={a.id}
                    onClick={() => setAction(a.id as any)}
                    className={`p-3 rounded-lg text-left transition-colors ${
                      action === a.id
                        ? 'bg-purple-600 text-white'
                        : theme === 'dark'
                          ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <span className="text-lg mr-2">{a.icon}</span>
                    <span className="font-medium text-sm">{a.name}</span>
                  </button>
                ))}
              </div>
              <p
                className={`${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'} text-sm mt-3`}
              >
                {
                  [
                    {
                      id: 'expand',
                      name: 'Expand',
                      icon: '📄',
                      desc: 'Add more detail, examples, depth',
                    },
                    {
                      id: 'outline',
                      name: 'Outline',
                      icon: '📋',
                      desc: 'Detailed hierarchical outline',
                    },
                    {
                      id: 'continue',
                      name: 'Continue',
                      icon: '✍️',
                      desc: 'Continue writing naturally',
                    },
                    {
                      id: 'rewrite',
                      name: 'Rewrite',
                      icon: '🔄',
                      desc: 'Rewrite in different style',
                    },
                    {
                      id: 'simplify',
                      name: 'Simplify',
                      icon: '💡',
                      desc: 'Make easier to understand',
                    },
                    {
                      id: 'elaborate',
                      name: 'Elaborate',
                      icon: '📝',
                      desc: 'Add examples and evidence',
                    },
                    {
                      id: 'structure',
                      name: 'Structure',
                      icon: '📊',
                      desc: 'Organize with headers',
                    },
                    {
                      id: 'review',
                      name: 'Review',
                      icon: '👁️',
                      desc: 'AI reviews and suggests improvements',
                    },
                    {
                      id: 'track_changes',
                      name: 'Track Changes',
                      icon: '✏️',
                      desc: 'AI edits with tracked changes',
                    },
                    { id: 'blog_post', name: 'Blog Post', icon: '📝', desc: 'Generate blog post' },
                    {
                      id: 'social_media',
                      name: 'Social Media',
                      icon: '🐦',
                      desc: 'Social media content',
                    },
                    { id: 'ad_copy', name: 'Ad Copy', icon: '📢', desc: 'Generate ad copy' },
                    {
                      id: 'product_description',
                      name: 'Product Description',
                      icon: '🏷️',
                      desc: 'Product descriptions',
                    },
                    {
                      id: 'email_template',
                      name: 'Email Template',
                      icon: '📧',
                      desc: 'Professional email template',
                    },
                    {
                      id: 'diagram',
                      name: 'Diagram',
                      icon: '🔀',
                      desc: 'Create Mermaid diagram from data',
                    },
                  ].find(x => x.id === action)?.desc
                }
              </p>
            </div>

            {/* Style (for rewrite) */}
            {action === 'rewrite' && (
              <div className={`${cardClasses} rounded-xl p-4`}>
                <h2
                  className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-3`}
                >
                  Rewrite Style
                </h2>
                <div className="flex flex-wrap gap-2">
                  {[
                    'professional',
                    'casual',
                    'academic',
                    'creative',
                    'technical',
                    'persuasive',
                  ].map(s => (
                    <button
                      key={s}
                      onClick={() => setStyle(s)}
                      className={`px-3 py-1 rounded-full text-sm transition-colors ${
                        style === s
                          ? 'bg-purple-600 text-white'
                          : theme === 'dark'
                            ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Diagram Type Selection (for diagram action) */}
            {action === 'diagram' && (
              <div className={`${cardClasses} rounded-xl p-4`}>
                <h2
                  className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-3`}
                >
                  Diagram Type
                </h2>
                <div className="flex flex-wrap gap-3">
                  {[
                    { id: 'flowchart', name: 'Flowchart', icon: '📊' },
                    { id: 'sequence', name: 'Sequence', icon: '📱' },
                    { id: 'state', name: 'State', icon: '🔄' },
                  ].map(d => (
                    <button
                      key={d.id}
                      onClick={() =>
                        handleCreateDiagram(d.id as 'flowchart' | 'sequence' | 'state')
                      }
                      disabled={loading}
                      className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
                        theme === 'dark'
                          ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      } disabled:opacity-50`}
                    >
                      <span>{d.icon}</span>
                      <span>{d.name}</span>
                    </button>
                  ))}
                </div>
                <p
                  className={`${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'} text-sm mt-2`}
                >
                  Enter CSV or tabular data in the input, or just describe what you want to
                  visualize.
                </p>
              </div>
            )}

            {/* Model Selection */}
            <div className={`${cardClasses} rounded-xl p-4`}>
              <h2
                className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-3`}
              >
                AI Model
              </h2>
              <div className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>
                {model || 'Select a model from the navigation bar'}
              </div>
            </div>

            {/* Input Text */}
            <div className={`${cardClasses} rounded-xl p-4`}>
              <h2
                className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-3`}
              >
                Input Text
              </h2>
              <div className="flex gap-2 mb-2">
                <button
                  onClick={() => setShowPreview(false)}
                  className={`px-3 py-1 rounded text-sm ${
                    !showPreview
                      ? theme === 'dark'
                        ? 'bg-purple-600 text-white'
                        : 'bg-purple-500 text-white'
                      : theme === 'dark'
                        ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Edit
                </button>
                <button
                  onClick={() => setShowPreview(true)}
                  className={`px-3 py-1 rounded text-sm ${
                    showPreview
                      ? theme === 'dark'
                        ? 'bg-purple-600 text-white'
                        : 'bg-purple-500 text-white'
                      : theme === 'dark'
                        ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Preview
                </button>
              </div>
              {showPreview ? (
                <div
                  className={`h-64 p-4 rounded-lg border overflow-auto ${
                    theme === 'dark'
                      ? 'bg-slate-900 border-slate-700'
                      : 'bg-gray-50 border-gray-300'
                  }`}
                >
                  <MarkdownRenderer content={input} />
                </div>
              ) : (
                <textarea
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  placeholder="Enter your text here..."
                  className={`w-full h-64 p-4 rounded-lg border focus:outline-none resize-none ${inputClasses}`}
                />
              )}
              <div className="flex justify-between items-center mt-3">
                <span
                  className={`${theme === 'dark' ? 'text-slate-500' : 'text-gray-500'} text-sm`}
                >
                  {input.length} characters
                </span>
                <div className="flex gap-2">
                  {fromOutliner && (
                    <button
                      onClick={handleSubmit}
                      disabled={loading || !input.trim()}
                      className={`px-6 py-2 rounded-lg flex items-center gap-2 animate-pulse ${
                        theme === 'dark'
                          ? 'bg-green-600 text-white hover:bg-green-700'
                          : 'bg-green-500 text-white hover:bg-green-600'
                      } disabled:opacity-50 disabled:cursor-not-allowed disabled:animate-none`}
                    >
                      {loading && <span className="animate-spin">◐</span>}
                      {loading ? 'Expanding...' : '🚀 Expand Outline'}
                    </button>
                  )}
                  <button
                    onClick={handleSubmit}
                    disabled={
                      loading || (!input.trim() && !['review', 'track_changes'].includes(action))
                    }
                    className={`px-6 py-2 rounded-lg flex items-center gap-2 ${
                      fromOutliner
                        ? theme === 'dark'
                          ? 'bg-slate-700 text-slate-300'
                          : 'bg-gray-200 text-gray-700'
                        : theme === 'dark'
                          ? 'bg-purple-600 text-white hover:bg-purple-700'
                          : 'bg-purple-500 text-white hover:bg-purple-600'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {loading && <span className="animate-spin">◐</span>}
                    {loading ? 'Processing...' : 'Process'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Output Section */}
          <div className={`${cardClasses} rounded-xl p-4`}>
            <div className="flex items-center justify-between mb-3">
              <h2
                className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}
              >
                Result
              </h2>
              {result && (
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowChanges(!showChanges)}
                    className={`px-3 py-1 rounded text-sm ${
                      theme === 'dark'
                        ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    {showChanges ? 'Hide' : 'Show'} Changes
                  </button>
                  <button
                    onClick={useAsInput}
                    className={`px-3 py-1 rounded text-sm ${
                      theme === 'dark'
                        ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    Use as Input
                  </button>
                  <button
                    onClick={copyResult}
                    className={`px-3 py-1 rounded text-sm ${
                      theme === 'dark'
                        ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    Copy
                  </button>
                </div>
              )}
            </div>

            {error && (
              <div className="bg-red-900/30 border border-red-700 rounded-lg p-4 text-red-300">
                {error}
              </div>
            )}

            {!result && !error && !loading && (
              <div className="h-96 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-4xl mb-3">✨</div>
                  <p className={theme === 'dark' ? 'text-slate-500' : 'text-gray-500'}>
                    Your result will appear here
                  </p>
                </div>
              </div>
            )}

            {loading && (
              <div className="h-96 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-4xl animate-pulse mb-3">🤖</div>
                  <p className={theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}>
                    Processing with {model}...
                  </p>
                </div>
              </div>
            )}

            {result && (
              <div>
                <div
                  className={`h-96 overflow-auto rounded-lg ${
                    theme === 'dark' ? 'bg-slate-900' : 'bg-gray-50'
                  }`}
                >
                  <div className="p-4">
                    <MarkdownRenderer content={result.result} />
                  </div>
                </div>
                <div
                  className={`mt-2 text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-gray-500'}`}
                >
                  Generated with {result.model} • {result.result.length} characters
                </div>
              </div>
            )}

            {/* Mermaid Diagram Preview */}
            {showMermaidPreview && mermaidCode && (
              <div
                className={`mt-4 rounded-lg p-4 ${
                  theme === 'dark'
                    ? 'bg-slate-900 border border-slate-700'
                    : 'bg-gray-50 border border-gray-200'
                }`}
              >
                <div className="flex justify-between items-center mb-3">
                  <h3
                    className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}
                  >
                    Mermaid Diagram Preview
                  </h3>
                  <div className="flex gap-2">
                    <button
                      onClick={insertMermaidToResult}
                      className="px-3 py-1 bg-purple-600 text-white rounded text-sm hover:bg-purple-700"
                    >
                      Insert to Input
                    </button>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText('```mermaid\n' + mermaidCode + '\n```');
                      }}
                      className={`px-3 py-1 rounded text-sm ${
                        theme === 'dark'
                          ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      Copy Code
                    </button>
                    <button
                      onClick={() => setShowMermaidPreview(false)}
                      className={`px-3 py-1 rounded text-sm ${
                        theme === 'dark'
                          ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      Close
                    </button>
                  </div>
                </div>
                <div className="bg-white rounded p-4 overflow-auto">
                  <MermaidDiagram code={mermaidCode} />
                </div>
                <pre
                  className={`mt-2 p-2 rounded text-xs overflow-auto ${
                    theme === 'dark' ? 'bg-slate-800 text-slate-300' : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {mermaidCode}
                </pre>
              </div>
            )}

            {/* Track Changes Panel */}
            {showChanges && changes.length > 0 && (
              <div
                className={`mt-4 rounded-lg p-4 ${
                  theme === 'dark'
                    ? 'bg-slate-900 border border-slate-700'
                    : 'bg-gray-50 border border-gray-200'
                }`}
              >
                <div className="flex justify-between items-center mb-3">
                  <h3
                    className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}
                  >
                    AI Track Changes ({changes.length} suggestions)
                  </h3>
                  <div className="flex gap-2">
                    <button
                      onClick={acceptAllChanges}
                      className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                    >
                      Accept All
                    </button>
                    <button
                      onClick={rejectAllChanges}
                      className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                    >
                      Reject All
                    </button>
                  </div>
                </div>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {changes.map(change => (
                    <div
                      key={change.id}
                      className={`p-3 rounded border ${
                        change.accepted
                          ? theme === 'dark'
                            ? 'bg-green-900/30 border-green-700'
                            : 'bg-green-50 border-green-300'
                          : change.rejected
                            ? theme === 'dark'
                              ? 'bg-red-900/30 border-red-700'
                              : 'bg-red-50 border-red-300'
                            : theme === 'dark'
                              ? 'bg-slate-800 border-slate-600'
                              : 'bg-white border-gray-300'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div
                            className={`text-sm font-medium ${
                              change.changeType === 'addition'
                                ? 'text-green-400'
                                : change.changeType === 'deletion'
                                  ? 'text-red-400'
                                  : 'text-blue-400'
                            }`}
                          >
                            {change.changeType.toUpperCase()}
                          </div>
                          {change.original && change.original !== change.edited && (
                            <div
                              className={`text-xs mt-1 line-through ${
                                theme === 'dark' ? 'text-slate-500' : 'text-gray-500'
                              }`}
                            >
                              {change.original}
                            </div>
                          )}
                          <div
                            className={`text-sm mt-1 ${
                              theme === 'dark' ? 'text-slate-200' : 'text-gray-800'
                            }`}
                          >
                            {change.edited}
                          </div>
                          {change.reason && (
                            <div
                              className={`text-xs mt-2 italic ${
                                theme === 'dark' ? 'text-slate-400' : 'text-gray-600'
                              }`}
                            >
                              💡 {change.reason}
                            </div>
                          )}
                        </div>
                        {!change.accepted && !change.rejected && (
                          <div className="flex gap-1 ml-3">
                            <button
                              onClick={() => acceptChange(change.id)}
                              className="px-2 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700"
                            >
                              ✓
                            </button>
                            <button
                              onClick={() => rejectChange(change.id)}
                              className="px-2 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700"
                            >
                              ✗
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Tips Section */}
        <div className={`mt-6 ${cardClasses} rounded-xl p-6`}>
          <h3
            className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-4`}
          >
            Tips for Best Results
          </h3>
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <h4
                className={`${theme === 'dark' ? 'text-purple-400' : 'text-purple-600'} font-medium mb-1`}
              >
                Review & Track Changes
              </h4>
              <p className={`${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'} text-sm`}>
                Use AI Review to get suggestions, or Track Changes to see AI edits with
                accept/reject options - like Word's Review tab.
              </p>
            </div>
            <div>
              <h4
                className={`${theme === 'dark' ? 'text-purple-400' : 'text-purple-600'} font-medium mb-1`}
              >
                Expand & Elaborate
              </h4>
              <p className={`${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'} text-sm`}>
                Provide clear paragraphs. AI adds examples, explanations, and depth while
                maintaining your voice.
              </p>
            </div>
            <div>
              <h4
                className={`${theme === 'dark' ? 'text-purple-400' : 'text-purple-600'} font-medium mb-1`}
              >
                Save Options
              </h4>
              <p className={`${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'} text-sm`}>
                Save as TXT (plain text), DOCX (Word document), or PDF (formatted document) using
                the Save button.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
