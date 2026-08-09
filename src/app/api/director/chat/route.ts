export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { streamChatCompletion } from '@/lib/models/sdk.server';
import { sanitizeString, validateString } from '@/lib/utils/validation';
import { buildAuteurSystemPrompt, parseAuteurResponse, parseAuteurAction } from '@/lib/director/auteur';

const MAX_MESSAGE_LENGTH = 8000;
const MAX_HISTORY = 20;

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const msgVal = validateString(body.message, 'message', {
      maxLength: MAX_MESSAGE_LENGTH,
      required: true,
    });
    if (!msgVal.valid) {
      return new Response(JSON.stringify({ error: msgVal.error }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const modelVal = validateString(body.model, 'model', { required: true });
    if (!modelVal.valid) {
      return new Response(JSON.stringify({ error: modelVal.error }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const message = sanitizeString(body.message);
    const model = sanitizeString(body.model);
    const history: ChatMessage[] = Array.isArray(body.history) ? body.history.slice(-MAX_HISTORY) : [];

    const systemPrompt = buildAuteurSystemPrompt();
    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...history.map(m => ({ role: m.role, content: m.content })),
      { role: 'user', content: message },
    ];

    const encoder = new TextEncoder();
    const stream = new TransformStream();
    const writer = stream.writable.getWriter();
    const send = (obj: unknown) =>
      writer.write(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));

    (async () => {
      let full = '';
      try {
        const result: any = await streamChatCompletion({ model, messages, temperature: 0.85 });

        if (result.stream) {
          const reader = result.stream.getReader();
          const decoder = new TextDecoder();
          const timeout = setTimeout(() => reader.cancel(), 180000);
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              const chunk = decoder.decode(value, { stream: true });
              for (const line of chunk.split('\n')) {
                if (!line.trim()) continue;
                try {
                  const parsed = JSON.parse(line);
                  const text = parsed.message?.content || '';
                  if (text) {
                    full += text;
                    await send({ chunk: text });
                  }
                  if (parsed.done) {
                    break;
                  }
                } catch {
                  // skip non-JSON line
                }
              }
            }
          } finally {
            clearTimeout(timeout);
          }
        } else {
          const text = result.message?.content || '';
          full = text;
          await send({ chunk: text });
        }

        const parsed = parseAuteurResponse(full);
        const action = parseAuteurAction(full);
        await send({
          done: true,
          action,
          shot: parsed.shot,
          shots: parsed.scriptParsed?.shots || null,
          sceneHeading: parsed.scriptParsed?.sceneHeading || null,
          narrativeContext: parsed.scriptParsed?.narrativeContext || null,
          sceneContext: parsed.sceneContext,
          script: parsed.script,
        });
      } catch (err) {
        await send({ error: err instanceof Error ? err.message : 'Auteur stream failed' });
      } finally {
        try {
          await writer.close();
        } catch {
          // already closed
        }
      }
    })();

    return new Response(stream.readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'director chat failed' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}