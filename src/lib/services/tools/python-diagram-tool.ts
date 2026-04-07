import type { Tool } from '@/types/tools';

export const pythonDiagramTool: Tool = {
  name: 'python_diagram',
  description:
    'Create diagrams and visualizations using Python with matplotlib, networkx, seaborn, or plotly. Executes code and returns actual visualization images.',
  parameters: {
    type: {
      type: 'string',
      description:
        'Visualization type: "network", "bar_chart", "line_chart", "scatter", "heatmap", "pie_chart", "histogram", "3d_plot"',
      required: true,
    },
    description: {
      type: 'string',
      description: 'Description of data to visualize',
      required: true,
    },
    data: {
      type: 'string',
      description: 'Optional data in CSV or JSON format',
      required: false,
    },
    title: {
      type: 'string',
      description: 'Chart title',
      required: false,
    },
  },
  execute: async params => {
    try {
      const { chatCompletion } = await import('@/lib/models/sdk.server');

      const systemPrompt = `You are a Python data visualization expert. Generate complete Python code that creates visualizations using matplotlib, networkx, seaborn, or plotly.

Rules:
- Return ONLY Python code (no markdown, no explanations)
- Include all imports
- Generate sample data if none provided
- Make it visually appealing with proper labels, colors, and styling
- Code will be executed and the image returned
- Use matplotlib.pyplot.savefig() to save plots

Libraries available:
- matplotlib: General plotting
- networkx: Network/graph diagrams
- seaborn: Statistical visualizations
- pandas: Data manipulation
- numpy: Numerical operations`;

      const dataText = params.data ? `\n\nUse this data:\n${params.data}` : '';

      const result = await chatCompletion({
        model: 'glm-4-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: `Create a ${params.type} visualization: ${params.description}${dataText}`,
          },
        ],
      });

      let pythonCode = result.message?.content || '';

      // Clean up markdown formatting
      pythonCode = pythonCode
        .replace(/```python/g, '')
        .replace(/```/g, '')
        .trim();

      // Execute Python code via API
      let imageUrl: string | undefined;
      let executionOutput: string | undefined;

      try {
        const baseUrl =
          typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
        const execResponse = await fetch(`${baseUrl}/api/python/execute`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code: pythonCode,
            libraries: ['matplotlib', 'networkx', 'pandas', 'numpy', 'seaborn'],
            saveImage: true,
          }),
        });

        if (execResponse.ok) {
          const execResult = await execResponse.json();
          if (execResult.success) {
            imageUrl = execResult.imageUrl;
            executionOutput = execResult.output;
          }
        }
      } catch (e) {
        console.log('[PythonDiagram] Execution failed, showing code only:', e);
      }

      // Generate HTML wrapper
      const title = params.title || 'Python Visualization';

      const html = imageUrl
        ? `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      padding: 20px;
      background: #f8fafc;
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    h1 { color: #1e293b; margin-bottom: 20px; }
    .visualization {
      background: white;
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
      max-width: 100%;
    }
    img { max-width: 100%; height: auto; }
  </style>
</head>
<body>
  <h1>${title}</h1>
  <div class="visualization">
    <img src="${imageUrl}" alt="Python Visualization" />
  </div>
</body>
</html>`
        : `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/themes/prism-tomorrow.min.css">
  <style>
    body { font-family: sans-serif; padding: 20px; background: #f8fafc; }
    .container { max-width: 1200px; margin: 0 auto; }
    h1 { color: #1e293b; }
    .code-section { background: #1e293b; padding: 20px; border-radius: 8px; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <h1>${title}</h1>
    <div class="code-section">
      <pre><code class="language-python">${pythonCode.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code></pre>
    </div>
    <p>Python execution unavailable. Copy and run the code above.</p>
  </div>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/prism.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-python.min.js"></script>
</body>
</html>`;

      return {
        success: true,
        data: {
          message: `Created ${params.type} visualization`,
          pythonCode,
          html,
          previewUrl: 'data:text/html;charset=utf-8,' + encodeURIComponent(html),
          imageUrl,
          executed: !!imageUrl,
          output: executionOutput,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create Python diagram',
      };
    }
  },
};
