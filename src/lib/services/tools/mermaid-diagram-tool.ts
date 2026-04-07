import type { Tool } from '@/types/tools';

export const mermaidDiagramTool: Tool = {
  name: 'mermaid_diagram',
  description:
    'Create diagrams using Mermaid syntax. Supports flowcharts, sequence diagrams, class diagrams, state diagrams, Gantt charts, pie charts, and more. Returns HTML with embedded Mermaid diagram.',
  parameters: {
    type: {
      type: 'string',
      description:
        'Diagram type: "flowchart", "sequenceDiagram", "classDiagram", "stateDiagram", "gantt", "pie", "erDiagram", "journey"',
      required: true,
    },
    description: {
      type: 'string',
      description: 'Description of what the diagram should show',
      required: true,
    },
    title: {
      type: 'string',
      description: 'Optional title for the diagram',
      required: false,
    },
  },
  execute: async params => {
    try {
      const { chatCompletion } = await import('@/lib/models/sdk.server');

      const systemPrompt = `You are a Mermaid diagram expert. Generate valid Mermaid syntax based on the user's description.

Supported diagram types:
- flowchart: Flowcharts and process diagrams
- sequenceDiagram: Sequence and interaction diagrams
- classDiagram: Class and object diagrams
- stateDiagram: State machine diagrams
- gantt: Gantt charts and timelines
- pie: Pie charts
- erDiagram: Entity relationship diagrams
- journey: User journey diagrams

Rules:
- Return ONLY the Mermaid code (no markdown, no explanations)
- Use proper Mermaid syntax for the specified type
- Include meaningful labels and relationships
- Keep it clean and readable

The Mermaid code will be rendered in HTML with mermaid.js`;

      const result = await chatCompletion({
        model: 'glm-4-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Create a ${params.type}: ${params.description}` },
        ],
      });

      let mermaidCode = result.message?.content || '';

      // Clean up markdown formatting
      mermaidCode = mermaidCode
        .replace(/```mermaid/g, '')
        .replace(/```/g, '')
        .trim();

      // Generate HTML wrapper with Mermaid
      const title = params.title || 'Mermaid Diagram';
      const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      padding: 20px;
      background: #f8fafc;
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    h1 {
      color: #1e293b;
      margin-bottom: 20px;
    }
    .diagram-container {
      background: white;
      padding: 30px;
      border-radius: 8px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
      max-width: 100%;
      overflow: auto;
    }
  </style>
</head>
<body>
  <h1>${title}</h1>
  <div class="diagram-container">
    <div class="mermaid">
${mermaidCode}
    </div>
  </div>
  <script>
    mermaid.initialize({ 
      startOnLoad: true,
      theme: 'default',
      securityLevel: 'loose',
    });
  </script>
</body>
</html>`;

      return {
        success: true,
        data: {
          message: `Created ${params.type} diagram`,
          mermaidCode,
          html,
          previewUrl: 'data:text/html;charset=utf-8,' + encodeURIComponent(html),
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create Mermaid diagram',
      };
    }
  },
};
