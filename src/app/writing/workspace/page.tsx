'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { RichTextEditor, type RichTextEditorHandle } from '@/components/RichTextEditor';
import { ModelSelector } from '@/components/ModelSelector';
import { BrandVoiceSelector } from '@/components/BrandVoiceSelector';
import { bookWriterPlugin } from '@/plugins/book-writer';

// Book writer plugin will be loaded client-side only
const loadBookWriterPlugin = () => {
  return bookWriterPlugin;
};

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
  status: string;
}

interface WritingAction {
  id: string;
  name: string;
  icon: string;
  description: string;
}

export default function WritingWorkspacePage() {
  const [content, setContent] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [selectedBrandId, setSelectedBrandId] = useState<string | null>(null);
  const [outline, setOutline] = useState('');
  const [showOutline, setShowOutline] = useState(false);
  const [bookProject, setBookProject] = useState<BookProject | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [aiAction, setAiAction] = useState<string>('');
  const [showBookPanel, setShowBookPanel] = useState(false);
  const [showAiPanel, setShowAiPanel] = useState(true);
  const editorRef = useRef<RichTextEditorHandle>(null);

  // Load book project on mount
  useEffect(() => {
    const plugin = loadBookWriterPlugin();
    if (plugin) {
      const progress = plugin.getProgress();
      if (progress) {
        setBookProject({
          id: progress.id,
          title: progress.title,
          chapters: progress.chapters,
          currentChapter: progress.currentChapter,
          status: progress.status,
        });
        // Load first chapter content if available
        if (progress.chapters.length > 0 && progress.chapters[0].content) {
          setContent(progress.chapters[0].content);
          setSelectedChapter(1);
        }
      }
    }
  }, []);

  const writingActions: WritingAction[] = [
    { id: 'expand', name: 'Expand', icon: '📄', description: 'Add more detail, examples, depth (2-3x longer)' },
    { id: 'outline', name: 'Create Outline', icon: '📋', description: 'Detailed hierarchical outline' },
    { id: 'continue', name: 'Continue', icon: '✍️', description: 'Continue writing naturally' },
    { id: 'rewrite', name: 'Rewrite', icon: '🔄', description: 'Rewrite in a different style' },
    { id: 'simplify', name: 'Simplify', icon: '💡', description: 'Make easier to understand' },
    { id: 'elaborate', name: 'Elaborate', icon: '📝', description: 'Add examples and evidence' },
    { id: 'structure', name: 'Structure', icon: '📊', description: 'Organize with headers and bullets' },
    { id: 'proposal', name: 'Generate Proposal', icon: '📑', description: 'Generate a business proposal using brand voice' },
    { id: 'diagram', name: 'Generate Diagram', icon: '🧩', description: 'Generate Mermaid.js diagram code from description' },
    { id: 'blog_post', name: 'Blog Post', icon: '📝', description: 'Generate comprehensive blog post from topic/outline' },
    { id: 'social_media', name: 'Social Media', icon: '🐦', description: 'Generate engaging social media content for multiple platforms' },
    { id: 'ad_copy', name: 'Ad Copy', icon: '📢', description: 'Generate persuasive advertising copy for products/services' },
    { id: 'product_description', name: 'Product Description', icon: '🏷️', description: 'Generate persuasive product descriptions for e-commerce' },
    { id: 'email_template', name: 'Email Template', icon: '📧', description: 'Generate professional email templates for marketing' },
  ];

  const handleStartBookProject = async () => {
    const plugin = loadBookWriterPlugin();
    if (!plugin) return;
    
    setIsLoading(true);
    try {
      const progress = plugin.initializeBook();
      setBookProject({
        id: progress.id,
        title: progress.title,
        chapters: progress.chapters,
        currentChapter: progress.currentChapter,
        status: progress.status,
      });
      setSelectedChapter(1);
      setContent('');
    } catch (error) {
      console.error('Error starting book project:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleWriteNextChapter = async () => {
    if (!bookProject) return;
    const plugin = loadBookWriterPlugin();
    if (!plugin) return;

    setIsLoading(true);
    try {
      const chapter = await plugin.writeNextChapter(selectedModel || undefined);
      if (chapter) {
        // Update book project state
        const progress = plugin.getProgress();
        if (progress) {
          setBookProject({
            id: progress.id,
            title: progress.title,
            chapters: progress.chapters,
            currentChapter: progress.currentChapter,
            status: progress.status,
          });
          // Load the newly written chapter
          setContent(chapter.content);
          setSelectedChapter(chapter.number);
        }
      }
    } catch (error) {
      console.error('Error writing next chapter:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectChapter = (chapterNumber: number) => {
    if (!bookProject) return;
    const chapter = bookProject.chapters.find(c => c.number === chapterNumber);
    if (chapter) {
      setSelectedChapter(chapterNumber);
      setContent(chapter.content || '');
    }
  };

  const handleSaveChapter = () => {
    if (!bookProject || !selectedChapter) return;
    const plugin = loadBookWriterPlugin();
    if (!plugin) return;

    const updatedChapter = plugin.updateChapterContent(selectedChapter, content);
    if (updatedChapter) {
      // Update local state
      const updatedChapters = bookProject.chapters.map(ch => 
        ch.number === selectedChapter ? { ...ch, content, status: 'completed' } : ch
      );
      setBookProject({ ...bookProject, chapters: updatedChapters });
    }
  };

  const handleAiAction = async (actionId: string) => {
    if (!content.trim()) return;
    
    setIsLoading(true);
    setAiAction(actionId);
    
    try {
      // Get selected text if any
      const selection = editorRef.current?.getSelection();
      const textToProcess = selection?.selectedText || content;
      
      const body: any = {
        action: actionId,
        text: textToProcess,
        model: selectedModel || undefined,
        stream: false,
      };
      if (selectedBrandId) {
        body.brandId = selectedBrandId;
      }
      const response = await fetch('/api/writing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await response.json();
      if (data.success) {
        if (selection) {
          // Replace only the selected portion
          const newContent = content.substring(0, selection.start) + data.result + content.substring(selection.end);
          setContent(newContent);
        } else {
          // Replace entire content
          setContent(data.result);
        }
        if (actionId === 'outline') {
          setOutline(data.result);
        }
      }
    } catch (error) {
      console.error('Error performing AI action:', error);
    } finally {
      setIsLoading(false);
      setAiAction('');
    }
  };

  const handleExportBook = () => {
    const plugin = loadBookWriterPlugin();
    if (!plugin) return;
    
    const fullBook = plugin.getFullBook();
    const blob = new Blob([fullBook], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${bookProject?.title || 'book'}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white">Writing Workspace</h1>
            <p className="text-slate-400 mt-1">
              AI-powered writing with document generation and formatting tools
            </p>
          </div>
          <div className="flex gap-2">
            <Link 
              href="/writing" 
              className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600"
            >
              Simple Writing
            </Link>
            <Link 
              href="/" 
              className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600"
            >
              ← Chat
            </Link>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Panel - Book Project */}
          <div className={`lg:col-span-1 ${showBookPanel ? 'block' : 'hidden lg:block'}`}>
            <div className="bg-slate-800/50 backdrop-blur rounded-xl p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-white">Document Project</h2>
                <button
                  onClick={() => setShowBookPanel(!showBookPanel)}
                  className="lg:hidden text-slate-400 hover:text-white"
                >
                  {showBookPanel ? '×' : '📖'}
                </button>
              </div>

              {!bookProject ? (
                <div className="text-center py-6">
                  <p className="text-slate-400 mb-4">No active document project</p>
                  <button
                    onClick={handleStartBookProject}
                    disabled={isLoading}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-600 text-white rounded-lg w-full"
                  >
                     {isLoading ? 'Creating...' : 'Create Document'}
                  </button>
                  <p className="text-slate-500 text-sm mt-3">
                    Generate a complete document with AI assistance
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-slate-700/50 rounded-lg p-3">
                    <h3 className="font-medium text-white">{bookProject.title}</h3>
                    <p className="text-slate-400 text-sm mt-1">
                      {bookProject.chapters.filter(c => c.content).length} / {bookProject.chapters.length} chapters
                    </p>
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={handleWriteNextChapter}
                        disabled={isLoading || bookProject.status === 'completed'}
                        className="flex-1 px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:bg-slate-600 text-white rounded text-sm"
                      >
                        {isLoading ? 'Writing...' : 'Next Chapter'}
                      </button>
                      <button
                        onClick={handleExportBook}
                        className="flex-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm"
                      >
                        Export
                      </button>
                    </div>
                  </div>

                  <div className="max-h-96 overflow-y-auto">
                    <h4 className="text-sm font-medium text-slate-300 mb-2">Chapters</h4>
                    <div className="space-y-2">
                      {bookProject.chapters.map((chapter) => (
                         <button
                          key={chapter.id}
                          onClick={() => handleSelectChapter(chapter.number)}
                          className={`w-full text-left p-2 rounded transition-colors ${
                            selectedChapter === chapter.number
                              ? 'bg-purple-600 text-white'
                              : chapter.content
                                ? 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                                : 'bg-slate-800/50 hover:bg-slate-700 text-slate-400'
                          }`}
                        >
                          <div className="flex justify-between items-center">
                            <span className="text-sm">Chapter {chapter.number}</span>
                            {chapter.content && (
                              <span className="text-xs bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded">
                                ✓
                              </span>
                            )}
                          </div>
                          <div className="text-xs font-medium truncate mt-1">{chapter.title}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={() => setBookProject(null)}
                    className="w-full px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded text-sm"
                  >
                    Close Project
                  </button>
                </div>
              )}
            </div>

            {/* Model Selector */}
            <div className="mt-4 bg-slate-800/50 backdrop-blur rounded-xl p-4">
              <h3 className="text-sm font-medium text-white mb-2">AI Model</h3>
              <ModelSelector
                value={selectedModel}
                onChange={setSelectedModel}
                label=""
                showHealth={true}
                className="w-full"
              />
              <p className="text-slate-400 text-xs mt-2">
                Select model for AI writing and book generation
              </p>
            </div>

            {/* Brand Voice Selector */}
            <div className="mt-4 bg-slate-800/50 backdrop-blur rounded-xl p-4">
              <h3 className="text-sm font-medium text-white mb-2">Brand Voice</h3>
              <BrandVoiceSelector
                selectedBrandId={selectedBrandId}
                onBrandSelect={setSelectedBrandId}
              />
              <p className="text-slate-400 text-xs mt-2">
                Apply brand voice to AI writing
              </p>
            </div>

            {/* Outline */}
            {outline && (
              <div className="mt-4 bg-slate-800/50 backdrop-blur rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-white">Outline</h3>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowOutline(!showOutline)}
                      className="text-xs text-slate-400 hover:text-slate-300"
                    >
                      {showOutline ? 'Hide' : 'Show'}
                    </button>
                    <button
                      onClick={() => setOutline('')}
                      className="text-xs text-red-400 hover:text-red-300"
                    >
                      Clear
                    </button>
                  </div>
                </div>
                {showOutline && (
                  <div className="mt-2 text-sm text-slate-300 whitespace-pre-wrap max-h-60 overflow-y-auto">
                    {outline}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Center Panel - Editor */}
          <div className="lg:col-span-2">
            <div className="bg-slate-800/50 backdrop-blur rounded-xl p-4 h-full flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-white">
                  {bookProject && selectedChapter 
                    ? `Chapter ${selectedChapter}: ${bookProject.chapters.find(c => c.number === selectedChapter)?.title || 'Editor'}`
                    : 'Editor'
                  }
                </h2>
                <div className="flex gap-2">
                  {bookProject && selectedChapter && (
                    <button
                      onClick={handleSaveChapter}
                      className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded text-sm"
                    >
                      Save Chapter
                    </button>
                  )}
                  <button
                    onClick={() => setShowBookPanel(!showBookPanel)}
                    className="lg:hidden px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded text-sm"
                  >
                    {showBookPanel ? 'Hide Book' : 'Show Book'}
                  </button>
                  <button
                    onClick={() => setShowAiPanel(!showAiPanel)}
                    className="lg:hidden px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded text-sm"
                  >
                    {showAiPanel ? 'Hide AI' : 'Show AI'}
                  </button>
                </div>
              </div>

              <div className="flex-1">
                 <RichTextEditor
                  ref={editorRef}
                  value={content}
                  onChange={setContent}
                  placeholder="Start writing here, or generate content with AI..."
                  height="600px"
                  showToolbar={true}
                  showPreview={false}
                  splitView={true}
                  className="h-full"
                />
              </div>

              {isLoading && (
                <div className="mt-4 p-3 bg-slate-700/50 rounded-lg flex items-center justify-center">
                  <div className="animate-spin w-5 h-5 border-2 border-purple-400 border-t-transparent rounded-full mr-2"></div>
                  <span className="text-slate-300">
                    {aiAction ? `Applying ${aiAction}...` : 'Generating content...'}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Right Panel - AI Actions */}
          <div className={`lg:col-span-1 ${showAiPanel ? 'block' : 'hidden lg:block'}`}>
            <div className="bg-slate-800/50 backdrop-blur rounded-xl p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-white">AI Writing Tools</h2>
                <button
                  onClick={() => setShowAiPanel(!showAiPanel)}
                  className="lg:hidden text-slate-400 hover:text-white"
                >
                  {showAiPanel ? '×' : '🤖'}
                </button>
              </div>

              <p className="text-slate-400 text-sm mb-4">
                Select text in editor and click an action to apply AI transformation
              </p>

              <div className="space-y-3">
                {writingActions.map((action) => (
                  <button
                    key={action.id}
                    onClick={() => handleAiAction(action.id)}
                    disabled={isLoading || !content.trim()}
                    className="w-full p-3 text-left bg-slate-700/50 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{action.icon}</span>
                      <div className="flex-1">
                        <div className="font-medium text-white">{action.name}</div>
                        <div className="text-xs text-slate-400 mt-0.5">{action.description}</div>
                      </div>
                      {isLoading && aiAction === action.id && (
                        <div className="animate-spin w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full"></div>
                      )}
                    </div>
                  </button>
                ))}
              </div>

              {/* Quick Stats */}
              <div className="mt-6 pt-4 border-t border-slate-700">
                <h3 className="text-sm font-medium text-white mb-2">Document Stats</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-700/30 rounded p-3">
                    <div className="text-2xl font-bold text-white">
                      {content.trim() ? content.trim().split(/\s+/).length : 0}
                    </div>
                    <div className="text-xs text-slate-400">Words</div>
                  </div>
                  <div className="bg-slate-700/30 rounded p-3">
                    <div className="text-2xl font-bold text-white">{content.length}</div>
                    <div className="text-xs text-slate-400">Characters</div>
                  </div>
                </div>
                {bookProject && (
                  <div className="mt-3 text-sm text-slate-400">
                                         Document progress: {bookProject.chapters.filter(c => c.content).length} / {bookProject.chapters.length} chapters
                  </div>
                )}
              </div>

              {/* Tips */}
              <div className="mt-6 text-xs text-slate-500">
                <p className="font-medium text-slate-400 mb-1">Tips:</p>
                <ul className="space-y-1">
                  <li>• Select text before using AI actions for targeted edits</li>
                  <li>• Use "Expand" to add detail to paragraphs</li>
                  <li>• "Structure" organizes messy text</li>
                  <li>• Book chapters save automatically</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center text-slate-500 text-sm">
          <p>
            Writing Workspace integrates book generation, AI writing assistance, and rich text editing.
            {bookProject ? ` Working on: ${bookProject.title}` : ' Start a document project to begin.'}
          </p>
        </div>
      </div>
    </div>
  );
}