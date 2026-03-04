'use client';

import { useState, useEffect } from 'react';

interface Chapter {
  id: string;
  number: number;
  title: string;
  content: string;
  status: string;
  lastUpdated: number;
}

interface BookProgress {
  id: string;
  title: string;
  author: string;
  subtitle: string;
  description: string;
  chapters: Chapter[];
  currentChapter: number;
  startedAt: number;
  lastUpdated: number;
  status: string;
  totalWords: number;
}

export default function BookWriterPage() {
  const [progress, setProgress] = useState<BookProgress | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    loadProgress();
  }, []);

  const loadProgress = async () => {
    try {
      const response = await fetch('/api/book-writer');
      const data = await response.json();
      if (data.progress) {
        setProgress(data.progress);
      }
    } catch (error) {
      console.error('Error loading progress:', error);
    }
  };

  const initializeBook = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/book-writer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'init' }),
      });
      const data = await response.json();
      if (data.progress) {
        setProgress(data.progress);
      }
    } catch (error) {
      console.error('Error initializing book:', error);
    } finally {
      setLoading(false);
    }
  };

  const writeNextChapter = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/book-writer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'writeNext' }),
      });
      const data = await response.json();
      if (data.progress) {
        setProgress(data.progress);
        setSelectedChapter(data.chapter?.number || null);
      }
    } catch (error) {
      console.error('Error writing chapter:', error);
    } finally {
      setLoading(false);
    }
  };

  const writeChapter = async (chapterNumber: number) => {
    setLoading(true);
    try {
      const response = await fetch('/api/book-writer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'writeChapter', chapterNumber }),
      });
      const data = await response.json();
      if (data.progress) {
        setProgress(data.progress);
      }
    } catch (error) {
      console.error('Error writing chapter:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportBook = async () => {
    setExporting(true);
    try {
      const response = await fetch('/api/book-writer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'fullBook' }),
      });
      const data = await response.json();
      if (data.book) {
        const blob = new Blob([data.book], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'building-your-own-ai-assistant.md';
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Error exporting book:', error);
    } finally {
      setExporting(false);
    }
  };

  const selectedChapterData = progress?.chapters.find(c => c.number === selectedChapter);

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white">Book Writer</h1>
            <p className="text-gray-400 mt-1">
              Creating: "Building Your Own AI Research Assistant"
            </p>
          </div>
          <div className="flex gap-3">
            {!progress && (
              <button
                onClick={initializeBook}
                disabled={loading}
                className="px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white rounded-lg font-medium"
              >
                {loading ? 'Starting...' : 'Start Writing Book'}
              </button>
            )}
            {progress && progress.status !== 'completed' && (
              <button
                onClick={writeNextChapter}
                disabled={loading}
                className="px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white rounded-lg font-medium"
              >
                {loading ? 'Writing...' : 'Write Next Chapter'}
              </button>
            )}
            {progress && (
              <button
                onClick={exportBook}
                disabled={exporting}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg font-medium"
              >
                {exporting ? 'Exporting...' : 'Export Book (Markdown)'}
              </button>
            )}
          </div>
        </div>

        {progress && (
          <>
            {/* Book Info */}
            <div className="bg-gray-800 rounded-lg p-6 mb-6">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold text-white">{progress.title}</h2>
                  <p className="text-purple-400 mt-1">{progress.subtitle}</p>
                  <p className="text-gray-400 mt-2">by {progress.author}</p>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-green-400">
                    {progress.chapters.filter(c => c.status === 'completed').length} / {progress.chapters.length}
                  </div>
                  <p className="text-gray-400 text-sm">Chapters Complete</p>
                  <p className="text-gray-400 text-sm mt-1">
                    {progress.totalWords.toLocaleString()} words
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Chapter List */}
              <div className="bg-gray-800 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-white mb-4">Chapters</h3>
                <div className="space-y-2 max-h-[600px] overflow-y-auto">
                  {progress.chapters.map((chapter) => (
                    <button
                      key={chapter.number}
                      onClick={() => setSelectedChapter(chapter.number)}
                      disabled={chapter.status === 'pending' && loading}
                      className={`w-full text-left p-3 rounded-lg transition-colors ${
                        selectedChapter === chapter.number
                          ? 'bg-purple-900/50 border border-purple-500'
                          : chapter.status === 'completed'
                            ? 'bg-green-900/30 border border-green-700 hover:border-green-600'
                            : chapter.status === 'writing'
                              ? 'bg-yellow-900/30 border border-yellow-700'
                              : 'bg-gray-700 hover:bg-gray-600'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-gray-400 text-sm">Chapter {chapter.number}</span>
                          <div className="text-white font-medium">{chapter.title}</div>
                        </div>
                        {chapter.status === 'completed' && (
                          <span className="text-green-400 text-xs">✓</span>
                        )}
                        {chapter.status === 'writing' && (
                          <span className="text-yellow-400 text-xs animate-pulse">...</span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Chapter Content */}
              <div className="lg:col-span-2 bg-gray-800 rounded-lg p-6">
                {selectedChapterData ? (
                  <div>
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-xl font-semibold text-white">
                          Chapter {selectedChapterData.number}: {selectedChapterData.title}
                        </h3>
                        <p className="text-gray-400 text-sm mt-1">
                          Status: {selectedChapterData.status} | 
                          Words: {selectedChapterData.content ? selectedChapterData.content.split(/\s+/).length : 0}
                        </p>
                      </div>
                      {selectedChapterData.status === 'pending' && (
                        <button
                          onClick={() => writeChapter(selectedChapterData.number)}
                          disabled={loading}
                          className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white rounded text-sm"
                        >
                          Write This Chapter
                        </button>
                      )}
                    </div>

                    <div className="prose prose-invert max-w-none">
                      {selectedChapterData.content ? (
                        <div className="text-gray-300 whitespace-pre-wrap leading-relaxed">
                          {selectedChapterData.content}
                        </div>
                      ) : (
                        <div className="text-gray-500 italic">
                          {selectedChapterData.status === 'writing' 
                            ? 'Writing in progress...'
                            : 'This chapter has not been written yet. Click "Write This Chapter" or "Write Next Chapter" to generate content.'}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-gray-500 text-center py-12">
                    Select a chapter to view its content
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {!progress && !loading && (
          <div className="text-center text-gray-400 py-12">
            <div className="text-6xl mb-4">📖</div>
            <p className="text-lg">No book in progress.</p>
            <p className="mt-2">Click "Start Writing Book" to begin writing your AI Assistant guide.</p>
          </div>
        )}
      </div>
    </div>
  );
}
