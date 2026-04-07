import type { Tool } from '@/types/tools';

export const canvasCreateTool: Tool = {
  name: 'canvas_create',
  description:
    'Create a visual webpage, dashboard, or app using AI. Generates complete HTML/CSS/JS code with live preview. Use when user wants to build a webpage, landing page, dashboard, or web application.',
  parameters: {
    type: {
      type: 'string',
      description: 'Type: "webpage", "dashboard", or "app"',
      required: true,
    },
    description: {
      type: 'string',
      description: 'Detailed description of what to create',
      required: true,
    },
    features: {
      type: 'string',
      description: 'Key features to include (optional)',
      required: false,
    },
  },
  execute: async params => {
    try {
      const { chatCompletion } = await import('@/lib/models/sdk.server');

      const systemPrompt = `You are an expert frontend developer. Generate complete, working HTML/CSS/JavaScript code.

Rules:
- Return ONLY valid HTML (no markdown, no explanations)
- Include all CSS in <style> tags
- Include all JavaScript in <script> tags
- Make it modern, responsive, and visually appealing
- Use Tailwind CSS via CDN
- Ensure full functionality
- Code will be rendered in an iframe - must be self-contained`;

      const typePrompt =
        params.type === 'webpage'
          ? 'Create a beautiful webpage'
          : params.type === 'dashboard'
            ? 'Create an interactive dashboard with charts and widgets'
            : 'Create a functional web application';

      const featuresText = params.features ? ` Include these features: ${params.features}` : '';

      const result = await chatCompletion({
        model: 'glm-4-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `${typePrompt}: ${params.description}${featuresText}` },
        ],
      });

      let code = result.message?.content || '';

      // Extract code from markdown if present
      const codeMatch = code.match(/```html([\s\S]*?)```/);
      if (codeMatch) {
        code = codeMatch[1];
      } else {
        code = code.replace(/```[\s\S]*?```/g, '').trim();
      }

      // Save to Canvas projects
      const project = {
        id: Date.now().toString(),
        name: params.description.slice(0, 30) + '...',
        type: params.type,
        code,
        preview: 'data:text/html;charset=utf-8,' + encodeURIComponent(code),
        lastModified: Date.now(),
        createdAt: Date.now(),
      };

      // Save to localStorage (client-side will handle this)
      try {
        const savedProjects =
          typeof window !== 'undefined' ? localStorage.getItem('canvas-projects') : null;
        const projects = savedProjects ? JSON.parse(savedProjects) : [];
        projects.unshift(project);

        if (typeof window !== 'undefined') {
          localStorage.setItem('canvas-projects', JSON.stringify(projects));
        }
      } catch (e) {
        console.log('[Canvas] Could not save to localStorage:', e);
      }

      return {
        success: true,
        data: {
          message: `Created ${params.type} "${project.name}"`,
          projectId: project.id,
          code: code.substring(0, 500) + (code.length > 500 ? '...' : ''),
          viewUrl: `/canvas?project=${project.id}`,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create canvas project',
      };
    }
  },
};
