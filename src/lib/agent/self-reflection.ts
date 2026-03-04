export interface SelfReflectionReport {
  id: string;
  timestamp: number;
  status: 'pending' | 'completed';
  
  // System Analysis
  currentCapabilities: string[];
  identifiedGaps: string[];
  inefficiencies: string[];
  
  // Recommendations
  suggestions: Suggestion[];
  suggestedTools: SuggestedTool[];
  
  // Resource Recommendations
  modelRecommendations: ModelRecommendation[];
  
  // Summary
  summary: string;
  overallScore: number; // 0-100
  
  implemented: string[];
}

export interface Suggestion {
  id: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  estimatedImpact: string;
  implementationNote?: string;
}

export interface SuggestedTool {
  name: string;
  description: string;
  purpose: string;
  implementationComplexity: 'simple' | 'medium' | 'complex';
  estimatedBenefit: 'low' | 'medium' | 'high';
}

export interface ModelRecommendation {
  modelName: string;
  reason: string;
  useCase: string;
  costImpact: 'lower' | 'same' | 'higher';
}

export class SelfReflectionService {
  private static instance: SelfReflectionService;
  private reports: SelfReflectionReport[] = [];
  private lastReflection: number = 0;
  private readonly REFLECTION_INTERVAL = 6 * 60 * 60 * 1000; // 6 hours

  private constructor() {
    this.loadReports();
  }

  static getInstance(): SelfReflectionService {
    if (!SelfReflectionService.instance) {
      SelfReflectionService.instance = new SelfReflectionService();
    }
    return SelfReflectionService.instance;
  }

  private loadReports(): void {
    try {
      const dataDir = process.cwd() + '/data';
      const reportsPath = dataDir + '/self-reflection-reports.json';
      const fs = require('fs');
      if (fs.existsSync(reportsPath)) {
        const stored = fs.readFileSync(reportsPath, 'utf-8');
        this.reports = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Error loading self-reflection reports:', error);
      this.reports = [];
    }
  }

  private saveReports(): void {
    try {
      const dataDir = process.cwd() + '/data';
      const reportsPath = dataDir + '/self-reflection-reports.json';
      const fs = require('fs');
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      const recent = this.reports.slice(0, 30);
      fs.writeFileSync(reportsPath, JSON.stringify(recent, null, 2));
    } catch (error) {
      console.error('Error saving self-reflection reports:', error);
    }
  }

  async performSelfReflection(): Promise<SelfReflectionReport> {
    const prompt = this.buildReflectionPrompt();
    
    try {
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
      const response = await fetch(`${baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'ollama/qwen2.5-coder',
          message: prompt,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get LLM reflection');
      }

      const data = await response.json();
      const content = data.message?.content || data.message || '';
      
      const report = this.parseLLMResponse(content);
      this.reports.unshift(report);
      this.saveReports();
      this.lastReflection = Date.now();
      
      return report;
    } catch (error) {
      console.error('Self-reflection error:', error);
      return this.createErrorReport(error instanceof Error ? error.message : 'Unknown error');
    }
  }

  private buildReflectionPrompt(): string {
    return `You are an AI system analyzing its own capabilities and suggesting improvements.

## Your Task
Analyze this AI Research Assistant system and provide a detailed self-improvement report.

## System Context
This is an AI Research Assistant with the following capabilities:
- Chat with multiple AI models (Ollama, GLM, OpenRouter, DeepSeek)
- Document management (upload, vectorize, chat with documents)
- Brand Voice Chat (NotebookLM-style with brand-specific documents)
- Intelligence Reports (daily scanning of space/commercial space news, SAM.gov/Canada Buys bids)
- OCR/Image Recognition (extract text from images)
- Note taking with AI contextualization
- Calendar with ICS export
- Workspace organization (folders, brands, projects)
- Expert agents (Legal, Finance, HR, etc.)
- SAM.gov integration for government contracting
- Telegram bot integration
- Feature request system with OpenCode execution
- SQLite database for persistent storage

## What You Should Analyze

1. **Current Capabilities Assessment**
   - What features does the system have?
   - What are the strengths?

2. **Identify Gaps & Inefficiencies**
   - What's missing that would make it more useful?
   - What processes are inefficient?
   - What takes too long or costs too much?

3. **Suggestions for Improvement**
   - What can be improved right now?
   - What would have the biggest impact?

4. **Suggested Tools/Features to Add**
   - What new capabilities would help users?
   - Be specific about what to build

5. **Model Recommendations**
   - Should different models be used for different tasks?
   - When should more powerful/expensive models be used?
   - When can cheaper/faster models suffice?

6. **Resource Optimization**
   - How can costs be reduced?
   - How can response times be improved?

## Output Format
Provide your analysis in this JSON format:
{
  "currentCapabilities": ["capability1", "capability2", ...],
  "identifiedGaps": ["gap1", "gap2", ...],
  "inefficiencies": ["inefficiency1", "inefficiency2", ...],
  "suggestions": [
    {
      "title": "Suggestion title",
      "description": "Detailed description",
      "priority": "high|medium|low",
      "estimatedImpact": "What improvement this would make"
    }
  ],
  "suggestedTools": [
    {
      "name": "Tool name",
      "description": "What it does",
      "purpose": "Why it's needed",
      "implementationComplexity": "simple|medium|complex",
      "estimatedBenefit": "low|medium|high"
    }
  ],
  "modelRecommendations": [
    {
      "modelName": "model name",
      "reason": "why this model",
      "useCase": "when to use",
      "costImpact": "lower|same|higher"
    }
  ],
  "summary": "2-3 sentence summary of your analysis",
  "overallScore": 0-100 number
}

Return ONLY valid JSON, no explanation.`;
  }

  private parseLLMResponse(content: string): SelfReflectionReport {
    try {
      const match = content.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        return {
          id: 'reflection_' + Date.now(),
          timestamp: Date.now(),
          status: 'completed',
          currentCapabilities: parsed.currentCapabilities || [],
          identifiedGaps: parsed.identifiedGaps || [],
          inefficiencies: parsed.inefficiencies || [],
          suggestions: parsed.suggestions || [],
          suggestedTools: parsed.suggestedTools || [],
          modelRecommendations: parsed.modelRecommendations || [],
          summary: parsed.summary || 'No summary provided',
          overallScore: parsed.overallScore || 50,
          implemented: [],
        };
      }
    } catch (error) {
      console.error('Error parsing LLM response:', error);
    }
    
    return this.createDefaultReport();
  }

  private createDefaultReport(): SelfReflectionReport {
    return {
      id: 'reflection_' + Date.now(),
      timestamp: Date.now(),
      status: 'completed',
      currentCapabilities: [
        'Chat with multiple AI models',
        'Document management',
        'Brand Voice Chat',
        'Intelligence Reports',
        'OCR/Image Recognition',
      ],
      identifiedGaps: ['Analysis completed but parsing failed'],
      inefficiencies: [],
      suggestions: [],
      suggestedTools: [],
      modelRecommendations: [],
      summary: 'Self-reflection completed but output parsing failed.',
      overallScore: 50,
      implemented: [],
    };
  }

  private createErrorReport(errorMessage: string): SelfReflectionReport {
    return {
      id: 'reflection_error_' + Date.now(),
      timestamp: Date.now(),
      status: 'pending',
      currentCapabilities: [],
      identifiedGaps: [errorMessage],
      inefficiencies: [],
      suggestions: [],
      suggestedTools: [],
      modelRecommendations: [],
      summary: 'Self-reflection failed: ' + errorMessage,
      overallScore: 0,
      implemented: [],
    };
  }

  shouldRunReflection(): boolean {
    return Date.now() - this.lastReflection > this.REFLECTION_INTERVAL;
  }

  getLatestReport(): SelfReflectionReport | null {
    return this.reports[0] || null;
  }

  getReportHistory(): SelfReflectionReport[] {
    return this.reports;
  }

  getReportsSince(timestamp: number): SelfReflectionReport[] {
    return this.reports.filter(r => r.timestamp > timestamp);
  }
}

export const selfReflectionService = SelfReflectionService.getInstance();
