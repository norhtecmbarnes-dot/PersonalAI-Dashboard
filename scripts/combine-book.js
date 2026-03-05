const fs = require('fs');
const path = require('path');

const BOOK_DIR = path.join(process.cwd(), 'book');
const OUTPUT_DIR = path.join(process.cwd(), 'book-output');

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Get all chapter files sorted numerically
const chapters = fs.readdirSync(BOOK_DIR)
  .filter(file => file.match(/^chapter-\d+.*\.md$/))
  .sort((a, b) => {
    const numA = parseInt(a.match(/\d+/)[0]);
    const numB = parseInt(b.match(/\d+/)[0]);
    return numA - numB;
  });

console.log(`Found ${chapters.length} chapters:`);
chapters.forEach(chapter => console.log(`  - ${chapter}`));

// Read and combine all chapters
let combinedContent = `# PersonalAI Dashboard: The Complete Guide

## Building Your Own AI Assistant - From Zero to Production

*By Michael C. Barnes*

**Byte-Sized AI Series: Keeping You Relevant in an AI World**

---

**Book Version:** 1.0  
**Last Updated:** March 2026  
**Pages:** ~500  
**Reading Time:** 15-20 hours

---

## About This Book

This book teaches you how to build a complete, production-ready AI assistant that runs on your own computer. Unlike cloud-based solutions like ChatGPT, your PersonalAI Dashboard keeps your data private, costs $0 per month to run, and works even without internet.

**The Philosophy:** AI should be a manager of tools, not a repository of knowledge. This approach uses small, efficient models (2B-14B parameters) backed by databases, document stores, and search tools—outperforming large models alone.

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

${chapters.map((ch, i) => `${i + 1}. ${ch.replace(/^chapter-\d+-/, '').replace(/\.md$/, '').replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}`).join('\n')}

---

## Prerequisites

- A computer (Windows, Mac, or Linux)
- 4GB+ RAM (8GB recommended)
- Internet connection (for setup)
- 10-20 hours of focused time
- Curiosity and willingness to learn

---

*Let's begin building your AI assistant...*

---

`;

// Append each chapter
chapters.forEach((chapter, index) => {
  const content = fs.readFileSync(path.join(BOOK_DIR, chapter), 'utf-8');
  
  // Add page break before each chapter (except first)
  if (index > 0) {
    combinedContent += '\n\n<div style="page-break-after: always;"></div>\n\n';
  }
  
  // Add chapter content
  combinedContent += content;
  combinedContent += '\n\n';
  
  console.log(`✓ Added Chapter ${index + 1}: ${chapter}`);
});

// Appendices
combinedContent += `\n\n---\n\n# Appendix A: Complete Prompt Library\n\n## Quick Reference\n

[Prompt library content would go here]

---\n\n# Appendix B: Model Selection Guide\n\n## Choosing the Right Model\n

| Task | Model Size | Recommended |
|------|------------|-------------|
| Quick Q&A | 2B | qwen3.5:2b |
| Document Chat | 2B-7B | qwen3.5:2b, qwen2.5:7b |
| Writing | 7B-14B | qwen2.5:14b, phi4:14b |
| Code | 7B-14B | qwen2.5-coder:7b |
| Analysis | 14B-27B | qwen3.5:14b, qwen3.5:27b |
| Complex Reasoning | 27B+ | qwen3.5:27b (cloud) |

---\n\n# Appendix C: Troubleshooting\n\n## Common Issues and Solutions\n

[Detailed troubleshooting guide would go here]

---\n\n# Appendix D: Enterprise Scaling\n\n## Scaling to v2.0\n

### When to Upgrade to vLLM

Consider upgrading from Ollama to vLLM when you need:
- 100+ concurrent users
- API-grade reliability
- Maximum throughput
- Production enterprise deployment

### Migration Path

1. Keep your existing PersonalAI Dashboard
2. Set up vLLM server (requires GPU)
3. Configure connection to vLLM backend
4. Same UI, faster backend

---\n\n# License\n
**Code:** MIT License - Free to use, modify, distribute

**Book Content:** CC BY-SA 4.0 - Share and adapt with attribution

---\n\n*Thank you for reading. May your AI serve you well.*\n\n**End of Book**\n`;

// Write combined file
const outputPath = path.join(OUTPUT_DIR, 'PersonalAI-Dashboard-Complete-Guide.md');
fs.writeFileSync(outputPath, combinedContent);

console.log(`\n✅ Complete book written to: ${outputPath}`);
console.log(`📄 Total chapters: ${chapters.length}`);
console.log(`📊 Estimated pages: ${Math.round(combinedContent.length / 3000)}`);
console.log(`💾 File size: ${(fs.statSync(outputPath).size / 1024 / 1024).toFixed(2)} MB`);
