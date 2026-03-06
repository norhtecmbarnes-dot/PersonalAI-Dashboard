'use client';

import { useState, useEffect, useRef } from 'react';
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
}

interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
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

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState('glm-4.7-flash');
  const [models, setModels] = useState<string[]>([
    'glm-4.7-flash',
    'glm-5:cloud',
    'qwen3.5:9b',
    'qwen3.5:27b',
  ]);
  const [ollamaHealthy, setOllamaHealthy] = useState(false);
  const [showCommands, setShowCommands] = useState(false);
  const [userPrefs, setUserPrefs] = useState<UserPreferences>({
    userName: '',
    assistantName: 'AI Assistant',
    hasCompletedSetup: false,
  });
  const [documents, setDocuments] = useState<Document[]>([]);
  const [showDocuments, setShowDocuments] = useState(false);
  
  // Brand/Project selection for main chat
  const [selectedBrandId, setSelectedBrandId] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [availableBrands, setAvailableBrands] = useState<{id: string, name: string}[]>([]);
  const [availableProjects, setAvailableProjects] = useState<{id: string, name: string}[]>([]);
  
  // History panel state
  const [showHistory, setShowHistory] = useState(false);
  const [chatHistory, setChatHistory] = useState<ChatSession[]>([]);
  const [savedChats, setSavedChats] = useState<any[]>([]);
  
  // Search mode - persisted to database
  const [searchMode, setSearchModeState] = useState(false);
  const [mounted, setMounted] = useState(false);
  
  // Load search mode from database on mount
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
  
  // Toggle search mode and persist to database
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
  
  // Expert selector state
  const [experts, setExperts] = useState<Expert[]>([]);
  const [selectedExpert, setSelectedExpert] = useState<Expert | null>(null);
  const [showExpertSelector, setShowExpertSelector] = useState(false);
  const expertDropdownRef = useRef<HTMLButtonElement>(null);
  
  // Load experts on mount
  useEffect(() => {
    setExperts(expertStorage.getAll());
  }, []);
  
  // Voice states
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const recognitionRef = useRef<any>(null);
  
  // Load voices when component mounts (needed for some browsers)
  useEffect(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      // Load voices (needed for Chrome/Safari)
      window.speechSynthesis.getVoices();
      
      // Chrome loads voices asynchronously
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.getVoices();
      };
    }
  }, []);
  
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadModels();
    checkHealth();
    loadUserPreferences();
    loadDocuments();
    loadSavedChats();
    
    // Reduce heartbeat frequency - only check every 5 minutes instead of 30 seconds
    // The task scheduler runs independently and doesn't need constant checks
    const heartbeatInterval = setInterval(() => {
      fetch('/api/heartbeat').catch(err => {
        console.log('[Heartbeat] Background check failed:', err);
      });
    }, 300000); // 5 minutes instead of 30 seconds
    
    return () => {
      clearInterval(heartbeatInterval);
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadSavedChats = async () => {
    try {
      const response = await fetch('/api/chat-history?action=recent&limit=10');
      const data = await response.json();
      setSavedChats(data.chats || []);
    } catch (error) {
      console.error('Error loading saved chats:', error);
    }
  };

  const saveCurrentChat = async () => {
    if (messages.length === 0) return;
    
    try {
      const response = await fetch('/api/chat-history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save',
          messages: messages,
          model: selectedModel,
          expert: selectedExpert?.id,
        }),
      });
      
      if (response.ok) {
        loadSavedChats();
      }
    } catch (error) {
      console.error('Error saving chat:', error);
    }
  };

  const loadChat = async (chatId: string) => {
    try {
      const response = await fetch(`/api/chat-history?action=get&id=${chatId}`);
      const data = await response.json();
      if (data.chat) {
        setMessages(data.chat.messages || []);
        setShowHistory(false);
      }
    } catch (error) {
      console.error('Error loading chat:', error);
    }
  };

  const loadDocuments = async () => {
    try {
      const response = await fetch('/api/documents/import?action=list');
      const data = await response.json();
      setDocuments(data.documents || []);
    } catch (error) {
      console.error('Error loading documents:', error);
    }
  };

  const loadUserPreferences = async () => {
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
  };

  const loadModels = async () => {
    try {
      const response = await fetch('/api/models');
      const data = await response.json();
      
      // Get available models from Ollama
      const ollamaModels = (data.ollama?.models || []).map((m: any) => m.name || m.id);
      
      // Get external/cloud models
      const externalModels = (data.external || []).map((m: any) => m.id);
      
      // Combine all models: Ollama first, then external
      const allModels = [...ollamaModels, ...externalModels];
      
      if (allModels.length > 0) {
        setModels(allModels);
        // Set first available model as default if current not in list
        if (!allModels.includes(selectedModel)) {
          setSelectedModel(ollamaModels.length > 0 ? ollamaModels[0] : externalModels[0]);
        }
      }
      
      setOllamaHealthy(data.ollama?.available ?? false);
    } catch (error) {
      console.error('Error loading models:', error);
    }
  };

  const checkHealth = async () => {
    try {
      const response = await fetch('/api/heartbeat');
      const data = await response.json();
      if (data.status === 'unhealthy') {
        setOllamaHealthy(false);
      }
    } catch (error) {
      console.error('Health check failed:', error);
      setOllamaHealthy(false);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    let messageToSend = input;
    const isSearch = searchMode;
    
    // Note: search mode stays on - user must manually toggle it off

    // Determine which model to use based on expert selection
    let modelToUse = selectedModel;
    
    // If an expert is selected (not General Assistant), use the most capable local model
    if (selectedExpert && selectedExpert.id !== 'general-assistant') {
      // Prioritize: largest local models first, then cloud models
      const preferredModels = [
        'qwen3.5:27b',    // Most capable local
        'qwen3.5:9b',    // Second best local
        'glm-5:cloud',    // Cloud thinking
        'kimi-k2.5:cloud', // Cloud fast
      ];
      
      // Find the first available preferred model that's in the models list
      const availableModel = preferredModels.find(m => models.includes(m));
      if (availableModel) {
        modelToUse = availableModel;
        console.log(`[Chat] Using powerful model ${modelToUse} for expert: ${selectedExpert.name}`);
      } else {
        // Fall back to the largest available model
        const sortedModels = [...models].sort((a, b) => {
          const sizeA = parseInt(a.match(/(\d+)b/)?.[1] || '0');
          const sizeB = parseInt(b.match(/(\d+)b/)?.[1] || '0');
          return sizeB - sizeA;
        });
        if (sortedModels.length > 0) {
          modelToUse = sortedModels[0];
          console.log(`[Chat] Using best available model ${modelToUse} for expert: ${selectedExpert.name}`);
        }
      }
    }

    // Prepend expert system prompt if selected
    if (selectedExpert) {
      const systemPrompt = selectedExpert.systemPrompt || '';
      const capabilities = selectedExpert.capabilities?.length > 0 
        ? `\n\nYour key capabilities: ${selectedExpert.capabilities.join(', ')}` 
        : '';
      const personality = selectedExpert.personality 
        ? `\n\nPersonality: ${selectedExpert.personality}` 
        : '';
      const expertPrompt = `[${systemPrompt}${capabilities}${personality}]\n\n`;
      messageToSend = expertPrompt + messageToSend;
    }

    const userMessage: Message = { role: 'user', content: input, timestamp: Date.now() };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    // Add empty assistant message for streaming
    const assistantMessage: Message = { role: 'assistant', content: '', timestamp: Date.now() };
    setMessages((prev) => [...prev, assistantMessage]);

    try {
      // Use streaming endpoint
      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: modelToUse,
          message: messageToSend,
          conversationHistory: messages,
          userName: userPrefs.userName,
          assistantName: userPrefs.assistantName,
          searchMode: isSearch,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullContent = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.chunk) {
                  fullContent += data.chunk;
                  setMessages((prev) => {
                    const newMessages = [...prev];
                    newMessages[newMessages.length - 1] = {
                      role: 'assistant',
                      content: fullContent,
                    };
                    return newMessages;
                  });
                }
                if (data.error) {
                  throw new Error(data.error);
                }
              } catch (e) {
                // Skip invalid JSON
              }
            }
          }
        }
      }

      // Speak the response if voice is enabled
      if (voiceEnabled && fullContent) {
        speak(fullContent);
      }
    } catch (error) {
      setMessages((prev) => {
        const newMessages = [...prev];
        newMessages[newMessages.length - 1] = {
          role: 'assistant',
          content: 'Error: Could not get a response. Ollama may be unavailable.',
        };
        return newMessages;
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOcrUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
        setInput(data.text);
      }
    } catch (error) {
      console.error('OCR error:', error);
    } finally {
      setIsLoading(false);
      e.target.value = '';
    }
  };

  // Voice Input
  const startListening = () => {
    // Check for browser support
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      alert('Speech recognition not supported in this browser. Please use Chrome, Edge, or Safari.');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      
      recognition.continuous = false;
      recognition.interimResults = true; // Enable interim results for better UX
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        console.log('[Voice] Recognition started');
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        console.log('[Voice] Result received:', event.results);
        const transcript = Array.from(event.results)
          .map((result: any) => result[0].transcript)
          .join('');
        setInput(transcript);
        
        if (event.results[0].isFinal) {
          setIsListening(false);
        }
      };

      recognition.onerror = (event: any) => {
        console.error('[Voice] Recognition error:', event.error);
        setIsListening(false);
        
        // User-friendly error messages
        if (event.error === 'not-allowed') {
          alert('⚠️ Microphone Access Required\n\nPlease:\n1. Click the lock icon in the address bar\n2. Allow microphone access\n3. Refresh the page and try again');
        } else if (event.error === 'no-speech') {
          console.log('[Voice] No speech detected - try again');
        } else if (event.error === 'network') {
          alert('Network error. Please check your internet connection and try again.');
        } else if (event.error === 'audio-capture') {
          alert('No microphone found. Please connect a microphone and try again.');
        } else {
          alert(`Speech recognition error: ${event.error}\n\nPlease try again or use text input.`);
        }
      };

      recognition.onend = () => {
        console.log('[Voice] Recognition ended');
        setIsListening(false);
      };

      recognition.start();
      console.log('[Voice] Recognition started successfully');
    } catch (error) {
      console.error('[Voice] Failed to start recognition:', error);
      alert('Failed to start voice recognition. Please try again or use text input.');
      setIsListening(false);
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  // Voice Output
  const speak = async (text: string) => {
    if (!voiceEnabled) return;
    
    // Stop any current speech
    window.speechSynthesis.cancel();
    
    // Clean text for speech
    const cleanText = text
      .replace(/[*_`#]/g, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/```[\s\S]*?```/g, 'code block')
      .replace(/#{1,6}\s/g, '')
      .replace(/\n{2,}/g, '\n')
      .replace(/\n/g, ', ')
      .slice(0, 1000); // Limit length
    
    const utterance = new SpeechSynthesisUtterance(cleanText);
    
    // Try to find a better voice
    const voices = window.speechSynthesis.getVoices();
    
    // Prefer high-quality voices in this order:
    // 1. Google voices (usually high quality)
    // 2. Microsoft voices (Windows)
    // 3. Apple voices (Mac)
    // 4. Any English voice
    const preferredVoices = [
      'Google US English',
      'Google UK English Female',
      'Microsoft David',
      'Microsoft Zira',
      'Microsoft Mark',
      'Samantha',
      'Alex',
      'Daniel',
      'Karen',
      'Tessa',
      'Veena',
    ];
    
    let selectedVoice = voices.find(v => 
      preferredVoices.some(pv => v.name.includes(pv))
    );
    
    // Fallback to any English voice
    if (!selectedVoice) {
      selectedVoice = voices.find(v => 
        v.lang.startsWith('en') && v.localService !== false
      );
    }
    
    // Final fallback to any voice
    if (!selectedVoice && voices.length > 0) {
      selectedVoice = voices[0];
    }
    
    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }
    
    // Natural speech settings
    utterance.rate = 0.95; // Slightly slower for clarity
    utterance.pitch = 1;
    utterance.volume = 1;
    utterance.lang = 'en-US';
    
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    
    window.speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  };

  const speakLastMessage = () => {
    const lastAssistantMessage = [...messages].reverse().find(m => m.role === 'assistant');
    if (lastAssistantMessage) {
      speak(lastAssistantMessage.content);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
    if (e.key === '/' && input.startsWith('/')) {
      e.preventDefault();
      setShowCommands(true);
    }
  };

  const handleDocumentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `Document "${file.name}" uploaded successfully. I can now answer questions about it.\n\nYou can ask me:\n- "What is this document about?"\n- "Summarize the key points"\n- "Find information about X in the document"\n\nOr use: \`/doc ${data.document.id} your question\` to query it directly.`,
        }]);
      } else {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: 'Failed to upload document. Please try again.',
        }]);
      }
    } catch (error) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Error uploading document: ' + (error instanceof Error ? error.message : 'Unknown error'),
      }]);
    } finally {
      setIsLoading(false);
      e.target.value = '';
    }
  };

  const handleSelectCommand = (command: any) => {
    switch (command.action) {
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
      case 'switch_expert':
        setInput('/expert ');
        break;
      case 'search_memory':
        setInput('/memory ');
        break;
      case 'search_docs':
        window.location.href = '/documents';
        break;
      case 'weekly_briefing':
        setInput('/briefing ');
        break;
      case 'sam_search':
        setInput('/sam ');
        break;
      case 'math':
        setInput('/math ');
        break;
      case 'visualize':
        setInput('/visualize ');
        break;
      case 'intelligence':
        window.location.href = '/intelligence';
        break;
      case 'self_reflect':
        window.location.href = '/self-reflection';
        break;
      case 'book':
        window.location.href = '/book-writer';
        break;
      case 'security':
        window.location.href = '/security';
        break;
      case 'research':
        window.location.href = '/research';
        break;
      case 'show_calendar':
        window.location.href = '/calendar';
        break;
      case 'show_tasks':
        setInput('/tasks ');
        break;
      case 'show_contacts':
        setInput('/contacts ');
        break;
      case 'show_notes':
        window.location.href = '/notes';
        break;
      case 'clear_chat':
        setMessages([]);
        break;
      case 'show_help':
        const helpText = 'Available commands:\n' + 
          COMMANDS.map(c => `${c.name} - ${c.description}`).join('\n');
        setMessages(prev => [...prev, { role: 'assistant', content: helpText }]);
        break;
      default:
        setInput(command.name + ' ');
    }
    setShowCommands(false);
    inputRef.current?.focus();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-4xl font-bold text-white mb-2">AI Research Assistant</h1>
          <p className="text-gray-300">Your intelligent companion for research and analysis</p>
        </div>

        {/* Model & Expert Selection - Top */}
        <div className="bg-slate-800 rounded-lg p-4 mb-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <label className="text-white font-medium">Model</label>
                <div className="flex items-center gap-2">
                  <span className={`text-sm ${ollamaHealthy ? 'text-green-400' : 'text-red-400'}`}>
                    {ollamaHealthy ? '● Ollama Online' : '● Ollama Offline'}
                  </span>
                  <SettingsPanel />
                </div>
              </div>
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="w-full bg-slate-700 text-white border-0 rounded-lg px-4 py-2 focus:ring-2 focus:ring-purple-500"
              >
                {models.map((model) => (
                  <option key={model} value={model}>
                    {model}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <label className="text-white font-medium">Expert Mode</label>
                {selectedExpert && (
                  <button 
                    onClick={() => setSelectedExpert(null)}
                    className="text-xs text-gray-400 hover:text-white"
                  >
                    Clear
                  </button>
                )}
              </div>
              <div className="relative">
                <button
                  ref={expertDropdownRef}
                  onClick={() => setShowExpertSelector(!showExpertSelector)}
                  className={`w-full text-left px-4 py-2 rounded-lg flex items-center justify-between ${
                    selectedExpert ? 'bg-purple-900/50 text-purple-200' : 'bg-slate-700 text-gray-300'
                  }`}
                >
                  <span>{selectedExpert ? `${selectedExpert.name} (${selectedExpert.role})` : 'General Assistant'}</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
          
          {/* Brand Voice Selector */}
          <div className="mt-4 pt-4 border-t border-slate-700">
            <div className="flex items-center justify-between mb-2">
              <label className="text-white font-medium">Brand Context</label>
              {selectedBrandId && (
                <button 
                  onClick={() => {
                    setSelectedBrandId(null);
                    setSelectedProjectId(null);
                  }}
                  className="text-xs text-gray-400 hover:text-white"
                >
                  Clear
                </button>
              )}
            </div>
            <BrandVoiceSelector 
              onBrandSelect={setSelectedBrandId}
              selectedBrandId={selectedBrandId}
            />
            {selectedBrandId && (
              <div className="mt-2 text-xs text-purple-400 flex items-center gap-2">
                <span>📎</span>
                <span>Brand voice context will be included in responses</span>
                <button 
                  onClick={() => window.location.href = '/brand-workspace'}
                  className="text-purple-300 hover:text-purple-200 underline ml-2"
                >
                  Manage →
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Expert Dropdown Portal - rendered outside backdrop-blur containers */}
        {showExpertSelector && typeof window !== 'undefined' && createPortal(
          <div 
            className="fixed inset-0 z-[9999]" 
            onClick={() => setShowExpertSelector(false)}
          >
            <div 
              className="absolute bg-slate-800 border border-slate-600 rounded-lg shadow-xl max-h-60 overflow-y-auto"
              style={{ 
                top: expertDropdownRef.current?.getBoundingClientRect().bottom || 0,
                left: expertDropdownRef.current?.getBoundingClientRect().left || 0,
                width: expertDropdownRef.current?.getBoundingClientRect().width || 200,
              }}
              onClick={(e) => e.stopPropagation()}
            >
                <button
                  onClick={() => { setSelectedExpert(null); setShowExpertSelector(false); }}
                  className="w-full px-4 py-2 text-left hover:bg-slate-700 text-gray-300"
                >
                  <div className="font-medium">General Assistant</div>
                  <div className="text-xs text-gray-400">Default AI without specialization</div>
                </button>
                {experts.map((expert) => (
                  <button
                    key={expert.id}
                    onClick={() => { setSelectedExpert(expert); setShowExpertSelector(false); }}
                    className={`w-full px-4 py-2 text-left hover:bg-slate-700 ${
                      selectedExpert?.id === expert.id ? 'bg-purple-900/50' : ''
                    }`}
                  >
                    <div className="font-medium text-white">{expert.name}</div>
                    <div className="text-xs text-purple-300">{expert.role}</div>
                  </button>
                ))}
            </div>
          </div>,
          document.body
        )}

        {/* Chat Container - Full Width */}
        <div className="bg-slate-800/50 backdrop-blur rounded-lg p-4 mb-4 flex flex-col" style={{ minHeight: '500px' }}>
          {/* Chat Messages - grows to fill space */}
          <div className="flex-1 overflow-y-auto mb-4" style={{ maxHeight: '60vh' }}>
            {messages.length === 0 ? (
              <div className="text-center text-gray-400 h-full flex flex-col items-center justify-center">
                <div className="text-6xl mb-4">🤖</div>
                <p className="text-lg">Welcome, {userPrefs.userName || 'User'}!</p>
                <p className="text-sm mt-2">I'm {userPrefs.assistantName || 'your AI Assistant'}, ready to help.</p>
                <p className="text-xs mt-4 text-purple-400">I have automated capabilities: Intelligence, Self-Reflection, Book Writing, Security</p>
                <p className="text-sm mt-4">What would you like to work on?</p>
              </div>
            ) : (
              messages.map((message, index) => (
                <div
                  key={index}
                  className={`mb-4 ${
                    message.role === 'user' ? 'flex justify-end' : 'flex justify-start'
                  }`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg px-4 py-3 group relative ${
                      message.role === 'user'
                        ? 'bg-purple-600 text-white'
                        : 'bg-slate-700 text-gray-100'
                    }`}
                  >
                    {message.role === 'user' ? (
                      <p>{message.content}</p>
                    ) : (
                      <>
                        <MarkdownRenderer content={message.content} />
                        {message.visualization && (
                          <Visualization code={message.visualization} />
                        )}
                      </>
                    )}
                    <button
                      onClick={() => navigator.clipboard.writeText(message.content)}
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 rounded bg-gray-600 hover:bg-gray-500 text-white text-xs transition-opacity"
                      title="Copy to clipboard"
                    >
                      Copy
                    </button>
                  </div>
                </div>
              ))
            )}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-slate-700 text-gray-100 rounded-lg px-4 py-3">
                  <p>Thinking...</p>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Area */}
        <div className="bg-slate-800/50 backdrop-blur rounded-lg p-4 mb-4 relative">
          <CommandMenu onSelectCommand={handleSelectCommand} />
          
          {/* Documents Panel (expandable) */}
          {showDocuments && documents.length > 0 && (
            <div className="mb-3 p-3 bg-slate-700/50 rounded-lg max-h-40 overflow-y-auto">
              <div className="text-sm text-gray-400 mb-2">Available Documents:</div>
              <div className="flex flex-wrap gap-2">
                {documents.map(doc => (
                  <button
                    key={doc.id}
                    onClick={() => {
                      setInput(`/doc ${doc.id} `);
                      setShowDocuments(false);
                      inputRef.current?.focus();
                    }}
                    className="px-3 py-1 rounded text-sm bg-slate-600 text-gray-300 hover:bg-slate-500"
                  >
                    {doc.title}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* History Panel (expandable) */}
          {showHistory && (
            <div className="mb-3 p-3 bg-slate-700/50 rounded-lg max-h-80 overflow-y-auto">
              <div className="flex justify-between items-center mb-3">
                <div className="text-sm text-gray-400 font-medium">Chat History</div>
                <div className="flex gap-2">
                  {messages.length > 0 && (
                    <button
                      onClick={saveCurrentChat}
                      className="text-xs px-2 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded"
                    >
                      Save Chat
                    </button>
                  )}
                  {messages.length > 0 && (
                    <button
                      onClick={() => {
                        if (confirm('Clear current conversation?')) {
                          setMessages([]);
                        }
                      }}
                      className="text-xs text-red-400 hover:text-red-300"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
              
              {/* Current Session */}
              <div className="mb-3">
                <div className="text-xs text-gray-500 mb-1">Current Session</div>
                {messages.length === 0 ? (
                  <div className="text-sm text-gray-500 italic">No messages yet</div>
                ) : (
                  <div className="space-y-1">
                    {messages.slice(-5).map((msg, idx) => (
                      <div key={idx} className="text-xs p-2 rounded bg-slate-600/50">
                        <span className={msg.role === 'user' ? 'text-purple-400' : 'text-green-400'}>
                          {msg.role === 'user' ? 'You:' : 'AI:'}
                        </span>
                        <span className="text-gray-300 ml-1">{msg.content.substring(0, 60)}{msg.content.length > 60 ? '...' : ''}</span>
                      </div>
                    ))}
                    {messages.length > 5 && (
                      <div className="text-xs text-gray-500">+{messages.length - 5} more messages</div>
                    )}
                  </div>
                )}
              </div>
              
              {/* Saved Chats */}
              {savedChats.length > 0 && (
                <div>
                  <div className="text-xs text-gray-500 mb-1">Saved Conversations</div>
                  <div className="space-y-1">
                    {savedChats.slice(0, 5).map((chat) => (
                      <button
                        key={chat.id}
                        onClick={() => loadChat(chat.id)}
                        className="w-full text-left text-xs p-2 rounded bg-slate-600/30 hover:bg-slate-600/50 text-gray-300"
                      >
                        <div className="flex justify-between items-center">
                          <span className="font-medium truncate">{chat.title}</span>
                          <span className="text-gray-500 ml-2">{new Date(chat.updated_at).toLocaleDateString()}</span>
                        </div>
                        <div className="text-gray-500 truncate mt-0.5">{chat.summary}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Text Input - Full Width */}
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={searchMode ? "Search the web..." : "Type your message..."}
            className="w-full bg-slate-700 text-white border-0 rounded-lg px-4 py-3 resize-none focus:ring-2 focus:ring-purple-500 mb-3"
            rows={3}
            disabled={isLoading || isListening}
          />

          {/* Action Buttons Row */}
          <div className="flex gap-2 items-center flex-wrap">
            {/* Document Upload Button */}
            <label className="p-3 rounded-lg transition-colors bg-slate-700 text-gray-400 hover:text-white hover:bg-slate-600 cursor-pointer" title="Upload document">
              <input
                type="file"
                accept=".pdf,.doc,.docx,.txt,.md"
                onChange={handleDocumentUpload}
                className="hidden"
                disabled={isLoading}
              />
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </label>

            {/* Show Documents Button */}
            {documents.length > 0 && (
              <button
                onClick={() => setShowDocuments(!showDocuments)}
                className={`p-3 rounded-lg transition-colors ${
                  showDocuments ? 'bg-purple-600 text-white' : 'bg-slate-700 text-gray-400 hover:text-white hover:bg-slate-600'
                }`}
                title="Show documents"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </button>
            )}

            {/* History Button */}
            <button
              onClick={() => setShowHistory(!showHistory)}
              className={`p-3 rounded-lg transition-colors ${
                showHistory ? 'bg-purple-600 text-white' : 'bg-slate-700 text-gray-400 hover:text-white hover:bg-slate-600'
              }`}
              title="Chat history"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>

            {/* Search Toggle */}
            <button
              onClick={() => {
                setSearchMode(!searchMode);
                inputRef.current?.focus();
              }}
              className={`p-3 rounded-lg transition-colors flex items-center gap-1 ${
                searchMode ? 'bg-green-600 text-white ring-2 ring-green-400' : 'bg-slate-700 text-gray-400 hover:text-white'
              }`}
              title={searchMode ? 'Web Search ON - Click to disable' : 'Web Search OFF - Click to enable'}
            >
              <svg className="w-5 h-5" fill={searchMode ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              {searchMode && <span className="text-xs font-bold">ON</span>}
            </button>

            {/* Image Upload for OCR */}
            <label className="p-3 rounded-lg transition-colors bg-slate-700 text-gray-400 hover:text-white cursor-pointer" title="Upload image for OCR">
              <input
                type="file"
                accept="image/*"
                onChange={handleOcrUpload}
                className="hidden"
                disabled={isLoading}
              />
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </label>

            {/* Voice Input Button */}
            <button
              onClick={isListening ? stopListening : startListening}
              disabled={isLoading}
              className={`p-3 rounded-lg transition-colors ${
                isListening 
                  ? 'bg-red-600 text-white animate-pulse' 
                  : 'bg-slate-700 text-gray-400 hover:text-white hover:bg-slate-600'
              }`}
              title={isListening ? 'Stop listening' : 'Voice input'}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </button>

            {/* Voice Output Toggle */}
            <button
              onClick={() => setVoiceEnabled(!voiceEnabled)}
              className={`p-3 rounded-lg transition-colors ${
                voiceEnabled 
                  ? 'bg-purple-600 text-white' 
                  : 'bg-slate-700 text-gray-400 hover:text-white hover:bg-slate-600'
              }`}
              title={voiceEnabled ? 'Voice output ON - Click to disable' : 'Voice output OFF - Click to enable'}
            >
              <svg className="w-5 h-5" fill={voiceEnabled ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
              </svg>
            </button>

            {/* Speak Last Message Button */}
            {messages.length > 0 && voiceEnabled && (
              <button
                onClick={isSpeaking ? stopSpeaking : speakLastMessage}
                disabled={isLoading}
                className={`p-3 rounded-lg transition-colors ${
                  isSpeaking 
                    ? 'bg-green-600 text-white animate-pulse' 
                    : 'bg-slate-700 text-gray-400 hover:text-white hover:bg-slate-600'
                }`}
                title={isSpeaking ? 'Stop speaking' : 'Read last response'}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                </svg>
              </button>
            )}

            <div className="flex-1"></div>

            <button
              onClick={sendMessage}
              disabled={isLoading || !input.trim()}
              className="bg-purple-600 hover:bg-purple-700 disabled:bg-slate-600 text-white font-bold px-6 py-3 rounded-lg transition-colors"
            >
              Send
            </button>
          </div>
          <p className="text-gray-400 text-sm mt-2">
            {searchMode 
              ? '🔍 Web Search ENABLED - All responses will include web search results. Click the search icon to disable.' 
              : 'Press Enter to send, Shift+Enter for new line • Type / for commands • Upload docs with 📄'
            }
          </p>
        </div>
      </div>
    </div>
  );
}