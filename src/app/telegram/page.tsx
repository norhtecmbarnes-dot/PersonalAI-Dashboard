'use client';

import { useState, useEffect } from 'react';

interface TelegramConfig {
  enabled: boolean;
  botToken: string;
  chatWithAI: boolean;
  allowedUsers: string[];
}

interface BotInfo {
  id: number;
  username: string;
  first_name: string;
}

interface PollingStatus {
  polling: boolean;
  enabled: boolean;
}

export default function TelegramPage() {
  const [config, setConfig] = useState<TelegramConfig>({
    enabled: false,
    botToken: '',
    chatWithAI: true,
    allowedUsers: [],
  });
  const [botInfo, setBotInfo] = useState<BotInfo | null>(null);
  const [webhookInfo, setWebhookInfo] = useState<any>(null);
  const [pollingStatus, setPollingStatus] = useState<PollingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);
  const [newUser, setNewUser] = useState('');

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const response = await fetch('/api/telegram/config');
      const data = await response.json();
      setConfig(data.config);
      
      if (data.config.botToken) {
        await checkStatus();
        await checkPollingStatus();
      }
    } catch (error) {
      console.error('Error loading config:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkStatus = async () => {
    try {
      const response = await fetch('/api/telegram/config?action=test');
      const data = await response.json();
      if (data.bot) {
        setBotInfo(data.bot);
      }
      if (data.webhook) {
        setWebhookInfo(data.webhook);
      }
    } catch (error) {
      console.error('Error checking status:', error);
    }
  };

  const checkPollingStatus = async () => {
    try {
      const response = await fetch('/api/telegram/polling');
      const data = await response.json();
      setPollingStatus(data);
    } catch (error) {
      console.error('Error checking polling status:', error);
    }
  };

  const saveConfig = async () => {
    setSaving(true);
    setMessage(null);
    
    try {
      const response = await fetch('/api/telegram/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'save', config }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setMessage({ type: 'success', text: data.message || 'Configuration saved!' });
        setBotInfo(data.bot);
        await checkStatus();
        await checkPollingStatus();
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to save configuration' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to save configuration' });
    } finally {
      setSaving(false);
    }
  };

  const startPolling = async () => {
    try {
      setMessage(null);
      const response = await fetch('/api/telegram/polling', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start' }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setMessage({ type: 'success', text: 'Polling started! Your bot is now receiving messages.' });
        await checkPollingStatus();
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to start polling' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to start polling' });
    }
  };

  const stopPolling = async () => {
    try {
      const response = await fetch('/api/telegram/polling', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'stop' }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setMessage({ type: 'success', text: 'Polling stopped.' });
        await checkPollingStatus();
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to stop polling' });
    }
  };

  const setupWebhook = async () => {
    const baseUrl = window.location.origin;
    const webhookUrl = `${baseUrl}/api/telegram`;
    
    try {
      const response = await fetch('/api/telegram/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'setWebhook', config: { webhookUrl } }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setMessage({ type: 'success', text: 'Webhook configured!' });
        await checkStatus();
      } else {
        setMessage({ type: 'error', text: 'Failed to set webhook' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to set webhook' });
    }
  };

  const registerCommands = async () => {
    try {
      const response = await fetch('/api/telegram/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'setup' }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setMessage({ type: 'success', text: 'Commands registered!' });
      } else {
        setMessage({ type: 'error', text: 'Failed to register commands' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to register commands' });
    }
  };

  const addUser = () => {
    if (newUser.trim()) {
      setConfig(prev => ({
        ...prev,
        allowedUsers: [...prev.allowedUsers, newUser.trim()],
      }));
      setNewUser('');
    }
  };

  const removeUser = (index: number) => {
    setConfig(prev => ({
      ...prev,
      allowedUsers: prev.allowedUsers.filter((_, i) => i !== index),
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white">Telegram Integration</h1>
          <p className="text-gray-400 mt-1">
            Connect Telegram to interact with your AI assistant
          </p>
        </div>

        {/* Status Card */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-white mb-4">Connection Status</h2>
          
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-gray-700 rounded-lg p-4">
              <div className="text-gray-400 text-sm">Bot</div>
              {botInfo ? (
                <div className="text-green-400">@{botInfo.username}</div>
              ) : (
                <div className="text-gray-500">Not connected</div>
              )}
            </div>
            
            <div className="bg-gray-700 rounded-lg p-4">
              <div className="text-gray-400 text-sm">Mode</div>
              {pollingStatus?.polling ? (
                <div className="text-green-400">Polling Active</div>
              ) : webhookInfo?.url ? (
                <div className="text-blue-400">Webhook</div>
              ) : (
                <div className="text-gray-500">Inactive</div>
              )}
            </div>

            <div className="bg-gray-700 rounded-lg p-4">
              <div className="text-gray-400 text-sm">Status</div>
              {pollingStatus?.polling ? (
                <div className="text-green-400 animate-pulse">Receiving messages</div>
              ) : (
                <div className="text-gray-500">Not receiving</div>
              )}
            </div>
          </div>

          <div className="flex gap-2 mt-4 flex-wrap">
            <button
              onClick={checkStatus}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded text-sm"
            >
              Refresh Status
            </button>
            {botInfo && !webhookInfo?.url && !pollingStatus?.polling && (
              <button
                onClick={startPolling}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded text-sm"
              >
                Start Polling
              </button>
            )}
            {pollingStatus?.polling && (
              <button
                onClick={stopPolling}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded text-sm"
              >
                Stop Polling
              </button>
            )}
            {botInfo && !pollingStatus?.polling && (
              <>
                <button
                  onClick={setupWebhook}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded text-sm"
                >
                  Set Webhook
                </button>
                <button
                  onClick={registerCommands}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm"
                >
                  Register Commands
                </button>
              </>
            )}
          </div>
        </div>

        {/* Configuration Card */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-white mb-4">Configuration</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-gray-400 text-sm mb-2">Bot Token</label>
              <input
                type="text"
                value={config.botToken}
                onChange={(e) => setConfig(prev => ({ ...prev, botToken: e.target.value }))}
                placeholder="Enter your Telegram bot token"
                className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded text-white"
              />
              <p className="text-gray-500 text-xs mt-1">
                Get your token from @BotFather on Telegram
              </p>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="enabled"
                checked={config.enabled}
                onChange={(e) => setConfig(prev => ({ ...prev, enabled: e.target.checked }))}
                className="w-4 h-4"
              />
              <label htmlFor="enabled" className="text-white">Enable Telegram Bot</label>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="chatWithAI"
                checked={config.chatWithAI}
                onChange={(e) => setConfig(prev => ({ ...prev, chatWithAI: e.target.checked }))}
                className="w-4 h-4"
              />
              <label htmlFor="chatWithAI" className="text-white">Allow AI Chat</label>
            </div>
          </div>

          <button
            onClick={saveConfig}
            disabled={saving}
            className="mt-4 px-6 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white rounded"
          >
            {saving ? 'Saving...' : 'Save Configuration'}
          </button>
        </div>

        {/* Allowed Users Card */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-white mb-4">Allowed Users (Optional)</h2>
          <p className="text-gray-400 text-sm mb-4">
            Leave empty to allow all users, or specify allowed user IDs/usernames
          </p>
          
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={newUser}
              onChange={(e) => setNewUser(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addUser()}
              placeholder="User ID or username"
              className="flex-1 px-4 py-2 bg-gray-900 border border-gray-700 rounded text-white"
            />
            <button
              onClick={addUser}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded"
            >
              Add
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            {config.allowedUsers.map((user, index) => (
              <span
                key={index}
                className="px-3 py-1 bg-gray-700 text-white rounded flex items-center gap-2"
              >
                {user}
                <button
                  onClick={() => removeUser(index)}
                  className="text-gray-400 hover:text-red-400"
                >
                  ×
                </button>
              </span>
            ))}
            {config.allowedUsers.length === 0 && (
              <span className="text-gray-500">All users allowed</span>
            )}
          </div>
        </div>

        {/* Instructions Card */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Setup Instructions</h2>
          
          <div className="space-y-6">
            <div>
              <h3 className="text-purple-400 font-semibold mb-2">Option 1: Polling (Recommended)</h3>
              <p className="text-gray-300 text-sm mb-2">
                Works without a public URL. The bot actively checks for new messages.
              </p>
              <ol className="text-gray-300 space-y-1 text-sm list-decimal list-inside">
                <li>Enter your bot token from @BotFather</li>
                <li>Click "Save Configuration"</li>
                <li>Click "Start Polling"</li>
                <li>Chat with your bot on Telegram!</li>
              </ol>
            </div>

            <div>
              <h3 className="text-purple-400 font-semibold mb-2">Option 2: Webhook</h3>
              <p className="text-gray-300 text-sm mb-2">
                Requires a public URL. Telegram pushes messages to your server.
              </p>
              <ol className="text-gray-300 space-y-1 text-sm list-decimal list-inside">
                <li>Set up a tunnel (ngrok, cloudflare, etc.)</li>
                <li>Enter your bot token</li>
                <li>Click "Set Webhook"</li>
              </ol>
            </div>

            <div className="mt-4 p-4 bg-gray-700 rounded">
              <div className="text-gray-400 text-sm">Available Commands:</div>
              <div className="text-white text-sm mt-2 font-mono">
                /start - Start the bot<br/>
                /help - Show help<br/>
                /search &lt;query&gt; - Search the web<br/>
                /status - Check status
              </div>
            </div>
          </div>
        </div>

        {/* Message */}
        {message && (
          <div className={`mt-4 p-4 rounded-lg ${
            message.type === 'success' ? 'bg-green-900/50 text-green-300' : 'bg-red-900/50 text-red-300'
          }`}>
            {message.text}
          </div>
        )}
      </div>
    </div>
  );
}