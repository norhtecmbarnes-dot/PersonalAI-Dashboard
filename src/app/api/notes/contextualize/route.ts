import { NextResponse } from 'next/server';
import { validateString, validateArray, sanitizeString } from '@/lib/utils/validation';
import { streamChatCompletion } from '@/lib/models/sdk.server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, content, existingTags = [] } = body;

    // Validate title
    const titleValidation = validateString(title, 'title', {
      minLength: 1,
      maxLength: 500,
      required: true
    });
    if (!titleValidation.valid) {
      return NextResponse.json(
        { error: titleValidation.error },
        { status: 400 }
      );
    }

    // Validate content
    const contentValidation = validateString(content, 'content', {
      minLength: 1,
      maxLength: 100000,
      required: true
    });
    if (!contentValidation.valid) {
      return NextResponse.json(
        { error: contentValidation.error },
        { status: 400 }
      );
    }

    // Validate existingTags
    const tagsValidation = validateArray(existingTags, 'existingTags', {
      maxLength: 100
    });
    if (!tagsValidation.valid) {
      return NextResponse.json(
        { error: tagsValidation.error },
        { status: 400 }
      );
    }

    // Sanitize inputs
    const sanitizedTitle = sanitizeString(title);
    const sanitizedContent = sanitizeString(content);
    const sanitizedTags = existingTags.map((tag: string) => sanitizeString(tag));

    const prompt = `Analyze the following note and provide contextual information:

Title: ${sanitizedTitle}
Content: ${sanitizedContent}
Existing Tags: ${sanitizedTags.join(', ')}

Analyze and return a JSON object with:
{
  "title": "refined title (or same if good)",
  "category": "one of: general, meeting, research, idea, project, personal, work",
  "tags": ["relevant", "tags", "derived", "from", "content"],
  "linkedContacts": ["any names that appear to be people"],
  "summary": "2-3 sentence summary of the content"
}

Return ONLY valid JSON, no other text.`;

    try {
      const result = await streamChatCompletion({
        model: 'ollama/qwen2.5:14b',
        messages: [{ role: 'user', content: prompt }],
      });

      const responseContent = result.message?.content || String(result.message) || '';
      const match = responseContent.match(/\{[\s\S]*\}/);
      
      if (match) {
        const contextualized = JSON.parse(match[0]);
        return NextResponse.json({
          note: {
            title: sanitizeString(contextualized.title || sanitizedTitle),
            content: sanitizedContent,
            category: contextualized.category || 'general',
            tags: Array.from(new Set([...sanitizedTags, ...(contextualized.tags || []).map((tag: string) => sanitizeString(tag))])),
            linkedContacts: (contextualized.linkedContacts || []).map((c: string) => sanitizeString(c)),
            summary: contextualized.summary || sanitizedContent.substring(0, 200),
          },
        });
      }
    } catch (error) {
      console.error('LLM contextualization error:', error);
    }

    return NextResponse.json({
      note: {
        title: sanitizedTitle,
        content: sanitizedContent,
        category: 'general',
        tags: sanitizedTags,
        linkedContacts: [],
        summary: sanitizedContent.substring(0, 200),
      },
    });
  } catch (error) {
    console.error('Contextualize error:', error);
    return NextResponse.json({ error: 'Failed to contextualize note' }, { status: 500 });
  }
}
