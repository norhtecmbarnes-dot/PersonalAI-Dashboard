import { NextRequest, NextResponse } from 'next/server';
import { streamChatCompletion } from '@/lib/models/sdk.server';
import { memoryFileService } from '@/lib/services/memory-file';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // ONLYOFFICE AI Plugin sends these:
    // - messages: Array of {role: 'user'|'assistant'|'system', content: string}
    // - model: string (optional)
    // - temperature: number (optional)
    // - max_tokens: number (optional)
    // - stream: boolean (optional)
    
    const { messages, model, temperature, max_tokens, stream } = body;

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'messages array required' },
        { status: 400 }
      );
    }

    // Get memory context
    let memoryContext = '';
    try {
      memoryContext = memoryFileService.getSystemPrompt();
    } catch (e) {
      console.log('Memory not loaded, continuing without context');
    }

    // Build messages with context
    const systemMessage = {
      role: 'system' as const,
      content: `${memoryContext}\n\nYou are an AI assistant helping with document editing. Be helpful, concise, and provide text that can be directly inserted into documents.`
    };

    const allMessages = [systemMessage, ...messages];

    // Determine model
    const useModel = model || 'glm-4.7-flash';

    // Stream response for ONLYOFFICE
    if (stream) {
      const encoder = new TextEncoder();
      const responseStream = new ReadableStream({
        async start(controller) {
          try {
            const result = await streamChatCompletion({
              model: useModel,
              messages: allMessages,
              temperature: temperature || 0.7,
              maxTokens: max_tokens || 2000,
            });

            if ((result as any).stream) {
              const reader = (result as any).stream.getReader();
              const decoder = new TextDecoder();
              
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                
                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split('\n').filter(l => l.trim());
                
                for (const line of lines) {
                  try {
                    const parsed = JSON.parse(line);
                    if (parsed.message?.content) {
                      // ONLYOFFICE expects Server-Sent Events format
                      const sseData = JSON.stringify({ 
                        choices: [{ 
                          delta: { content: parsed.message.content },
                          finish_reason: parsed.done ? 'stop' : null
                        }] 
                      });
                      controller.enqueue(encoder.encode(`data: ${sseData}\n\n`));
                    }
                  } catch {
                    // Skip invalid JSON
                  }
                }
              }
            } else {
              const content = (result.message as any)?.content || String(result.message) || '';
              const sseData = JSON.stringify({
                choices: [{
                  delta: { content },
                  finish_reason: 'stop'
                }]
              });
              controller.enqueue(encoder.encode(`data: ${sseData}\n\n`));
            }
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
          'Access-Control-Allow-Origin': '*',
        }
      });
    }

    // Non-streaming response
    const result = await streamChatCompletion({
      model: useModel,
      messages: allMessages,
      temperature: temperature || 0.7,
      maxTokens: max_tokens || 2000,
    });

    const content = (result.message as any)?.content || String(result.message) || '';

    // ONLYOFFICE AI Plugin expects OpenAI-compatible format
    return NextResponse.json({
      id: `chatcmpl-${Date.now()}`,
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model: useModel,
      choices: [{
        index: 0,
        message: {
          role: 'assistant',
          content: content,
        },
        finish_reason: 'stop',
      }],
      usage: {
        prompt_tokens: 0,
        completion_tokens: 0,
        total_tokens: 0,
      }
    });
  } catch (error) {
    console.error('ONLYOFFICE AI proxy error:', error);
    return NextResponse.json(
      { error: 'AI request failed', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  // Return available models for ONLYOFFICE AI Plugin
  return NextResponse.json({
    object: 'list',
    data: [
      {
        id: 'glm-4.7-flash',
        object: 'model',
        created: Date.now(),
        owned_by: 'zhipu',
      },
      {
        id: 'glm-5:cloud',
        object: 'model',
        created: Date.now(),
        owned_by: 'zhipu',
      },
      {
        id: 'qwen2.5:14b',
        object: 'model',
        created: Date.now(),
        owned_by: 'ollama',
      },
      {
        id: 'qwen3.5:27b',
        object: 'model', 
        created: Date.now(),
        owned_by: 'ollama',
      },
    ]
  });
}