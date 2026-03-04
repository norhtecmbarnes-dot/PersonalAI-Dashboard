'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ModelSelector } from '@/components/ModelSelector';

type SpreadsheetAction = 'analyze' | 'formula' | 'clean' | 'chart' | 'predict' | 'generate-data';
type PresentationAction = 'bullets' | 'speaker-notes' | 'outline' | 'improve' | 'summary' | 'create-from-outline';

export default function OfficeAIPage() {
  const [activeTab, setActiveTab] = useState<'spreadsheet' | 'presentation'>('spreadsheet');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<string>('');

  // Spreadsheet state
  const [spreadsheetAction, setSpreadsheetAction] = useState<SpreadsheetAction>('analyze');
  const [spreadsheetData, setSpreadsheetData] = useState('');
  const [formulaRequirement, setFormulaRequirement] = useState('');
  const [formulaColumns, setFormulaColumns] = useState('');
  const [cleanInstructions, setCleanInstructions] = useState('');
  const [chartPurpose, setChartPurpose] = useState('');
  const [predictionType, setPredictionType] = useState('next 5 periods');
  const [generatePrompt, setGeneratePrompt] = useState('');
  const [generateRows, setGenerateRows] = useState('10');

  // Presentation state
  const [presentationAction, setPresentationAction] = useState<PresentationAction>('bullets');
  const [slideContent, setSlideContent] = useState('');
  const [slideTitle, setSlideTitle] = useState('');
  const [bulletStyle, setBulletStyle] = useState('professional and concise');
  const [presentationTopic, setPresentationTopic] = useState('');
  const [audience, setAudience] = useState('general audience');
  const [duration, setDuration] = useState('15');
  const [purpose, setPurpose] = useState('inform');
  const [slidesInput, setSlidesInput] = useState('');
  const [outlineInput, setOutlineInput] = useState('');
  
  // Presentation branding state
  const [logo, setLogo] = useState<string | null>(null);
  const [colorTheme, setColorTheme] = useState<'default' | 'black-white' | 'white-black' | 'blue-white'>('default');
  const [selectedBrandId, setSelectedBrandId] = useState<string>('');
  const [brands, setBrands] = useState<Array<{id: string, name: string, logo?: string}>>([]);

  const spreadsheetActions = [
    { id: 'analyze', name: 'Analyze', icon: '📊', desc: 'Analyze data for insights and patterns' },
    { id: 'formula', name: 'Formula', icon: 'ƒx', desc: 'Generate spreadsheet formulas' },
    { id: 'clean', name: 'Clean', icon: '🧹', desc: 'Clean and standardize data' },
    { id: 'chart', name: 'Chart', icon: '📈', desc: 'Suggest best chart type' },
    { id: 'predict', name: 'Predict', icon: '🔮', desc: 'Forecast future values' },
    { id: 'generate-data', name: 'Generate', icon: '✨', desc: 'Create sample data' },
  ] as const;

  const presentationActions = [
    { id: 'bullets', name: 'Bullets', icon: '•', desc: 'Convert to bullet points' },
    { id: 'speaker-notes', name: 'Speaker Notes', icon: '🎤', desc: 'Generate speaker notes' },
    { id: 'outline', name: 'Outline', icon: '📋', desc: 'Create presentation outline' },
    { id: 'improve', name: 'Improve', icon: '✏️', desc: 'Improve slide content' },
    { id: 'summary', name: 'Summary', icon: '📝', desc: 'Summarize presentation' },
    { id: 'create-from-outline', name: 'From Outline', icon: '🏗️', desc: 'Create slides from outline' },
  ] as const;

  const handleSpreadsheetSubmit = async () => {
    setLoading(true);
    setError(null);
    setResult('');

    try {
      let data: Record<string, any> = {};

      switch (spreadsheetAction) {
        case 'analyze':
          data = { spreadsheetData };
          break;
        case 'formula':
          data = { requirement: formulaRequirement, columns: formulaColumns.split(',').map(c => c.trim()) };
          break;
        case 'clean':
          data = { spreadsheetData, instructions: cleanInstructions };
          break;
        case 'chart':
          data = { spreadsheetData, purpose: chartPurpose };
          break;
        case 'predict':
          data = { spreadsheetData, predictionType };
          break;
        case 'generate-data':
          data = { prompt: generatePrompt, rows: parseInt(generateRows) || 10 };
          break;
      }

      const response = await fetch('/api/office-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          type: 'spreadsheet', 
          action: spreadsheetAction, 
          data,
          model: selectedModel || undefined
        }),
      });

      const json = await response.json();
      if (json.success) {
        setResult(typeof json.analysis === 'string' ? json.analysis :
                  typeof json.formula === 'string' ? json.formula :
                  typeof json.cleanedData === 'string' ? json.cleanedData :
                  typeof json.chartConfig === 'object' ? JSON.stringify(json.chartConfig, null, 2) :
                  typeof json.predictions === 'string' ? json.predictions :
                  json.csv || JSON.stringify(json, null, 2));
      } else {
        setError(json.error || 'Failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }

    setLoading(false);
  };

  const handlePresentationSubmit = async () => {
    setLoading(true);
    setError(null);
    setResult('');

    try {
      let data: Record<string, any> = {};

      switch (presentationAction) {
        case 'bullets':
          data = { content: slideContent, style: bulletStyle };
          break;
        case 'speaker-notes':
          data = { title: slideTitle, content: slideContent };
          break;
        case 'outline':
          data = { topic: presentationTopic, audience, duration: parseInt(duration), purpose };
          break;
        case 'improve':
          data = { title: slideTitle, content: slideContent };
          break;
        case 'summary':
          data = { slides: slidesInput };
          break;
        case 'create-from-outline':
          data = { outline: outlineInput };
          break;
      }

      // Add styling information
      const styling = {
        template: colorTheme,
        colorScheme: colorTheme,
        logo: logo,
        brandId: selectedBrandId,
      };

      const response = await fetch('/api/office-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          type: 'presentation', 
          action: presentationAction, 
          data,
          styling,
          model: selectedModel || undefined
        }),
      });

      const json = await response.json();
      if (json.success) {
        setResult(json.bullets?.join('\n• ') || 
                  json.speakerNotes || 
                  json.outline || 
                  json.improvements || 
                  json.summary ||
                  json.slides ||
                  JSON.stringify(json, null, 2));
      } else {
        setError(json.error || 'Failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white">Office AI Tools</h1>
            <p className="text-slate-400 mt-1">AI-powered features for spreadsheets and presentations</p>
          </div>
          <div className="flex gap-2 items-center">
            <ModelSelector
              value={selectedModel}
              onChange={setSelectedModel}
              label="AI Model"
              showHealth={true}
              className="w-64"
            />
            <Link href="/office" className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600">
              Documents
            </Link>
            <Link href="/writing" className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600">
              Writing
            </Link>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('spreadsheet')}
            className={`px-6 py-3 rounded-lg font-medium transition-colors ${
              activeTab === 'spreadsheet'
                ? 'bg-green-600 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            📊 Spreadsheet AI
          </button>
          <button
            onClick={() => setActiveTab('presentation')}
            className={`px-6 py-3 rounded-lg font-medium transition-colors ${
              activeTab === 'presentation'
                ? 'bg-orange-600 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            📽️ Presentation AI
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Input Section */}
          <div className="space-y-4">
            {activeTab === 'spreadsheet' && (
              <>
                {/* Spreadsheet Actions */}
                <div className="bg-slate-800/50 backdrop-blur rounded-xl p-4">
                  <h2 className="text-lg font-semibold text-white mb-3">Select Action</h2>
                  <div className="grid grid-cols-3 gap-2">
                    {spreadsheetActions.map((a) => (
                      <button
                        key={a.id}
                        onClick={() => setSpreadsheetAction(a.id)}
                        className={`p-3 rounded-lg text-left transition-colors ${
                          spreadsheetAction === a.id
                            ? 'bg-green-600 text-white'
                            : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                        }`}
                      >
                        <span className="text-lg">{a.icon}</span>
                        <div className="font-medium mt-1">{a.name}</div>
                        <div className="text-xs opacity-75">{a.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Spreadsheet Inputs */}
                <div className="bg-slate-800/50 backdrop-blur rounded-xl p-4">
                  <h2 className="text-lg font-semibold text-white mb-3">Input</h2>

                  {(spreadsheetAction === 'analyze' || spreadsheetAction === 'clean' || 
                    spreadsheetAction === 'chart' || spreadsheetAction === 'predict') && (
                    <div className="mb-4">
                      <label className="block text-slate-300 mb-2">Spreadsheet Data (CSV)</label>
                      <textarea
                        value={spreadsheetData}
                        onChange={(e) => setSpreadsheetData(e.target.value)}
                        placeholder="Name, Sales, Region&#10;John, 5000, East&#10;Jane, 7000, West&#10;..."
                        className="w-full h-40 bg-slate-900 text-white p-3 rounded-lg border border-slate-700 focus:border-green-500 focus:outline-none font-mono text-sm"
                      />
                    </div>
                  )}

                  {spreadsheetAction === 'formula' && (
                    <>
                      <div className="mb-4">
                        <label className="block text-slate-300 mb-2">What do you want the formula to do?</label>
                        <input
                          type="text"
                          value={formulaRequirement}
                          onChange={(e) => setFormulaRequirement(e.target.value)}
                          placeholder="e.g., Calculate total sales for East region"
                          className="w-full bg-slate-900 text-white px-4 py-2 rounded-lg border border-slate-700 focus:border-green-500 focus:outline-none"
                        />
                      </div>
                      <div className="mb-4">
                        <label className="block text-slate-300 mb-2">Column Names (comma-separated)</label>
                        <input
                          type="text"
                          value={formulaColumns}
                          onChange={(e) => setFormulaColumns(e.target.value)}
                          placeholder="Name, Sales, Region, Date"
                          className="w-full bg-slate-900 text-white px-4 py-2 rounded-lg border border-slate-700 focus:border-green-500 focus:outline-none"
                        />
                      </div>
                    </>
                  )}

                  {spreadsheetAction === 'clean' && (
                    <div className="mb-4">
                      <label className="block text-slate-300 mb-2">Cleaning Instructions</label>
                      <input
                        type="text"
                        value={cleanInstructions}
                        onChange={(e) => setCleanInstructions(e.target.value)}
                        placeholder="e.g., Remove duplicates, standardize dates"
                        className="w-full bg-slate-900 text-white px-4 py-2 rounded-lg border border-slate-700 focus:border-green-500 focus:outline-none"
                      />
                    </div>
                  )}

                  {spreadsheetAction === 'chart' && (
                    <div className="mb-4">
                      <label className="block text-slate-300 mb-2">Purpose (optional)</label>
                      <input
                        type="text"
                        value={chartPurpose}
                        onChange={(e) => setChartPurpose(e.target.value)}
                        placeholder="e.g., Show sales trends over time"
                        className="w-full bg-slate-900 text-white px-4 py-2 rounded-lg border border-slate-700 focus:border-green-500 focus:outline-none"
                      />
                    </div>
                  )}

                  {spreadsheetAction === 'predict' && (
                    <div className="mb-4">
                      <label className="block text-slate-300 mb-2">Prediction Type</label>
                      <input
                        type="text"
                        value={predictionType}
                        onChange={(e) => setPredictionType(e.target.value)}
                        placeholder="e.g., next 5 periods"
                        className="w-full bg-slate-900 text-white px-4 py-2 rounded-lg border border-slate-700 focus:border-green-500 focus:outline-none"
                      />
                    </div>
                  )}

                  {spreadsheetAction === 'generate-data' && (
                    <>
                      <div className="mb-4">
                        <label className="block text-slate-300 mb-2">Describe the Data</label>
                        <input
                          type="text"
                          value={generatePrompt}
                          onChange={(e) => setGeneratePrompt(e.target.value)}
                          placeholder="e.g., Employee records with name, department, salary, hire date"
                          className="w-full bg-slate-900 text-white px-4 py-2 rounded-lg border border-slate-700 focus:border-green-500 focus:outline-none"
                        />
                      </div>
                      <div className="mb-4">
                        <label className="block text-slate-300 mb-2">Number of Rows</label>
                        <input
                          type="number"
                          value={generateRows}
                          onChange={(e) => setGenerateRows(e.target.value)}
                          placeholder="10"
                          className="w-full bg-slate-900 text-white px-4 py-2 rounded-lg border border-slate-700 focus:border-green-500 focus:outline-none"
                        />
                      </div>
                    </>
                  )}

                  <button
                    onClick={handleSpreadsheetSubmit}
                    disabled={loading}
                    className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium"
                  >
                    {loading ? 'Processing...' : spreadsheetActions.find(a => a.id === spreadsheetAction)?.name || 'Process'}
                  </button>
                </div>
              </>
            )}

            {activeTab === 'presentation' && (
              <>
                {/* Presentation Actions */}
                <div className="bg-slate-800/50 backdrop-blur rounded-xl p-4">
                  <h2 className="text-lg font-semibold text-white mb-3">Select Action</h2>
                  <div className="grid grid-cols-3 gap-2">
                    {presentationActions.map((a) => (
                      <button
                        key={a.id}
                        onClick={() => setPresentationAction(a.id)}
                        className={`p-3 rounded-lg text-left transition-colors ${
                          presentationAction === a.id
                            ? 'bg-orange-600 text-white'
                            : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                        }`}
                      >
                        <span className="text-lg">{a.icon}</span>
                        <div className="font-medium mt-1">{a.name}</div>
                        <div className="text-xs opacity-75">{a.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Presentation Styling Options */}
                <div className="bg-slate-800/50 backdrop-blur rounded-xl p-4">
                  <h2 className="text-lg font-semibold text-white mb-3">Presentation Styling</h2>
                  
                  {/* Template Selection */}
                  <div className="mb-4">
                    <label className="block text-slate-300 mb-2">Template Style</label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { id: 'corporate', name: 'Corporate', desc: 'Professional, clean, business-focused', colors: 'bg-slate-100 text-slate-900' },
                        { id: 'modern-dark', name: 'Modern Dark', desc: 'Dark background, white text, sleek', colors: 'bg-slate-900 text-white' },
                        { id: 'minimal', name: 'Minimal', desc: 'White background, simple, elegant', colors: 'bg-white text-slate-900 border border-slate-300' },
                        { id: 'creative', name: 'Creative', desc: 'Bold colors, dynamic, eye-catching', colors: 'bg-gradient-to-br from-purple-600 to-blue-600 text-white' },
                        { id: 'tech', name: 'Tech', desc: 'Blue gradients, modern, innovative', colors: 'bg-gradient-to-br from-blue-600 to-cyan-500 text-white' },
                        { id: 'elegant', name: 'Elegant', desc: 'Black background, gold accents, premium', colors: 'bg-black text-yellow-400 border border-yellow-600' },
                      ].map((template) => (
                        <button
                          key={template.id}
                          onClick={() => setColorTheme(template.id as any)}
                          className={`p-3 rounded-lg text-left transition-all ${template.colors} ${
                            colorTheme === template.id ? 'ring-2 ring-orange-500 ring-offset-2 ring-offset-slate-800' : ''
                          }`}
                        >
                          <div className="font-medium text-sm">{template.name}</div>
                          <div className="text-xs opacity-75 mt-1">{template.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Color Theme Override */}
                  <div className="mb-4">
                    <label className="block text-slate-300 mb-2">Color Scheme Override</label>
                    <select
                      value={colorTheme}
                      onChange={(e) => setColorTheme(e.target.value as any)}
                      className="w-full bg-slate-900 text-white px-4 py-2 rounded-lg border border-slate-700 focus:border-orange-500 focus:outline-none"
                    >
                      <option value="default">Use Template Colors</option>
                      <option value="black-white">Black Background / White Text</option>
                      <option value="white-black">White Background / Black Text</option>
                      <option value="blue-white">Blue Background / White Text</option>
                      <option value="dark-blue">Dark Blue Background / White Text</option>
                      <option value="green-white">Green Background / White Text</option>
                    </select>
                  </div>

                  {/* Logo Upload */}
                  <div className="mb-4">
                    <label className="block text-slate-300 mb-2">Brand Logo</label>
                    <div className="flex items-center gap-4">
                      {logo && (
                        <div className="w-16 h-16 bg-white rounded-lg flex items-center justify-center overflow-hidden">
                          <img src={logo} alt="Logo" className="max-w-full max-h-full object-contain" />
                        </div>
                      )}
                      <label className="flex-1 cursor-pointer">
                        <div className="w-full px-4 py-3 bg-slate-900 border border-slate-700 border-dashed rounded-lg hover:bg-slate-800 transition-colors text-center">
                          <span className="text-slate-400">
                            {logo ? '🖼️ Change Logo' : '📁 Upload Logo (PNG, SVG)'}
                          </span>
                        </div>
                        <input
                          type="file"
                          accept="image/png,image/svg+xml,image/jpeg"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onload = (event) => {
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
                          className="px-3 py-2 bg-red-600/20 text-red-400 rounded-lg hover:bg-red-600/30 text-sm"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                    <p className="text-slate-500 text-xs mt-1">Logo will appear on title slide and footer of each slide</p>
                  </div>

                  {/* Brand Selection */}
                  <div className="mb-4">
                    <label className="block text-slate-300 mb-2">Use Brand Profile</label>
                    <select
                      value={selectedBrandId}
                      onChange={(e) => {
                        setSelectedBrandId(e.target.value);
                        const brand = brands.find(b => b.id === e.target.value);
                        if (brand?.logo) {
                          setLogo(brand.logo);
                        }
                      }}
                      className="w-full bg-slate-900 text-white px-4 py-2 rounded-lg border border-slate-700 focus:border-orange-500 focus:outline-none"
                    >
                      <option value="">No Brand (Custom)</option>
                      {brands.map((brand) => (
                        <option key={brand.id} value={brand.id}>
                          {brand.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Presentation Inputs */}
                <div className="bg-slate-800/50 backdrop-blur rounded-xl p-4">
                  <h2 className="text-lg font-semibold text-white mb-3">Input</h2>

                  {(presentationAction === 'bullets' || presentationAction === 'speaker-notes' || 
                    presentationAction === 'improve') && (
                    <>
                      {(presentationAction === 'speaker-notes' || presentationAction === 'improve') && (
                        <div className="mb-4">
                          <label className="block text-slate-300 mb-2">Slide Title</label>
                          <input
                            type="text"
                            value={slideTitle}
                            onChange={(e) => setSlideTitle(e.target.value)}
                            placeholder="e.g., Q4 Sales Results"
                            className="w-full bg-slate-900 text-white px-4 py-2 rounded-lg border border-slate-700 focus:border-orange-500 focus:outline-none"
                          />
                        </div>
                      )}
                      <div className="mb-4">
                        <label className="block text-slate-300 mb-2">Content</label>
                        <textarea
                          value={slideContent}
                          onChange={(e) => setSlideContent(e.target.value)}
                          placeholder="Enter the content you want to convert or improve..."
                          className="w-full h-40 bg-slate-900 text-white p-3 rounded-lg border border-slate-700 focus:border-orange-500 focus:outline-none"
                        />
                      </div>
                      {presentationAction === 'bullets' && (
                        <div className="mb-4">
                          <label className="block text-slate-300 mb-2">Style</label>
                          <select
                            value={bulletStyle}
                            onChange={(e) => setBulletStyle(e.target.value)}
                            className="w-full bg-slate-900 text-white px-4 py-2 rounded-lg border border-slate-700 focus:border-orange-500 focus:outline-none"
                          >
                            <option value="professional and concise">Professional & Concise</option>
                            <option value="casual and friendly">Casual & Friendly</option>
                            <option value="technical and detailed">Technical & Detailed</option>
                            <option value="persuasive and impactful">Persuasive & Impactful</option>
                          </select>
                        </div>
                      )}
                    </>
                  )}

                  {presentationAction === 'outline' && (
                    <>
                      <div className="mb-4">
                        <label className="block text-slate-300 mb-2">Topic</label>
                        <input
                          type="text"
                          value={presentationTopic}
                          onChange={(e) => setPresentationTopic(e.target.value)}
                          placeholder="e.g., Introduction to Machine Learning"
                          className="w-full bg-slate-900 text-white px-4 py-2 rounded-lg border border-slate-700 focus:border-orange-500 focus:outline-none"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                          <label className="block text-slate-300 mb-2">Audience</label>
                          <input
                            type="text"
                            value={audience}
                            onChange={(e) => setAudience(e.target.value)}
                            placeholder="e.g., executives, engineers"
                            className="w-full bg-slate-900 text-white px-4 py-2 rounded-lg border border-slate-700 focus:border-orange-500 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-300 mb-2">Duration (min)</label>
                          <input
                            type="number"
                            value={duration}
                            onChange={(e) => setDuration(e.target.value)}
                            placeholder="15"
                            className="w-full bg-slate-900 text-white px-4 py-2 rounded-lg border border-slate-700 focus:border-orange-500 focus:outline-none"
                          />
                        </div>
                      </div>
                      <div className="mb-4">
                        <label className="block text-slate-300 mb-2">Purpose</label>
                        <select
                          value={purpose}
                          onChange={(e) => setPurpose(e.target.value)}
                          className="w-full bg-slate-900 text-white px-4 py-2 rounded-lg border border-slate-700 focus:border-orange-500 focus:outline-none"
                        >
                          <option value="inform">Inform</option>
                          <option value="persuade">Persuade</option>
                          <option value="teach">Teach</option>
                          <option value="inspire">Inspire</option>
                          <option value="report">Report</option>
                        </select>
                      </div>
                    </>
                  )}

                  {presentationAction === 'summary' && (
                    <div className="mb-4">
                      <label className="block text-slate-300 mb-2">Slides Content</label>
                      <textarea
                        value={slidesInput}
                        onChange={(e) => setSlidesInput(e.target.value)}
                        placeholder="Paste all slide content here..."
                        className="w-full h-48 bg-slate-900 text-white p-3 rounded-lg border border-slate-700 focus:border-orange-500 focus:outline-none"
                      />
                    </div>
                  )}

                  {presentationAction === 'create-from-outline' && (
                    <div className="mb-4">
                      <label className="block text-slate-300 mb-2">Outline</label>
                      <textarea
                        value={outlineInput}
                        onChange={(e) => setOutlineInput(e.target.value)}
                        placeholder="Paste presentation outline here..."
                        className="w-full h-48 bg-slate-900 text-white p-3 rounded-lg border border-slate-700 focus:border-orange-500 focus:outline-none"
                      />
                    </div>
                  )}

                  <button
                    onClick={handlePresentationSubmit}
                    disabled={loading}
                    className="w-full px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 font-medium"
                  >
                    {loading ? 'Processing...' : presentationActions.find(a => a.id === presentationAction)?.name || 'Process'}
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Result Section */}
          <div className="bg-slate-800/50 backdrop-blur rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-white">Result</h2>
              {result && (
                <button
                  onClick={() => navigator.clipboard.writeText(result)}
                  className="px-3 py-1 bg-slate-700 text-slate-300 rounded hover:bg-slate-600 text-sm"
                >
                  Copy
                </button>
              )}
            </div>

            {error && (
              <div className="bg-red-900/30 border border-red-700 rounded-lg p-4 text-red-300 mb-4">
                {error}
              </div>
            )}

            {!result && !error && !loading && (
              <div className="h-96 flex items-center justify-center text-slate-500">
                <div className="text-center">
                  <div className="text-4xl mb-3">{activeTab === 'spreadsheet' ? '📊' : '📽️'}</div>
                  <p>Results will appear here</p>
                </div>
              </div>
            )}

            {loading && (
              <div className="h-96 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-4xl animate-pulse mb-3">🤖</div>
                  <p className="text-slate-400">Processing with AI...</p>
                </div>
              </div>
            )}

            {result && (
              <pre className="h-96 overflow-auto bg-slate-900 p-4 rounded-lg text-slate-200 text-sm whitespace-pre-wrap">
                {result}
              </pre>
            )}
          </div>
        </div>

        {/* API Reference */}
        <div className="mt-6 bg-slate-800/30 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-3">API Reference</h3>
          <pre className="bg-slate-900 p-4 rounded-lg text-green-400 text-sm overflow-x-auto">
{`POST /api/office-ai

// Spreadsheet
{ "type": "spreadsheet", "action": "analyze", "data": { "spreadsheetData": "..." } }
{ "type": "spreadsheet", "action": "formula", "data": { "requirement": "...", "columns": [...] } }
{ "type": "spreadsheet", "action": "clean", "data": { "spreadsheetData": "...", "instructions": "..." } }
{ "type": "spreadsheet", "action": "chart", "data": { "spreadsheetData": "...", "purpose": "..." } }
{ "type": "spreadsheet", "action": "predict", "data": { "spreadsheetData": "...", "predictionType": "..." } }
{ "type": "spreadsheet", "action": "generate-data", "data": { "prompt": "...", "rows": 10 } }

// Presentation
{ "type": "presentation", "action": "bullets", "data": { "content": "...", "style": "..." } }
{ "type": "presentation", "action": "speaker-notes", "data": { "title": "...", "content": "..." } }
{ "type": "presentation", "action": "outline", "data": { "topic": "...", "audience": "...", "duration": 15 } }
{ "type": "presentation", "action": "improve", "data": { "title": "...", "content": "..." } }
{ "type": "presentation", "action": "summary", "data": { "slides": "..." } }
{ "type": "presentation", "action": "create-from-outline", "data": { "outline": "..." } }`}
          </pre>
        </div>
      </div>
    </div>
  );
}