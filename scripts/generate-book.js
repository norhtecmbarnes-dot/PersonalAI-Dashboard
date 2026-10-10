/**
 * Convert the book chapters in book/ to .docx (one per chapter, plus a combined book).
 *
 * Fixed: the old version hardcoded a lowercase chapter-01..16 list that does not match the
 * real files (`Chapter-21-…`, `Chapter-5B-…`), so it silently produced nothing. Discovery
 * now comes from scripts/lib/book-chapters.js, and the header/footer use the real chapter
 * number instead of the loop index.
 *
 * Run:  node scripts/generate-book.js      (or: npm run book:docx)
 */

const fs = require('fs');
const path = require('path');
const docx = require('docx');
const { DEFAULT_BOOK_DIR, discoverChapters, readChapter, chapterLabel } = require('./lib/book-chapters');

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

const BOOK_DIR = DEFAULT_BOOK_DIR;
const OUTPUT_DIR = path.join(process.cwd(), 'book-output');

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

/** Parse a chapter's markdown into docx elements. */
function parseMarkdown(content) {
  const lines = content.split('\n');
  const children = [];
  let currentParagraph = [];
  let inCodeBlock = false;

  function flushParagraph() {
    if (currentParagraph.length > 0) {
      children.push(new Paragraph({ children: currentParagraph, spacing: { after: 200 } }));
      currentParagraph = [];
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Code blocks
    if (line.startsWith('```')) {
      if (!inCodeBlock) {
        flushParagraph();
        inCodeBlock = true;
      } else {
        if (currentParagraph.length > 0) {
          children.push(
            new Paragraph({
              // each run's text already carries its own newline; join WITHOUT an extra one
              children: [new TextRun({ text: currentParagraph.map(p => p.text).join(''), font: 'Courier New', size: 20 })],
              shading: { fill: 'F5F5F5' },
              spacing: { before: 100, after: 100 },
            })
          );
          currentParagraph = [];
        }
        inCodeBlock = false;
      }
      continue;
    }

    if (inCodeBlock) {
      currentParagraph.push(new TextRun({ text: line + '\n', font: 'Courier New', size: 20 }));
      continue;
    }

    if (line.startsWith('---')) continue;
    if (line.startsWith('**End of') || line.startsWith('**Session Completed')) continue;

    // Headers
    const headerMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headerMatch) {
      flushParagraph();
      const level = headerMatch[1].length;
      const headingLevel =
        [null, HeadingLevel.HEADING_1, HeadingLevel.HEADING_2, HeadingLevel.HEADING_3, HeadingLevel.HEADING_4, HeadingLevel.HEADING_5][level] ||
        HeadingLevel.HEADING_6;
      children.push(new Paragraph({ text: headerMatch[2], heading: headingLevel, spacing: { before: 400, after: 200 } }));
      continue;
    }

    // TOC links -> plain text
    if (line.match(/^\d+\.\s*\[.+\]\(#.+\)$/)) {
      flushParagraph();
      children.push(
        new Paragraph({
          children: [new TextRun({ text: line.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1'), size: 22 })],
          spacing: { after: 100 },
        })
      );
      continue;
    }

    // Bold
    if (line.includes('**')) {
      flushParagraph();
      const runs = line.split(/(\*\*[^*]+\*\*)/g).filter(Boolean).map(part =>
        part.startsWith('**') && part.endsWith('**')
          ? new TextRun({ text: part.slice(2, -2), bold: true, size: 24 })
          : new TextRun({ text: part, size: 24 })
      );
      if (runs.length > 0) children.push(new Paragraph({ children: runs, spacing: { after: 200 } }));
      continue;
    }

    // Italic — only for real *emphasis*, never for a leading "* " bullet
    if (line.includes('*') && !line.startsWith('* ')) {
      flushParagraph();
      const runs = line.split(/(\*[^*]+\*)/g).filter(Boolean).map(part =>
        part.startsWith('*') && part.endsWith('*') && part.length > 2
          ? new TextRun({ text: part.slice(1, -1), italics: true, size: 24 })
          : new TextRun({ text: part, size: 24 })
      );
      if (runs.length > 0) children.push(new Paragraph({ children: runs, spacing: { after: 200 } }));
      continue;
    }

    // Regular paragraph
    if (line.trim()) currentParagraph.push(new TextRun({ text: line + ' ', size: 24 }));
    else flushParagraph();
  }

  flushParagraph();
  return children;
}

function pageProperties() {
  return {
    page: {
      margin: {
        top: convertInchesToTwip(1),
        right: convertInchesToTwip(1),
        bottom: convertInchesToTwip(1),
        left: convertInchesToTwip(1),
      },
    },
  };
}

function footer() {
  return new Footer({
    children: [
      new Paragraph({
        children: [
          new TextRun({ text: 'By Michael C. Barnes', size: 20 }),
          new TextRun({ text: '\tPage ', size: 20 }),
          new TextRun({ children: [PageNumber.CURRENT], size: 20 }),
          new TextRun({ text: ' of ', size: 20 }),
          new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 20 }),
        ],
        alignment: AlignmentType.CENTER,
      }),
    ],
  });
}

function runningHeader(text) {
  return new Header({
    children: [
      new Paragraph({ children: [new TextRun({ text, italics: true, size: 20 })], alignment: AlignmentType.RIGHT }),
    ],
  });
}

async function convertChapter(chapter) {
  const label = chapterLabel(chapter);
  console.log(`Converting Chapter ${label}: ${chapter.title} (${chapter.file})...`);
  const children = parseMarkdown(readChapter(BOOK_DIR, chapter));

  const doc = new Document({
    sections: [
      {
        properties: pageProperties(),
        headers: { default: runningHeader(`Chapter ${label} — Building Your AI Dashboard`) },
        footers: { default: footer() },
        children,
      },
    ],
  });

  const outName = `Chapter-${label}-${chapter.slug}.docx`;
  const outputPath = path.join(OUTPUT_DIR, outName);
  fs.writeFileSync(outputPath, await Packer.toBuffer(doc));
  console.log(`  ✓ ${outName}`);
  return outputPath;
}

async function createCombinedBook(chapters) {
  console.log('\n=== Creating combined book ===\n');
  const allChildren = [];

  // Title page
  allChildren.push(
    new Paragraph({ text: '', spacing: { before: 2400 } }),
    new Paragraph({ text: 'Building Your AI Dashboard', heading: HeadingLevel.HEADING_1, alignment: AlignmentType.CENTER }),
    new Paragraph({
      children: [
        new TextRun({
          text: "The Complete Beginner's Guide to Your Own AI Assistant — From Zero to Production",
          size: 28,
          italics: true,
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 480 },
    }),
    new Paragraph({
      children: [new TextRun({ text: 'By Michael C. Barnes', size: 26, bold: true })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 240 },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: 'Byte-Sized AI Series: Keeping You Relevant in an AI World', size: 22, italics: true }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 480 },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: `Assembled from ${chapters.length} chapter source file${chapters.length === 1 ? '' : 's'} in book/  ·  Chapters: ${chapters
            .map(chapterLabel)
            .join(', ')}`,
          size: 20,
        }),
      ],
      alignment: AlignmentType.CENTER,
    })
  );

  // Contents
  allChildren.push(
    new Paragraph({ text: 'Contents', heading: HeadingLevel.HEADING_1, pageBreakBefore: true }),
    ...chapters.map(
      c =>
        new Paragraph({
          children: [new TextRun({ text: `Chapter ${chapterLabel(c)} — ${c.title}`, size: 24 })],
          spacing: { after: 140 },
        })
    )
  );

  let count = 0;
  for (const chapter of chapters) {
    console.log(`Processing Chapter ${chapterLabel(chapter)}: ${chapter.title}...`);
    allChildren.push(new Paragraph({ text: '', pageBreakBefore: true }));
    allChildren.push(...parseMarkdown(readChapter(BOOK_DIR, chapter)));
    count++;
  }

  const doc = new Document({
    sections: [
      {
        properties: pageProperties(),
        headers: { default: runningHeader("Building Your AI Dashboard: The Complete Beginner's Guide") },
        footers: { default: footer() },
        children: allChildren,
      },
    ],
  });

  const outputPath = path.join(OUTPUT_DIR, 'AI-Dashboard-Complete-Book.docx');
  fs.writeFileSync(outputPath, await Packer.toBuffer(doc));
  console.log(`\n✓ Combined book: ${outputPath} (${count} chapters)`);
}

async function main() {
  console.log('=== Book Generation Script ===\n');
  const chapters = discoverChapters(BOOK_DIR);

  if (chapters.length === 0) {
    console.error(`No chapter files found in ${BOOK_DIR}.`);
    process.exit(1);
  }
  console.log(`Found ${chapters.length} chapter(s): ${chapters.map(chapterLabel).join(', ')}\n`);

  for (const chapter of chapters) await convertChapter(chapter);
  await createCombinedBook(chapters);

  console.log('\n=== Book generation complete ===');
  console.log(`\nOutput directory: ${OUTPUT_DIR}`);
  fs.readdirSync(OUTPUT_DIR).forEach(file => {
    const stats = fs.statSync(path.join(OUTPUT_DIR, file));
    console.log(`  - ${file} (${(stats.size / 1024).toFixed(1)} KB)`);
  });
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
