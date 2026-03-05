const fs = require('fs');
const path = require('path');

const BOOK_DIR = path.join('C:\\ai_dashboard', 'book');
const OUTPUT_DIR = path.join('C:\\ai_dashboard', 'book-output');

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

console.log(`Found ${chapters.length} chapters`);

// Read and combine all chapters
let combinedContent = `# PersonalAI Dashboard: The Complete Guide\n\n`;
combinedContent += `## Building Your Own AI Assistant - From Zero to Production\n\n`;
combinedContent += `*By Michael C. Barnes*\n\n`;
combinedContent += `**Byte-Sized AI Series: Keeping You Relevant in an AI World**\n\n---\n\n`;
combinedContent += `## Table of Contents\n\n`;

// Append each chapter
chapters.forEach((chapter, index) => {
  const content = fs.readFileSync(path.join(BOOK_DIR, chapter), 'utf-8');
  combinedContent += content + '\n\n';
  console.log(`Added Chapter ${index + 1}: ${chapter}`);
});

// Write combined file
const outputPath = path.join(OUTPUT_DIR, 'PersonalAI-Dashboard-Complete-Guide.md');
fs.writeFileSync(outputPath, combinedContent);

console.log(`\nComplete book written to: ${outputPath}`);
console.log(`Total chapters: ${chapters.length}`);
console.log(`File size: ${(fs.statSync(outputPath).size / 1024 / 1024).toFixed(2)} MB`);
