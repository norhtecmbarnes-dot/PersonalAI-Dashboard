'use client';

import { useState, useEffect, useRef } from 'react';

interface CanvasComponent {
  id: string;
  type: 'card' | 'table' | 'form' | 'chart' | 'list' | 'metrics' | 'timeline' | 'custom';
  title?: string;
  props: Record<string, unknown>;
}

interface CanvasLayout {
  id: string;
  columns: number;
  rows: number;
  gap: number;
  components: CanvasComponent[];
}

interface TableInfo {
  name: string;
}

export default function CanvasPage() {
  const [description, setDescription] = useState('');
  const [layout, setLayout] = useState<CanvasLayout | null>(null);
  const [html, setHtml] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [showRawHtml, setShowRawHtml] = useState(false);
  const [useAI, setUseAI] = useState(true);
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [selectedTable, setSelectedTable] = useState<string>('');
  const [bindToTable, setBindToTable] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<'mobile' | 'tablet' | 'desktop'>('desktop');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const canvasContainerRef = useRef<HTMLDivElement>(null);

  // Handle fullscreen toggle
  const toggleFullscreen = () => {
    if (!isFullscreen) {
      // Enter fullscreen
      if (canvasContainerRef.current) {
        if (canvasContainerRef.current.requestFullscreen) {
          canvasContainerRef.current.requestFullscreen().then(() => {
            setIsFullscreen(true);
          }).catch(err => {
            console.error('Error entering fullscreen:', err);
          });
        }
      }
    } else {
      // Exit fullscreen
      if (document.exitFullscreen) {
        document.exitFullscreen().then(() => {
          setIsFullscreen(false);
        }).catch(err => {
          console.error('Error exiting fullscreen:', err);
        });
      }
    }
  };

  // Listen for fullscreen change events
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  useEffect(() => {
    fetchTables();
    // Generate initial dashboard
    generateCanvas('A dashboard with metrics cards and a chart');
  }, []);

  const fetchTables = async () => {
    try {
      const res = await fetch('/api/canvas?action=tables');
      const data = await res.json();
      if (data.success) {
        setTables(data.tables || []);
      }
    } catch (e) {
      console.error('Failed to fetch tables:', e);
    }
  };

  const generateCanvas = async (desc?: string) => {
    const prompt = desc || description;
    if (!prompt.trim()) return;
    
    setLoading(true);
    try {
      let endpoint = '/api/canvas';
      let body: any = {};
      
      if (useAI) {
        // Use LLM to generate HTML
        endpoint = '/api/canvas';
        body = {
          action: bindToTable && selectedTable ? 'generateWithData' : 'generateWithAI',
          description: prompt,
          tableName: bindToTable ? selectedTable : undefined,
          model: 'glm-4.7-flash'
        };
      } else {
        // Use pattern matching (old way)
        body = {
          action: 'generateAndRender',
          description: prompt
        };
      }
      
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (data.success) {
        setLayout(data.layout);
        setHtml(data.html);
      } else {
        console.error('Canvas error:', data.error);
        alert('Error: ' + data.error);
      }
    } catch (e) {
      console.error('Failed to generate canvas:', e);
      alert('Failed to generate. Check console for details.');
    }
    setLoading(false);
  };

  const generateForm = async () => {
    if (!selectedTable) {
      alert('Please select a table first');
      return;
    }
    
    setLoading(true);
    try {
      const res = await fetch('/api/canvas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generateForm',
          tableName: selectedTable
        })
      });
      const data = await res.json();
      if (data.success) {
        setHtml(data.html);
        setLayout(null);
      } else {
        alert('Error: ' + data.error);
      }
    } catch (e) {
      console.error('Failed to generate form:', e);
    }
    setLoading(false);
  };

  const handleTemplate = (template: typeof templates[0]) => {
    setDescription(template.desc);
    generateCanvas(template.desc);
  };

  const templates = [
    // Landing Page Templates
    { name: 'Landing Page', desc: 'A complete landing page with hero, features, pricing, testimonials, and CTA sections' },
    { name: 'SaaS Homepage', desc: 'Software-as-a-Service homepage with hero, features grid, pricing tiers, and signup CTA' },
    { name: 'Product Page', desc: 'Product landing page with hero image, feature highlights, pricing, and testimonials' },
    
    // Dashboard Templates
    { name: 'Dashboard', desc: 'A dashboard with metrics cards showing KPIs, total users, revenue with trends' },
    { name: 'Sales Pipeline', desc: 'A CRM sales pipeline dashboard with deal stages, values, and probabilities' },
    { name: 'Analytics Dashboard', desc: 'Analytics dashboard with multiple charts, metrics, and data tables' },
    
    // Components
    { name: 'Hero Section', desc: 'Hero section with headline, subheadline, CTA buttons, and hero image' },
    { name: 'Features Grid', desc: 'Features section with icon cards showing product capabilities' },
    { name: 'Pricing Table', desc: 'Three-tier pricing table with features list and CTA buttons' },
    { name: 'Testimonials', desc: 'Customer testimonial cards with quotes, avatars, and company info' },
    { name: 'CTA Banner', desc: 'Call-to-action banner section with headline and signup button' },
    
    // Diagrams
    { name: 'Flowchart', desc: 'Create a flowchart diagram showing process flow with decision points' },
    { name: 'Architecture', desc: 'System architecture diagram showing layers and component connections' },
    
    // Data Components
    { name: 'Data Table', desc: 'A searchable data table with sorting and pagination' },
    { name: 'Charts', desc: 'Multiple charts showing bar chart and line chart for analytics' },
    { name: 'Form', desc: 'An input form with name, email, and message fields' },
    { name: 'Metrics Grid', desc: 'A metrics grid showing multiple KPI values in cards' },
    { name: 'Timeline', desc: 'A timeline showing events history with dates and descriptions' },
    { name: 'Payment Form', desc: 'A payment form with credit card fields, amount, and PayPal option' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="max-w-7xl mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white">Canvas / A2UI</h1>
          <p className="text-slate-400 mt-1">AI-generated interactive UI components with LLM contextualization</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            {/* AI Toggle */}
            <div className="bg-slate-800/50 backdrop-blur rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-white font-medium">Use AI Contextualization</h3>
                  <p className="text-slate-400 text-sm">LLM generates custom HTML based on your description</p>
                </div>
                <button
                  onClick={() => setUseAI(!useAI)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    useAI ? 'bg-purple-600' : 'bg-slate-600'
                  }`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    useAI ? 'translate-x-6' : 'translate-x-1'
                  }`} />
                </button>
              </div>
            </div>

            {/* Database Table Binding */}
            <div className="bg-slate-800/50 backdrop-blur rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-white font-medium">Bind to Database Table</h3>
                <button
                  onClick={() => setBindToTable(!bindToTable)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    bindToTable ? 'bg-green-600' : 'bg-slate-600'
                  }`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    bindToTable ? 'translate-x-6' : 'translate-x-1'
                  }`} />
                </button>
              </div>
              {bindToTable && (
                <select
                  value={selectedTable}
                  onChange={(e) => setSelectedTable(e.target.value)}
                  className="w-full bg-slate-900 text-white p-2 rounded border border-slate-700"
                >
                  <option value="">Select a table...</option>
                  {tables.map((t, index) => (
                    <option key={t.name || `table-${index}`} value={t.name}>{t.name}</option>
                  ))}
                </select>
              )}
              {bindToTable && selectedTable && (
                <button
                  onClick={generateForm}
                  disabled={loading}
                  className="mt-3 w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Generating...' : 'Generate Form from Table'}
                </button>
              )}
            </div>

            {/* Description Input */}
            <div className="bg-slate-800/50 backdrop-blur rounded-xl p-4">
              <h2 className="text-lg font-semibold text-white mb-3">Describe Your UI</h2>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full h-32 bg-slate-900 text-slate-200 p-3 rounded-lg border border-slate-700 focus:border-purple-500 focus:outline-none resize-none"
                placeholder="Describe the UI you want to create...&#10;&#10;Examples:&#10;- A sales pipeline with deal stages&#10;- A user management form&#10;- A dashboard showing revenue metrics&#10;- A contact form with email validation"
              />
              <button
                onClick={() => generateCanvas()}
                disabled={loading || !description.trim()}
                className="mt-3 w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Generating...' : useAI ? 'Generate with AI' : 'Generate UI'}
              </button>
            </div>

            {/* Templates */}
            <div className="bg-slate-800/50 backdrop-blur rounded-xl p-4">
              <h2 className="text-lg font-semibold text-white mb-3">Quick Templates</h2>
              <div className="grid grid-cols-2 gap-2">
                {templates.map((t) => (
                  <button
                    key={t.name}
                    onClick={() => handleTemplate(t)}
                    className="px-3 py-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 text-left text-sm"
                  >
                    {t.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Component Types Info */}
            <div className="bg-slate-800/50 backdrop-blur rounded-xl p-4">
              <h3 className="text-lg font-semibold text-white mb-3">Available Components</h3>
              
              {/* Landing Page Components */}
              <div className="mb-4">
                <h4 className="text-sm font-medium text-purple-400 mb-2">Landing Pages</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { type: 'Hero', desc: 'Hero section with headline and CTA' },
                    { type: 'Features', desc: 'Feature grid with icons and descriptions' },
                    { type: 'Pricing', desc: 'Three-tier pricing cards' },
                    { type: 'Testimonials', desc: 'Customer quote cards' },
                    { type: 'CTA', desc: 'Call-to-action banner' },
                    { type: 'Navbar', desc: 'Navigation header' },
                    { type: 'Footer', desc: 'Multi-column footer' },
                  ].map((comp) => (
                    <div key={comp.type} className="bg-slate-700/50 rounded-lg p-3">
                      <div className="font-medium text-white">{comp.type}</div>
                      <div className="text-xs text-slate-400 mt-1">{comp.desc}</div>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Diagram Components */}
              <div className="mb-4">
                <h4 className="text-sm font-medium text-green-400 mb-2">Diagrams</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { type: 'Mermaid', desc: 'Mermaid.js flowcharts' },
                    { type: 'Architecture', desc: 'System architecture diagrams' },
                    { type: 'Flowchart', desc: 'Process flow diagrams' },
                  ].map((comp) => (
                    <div key={comp.type} className="bg-slate-700/50 rounded-lg p-3">
                      <div className="font-medium text-white">{comp.type}</div>
                      <div className="text-xs text-slate-400 mt-1">{comp.desc}</div>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Dashboard Components */}
              <div>
                <h4 className="text-sm font-medium text-blue-400 mb-2">Dashboards</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { type: 'Card', desc: 'Display metrics with values and trends' },
                    { type: 'Table', desc: 'Searchable tables with pagination' },
                    { type: 'Form', desc: 'Input forms with validation' },
                    { type: 'Chart', desc: 'Bar, line, and pie charts' },
                    { type: 'List', desc: 'Task lists with checkboxes' },
                    { type: 'Timeline', desc: 'Event timelines with dates' },
                    { type: 'Metrics', desc: 'Grid of KPI cards' },
                    { type: 'Custom', desc: 'Arbitrary HTML content' },
                  ].map((comp) => (
                    <div key={comp.type} className="bg-slate-700/50 rounded-lg p-3">
                      <div className="font-medium text-white">{comp.type}</div>
                      <div className="text-xs text-slate-400 mt-1">{comp.desc}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Preview */}
          <div 
            ref={canvasContainerRef}
            className={`bg-slate-800/50 backdrop-blur rounded-xl overflow-hidden ${isFullscreen ? 'fixed inset-0 z-50' : ''}`}
          >
            <div className="bg-slate-700 px-4 py-2 flex items-center justify-between">
              <span className="text-white font-medium">{isFullscreen ? 'Canvas Preview (Fullscreen)' : 'Preview'}</span>
              <div className="flex items-center gap-4">
                {/* Fullscreen Toggle */}
                <button
                  onClick={toggleFullscreen}
                  className="px-3 py-1 bg-slate-600 text-white rounded hover:bg-slate-500 text-sm flex items-center gap-2"
                  title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
                >
                  {isFullscreen ? (
                    <>
                      <span>⤓</span> Exit
                    </>
                  ) : (
                    <>
                      <span>�</span> Fullscreen
                    </>
                  )}
                </button>
                
                {/* Device Toggle */}
                {!isFullscreen && (
                  <div className="flex bg-slate-600 rounded-lg p-1">
                    <button
                      onClick={() => setPreviewDevice('mobile')}
                      className={`px-3 py-1 rounded text-sm ${previewDevice === 'mobile' ? 'bg-purple-600 text-white' : 'text-slate-300'}`}
                      title="Mobile Preview"
                    >
                      📱
                    </button>
                    <button
                      onClick={() => setPreviewDevice('tablet')}
                      className={`px-3 py-1 rounded text-sm ${previewDevice === 'tablet' ? 'bg-purple-600 text-white' : 'text-slate-300'}`}
                      title="Tablet Preview"
                    >
                      📱
                    </button>
                    <button
                      onClick={() => setPreviewDevice('desktop')}
                      className={`px-3 py-1 rounded text-sm ${previewDevice === 'desktop' ? 'bg-purple-600 text-white' : 'text-slate-300'}`}
                      title="Desktop Preview"
                    >
                      💻
                    </button>
                  </div>
                )}
                <div className="flex gap-1">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                </div>
              </div>
            </div>
            
            {showRawHtml ? (
              <pre className="h-96 overflow-auto p-4 text-xs text-green-400 bg-slate-900">
                <code>{html}</code>
              </pre>
            ) : (
              <div className={`bg-slate-900 flex justify-center transition-all duration-300 ${
                previewDevice === 'mobile' ? 'p-4' : previewDevice === 'tablet' ? 'p-6' : 'p-0'
              }`}>
                <div className={`transition-all duration-300 ${
                  previewDevice === 'mobile' ? 'w-[375px]' : 
                  previewDevice === 'tablet' ? 'w-[768px]' : 'w-full'
                }`}>
                  <iframe
                    ref={(el) => { /* ref */ }}
                    srcDoc={html}
                    className={`w-full bg-white ${
                      isFullscreen 
                        ? 'h-[calc(100vh-120px)]' // Fullscreen height accounting for header
                        : previewDevice === 'mobile' 
                          ? 'h-[667px] rounded-[30px] border-4 border-slate-800' 
                          : previewDevice === 'tablet' 
                            ? 'h-[1024px] rounded-[20px] border-4 border-slate-800' 
                            : 'h-96'
                    }`}
                    sandbox="allow-scripts"
                    title="Canvas Preview"
                    style={{ 
                      boxShadow: !isFullscreen && previewDevice !== 'desktop' 
                        ? '0 0 50px rgba(0,0,0,0.5)' 
                        : 'none'
                    }}
                  />
                </div>
              </div>
            )}
            
            <div className="p-3 bg-slate-700/50 flex gap-2">
              <button
                onClick={() => setShowRawHtml(!showRawHtml)}
                className="px-3 py-1 bg-slate-600 text-slate-300 rounded hover:bg-slate-500 text-sm"
              >
                {showRawHtml ? 'Show Preview' : 'View Code'}
              </button>
              {html && (
                <>
                  <button
                    onClick={() => {
                      const blob = new Blob([html], { type: 'text/html' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = 'canvas.html';
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                    className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
                  >
                    Download HTML
                  </button>
                  <button
                    onClick={() => navigator.clipboard.writeText(html)}
                    className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                  >
                    Copy HTML
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* How It Works */}
        <div className="mt-8 bg-slate-800/30 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">How AI Canvas Works</h3>
          <div className="grid md:grid-cols-3 gap-6">
            <div>
              <h4 className="text-purple-400 font-medium mb-2">1. Describe Your UI</h4>
              <p className="text-slate-400 text-sm">
                Use natural language to describe the interface you need. The LLM understands context and generates appropriate HTML/CSS/JS.
              </p>
            </div>
            <div>
              <h4 className="text-purple-400 font-medium mb-2">2. AI Contextualization</h4>
              <p className="text-slate-400 text-sm">
                When "Use AI" is enabled, the LLM generates custom HTML based on your description. Disable it for faster, template-based generation.
              </p>
            </div>
            <div>
              <h4 className="text-purple-400 font-medium mb-2">3. Database Binding</h4>
              <p className="text-slate-400 text-sm">
                Select a SQLite table to generate forms that save data directly to your database. Tables include: contacts, tasks, events, notes, documents, brands.
              </p>
            </div>
          </div>
        </div>

        {/* API Usage */}
        <div className="mt-6 bg-slate-800/30 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-3">API Usage</h3>
          <pre className="bg-slate-900 p-4 rounded-lg text-green-400 text-sm overflow-x-auto">
{`// Generate UI with AI contextualization
POST /api/canvas
{
  "action": "generateWithAI",
  "description": "A sales pipeline dashboard",
  "model": "glm-4.7-flash"
}

// Generate form from database table
POST /api/canvas
{
  "action": "generateForm",
  "tableName": "contacts"
}

// Generate dashboard with real data
POST /api/canvas
{
  "action": "generateWithData",
  "description": "Show sales metrics",
  "tableName": "sales_data"
}

// List database tables
GET /api/canvas?action=tables`}
          </pre>
        </div>
      </div>
    </div>
  );
}