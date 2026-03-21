export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { streamChatCompletion } from '@/lib/models/sdk.server';
import { memoryFileService } from '@/lib/services/memory-file';
import { brandWorkspace } from '@/lib/services/brand-workspace';
import { sanitizePrompt } from '@/lib/utils/validation';

const EXPAND_PROMPT = `You are an expert writer. Expand on the following text, adding more detail, examples, and depth while maintaining the original voice and style. Make it approximately 2-3x longer while keeping it natural and engaging.

Original text:
"""
{text}
"""

Provide ONLY the expanded text, no explanations or meta-commentary.`;

const OUTLINE_PROMPT = `You are an expert at organizing information. Create a detailed, comprehensive outline from the following topic or content.

Topic/Content:
"""
{text}
"""

Create a hierarchical outline with the following structure:

# {Title}

## I. {Main Section}
### A. {Subsection}
#### 1. {Detail/Point}
   - Supporting evidence or example
   - Additional context
#### 2. {Detail/Point}
   - Supporting evidence or example
### B. {Subsection}
   (Continue pattern...)

## II. {Next Main Section}
   (Continue pattern...)

Requirements:
- Use Markdown formatting with # for main title, ## for sections, ### for subsections
- Include at least 3-5 main sections
- Each section should have 2-4 subsections
- Each subsection should have 2-3 detailed points
- Add bullet points for supporting details
- Ensure logical flow and progression
- Make it comprehensive enough to guide full content creation

Provide ONLY the outline, no explanations or meta-commentary.`;

const CONTINUE_PROMPT = `You are an expert writer. Continue the following text naturally, maintaining the same style, tone, and context. Write approximately the same length as the original.

Text to continue:
"""
{text}
"""

Provide ONLY the continuation, no explanations or meta-commentary.`;

const REWRITE_PROMPT = `You are an expert editor. Rewrite the following text in the specified style while keeping the same meaning and information.

Original text:
"""
{text}
"""

Style: {style}

Provide ONLY the rewritten text, no explanations.`;

const SIMPLIFY_PROMPT = `You are an expert at making complex topics easy to understand. Simplify the following text for a general audience while keeping the key information.

Original text:
"""
{text}
"""

Provide ONLY the simplified text, no explanations.`;

const ELABORATE_PROMPT = `You are an expert at adding depth and detail. Add comprehensive elaboration to the following points, including examples, evidence, and explanations.

Points to elaborate:
"""
{text}
"""

Provide ONLY the elaborated content, no explanations.`;

const STRUCTURE_PROMPT = `You are an expert at organizing content. Structure the following information into a clear, logical format with headers, bullet points, and sections.

Content:
"""
{text}
"""

Provide ONLY the structured content, no explanations.`;

const HUMANIZE_PROMPT = `You are an expert at making AI text sound human-written. Rewrite the following text to add perplexity and burstiness - varying sentence length, adding natural transitions, removing AI patterns, and making it sound like a real person wrote it.

Original text:
"""
{text}
"""

Provide ONLY the humanized text, no explanations.`;

const GRAMMAR_PROMPT = `You are an expert editor. Improve the grammar, spelling, punctuation, and flow of the following text while maintaining its meaning and style.

Text to improve:
"""
{text}
"""

Provide ONLY the improved text, no explanations.`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, text, style, brandId, projectId, model } = body;

    if (!text) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    const sanitizedText = sanitizePrompt(text);
    const sanitizedStyle = style ? sanitizePrompt(style) : 'professional';

    let memoryContext = '';
    try {
      memoryContext = memoryFileService.getSystemPrompt().slice(0, 800);
    } catch (e) {}

    let brandContext = '';
    if (brandId) {
      try {
        const context = await brandWorkspace.buildContextForChat(brandId, projectId);
        brandContext = context.systemPrompt.slice(0, 2000);
      } catch (error) {
        console.error('Error building brand context:', error);
      }
    }

    // Model from request or fallback
    const selectedModel = model || 'ollama/qwen3.5:2b';

    let prompt = '';
    switch (action) {
      case 'expand':
        prompt = EXPAND_PROMPT.replace('{text}', sanitizedText);
        break;
      case 'outline':
        prompt = OUTLINE_PROMPT.replace('{text}', sanitizedText);
        break;
      case 'continue':
        prompt = CONTINUE_PROMPT.replace('{text}', sanitizedText);
        break;
      case 'rewrite':
        prompt = REWRITE_PROMPT.replace('{text}', sanitizedText).replace('{style}', sanitizedStyle);
        break;
      case 'simplify':
        prompt = SIMPLIFY_PROMPT.replace('{text}', sanitizedText);
        break;
      case 'elaborate':
        prompt = ELABORATE_PROMPT.replace('{text}', sanitizedText);
        break;
      case 'structure':
        prompt = STRUCTURE_PROMPT.replace('{text}', sanitizedText);
        break;
      case 'humanize':
        prompt = HUMANIZE_PROMPT.replace('{text}', sanitizedText);
        break;
      case 'grammar':
        prompt = GRAMMAR_PROMPT.replace('{text}', sanitizedText);
        break;
      default:
        prompt = EXPAND_PROMPT.replace('{text}', sanitizedText);
    }

    console.log('[Writing Stream] === Starting ===');
    console.log('[Writing Stream] Action:', action);
    console.log('[Writing Stream] Model:', selectedModel);
    console.log('[Writing Stream] Text length:', text.length);
    console.log('[Writing Stream] Prompt length:', prompt.length);
    console.log(
      '[Writing Stream] Ollama URL:',
      process.env.OLLAMA_HOST || 'http://localhost:11434'
    );

    // Add context if available
    if (memoryContext || brandContext) {
      prompt = `${memoryContext}\n\n${brandContext}\n\n${prompt}`;
    }

    // Use streaming
    try {
      console.log('[Writing Stream] Calling streamChatCompletion...');

      const result = await streamChatCompletion({
        model: selectedModel,
        messages: [{ role: 'user', content: prompt }],
      });

      // Create streaming response
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          try {
            // Check if we got a stream (Ollama) or a complete response (external APIs)
            if ((result as any).stream) {
              // Handle Ollama streaming response
              const reader = (result as any).stream.getReader();
              const decoder = new TextDecoder();

              while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split('\n').filter(line => line.trim());

                for (const line of lines) {
                  try {
                    const parsed = JSON.parse(line);
                    if (parsed.message?.content) {
                      const data = JSON.stringify({ content: parsed.message.content });
                      controller.enqueue(encoder.encode(`data: ${data}\n\n`));
                    }
                  } catch {
                    // Skip invalid JSON
                  }
                }
              }
            } else {
              // Handle complete response (non-streaming APIs like OpenRouter, GLM, DeepSeek)
              const msg = result.message as unknown as { content?: string };
              const content = msg?.content || String(result.message) || '';

              // Stream the content in chunks for a simulated streaming effect
              const chunkSize = 20;
              for (let i = 0; i < content.length; i += chunkSize) {
                const chunk = content.slice(i, i + chunkSize);
                const data = JSON.stringify({ content: chunk });
                controller.enqueue(encoder.encode(`data: ${data}\n\n`));
              }
            }

            controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
            controller.close();
          } catch (error) {
            console.error('[Writing Stream] Stream error:', error);
            controller.error(error);
          }
        },
      });

      return new NextResponse(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        },
      });
    } catch (error) {
      console.error('Writing stream error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return NextResponse.json(
        {
          error: 'Failed to generate content',
          details: errorMessage,
          suggestion: 'Make sure Ollama is running and the selected model is available',
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Writing stream error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        error: 'Failed to generate content',
        details: errorMessage,
        suggestion: 'Make sure Ollama is running and the selected model is available',
      },
      { status: 500 }
    );
  }
}
