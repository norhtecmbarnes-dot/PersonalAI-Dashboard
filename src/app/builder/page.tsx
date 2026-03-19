'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { PageModelSelector } from '@/components/PageModelSelector';

// ============ CANVAS TYPES ============
interface CanvasLayout {
  id: string;
  columns: number;
  rows: number;
  gap: number;
  components: any[];
}

interface TableInfo {
  name: string;
}

// ============ FORMS TYPES ============
interface TableSchema {
  name: string;
  columns: ColumnInfo[];
}

interface ColumnInfo {
  name: string;
  type: string;
  notNull: boolean;
  primaryKey: boolean;
}

interface FormData {
  id: string;
  name: string;
  tableName: string;
  fields: FormField[];
  createdAt: number;
}

interface FormField {
  name: string;
  label: string;
  type: 'text' | 'number' | 'email' | 'date' | 'textarea' | 'select' | 'checkbox';
  required: boolean;
  placeholder?: string;
  options?: string[];
}

const templates = [
  {
    name: 'Landing Page',
    desc: 'A complete landing page with hero, features, pricing, testimonials, and CTA sections',
  },
  {
    name: 'SaaS Homepage',
    desc: 'Software-as-a-Service homepage with hero, features grid, pricing tiers, and signup CTA',
  },
  {
    name: 'Product Page',
    desc: 'Product landing page with hero image, feature highlights, pricing, and testimonials',
  },
  {
    name: 'Dashboard',
    desc: 'A dashboard with metrics cards showing KPIs, total users, revenue with trends',
  },
  {
    name: 'Sales Pipeline',
    desc: 'A CRM sales pipeline dashboard with deal stages, values, and probabilities',
  },
  {
    name: 'Analytics Dashboard',
    desc: 'Analytics dashboard with multiple charts, metrics, and data tables',
  },
  {
    name: 'Hero Section',
    desc: 'Hero section with headline, subheadline, CTA buttons, and hero image',
  },
  { name: 'Features Grid', desc: 'Features section with icon cards showing product capabilities' },
  { name: 'Pricing Table', desc: 'Three-tier pricing table with features list and CTA buttons' },
  {
    name: 'Testimonials',
    desc: 'Customer testimonial cards with quotes, avatars, and company info',
  },
  { name: 'Data Table', desc: 'A searchable data table with sorting and pagination' },
  { name: 'Charts', desc: 'Multiple charts showing bar chart and line chart for analytics' },
  { name: 'Contact Form', desc: 'A contact form with name, email, subject, and message fields' },
  { name: 'Login Form', desc: 'A login form with email, password, and remember me checkbox' },
  { name: 'Form Wizard', desc: 'A multi-step form wizard with progress indicator' },
];

export default function BuilderPage() {
  const [activeTab, setActiveTab] = useState<'visual' | 'forms'>('visual');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white">Builder</h1>
            <p className="text-slate-400 mt-1">
              Create visual components and database-connected forms
            </p>
          </div>
          <div className="flex gap-2 items-center">
            <PageModelSelector
              pageId="builder"
              label="AI Model"
              showHealth={true}
              className="w-64"
            />
            <Link
              href="/"
              className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600"
            >
              ← Home
            </Link>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('visual')}
            className={`px-6 py-3 rounded-lg font-medium transition-colors ${
              activeTab === 'visual'
                ? 'bg-purple-600 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            🎨 Visual Builder
          </button>
          <button
            onClick={() => setActiveTab('forms')}
            className={`px-6 py-3 rounded-lg font-medium transition-colors ${
              activeTab === 'forms'
                ? 'bg-purple-600 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            📋 Database Forms
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'visual' ? <VisualBuilder /> : <FormBuilder />}
      </div>
    </div>
  );
}

// ============ VISUAL BUILDER COMPONENT ============
function VisualBuilder() {
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

  useEffect(() => {
    fetchTables();
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
        body = {
          action: bindToTable && selectedTable ? 'generateWithData' : 'generateWithAI',
          description: prompt,
          tableName: bindToTable ? selectedTable : undefined,
          model: 'glm-4.7-flash',
        };
      } else {
        body = {
          action: 'generateAndRender',
          description: prompt,
        };
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
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
          tableName: selectedTable,
        }),
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

  const handleTemplate = (template: (typeof templates)[0]) => {
    setDescription(template.desc);
    generateCanvas(template.desc);
  };

  const toggleFullscreen = () => {
    if (!isFullscreen) {
      if (canvasContainerRef.current?.requestFullscreen) {
        canvasContainerRef.current
          .requestFullscreen()
          .then(() => setIsFullscreen(true))
          .catch(() => {});
      }
    } else {
      if (document.exitFullscreen) {
        document
          .exitFullscreen()
          .then(() => setIsFullscreen(false))
          .catch(() => {});
      }
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Controls */}
      <div className="space-y-4">
        {/* AI Toggle */}
        <div className="bg-slate-800/50 backdrop-blur rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-white font-medium">AI Contextualization</h3>
              <p className="text-slate-400 text-sm">
                LLM generates custom HTML based on your description
              </p>
            </div>
            <button
              onClick={() => setUseAI(!useAI)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                useAI ? 'bg-purple-600' : 'bg-slate-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  useAI ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
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
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  bindToTable ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
          {bindToTable && (
            <>
              <select
                value={selectedTable}
                onChange={e => setSelectedTable(e.target.value)}
                className="w-full bg-slate-900 text-white p-2 rounded border border-slate-700"
              >
                <option value="">Select a table...</option>
                {tables.map((t, index) => (
                  <option key={t.name || `table-${index}`} value={t.name}>
                    {t.name}
                  </option>
                ))}
              </select>
              {selectedTable && (
                <button
                  onClick={generateForm}
                  disabled={loading}
                  className="mt-3 w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Generating...' : 'Generate Form from Table'}
                </button>
              )}
            </>
          )}
        </div>

        {/* Description Input */}
        <div className="bg-slate-800/50 backdrop-blur rounded-xl p-4">
          <h2 className="text-lg font-semibold text-white mb-3">Describe Your UI</h2>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
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
          <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
            {templates.map(t => (
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
      </div>

      {/* Preview */}
      <div className="space-y-4">
        {/* Preview Controls */}
        <div className="bg-slate-800/50 backdrop-blur rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-white">Preview</h2>
            <div className="flex gap-2">
              {(['desktop', 'tablet', 'mobile'] as const).map(device => (
                <button
                  key={device}
                  onClick={() => setPreviewDevice(device)}
                  className={`px-3 py-1 rounded text-sm ${
                    previewDevice === device
                      ? 'bg-purple-600 text-white'
                      : 'bg-slate-700 text-slate-300'
                  }`}
                >
                  {device}
                </button>
              ))}
              <button
                onClick={toggleFullscreen}
                className="px-3 py-1 bg-slate-700 text-slate-300 rounded text-sm hover:bg-slate-600"
              >
                ⛶ Fullscreen
              </button>
              <button
                onClick={() => setShowRawHtml(!showRawHtml)}
                className={`px-3 py-1 rounded text-sm ${
                  showRawHtml ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300'
                }`}
              >
                {showRawHtml ? 'Show Rendered' : 'Show HTML'}
              </button>
            </div>
          </div>
        </div>

        {/* Preview Area */}
        <div
          ref={canvasContainerRef}
          className={`bg-white rounded-xl overflow-hidden ${
            previewDevice === 'mobile'
              ? 'max-w-sm mx-auto'
              : previewDevice === 'tablet'
                ? 'max-w-2xl mx-auto'
                : ''
          }`}
          style={{ minHeight: '500px' }}
        >
          {showRawHtml ? (
            <pre className="text-sm text-slate-800 p-4 whitespace-pre-wrap overflow-auto max-h-[600px]">
              {html || 'No HTML generated yet'}
            </pre>
          ) : (
            <div
              className="prose max-w-none p-4"
              dangerouslySetInnerHTML={{
                __html: html || '<p class="text-slate-400">Generate a component to see preview</p>',
              }}
            />
          )}
        </div>

        {/* Copy HTML */}
        {html && (
          <div className="bg-slate-800/50 backdrop-blur rounded-xl p-4">
            <button
              onClick={() => navigator.clipboard.writeText(html)}
              className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              📋 Copy HTML to Clipboard
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ============ FORM BUILDER COMPONENT ============
function FormBuilder() {
  const [tables, setTables] = useState<TableSchema[]>([]);
  const [forms, setForms] = useState<FormData[]>([]);
  const [selectedTable, setSelectedTable] = useState<string>('');
  const [formName, setFormName] = useState('');
  const [fields, setFields] = useState<FormField[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'list' | 'create' | 'fill'>('list');
  const [activeForm, setActiveForm] = useState<FormData | null>(null);
  const [formValues, setFormValues] = useState<Record<string, any>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const tablesRes = await fetch('/api/database/tables');
      const tablesData = await tablesRes.json();
      if (tablesData.success) {
        setTables(tablesData.tables || []);
      }

      const formsRes = await fetch('/api/database/forms');
      const formsData = await formsRes.json();
      if (formsData.success) {
        setForms(formsData.forms || []);
      }
    } catch (e) {
      console.error('Failed to load data:', e);
    }
    setLoading(false);
  };

  const loadTableSchema = async (tableName: string) => {
    try {
      const res = await fetch(`/api/database/tables/${tableName}/schema`);
      const data = await res.json();
      if (data.success && data.columns) {
        const autoFields: FormField[] = data.columns.map((col: ColumnInfo) => ({
          name: col.name,
          label: col.name.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()),
          type: getTypeFromSql(col.type),
          required: col.notNull && !col.primaryKey,
          placeholder: `Enter ${col.name.replace(/_/g, ' ')}`,
        }));
        setFields(autoFields);
        setSelectedTable(tableName);
        setFormName(`${tableName.charAt(0).toUpperCase() + tableName.slice(1)} Form`);
      }
    } catch (e) {
      console.error('Failed to load schema:', e);
    }
  };

  const getTypeFromSql = (sqlType: string): FormField['type'] => {
    const type = sqlType.toUpperCase();
    if (type.includes('INT') || type.includes('NUM') || type.includes('REAL')) return 'number';
    if (type.includes('DATE') || type.includes('TIME')) return 'date';
    if (type.includes('TEXT') || type.includes('VARCHAR')) return 'text';
    if (type.includes('BOOL')) return 'checkbox';
    return 'text';
  };

  const saveForm = async () => {
    if (!formName || !selectedTable || fields.length === 0) {
      alert('Please select a table and configure fields');
      return;
    }

    try {
      const res = await fetch('/api/database/forms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save',
          form: {
            id: Date.now().toString(),
            name: formName,
            tableName: selectedTable,
            fields,
            createdAt: Date.now(),
          },
        }),
      });
      const data = await res.json();
      if (data.success) {
        loadData();
        setView('list');
        setFormName('');
        setSelectedTable('');
        setFields([]);
      }
    } catch (e) {
      console.error('Failed to save form:', e);
    }
  };

  const deleteForm = async (formId: string) => {
    if (!confirm('Delete this form?')) return;
    try {
      await fetch('/api/database/forms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', formId }),
      });
      loadData();
    } catch (e) {
      console.error('Failed to delete form:', e);
    }
  };

  const submitForm = async () => {
    if (!activeForm) return;
    setSubmitting(true);
    setResult(null);

    try {
      const res = await fetch('/api/database/insert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          table: activeForm.tableName,
          data: formValues,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setResult(`✅ Record inserted successfully! ID: ${data.id || 'N/A'}`);
        setFormValues({});
      } else {
        setResult(`❌ Error: ${data.error}`);
      }
    } catch (e) {
      setResult(`❌ Error: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
    setSubmitting(false);
  };

  const updateField = (index: number, updates: Partial<FormField>) => {
    const newFields = [...fields];
    newFields[index] = { ...newFields[index], ...updates };
    setFields(newFields);
  };

  const addField = () => {
    setFields([...fields, { name: '', label: '', type: 'text', required: false }]);
  };

  const removeField = (index: number) => {
    setFields(fields.filter((_, i) => i !== index));
  };

  if (loading) {
    return <div className="text-white text-center py-8">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {/* View Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setView('list')}
          className={`px-4 py-2 rounded-lg ${view === 'list' ? 'bg-purple-600 text-white' : 'bg-slate-700 text-slate-300'}`}
        >
          Form List
        </button>
        <button
          onClick={() => setView('create')}
          className={`px-4 py-2 rounded-lg ${view === 'create' ? 'bg-purple-600 text-white' : 'bg-slate-700 text-slate-300'}`}
        >
          Create Form
        </button>
      </div>

      {/* List View */}
      {view === 'list' && (
        <div className="grid md:grid-cols-2 gap-6">
          {/* Saved Forms */}
          <div className="bg-slate-800/50 backdrop-blur rounded-xl p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Saved Forms ({forms.length})</h2>
            {forms.length === 0 ? (
              <div className="text-slate-400 text-center py-8">
                <p>No forms created yet.</p>
                <button
                  onClick={() => setView('create')}
                  className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg"
                >
                  Create Your First Form
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {forms.map(form => (
                  <div key={form.id} className="bg-slate-700/50 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-medium text-white">{form.name}</h3>
                      <span className="text-xs px-2 py-0.5 bg-slate-600 rounded text-slate-300">
                        {form.tableName}
                      </span>
                    </div>
                    <p className="text-sm text-slate-400 mb-3">{form.fields.length} fields</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setActiveForm(form);
                          setView('fill');
                          setFormValues({});
                        }}
                        className="px-3 py-1 bg-green-600 text-white rounded text-sm"
                      >
                        Fill Form
                      </button>
                      <button
                        onClick={() => {
                          setActiveForm(form);
                          setView('create');
                          setFormName(form.name);
                          setSelectedTable(form.tableName);
                          setFields(form.fields);
                        }}
                        className="px-3 py-1 bg-slate-600 text-white rounded text-sm"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteForm(form.id)}
                        className="px-3 py-1 bg-red-600 text-white rounded text-sm"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Database Tables */}
          <div className="bg-slate-800/50 backdrop-blur rounded-xl p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Database Tables</h2>
            <div className="space-y-2">
              {tables.map(table => (
                <button
                  key={table.name}
                  onClick={() => {
                    setView('create');
                    loadTableSchema(table.name);
                  }}
                  className="w-full bg-slate-700/50 rounded-lg p-4 text-left hover:bg-slate-700 transition-colors"
                >
                  <div className="font-medium text-white">{table.name}</div>
                  <div className="text-sm text-slate-400">{table.columns?.length || 0} columns</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Create View */}
      {view === 'create' && (
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-slate-800/50 backdrop-blur rounded-xl p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Configure Form</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-slate-300 mb-1">Form Name</label>
                <input
                  type="text"
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  className="w-full bg-slate-900 text-white p-2 rounded border border-slate-700"
                  placeholder="My Form"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Table</label>
                <select
                  value={selectedTable}
                  onChange={e => loadTableSchema(e.target.value)}
                  className="w-full bg-slate-900 text-white p-2 rounded border border-slate-700"
                >
                  <option value="">Select a table...</option>
                  {tables.map(t => (
                    <option key={t.name} value={t.name}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              <h3 className="text-white font-medium pt-4">Fields</h3>
              {fields.map((field, index) => (
                <div key={index} className="bg-slate-700/50 rounded-lg p-3 space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={field.name}
                      onChange={e => updateField(index, { name: e.target.value })}
                      className="flex-1 bg-slate-900 text-white p-2 rounded border border-slate-700"
                      placeholder="Field name"
                    />
                    <select
                      value={field.type}
                      onChange={e =>
                        updateField(index, { type: e.target.value as FormField['type'] })
                      }
                      className="bg-slate-900 text-white p-2 rounded border border-slate-700"
                    >
                      <option value="text">Text</option>
                      <option value="number">Number</option>
                      <option value="email">Email</option>
                      <option value="date">Date</option>
                      <option value="textarea">Textarea</option>
                      <option value="select">Select</option>
                      <option value="checkbox">Checkbox</option>
                    </select>
                    <button
                      onClick={() => removeField(index)}
                      className="px-2 bg-red-600 text-white rounded"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={field.label || ''}
                      onChange={e => updateField(index, { label: e.target.value })}
                      className="flex-1 bg-slate-900 text-white p-2 rounded border border-slate-700"
                      placeholder="Label"
                    />
                    <label className="flex items-center gap-1 text-slate-300">
                      <input
                        type="checkbox"
                        checked={field.required}
                        onChange={e => updateField(index, { required: e.target.checked })}
                      />
                      Required
                    </label>
                  </div>
                </div>
              ))}

              <button
                onClick={addField}
                className="w-full px-4 py-2 bg-slate-700 text-white rounded hover:bg-slate-600"
              >
                + Add Field
              </button>

              <button
                onClick={saveForm}
                className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
              >
                Save Form
              </button>
            </div>
          </div>

          {/* Preview */}
          <div className="bg-slate-800/50 backdrop-blur rounded-xl p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Preview</h2>
            <div className="bg-white rounded-lg p-6">
              {fields.length === 0 ? (
                <p className="text-slate-500 text-center">Select a table to preview form</p>
              ) : (
                <form className="space-y-4">
                  {fields.map((field, index) => (
                    <div key={index}>
                      <label className="block text-slate-700 mb-1">
                        {field.label || field.name}
                        {field.required && <span className="text-red-500"> *</span>}
                      </label>
                      {field.type === 'textarea' ? (
                        <textarea
                          className="w-full border rounded p-2"
                          placeholder={field.placeholder}
                        />
                      ) : field.type === 'select' ? (
                        <select className="w-full border rounded p-2">
                          <option>Select...</option>
                        </select>
                      ) : field.type === 'checkbox' ? (
                        <input type="checkbox" className="w-4 h-4" />
                      ) : (
                        <input
                          type={field.type}
                          className="w-full border rounded p-2"
                          placeholder={field.placeholder}
                        />
                      )}
                    </div>
                  ))}
                  <button type="button" className="w-full px-4 py-2 bg-blue-600 text-white rounded">
                    Submit
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Fill View */}
      {view === 'fill' && activeForm && (
        <div className="max-w-xl mx-auto">
          <div className="bg-slate-800/50 backdrop-blur rounded-xl p-6">
            <h2 className="text-xl font-semibold text-white mb-4">{activeForm.name}</h2>
            <p className="text-slate-400 text-sm mb-4">Table: {activeForm.tableName}</p>

            <form
              onSubmit={e => {
                e.preventDefault();
                submitForm();
              }}
              className="space-y-4"
            >
              {activeForm.fields.map((field, index) => (
                <div key={index}>
                  <label className="block text-slate-300 mb-1">
                    {field.label}
                    {field.required && <span className="text-red-400"> *</span>}
                  </label>
                  {field.type === 'textarea' ? (
                    <textarea
                      className="w-full bg-slate-900 text-white p-2 rounded border border-slate-700"
                      placeholder={field.placeholder}
                      value={formValues[field.name] || ''}
                      onChange={e => setFormValues({ ...formValues, [field.name]: e.target.value })}
                    />
                  ) : field.type === 'select' ? (
                    <select
                      className="w-full bg-slate-900 text-white p-2 rounded border border-slate-700"
                      value={formValues[field.name] || ''}
                      onChange={e => setFormValues({ ...formValues, [field.name]: e.target.value })}
                    >
                      <option value="">Select...</option>
                      {field.options?.map(opt => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  ) : field.type === 'checkbox' ? (
                    <input
                      type="checkbox"
                      className="w-4 h-4"
                      checked={formValues[field.name] || false}
                      onChange={e =>
                        setFormValues({ ...formValues, [field.name]: e.target.checked })
                      }
                    />
                  ) : (
                    <input
                      type={field.type}
                      className="w-full bg-slate-900 text-white p-2 rounded border border-slate-700"
                      placeholder={field.placeholder}
                      value={formValues[field.name] || ''}
                      onChange={e => setFormValues({ ...formValues, [field.name]: e.target.value })}
                    />
                  )}
                </div>
              ))}

              {result && (
                <div
                  className={`p-3 rounded ${result.startsWith('✅') ? 'bg-green-900/50 text-green-200' : 'bg-red-900/50 text-red-200'}`}
                >
                  {result}
                </div>
              )}

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  {submitting ? 'Submitting...' : 'Submit'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setView('list');
                    setResult(null);
                  }}
                  className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600"
                >
                  Back
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
