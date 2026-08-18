'use client';

import { useState, useEffect } from 'react';
import { useGlobalModel } from '@/lib/context/ModelContext';

type DocumentType = 'word' | 'excel' | 'powerpoint';
type GenerationMode = 'ai' | 'raw';
type PresentationTheme = 'default' | 'dark' | 'blue' | 'green' | 'red' | 'purple' | 'orange';

interface GenerationState {
  loading: boolean;
  error: string | null;
  success: boolean;
}

interface Brand {
  id: string;
  name: string;
  description?: string;
  industry?: string;
  logo?: string;
  voiceProfile?: {
    tone?: string;
    style?: string;
    keyMessages?: string[];
    avoidPhrases?: string[];
    customInstructions?: string;
  };
}

interface BrandDocument {
  id: string;
  title: string;
  type: string;
  content: string;
  projectId?: string;
}

export default function OfficePage() {
  const { selectedModel } = useGlobalModel();
  const [docType, setDocType] = useState<DocumentType>('word');
  const [mode, setMode] = useState<GenerationMode>('ai');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [prompt, setPrompt] = useState('');
  const [presentationTheme, setPresentationTheme] = useState<PresentationTheme>('default');
  const [state, setState] = useState<GenerationState>({
    loading: false,
    error: null,
    success: false,
  });
  const [brands, setBrands] = useState<Brand[]>([]);
  const [selectedBrandId, setSelectedBrandId] = useState<string>('');
  const [loadingBrands, setLoadingBrands] = useState(true);
  const [logo, setLogo] = useState<string | null>(null);
  const [slideTemplate, setSlideTemplate] = useState<
    'standard' | 'quad' | 'gantt' | 'staffing'
  >('standard');
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [vaultDocs, setVaultDocs] = useState<BrandDocument[]>([]);
  const [selectedVaultDocId, setSelectedVaultDocId] = useState('');

  useEffect(() => {
    loadBrands();
  }, []);

  // Load the selected company's vault documents so Convert Content can pull
  // markdown straight from the proposal / solicitation intelligence reports.
  useEffect(() => {
    if (!selectedBrandId) {
      setVaultDocs([]);
      setSelectedVaultDocId('');
      return;
    }
    (async () => {
      try {
        const response = await fetch(
          `/api/brand-workspace/brands?id=${selectedBrandId}&includeDocuments=true`
        );
        if (!response.ok) return;
        const data = await response.json();
        const docs = (data.documents || []).filter((d: BrandDocument) =>
          ['markdown', 'proposal', 'report', 'txt'].includes(d.type)
        );
        setVaultDocs(docs);
      } catch (error) {
        console.error('Error loading vault documents:', error);
        setVaultDocs([]);
      }
    })();
  }, [selectedBrandId]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = event => {
      setContent(String(event.target?.result || ''));
      setUploadedFileName(file.name);
      setSelectedVaultDocId('');
    };
    reader.readAsText(file);
  };

  const loadVaultDocument = (docId: string) => {
    const doc = vaultDocs.find(d => d.id === docId);
    if (!doc) return;
    setContent(doc.content);
    setSelectedVaultDocId(docId);
    setUploadedFileName(null);
  };

  const loadBrands = async () => {
    try {
      const response = await fetch('/api/brand-workspace/brands');
      if (response.ok) {
        const data = await response.json();
        setBrands(data.brands || []);
      }
    } catch (error) {
      console.error('Error loading brands:', error);
    } finally {
      setLoadingBrands(false);
    }
  };

  const selectedBrand = brands.find(b => b.id === selectedBrandId);

  const documentTypes = [
    {
      id: 'word' as DocumentType,
      name: 'Word Document',
      icon: '📄',
      description: 'Create professional Word documents (.docx)',
      color: 'bg-blue-600 hover:bg-blue-700',
      promptHint:
        'Describe the document you want. Example: "Create a marketing report about Q3 sales with executive summary, key metrics, and recommendations"',
    },
    {
      id: 'excel' as DocumentType,
      name: 'Excel Spreadsheet',
      icon: '📊',
      description: 'Create data spreadsheets (.xlsx)',
      color: 'bg-green-600 hover:bg-green-700',
      promptHint:
        'Describe the spreadsheet you want. Example: "Create a budget tracker with categories, monthly columns, and totals"',
    },
    {
      id: 'powerpoint' as DocumentType,
      name: 'PowerPoint',
      icon: '📽️',
      description: 'Create presentations (.pptx)',
      color: 'bg-orange-600 hover:bg-orange-700',
      promptHint:
        'Describe the presentation you want. Example: "Create a 5-slide pitch deck for a startup presenting a mobile app"',
    },
  ];

  const promptExamples = {
    word: [
      'Write a project status report with timeline, milestones, risks, and next steps',
      'Create a meeting agenda with discussion points and action items',
      'Generate a business proposal for a new product launch',
      'Write meeting minutes with attendees, decisions, and action items',
      'Create a standard operating procedure document',
    ],
    excel: [
      'Create a project budget tracker with categories and totals',
      'Generate a sales report by region with charts',
      'Create a Kanban board tracker',
      'Make a simple inventory management spreadsheet',
      'Create a time tracking sheet',
    ],
    powerpoint: [
      'Create a 5-slide company introduction presentation',
      'Generate a project progress presentation',
      'Create a sales pitch deck',
      'Make a training presentation with key concepts',
      'Create a quarterly review presentation',
    ],
  };

  const presentationThemes: {
    id: PresentationTheme;
    name: string;
    description: string;
    preview: string;
  }[] = [
    {
      id: 'default',
      name: 'Default',
      description: 'Clean white background with dark text',
      preview: 'bg-white border-2 border-gray-300',
    },
    {
      id: 'dark',
      name: 'Dark Mode',
      description: 'Dark background with light text',
      preview: 'bg-gray-900 border-2 border-gray-700',
    },
    {
      id: 'blue',
      name: 'Professional Blue',
      description: 'Blue gradient with white text',
      preview: 'bg-gradient-to-r from-blue-600 to-blue-800 border-2 border-blue-400',
    },
    {
      id: 'green',
      name: 'Nature Green',
      description: 'Green gradient with white text',
      preview: 'bg-gradient-to-r from-green-600 to-green-800 border-2 border-green-400',
    },
    {
      id: 'red',
      name: 'Bold Red',
      description: 'Red gradient with white text',
      preview: 'bg-gradient-to-r from-red-600 to-red-800 border-2 border-red-400',
    },
    {
      id: 'purple',
      name: 'Creative Purple',
      description: 'Purple gradient with white text',
      preview: 'bg-gradient-to-r from-purple-600 to-purple-800 border-2 border-purple-400',
    },
    {
      id: 'orange',
      name: 'Energetic Orange',
      description: 'Orange gradient with white text',
      preview: 'bg-gradient-to-r from-orange-500 to-orange-700 border-2 border-orange-400',
    },
  ];

  const handleGenerate = async () => {
    if (!title.trim()) {
      setState({ loading: false, error: 'Please enter a title', success: false });
      return;
    }

    if (mode === 'ai' && !prompt.trim()) {
      setState({
        loading: false,
        error: 'Please enter a prompt describing what you want',
        success: false,
      });
      return;
    }

    if (mode === 'raw' && !content.trim()) {
      setState({ loading: false, error: 'Please enter content to convert', success: false });
      return;
    }

    setState({ loading: true, error: null, success: false });

    try {
      const requestBody: any = {
        type: docType === 'excel' ? 'cell' : docType === 'powerpoint' ? 'slide' : 'word',
        title,
        prompt: mode === 'ai' ? prompt : undefined,
        rawContent: mode === 'raw' ? content : undefined,
        model: selectedModel || undefined,
      };

      if (docType === 'powerpoint' && presentationTheme !== 'default') {
        requestBody.theme = presentationTheme;
      }

      if (docType === 'powerpoint' && slideTemplate !== 'standard') {
        requestBody.template = slideTemplate;
      }

      if ((docType === 'powerpoint' || docType === 'word') && logo) {
        requestBody.logo = logo;
      }

      if (selectedBrand) {
        requestBody.brandId = selectedBrandId;
      }

      const response = await fetch('/api/documents/generate/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate document');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${title}.${docType === 'excel' ? 'xlsx' : docType === 'powerpoint' ? 'pptx' : 'docx'}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setState({ loading: false, error: null, success: true });
    } catch (error) {
      setState({
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to generate document',
        success: false,
      });
    }
  };

  const selectedType = documentTypes.find(t => t.id === docType);

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Document Generator</h1>
          <p className="text-gray-400">
            Create professional documents with AI or convert your raw content
          </p>
        </div>

        {/* Document Type Selection */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {documentTypes.map(type => (
            <button
              key={type.id}
              onClick={() => setDocType(type.id)}
              className={`p-6 rounded-lg border-2 transition-all ${
                docType === type.id
                  ? `${type.color} border-white`
                  : 'bg-gray-800 border-gray-700 hover:border-gray-500'
              }`}
            >
              <div className="text-4xl mb-2">{type.icon}</div>
              <div className="font-semibold text-lg">{type.name}</div>
              <div className="text-sm text-gray-300 mt-1">{type.description}</div>
            </button>
          ))}
        </div>

        {/* Brand Voice Selector */}
        {!loadingBrands && brands.length > 0 && (
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">Company (Optional)</label>
            <select
              value={selectedBrandId}
              onChange={e => {
                setSelectedBrandId(e.target.value);
                const brand = brands.find(b => b.id === e.target.value);
                if (brand?.logo) {
                  setLogo(brand.logo);
                }
              }}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white"
            >
              <option value="">No company (use default style)</option>
              {brands.map(brand => (
                <option key={brand.id} value={brand.id}>
                  {brand.name}
                  {brand.industry ? ` (${brand.industry})` : ''}
                </option>
              ))}
            </select>
            {selectedBrand && (
              <div className="mt-2 flex items-center gap-4 text-sm">
                {selectedBrand.voiceProfile?.tone && (
                  <span className="text-gray-400 mr-1">Tone: {selectedBrand.voiceProfile.tone}</span>
                )}
                {selectedBrand.voiceProfile?.style && (
                  <span className="text-gray-400 mr-1">Style: {selectedBrand.voiceProfile.style}</span>
                )}
                <a
                  href={`/brand-workspace?brand=${selectedBrand.id}`}
                  className="inline-flex items-center text-purple-400 hover:text-purple-300"
                >
                  Open {selectedBrand.name} vault →
                </a>
              </div>
            )}
          </div>
        )}

        {/* Presentation Template (only for PowerPoint) */}
        {docType === 'powerpoint' && (
          <div className="mb-6">
            <label className="block text-sm font-medium mb-3">Presentation Template</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                {
                  id: 'standard' as const,
                  name: 'Standard Deck',
                  icon: '📊',
                  desc: 'Sections become slides',
                },
                {
                  id: 'quad' as const,
                  name: 'Quad Chart',
                  icon: '🀄',
                  desc: 'Technical / Mgmt / Past Perf / Price',
                },
                {
                  id: 'gantt' as const,
                  name: 'Gantt Chart',
                  icon: '📅',
                  desc: 'Schedule with task bars & milestones',
                },
                {
                  id: 'staffing' as const,
                  name: 'Staffing Report',
                  icon: '👥',
                  desc: 'Team table from the proposal',
                },
              ].map(t => (
                <button
                  key={t.id}
                  onClick={() => setSlideTemplate(t.id)}
                  className={`p-3 rounded-lg border-2 transition-all text-left ${
                    slideTemplate === t.id
                      ? 'border-purple-500 ring-2 ring-purple-500/30'
                      : 'border-gray-600 hover:border-gray-500'
                  }`}
                >
                  <div className="text-xl mb-1">{t.icon}</div>
                  <div className="text-sm font-medium">{t.name}</div>
                  <div className="text-xs text-gray-400 mt-0.5">{t.desc}</div>
                </button>
              ))}
            </div>
            <p className="text-xs text-slate-500 mt-2">
              Quad / Gantt / Staffing templates read the markdown content and build the chart
              automatically.
            </p>
          </div>
        )}

        {/* Presentation Theme (only for PowerPoint) */}
        {docType === 'powerpoint' && (
          <div className="mb-6">
            <label className="block text-sm font-medium mb-3">Presentation Theme</label>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
              {presentationThemes.map(theme => (
                <button
                  key={theme.id}
                  onClick={() => setPresentationTheme(theme.id)}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    presentationTheme === theme.id
                      ? 'border-purple-500 ring-2 ring-purple-500/30'
                      : 'border-gray-600 hover:border-gray-500'
                  }`}
                >
                  <div
                    className={`w-full h-8 rounded ${theme.preview} mb-2 flex items-center justify-center`}
                  >
                    <span
                      className={`text-xs font-medium ${theme.id === 'default' || theme.id === 'dark' ? '' : 'text-white'}`}
                    >
                      Aa
                    </span>
                  </div>
                  <div className="text-xs font-medium">{theme.name}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Logo Upload (Word + PowerPoint) */}
        {docType !== 'excel' && (
          <div className="mb-6">
            <label className="block text-sm font-medium mb-3">Logo (Optional)</label>
            <div className="flex items-center gap-4">
              <label className="cursor-pointer">
                <div className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm">
                  {logo ? 'Change Logo' : 'Upload Logo'}
                </div>
                <input
                  type="file"
                  accept="image/png,image/svg+xml,image/jpeg"
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = event => {
                        setLogo(event.target?.result as string);
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                  className="hidden"
                />
              </label>
              {logo && (
                <button
                  onClick={() => setLogo(null)}
                  className="px-4 py-2 bg-red-600/20 text-red-400 hover:bg-red-600/30 rounded-lg text-sm"
                >
                  Remove
                </button>
              )}
              {logo && <img src={logo} alt="Logo preview" className="h-10 w-auto object-contain" />}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {docType === 'powerpoint'
                ? 'Logo appears on all slides'
                : 'Logo appears in the header of every page'}
            </p>
          </div>
        )}

        {/* Mode Selection */}
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setMode('ai')}
            className={`px-6 py-3 rounded-lg font-medium transition-all ${
              mode === 'ai'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            ✨ AI Generate
          </button>
          <button
            onClick={() => setMode('raw')}
            className={`px-6 py-3 rounded-lg font-medium transition-all ${
              mode === 'raw'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            📝 Convert Content
          </button>
        </div>

        {/* Title Input */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">Document Title</label>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Enter a title for your document"
            className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white"
          />
        </div>

        {/* Content Area */}
        {mode === 'ai' ? (
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">Describe what you want</label>
            <textarea
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              placeholder={selectedType?.promptHint}
              rows={6}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white font-mono text-sm"
            />
            <div className="mt-3 flex flex-wrap gap-2">
              {promptExamples[docType].map((example, i) => (
                <button
                  key={i}
                  onClick={() => setPrompt(example)}
                  className="px-3 py-1.5 bg-gray-700 rounded text-xs hover:bg-gray-600 transition-colors"
                >
                  {example.slice(0, 40)}...
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">
              Content to convert (markdown from a proposal, meeting notes, or any text)
            </label>

            {/* Load sources: .md file or a company vault document */}
            <div className="flex flex-wrap items-center gap-3 mb-3">
              <label className="cursor-pointer">
                <div className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded-lg text-xs">
                  📄 Upload .md / .txt file
                </div>
                <input
                  type="file"
                  accept=".md,.markdown,.txt"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
              {selectedBrand && vaultDocs.length > 0 && (
                <select
                  value={selectedVaultDocId}
                  onChange={e => loadVaultDocument(e.target.value)}
                  className="px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-xs text-white"
                >
                  <option value="">Load from {selectedBrand.name}'s vault…</option>
                  {vaultDocs.map(doc => (
                    <option key={doc.id} value={doc.id}>
                      {doc.title}
                    </option>
                  ))}
                </select>
              )}
              {uploadedFileName && (
                <span className="text-xs text-gray-400">
                  ✓ {uploadedFileName} loaded
                </span>
              )}
            </div>

            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder={`Paste your markdown here (or upload a .md file). It will be converted to ${docType === 'excel' ? 'a spreadsheet' : docType === 'powerpoint' ? 'slides' : 'a Word document'}. For Word, markdown headings, tables, and lists are preserved exactly.`}
              rows={10}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white font-mono text-sm"
            />
          </div>
        )}

        {/* Error */}
        {state.error && (
          <div className="mb-4 p-4 bg-red-900/50 border border-red-500 rounded-lg text-red-200">
            {state.error}
          </div>
        )}

        {/* Success */}
        {state.success && (
          <div className="mb-4 p-4 bg-green-900/50 border border-green-500 rounded-lg text-green-200">
            ✅ Document generated and downloading!
          </div>
        )}

        {/* Generate Button */}
        <button
          onClick={handleGenerate}
          disabled={state.loading}
          className={`w-full py-4 rounded-lg font-semibold text-lg transition-all ${
            state.loading ? 'bg-gray-600 cursor-not-allowed' : 'bg-purple-600 hover:bg-purple-700'
          }`}
        >
          {state.loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              Generating...
            </span>
          ) : (
            `Generate ${selectedType?.name}`
          )}
        </button>

        {/* Tips */}
        <div className="mt-8 p-4 bg-gray-800 rounded-lg">
          <h3 className="font-semibold mb-2">💡 Tips</h3>
          <ul className="text-sm text-gray-400 space-y-1">
            <li>
              • <strong>Word:</strong> Describe sections, headings, and content you want
            </li>
            <li>
              • <strong>Excel:</strong> Specify columns, data structure, and calculations needed
            </li>
            <li>
              • <strong>PowerPoint:</strong> Mention number of slides and key points per slide
            </li>
            <li>• Use specific numbers and details for better results</li>
            <li>• Raw content mode will transform your pasted text into the selected format</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
