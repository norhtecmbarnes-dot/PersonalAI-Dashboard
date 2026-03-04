const fs = require('fs');
const path = require('path');
const docx = require('docx');

const {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  Header,
  Footer,
  PageNumber,
  convertInchesToTwip,
} = docx;

const BOOK_DIR = path.join(process.cwd(), 'book');
const OUTPUT_DIR = path.join(process.cwd(), 'book-output');

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Chapter order
const CHAPTERS = [
  'chapter-01-introduction.md',
  'chapter-02-api.md',
  'chapter-03-containers.md',
  'chapter-04-setup.md',
  'chapter-05-programming.md',
  'chapter-06-database.md',
  'chapter-07-structure.md',
  'chapter-08-prompts.md',
  'chapter-09-chat.md',
  'chapter-10-documents.md',
  'chapter-11-brand-voice.md',
  'chapter-12-intelligence.md',
  'chapter-13-model-router.md',
  'chapter-14-canvas-fullscreen.md',
  'chapter-15-presentation-styling.md',
  'chapter-16-edge-runtime.md',
];

// Parse markdown to docx elements
function parseMarkdown(content, chapterNum) {
  const lines = content.split('\n');
  const children = [];
  let currentParagraph = [];
  let inCodeBlock = false;
  let codeLanguage = '';

  function flushParagraph() {
    if (currentParagraph.length > 0) {
      children.push(
        new Paragraph({
          children: currentParagraph,
          spacing: { after: 200 },
        })
      );
      currentParagraph = [];
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Handle code blocks
    if (line.startsWith('```')) {
      if (!inCodeBlock) {
        flushParagraph();
        inCodeBlock = true;
        codeLanguage = line.slice(3).trim();
      } else {
        // End of code block - treat as monospace text
        if (currentParagraph.length > 0) {
          children.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: currentParagraph.map(p => p.text).join('\n'),
                  font: 'Courier New',
                  size: 20,
                }),
              ],
              shading: { fill: 'F5F5F5' },
              spacing: { before: 100, after: 100 },
            })
          );
          currentParagraph = [];
        }
        inCodeBlock = false;
        codeLanguage = '';
      }
      continue;
    }

    if (inCodeBlock) {
      currentParagraph.push(new TextRun({ text: line + '\n', font: 'Courier New', size: 20 }));
      continue;
    }

    // Skip certain lines
    if (line.startsWith('---')) continue;
    if (line.startsWith('**End of') || line.startsWith('**Session Completed')) continue;

    // Headers
    const headerMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headerMatch) {
      flushParagraph();
      const level = headerMatch[1].length;
      const text = headerMatch[2];
      
      let headingLevel;
      switch (level) {
        case 1: headingLevel = HeadingLevel.HEADING_1; break;
        case 2: headingLevel = HeadingLevel.HEADING_2; break;
        case 3: headingLevel = HeadingLevel.HEADING_3; break;
        case 4: headingLevel = HeadingLevel.HEADING_4; break;
        case 5: headingLevel = HeadingLevel.HEADING_5; break;
        default: headingLevel = HeadingLevel.HEADING_6;
      }

      children.push(
        new Paragraph({
          text,
          heading: headingLevel,
          spacing: { before: 400, after: 200 },
        })
      );
      continue;
    }

    // Table of contents links - convert to plain text
    if (line.match(/^\d+\.\s*\[.+\]\(#.+\)$/)) {
      flushParagraph();
      const text = line.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
      children.push(
        new Paragraph({
          children: [new TextRun({ text, size: 22 })],
          spacing: { after: 100 },
        })
      );
      continue;
    }

    // Bold text
    if (line.includes('**')) {
      flushParagraph();
      const parts = line.split(/(\*\*[^*]+\*\*)/g);
      const runs = [];
      
      parts.forEach(part => {
        if (part.startsWith('**') && part.endsWith('**')) {
          runs.push(new TextRun({
            text: part.slice(2, -2),
            bold: true,
            size: 24,
          }));
        } else if (part) {
          runs.push(new TextRun({
            text: part,
            size: 24,
          }));
        }
      });

      if (runs.length > 0) {
        children.push(
          new Paragraph({
            children: runs,
            spacing: { after: 200 },
          })
        );
      }
      continue;
    }

    // Italic text
    if (line.includes('*') && !line.includes('**')) {
      flushParagraph();
      const parts = line.split(/(\*[^*]+\*)/g);
      const runs = [];
      
      parts.forEach(part => {
        if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
          runs.push(new TextRun({
            text: part.slice(1, -1),
            italics: true,
            size: 24,
          }));
        } else if (part) {
          runs.push(new TextRun({
            text: part,
            size: 24,
          }));
        }
      });

      if (runs.length > 0) {
        children.push(
          new Paragraph({
            children: runs,
            spacing: { after: 200 },
          })
        );
      }
      continue;
    }

    // Regular paragraph
    if (line.trim()) {
      currentParagraph.push(new TextRun({ text: line + ' ', size: 24 }));
    } else {
      flushParagraph();
    }
  }

  flushParagraph();
  return children;
}

async function convertChapter(chapterFile, chapterNum) {
  const filePath = path.join(BOOK_DIR, chapterFile);
  
  if (!fs.existsSync(filePath)) {
    console.log(`Skipping ${chapterFile} - file not found`);
    return null;
  }

  console.log(`Converting ${chapterFile}...`);
  
  const content = fs.readFileSync(filePath, 'utf-8');
  const children = parseMarkdown(content, chapterNum);

  const doc = new Document({
    sections: [{
      properties: {
        page: {
          margin: {
            top: convertInchesToTwip(1),
            right: convertInchesToTwip(1),
            bottom: convertInchesToTwip(1),
            left: convertInchesToTwip(1),
          },
        },
      },
      headers: {
        default: new Header({
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: `Chapter ${chapterNum} - Building Your AI Dashboard`,
                  italics: true,
                  size: 20,
                }),
              ],
              alignment: AlignmentType.RIGHT,
            }),
          ],
        }),
      },
      footers: {
        default: new Footer({
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: 'By Michael C. Barnes',
                  size: 20,
                }),
                new TextRun({
                  text: '\tPage ',
                  size: 20,
                }),
                new TextRun({
                  children: [PageNumber.CURRENT],
                  size: 20,
                }),
                new TextRun({
                  text: ' of ',
                  size: 20,
                }),
                new TextRun({
                  children: [PageNumber.TOTAL_PAGES],
                  size: 20,
                }),
              ],
              alignment: AlignmentType.CENTER,
            }),
          ],
        }),
      },
      children,
    }],
  });

  const outputPath = path.join(OUTPUT_DIR, chapterFile.replace('.md', '.docx'));
  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync(outputPath, buffer);
  
  console.log(`  ✓ Created ${outputPath}`);
  return outputPath;
}

async function createCombinedBook() {
  console.log('\n=== Creating Combined Book ===\n');
  
  const allChildren = [];
  let chapterCount = 0;

  for (let i = 0; i < CHAPTERS.length; i++) {
    const chapterFile = CHAPTERS[i];
    const chapterNum = i + 1;
    const filePath = path.join(BOOK_DIR, chapterFile);
    
    if (!fs.existsSync(filePath)) {
      console.log(`Skipping ${chapterFile} - file not found`);
      continue;
    }

    console.log(`Processing Chapter ${chapterNum}: ${chapterFile}...`);
    
    const content = fs.readFileSync(filePath, 'utf-8');
    const children = parseMarkdown(content, chapterNum);
    
    // Add chapter break
    if (chapterCount > 0) {
      allChildren.push(new Paragraph({ text: '', pageBreakBefore: true }));
    }
    
    allChildren.push(...children);
    chapterCount++;
  }

  const doc = new Document({
    sections: [{
      properties: {
        page: {
          margin: {
            top: convertInchesToTwip(1),
            right: convertInchesToTwip(1),
            bottom: convertInchesToTwip(1),
            left: convertInchesToTwip(1),
          },
        },
      },
      headers: {
        default: new Header({
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: 'Building Your AI Dashboard: The Complete Beginner\'s Guide',
                  italics: true,
                  size: 20,
                }),
              ],
              alignment: AlignmentType.RIGHT,
            }),
          ],
        }),
      },
      footers: {
        default: new Footer({
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: 'By Michael C. Barnes',
                  size: 20,
                }),
                new TextRun({
                  text: '\tPage ',
                  size: 20,
                }),
                new TextRun({
                  children: [PageNumber.CURRENT],
                  size: 20,
                }),
                new TextRun({
                  text: ' of ',
                  size: 20,
                }),
                new TextRun({
                  children: [PageNumber.TOTAL_PAGES],
                  size: 20,
                }),
              ],
              alignment: AlignmentType.CENTER,
            }),
          ],
        }),
      },
      children: allChildren,
    }],
  });

  const outputPath = path.join(OUTPUT_DIR, 'AI-Dashboard-Complete-Book.docx');
  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync(outputPath, buffer);
  
  console.log(`\n✓ Created combined book: ${outputPath}`);
  console.log(`  Total chapters: ${chapterCount}`);
}

async function main() {
  console.log('=== Book Generation Script ===\n');
  console.log('Converting Markdown chapters to Word documents...\n');

  // Convert individual chapters
  for (let i = 0; i < CHAPTERS.length; i++) {
    await convertChapter(CHAPTERS[i], i + 1);
  }

  // Create combined book
  await createCombinedBook();

  console.log('\n=== Book Generation Complete ===');
  console.log(`\nOutput directory: ${OUTPUT_DIR}`);
  console.log('\nFiles generated:');
  const files = fs.readdirSync(OUTPUT_DIR);
  files.forEach(file => {
    const stats = fs.statSync(path.join(OUTPUT_DIR, file));
    console.log(`  - ${file} (${(stats.size / 1024).toFixed(1)} KB)`);
  });
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
