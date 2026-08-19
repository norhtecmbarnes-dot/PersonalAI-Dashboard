'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useGlobalModel } from '@/lib/context/ModelContext';

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
    name: 'Cover Page',
    desc: 'A professional proposal cover page with the solicitation number, agency name, proposal title, due date, and company name.',
  },
  {
    name: 'Executive Summary',
    desc: 'An executive summary that states our understanding of the requirement, our three win themes, and why [COMPANY NAME] is the right choice for this award.',
  },
  {
    name: 'Introduction & Understanding',
    desc: 'An introduction section that demonstrates our understanding of the agency mission, the problem being solved, and the requirement.',
  },
  {
    name: 'Technical Approach',
    desc: 'A technical approach section describing how [COMPANY NAME] will perform the work, keyed to the statement of work with numbered subsections.',
  },
  {
    name: 'Management Plan',
    desc: 'A management plan covering project organization, roles and responsibilities, reporting structure, and quality assurance.',
  },
  {
    name: 'Past Performance',
    desc: 'A past performance section with three relevant contracts, outcomes achieved, and lessons learned, with [GAP] placeholders for reference details.',
  },
  {
    name: 'Staffing & Key Personnel',
    desc: 'A staffing plan with key personnel roles, required qualifications, labor categories, and a staffing table with levels of effort.',
  },
  {
    name: 'Win Themes',
    desc: 'A win themes section that turns our discriminators into persuasive, evidence-backed themes tied to the agency needs.',
  },
  {
    name: 'Compliance Matrix',
    desc: 'A compliance matrix table mapping every solicitation requirement to the section where it is addressed, with a Complies status column.',
  },
  {
    name: 'Work Plan / Schedule',
    desc: 'A work plan with phases, milestones, and a schedule table showing task, owner, start, and duration.',
  },
  {
    name: 'Risk Management',
    desc: 'A risk management section identifying the top program risks with likelihood, impact, and mitigation strategy.',
  },
  {
    name: 'Cost / Price Summary',
    desc: 'A cost or price summary narrative with a pricing table and assumptions, noting [GAP] where actual figures are needed.',
  },
  {
    name: 'Quad Chart',
    desc: 'A one-page quad chart with Technical, Management, Past Performance, and Price quadrants formatted for a briefing.',
  },
  {
    name: 'Quality Assurance',
    desc: 'A quality assurance surveillance plan describing how we will measure, track, and report performance against the contract.',
  },
];

export default function BuilderPage() {
  const [activeTab, setActiveTab] = useState<'sections' | 'forms'>('sections');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white">Proposal Builder</h1>
            <p className="text-slate-400 mt-1">
              Generate submission-ready proposal sections with AI, then copy or download them as markdown
            </p>
          </div>
          <div className="flex gap-2 items-center">
            <Link
              href="/bid-workflow"
              className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600"
            >
              📋 Bid Workflow
            </Link>
            <Link
              href="/writing-studio"
              className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600"
            >
              ✍️ Writing Studio
            </Link>
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
            onClick={() => setActiveTab('sections')}
            className={`px-6 py-3 rounded-lg font-medium transition-colors ${
              activeTab === 'sections'
                ? 'bg-purple-600 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            📄 Proposal Sections
          </button>
          <button
            onClick={() => setActiveTab('forms')}
            className={`px-6 py-3 rounded-lg font-medium transition-colors ${
              activeTab === 'forms'
                ? 'bg-purple-600 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            🗄️ Data Forms
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'sections' ? <ProposalSectionBuilder /> : <FormBuilder />}
      </div>
    </div>
  );
}

// ============ PROPOSAL SECTION BUILDER COMPONENT ============
function ProposalSectionBuilder() {
  const { selectedModel } = useGlobalModel();
  const [description, setDescription] = useState('');
  const [markdown, setMarkdown] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [showRawMarkdown, setShowRawMarkdown] = useState(false);

  useEffect(() => {
    generateSection(templates[1].desc);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const generateSection = async (desc?: string) => {
    const prompt = desc || description;
    if (!prompt.trim()) return;

    setLoading(true);
    try {
      const res = await fetch('/api/canvas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generateProposal',
          description: prompt,
          model: selectedModel || 'ollama/ornith:latest',
        }),
      });
      const data = await res.json();
      if (data.success) {
        setMarkdown(data.markdown || '');
      } else {
        console.error('Proposal section error:', data.error);
        alert('Error: ' + data.error);
      }
    } catch (e) {
      console.error('Failed to generate section:', e);
      alert('Failed to generate. Check console for details.');
    }
    setLoading(false);
  };

  const handleTemplate = (template: (typeof templates)[number]) => {
    setDescription(template.desc);
    generateSection(template.desc);
  };

  const wordCount = markdown.trim() ? markdown.trim().split(/\s+/).length : 0;

  const copyMarkdown = () => {
    navigator.clipboard.writeText(markdown);
  };

  const downloadMarkdown = () => {
    const base =
      (description || 'proposal-section')
        .split('\n')[0]
        .replace(/[^\w\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-')
        .toLowerCase()
        .slice(0, 40) || 'proposal-section';
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${base}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Controls */}
      <div className="space-y-4">
        {/* Model Note */}
        <div className="bg-slate-800/50 backdrop-blur rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-white font-medium">AI Section Generation</h3>
              <p className="text-slate-400 text-sm">
                Written by Proposal Genie in your voice, using the model selected in the top bar
              </p>
            </div>
            <span className="text-xs px-2 py-1 bg-purple-900/50 text-purple-300 rounded">
              {selectedModel ? selectedModel.split('/').pop() : 'Model'}
            </span>
          </div>
        </div>

        {/* Description Input */}
        <div className="bg-slate-800/50 backdrop-blur rounded-xl p-4">
          <h2 className="text-lg font-semibold text-white mb-3">Describe Your Section</h2>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            className="w-full h-32 bg-slate-900 text-slate-200 p-3 rounded-lg border border-slate-700 focus:border-purple-500 focus:outline-none resize-none"
            placeholder="Describe the proposal section you want to write...&#10;&#10;Examples:&#10;- An executive summary for an RFP from the VA&#10;- A technical approach for an OTA prototype&#10;- A compliance matrix for an SBIR Phase II&#10;- A past performance section with three contracts"
          />
          <button
            onClick={() => generateSection()}
            disabled={loading || !description.trim()}
            className="mt-3 w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Generating...' : 'Generate Section'}
          </button>
        </div>

        {/* Templates */}
        <div className="bg-slate-800/50 backdrop-blur rounded-xl p-4">
          <h2 className="text-lg font-semibold text-white mb-3">Proposal Section Templates</h2>
          <div className="grid grid-cols-2 gap-2 max-h-72 overflow-y-auto">
            {templates.map(t => (
              <button
                key={t.name}
                onClick={() => handleTemplate(t)}
                disabled={loading}
                className="px-3 py-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 text-left text-sm disabled:opacity-50"
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
              <button
                onClick={() => setShowRawMarkdown(!showRawMarkdown)}
                className={`px-3 py-1 rounded text-sm ${
                  showRawMarkdown ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300'
                }`}
              >
                {showRawMarkdown ? 'Show Rendered' : 'Show Markdown'}
              </button>
              <button
                onClick={copyMarkdown}
                disabled={!markdown}
                className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 disabled:opacity-50"
              >
                📋 Copy
              </button>
              <button
                onClick={downloadMarkdown}
                disabled={!markdown}
                className="px-3 py-1 bg-slate-700 text-slate-300 rounded text-sm hover:bg-slate-600 disabled:opacity-50"
              >
                ⬇ .md
              </button>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500">
              Generated with {selectedModel ? selectedModel.split('/').pop() : 'the selected model'}
            </p>
            {wordCount > 0 && (
              <span className="text-xs text-slate-400">
                {wordCount.toLocaleString()} words
              </span>
            )}
          </div>
        </div>

        {/* Document Preview */}
        <div
          className="bg-white rounded-xl overflow-hidden shadow-2xl"
          style={{ minHeight: '500px' }}
        >
          {showRawMarkdown ? (
            <pre className="text-sm text-slate-800 p-6 whitespace-pre-wrap overflow-auto max-h-[640px] font-mono">
              {markdown || 'Generate a section to see the markdown'}
            </pre>
          ) : (
            <div className="p-8 max-h-[640px] overflow-y-auto">
              {markdown ? (
                <div className="prose prose-sm max-w-none">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown>
                </div>
              ) : (
                <div className="text-slate-400 text-center py-16">
                  Generate a section to see a rendered preview
                </div>
              )}
            </div>
          )}
        </div>

        {/* Copy Hint */}
        {markdown && (
          <div className="bg-slate-800/50 backdrop-blur rounded-xl p-4">
            <p className="text-sm text-slate-400">
              💡 Paste this markdown into the{' '}
              <Link href="/writing-studio" className="text-purple-400 hover:text-purple-300 underline">
                Writing Studio
              </Link>{' '}
              to refine it, or export it straight to Word from there.
            </p>
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
