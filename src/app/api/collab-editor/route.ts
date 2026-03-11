import { NextRequest, NextResponse } from 'next/server';
import { chatCompletion } from '@/lib/models/sdk.server';
import { sanitizePrompt } from '@/lib/utils/validation';
import type { TrackedChange, Comment } from '@/types/collab-editor';

function generateId(): string {
  return `change_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function generateCommentId(): string {
  return `comment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

async function generateAIEdit(
  action: string,
  text: string,
  context: {
    brandVoice?: string;
    projectFiles?: string[];
    researchHistory?: string[];
    documentType?: string;
    tone?: string;
    length?: string;
  } = {}
): Promise<{ changes: TrackedChange[]; comments: Comment[]; newText?: string }> {
  const actionPrompts: Record<string, string> = {
    fix_grammar: `Fix any grammar, spelling, punctuation, and style issues in the following text. Keep the same meaning and tone. Return ONLY the corrected text, no explanations.

Original text:
"""
${text}
"""`,

    expand: `Expand the following text to provide more detail, examples, and depth. Maintain the same tone and style. The expanded text should be 2-3 times longer. Return ONLY the expanded text.

Original text:
"""
${text}
"""

${context.brandVoice ? `Brand voice guidelines: ${context.brandVoice.slice(0, 500)}` : ''}`,

    simplify: `Simplify the following text to make it easier to understand. Use clearer language, shorter sentences, and remove unnecessary complexity. Return ONLY the simplified text.

Original text:
"""
${text}
"""`,

    rewrite: `Rewrite the following text to improve clarity, flow, and impact. Keep the same meaning but make it more engaging. Return ONLY the rewritten text.

Original text:
"""
${text}
"""

${context.brandVoice ? `Brand voice guidelines: ${context.brandVoice.slice(0, 500)}` : ''}`,

    suggest: `Review the following text and provide 2-3 specific suggestions for improvement. Focus on clarity, engagement, and effectiveness. Format each suggestion as a brief comment.

Text to review:
"""
${text}
"""`,

    generate: `Generate new content following the same style and tone as the example. The content should be original but consistent with the document's voice.

${text ? `Context/example:\n"""\n${text}\n"""` : 'Generate content about: ' + (context.documentType || 'general topic')}

${context.brandVoice ? `Brand voice guidelines: ${context.brandVoice.slice(0, 500)}` : ''}`,
  };

  const prompt = actionPrompts[action] || actionPrompts.rewrite;

  try {
    const response = await chatCompletion({
      messages: [{ role: 'user', content: sanitizePrompt(prompt, 4000) }],
      model: 'qwen3.5:9b',
      temperature: 0.3,
      maxTokens: 2000,
    });

    const aiResponse = response.message?.content || '';

    if (action === 'suggest') {
      const suggestions = aiResponse
        .split(/\n/)
        .filter((line: string) => line.trim())
        .slice(0, 3)
        .map((line: string) => line.replace(/^[-•*]\s*/, '').replace(/^\d+\.\s*/, ''));

      const comments: Comment[] = suggestions.map((text: string) => ({
        id: generateCommentId(),
        author: 'ai' as const,
        position: 0,
        positionEnd: text.length,
        text,
        timestamp: Date.now(),
        resolved: false,
        thread: [],
      }));

      return { changes: [], comments };
    }

    const changes: TrackedChange[] = [{
      id: generateId(),
      type: 'format',
      status: 'pending',
      author: 'ai',
      position: 0,
      positionEnd: text.length,
      originalText: text,
      newText: aiResponse,
      timestamp: Date.now(),
      metadata: {
        grammarFix: action === 'fix_grammar',
        expanded: action === 'expand',
        simplified: action === 'simplify',
        rephrased: action === 'rewrite',
      },
    }];

    return { changes, comments: [], newText: aiResponse };
  } catch (error) {
    console.error('[CollabEditor API] AI generation error:', error);
    throw error;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, documentId, selection, context, options } = body;

    if (!action) {
      return NextResponse.json(
        { success: false, error: 'Action is required' },
        { status: 400 }
      );
    }

    const validActions = ['fix_grammar', 'expand', 'simplify', 'rewrite', 'suggest', 'generate', 'comment'];
    if (!validActions.includes(action)) {
      return NextResponse.json(
        { success: false, error: `Invalid action. Must be one of: ${validActions.join(', ')}` },
        { status: 400 }
      );
    }

    const textToProcess = selection?.text || '';

    if (action !== 'generate' && !textToProcess) {
      return NextResponse.json(
        { success: false, error: 'Selection is required for this action' },
        { status: 400 }
      );
    }

    const brandVoice = context?.brandVoice || undefined;
    const projectFiles = context?.projectFiles || [];
    const researchHistory = context?.researchHistory || [];
    const documentType = context?.documentType || 'general';

    const result = await generateAIEdit(action, textToProcess, {
      brandVoice,
      projectFiles,
      researchHistory,
      documentType,
      tone: options?.tone,
      length: options?.length,
    });

    return NextResponse.json({
      success: true,
      changes: result.changes,
      comments: result.comments,
      newText: result.newText,
      documentId,
      selection,
    });
  } catch (error) {
    console.error('[CollabEditor API] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  if (action === 'capabilities') {
    return NextResponse.json({
      success: true,
      actions: [
        { id: 'fix_grammar', label: 'Fix Grammar', description: 'Correct grammar, spelling, and punctuation' },
        { id: 'expand', label: 'Expand', description: 'Add more detail and depth to the text' },
        { id: 'simplify', label: 'Simplify', description: 'Make the text clearer and easier to understand' },
        { id: 'rewrite', label: 'Rewrite', description: 'Rephrase for better clarity and flow' },
        { id: 'suggest', label: 'Suggest', description: 'Get improvement suggestions as comments' },
        { id: 'generate', label: 'Generate', description: 'Create new content based on context' },
        { id: 'comment', label: 'Add Comment', description: 'Add an AI comment to selected text' },
      ],
    });
  }

  return NextResponse.json(
    { success: false, error: 'Invalid action. Use ?action=capabilities' },
    { status: 400 }
  );
}