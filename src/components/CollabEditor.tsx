'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import type { CollabDocument, TrackedChange, Comment, Author, ChangeStatus } from '@/types/collab-editor';

interface CollabEditorProps {
  document: CollabDocument;
  onChange: (doc: CollabDocument) => void;
  onAIAction: (action: string, selection?: { start: number; end: number; text: string }) => Promise<void>;
  brandVoice?: string;
  projectContext?: string[];
  researchHistory?: { id: string; title: string; snippet: string }[];
  readOnly?: boolean;
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
  const [content, setContent] = useState(initialDoc.content);
  const [changes, setChanges] = useState<TrackedChange[]>(initialDoc.changes);
  const [comments, setComments] = useState<Comment[]>(initialDoc.comments);
  
  const [selectedChange, setSelectedChange] = useState<string | null>(null);
  const [selectedComment, setSelectedComment] = useState<string | null>(null);
  const [isAiWorking, setIsAiWorking] = useState(false);
  const [showChanges, setShowChanges] = useState(true);
  const [showComments, setShowComments] = useState(true);
  const [viewMode, setViewMode] = useState<'edit' | 'preview' | 'changes' | 'final'>('edit');
  const [activePanel, setActivePanel] = useState<'changes' | 'comments' | 'context' | 'history'>('changes');
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setDoc(initialDoc);
    setContent(initialDoc.content);
    setChanges(initialDoc.changes);
    setComments(initialDoc.comments);
  }, [initialDoc]);

  const pendingChanges = changes.filter(c => c.status === 'pending');
  const unresolvedComments = comments.filter(c => !c.resolved);
  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
  const charCount = content.length;

  const getSelection = useCallback(() => {
    if (!textareaRef.current) return null;
    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;
    const selectedText = content.substring(start, end);
    return { start, end, text: selectedText };
  }, [content]);

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setContent(newContent);
    
    const updatedDoc: CollabDocument = {
      ...doc,
      content: newContent,
      updatedAt: Date.now(),
      metadata: {
        ...doc.metadata,
        wordCount,
        charCount: newContent.length,
      },
    };
    
    setDoc(updatedDoc);
    onChange(updatedDoc);
  };

  const acceptChange = (changeId: string) => {
    const change = changes.find(c => c.id === changeId);
    if (!change) return;

    let newContent = content;
    
    if (change.type === 'delete') {
      newContent = content.slice(0, change.position) + content.slice(change.positionEnd);
    } else if (change.type === 'insert') {
      newContent = content.slice(0, change.position) + change.newText + content.slice(change.position);
    } else if (change.type === 'format' && change.newText) {
      const originalLength = change.positionEnd - change.position;
      newContent = content.slice(0, change.position) + change.newText + content.slice(change.position + originalLength);
    }

    setContent(newContent);
    
    const updatedChanges = changes.map(c => 
      c.id === changeId ? { ...c, status: 'accepted' as ChangeStatus } : c
    );
    setChanges(updatedChanges);
    
    const updatedDoc: CollabDocument = {
      ...doc,
      content: newContent,
      changes: updatedChanges,
      updatedAt: Date.now(),
    };
    setDoc(updatedDoc);
    onChange(updatedDoc);
    setSelectedChange(null);
  };

  const rejectChange = (changeId: string) => {
    const updatedChanges = changes.map(c => 
      c.id === changeId ? { ...c, status: 'rejected' as ChangeStatus } : c
    );
    setChanges(updatedChanges);
    
    const updatedDoc: CollabDocument = {
      ...doc,
      changes: updatedChanges,
      updatedAt: Date.now(),
    };
    setDoc(updatedDoc);
    onChange(updatedDoc);
    setSelectedChange(null);
  };

  const acceptAllChanges = () => {
    let newContent = content;
    
    const sortedChanges = [...pendingChanges].sort((a, b) => b.position - a.position);
    
    for (const change of sortedChanges) {
      if (change.type === 'delete') {
        newContent = newContent.slice(0, change.position) + newContent.slice(change.positionEnd);
      } else if (change.type === 'insert') {
        newContent = newContent.slice(0, change.position) + change.newText + newContent.slice(change.position);
      } else if (change.type === 'format' && change.newText) {
        const originalLength = change.positionEnd - change.position;
        newContent = newContent.slice(0, change.position) + change.newText + newContent.slice(change.position + originalLength);
      }
    }
    
    setContent(newContent);
    
    const updatedChanges = changes.map(c => 
      c.status === 'pending' ? { ...c, status: 'accepted' as ChangeStatus } : c
    );
    setChanges(updatedChanges);
    
    const updatedDoc: CollabDocument = {
      ...doc,
      content: newContent,
      changes: updatedChanges,
      updatedAt: Date.now(),
    };
    setDoc(updatedDoc);
    onChange(updatedDoc);
  };

  const rejectAllChanges = () => {
    const updatedChanges = changes.map(c => 
      c.status === 'pending' ? { ...c, status: 'rejected' as ChangeStatus } : c
    );
    setChanges(updatedChanges);
    
    const updatedDoc: CollabDocument = {
      ...doc,
      changes: updatedChanges,
      updatedAt: Date.now(),
    };
    setDoc(updatedDoc);
    onChange(updatedDoc);
  };

  const resolveComment = (commentId: string) => {
    const updatedComments = comments.map(c => 
      c.id === commentId ? { ...c, resolved: true } : c
    );
    setComments(updatedComments);
    
    const updatedDoc: CollabDocument = {
      ...doc,
      comments: updatedComments,
      updatedAt: Date.now(),
    };
    setDoc(updatedDoc);
    onChange(updatedDoc);
  };

  const handleAIAction = async (action: string) => {
    const selection = getSelection();
    setIsAiWorking(true);
    try {
      await onAIAction(action, selection || undefined);
    } finally {
      setIsAiWorking(false);
    }
  };

  const renderContentWithChanges = () => {
    if (!showChanges || viewMode === 'final') {
      return <span>{content}</span>;
    }

    let result: React.ReactNode[] = [];
    let lastPos = 0;

    const sortedChanges = [...changes]
      .filter(c => c.status === 'pending')
      .sort((a, b) => a.position - b.position);

    for (const change of sortedChanges) {
      if (change.position > lastPos) {
        result.push(<span key={`text-${lastPos}`}>{content.slice(lastPos, change.position)}</span>);
      }

      if (change.type === 'delete') {
        result.push(
          <span
            key={change.id}
            onClick={() => setSelectedChange(change.id)}
            className={`bg-red-500/30 text-red-300 line-through cursor-pointer ${
              selectedChange === change.id ? 'ring-2 ring-red-500' : ''
            }`}
            title={`AI suggests deleting: "${change.originalText}"`}
          >
            {change.originalText}
          </span>
        );
      } else if (change.type === 'insert') {
        result.push(
          <span
            key={change.id}
            onClick={() => setSelectedChange(change.id)}
            className={`bg-green-500/30 text-green-300 cursor-pointer ${
              selectedChange === change.id ? 'ring-2 ring-green-500' : ''
            }`}
            title={`AI suggests inserting: "${change.newText}"`}
          >
            {change.newText}
          </span>
        );
      } else if (change.type === 'format') {
        const originalText = content.slice(change.position, change.positionEnd);
        result.push(
          <span
            key={change.id}
            onClick={() => setSelectedChange(change.id)}
            className={`bg-blue-500/30 text-blue-300 cursor-pointer ${
              selectedChange === change.id ? 'ring-2 ring-blue-500' : ''
            }`}
            title={`AI suggests reformatting`}
          >
            <span className="line-through opacity-50">{originalText}</span>
            <span className="bg-green-500/30 text-green-300">{change.newText}</span>
          </span>
        );
        lastPos = change.positionEnd;
        continue;
      }

      lastPos = change.type === 'delete' ? change.positionEnd : change.position + (change.newText?.length || 0);
    }

    if (lastPos < content.length) {
      result.push(<span key={`text-${lastPos}`}>{content.slice(lastPos)}</span>);
    }

    return result.length > 0 ? result : <span>{content}</span>;
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

  const getActionLabel = (action: string) => {
    switch (action) {
      case 'fix_grammar': return 'Fix Grammar';
      case 'expand': return 'Expand';
      case 'simplify': return 'Simplify';
      case 'rewrite': return 'Rewrite';
      case 'suggest': return 'Suggest';
      case 'generate': return 'Generate';
      case 'comment': return 'Add Comment';
      default: return action;
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-900">
      {/* AI Action Toolbar */}
      <div className="flex items-center gap-2 p-3 bg-slate-800 border-b border-slate-700 flex-wrap">
        <span className="text-sm text-gray-400 mr-2">AI Actions:</span>
        
        <button
          onClick={() => handleAIAction('fix_grammar')}
          disabled={isAiWorking || readOnly}
          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm rounded-md flex items-center gap-1"
          title="Fix grammar and spelling in selection or document"
        >
          {isAiWorking ? '⏳' : '✓'} Grammar
        </button>
        
        <button
          onClick={() => handleAIAction('expand')}
          disabled={isAiWorking || readOnly}
          className="px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm rounded-md flex items-center gap-1"
          title="Expand selection with more detail"
        >
          {isAiWorking ? '⏳' : '↗'} Expand
        </button>
        
        <button
          onClick={() => handleAIAction('simplify')}
          disabled={isAiWorking || readOnly}
          className="px-3 py-1.5 bg-yellow-600 hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm rounded-md flex items-center gap-1"
          title="Simplify and clarify selection"
        >
          {isAiWorking ? '⏳' : '↓'} Simplify
        </button>
        
        <button
          onClick={() => handleAIAction('rewrite')}
          disabled={isAiWorking || readOnly}
          className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm rounded-md flex items-center gap-1"
          title="Rewrite selection for improved clarity"
        >
          {isAiWorking ? '⏳' : '↻'} Rewrite
        </button>
        
        <button
          onClick={() => handleAIAction('suggest')}
          disabled={isAiWorking || readOnly}
          className="px-3 py-1.5 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm rounded-md flex items-center gap-1"
          title="Add comments with suggestions"
        >
          {isAiWorking ? '⏳' : '💬'} Suggest
        </button>
        
        <button
          onClick={() => handleAIAction('generate')}
          disabled={isAiWorking || readOnly}
          className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm rounded-md flex items-center gap-1"
          title="Generate new content"
        >
          {isAiWorking ? '⏳' : '✨'} Generate
        </button>

        <div className="flex-1" />

        {/* View Mode */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setViewMode('edit')}
            className={`px-2 py-1 text-sm rounded ${viewMode === 'edit' ? 'bg-slate-600 text-white' : 'text-gray-400 hover:text-white'}`}
          >
            Edit
          </button>
          <button
            onClick={() => setViewMode('changes')}
            className={`px-2 py-1 text-sm rounded ${viewMode === 'changes' ? 'bg-slate-600 text-white' : 'text-gray-400 hover:text-white'}`}
          >
            Changes ({pendingChanges.length})
          </button>
          <button
            onClick={() => setViewMode('final')}
            className={`px-2 py-1 text-sm rounded ${viewMode === 'final' ? 'bg-slate-600 text-white' : 'text-gray-400 hover:text-white'}`}
          >
            Final
          </button>
        </div>
        
        <button
          onClick={() => setShowChanges(!showChanges)}
          className={`px-2 py-1 text-sm rounded ${showChanges ? 'bg-slate-600 text-white' : 'text-gray-400'}`}
        >
          {showChanges ? '👁️' : '👁️‍🗨️'} Track
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Editor */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-auto" ref={contentRef}>
            {viewMode === 'edit' && (
              <textarea
                ref={textareaRef}
                value={content}
                onChange={handleContentChange}
                disabled={readOnly}
                className="w-full h-full p-4 bg-transparent text-white font-mono text-sm resize-none focus:outline-none"
                placeholder="Start writing your document here..."
              />
            )}
            
            {viewMode === 'changes' && (
              <div className="p-4 font-mono text-sm leading-relaxed whitespace-pre-wrap">
                {renderContentWithChanges()}
              </div>
            )}
            
            {viewMode === 'final' && (
              <div className="p-4 font-mono text-sm leading-relaxed whitespace-pre-wrap text-white">
                {content}
              </div>
            )}
          </div>
          
          {/* Status Bar */}
          <div className="flex items-center justify-between px-4 py-2 bg-slate-800 border-t border-slate-700 text-sm">
            <div className="flex items-center gap-4 text-gray-400">
              <span>{wordCount.toLocaleString()} words</span>
              <span>{charCount.toLocaleString()} characters</span>
              {doc.brandName && <span className="text-purple-400">Brand: {doc.brandName}</span>}
            </div>
            <div className="flex items-center gap-4 text-gray-400">
              {pendingChanges.length > 0 && (
                <span className="text-yellow-400">{pendingChanges.length} pending changes</span>
              )}
              {unresolvedComments.length > 0 && (
                <span className="text-blue-400">{unresolvedComments.length} unresolved comments</span>
              )}
              {isAiWorking && <span className="text-green-400 animate-pulse">AI working...</span>}
            </div>
          </div>
        </div>

        {/* Side Panel */}
        <div className="w-80 bg-slate-800 border-l border-slate-700 flex flex-col overflow-hidden">
          {/* Panel Tabs */}
          <div className="flex border-b border-slate-700">
            <button
              onClick={() => setActivePanel('changes')}
              className={`flex-1 px-2 py-2 text-sm ${activePanel === 'changes' ? 'bg-slate-700 text-white' : 'text-gray-400'}`}
            >
              Changes ({pendingChanges.length})
            </button>
            <button
              onClick={() => setActivePanel('comments')}
              className={`flex-1 px-2 py-2 text-sm ${activePanel === 'comments' ? 'bg-slate-700 text-white' : 'text-gray-400'}`}
            >
              Comments ({unresolvedComments.length})
            </button>
            <button
              onClick={() => setActivePanel('context')}
              className={`flex-1 px-2 py-2 text-sm ${activePanel === 'context' ? 'bg-slate-700 text-white' : 'text-gray-400'}`}
            >
              Context
            </button>
          </div>

          {/* Panel Content */}
          <div className="flex-1 overflow-auto">
            {/* Changes Panel */}
            {activePanel === 'changes' && (
              <div className="p-3 space-y-2">
                {pendingChanges.length > 0 ? (
                  <>
                    <div className="flex gap-2 mb-3">
                      <button
                        onClick={acceptAllChanges}
                        className="flex-1 px-2 py-1 bg-green-600 hover:bg-green-700 text-white text-sm rounded"
                      >
                        Accept All
                      </button>
                      <button
                        onClick={rejectAllChanges}
                        className="flex-1 px-2 py-1 bg-red-600 hover:bg-red-700 text-white text-sm rounded"
                      >
                        Reject All
                      </button>
                    </div>
                    
                    {pendingChanges.map(change => (
                      <div
                        key={change.id}
                        onClick={() => setSelectedChange(change.id)}
                        className={`p-2 rounded cursor-pointer ${
                          selectedChange === change.id ? 'bg-slate-600' : 'bg-slate-700/50 hover:bg-slate-600/50'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className={`text-xs font-medium ${
                            change.author === 'ai' ? 'text-purple-400' : 'text-blue-400'
                          }`}>
                            {change.author === 'ai' ? '🤖 AI' : '👤 User'}
                          </span>
                          <span className="text-xs text-gray-500">
                            {getChangeTypeLabel(change.type)}
                          </span>
                        </div>
                        
                        <div className="text-sm mb-2">
                          {change.type === 'delete' && (
                            <span className="text-red-400 line-through">{change.originalText?.slice(0, 50)}...</span>
                          )}
                          {change.type === 'insert' && (
                            <span className="text-green-400">{change.newText?.slice(0, 50)}...</span>
                          )}
                          {change.type === 'format' && (
                            <>
                              <span className="text-red-400 line-through">{change.originalText?.slice(0, 25)}...</span>
                              <span className="text-gray-500 mx-1">→</span>
                              <span className="text-green-400">{change.newText?.slice(0, 25)}...</span>
                            </>
                          )}
                        </div>
                        
                        <div className="flex gap-1">
                          <button
                            onClick={(e) => { e.stopPropagation(); acceptChange(change.id); }}
                            className="flex-1 px-2 py-1 bg-green-600/20 hover:bg-green-600/40 text-green-400 text-xs rounded"
                          >
                            Accept
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); rejectChange(change.id); }}
                            className="flex-1 px-2 py-1 bg-red-600/20 hover:bg-red-600/40 text-red-400 text-xs rounded"
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    ))}
                  </>
                ) : (
                  <div className="text-center text-gray-500 py-8">
                    <p>No pending changes</p>
                    <p className="text-sm mt-1">Ask AI to fix grammar, expand, or rewrite</p>
                  </div>
                )}
              </div>
            )}

            {/* Comments Panel */}
            {activePanel === 'comments' && (
              <div className="p-3 space-y-2">
                {unresolvedComments.length > 0 ? (
                  unresolvedComments.map(comment => (
                    <div
                      key={comment.id}
                      onClick={() => setSelectedComment(comment.id)}
                      className={`p-2 rounded cursor-pointer ${
                        selectedComment === comment.id ? 'bg-slate-600' : 'bg-slate-700/50 hover:bg-slate-600/50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-xs font-medium ${
                          comment.author === 'ai' ? 'text-purple-400' : 'text-blue-400'
                        }`}>
                          {comment.author === 'ai' ? '🤖 AI' : '👤 User'}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(comment.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-sm text-gray-300">{comment.text}</p>
                      {comment.thread.length > 0 && (
                        <p className="text-xs text-gray-500 mt-1">{comment.thread.length} replies</p>
                      )}
                      <button
                        onClick={(e) => { e.stopPropagation(); resolveComment(comment.id); }}
                        className="mt-2 w-full px-2 py-1 bg-slate-600 hover:bg-slate-500 text-white text-xs rounded"
                      >
                        Resolve
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="text-center text-gray-500 py-8">
                    <p>No unresolved comments</p>
                    <p className="text-sm mt-1">Ask AI to suggest improvements</p>
                  </div>
                )}
              </div>
            )}

            {/* Context Panel */}
            {activePanel === 'context' && (
              <div className="p-3 space-y-4">
                {/* Brand Voice */}
                {brandVoice && (
                  <div>
                    <h3 className="text-sm font-semibold text-purple-400 mb-2">Brand Voice</h3>
                    <div className="bg-slate-700/50 rounded p-2 text-sm text-gray-300 max-h-32 overflow-auto">
                      {brandVoice}
                    </div>
                  </div>
                )}
                
                {/* Project Files */}
                {projectContext.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-blue-400 mb-2">Project Files</h3>
                    <div className="space-y-1">
                      {projectContext.map((file, i) => (
                        <div key={i} className="text-sm text-gray-300 truncate">
                          📄 {file}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Research History */}
                {researchHistory.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-green-400 mb-2">Research History</h3>
                    <div className="space-y-2">
                      {researchHistory.map((item, i) => (
                        <div key={i} className="bg-slate-700/50 rounded p-2">
                          <p className="text-sm text-white font-medium">{item.title}</p>
                          <p className="text-xs text-gray-400 mt-1 line-clamp-2">{item.snippet}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {!brandVoice && projectContext.length === 0 && researchHistory.length === 0 && (
                  <div className="text-center text-gray-500 py-8">
                    <p>No context available</p>
                    <p className="text-sm mt-1">Associate a brand or project to add context</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}