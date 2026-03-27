import { NextRequest, NextResponse } from 'next/server';
import { chatCompletion } from '@/lib/models/sdk.server';
import { sanitizePrompt } from '@/lib/utils/validation';
import { bookWriterService } from '@/lib/agent/book-writer';
import { deaiify, analyzeText } from '@/lib/writing/de-ai-ify';

export interface ReviewChange {
  id: string;
  type: 'insert' | 'delete' | 'format';
  status: 'pending' | 'accepted' | 'rejected';
  author: 'ai' | 'user';
  authorColor: string;
  position: number;
  positionEnd: number;
  originalText: string;
  newText: string;
  timestamp: number;
  reason: string;
}

export interface ReviewComment {
  id: string;
  author: 'ai' | 'user';
  authorColor: string;
  position: number;
  text: string;
  timestamp: number;
  resolved: boolean;
  thread: { id: string; author: string; text: string; timestamp: number }[];
}

const REVIEWER_COLORS: Record<string, string> = {
  ai: '#9333ea',
  user: '#3b82f6',
  reviewer1: '#10b981',
  reviewer2: '#f59e0b',
  reviewer3: '#ef4444',
};

async function analyzeWithTracking(
  original: string,
  revised: string,
  action: string,
  context: { brandVoice?: string; documentType?: string }
): Promise<ReviewChange> {
  const reasonPrompt = `Explain this edit in ONE concise sentence (max 15 words).

Action: ${action}
Original: "${original.slice(0, 100)}${original.length > 100 ? '...' : ''}"
Revised: "${revised.slice(0, 100)}${revised.length > 100 ? '...' : ''}"

Response (one sentence only):`;

  try {
    const reasonResponse = await chatCompletion({
      messages: [{ role: 'user', content: sanitizePrompt(reasonPrompt, 500) }],
      model: 'llama3.2:latest',
      temperature: 0.2,
      maxTokens: 50,
    });

    const reason = reasonResponse.message?.content?.trim() || `Applied ${action.replace('_', ' ')}`;

    return {
      id: `change_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'format',
      status: 'pending',
      author: 'ai',
      authorColor: REVIEWER_COLORS.ai,
      position: 0,
      positionEnd: original.length,
      originalText: original,
      newText: revised,
      timestamp: Date.now(),
      reason,
    };
  } catch {
    return {
      id: `change_${Date.now()}`,
      type: 'format',
      status: 'pending',
      author: 'ai',
      authorColor: REVIEWER_COLORS.ai,
      position: 0,
      positionEnd: original.length,
      originalText: original,
      newText: revised,
      timestamp: Date.now(),
      reason: `Applied ${action.replace('_', ' ')}`,
    };
  }
}

async function chatWithEditor(
  message: string,
  selectedText: string,
  documentContent: string,
  context: { brandVoice?: string; documentType?: string }
): Promise<string> {
  const prompt = `You are an intelligent writing assistant embedded in a document editor. The user is asking about their document.

Selected text: "${selectedText.slice(0, 500)}${selectedText.length > 500 ? '...' : ''}"

Document context: "${documentContent.slice(0, 1000)}${documentContent.length > 1000 ? '...' : ''}"
${context.brandVoice ? `Brand voice: ${context.brandVoice}` : ''}

User question: ${message}

Provide a helpful, concise response. You can:
- Explain writing issues
- Suggest improvements
- Answer questions about the content
- Offer to make changes (but don't make them automatically - wait for user to accept)

Response:`;

  try {
    const response = await chatCompletion({
      messages: [{ role: 'user', content: sanitizePrompt(prompt, 3000) }],
      model: 'qwen3.5:9b',
      temperature: 0.7,
      maxTokens: 500,
    });
    return (
      response.message?.content || 'I apologize, I encountered an error processing your request.'
    );
  } catch {
    return 'I apologize, I encountered an error processing your request.';
  }
}

async function humanizeWithTracking(
  text: string
): Promise<{ changes: ReviewChange[]; humanizedText: string }> {
  const deaiResult = deaiify(text, 'strict');

  const change: ReviewChange = {
    id: `humanize_${Date.now()}`,
    type: 'format',
    status: 'pending',
    author: 'ai',
    authorColor: REVIEWER_COLORS.ai,
    position: 0,
    positionEnd: text.length,
    originalText: text,
    newText: deaiResult.revisedText,
    timestamp: Date.now(),
    reason: `Removed ${deaiResult.changes.transitionsRemoved + deaiResult.changes.clichesRemoved} AI patterns, improved human score from ${deaiResult.originalScore} to ${deaiResult.revisedScore}/10`,
  };

  return { changes: [change], humanizedText: deaiResult.revisedText };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, selection, documentContent, message, brandVoice, documentType } = body;

    switch (action) {
      case 'analyze': {
        if (!selection?.text) {
          return NextResponse.json({ error: 'Selection required' }, { status: 400 });
        }

        const change = await analyzeWithTracking(
          selection.text,
          selection.revisedText || selection.text,
          selection.action || 'review',
          { brandVoice, documentType }
        );

        return NextResponse.json({ success: true, change });
      }

      case 'humanize': {
        if (!selection?.text) {
          return NextResponse.json({ error: 'Selection required' }, { status: 400 });
        }

        const result = await humanizeWithTracking(selection.text);
        return NextResponse.json({
          success: true,
          changes: result.changes,
          humanizedText: result.humanizedText,
        });
      }

      case 'chat': {
        if (!message) {
          return NextResponse.json({ error: 'Message required' }, { status: 400 });
        }

        const response = await chatWithEditor(
          message,
          selection?.text || '',
          documentContent || '',
          { brandVoice, documentType }
        );

        return NextResponse.json({ success: true, message: response });
      }

      case 'grammar': {
        if (!selection?.text) {
          return NextResponse.json({ error: 'Selection required' }, { status: 400 });
        }

        const grammarPrompt = `Fix grammar, spelling, and punctuation in this text. Return ONLY corrected text:

"""
${selection.text}
"""`;

        const response = await chatCompletion({
          messages: [{ role: 'user', content: sanitizePrompt(grammarPrompt, 2000) }],
          model: 'qwen3.5:9b',
          temperature: 0.3,
          maxTokens: 1000,
        });

        const corrected = response.message?.content || selection.text;
        const change = await analyzeWithTracking(selection.text, corrected, 'fix_grammar', {
          brandVoice,
          documentType,
        });

        return NextResponse.json({ success: true, change, correctedText: corrected });
      }

      case 'book-chapter': {
        if (!documentContent || !documentType || documentType !== 'book') {
          return NextResponse.json({ error: 'Book content required' }, { status: 400 });
        }

        const progress = bookWriterService.getProgress();
        if (!progress) {
          return NextResponse.json({ error: 'No book in progress' }, { status: 400 });
        }

        const nextChapter = progress.currentChapter;
        const chapter = await bookWriterService.writeChapter(nextChapter);

        if (chapter) {
          const change: ReviewChange = {
            id: `book_chapter_${nextChapter}`,
            type: 'insert',
            status: 'pending',
            author: 'ai',
            authorColor: REVIEWER_COLORS.ai,
            position: documentContent.length,
            positionEnd: documentContent.length + chapter.content.length,
            originalText: '',
            newText: `# Chapter ${chapter.number}: ${chapter.title}\n\n${chapter.content}`,
            timestamp: Date.now(),
            reason: `Generated Chapter ${nextChapter}: ${chapter.title}`,
          };

          return NextResponse.json({
            success: true,
            change,
            chapterNumber: nextChapter,
            chapterTitle: chapter.title,
          });
        }

        return NextResponse.json({ error: 'Failed to generate chapter' }, { status: 500 });
      }

      case 'finalize': {
        const bookContent = documentContent;
        const filename = `book-chapter-${Date.now()}.md`;
        const commitMessage = `Add new chapter: ${body.chapterTitle || 'Generated content'}`;

        return NextResponse.json({
          success: true,
          filename,
          commitMessage,
          content: bookContent,
          timestamp: Date.now(),
        });
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('[Editor Review API] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    actions: ['analyze', 'humanize', 'chat', 'grammar', 'book-chapter', 'finalize'],
    reviewerColors: REVIEWER_COLORS,
  });
}
