# Chapter 12: Building Intelligence Reports

Imagine starting your day with a comprehensive briefing: overnight news relevant to your industry, competitor moves, emerging trends, and potential opportunities. This is what **Intelligence Reports** do — they automate the research you'd otherwise spend hours doing manually.

## What You'll Learn

- What **intelligence reports** are and why they matter
- Setting up **automated data collection**
- Integrating with **web search APIs**
- Building a **report generation system**
- Creating **scheduled tasks** for automation
- Designing **report templates and formatting**
- Storing and retrieving **historical reports**

---

## What is an Intelligence Report?

An intelligence report is like having a research assistant that works 24/7:

**Traditional Approach (Manual):**
- Wake up, open 10 browser tabs
- Search Google for industry news
- Check competitor websites
- Read Twitter/X for trends
- Compile findings manually
- **Time: 1-2 hours daily**

**AI Dashboard Approach (Automated):**
- System runs scheduled searches
- AI analyzes and summarizes findings
- Delivers formatted report at 8 AM
- **Time: 2 minutes to read**

### Real-World Use Cases

| Use Case | What It Monitors | Value |
|----------|------------------|-------|
| **Market Intelligence** | Industry trends, competitor pricing, new entrants | Strategic decisions |
| **Sales Intel** | Prospect news, trigger events, company changes | Better outreach |
| **Security Intel** | CVEs, threat actors, attack patterns | Proactive defense |
| **GovCon Intel** | SAM.gov opportunities, RFPs, agency news | Bid preparation |
| **Tech Intel** | New frameworks, tool updates, best practices | Staying current |

---

## The Intelligence System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    SCHEDULER                            │
│              (Daily at 8:00 AM)                        │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│              DATA COLLECTION                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ Web Search   │  │ RSS Feeds    │  │ APIs         │  │
│  │ (Tavily)     │  │ (Industry)   │  │ (Custom)     │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│              AI ANALYSIS                                │
│  • Categorize findings                                  │
│  • Identify trends                                      │
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
│  • Save to database                                     │
│  • Display in dashboard                                 │
│  • Optional: Email/Telegram                             │
└─────────────────────────────────────────────────────────┘
```

---

## Step 1: Create the Intelligence Service

Create: `src/lib/services/intelligence.ts`

```typescript
import { sqlDatabase } from '@/lib/database/sqlite';
import { performWebSearch } from '@/lib/websearch';
import { chatCompletion } from '@/lib/models/sdk.server';

export interface IntelligenceConfig {
  id: string;
  name: string;
  description?: string;
  searchQueries: string[];
  schedule: 'daily' | 'weekly' | 'hourly';
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
  rawData: any[];
  metadata?: Record<string, any>;
}

export interface Finding {
  id: string;
  category: string;
  title: string;
  content: string;
  source: string;
  url?: string;
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
       (id, name, description, search_queries, schedule, enabled, max_results, analysis_prompt, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        config.name,
        config.description || null,
        JSON.stringify(config.searchQueries),
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
      searchQueries: JSON.parse(row.search_queries || '[]'),
      schedule: row.schedule,
      enabled: row.enabled === 1,
      maxResults: row.max_results,
      analysisPrompt: row.analysis_prompt,
    })) || [];
  }

  // Generate a report
  async generateReport(configId: string): Promise<IntelligenceReport> {
    const config = await this.getConfigById(configId);
    if (!config) throw new Error('Config not found');
    
    console.log(`[Intelligence] Generating report: ${config.name}`);
    
    // Collect data from all queries
    const allResults: any[] = [];
    
    for (const query of config.searchQueries) {
      console.log(`[Intelligence] Searching: ${query}`);
      try {
        const results = await performWebSearch(query);
        allResults.push(...results.map(r => ({
          ...r,
          searchQuery: query,
          collectedAt: Date.now(),
        })));
      } catch (error) {
        console.error(`[Intelligence] Search failed for "${query}":`, error);
      }
    }
    
    // Limit results
    const limitedResults = allResults.slice(0, config.maxResults || 10);
    
    // Analyze findings with AI
    const findings = await this.analyzeFindings(limitedResults, config);
    
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
      rawData: limitedResults,
    };
    
    // Save to database
    await this.saveReport(report);
    
    return report;
  }

  // Analyze findings using AI
  private async analyzeFindings(
    results: any[],
    config: IntelligenceConfig
  ): Promise<Finding[]> {
    if (results.length === 0) return [];
    
    const defaultPrompt = `
      Analyze these search results and categorize them into key findings.
      For each finding, provide:
      1. Category (e.g., News, Opportunity, Threat, Trend)
      2. Title (brief, specific)
      3. Content (2-3 sentences summarizing)
      4. Relevance score (1-10)
      
      Format as JSON array with keys: category, title, content, relevanceScore
    `;
    
    const prompt = config.analysisPrompt || defaultPrompt;
    
    // Prepare data for AI
    const searchResultsText = results
      .map((r, i) => `${i + 1}. ${r.title}\n   ${r.excerpt || r.content}\n   Source: ${r.url || r.source}`)
      .join('\n\n');
    
    try {
      const aiResponse = await chatCompletion({
        model: 'ollama/qwen2.5-coder',
        messages: [
          { role: 'system', content: 'You are an intelligence analyst. Provide structured, factual analysis.' },
          { role: 'user', content: `${prompt}\n\nSearch Results:\n${searchResultsText}` },
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
          title: 'Search Results Summary',
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
        source: results[index]?.source || 'Web Search',
        url: results[index]?.url,
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
      return `No significant findings for ${config.name} in this reporting period.`;
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
          { role: 'user', content: `Write a 3-4 sentence executive summary of these intelligence findings:\n\n${findingsText}` },
        ],
      });
      
      return response.message?.content || 'Summary unavailable.';
    } catch {
      // Fallback summary
      return `${findings.length} findings identified. Key items: ${findings.slice(0, 3).map(f => f.title).join(', ')}.`;
    }
  }

  // Save report to database
  private async saveReport(report: IntelligenceReport): Promise<void> {
    sqlDatabase.run(
      `INSERT INTO intelligence_reports 
       (id, config_id, config_name, generated_at, summary, findings, raw_data, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        report.id,
        report.configId,
        report.configName,
        report.generatedAt,
        report.summary,
        JSON.stringify(report.findings),
        JSON.stringify(report.rawData),
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
      rawData: JSON.parse(row.raw_data || '[]'),
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
      searchQueries: JSON.parse(row.search_queries || '[]'),
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
  search_queries TEXT, -- JSON array
  schedule TEXT DEFAULT 'daily',
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
  raw_data TEXT, -- JSON
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
import { intelligenceService, IntelligenceConfig, IntelligenceReport } from '@/lib/services/intelligence';

export default function IntelligencePage() {
  const [configs, setConfigs] = useState<IntelligenceConfig[]>([]);
  const [reports, setReports] = useState<IntelligenceReport[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [generatingId, setGeneratingId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [configsData, reportsData] = await Promise.all([
      intelligenceService.getConfigs(),
      intelligenceService.getRecentReports(10),
    ]);
    setConfigs(configsData);
    setReports(reportsData);
  };

  const handleGenerate = async (configId: string) => {
    setGeneratingId(configId);
    try {
      await intelligenceService.generateReport(configId);
      await loadData();
    } catch (error) {
      console.error('Generation failed:', error);
    } finally {
      setGeneratingId(null);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Intelligence Reports</h1>
        <p className="text-gray-600">
          Automated research and analysis for your areas of interest.
        </p>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Configurations */}
        <div className="col-span-4">
          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b flex justify-between items-center">
              <h2 className="font-semibold">Configurations</h2>
              <button
                onClick={() => setIsCreating(true)}
                className="text-blue-600 hover:text-blue-800 text-sm"
              >
                + New
              </button>
            </div>

            <div className="divide-y">
              {configs.map((config) => (
                <div key={config.id} className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-medium">{config.name}</h3>
                    <span className={`text-xs px-2 py-1 rounded ${
                      config.enabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {config.schedule}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mb-3">
                    {config.searchQueries.length} queries
                  </p>
                  <button
                    onClick={() => handleGenerate(config.id)}
                    disabled={generatingId === config.id}
                    className="w-full bg-blue-600 text-white py-2 rounded text-sm hover:bg-blue-700 disabled:opacity-50"
                  >
                    {generatingId === config.id ? 'Generating...' : 'Generate Now'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Reports */}
        <div className="col-span-8">
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
                        {report.findings.length} findings
                      </span>
                    </div>
                    
                    <p className="text-gray-700 mb-4">{report.summary}</p>
                    
                    {report.findings.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="font-medium text-sm">Key Findings:</h4>
                        {report.findings.slice(0, 3).map((finding) => (
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
                            {finding.url && (
                              <a
                                href={finding.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-blue-600 hover:underline mt-2 inline-block"
                              >
                                Source →
                              </a>
                            )}
                          </div>
                        ))}
                        {report.findings.length > 3 && (
                          <p className="text-sm text-gray-500">
                            + {report.findings.length - 3} more findings
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
```

---

## Step 4: Create Configuration Form

Create: `src/app/intelligence/new/page.tsx`

```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function NewIntelligenceConfigPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [queries, setQueries] = useState(['']);
  const [schedule, setSchedule] = useState<'daily' | 'weekly' | 'hourly'>('daily');
  const [isSaving, setIsSaving] = useState(false);

  const addQuery = () => setQueries([...queries, '']);
  
  const updateQuery = (index: number, value: string) => {
    const newQueries = [...queries];
    newQueries[index] = value;
    setQueries(newQueries);
  };

  const removeQuery = (index: number) => {
    setQueries(queries.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!name.trim() || queries.filter(q => q.trim()).length === 0) return;
    
    setIsSaving(true);
    
    try {
      const response = await fetch('/api/intelligence/configs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description,
          searchQueries: queries.filter(q => q.trim()),
          schedule,
          enabled: true,
        }),
      });
      
      if (response.ok) {
        router.push('/intelligence');
      }
    } catch (error) {
      console.error('Failed to save:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">New Intelligence Configuration</h1>
      
      <div className="bg-white rounded-lg shadow p-6 space-y-6">
        {/* Name */}
        <div>
          <label className="block text-sm font-medium mb-2">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Competitor Watch"
            className="w-full border rounded-lg px-4 py-2"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium mb-2">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What does this intelligence report track?"
            rows={3}
            className="w-full border rounded-lg px-4 py-2"
          />
        </div>

        {/* Search Queries */}
        <div>
          <label className="block text-sm font-medium mb-2">Search Queries</label>
          <p className="text-sm text-gray-500 mb-3">
            Each query will be run to collect data for the report.
          </p>
          
          {queries.map((query, index) => (
            <div key={index} className="flex gap-2 mb-2">
              <input
                type="text"
                value={query}
                onChange={(e) => updateQuery(index, e.target.value)}
                placeholder={`Query ${index + 1}`}
                className="flex-1 border rounded-lg px-4 py-2"
              />
              {queries.length > 1 && (
                <button
                  onClick={() => removeQuery(index)}
                  className="text-red-600 px-3"
                >
                  ×
                </button>
              )}
            </div>
          ))}
          
          <button
            onClick={addQuery}
            className="text-blue-600 text-sm hover:underline"
          >
            + Add another query
          </button>
        </div>

        {/* Schedule */}
        <div>
          <label className="block text-sm font-medium mb-2">Schedule</label>
          <select
            value={schedule}
            onChange={(e) => setSchedule(e.target.value as any)}
            className="w-full border rounded-lg px-4 py-2"
          >
            <option value="hourly">Hourly</option>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
          </select>
        </div>

        {/* Submit */}
        <div className="flex gap-4 pt-4">
          <button
            onClick={handleSubmit}
            disabled={isSaving || !name.trim()}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {isSaving ? 'Creating...' : 'Create Configuration'}
          </button>
          
          <a
            href="/intelligence"
            className="text-gray-600 px-6 py-2 inline-block"
          >
            Cancel
          </a>
        </div>
      </div>
    </div>
  );
}
```

---

## PROMPT YOU CAN USE

Enhance the intelligence system:

```
Add these features to the Intelligence Reports:
1. RSS feed integration for continuous monitoring
2. Email delivery of reports
3. Trend analysis across multiple reports
4. Export reports as PDF
5. Custom branding for reports
6. Alert conditions (notify when specific keywords appear)
7. Report comparison view (see changes over time)

Focus on making it a complete intelligence platform.
```

---

## Key Takeaways

✅ **Intelligence Reports** — Automated research that saves hours daily

✅ **Multi-source Collection** — Web search + RSS + APIs

✅ **AI Analysis** — Categorize, score, and summarize findings

✅ **Scheduled Execution** — Set it and forget it

✅ **Configurable** — Different reports for different needs

✅ **Relevance Scoring** — Focus on what matters most

---

**Next: Chapter 13 - Adding Self-Reflection**
