import { sqlDatabase } from '@/lib/database/sqlite';
import { v4 as uuidv4 } from 'uuid';
import { documentGenerator } from '@/lib/services/document-generator';

export interface OnlyOfficeDocument {
  id: string;
  title: string;
  fileType: string;
  content?: string;
  url: string;
  key: string;
  ownerId?: string;
  createdAt: number;
  updatedAt: number;
}

export interface OnlyOfficeConfig {
  documentServerUrl: string;
  callbackUrl: string;
  jwtSecret?: string;
}

class OnlyOfficeService {
  private static instance: OnlyOfficeService;
  private config: OnlyOfficeConfig | null = null;
  private documentServerUrl: string = 'https://static.onlyoffice.com/api/docs/release/v8.0.0/office.js';
  
  private constructor() {
    this.config = {
      documentServerUrl: process.env.ONLYOFFICE_URL || '',
      callbackUrl: process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000',
    };
  }

  static getInstance(): OnlyOfficeService {
    if (!OnlyOfficeService.instance) {
      OnlyOfficeService.instance = new OnlyOfficeService();
    }
    return OnlyOfficeService.instance;
  }

  configure(config: OnlyOfficeConfig): void {
    this.config = config;
  }

  generateDocumentKey(): string {
    return uuidv4().replace(/-/g, '').substring(0, 20);
  }

  getDocumentType(filename: string): 'word' | 'cell' | 'slide' | 'pdf' {
    const ext = filename.split('.').pop()?.toLowerCase();
    
    const wordExts = ['doc', 'docm', 'docx', 'dot', 'dotm', 'dotx', 'odt', 'rtf', 'txt', 'html', 'htm', 'md'];
    const cellExts = ['xls', 'xlsm', 'xlsx', 'ods', 'csv', 'tsv'];
    const slideExts = ['ppt', 'pptm', 'pptx', 'odp', 'pps', 'ppsx'];
    const pdfExts = ['pdf', 'djvu', 'xps', 'oxps'];

    if (wordExts.includes(ext || '')) return 'word';
    if (cellExts.includes(ext || '')) return 'cell';
    if (slideExts.includes(ext || '')) return 'slide';
    if (pdfExts.includes(ext || '')) return 'pdf';
    
    return 'word';
  }

  // ==================== DOCUMENT OPERATIONS ====================

  async createDocument(
    title: string,
    type: 'word' | 'cell' | 'slide',
    content?: string
  ): Promise<OnlyOfficeDocument> {
    sqlDatabase.initialize();
    
    const extensions: Record<string, string> = {
      word: 'docx',
      cell: 'xlsx',
      slide: 'pptx',
    };

    const now = Date.now();
    const fileType = extensions[type];
    const documentTitle = title.endsWith(`.${fileType}`) ? title : `${title}.${fileType}`;
    const documentContent = content || this.getDefaultContent(type, title);

    const result = sqlDatabase.addDocument({
      title: documentTitle,
      content: documentContent,
      category: 'onlyoffice',
      tags: [`type:${fileType}`, 'onlyoffice'],
    });

    const document: OnlyOfficeDocument = {
      id: result.id,
      title: documentTitle,
      fileType,
      content: documentContent,
      url: `/api/onlyoffice/download?id=${result.id}`,
      key: result.id,
      createdAt: result.createdAt,
      updatedAt: now,
    };

    return document;
  }

  private getDefaultContent(type: 'word' | 'cell' | 'slide', title: string): string {
    switch (type) {
      case 'word':
        return this.createWordDocument(title);
      case 'cell':
        return this.createSpreadsheet(title);
      case 'slide':
        return this.createPresentation(title);
      default:
        return '';
    }
  }

  // ==================== WORD DOCUMENT CREATION ====================

  createWordDocument(title: string, paragraphs: string[] = []): string {
    const content = paragraphs.length > 0 
      ? paragraphs.map(p => `<p>${this.escapeXml(p)}</p>`).join('')
      : `<p>Document created by AI Dashboard</p>`;

    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
            xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <w:body>
    <w:p>
      <w:pPr>
        <w:jc w:val="center"/>
        <w:rPr>
          <w:sz w:val="48"/>
          <w:b/>
        </w:rPr>
      </w:pPr>
      <w:r>
        <w:rPr>
          <w:sz w:val="48"/>
          <w:b/>
        </w:rPr>
        <w:t>${this.escapeXml(title)}</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:r>
        <w:t>${this.escapeXml(content)}</w:t>
      </w:r>
    </w:p>
  </w:body>
</w:document>`;
  }

  // ==================== SPREADSHEET OPERATIONS ====================

  createSpreadsheet(title: string, sheets?: { name: string; data: string[][] }[]): string {
    const defaultSheets = [
      {
        name: 'Sheet1',
        data: [
          ['A', 'B', 'C'],
          ['1', '2', '3'],
          ['4', '5', '6'],
        ]
      }
    ];

    const sheetsToUse = sheets || defaultSheets;

    // Return CSV-like format for simpler handling
    return sheetsToUse.map(sheet => {
      const rows = sheet.data.map(row => row.map(cell => this.escapeCSV(String(cell))).join(','));
      return `### Sheet: ${sheet.name} ###\n${rows.join('\n')}`;
    }).join('\n\n');
  }

  // Create spreadsheet with specific data
  async createSpreadsheetWithData(
    title: string,
    data: { headers: string[]; rows: string[][] }
  ): Promise<OnlyOfficeDocument> {
    sqlDatabase.initialize();
    
    const id = uuidv4();
    const now = Date.now();

    // Convert to CSV format
    const csvContent = [
      data.headers.join(','),
      ...data.rows.map(row => row.map(cell => this.escapeCSV(cell)).join(','))
    ].join('\n');

    const document: OnlyOfficeDocument = {
      id,
      title: title.endsWith('.xlsx') ? title : `${title}.xlsx`,
      fileType: 'xlsx',
      content: csvContent,
      url: `/api/onlyoffice/download/${id}`,
      key: this.generateDocumentKey(),
      createdAt: now,
      updatedAt: now,
    };

    sqlDatabase.addDocument({
      title: document.title,
      content: csvContent,
      category: 'onlyoffice',
      tags: ['type:xlsx', 'onlyoffice'],
    });

    return document;
  }

  // Add data to existing spreadsheet
  async appendToSpreadsheet(documentId: string, rows: string[][]): Promise<void> {
    sqlDatabase.initialize();
    
    const doc = sqlDatabase.getDocumentById(documentId);
    
    if (!doc) {
      throw new Error('Document not found');
    }

    const existingContent = doc.content || '';
    const newRows = rows.map(row => row.map(cell => this.escapeCSV(cell)).join(','));
    const updatedContent = existingContent + '\n' + newRows.join('\n');

    sqlDatabase.updateDocument(documentId, { content: updatedContent });
  }

  // ==================== PRESENTATION OPERATIONS ====================

  createPresentation(title: string, slides: { title: string; content: string[] }[] = []): string {
    const defaultSlides: { title: string; content: string[] }[] = [
      { title: title, content: ['Created by AI Dashboard', 'Automated Presentation Generation'] },
      { title: 'Content', content: ['Slide content will appear here'] },
    ];

    const slidesToUse = slides.length > 0 ? slides : defaultSlides;

    // Return simple format describing slides
    return slidesToUse.map((slide, index) => {
      const bulletPoints = slide.content.map(b => `  • ${b}`).join('\n');
      return `Slide ${index + 1}: ${slide.title}\n${bulletPoints}`;
    }).join('\n\n');
  }

  async createPresentationWithSlides(
    title: string,
    slides: { title: string; bulletPoints: string[] }[]
  ): Promise<OnlyOfficeDocument> {
    sqlDatabase.initialize();
    
    const id = uuidv4();
    const now = Date.now();

    const slideContent = slides.map((slide, index) => {
      const bullets = slide.bulletPoints.map(b => `  - ${b}`).join('\n');
      return `=== Slide ${index + 1}: ${slide.title} ===\n${bullets}`;
    }).join('\n\n');

    const document: OnlyOfficeDocument = {
      id,
      title: title.endsWith('.pptx') ? title : `${title}.pptx`,
      fileType: 'pptx',
      content: slideContent,
      url: `/api/onlyoffice/download/${id}`,
      key: this.generateDocumentKey(),
      createdAt: now,
      updatedAt: now,
    };

    sqlDatabase.addDocument({
      title: document.title,
      content: slideContent,
      category: 'onlyoffice',
      tags: ['type:pptx', 'onlyoffice'],
    });

    return document;
  }

  // ==================== TEXT OPERATIONS ====================

  async insertText(documentId: string, text: string, position?: 'start' | 'end'): Promise<void> {
    sqlDatabase.initialize();
    
    const doc = sqlDatabase.getDocumentById(documentId);
    
    if (!doc) {
      throw new Error('Document not found');
    }

    const existingContent = doc.content || '';
    const updatedContent = position === 'start'
      ? `${text}\n${existingContent}`
      : `${existingContent}\n${text}`;

    sqlDatabase.updateDocument(documentId, { content: updatedContent });
  }

  // ==================== AI-POWERED OPERATIONS ====================

  async generateDocumentFromPrompt(
    prompt: string,
    type: 'word' | 'cell' | 'slide'
  ): Promise<OnlyOfficeDocument> {
    // Parse prompt and create appropriate content
    const title = this.extractTitle(prompt) || 'Generated Document';

    if (type === 'word') {
      // Generate paragraphs from prompt
      const paragraphs = [
        `Document generated based on: ${prompt}`,
        '',
        'This document was automatically created by the AI Dashboard system.',
      ];
      return this.createDocument(title, 'word', this.createWordDocument(title, paragraphs));
    }

    if (type === 'cell') {
      // Generate spreadsheet from prompt
      const sheets = this.parseSpreadsheet(prompt);
      return this.createSpreadsheetWithData(title, sheets);
    }

    if (type === 'slide') {
      // Generate presentation from prompt
      const slides = this.parseSlides(prompt);
      return this.createPresentationWithSlides(title, slides);
    }

    return this.createDocument(title, type);
  }

  private extractTitle(prompt: string): string | null {
    const titleMatch = prompt.match(/(?:title|name|call(?:ed)?|named)\s*:?\s*["']?([^"'\n]{3,50})["']?/i);
    if (titleMatch) return titleMatch[1].trim();

    const firstLine = prompt.split('\n')[0].trim();
    if (firstLine.length < 50) return firstLine;

    return null;
  }

  private parseSpreadsheet(prompt: string): { headers: string[]; rows: string[][] } {
    // Extract table structure from prompt
    const lines = prompt.split('\n').filter(l => l.trim());
    
    // Check for pipe-separated tables
    const pipeRows = lines.filter(l => l.includes('|'));
    if (pipeRows.length > 1) {
      const rows = pipeRows.map(row => 
        row.split('|').map(cell => cell.trim()).filter(c => c)
      );
      return {
        headers: rows[0] || ['Column 1', 'Column 2', 'Column 3'],
        rows: rows.slice(1)
      };
    }

    // Check for comma-separated values
    const csvRows = lines.filter(l => l.includes(','));
    if (csvRows.length > 1) {
      const rows = csvRows.map(row => row.split(',').map(cell => cell.trim()));
      return {
        headers: rows[0] || ['A', 'B', 'C'],
        rows: rows.slice(1)
      };
    }

    // Default structure
    return {
      headers: ['Item', 'Value', 'Notes'],
      rows: [['1', 'Sample', 'Generated']],
    };
  }

  private parseSlides(prompt: string): { title: string; bulletPoints: string[] }[] {
    const lines = prompt.split('\n').filter(l => l.trim());
    const slides: { title: string; bulletPoints: string[] }[] = [];

    let currentSlide: { title: string; bulletPoints: string[] } | null = null;

    for (const line of lines) {
      const trimmed = line.trim();
      
      // Slide title patterns
      if (trimmed.match(/^(slide|section|part) \d+[:\s]/i) ||
          trimmed.match(/^#+\s/) ||
          trimmed.match(/^\*\*[^*]+\*\*$/)) {
        if (currentSlide) {
          slides.push(currentSlide);
        }
        currentSlide = {
          title: trimmed.replace(/^(slide|section|part)\s*\d*[:\s]*/i, '')
                        .replace(/^#+\s*/, '')
                        .replace(/\*\*/g, '')
                        .trim(),
          bulletPoints: [],
        };
        continue;
      }

      // Bullet point
      if (trimmed.match(/^[-*•]\s/) || trimmed.match(/^\d+\.\s/)) {
        const bullet = trimmed.replace(/^[-*•\d.]\s*/, '');
        if (currentSlide) {
          currentSlide.bulletPoints.push(bullet);
        }
        continue;
      }

      // Regular content becomes bullet if we have a slide
      if (currentSlide && trimmed.length > 3) {
        currentSlide.bulletPoints.push(trimmed);
      }
    }

    if (currentSlide) {
      slides.push(currentSlide);
    }

    // If no slides found, create default
    if (slides.length === 0) {
      slides.push(
        { title: 'Introduction', bulletPoints: ['Overview of the topic', 'Key points to cover'] },
        { title: 'Content', bulletPoints: ['Main content', 'Additional details'] },
        { title: 'Conclusion', bulletPoints: ['Summary', 'Next steps'] }
      );
    }

    return slides;
  }

  // ==================== LIST AND GET ====================

  async listDocuments(): Promise<OnlyOfficeDocument[]> {
    sqlDatabase.initialize();
    
    const docs = sqlDatabase.getDocuments(undefined, 'onlyoffice');
    
    return docs.map(doc => ({
      id: doc.id,
      title: doc.title,
      fileType: doc.tags?.find((t: string) => t.startsWith('type:'))?.split(':')[1] || 'docx',
      content: doc.content,
      url: `/api/onlyoffice/download?id=${doc.id}`,
      key: doc.id,
      createdAt: doc.created_at || doc.createdAt,
      updatedAt: doc.updated_at || doc.updatedAt,
    }));
  }

  async getDocument(documentId: string): Promise<OnlyOfficeDocument | null> {
    sqlDatabase.initialize();
    
    const doc = sqlDatabase.getDocumentById(documentId);
    
    if (!doc) return null;

    return {
      id: doc.id,
      title: doc.title,
      fileType: doc.tags?.find((t: string) => t.startsWith('type:'))?.split(':')[1] || 'docx',
      content: doc.content,
      url: `/api/onlyoffice/download?id=${doc.id}`,
      key: doc.id,
      createdAt: doc.created_at || doc.createdAt,
      updatedAt: doc.updated_at || doc.updatedAt,
    };
  }

  async deleteDocument(documentId: string): Promise<boolean> {
    sqlDatabase.initialize();
    
    sqlDatabase.deleteDocument(documentId);
    return true;
  }

  // ==================== EXPORT OPERATIONS ====================

  async exportToPDF(documentId: string): Promise<string> {
    // In production, this would call ONLYOFFICE conversion API
    // For now, return the document URL
    return `/api/onlyoffice/download/${documentId}?format=pdf`;
  }

  async exportToFormat(
    documentId: string,
    format: 'pdf' | 'odt' | 'ods' | 'odp' | 'html'
  ): Promise<string> {
    // Return URL for converted document
    return `/api/onlyoffice/download/${documentId}?format=${format}`;
  }

  // ==================== CALLBACK HANDLING ====================

  async handleCallback(body: any): Promise<{ error: number }> {
    const { status, key, url } = body;

    switch (status) {
      case 1: // Document being edited
        return { error: 0 };

      case 2: // Document ready for saving
        if (url) {
          // Download and save document
          console.log('ONLYOFFICE save callback for key:', key);
        }
        return { error: 0 };

      case 4: // Document closed, no changes
        return { error: 0 };

      case 6: // Force save
        if (url) {
          console.log('ONLYOFFICE force save for key:', key);
        }
        return { error: 0 };

      default:
        return { error: 0 };
    }
  }

  // ==================== UTILITY ====================

  private escapeXml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  private escapeCSV(str: string): string {
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }

  // ==================== EDITOR CONFIG ====================

  createEditorConfig(
    document: OnlyOfficeDocument,
    mode: 'edit' | 'view' = 'edit',
    userId?: string,
    userName?: string
  ): any {
    const baseUrl = this.config?.callbackUrl || 'http://localhost:3000';

    return {
      document: {
        fileType: document.fileType,
        key: document.key,
        title: document.title,
        url: `${baseUrl}${document.url}`,
        permissions: {
          edit: mode === 'edit',
          download: true,
          print: true,
          review: true,
          comment: true,
        },
      },
      documentType: this.getDocumentType(document.title),
      editorConfig: {
        mode: mode,
        lang: 'en',
        callbackUrl: `${baseUrl}/api/onlyoffice/callback`,
        user: {
          id: userId || 'guest',
          name: userName || 'Guest User',
        },
        customization: {
          autosave: true,
          forcesave: true,
          chat: true,
          comments: true,
          reviewDisplay: 'markup',
        },
      },
      type: 'desktop',
      width: '100%',
      height: '100%',
    };
  }
}

export const onlyOfficeService = OnlyOfficeService.getInstance();