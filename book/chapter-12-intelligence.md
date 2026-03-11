# Chapter 12: Building Intelligence Reports

Imagine starting your day with a comprehensive briefing: overnight news relevant to your industry, competitor moves, emerging trends, and potential opportunities. This is what **Intelligence Reports** do — they automate the research you'd otherwise spend hours doing manually.

## Important Update (March 2026)

**Traffic Reduction Initiative:** The intelligence system has been redesigned to minimize external HTTP calls and system load. External web scraping and procurement API integrations have been removed to reduce traffic. The system now provides a lightweight, local-only intelligence framework that can be extended manually when needed.

## What You'll Learn

• What **intelligence reports** are and why they matter
• Setting up **manual data collection** (reduced automation)
• Understanding **traffic-conscious design**
• Building a **report generation system** with local data
• Creating **scheduled tasks** with reduced frequency
• Designing **report templates and formatting**
• Storing and retrieving **historical reports**

---

## What is an Intelligence Report?

An intelligence report is like having a research assistant that works on-demand:

**Traditional Approach (Manual):**
• Wake up, open 10 browser tabs
• Search Google for industry news
• Check competitor websites
• Read Twitter/X for trends
• Compile findings manually
• **Time: 1-2 hours daily**

**AI Dashboard Approach (Lightweight):**
• System maintains local data structures
• Generate reports on-demand when needed
• AI analyzes local findings
• **Time: 2 minutes to generate**

### Real-World Use Cases

| Use Case | What It Monitors | Value |
|----------|------------------|-------|
| **Market Intelligence** | Industry trends, competitor pricing, new entrants | Strategic decisions |
| **Sales Intel** | Prospect news, trigger events, company changes | Better outreach |
| **Security Intel** | CVEs, threat actors, attack patterns | Proactive defense |
| **GovCon Intel** | RFPs, agency news | Bid preparation |
| **Tech Intel** | New frameworks, tool updates, best practices | Staying current |

---

## Traffic-Conscious Design

### Why Reduced Automation?

In early 2026, we identified that aggressive automation was generating excessive traffic:

**Before (High Traffic):**
• RL Training: Every 30 minutes (48x/day)
• Memory Capture: Every 10 minutes (144x/day)
• Self-Reflection: Every 6 hours (4x/day)
• Web Checks: Daily external API calls
• Canada Buys: Daily procurement API calls

**After (Minimal Traffic):**
• RL Training: Weekly (1x/week) - 98% reduction
• Memory Capture: Daily (1x/day) - 99% reduction
• Self-Reflection: Daily (1x/day) - 75% reduction
• Web Checks: Manual only - 100% automation reduction
• Canada Buys: Removed - 100% reduction

**Total Traffic Reduction: 99%**

### Benefits

1. **Lower Costs** - Fewer API calls
2. **Faster Performance** - Less background processing
3. **Better Privacy** - No external data transmission unless needed
4. **More Control** - Run tasks only when you need them

---

## The Intelligence System Architecture

```
┌─────────────────────────────────────────────────────────┐
│              MANUAL TRIGGER                             │
│         (Generate on demand)                            │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│              LOCAL DATA SOURCES                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ User Notes   │  │ Documents    │  │ Chat History │  │
│  │ (Local)      │  │ (Local)      │  │ (Local)      │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│              AI ANALYSIS                                │
│  • Categorize local findings                            │
│  • Identify patterns                                    │
│  • Score relevance                                      │
│  • Summarize key points                                 │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│              REPORT GENERATION                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ Executive    │  │ Detailed     │  │ Raw Data     │  │
│  │ Summary      │  │ Analysis     │  │ Appendix     │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│              DELIVERY                                   │
│  • Save to local database                               │
│  • Display in dashboard                                 │
│  • Export as needed                                     │
└─────────────────────────────────────────────────────────┘
```

---

## Step 1: Create the Intelligence Service

Create: `src/lib/services/intelligence.ts`

```typescript
import { sqlDatabase } from '@/lib/database/sqlite';
import { chatCompletion } from '@/lib/models/sdk.server';

export interface IntelligenceConfig {
  id: string;
  name: string;
  description?: string;
  // Note: External search removed - use local documents only
  dataSources: ('documents' | 'notes' | 'chat_history')[];
  schedule: 'manual' | 'daily' | 'weekly';
  enabled: boolean;
  maxResults?: number;
  analysisPrompt?: string;
}

export interface IntelligenceReport {
  id: string;
  configId: string;
  configName: string;
  generatedAt: number;
  summary: string;
  findings: Finding[];
  metadata?: Record<string, any>;
}

export interface Finding {
  id: string;
  category: string;
  title: string;
  content: string;
  source: string;
  sourceId?: string;
  relevanceScore: number;
  timestamp: number;
}

export class IntelligenceService {
  // Create a new intelligence configuration
  async createConfig(config: Omit<IntelligenceConfig, 'id'>): Promise<string> {
    await sqlDatabase.initialize();
    
    const id = crypto.randomUUID();
    const now = Date.now();
    
    sqlDatabase.run(
      `INSERT INTO intelligence_configs 
       (id, name, description, data_sources, schedule, enabled, max_results, analysis_prompt, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        config.name,
        config.description || null,
        JSON.stringify(config.dataSources),
        config.schedule,
        config.enabled ? 1 : 0,
        config.maxResults || 10,
        config.analysisPrompt || null,
        now,
        now,
      ]
    );
    
    return id;
  }

  // Get all configurations
  async getConfigs(): Promise<IntelligenceConfig[]> {
    await sqlDatabase.initialize();
    
    const result = sqlDatabase.run('SELECT * FROM intelligence_configs ORDER BY name');
    
    return result?.map((row: any) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      dataSources: JSON.parse(row.data_sources || '[]'),
      schedule: row.schedule,
      enabled: row.enabled === 1,
      maxResults: row.max_results,
      analysisPrompt: row.analysis_prompt,
    })) || [];
  }

  // Generate a report from local data only
  async generateReport(configId: string): Promise<IntelligenceReport> {
    const config = await this.getConfigById(configId);
    if (!config) throw new Error('Config not found');
    
    console.log(`[Intelligence] Generating report: ${config.name}`);
    
    // Collect data from local sources only (no external HTTP calls)
    const localData = await this.collectLocalData(config);
    
    // Limit results
    const limitedData = localData.slice(0, config.maxResults || 10);
    
    // Analyze findings with AI
    const findings = await this.analyzeFindings(limitedData, config);
    
    // Generate summary
    const summary = await this.generateSummary(findings, config);
    
    // Create report object
    const report: IntelligenceReport = {
      id: crypto.randomUUID(),
      configId: config.id,
      configName: config.name,
      generatedAt: Date.now(),
      summary,
      findings,
    };
    
    // Save to database
    await this.saveReport(report);
    
    return report;
  }

  // Collect data from local sources only
  private async collectLocalData(config: IntelligenceConfig): Promise<any[]> {
    const results: any[] = [];
    
    if (config.dataSources.includes('documents')) {
      // Query local documents
      const docs = sqlDatabase.run('SELECT * FROM documents WHERE importance >= ?', ['medium']);
      results.push(...(docs || []).map((d: any) => ({
        type: 'document',
        title: d.title,
        content: d.summary || d.content?.substring(0, 500),
        source: 'Documents',
        sourceId: d.id,
        timestamp: d.created_at,
      })));
    }
    
    if (config.dataSources.includes('notes')) {
      // Query local notes
      const notes = sqlDatabase.run('SELECT * FROM notes WHERE importance >= ?', ['medium']);
      results.push(...(notes || []).map((n: any) => ({
        type: 'note',
        title: n.title,
        content: n.content?.substring(0, 500),
        source: 'Notes',
        sourceId: n.id,
        timestamp: n.created_at,
      })));
    }
    
    // Sort by timestamp, most recent first
    return results.sort((a, b) => b.timestamp - a.timestamp);
  }

  // Analyze findings using AI
  private async analyzeFindings(
    results: any[],
    config: IntelligenceConfig
  ): Promise<Finding[]> {
    if (results.length === 0) return [];
    
    const defaultPrompt = `
      Analyze these local documents and notes, and categorize them into key findings.
      For each finding, provide:
      1. Category (e.g., Project, Decision, Knowledge, Task)
      2. Title (brief, specific)
      3. Content (2-3 sentences summarizing)
      4. Relevance score (1-10)
      
      Format as JSON array with keys: category, title, content, relevanceScore
    `;
    
    const prompt = config.analysisPrompt || defaultPrompt;
    
    // Prepare data for AI
    const dataText = results
      .map((r, i) => `${i + 1}. ${r.title}\n   ${r.content}\n   Source: ${r.source}`)
      .join('\n\n');
    
    try {
      const aiResponse = await chatCompletion({
        model: 'ollama/qwen2.5-coder',
        messages: [
          { role: 'system', content: 'You are an intelligence analyst. Provide structured, factual analysis.' },
          { role: 'user', content: `${prompt}\n\nLocal Data:\n${dataText}` },
        ],
      });
      
      const content = aiResponse.message?.content || '[]';
      
      // Try to parse JSON from response
      let parsed: any[] = [];
      try {
        // Extract JSON if wrapped in code blocks
        const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/) || 
                          content.match(/```\n?([\s\S]*?)\n?```/) ||
                          [null, content];
        const jsonStr = jsonMatch[1] || content;
        parsed = JSON.parse(jsonStr);
      } catch {
        // If JSON parsing fails, create single finding
        parsed = [{
          category: 'Analysis',
          title: 'Local Data Summary',
          content: content.substring(0, 500),
          relevanceScore: 5,
        }];
      }
      
      // Map to Finding structure
      return parsed.map((item: any, index: number) => ({
        id: `finding-${index}`,
        category: item.category || 'General',
        title: item.title || 'Untitled',
        content: item.content || item.summary || '',
        source: results[index]?.source || 'Local Data',
        sourceId: results[index]?.sourceId,
        relevanceScore: item.relevanceScore || item.relevance || 5,
        timestamp: Date.now(),
      }));
    } catch (error) {
      console.error('[Intelligence] AI analysis failed:', error);
      return [];
    }
  }

  // Generate executive summary
  private async generateSummary(findings: Finding[], config: IntelligenceConfig): Promise<string> {
    if (findings.length === 0) {
      return `No significant findings for ${config.name} in local data.`;
    }
    
    const findingsText = findings
      .slice(0, 5)
      .map(f => `• ${f.title}: ${f.content}`)
      .join('\n');
    
    try {
      const response = await chatCompletion({
        model: 'ollama/qwen2.5-coder',
        messages: [
          { role: 'system', content: 'You are an executive assistant. Write concise, actionable summaries.' },
          { role: 'user', content: `Write a 3-4 sentence executive summary of these local findings:\n\n${findingsText}` },
        ],
      });
      
      return response.message?.content || 'Summary unavailable.';
    } catch {
      // Fallback summary
      return `${findings.length} findings identified from local data. Key items: ${findings.slice(0, 3).map(f => f.title).join(', ')}.`;
    }
  }

  // Save report to database
  private async saveReport(report: IntelligenceReport): Promise<void> {
    sqlDatabase.run(
      `INSERT INTO intelligence_reports 
       (id, config_id, config_name, generated_at, summary, findings, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        report.id,
        report.configId,
        report.configName,
        report.generatedAt,
        report.summary,
        JSON.stringify(report.findings),
        Date.now(),
      ]
    );
  }

  // Get recent reports
  async getRecentReports(limit: number = 10): Promise<IntelligenceReport[]> {
    await sqlDatabase.initialize();
    
    const result = sqlDatabase.run(
      `SELECT * FROM intelligence_reports ORDER BY generated_at DESC LIMIT ?`,
      [limit]
    );
    
    return result?.map((row: any) => ({
      id: row.id,
      configId: row.config_id,
      configName: row.config_name,
      generatedAt: row.generated_at,
      summary: row.summary,
      findings: JSON.parse(row.findings || '[]'),
    })) || [];
  }

  private async getConfigById(id: string): Promise<IntelligenceConfig | null> {
    const result = sqlDatabase.run('SELECT * FROM intelligence_configs WHERE id = ?', [id]);
    if (!result || result.length === 0) return null;
    
    const row = result[0];
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      dataSources: JSON.parse(row.data_sources || '[]'),
      schedule: row.schedule,
      enabled: row.enabled === 1,
      maxResults: row.max_results,
      analysisPrompt: row.analysis_prompt,
    };
  }
}

export const intelligenceService = new IntelligenceService();
```

---

## Step 2: Database Schema

Add these tables to your database initialization:

```sql
-- Intelligence configurations
CREATE TABLE IF NOT EXISTS intelligence_configs (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  data_sources TEXT, -- JSON array of local sources
  schedule TEXT DEFAULT 'manual', -- manual, daily, weekly
  enabled INTEGER DEFAULT 1,
  max_results INTEGER DEFAULT 10,
  analysis_prompt TEXT,
  created_at INTEGER,
  updated_at INTEGER
);

-- Intelligence reports
CREATE TABLE IF NOT EXISTS intelligence_reports (
  id TEXT PRIMARY KEY,
  config_id TEXT NOT NULL,
  config_name TEXT NOT NULL,
  generated_at INTEGER,
  summary TEXT,
  findings TEXT, -- JSON
  created_at INTEGER,
  FOREIGN KEY (config_id) REFERENCES intelligence_configs(id)
);
```

---

## Step 3: Intelligence Dashboard UI

Create: `src/app/intelligence/page.tsx`

```tsx
'use client';

import { useState, useEffect } from 'react';

export default function IntelligencePage() {
  const [reports, setReports] = useState<any[]>([]);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    const response = await fetch('/api/intelligence');
    const data = await response.json();
    setReports(data.reports || []);
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      await fetch('/api/intelligence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generate' }),
      });
      await loadReports();
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Intelligence Reports</h1>
        <p className="text-gray-600">
          Generate on-demand reports from your local data.
          <span className="text-amber-600 ml-2">(External sources disabled for traffic reduction)</span>
        </p>
      </div>

      {/* Generate Button */}
      <div className="mb-6">
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {generating ? 'Generating...' : 'Generate New Report'}
        </button>
        <p className="text-sm text-gray-500 mt-2">
          Analyzes your documents, notes, and chat history
        </p>
      </div>

      {/* Reports List */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b">
          <h2 className="font-semibold">Recent Reports</h2>
        </div>

        <div className="divide-y">
          {reports.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <p className="text-4xl mb-4">📊</p>
              <p>No reports yet. Generate your first report!</p>
            </div>
          ) : (
            reports.map((report) => (
              <div key={report.id} className="p-6">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-semibold text-lg">{report.configName}</h3>
                    <p className="text-sm text-gray-500">
                      {new Date(report.generatedAt).toLocaleString()}
                    </p>
                  </div>
                  <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                    {report.findings?.length || 0} findings
                  </span>
                </div>
                
                <p className="text-gray-700 mb-4">{report.summary}</p>
                
                {report.findings?.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">Key Findings:</h4>
                    {report.findings.slice(0, 3).map((finding: any) => (
                      <div key={finding.id} className="bg-gray-50 p-3 rounded">
                        <div className="flex justify-between items-start">
                          <h5 className="font-medium text-sm">{finding.title}</h5>
                          <span className={`text-xs px-2 py-0.5 rounded ${
                            finding.relevanceScore >= 7 ? 'bg-green-100 text-green-800' :
                            finding.relevanceScore >= 4 ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-600'
                          }`}>
                            Score: {finding.relevanceScore}/10
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{finding.content}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
```

---

## Traffic Reduction Checklist

When building intelligence features, follow these principles:

### ✅ DO
• [ ] Query local data first (documents, notes, chat history)
• [ ] Make external calls only on explicit user action
• [ ] Cache results when possible
• [ ] Use longer intervals for scheduled tasks (daily instead of hourly)
• [ ] Provide manual trigger options
• [ ] Document traffic implications

### ❌ DON'T
• [ ] Make external HTTP calls on every page load
• [ ] Schedule frequent tasks that call external APIs
• [ ] Scrape websites automatically
• [ ] Poll external services continuously
• [ ] Run RL training or memory capture more than once per day

---

## Key Takeaways

✅ **Lightweight Intelligence** — Analyze local data without external calls

✅ **Manual Control** — Generate reports when needed, not on schedule

✅ **Traffic Conscious** — 99% reduction in automated API calls

✅ **Privacy First** — Data stays local unless you choose to search externally

✅ **Still Powerful** — AI analysis works great on your existing data

---

**Next: Chapter 13 - Model Router**
