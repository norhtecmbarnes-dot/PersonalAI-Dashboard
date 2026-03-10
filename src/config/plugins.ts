export interface PluginConfig {
  id: string;
  enabled: boolean;
  personal: boolean;
  name: string;
  route: string;
  icon?: string;
  description: string;
  category: 'ai' | 'productivity' | 'integration' | 'writing';
}

export const PLUGINS: Record<string, PluginConfig> = {
  // Core Features (Out-of-Box)
  'brand-workspace': {
    id: 'brand-workspace',
    enabled: true,
    personal: false,
    name: 'Brand Workspace',
    route: '/brand-workspace',
    icon: 'briefcase',
    description: 'NotebookLM-style knowledge management',
    category: 'productivity',
  },
  'self-improvement': {
    id: 'self-improvement',
    enabled: true,
    personal: false,
    name: 'Tool Efficiency',
    route: '/self-improvement',
    icon: 'gauge',
    description: 'Analyze and improve tool usage',
    category: 'ai',
  },
  'documents': {
    id: 'documents',
    enabled: true,
    personal: false,
    name: 'Documents',
    route: '/documents',
    icon: 'file-text',
    description: 'Document management and search',
    category: 'productivity',
  },
  'notes': {
    id: 'notes',
    enabled: true,
    personal: false,
    name: 'Notes',
    route: '/notes',
    icon: 'sticky-note',
    description: ' AI-contextualized notes',
    category: 'productivity',
  },
  'calendar': {
    id: 'calendar',
    enabled: true,
    personal: false,
    name: 'Calendar',
    route: '/calendar',
    icon: 'calendar',
    description: 'Calendar with ICS export',
    category: 'productivity',
  },

  // Personal Plugins (Optional)
   'book-writer': {
    id: 'book-writer',
    enabled: true,
    personal: true,
    name: 'Document Creator',
    route: '/book-writer',
    icon: 'book',
    description: 'Generate AI Assistant documentation as a CC-licensed document',
    category: 'writing',
  },
  'sam-gov': {
    id: 'sam-gov',
    enabled: true,
    personal: true,
    name: 'SAM.gov',
    route: '/sam',
    icon: 'landmark',
    description: 'Government contract opportunities',
    category: 'integration',
  },
  'intelligence': {
    id: 'intelligence',
    enabled: true,
    personal: true,
    name: 'Intelligence Reports',
    route: '/intelligence',
    icon: 'newspaper',
    description: 'Daily scanning of space/commercial news',
    category: 'ai',
  },
  'research': {
    id: 'research',
    enabled: true,
    personal: true,
    name: 'Research Agent',
    route: '/research',
    icon: 'flask-conical',
    description: 'Self-improving AI research',
    category: 'ai',
  },
  'security': {
    id: 'security',
    enabled: true,
    personal: true,
    name: 'Security Scanner',
    route: '/security',
    icon: 'shield',
    description: 'Code and configuration security analysis',
    category: 'ai',
  },
};

export function getCoreFeatures(): PluginConfig[] {
  return Object.values(PLUGINS).filter(p => !p.personal && p.enabled);
}

export function getPersonalPlugins(): PluginConfig[] {
  return Object.values(PLUGINS).filter(p => p.personal && p.enabled);
}

export function getAllFeatures(): PluginConfig[] {
  return Object.values(PLUGINS).filter(p => p.enabled);
}

export function isPluginEnabled(id: string): boolean {
  return PLUGINS[id]?.enabled ?? false;
}

export function getPluginRoute(id: string): string | null {
  return PLUGINS[id]?.route ?? null;
}