'use client';

import { useState, useEffect } from 'react';
import { ManuscriptEditor } from '@/components/ManuscriptEditor';
import { bookWriterPlugin } from '@/plugins/book-writer';
import type { TrackedChange } from '@/types/collab-editor';

interface BookChapter {
  id: string;
  number: number;
  title: string;
  content: string;
  status: string;
}

interface BookProject {
  id: string;
  title: string;
  chapters: BookChapter[];
  currentChapter: number;
}

interface ChatMessage {
  id: string;
  author: 'user' | 'ai';
  text: string;
  timestamp: Date;
  sources?: string[]; // Research sources for search mode
}

export default function WritingStudioPage() {
  const [content, setContent] = useState('');
  const [documentTitle, setDocumentTitle] = useState('Untitled Document');
  const [isDarkTheme, setIsDarkTheme] = useState(true);
  const [bookProject, setBookProject] = useState<BookProject | null>(null);
  const [showBookPanel, setShowBookPanel] = useState(false);
  const [showChatPanel, setShowChatPanel] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [changes, setChanges] = useState<TrackedChange[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedBrandId, setSelectedBrandId] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [availableBrands, setAvailableBrands] = useState<{ id: string; name: string }[]>([]);
  const [selectedModel, setSelectedModel] = useState('kimi-k2.5');
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [defaultFont, setDefaultFont] = useState('Merriweather, Georgia, serif');
  const [defaultFontSize, setDefaultFontSize] = useState('12pt');
  const [defaultSaveDir, setDefaultSaveDir] = useState('');
  const [showTemplates, setShowTemplates] = useState(false);
  const [versionHistory, setVersionHistory] = useState<
    Array<{ id: string; title: string; timestamp: number; content: string; wordCount: number }>
  >([]);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [showChapters, setShowChapters] = useState(false);
  const [chapters, setChapters] = useState<
    Array<{ id: string; title: string; level: number; wordCount: number; position: number }>
  >([]);

  useEffect(() => {
    const loadSavedData = () => {
      const saved = localStorage.getItem('writing_studio_doc');
      if (saved) {
        try {
          const data = JSON.parse(saved);
          setContent(data.content || '');
          setDocumentTitle(data.title || 'Untitled Document');
        } catch (e) {
          console.error('Error loading saved document:', e);
        }
      }
    };

    loadSavedData();

    // Load settings
    const settings = localStorage.getItem('writing_studio_settings');
    if (settings) {
      try {
        const data = JSON.parse(settings);
        setDefaultFont(data.defaultFont || 'Merriweather, Georgia, serif');
        setDefaultFontSize(data.defaultFontSize || '12pt');
        setDefaultSaveDir(data.defaultSaveDir || '');
      } catch (e) {
        console.error(e);
      }
    }

    const progress = bookWriterPlugin.getProgress();
    if (progress) {
      setBookProject({
        id: progress.id,
        title: progress.title,
        chapters: progress.chapters,
        currentChapter: progress.currentChapter,
      });
    }
    loadBrands();
    loadModels();

    // Auto-restore content when returning to tab
    const handleFocus = () => {
      loadSavedData();
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  const loadBrands = async () => {
    try {
      const res = await fetch('/api/brand-workspace/brands?action=list');
      if (!res.ok) {
        console.warn('Brand workspace API not available');
        return;
      }
      const data = await res.json();
      if (data.brands) {
        setAvailableBrands(data.brands.map((b: any) => ({ id: b.id, name: b.name })));
      }
    } catch (e) {
      console.warn('Error loading brands:', e);
    }
  };

  const loadModels = async () => {
    try {
      const res = await fetch('/api/models');
      const data = await res.json();
      const ollamaModels = (data.ollama?.models || []).map((m: any) => m.name || m.id);
      const externalModels = (data.external || []).map((m: any) => m.id);
      const allModels = [...ollamaModels, ...externalModels];

      // Writing-optimized models prioritized (based on your actual Ollama models)
      // Smaller models first for faster response
      const writingModels = [
        'llama3.2:3b', // Fastest (2GB) - default
        'qwen3.5:9b', // Good quality (6.6GB)
        'phi4:latest', // Good for writing (9.1GB)
        'gpt-oss:20b', // Open source writing model (16GB)
        'glm-4.7-flash:latest', // Fast writing (19GB)
        'qwen2.5-coder:32b-instruct', // High quality code/writing (19GB)
        'kimi-k2.5:cloud', // Cloud model
        'glm-5:cloud', // Cloud thinking
      ];

      // Filter to only writing-friendly models that are available
      const availableWritingModels = writingModels.filter(m => allModels.includes(m));

      if (availableWritingModels.length > 0) {
        setAvailableModels(availableWritingModels);
        setSelectedModel(availableWritingModels[0]);
      } else if (allModels.length > 0) {
        setAvailableModels(allModels.slice(0, 10)); // Limit to 10 models
        setSelectedModel(allModels[0]);
      } else {
        // Fallback: use your actual available models
        const fallbackModels = ['glm-4.7-flash:latest', 'qwen3.5:9b', 'phi4:latest'];
        setAvailableModels(fallbackModels);
        setSelectedModel('glm-4.7-flash:latest');
      }
    } catch (e) {
      console.warn('Error loading models:', e);
      // Fallback on error - use your actual models
      const fallbackModels = ['glm-4.7-flash:latest', 'qwen3.5:9b', 'phi4:latest'];
      setAvailableModels(fallbackModels);
      setSelectedModel('glm-4.7-flash:latest');
    }
  };

  useEffect(() => {
    localStorage.setItem(
      'writing_studio_doc',
      JSON.stringify({ content, title: documentTitle, timestamp: Date.now() })
    );
  }, [content, documentTitle]);

  // Persist content when switching tabs/windows
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        // Save when tab is hidden
        localStorage.setItem(
          'writing_studio_doc',
          JSON.stringify({ content, title: documentTitle, timestamp: Date.now() })
        );
      }
    };

    const handleBeforeUnload = () => {
      // Save before page unloads
      localStorage.setItem(
        'writing_studio_doc',
        JSON.stringify({ content, title: documentTitle, timestamp: Date.now() })
      );
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [content, documentTitle]);

  useEffect(() => {
    localStorage.setItem(
      'writing_studio_settings',
      JSON.stringify({ defaultFont, defaultFontSize, defaultSaveDir, timestamp: Date.now() })
    );
  }, [defaultFont, defaultFontSize, defaultSaveDir]);

  // Auto-save version history every 5 minutes
  useEffect(() => {
    const saveVersion = () => {
      if (!content.trim()) return;

      const versions = localStorage.getItem('writing_studio_versions');
      const versionsArray = versions ? JSON.parse(versions) : [];

      const newVersion = {
        id: `v_${Date.now()}`,
        title: documentTitle,
        content,
        timestamp: Date.now(),
        wordCount: content.split(/\s+/).filter(w => w.length > 0).length,
      };

      // Keep last 20 versions
      versionsArray.unshift(newVersion);
      if (versionsArray.length > 20) versionsArray.pop();

      localStorage.setItem('writing_studio_versions', JSON.stringify(versionsArray));
      setVersionHistory(versionsArray);
    };

    const interval = setInterval(saveVersion, 300000); // 5 minutes
    saveVersion(); // Save on mount

    return () => {
      clearInterval(interval);
    };
  }, [content, documentTitle]);

  useEffect(() => {
    // Load version history on mount
    const versions = localStorage.getItem('writing_studio_versions');
    if (versions) {
      try {
        const parsed = JSON.parse(versions);
        // Limit to 20 versions to prevent memory issues
        setVersionHistory(parsed.slice(0, 20));
      } catch (e) {
        // Fail silently to prevent crashes
      }
    }
  }, []);

  // Extract chapters/sections from content
  useEffect(() => {
    const extractChapters = () => {
      // Create temporary element to parse HTML
      const temp = document.createElement('div');
      temp.innerHTML = content;

      const headings = temp.querySelectorAll('h1, h2, h3');
      const extractedChapters: Array<{
        id: string;
        title: string;
        level: number;
        wordCount: number;
        position: number;
      }> = [];

      headings.forEach((heading, idx) => {
        const level = parseInt(heading.tagName.charAt(1));
        const title = heading.textContent || 'Untitled';

        // Calculate word count for this section
        let sectionText = '';
        let current: Element | null = heading;
        while (
          (current = current.nextElementSibling) &&
          !['H1', 'H2', 'H3'].includes(current.tagName)
        ) {
          sectionText += current.textContent + ' ';
        }

        const wordCount = sectionText
          .trim()
          .split(/\s+/)
          .filter(w => w.length > 0).length;

        extractedChapters.push({
          id: `heading-${idx}`,
          title,
          level,
          wordCount,
          position: idx,
        });
      });

      // Limit to 100 chapters to prevent memory issues
      setChapters(extractedChapters.slice(0, 100));
    };

    extractChapters();
  }, [content]);

  const handleAIAction = async (action: string) => {
    const sel = window.getSelection();
    const selectedText = sel?.toString() || '';
    if (!selectedText) {
      alert('Select text first');
      return;
    }
    setIsLoading(true);
    try {
      // Use streaming endpoint
      const res = await fetch('/api/writing/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          text: selectedText,
          brandId: selectedBrandId,
          projectId: selectedProjectId,
          model: selectedModel,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        console.error('Streaming API error:', errorData);
        throw new Error(
          errorData?.details || errorData?.error || `HTTP ${res.status}: ${res.statusText}`
        );
      }

      const reader = res.body?.getReader();
      if (!reader) {
        throw new Error('No reader available');
      }

      const decoder = new TextDecoder();
      let accumulatedText = '';

      // Show loading indicator
      const loadingIndicator = document.createElement('div');
      loadingIndicator.className = 'ai-loading';
      loadingIndicator.style.cssText = isDarkTheme
        ? 'display: inline-flex; align-items: center; gap: 8px; padding: 8px 12px; background: rgba(147, 51, 234, 0.2); border-radius: 6px; color: #e5e5e5; font-size: 12px;'
        : 'display: inline-flex; align-items: center; gap: 8px; padding: 8px 12px; background: rgba(147, 51, 234, 0.15); border-radius: 6px; color: #1a1a1a; font-size: 12px;';
      loadingIndicator.innerHTML = `
        <svg style="animation: spin 1s linear infinite; width: 16px; height: 16px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10" opacity="0.25"/>
          <path d="M12 2a10 10 0 0 1 10 10" opacity="0.75"/>
        </svg>
        <span>AI is writing...</span>
      `;

      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        range.deleteContents();
        range.insertNode(loadingIndicator);

        // Create hidden span for streaming text
        const tempSpan = document.createElement('span');
        tempSpan.style.cssText = 'position: absolute; opacity: 0; pointer-events: none;';
        document.body.appendChild(tempSpan);

        // Read streaming chunks
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n').filter(line => line.startsWith('data: '));

          for (const line of lines) {
            const data = line.replace('data: ', '').trim();
            if (data && data !== '[DONE]') {
              try {
                const parsed = JSON.parse(data);
                if (parsed.content) {
                  accumulatedText += parsed.content;
                  tempSpan.textContent = accumulatedText;
                }
              } catch (e) {
                // Ignore parse errors for non-JSON chunks
              }
            }
          }
        }

        // Remove loading indicator
        loadingIndicator.remove();

        // Replace with final text span (readable colors)
        const finalSpan = document.createElement('span');
        finalSpan.className = 'ai-suggestion';
        finalSpan.style.cssText = isDarkTheme
          ? 'background-color: rgba(147, 51, 234, 0.25); color: #e5e5e5; border-left: 3px solid #a855f7; padding: 2px 4px;'
          : 'background-color: rgba(147, 51, 234, 0.2); color: #1a1a1a; border-left: 3px solid #a855f7; padding: 2px 4px;';
        finalSpan.textContent = accumulatedText;
        range.deleteContents();
        range.insertNode(finalSpan);

        // Sync with React state
        const parentElement = finalSpan.parentElement;
        if (parentElement && parentElement.innerHTML) {
          setContent(parentElement.innerHTML);
        }

        // Track the change for accept/reject
        const change: TrackedChange = {
          id: `change_${Date.now()}`,
          type: 'ai_suggestion',
          status: 'pending',
          author: 'ai',
          position: 0,
          positionEnd: accumulatedText.length,
          originalText: selectedText,
          newText: accumulatedText,
          timestamp: Date.now(),
          reason: `Applied ${action}`,
        };
        setChanges(p => [...p, change]);
      }
    } catch (e: any) {
      console.error('AI action error:', e);
      const errorMessage = e?.message || 'Unknown error';
      const errorDetails = e?.response?.details || '';
      alert(`Error: ${errorMessage}\n${errorDetails}\n\nCheck console (F12) for details.`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    const userMsg: ChatMessage = {
      id: `m_${Date.now()}`,
      author: 'user',
      text: chatInput,
      timestamp: new Date(),
    };
    setChatMessages(p => [...p, userMsg]);
    setChatInput('');
    setIsLoading(true);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: chatInput,
          searchMode: true, // Enable research/search mode
          model: selectedModel || 'llama3.2:3b', // Use selected writing model or fallback
        }),
      });
      const data = await res.json();
      const aiMsg: ChatMessage = {
        id: `m_${Date.now()}`,
        author: 'ai',
        text: data.message?.content || data.message || '',
        timestamp: new Date(),
        sources: data.sources || [], // Include research sources
      };
      setChatMessages(p => [...p, aiMsg]);
    } catch (e) {
      console.error('Chat error:', e);
      const errorMsg: ChatMessage = {
        id: `m_${Date.now()}`,
        author: 'ai',
        text: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date(),
      };
      setChatMessages(p => [...p, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAcceptChange = (changeId: string) => {
    const change = changes.find(c => c.id === changeId);
    if (!change) return;

    // Remove the AI suggestion span and replace with plain text
    const aiSpanRegex = new RegExp(
      `<span class="ai-suggestion"[^>]*>${escapeRegExp(change.newText)}</span>`,
      'g'
    );
    // Replace with plain text (no highlighting)
    const contentAccepted = content.replace(aiSpanRegex, change.newText);
    setContent(contentAccepted);

    // Remove the change from tracking
    setChanges(p => p.filter(c => c.id !== changeId));
  };

  const handleRejectChange = (changeId: string) => {
    const change = changes.find(c => c.id === changeId);
    if (!change) return;

    // Revert the change - replace AI suggestion span with original text
    const aiSpanRegex = new RegExp(
      `<span class="ai-suggestion"[^>]*>${escapeRegExp(change.newText)}</span>`,
      'g'
    );
    const contentWithoutChange = content.replace(aiSpanRegex, change.originalText);
    setContent(contentWithoutChange);
    setChanges(p => p.filter(c => c.id !== changeId));
  };

  const escapeRegExp = (text: string) => {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  };

  // Add CSS animation for spinner
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
      @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  const writingActions = [
    { id: 'expand', name: 'Expand', icon: '📄' },
    { id: 'outline', name: 'Outline', icon: '📋' },
    { id: 'rewrite', name: 'Rewrite', icon: '🔄' },
    { id: 'simplify', name: 'Simplify', icon: '💡' },
    { id: 'humanize', name: 'Humanize', icon: '✨' },
    { id: 'grammar', name: 'Grammar', icon: '✓' },
  ];

  const pendingChanges = changes.filter(c => c.status === 'pending');

  return (
    <div
      className={`flex flex-col h-screen ${isDarkTheme ? 'bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950' : 'bg-gradient-to-br from-gray-50 via-white to-gray-100'}`}
    >
      {/* Header - Fixed at top */}
      <header
        className={`flex items-center justify-between px-6 py-3 backdrop-blur border-b sticky top-0 z-40 ${isDarkTheme ? 'bg-slate-900/95 border-slate-800' : 'bg-white/95 border-gray-200'}`}
        style={{ height: '64px' }}
      >
        <div className="flex items-center gap-4">
          <h1 className={`text-2xl font-bold ${isDarkTheme ? 'text-white' : 'text-gray-900'}`}>
            Writing Studio
          </h1>
          {bookProject && (
            <span className={`text-sm ${isDarkTheme ? 'text-slate-400' : 'text-gray-600'}`}>
              {bookProject.title}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {/* Model Selector */}
          {availableModels.length > 0 && (
            <select
              value={selectedModel}
              onChange={e => setSelectedModel(e.target.value)}
              className={`px-3 py-1.5 rounded-lg text-sm ${isDarkTheme ? 'bg-slate-800 text-slate-300' : 'bg-gray-200 text-gray-700'}`}
              title="Select AI model for writing"
            >
              {availableModels.map(model => (
                <option key={model} value={model}>
                  {model}
                </option>
              ))}
            </select>
          )}
          {/* Brand Voice Selector */}
          {availableBrands.length > 0 && (
            <select
              value={selectedBrandId || ''}
              onChange={e => {
                setSelectedBrandId(e.target.value || null);
                setSelectedProjectId(null);
              }}
              className={`px-3 py-1.5 rounded-lg text-sm ${isDarkTheme ? 'bg-slate-800 text-slate-300' : 'bg-gray-200 text-gray-700'}`}
              title="Select brand voice for AI writing"
            >
              <option value="">No Brand Voice</option>
              {availableBrands.map(brand => (
                <option key={brand.id} value={brand.id}>
                  {brand.name}
                </option>
              ))}
            </select>
          )}
          <button
            onClick={() => setShowBookPanel(!showBookPanel)}
            className={`px-3 py-1.5 rounded-lg text-sm ${showBookPanel ? 'bg-purple-600 text-white' : isDarkTheme ? 'bg-slate-800 text-slate-300' : 'bg-gray-200 text-gray-700'}`}
          >
            📖 Book
          </button>
          <button
            onClick={() => setShowChatPanel(!showChatPanel)}
            className={`px-3 py-1.5 rounded-lg text-sm ${showChatPanel ? 'bg-purple-600 text-white' : isDarkTheme ? 'bg-slate-800 text-slate-300' : 'bg-gray-200 text-gray-700'}`}
          >
            💬 Chat
          </button>
          <button
            onClick={() => setIsDarkTheme(!isDarkTheme)}
            className="p-2 rounded-lg text-sm bg-slate-700 text-yellow-400"
            title="Toggle theme"
          >
            {isDarkTheme ? '☀️' : '🌙'}
          </button>
          <button
            onClick={() => setShowTemplates(!showTemplates)}
            className={`px-3 py-1.5 rounded-lg text-sm ${isDarkTheme ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
            title="Templates"
          >
            📋
          </button>
          <button
            onClick={() => setShowChapters(!showChapters)}
            className={`px-3 py-1.5 rounded-lg text-sm ${isDarkTheme ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
            title="Chapter Navigation"
          >
            📑
          </button>
          <button
            onClick={() => setShowVersionHistory(!showVersionHistory)}
            className={`px-3 py-1.5 rounded-lg text-sm ${isDarkTheme ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
            title="Version History"
          >
            🕐
          </button>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`px-3 py-1.5 rounded-lg text-sm ${isDarkTheme ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
            title="Settings"
          >
            ⚙️
          </button>
        </div>
      </header>

      {/* AI Actions Toolbar - Below header */}
      <div
        className={`flex items-center gap-2 px-4 py-2 border-b ${isDarkTheme ? 'bg-slate-800/50 border-slate-700' : 'bg-gray-100 border-gray-200'}`}
        style={{ marginTop: '0px' }}
      >
        <span className={`text-xs uppercase ${isDarkTheme ? 'text-slate-400' : 'text-gray-600'}`}>
          AI Actions:
        </span>
        {writingActions.map(action => (
          <button
            key={action.id}
            onClick={() => handleAIAction(action.id)}
            disabled={isLoading}
            className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
              isLoading
                ? isDarkTheme
                  ? 'bg-slate-700 text-slate-400'
                  : 'bg-gray-200 text-gray-400'
                : isDarkTheme
                  ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
            } flex items-center gap-1`}
          >
            {isLoading && (
              <svg
                style={{ animation: 'spin 1s linear infinite' }}
                className="w-4 h-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="12" cy="12" r="10" opacity="0.25" />
                <path d="M12 2a10 10 0 0 1 10 10" opacity="0.75" />
              </svg>
            )}
            <span>{action.icon}</span>
            <span className="hidden sm:inline">{action.name}</span>
          </button>
        ))}
      </div>

      {/* Main Content - with top padding to clear fixed header */}
      <div className="flex flex-1 overflow-hidden pt-[64px]">
        {/* Editor */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-hidden">
            <ManuscriptEditor
              content={content}
              onChange={setContent}
              title={documentTitle}
              onTitleChange={setDocumentTitle}
              isDarkTheme={isDarkTheme}
              defaultFont={defaultFont}
              defaultFontSize={defaultFontSize}
            />
          </div>

          {/* Changes Panel */}
          {pendingChanges.length > 0 && (
            <div
              className={`px-4 py-3 border-t ${isDarkTheme ? 'bg-slate-800/50 border-slate-700' : 'bg-gray-100 border-gray-200'}`}
            >
              <div className="flex items-center gap-2 mb-2">
                <span
                  className={`text-xs uppercase ${isDarkTheme ? 'text-slate-400' : 'text-gray-600'}`}
                >
                  Pending Changes ({pendingChanges.length})
                </span>
              </div>
              <div className="flex gap-2 overflow-x-auto">
                {pendingChanges.map(c => (
                  <div
                    key={c.id}
                    className={`flex-shrink-0 p-2 rounded-lg border max-w-xs ${isDarkTheme ? 'bg-slate-700/50 border-slate-600' : 'bg-white border-gray-300'}`}
                  >
                    <p
                      className={`text-xs mb-1 ${isDarkTheme ? 'text-slate-400' : 'text-gray-600'}`}
                    >
                      {c.reason}
                    </p>
                    <p className="text-xs text-red-400 line-through mb-1">
                      {c.originalText.slice(0, 30)}...
                    </p>
                    <p className="text-xs text-emerald-400 mb-2">{c.newText.slice(0, 30)}...</p>
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleAcceptChange(c.id)}
                        className="flex-1 px-2 py-1 bg-emerald-600/20 text-emerald-400 text-xs rounded"
                      >
                        ✓
                      </button>
                      <button
                        onClick={() => handleRejectChange(c.id)}
                        className="flex-1 px-2 py-1 bg-red-600/20 text-red-400 text-xs rounded"
                      >
                        ✗
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Book Panel */}
        {showBookPanel && bookProject && (
          <div
            className={`w-80 border-l flex flex-col ${isDarkTheme ? 'bg-slate-900/80 border-slate-800' : 'bg-gray-50 border-gray-200'}`}
          >
            <div className={`p-4 border-b ${isDarkTheme ? 'border-slate-700' : 'border-gray-300'}`}>
              <h3
                className={`text-lg font-semibold ${isDarkTheme ? 'text-white' : 'text-gray-900'}`}
              >
                Book: {bookProject.title}
              </h3>
            </div>
            <div className="flex-1 overflow-auto p-4">
              <div className="space-y-1">
                {bookProject.chapters.map((chapter, idx) => (
                  <button
                    key={`${chapter.id}-${idx}`}
                    onClick={() => {
                      setContent(chapter.content || '');
                      setDocumentTitle(`Chapter ${chapter.number}: ${chapter.title}`);
                    }}
                    className={`w-full text-left px-3 py-2 rounded text-sm ${chapter.content ? (isDarkTheme ? 'bg-slate-700 text-slate-300' : 'bg-gray-200 text-gray-700') : isDarkTheme ? 'bg-slate-800/50 text-slate-400' : 'bg-gray-100 text-gray-500'}`}
                  >
                    <div className="flex justify-between items-center">
                      <span>Ch {chapter.number}</span>
                      {chapter.content && <span className="text-xs text-emerald-400">✓</span>}
                    </div>
                    <div className="text-xs truncate">{chapter.title}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Chat Panel - Research Agent */}
        {showChatPanel && (
          <div
            className={`w-80 border-l flex flex-col ${isDarkTheme ? 'bg-slate-900/80 border-slate-800' : 'bg-gray-50 border-gray-200'}`}
          >
            <div className={`p-4 border-b ${isDarkTheme ? 'border-slate-700' : 'border-gray-300'}`}>
              <h3
                className={`text-lg font-semibold ${isDarkTheme ? 'text-white' : 'text-gray-900'}`}
              >
                Research Chat
              </h3>
            </div>
            <div className="flex-1 overflow-auto p-4">
              {chatMessages.map(msg => (
                <div key={msg.id} className="mb-4">
                  <div
                    className={`text-xs mb-1 ${msg.author === 'user' ? 'text-purple-400' : 'text-emerald-400'}`}
                  >
                    {msg.author === 'user' ? 'You' : 'Research AI'}{' '}
                    {msg.timestamp.toLocaleTimeString()}
                  </div>
                  <div
                    className={`p-3 rounded ${isDarkTheme ? 'bg-slate-800 text-slate-300' : 'bg-white text-gray-800'}`}
                  >
                    {msg.text}
                  </div>
                  {msg.sources && msg.sources.length > 0 && (
                    <div className="mt-2 text-xs text-gray-500">
                      Sources: {msg.sources.length} links
                    </div>
                  )}
                </div>
              ))}
            </div>
            <form onSubmit={handleChatSubmit} className="p-4 border-t">
              <input
                type="text"
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                placeholder="Ask for research..."
                className={`w-full px-3 py-2 rounded border ${isDarkTheme ? 'bg-slate-800 border-slate-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
              />
            </form>
          </div>
        )}

        {/* Templates Modal */}
        {showTemplates && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div
              className={`bg-slate-900 rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden border ${isDarkTheme ? 'border-slate-700' : 'border-gray-300'} flex flex-col`}
            >
              <div
                className={`p-4 border-b ${isDarkTheme ? 'border-slate-700' : 'border-gray-300'} flex justify-between items-center`}
              >
                <h2
                  className={`text-xl font-semibold ${isDarkTheme ? 'text-white' : 'text-gray-900'}`}
                >
                  Document Templates
                </h2>
                <button
                  onClick={() => setShowTemplates(false)}
                  className={`p-2 rounded ${isDarkTheme ? 'hover:bg-slate-700' : 'hover:bg-gray-200'}`}
                >
                  ✕
                </button>
              </div>

              <div className="flex-1 overflow-auto p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    {
                      id: 'blog',
                      name: 'Blog Post',
                      icon: '📝',
                      content:
                        '# [Blog Post Title]\n\n## Introduction\n[Hook your reader with an engaging opening]\n\n## Main Point 1\n[Your first key insight]\n\n## Main Point 2\n[Your second key insight]\n\n## Main Point 3\n[Your third key insight]\n\n## Conclusion\n[Summarize and include call-to-action]',
                    },
                    {
                      id: 'proposal',
                      name: 'Business Proposal',
                      icon: '💼',
                      content:
                        '# Business Proposal\n\n## Executive Summary\n[Brief overview of the proposal]\n\n## Problem Statement\n[Describe the problem or opportunity]\n\n## Proposed Solution\n[Your solution approach]\n\n## Deliverables\n[List specific deliverables]\n\n## Timeline\n[Project timeline and milestones]\n\n## Investment\n[Pricing and terms]\n\n## About Us\n[Company background and credentials]',
                    },
                    {
                      id: 'academic',
                      name: 'Academic Paper',
                      icon: '🎓',
                      content:
                        '# [Paper Title]\n\n## Abstract\n[250-word summary]\n\n## Introduction\n[Background and research question]\n\n## Literature Review\n[Related work and theoretical framework]\n\n## Methodology\n[Research design and methods]\n\n## Results\n[Findings and data]\n\n## Discussion\n[Interpretation and implications]\n\n## Conclusion\n[Summary and future research]\n\n## References\n[APA/MLA/Chicago format]',
                    },
                    {
                      id: 'novel',
                      name: 'Novel Chapter',
                      icon: '📖',
                      content:
                        '# Chapter [Number]\n\n[Chapter Title]\n\n[Opening scene - establish setting and mood]\n\n[Character introduction or development]\n\n[Plot advancement - conflict or tension]\n\n[Dialogue - reveal character or move plot]\n\n[Climax of chapter - key moment]\n\n[Resolution - transition to next chapter]',
                    },
                    {
                      id: 'grant',
                      name: 'SBIR Grant Proposal',
                      icon: '🏛️',
                      content:
                        '# SBIR/STTR Grant Proposal\n\n## Project Summary\n[400-word abstract]\n\n## Statement of Need/Problem\n[Describe the problem being addressed]\n\n## Innovation\n[Novelty and competitive advantage]\n\n## Technical Approach\n[Research plan and methodology]\n\n### Phase I Objectives\n[Phase I goals and deliverables]\n\n### Phase II Plan\n[Phase II commercialization]\n\n## Commercialization Strategy\n[Market analysis and commercial potential]\n\n## Team Qualifications\n[Key personnel and capabilities]',
                    },
                    {
                      id: 'report',
                      name: 'Research Report',
                      icon: '📊',
                      content:
                        '# Research Report\n\n## Executive Summary\n[Key findings and recommendations]\n\n## Background\n[Context and rationale]\n\n## Methodology\n[Research approach and data sources]\n\n## Findings\n[Key discoveries and analysis]\n\n## Analysis\n[Interpretation of results]\n\n## Recommendations\n[Actionable next steps]\n\n## Appendices\n[Supporting data and materials]',
                    },
                  ].map(template => (
                    <button
                      key={template.id}
                      onClick={() => {
                        setContent(template.content);
                        setDocumentTitle(template.name);
                        setShowTemplates(false);
                      }}
                      className={`p-6 rounded-lg border-2 text-left transition-all ${isDarkTheme ? 'bg-slate-800 border-slate-700 hover:border-purple-500 hover:bg-slate-700' : 'bg-white border-gray-300 hover:border-purple-500 hover:bg-gray-50'}`}
                    >
                      <div className="text-3xl mb-2">{template.icon}</div>
                      <h3
                        className={`text-lg font-semibold mb-2 ${isDarkTheme ? 'text-white' : 'text-gray-900'}`}
                      >
                        {template.name}
                      </h3>
                      <p className={`text-sm ${isDarkTheme ? 'text-slate-400' : 'text-gray-600'}`}>
                        Click to load this template into the editor
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Version History Modal */}
        {showVersionHistory && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div
              className={`bg-slate-900 rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden border ${isDarkTheme ? 'border-slate-700' : 'border-gray-300'} flex flex-col`}
            >
              <div
                className={`p-4 border-b ${isDarkTheme ? 'border-slate-700' : 'border-gray-300'} flex justify-between items-center`}
              >
                <h2
                  className={`text-xl font-semibold ${isDarkTheme ? 'text-white' : 'text-gray-900'}`}
                >
                  Version History
                </h2>
                <button
                  onClick={() => setShowVersionHistory(false)}
                  className={`p-2 rounded ${isDarkTheme ? 'hover:bg-slate-700' : 'hover:bg-gray-200'}`}
                >
                  ✕
                </button>
              </div>

              <div className="flex-1 overflow-hidden flex">
                {/* Version List */}
                <div
                  className={`w-80 border-r ${isDarkTheme ? 'border-slate-700' : 'border-gray-300'} overflow-auto`}
                >
                  {versionHistory.length === 0 ? (
                    <div
                      className={`p-4 text-sm ${isDarkTheme ? 'text-slate-400' : 'text-gray-600'}`}
                    >
                      No versions saved yet. Auto-saves every 5 minutes.
                    </div>
                  ) : (
                    versionHistory.map((version, idx) => (
                      <button
                        key={version.id}
                        onClick={() => {
                          setContent(version.content);
                          setDocumentTitle(version.title);
                        }}
                        className={`w-full p-4 text-left border-b ${isDarkTheme ? 'border-slate-700 hover:bg-slate-700' : 'border-gray-300 hover:bg-gray-100'} transition-colors`}
                      >
                        <div
                          className={`text-sm font-medium ${isDarkTheme ? 'text-white' : 'text-gray-900'}`}
                        >
                          {version.title}
                        </div>
                        <div
                          className={`text-xs mt-1 ${isDarkTheme ? 'text-slate-400' : 'text-gray-600'}`}
                        >
                          {new Date(version.timestamp).toLocaleString()}
                        </div>
                        <div
                          className={`text-xs mt-1 ${isDarkTheme ? 'text-slate-500' : 'text-gray-500'}`}
                        >
                          {version.wordCount} words
                        </div>
                      </button>
                    ))
                  )}
                </div>

                {/* Preview */}
                <div className="flex-1 overflow-auto p-6">
                  {versionHistory.length > 0 && (
                    <div>
                      <h3
                        className={`text-lg font-semibold mb-4 ${isDarkTheme ? 'text-white' : 'text-gray-900'}`}
                      >
                        Preview
                      </h3>
                      <div className={`p-6 rounded ${isDarkTheme ? 'bg-slate-800' : 'bg-white'}`}>
                        <div
                          className={`text-sm ${isDarkTheme ? 'text-slate-300' : 'text-gray-700'} whitespace-pre-wrap`}
                        >
                          {versionHistory[0]?.content || 'Select a version to preview'}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div
                className={`p-4 border-t ${isDarkTheme ? 'border-slate-700' : 'border-gray-300'} flex justify-between items-center`}
              >
                <p className={`text-xs ${isDarkTheme ? 'text-slate-500' : 'text-gray-500'}`}>
                  Versions are auto-saved every 5 minutes. Keeping last 20 versions.
                </p>
                <button
                  onClick={() => setShowVersionHistory(false)}
                  className={`px-4 py-2 rounded ${isDarkTheme ? 'bg-slate-700 text-white hover:bg-slate-600' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'}`}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Chapter Navigation Modal */}
        {showChapters && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div
              className={`bg-slate-900 rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden border ${isDarkTheme ? 'border-slate-700' : 'border-gray-300'} flex flex-col`}
            >
              <div
                className={`p-4 border-b ${isDarkTheme ? 'border-slate-700' : 'border-gray-300'} flex justify-between items-center`}
              >
                <h2
                  className={`text-xl font-semibold ${isDarkTheme ? 'text-white' : 'text-gray-900'}`}
                >
                  Chapter Navigation
                </h2>
                <button
                  onClick={() => setShowChapters(false)}
                  className={`p-2 rounded ${isDarkTheme ? 'hover:bg-slate-700' : 'hover:bg-gray-200'}`}
                >
                  ✕
                </button>
              </div>

              <div className="flex-1 overflow-auto">
                {chapters.length === 0 ? (
                  <div
                    className={`p-8 text-center ${isDarkTheme ? 'text-slate-400' : 'text-gray-600'}`}
                  >
                    <div className="text-4xl mb-4">📑</div>
                    <p className="text-lg font-medium">No chapters detected</p>
                    <p className="text-sm mt-2">
                      Use headings (H1, H2, H3) to structure your document.
                      <br />
                      Chapters will appear here automatically.
                    </p>
                  </div>
                ) : (
                  <div className="p-4">
                    {/* Document Stats */}
                    <div
                      className={`mb-6 p-4 rounded-lg ${isDarkTheme ? 'bg-slate-800' : 'bg-gray-100'}`}
                    >
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                          <div
                            className={`text-2xl font-bold ${isDarkTheme ? 'text-white' : 'text-gray-900'}`}
                          >
                            {chapters.length}
                          </div>
                          <div
                            className={`text-xs ${isDarkTheme ? 'text-slate-400' : 'text-gray-600'}`}
                          >
                            Sections
                          </div>
                        </div>
                        <div>
                          <div
                            className={`text-2xl font-bold ${isDarkTheme ? 'text-white' : 'text-gray-900'}`}
                          >
                            {content.split(/\s+/).filter(w => w.length > 0).length}
                          </div>
                          <div
                            className={`text-xs ${isDarkTheme ? 'text-slate-400' : 'text-gray-600'}`}
                          >
                            Total Words
                          </div>
                        </div>
                        <div>
                          <div
                            className={`text-2xl font-bold ${isDarkTheme ? 'text-white' : 'text-gray-900'}`}
                          >
                            {Math.ceil(content.split(/\s+/).filter(w => w.length > 0).length / 500)}
                          </div>
                          <div
                            className={`text-xs ${isDarkTheme ? 'text-slate-400' : 'text-gray-600'}`}
                          >
                            Pages (est)
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Chapter List */}
                    <div className="space-y-2">
                      <h3
                        className={`text-sm font-semibold uppercase tracking-wide mb-3 ${isDarkTheme ? 'text-slate-400' : 'text-gray-600'}`}
                      >
                        Table of Contents
                      </h3>
                      {chapters.map(chapter => (
                        <button
                          key={chapter.id}
                          onClick={() => {
                            // Scroll to heading in editor
                            const temp = document.createElement('div');
                            temp.innerHTML = content;
                            const heading = temp.querySelectorAll('h1, h2, h3')[chapter.position];
                            if (heading && heading.textContent === chapter.title) {
                              // Find and scroll to the heading
                              const editor = document.querySelector('[contenteditable]');
                              if (editor) {
                                const allHeadings = editor.querySelectorAll('h1, h2, h3');
                                const targetHeading = allHeadings[chapter.position] as HTMLElement;
                                if (targetHeading) {
                                  targetHeading.scrollIntoView({
                                    behavior: 'smooth',
                                    block: 'center',
                                  });
                                  // Highlight temporarily
                                  targetHeading.style.transition = 'background-color 0.5s';
                                  targetHeading.style.backgroundColor = isDarkTheme
                                    ? 'rgba(147, 51, 234, 0.3)'
                                    : 'rgba(147, 51, 234, 0.2)';
                                  setTimeout(() => {
                                    targetHeading.style.backgroundColor = '';
                                  }, 2000);
                                }
                              }
                            }
                            setShowChapters(false);
                          }}
                          className={`w-full p-3 rounded-lg text-left transition-all hover:translate-x-1 ${
                            chapter.level === 1
                              ? isDarkTheme
                                ? 'bg-slate-700 hover:bg-slate-600'
                                : 'bg-gray-200 hover:bg-gray-300'
                              : chapter.level === 2
                                ? isDarkTheme
                                  ? 'bg-slate-800 hover:bg-slate-700 ml-4'
                                  : 'bg-gray-100 hover:bg-gray-200 ml-4'
                                : isDarkTheme
                                  ? 'bg-slate-800/50 hover:bg-slate-700 ml-8'
                                  : 'bg-gray-100/50 hover:bg-gray-200 ml-8'
                          }`}
                        >
                          <div className="flex justify-between items-center">
                            <div
                              className={`font-medium ${isDarkTheme ? 'text-white' : 'text-gray-900'}`}
                            >
                              {chapter.level === 1 && '📖 '}
                              {chapter.level === 2 && '📍 '}
                              {chapter.level === 3 && '▹ '}
                              {chapter.title}
                            </div>
                            <div
                              className={`text-xs ${isDarkTheme ? 'text-slate-400' : 'text-gray-500'}`}
                            >
                              {chapter.wordCount} words
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div
                className={`p-4 border-t ${isDarkTheme ? 'border-slate-700' : 'border-gray-300'} flex justify-between items-center`}
              >
                <p className={`text-xs ${isDarkTheme ? 'text-slate-500' : 'text-gray-500'}`}>
                  Click any chapter to jump to that section in the editor
                </p>
                <button
                  onClick={() => setShowChapters(false)}
                  className={`px-4 py-2 rounded ${isDarkTheme ? 'bg-slate-700 text-white hover:bg-slate-600' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'}`}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
