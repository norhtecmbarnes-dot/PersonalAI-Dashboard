'use client';

import { useState, useEffect, useRef } from 'react';

interface Command {
  name: string;
  description: string;
  action: string;
  icon: string;
}

const COMMANDS: Command[] = [
  { name: '/search', description: 'Toggle web search mode', action: 'web_search', icon: '🔍' },
  { name: '/brand', description: 'Open Brand Workspace', action: 'brand_workspace', icon: '🏢' },
  { name: '/brand-chat', description: 'Chat with Brand Voice & Project docs', action: 'brand_chat', icon: '💬' },
  { name: '/math', description: 'Calculate a math expression', action: 'math', icon: '🔢' },
  { name: '/visualize', description: 'Create a chart or graph', action: 'visualize', icon: '📈' },
  { name: '/expert', description: 'Switch to an expert agent', action: 'switch_expert', icon: '👤' },
  { name: '/memory', description: 'Search your knowledge base', action: 'search_memory', icon: '🧠' },
  { name: '/documents', description: 'Search uploaded documents', action: 'search_docs', icon: '📄' },
  { name: '/briefing', description: 'Generate weekly briefing', action: 'weekly_briefing', icon: '📊' },
  { name: '/sam', description: 'Search SAM.gov opportunities', action: 'sam_search', icon: '🏛️' },
  { name: '/intelligence', description: 'Intelligence report & bid opportunities', action: 'intelligence', icon: '🎯' },
  { name: '/reflect', description: 'Run self-reflection analysis', action: 'self_reflect', icon: '🪞' },
  { name: '/research', description: 'Run external research', action: 'research', icon: '🔬' },
  { name: '/book', description: 'Continue writing the book', action: 'book', icon: '📚' },
  { name: '/security', description: 'Run security scan', action: 'security', icon: '🔒' },
  { name: '/calendar', description: 'Show upcoming events', action: 'show_calendar', icon: '📅' },
  { name: '/tasks', description: 'Show pending tasks', action: 'show_tasks', icon: '✅' },
  { name: '/contacts', description: 'Show saved contacts', action: 'show_contacts', icon: '👥' },
  { name: '/notes', description: 'Open smart notes system', action: 'show_notes', icon: '📝' },
  { name: '/clear', description: 'Clear chat history', action: 'clear_chat', icon: '🗑️' },
  { name: '/help', description: 'Show available commands', action: 'show_help', icon: '❓' },
];

interface CommandMenuProps {
  onSelectCommand: (command: Command) => void;
}

export function CommandMenu({ onSelectCommand }: CommandMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);

  const filteredCommands = COMMANDS.filter(cmd =>
    cmd.name.toLowerCase().includes(search.toLowerCase()) ||
    cmd.description.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && !isOpen) {
        e.preventDefault();
        setIsOpen(true);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [search]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(i => Math.min(i + 1, filteredCommands.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredCommands[selectedIndex]) {
        onSelectCommand(filteredCommands[selectedIndex]);
        setIsOpen(false);
        setSearch('');
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      ref={menuRef}
      className="absolute bottom-full left-0 right-0 mb-2 bg-gray-800 border border-gray-700 rounded-lg shadow-xl max-h-80 overflow-hidden"
    >
      <div className="p-2 border-b border-gray-700">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a command..."
          className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white placeholder-gray-500 focus:outline-none"
          autoFocus
        />
      </div>
      
      <div className="overflow-y-auto max-h-60">
        {filteredCommands.length === 0 ? (
          <div className="p-4 text-gray-500 text-center">No commands found</div>
        ) : (
          filteredCommands.map((cmd, index) => (
            <button
              key={cmd.name}
              onClick={() => {
                onSelectCommand(cmd);
                setIsOpen(false);
                setSearch('');
              }}
              className={`w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-gray-700 ${
                index === selectedIndex ? 'bg-gray-700' : ''
              }`}
            >
              <span className="text-xl">{cmd.icon}</span>
              <div>
                <div className="text-white font-medium">{cmd.name}</div>
                <div className="text-gray-400 text-sm">{cmd.description}</div>
              </div>
            </button>
          ))
        )}
      </div>
      
      <div className="p-2 border-t border-gray-700 text-xs text-gray-500 flex justify-between">
        <span>↑↓ Navigate</span>
        <span>↵ Select</span>
        <span>Esc Close</span>
      </div>
    </div>
  );
}

export { COMMANDS };
