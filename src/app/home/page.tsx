'use client';

import { useState, useEffect } from 'react';
import type { ChatMessage } from '@/types';
import type { ScheduledTask } from '@/lib/services/task-scheduler';

export default function HomePage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [tasks, setTasks] = useState<ScheduledTask[]>([]);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [newTask, setNewTask] = useState({ name: '', schedule: 'manual', type: 'research' });

  useEffect(() => {
    loadMessages();
    loadTasks();
    // Heartbeat runs automatically via task scheduler
  }, []);

  const loadMessages = async () => {
    try {
      const res = await fetch('/api/heartbeat', { method: 'POST' });
      const data = await res.json();
      setMessages(p => [
        ...p,
        {
          id: `m_${Date.now()}`,
          role: 'expert',
          content: `✓ Heartbeat executed: ${data.result || 'Success'}`,
          timestamp: new Date(),
        },
      ]);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const loadTasks = async () => {
    try {
      const res = await fetch('/api/tasks?action=list');
      const data = await res.json();
      setTasks(data.tasks || []);
    } catch (e) {
      console.error(e);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMsg: ChatMessage = {
      id: `m_${Date.now()}`,
      role: 'user',
      content: input,
      timestamp: new Date(),
    };
    setMessages(p => [...p, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: input, model: 'qwen3.5:9b', searchMode: true }),
      });
      const data = await res.json();
      const aiMsg: ChatMessage = {
        id: `m_${Date.now()}`,
        role: 'expert',
        content: data.message?.content || data.message || '',
        timestamp: new Date(),
      };
      setMessages(p => [...p, aiMsg]);

      // Auto-create task if user requests it
      if (input.startsWith('/task') || input.includes('schedule') || input.includes('reminder')) {
        await createTaskFromChat(input);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const createTaskFromChat = async (chatInput: string) => {
    const name = chatInput
      .replace('/task', '')
      .replace('create', '')
      .replace('a task', '')
      .replace('to', '')
      .split('schedule')[0]
      .trim();
    const schedule = chatInput.includes('daily')
      ? 'daily'
      : chatInput.includes('hourly')
        ? 'hourly'
        : 'manual';
    const type =
      chatInput.includes('bid') || chatInput.includes('sam')
        ? 'bid'
        : chatInput.includes('research')
          ? 'research'
          : 'reflection';

    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, schedule, taskType: type }),
      });
      const data = await res.json();
      if (data.success) {
        setMessages(p => [
          ...p,
          {
            id: `m_${Date.now()}`,
            role: 'expert',
            content: `✓ Task created: "${name}" (${schedule})`,
            timestamp: new Date(),
          },
        ]);
        loadTasks();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const triggerHeartbeat = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/heartbeat', { method: 'POST' });
      const data = await res.json();
      setMessages(p => [
        ...p,
        {
          id: `m_${Date.now()}`,
          role: 'expert',
          content: `✓ Heartbeat executed: ${data.result || 'Success'}`,
          timestamp: new Date(),
        },
      ]);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="max-w-5xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white">Home</h1>
            <p className="text-slate-400 mt-1">Chat with AI, create tasks, monitor heartbeat</p>
          </div>
          <button
            onClick={triggerHeartbeat}
            disabled={isLoading}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg disabled:opacity-50"
          >
            {isLoading ? 'Running...' : '⚡ Run Heartbeat'}
          </button>
        </div>

        {/* Chat */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 mb-6">
          <div className="space-y-3 max-h-96 overflow-auto mb-4">
            {messages.map(m => (
              <div
                key={m.id}
                className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] p-3 rounded-lg ${m.role === 'user' ? 'bg-purple-600/20 border border-purple-500/30 text-purple-100' : 'bg-slate-800/50 border border-slate-700 text-slate-300'}`}
                >
                  <p className="text-sm">{m.content}</p>
                  <p className="text-xs text-slate-500 mt-1">
                    {new Date(m.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <form onSubmit={sendMessage} className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Chat or use /task 'Research NASA bids' schedule:daily"
              className="flex-1 px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg disabled:opacity-50"
            >
              Send
            </button>
          </form>
        </div>

        {/* Tasks */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-white">Scheduled Tasks</h2>
            <button
              onClick={() => setShowTaskModal(true)}
              className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-sm rounded-lg"
            >
              + New Task
            </button>
          </div>
          <div className="space-y-2">
            {tasks.length > 0 ? (
              tasks.map(t => (
                <div
                  key={t.id}
                  className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg border border-slate-700"
                >
                  <div>
                    <p className="text-white font-medium">{t.name}</p>
                    <p className="text-xs text-slate-500">
                      {t.taskType} • {t.schedule} • Last:{' '}
                      {t.lastRun ? new Date(t.lastRun).toLocaleString() : 'Never'}
                    </p>
                  </div>
                  <span
                    className={`px-2 py-1 text-xs rounded-full ${t.enabled ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700 text-slate-400'}`}
                  >
                    {t.enabled ? 'Active' : 'Paused'}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-slate-500 text-center py-8">
                No tasks scheduled. Use /task in chat to create one.
              </p>
            )}
          </div>
        </div>

        {/* New Task Modal */}
        {showTaskModal && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur flex items-center justify-center z-50">
            <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 max-w-md w-full mx-4">
              <h3 className="text-xl font-semibold text-white mb-4">Create Task</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Name</label>
                  <input
                    type="text"
                    value={newTask.name}
                    onChange={e => setNewTask({ ...newTask, name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Research SAM.gov daily"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Type</label>
                  <select
                    value={newTask.type}
                    onChange={e => setNewTask({ ...newTask, type: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                  >
                    <option value="research">Research</option>
                    <option value="bid">Bid Workflow</option>
                    <option value="reflection">Self-Reflection</option>
                    <option value="brand">Brand Scan</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Schedule</label>
                  <select
                    value={newTask.schedule}
                    onChange={e => setNewTask({ ...newTask, schedule: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                  >
                    <option value="manual">Manual</option>
                    <option value="hourly">Hourly</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowTaskModal(false)}
                  className="px-4 py-2 text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    createTaskFromChat(`/task ${newTask.name} ${newTask.schedule}`);
                    setShowTaskModal(false);
                  }}
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg"
                >
                  Create
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
