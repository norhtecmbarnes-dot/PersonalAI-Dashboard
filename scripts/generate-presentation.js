#!/usr/bin/env node

/**
 * AI Dashboard Presentation Generator
 *
 * Creates a slide deck presentation about the AI Dashboard system.
 * Run with: node scripts/generate-presentation.js
 *
 * Output formats:
 * - Markdown (.md) - For GitHub, Notion, Obsidian
 * - HTML (.html) - For browser viewing
 * - PowerPoint (.pptx) - For Microsoft Office (via pptxgenjs)
 */

const fs = require('fs');
const path = require('path');

// Presentation content
const presentation = {
  title: 'Building Your AI Dashboard',
  subtitle: 'A Personal AI Assistant That Runs on Your Hardware',
  author: 'Michael C. Barnes',
  date: new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),

  slides: [
    {
      type: 'title',
      content: {
        title: 'Building Your AI Dashboard',
        subtitle: 'A Personal AI Assistant That Runs on Your Hardware',
        presenter: 'Michael C. Barnes',
        date: 'March 2026',
      },
    },
    {
      type: 'section',
      content: {
        title: 'The Problem',
        icon: '❓',
      },
    },
    {
      type: 'content',
      content: {
        title: 'Why Traditional AI Has Limitations',
        points: [
          '🌐 Cloud AI = Data leaves your machine',
          '💰 API costs add up quickly',
          '🔒 Privacy concerns with sensitive data',
          "📈 One-size-fits-all doesn't match tasks",
          '⏱️ Latency from network round-trips',
        ],
      },
    },
    {
      type: 'quote',
      content: {
        quote: 'Your data should stay on your machine. Your AI should be personal.',
        attribution: 'AI Dashboard Philosophy',
      },
    },
    {
      type: 'section',
      content: {
        title: 'The Solution',
        icon: '💡',
      },
    },
    {
      type: 'content',
      content: {
        title: 'Introducing AI Dashboard',
        points: [
          '🏠 Runs 100% locally on your hardware',
          '💚 Free models through Ollama',
          '🔐 Privacy-first architecture',
          '🧠 Persistent memory across sessions',
          '📊 Built-in task automation',
        ],
      },
    },
    {
      type: 'diagram',
      content: {
        title: 'System Architecture',
        diagram: `
┌─────────────────────────────────────────────────────────────┐
│                      AI DASHBOARD                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐     │
│  │   Chat UI   │    │  Documents  │    │   Memory    │     │
│  └──────┬──────┘    └──────┬──────┘    └──────┬──────┘     │
│         │                  │                  │             │
│         └──────────────────┼──────────────────┘             │
│                            ▼                                  │
│              ┌─────────────────────────┐                      │
│              │    Context Engine       │                      │
│              └───────────┬─────────────┘                      │
│                          ▼                                    │
│              ┌─────────────────────────┐                      │
│              │    Model Router         │                      │
│              └───┬─────────┬─────────┘                      │
│                  ▼         ▼         ▼                        │
│            ┌────────┐ ┌────────┐ ┌────────┐                 │
│            │ Local  │ │ Local  │ │ Cloud  │                 │
│            │ Small  │ │ Large  │ │ Smart  │                 │
│            │ Model  │ │ Model  │ │ Model  │                 │
│            └────────┘ └────────┘ └────────┘                 │
│                                                             │
└─────────────────────────────────────────────────────────────┘
`,
      },
    },
    {
      type: 'section',
      content: {
        title: 'Core Features',
        icon: '⚡',
      },
    },
    {
      type: 'grid',
      content: {
        title: 'What You Can Do',
        items: [
          { title: 'Chat', desc: 'Ask questions, get instant answers', icon: '💬' },
          { title: 'Documents', desc: 'Upload PDFs, ask questions', icon: '📄' },
          { title: 'Memory', desc: 'AI remembers context', icon: '🧠' },
          { title: 'Tasks', desc: 'Automate repetitive work', icon: '✅' },
          { title: 'Briefing', desc: 'Daily summary reports', icon: '📊' },
          { title: 'Security', desc: 'Auto vulnerability scanning', icon: '🔒' },
        ],
      },
    },
    {
      type: 'section',
      content: {
        title: 'The Model Message Bus',
        icon: '🔄',
      },
    },
    {
      type: 'content',
      content: {
        title: 'Hierarchical LLM Communication',
        points: [
          'Small model (qwen3.5:2b) acts as triage',
          'Decides when to escalate to larger models',
          'Cloud models consulted when overwhelmed',
          'Results flow back through the hierarchy',
          'Saves tokens, improves response quality',
        ],
      },
    },
    {
      type: 'diagram',
      content: {
        title: 'How Escalation Works',
        diagram: `
┌─────────────────────────────────────────────────────────────┐
│                     MESSAGE BUS FLOW                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  User: "Analyze this 50-page contract"                      │
│                         │                                    │
│                         ▼                                    │
│  ┌──────────────────────────────────────────┐              │
│  │  SMALL MODEL (qwen3.5:2b)               │              │
│  │  Triage: "This is COMPLEX, escalate"     │              │
│  └──────────────────────────────────────────┘              │
│                         │                                    │
│                         ▼                                    │
│  ┌──────────────────────────────────────────┐              │
│  │  CLOUD SMART MODEL (GPT-4)               │              │
│  │  Full analysis of contract               │              │
│  └──────────────────────────────────────────┘              │
│                         │                                    │
│                         ▼                                    │
│  ┌──────────────────────────────────────────┐              │
│  │  SMALL MODEL (qwen3.5:2b)               │              │
│  │  Format summary for user                 │              │
│  └──────────────────────────────────────────┘              │
│                         │                                    │
│                         ▼                                    │
│              User receives structured summary                │
│                                                             │
│  Token Savings: 70% (local for triage + format)             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
`,
      },
    },
    {
      type: 'section',
      content: {
        title: 'Getting Started',
        icon: '🚀',
      },
    },
    {
      type: 'code',
      content: {
        title: 'Quick Start',
        language: 'bash',
        code: `# Clone the repository
git clone https://github.com/norhtecmbarnes-dot/PersonalAI-Dashboard.git
cd PersonalAI-Dashboard

# Install dependencies
npm install

# Start the server
npm run dev

# Open in browser
open http://localhost:3000`,
      },
    },
    {
      type: 'content',
      content: {
        title: 'System Requirements',
        points: [
          '💻 Windows 10+, macOS 10.15+, or Linux',
          '🧠 8GB RAM minimum (16GB recommended)',
          '💾 10GB free disk space',
          '🌐 Internet for initial setup',
          '🎮 Optional: GPU for faster local models',
        ],
      },
    },
    {
      type: 'section',
      content: {
        title: 'Free Models Stack',
        icon: '🆓',
      },
    },
    {
      type: 'table',
      content: {
        title: 'All-Free Model Stack',
        headers: ['Task', 'Model', 'Size', 'Cost'],
        rows: [
          ['Heartbeat', 'qwen3.5:0.5b', '0.5B', '$0'],
          ['Simple Chat', 'qwen3.5:2b', '2B', '$0'],
          ['General Chat', 'qwen3.5:9b', '9B', '$0'],
          ['Writing', 'kimi-k2.5', '9B', '$0'],
          ['Complex', 'gpt-oss:20b', '20B', '$0'],
          ['Research', 'deepseek-v3', '37B', '$0'],
        ],
      },
    },
    {
      type: 'section',
      content: {
        title: 'Security',
        icon: '🛡️',
      },
    },
    {
      type: 'content',
      content: {
        title: 'Built-In Security Features',
        points: [
          '🔍 Automatic vulnerability scanning',
          '🛡️ Input sanitization on all endpoints',
          '📝 Audit logging of all activities',
          '🔐 Database protection with parameterized queries',
          '🤖 AI filter for prompt injection detection',
        ],
      },
    },
    {
      type: 'section',
      content: {
        title: 'The Book',
        icon: '📚',
      },
    },
    {
      type: 'content',
      content: {
        title: 'Learn Step-by-Step',
        points: [
          '📖 29 chapters from beginner to advanced',
          '💻 Copy-paste prompts for AI assistants',
          '🔧 Hands-on tutorials with real code',
          '🌐 No programming experience required',
          '📋 Based on actual working codebase',
        ],
      },
    },
    {
      type: 'quote',
      content: {
        quote: 'Build real enterprise-grade AI power — one chapter at a time.',
        attribution: 'Book tagline',
      },
    },
    {
      type: 'section',
      content: {
        title: 'Get Involved',
        icon: '🤝',
      },
    },
    {
      type: 'content',
      content: {
        title: 'Contributing',
        points: [
          '⭐ Star the repository',
          '🐛 Report issues on GitHub',
          '📝 Improve the documentation',
          '🔧 Submit pull requests',
          '📚 Translate the book',
        ],
      },
    },
    {
      type: 'title',
      content: {
        title: 'Thank You',
        subtitle: "Questions? Let's discuss!",
        presenter: 'Michael C. Barnes',
        contact: 'GitHub: norhtecmbarnes-dot',
      },
    },
  ],
};

// Generate Markdown output
function generateMarkdown() {
  let md = `# ${presentation.title}\n\n`;
  md += `**${presentation.subtitle}**\n\n`;
  md += `*${presentation.author} | ${presentation.date}*\n\n`;
  md += `---\n\n`;

  for (const slide of presentation.slides) {
    switch (slide.type) {
      case 'title':
        md += `---\n\n`;
        md += `# ${slide.content.title}\n\n`;
        if (slide.content.subtitle) md += `**${slide.content.subtitle}**\n\n`;
        if (slide.content.presenter) md += `*${slide.content.presenter}*\n\n`;
        if (slide.content.date) md += `**Date:** ${slide.content.date}\n\n`;
        if (slide.content.contact) md += `**Contact:** ${slide.content.contact}\n\n`;
        break;

      case 'section':
        md += `## ${slide.content.icon} ${slide.content.title}\n\n`;
        break;

      case 'content':
        md += `### ${slide.content.title}\n\n`;
        for (const point of slide.content.points) {
          md += `- ${point}\n`;
        }
        md += `\n`;
        break;

      case 'quote':
        md += `> ${slide.content.quote}\n\n`;
        md += `*— ${slide.content.attribution}*\n\n`;
        break;

      case 'diagram':
        md += `### ${slide.content.title}\n\n`;
        md += `\`\`\`\n${slide.content.diagram}\n\`\`\`\n\n`;
        break;

      case 'grid':
        md += `### ${slide.content.title}\n\n`;
        md += `| ${slide.content.items.map(i => i.title).join(' | ')} |\n`;
        md += `| ${slide.content.items.map(() => '---').join(' | ')} |\n`;
        md += `| ${slide.content.items.map(i => `${i.icon} ${i.desc}`).join(' | ')} |\n\n`;
        break;

      case 'code':
        md += `### ${slide.content.title}\n\n`;
        md += `\`\`\`${slide.content.language}\n${slide.content.code}\n\`\`\`\n\n`;
        break;

      case 'table':
        md += `### ${slide.content.title}\n\n`;
        md += `| ${slide.content.headers.join(' | ')} |\n`;
        md += `| ${slide.content.headers.map(() => '---').join(' | ')} |\n`;
        for (const row of slide.content.rows) {
          md += `| ${row.join(' | ')} |\n`;
        }
        md += `\n`;
        break;
    }
  }

  return md;
}

// Generate HTML output
function generateHTML() {
  let html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${presentation.title}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f172a; color: #e2e8f0; line-height: 1.6; }
    .slide { min-height: 100vh; padding: 4rem 2rem; display: flex; flex-direction: column; justify-content: center; border-bottom: 1px solid #334155; }
    .slide-title { background: linear-gradient(135deg, #1e1b4b 0%, #312e81 100%); text-align: center; }
    .slide-title h1 { font-size: 3.5rem; margin-bottom: 1rem; background: linear-gradient(90deg, #a78bfa, #818cf8); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
    .slide-title p { font-size: 1.5rem; color: #c4b5fd; }
    .slide-title .meta { margin-top: 2rem; font-size: 1rem; color: #a5b4fc; }
    .section { background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); text-align: center; }
    .section h2 { font-size: 2.5rem; color: #f472b6; }
    .section h2 .icon { font-size: 3rem; display: block; margin-bottom: 1rem; }
    .content { max-width: 900px; margin: 0 auto; }
    .content h3 { font-size: 2rem; color: #38bdf8; margin-bottom: 2rem; }
    .content ul { list-style: none; }
    .content li { font-size: 1.25rem; padding: 1rem 0; border-bottom: 1px solid #334155; }
    .content li:last-child { border-bottom: none; }
    .quote { max-width: 800px; margin: 0 auto; text-align: center; }
    .quote blockquote { font-size: 2rem; font-style: italic; color: #fbbf24; border-left: 4px solid #f59e0b; padding-left: 2rem; margin-bottom: 1rem; }
    .quote cite { color: #94a3b8; }
    pre { background: #1e293b; padding: 1.5rem; border-radius: 0.5rem; overflow-x: auto; font-size: 0.9rem; }
    code { font-family: 'Fira Code', monospace; }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 1rem; text-align: left; border-bottom: 1px solid #334155; }
    th { background: #1e293b; color: #a78bfa; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1.5rem; }
    .card { background: #1e293b; padding: 1.5rem; border-radius: 0.5rem; text-align: center; }
    .card .icon { font-size: 2.5rem; margin-bottom: 0.5rem; }
    .card h4 { color: #38bdf8; margin-bottom: 0.5rem; }
    .card p { color: #94a3b8; font-size: 0.9rem; }
    .thank-you { text-align: center; }
    .thank-you h1 { font-size: 4rem; color: #a78bfa; margin-bottom: 1rem; }
    .thank-you p { font-size: 1.5rem; color: #94a3b8; }
  </style>
</head>
<body>
`;

  for (const slide of presentation.slides) {
    switch (slide.type) {
      case 'title':
        html += `  <div class="slide slide-title">\n`;
        html += `    <h1>${slide.content.title}</h1>\n`;
        if (slide.content.subtitle) html += `    <p>${slide.content.subtitle}</p>\n`;
        if (slide.content.presenter)
          html += `    <p class="meta"><strong>${slide.content.presenter}</strong></p>\n`;
        if (slide.content.date) html += `    <p class="meta">${slide.content.date}</p>\n`;
        if (slide.content.contact) html += `    <p class="meta">${slide.content.contact}</p>\n`;
        html += `  </div>\n`;
        break;

      case 'section':
        html += `  <div class="slide section">\n`;
        html += `    <h2><span class="icon">${slide.content.icon}</span>${slide.content.title}</h2>\n`;
        html += `  </div>\n`;
        break;

      case 'content':
        html += `  <div class="slide">\n`;
        html += `    <div class="content">\n`;
        html += `      <h3>${slide.content.title}</h3>\n`;
        html += `      <ul>\n`;
        for (const point of slide.content.points) {
          html += `        <li>${point}</li>\n`;
        }
        html += `      </ul>\n`;
        html += `    </div>\n`;
        html += `  </div>\n`;
        break;

      case 'quote':
        html += `  <div class="slide">\n`;
        html += `    <div class="quote">\n`;
        html += `      <blockquote>"${slide.content.quote}"</blockquote>\n`;
        html += `      <cite>— ${slide.content.attribution}</cite>\n`;
        html += `    </div>\n`;
        html += `  </div>\n`;
        break;

      case 'diagram':
        html += `  <div class="slide">\n`;
        html += `    <div class="content">\n`;
        html += `      <h3>${slide.content.title}</h3>\n`;
        html += `      <pre>${slide.content.diagram}</pre>\n`;
        html += `    </div>\n`;
        html += `  </div>\n`;
        break;

      case 'grid':
        html += `  <div class="slide">\n`;
        html += `    <div class="content">\n`;
        html += `      <h3>${slide.content.title}</h3>\n`;
        html += `      <div class="grid">\n`;
        for (const item of slide.content.items) {
          html += `        <div class="card">\n`;
          html += `          <div class="icon">${item.icon}</div>\n`;
          html += `          <h4>${item.title}</h4>\n`;
          html += `          <p>${item.desc}</p>\n`;
          html += `        </div>\n`;
        }
        html += `      </div>\n`;
        html += `    </div>\n`;
        html += `  </div>\n`;
        break;

      case 'code':
        html += `  <div class="slide">\n`;
        html += `    <div class="content">\n`;
        html += `      <h3>${slide.content.title}</h3>\n`;
        html += `      <pre><code class="language-${slide.content.language}">${slide.content.code}</code></pre>\n`;
        html += `    </div>\n`;
        html += `  </div>\n`;
        break;

      case 'table':
        html += `  <div class="slide">\n`;
        html += `    <div class="content">\n`;
        html += `      <h3>${slide.content.title}</h3>\n`;
        html += `      <table>\n`;
        html += `        <thead><tr>${slide.content.headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>\n`;
        html += `        <tbody>\n`;
        for (const row of slide.content.rows) {
          html += `          <tr>${row.map(c => `<td>${c}</td>`).join('')}</tr>\n`;
        }
        html += `        </tbody>\n`;
        html += `      </table>\n`;
        html += `    </div>\n`;
        html += `  </div>\n`;
        break;
    }
  }

  html += `
</body>
</html>`;

  return html;
}

// Main execution
function main() {
  const outputDir = path.join(__dirname, '..', 'presentation-output');

  // Create output directory
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Generate Markdown
  const md = generateMarkdown();
  fs.writeFileSync(path.join(outputDir, 'presentation.md'), md);
  console.log('✅ Created: presentation-output/presentation.md');

  // Generate HTML
  const html = generateHTML();
  fs.writeFileSync(path.join(outputDir, 'presentation.html'), html);
  console.log('✅ Created: presentation-output/presentation.html');

  console.log('\n📊 Presentation generated successfully!');
  console.log(`📁 Output directory: ${outputDir}`);
  console.log('\nOpen presentation.html in a browser to view the slides.');
}

main();
