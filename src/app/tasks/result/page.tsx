'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

interface TaskResult {
  id: string;
  name: string;
  taskType: string;
  lastRun: number;
  lastResult?: string;
  lastError?: string;
  success: boolean;
  runCount: number;
  successCount: number;
  failCount: number;
}

function TaskResultContent() {
  const searchParams = useSearchParams();
  const taskId = searchParams.get('id');
  const [task, setTask] = useState<TaskResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (taskId) {
      loadTask();
    }
  }, [taskId]);

  const loadTask = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/tasks?action=list`);
      const data = await res.json();
      const found = (data.tasks || []).find((t: any) => t.id === taskId);
      if (found) {
        setTask({
          id: found.id,
          name: found.name,
          taskType: found.taskType,
          lastRun: found.lastRun,
          lastResult: found.lastResult,
          lastError: found.lastError,
          success: found.successCount > found.failCount,
          runCount: found.runCount,
          successCount: found.successCount,
          failCount: found.failCount,
        });
      }
    } catch (e) {
      console.error('Failed to load task:', e);
    }
    setLoading(false);
  };

  if (!taskId) {
    return (
      <div className="min-h-screen bg-gray-900 p-6">
        <div className="max-w-4xl mx-auto">
          <Link href="/tasks" className="text-blue-400 hover:text-blue-300 mb-4 inline-block">← Back to Tasks</Link>
          <h1 className="text-2xl font-bold text-white mt-4">No Task Selected</h1>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 p-6 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="min-h-screen bg-gray-900 p-6">
        <div className="max-w-4xl mx-auto">
          <Link href="/tasks" className="text-blue-400 hover:text-blue-300 mb-4 inline-block">← Back to Tasks</Link>
          <h1 className="text-2xl font-bold text-white mt-4">Task Not Found</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-4xl mx-auto">
        <Link href="/tasks" className="text-blue-400 hover:text-blue-300 mb-4 inline-block">← Back to Tasks</Link>
        
        <div className="bg-gray-800 rounded-lg p-6 mt-4">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-white">{task.name}</h1>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm px-2 py-0.5 bg-gray-700 rounded text-gray-300">{task.taskType}</span>
                <span className={`text-sm px-2 py-0.5 rounded ${task.success ? 'bg-green-900/50 text-green-300' : 'bg-red-900/50 text-red-300'}`}>
                  {task.success ? 'Success' : 'Failed'}
                </span>
              </div>
            </div>
            <div className="text-right text-sm text-gray-400">
              <div>Last run: {new Date(task.lastRun).toLocaleString()}</div>
              <div>Runs: {task.runCount} (✓ {task.successCount} / ✗ {task.failCount})</div>
            </div>
          </div>

          {task.lastError && (
            <div className="mb-6 p-4 bg-red-900/30 border border-red-800 rounded-lg">
              <h3 className="text-red-300 font-medium mb-2">Error</h3>
              <pre className="text-red-200 text-sm whitespace-pre-wrap">{task.lastError}</pre>
            </div>
          )}

          {task.lastResult && (
            <div className="mb-6 p-4 bg-green-900/30 border border-green-800 rounded-lg">
              <h3 className="text-green-300 font-medium mb-2">Result</h3>
              <pre className="text-green-200 text-sm whitespace-pre-wrap">{task.lastResult}</pre>
            </div>
          )}

          {!task.lastResult && !task.lastError && (
            <div className="p-4 bg-gray-700/50 rounded-lg text-gray-400">
              No result data available.
            </div>
          )}

          <div className="mt-6 flex gap-3">
            <Link 
              href="/tasks" 
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white"
            >
              Back to Tasks
            </Link>
            <Link 
              href="/system" 
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-white"
            >
              System Control
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TaskResultPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-900 p-6 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    }>
      <TaskResultContent />
    </Suspense>
  );
}