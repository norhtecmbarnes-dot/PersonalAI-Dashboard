'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { CommandMenu, COMMANDS } from '@/components/CommandMenu';
import { MarkdownRenderer } from '@/components/MarkdownRenderer';
import { Visualization } from '@/components/Visualization';
import { expertStorage, Expert } from '@/lib/storage/experts';
import { SettingsPanel } from '@/components/SettingsPanel';
import { BrandVoiceSelector } from '@/components/BrandVoiceSelector';
import { useModels } from '@/lib/hooks/useModels';

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  visualization?: string;
  timestamp?: number;
  brandName?: string;
}

interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  brandId?: string;
  brandName?: string;
}

interface UserPreferences {
  userName: string;
  assistantName: string;
  hasCompletedSetup: boolean;
}

interface Document {
  id: string;
  title: string;
  category?: string;
  createdAt: number;
}

interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
  createdAt: number;
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { models, selectedModel, setSelectedModel, ollamaHealthy } = useModels();
  const [showCommands, setShowCommands] = useState(false);
  const [userPrefs, setUserPrefs] = useState<UserPreferences>({
    userName: '',
    assistantName: 'AI Assistant',
    hasCompletedSetup: false,
  });
  const [documents, setDocuments] = useState<Document[]>([]);
  const [showDocuments, setShowDocuments] = useState(false);

  // Brand/Project selection
  const [selectedBrandId, setSelectedBrandId] = useState<string | null>(null);
  const [selectedBrandName, setSelectedBrandName] = useState<string>('');
  const [availableBrands, setAvailableBrands] = useState<{ id: string; name: string }[]>([]);

  // Sidebar state
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [conversations, setConversations] = useState<ChatSession[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);

  // Task creation
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDescription, setNewTaskDescription] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<'low' | 'medium' | 'high'>('medium');

  // Expert selector
  const [experts, setExperts] = useState<Expert[]>([]);
  const [selectedExpert, setSelectedExpert] = useState<Expert | null>(null);
  const [showExpertSelector, setShowExpertSelector] = useState(false);
  const expertDropdownRef = useRef<HTMLButtonElement>(null);

  // Voice states
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Search mode
  const [searchMode, setSearchModeState] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Refs
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);

  // Load models and preferences
  useEffect(() => {
    if (initialLoadDone.current) return;
    initialLoadDone.current = true;

    loadUserPreferences();
    loadDocuments();
    loadConversations();
    loadBrands();
    setExperts(expertStorage.getAll());
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.getVoices();
      };
    }
  }, []);

  // Load search mode from database
  useEffect(() => {
    const loadSearchMode = async () => {
      try {
        const response = await fetch('/api/settings');
        if (response.ok) {
          const data = await response.json();
          setSearchModeState(data.searchMode === true);
        }
      } catch (error) {
        console.error('Error loading search mode:', error);
      }
      setMounted(true);
    };
    loadSearchMode();
  }, []);

  const initialLoadDone = useRef(false);

  const setSearchMode = async (value: boolean) => {
    setSearchModeState(value);
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ searchMode: value }),
      });
    } catch (error) {
      console.error('Error saving search mode:', error);
    }
  };

  // Scroll handling
  const handleChatScroll = useCallback(() => {
    if (chatContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
      setShowScrollButton(!isNearBottom);
    }
  }, []);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Load functions
  const loadUserPreferences = useCallback(async () => {
    try {
      const response = await fetch('/api/user');
      const data = await response.json();
      if (data.preferences) {
        setUserPrefs(data.preferences);
        if (!data.preferences.hasCompletedSetup) {
          window.location.href = '/setup';
        }
      } else {
        window.location.href = '/setup';
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
      window.location.href = '/setup';
    }
  }, []);

  const loadDocuments = useCallback(async () => {
    try {
      const response = await fetch('/api/documents/import?action=list');
      const data = await response.json();
      setDocuments(data.documents || []);
    } catch (error) {
      console.error('Error loading documents:', error);
    }
  }, []);

  const loadBrands = useCallback(async () => {
    try {
      const response = await fetch('/api/brand-workspace?action=list');
      const data = await response.json();
      setAvailableBrands((data.brands || []).map((b: any) => ({ id: b.id, name: b.name })));
    } catch (error) {
      console.error('Error loading brands:', error);
    }
  }, []);

  const loadConversations = useCallback(async () => {
    try {
      const response = await fetch('/api/chat-history?action=recent&limit=50');
      const data = await response.json();
      setConversations(data.chats || []);
    } catch (error) {
      console.error('Error loading conversations:', error);
    }
  }, []);

  const loadConversation = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/chat-history?action=get&id=${id}`);
      const data = await response.json();
      if (data.chat) {
        setMessages(data.chat.messages || []);
        setCurrentConversationId(id);
        if (data.chat.brandId) {
          setSelectedBrandId(data.chat.brandId);
          setSelectedBrandName(data.chat.brandName || '');
        }
      }
    } catch (error) {
      console.error('Error loading conversation:', error);
    }
  }, []);

  const startNewChat = useCallback(() => {
    setMessages([]);
    setCurrentConversationId(null);
    setSelectedBrandId(null);
    setSelectedBrandName('');
    setSelectedExpert(null);
    inputRef.current?.focus();
  }, []);

  const saveCurrentConversation = useCallback(async () => {
    if (messages.length === 0) return null;

    try {
      const response = await fetch('/api/chat-history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save',
          id: currentConversationId || undefined,
          messages,
          model: selectedModel,
          expert: selectedExpert?.id,
          brandId: selectedBrandId,
          brandName: selectedBrandName,
        }),
      });

      const data = await response.json();
      if (data.id) {
        setCurrentConversationId(data.id);
        loadConversations();
      }
      return data.id;
    } catch (error) {
      console.error('Error saving conversation:', error);
      return null;
    }
  }, [
    messages,
    selectedModel,
    selectedExpert?.id,
    selectedBrandId,
    selectedBrandName,
    currentConversationId,
    loadConversations,
  ]);

  const deleteConversation = useCallback(
    async (id: string) => {
      if (!confirm('Delete this conversation?')) return;

      try {
        await fetch('/api/chat-history', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'delete', id }),
        });
        setConversations(convs => convs.filter(c => c.id !== id));
        if (currentConversationId === id) {
          startNewChat();
        }
      } catch (error) {
        console.error('Error deleting conversation:', error);
      }
    },
    [currentConversationId, startNewChat]
  );

  const handleBrandSelect = useCallback(
    (brandId: string | null) => {
      setSelectedBrandId(brandId);
      if (brandId) {
        const brand = availableBrands.find(b => b.id === brandId);
        setSelectedBrandName(brand?.name || '');
      } else {
        setSelectedBrandName('');
      }
    },
    [availableBrands]
  );

  // Task creation
  const handleCreateTask = useCallback(async () => {
    if (!newTaskTitle.trim()) return;

    try {
      await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          title: newTaskTitle,
          description: newTaskDescription,
          priority: newTaskPriority,
        }),
      });
      setShowTaskModal(false);
      setNewTaskTitle('');
      setNewTaskDescription('');
      setNewTaskPriority('medium');
    } catch (error) {
      console.error('Error creating task:', error);
    }
  }, [newTaskTitle, newTaskDescription, newTaskPriority]);

  // Voice functions
  const startListening = useCallback(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Speech recognition not supported in this browser');
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    recognitionRef.current = new SpeechRecognition();
    recognitionRef.current.continuous = false;
    recognitionRef.current.interimResults = false;

    recognitionRef.current.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput(prev => prev + ' ' + transcript);
    };

    recognitionRef.current.onerror = () => {
      setIsListening(false);
    };

    recognitionRef.current.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current.start();
    setIsListening(true);
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  }, []);

  const speakLastMessage = useCallback(() => {
    if (messages.length === 0 || !voiceEnabled) return;

    const lastAssistantMessage = [...messages].reverse().find(m => m.role === 'assistant');
    if (!lastAssistantMessage) return;

    const utterance = new SpeechSynthesisUtterance(
      lastAssistantMessage.content.replace(/```[\s\S]*?```/g, 'code block').substring(0, 500)
    );
    utterance.onend = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
    setIsSpeaking(true);
  }, [messages, voiceEnabled]);

  const stopSpeaking = useCallback(() => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }, []);

  // Document upload
  const handleDocumentUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setIsLoading(true);
      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('remember', 'true');

        const response = await fetch('/api/documents/import', {
          method: 'POST',
          body: formData,
        });

        if (response.ok) {
          const data = await response.json();
          loadDocuments();
          setMessages(prev => [
            ...prev,
            {
              role: 'assistant',
              content: `Document "${file.name}" uploaded successfully. I can now answer questions about it.\n\nYou can ask me:\n- "What is this document about?"\n- "Summarize the key points"\n- "Find information about X in the document"\n\nOr use: \`/doc ${data.document.id} your question\` to query it directly.`,
            },
          ]);
        } else {
          setMessages(prev => [
            ...prev,
            { role: 'assistant', content: 'Failed to upload document. Please try again.' },
          ]);
        }
      } catch (error) {
        setMessages(prev => [
          ...prev,
          {
            role: 'assistant',
            content:
              'Error uploading document: ' +
              (error instanceof Error ? error.message : 'Unknown error'),
          },
        ]);
      } finally {
        setIsLoading(false);
        e.target.value = '';
      }
    },
    [loadDocuments]
  );

  // OCR
  const handleOcrUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch('/api/ocr', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        setInput(prev => prev + ' ' + data.text);
      } else {
        alert('Failed to process image');
      }
    } catch (error) {
      console.error('OCR error:', error);
      alert('Error processing image');
    } finally {
      setIsLoading(false);
      e.target.value = '';
    }
  }, []);

  // Command handling
  const handleSelectCommand = useCallback(
    (command: any) => {
      switch (command.action) {
        case 'new_chat':
          startNewChat();
          break;
        case 'create_task':
          setShowTaskModal(true);
          break;
        case 'web_search':
          setSearchMode(true);
          inputRef.current?.focus();
          break;
        case 'brand_workspace':
          window.location.href = '/brand-workspace';
          break;
        case 'brand_chat':
          window.location.href = '/brand-chat';
          break;
        case 'documents':
          window.location.href = '/documents';
          break;
        case 'expert':
          setInput('/expert ');
          break;
        case 'memory':
          setInput('/memory ');
          break;
        default:
          setInput(command.name + ' ');
      }
      setShowCommands(false);
    },
    [startNewChat]
  );

  // Send message
  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      role: 'user',
      content: input,
      brandName: selectedBrandName || undefined,
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: selectedModel,
          message: input,
          conversationHistory: messages.slice(-20),
          searchMode,
          userName: userPrefs.userName,
          assistantName: userPrefs.assistantName,
          expertId: selectedExpert?.id,
          brandId: selectedBrandId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No reader');

      const decoder = new TextDecoder();
      let fullContent = '';

      setMessages(prev => [...prev, { role: 'assistant', content: '', brandName: undefined }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);

        // Parse SSE format: data: {"chunk":"...", "done":false}
        const lines = chunk.split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const json = JSON.parse(line.slice(6));
              if (json.chunk) {
                fullContent += json.chunk;
              }
              if (json.done) {
                // Stream complete
              }
            } catch (e) {
              // If not valid JSON, treat as plain text (fallback)
              if (line.length > 6) {
                fullContent += line.slice(6);
              }
            }
          } else if (line.trim() && !line.startsWith(':')) {
            // Plain text fallback
            try {
              const json = JSON.parse(line);
              if (json.chunk) {
                fullContent += json.chunk;
              }
            } catch (e) {
              // Skip invalid lines
            }
          }
        }

        setMessages(prev => {
          const newMessages = [...prev];
          newMessages[newMessages.length - 1] = {
            role: 'assistant',
            content: fullContent,
            brandName: undefined,
          };
          return newMessages;
        });
      }

      // Auto-save after response
      if (fullContent) {
        setTimeout(() => saveCurrentConversation(), 500);
      }
    } catch (error) {
      console.error('Error:', error);
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: 'An error occurred. Please try again.',
          brandName: undefined,
        },
      ]);
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

  // Handle brand change
  useEffect(() => {
    if (selectedBrandId) {
      const brand = availableBrands.find(b => b.id === selectedBrandId);
      if (brand) {
        setSelectedBrandName(brand.name);
      }
    }
  }, [selectedBrandId, availableBrands]);

  // Welcome screen instructions
  const welcomeInstructions = `
**Getting Started**

• **Type a message** below to start chatting
• **Upload documents** using the paperclip icon
• **Select a brand** from the sidebar for context-aware responses
• **Use commands** like \`/expert\`, \`/memory\`, or \`/briefing\`

**Quick Actions**
• 📁 **Documents** - Upload and chat with PDFs, Word docs
• 🏷️ **Brand Context** - Get responses in your brand's voice
• ⚡ **New Chat** - Start a fresh conversation
• ✅ **Create Task** - Turn conversation into a task
  `;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex">
      {/* Left Sidebar */}
      <div
        className={`${sidebarOpen ? 'w-72' : 'w-16'} bg-slate-900/80 backdrop-blur border-r border-slate-700 flex flex-col transition-all duration-300`}
      >
        {/* Sidebar Toggle */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-3 hover:bg-slate-800 text-gray-400 hover:text-white transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </button>

        {sidebarOpen && (
          <>
            {/* New Chat Button */}
            <div className="px-3 py-2">
              <button
                onClick={startNewChat}
                className="w-full flex items-center gap-2 px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                <span>New Chat</span>
              </button>
            </div>

            {/* Brand Selector */}
            <div className="px-3 py-2 border-t border-slate-700">
              <label className="text-xs text-gray-500 px-1">Brand Context</label>
              <select
                value={selectedBrandId || ''}
                onChange={e => handleBrandSelect(e.target.value || null)}
                className="w-full mt-1 bg-slate-800 text-white rounded px-3 py-2 text-sm border border-slate-600 focus:border-purple-500 focus:outline-none"
              >
                <option value="">No Brand</option>
                {availableBrands.map(brand => (
                  <option key={brand.id} value={brand.id}>
                    {brand.name}
                  </option>
                ))}
              </select>
              {selectedBrandName && (
                <div className="mt-1 text-xs text-purple-400 flex items-center gap-1">
                  <span>📎</span>
                  <span>{selectedBrandName}</span>
                </div>
              )}
            </div>

            {/* Task Creation */}
            <div className="px-3 py-2 border-t border-slate-700">
              <button
                onClick={() => setShowTaskModal(true)}
                className="w-full flex items-center gap-2 px-3 py-2 text-gray-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                  />
                </svg>
                <span className="text-sm">Create Task</span>
              </button>
            </div>

            {/* Conversations List */}
            <div className="flex-1 overflow-y-auto px-3 py-2">
              <label className="text-xs text-gray-500 px-1 mb-2 block">Conversations</label>
              {conversations.length === 0 ? (
                <p className="text-xs text-gray-600 text-center py-4">No conversations yet</p>
              ) : (
                <div className="space-y-1">
                  {conversations.map(conv => (
                    <div
                      key={conv.id}
                      className={`group flex items-center gap-2 px-3 py-2 rounded cursor-pointer ${
                        currentConversationId === conv.id
                          ? 'bg-purple-900/50 text-purple-200'
                          : 'text-gray-400 hover:bg-slate-800 hover:text-white'
                      }`}
                      onClick={() => loadConversation(conv.id)}
                    >
                      <svg
                        className="w-4 h-4 flex-shrink-0"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                        />
                      </svg>
                      <span className="text-sm truncate flex-1">{conv.title}</span>
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          deleteConversation(conv.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400 transition-opacity"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Documents Link */}
            <div className="px-3 py-2 border-t border-slate-700">
              <button
                onClick={() => (window.location.href = '/documents')}
                className="w-full flex items-center gap-2 px-3 py-2 text-gray-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z"
                  />
                </svg>
                <span className="text-sm">Manage Documents</span>
              </button>
            </div>

            {/* Quick Stats */}
            <div className="px-3 py-2 border-t border-slate-700">
              <div className="text-xs text-gray-500 space-y-1">
                <div className="flex justify-between">
                  <span>Documents:</span>
                  <span className="text-gray-400">{documents.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>Conversations:</span>
                  <span className="text-gray-400">{conversations.length}</span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Header */}
        <div className="bg-slate-800/50 backdrop-blur border-b border-slate-700 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-white">AI Research Assistant</h1>
              <span
                className={`text-xs px-2 py-1 rounded ${ollamaHealthy ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'}`}
              >
                {ollamaHealthy ? '● Online' : '● Offline'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {/* Model Selector */}
              <select
                value={selectedModel}
                onChange={e => setSelectedModel(e.target.value)}
                className="bg-slate-700 text-white rounded px-3 py-1.5 text-sm border border-slate-600 focus:border-purple-500 focus:outline-none"
              >
                {models.map(model => (
                  <option key={model.id} value={model.id}>
                    {model.name}
                  </option>
                ))}
              </select>

              {/* Expert Selector */}
              <div className="relative">
                <button
                  onClick={() => setShowExpertSelector(!showExpertSelector)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-slate-700 text-white rounded border border-slate-600 hover:border-purple-500"
                >
                  <span>{selectedExpert ? selectedExpert.name : 'Assistant'}</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>

                {showExpertSelector &&
                  createPortal(
                    <div
                      className="fixed inset-0 z-50"
                      onClick={() => setShowExpertSelector(false)}
                    >
                      <div
                        className="absolute bg-slate-800 border border-slate-600 rounded-lg shadow-xl max-h-60 overflow-y-auto"
                        onClick={e => e.stopPropagation()}
                      >
                        <button
                          onClick={() => {
                            setSelectedExpert(null);
                            setShowExpertSelector(false);
                          }}
                          className="w-full px-4 py-2 text-left hover:bg-slate-700 text-gray-300"
                        >
                          <div className="font-medium">General Assistant</div>
                          <div className="text-xs text-gray-400">Default AI</div>
                        </button>
                        {experts.map(expert => (
                          <button
                            key={expert.id}
                            onClick={() => {
                              setSelectedExpert(expert);
                              setShowExpertSelector(false);
                            }}
                            className={`w-full px-4 py-2 text-left hover:bg-slate-700 ${selectedExpert?.id === expert.id ? 'bg-purple-900/50' : ''}`}
                          >
                            <div className="font-medium text-white">{expert.name}</div>
                            <div className="text-xs text-purple-300">{expert.role}</div>
                          </button>
                        ))}
                      </div>
                    </div>,
                    document.body
                  )}
              </div>

              <SettingsPanel />
            </div>
          </div>
        </div>

        {/* Chat Container */}
        <div
          className="flex-1 overflow-y-auto p-4"
          ref={chatContainerRef}
          onScroll={handleChatScroll}
        >
          <div className="max-w-4xl mx-auto">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-12">
                <div className="text-6xl mb-4">🤖</div>
                <h2 className="text-2xl font-bold text-white mb-2">
                  Hello{userPrefs.userName ? `, ${userPrefs.userName}` : ''}!
                </h2>
                <p className="text-gray-400 mb-6">How can I help you today?</p>

                <div className="bg-slate-800/50 rounded-lg p-6 max-w-md text-left">
                  <MarkdownRenderer content={welcomeInstructions} />
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => setInput('What can you help me with?')}
                    className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                  >
                    What can you do?
                  </button>
                  <button
                    onClick={() => setInput('Help me understand my documents')}
                    className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                  >
                    Document help
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-lg p-4 ${
                        msg.role === 'user'
                          ? 'bg-purple-600 text-white'
                          : 'bg-slate-800 text-gray-200'
                      }`}
                    >
                      {msg.brandName && (
                        <div className="text-xs text-purple-300 mb-1 flex items-center gap-1">
                          <span>📎</span>
                          <span>Brand: {msg.brandName}</span>
                        </div>
                      )}
                      {msg.role === 'user' ? (
                        <div className="whitespace-pre-wrap">{msg.content}</div>
                      ) : (
                        <MarkdownRenderer content={msg.content} />
                      )}
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>
        </div>

        {/* Scroll to Bottom Button */}
        {showScrollButton && (
          <button
            onClick={scrollToBottom}
            className="fixed bottom-24 right-8 z-10 p-3 bg-purple-600 hover:bg-purple-500 text-white rounded-full shadow-lg transition-all duration-200 hover:scale-110"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 14l-7 7m0 0l-7-7m7 7V3"
              />
            </svg>
          </button>
        )}

        {/* Input Area */}
        <div className="bg-slate-800/50 backdrop-blur border-t border-slate-700 p-4">
          <div className="max-w-4xl mx-auto">
            {/* Documents Panel */}
            {showDocuments && documents.length > 0 && (
              <div className="mb-3 p-3 bg-slate-700/50 rounded-lg max-h-40 overflow-y-auto">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-400">Documents ({documents.length})</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => (window.location.href = '/documents')}
                      className="text-xs text-purple-400 hover:text-purple-300"
                    >
                      Manage
                    </button>
                    <button
                      onClick={() => setShowDocuments(false)}
                      className="text-gray-400 hover:text-white"
                    >
                      ×
                    </button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {documents.map(doc => (
                    <div
                      key={doc.id}
                      className="group flex items-center gap-2 px-3 py-1 rounded text-sm bg-slate-600 text-gray-300 hover:bg-slate-500"
                    >
                      <button
                        onClick={() => {
                          setInput(`/doc ${doc.id} `);
                          setShowDocuments(false);
                          inputRef.current?.focus();
                        }}
                        className="flex-1 text-left hover:text-white"
                      >
                        {doc.title}
                      </button>
                      <button
                        onClick={async e => {
                          e.stopPropagation();
                          if (confirm(`Delete "${doc.title}"?`)) {
                            await fetch(`/api/documents?id=${doc.id}`, { method: 'DELETE' });
                            loadDocuments();
                          }
                        }}
                        className="text-red-400 hover:text-red-300 opacity-0 group-hover:opacity-100"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Input Box */}
            <div className="relative">
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={searchMode ? 'Search the web...' : 'Type your message...'}
                className="w-full bg-slate-700 text-white border-0 rounded-lg px-4 py-3 pr-36 resize-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
                rows={3}
                disabled={isLoading || isListening}
              />

              {/* Action Buttons */}
              <div className="absolute bottom-2 right-2 flex items-center gap-1">
                {/* Document Upload */}
                <label className="p-2 rounded-lg bg-slate-600 text-gray-400 hover:text-white cursor-pointer">
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,.txt,.md"
                    onChange={handleDocumentUpload}
                    className="hidden"
                    disabled={isLoading}
                  />
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                    />
                  </svg>
                </label>

                {/* Documents Button */}
                {documents.length > 0 && (
                  <button
                    onClick={() => setShowDocuments(!showDocuments)}
                    className={`p-2 rounded-lg ${showDocuments ? 'bg-purple-600 text-white' : 'bg-slate-600 text-gray-400 hover:text-white'}`}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z"
                      />
                    </svg>
                  </button>
                )}

                {/* Search Toggle */}
                <button
                  onClick={() => setSearchMode(!searchMode)}
                  className={`p-2 rounded-lg ${searchMode ? 'bg-green-600 text-white' : 'bg-slate-600 text-gray-400 hover:text-white'}`}
                  title={searchMode ? 'Web Search ON' : 'Web Search OFF'}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                </button>

                {/* Send Button */}
                <button
                  onClick={sendMessage}
                  disabled={isLoading || !input.trim()}
                  className="p-2 rounded-lg bg-purple-600 text-white hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                    />
                  </svg>
                </button>
              </div>
            </div>

            {/* Loading indicator */}
            {isLoading && (
              <div className="flex items-center gap-2 mt-2 text-gray-400 text-sm">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                  <span
                    className="w-2 h-2 bg-green-400 rounded-full animate-pulse"
                    style={{ animationDelay: '200ms' }}
                  ></span>
                  <span
                    className="w-2 h-2 bg-green-400 rounded-full animate-pulse"
                    style={{ animationDelay: '400ms' }}
                  ></span>
                </div>
                <span>{searchMode ? 'Searching...' : 'Thinking...'}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Task Creation Modal */}
      {showTaskModal &&
        createPortal(
          <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            onClick={() => setShowTaskModal(false)}
          >
            <div
              className="bg-slate-800 rounded-lg p-6 max-w-md w-full mx-4"
              onClick={e => e.stopPropagation()}
            >
              <h3 className="text-lg font-bold text-white mb-4">Create New Task</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Title</label>
                  <input
                    type="text"
                    value={newTaskTitle}
                    onChange={e => setNewTaskTitle(e.target.value)}
                    className="w-full bg-slate-700 text-white rounded px-3 py-2 border border-slate-600 focus:border-purple-500 focus:outline-none"
                    placeholder="What needs to be done?"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-1">Description (optional)</label>
                  <textarea
                    value={newTaskDescription}
                    onChange={e => setNewTaskDescription(e.target.value)}
                    className="w-full bg-slate-700 text-white rounded px-3 py-2 border border-slate-600 focus:border-purple-500 focus:outline-none resize-none"
                    rows={3}
                    placeholder="Add details..."
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-1">Priority</label>
                  <select
                    value={newTaskPriority}
                    onChange={e => setNewTaskPriority(e.target.value as 'low' | 'medium' | 'high')}
                    className="w-full bg-slate-700 text-white rounded px-3 py-2 border border-slate-600 focus:border-purple-500 focus:outline-none"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>

                <div className="flex gap-3 justify-end">
                  <button
                    onClick={() => setShowTaskModal(false)}
                    className="px-4 py-2 text-gray-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateTask}
                    disabled={!newTaskTitle.trim()}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded disabled:opacity-50"
                  >
                    Create Task
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* Command Menu Portal */}
      {showCommands &&
        createPortal(
          <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            onClick={() => setShowCommands(false)}
          >
            <div
              className="bg-slate-800 rounded-lg p-4 max-w-md w-full mx-4"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-white">Commands</h3>
                <button
                  onClick={() => setShowCommands(false)}
                  className="text-gray-400 hover:text-white"
                >
                  ×
                </button>
              </div>
              <div className="space-y-1">
                {COMMANDS.map(cmd => (
                  <button
                    key={cmd.action}
                    onClick={() => handleSelectCommand(cmd)}
                    className="w-full text-left px-3 py-2 rounded hover:bg-slate-700 text-gray-300 hover:text-white"
                  >
                    <div className="font-medium">{cmd.name}</div>
                    <div className="text-xs text-gray-500">{cmd.description}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
