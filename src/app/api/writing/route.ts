import { NextRequest, NextResponse } from 'next/server';
import { chatCompletion } from '@/lib/models/sdk.server';
import { memoryFileService } from '@/lib/services/memory-file';

const EXPAND_PROMPT = `You are an expert writer. Expand on the following text, adding more detail, examples, and depth while maintaining the original voice and style. Make it approximately 2-3x longer while keeping it natural and engaging.

Original text:
"""
{text}
"""

Provide ONLY the expanded text, no explanations or meta-commentary.`;

const OUTLINE_PROMPT = `You are an expert at organizing information. Create a detailed outline from the following topic or content.

Topic/Content:
"""
{text}
"""

Create a hierarchical outline with:
- Main sections (Roman numerals: I, II, III)
- Subsections (letters: A, B, C)  
- Details (numbers: 1, 2, 3)
- Key points for each section

Format:
# {Title}

I. {Main Section}
   A. {Subsection}
      1. {Detail}
      2. {Detail}
   B. {Subsection}
II. {Main Section}
   ...

Provide ONLY the outline, no explanations.`;

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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, text, style, model, stream } = body;

    if (!text) {
      return NextResponse.json({ error: 'text required' }, { status: 400 });
    }

    if (!action) {
      return NextResponse.json({ error: 'action required' }, { status: 400 });
    }

    // Get memory context
    let memoryContext = '';
    try {
      memoryContext = memoryFileService.getSystemPrompt();
    } catch (e) {
      console.log('Memory not loaded');
    }

    // Build prompt based on action
    let prompt = '';
    switch (action) {
      case 'expand':
        prompt = EXPAND_PROMPT.replace('{text}', text);
        break;
      case 'outline':
        prompt = OUTLINE_PROMPT.replace('{text}', text);
        break;
      case 'continue':
        prompt = CONTINUE_PROMPT.replace('{text}', text);
        break;
      case 'rewrite':
        prompt = REWRITE_PROMPT.replace('{text}', text).replace('{style}', style || 'professional');
        break;
      case 'simplify':
        prompt = SIMPLIFY_PROMPT.replace('{text}', text);
        break;
      case 'elaborate':
        prompt = ELABORATE_PROMPT.replace('{text}', text);
        break;
      case 'structure':
        prompt = STRUCTURE_PROMPT.replace('{text}', text);
        break;
      default:
        return NextResponse.json({ error: 'Invalid action. Use: expand, outline, continue, rewrite, simplify, elaborate, structure' }, { status: 400 });
    }

    const systemMessage = {
      role: 'system' as const,
      content: memoryContext + '\n\nYou are a skilled writing assistant. Follow instructions precisely and provide only the requested output.'
    };

    // Use Kimi K2.5 by default - distilled from Claude, excellent for English writing via Ollama Cloud
    const useModel = model || 'kimi-k2.5';
    
    console.log('[Writing] Processing:', action, 'with model:', useModel);
    
    // Handle streaming
    if (stream) {
      const encoder = new TextEncoder();
      const responseStream = new ReadableStream({
        async start(controller) {
          try {
            const result = await chatCompletion({
              model: useModel,
              messages: [systemMessage, { role: 'user', content: prompt }],
              temperature: 0.7,
              maxTokens: 4000,
            });

            const content = result.message?.content || '';
            const sseData = JSON.stringify({
              choices: [{ delta: { content }, finish_reason: 'stop' }]
            });
            controller.enqueue(encoder.encode(`data: ${sseData}\n\n`));
          } catch (error) {
            console.error('Stream error:', error);
          } finally {
            controller.close();
          }
        }
      });

      return new Response(responseStream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        }
      });
    }

    // Non-streaming response
    const result = await chatCompletion({
      model: useModel,
      messages: [systemMessage, { role: 'user', content: prompt }],
      temperature: 0.7,
      maxTokens: 4000,
    });

    const content = result.message?.content || '';
    
    console.log('[Writing] Result length:', content.length, 'characters');

    return NextResponse.json({
      success: true,
      action,
      result: content,
      model: useModel,
    });
  } catch (error) {
    console.error('Writing assistant error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to process request', 
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    actions: [
      {
        name: 'expand',
        description: 'Expand text with more detail, examples, and depth (2-3x longer)',
        parameters: ['text'],
      },
      {
        name: 'outline',
        description: 'Create a detailed hierarchical outline from a topic or content',
        parameters: ['text'],
      },
      {
        name: 'continue',
        description: 'Continue writing from where the text ends',
        parameters: ['text'],
      },
      {
        name: 'rewrite',
        description: 'Rewrite text in a specified style',
        parameters: ['text', 'style (optional: professional, casual, academic, etc.)'],
      },
      {
        name: 'simplify',
        description: 'Simplify complex text for a general audience',
        parameters: ['text'],
      },
      {
        name: 'elaborate',
        description: 'Add comprehensive elaboration with examples and evidence',
        parameters: ['text'],
      },
      {
        name: 'structure',
        description: 'Organize content with headers, bullets, and sections',
        parameters: ['text'],
      },
    ],
    usage: 'POST with { action: "expand|outline|...", text: "your text", model: "optional", stream: false }',
  });
}