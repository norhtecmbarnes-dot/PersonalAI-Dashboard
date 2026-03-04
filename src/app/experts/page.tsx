'use client';

import { useState, useEffect } from 'react';

interface Expert {
  id: string;
  name: string;
  role: string;
  description: string;
  capabilities: string[];
  systemPrompt: string;
  personality?: string;
  editable: boolean;
  createdAt: number;
  updatedAt: number;
}

export default function ExpertsPage() {
  const [experts, setExperts] = useState<Expert[]>([]);
  const [selectedExpert, setSelectedExpert] = useState<Expert | null>(null);
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const [editingExpert, setEditingExpert] = useState<Partial<Expert> | null>(null);

  useEffect(() => {
    loadExperts();
  }, []);

  const loadExperts = async () => {
    try {
      const response = await fetch('/api/experts');
      const data = await response.json();
      setExperts(data.experts || []);
    } catch (error) {
      console.error('Error loading experts:', error);
    }
  };

  const startChat = (expert: Expert) => {
    setSelectedExpert(expert);
    setMessages([{
      role: 'assistant',
      content: `Hello! I'm ${expert.name}, ${expert.role}. ${expert.description}\n\nHow can I help you today?`
    }]);
    setShowEditor(false);
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading || !selectedExpert) return;
    
    const userMessage: { role: 'user' | 'assistant'; content: string } = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const systemPrompt = selectedExpert.systemPrompt + 
        (selectedExpert.personality ? `\n\nPersonality: ${selectedExpert.personality}` : '') +
        (selectedExpert.capabilities.length > 0 ? `\n\nCapabilities: ${selectedExpert.capabilities.join(', ')}` : '');

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'glm-4.7-flash',
          message: `[${systemPrompt}]\n\nUser question: ${input}`,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setMessages(prev => [...prev, { role: 'assistant' as const, content: data.message }]);
      }
    } catch (error) {
      console.error('Error chatting:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveExpert = async () => {
    if (!editingExpert?.name || !editingExpert?.role || !editingExpert?.systemPrompt) {
      alert('Name, role, and system prompt are required');
      return;
    }

    try {
      const isEditing = editingExpert.id && experts.find(e => e.id === editingExpert.id);
      
      const url = '/api/experts';
      const method = isEditing ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingExpert),
      });

      const data = await response.json();

      if (data.success) {
        loadExperts();
        setShowEditor(false);
        setEditingExpert(null);
      } else {
        alert(data.error || 'Failed to save expert');
      }
    } catch (error) {
      console.error('Error saving expert:', error);
      alert('Failed to save expert');
    }
  };

  const handleDeleteExpert = async (id: string) => {
    if (!confirm('Delete this expert?')) return;

    try {
      const url = '/api/experts?id=' + encodeURIComponent(id);
      const response = await fetch(url, { method: 'DELETE' });
      const data = await response.json();

      if (data.success) {
        loadExperts();
        if (selectedExpert?.id === id) {
          setSelectedExpert(null);
        }
      } else {
        alert(data.error || 'Failed to delete expert');
      }
    } catch (error) {
      console.error('Error deleting expert:', error);
    }
  };

  const openEditor = (expert?: Expert) => {
    if (expert) {
      setEditingExpert({ ...expert });
    } else {
      setEditingExpert({
        name: '',
        role: '',
        description: '',
        capabilities: [],
        systemPrompt: '',
        personality: '',
      });
    }
    setShowEditor(true);
  };

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white">Expert Agents</h1>
            <p className="text-gray-400 mt-1">
              Specialized AI experts for different domains
            </p>
          </div>
          <button
            onClick={() => openEditor()}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg"
          >
            + Add Expert
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Expert List */}
          <div className="lg:col-span-1">
            <div className="bg-gray-800 rounded-lg p-4">
              <h2 className="text-xl font-semibold text-white mb-4">Available Experts</h2>
              <div className="space-y-3">
                {experts.map(expert => (
                  <div
                    key={expert.id}
                    className={`p-4 rounded-lg cursor-pointer transition-colors ${
                      selectedExpert?.id === expert.id
                        ? 'bg-purple-900/50 border-2 border-purple-500'
                        : 'bg-gray-700 hover:bg-gray-600'
                    }`}
                  >
                    <div onClick={() => startChat(expert)}>
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-white">{expert.name}</h3>
                        {expert.editable && (
                          <span className="text-xs text-gray-400">Custom</span>
                        )}
                      </div>
                      <p className="text-sm text-purple-300">{expert.role}</p>
                      <p className="text-xs text-gray-400 mt-1 line-clamp-2">{expert.description}</p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {expert.capabilities.slice(0, 3).map((cap, i) => (
                          <span key={i} className="text-xs px-2 py-0.5 bg-gray-600 rounded text-gray-300">
                            {cap}
                          </span>
                        ))}
                        {expert.capabilities.length > 3 && (
                          <span className="text-xs text-gray-500">+{expert.capabilities.length - 3}</span>
                        )}
                      </div>
                    </div>
                    {expert.editable && (
                      <div className="flex gap-2 mt-2 border-t border-gray-600 pt-2">
                        <button
                          onClick={(e) => { e.stopPropagation(); openEditor(expert); }}
                          className="text-xs px-2 py-1 bg-gray-600 rounded hover:bg-gray-500"
                        >
                          Edit
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeleteExpert(expert.id); }}
                          className="text-xs px-2 py-1 bg-red-600/50 rounded hover:bg-red-600"
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Chat Area */}
          <div className="lg:col-span-2">
            {selectedExpert && !showEditor ? (
              <div className="bg-gray-800 rounded-lg p-4 h-[600px] flex flex-col">
                <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-700">
                  <div>
                    <h2 className="text-xl font-semibold text-white">{selectedExpert.name}</h2>
                    <p className="text-sm text-gray-400">{selectedExpert.role}</p>
                  </div>
                  <button
                    onClick={() => setSelectedExpert(null)}
                    className="text-gray-400 hover:text-white text-xl"
                  >
                    ×
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto space-y-4 mb-4">
                  {messages.map((msg, i) => (
                    <div key={i} className={`${msg.role === 'user' ? 'ml-auto text-right' : 'mr-auto'}`}>
                      <div className={`inline-block max-w-[80%] p-3 rounded-lg ${
                        msg.role === 'user' 
                          ? 'bg-purple-600 text-white' 
                          : 'bg-gray-700 text-gray-200'
                      }`}>
                        <div className="whitespace-pre-wrap">{msg.content}</div>
                      </div>
                    </div>
                  ))}
                  {isLoading && (
                    <div className="text-gray-400">Thinking...</div>
                  )}
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                    placeholder={`Ask ${selectedExpert.name}...`}
                    className="flex-1 px-4 py-2 bg-gray-900 border border-gray-700 rounded text-white"
                    disabled={isLoading}
                  />
                  <button
                    onClick={sendMessage}
                    disabled={isLoading || !input.trim()}
                    className="px-6 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white rounded"
                  >
                    Send
                  </button>
                </div>
              </div>
            ) : showEditor ? (
              <div className="bg-gray-800 rounded-lg p-6">
                <h2 className="text-xl font-semibold text-white mb-4">
                  {editingExpert?.id ? 'Edit Expert' : 'Create New Expert'}
                </h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-gray-400 mb-1">Name *</label>
                    <input
                      type="text"
                      value={editingExpert?.name || ''}
                      onChange={(e) => setEditingExpert(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded text-white"
                      placeholder="e.g., Financial Advisor"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-400 mb-1">Role *</label>
                    <input
                      type="text"
                      value={editingExpert?.role || ''}
                      onChange={(e) => setEditingExpert(prev => ({ ...prev, role: e.target.value }))}
                      className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded text-white"
                      placeholder="e.g., Financial Specialist"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-400 mb-1">Description</label>
                    <textarea
                      value={editingExpert?.description || ''}
                      onChange={(e) => setEditingExpert(prev => ({ ...prev, description: e.target.value }))}
                      className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded text-white h-20"
                      placeholder="Brief description of what this expert does"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-400 mb-1">System Prompt *</label>
                    <textarea
                      value={editingExpert?.systemPrompt || ''}
                      onChange={(e) => setEditingExpert(prev => ({ ...prev, systemPrompt: e.target.value }))}
                      className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded text-white h-40"
                      placeholder="Instructions that define the expert's behavior..."
                    />
                  </div>

                  <div>
                    <label className="block text-gray-400 mb-1">Personality</label>
                    <textarea
                      value={editingExpert?.personality || ''}
                      onChange={(e) => setEditingExpert(prev => ({ ...prev, personality: e.target.value }))}
                      className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded text-white h-20"
                      placeholder="How the expert should communicate"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-400 mb-1">Capabilities (comma-separated)</label>
                    <input
                      type="text"
                      value={editingExpert?.capabilities?.join(', ') || ''}
                      onChange={(e) => setEditingExpert(prev => ({ 
                        ...prev, 
                        capabilities: e.target.value.split(',').map(c => c.trim()).filter(Boolean)
                      }))}
                      className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded text-white"
                      placeholder="Research, Analysis, Writing, etc."
                    />
                  </div>

                  <div className="flex gap-3 justify-end">
                    <button
                      onClick={() => { setShowEditor(false); setEditingExpert(null); }}
                      className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveExpert}
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded"
                    >
                      Save Expert
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-gray-800 rounded-lg p-4 h-[600px] flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <div className="text-6xl mb-4">🤖</div>
                  <p className="text-xl">Select an expert to start chatting</p>
                  <p className="text-sm mt-2 text-gray-400">Or create a new custom expert</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}