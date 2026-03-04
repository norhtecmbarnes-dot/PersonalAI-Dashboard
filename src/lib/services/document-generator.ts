import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, Table, TableRow, TableCell, WidthType, BorderStyle } from 'docx';
import * as XLSX from 'xlsx';
import PptxGenJS from 'pptxgenjs';

export interface GeneratedDocument {
  buffer: Buffer;
  filename: string;
  mimeType: string;
}

class DocumentGenerator {
  
  // ==================== WORD DOCUMENTS ====================
  
  async createWordDocument(title: string, content: string | string[]): Promise<GeneratedDocument> {
    const paragraphs = Array.isArray(content) ? content : [content];
    
    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          new Paragraph({
            text: title,
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
          }),
          ...paragraphs.map(p => new Paragraph({
            children: this.parseMarkdownToTextRuns(p),
            spacing: { after: 200 },
          })),
        ],
      }],
    });

    const buffer = await Packer.toBuffer(doc);
    
    return {
      buffer: Buffer.from(buffer),
      filename: `${title.endsWith('.docx') ? title : title + '.docx'}`,
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    };
  }

  private parseMarkdownToTextRuns(text: string): TextRun[] {
    const textRuns: TextRun[] = [];
    
    const patterns = [
      { regex: /\*\*\*(.+?)\*\*\*/g, bold: true, italics: true },
      { regex: /\*\*(.+?)\*\*/g, bold: true, italics: false },
      { regex: /\*(.+?)\*/g, bold: false, italics: true },
      { regex: /__(.+?)__/g, bold: true, italics: false },
      { regex: /_(.+?)_/g, bold: false, italics: true },
      { regex: /`(.+?)`/g, bold: false, italics: false, code: true },
    ];
    
    const segments: Array<{ text: string; bold?: boolean; italics?: boolean; code?: boolean }> = [];
    let remaining = text;
    
    while (remaining.length > 0) {
      let earliestMatch: { index: number; length: number; content: string; bold: boolean; italics: boolean; code: boolean } | null = null;
      
      for (const pattern of patterns) {
        pattern.regex.lastIndex = 0;
        const match = pattern.regex.exec(remaining);
        if (match && (earliestMatch === null || match.index < earliestMatch.index)) {
          earliestMatch = {
            index: match.index,
            length: match[0].length,
            content: match[1],
            bold: pattern.bold || false,
            italics: pattern.italics || false,
            code: 'code' in pattern ? (pattern as any).code : false,
          };
        }
      }
      
      if (earliestMatch && earliestMatch.index === 0) {
        segments.push({
          text: earliestMatch.content,
          bold: earliestMatch.bold,
          italics: earliestMatch.italics,
          code: earliestMatch.code,
        });
        remaining = remaining.slice(earliestMatch.length);
      } else if (earliestMatch) {
        segments.push({ text: remaining.slice(0, earliestMatch.index) });
        remaining = remaining.slice(earliestMatch.index);
      } else {
        segments.push({ text: remaining });
        break;
      }
    }
    
    if (segments.length === 0) {
      segments.push({ text: text });
    }
    
    for (const seg of segments) {
      if (seg.text) {
        textRuns.push(new TextRun({
          text: seg.text,
          bold: seg.bold,
          italics: seg.italics,
          ...(seg.code ? { font: 'Courier New', shading: { fill: 'F0F0F0' } } : {}),
        }));
      }
    }
    
    return textRuns;
  }

  async createWordDocumentFromSections(
    title: string,
    sections: { heading?: string; content: string[] }[]
  ): Promise<GeneratedDocument> {
    const children: (Paragraph | Table)[] = [];

    children.push(new Paragraph({
      text: title,
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
    }));

    for (const section of sections) {
      if (section.heading) {
        children.push(new Paragraph({
          text: section.heading,
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 300, after: 200 },
        }));
      }
      
      for (const paragraph of section.content) {
        children.push(new Paragraph({
          children: this.parseMarkdownToTextRuns(paragraph),
          spacing: { after: 150 },
        }));
      }
    }

    const doc = new Document({
      sections: [{ properties: {}, children }],
    });

    const buffer = await Packer.toBuffer(doc);
    
    return {
      buffer: Buffer.from(buffer),
      filename: `${title.endsWith('.docx') ? title : title + '.docx'}`,
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    };
  }

  // ==================== SPREADSHEETS ====================

  createSpreadsheet(title: string, data: { headers: string[]; rows: (string | number)[][] }): GeneratedDocument {
    const workbook = XLSX.utils.book_new();
    
    const sheetData = [data.headers, ...data.rows];
    const worksheet = XLSX.utils.aoa_to_sheet(sheetData);
    
    const colWidths = data.headers.map((_, i) => {
      const maxLen = Math.max(
        data.headers[i].length,
        ...data.rows.slice(0, 10).map(row => String(row[i] || '').length)
      );
      return { wch: Math.min(Math.max(maxLen + 2, 10), 50) };
    });
    worksheet['!cols'] = colWidths;
    
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
    
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    
    return {
      buffer: Buffer.from(buffer),
      filename: `${title.endsWith('.xlsx') ? title : title + '.xlsx'}`,
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    };
  }

  createMultiSheetSpreadsheet(
    title: string,
    sheets: { name: string; headers: string[]; rows: (string | number)[][] }[]
  ): GeneratedDocument {
    const workbook = XLSX.utils.book_new();
    
    for (const sheet of sheets) {
      const sheetData = [sheet.headers, ...sheet.rows];
      const worksheet = XLSX.utils.aoa_to_sheet(sheetData);
      
      const colWidths = sheet.headers.map((_, i) => {
        const maxLen = Math.max(
          sheet.headers[i].length,
          ...sheet.rows.slice(0, 10).map(row => String(row[i] || '').length)
        );
        return { wch: Math.min(Math.max(maxLen + 2, 10), 50) };
      });
      worksheet['!cols'] = colWidths;
      
      XLSX.utils.book_append_sheet(workbook, worksheet, sheet.name.slice(0, 31));
    }
    
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    
    return {
      buffer: Buffer.from(buffer),
      filename: `${title.endsWith('.xlsx') ? title : title + '.xlsx'}`,
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    };
  }

  // ==================== PRESENTATIONS ====================

  async createPresentation(title: string, slides: { title: string; bulletPoints: string[] }[]): Promise<GeneratedDocument> {
    const pptx = new PptxGenJS();
    pptx.title = title;
    pptx.author = 'AI Dashboard';
    
    for (const slideData of slides) {
      const slide = pptx.addSlide();
      
      slide.addText(slideData.title, {
        x: 0.5,
        y: 0.5,
        w: '90%',
        h: 1,
        fontSize: 32,
        bold: true,
        color: '363636',
      });
      
      if (slideData.bulletPoints.length > 0) {
        slide.addText(
          slideData.bulletPoints.map(point => ({ text: point, options: { bullet: true } })),
          {
            x: 0.5,
            y: 1.5,
            w: '90%',
            h: 4,
            fontSize: 18,
            color: '363636',
            valign: 'top',
          }
        );
      }
    }
    
    const buf = await pptx.write({ outputType: 'nodebuffer' }) as unknown as Buffer;
    return {
      buffer: buf,
      filename: `${title.endsWith('.pptx') ? title : title + '.pptx'}`,
      mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    };
  }

  async createPresentationFromOutline(
    title: string,
    outline: { section: string; points: string[] }[]
  ): Promise<GeneratedDocument> {
    const pptx = new PptxGenJS();
    pptx.title = title;
    pptx.author = 'AI Dashboard';
    
    const titleSlide = pptx.addSlide();
    titleSlide.addText(title, {
      x: 0.5,
      y: 2,
      w: '90%',
      h: 1.5,
      fontSize: 44,
      bold: true,
      color: '363636',
      align: 'center',
    });
    
    for (const section of outline) {
      const slide = pptx.addSlide();
      
      slide.addText(section.section, {
        x: 0.5,
        y: 0.5,
        w: '90%',
        h: 1,
        fontSize: 32,
        bold: true,
        color: '363636',
      });
      
      if (section.points.length > 0) {
        slide.addText(
          section.points.map(point => ({ text: point, options: { bullet: true } })),
          {
            x: 0.5,
            y: 1.5,
            w: '90%',
            h: 4,
            fontSize: 18,
            color: '363636',
            valign: 'top',
          }
        );
      }
    }
    
    const buf = await pptx.write({ outputType: 'nodebuffer' }) as unknown as Buffer;
    return {
      buffer: buf,
      filename: `${title.endsWith('.pptx') ? title : title + '.pptx'}`,
      mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    };
  }

  // ==================== CSV ====================

  createCSV(title: string, data: { headers: string[]; rows: (string | number)[][] }): GeneratedDocument {
    const sheetData = [data.headers, ...data.rows];
    const worksheet = XLSX.utils.aoa_to_sheet(sheetData);
    const csv = XLSX.utils.sheet_to_csv(worksheet);
    
    return {
      buffer: Buffer.from(csv, 'utf-8'),
      filename: `${title.endsWith('.csv') ? title : title + '.csv'}`,
      mimeType: 'text/csv',
    };
  }

  // ==================== MARKDOWN ====================

  createMarkdown(title: string, content: string): GeneratedDocument {
    const md = `# ${title}\n\n${content}`;
    
    return {
      buffer: Buffer.from(md, 'utf-8'),
      filename: `${title.endsWith('.md') ? title : title + '.md'}`,
      mimeType: 'text/markdown',
    };
  }

  // ==================== TEXT ====================

  createText(title: string, content: string): GeneratedDocument {
    const text = `${title}\n${'='.repeat(title.length)}\n\n${content}`;
    
    return {
      buffer: Buffer.from(text, 'utf-8'),
      filename: `${title.endsWith('.txt') ? title : title + '.txt'}`,
      mimeType: 'text/plain',
    };
  }
}

export const documentGenerator = new DocumentGenerator();