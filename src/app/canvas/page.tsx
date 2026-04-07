'use client';

import React, { useState, useEffect } from 'react';
import { chatCompletion } from '@/lib/models/sdk.server';

interface CanvasProject {
  id: string;
  name: string;
  type: 'webpage' | 'dashboard' | 'app' | 'diagram';
  code: string;
  preview: string;
  lastModified: number;
  diagramType?: 'mermaid' | 'python';
}

export default function CanvasPage() {
  const [prompt, setPrompt] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState<'preview' | 'code'>('preview');
  const [projectType, setProjectType] = useState<'webpage' | 'dashboard' | 'app' | 'diagram'>(
    'webpage'
  );
  const [projects, setProjects] = useState<CanvasProject[]>([]);
  const [currentProject, setCurrentProject] = useState<CanvasProject | null>(null);
  const [diagramType, setDiagramType] = useState<'mermaid' | 'python'>('mermaid');

  // Load saved projects
  useEffect(() => {
    const saved = localStorage.getItem('canvas-projects');
    if (saved) {
      setProjects(JSON.parse(saved));
    }
  }, []);

  // Save projects
  useEffect(() => {
    localStorage.setItem('canvas-projects', JSON.stringify(projects));
  }, [projects]);

  const generateCode = async () => {
    if (!prompt.trim()) return;

    setIsGenerating(true);

    try {
      const systemPrompt = `You are an expert frontend developer. Generate complete, working HTML/CSS/JavaScript code based on the user's request.

Rules:
- Return ONLY valid HTML code (no markdown, no explanations)
- Include all CSS in <style> tags
- Include all JavaScript in <script> tags
- Make it visually appealing and modern
- Ensure it's fully functional
- Use Tailwind CSS via CDN for styling
- Make it responsive

The code will be rendered directly in an iframe, so it must be complete and self-contained.`;

      const typePrompt =
        projectType === 'webpage'
          ? 'Create a beautiful webpage'
          : projectType === 'dashboard'
            ? 'Create an interactive dashboard with charts and widgets'
            : projectType === 'app'
              ? 'Create a functional web application'
              : `Create a ${diagramType === 'mermaid' ? 'Mermaid diagram' : 'Python diagram'}`;

      const diagramPrompt =
        projectType === 'diagram'
          ? diagramType === 'mermaid'
            ? 'Generate Mermaid diagram code wrapped in HTML with mermaid.js CDN. Use mermaid.initialize({startOnLoad:true}) and include the diagram in a <div class="mermaid"> element.'
            : 'Generate Python code for diagram using matplotlib/networkx/plots, wrapped in HTML that displays the result.'
          : '';

      const result = await chatCompletion({
        model: 'glm-4-flash',
        messages: [
          {
            role: 'system',
            content: systemPrompt + (projectType === 'diagram' ? ' ' + diagramPrompt : ''),
          },
          { role: 'user', content: `${typePrompt}: ${prompt}` },
        ],
      });

      let code = result.message?.content || '';

      // Extract code from markdown if present
      const codeMatch = code.match(/```html([\s\S]*?)```/);
      if (codeMatch) {
        code = codeMatch[1];
      } else {
        // Remove any markdown formatting
        code = code.replace(/```[\s\S]*?```/g, '').trim();
      }

      setGeneratedCode(code);

      // Create blob URL for preview
      const blob = new Blob([code], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      setPreviewUrl(url);

      // Save project
      const newProject: CanvasProject = {
        id: Date.now().toString(),
        name: prompt.slice(0, 30) + '...',
        type: projectType,
        code,
        preview: url,
        lastModified: Date.now(),
      };

      setProjects(prev => [newProject, ...prev]);
      setCurrentProject(newProject);
      setActiveTab('preview');
    } catch (error) {
      console.error('Failed to generate code:', error);
      alert('Failed to generate code. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadCode = () => {
    if (!generatedCode) return;

    const blob = new Blob([generatedCode], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${projectType}-${Date.now()}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const loadProject = (project: CanvasProject) => {
    setCurrentProject(project);
    setGeneratedCode(project.code);
    setPreviewUrl(project.preview);
    setActiveTab('preview');
  };

  const deleteProject = (id: string) => {
    setProjects(prev => prev.filter(p => p.id !== id));
    if (currentProject?.id === id) {
      setCurrentProject(null);
      setGeneratedCode('');
      setPreviewUrl('');
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Header */}
      <nav className="bg-slate-800 border-b border-slate-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <svg
              className="w-8 h-8 text-purple-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"
              />
            </svg>
            <h1 className="text-2xl font-bold">Design Studio</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-400">
              {projects.length} project{projects.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      </nav>

      <div className="flex h-[calc(100vh-73px)]">
        {/* Sidebar - Projects */}
        <aside className="w-64 bg-slate-800 border-r border-slate-700 overflow-y-auto">
          <div className="p-4">
            <h2 className="text-sm font-semibold text-slate-400 mb-3">Projects</h2>
            <div className="space-y-2">
              {projects.map(project => (
                <div
                  key={project.id}
                  className={`p-3 rounded-lg cursor-pointer transition-colors ${
                    currentProject?.id === project.id
                      ? 'bg-purple-600/20 border border-purple-500'
                      : 'bg-slate-700/50 hover:bg-slate-700'
                  }`}
                  onClick={() => loadProject(project)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{project.name}</p>
                      <p className="text-xs text-slate-400 capitalize">{project.type}</p>
                    </div>
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        deleteProject(project.id);
                      }}
                      className="text-slate-400 hover:text-red-400 p-1"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
              {projects.length === 0 && (
                <p className="text-sm text-slate-500 text-center py-4">
                  No projects yet. Create one!
                </p>
              )}
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 flex flex-col">
          {/* Input Area */}
          <div className="p-4 border-b border-slate-700 bg-slate-800/50">
            <div className="flex gap-3">
              <select
                value={projectType}
                onChange={e => setProjectType(e.target.value as any)}
                className="bg-slate-700 border border-slate-600 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none"
              >
                <option value="webpage">Webpage</option>
                <option value="dashboard">Dashboard</option>
                <option value="app">Web App</option>
                <option value="diagram">Diagram</option>
              </select>

              {projectType === 'diagram' && (
                <select
                  value={diagramType}
                  onChange={e => setDiagramType(e.target.value as any)}
                  className="bg-slate-700 border border-slate-600 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none"
                >
                  <option value="mermaid">Mermaid (Flowcharts, Sequence)</option>
                  <option value="python">Python (Matplotlib, NetworkX)</option>
                </select>
              )}

              <input
                type="text"
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                placeholder={`Describe your ${projectType}... (e.g., "A landing page for a coffee shop with hero section and contact form")`}
                className="flex-1 bg-slate-700 border border-slate-600 rounded px-4 py-2 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                onKeyPress={e => e.key === 'Enter' && generateCode()}
              />

              <button
                onClick={generateCode}
                disabled={isGenerating || !prompt.trim()}
                className="bg-purple-600 hover:bg-purple-700 disabled:bg-slate-600 disabled:cursor-not-allowed px-6 py-2 rounded font-medium transition-colors flex items-center gap-2"
              >
                {isGenerating ? (
                  <>
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Generating...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 10V3L4 14h7v7l9-11h-7z"
                      />
                    </svg>
                    Generate
                  </>
                )}
              </button>

              <button
                onClick={downloadCode}
                disabled={!generatedCode}
                className="bg-slate-700 hover:bg-slate-600 disabled:bg-slate-600 disabled:cursor-not-allowed px-4 py-2 rounded font-medium transition-colors"
                title="Download HTML"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                  />
                </svg>
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-slate-700 bg-slate-800/30">
            <button
              onClick={() => setActiveTab('preview')}
              className={`px-6 py-2 text-sm font-medium transition-colors ${
                activeTab === 'preview'
                  ? 'text-purple-400 border-b-2 border-purple-400'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Preview
            </button>
            <button
              onClick={() => setActiveTab('code')}
              className={`px-6 py-2 text-sm font-medium transition-colors ${
                activeTab === 'code'
                  ? 'text-purple-400 border-b-2 border-purple-400'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Code
            </button>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-hidden">
            {activeTab === 'preview' ? (
              <div className="w-full h-full bg-white">
                {previewUrl ? (
                  <iframe
                    src={previewUrl}
                    className="w-full h-full border-0"
                    title="Preview"
                    sandbox="allow-scripts allow-same-origin"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-slate-400">
                    <div className="text-center">
                      <svg
                        className="w-16 h-16 mx-auto mb-4 opacity-50"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"
                        />
                      </svg>
                      <p>Enter a prompt above to generate your {projectType}</p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="w-full h-full bg-slate-900 overflow-auto">
                <pre className="p-4 text-sm font-mono text-green-400 whitespace-pre-wrap break-all">
                  {generatedCode || '// Generated code will appear here'}
                </pre>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
