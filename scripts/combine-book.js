/**
 * Assemble the book manuscript from the chapter sources in book/.
 *
 * Fixed: the old version matched /^chapter-\d+.*\.md$/ case-sensitively against files named
 * `Chapter-21-…`, so it found ZERO chapters and wrote an empty book. Discovery now lives in
 * scripts/lib/book-chapters.js (case-insensitive, understands the `5B` suffix).
 *
 * Run:  node scripts/combine-book.js          (or: npm run book:combine)
 * Env:  INCLUDE_APPENDICES=1                  add placeholder appendix stubs (off by default —
 *                                             stubs must never be mistaken for real content)
 */

const fs = require('fs');
const path = require('path');
const { DEFAULT_BOOK_DIR, discoverChapters, readChapter, chapterLabel } = require('./lib/book-chapters');

const BOOK_DIR = DEFAULT_BOOK_DIR;
const OUTPUT_DIR = path.join(process.cwd(), 'book-output');

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

const chapters = discoverChapters(BOOK_DIR);

if (chapters.length === 0) {
  console.error(`No chapter files found in ${BOOK_DIR}.`);
  console.error('Expected names like "Chapter-21-Giving-The-Talk…md" or "chapter-01-introduction.md".');
  process.exit(1);
}

console.log(`Found ${chapters.length} chapter(s):`);
chapters.forEach(c => console.log(`  - Chapter ${chapterLabel(c)}: ${c.title}  (${c.file})`));

const labels = chapters.map(chapterLabel);
const firstNum = chapters[0].num;
const missingEarlier = firstNum > 1;

const toc = chapters
  .map(c => `- **Chapter ${chapterLabel(c)}** — ${c.title}`)
  .join('\n');

let combinedContent = `# Building Your AI Dashboard

## The Complete Beginner's Guide to Your Own AI Assistant — From Zero to Production

*By Michael C. Barnes*

**Byte-Sized AI Series: Keeping You Relevant in an AI World**

---

**Assembled from:** ${chapters.length} chapter source file${chapters.length === 1 ? '' : 's'} in \`book/\`
**Chapters included:** ${labels.join(', ')}
${missingEarlier ? `**Note:** chapter source for 1–${firstNum - 1} is not present in this repository, so this build is partial.\n` : ''}
---

## About This Book

This book teaches you how to build a complete, production-ready AI assistant that runs on your own computer. Unlike cloud-based solutions like ChatGPT, your PersonalAI Dashboard keeps your data private, costs $0 per month to run, and works even without internet.

**The Philosophy:** AI should be a manager of tools, not a repository of knowledge. This approach uses small, efficient models backed by databases, document stores, and search tools — outperforming large models alone.

**Dedication:** To Randolph (Randy) Hill, Founder & CTO of GovBotics, who first conceptualized the tool-based AI approach that makes this system possible.

---

## What Makes This Book Different

- **Beginner-Friendly:** No programming experience required
- **Build As You Learn:** Each chapter adds features to your working system
- **Options, Not Dictates:** Shows multiple approaches (minimal to enterprise)
- **Production-Ready:** Real code, not tutorials
- **Fully Open Source:** Copy it, modify it, make it yours

---

## Table of Contents

${toc}

---

## Prerequisites

- A computer (Windows, Mac, or Linux)
- 4GB+ RAM (8GB recommended)
- Internet connection (for setup)
- 10–20 hours of focused time
- Curiosity and willingness to learn

---

*Let's begin building your AI assistant...*

---
`;

chapters.forEach((chapter, index) => {
  const content = readChapter(BOOK_DIR, chapter);
  if (index > 0) {
    combinedContent += '\n\n<div style="page-break-after: always;"></div>\n\n';
  }
  combinedContent += content;
  combinedContent += '\n\n';
  console.log(`✓ Added Chapter ${chapterLabel(chapter)}: ${chapter.title}`);
});

if (process.env.INCLUDE_APPENDICES === '1') {
  combinedContent += `\n\n---\n\n# Appendix A: Model Selection Guide\n\n| Task | Model Size | Recommended |
|------|------------|-------------|
| Quick Q&A | 2B | qwen3.5:2b |
| Document Chat | 2B–7B | qwen3.5:2b, qwen2.5:7b |
| Writing | 7B–14B | qwen2.5:14b, phi4:14b |
| Code | 7B–14B | qwen2.5-coder:7b |
| Analysis | 14B–27B | qwen3.5:14b, qwen3.5:27b |
| Complex Reasoning | 27B+ | qwen3.5:27b (cloud) |

---
`;
}

combinedContent += `\n---\n\n# License

**Code:** MIT License — free to use, modify, distribute

**Book Content:** CC BY-SA 4.0 — share and adapt with attribution

---

*Thank you for reading. May your AI serve you well.*

**End of Book**
`;

const outputPath = path.join(OUTPUT_DIR, 'PersonalAI-Dashboard-Complete-Guide.md');
fs.writeFileSync(outputPath, combinedContent, 'utf-8');

console.log(`\n✅ Manuscript written to: ${outputPath}`);
console.log(`📄 Chapters: ${chapters.length} (${labels.join(', ')})`);
console.log(`📊 Estimated pages: ~${Math.round(combinedContent.length / 3000)}`);
console.log(`💾 File size: ${(fs.statSync(outputPath).size / 1024).toFixed(0)} KB`);
