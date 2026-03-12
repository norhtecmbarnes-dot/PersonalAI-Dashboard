import { sqlDatabase, VectorLakeEntry } from '../database/sqlite';
import { performWebSearch, SearchResult } from '../websearch';

export interface VectorLakeResult {
  cached: boolean;
  entry?: VectorLakeEntry;
  searchTerms?: string[];
  searchResults?: SearchResult[];
  context?: string;
  answer?: string;
  organizedData?: {
    contacts: Array<{ name: string; email?: string; company?: string }>;
    tasks: Array<{ title: string; description?: string; priority: 'low' | 'medium' | 'high' }>;
    events: Array<{ title: string; description?: string; startDate: number }>;
    notes: Array<{ title: string; content: string; category: string }>;
  };
}

export class VectorLake {
  private static instance: VectorLake;
  private similarityThreshold = 0.75;
  private cacheExpiryDays = 30;

  private constructor() {}

  static getInstance(): VectorLake {
    if (!VectorLake.instance) {
      VectorLake.instance = new VectorLake();
    }
    return VectorLake.instance;
  }

  async processQuery(userQuery: string): Promise<VectorLakeResult> {
    sqlDatabase.initialize();

    const similarEntries = sqlDatabase.findSimilarQueries(userQuery, this.similarityThreshold);
    
    if (similarEntries.length > 0) {
      const bestMatch = similarEntries[0];
      sqlDatabase.incrementAccessCount(bestMatch.id);
      
      return {
        cached: true,
        entry: bestMatch,
        searchTerms: bestMatch.searchTerms,
        searchResults: bestMatch.results ? JSON.parse(bestMatch.results) : [],
        context: bestMatch.context,
        answer: bestMatch.answer,
      };
    }

    const searchTerms = await this.generateSearchTerms(userQuery);
    const searchResults = await this.performSearches(searchTerms);
    const context = this.buildContext(searchResults);
    const organizedData = await this.organizeIntoSQL(userQuery, searchResults, context);
    const answer = this.generateAnswer(userQuery, context, organizedData);

    const embedding = this.generateEmbedding(userQuery);
    const expiresAt = Date.now() + (this.cacheExpiryDays * 24 * 60 * 60 * 1000);

    const entry = sqlDatabase.addVectorLakeEntry({
      query: userQuery,
      searchTerms,
      results: JSON.stringify(searchResults),
      context,
      answer,
      embedding: JSON.stringify(embedding),
      expiresAt,
    });

    return {
      cached: false,
      entry,
      searchTerms,
      searchResults,
      context,
      answer,
      organizedData,
    };
  }

  private async generateSearchTerms(query: string): Promise<string[]> {
    const prompt = `Given the user's question: "${query}"
    
Generate 3-5 optimized search terms that would help find relevant information to answer this question.
Return ONLY a JSON array of strings, nothing else. Example: ["term1", "term2", "term3"]`;

    try {
      const response = await fetch('/api/chat', {
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
      console.error('Error generating search terms:', error);
    }

    return this.fallbackGenerateSearchTerms(query);
  }

  private fallbackGenerateSearchTerms(query: string): string[] {
    const words = query.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 2);
    
    const stopWords = new Set(['what', 'how', 'when', 'where', 'why', 'which', 'who', 'that', 'this', 'with', 'from', 'have', 'been', 'were', 'they', 'their', 'there', 'about', 'would', 'could', 'should', 'into', 'more', 'some', 'such', 'than', 'then', 'them', 'these', 'those', 'being', 'other']);
    
    return words
      .filter(w => !stopWords.has(w))
      .slice(0, 5);
  }

  private async performSearches(searchTerms: string[]): Promise<SearchResult[]> {
    const results: SearchResult[] = [];
    
    for (const term of searchTerms.slice(0, 3)) {
      const termResults = await performWebSearch(term);
      results.push(...termResults);
    }

    const uniqueResults = results.filter((result, index, self) =>
      index === self.findIndex(r => r.url === result.url)
    );

    return uniqueResults.slice(0, 10);
  }

  private buildContext(searchResults: SearchResult[]): string {
    return searchResults
      .map((r, i) => `[${i + 1}] ${r.title}\n${r.excerpt}\nSource: ${r.url}`)
      .join('\n\n');
  }

  private async organizeIntoSQL(
    query: string,
    searchResults: SearchResult[],
    context: string
  ): Promise<VectorLakeResult['organizedData']> {
    const prompt = `Based on the user's question: "${query}"
And the search results:
${context}

Extract and organize any relevant information into structured data. Look for:
1. CONTACTS - People mentioned (name, email if available, company)
2. TASKS - Action items or todo items (title, description, priority as low/medium/high)
3. EVENTS - Dates, meetings, deadlines (title, description, startDate as Unix timestamp)
4. NOTES - Important information to save (title, content, category)

Return ONLY a JSON object with this structure, or empty arrays if nothing found:
{
  "contacts": [{"name": "", "email": "", "company": ""}],
  "tasks": [{"title": "", "description": "", "priority": "medium"}],
  "events": [{"title": "", "description": "", "startDate": 0}],
  "notes": [{"title": "", "content": "", "category": "research"}]
}`;

    try {
      const response = await fetch('/api/chat', {
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
        const match = content.match(/\{[\s\S]*\}/);
        if (match) {
          return JSON.parse(match[0]);
        }
      }
    } catch (error) {
      console.error('Error organizing into SQL:', error);
    }

    return {
      contacts: [],
      tasks: [],
      events: [],
      notes: [],
    };
  }

  private generateAnswer(
    query: string,
    context: string,
    organizedData?: VectorLakeResult['organizedData']
  ): string {
    let answer = `## Answer to: "${query}"\n\n`;
    
    answer += `### Search Results Summary\n`;
    answer += `Found ${organizedData?.contacts?.length || 0} contacts, `;
    answer += `${organizedData?.tasks?.length || 0} tasks, `;
    answer += `${organizedData?.events?.length || 0} events, `;
    answer += `${organizedData?.notes?.length || 0} notes.\n\n`;

    if (organizedData?.contacts?.length) {
      answer += `### Extracted Contacts\n`;
      organizedData.contacts.forEach(c => {
        answer += `- ${c.name}${c.company ? ` (${c.company})` : ''}${c.email ? ` - ${c.email}` : ''}\n`;
      });
      answer += '\n';
    }

    if (organizedData?.tasks?.length) {
      answer += `### Action Items\n`;
      organizedData.tasks.forEach(t => {
        answer += `- [${t.priority.toUpperCase()}] ${t.title}${t.description ? `: ${t.description}` : ''}\n`;
      });
      answer += '\n';
    }

    if (organizedData?.events?.length) {
      answer += `### Important Dates/Events\n`;
      organizedData.events.forEach(e => {
        answer += `- ${e.title}${e.description ? `: ${e.description}` : ''}\n`;
      });
      answer += '\n';
    }

    answer += `### Full Context\n${context}`;

    return answer;
  }

  async saveOrganizedData(organizedData: VectorLakeResult['organizedData']): Promise<void> {
    if (!organizedData) return;

    if (organizedData.contacts?.length) {
      for (const contact of organizedData.contacts) {
        try {
          sqlDatabase.addContact({
            name: contact.name,
            email: contact.email,
            company: contact.company,
            tags: ['vector-lake', 'auto-import'],
            source: 'vector-lake',
          });
        } catch (e) {
          console.error('Error saving contact:', e);
        }
      }
    }

    if (organizedData.tasks?.length) {
      for (const task of organizedData.tasks) {
        try {
          sqlDatabase.addTask({
            title: task.title,
            description: task.description,
            priority: task.priority,
            status: 'pending',
            tags: ['vector-lake', 'auto-import'],
            source: 'vector-lake',
          });
        } catch (e) {
          console.error('Error saving task:', e);
        }
      }
    }

    if (organizedData.events?.length) {
      for (const event of organizedData.events) {
        try {
          sqlDatabase.addEvent({
            title: event.title,
            description: event.description,
            startDate: event.startDate || Date.now(),
            status: 'pending',
            source: 'vector-lake',
          });
        } catch (e) {
          console.error('Error saving event:', e);
        }
      }
    }

    if (organizedData.notes?.length) {
      for (const note of organizedData.notes) {
        try {
          sqlDatabase.addNote({
            title: note.title,
            content: note.content,
            category: note.category,
            tags: ['vector-lake', 'auto-import'],
          });
        } catch (e) {
          console.error('Error saving note:', e);
        }
      }
    }
  }

  getStats() {
    return sqlDatabase.getVectorLakeStats();
  }

  getPopularQueries(limit = 10) {
    return sqlDatabase.getPopularQueries(limit);
  }

  getRecentQueries(limit = 10) {
    return sqlDatabase.getRecentQueries(limit);
  }

  clearExpiredEntries() {
    return sqlDatabase.clearExpiredEntries();
  }

  private generateEmbedding(text: string): number[] {
    const hash = this.simpleHash(text);
    const embedding: number[] = [];
    const seed = hash;
    
    for (let i = 0; i < 384; i++) {
      const x = Math.sin(seed * (i + 1) * 12.9898) * 43758.5453;
      embedding.push((x - Math.floor(x)) * 2 - 1);
    }
    
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    return embedding.map(val => val / magnitude);
  }

  private simpleHash(text: string): number {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }
}

export const vectorLake = VectorLake.getInstance();
