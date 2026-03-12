import { sqlDatabase } from '@/lib/database/sqlite';

export interface ExtractedKnowledge {
  keyFacts: string[];
  entities: Array<{ name: string; type: string; description?: string }>;
  products: Array<{ name: string; description: string }>;
  services: Array<{ name: string; description: string }>;
  values: string[];
  tone: string[];
  audience: string[];
  differentiators: string[];
  contactInfo: Array<{ type: string; value: string }>;
  timeline: Array<{ event: string; date?: string }>;
  summary: string;
  brandVoice: {
    tone?: string;
    style?: string;
    keyMessages?: string[];
    avoidPhrases?: string[];
  };
}

interface KnowledgeEntry {
  id: string;
  documentId: string;
  brandId: string;
  category: string;
  key: string;
  value: string;
  metadata: Record<string, any>;
  createdAt: number;
}

export class KnowledgeExtractor {
  private static instance: KnowledgeExtractor;

  private constructor() {}

  static getInstance(): KnowledgeExtractor {
    if (!KnowledgeExtractor.instance) {
      KnowledgeExtractor.instance = new KnowledgeExtractor();
    }
    return KnowledgeExtractor.instance;
  }

  async extractKnowledge(content: string, selectedModel?: string): Promise<ExtractedKnowledge> {
    const prompt = `Analyze this brand/company document and extract structured knowledge. Return ONLY valid JSON with this exact structure:

{
  "keyFacts": ["fact 1", "fact 2", ...],
  "entities": [
    {"name": "Entity Name", "type": "person|company|product|service|location|technology", "description": "brief description"}
  ],
  "products": [
    {"name": "Product Name", "description": "What it does"}
  ],
  "services": [
    {"name": "Service Name", "description": "What it provides"}
  ],
  "values": ["core value 1", "core value 2", ...],
  "tone": ["tone descriptor 1", "tone descriptor 2", ...],
  "audience": ["target audience segment 1", "target audience segment 2", ...],
  "differentiators": ["what makes this brand unique 1", "what makes this brand unique 2", ...],
  "contactInfo": [
    {"type": "email|phone|address|website", "value": "actual value"}
  ],
  "timeline": [
    {"event": "Event description", "date": "YYYY-MM-DD or descriptive date"}
  ],
  "summary": "A 2-3 sentence summary of the brand",
  "brandVoice": {
    "tone": "Overall tone description",
    "style": "Writing style description",
    "keyMessages": ["key message 1", "key message 2", ...],
    "avoidPhrases": ["phrase to avoid 1", "phrase to avoid 2", ...]
  }
}

Document content:

${content}

Extract everything useful. Return ONLY valid JSON, no explanations.`;

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: prompt }],
          model: selectedModel || undefined,
          temperature: 0.3,
          max_tokens: 4000,
        }),
      });

      const data = await response.json();
      let content_text = data.content || data.result || data.message || '';
      
      if (typeof content_text !== 'string') {
        content_text = JSON.stringify(content_text);
      }

      const jsonMatch = content_text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      return this.validateAndFillDefaults(parsed);
    } catch (error) {
      console.error('Knowledge extraction failed:', error);
      return this.getDefaultKnowledge();
    }
  }

  private validateAndFillDefaults(data: any): ExtractedKnowledge {
    return {
      keyFacts: Array.isArray(data.keyFacts) ? data.keyFacts : [],
      entities: Array.isArray(data.entities) ? data.entities : [],
      products: Array.isArray(data.products) ? data.products : [],
      services: Array.isArray(data.services) ? data.services : [],
      values: Array.isArray(data.values) ? data.values : [],
      tone: Array.isArray(data.tone) ? data.tone : [],
      audience: Array.isArray(data.audience) ? data.audience : [],
      differentiators: Array.isArray(data.differentiators) ? data.differentiators : [],
      contactInfo: Array.isArray(data.contactInfo) ? data.contactInfo : [],
      timeline: Array.isArray(data.timeline) ? data.timeline : [],
      summary: data.summary || '',
      brandVoice: {
        tone: data.brandVoice?.tone || '',
        style: data.brandVoice?.style || '',
        keyMessages: Array.isArray(data.brandVoice?.keyMessages) ? data.brandVoice.keyMessages : [],
        avoidPhrases: Array.isArray(data.brandVoice?.avoidPhrases) ? data.brandVoice.avoidPhrases : [],
      },
    };
  }

  private getDefaultKnowledge(): ExtractedKnowledge {
    return {
      keyFacts: [],
      entities: [],
      products: [],
      services: [],
      values: [],
      tone: [],
      audience: [],
      differentiators: [],
      contactInfo: [],
      timeline: [],
      summary: '',
      brandVoice: {
        tone: '',
        style: '',
        keyMessages: [],
        avoidPhrases: [],
      },
    };
  }

  async saveKnowledge(brandId: string, documentId: string, knowledge: ExtractedKnowledge): Promise<void> {
    sqlDatabase.initialize();

    const entries: Array<Omit<KnowledgeEntry, 'id' | 'createdAt'>> = [];

    knowledge.keyFacts.forEach((fact, idx) => {
      entries.push({ documentId, brandId, category: 'fact', key: `fact_${idx}`, value: fact, metadata: {} });
    });

    knowledge.entities.forEach((entity) => {
      entries.push({
        documentId,
        brandId,
        category: 'entity',
        key: entity.name,
        value: entity.description || '',
        metadata: { type: entity.type },
      });
    });

    knowledge.products.forEach((product) => {
      entries.push({
        documentId,
        brandId,
        category: 'product',
        key: product.name,
        value: product.description,
        metadata: {},
      });
    });

    knowledge.services.forEach((service) => {
      entries.push({
        documentId,
        brandId,
        category: 'service',
        key: service.name,
        value: service.description,
        metadata: {},
      });
    });

    knowledge.values.forEach((value, idx) => {
      entries.push({ documentId, brandId, category: 'value', key: `value_${idx}`, value, metadata: {} });
    });

    knowledge.tone.forEach((tone, idx) => {
      entries.push({ documentId, brandId, category: 'tone', key: `tone_${idx}`, value: tone, metadata: {} });
    });

    knowledge.audience.forEach((aud, idx) => {
      entries.push({ documentId, brandId, category: 'audience', key: `audience_${idx}`, value: aud, metadata: {} });
    });

    knowledge.differentiators.forEach((diff, idx) => {
      entries.push({ documentId, brandId, category: 'differentiator', key: `diff_${idx}`, value: diff, metadata: {} });
    });

    knowledge.contactInfo.forEach((contact) => {
      entries.push({
        documentId,
        brandId,
        category: 'contact',
        key: contact.type,
        value: contact.value,
        metadata: {},
      });
    });

    knowledge.timeline.forEach((event) => {
      entries.push({
        documentId,
        brandId,
        category: 'timeline',
        key: event.event,
        value: event.date || '',
        metadata: {},
      });
    });

    if (knowledge.summary) {
      entries.push({ documentId, brandId, category: 'summary', key: 'summary', value: knowledge.summary, metadata: {} });
    }

    if (knowledge.brandVoice.tone) {
      entries.push({ documentId, brandId, category: 'brand_voice', key: 'tone', value: knowledge.brandVoice.tone, metadata: {} });
    }
    if (knowledge.brandVoice.style) {
      entries.push({ documentId, brandId, category: 'brand_voice', key: 'style', value: knowledge.brandVoice.style, metadata: {} });
    }
    const keyMessages = knowledge.brandVoice.keyMessages;
    if (keyMessages && keyMessages.length > 0) {
      keyMessages.forEach((msg, idx) => {
        entries.push({ documentId, brandId, category: 'brand_voice', key: `key_message_${idx}`, value: msg, metadata: {} });
      });
    }
    const avoidPhrases = knowledge.brandVoice.avoidPhrases;
    if (avoidPhrases && avoidPhrases.length > 0) {
      avoidPhrases.forEach((phrase, idx) => {
        entries.push({ documentId, brandId, category: 'brand_voice', key: `avoid_${idx}`, value: phrase, metadata: {} });
      });
    }

    const now = Date.now();
    for (const entry of entries) {
      const id = `${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 9)}`;
      await sqlDatabase.run(
        `INSERT INTO brand_knowledge (id, document_id, brand_id, category, key, value, metadata, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, entry.documentId, entry.brandId, entry.category, entry.key, entry.value, JSON.stringify(entry.metadata), now]
      );
    }
  }

  async searchKnowledge(brandId: string, query: string, categories?: string[]): Promise<KnowledgeEntry[]> {
    sqlDatabase.initialize();

    let sql = `SELECT * FROM brand_knowledge WHERE brand_id = ?`;
    const params: any[] = [brandId];

    const searchTerms = query.toLowerCase().split(/\s+/).filter(t => t.length > 2);
    
    if (searchTerms.length > 0) {
      const searchConditions = searchTerms.map(() => `(lower(key) LIKE ? OR lower(value) LIKE ?)`).join(' OR ');
      sql += ` AND (${searchConditions})`;
      searchTerms.forEach(term => {
        params.push(`%${term}%`, `%${term}%`);
      });
    }

    if (categories && categories.length > 0) {
      sql += ` AND category IN (${categories.map(() => '?').join(', ')})`;
      params.push(...categories);
    }

    sql += ` ORDER BY created_at DESC LIMIT 50`;

    const rows = await sqlDatabase.all(sql, params);
    return rows.map(this.mapRowToKnowledge);
  }

  async getBrandKnowledge(brandId: string, category?: string): Promise<KnowledgeEntry[]> {
    sqlDatabase.initialize();
    
    let sql = `SELECT * FROM brand_knowledge WHERE brand_id = ?`;
    const params: any[] = [brandId];

    if (category) {
      sql += ` AND category = ?`;
      params.push(category);
    }

    sql += ` ORDER BY category, created_at DESC`;

    const rows = await sqlDatabase.all(sql, params);
    return rows.map(this.mapRowToKnowledge);
  }

  async deleteDocumentKnowledge(documentId: string): Promise<void> {
    sqlDatabase.initialize();
    await sqlDatabase.run(`DELETE FROM brand_knowledge WHERE document_id = ?`, [documentId]);
  }

  async getKnowledgeStats(brandId: string): Promise<Record<string, number>> {
    sqlDatabase.initialize();
    const rows = await sqlDatabase.all(
      `SELECT category, COUNT(*) as count FROM brand_knowledge WHERE brand_id = ? GROUP BY category`,
      [brandId]
    );
    
    const stats: Record<string, number> = {};
    rows.forEach((row) => {
      stats[row.category] = row.count;
    });
    
    return stats;
  }

  private mapRowToKnowledge(row: any): KnowledgeEntry {
    return {
      id: row.id,
      documentId: row.document_id,
      brandId: row.brand_id,
      category: row.category,
      key: row.key,
      value: row.value,
      metadata: row.metadata ? JSON.parse(row.metadata) : {},
      createdAt: row.created_at,
    };
  }

  formatKnowledgeForSearchable(knowledge: ExtractedKnowledge): string {
    const parts: string[] = [];

    if (knowledge.summary) {
      parts.push(`## Summary\n${knowledge.summary}\n`);
    }

    if (knowledge.keyFacts.length > 0) {
      parts.push(`## Key Facts\n${knowledge.keyFacts.map(f => `- ${f}`).join('\n')}\n`);
    }

    if (knowledge.products.length > 0) {
      parts.push(`## Products\n${knowledge.products.map(p => `- **${p.name}**: ${p.description}`).join('\n')}\n`);
    }

    if (knowledge.services.length > 0) {
      parts.push(`## Services\n${knowledge.services.map(s => `- **${s.name}**: ${s.description}`).join('\n')}\n`);
    }

    if (knowledge.values.length > 0) {
      parts.push(`## Core Values\n${knowledge.values.map(v => `- ${v}`).join('\n')}\n`);
    }

    if (knowledge.audience.length > 0) {
      parts.push(`## Target Audience\n${knowledge.audience.map(a => `- ${a}`).join('\n')}\n`);
    }

    if (knowledge.differentiators.length > 0) {
      parts.push(`## Differentiators\n${knowledge.differentiators.map(d => `- ${d}`).join('\n')}\n`);
    }

    if (knowledge.contactInfo.length > 0) {
      parts.push(`## Contact Information\n${knowledge.contactInfo.map(c => `- **${c.type}**: ${c.value}`).join('\n')}\n`);
    }

    if (knowledge.timeline.length > 0) {
      parts.push(`## Timeline\n${knowledge.timeline.map(t => `- **${t.event}**: ${t.date || 'Date unknown'}`).join('\n')}\n`);
    }

    if (knowledge.brandVoice.tone || knowledge.brandVoice.style || (knowledge.brandVoice.keyMessages && knowledge.brandVoice.keyMessages.length > 0)) {
      parts.push(`## Brand Voice`);
      if (knowledge.brandVoice.tone) parts.push(`- **Tone**: ${knowledge.brandVoice.tone}`);
      if (knowledge.brandVoice.style) parts.push(`- **Style**: ${knowledge.brandVoice.style}`);
      if (knowledge.brandVoice.keyMessages && knowledge.brandVoice.keyMessages.length > 0) {
        parts.push(`- **Key Messages**:\n${knowledge.brandVoice.keyMessages.map(m => `  - ${m}`).join('\n')}`);
      }
      if (knowledge.brandVoice.avoidPhrases && knowledge.brandVoice.avoidPhrases.length > 0) {
        parts.push(`- **Avoid**:\n${knowledge.brandVoice.avoidPhrases.map(p => `  - ${p}`).join('\n')}`);
      }
      parts.push('');
    }

    return parts.join('\n');
  }
}

export const knowledgeExtractor = KnowledgeExtractor.getInstance();