import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  Header,
  Footer,
  ImageRun,
  PageNumber,
  PageBreak,
  TabStopType,
} from 'docx';
import * as XLSX from 'xlsx';
import PptxGenJS from 'pptxgenjs';

export interface GeneratedDocument {
  buffer: Buffer;
  filename: string;
  mimeType: string;
}

class DocumentGenerator {
  
  // ==================== WORD DOCUMENTS ====================
  
  async createWordDocument(
    title: string,
    content: string | string[],
    options?: { logoBase64?: string; headerText?: string }
  ): Promise<GeneratedDocument> {
    const paragraphs = Array.isArray(content) ? content : [content];
    const headerLogo = logoFromBase64(options?.logoBase64);
    const headerText = options?.headerText || title;

    const doc = new Document({
      sections: [{
        properties: {},
        headers: headerLogo
          ? {
              default: new Header({
                children: [
                  new Paragraph({
                    tabStops: [{ type: TabStopType.RIGHT, position: 9360 }],
                    border: { bottom: { color: 'BBBBBB', style: BorderStyle.SINGLE, size: 4 } },
                    children: [
                      new TextRun({ text: headerText, bold: true, size: 18, color: '444444' }),
                      new TextRun({ text: '\t' }),
                      new ImageRun({
                        type: headerLogo.type,
                        data: headerLogo.data,
                        transformation: { width: 100, height: 33 },
                      }),
                    ],
                  }),
                ],
              }),
            }
          : undefined,
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

  /**
   * Faithfully convert a markdown string (headings, tables, lists, bold/italic)
   * into a Word document — no LLM rewrite, so proposal markdown keeps its
   * exact content. Optional logo goes in the header of every page.
   */
  async createWordFromMarkdown(
    title: string,
    markdown: string,
    options?: { logoBase64?: string; headerText?: string }
  ): Promise<GeneratedDocument> {
    const headerLogo = logoFromBase64(options?.logoBase64);
    const headerText = options?.headerText || title;

    const doc = new Document({
      sections: [
        {
          properties: {},
          headers: headerLogo
            ? {
                default: new Header({
                  children: [
                    new Paragraph({
                      tabStops: [{ type: TabStopType.RIGHT, position: 9360 }],
                      border: { bottom: { color: 'BBBBBB', style: BorderStyle.SINGLE, size: 4 } },
                      children: [
                        new TextRun({ text: headerText, bold: true, size: 18, color: '444444' }),
                        new TextRun({ text: '\t' }),
                        new ImageRun({
                          type: headerLogo.type,
                          data: headerLogo.data,
                          transformation: { width: 100, height: 33 },
                        }),
                      ],
                    }),
                  ],
                }),
              }
            : undefined,
          children: [
            new Paragraph({
              text: title,
              heading: HeadingLevel.HEADING_1,
              alignment: AlignmentType.CENTER,
              spacing: { after: 400 },
            }),
            ...this.markdownToDocxChildren(markdown),
          ],
        },
      ],
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
    sections: { heading?: string; content: string[] }[],
    options?: { logoBase64?: string; headerText?: string }
  ): Promise<GeneratedDocument> {
    const children: (Paragraph | Table)[] = [];
    const headerLogo = logoFromBase64(options?.logoBase64);
    const headerText = options?.headerText || title;

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
      sections: [
        {
          properties: {},
          headers: headerLogo
            ? {
                default: new Header({
                  children: [
                    new Paragraph({
                      tabStops: [{ type: TabStopType.RIGHT, position: 9360 }],
                      border: { bottom: { color: 'BBBBBB', style: BorderStyle.SINGLE, size: 4 } },
                      children: [
                        new TextRun({ text: headerText, bold: true, size: 18, color: '444444' }),
                        new TextRun({ text: '\t' }),
                        new ImageRun({
                          type: headerLogo.type,
                          data: headerLogo.data,
                          transformation: { width: 100, height: 33 },
                        }),
                      ],
                    }),
                  ],
                }),
              }
            : undefined,
          children,
        },
      ],
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

  // ==================== PROPOSAL DOCUMENTS (Word) ====================

  /**
   * Render a full proposal as a Word document:
   * - Optional cover page (logo, company, title, agency/RFP info, date, proprietary notice)
   * - Logo in the header of every content page
   * - Footer with the proprietary notice and "Page X of Y"
   * - Sections rendered from markdown (headings, bullets, tables, bold/italic)
   */
  async createProposalWordDocument(options: ProposalWordOptions): Promise<GeneratedDocument> {
    const { title, cover, proprietaryNotice, sections, pageBreakBetweenSections } = options;
    const notice =
      proprietaryNotice ||
      cover?.proprietaryNotice ||
      'PROPRIETARY & CONFIDENTIAL — This document contains trade secrets and proprietary information. Do not distribute without authorization.';

    // Body font: Times New Roman, 12 pt by default, 10 pt optional (docx sizes are half-points).
    const fontSizePt = options.fontSize ?? 12;

    const logo = logoFromBase64(cover?.logoBase64 || options.header?.logoBase64);
    const headerLogo = logoFromBase64(options.header?.logoBase64 || cover?.logoBase64);

    const doc = new Document({
      styles: {
        default: {
          document: {
            run: { font: 'Times New Roman', size: fontSizePt * 2 },
            paragraph: { spacing: { after: 120 } },
          },
        },
      },
      sections: [
        // ---- Section 1: Cover page (no header, minimal footer) ----
        {
          properties: {},
          footers: {
            default: new Footer({
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [new TextRun({ text: notice, size: 16, italics: true, color: '666666' })],
                }),
              ],
            }),
          },
          children: this.buildCoverPageChildren(cover || { title }, logo, notice),
        },
        // ---- Section 2: Content pages (logo header + proprietary/page footer) ----
        {
          properties: {},
          headers: {
            default: new Header({
              children: [
                new Paragraph({
                  tabStops: [{ type: TabStopType.RIGHT, position: 9360 }],
                  border: { bottom: { color: 'BBBBBB', style: BorderStyle.SINGLE, size: 4 }},
                  children: [
                    ...(cover?.companyName
                      ? [new TextRun({ text: cover.companyName, bold: true, size: 18, color: '444444' })]
                      : []),
                    new TextRun({ text: '\t' }),
                    ...(headerLogo
                      ? [new ImageRun({ type: headerLogo.type, data: headerLogo.data, transformation: { width: 100, height: 33 } })]
                      : []),
                  ],
                }),
              ],
            }),
          },
          footers: {
            default: new Footer({
              children: [
                new Paragraph({
                  tabStops: [{ type: TabStopType.RIGHT, position: 9360 }],
                  children: [
                    new TextRun({ text: notice, size: 16, italics: true, color: '666666' }),
                    new TextRun({ text: '\t' }),
                    new TextRun({ children: ['Page ', PageNumber.CURRENT, ' of ', PageNumber.TOTAL_PAGES], size: 16, color: '444444' }),
                  ],
                }),
              ],
            }),
          },
          children: this.buildContentChildren(sections, pageBreakBetweenSections),
        },
      ],
    });

    const buffer = await Packer.toBuffer(doc);
    return {
      buffer: Buffer.from(buffer),
      filename: `${title.endsWith('.docx') ? title : title + '.docx'}`,
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    };
  }

  private buildCoverPageChildren(
    cover: ProposalCoverOptions,
    logo: { data: Buffer; type: 'png' | 'jpg' | 'gif' | 'bmp' } | null,
    notice: string
  ): (Paragraph | Table)[] {
    const children: (Paragraph | Table)[] = [];

    // Top spacer
    children.push(new Paragraph({ text: '', spacing: { after: 600 } }));

    if (logo) {
      children.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
          children: [
            new ImageRun({ type: logo.type, data: logo.data, transformation: { width: 240, height: 80 } }),
          ],
        })
      );
    }

    if (cover.companyName) {
      children.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 },
          children: [new TextRun({ text: cover.companyName, bold: true, size: 36, color: '1F3864' })],
        })
      );
    }

    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 600, after: 200 },
        children: [new TextRun({ text: cover.title, bold: true, size: 52, color: '1F3864' })],
      })
    );

    if (cover.subtitle) {
      children.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 600 },
          children: [new TextRun({ text: cover.subtitle, size: 28, color: '444444' })],
        })
      );
    }

    // RFP metadata table
    const metaRows: Array<{ label: string; value: string }> = [];
    if (cover.agency) metaRows.push({ label: 'Agency', value: cover.agency });
    if (cover.solicitationNumber) metaRows.push({ label: 'Solicitation No.', value: cover.solicitationNumber });
    if (cover.dueDate) metaRows.push({ label: 'Due Date', value: cover.dueDate });
    if (metaRows.length > 0) {
      children.push(
        new Table({
          width: { size: 70, type: WidthType.PERCENTAGE },
          alignment: AlignmentType.CENTER,
          rows: metaRows.map(
            row =>
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 40, type: WidthType.PERCENTAGE },
                    shading: { fill: 'F2F2F2' },
                    children: [new Paragraph({ children: [new TextRun({ text: row.label, bold: true })] })],
                  }),
                  new TableCell({
                    width: { size: 60, type: WidthType.PERCENTAGE },
                    children: [new Paragraph({ children: [new TextRun({ text: row.value })] })],
                  }),
                ],
              })
          ),
        })
      );
      children.push(new Paragraph({ text: '', spacing: { after: 400 } }));
    }

    if (cover.date) {
      children.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 400, after: 200 },
          children: [new TextRun({ text: cover.date, size: 24, color: '666666' })],
        })
      );
    }

    return children;
  }

  private buildContentChildren(
    sections: ProposalSection[],
    pageBreakBetweenSections?: boolean
  ): (Paragraph | Table)[] {
    const children: (Paragraph | Table)[] = [];

    sections.forEach((section, index) => {
      if (index > 0 && (pageBreakBetweenSections || section.pageBreakBefore)) {
        children.push(new Paragraph({ children: [new PageBreak()] }));
      }

      if (section.heading) {
        children.push(
          new Paragraph({
            text: section.heading,
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 200, after: 200 },
          })
        );
      }

      if (section.markdown) {
        children.push(...this.markdownToDocxChildren(section.markdown));
      }

      if (section.content && section.content.length > 0) {
        for (const paragraph of section.content) {
          children.push(
            new Paragraph({
              children: this.parseMarkdownToTextRuns(paragraph),
              spacing: { after: 150 },
            })
          );
        }
      }
    });

    return children;
  }

  /** Convert a markdown string into docx Paragraph/Table nodes (headings, bullets, tables). */
  private markdownToDocxChildren(markdown: string): (Paragraph | Table)[] {
    const children: (Paragraph | Table)[] = [];
    const lines = markdown.split(/\r?\n/);
    let i = 0;
    const headings = [
      HeadingLevel.HEADING_1,
      HeadingLevel.HEADING_2,
      HeadingLevel.HEADING_3,
      HeadingLevel.HEADING_4,
      HeadingLevel.HEADING_5,
      HeadingLevel.HEADING_6,
    ] as const;

    while (i < lines.length) {
      const line = lines[i].trimEnd();

      if (!line.trim()) {
        i++;
        continue;
      }

      // Headings
      const heading = line.match(/^(#{1,6})\s+(.*)/);
      if (heading) {
        const level = Math.min(heading[1].length, 6) - 1;
        children.push(
          new Paragraph({
            heading: headings[level],
            spacing: { before: 240, after: 120 },
            children: this.parseMarkdownToTextRuns(heading[2]),
          })
        );
        i++;
        continue;
      }

      // Tables (consecutive lines starting with |)
      if (line.startsWith('|')) {
        const rows: string[][] = [];
        while (i < lines.length && lines[i].trim().startsWith('|')) {
          const raw = lines[i].trim();
          const cells = raw.replace(/^\|/, '').replace(/\|$/, '').split('|').map(c => c.trim());
          // Skip markdown separator rows like |---|---|
          const isSeparator =
            cells.length > 0 && cells.every(c => /^:?-{2,}:?$/.test(c));
          if (!isSeparator) rows.push(cells);
          i++;
        }
        if (rows.length > 0) {
          const colCount = Math.max(...rows.map(r => r.length));
          children.push(
            new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
              rows: rows.map(
                (row, ri) =>
                  new TableRow({
                    children: Array.from({ length: colCount }, (_, ci) =>
                      new TableCell({
                        width: { size: 100 / colCount, type: WidthType.PERCENTAGE },
                        shading: ri === 0 ? { fill: 'E7E6E6' } : undefined,
                        children: [
                          new Paragraph({
                            children: this.parseMarkdownToTextRuns(row[ci] || ''),
                            spacing: { after: 40 },
                          }),
                        ],
                      })
                    ),
                  })
              ),
            })
          );
          children.push(new Paragraph({ text: '', spacing: { after: 100 } }));
        }
        continue;
      }

      // Horizontal rule
      if (/^\s*-{3,}\s*$/.test(line)) {
        children.push(new Paragraph({ text: '', spacing: { after: 120 } }));
        i++;
        continue;
      }

      // Bullet list
      const bullet = line.match(/^[-*+]\s+(.*)/);
      if (bullet) {
        const items = [bullet[1]];
        i++;
        while (i < lines.length) {
          const next = lines[i].trimEnd().match(/^[-*+]\s+(.*)/);
          if (next) {
            items.push(next[1]);
            i++;
          } else break;
        }
        for (const item of items) {
          children.push(
            new Paragraph({
              bullet: { level: 0 },
              spacing: { after: 60 },
              children: this.parseMarkdownToTextRuns(item),
            })
          );
        }
        continue;
      }

      // Numbered list (kept as literal text to avoid numbering-config complexity)
      if (/^\d+[.)]\s+/.test(line)) {
        const items = [line];
        i++;
        while (i < lines.length && /^\d+[.)]\s+/.test(lines[i].trimEnd())) {
          items.push(lines[i].trimEnd());
          i++;
        }
        for (const item of items) {
          children.push(
            new Paragraph({
              spacing: { after: 60 },
              children: this.parseMarkdownToTextRuns(item),
            })
          );
        }
        continue;
      }

      // Plain paragraph
      children.push(
        new Paragraph({
          spacing: { after: 120 },
          children: this.parseMarkdownToTextRuns(line),
        })
      );
      i++;
    }

    return children;
  }

  // ==================== PROPOSAL PRESENTATIONS ====================

  /** Capture deck: title slide + section slides with bullets and accent bar. */
  async createCaptureDeckPresentation(
    title: string,
    options: {
      companyName?: string;
      date?: string;
      logoBase64?: string;
      sections: { section: string; points: string[] }[];
    }
  ): Promise<GeneratedDocument> {
    const pptx = new PptxGenJS();
    pptx.title = title;
    pptx.author = options.companyName || 'Proposal Genie';
    pptx.layout = 'LAYOUT_WIDE';

    const accent = '1F3864';

    // Title slide
    const titleSlide = pptx.addSlide();
    titleSlide.background = { color: '1F3864' };
    titleSlide.addText(title, {
      x: 0.6, y: 2.2, w: 12.2, h: 1.4,
      fontSize: 40, bold: true, color: 'FFFFFF', align: 'left',
    });
    if (options.companyName) {
      titleSlide.addText(options.companyName, {
        x: 0.6, y: 3.6, w: 12.2, h: 0.6,
        fontSize: 20, color: 'A8C4E0', align: 'left',
      });
    }
    if (options.date) {
      titleSlide.addText(options.date, {
        x: 0.6, y: 4.2, w: 12.2, h: 0.5,
        fontSize: 16, color: 'A8C4E0', align: 'left',
      });
    }

    for (const section of options.sections) {
      const slide = pptx.addSlide();
      slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 0.18, h: 7.5, fill: { color: accent } });
      slide.addText(section.section, {
        x: 0.6, y: 0.4, w: 12, h: 0.8,
        fontSize: 30, bold: true, color: accent,
      });
      if (section.points.length > 0) {
        slide.addText(
          section.points.map(point => ({ text: point, options: { bullet: { code: '2022' } } })),
          {
            x: 0.6, y: 1.5, w: 12, h: 5.4,
            fontSize: 18, color: '333333', valign: 'top', lineSpacingMultiple: 1.2,
          }
        );
      }
    }

    const buf = (await pptx.write({ outputType: 'nodebuffer' })) as unknown as Buffer;
    return {
      buffer: buf,
      filename: `${title.endsWith('.pptx') ? title : title + '.pptx'}`,
      mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    };
  }

  /** Quad chart: one slide per set of 4 quadrants (Technical / Management / Past Performance / Price). */
  async createQuadChartPresentation(
    title: string,
    quadrants: { name: string; points: string[] }[],
    options?: { pageTitle?: string }
  ): Promise<GeneratedDocument> {
    const pptx = new PptxGenJS();
    pptx.title = title;
    pptx.author = 'Proposal Genie';
    pptx.layout = 'LAYOUT_WIDE';

    const names = ['Technical', 'Management', 'Past Performance', 'Price / Other'];

    // Split quadrants into groups of 4; if none provided, use the standard 4 names.
    const groups: { name: string; points: string[] }[][] = [];
    if (quadrants.length === 0) {
      groups.push(names.map(name => ({ name, points: [] })));
    } else {
      for (let i = 0; i < quadrants.length; i += 4) {
        const group = quadrants.slice(i, i + 4);
        // Pad with standard names so every group has 4 quadrants
        while (group.length < 4) {
          group.push({ name: names[group.length] || `Quadrant ${group.length + 1}`, points: [] });
        }
        groups.push(group);
      }
    }

    groups.forEach((group, gi) => {
      if (gi > 0 || groups.length > 1) {
        const titleSlide = pptx.addSlide();
        titleSlide.addText(
          gi === 0 ? title : `${title} (${gi + 1})`,
          { x: 0.6, y: 2.8, w: 12.2, h: 1, fontSize: 36, bold: true, color: '1F3864', align: 'center' }
        );
        titleSlide.addText(options?.pageTitle || 'Quad Chart', {
          x: 0.6, y: 4, w: 12.2, h: 0.6, fontSize: 20, color: '666666', align: 'center',
        });
      }

      const slide = pptx.addSlide();
      slide.background = { color: 'FFFFFF' };
      slide.addText(title, {
        x: 0.4, y: 0.15, w: 12.4, h: 0.5, fontSize: 20, bold: true, color: '1F3864',
      });

      const positions = [
        { x: 0.3, y: 0.8, w: 6.25, h: 3.1 },
        { x: 6.7, y: 0.8, w: 6.25, h: 3.1 },
        { x: 0.3, y: 4.05, w: 6.25, h: 3.1 },
        { x: 6.7, y: 4.05, w: 6.25, h: 3.1 },
      ];

      group.forEach((quad, qi) => {
        const pos = positions[qi];
        slide.addShape(pptx.ShapeType.rect, {
          x: pos.x, y: pos.y, w: pos.w, h: pos.h,
          fill: { color: qi % 2 === 0 ? 'EEF3FA' : 'F7F1E8' },
          line: { color: '1F3864', width: 1 },
        });
        slide.addShape(pptx.ShapeType.rect, {
          x: pos.x, y: pos.y, w: pos.w, h: 0.45,
          fill: { color: '1F3864' },
        });
        slide.addText(quad.name, {
          x: pos.x, y: pos.y, w: pos.w, h: 0.45,
          fontSize: 14, bold: true, color: 'FFFFFF', align: 'center', valign: 'middle',
        });
        slide.addText(
          quad.points.map(point => ({ text: point, options: { bullet: { code: '2022' } } })),
          {
            x: pos.x + 0.15, y: pos.y + 0.5, w: pos.w - 0.3, h: pos.h - 0.6,
            fontSize: 12, color: '333333', valign: 'top',
          }
        );
      });
    });

    const buf = (await pptx.write({ outputType: 'nodebuffer' })) as unknown as Buffer;
    return {
      buffer: buf,
      filename: `${title.endsWith('.pptx') ? title : title + '.pptx'}`,
      mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    };
  }

  /** Gantt-style schedule: timeline header + colored task bars. Tasks use 0-based time units. */
  async createGanttPresentation(
    title: string,
    tasks: GanttTask[],
    options?: { unitLabel?: string; unitCount?: number }
  ): Promise<GeneratedDocument> {
    const pptx = new PptxGenJS();
    pptx.title = title;
    pptx.author = 'Proposal Genie';
    pptx.layout = 'LAYOUT_WIDE';

    const unitCount = options?.unitCount || Math.max(8, ...tasks.map(t => t.end));
    const unitLabel = options?.unitLabel || 'Week';

    const labelCol = 2.4; // width of the task-name column
    const chartLeft = 2.6;
    const chartWidth = 10.0;
    const barArea = chartWidth / unitCount;
    const rowHeight = 0.42;
    const top = 1.2;

    const slide = pptx.addSlide();
    slide.background = { color: 'FFFFFF' };
    slide.addText(title, {
      x: 0.4, y: 0.12, w: 12.4, h: 0.5, fontSize: 22, bold: true, color: '1F3864',
    });

    // Timeline header
    for (let u = 0; u < unitCount; u++) {
      slide.addText(`${unitLabel} ${u + 1}`, {
        x: chartLeft + u * barArea, y: 0.75, w: barArea, h: 0.35,
        fontSize: 9, color: '666666', align: 'center',
      });
      slide.addShape(pptx.ShapeType.line, {
        x: chartLeft + u * barArea, y: 1.1, w: 0, h: 6.0,
        line: { color: 'DDDDDD', width: 0.5 },
      });
    }
    slide.addShape(pptx.ShapeType.line, {
      x: chartLeft, y: 1.1, w: chartWidth, h: 0,
      line: { color: '888888', width: 1 },
    });

    const statusColors: Record<string, string> = {
      complete: '2E7D32',
      'in-progress': '1F4E9C',
      planned: '9E9E9E',
    };

    tasks.forEach((task, ri) => {
      const y = top + ri * rowHeight;
      slide.addText(task.name, {
        x: 0.3, y: y + 0.02, w: labelCol - 0.3, h: rowHeight - 0.04,
        fontSize: 11, color: '333333', valign: 'middle',
      });

      const start = Math.max(0, Math.min(task.start, unitCount - 1));
      const end = Math.max(start + 0.2, Math.min(task.end, unitCount));
      const barX = chartLeft + start * barArea + 0.03;
      const barW = (end - start) * barArea - 0.06;

      slide.addShape(pptx.ShapeType.rect, {
        x: barX, y: y + 0.08, w: barW, h: rowHeight - 0.16,
        fill: { color: statusColors[task.status || 'planned'] || '1F4E9C' },
        rectRadius: 0.05,
      });

      if (task.milestone) {
        slide.addShape(pptx.ShapeType.diamond, {
          x: chartLeft + end * barArea - 0.08, y: y + 0.1, w: 0.16, h: 0.16,
          fill: { color: 'C62828' },
        });
      }
    });

    const buf = (await pptx.write({ outputType: 'nodebuffer' })) as unknown as Buffer;
    return {
      buffer: buf,
      filename: `${title.endsWith('.pptx') ? title : title + '.pptx'}`,
      mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    };
  }

  /** Staffing report: table-based slides, split across slides when long. */
  async createStaffingReportPresentation(
    title: string,
    staffing: StaffingRow[],
    options?: { subtitle?: string }
  ): Promise<GeneratedDocument> {
    const pptx = new PptxGenJS();
    pptx.title = title;
    pptx.author = 'Proposal Genie';
    pptx.layout = 'LAYOUT_WIDE';

    const rowsPerSlide = 12;
    const chunks: StaffingRow[][] = [];
    for (let i = 0; i < staffing.length; i += rowsPerSlide) {
      chunks.push(staffing.slice(i, i + rowsPerSlide));
    }
    if (chunks.length === 0) chunks.push([]);

    chunks.forEach((chunk, ci) => {
      const slide = pptx.addSlide();
      slide.background = { color: 'FFFFFF' };
      slide.addText(ci === 0 ? title : `${title} (${ci + 1})`, {
        x: 0.4, y: 0.15, w: 12.4, h: 0.5, fontSize: 22, bold: true, color: '1F3864',
      });
      if (options?.subtitle && ci === 0) {
        slide.addText(options.subtitle, {
          x: 0.4, y: 0.6, w: 12.4, h: 0.35, fontSize: 13, color: '666666',
        });
      }

      const headerCells = ['Labor Category', 'Name', 'Role', 'Level', 'LOE', 'Status'].map(
        text => ({ text, options: { bold: true, color: 'FFFFFF', fill: { color: '1F3864' }, align: 'left' as const } })
      );
      const rows = chunk.map(row => [
        row.laborCategory || '',
        row.name || '',
        row.role || '',
        row.level || '',
        row.loe || '',
        row.status || '',
      ]);

      slide.addTable([headerCells, ...rows.map(r => r.map(c => ({ text: c })))], {
        x: 0.4, y: 1.1, w: 12.4,
        fontSize: 11,
        color: '333333',
        border: { pt: 0.5, color: 'CCCCCC' },
        rowH: 0.4,
      });
    });

    const buf = (await pptx.write({ outputType: 'nodebuffer' })) as unknown as Buffer;
    return {
      buffer: buf,
      filename: `${title.endsWith('.pptx') ? title : title + '.pptx'}`,
      mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    };
  }
}

// ---------- Proposal document types ----------

export interface ProposalCoverOptions {
  companyName?: string;
  /** Data URL (data:image/png;base64,...) or raw base64 */
  logoBase64?: string;
  title: string;
  subtitle?: string;
  agency?: string;
  solicitationNumber?: string;
  dueDate?: string;
  date?: string;
  proprietaryNotice?: string;
}

export interface ProposalSection {
  heading?: string;
  /** Body content in markdown (headings, bullets, tables supported) */
  markdown?: string;
  /** Plain paragraphs (legacy) */
  content?: string[];
  pageBreakBefore?: boolean;
}

export interface ProposalWordOptions {
  title: string;
  cover?: ProposalCoverOptions;
  header?: {
    companyName?: string;
    logoBase64?: string;
  };
  proprietaryNotice?: string;
  sections: ProposalSection[];
  pageBreakBetweenSections?: boolean;
  /** Body font size in points. Defaults to 12 (Times New Roman); 10 is the alternative. */
  fontSize?: number;
}

export interface GanttTask {
  name: string;
  /** 0-based start unit */
  start: number;
  /** 0-based end unit (exclusive) */
  end: number;
  status?: 'planned' | 'in-progress' | 'complete';
  milestone?: boolean;
}

export interface StaffingRow {
  laborCategory: string;
  name?: string;
  role?: string;
  level?: string;
  loe?: string;
  status?: string;
}

function logoFromBase64(logoBase64?: string): {
  data: Buffer;
  type: 'png' | 'jpg' | 'gif' | 'bmp';
} | null {
  if (!logoBase64) return null;
  let mime = 'image/png';
  let b64 = logoBase64;
  const dataUrlMatch = logoBase64.match(/^data:([^;]+);base64,(.+)$/);
  if (dataUrlMatch) {
    mime = dataUrlMatch[1];
    b64 = dataUrlMatch[2];
  }
  if (mime.includes('svg')) return null; // SVG images are not supported in Word headers
  let type: 'png' | 'jpg' | 'gif' | 'bmp' = 'png';
  if (mime.includes('jpeg') || mime.includes('jpg')) type = 'jpg';
  else if (mime.includes('gif')) type = 'gif';
  else if (mime.includes('bmp')) type = 'bmp';
  return { data: Buffer.from(b64, 'base64'), type };
}

export const documentGenerator = new DocumentGenerator();