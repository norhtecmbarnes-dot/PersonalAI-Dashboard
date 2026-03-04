'use client';

import { useState, useEffect, useRef } from 'react';
import { MarkdownRenderer } from '@/components/MarkdownRenderer';

interface Brand {
  id: string;
  name: string;
  description?: string;
  website?: string;
  persona?: string;
  systemPrompt?: string;
  voiceStyle?: string;
  industry?: string;
  documentsCount?: number;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function BrandChatPage() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [selectedBrand, setSelectedBrand] = useState<Brand | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadBrands();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadBrands = async () => {
    try {
      const response = await fetch('/api/brands');
      const data = await response.json();
      setBrands(data.brands || []);
    } catch (error) {
      console.error('Error loading brands:', error);
    }
  };

  const selectBrand = async (brand: Brand) => {
    try {
      const response = await fetch(`/api/brand-chat?brandId=${brand.id}`);
      const data = await response.json();
      if (data.brand) {
        setSelectedBrand(data.brand);
        setMessages([]);
      }
    } catch (error) {
      console.error('Error loading brand:', error);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || !selectedBrand || isLoading) return;

    const userMessage: Message = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/brand-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brandId: selectedBrand.id,
          message: input,
          conversationHistory: messages
        })
      });

      if (response.ok) {
        const data = await response.json();
        const assistantMessage: Message = { 
          role: 'assistant', 
          content: data.message || 'No response' 
        };
        setMessages(prev => [...prev, assistantMessage]);
      } else {
        throw new Error('Failed to get response');
      }
    } catch (error) {
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Error: Could not get a response. Please try again.' 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white">Brand Voice Chat</h1>
          <p className="text-gray-400 mt-1">
            Chat with AI using your brand's voice and documents
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Brand List */}
          <div className="bg-gray-800 rounded-lg p-4">
            <h2 className="text-lg font-semibold text-white mb-4">Select Brand</h2>
            <div className="space-y-2">
              {brands.map(brand => (
                <button
                  key={brand.id}
                  onClick={() => selectBrand(brand)}
                  className={`w-full text-left p-3 rounded-lg transition-colors ${
                    selectedBrand?.id === brand.id
                      ? 'bg-purple-900/50 border border-purple-500'
                      : 'bg-gray-700 hover:bg-gray-600'
                  }`}
                >
                  <div className="text-white font-medium">{brand.name}</div>
                  {brand.voiceStyle && (
                    <div className="text-gray-400 text-sm">{brand.voiceStyle}</div>
                  )}
                </button>
              ))}
              {brands.length === 0 && (
                <p className="text-gray-500 text-sm">
                  No brands yet. Create one in Workspace first.
                </p>
              )}
            </div>
          </div>

          {/* Chat Area */}
          <div className="lg:col-span-3 bg-gray-800 rounded-lg p-4 flex flex-col" style={{ minHeight: '600px' }}>
            {selectedBrand ? (
              <>
                {/* Brand Info */}
                <div className="border-b border-gray-700 pb-4 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center text-white text-xl font-bold">
                      {selectedBrand.name.charAt(0)}
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold text-white">{selectedBrand.name}</h2>
                      {selectedBrand.voiceStyle && (
                        <span className="text-sm text-purple-400">
                          Voice: {selectedBrand.voiceStyle}
                        </span>
                      )}
                    </div>
                  </div>
                  {selectedBrand.persona && (
                    <p className="text-gray-400 text-sm mt-2">
                      {selectedBrand.persona}
                    </p>
                  )}
                  <div className="mt-2 flex gap-2">
                    <span className="text-xs px-2 py-1 bg-gray-700 text-gray-300 rounded">
                      {(selectedBrand as any).documentsCount || 0} documents
                    </span>
                    {selectedBrand.industry && (
                      <span className="text-xs px-2 py-1 bg-blue-900/50 text-blue-300 rounded">
                        {selectedBrand.industry}
                      </span>
                    )}
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto mb-4 max-h-[400px]">
                  {messages.length === 0 ? (
                    <div className="text-center text-gray-400 h-full flex flex-col items-center justify-center">
                      <div className="text-4xl mb-4">💬</div>
                      <p>Ask questions about {selectedBrand.name}</p>
                      <p className="text-sm mt-1">Using {selectedBrand.documentsCount || 0} brand documents</p>
                    </div>
                  ) : (
                    messages.map((msg, idx) => (
                      <div
                        key={idx}
                        className={`mb-3 ${
                          msg.role === 'user' ? 'flex justify-end' : 'flex justify-start'
                        }`}
                      >
                        <div
                          className={`max-w-[80%] rounded-lg px-4 py-2 ${
                            msg.role === 'user'
                              ? 'bg-purple-600 text-white'
                              : 'bg-gray-700 text-gray-100'
                          }`}
                        >
                          {msg.role === 'user' ? (
                            <p>{msg.content}</p>
                          ) : (
                            <MarkdownRenderer content={msg.content} />
                          )}
                        </div>
                      </div>
                    ))
                  )}
                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="bg-gray-700 text-gray-300 rounded-lg px-4 py-2">
                        Thinking...
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={`Ask about ${selectedBrand.name}...`}
                    className="flex-1 bg-gray-900 text-white border border-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:border-purple-500"
                    disabled={isLoading}
                  />
                  <button
                    onClick={sendMessage}
                    disabled={isLoading || !input.trim()}
                    className="px-6 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white rounded-lg"
                  >
                    Send
                  </button>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <div className="text-4xl mb-4">🏢</div>
                  <p className="text-lg">Select a brand to start chatting</p>
                  <p className="text-sm mt-2">The AI will use the brand's documents and voice settings</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
