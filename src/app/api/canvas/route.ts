export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { canvasService, CanvasComponent } from '@/lib/services/canvas';
import { chatCompletion } from '@/lib/models/sdk.server';
import { sqlDatabase } from '@/lib/database/sqlite';

const CANVAS_SYSTEM_PROMPT = `You are an expert frontend developer. Generate HTML/CSS/JS code for dashboards, landing pages, and diagrams.

Rules:
1. Return ONLY valid HTML with inline CSS and JS
2. Use modern CSS (flexbox, grid, CSS variables)
3. Use dark theme with these colors: bg=#0f172a, card=#1e293b, text=#e2e8f0, accent=#60a5fa
4. Make it responsive
5. Use Chart.js for charts (already loaded)
6. Generate realistic sample data
7. For tables, include search/filter functionality
8. Make it interactive with JavaScript

For Landing Pages:
- Include hero section with headline, subheadline, CTA buttons
- Add features section with icon cards
- Include pricing table (3 tiers)
- Add testimonials section
- Include CTA banner
- Add navigation and footer
- Use professional, modern design

For Diagrams:
- Use clear visual hierarchy
- Include labels and descriptions
- Make components interactive/hoverable
- Use Mermaid.js syntax for flowcharts

Output ONLY the HTML code, no explanations.`;

export async function GET(request: NextRequest) {
  try {
    const action = request.nextUrl.searchParams.get('action');
    
    switch (action) {
      case 'templates':
        return NextResponse.json({ 
          success: true, 
          templates: canvasService.getTemplateNames() 
        });
        
      case 'tables':
        // Get SQLite tables for data binding
        await sqlDatabase.initialize();
        const tables = await sqlDatabase.all(`
          SELECT name FROM sqlite_master 
          WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_litestream_%'
          ORDER BY name
        `);
        return NextResponse.json({ 
          success: true, 
          tables: tables.map((t: any) => t.name)
        });
        
      default:
        return NextResponse.json({ 
          success: false, 
          error: 'Invalid action. Use: templates, tables' 
        }, { status: 400 });
    }
  } catch (error) {
    console.error('Canvas error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Canvas operation failed' 
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;
    
    switch (action) {
      case 'createLayout':
        const layout = canvasService.createLayout(
          body.columns || 2,
          body.rows || 2
        );
        return NextResponse.json({ 
          success: true, 
          layout 
        });
        
      case 'addComponent':
        const { layout: addLayout, type, overrides } = body;
        const updatedLayout = canvasService.addComponent(
          addLayout,
          type,
          overrides || {}
        );
        return NextResponse.json({ 
          success: true, 
          layout: updatedLayout 
        });
        
      case 'generateFromDescription':
        const { description } = body;
        const generatedLayout = canvasService.generateFromDescription(description);
        return NextResponse.json({ 
          success: true, 
          layout: generatedLayout 
        });
        
      case 'render':
        const { layout: renderLayout } = body;
        const html = canvasService.render(renderLayout);
        return NextResponse.json({ 
          success: true, 
          html 
        });
        
      case 'generateAndRender':
        const { description: desc } = body;
        const genLayout = canvasService.generateFromDescription(desc);
        const renderedHtml = canvasService.render(genLayout);
        return NextResponse.json({ 
          success: true, 
          layout: genLayout,
          html: renderedHtml 
        });

      case 'generateWithAI':
        // Use LLM to generate HTML from description
        const { description: prompt, model } = body;
        const aiHtml = await generateAIHTML(prompt, model || 'glm-4.7-flash');
        return NextResponse.json({ 
          success: true, 
          html: aiHtml 
        });

      case 'generateWithData':
        // Generate HTML with data from SQLite table
        const { description: dataPrompt, tableName, model: dataModel } = body;
        
        // Get table data
        let tableData: any[] = [];
        let tableSchema: any[] = [];
        
        if (tableName) {
          await sqlDatabase.initialize();
          try {
            tableData = await sqlDatabase.all(`SELECT * FROM ${tableName} LIMIT 100`);
            tableSchema = await sqlDatabase.all(`PRAGMA table_info(${tableName})`);
          } catch (e) {
            console.error('Failed to get table data:', e);
          }
        }
        
        const dataHtml = await generateAIHTMLWithData(
          dataPrompt, 
          tableName, 
          tableSchema, 
          tableData,
          dataModel || 'glm-4.7-flash'
        );
        return NextResponse.json({ 
          success: true, 
          html: dataHtml,
          rowCount: tableData.length 
        });

      case 'generateForm':
        // Generate a form for a SQLite table
        const { tableName: formTable } = body;
        
        if (!formTable) {
          return NextResponse.json({ 
            success: false, 
            error: 'tableName required' 
          }, { status: 400 });
        }
        
        await sqlDatabase.initialize();
        const formSchema = await sqlDatabase.all(`PRAGMA table_info(${formTable})`);
        const formHtml = generateFormHTML(formTable, formSchema);
        
        return NextResponse.json({ 
          success: true, 
          html: formHtml,
          schema: formSchema 
        });

      case 'generateDashboard':
        // Generate a full dashboard with widgets from description
        const { description: dashPrompt, dataSources, model: dashModel } = body;
        
        // Get data from specified tables
        const dashboardData: Record<string, any[]> = {};
        
        if (dataSources && Array.isArray(dataSources)) {
          await sqlDatabase.initialize();
          for (const source of dataSources) {
            try {
              dashboardData[source] = await sqlDatabase.all(`SELECT * FROM ${source} LIMIT 50`);
            } catch (e) {
              console.error(`Failed to get data from ${source}:`, e);
            }
          }
        }
        
        const dashboardHtml = await generateDashboardHTML(
          dashPrompt,
          dashboardData,
          dashModel || 'glm-4.7-flash'
        );
        
        return NextResponse.json({ 
          success: true, 
          html: dashboardHtml 
        });
        
      default:
        return NextResponse.json({ 
          success: false, 
          error: 'Invalid action. Use: templates, tables, generateWithAI, generateWithData, generateForm, generateDashboard' 
        }, { status: 400 });
    }
  } catch (error) {
    console.error('Canvas error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Canvas operation failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

async function generateAIHTML(prompt: string, model: string): Promise<string> {
  const fullPrompt = `${CANVAS_SYSTEM_PROMPT}

User request: ${prompt}

Generate a complete, functional HTML page with inline CSS and JavaScript that fulfills this request. Include sample data.`;

  try {
    const result = await chatCompletion({
      model,
      messages: [{ role: 'user', content: fullPrompt }],
      temperature: 0.7,
      maxTokens: 4000,
    });

    const content = result.message?.content || '';
    
    // Extract HTML from code blocks if present
    const htmlMatch = content.match(/```html\s*([\s\S]*?)```/);
    if (htmlMatch) {
      return htmlMatch[1].trim();
    }
    
    // Try to extract just the HTML
    const htmlStart = content.indexOf('<!DOCTYPE') !== -1 ? content.indexOf('<!DOCTYPE') : content.indexOf('<html');
    const htmlEnd = content.lastIndexOf('</html>');
    if (htmlStart !== -1 && htmlEnd !== -1) {
      return content.slice(htmlStart, htmlEnd + 7).trim();
    }
    
    return content.trim();
  } catch (error) {
    console.error('AI generation error:', error);
    return generateFallbackHTML(prompt);
  }
}

async function generateAIHTMLWithData(
  prompt: string, 
  tableName: string | undefined,
  schema: any[],
  data: any[],
  model: string
): Promise<string> {
  const schemaInfo = schema.map(col => `${col.name} (${col.type})`).join(', ');
  const dataSample = data.slice(0, 5).map(row => JSON.stringify(row).slice(0, 200)).join('\n');
  
  const fullPrompt = `${CANVAS_SYSTEM_PROMPT}

User request: ${prompt}

Database Table: ${tableName || 'N/A'}
Columns: ${schemaInfo}

Sample Data (first 5 rows):
${dataSample}

Total rows: ${data.length}

Generate a complete HTML dashboard that visualizes this data. Use Chart.js for charts. Make it interactive with sorting/filtering.`;

  try {
    const result = await chatCompletion({
      model,
      messages: [{ role: 'user', content: fullPrompt }],
      temperature: 0.7,
      maxTokens: 6000,
    });

    const content = result.message?.content || '';
    
    // Extract HTML
    const htmlMatch = content.match(/```html\s*([\s\S]*?)```/);
    if (htmlMatch) {
      return htmlMatch[1].trim();
    }
    
    return content.trim();
  } catch (error) {
    console.error('AI generation with data error:', error);
    return generateFallbackDataHTML(tableName || 'Data', schema, data);
  }
}

async function generateDashboardHTML(
  prompt: string,
  dataSources: Record<string, any[]>,
  model: string
): Promise<string> {
  const dataInfo = Object.entries(dataSources)
    .map(([table, rows]) => `${table}: ${rows.length} rows`)
    .join('\n');
  
  const fullPrompt = `${CANVAS_SYSTEM_PROMPT}

User request: ${prompt}

Available Data:
${dataInfo || 'No data sources specified'}

Generate a comprehensive dashboard HTML page with:
1. Header with title and description
2. Key metrics at the top (as cards)
3. At least 2 charts (bar, line, or pie)
4. A data table with search
5. Use dark theme with CSS variables
6. Include Chart.js for visualizations
7. Make it fully interactive`;

  try {
    const result = await chatCompletion({
      model,
      messages: [{ role: 'user', content: fullPrompt }],
      temperature: 0.7,
      maxTokens: 6000,
    });

    const content = result.message?.content || '';
    
    const htmlMatch = content.match(/```html\s*([\s\S]*?)```/);
    if (htmlMatch) {
      return htmlMatch[1].trim();
    }
    
    return content.trim();
  } catch (error) {
    console.error('Dashboard generation error:', error);
    return generateFallbackHTML(prompt);
  }
}

function generateFormHTML(tableName: string, schema: any[]): string {
  const fields = schema
    .filter((col: any) => !col.pk && col.name !== 'id' && col.name !== 'created_at' && col.name !== 'updated_at')
    .map((col: any) => {
      const inputType = col.type?.includes('INT') ? 'number' : 
                         col.type?.includes('TEXT') ? 'textarea' :
                         col.type?.includes('DATE') ? 'date' :
                         col.type?.includes('BOOL') ? 'checkbox' : 'text';
      
      return `
      <div class="form-field">
        <label for="${col.name}">${col.name.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}</label>
        ${inputType === 'textarea' 
          ? `<textarea name="${col.name}" id="${col.name}" ${col.notnull ? 'required' : ''}></textarea>`
          : inputType === 'checkbox'
          ? `<input type="checkbox" name="${col.name}" id="${col.name}" />`
          : `<input type="${inputType}" name="${col.name}" id="${col.name}" ${col.notnull ? 'required' : ''} />`
        }
      </div>`;
    }).join('\n');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${tableName} Form</title>
  <style>
    :root {
      --primary: #60a5fa;
      --bg-dark: #0f172a;
      --bg-card: #1e293b;
      --text-primary: #e2e8f0;
      --text-secondary: #94a3b8;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: var(--bg-dark);
      color: var(--text-primary);
      padding: 20px;
      margin: 0;
    }
    .form-container {
      max-width: 600px;
      margin: 0 auto;
      background: var(--bg-card);
      border-radius: 12px;
      padding: 24px;
    }
    h2 { margin-top: 0; color: var(--primary); }
    .form-field { margin-bottom: 16px; }
    label { 
      display: block; 
      color: var(--text-secondary); 
      margin-bottom: 4px;
      font-size: 14px;
    }
    input, textarea, select {
      width: 100%;
      padding: 10px 12px;
      border: 1px solid #334155;
      border-radius: 8px;
      background: #0f172a;
      color: var(--text-primary);
      font-size: 14px;
    }
    textarea { min-height: 100px; resize: vertical; }
    input:focus, textarea:focus, select:focus {
      outline: none;
      border-color: var(--primary);
    }
    .form-actions {
      margin-top: 24px;
      display: flex;
      gap: 12px;
    }
    button {
      padding: 10px 20px;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 500;
    }
    .btn-primary {
      background: var(--primary);
      color: white;
    }
    .btn-secondary {
      background: #475569;
      color: var(--text-primary);
    }
    .btn-primary:hover { background: #3b82f6; }
    .btn-secondary:hover { background: #64748b; }
  </style>
</head>
<body>
  <div class="form-container">
    <h2>${tableName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</h2>
    <form id="dataForm" onsubmit="handleSubmit(event)">
      ${fields}
      <div class="form-actions">
        <button type="submit" class="btn-primary">Save</button>
        <button type="button" class="btn-secondary" onclick="clearForm()">Clear</button>
      </div>
    </form>
    <div id="result" style="margin-top: 16px; padding: 12px; border-radius: 8px; display: none;"></div>
  </div>
  <script>
    async function handleSubmit(e) {
      e.preventDefault();
      const form = document.getElementById('dataForm');
      const formData = new FormData(form);
      const data = Object.fromEntries(formData.entries());
      
      try {
        const response = await fetch('/api/database/insert', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ table: '${tableName}', data })
        });
        const result = await response.json();
        
        const resultDiv = document.getElementById('result');
        resultDiv.style.display = 'block';
        
        if (result.success) {
          resultDiv.style.background = '#065f46';
          resultDiv.textContent = 'Saved successfully! ID: ' + (result.id || 'N/A');
          form.reset();
        } else {
          resultDiv.style.background = '#991b1b';
          resultDiv.textContent = 'Error: ' + (result.error || 'Unknown error');
        }
      } catch (error) {
        const resultDiv = document.getElementById('result');
        resultDiv.style.display = 'block';
        resultDiv.style.background = '#991b1b';
        resultDiv.textContent = 'Error: ' + error.message;
      }
    }
    
    function clearForm() {
      document.getElementById('dataForm').reset();
      document.getElementById('result').style.display = 'none';
    }
  </script>
</body>
</html>`;
}

function generateFallbackHTML(prompt: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Dashboard</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <style>
    :root { --primary: #60a5fa; --bg-dark: #0f172a; --bg-card: #1e293b; --text-primary: #e2e8f0; --text-secondary: #94a3b8; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: var(--bg-dark); color: var(--text-primary); padding: 20px; margin: 0; }
    .dashboard { max-width: 1200px; margin: 0 auto; }
    h1 { color: var(--primary); margin-bottom: 20px; }
    .metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 24px; }
    .metric-card { background: var(--bg-card); border-radius: 12px; padding: 20px; }
    .metric-value { font-size: 2rem; font-weight: bold; color: var(--text-primary); }
    .metric-label { color: var(--text-secondary); font-size: 0.875rem; }
    .metric-trend { font-size: 0.875rem; }
    .trend-up { color: #34d399; } .trend-down { color: #f87171; }
    .chart-container { background: var(--bg-card); border-radius: 12px; padding: 20px; margin-bottom: 24px; }
    .chart-title { color: var(--primary); margin-bottom: 16px; }
    canvas { max-height: 300px; }
  </style>
</head>
<body>
  <div class="dashboard">
    <h1>Dashboard</h1>
    <p style="color: var(--text-secondary); margin-bottom: 20px;">Request: ${prompt}</p>
    <div class="metrics">
      <div class="metric-card">
        <div class="metric-value">1,234</div>
        <div class="metric-label">Total Items</div>
        <div class="metric-trend trend-up">+12% from last month</div>
      </div>
      <div class="metric-card">
        <div class="metric-value">$45.2K</div>
        <div class="metric-label">Revenue</div>
        <div class="metric-trend trend-up">+8% from last month</div>
      </div>
      <div class="metric-card">
        <div class="metric-value">89%</div>
        <div class="metric-label">Completion Rate</div>
        <div class="metric-trend trend-up">+5% from last month</div>
      </div>
    </div>
    <div class="chart-container">
      <div class="chart-title">Performance Overview</div>
      <canvas id="mainChart"></canvas>
    </div>
  </div>
  <script>
    new Chart(document.getElementById('mainChart'), {
      type: 'bar',
      data: {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
        datasets: [{
          label: 'Performance',
          data: [65, 59, 80, 81, 56, 72],
          backgroundColor: '#60a5fa'
        }]
      },
      options: { responsive: true, maintainAspectRatio: false }
    });
  </script>
</body>
</html>`;
}

function generateFallbackDataHTML(tableName: string, schema: any[], data: any[]): string {
  const columns = schema.map(s => s.name);
  const headerRow = columns.map(c => `<th>${c}</th>`).join('');
  const dataRows = data.slice(0, 10).map(row => 
    `<tr>${columns.map(c => `<td>${row[c] || ''}</td>`).join('')}</tr>`
  ).join('\n');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${tableName} Dashboard</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <style>
    :root { --primary: #60a5fa; --bg-dark: #0f172a; --bg-card: #1e293b; --text-primary: #e2e8f0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: var(--bg-dark); color: var(--text-primary); padding: 20px; }
    .container { max-width: 1200px; margin: 0 auto; }
    h1 { color: var(--primary); }
    table { width: 100%; border-collapse: collapse; background: var(--bg-card); border-radius: 8px; overflow: hidden; }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #334155; }
    th { background: #1e293b; color: var(--primary); }
    tr:hover { background: #1e293b; }
  </style>
</head>
<body>
  <div class="container">
    <h1>${tableName}</h1>
    <p>${data.length} records</p>
    <table>
      <thead><tr>${headerRow}</tr></thead>
      <tbody>${dataRows}</tbody>
    </table>
  </div>
</body>
</html>`;
}