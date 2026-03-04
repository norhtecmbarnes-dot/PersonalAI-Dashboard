'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface SystemStatus {
  initialized: boolean;
  running: boolean;
  startTime: number;
  uptime: number;
  services: ServiceStatus[];
  lastError?: string;
}

interface ServiceStatus {
  name: string;
  status: 'starting' | 'running' | 'stopping' | 'stopped' | 'error' | 'warning';
  message?: string;
  lastCheck: number;
}

interface SchedulerStatus {
  isRunning: boolean;
  checkInterval: number;
}

interface TaskInfo {
  id: string;
  name: string;
  taskType: string;
  enabled: boolean;
  lastRun?: number;
  runCount: number;
  successCount: number;
  failCount: number;
}

export default function SystemPage() {
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [schedulerStatus, setSchedulerStatus] = useState<SchedulerStatus | null>(null);
  const [tasks, setTasks] = useState<TaskInfo[]>([]);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchAllStatus();
    const interval = setInterval(fetchAllStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchAllStatus = async () => {
    try {
      const [sysRes, schedRes, tasksRes] = await Promise.all([
        fetch('/api/system?action=status'),
        fetch('/api/tasks?action=status'),
        fetch('/api/tasks?action=list')
      ]);
      const sysData = await sysRes.json();
      const schedData = await schedRes.json();
      const tasksData = await tasksRes.json();
      setSystemStatus(sysData);
      setSchedulerStatus(schedData);
      setTasks(tasksData.tasks || []);
    } catch (error) {
      console.error('Error fetching status:', error);
    }
  };

  const handleStart = async () => {
    setActionLoading('start');
    try {
      const response = await fetch('/api/system', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start' }),
      });
      const data = await response.json();
      setSystemStatus(data.status);
    } catch (error) {
      console.error('Error starting system:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleStop = async () => {
    setActionLoading('stop');
    try {
      const response = await fetch('/api/system', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'shutdown' }),
      });
      const data = await response.json();
      setSystemStatus(data.status);
    } catch (error) {
      console.error('Error stopping system:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleRestart = async () => {
    setActionLoading('restart');
    try {
      await fetch('/api/system', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'shutdown' }),
      });
      await new Promise(resolve => setTimeout(resolve, 1000));
      const response = await fetch('/api/system', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start' }),
      });
      const data = await response.json();
      setSystemStatus(data.status);
    } catch (error) {
      console.error('Error restarting system:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleTriggerHeartbeat = async () => {
    setActionLoading('heartbeat');
    try {
      const response = await fetch('/api/heartbeat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await response.json();
      alert(`Heartbeat triggered!\nTasks run: ${Object.keys(data.tasks || {}).length}\nStatus: ${data.status}`);
      fetchAllStatus();
    } catch (error) {
      console.error('Error triggering heartbeat:', error);
      alert('Failed to trigger heartbeat');
    } finally {
      setActionLoading(null);
    }
  };

  const formatUptime = (ms: number): string => {
    if (!ms || ms < 0) return '0s';
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h ${minutes % 60}m`;
    if (hours > 0) return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  const formatDate = (timestamp: number): string => {
    if (!timestamp) return 'Never';
    return new Date(timestamp).toLocaleString();
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'running': return 'text-green-400';
      case 'starting':
      case 'stopping': return 'text-yellow-400';
      case 'stopped': return 'text-gray-400';
      case 'error': return 'text-red-400';
      case 'warning': return 'text-orange-400';
      default: return 'text-gray-400';
    }
  };

  const getStatusBg = (status: string): string => {
    switch (status) {
      case 'running': return 'bg-green-900/30 border-green-700';
      case 'starting':
      case 'stopping': return 'bg-yellow-900/30 border-yellow-700';
      case 'stopped': return 'bg-gray-900/30 border-gray-700';
      case 'error': return 'bg-red-900/30 border-red-700';
      default: return 'bg-slate-800/50 border-slate-700';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">System Control</h1>
            <p className="text-slate-400 mt-1">Start, stop, and monitor all AI Dashboard processes</p>
          </div>
          <Link href="/" className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600">
            ← Back to Chat
          </Link>
        </div>

        {/* System Status Card */}
        <div className="bg-slate-800/50 backdrop-blur rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className={`w-4 h-4 rounded-full ${systemStatus?.running ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`}></div>
              <div>
                <h2 className="text-xl font-semibold text-white">
                  {systemStatus?.running ? 'System Running' : 'System Stopped'}
                </h2>
                {systemStatus?.running && (
                  <p className="text-slate-400 text-sm">
                    Uptime: {formatUptime(systemStatus.uptime)}
                  </p>
                )}
              </div>
            </div>
            <div className="flex gap-3">
              {!systemStatus?.running ? (
                <button
                  onClick={handleStart}
                  disabled={actionLoading !== null}
                  className="px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-slate-600 
                             text-white font-bold rounded-lg transition-colors flex items-center gap-2"
                >
                  {actionLoading === 'start' ? (
                    <>
                      <span className="animate-spin">◐</span>
                      Starting...
                    </>
                  ) : (
                    <>
                      <span>▶</span>
                      Start All
                    </>
                  )}
                </button>
              ) : (
                <button
                  onClick={handleStop}
                  disabled={actionLoading !== null}
                  className="px-6 py-3 bg-red-600 hover:bg-red-700 disabled:bg-slate-600 
                             text-white font-bold rounded-lg transition-colors flex items-center gap-2"
                >
                  {actionLoading === 'stop' ? (
                    <>
                      <span className="animate-spin">◐</span>
                      Stopping...
                    </>
                  ) : (
                    <>
                      <span>■</span>
                      Stop All
                    </>
                  )}
                </button>
              )}
              <button
                onClick={handleRestart}
                disabled={actionLoading !== null || !systemStatus?.running}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 
                           text-white font-bold rounded-lg transition-colors flex items-center gap-2"
              >
                {actionLoading === 'restart' ? (
                  <>
                    <span className="animate-spin">◐</span>
                    Restarting...
                  </>
                ) : (
                  <>
                    <span>↻</span>
                    Restart
                  </>
                )}
              </button>
            </div>
          </div>

          {systemStatus?.lastError && (
            <div className="bg-red-900/30 border border-red-700 rounded-lg p-3 mb-4">
              <p className="text-red-300">⚠ {systemStatus.lastError}</p>
            </div>
          )}
        </div>

        {/* Services Grid */}
        <h3 className="text-xl font-semibold text-white">Services</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {systemStatus?.services?.map((service) => (
            <div 
              key={service.name} 
              className={`border rounded-lg p-4 ${getStatusBg(service.status)}`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-white">{service.name}</span>
                <span className={`capitalize font-medium ${getStatusColor(service.status)}`}>
                  {service.status}
                </span>
              </div>
              {service.message && (
                <p className="text-sm text-slate-400">{service.message}</p>
              )}
              <p className="text-xs text-slate-500 mt-2">
                Last check: {formatDate(service.lastCheck)}
              </p>
            </div>
          ))}
        </div>

        {/* Task Scheduler */}
        <div className="bg-slate-800/50 backdrop-blur rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold text-white">Task Scheduler</h3>
            <div className="flex items-center gap-2">
              <span className={`w-3 h-3 rounded-full ${schedulerStatus?.isRunning ? 'bg-green-400' : 'bg-gray-400'}`}></span>
              <span className={schedulerStatus?.isRunning ? 'text-green-400' : 'text-gray-400'}>
                {schedulerStatus?.isRunning ? 'Running' : 'Stopped'}
              </span>
            </div>
          </div>

          {tasks.length > 0 && (
            <div className="space-y-2">
              <div className="grid grid-cols-5 gap-4 text-xs text-slate-400 font-medium pb-2 border-b border-slate-700">
                <span>Task</span>
                <span>Type</span>
                <span>Status</span>
                <span>Last Run</span>
                <span>Runs</span>
              </div>
              {tasks.map((task) => (
                <div key={task.id} className="grid grid-cols-5 gap-4 text-sm py-2">
                  <span className="text-white">{task.name}</span>
                  <span className="text-slate-400">{task.taskType}</span>
                  <span className={task.enabled ? 'text-green-400' : 'text-gray-400'}>
                    {task.enabled ? 'Enabled' : 'Disabled'}
                  </span>
                  <span className="text-slate-400">{formatDate(task.lastRun || 0)}</span>
                  <span className="text-slate-400">
                    {task.runCount} ({task.successCount}✓ {task.failCount}✕)
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="bg-slate-800/50 backdrop-blur rounded-xl p-6">
          <h3 className="text-xl font-semibold text-white mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link href="/tasks" className="px-4 py-3 bg-slate-700 hover:bg-slate-600 rounded-lg text-white text-center">
              Manage Tasks
            </Link>
            <button
              onClick={handleTriggerHeartbeat}
              disabled={actionLoading !== null}
              className="px-4 py-3 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 rounded-lg text-white text-center"
            >
              {actionLoading === 'heartbeat' ? 'Running...' : 'Trigger Heartbeat'}
            </button>
            <Link href="/self-improvement" className="px-4 py-3 bg-slate-700 hover:bg-slate-600 rounded-lg text-white text-center">
              View Efficiency
            </Link>
            <Link href="/security" className="px-4 py-3 bg-slate-700 hover:bg-slate-600 rounded-lg text-white text-center">
              Security Scan
            </Link>
          </div>
        </div>

        {/* Documentation Reference */}
        <div className="bg-slate-800/30 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-3">System Control Documentation</h3>
          <div className="space-y-2 text-slate-400 text-sm">
            <p><strong className="text-white">Start All Services:</strong> Initializes database, memory service, task scheduler, and enables all background processes.</p>
            <p><strong className="text-white">Stop All Services:</strong> Gracefully shuts down task scheduler, closes database connections, and stops all background tasks.</p>
            <p><strong className="text-white">Restart:</strong> Performs a full stop followed by start.</p>
            <p><strong className="text-white">Services Managed:</strong></p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li><strong>Database</strong> - SQLite persistence layer</li>
              <li><strong>Memory Service</strong> - MEMORY.md and persistent context</li>
              <li><strong>Task Scheduler</strong> - Scheduled tasks (intelligence, security, etc.)</li>
              <li><strong>Security Scanner</strong> - Periodic vulnerability scans</li>
              <li><strong>Intelligence Service</strong> - Daily report generation</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}