'use client';

import React, { useState, useEffect, useCallback } from 'react';

interface TaskItem {
  id: string;
  projectId: string;
  section?: string;
  title: string;
  assignee?: string;
  status: 'pending' | 'in_progress' | 'completed';
  orderIndex: number;
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

interface Brand {
  id: string;
  name: string;
}

interface Project {
  id: string;
  brandId: string;
  name: string;
  status: string;
  type: string;
}

type Filter = 'all' | 'pending' | 'in_progress' | 'completed';

const STATUS_ORDER: TaskItem['status'][] = ['pending', 'in_progress', 'completed'];

export default function ProposalTrackerPage() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedBrandId, setSelectedBrandId] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [filter, setFilter] = useState<Filter>('all');
  const [newTask, setNewTask] = useState({ section: 'General', title: '', assignee: '' });

  // Load companies
  useEffect(() => {
    fetch('/api/brand-workspace/brands')
      .then(r => r.json())
      .then(data => setBrands(data.brands || []))
      .catch(e => console.error('Failed to load brands:', e));
  }, []);

  // Load procurements when a company is picked
  useEffect(() => {
    setProjects([]);
    setSelectedProjectId('');
    setTasks([]);
    if (!selectedBrandId) return;
    fetch(`/api/brand-workspace/projects?brandId=${encodeURIComponent(selectedBrandId)}`)
      .then(r => r.json())
      .then(data => setProjects(data.projects || []))
      .catch(e => console.error('Failed to load projects:', e));
  }, [selectedBrandId]);

  // Load tasks when a procurement is picked
  const loadTasks = useCallback((projectId: string) => {
    if (!projectId) {
      setTasks([]);
      return;
    }
    fetch(`/api/proposal-tasks?projectId=${encodeURIComponent(projectId)}`)
      .then(r => r.json())
      .then(data => setTasks(data.tasks || []))
      .catch(e => console.error('Failed to load tasks:', e));
  }, []);

  useEffect(() => {
    loadTasks(selectedProjectId);
  }, [selectedProjectId, loadTasks]);

  const api = async (action: string, extra: any = {}) => {
    const response = await fetch('/api/proposal-tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, projectId: selectedProjectId, brandId: selectedBrandId, ...extra }),
    });
    return response.json();
  };

  const generateTasks = async () => {
    if (!selectedProjectId || !selectedBrandId) return;
    setGenerating(true);
    try {
      const data = await api('generate');
      if (data.success) {
        setTasks(data.tasks || []);
      } else {
        alert(data.error || 'Generation failed');
      }
    } catch (e) {
      console.error('Generate tasks error:', e);
      alert('Failed to generate tasks');
    } finally {
      setGenerating(false);
    }
  };

  const cycleStatus = async (task: TaskItem) => {
    const idx = STATUS_ORDER.indexOf(task.status);
    const next = STATUS_ORDER[(idx + 1) % STATUS_ORDER.length];
    const optimistic = tasks.map(t => (t.id === task.id ? { ...t, status: next } : t));
    setTasks(optimistic);
    const data = await api('update', { id: task.id, updates: { status: next } });
    if (!data.success && data.task) setTasks(tasks);
  };

  const saveAssignee = async (task: TaskItem, assignee: string) => {
    const optimistic = tasks.map(t => (t.id === task.id ? { ...t, assignee } : t));
    setTasks(optimistic);
    await api('update', { id: task.id, updates: { assignee } });
  };

  const deleteTask = async (taskId: string) => {
    setTasks(prev => prev.filter(t => t.id !== taskId));
    await api('delete', { id: taskId });
  };

  const addTask = async () => {
    if (!newTask.title.trim()) return;
    const data = await api('add', { task: newTask });
    if (data.success && data.task) {
      setTasks(prev => [...prev, data.task]);
      setNewTask({ section: 'General', title: '', assignee: '' });
    }
  };

  const selectedProject = projects.find(p => p.id === selectedProjectId);
  const completedCount = tasks.filter(t => t.status === 'completed').length;
  const progress = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;

  const visibleTasks = tasks.filter(t => filter === 'all' || t.status === filter);
  const sections = Array.from(new Set(visibleTasks.map(t => t.section || 'General')));

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Header */}
      <nav className="bg-slate-800 border-b border-slate-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <svg className="w-8 h-8 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
              />
            </svg>
            <div>
              <h1 className="text-2xl font-bold">Proposal Tracker</h1>
              <p className="text-sm text-slate-400">AI to-do list — who owns each section, and where it stands</p>
            </div>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-slate-400">
              {completedCount}/{tasks.length} complete
            </span>
            <span className={`font-semibold ${progress === 100 && tasks.length > 0 ? 'text-green-400' : 'text-purple-400'}`}>
              {progress}%
            </span>
          </div>
        </div>
      </nav>

      <div className="flex h-[calc(100vh-81px)]">
        {/* Sidebar - pick company + procurement */}
        <aside className="w-72 bg-slate-800 border-r border-slate-700 overflow-y-auto">
          <div className="p-4 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-2">Company</label>
              <select
                value={selectedBrandId}
                onChange={e => setSelectedBrandId(e.target.value)}
                className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none"
              >
                <option value="">Select company…</option>
                {brands.map(b => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-2">Procurement</label>
              <select
                value={selectedProjectId}
                onChange={e => setSelectedProjectId(e.target.value)}
                disabled={!selectedBrandId}
                className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none disabled:opacity-50"
              >
                <option value="">Select procurement…</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={generateTasks}
              disabled={generating || !selectedProjectId}
              className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-slate-600 disabled:cursor-not-allowed px-4 py-2 rounded font-medium transition-colors text-sm"
            >
              {generating ? 'Generating…' : '✨ Generate task list from proposal'}
            </button>

            <div className="pt-2 border-t border-slate-700">
              <label className="block text-xs font-semibold text-slate-400 mb-2">Filter</label>
              <div className="flex flex-wrap gap-1.5">
                {(['all', 'pending', 'in_progress', 'completed'] as Filter[]).map(f => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-2.5 py-1 rounded text-xs transition-colors ${
                      filter === f ? 'bg-purple-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    }`}
                  >
                    {f === 'all' ? 'All' : f === 'in_progress' ? 'In progress' : f.charAt(0).toUpperCase() + f.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Progress bar */}
            <div className="pt-2 border-t border-slate-700">
              <div className="flex justify-between text-xs text-slate-400 mb-1">
                <span>Proposal progress</span>
                <span>{progress}%</span>
              </div>
              <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-purple-500 transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </div>
        </aside>

        {/* Main content - task list */}
        <main className="flex-1 overflow-y-auto">
          {!selectedProjectId ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-slate-500 text-center px-8">
                Pick a company and a procurement to see its proposal task list.
                <br />
                Then generate the list from the proposal — or add tasks manually.
              </p>
            </div>
          ) : (
            <div className="p-6 max-w-4xl mx-auto">
              <div className="mb-5">
                <h2 className="text-xl font-semibold">{selectedProject?.name || 'Procurement'}</h2>
                <p className="text-sm text-slate-400">
                  Sections below show who is responsible and whether the work is pending, in progress, or done.
                </p>
              </div>

              {tasks.length === 0 && (
                <div className="bg-slate-800 rounded-lg p-8 text-center border border-slate-700">
                  <p className="text-slate-400 mb-3">
                    No tasks yet. Generate the list from the proposal to break it into sections with owners.
                  </p>
                </div>
              )}

              {sections.map(section => {
                const sectionTasks = visibleTasks.filter(t => (t.section || 'General') === section);
                const done = sectionTasks.filter(t => t.status === 'completed').length;
                return (
                  <div key={section} className="mb-6">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-semibold text-purple-300 uppercase tracking-wide">{section}</h3>
                      <span className="text-xs text-slate-400">
                        {done}/{sectionTasks.length} done
                      </span>
                    </div>
                    <div className="space-y-2">
                      {sectionTasks.map(task => (
                        <div
                          key={task.id}
                          className={`bg-slate-800 rounded-lg p-3 border transition-colors ${
                            task.status === 'completed'
                              ? 'border-green-700/50 opacity-70'
                              : task.status === 'in_progress'
                              ? 'border-purple-500/50'
                              : 'border-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            {/* Cycle: pending → in_progress → completed */}
                            <button
                              onClick={() => cycleStatus(task)}
                              title={`Click to cycle status (currently ${task.status})`}
                              className={`shrink-0 w-5 h-5 rounded flex items-center justify-center border-2 transition-colors ${
                                task.status === 'completed'
                                  ? 'bg-green-500 border-green-500 text-white'
                                  : task.status === 'in_progress'
                                  ? 'bg-purple-500/30 border-purple-400'
                                  : 'border-slate-500 hover:border-purple-400'
                              }`}
                            >
                              {task.status === 'completed' && (
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                              {task.status === 'in_progress' && <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />}
                            </button>

                            <div className="flex-1 min-w-0">
                              <p
                                className={`text-sm ${task.status === 'completed' ? 'line-through text-slate-500' : 'text-white'}`}
                              >
                                {task.title}
                              </p>
                              <div className="flex items-center gap-2 mt-1">
                                <span
                                  className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                                    task.status === 'completed'
                                      ? 'bg-green-900/50 text-green-300'
                                      : task.status === 'in_progress'
                                      ? 'bg-purple-900/50 text-purple-300'
                                      : 'bg-slate-700 text-slate-400'
                                  }`}
                                >
                                  {task.status === 'in_progress' ? 'In progress' : task.status.charAt(0).toUpperCase() + task.status.slice(1)}
                                </span>
                                <span className="text-xs text-slate-500">Responsible:</span>
                                <input
                                  value={task.assignee || ''}
                                  onChange={e => saveAssignee(task, e.target.value)}
                                  placeholder="Unassigned"
                                  className="bg-transparent text-xs text-slate-300 border-b border-dotted border-slate-600 focus:border-purple-400 focus:outline-none w-40"
                                />
                              </div>
                            </div>

                            <button
                              onClick={() => deleteTask(task.id)}
                              title="Delete task"
                              className="text-slate-500 hover:text-red-400 p-1 transition-colors"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                    </div>
                  </div>
                );
              })}

              {/* Add task */}
              <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                <h4 className="text-sm font-semibold text-slate-300 mb-3">Add task</h4>
                <div className="flex flex-wrap gap-2">
                  <input
                    value={newTask.section}
                    onChange={e => setNewTask({ ...newTask, section: e.target.value })}
                    placeholder="Section (e.g. Technical Approach)"
                    className="flex-1 min-w-40 bg-slate-700 border border-slate-600 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                  <input
                    value={newTask.title}
                    onChange={e => setNewTask({ ...newTask, title: e.target.value })}
                    placeholder="Task (e.g. Draft section from capture)"
                    className="flex-[2] min-w-48 bg-slate-700 border border-slate-600 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                  <input
                    value={newTask.assignee}
                    onChange={e => setNewTask({ ...newTask, assignee: e.target.value })}
                    placeholder="Assignee"
                    className="flex-1 min-w-32 bg-slate-700 border border-slate-600 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                  <button
                    onClick={addTask}
                    disabled={!newTask.title.trim()}
                    className="bg-purple-600 hover:bg-purple-700 disabled:bg-slate-600 disabled:cursor-not-allowed px-4 py-2 rounded text-sm font-medium transition-colors"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
