import type { DocumentType, DocumentUploadResult, BrandDocument } from '@/types/brand-workspace';

interface ProcessedDocument {
  title: string;
  content: string;
  type: DocumentType;
  metadata: {
    size?: number;
    mimeType?: string;
    url?: string;
    author?: string;
    tags?: string[];
    summary?: string;
  };
}

export class DocumentProcessor {
  private static instance: DocumentProcessor;

  private constructor() {}

  static getInstance(): DocumentProcessor {
    if (!DocumentProcessor.instance) {
      DocumentProcessor.instance = new DocumentProcessor();
    }
    return DocumentProcessor.instance;
  }

  async processFile(file: File): Promise<ProcessedDocument> {
    const extension = file.name.split('.').pop()?.toLowerCase() || 'other';
    const type = this.getDocumentType(extension);

    let content: string;
    let metadata: ProcessedDocument['metadata'] = {
      size: file.size,
      mimeType: file.type,
    };

    switch (type) {
      case 'pdf':
        content = await this.processPDF(file);
        break;
      case 'markdown':
        content = await this.processMarkdown(file);
        break;
      case 'txt':
        content = await this.processTextFile(file);
        break;
      case 'html':
        content = await this.processHTML(file);
        break;
      case 'image':
        content = await this.processImage(file);
        break;
      default:
        content = await this.processTextFile(file);
    }

    metadata.summary = this.generateSummary(content);
    metadata.tags = this.extractTags(content);

    return {
      title: file.name.replace(/\.[^/.]+$/, ''),
      content,
      type,
      metadata,
    };
  }

  async processTextContent(text: string, title?: string): Promise<ProcessedDocument> {
    const content = this.normalizeText(text);
    const summary = this.generateSummary(content);
    const tags = this.extractTags(content);

    return {
      title: title || 'Untitled Document',
      content,
      type: 'txt',
      metadata: {
        size: text.length,
        summary,
        tags,
      },
    };
  }

  async processURL(url: string): Promise<ProcessedDocument> {
    try {
      const response = await fetch(url);
      const html = await response.text();
      const content = this.extractTextFromHTML(html);
      const summary = this.generateSummary(content);
      const tags = this.extractTags(content);

      const urlObj = new URL(url);
      const title = urlObj.hostname + urlObj.pathname.replace(/\//g, ' ').trim() || url;

      return {
        title,
        content,
        type: 'url',
        metadata: {
          url,
          size: content.length,
          summary,
          tags,
        },
      };
    } catch (error) {
      throw new Error(`Failed to process URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private getDocumentType(extension: string): DocumentType {
    const typeMap: Record<string, DocumentType> = {
      pdf: 'pdf',
      doc: 'docx',
      docx: 'docx',
      txt: 'txt',
      md: 'markdown',
      markdown: 'markdown',
      html: 'html',
      htm: 'html',
      png: 'image',
      jpg: 'image',
      jpeg: 'image',
      gif: 'image',
      webp: 'image',
    };
    return typeMap[extension] || 'other';
  }

  private async processPDF(file: File): Promise<string> {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      
      const text = this.extractTextFromPDF(uint8Array);
      return this.normalizeText(text);
    } catch (error) {
      console.error('PDF processing error:', error);
      return `[PDF file: ${file.name} - Content extraction requires server-side processing]`;
    }
  }

  private extractTextFromPDF(data: Uint8Array): string {
    let text = '';
    let inTextBlock = false;
    
    for (let i = 0; i < data.length; i++) {
      const byte = data[i];
      
      if (byte === 0x42 && data[i + 1] === 0x54) {
        inTextBlock = true;
        i += 2;
        continue;
      }
      
      if (inTextBlock && byte >= 32 && byte <= 126) {
        text += String.fromCharCode(byte);
      } else if (inTextBlock && (byte === 10 || byte === 13)) {
        text += '\n';
      } else if (inTextBlock && byte === 0x45 && data[i + 1] === 0x54) {
        inTextBlock = false;
        i += 2;
      }
    }
    
    return text.replace(/\s+/g, ' ').trim();
  }

  private async processMarkdown(file: File): Promise<string> {
    const text = await file.text();
    return this.normalizeText(text);
  }

  private async processTextFile(file: File): Promise<string> {
    const text = await file.text();
    return this.normalizeText(text);
  }

  private async processHTML(file: File): Promise<string> {
    const html = await file.text();
    return this.extractTextFromHTML(html);
  }

  private async processImage(file: File): Promise<string> {
    return `[Image file: ${file.name} - OCR processing available on server]`;
  }

  private extractTextFromHTML(html: string): string {
    let text = html;
    
    text = text.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
    text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
    text = text.replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '');
    text = text.replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '');
    text = text.replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '');
    
    text = text.replace(/<br\s*\/?>/gi, '\n');
    text = text.replace(/<\/p>/gi, '\n\n');
    text = text.replace(/<\/h[1-6]>/gi, '\n\n');
    text = text.replace(/<\/li>/gi, '\n');
    text = text.replace(/<\/div>/gi, '\n');
    text = text.replace(/<\/td>/gi, ' ');
    text = text.replace(/<\/tr>/gi, '\n');
    
    text = text.replace(/<[^>]+>/g, '');
    
    text = text.replace(/&nbsp;/g, ' ');
    text = text.replace(/&amp;/g, '&');
    text = text.replace(/&lt;/g, '<');
    text = text.replace(/&gt;/g, '>');
    text = text.replace(/&quot;/g, '"');
    text = text.replace(/&#39;/g, "'");
    text = text.replace(/&mdash;/g, '—');
    text = text.replace(/&ndash;/g, '–');
    
    return this.normalizeText(text);
  }

  private normalizeText(text: string): string {
    let normalized = text;
    
    normalized = normalized.replace(/\r\n/g, '\n');
    normalized = normalized.replace(/\r/g, '\n');
    normalized = normalized.replace(/\t/g, '    ');
    normalized = normalized.replace(/[ \t]+/g, ' ');
    normalized = normalized.replace(/\n{3,}/g, '\n\n');
    normalized = normalized.trim();
    
    return normalized;
  }

  private generateSummary(content: string, maxLength: number = 500): string {
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 10);
    
    if (sentences.length === 0) {
      return content.substring(0, maxLength).trim() + '...';
    }
    
    const summary = sentences.slice(0, 3).join('. ').trim();
    if (summary.length > maxLength) {
      return summary.substring(0, maxLength).trim() + '...';
    }
    
    return summary + (sentences.length > 3 ? '...' : '');
  }

  private extractTags(content: string): string[] {
    const tags: Set<string> = new Set();
    
    const keywords = [
      'proposal', 'contract', 'agreement', 'terms', 'conditions',
      'services', 'products', 'pricing', 'quote', 'budget',
      'timeline', 'deliverable', 'milestone', 'deadline',
      'requirement', 'specification', 'technical', 'functional',
      'marketing', 'campaign', 'brand', 'audience', 'target',
      'analytics', 'report', 'analysis', 'metrics', 'kpi',
      'budget', 'cost', 'revenue', 'profit', 'investment',
      'timeline', 'schedule', 'phase', 'sprint', 'iteration',
    ];
    
    const lowerContent = content.toLowerCase();
    
    for (const keyword of keywords) {
      if (lowerContent.includes(keyword)) {
        tags.add(keyword);
      }
    }
    
    const capitalizedWords = content.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g) || [];
    for (const word of capitalizedWords.slice(0, 10)) {
      if (word.length > 3 && !keywords.includes(word.toLowerCase())) {
        tags.add(word.toLowerCase());
      }
    }
    
    return Array.from(tags).slice(0, 15);
  }

  compactContent(content: string, targetLength: number = 8000): string {
    if (content.length <= targetLength) {
      return content;
    }
    
    let compacted = content;
    
    compacted = compacted.replace(/\n{3,}/g, '\n\n');
    compacted = compacted.replace(/```[\s\S]*?```/g, (match) => {
      const lines = match.split('\n');
      if (lines.length > 20) {
        return lines.slice(0, 10).join('\n') + '\n... [code truncated]\n' + lines.slice(-5).join('\n');
      }
      return match;
    });
    
    if (compacted.length > targetLength) {
      const sections = compacted.split(/\n## /);
      if (sections.length > 1) {
        const headerSection = sections[0];
        const priorityKeywords = ['summary', 'overview', 'executive', 'key', 'main', 'important'];
        
        compacted = headerSection + '\n## ' + sections
          .slice(1)
          .sort((a, b) => {
            const aPriority = priorityKeywords.some(kw => a.toLowerCase().startsWith(kw)) ? 0 : 1;
            const bPriority = priorityKeywords.some(kw => b.toLowerCase().startsWith(kw)) ? 0 : 1;
            return aPriority - bPriority;
          })
          .slice(0, 10)
          .join('\n## ');
      }
    }
    
    if (compacted.length > targetLength) {
      compacted = compacted.substring(0, targetLength - 100) + '\n\n... [Content truncated for context window]';
    }
    
    return compacted;
  }
}

export const documentProcessor = DocumentProcessor.getInstance();