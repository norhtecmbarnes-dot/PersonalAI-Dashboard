'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

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

export default function DatabaseFormBuilder() {
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
      // Load tables
      const tablesRes = await fetch('/api/database/tables');
      const tablesData = await tablesRes.json();
      if (tablesData.success) {
        setTables(tablesData.tables || []);
      }

      // Load saved forms
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
        // Auto-generate fields from columns
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
    setFields([...fields, {
      name: '',
      label: '',
      type: 'text',
      required: false,
    }]);
  };

  const removeField = (index: number) => {
    setFields(fields.filter((_, i) => i !== index));
  };

  const generateCanvasCode = () => {
    if (!activeForm) return '';
    
    const canvasFields = activeForm.fields.map(f => {
      switch (f.type) {
        case 'textarea':
          return `{ type: 'textarea', name: '${f.name}', label: '${f.label}', placeholder: '${f.placeholder || ''}' }`;
        case 'select':
          return `{ type: 'select', name: '${f.name}', label: '${f.label}', options: ${(f.options || []).map(o => `'${o}'`).join(', ')} }`;
        case 'checkbox':
          return `{ type: 'checkbox', name: '${f.name}', label: '${f.label}' }`;
        default:
          return `{ type: '${f.type}', name: '${f.name}', label: '${f.label}', placeholder: '${f.placeholder || ''}' }`;
      }
    }).join(',\n      ');

    return `// Canvas Form for ${activeForm.tableName}
{
  type: 'form',
  title: '${activeForm.name}',
  props: {
    action: '/api/database/insert',
    method: 'POST',
    fields: [
      ${canvasFields}
    ],
    submitText: 'Submit',
  }
}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white">Database Form Builder</h1>
            <p className="text-slate-400 mt-1">Create forms connected to SQLite tables</p>
          </div>
          <div className="flex gap-2">
            <Link href="/canvas" className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600">
              Canvas UI
            </Link>
            <Link href="/" className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600">
              ← Home
            </Link>
          </div>
        </div>

        {/* View Tabs */}
        <div className="flex gap-2 mb-6">
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
          <div className="space-y-4">
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
                <div className="grid md:grid-cols-2 gap-4">
                  {forms.map(form => (
                    <div key={form.id} className="bg-slate-700/50 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-medium text-white">{form.name}</h3>
                        <span className="text-xs px-2 py-0.5 bg-slate-600 rounded text-slate-300">
                          {form.tableName}
                        </span>
                      </div>
                      <p className="text-sm text-slate-400 mb-3">
                        {form.fields.length} fields
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => { setActiveForm(form); setView('fill'); setFormValues({}); }}
                          className="px-3 py-1 bg-green-600 text-white rounded text-sm"
                        >
                          Fill Form
                        </button>
                        <button
                          onClick={() => { setActiveForm(form); setView('create'); setFormName(form.name); setSelectedTable(form.tableName); setFields(form.fields); }}
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
              <div className="grid md:grid-cols-3 gap-3">
                {tables.map(table => (
                  <button
                    key={table.name}
                    onClick={() => { setView('create'); loadTableSchema(table.name); }}
                    className="bg-slate-700/50 rounded-lg p-4 text-left hover:bg-slate-700 transition-colors"
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
          <div className="grid lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              {/* Table Selection */}
              <div className="bg-slate-800/50 backdrop-blur rounded-xl p-6">
                <h2 className="text-lg font-semibold text-white mb-4">
                  {activeForm ? 'Edit Form' : 'Create New Form'}
                </h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-slate-300 mb-2">Form Name</label>
                    <input
                      type="text"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      placeholder="e.g., Add Contact"
                      className="w-full bg-slate-900 text-white px-4 py-2 rounded-lg border border-slate-700 focus:border-purple-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 mb-2">Database Table</label>
                    <select
                      value={selectedTable}
                      onChange={(e) => loadTableSchema(e.target.value)}
                      className="w-full bg-slate-900 text-white px-4 py-2 rounded-lg border border-slate-700 focus:border-purple-500 focus:outline-none"
                    >
                      <option value="">Select a table...</option>
                      {tables.map(t => (
                        <option key={t.name} value={t.name}>{t.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Field Configuration */}
              <div className="bg-slate-800/50 backdrop-blur rounded-xl p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-semibold text-white">Form Fields</h2>
                  <button
                    onClick={addField}
                    className="px-3 py-1 bg-purple-600 text-white rounded text-sm"
                  >
                    + Add Field
                  </button>
                </div>
                <div className="space-y-3">
                  {fields.map((field, index) => (
                    <div key={index} className="bg-slate-700/50 rounded-lg p-3">
                      <div className="grid grid-cols-2 gap-2 mb-2">
                        <input
                          type="text"
                          value={field.name}
                          onChange={(e) => updateField(index, { name: e.target.value })}
                          placeholder="Field name (DB column)"
                          className="bg-slate-900 text-white px-3 py-1 rounded text-sm border border-slate-600 focus:border-purple-500 focus:outline-none"
                        />
                        <input
                          type="text"
                          value={field.label}
                          onChange={(e) => updateField(index, { label: e.target.value })}
                          placeholder="Label"
                          className="bg-slate-900 text-white px-3 py-1 rounded text-sm border border-slate-600 focus:border-purple-500 focus:outline-none"
                        />
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <select
                          value={field.type}
                          onChange={(e) => updateField(index, { type: e.target.value as FormField['type'] })}
                          className="bg-slate-900 text-white px-3 py-1 rounded text-sm border border-slate-600"
                        >
                          <option value="text">Text</option>
                          <option value="number">Number</option>
                          <option value="email">Email</option>
                          <option value="date">Date</option>
                          <option value="textarea">Textarea</option>
                          <option value="select">Select</option>
                          <option value="checkbox">Checkbox</option>
                        </select>
                        <input
                          type="text"
                          value={field.placeholder || ''}
                          onChange={(e) => updateField(index, { placeholder: e.target.value })}
                          placeholder="Placeholder"
                          className="bg-slate-900 text-white px-3 py-1 rounded text-sm border border-slate-600"
                        />
                        <div className="flex items-center gap-2">
                          <label className="text-slate-400 text-sm">
                            <input
                              type="checkbox"
                              checked={field.required}
                              onChange={(e) => updateField(index, { required: e.target.checked })}
                              className="mr-1"
                            />
                            Required
                          </label>
                          <button
                            onClick={() => removeField(index)}
                            className="text-red-400 text-sm ml-auto"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                      {field.type === 'select' && (
                        <input
                          type="text"
                          value={field.options?.join(', ') || ''}
                          onChange={(e) => updateField(index, { options: e.target.value.split(',').map(s => s.trim()) })}
                          placeholder="Options (comma separated)"
                          className="w-full mt-2 bg-slate-900 text-white px-3 py-1 rounded text-sm border border-slate-600"
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={saveForm}
                  disabled={!formName || !selectedTable || fields.length === 0}
                  className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  Save Form
                </button>
                <button
                  onClick={() => { setView('list'); setActiveForm(null); setFormName(''); setSelectedTable(''); setFields([]); }}
                  className="px-6 py-3 bg-slate-700 text-white rounded-lg hover:bg-slate-600"
                >
                  Cancel
                </button>
              </div>
            </div>

            {/* Preview */}
            <div className="bg-slate-800/50 backdrop-blur rounded-xl p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Preview</h2>
              <div className="bg-slate-700/50 rounded-lg p-4">
                {formName && <h3 className="text-xl font-medium text-white mb-4">{formName}</h3>}
                {fields.length === 0 ? (
                  <p className="text-slate-400 text-center py-8">No fields configured</p>
                ) : (
                  <div className="space-y-4">
                    {fields.map((field, index) => (
                      <div key={index}>
                        <label className="block text-slate-300 mb-1">
                          {field.label || field.name}
                          {field.required && <span className="text-red-400 ml-1">*</span>}
                        </label>
                        {field.type === 'textarea' ? (
                          <textarea
                            disabled
                            placeholder={field.placeholder}
                            className="w-full bg-slate-900 text-slate-400 px-3 py-2 rounded border border-slate-600"
                            rows={3}
                          />
                        ) : field.type === 'select' ? (
                          <select disabled className="w-full bg-slate-900 text-slate-400 px-3 py-2 rounded border border-slate-600">
                            <option>Select...</option>
                            {field.options?.map(opt => <option key={opt}>{opt}</option>)}
                          </select>
                        ) : field.type === 'checkbox' ? (
                          <input type="checkbox" disabled className="w-5 h-5" />
                        ) : (
                          <input
                            type={field.type}
                            disabled
                            placeholder={field.placeholder}
                            className="w-full bg-slate-900 text-slate-400 px-3 py-2 rounded border border-slate-600"
                          />
                        )}
                      </div>
                    ))}
                    <button disabled className="w-full px-4 py-2 bg-purple-600 text-white rounded opacity-50">
                      Submit
                    </button>
                  </div>
                )}
              </div>

              {/* Canvas Code */}
              {fields.length > 0 && (
                <div className="mt-4">
                  <h3 className="text-sm font-medium text-slate-400 mb-2">Canvas Code</h3>
                  <pre className="bg-slate-900 p-3 rounded text-xs text-green-400 overflow-x-auto">
                    {`// Use this in Canvas page\n${generateCanvasCode()}`}
                  </pre>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Fill Form View */}
        {view === 'fill' && activeForm && (
          <div className="max-w-xl mx-auto">
            <div className="bg-slate-800/50 backdrop-blur rounded-xl p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-white">{activeForm.name}</h2>
                <button
                  onClick={() => { setView('list'); setActiveForm(null); setResult(null); }}
                  className="text-slate-400 hover:text-white"
                >
                  ← Back
                </button>
              </div>
              <p className="text-sm text-slate-400 mb-4">
                Table: <span className="text-white">{activeForm.tableName}</span>
              </p>

              <div className="space-y-4">
                {activeForm.fields.map((field, index) => (
                  <div key={index}>
                    <label className="block text-slate-300 mb-1">
                      {field.label}
                      {field.required && <span className="text-red-400 ml-1">*</span>}
                    </label>
                    {field.type === 'textarea' ? (
                      <textarea
                        value={formValues[field.name] || ''}
                        onChange={(e) => setFormValues({ ...formValues, [field.name]: e.target.value })}
                        placeholder={field.placeholder}
                        className="w-full bg-slate-900 text-white px-3 py-2 rounded border border-slate-600 focus:border-purple-500 focus:outline-none"
                        rows={3}
                      />
                    ) : field.type === 'select' ? (
                      <select
                        value={formValues[field.name] || ''}
                        onChange={(e) => setFormValues({ ...formValues, [field.name]: e.target.value })}
                        className="w-full bg-slate-900 text-white px-3 py-2 rounded border border-slate-600 focus:border-purple-500 focus:outline-none"
                      >
                        <option value="">Select...</option>
                        {field.options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                      </select>
                    ) : field.type === 'checkbox' ? (
                      <input
                        type="checkbox"
                        checked={formValues[field.name] || false}
                        onChange={(e) => setFormValues({ ...formValues, [field.name]: e.target.checked })}
                        className="w-5 h-5"
                      />
                    ) : (
                      <input
                        type={field.type}
                        value={formValues[field.name] || ''}
                        onChange={(e) => setFormValues({ ...formValues, [field.name]: e.target.value })}
                        placeholder={field.placeholder}
                        className="w-full bg-slate-900 text-white px-3 py-2 rounded border border-slate-600 focus:border-purple-500 focus:outline-none"
                      />
                    )}
                  </div>
                ))}

                <button
                  onClick={submitForm}
                  disabled={submitting}
                  className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium"
                >
                  {submitting ? 'Submitting...' : 'Submit'}
                </button>

                {result && (
                  <div className={`p-3 rounded ${result.startsWith('✅') ? 'bg-green-900/30 border border-green-700 text-green-300' : 'bg-red-900/30 border border-red-700 text-red-300'}`}>
                    {result}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Info Section */}
        <div className="mt-8 bg-slate-800/30 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-3">How It Works</h3>
          <div className="grid md:grid-cols-3 gap-4 text-slate-400 text-sm">
            <div>
              <h4 className="text-purple-400 font-medium mb-2">1. Select Table</h4>
              <p>Choose a SQLite table from your database. Fields are auto-generated from columns.</p>
            </div>
            <div>
              <h4 className="text-purple-400 font-medium mb-2">2. Configure Form</h4>
              <p>Customize field labels, types, and validation. Add or remove fields as needed.</p>
            </div>
            <div>
              <h4 className="text-purple-400 font-medium mb-2">3. Submit Data</h4>
              <p>Fill out the form and submit. Data is inserted directly into the SQLite table.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}