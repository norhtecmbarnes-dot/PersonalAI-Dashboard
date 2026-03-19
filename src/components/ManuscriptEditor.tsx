'use client';

import { useState, useRef, useEffect } from 'react';

interface ManuscriptEditorProps {
  content: string;
  onChange: (content: string) => void;
  title: string;
  onTitleChange: (title: string) => void;
  isDarkTheme: boolean;
  defaultFont?: string;
  defaultFontSize?: string;
}

export function ManuscriptEditor({
  content,
  onChange,
  title,
  onTitleChange,
  isDarkTheme,
  defaultFont = 'Merriweather, Georgia, serif',
  defaultFontSize = '12pt',
}: ManuscriptEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [wordCount, setWordCount] = useState(0);
  const [charCount, setCharCount] = useState(0);
  const [zoom, setZoom] = useState(100);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const PAGE_HEIGHT = 1056; // Letter size height at 96 DPI (11 inches)

  useEffect(() => {
    if (editorRef.current && content) {
      editorRef.current.innerHTML = content;
    }
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setShowExportMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const text = editorRef.current?.innerText || '';
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    setWordCount(words);
    setCharCount(text.length);

    // Calculate pages based on content height
    const contentHeight = editorRef.current?.scrollHeight || 0;
    const estimatedPages = Math.ceil(contentHeight / PAGE_HEIGHT);
    setTotalPages(Math.max(1, estimatedPages));
  }, [content]);

  const execCmd = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    const html = editorRef.current?.innerHTML || '';
    onChange(html);
  };

  const handleInput = () => {
    const html = editorRef.current?.innerHTML || '';
    onChange(html);
  };

  const insertLink = () => {
    const url = prompt('Enter URL:');
    if (url) execCmd('createLink', url);
  };

  const insertImage = () => {
    const url = prompt('Enter image URL:');
    if (url) execCmd('insertImage', url);
  };

  const formatBlock = (tag: string) => {
    document.execCommand('formatBlock', false, `<${tag}>`);
    handleInput();
  };

  const exportDocument = (format = 'html') => {
    if (format === 'pdf') {
      exportPDF();
    } else if (format === 'docx') {
      exportDOCX();
    } else {
      exportHTML();
    }
  };

  const exportHTML = () => {
    const html = `<!DOCTYPE html><html><head><title>${title}</title><style>body{font-family:${defaultFont};max-width:800px;margin:40px auto;padding:20px;line-height:1.8;font-size:${defaultFontSize}}</style></head><body>${content}</body></html>`;
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportPDF = async () => {
    try {
      const text = editorRef.current?.innerText || '';
      const response = await fetch('/api/documents/export/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: text, title }),
      });
      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${title}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        alert('Failed to export PDF');
      }
    } catch (error) {
      console.error('PDF export error:', error);
      alert('Failed to export PDF');
    }
  };

  const exportDOCX = async () => {
    try {
      const text = editorRef.current?.innerText || '';
      const response = await fetch('/api/documents/export/docx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: text, title }),
      });
      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${title}.docx`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        alert('Failed to export DOCX');
      }
    } catch (error) {
      console.error('DOCX export error:', error);
      alert('Failed to export DOCX');
    }
  };

  const saveAsWithPicker = async () => {
    try {
      // Use File System Access API if available
      if ('showSaveFilePicker' in window) {
        const handle = await (window as any).showSaveFilePicker({
          suggestedName: `${title}.html`,
          types: [
            {
              description: 'HTML File',
              accept: { 'text/html': ['.html'] },
            },
          ],
        });
        const writable = await handle.createWritable();
        const html = `<!DOCTYPE html><html><head><title>${title}</title><style>body{font-family:${defaultFont};max-width:800px;margin:40px auto;padding:20px;line-height:1.8;font-size:${defaultFontSize}}</style></head><body>${content}</body></html>`;
        await writable.write(html);
        await writable.close();
      } else {
        // Fallback to traditional download
        const html = `<!DOCTYPE html><html><head><title>${title}</title><style>body{font-family:${defaultFont};max-width:800px;margin:40px auto;padding:20px;line-height:1.8;font-size:${defaultFontSize}}</style></head><body>${content}</body></html>`;
        const blob = new Blob([html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${title}.html`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Save As error:', error);
      if ((error as any).name !== 'AbortError') {
        alert('Failed to save file');
      }
    }
  };

  const saveDocument = () => {
    localStorage.setItem('manuscript_content', content);
    localStorage.setItem('manuscript_title', title);
    alert('Document saved!');
  };

  const saveDocumentAs = () => {
    const newTitle = prompt('Enter new document name:', title);
    if (!newTitle) return;
    localStorage.setItem('manuscript_content', content);
    localStorage.setItem('manuscript_title', newTitle);
    onTitleChange(newTitle);
    alert(`Document saved as "${newTitle}"!`);
  };

  const toolbarBg = isDarkTheme ? 'bg-slate-800 border-slate-700' : 'bg-gray-100 border-gray-300';
  const btnBg = isDarkTheme
    ? 'hover:bg-slate-700 text-slate-300'
    : 'hover:bg-gray-200 text-gray-700';
  const btnActive = 'bg-purple-600 text-white';

  return (
    <div className="flex flex-col h-full">
      {/* Title Bar */}
      <div className={`flex items-center justify-between px-4 py-2 border-b ${toolbarBg}`}>
        <div className="flex items-center gap-3">
          <svg
            className="w-6 h-6 text-purple-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
          </svg>
          <input
            type="text"
            value={title}
            onChange={e => onTitleChange(e.target.value)}
            className={`px-3 py-1 rounded text-sm font-semibold ${isDarkTheme ? 'bg-slate-700 text-white' : 'bg-white text-gray-900'}`}
            placeholder="Document Title"
          />
        </div>
        <div className="flex items-center gap-2">
          <button onClick={saveDocument} className={`px-3 py-1.5 rounded text-sm ${btnBg}`}>
            Save
          </button>
          <button onClick={saveAsWithPicker} className={`px-3 py-1.5 rounded text-sm ${btnBg}`}>
            Save As...
          </button>
          <div className="relative inline-block" ref={exportMenuRef}>
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-sm rounded"
            >
              Export ▾
            </button>
            {showExportMenu && (
              <div
                className={`absolute right-0 mt-1 z-50 min-w-[120px] rounded-lg shadow-lg border ${isDarkTheme ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}
              >
                <button
                  onClick={() => {
                    exportDocument('html');
                    setShowExportMenu(false);
                  }}
                  className={`w-full text-left px-4 py-2 text-sm ${isDarkTheme ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-gray-100 text-gray-700'}`}
                >
                  HTML
                </button>
                <button
                  onClick={() => {
                    exportDocument('pdf');
                    setShowExportMenu(false);
                  }}
                  className={`w-full text-left px-4 py-2 text-sm ${isDarkTheme ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-gray-100 text-gray-700'}`}
                >
                  PDF
                </button>
                <button
                  onClick={() => {
                    exportDocument('docx');
                    setShowExportMenu(false);
                  }}
                  className={`w-full text-left px-4 py-2 text-sm ${isDarkTheme ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-gray-100 text-gray-700'}`}
                >
                  DOCX
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className={`flex items-center gap-1 px-4 py-2 border-b ${toolbarBg} flex-wrap`}>
        {/* Undo/Redo */}
        <button onClick={() => execCmd('undo')} className={`p-2 rounded ${btnBg}`} title="Undo">
          ↶
        </button>
        <button onClick={() => execCmd('redo')} className={`p-2 rounded ${btnBg}`} title="Redo">
          ↷
        </button>
        <div className={`w-px h-6 ${isDarkTheme ? 'bg-slate-600' : 'bg-gray-300'}`} />

        {/* Font */}
        <select
          onChange={e => execCmd('fontName', e.target.value)}
          className={`px-2 py-1 rounded text-sm ${isDarkTheme ? 'bg-slate-700 text-white' : 'bg-white text-gray-900'}`}
        >
          <option value="Merriweather">Merriweather</option>
          <option value="Georgia">Georgia</option>
          <option value="Arial">Arial</option>
          <option value="Times New Roman">Times New Roman</option>
        </select>

        {/* Size */}
        <select
          defaultValue="3"
          onChange={e => execCmd('fontSize', e.target.value)}
          className={`px-2 py-1 rounded text-sm ${isDarkTheme ? 'bg-slate-700 text-white' : 'bg-white text-gray-900'}`}
        >
          <option value="1">8pt</option>
          <option value="2">10pt</option>
          <option value="3">12pt</option>
          <option value="4">14pt</option>
          <option value="5">18pt</option>
        </select>
        <div className={`w-px h-6 ${isDarkTheme ? 'bg-slate-600' : 'bg-gray-300'}`} />

        {/* Formatting */}
        <button
          onClick={() => execCmd('bold')}
          className={`p-2 rounded font-bold ${btnBg}`}
          title="Bold (Ctrl+B)"
        >
          B
        </button>
        <button
          onClick={() => execCmd('italic')}
          className={`p-2 rounded italic ${btnBg}`}
          title="Italic (Ctrl+I)"
        >
          I
        </button>
        <button
          onClick={() => execCmd('underline')}
          className={`p-2 rounded underline ${btnBg}`}
          title="Underline (Ctrl+U)"
        >
          U
        </button>
        <button
          onClick={() => execCmd('strikeThrough')}
          className={`p-2 rounded line-through ${btnBg}`}
          title="Strikethrough"
        >
          S
        </button>
        <div className={`w-px h-6 ${isDarkTheme ? 'bg-slate-600' : 'bg-gray-300'}`} />

        {/* Alignment */}
        <button
          onClick={() => execCmd('justifyLeft')}
          className={`p-2 rounded ${btnBg}`}
          title="Align Left"
        >
          ☯
        </button>
        <button
          onClick={() => execCmd('justifyCenter')}
          className={`p-2 rounded ${btnBg}`}
          title="Align Center"
        >
          ☰
        </button>
        <button
          onClick={() => execCmd('justifyRight')}
          className={`p-2 rounded ${btnBg}`}
          title="Align Right"
        >
          ☰
        </button>
        <div className={`w-px h-6 ${isDarkTheme ? 'bg-slate-600' : 'bg-gray-300'}`} />

        {/* Lists */}
        <button
          onClick={() => execCmd('insertUnorderedList')}
          className={`p-2 rounded ${btnBg}`}
          title="Bullet List"
        >
          •
        </button>
        <button
          onClick={() => execCmd('insertOrderedList')}
          className={`p-2 rounded ${btnBg}`}
          title="Numbered List"
        >
          1.
        </button>
        <div className={`w-px h-6 ${isDarkTheme ? 'bg-slate-600' : 'bg-gray-300'}`} />

        {/* Headings */}
        <button
          onClick={() => formatBlock('h1')}
          className={`p-2 rounded font-bold ${btnBg}`}
          title="Heading 1"
        >
          H1
        </button>
        <button
          onClick={() => formatBlock('h2')}
          className={`p-2 rounded font-bold ${btnBg}`}
          title="Heading 2"
        >
          H2
        </button>
        <button
          onClick={() => formatBlock('h3')}
          className={`p-2 rounded font-semibold ${btnBg}`}
          title="Heading 3"
        >
          H3
        </button>
        <div className={`w-px h-6 ${isDarkTheme ? 'bg-slate-600' : 'bg-gray-300'}`} />

        {/* Insert */}
        <button onClick={insertLink} className={`p-2 rounded ${btnBg}`} title="Insert Link">
          🔗
        </button>
        <button onClick={insertImage} className={`p-2 rounded ${btnBg}`} title="Insert Image">
          🖼️
        </button>
        <button
          onClick={() => execCmd('insertHorizontalRule')}
          className={`p-2 rounded ${btnBg}`}
          title="Horizontal Rule"
        >
          —
        </button>
        <div className={`w-px h-6 ${isDarkTheme ? 'bg-slate-600' : 'bg-gray-300'}`} />

        {/* Clear */}
        <button
          onClick={() => execCmd('removeFormat')}
          className={`p-2 rounded ${btnBg}`}
          title="Clear Formatting"
        >
          ✕
        </button>
      </div>

      {/* Editor Area */}
      <div
        className="flex-1 overflow-auto pb-20"
        style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top center' }}
      >
        {/* Page Navigation */}
        {totalPages > 1 && (
          <div
            className={`sticky top-0 z-10 flex items-center justify-center gap-4 py-2 ${isDarkTheme ? 'bg-slate-900/95' : 'bg-white/95'} backdrop-blur`}
          >
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className={`px-3 py-1 rounded ${currentPage <= 1 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-slate-700'} ${isDarkTheme ? 'bg-slate-800 text-white' : 'bg-gray-200 text-gray-800'}`}
            >
              ← Prev
            </button>
            <span className={isDarkTheme ? 'text-white' : 'text-gray-800'}>
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className={`px-3 py-1 rounded ${currentPage >= totalPages ? 'opacity-50 cursor-not-allowed' : 'hover:bg-slate-700'} ${isDarkTheme ? 'bg-slate-800 text-white' : 'bg-gray-200 text-gray-800'}`}
            >
              Next →
            </button>
          </div>
        )}

        {/* Multi-page Editor */}
        <div
          ref={editorRef}
          contentEditable
          onInput={handleInput}
          className={`mx-auto rounded-lg shadow-lg ${isDarkTheme ? 'bg-slate-900 text-slate-200' : 'bg-white text-gray-800'}`}
          style={{
            fontFamily: defaultFont,
            fontSize: defaultFontSize,
            lineHeight: '1.8',
            width: '816px', // Letter size width at 96 DPI (8.5 inches)
            minHeight: `${PAGE_HEIGHT * totalPages}px`, // Dynamic height based on pages
            padding: '96px', // 1 inch margins
            marginBottom: '80px', // Extra space to prevent status bar overlap
          }}
          suppressContentEditableWarning
        />
      </div>

      {/* Status Bar */}
      <div className={`flex items-center justify-between px-4 py-2 border-t ${toolbarBg} text-xs`}>
        <div className="flex items-center gap-4">
          <span>Words: {wordCount}</span>
          <span>Characters: {charCount}</span>
        </div>
        <div className="flex items-center gap-2">
          <label>Zoom:</label>
          <input
            type="range"
            min="50"
            max="150"
            value={zoom}
            onChange={e => setZoom(Number(e.target.value))}
            className="w-24"
          />
          <span>{zoom}%</span>
        </div>
      </div>
    </div>
  );
}
