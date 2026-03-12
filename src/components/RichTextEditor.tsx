'use client';

import { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  height?: string;
  showToolbar?: boolean;
  showPreview?: boolean;
  splitView?: boolean;
  className?: string;
}

export interface RichTextEditorHandle {
  getSelection: () => { selectedText: string; start: number; end: number } | null;
  focus: () => void;
}

export const RichTextEditor = forwardRef<RichTextEditorHandle, RichTextEditorProps>(({
  value,
  onChange,
  placeholder = 'Start writing here...',
  height = '400px',
  showToolbar = true,
  showPreview = false,
  splitView = false,
  className = '',
}: RichTextEditorProps, ref) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isPreview, setIsPreview] = useState(showPreview);
  const [splitViewMode, setSplitViewMode] = useState(splitView);
  const [wordCount, setWordCount] = useState(0);
  const [charCount, setCharCount] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isDarkTheme, setIsDarkTheme] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  // Expose methods via ref
  useImperativeHandle(ref, () => ({
    getSelection: () => {
      if (!textareaRef.current) return null;
      const start = textareaRef.current.selectionStart;
      const end = textareaRef.current.selectionEnd;
      const selectedText = value.substring(start, end);
      return { selectedText, start, end };
    },
    focus: () => {
      textareaRef.current?.focus();
    },
  }));

  // Update word and character counts when value changes
  useEffect(() => {
    const words = value.trim() ? value.trim().split(/\s+/).length : 0;
    const chars = value.length;
    setWordCount(words);
    setCharCount(chars);
  }, [value]);

  // Focus textarea when preview is turned off
  useEffect(() => {
    if (!isPreview && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isPreview]);

  // Sync with prop changes
  useEffect(() => {
    setIsPreview(showPreview);
  }, [showPreview]);

  useEffect(() => {
    setSplitViewMode(splitView);
  }, [splitView]);

  // Handle fullscreen effects
  useEffect(() => {
    if (isFullscreen) {
      document.body.style.overflow = 'hidden';
      // Add escape key listener
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          setIsFullscreen(false);
        }
      };
      window.addEventListener('keydown', handleEscape);
      return () => {
        document.body.style.overflow = '';
        window.removeEventListener('keydown', handleEscape);
      };
    } else {
      document.body.style.overflow = '';
    }
  }, [isFullscreen]);

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
  };

  // Insert markdown syntax at cursor position
  const insertMarkdown = (prefix: string, suffix: string = '', defaultText: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);
    
    // If text is selected, wrap it with prefix and suffix
    // If no text selected, insert prefix + defaultText + suffix and place cursor between
    const newText = selectedText 
      ? `${prefix}${selectedText}${suffix}`
      : `${prefix}${defaultText}${suffix}`;
    
    const newValue = 
      value.substring(0, start) + 
      newText + 
      value.substring(end);
    
    onChange(newValue);
    
    // Set cursor position after insertion
    setTimeout(() => {
      if (!textarea) return;
      const newCursorPos = start + (selectedText ? prefix.length : prefix.length + defaultText.length);
      textarea.focus();
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 10);
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const toggleTheme = () => {
    setIsDarkTheme(!isDarkTheme);
  };

   const toolbarActions = [
    {
      icon: 'B',
      title: 'Bold',
      action: () => insertMarkdown('**', '**', 'bold text'),
      shortcut: 'Ctrl+B',
    },
    {
      icon: 'I',
      title: 'Italic',
      action: () => insertMarkdown('*', '*', 'italic text'),
      shortcut: 'Ctrl+I',
    },
    {
      icon: 'H1',
      title: 'Heading 1',
      action: () => insertMarkdown('# ', '', 'Heading'),
    },
    {
      icon: 'H2',
      title: 'Heading 2',
      action: () => insertMarkdown('## ', '', 'Subheading'),
    },
    {
      icon: 'H3',
      title: 'Heading 3',
      action: () => insertMarkdown('### ', '', 'Subheading'),
    },
    {
      icon: 'S',
      title: 'Strikethrough',
      action: () => insertMarkdown('~~', '~~', 'strikethrough'),
      shortcut: 'Ctrl+S',
    },
    {
      icon: '•',
      title: 'Bullet List',
      action: () => insertMarkdown('- ', '', 'List item'),
    },
    {
      icon: '1.',
      title: 'Numbered List',
      action: () => insertMarkdown('1. ', '', 'List item'),
    },
    {
      icon: '🔗',
      title: 'Link',
      action: () => insertMarkdown('[', '](https://example.com)', 'link text'),
    },
    {
      icon: '📷',
      title: 'Image',
      action: () => insertMarkdown('![', '](https://example.com/image.jpg)', 'alt text'),
    },
    {
      icon: '`',
      title: 'Inline Code',
      action: () => insertMarkdown('`', '`', 'code'),
    },
    {
      icon: '```',
      title: 'Code Block',
      action: () => insertMarkdown('```\n', '\n```', 'code'),
    },
    {
      icon: '>',
      title: 'Blockquote',
      action: () => insertMarkdown('> ', '', 'Quote'),
    },
    {
      icon: '---',
      title: 'Horizontal Rule',
      action: () => insertMarkdown('\n---\n', ''),
    },
    {
      icon: isFullscreen ? '✕' : '⛶',
      title: isFullscreen ? 'Exit Fullscreen' : 'Fullscreen',
      action: toggleFullscreen,
    },
    {
      icon: isDarkTheme ? '☀️' : '🌙',
      title: isDarkTheme ? 'Switch to Light Theme' : 'Switch to Dark Theme',
      action: toggleTheme,
    },
  ];

   // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey) {
      switch (e.key.toLowerCase()) {
        case 'b':
          e.preventDefault();
          insertMarkdown('**', '**', 'bold text');
          break;
        case 'i':
          e.preventDefault();
          insertMarkdown('*', '*', 'italic text');
          break;
        case 's':
          e.preventDefault();
          insertMarkdown('~~', '~~', 'strikethrough');
          break;
        case 'e':
          e.preventDefault();
          insertMarkdown('`', '`', 'code');
          break;
      }
    }
  };



  return (
    <div
      ref={containerRef}
      className={`
        flex flex-col border border-slate-700 rounded-lg overflow-hidden
        ${isFullscreen ? 'fixed inset-0 z-50 m-0 rounded-none' : ''}
        ${isDarkTheme ? 'bg-slate-900 border-slate-700' : 'bg-white border-gray-300'}
        ${className}
      `}
    >
      {/* Toolbar */}
      {showToolbar && (
         <div className={`flex items-center justify-between p-2 border-b ${isDarkTheme ? 'bg-slate-800 border-slate-700' : 'bg-gray-100 border-gray-300'}`}>
          <div className="flex flex-wrap gap-1">
            {toolbarActions.map((action) => (
              <button
                key={action.title}
                onClick={action.action}
                 className={`px-2 py-1.5 text-sm rounded-md transition-colors flex items-center gap-1 ${isDarkTheme ? 'bg-slate-700 hover:bg-slate-600 text-slate-300' : 'bg-gray-200 hover:bg-gray-300 text-gray-800'}`}
                title={`${action.title} ${action.shortcut ? `(${action.shortcut})` : ''}`}
              >
                <span>{action.icon}</span>
                <span className="hidden sm:inline text-xs">{action.title}</span>
              </button>
            ))}
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSplitViewMode(!splitViewMode)}
               className={`px-3 py-1 text-sm rounded ${splitViewMode ? 'bg-blue-600' : (isDarkTheme ? 'bg-slate-700 hover:bg-slate-600' : 'bg-gray-200 hover:bg-gray-300')} ${isDarkTheme ? 'text-slate-300' : 'text-gray-800'}`}
              title="Toggle split view"
            >
              Split
            </button>
            <button
              onClick={() => setIsPreview(!isPreview)}
              disabled={splitViewMode}
               className={`px-3 py-1 text-sm rounded disabled:opacity-50 disabled:cursor-not-allowed ${isDarkTheme ? 'bg-slate-700 hover:bg-slate-600 text-slate-300' : 'bg-gray-200 hover:bg-gray-300 text-gray-800'}`}
            >
              {isPreview ? 'Edit' : 'Preview'}
            </button>
             <div className={`text-xs hidden md:block ${isDarkTheme ? 'text-slate-400' : 'text-gray-600'}`}>
              {wordCount} words • {charCount} chars
            </div>
          </div>
        </div>
      )}

       {/* Editor/Preview Area */}
       <div className={`flex-1 ${isDarkTheme ? 'bg-slate-900' : 'bg-gray-50'}`} style={{ height }}>
        {splitViewMode ? (
           <div className={`grid grid-cols-2 h-full divide-x ${isDarkTheme ? 'divide-slate-700' : 'divide-gray-300'}`}>
            <textarea
              ref={textareaRef}
              value={value}
              onChange={handleTextareaChange}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
               className={`w-full h-full p-4 resize-none focus:outline-none font-mono text-sm ${isDarkTheme ? 'bg-slate-900 text-white' : 'bg-white text-gray-900'}`}
              style={{ minHeight: height }}
            />
            <div className={`h-full overflow-auto p-4 prose max-w-none ${isDarkTheme ? 'text-slate-200 prose-invert' : 'text-gray-800'}`}>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {value || 'Nothing to preview'}
              </ReactMarkdown>
            </div>
          </div>
        ) : isPreview ? (
             <div className={`h-full overflow-auto p-4 prose max-w-none ${isDarkTheme ? 'text-slate-200 prose-invert' : 'text-gray-800'}`}>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {value || 'Nothing to preview'}
            </ReactMarkdown>
          </div>
        ) : (
          <textarea
            ref={textareaRef}
            value={value}
            onChange={handleTextareaChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
             className={`w-full h-full p-4 resize-none focus:outline-none font-mono text-sm ${isDarkTheme ? 'bg-slate-900 text-white' : 'bg-white text-gray-900'}`}
            style={{ minHeight: height }}
          />
        )}
      </div>

       {/* Status Bar */}
       <div className={`flex justify-between items-center border-t px-3 py-1.5 text-xs ${isDarkTheme ? 'bg-slate-800 border-slate-700 text-slate-400' : 'bg-gray-100 border-gray-300 text-gray-600'}`}>
        <div className="flex items-center gap-4">
          <span>Markdown</span>
          <span className="hidden sm:inline">•</span>
          <span className="hidden sm:inline">Use **bold**, *italic*, `code`</span>
        </div>
        <div className="md:hidden">
          {wordCount} words
        </div>
      </div>
    </div>
  );
});

RichTextEditor.displayName = 'RichTextEditor';