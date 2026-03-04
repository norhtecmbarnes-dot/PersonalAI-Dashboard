import { performWebSearch } from '../websearch';

export interface AgentFramework {
  name: string;
  description: string;
  githubUrl?: string;
  documentationUrl?: string;
  capabilities: string[];
  integrationComplexity: 'simple' | 'medium' | 'complex';
  suggestedUseCase?: string;
  lastResearched: number;
}

export interface EcosystemResearchReport {
  id: string;
  timestamp: number;
  frameworks: AgentFramework[];
  suggestedIntegrations: SuggestedIntegration[];
  marketTrends: string[];
  newCapabilities: string[];
  summary: string;
}

export interface SuggestedIntegration {
  framework: string;
  capability: string;
  reason: string;
  priority: 'high' | 'medium' | 'low';
  estimatedEffort: string;
  implementationNotes: string;
}

interface KnownFramework {
  name: string;
  keywords: string[];
  category: 'autonomous-agent' | 'rag' | 'orchestration' | 'memory' | 'tools' | 'evaluation';
}

const KNOWN_FRAMEWORKS: KnownFramework[] = [
  { name: 'OpenClaw', keywords: ['openclaw', 'claw', 'law', 'legal ai', 'legal automation'], category: 'autonomous-agent' },
  { name: 'AutoGPT', keywords: ['autogpt', 'autonomous agent', 'gpt agent'], category: 'autonomous-agent' },
  { name: 'LangChain', keywords: ['langchain', 'lang chain', 'llm framework'], category: 'orchestration' },
  { name: 'LlamaIndex', keywords: ['llamaindex', 'llama index', 'data framework', 'rag'], category: 'rag' },
  { name: 'CrewAI', keywords: ['crewai', 'crew ai', 'multi-agent'], category: 'autonomous-agent' },
  { name: 'AutoGen', keywords: ['autogen', 'auto gen', 'multi-agent conversation'], category: 'autonomous-agent' },
  { name: 'AgentGPT', keywords: ['agentgpt', 'browser autonomous'], category: 'autonomous-agent' },
  { name: 'BabyAGI', keywords: ['babyagi', 'baby agi', 'task-driven'], category: 'autonomous-agent' },
  { name: 'SuperAGI', keywords: ['superagi', 'super agi', 'agent framework'], category: 'autonomous-agent' },
  { name: 'GPT-Engineer', keywords: ['gpt-engineer', 'code generation'], category: 'tools' },
  { name: 'LangGraph', keywords: ['langgraph', 'lang graph', 'stateful agent'], category: 'orchestration' },
  { name: 'Haystack', keywords: ['haystack', 'nlp', 'question answering'], category: 'rag' },
  { name: 'MemGPT', keywords: ['memgpt', 'unlimited context', 'memory'], category: 'memory' },
  { name: 'Mem0', keywords: ['mem0', 'memory layer', 'ai memory'], category: 'memory' },
  { name: 'AgentOps', keywords: ['agentops', 'agent observability', 'agent monitoring'], category: 'evaluation' },
  { name: 'Phoenix', keywords: ['phoenix arize', 'llm observability', 'arize'], category: 'evaluation' },
  { name: 'Ragas', keywords: ['ragas', 'rag evaluation', 'rag metrics'], category: 'evaluation' },
  { name: 'DeepEval', keywords: ['deepeval', 'llm evaluation', 'assertions'], category: 'evaluation' },
  { name: 'Dify', keywords: ['dify', 'llm app platform', 'no code ai'], category: 'orchestration' },
  { name: 'Flowise', keywords: ['flowise', 'drag and drop', 'llm flow'], category: 'orchestration' },
  { name: 'Semantic Kernel', keywords: ['semantic kernel', 'microsoft', 'ai orchestration'], category: 'orchestration' },
  { name: 'OpenAI Swarm', keywords: ['openai swarm', 'swarm', 'multi-agent orchestration'], category: 'autonomous-agent' },
  { name: 'Agent Zero', keywords: ['agent zero', 'autonomous', 'docker agent'], category: 'autonomous-agent' },
  { name: 'Remotion', keywords: ['remotion', 'video generation', 'programmatic video'], category: 'tools' },
];

const CURRENT_CAPABILITIES = [
  'chat-multiple-models',
  'document-management',
  'brand-voice',
  'intelligence-reports',
  'ocr-image-recognition',
  'notes',
  'calendar',
  'workspace',
  'expert-agents',
  'sam-gov',
  'telegram-bot',
  'feature-requests',
  'agent-zero-docker',
  'remotion-videos',
];

class AgentEcosystemResearch {
  private frameworks: Map<string, AgentFramework> = new Map();
  private reports: EcosystemResearchReport[] = [];
  private lastResearch: number = 0;
  private readonly RESEARCH_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours

  constructor() {
    this.loadCachedFrameworks();
  }

  private loadCachedFrameworks(): void {
    try {
      if (typeof window !== 'undefined') {
        const cached = localStorage.getItem('agent_ecosystem_cache');
        if (cached) {
          const data = JSON.parse(cached);
          for (const fw of data.frameworks || []) {
            this.frameworks.set(fw.name, fw);
          }
        }
      }
    } catch {
      // Cache load failed
    }
  }

  private saveCache(): void {
    try {
      if (typeof window !== 'undefined') {
        const data = {
          frameworks: Array.from(this.frameworks.values()),
          lastUpdated: Date.now(),
        };
        localStorage.setItem('agent_ecosystem_cache', JSON.stringify(data));
      }
    } catch {
      // Cache save failed
    }
  }

  async researchEcosystem(): Promise<EcosystemResearchReport> {
    const frameworks: AgentFramework[] = [];
    const suggestedIntegrations: SuggestedIntegration[] = [];
    const marketTrends: string[] = [];
    const newCapabilities: string[] = [];

    // Research a subset of frameworks each time
    const frameworksToResearch = this.getFrameworksToResearch();
    
    for (const framework of frameworksToResearch) {
      try {
        const info = await this.researchFramework(framework);
        if (info) {
          frameworks.push(info);
          this.frameworks.set(framework.name, info);
          
          const suggestions = this.suggestIntegration(info);
          suggestedIntegrations.push(...suggestions);
        }
      } catch (error) {
        console.error(`Failed to research ${framework.name}:`, error);
      }
    }

    this.saveCache();
    this.lastResearch = Date.now();

    const report: EcosystemResearchReport = {
      id: `ecosystem_${Date.now()}`,
      timestamp: Date.now(),
      frameworks: frameworks.sort((a, b) => a.name.localeCompare(b.name)),
      suggestedIntegrations: suggestedIntegrations.sort((a, b) => {
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }),
      marketTrends,
      newCapabilities: this.identifyNewCapabilities(frameworks),
      summary: this.generateSummary(frameworks, suggestedIntegrations),
    };

    this.reports.unshift(report);
    if (this.reports.length > 30) {
      this.reports = this.reports.slice(0, 30);
    }

    return report;
  }

  private getFrameworksToResearch(): KnownFramework[] {
    const now = Date.now();
    const researchCandidates: KnownFramework[] = [];
    
    for (const fw of KNOWN_FRAMEWORKS) {
      const cached = this.frameworks.get(fw.name);
      if (!cached || now - cached.lastResearched > 7 * 24 * 60 * 60 * 1000) {
        researchCandidates.push(fw);
      }
    }

    return researchCandidates.slice(0, 5);
  }

  private async researchFramework(framework: KnownFramework): Promise<AgentFramework | null> {
    try {
      const searchQuery = `${framework.name} github features capabilities ${framework.category}`;
      const results = await performWebSearch(searchQuery);

      if (!results || results.length === 0) {
        return null;
      }

      const allText = results.map(r => r.excerpt || r.title).join(' ');

      const capabilities = this.extractCapabilities(allText, framework);
      const complexity = this.assessComplexity(allText, framework);

      return {
        name: framework.name,
        description: this.extractDescription(allText, framework),
        githubUrl: this.extractGithubUrl(allText),
        documentationUrl: this.extractDocUrl(allText),
        capabilities,
        integrationComplexity: complexity,
        lastResearched: Date.now(),
      };
    } catch {
      return null;
    }
  }

  private extractCapabilities(text: string, framework: KnownFramework): string[] {
    const capabilities: string[] = [];
    
    const capabilityPatterns = [
      /supports?\s+([^.]+)/gi,
      /provides?\s+([^.]+)/gi,
      /features?:\s*([^\n]+)/gi,
      /can\s+([^.]+)/gi,
      /ability\s+to\s+([^.]+)/gi,
    ];

    for (const pattern of capabilityPatterns) {
      const matches = text.match(pattern);
      if (matches) {
        for (const match of matches) {
          const cap = match.replace(/^(supports?|provides?|features?:?|can|ability\s+to)\s*/i, '').trim();
          if (cap.length > 5 && cap.length < 100) {
            capabilities.push(cap.charAt(0).toUpperCase() + cap.slice(1).toLowerCase());
          }
        }
      }
    }

    if (framework.category === 'autonomous-agent') {
      capabilities.push('Autonomous task execution');
    }
    if (framework.category === 'rag') {
      capabilities.push('Retrieval-augmented generation');
    }
    if (framework.category === 'memory') {
      capabilities.push('Long-term memory management');
    }

    return [...new Set(capabilities)].slice(0, 10);
  }

  private extractDescription(text: string, framework: KnownFramework): string {
    const sentences = text.split(/[.!?\n]+/).filter(s => s.trim().length > 20);
    for (const sentence of sentences) {
      if (sentence.toLowerCase().includes(framework.name.toLowerCase())) {
        return sentence.trim().slice(0, 300);
      }
    }
    return sentences[0]?.trim().slice(0, 300) || `${framework.name} - ${framework.category} framework`;
  }

  private extractGithubUrl(text: string): string | undefined {
    const match = text.match(/github\.com\/[a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+/);
    return match ? `https://${match[0]}` : undefined;
  }

  private extractDocUrl(text: string): string | undefined {
    const match = text.match(/https?:\/\/[a-zA-Z0-9.-]*(?:docs|documentation|guide)[a-zA-Z0-9.-]*/);
    return match ? match[0] : undefined;
  }

  private assessComplexity(text: string, framework: KnownFramework): 'simple' | 'medium' | 'complex' {
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes('simple') || lowerText.includes('easy') || lowerText.includes('quick start')) {
      return 'simple';
    }
    
    if (lowerText.includes('complex') || lowerText.includes('advanced') || 
        lowerText.includes('enterprise') || lowerText.includes('multi-agent')) {
      return 'complex';
    }
    
    if (framework.category === 'autonomous-agent') {
      return 'complex';
    }
    
    return 'medium';
  }

  private suggestIntegration(framework: AgentFramework): SuggestedIntegration[] {
    const suggestions: SuggestedIntegration[] = [];
    
    if (CURRENT_CAPABILITIES.includes(framework.name.toLowerCase().replace(/[^a-z]/g, '-'))) {
      return suggestions;
    }

    const existingCapabilitiesLower = CURRENT_CAPABILITIES.map(c => c.toLowerCase());
    const newCapabilities = framework.capabilities.filter(
      cap => !existingCapabilitiesLower.some(existing => 
        cap.toLowerCase().includes(existing) || existing.includes(cap.toLowerCase())
      )
    );

    for (const cap of newCapabilities.slice(0, 3)) {
      let priority: 'high' | 'medium' | 'low' = 'low';
      let reason = '';
      let effort = '1-2 hours';

      if (cap.toLowerCase().includes('memory') && !CURRENT_CAPABILITIES.includes('memory')) {
        priority = 'high';
        reason = 'Memory capabilities would improve context retention across conversations';
        effort = '4-8 hours';
      } else if (cap.toLowerCase().includes('multi-agent') || cap.toLowerCase().includes('orchestration')) {
        priority = 'medium';
        reason = 'Multi-agent orchestration would enable more complex workflows';
        effort = '8-16 hours';
      } else if (cap.toLowerCase().includes('evaluation') || cap.toLowerCase().includes('observability')) {
        priority = 'medium';
        reason = 'Would help monitor and improve system quality';
        effort = '2-4 hours';
      } else if (cap.toLowerCase().includes('video') || cap.toLowerCase().includes('media')) {
        priority = 'low';
        reason = 'Would add content generation capabilities';
        effort = '4-8 hours';
      } else {
        reason = 'Could enhance existing functionality';
        effort = '2-4 hours';
      }

      if (framework.integrationComplexity === 'complex') {
        effort = '16+ hours';
      }

      suggestions.push({
        framework: framework.name,
        capability: cap,
        reason,
        priority,
        estimatedEffort: effort,
        implementationNotes: `Review ${framework.name} documentation at ${framework.documentationUrl || 'N/A'}`,
      });
    }

    return suggestions;
  }

  private identifyNewCapabilities(frameworks: AgentFramework[]): string[] {
    const capabilities = new Set<string>();
    
    for (const fw of frameworks) {
      for (const cap of fw.capabilities) {
        capabilities.add(cap);
      }
    }

    const newCaps: string[] = [];
    const existingLower = CURRENT_CAPABILITIES.map(c => c.toLowerCase());

    for (const cap of capabilities) {
      const capLower = cap.toLowerCase();
      if (!existingLower.some(e => capLower.includes(e) || e.includes(capLower))) {
        newCaps.push(cap);
      }
    }

    return newCaps.slice(0, 10);
  }

  private generateSummary(frameworks: AgentFramework[], suggestions: SuggestedIntegration[]): string {
    const highPriority = suggestions.filter(s => s.priority === 'high').length;
    const mediumPriority = suggestions.filter(s => s.priority === 'medium').length;
    
    let summary = `Researched ${frameworks.length} frameworks in the agent ecosystem. `;
    
    if (highPriority > 0) {
      summary += `Found ${highPriority} high-priority integration suggestion${highPriority > 1 ? 's' : ''}. `;
    }
    
    if (mediumPriority > 0) {
      summary += `${mediumPriority} medium-priority suggestions available. `;
    }
    
    if (suggestions.length === 0) {
      summary += 'No new integrations recommended at this time.';
    }
    
    return summary;
  }

  shouldRunResearch(): boolean {
    return Date.now() - this.lastResearch > this.RESEARCH_INTERVAL;
  }

  getCachedFrameworks(): AgentFramework[] {
    return Array.from(this.frameworks.values());
  }

  getLatestReport(): EcosystemResearchReport | null {
    return this.reports[0] || null;
  }

  getReportHistory(): EcosystemResearchReport[] {
    return this.reports;
  }

  getRecommendationsForCapability(capability: string): SuggestedIntegration[] {
    const suggestions: SuggestedIntegration[] = [];
    
    for (const fw of this.frameworks.values()) {
      const matching = fw.capabilities.filter(
        cap => cap.toLowerCase().includes(capability.toLowerCase())
      );
      
      for (const cap of matching) {
        suggestions.push({
          framework: fw.name,
          capability: cap,
          reason: `${fw.name} provides ${cap}`,
          priority: 'medium',
          estimatedEffort: fw.integrationComplexity === 'simple' ? '1-2 hours' : 
                           fw.integrationComplexity === 'medium' ? '4-8 hours' : '16+ hours',
          implementationNotes: `Check ${fw.documentationUrl || fw.githubUrl || fw.name} for implementation details`,
        });
      }
    }
    
    return suggestions;
  }
}

export const agentEcosystemResearch = new AgentEcosystemResearch();