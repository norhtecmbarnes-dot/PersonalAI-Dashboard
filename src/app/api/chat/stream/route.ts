export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { streamChatCompletion } from '@/lib/models/sdk.server';
import { validateString, sanitizeString, validateArray, sanitizeObject } from '@/lib/utils/validation';
import { ollamaWebSearch } from '@/lib/browser/web-search-tool';
import { memoryFileService } from '@/lib/services/memory-file';
import { sqlDatabase } from '@/lib/database/sqlite';

const MAX_MESSAGE_LENGTH = 10000;
const MAX_HISTORY_LENGTH = 100;

async function getDocumentContext(): Promise<string> {
  try {
    await sqlDatabase.initialize();
    const docs = sqlDatabase.getDocuments();
    
    if (!docs || docs.length === 0) {
      return '';
    }
    
    // Get last 5 documents as context
    const recentDocs = docs.slice(0, 5);
    const docContext = recentDocs.map((doc: any) => {
      const content = doc.content?.slice(0, 500) || '';
      return `- **${doc.title}** (${doc.type || 'text'}): ${content}${doc.content?.length > 500 ? '...' : ''}`;
    }).join('\n');
    
    return `\n\n### Available Documents\nYou have access to these documents in your database:\n${docContext}\n\nWhen the user asks about documents, reference these by title. You can search through them.`;
  } catch (error) {
    console.error('[Chat] Error loading documents:', error);
    return '';
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const messageValidation = validateString(body.message, 'message', { 
      maxLength: MAX_MESSAGE_LENGTH,
      required: true 
    });
    if (!messageValidation.valid) {
      return new Response(JSON.stringify({ error: messageValidation.error }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const modelValidation = validateString(body.model, 'model', { required: true });
    if (!modelValidation.valid) {
      return new Response(JSON.stringify({ error: modelValidation.error }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const historyValidation = validateArray(body.conversationHistory, 'conversationHistory', { 
      maxLength: MAX_HISTORY_LENGTH 
    });
    if (!historyValidation.valid) {
      return new Response(JSON.stringify({ error: historyValidation.error }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const message = sanitizeString(body.message);
    const model = sanitizeString(body.model);
    const conversationHistory = sanitizeObject(body.conversationHistory || []);
    const isSearchMode = body.searchMode === true;

    // Load MEMORY.md context
    let memoryContext = '';
    try {
      const memoryPrompt = memoryFileService.getSystemPrompt();
      memoryContext = `\n\n--- MEMORY CONTEXT ---\n${memoryPrompt}\n\n`;
    } catch (memError) {
      console.error('[Chat] Memory load error:', memError);
    }
    
    // Load document context
    const documentContext = await getDocumentContext();

    // Build messages array
    const messages: Array<{role: 'system' | 'user' | 'assistant'; content: string}> = [];
    
    // Set up system prompt based on search mode
    let systemPrompt = memoryContext;
    
    if (isSearchMode) {
      systemPrompt += `You are a helpful AI assistant with web search capabilities. 

CRITICAL INSTRUCTIONS:
- When search results are provided below, you MUST use them to answer accurately
- DO NOT make up information - only use facts from the search results
- Cite sources using [Source: URL] format
- If results don't contain the answer, say "Based on the search results, I don't have specific information about that" and acknowledge the limitation
- Be factual and precise`;
    } else {
      systemPrompt += `You are a helpful AI assistant. Be concise and helpful.`;
    }
    
    // Add document context
    if (documentContext) {
      systemPrompt += documentContext;
    }
    
    messages.push({ role: 'system', content: systemPrompt });
    
    // Add conversation history
    for (const msg of (conversationHistory as any[])) {
      messages.push({ role: msg.role, content: msg.content });
    }
    
    // Handle search mode
    let userMessage = message;
    
    if (isSearchMode) {
      try {
        console.log('[Chat] Performing web search for:', message);
        const searchResponse = await ollamaWebSearch(message, { maxResults: 5 });
        
        if (searchResponse.results && searchResponse.results.length > 0) {
          console.log('[Chat] Found', searchResponse.results.length, 'search results');
          
          const searchContext = `\n\n=== WEB SEARCH RESULTS ===\n\n` +
            searchResponse.results.slice(0, 5).map((r: any, i: number) => 
              `**Source ${i + 1}: ${r.title}**\nURL: ${r.url}\n${r.snippet || ''}\n`
            ).join('\n---\n') +
            `\n\n=== END OF SEARCH RESULTS ===\n\nUsing ONLY the information above, answer: "${message}"`;
          
          userMessage = searchContext;
        } else {
          userMessage = `${message}\n\n(Note: Web search returned no results. Answer with what you know and acknowledge this limitation.)`;
        }
      } catch (searchError) {
        console.error('[Chat] Search error:', searchError);
        userMessage = `${message}\n\n(Note: Web search failed. Answer with what you know and acknowledge this limitation.)`;
      }
    }
    
    messages.push({ role: 'user', content: userMessage });

    // Create a TransformStream for streaming
    const encoder = new TextEncoder();
    const stream = new TransformStream();
    const writer = stream.writable.getWriter();

    // Start streaming in background
    (async () => {
      try {
        // Use fast model - prefer qwen3.5:9b
        const fastModel = model && model.includes('qwen') ? model : 'ollama/qwen3.5:9b';
        const result = await streamChatCompletion({
          model: fastModel,
          messages,
        });

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
                  await writer.write(encoder.encode(`data: ${JSON.stringify({ chunk: parsed.message.content, done: false })}\n\n`));
                }
                if (parsed.done) {
                  await writer.write(encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`));
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
            await writer.write(encoder.encode(`data: ${JSON.stringify({ chunk, done: false })}\n\n`));
          }

          // Send completion signal
          await writer.write(encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`));
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        await writer.write(encoder.encode(`data: ${JSON.stringify({ error: errorMessage, done: true })}\n\n`));
      } finally {
        await writer.close();
      }
    })();

    return new Response(stream.readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Stream error:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to process request',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}