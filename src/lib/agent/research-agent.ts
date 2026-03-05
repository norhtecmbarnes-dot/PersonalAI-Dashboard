import { performWebSearch } from '@/lib/websearch';

export interface ResearchFinding {
  id: string;
  title: string;
  url: string;
  source: string;
  excerpt: string;
  publishedDate?: string;
  topics: string[];
  capturedAt: number;
}

export interface ResearchReport {
  id: string;
  timestamp: number;
  searchQueries: string[];
  findings: ResearchFinding[];
  summary: string;
  suggestedImprovements: string[];
  totalFindings: number;
}

const RESEARCH_TOPICS = [
  'OpenCode AI agent self-improving',
  'TinyAgent AI coding assistant',
  'Claude Code autonomous coding',
  'AI agent self-modification 2024 2025',
  'autonomous AI developer agents',
  'AI coding assistant open source alternatives',
  'self-healing AI software',
];

class ResearchAgent {
  private static instance: ResearchAgent;
  private reports: ResearchReport[] = [];
  private lastResearch: number = 0;
  private readonly RESEARCH_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours

  private constructor() {
    this.loadReports();
  }

  static getInstance(): ResearchAgent {
    if (!ResearchAgent.instance) {
      ResearchAgent.instance = new ResearchAgent();
    }
    return ResearchAgent.instance;
  }

  private loadReports(): void {
    if (typeof window === 'undefined') return;
    try {
      const stored = localStorage.getItem('research_reports');
      if (stored) {
        this.reports = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Error loading research reports:', error);
      this.reports = [];
    }
  }

  private saveReports(): void {
    if (typeof window === 'undefined') return;
    try {
      const recent = this.reports.slice(0, 30);
      localStorage.setItem('research_reports', JSON.stringify(recent));
    } catch (error) {
      console.error('Error saving research reports:', error);
    }
  }

  async performResearch(): Promise<ResearchReport> {
    const findings: ResearchFinding[] = [];
    const searchQueries: string[] = [];

    try {
      // Search for each topic
      for (const topic of RESEARCH_TOPICS) {
        searchQueries.push(topic);
        
        try {
          const results = await performWebSearch(topic);
          
          for (const result of results.slice(0, 3)) {
            const existing = findings.find(f => f.url === result.url);
            if (!existing) {
              findings.push({
                id: 'finding_' + Date.now() + Math.random().toString(36).substr(2, 9),
                title: result.title,
                url: result.url,
                source: new URL(result.url).hostname,
                excerpt: result.excerpt,
                topics: [topic],
                capturedAt: Date.now(),
              });
            }
          }
        } catch (error) {
          console.error(`Error searching for ${topic}:`, error);
        }
      }

      // Generate improvement suggestions by analyzing findings
      const suggestedImprovements = await this.generateImprovements(findings);

      const report: ResearchReport = {
        id: 'research_' + Date.now(),
        timestamp: Date.now(),
        searchQueries,
        findings,
        summary: this.generateSummary(findings),
        suggestedImprovements,
        totalFindings: findings.length,
      };

      this.reports.unshift(report);
      this.saveReports();
      this.lastResearch = Date.now();

      // Store findings in vector lake for later retrieval
      await this.storeInVectorLake(report);

      return report;
    } catch (error) {
      console.error('Research error:', error);
      return {
        id: 'research_error_' + Date.now(),
        timestamp: Date.now(),
        searchQueries,
        findings: [],
        summary: 'Research failed: ' + (error instanceof Error ? error.message : 'Unknown error'),
        suggestedImprovements: [],
        totalFindings: 0,
      };
    }
  }

  private async generateImprovements(findings: ResearchFinding[]): Promise<string[]> {
    if (findings.length === 0) return [];

    const findingsText = findings
      .slice(0, 10)
      .map(f => `Title: ${f.title}\nDescription: ${f.excerpt}`)
      .join('\n\n');

    const prompt = `Based on these research findings about AI self-improving agents and coding assistants, suggest specific improvements for an AI Research Assistant system:

${findingsText}

Provide 5-7 specific improvement ideas that could be implemented. Focus on practical features.

Return ONLY a JSON array of strings, each being a brief improvement suggestion.`;

    try {
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
      const response = await fetch(`${baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'ollama/qwen3.5:9b',
          message: prompt,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const content = data.message?.content || data.message || '';
        
        const match = content.match(/\[[\s\S]*\]/);
        if (match) {
          return JSON.parse(match[0]);
        }
      }
    } catch (error) {
      console.error('Error generating improvements:', error);
    }

    return [
      'Research external AI agent developments for new feature ideas',
      'Monitor open source AI coding assistants for best practices',
    ];
  }

  private generateSummary(findings: ResearchFinding[]): string {
    const uniqueSources = new Set(findings.map(f => f.source)).size;
    
    if (findings.length === 0) {
      return 'No research findings available.';
    }

    return `Found ${findings.length} articles from ${uniqueSources} sources covering AI self-improving agents, autonomous coding, and related technologies.`;
  }

  private async storeInVectorLake(report: ResearchReport): Promise<void> {
    if (typeof window === 'undefined') return;
    try {
      const existingData = localStorage.getItem('research_findings') || '[]';
      const existing = JSON.parse(existingData);
      
      const newData = [
        ...report.findings.map(f => ({
          id: f.id,
          content: `${f.title}. ${f.excerpt}`,
          metadata: {
            type: 'research',
            url: f.url,
            topics: f.topics,
            capturedAt: f.capturedAt,
          },
        })),
        ...existing.slice(0, 100),
      ];
      
      localStorage.setItem('research_findings', JSON.stringify(newData.slice(0, 200)));
    } catch (error) {
      console.error('Error storing in vector lake:', error);
    }
  }

  shouldRunResearch(): boolean {
    return Date.now() - this.lastResearch > this.RESEARCH_INTERVAL;
  }

  getLatestReport(): ResearchReport | null {
    return this.reports[0] || null;
  }

  getReportHistory(): ResearchReport[] {
    return this.reports;
  }
}

export const researchAgent = ResearchAgent.getInstance();
