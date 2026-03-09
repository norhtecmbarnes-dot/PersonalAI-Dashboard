'use client';

import { useState, useRef, useEffect } from 'react';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  height?: string;
  showToolbar?: boolean;
  showPreview?: boolean;
  className?: string;
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = 'Start writing here...',
  height = '400px',
  showToolbar = true,
  showPreview = false,
  className = '',
}: RichTextEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isPreview, setIsPreview] = useState(showPreview);
  const [wordCount, setWordCount] = useState(0);
  const [charCount, setCharCount] = useState(0);

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
        case 'e':
          e.preventDefault();
          insertMarkdown('`', '`', 'code');
          break;
      }
    }
  };

  const renderPreview = () => {
    // Simple markdown preview using basic regex conversions
    // For a real implementation, use react-markdown
    const html = value
      .replace(/^# (.*$)/gm, '<h1 class="text-2xl font-bold mt-4 mb-2">$1</h1>')
      .replace(/^## (.*$)/gm, '<h2 class="text-xl font-bold mt-3 mb-2">$1</h2>')
      .replace(/^### (.*$)/gm, '<h3 class="text-lg font-bold mt-2 mb-1">$1</h3>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code class="bg-slate-700 px-1 rounded">$1</code>')
      .replace(/^> (.*$)/gm, '<blockquote class="border-l-4 border-slate-500 pl-4 my-2 text-slate-400">$1</blockquote>')
      .replace(/^- (.*$)/gm, '<li class="ml-4">$1</li>')
      .replace(/^(\d+)\. (.*$)/gm, '<li class="ml-4">$2</li>')
      .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" class="text-purple-400 hover:underline">$1</a>')
      .replace(/!\[(.*?)\]\((.*?)\)/g, '<img src="$2" alt="$1" class="max-w-full my-2 rounded">')
      .replace(/---/g, '<hr class="my-4 border-slate-700">')
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br>');

    return `<div class="prose prose-invert max-w-none p-4">${html}</div>`;
  };

  return (
    <div className={`flex flex-col border border-slate-700 rounded-lg overflow-hidden ${className}`}>
      {/* Toolbar */}
      {showToolbar && (
        <div className="flex items-center justify-between bg-slate-800 border-b border-slate-700 p-2">
          <div className="flex flex-wrap gap-1">
            {toolbarActions.map((action) => (
              <button
                key={action.title}
                onClick={action.action}
                className="px-2 py-1.5 text-sm bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-md transition-colors flex items-center gap-1"
                title={`${action.title} ${action.shortcut ? `(${action.shortcut})` : ''}`}
              >
                <span>{action.icon}</span>
                <span className="hidden sm:inline text-xs">{action.title}</span>
              </button>
            ))}
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsPreview(!isPreview)}
              className="px-3 py-1 text-sm bg-slate-700 hover:bg-slate-600 text-slate-300 rounded"
            >
              {isPreview ? 'Edit' : 'Preview'}
            </button>
            <div className="text-xs text-slate-400 hidden md:block">
              {wordCount} words • {charCount} chars
            </div>
          </div>
        </div>
      )}

      {/* Editor/Preview Area */}
      <div className="flex-1 bg-slate-900" style={{ height }}>
        {isPreview ? (
          <div 
            className="h-full overflow-auto p-4 text-slate-200"
            dangerouslySetInnerHTML={{ __html: renderPreview() }}
          />
        ) : (
          <textarea
            ref={textareaRef}
            value={value}
            onChange={handleTextareaChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="w-full h-full bg-slate-900 text-white p-4 resize-none focus:outline-none font-mono text-sm"
            style={{ minHeight: height }}
          />
        )}
      </div>

      {/* Status Bar */}
      <div className="flex justify-between items-center bg-slate-800 border-t border-slate-700 px-3 py-1.5 text-xs text-slate-400">
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
}