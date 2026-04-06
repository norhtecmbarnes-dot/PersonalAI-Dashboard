'use client';

import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { ManuscriptEditor } from '@/components/ManuscriptEditor';
import { bookWriterPlugin } from '@/plugins/book-writer';
import { useGlobalModel } from '@/lib/context/ModelContext';
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
  const [showOutlinePanel, setShowOutlinePanel] = useState(false);
  const [outlineTopic, setOutlineTopic] = useState('');
  const [outlineType, setOutlineType] = useState<
    'essay' | 'blog' | 'article' | 'report' | 'general'
  >('general');
  const [outlineResult, setOutlineResult] = useState<string | null>(null);
  const [outlineLoading, setOutlineLoading] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [changes, setChanges] = useState<TrackedChange[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedBrandId, setSelectedBrandId] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [availableBrands, setAvailableBrands] = useState<{ id: string; name: string }[]>([]);
  const { selectedModel } = useGlobalModel();
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
  const chatContainerRef = useRef<HTMLDivElement>(null);

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
    } catch (e) {
      console.warn('Error loading models:', e);
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

  // Auto-scroll chat to bottom when new messages arrive
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages, isLoading]);

  // Generate outline function
  const generateOutline = async () => {
    if (!outlineTopic.trim()) return;

    setOutlineLoading(true);
    setOutlineResult(null);

    try {
      const response = await fetch('/api/writing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'outline',
          topic: outlineTopic,
          type: outlineType,
          model: selectedModel,
        }),
      });

      const data = await response.json();
      if (data.result) {
        setOutlineResult(data.result);
      }
    } catch (error) {
      console.error('Error generating outline:', error);
      setOutlineResult('Error generating outline. Please try again.');
    } finally {
      setOutlineLoading(false);
    }
  };

  const applyOutlineToContent = () => {
    if (outlineResult) {
      setContent(outlineResult);
      setOutlineResult(null);
      setShowOutlinePanel(false);
    }
  };

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

  const markdownToHtml = (md: string): string => {
    let html = md;

    // Escape HTML first
    html = html.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    // Process headers - order matters (#### before ### before ## before #)
    // Also handle Roman numerals and letter-based headers
    html = html.replace(
      /^####\s+(.+)$/gm,
      '<h4 style="font-size: 1em; font-weight: bold; margin: 0.5em 0 0.3em 0;">$1</h4>'
    );
    html = html.replace(
      /^###\s+(.+)$/gm,
      '<h3 style="font-size: 1.1em; font-weight: bold; margin: 0.6em 0 0.3em 0;">$1</h3>'
    );
    html = html.replace(
      /^##\s+(.+)$/gm,
      '<h2 style="font-size: 1.3em; font-weight: bold; margin: 0.8em 0 0.3em 0;">$1</h2>'
    );
    html = html.replace(
      /^#\s+(.+)$/gm,
      '<h1 style="font-size: 1.5em; font-weight: bold; margin: 1em 0 0.3em 0;">$1</h1>'
    );

    // Roman numeral headers (I., II., III., etc.)
    html = html.replace(
      /^(I{1,3}|I{0}V|X{0,3}I{0,3})\.\s+(.+)$/gm,
      '<h2 style="font-size: 1.3em; font-weight: bold; margin: 0.8em 0 0.3em 0;">$2</h2>'
    );

    // Letter-based headers (A., B., C., etc.)
    html = html.replace(
      /^[A-Z]\.\s+(.+)$/gm,
      '<h3 style="font-size: 1.1em; font-weight: bold; margin: 0.6em 0 0.3em 0;">$1</h3>'
    );

    // Numbered headers (1., 2., 3., etc.)
    html = html.replace(
      /^\d+\.\s+(.+)$/gm,
      '<h4 style="font-size: 1em; font-weight: bold; margin: 0.5em 0 0.3em 0;">$1</h4>'
    );

    // Bold and italic
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

    // Split into lines for list processing
    const lines = html.split('\n');
    const result: string[] = [];
    let i = 0;

    while (i < lines.length) {
      const line = lines[i].trim();

      // Skip empty lines
      if (!line) {
        i++;
        continue;
      }

      // Check if it's a list item
      if (line.startsWith('<li')) {
        // Collect consecutive list items
        const listItems: string[] = [];
        const listType = line.includes('style="list-style-type: disc"') ? 'ul' : 'ul';

        while (i < lines.length && lines[i].trim().startsWith('<li')) {
          // Remove the list-style-type from individual items (it goes on the container)
          let item = lines[i].trim();
          item = item.replace(/ style="list-style-type: disc;"/, '');
          listItems.push(item);
          i++;
        }

        // Wrap in ul/ol
        if (listItems.length > 0) {
          result.push(`<${listType} style="margin: 0.5em 0; padding-left: 1.5em;">`);
          result.push(...listItems);
          result.push(`</${listType}>`);
        }
        continue;
      }

      // Not a list item, just add the line
      result.push(line);
      i++;
    }

    return result.join('\n');
  };

  const handleDiagramAction = async (type: 'diagram' | 'table') => {
    const sel = window.getSelection();
    const selectedText = sel?.toString() || '';
    if (!selectedText) {
      alert('Select text first');
      return;
    }
    setIsLoading(true);
    try {
      const prompt =
        type === 'diagram'
          ? `Generate a Mermaid diagram code for the following content. Return ONLY the mermaid code, no explanations. Use flowchart TD for processes, flowchart LR for linear flows, or stateDiagram for state machines.\n\nContent: ${selectedText}`
          : `Generate a markdown table for the following content. Return ONLY the table in markdown format.\n\nContent: ${selectedText}`;

      const res = await fetch('/api/writing/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'simplify', // Reuse existing action
          text: prompt,
          brandId: selectedBrandId,
          projectId: selectedProjectId,
          model: selectedModel,
        }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const reader = res.body?.getReader();
      if (!reader) throw new Error('No reader available');

      const decoder = new TextDecoder();
      let accumulatedText = '';

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
              if (parsed.content) accumulatedText += parsed.content;
            } catch (e) {
              /* ignore */
            }
          }
        }
      }

      // Clean up mermaid code block if present
      let code = accumulatedText.trim();
      code = code
        .replace(/^```mermaid\n?/, '')
        .replace(/```$/, '')
        .trim();
      code = code
        .replace(/^```\n?/, '')
        .replace(/```$/, '')
        .trim();

      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);

        if (type === 'diagram') {
          // Create a div to hold the mermaid diagram
          const diagramDiv = document.createElement('div');
          diagramDiv.className = 'mermaid-diagram-container';
          diagramDiv.style.cssText =
            'margin: 16px 0; padding: 16px; background: white; border-radius: 8px; text-align: center;';
          diagramDiv.innerHTML = `<pre class="mermaid">${code}</pre>`;
          range.deleteContents();
          range.insertNode(diagramDiv);

          // Initialize mermaid and render
          if (typeof window !== 'undefined') {
            const mermaid = (await import('mermaid')).default;
            mermaid.initialize({
              startOnLoad: true,
              theme: isDarkTheme ? 'dark' : 'default',
              securityLevel: 'loose',
            });
            try {
              const id = `mermaid-${Date.now()}`;
              const { svg } = await mermaid.render(id, code);
              diagramDiv.innerHTML = `<div class="mermaid">${svg}</div>`;
            } catch (e) {
              console.error('Mermaid render error:', e);
              diagramDiv.innerHTML = `<pre class="mermaid">${code}</pre><p style="color: red; font-size: 12px;">Diagram render error - Mermaid code may be invalid</p>`;
            }
          }
        } else {
          // Table - convert markdown table to HTML
          const tableHtml = markdownTableToHtml(code);
          const tableDiv = document.createElement('div');
          tableDiv.className = 'table-container';
          tableDiv.style.cssText = 'margin: 16px 0; overflow-x: auto;';
          tableDiv.innerHTML = tableHtml;
          range.deleteContents();
          range.insertNode(tableDiv);
        }

        // Sync with React state
        const parentElement = range.commonAncestorContainer.parentElement;
        if (parentElement && parentElement.innerHTML) {
          setContent(parentElement.innerHTML);
        }
      }
    } catch (e: any) {
      console.error(`${type} error:`, e);
      alert(`Error: ${e.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const markdownTableToHtml = (md: string): string => {
    const lines = md.split('\n').filter(l => l.trim() && !l.match(/^\|[-:\s]+\|$/));
    if (lines.length < 2) return '<p>Invalid table</p>';

    const headers = lines[0]
      .split('|')
      .map(h => h.trim())
      .filter(h => h);
    const rows = lines.slice(1).map(row =>
      row
        .split('|')
        .map(cell => cell.trim())
        .filter(cell => cell)
    );

    let html = '<table style="width: 100%; border-collapse: collapse; margin: 16px 0;">';

    // Headers
    html += '<thead><tr>';
    headers.forEach(h => {
      html += `<th style="border: 1px solid #ddd; padding: 8px; background: #f5f5f5; text-align: left;">${h}</th>`;
    });
    html += '</tr></thead>';

    // Body
    html += '<tbody>';
    rows.forEach(row => {
      html += '<tr>';
      row.forEach(cell => {
        html += `<td style="border: 1px solid #ddd; padding: 8px;">${cell}</td>`;
      });
      html += '</tr>';
    });
    html += '</tbody></table>';

    return html;
  };

  const handleLinguixAction = async () => {
    const sel = window.getSelection();
    const selectedText = sel?.toString() || '';

    if (!selectedText) {
      alert('Select text to check grammar with Linguix');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/linguix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'fix', text: selectedText }),
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.error || 'Linguix API error');
      }

      const data = await res.json();

      if (data.changes > 0) {
        // Replace selected text with corrected text
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          range.deleteContents();

          const textNode = document.createTextNode(data.fixed);
          range.insertNode(textNode);

          // Sync with React state
          const parentElement = textNode.parentElement;
          if (parentElement && parentElement.innerHTML) {
            setContent(parentElement.innerHTML);
          }
        }

        // Show how many corrections were made
        alert(`✓ ${data.changes} correction${data.changes > 1 ? 's' : ''} applied`);
      } else {
        alert('✓ No grammar issues found');
      }
    } catch (e: any) {
      console.error('Linguix error:', e);
      alert(`Linguix error: ${e.message}\n\nMake sure Linguix API key is configured in Settings.`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAIAction = async (action: string) => {
    // Handle diagram and table specially
    if (action === 'diagram') {
      await handleDiagramAction('diagram');
      return;
    }
    if (action === 'table') {
      await handleDiagramAction('table');
      return;
    }

    // Handle Linguix grammar check
    if (action === 'linguix') {
      await handleLinguixAction();
      return;
    }

    const sel = window.getSelection();
    let selectedText = sel?.toString() || '';

    // For outline action, use document content if nothing selected
    if (!selectedText && action === 'outline') {
      // Get plain text from editor, not HTML
      const editorEl = document.querySelector('[contenteditable="true"]') as HTMLElement | null;
      selectedText = editorEl?.innerText || content || '';
    }

    if (!selectedText) {
      alert('Select text first or enter content in the editor');
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

        // Create visible streaming container
        const streamDiv = document.createElement('div');
        streamDiv.className = 'ai-streaming';
        streamDiv.style.cssText = isDarkTheme
          ? 'color: #e5e5e5; padding: 4px; margin: 4px 0;'
          : 'color: #1a1a1a; padding: 4px; margin: 4px 0;';
        streamDiv.textContent = '';
        range.insertNode(streamDiv);

        // Read streaming chunks with real-time visual feedback
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
                  // Real-time update visible element
                  streamDiv.textContent = accumulatedText;
                }
              } catch (e) {
                // Ignore parse errors for non-JSON chunks
              }
            }
          }
        }

        // Convert markdown to HTML for proper formatting
        const htmlContent = markdownToHtml(accumulatedText);

        // Replace streaming div with formatted content (no highlight, just insert)
        const finalDiv = document.createElement('div');
        finalDiv.style.cssText = 'display: inline;';
        finalDiv.innerHTML = htmlContent;
        streamDiv.replaceWith(finalDiv);

        // Sync with React state
        const parentElement = finalDiv.parentElement;
        if (parentElement && parentElement.innerHTML) {
          setContent(parentElement.innerHTML);
        }
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

    const messageToSend = chatInput.trim();
    if (!messageToSend || isLoading) return;

    const userMsg: ChatMessage = {
      id: `m_${Date.now()}`,
      author: 'user',
      text: messageToSend,
      timestamp: new Date(),
    };
    setChatMessages(p => [...p, userMsg]);
    setChatInput('');
    setIsLoading(true);

    console.log('[Writing Studio Chat] Sending message:', messageToSend);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: messageToSend,
          searchMode: true,
          model: selectedModel || 'qwen3.5:9b',
          brandId: selectedBrandId,
          projectId: selectedProjectId,
        }),
      });

      console.log('[Writing Studio Chat] Response status:', res.status);

      if (!res.ok) {
        const errorText = await res.text();
        console.error('[Writing Studio Chat] Error response:', errorText);
        throw new Error(`HTTP ${res.status}: ${errorText}`);
      }

      const data = await res.json();
      console.log('[Writing Studio Chat] Response data:', data);

      const responseText = data.message?.content || data.message || 'No response received';

      const aiMsg: ChatMessage = {
        id: `m_${Date.now()}`,
        author: 'ai',
        text: responseText,
        timestamp: new Date(),
        sources: data.sources || [],
      };
      setChatMessages(p => [...p, aiMsg]);
    } catch (e) {
      console.error('[Writing Studio Chat] Error:', e);
      const errorMsg: ChatMessage = {
        id: `m_${Date.now()}`,
        author: 'ai',
        text: `Error: ${e instanceof Error ? e.message : 'Unknown error'}. Please try again.`,
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

  // Add CSS animation for spinner and mermaid
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
      .mermaid-diagram-container svg {
        max-width: 100%;
        height: auto;
      }
      .mermaid {
        background: white;
        border-radius: 8px;
        padding: 16px;
      }
      .table-container table {
        border-collapse: collapse;
        width: 100%;
      }
      .table-container th, .table-container td {
        border: 1px solid #ddd;
        padding: 8px;
      }
      .table-container th {
        background: #f5f5f5;
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
    { id: 'linguix', name: 'Linguix', icon: '📝' },
    { id: 'diagram', name: 'Diagram', icon: '📊' },
    { id: 'table', name: 'Table', icon: '📱' },
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
            📚 Book {showBookPanel ? 'ON' : 'OFF'}
          </button>
          <button
            onClick={() => setShowOutlinePanel(!showOutlinePanel)}
            className={`px-3 py-1.5 rounded-lg text-sm ${showOutlinePanel ? 'bg-blue-600 text-white' : isDarkTheme ? 'bg-slate-800 text-slate-300' : 'bg-gray-200 text-gray-700'}`}
          >
            📝 Outline {showOutlinePanel ? 'ON' : 'OFF'}
          </button>
          <button
            onClick={() => setShowChatPanel(!showChatPanel)}
            className={`px-3 py-1.5 rounded-lg text-sm ${showChatPanel ? 'bg-purple-600 text-white font-bold' : isDarkTheme ? 'bg-slate-800 text-slate-300' : 'bg-gray-200 text-gray-700'}`}
          >
            💬 Chat {showChatPanel ? 'ON' : 'OFF'}
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

      {/* Pending Changes Bar - Right below toolbar for visibility */}
      {pendingChanges.length > 0 && (
        <div
          className={`px-4 py-2 border-b ${isDarkTheme ? 'bg-purple-900/30 border-purple-700' : 'bg-purple-50 border-purple-200'}`}
        >
          <div className="flex items-center gap-3 overflow-x-auto">
            <span
              className={`text-xs font-semibold uppercase whitespace-nowrap ${isDarkTheme ? 'text-purple-300' : 'text-purple-700'}`}
            >
              AI Changes ({pendingChanges.length})
            </span>
            {pendingChanges.map(c => (
              <div
                key={c.id}
                className={`flex items-center gap-2 px-3 py-1.5 rounded border ${isDarkTheme ? 'bg-slate-800 border-purple-600' : 'bg-white border-purple-300'}`}
              >
                <span className={`text-xs ${isDarkTheme ? 'text-purple-200' : 'text-purple-700'}`}>
                  {c.reason}
                </span>
                <button
                  onClick={() => handleAcceptChange(c.id)}
                  className="px-2 py-0.5 bg-green-600 hover:bg-green-500 text-white text-xs rounded"
                  title="Accept change"
                >
                  ✓ Accept
                </button>
                <button
                  onClick={() => handleRejectChange(c.id)}
                  className="px-2 py-0.5 bg-red-600 hover:bg-red-500 text-white text-xs rounded"
                  title="Reject change"
                >
                  ✗ Reject
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Content - with top padding to clear fixed header */}
      <div className="flex flex-1 overflow-hidden" style={{ paddingTop: '64px' }}>
        {/* Editor */}
        <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
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

          {/* Changes Panel - removed, now at top */}
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

        {/* Outline Panel */}
        {showOutlinePanel && (
          <div
            className={`w-80 border-l flex flex-col ${isDarkTheme ? 'bg-slate-900/80 border-slate-800' : 'bg-gray-50 border-gray-200'}`}
          >
            <div className={`p-4 border-b ${isDarkTheme ? 'border-slate-700' : 'border-gray-300'}`}>
              <h3
                className={`text-lg font-semibold ${isDarkTheme ? 'text-white' : 'text-gray-900'}`}
              >
                📝 Outline Generator
              </h3>
            </div>
            <div className="flex-1 overflow-auto p-4">
              <div className="space-y-4">
                <div>
                  <label
                    className={`text-sm font-medium ${isDarkTheme ? 'text-slate-300' : 'text-gray-700'}`}
                  >
                    Topic
                  </label>
                  <input
                    type="text"
                    value={outlineTopic}
                    onChange={e => setOutlineTopic(e.target.value)}
                    placeholder="Enter your topic..."
                    className={`w-full mt-1 px-3 py-2 rounded-lg text-sm ${isDarkTheme ? 'bg-slate-800 text-white border-slate-600' : 'bg-white text-gray-900 border-gray-300'} border focus:ring-2 focus:ring-blue-500`}
                  />
                </div>
                <div>
                  <label
                    className={`text-sm font-medium ${isDarkTheme ? 'text-slate-300' : 'text-gray-700'}`}
                  >
                    Type
                  </label>
                  <select
                    value={outlineType}
                    onChange={e => setOutlineType(e.target.value as any)}
                    className={`w-full mt-1 px-3 py-2 rounded-lg text-sm ${isDarkTheme ? 'bg-slate-800 text-white border-slate-600' : 'bg-white text-gray-900 border-gray-300'} border`}
                  >
                    <option value="general">General Outline</option>
                    <option value="essay">Essay</option>
                    <option value="blog">Blog Post</option>
                    <option value="article">Article</option>
                    <option value="report">Report</option>
                  </select>
                </div>
                <button
                  onClick={generateOutline}
                  disabled={!outlineTopic.trim() || outlineLoading}
                  className={`w-full py-2 px-4 rounded-lg text-sm font-medium ${outlineLoading || !outlineTopic.trim() ? 'bg-slate-600 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-500'} text-white`}
                >
                  {outlineLoading ? 'Generating...' : 'Generate Outline'}
                </button>
                {outlineResult && (
                  <div
                    className={`p-3 rounded-lg ${isDarkTheme ? 'bg-slate-800' : 'bg-white'} border ${isDarkTheme ? 'border-slate-600' : 'border-gray-200'}`}
                  >
                    <div
                      className={`prose prose-sm max-w-none ${isDarkTheme ? 'prose-invert' : ''}`}
                    >
                      <ReactMarkdown>{outlineResult}</ReactMarkdown>
                    </div>
                    <button
                      onClick={applyOutlineToContent}
                      className="mt-3 w-full py-2 px-4 bg-green-600 hover:bg-green-500 text-white text-sm rounded-lg"
                    >
                      Apply to Document
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Chat Panel - Research Agent */}
        {showChatPanel ? (
          <div
            className="w-80 bg-slate-900 border-l border-slate-700 flex flex-col"
            style={{ minHeight: '400px' }}
          >
            <div className="p-3 border-b border-slate-700 bg-purple-900">
              <h3 className="text-sm font-semibold text-white">Research Chat</h3>
            </div>
            <div className="flex-1 overflow-auto p-3 bg-slate-800" ref={chatContainerRef}>
              {!isLoading && chatMessages.length === 0 && (
                <div className="text-center py-8 text-slate-400">
                  <div className="text-3xl mb-2">?</div>
                  <p className="text-sm font-medium">Research Assistant</p>
                  <p className="text-xs mt-1">Ask anything - web search enabled</p>
                </div>
              )}
              {chatMessages.map(msg => (
                <div key={msg.id} className="mb-3">
                  <div
                    className={`text-xs mb-1 ${msg.author === 'user' ? 'text-purple-400' : 'text-emerald-400'}`}
                  >
                    {msg.author === 'user' ? 'You' : 'AI'}
                  </div>
                  <div className="p-2 rounded bg-slate-700 text-white text-sm group relative prose prose-invert prose-sm max-w-none">
                    <ReactMarkdown>{msg.text}</ReactMarkdown>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(msg.text);
                      }}
                      className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity px-2 py-1 bg-slate-600 hover:bg-slate-500 rounded text-xs"
                      title="Copy to clipboard"
                    >
                      Copy
                    </button>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="mb-3">
                  <div className="text-xs mb-1 text-emerald-400">AI</div>
                  <div className="p-2 rounded bg-slate-700 flex items-center gap-2">
                    <svg
                      className="w-4 h-4 animate-spin text-purple-500"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <circle cx="12" cy="12" r="10" opacity="0.25" />
                      <path d="M12 2a10 10 0 0 1 10 10" opacity="0.75" />
                    </svg>
                    <span className="text-sm text-slate-300 animate-pulse">Searching...</span>
                  </div>
                </div>
              )}
            </div>
            {/* Chat Input - Always visible at bottom */}
            <div className="shrink-0 p-3 border-t-2 border-purple-500 bg-black">
              <form onSubmit={handleChatSubmit} className="flex gap-2">
                <input
                  id="chat-input"
                  name="chatInput"
                  type="text"
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  placeholder="Type your question..."
                  disabled={isLoading}
                  autoComplete="off"
                  autoFocus
                  className="flex-1 px-4 py-3 rounded-lg text-base bg-white text-black placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 border-2 border-gray-300 font-medium"
                />
                <button
                  type="submit"
                  disabled={isLoading || !chatInput.trim()}
                  className="px-6 py-3 rounded-lg text-base font-bold bg-purple-600 text-white hover:bg-purple-500 disabled:bg-gray-500 disabled:text-gray-300 transition-colors"
                >
                  {isLoading ? '...' : 'Send'}
                </button>
              </form>
            </div>
          </div>
        ) : null}

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
                      content: `<h1>Blog Post Title</h1><p><br></p><h2>Introduction</h2><p>[Hook your reader with an engaging opening paragraph. Write 2-3 sentences that grab attention and set up your topic.]</p><p><br></p><h2>Main Point 1</h2><p>[Your first key insight. Provide evidence, examples, or data to support this point.]</p><p><br></p><h2>Main Point 2</h2><p>[Your second key insight. Build on the first point and add depth to your argument.]</p><p><br></p><h2>Main Point 3</h2><p>[Your third key insight. Provide the final supporting argument before concluding.]</p><p><br></p><h2>Conclusion</h2><p>[Summarize your main points and include a clear call-to-action for your readers.]</p>`,
                    },
                    {
                      id: 'proposal',
                      name: 'Business Proposal',
                      icon: '💼',
                      content: `<h1>Business Proposal</h1><p><br></p><h2>Executive Summary</h2><p>[Brief overview of the proposal. Summarize the key points and benefits in 2-3 paragraphs.]</p><p><br></p><h2>Problem Statement</h2><p>[Describe the problem or opportunity. What challenge does this proposal address?]</p><p><br></p><h2>Proposed Solution</h2><p>[Your solution approach. Explain how you will solve the problem or capitalize on the opportunity.]</p><p><br></p><h2>Deliverables</h2><p>[List specific deliverables. What will you provide?]</p><p><br></p><h2>Timeline</h2><p>[Project timeline and milestones. What are the key dates and phases?]</p><p><br></p><h2>Investment</h2><p>[Pricing and terms. What is the cost and payment schedule?]</p><p><br></p><h2>About Us</h2><p>[Company background and credentials. Why should they choose you?]</p>`,
                    },
                    {
                      id: 'academic',
                      name: 'Academic Paper',
                      icon: '🎓',
                      content: `<h1>Paper Title</h1><p><br></p><h2>Abstract</h2><p>[250-word summary of your research, including the research question, methodology, key findings, and conclusions.]</p><p><br></p><h2>Introduction</h2><p>[Background and research question. Establish the context and significance of your study.]</p><p><br></p><h2>Literature Review</h2><p>[Related work and theoretical framework. What have others found? Where are the gaps?]</p><p><br></p><h2>Methodology</h2><p>[Research design and methods. How did you conduct your research?]</p><p><br></p><h2>Results</h2><p>[Findings and data. What did you discover?]</p><p><br></p><h2>Discussion</h2><p>[Interpretation and implications. What do your findings mean?]</p><p><br></p><h2>Conclusion</h2><p>[Summary and future research. What are the key takeaways and next steps?]</p><p><br></p><h2>References</h2><p>[APA/MLA/Chicago format citations]</p>`,
                    },
                    {
                      id: 'novel',
                      name: 'Novel Chapter',
                      icon: '📖',
                      content: `<h1>Chapter N</h1><p><br></p><h2>Opening Scene</h2><p>[Establish setting and mood. Where are we? What's the atmosphere? Use sensory details to immerse the reader.]</p><p><br></p><h2>Character Introduction</h2><p>[Introduce or develop your characters. What do they look like? What are they feeling?]</p><p><br></p><h2>Rising Action</h2><p>[Advance the plot. Create tension or conflict. What challenges do the characters face?]</p><p><br></p><h2>Dialogue</h2><p>[Conversations that reveal character or move the plot. Give each character a distinct voice.]</p><p><br></p><h2>Climax</h2><p>[The key moment of the chapter. What's the turning point or revelation?]</p><p><br></p><h2>Resolution</h2><p>[Transition to the next chapter. Leave readers wanting more.]</p>`,
                    },
                    {
                      id: 'grant',
                      name: 'SBIR Grant Proposal',
                      icon: '🏛️',
                      content: `<h1>SBIR/STTR Grant Proposal</h1><p><br></p><h2>Project Summary</h2><p>[400-word abstract summarizing the innovation, approach, and commercial potential.]</p><p><br></p><h2>Statement of Need/Problem</h2><p>[Describe the problem being addressed. What is the market need or societal challenge?]</p><p><br></p><h2>Innovation</h2><p>[Novelty and competitive advantage. What makes your solution unique?]</p><p><br></p><h2>Technical Approach</h2><p>[Research plan and methodology. How will you develop and test your solution?]</p><p><br></p><h3>Phase I Objectives</h3><p>[Phase I goals and deliverables. What will you accomplish in 6 months?]</p><p><br></p><h3>Phase II Plan</h3><p>[Phase II commercialization. How will you scale after Phase I?] </p><p><br></p><h2>Commercialization Strategy</h2><p>[Market analysis and commercial potential. Who are your customers? How big is the market?]</p><p><br></p><h2>Team Qualifications</h2><p>[Key personnel and capabilities. Why is your team the right one for this project?]</p>`,
                    },
                    {
                      id: 'report',
                      name: 'Research Report',
                      icon: '📊',
                      content: `<h1>Research Report</h1><p><br></p><h2>Executive Summary</h2><p>[Key findings and recommendations. A concise overview for busy readers.]</p><p><br></p><h2>Background</h2><p>[Context and rationale. Why was this research conducted?]</p><p><br></p><h2>Methodology</h2><p>[Research approach and data sources. How was the data collected and analyzed?]</p><p><br></p><h2>Findings</h2><p>[Key discoveries and analysis. Present your data clearly with charts or tables if needed.]</p><p><br></p><h2>Analysis</h2><p>[Interpretation of results. What do the findings mean?]</p><p><br></p><h2>Recommendations</h2><p>[Actionable next steps. What should stakeholders do?] </p><p><br></p><h2>Appendices</h2><p>[Supporting data, materials, and detailed methodologies.]</p>`,
                    },
                    {
                      id: 'article',
                      name: 'Quick Article',
                      icon: '📄',
                      content: `<h1>Article Title</h1><p><br></p><p>Write your opening paragraph here. Hook the reader with an interesting statement, question, or story.</p><p><br></p><h2>Main Section</h2><p>[Expand on your main ideas. Use paragraphs to organize your thoughts.]</p><p><br></p><h3>Subsection</h3><p>[Add detail and supporting information.]</p><p><br></p><p>Continue writing...</p><p><br></p><h2>Conclusion</h2><p>[Wrap up with a strong closing thought.]</p>`,
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
