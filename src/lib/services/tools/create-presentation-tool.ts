import type { Tool } from '@/types/tools';

export const createPresentationTool: Tool = {
  name: 'create_presentation',
  description:
    'Create a new PowerPoint presentation with slides. Use when user wants to create a presentation, pitch deck, or slide show.',
  parameters: {
    title: { type: 'string', description: 'Title of the presentation', required: true },
    content: {
      type: 'string',
      description:
        'Slide content. Format: "Slide Title: bullet1, bullet2, bullet3" (one slide per line)',
      required: true,
    },
  },
  execute: async params => {
    try {
      const slides = params.content
        .split('\n')
        .filter((line: string) => line.trim())
        .map((line: string) => {
          const parts = line.split(':');
          const title = parts[0].trim();
          const bulletPoints =
            parts.length > 1
              ? parts[1]
                  .split(',')
                  .map((b: string) => b.trim())
                  .filter((b: string) => b)
              : [];
          return { title, bulletPoints };
        });

      const response = await fetch('/api/onlyoffice/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'createWithContent',
          data: {
            title: params.title,
            type: 'slide',
            slides: slides,
          },
        }),
      });

      if (response.ok) {
        const data = await response.json();
        return {
          success: true,
          data: {
            documentId: data.document.id,
            title: data.document.title,
            slideCount: slides.length,
            message: `Created presentation: ${data.document.title} with ${slides.length} slides. Open it at /onlyoffice`,
          },
        };
      }
      return { success: false, error: 'Failed to create presentation' };
    } catch (error) {
      return { success: false, error: 'Failed to create presentation' };
    }
  },
};
