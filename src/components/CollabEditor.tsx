'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import type { CollabDocument, TrackedChange, Comment } from '@/types/collab-editor';

interface CollabEditorProps {
  document: CollabDocument;
  onChange: (doc: CollabDocument) => void;
  onAIAction: (action: string, selection?: { start: number; end: number; text: string }) => Promise<void>;
  brandVoice?: string;
  projectContext?: string[];
  researchHistory?: { id: string; title: string; snippet: string }[];
  readOnly?: boolean;
}

interface InlineSuggestion {
  text: string;
  position: number;
  visible: boolean;
}

export function CollabEditor({
  document: initialDoc,
  onChange,
  onAIAction,
  brandVoice,
  projectContext = [],
  researchHistory = [],
  readOnly = false,
}: CollabEditorProps) {
  const [doc, setDoc] = useState<CollabDocument>(initialDoc);
  const [changes, setChanges] = useState<TrackedChange[]>(initialDoc.changes);
  const [comments, setComments] = useState<Comment[]>(initialDoc.comments);
  
  const [selectedChange, setSelectedChange] = useState<string | null>(null);
  const [selectedComment, setSelectedComment] = useState<string | null>(null);
  const [isAiWorking, setIsAiWorking] = useState(false);
  const [activePanel, setActivePanel] = useState<'changes' | 'comments' | 'context'>('changes');
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [savedSelection, setSavedSelection] = useState<Range | null>(null);
  const [fontFamily, setFontFamily] = useState('Merriweight');
  
  // AI Integration States
  const [showFloatingToolbar, setShowFloatingToolbar] = useState(false);
  const [floatingToolbarPos, setFloatingToolbarPos] = useState({ x: 0, y: 0 });
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuPos, setContextMenuPos] = useState({ x: 0, y: 0 });
  const [inlineSuggestion, setInlineSuggestion] = useState<InlineSuggestion | null>(null);
  const [showAiDropdown, setShowAiDropdown] = useState(false);
  
  const editorRef = useRef<HTMLDivElement>(null);
  const floatingToolbarRef = useRef<HTMLDivElement>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);
  const lastTypingTime = useRef<number>(0);
  const inlineTimeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setDoc(initialDoc);
    setChanges(initialDoc.changes);
    setComments(initialDoc.comments);
    if (editorRef.current && initialDoc.content) {
      editorRef.current.innerHTML = initialDoc.content;
    }
  }, [initialDoc]);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (floatingToolbarRef.current && !floatingToolbarRef.current.contains(e.target as Node)) {
        setShowFloatingToolbar(false);
      }
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        setShowContextMenu(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const pendingChanges = changes.filter(c => c.status === 'pending');
  const unresolvedComments = comments.filter(c => !c.resolved);

  const getWordCount = () => {
    if (!editorRef.current) return 0;
    const text = editorRef.current.innerText || '';
    return text.trim() ? text.trim().split(/\s+/).length : 0;
  };

  const getCharCount = () => {
    if (!editorRef.current) return 0;
    return (editorRef.current.innerText || '').length;
  };

  const getParagraphCount = () => {
    if (!editorRef.current) return 0;
    return editorRef.current.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li').length || 1;
  };

  const execCmd = (command: string, value: string | undefined = undefined) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    updateToolbarState();
  };

  const formatBlock = (tag: string) => {
    document.execCommand('formatBlock', false, `<${tag}>`);
    editorRef.current?.focus();
  };

  const updateToolbarState = useCallback(() => {
    const buttons = {
      bold: document.getElementById('toolbar-bold'),
      italic: document.getElementById('toolbar-italic'),
      underline: document.getElementById('toolbar-underline'),
      strikeThrough: document.getElementById('toolbar-strikeThrough'),
      justifyLeft: document.getElementById('toolbar-justifyLeft'),
      justifyCenter: document.getElementById('toolbar-justifyCenter'),
      justifyRight: document.getElementById('toolbar-justifyRight'),
      justifyFull: document.getElementById('toolbar-justifyFull'),
    };

    Object.entries(buttons).forEach(([cmd, btn]) => {
      if (btn) {
        btn.classList.toggle('bg-purple-600/30', document.queryCommandState(cmd));
        btn.classList.toggle('text-purple-300', document.queryCommandState(cmd));
      }
    });
  }, []);

  // Handle text selection - show floating toolbar
  const handleSelectionChange = useCallback(() => {
    const selection = window.getSelection();
    const selectedText = selection?.toString().trim() || '';
    
    if (selectedText.length > 0 && selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      
      setFloatingToolbarPos({
        x: rect.left + rect.width / 2,
        y: rect.top - 10
      });
      setShowFloatingToolbar(true);
    } else {
      setShowFloatingToolbar(false);
    }
    
    updateToolbarState();
  }, [updateToolbarState]);

  // Handle right-click context menu
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    
    const selection = window.getSelection();
    const selectedText = selection?.toString().trim() || '';
    
    if (selectedText.length > 0) {
      setContextMenuPos({ x: e.clientX, y: e.clientY });
      setShowContextMenu(true);
    }
  }, []);

  // Handle typing for inline suggestions
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    // Accept inline suggestion with Tab
    if (e.key === 'Tab' && inlineSuggestion?.visible) {
      e.preventDefault();
      acceptInlineSuggestion();
      return;
    }
    
    // Dismiss inline suggestion with Escape
    if (e.key === 'Escape' && inlineSuggestion?.visible) {
      setInlineSuggestion(null);
      return;
    }
    
    // Ctrl+Space to trigger inline suggestion
    if (e.key === ' ' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      triggerInlineSuggestion();
      return;
    }
    
    lastTypingTime.current = Date.now();
    
    // Clear existing timeout
    if (inlineTimeout.current) {
      clearTimeout(inlineTimeout.current);
    }
    
    // Set new timeout for inline suggestion
    inlineTimeout.current = setTimeout(() => {
      if (Date.now() - lastTypingTime.current >= 800) {
        triggerInlineSuggestion();
      }
    }, 800);
  }, [inlineSuggestion]);

  // Trigger inline AI suggestion
  const triggerInlineSuggestion = async () => {
    if (!editorRef.current || isAiWorking) return;
    
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    
    const range = selection.getRangeAt(0);
    const currentNode = range.startContainer;
    const currentText = currentNode.textContent?.slice(0, range.startOffset) || '';
    
    // Only suggest after at least 20 characters of context
    if (currentText.length < 20) return;
    
    // Get the last few words for context
    const words = currentText.split(/\s+/);
    const recentText = words.slice(-10).join(' ');
    
    // Only trigger suggestion if we detect a potential completion point
    const shouldSuggest = 
      currentText.endsWith('.') || 
      currentText.endsWith(':') ||
      currentText.endsWith('\n') ||
      words.length % 15 === 0;
    
    if (!shouldSuggest) return;
    
    setInlineSuggestion({
      text: 'Thinking...',
      position: range.startOffset,
      visible: true
    });
    
    try {
      const response = await fetch('/api/collab-editor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate',
          selection: { start: 0, end: recentText.length, text: recentText },
          context: { brandVoice, documentType: doc.documentType },
          options: { mode: 'complete' }
        })
      });
      
      const data = await response.json();
      
      if (data.success && data.newText) {
        setInlineSuggestion({
          text: data.newText,
          position: range.startOffset,
          visible: true
        });
      } else {
        setInlineSuggestion(null);
      }
    } catch (error) {
      console.error('Inline suggestion error:', error);
      setInlineSuggestion(null);
    }
  };

  // Accept inline suggestion
  const acceptInlineSuggestion = () => {
    if (!inlineSuggestion || !editorRef.current) return;
    
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    
    const range = selection.getRangeAt(0);
    
    // Insert the suggestion text
    const textNode = document.createTextNode(inlineSuggestion.text);
    range.insertNode(textNode);
    
    // Move cursor to end of inserted text
    range.setStartAfter(textNode);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
    
    setInlineSuggestion(null);
    handleContentChange();
  };

  const handleContentChange = () => {
    if (!editorRef.current) return;
    const content = editorRef.current.innerHTML || '';
    
    const updatedDoc: CollabDocument = {
      ...doc,
      content,
      updatedAt: Date.now(),
      metadata: {
        ...doc.metadata,
        wordCount: getWordCount(),
        charCount: getCharCount(),
      },
    };
    
    setDoc(updatedDoc);
    onChange(updatedDoc);
  };

  const handleAIAction = async (action: string) => {
    const selection = window.getSelection();
    const selectedText = selection?.toString() || '';
    
    setIsAiWorking(true);
    setShowFloatingToolbar(false);
    setShowContextMenu(false);
    
    try {
      await onAIAction(action, selectedText ? { start: 0, end: selectedText.length, text: selectedText } : undefined);
    } finally {
      setIsAiWorking(false);
    }
  };

  // Apply AI change directly
  const applyAIChange = async (action: string) => {
    const selection = window.getSelection();
    const selectedText = selection?.toString() || '';
    
    if (!selectedText) return;
    
    setIsAiWorking(true);
    setShowFloatingToolbar(false);
    setShowContextMenu(false);
    
    try {
      const response = await fetch('/api/collab-editor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          documentId: doc.id,
          selection: { start: 0, end: selectedText.length, text: selectedText },
          context: { brandVoice, documentType: doc.documentType }
        })
      });
      
      const data = await response.json();
      
      if (data.success && data.newText) {
        // Replace the selected text with AI result
        document.execCommand('insertText', false, data.newText);
        handleContentChange();
      }
    } catch (error) {
      console.error('AI action error:', error);
    } finally {
      setIsAiWorking(false);
    }
  };

  const insertLink = () => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      setSavedSelection(selection.getRangeAt(0));
    }
    setShowLinkModal(true);
  };

  const confirmLink = () => {
    if (linkUrl && savedSelection) {
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(savedSelection);
      document.execCommand('createLink', false, linkUrl);
    }
    setShowLinkModal(false);
    setLinkUrl('');
    setSavedSelection(null);
    editorRef.current?.focus();
  };

  const insertImage = () => {
    const url = prompt('Enter image URL:');
    if (url) {
      document.execCommand('insertImage', false, url);
    }
  };

  const insertHR = () => {
    document.execCommand('insertHorizontalRule', false, undefined);
    editorRef.current?.focus();
  };

  const insertList = (ordered: boolean) => {
    document.execCommand(ordered ? 'insertOrderedList' : 'insertUnorderedList', false, undefined);
    editorRef.current?.focus();
  };

  const changeFontFamily = (font: string) => {
    document.execCommand('fontName', false, font);
    setFontFamily(font);
    editorRef.current?.focus();
  };

  const changeTextColor = (color: string) => {
    document.execCommand('foreColor', false, color);
    editorRef.current?.focus();
  };

  const changeHighlightColor = (color: string) => {
    document.execCommand('hiliteColor', false, color);
    editorRef.current?.focus();
  };

  const acceptChange = (changeId: string) => {
    setChanges(prev => prev.map(c => 
      c.id === changeId ? { ...c, status: 'accepted' as const } : c
    ));
    setSelectedChange(null);
  };

  const rejectChange = (changeId: string) => {
    setChanges(prev => prev.map(c => 
      c.id === changeId ? { ...c, status: 'rejected' as const } : c
    ));
    setSelectedChange(null);
  };

  const acceptAllChanges = () => {
    setChanges(prev => prev.map(c => 
      c.status === 'pending' ? { ...c, status: 'accepted' as const } : c
    ));
  };

  const rejectAllChanges = () => {
    setChanges(prev => prev.map(c => 
      c.status === 'pending' ? { ...c, status: 'rejected' as const } : c
    ));
  };

  const resolveComment = (commentId: string) => {
    setComments(prev => prev.map(c => 
      c.id === commentId ? { ...c, resolved: true } : c
    ));
  };

  const getChangeTypeLabel = (type: string) => {
    switch (type) {
      case 'insert': return 'Insertion';
      case 'delete': return 'Deletion';
      case 'format': return 'Format Change';
      case 'move': return 'Move';
      default: return 'Change';
    }
  };

  const aiActions = [
    { id: 'fix_grammar', label: 'Fix Grammar', icon: '✓', color: 'emerald', desc: 'Fix grammar and spelling' },
    { id: 'rewrite', label: 'Rewrite', icon: '↻', color: 'purple', desc: 'Improve clarity and flow' },
    { id: 'expand', label: 'Expand', icon: '↗', color: 'blue', desc: 'Add more detail' },
    { id: 'simplify', label: 'Simplify', icon: '↓', color: 'amber', desc: 'Make clearer' },
    { id: 'generate', label: 'Generate', icon: '✨', color: 'teal', desc: 'Create new content' },
    { id: 'suggest', label: 'Suggest', icon: '💬', color: 'orange', desc: 'Get suggestions' },
  ];

  const aiActionColors: Record<string, string> = {
    emerald: 'bg-emerald-600/20 hover:bg-emerald-600/30 border-emerald-500/20 text-emerald-400',
    purple: 'bg-purple-600/20 hover:bg-purple-600/30 border-purple-500/20 text-purple-400',
    blue: 'bg-blue-600/20 hover:bg-blue-600/30 border-blue-500/20 text-blue-400',
    amber: 'bg-amber-600/20 hover:bg-amber-600/30 border-amber-500/20 text-amber-400',
    teal: 'bg-teal-600/20 hover:bg-teal-600/30 border-teal-500/20 text-teal-400',
    orange: 'bg-orange-600/20 hover:bg-orange-600/30 border-orange-500/20 text-orange-400',
  };

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Formatting Toolbar */}
      <div className="flex items-center gap-1 px-4 py-2 bg-slate-900/80 backdrop-blur-sm border-b border-slate-800 flex-wrap">
        {/* Undo/Redo */}
        <button
          onClick={() => execCmd('undo')}
          className="p-2 rounded-lg hover:bg-slate-700/50 text-slate-400 hover:text-white transition-colors"
          title="Undo (Ctrl+Z)"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
          </svg>
        </button>
        <button
          onClick={() => execCmd('redo')}
          className="p-2 rounded-lg hover:bg-slate-700/50 text-slate-400 hover:text-white transition-colors"
          title="Redo (Ctrl+Y)"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" />
          </svg>
        </button>

        <div className="w-px h-5 bg-slate-700 mx-1" />

        {/* Font Family */}
        <select
          value={fontFamily}
          onChange={(e) => changeFontFamily(e.target.value)}
          className="px-2 py-1.5 bg-slate-800/50 border border-slate-700 rounded-lg text-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 min-w-[120px]"
          title="Font Family"
        >
          <option value="Merriweather">Merriweather</option>
          <option value="Georgia">Georgia</option>
          <option value="Times New Roman">Times New Roman</option>
          <option value="Arial">Arial</option>
          <option value="Helvetica">Helvetica</option>
          <option value="Verdana">Verdana</option>
          <option value="system-ui">System UI</option>
          <option value="Courier New">Courier New</option>
          <option value="monospace">Monospace</option>
        </select>

        {/* Font Size */}
        <select
          onChange={(e) => execCmd('fontSize', e.target.value)}
          className="px-2 py-1.5 bg-slate-800/50 border border-slate-700 rounded-lg text-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
          title="Font Size"
        >
          <option value="1">8pt</option>
          <option value="2">10pt</option>
          <option value="3" selected>12pt</option>
          <option value="4">14pt</option>
          <option value="5">18pt</option>
          <option value="6">24pt</option>
          <option value="7">36pt</option>
        </select>

        <div className="w-px h-5 bg-slate-700 mx-1" />

        {/* Text Color */}
        <div className="relative">
          <label className="p-2 rounded-lg hover:bg-slate-700/50 text-slate-400 hover:text-white transition-colors cursor-pointer flex items-center gap-1" title="Text Color">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 20h16M9.5 4L4 14h16l-5.5-10" />
            </svg>
            <div className="w-3 h-3 rounded border border-slate-500" style={{ backgroundColor: '#1a1a1a' }}></div>
            <input
              type="color"
              defaultValue="#1a1a1a"
              onChange={(e) => changeTextColor(e.target.value)}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
          </label>
        </div>

        {/* Highlight Color */}
        <div className="relative">
          <label className="p-2 rounded-lg hover:bg-slate-700/50 text-slate-400 hover:text-white transition-colors cursor-pointer flex items-center" title="Highlight Color">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
            <div className="w-3 h-3 rounded ml-1" style={{ backgroundColor: '#ffff00' }}></div>
            <input
              type="color"
              defaultValue="#ffff00"
              onChange={(e) => changeHighlightColor(e.target.value)}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
          </label>
        </div>

        <div className="w-px h-5 bg-slate-700 mx-1" />

        {/* Text Formatting */}
        <button id="toolbar-bold" onClick={() => execCmd('bold')} className="p-2 rounded-lg hover:bg-slate-700/50 text-slate-400 hover:text-white transition-colors font-bold" title="Bold (Ctrl+B)">B</button>
        <button id="toolbar-italic" onClick={() => execCmd('italic')} className="p-2 rounded-lg hover:bg-slate-700/50 text-slate-400 hover:text-white transition-colors italic" title="Italic (Ctrl+I)">I</button>
        <button id="toolbar-underline" onClick={() => execCmd('underline')} className="p-2 rounded-lg hover:bg-slate-700/50 text-slate-400 hover:text-white transition-colors underline" title="Underline (Ctrl+U)">U</button>
        <button id="toolbar-strikeThrough" onClick={() => execCmd('strikeThrough')} className="p-2 rounded-lg hover:bg-slate-700/50 text-slate-400 hover:text-white transition-colors line-through" title="Strikethrough">S</button>

        <div className="w-px h-5 bg-slate-700 mx-1" />

        {/* Headings */}
        <button onClick={() => formatBlock('h1')} className="px-2 py-1.5 rounded-lg hover:bg-slate-700/50 text-slate-400 hover:text-white transition-colors text-sm font-bold" title="Heading 1">H1</button>
        <button onClick={() => formatBlock('h2')} className="px-2 py-1.5 rounded-lg hover:bg-slate-700/50 text-slate-400 hover:text-white transition-colors text-sm font-bold" title="Heading 2">H2</button>
        <button onClick={() => formatBlock('h3')} className="px-2 py-1.5 rounded-lg hover:bg-slate-700/50 text-slate-400 hover:text-white transition-colors text-sm font-semibold" title="Heading 3">H3</button>
        <button onClick={() => formatBlock('p')} className="px-2 py-1.5 rounded-lg hover:bg-slate-700/50 text-slate-400 hover:text-white transition-colors text-sm" title="Normal Paragraph">¶</button>

        <div className="w-px h-5 bg-slate-700 mx-1" />

        {/* Alignment */}
        <button id="toolbar-justifyLeft" onClick={() => execCmd('justifyLeft')} className="p-2 rounded-lg hover:bg-slate-700/50 text-slate-400 hover:text-white transition-colors" title="Align Left">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h10M4 18h14" /></svg>
        </button>
        <button id="toolbar-justifyCenter" onClick={() => execCmd('justifyCenter')} className="p-2 rounded-lg hover:bg-slate-700/50 text-slate-400 hover:text-white transition-colors" title="Align Center">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M7 12h10M5 18h14" /></svg>
        </button>
        <button id="toolbar-justifyRight" onClick={() => execCmd('justifyRight')} className="p-2 rounded-lg hover:bg-slate-700/50 text-slate-400 hover:text-white transition-colors" title="Align Right">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M10 12h10M6 18h14" /></svg>
        </button>

        <div className="w-px h-5 bg-slate-700 mx-1" />

        {/* Lists */}
        <button onClick={() => insertList(false)} className="p-2 rounded-lg hover:bg-slate-700/50 text-slate-400 hover:text-white transition-colors" title="Bullet List">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" /></svg>
        </button>
        <button onClick={() => insertList(true)} className="p-2 rounded-lg hover:bg-slate-700/50 text-slate-400 hover:text-white transition-colors" title="Numbered List">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6h11M10 12h11M10 18h11M4 6h1v4M4 10h2M4 16.5c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5c0 .5-.25.93-.62 1.22L4 20h3" /></svg>
        </button>

        <div className="w-px h-5 bg-slate-700 mx-1" />

        {/* Link & Image */}
        <button onClick={insertLink} className="p-2 rounded-lg hover:bg-slate-700/50 text-slate-400 hover:text-white transition-colors" title="Insert Link (URL)">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
        </button>
        <button onClick={insertImage} className="p-2 rounded-lg hover:bg-slate-700/50 text-slate-400 hover:text-white transition-colors" title="Insert Image">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
        </button>
        <button onClick={insertHR} className="p-2 rounded-lg hover:bg-slate-700/50 text-slate-400 hover:text-white transition-colors" title="Horizontal Line">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 12h16" /></svg>
        </button>

        <div className="w-px h-5 bg-slate-700 mx-1" />

        {/* Clear Formatting */}
        <button onClick={() => execCmd('removeFormat')} className="p-2 rounded-lg hover:bg-slate-700/50 text-slate-400 hover:text-white transition-colors" title="Clear Formatting">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="flex-1" />

        {/* AI Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowAiDropdown(!showAiDropdown)}
            className="px-3 py-1.5 bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 text-sm rounded-lg transition-all border border-purple-500/20 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            AI Tools
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          
          {showAiDropdown && (
            <div className="absolute right-0 mt-2 w-56 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden">
              {aiActions.map(action => (
                <button
                  key={action.id}
                  onClick={() => { handleAIAction(action.id); setShowAiDropdown(false); }}
                  disabled={isAiWorking}
                  className="w-full px-4 py-3 flex items-center gap-3 text-left text-slate-300 hover:bg-slate-700/50 transition-colors disabled:opacity-50"
                >
                  <span className="text-lg">{action.icon}</span>
                  <div>
                    <div className="font-medium">{action.label}</div>
                    <div className="text-xs text-slate-500">{action.desc}</div>
                  </div>
                </button>
              ))}
              <div className="border-t border-slate-700 px-4 py-2 text-xs text-slate-500">
                💡 Tip: Select text and use AI tools, or press Ctrl+Space for suggestions
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Editor */}
        <div className="flex-1 flex flex-col overflow-hidden relative">
          <div 
            className="flex-1 overflow-auto p-8 bg-slate-950/50"
            style={{
              backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(100, 116, 139, 0.1) 1px, transparent 0)',
              backgroundSize: '20px 20px'
            }}
          >
            <div 
              className="max-w-4xl mx-auto bg-white rounded-lg shadow-2xl min-h-[800px] p-12"
              style={{ boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(0, 0, 0, 0.1)' }}
            >
              <div
                ref={editorRef}
                contentEditable={!readOnly}
                onInput={handleContentChange}
                onSelect={handleSelectionChange}
                onContextMenu={handleContextMenu}
                onKeyDown={handleKeyDown}
                className="prose prose-slate max-w-none focus:outline-none min-h-[600px] text-slate-800"
                style={{
                  fontFamily: "'Merriweather', Georgia, serif",
                  fontSize: '12pt',
                  lineHeight: '1.8',
                }}
                role="textbox"
                aria-multiline="true"
                spellCheck
              />
              
              {/* Inline Suggestion Overlay */}
              {inlineSuggestion?.visible && (
                <div className="mt-2 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <span className="text-purple-500 text-sm">💡</span>
                    <div className="flex-1">
                      <div className="text-xs text-purple-600 font-medium mb-1">AI Suggestion</div>
                      <div className="text-slate-600 text-sm">{inlineSuggestion.text}</div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={acceptInlineSuggestion}
                        className="px-3 py-1 bg-purple-600 text-white text-xs rounded hover:bg-purple-700"
                      >
                        Accept (Tab)
                      </button>
                      <button
                        onClick={() => setInlineSuggestion(null)}
                        className="px-3 py-1 bg-slate-200 text-slate-600 text-xs rounded hover:bg-slate-300"
                      >
                        Dismiss (Esc)
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* Floating AI Toolbar (appears on selection) */}
          {showFloatingToolbar && (
            <div
              ref={floatingToolbarRef}
              className="fixed z-50 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl p-1.5 flex items-center gap-1"
              style={{
                left: `${floatingToolbarPos.x}px`,
                top: `${floatingToolbarPos.y}px`,
                transform: 'translateX(-50%) translateY(-100%)'
              }}
            >
              {aiActions.slice(0, 4).map(action => (
                <button
                  key={action.id}
                  onClick={() => applyAIChange(action.id)}
                  disabled={isAiWorking}
                  className={`px-2.5 py-1.5 text-xs rounded-lg transition-all border flex items-center gap-1 ${aiActionColors[action.color]} disabled:opacity-50`}
                  title={action.desc}
                >
                  {action.icon} {action.label}
                </button>
              ))}
              <div className="w-px h-5 bg-slate-700 mx-1" />
              <button
                onClick={() => setShowAiDropdown(true)}
                className="px-2 py-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg text-xs"
              >
                More ▾
              </button>
            </div>
          )}
          
          {/* Right-click Context Menu */}
          {showContextMenu && (
            <div
              ref={contextMenuRef}
              className="fixed z-50 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl py-2 min-w-48"
              style={{
                left: `${contextMenuPos.x}px`,
                top: `${contextMenuPos.y}px`
              }}
            >
              <div className="px-3 py-1.5 text-xs text-slate-500 font-medium">AI Actions</div>
              {aiActions.map(action => (
                <button
                  key={action.id}
                  onClick={() => applyAIChange(action.id)}
                  disabled={isAiWorking}
                  className="w-full px-3 py-2 flex items-center gap-2 text-slate-300 hover:bg-slate-700/50 transition-colors disabled:opacity-50"
                >
                  <span>{action.icon}</span>
                  <span className="text-sm">{action.label}</span>
                  <span className="text-xs text-slate-500 ml-auto">{action.desc}</span>
                </button>
              ))}
              <div className="border-t border-slate-700 mt-1 pt-1">
                <button
                  onClick={() => { execCmd('copy'); setShowContextMenu(false); }}
                  className="w-full px-3 py-2 flex items-center gap-2 text-slate-300 hover:bg-slate-700/50 transition-colors"
                >
                  <span>📋</span>
                  <span className="text-sm">Copy</span>
                </button>
                <button
                  onClick={() => { execCmd('cut'); setShowContextMenu(false); }}
                  className="w-full px-3 py-2 flex items-center gap-2 text-slate-300 hover:bg-slate-700/50 transition-colors"
                >
                  <span>✂️</span>
                  <span className="text-sm">Cut</span>
                </button>
              </div>
            </div>
          )}
          
          {/* Status Bar */}
          <div className="flex items-center justify-between px-5 py-2 bg-slate-900/80 border-t border-slate-800">
            <div className="flex items-center gap-5 text-sm">
              <span className="text-slate-500">{getWordCount()} <span className="text-slate-600">words</span></span>
              <span className="text-slate-600">•</span>
              <span className="text-slate-500">{getCharCount()} <span className="text-slate-600">chars</span></span>
              <span className="text-slate-600">•</span>
              <span className="text-slate-500">{getParagraphCount()} <span className="text-slate-600">paragraphs</span></span>
              {doc.brandName && <span className="text-purple-400 flex items-center gap-1 ml-2"><span className="w-2 h-2 rounded-full bg-purple-500"></span>{doc.brandName}</span>}
            </div>
            <div className="flex items-center gap-5 text-sm">
              <span className="text-slate-500 text-xs">💡 Ctrl+Space for AI suggestions</span>
              {pendingChanges.length > 0 && (
                <span className="text-amber-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                  {pendingChanges.length} pending
                </span>
              )}
              {unresolvedComments.length > 0 && (
                <span className="text-blue-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                  {unresolvedComments.length} comments
                </span>
              )}
              {isAiWorking && <span className="text-emerald-400 animate-pulse flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500 animate-spin"></span>AI working...</span>}
            </div>
          </div>
        </div>

        {/* Side Panel - unchanged from previous */}
        <div className="w-80 bg-slate-900/80 border-l border-slate-800 flex flex-col overflow-hidden">
          <div className="flex border-b border-slate-800">
            <button
              onClick={() => setActivePanel('changes')}
              className={`flex-1 px-3 py-2.5 text-sm font-medium transition-all ${
                activePanel === 'changes' 
                  ? 'bg-slate-800/50 text-white border-b-2 border-purple-500' 
                  : 'text-slate-500 hover:text-white hover:bg-slate-800/30'
              }`}
            >
              Changes {pendingChanges.length > 0 && <span className="ml-1 text-xs text-amber-400">({pendingChanges.length})</span>}
            </button>
            <button
              onClick={() => setActivePanel('comments')}
              className={`flex-1 px-3 py-2.5 text-sm font-medium transition-all ${
                activePanel === 'comments' 
                  ? 'bg-slate-800/50 text-white border-b-2 border-purple-500' 
                  : 'text-slate-500 hover:text-white hover:bg-slate-800/30'
              }`}
            >
              Comments {unresolvedComments.length > 0 && <span className="ml-1 text-xs text-blue-400">({unresolvedComments.length})</span>}
            </button>
            <button
              onClick={() => setActivePanel('context')}
              className={`flex-1 px-3 py-2.5 text-sm font-medium transition-all ${
                activePanel === 'context' 
                  ? 'bg-slate-800/50 text-white border-b-2 border-purple-500' 
                  : 'text-slate-500 hover:text-white hover:bg-slate-800/30'
              }`}
            >
              Context
            </button>
          </div>

          <div className="flex-1 overflow-auto">
            {/* Changes Panel */}
            {activePanel === 'changes' && (
              <div className="p-3 space-y-2">
                {pendingChanges.length > 0 ? (
                  <>
                    <div className="flex gap-2 mb-3">
                      <button onClick={acceptAllChanges} className="flex-1 px-3 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 text-sm rounded-lg transition-all border border-emerald-500/20 flex items-center justify-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                        Accept All
                      </button>
                      <button onClick={rejectAllChanges} className="flex-1 px-3 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 text-sm rounded-lg transition-all border border-red-500/20 flex items-center justify-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        Reject All
                      </button>
                    </div>
                    {pendingChanges.map(change => (
                      <div key={change.id} onClick={() => setSelectedChange(change.id)}
                        className={`p-3 rounded-xl cursor-pointer transition-all ${selectedChange === change.id ? 'bg-slate-800 ring-2 ring-purple-500/50' : 'bg-slate-800/50 hover:bg-slate-800'}`}>
                        <div className="flex items-center justify-between mb-2">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${change.author === 'ai' ? 'bg-purple-500/20 text-purple-400' : 'bg-blue-500/20 text-blue-400'}`}>
                            {change.author === 'ai' ? '🤖 AI' : '👤 User'}
                          </span>
                          <span className="text-xs text-slate-500 bg-slate-700/50 px-2 py-0.5 rounded">{getChangeTypeLabel(change.type)}</span>
                        </div>
                        <div className="text-sm mb-3 font-mono text-slate-300">
                          {change.type === 'delete' && <span className="text-red-400 line-through bg-red-500/10 px-1 rounded">{change.originalText?.slice(0, 40)}...</span>}
                          {change.type === 'insert' && <span className="text-emerald-400 bg-emerald-500/10 px-1 rounded">{change.newText?.slice(0, 40)}...</span>}
                          {change.type === 'format' && (
                            <div className="space-y-1">
                              <span className="text-red-400 line-through bg-red-500/10 px-1 rounded">{change.originalText?.slice(0, 20)}...</span>
                              <div className="text-slate-500">→</div>
                              <span className="text-emerald-400 bg-emerald-500/10 px-1 rounded">{change.newText?.slice(0, 20)}...</span>
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <button onClick={(e) => { e.stopPropagation(); acceptChange(change.id); }} className="flex-1 px-2 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 text-xs rounded-lg transition-all">✓ Accept</button>
                          <button onClick={(e) => { e.stopPropagation(); rejectChange(change.id); }} className="flex-1 px-2 py-1.5 bg-red-600/20 hover:bg-red-600/30 text-red-400 text-xs rounded-lg transition-all">✗ Reject</button>
                        </div>
                      </div>
                    ))}
                  </>
                ) : (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    </div>
                    <p className="text-slate-500 font-medium">No pending changes</p>
                    <p className="text-sm text-slate-600 mt-1">Select text and use AI tools</p>
                  </div>
                )}
              </div>
            )}

            {/* Comments Panel */}
            {activePanel === 'comments' && (
              <div className="p-3 space-y-2">
                {unresolvedComments.length > 0 ? (
                  unresolvedComments.map(comment => (
                    <div key={comment.id} onClick={() => setSelectedComment(comment.id)}
                      className={`p-3 rounded-xl cursor-pointer transition-all ${selectedComment === comment.id ? 'bg-slate-800 ring-2 ring-purple-500/50' : 'bg-slate-800/50 hover:bg-slate-800'}`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${comment.author === 'ai' ? 'bg-purple-500/20 text-purple-400' : 'bg-blue-500/20 text-blue-400'}`}>
                          {comment.author === 'ai' ? '🤖 AI' : '👤 User'}
                        </span>
                        <span className="text-xs text-slate-500">{new Date(comment.timestamp).toLocaleTimeString()}</span>
                      </div>
                      <p className="text-sm text-slate-300 leading-relaxed">{comment.text}</p>
                      <button onClick={(e) => { e.stopPropagation(); resolveComment(comment.id); }} className="mt-3 w-full px-3 py-1.5 bg-slate-700/50 hover:bg-slate-600/50 text-slate-300 text-sm rounded-lg transition-all">✓ Resolve</button>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                    </div>
                    <p className="text-slate-500 font-medium">No unresolved comments</p>
                    <p className="text-sm text-slate-600 mt-1">Ask AI to suggest improvements</p>
                  </div>
                )}
              </div>
            )}

            {/* Context Panel */}
            {activePanel === 'context' && (
              <div className="p-4 space-y-5">
                {brandVoice && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-6 h-6 rounded-lg bg-purple-500/20 flex items-center justify-center">
                        <svg className="w-3.5 h-3.5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                      </div>
                      <h3 className="text-sm font-semibold text-purple-400">Brand Voice</h3>
                    </div>
                    <div className="bg-slate-800/50 rounded-xl p-3 text-sm text-slate-300 max-h-32 overflow-auto leading-relaxed">{brandVoice}</div>
                  </div>
                )}
                {projectContext.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-6 h-6 rounded-lg bg-blue-500/20 flex items-center justify-center">
                        <svg className="w-3.5 h-3.5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>
                      </div>
                      <h3 className="text-sm font-semibold text-blue-400">Project Files</h3>
                    </div>
                    <div className="space-y-1.5">
                      {projectContext.map((file, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm text-slate-300 bg-slate-800/50 rounded-lg px-3 py-2">
                          <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                          {file}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {!brandVoice && projectContext.length === 0 && (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                    </div>
                    <p className="text-slate-500 font-medium">No context available</p>
                    <p className="text-sm text-slate-600 mt-1">Associate a brand or project</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Link Modal */}
      {showLinkModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl">
            <h3 className="text-lg font-semibold text-white mb-4">Insert Link</h3>
            <input
              type="url"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="https://example.com"
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
              autoFocus
            />
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => { setShowLinkModal(false); setLinkUrl(''); }} className="px-4 py-2 text-slate-400 hover:text-white transition-colors">Cancel</button>
              <button onClick={confirmLink} className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-colors">Insert</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}