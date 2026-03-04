'use client';

import { useState, useEffect } from 'react';

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

export function SystemControls() {
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [schedulerStatus, setSchedulerStatus] = useState<SchedulerStatus | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchStatus();
    // Poll less frequently (30 seconds instead of 5) to reduce console spam
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchStatus = async () => {
    try {
      const [sysRes, schedRes] = await Promise.all([
        fetch('/api/system?action=status'),
        fetch('/api/tasks?action=status')
      ]);
      const sysData = await sysRes.json();
      const schedData = await schedRes.json();
      setSystemStatus(sysData);
      setSchedulerStatus(schedData);
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

  const formatUptime = (ms: number): string => {
    if (!ms || ms < 0) return '0s';
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
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
      case 'running': return 'bg-green-900/50';
      case 'starting':
      case 'stopping': return 'bg-yellow-900/50';
      case 'stopped': return 'bg-gray-900/50';
      case 'error': return 'bg-red-900/50';
      case 'warning': return 'bg-orange-900/50';
      default: return 'bg-gray-900/50';
    }
  };

  const getStatusIcon = (status: string): string => {
    switch (status) {
      case 'running': return '●';
      case 'starting':
      case 'stopping': return '◐';
      case 'stopped': return '○';
      case 'error': return '✕';
      case 'warning': return '⚠';
      default: return '○';
    }
  };

  return (
    <div className="bg-slate-800/50 backdrop-blur rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">System Control</h3>
        <div className="flex items-center gap-2">
          <span className={`w-3 h-3 rounded-full ${systemStatus?.running ? 'bg-green-400' : 'bg-red-400'}`}></span>
          <span className={getStatusColor(systemStatus?.running ? 'running' : 'stopped')}>
            {systemStatus?.running ? 'Running' : 'Stopped'}
          </span>
        </div>
      </div>

      {systemStatus?.running && systemStatus.uptime > 0 && (
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <span>Uptime:</span>
          <span className="text-white font-medium">{formatUptime(systemStatus.uptime)}</span>
        </div>
      )}

      {systemStatus?.lastError && (
        <div className="bg-red-900/30 border border-red-700 rounded p-2 text-red-300 text-sm">
          ⚠ {systemStatus.lastError}
        </div>
      )}

      <div className="flex gap-2">
        {!systemStatus?.running ? (
          <button
            onClick={handleStart}
            disabled={actionLoading !== null}
            className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-bold px-4 py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {actionLoading === 'start' ? (
              <>
                <span className="animate-spin">◐</span>
                Starting...
              </>
            ) : (
              <>
                <span>▶</span>
                Start All Services
              </>
            )}
          </button>
        ) : (
          <button
            onClick={handleStop}
            disabled={actionLoading !== null}
            className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-bold px-4 py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {actionLoading === 'stop' ? (
              <>
                <span className="animate-spin">◐</span>
                Stopping...
              </>
            ) : (
              <>
                <span>■</span>
                Stop All Services
              </>
            )}
          </button>
        )}
        <button
          onClick={handleRestart}
          disabled={actionLoading !== null || !systemStatus?.running}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-bold px-4 py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
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

      {/* Services Status */}
      {systemStatus?.services && systemStatus.services.length > 0 && (
        <div className="border-t border-slate-700 pt-4">
          <h4 className="text-white font-medium mb-3">Services</h4>
          <div className="space-y-2">
            {systemStatus.services.map((service) => (
              <div 
                key={service.name} 
                className={`flex items-center justify-between text-sm p-2 rounded ${getStatusBg(service.status)}`}
              >
                <div className="flex items-center gap-2">
                  <span className={getStatusColor(service.status)}>{getStatusIcon(service.status)}</span>
                  <span className="text-slate-200">{service.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  {service.message && (
                    <span className="text-xs text-slate-500">{service.message}</span>
                  )}
                  <span className={`capitalize ${getStatusColor(service.status)}`}>
                    {service.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Scheduler Status */}
      {schedulerStatus && (
        <div className="border-t border-slate-700 pt-4">
          <h4 className="text-white font-medium mb-2">Task Scheduler</h4>
          <div className="flex items-center gap-2 text-sm">
            <span className={`w-2 h-2 rounded-full ${schedulerStatus.isRunning ? 'bg-green-400' : 'bg-gray-400'}`}></span>
            <span className={schedulerStatus.isRunning ? 'text-green-400' : 'text-gray-400'}>
              {schedulerStatus.isRunning ? 'Running' : 'Stopped'}
            </span>
            <span className="text-slate-500">
              (Check interval: {schedulerStatus.checkInterval / 1000}s)
            </span>
          </div>
        </div>
      )}
    </div>
  );
}