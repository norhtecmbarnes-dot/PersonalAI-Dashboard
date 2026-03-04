'use client';

import { useState, useEffect } from 'react';

interface ScheduledTask {
  id: string;
  name: string;
  description?: string;
  prompt?: string;
  taskType: string;
  schedule: string;
  enabled: boolean;
  lastRun?: number;
  lastResult?: string;
  runCount: number;
  successCount: number;
  failCount: number;
}

interface TaskInstructionProps {
  onTaskCreated?: (task: ScheduledTask) => void;
}

export function TaskInstruction({ onTaskCreated }: TaskInstructionProps) {
  const [instruction, setInstruction] = useState('');
  const [tasks, setTasks] = useState<ScheduledTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [parsedTask, setParsedTask] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    try {
      const response = await fetch('/api/task-instruction?action=list');
      const data = await response.json();
      if (data.success) {
        setTasks(data.tasks || []);
      }
    } catch (err) {
      console.error('Error loading tasks:', err);
    }
  };

  const parseInstruction = async () => {
    if (!instruction.trim()) return;

    setParsing(true);
    setError(null);
    setParsedTask(null);

    try {
      const response = await fetch('/api/task-instruction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'parse', instruction }),
      });

      const data = await response.json();
      if (data.success) {
        setParsedTask(data.task);
      } else {
        setError(data.error || 'Failed to parse instruction');
      }
    } catch (err) {
      setError('Failed to parse instruction');
    } finally {
      setParsing(false);
    }
  };

  const createTask = async () => {
    if (!instruction.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/task-instruction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create', instruction }),
      });

      const data = await response.json();
      if (data.success) {
        setInstruction('');
        setParsedTask(null);
        loadTasks();
        onTaskCreated?.(data.task);
      } else {
        setError(data.error || 'Failed to create task');
      }
    } catch (err) {
      setError('Failed to create task');
    } finally {
      setLoading(false);
    }
  };

  const toggleTask = async (taskId: string) => {
    try {
      await fetch('/api/task-instruction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle', taskId }),
      });
      loadTasks();
    } catch (err) {
      console.error('Error toggling task:', err);
    }
  };

  const deleteTask = async (taskId: string) => {
    try {
      await fetch('/api/task-instruction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', taskId }),
      });
      loadTasks();
    } catch (err) {
      console.error('Error deleting task:', err);
    }
  };

  const runTaskNow = async (taskId: string) => {
    try {
      const response = await fetch('/api/task-instruction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'run', taskId }),
      });
      const data = await response.json();
      if (data.success) {
        loadTasks();
      }
    } catch (err) {
      console.error('Error running task:', err);
    }
  };

  const formatSchedule = (schedule: string) => {
    const scheduleMap: Record<string, string> = {
      'daily': 'Daily',
      'weekly': 'Weekly',
      'every:wednesday': 'Every Wednesday',
      'every:monday': 'Every Monday',
      'every:friday': 'Every Friday',
    };
    return scheduleMap[schedule] || schedule;
  };

  const formatDate = (timestamp?: number) => {
    if (!timestamp) return 'Never';
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className="space-y-6">
      {/* New Task Input */}
      <div className="bg-slate-800 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-white mb-3">Create Scheduled Task</h3>
        <p className="text-gray-400 text-sm mb-3">
          Describe what you want to automate. The AI will parse your instruction and create a scheduled task.
        </p>
        
        <textarea
          value={instruction}
          onChange={(e) => setInstruction(e.target.value)}
          placeholder="Example: Check the DISP SBIR website every Wednesday for new SBIRs from Space Force dealing with space domain awareness."
          className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 resize-none"
          rows={3}
        />

        <div className="flex gap-2 mt-3">
          <button
            onClick={parseInstruction}
            disabled={parsing || !instruction.trim()}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 text-white rounded text-sm"
          >
            {parsing ? 'Parsing...' : 'Preview'}
          </button>
          <button
            onClick={createTask}
            disabled={loading || !instruction.trim()}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-600 text-white rounded text-sm"
          >
            {loading ? 'Creating...' : 'Create Task'}
          </button>
        </div>

        {error && (
          <div className="mt-3 p-3 bg-red-900/50 border border-red-700 rounded text-red-300 text-sm">
            {error}
          </div>
        )}

        {parsedTask && (
          <div className="mt-3 p-3 bg-slate-700 rounded">
            <h4 className="text-white font-medium mb-2">Parsed Task:</h4>
            <div className="text-sm space-y-1">
              <p><span className="text-gray-400">Name:</span> <span className="text-white">{parsedTask.name}</span></p>
              <p><span className="text-gray-400">Description:</span> <span className="text-white">{parsedTask.description}</span></p>
              <p><span className="text-gray-400">Schedule:</span> <span className="text-white">{formatSchedule(parsedTask.schedule)}</span></p>
              {parsedTask.keywords && parsedTask.keywords.length > 0 && (
                <p><span className="text-gray-400">Keywords:</span> <span className="text-white">{parsedTask.keywords.join(', ')}</span></p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Active Tasks */}
      <div className="bg-slate-800 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-white mb-3">Scheduled Tasks</h3>
        
        {tasks.length === 0 ? (
          <p className="text-gray-400 text-sm">No scheduled tasks yet. Create one above.</p>
        ) : (
          <div className="space-y-3">
            {tasks.map((task) => (
              <div key={task.id} className="bg-slate-700 rounded p-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="text-white font-medium">{task.name}</h4>
                    <p className="text-gray-400 text-sm">{task.description || task.prompt?.slice(0, 80)}</p>
                    <div className="flex gap-3 mt-1 text-xs">
                      <span className={`px-2 py-0.5 rounded ${task.enabled ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'}`}>
                        {task.enabled ? 'Enabled' : 'Disabled'}
                      </span>
                      <span className="text-gray-500">{formatSchedule(task.schedule)}</span>
                      <span className="text-gray-500">Runs: {task.runCount}</span>
                    </div>
                    {task.lastRun && (
                      <p className="text-gray-500 text-xs mt-1">
                        Last run: {formatDate(task.lastRun)}
                        {task.lastResult && ` - ${task.lastResult.slice(0, 50)}...`}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => runTaskNow(task.id)}
                      className="px-2 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded text-xs"
                      title="Run now"
                    >
                      Run
                    </button>
                    <button
                      onClick={() => toggleTask(task.id)}
                      className="px-2 py-1 bg-slate-600 hover:bg-slate-500 text-white rounded text-xs"
                      title={task.enabled ? 'Disable' : 'Enable'}
                    >
                      {task.enabled ? 'Disable' : 'Enable'}
                    </button>
                    <button
                      onClick={() => deleteTask(task.id)}
                      className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs"
                      title="Delete"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}