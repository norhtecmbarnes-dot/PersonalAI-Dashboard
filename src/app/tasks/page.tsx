'use client';

import { useState, useEffect } from 'react';
import { TaskInstruction } from '@/components/TaskInstruction';
import { useGlobalModel } from '@/lib/context/ModelContext';

interface ScheduledTask {
  id: string;
  name: string;
  description?: string;
  prompt?: string;
  taskType: string;
  schedule: string;
  brandId?: string;
  projectId?: string;
  enabled: boolean;
  permanent: boolean;
  expiresAt?: number;
  lastRun?: number;
  lastResult?: string;
  lastError?: string;
  runCount: number;
  successCount: number;
  failCount: number;
  createdAt: number;
  updatedAt: number;
}

interface TaskResult {
  id: string;
  task_id: string;
  result?: string;
  data?: any;
  success: boolean;
  created_at: number;
}

interface TaskStats {
  total: number;
  enabled: number;
  disabled: number;
  duplicates: number;
  expired: number;
  neverRun: number;
  inactive: number;
}

interface AgingTask {
  id: string;
  name: string;
  type: string;
  age: number;
  daysUntilExpiry: number;
  enabled: boolean;
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<ScheduledTask[]>([]);
  const [schedulerStatus, setSchedulerStatus] = useState<{ isRunning: boolean } | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<ScheduledTask | null>(null);
  const [taskResults, setTaskResults] = useState<TaskResult[]>([]);
  const [resultsLoading, setResultsLoading] = useState(false);
  const { selectedModel } = useGlobalModel();
  const [stats, setStats] = useState<TaskStats>({
    total: 0,
    enabled: 0,
    disabled: 0,
    duplicates: 0,
    expired: 0,
    neverRun: 0,
    inactive: 0,
  });
  const [filter, setFilter] = useState<'all' | 'duplicates' | 'expired' | 'inactive' | 'neverRun'>(
    'all'
  );
  const [agingTasks, setAgingTasks] = useState<AgingTask[]>([]);
  const [showAgingReview, setShowAgingReview] = useState(false);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      const [tasksRes, statusRes, agingRes] = await Promise.all([
        fetch('/api/tasks?action=list'),
        fetch('/api/tasks?action=status'),
        fetch('/api/tasks?action=aging-review'),
      ]);

      const tasksData = await tasksRes.json();
      const statusData = await statusRes.json();
      const agingData = await agingRes.json();

      setTasks(tasksData.tasks || []);
      setSchedulerStatus(statusData);
      setAgingTasks(agingData.tasks || []);
      calculateStats(tasksData.tasks || []);
    } catch (error) {
      console.error('Error loading tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (taskList: ScheduledTask[]) => {
    const now = Date.now();
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
    const sixtyDaysAgo = now - 60 * 24 * 60 * 60 * 1000;

    // Find duplicates by type and schedule
    const typeScheduleMap = new Map<string, number>();
    taskList.forEach(t => {
      const key = `${t.taskType}:${t.schedule}`;
      typeScheduleMap.set(key, (typeScheduleMap.get(key) || 0) + 1);
    });
    const duplicateKeys = new Set(
      Array.from(typeScheduleMap.entries())
        .filter(([, count]) => count > 1)
        .map(([key]) => key)
    );

    const stats: TaskStats = {
      total: taskList.length,
      enabled: taskList.filter(t => t.enabled).length,
      disabled: taskList.filter(t => !t.enabled).length,
      duplicates: taskList.filter(t => duplicateKeys.has(`${t.taskType}:${t.schedule}`)).length,
      expired: taskList.filter(t => t.expiresAt && t.expiresAt < now).length,
      neverRun: taskList.filter(t => t.runCount === 0).length,
      inactive: taskList.filter(t => t.enabled && t.lastRun && t.lastRun < sixtyDaysAgo).length,
    };

    setStats(stats);
  };

  const loadTaskResults = async (taskId: string) => {
    setResultsLoading(true);
    try {
      const res = await fetch(`/api/tasks?action=results&id=${taskId}&limit=20`);
      const data = await res.json();
      setTaskResults(data.results || []);
    } catch (error) {
      console.error('Error loading results:', error);
      setTaskResults([]);
    } finally {
      setResultsLoading(false);
    }
  };

  const toggleTask = async (id: string, enabled: boolean) => {
    try {
      await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: enabled ? 'enable' : 'disable', id }),
      });
      loadData();
    } catch (error) {
      console.error('Error toggling task:', error);
    }
  };

  const runTaskNow = async (id: string) => {
    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'run', id }),
      });
      const data = await response.json();
      alert(
        data.success
          ? `Task completed: ${data.result?.result || 'OK'}`
          : `Task failed: ${data.result?.error}`
      );
      loadData();
      if (selectedTask?.id === id) {
        loadTaskResults(id);
      }
    } catch (error) {
      console.error('Error running task:', error);
    }
  };

  const deleteTask = async (id: string) => {
    const task = tasks.find(t => t.id === id);
    if (task?.permanent) {
      alert('Cannot delete permanent tasks. This is a system task.');
      return;
    }
    if (!confirm('Delete this task?')) return;
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', id }),
      });
      const data = await res.json();
      if (!data.success) {
        alert(data.error || 'Failed to delete task');
      }
      loadData();
      if (selectedTask?.id === id) {
        setSelectedTask(null);
      }
    } catch (error) {
      console.error('Error deleting task:', error);
    }
  };

  const viewTaskResults = (task: ScheduledTask) => {
    setSelectedTask(task);
    loadTaskResults(task.id);
  };

  const formatSchedule = (schedule: string): string => {
    if (schedule === 'daily') return 'Daily';
    if (schedule === 'manual') return 'Manual only';
    if (schedule.startsWith('every:')) {
      const parts = schedule.split(':');
      return `Every ${parts[1]} ${parts[2] || ''}`.trim();
    }
    if (schedule.startsWith('at:')) {
      const parts = schedule.split(':');
      return `At ${parts[1]}:${parts[2]}`;
    }
    return schedule;
  };

  const formatDate = (timestamp?: number) => {
    if (!timestamp) return 'Never';
    return new Date(timestamp).toLocaleString();
  };

  const formatExpires = (expiresAt?: number) => {
    if (!expiresAt) return null;
    const diff = expiresAt - Date.now();
    if (diff < 0) return 'Expired';
    if (diff < 60 * 60 * 1000) return `Expires in ${Math.floor(diff / 60000)}m`;
    if (diff < 24 * 60 * 60 * 1000) return `Expires in ${Math.floor(diff / 3600000)}h`;
    return `Expires in ${Math.floor(diff / 86400000)}d`;
  };

  const getTaskResultLink = (task: ScheduledTask): { label: string; href: string } | null => {
    if (!task.lastResult && !task.lastError && !task.lastRun) return null;

    switch (task.taskType) {
      case 'intelligence':
        return { label: 'View Intelligence Report', href: '/intelligence' };
      case 'security':
        return { label: 'View Security Report', href: '/security' };
      case 'reflection':
        return { label: 'View Self-Reflection', href: '/self-improvement' };
      case 'research':
        return { label: 'View Research', href: '/research' };
      case 'brand_task':
        return { label: 'View Brands', href: '/brand-workspace' };
      default:
        return null;
    }
  };

  const taskTypeLabel = (type: string): { label: string; color: string } => {
    const types: Record<string, { label: string; color: string }> = {
      intelligence: { label: 'Intelligence', color: 'bg-blue-900/50 text-blue-300' },
      security: { label: 'Security', color: 'bg-red-900/50 text-red-300' },
      research: { label: 'Research', color: 'bg-purple-900/50 text-purple-300' },
      reflection: { label: 'Reflection', color: 'bg-yellow-900/50 text-yellow-300' },
      rl_training: { label: 'RL Training', color: 'bg-green-900/50 text-green-300' },
      memory_capture: { label: 'Memory', color: 'bg-cyan-900/50 text-cyan-300' },
      memory_archive: { label: 'Archive', color: 'bg-gray-700 text-gray-300' },
      sam_check: { label: 'SAM.gov', color: 'bg-orange-900/50 text-orange-300' },
      brand_task: { label: 'Brand', color: 'bg-pink-900/50 text-pink-300' },
      web_check: { label: 'Web Check', color: 'bg-indigo-900/50 text-indigo-300' },
      custom: { label: 'Custom', color: 'bg-gray-700 text-gray-300' },
    };
    return types[type] || { label: type, color: 'bg-gray-700 text-gray-300' };
  };

  const isPotentialDuplicate = (task: ScheduledTask) => {
    const sameTypeAndSchedule = tasks.filter(
      t => t.taskType === task.taskType && t.schedule === task.schedule
    );
    return sameTypeAndSchedule.length > 1;
  };

  const isTaskExpired = (task: ScheduledTask) => {
    return task.expiresAt && task.expiresAt < Date.now();
  };

  const isTaskInactive = (task: ScheduledTask) => {
    const sixtyDaysAgo = Date.now() - 60 * 24 * 60 * 60 * 1000;
    return task.enabled && task.lastRun && task.lastRun < sixtyDaysAgo;
  };

  const isNeverRun = (task: ScheduledTask) => {
    return task.runCount === 0;
  };

  const getFilteredTasks = (taskList: ScheduledTask[]) => {
    switch (filter) {
      case 'duplicates':
        return taskList.filter(t => isPotentialDuplicate(t));
      case 'expired':
        return taskList.filter(t => isTaskExpired(t));
      case 'inactive':
        return taskList.filter(t => isTaskInactive(t));
      case 'neverRun':
        return taskList.filter(t => isNeverRun(t));
      default:
        return taskList;
    }
  };

  const handleAgingDecision = async (
    taskId: string,
    decision: 'keep' | 'modify' | 'delete' | 'snooze'
  ) => {
    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'aging-decision', taskId, decision }),
      });

      const result = await response.json();
      if (result.success) {
        setAgingTasks(prev => prev.filter(t => t.id !== taskId));
        loadData();
      }
    } catch (error) {
      console.error('Error processing aging decision:', error);
    }
  };

  const handleBatchAgingDecisions = async (
    decisions: Array<{ taskId: string; decision: string }>
  ) => {
    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'aging-batch', decisions }),
      });

      const result = await response.json();
      if (result.success) {
        setAgingTasks([]);
        loadData();
      }
    } catch (error) {
      console.error('Error processing batch aging:', error);
    }
  };

  const getTaskWarnings = (task: ScheduledTask): string[] => {
    const warnings: string[] = [];
    if (isPotentialDuplicate(task)) {
      warnings.push('⚠️ Duplicate: Another task has same type and schedule');
    }
    if (isTaskExpired(task)) {
      warnings.push('⚠️ Expired: This task has passed its expiration date');
    }
    if (isTaskInactive(task)) {
      warnings.push("⚠️ Inactive: Hasn't run in 60+ days");
    }
    if (isNeverRun(task) && task.enabled) {
      warnings.push('ℹ️ Never run: Enabled but never executed');
    }
    return warnings;
  };

  const permanentTasks = getFilteredTasks(tasks.filter(t => t.permanent));
  const temporaryTasks = getFilteredTasks(tasks.filter(t => !t.permanent));

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white">Task Scheduler</h1>
            <p className="text-gray-400 mt-1">Automate recurring tasks with natural language</p>
          </div>
          <div className="flex gap-3 items-center">
            {agingTasks.length > 0 && (
              <button
                onClick={() => setShowAgingReview(true)}
                className="px-4 py-2 rounded bg-yellow-900/50 text-yellow-300 hover:bg-yellow-900/70 transition-colors flex items-center gap-2"
              >
                <span className="animate-pulse">⚠️</span>
                {agingTasks.length} tasks need review
              </button>
            )}
            <div
              className={`px-4 py-2 rounded ${schedulerStatus?.isRunning ? 'bg-green-900/50 text-green-300' : 'bg-red-900/50 text-red-300'}`}
            >
              {schedulerStatus?.isRunning ? '● Scheduler Running' : '○ Scheduler Stopped'}
            </div>
          </div>
        </div>

        {/* Task Aging Review Modal */}
        {showAgingReview && agingTasks.length > 0 && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-white">Tasks Needing Review</h2>
                <button
                  onClick={() => setShowAgingReview(false)}
                  className="text-gray-400 hover:text-white"
                >
                  ✕
                </button>
              </div>
              <p className="text-gray-400 mb-4">
                These tasks are aging and will expire soon. Please decide what to do with them.
              </p>
              <div className="space-y-4">
                {agingTasks.map(task => (
                  <div key={task.id} className="bg-gray-700 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="text-white font-medium">{task.name}</h3>
                        <p className="text-sm text-gray-400">
                          Type: {task.type} • Age: {task.age} days • Expires in{' '}
                          {task.daysUntilExpiry} days
                        </p>
                      </div>
                      {task.enabled && (
                        <span className="text-xs px-2 py-1 bg-green-900/50 text-green-300 rounded">
                          Active
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={() => handleAgingDecision(task.id, 'keep')}
                        className="px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white text-sm rounded transition-colors"
                      >
                        Keep (Reset Age)
                      </button>
                      <button
                        onClick={() => handleAgingDecision(task.id, 'snooze')}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded transition-colors"
                      >
                        Snooze 30 Days
                      </button>
                      <button
                        onClick={() => handleAgingDecision(task.id, 'delete')}
                        className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white text-sm rounded transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex justify-end gap-2">
                <button
                  onClick={() =>
                    handleBatchAgingDecisions(
                      agingTasks.map(t => ({ taskId: t.id, decision: 'keep' }))
                    )
                  }
                  className="px-4 py-2 bg-green-700 hover:bg-green-600 text-white rounded transition-colors"
                >
                  Keep All
                </button>
                <button
                  onClick={() => setShowAgingReview(false)}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded transition-colors"
                >
                  Later
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Natural Language Task Creation */}
        <TaskInstruction onTaskCreated={loadData} />

        {/* Task Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-7 gap-4 mt-6 mb-6">
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="text-2xl font-bold text-white">{stats.total}</div>
            <div className="text-sm text-gray-400">Total</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="text-2xl font-bold text-green-400">{stats.enabled}</div>
            <div className="text-sm text-gray-400">Enabled</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="text-2xl font-bold text-gray-400">{stats.disabled}</div>
            <div className="text-sm text-gray-400">Disabled</div>
          </div>
          <div
            className={`bg-gray-800 rounded-lg p-4 cursor-pointer hover:bg-gray-700 transition-colors ${filter === 'duplicates' ? 'ring-2 ring-yellow-500' : ''}`}
            onClick={() => setFilter(filter === 'duplicates' ? 'all' : 'duplicates')}
          >
            <div className="text-2xl font-bold text-yellow-400">{stats.duplicates}</div>
            <div className="text-sm text-gray-400">Duplicates</div>
          </div>
          <div
            className={`bg-gray-800 rounded-lg p-4 cursor-pointer hover:bg-gray-700 transition-colors ${filter === 'expired' ? 'ring-2 ring-red-500' : ''}`}
            onClick={() => setFilter(filter === 'expired' ? 'all' : 'expired')}
          >
            <div className="text-2xl font-bold text-red-400">{stats.expired}</div>
            <div className="text-sm text-gray-400">Expired</div>
          </div>
          <div
            className={`bg-gray-800 rounded-lg p-4 cursor-pointer hover:bg-gray-700 transition-colors ${filter === 'neverRun' ? 'ring-2 ring-blue-500' : ''}`}
            onClick={() => setFilter(filter === 'neverRun' ? 'all' : 'neverRun')}
          >
            <div className="text-2xl font-bold text-blue-400">{stats.neverRun}</div>
            <div className="text-sm text-gray-400">Never Run</div>
          </div>
          <div
            className={`bg-gray-800 rounded-lg p-4 cursor-pointer hover:bg-gray-700 transition-colors ${filter === 'inactive' ? 'ring-2 ring-orange-500' : ''}`}
            onClick={() => setFilter(filter === 'inactive' ? 'all' : 'inactive')}
          >
            <div className="text-2xl font-bold text-orange-400">{stats.inactive}</div>
            <div className="text-sm text-gray-400">Inactive (60d+)</div>
          </div>
        </div>

        {/* Filter Reset */}
        {filter !== 'all' && (
          <div className="mb-4">
            <button
              onClick={() => setFilter('all')}
              className="px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600 text-white rounded"
            >
              Clear Filter (showing {filter})
            </button>
          </div>
        )}

        {loading ? (
          <div className="text-center py-12 text-gray-400">Loading...</div>
        ) : (
          <div className="mt-6 space-y-8">
            {/* Permanent System Tasks */}
            {permanentTasks.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <span className="text-blue-400">⏻</span>
                  System Tasks
                  <span className="text-xs text-gray-500 font-normal">
                    (Permanent - cannot delete)
                  </span>
                </h2>
                <div className="space-y-4">
                  {permanentTasks.map(task => (
                    <div
                      key={task.id}
                      className={`bg-gray-800 rounded-lg p-4 border ${task.enabled ? 'border-gray-700' : 'border-gray-800 opacity-60'}`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold text-white">{task.name}</h3>
                            <span
                              className={`text-xs px-2 py-0.5 rounded ${taskTypeLabel(task.taskType).color}`}
                            >
                              {taskTypeLabel(task.taskType).label}
                            </span>
                            <span className="text-xs px-2 py-0.5 bg-purple-900/50 text-purple-300 rounded">
                              {formatSchedule(task.schedule)}
                            </span>
                          </div>
                          {task.description && (
                            <p className="text-gray-400 text-sm mt-1">{task.description}</p>
                          )}
                          <div className="flex gap-6 mt-3 text-sm text-gray-400">
                            <span>Last run: {formatDate(task.lastRun)}</span>
                            <span>Runs: {task.runCount}</span>
                            <span className="text-green-400">✓ {task.successCount}</span>
                            <span className="text-red-400">✗ {task.failCount}</span>
                          </div>
                          {getTaskWarnings(task).length > 0 && (
                            <div className="mt-2 space-y-1">
                              {getTaskWarnings(task).map((warning, i) => (
                                <div key={i} className="text-xs text-yellow-400">
                                  {warning}
                                </div>
                              ))}
                            </div>
                          )}
                          {task.lastResult && (
                            <button
                              onClick={() => viewTaskResults(task)}
                              className="text-sm text-blue-400 hover:text-blue-300 mt-2"
                            >
                              View Results →
                            </button>
                          )}
                        </div>
                        <div className="flex gap-2 ml-4">
                          <button
                            onClick={() => runTaskNow(task.id)}
                            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-sm text-white"
                          >
                            Run
                          </button>
                          <button
                            onClick={() => toggleTask(task.id, !task.enabled)}
                            className={`px-3 py-1 rounded text-sm text-white ${task.enabled ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-green-600 hover:bg-green-700'}`}
                          >
                            {task.enabled ? 'Disable' : 'Enable'}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Temporary/User Tasks */}
            {temporaryTasks.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <span className="text-yellow-400">⏱</span>
                  User Tasks
                  <span className="text-xs text-gray-500 font-normal">
                    (Temporary - can be deleted)
                  </span>
                </h2>
                <div className="space-y-4">
                  {temporaryTasks.map(task => (
                    <div
                      key={task.id}
                      className={`bg-gray-800 rounded-lg p-4 border ${task.enabled ? 'border-gray-700' : 'border-gray-800 opacity-60'}`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold text-white">{task.name}</h3>
                            <span
                              className={`text-xs px-2 py-0.5 rounded ${taskTypeLabel(task.taskType).color}`}
                            >
                              {taskTypeLabel(task.taskType).label}
                            </span>
                            <span className="text-xs px-2 py-0.5 bg-purple-900/50 text-purple-300 rounded">
                              {formatSchedule(task.schedule)}
                            </span>
                            {task.expiresAt && (
                              <span className="text-xs px-2 py-0.5 bg-orange-900/50 text-orange-300 rounded">
                                {formatExpires(task.expiresAt)}
                              </span>
                            )}
                          </div>
                          {task.description && (
                            <p className="text-gray-400 text-sm mt-1">{task.description}</p>
                          )}
                          {task.prompt && (
                            <p className="text-gray-500 text-xs mt-2 font-mono truncate max-w-xl">
                              {task.prompt}
                            </p>
                          )}
                          <div className="flex gap-6 mt-3 text-sm text-gray-400">
                            <span>Last run: {formatDate(task.lastRun)}</span>
                            <span>Runs: {task.runCount}</span>
                            <span className="text-green-400">✓ {task.successCount}</span>
                            <span className="text-red-400">✗ {task.failCount}</span>
                          </div>
                          {task.lastResult && (
                            <button
                              onClick={() => viewTaskResults(task)}
                              className="text-sm text-blue-400 hover:text-blue-300 mt-2"
                            >
                              View Results →
                            </button>
                          )}
                        </div>
                        <div className="flex gap-2 ml-4">
                          <button
                            onClick={() => runTaskNow(task.id)}
                            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-sm text-white"
                          >
                            Run
                          </button>
                          <button
                            onClick={() => toggleTask(task.id, !task.enabled)}
                            className={`px-3 py-1 rounded text-sm text-white ${task.enabled ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-green-600 hover:bg-green-700'}`}
                          >
                            {task.enabled ? 'Disable' : 'Enable'}
                          </button>
                          <button
                            onClick={() => deleteTask(task.id)}
                            className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded text-sm text-white"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {tasks.length === 0 && (
              <div className="bg-gray-800 rounded-lg p-8 text-center">
                <p className="text-gray-400">No scheduled tasks yet.</p>
                <p className="text-gray-500 text-sm mt-2">
                  Create a task above using natural language.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Task Results Panel */}
        {selectedTask && (
          <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
            onClick={() => setSelectedTask(null)}
          >
            <div
              className="bg-gray-800 rounded-lg max-w-4xl w-full max-h-[80vh] overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-4 border-b border-gray-700 flex justify-between items-center">
                <h3 className="text-lg font-semibold text-white">Results: {selectedTask.name}</h3>
                <button
                  onClick={() => setSelectedTask(null)}
                  className="text-gray-400 hover:text-white text-2xl"
                >
                  ×
                </button>
              </div>
              <div className="p-4 overflow-auto max-h-[calc(80vh-60px)]">
                {resultsLoading ? (
                  <div className="text-center py-8 text-gray-400">Loading results...</div>
                ) : taskResults.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">No results yet.</div>
                ) : (
                  <div className="space-y-4">
                    {taskResults.map((result, i) => (
                      <div
                        key={result.id}
                        className={`p-4 rounded ${result.success ? 'bg-green-900/20 border border-green-800' : 'bg-red-900/20 border border-red-800'}`}
                      >
                        <div className="flex justify-between text-sm text-gray-400 mb-2">
                          <span>{formatDate(result.created_at)}</span>
                          <span className={result.success ? 'text-green-400' : 'text-red-400'}>
                            {result.success ? '✓ Success' : '✗ Failed'}
                          </span>
                        </div>
                        {result.result && (
                          <pre className="text-sm text-gray-300 whitespace-pre-wrap overflow-auto max-h-40">
                            {result.result}
                          </pre>
                        )}
                        {result.data && (
                          <details className="mt-2">
                            <summary className="text-sm text-gray-400 cursor-pointer">
                              View data
                            </summary>
                            <pre className="text-xs text-gray-400 mt-2 overflow-auto max-h-40">
                              {JSON.stringify(result.data, null, 2)}
                            </pre>
                          </details>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
