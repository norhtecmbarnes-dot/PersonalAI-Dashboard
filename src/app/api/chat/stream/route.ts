export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { streamChatCompletion } from '@/lib/models/sdk.server';
import {
  validateString,
  sanitizeString,
  sanitizePrompt,
  validateArray,
  sanitizeObject,
} from '@/lib/utils/validation';
import { ollamaWebSearch } from '@/lib/browser/web-search-tool';
import { memoryFileService } from '@/lib/services/memory-file';
import { sqlDatabase } from '@/lib/database/sqlite';

const MAX_MESSAGE_LENGTH = 10000;
const MAX_HISTORY_LENGTH = 50;

let cachedDocumentContext: { data: string; timestamp: number } | null = null;
let cachedMemoryPrompt: { data: string; timestamp: number } | null = null;
const DOC_CACHE_TTL = 300000;
const MEMORY_CACHE_TTL = 300000;

async function getDocumentContext(): Promise<string> {
  if (cachedDocumentContext && Date.now() - cachedDocumentContext.timestamp < DOC_CACHE_TTL) {
    return cachedDocumentContext.data;
  }

  try {
    sqlDatabase.initialize();
    const docs = sqlDatabase.getNotes('document');

    if (!docs || docs.length === 0) {
      cachedDocumentContext = { data: '', timestamp: Date.now() };
      return '';
    }

    const docContext = docs
      .map((doc: any) => {
        const content = doc.content || '';
        return `## Document: ${doc.title}\nContent: ${content}\n`;
      })
      .join('\n\n');

    const result = `\n\n=== USER UPLOADED DOCUMENTS ===\n${docContext}\n=== END OF DOCUMENTS ===\n\n`;
    cachedDocumentContext = { data: result, timestamp: Date.now() };
    return result;
  } catch (error) {
    console.error('Error loading document context:', error);
    return '';
  }
}

async function getMemoryPrompt(): Promise<string> {
  if (cachedMemoryPrompt && Date.now() - cachedMemoryPrompt.timestamp < MEMORY_CACHE_TTL) {
    return cachedMemoryPrompt.data;
  }

  try {
    const memoryPrompt = memoryFileService.getSystemPrompt();
    const result = `\n\n--- MEMORY CONTEXT ---\n${memoryPrompt.slice(0, 2000)}\n\n`;
    cachedMemoryPrompt = { data: result, timestamp: Date.now() };
    return result;
  } catch (error) {
    console.error('Error loading memory prompt:', error);
    return '';
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const messageValidation = validateString(body.message, 'message', {
      maxLength: MAX_MESSAGE_LENGTH,
      required: true,
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
      maxLength: MAX_HISTORY_LENGTH,
    });
    if (!historyValidation.valid) {
      return new Response(JSON.stringify({ error: historyValidation.error }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const message = sanitizePrompt(sanitizeString(body.message));
    const model = sanitizeString(body.model);
    const conversationHistory = sanitizeObject(body.conversationHistory || []);
    const isSearchMode = body.searchMode === true;
    const media = body.media as { type: string; data: string; name: string } | undefined;

    const memoryContext = await getMemoryPrompt();

    const documentContext = await getDocumentContext();

    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [];

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
      systemPrompt += `You are an expert document analyst with deep reading comprehension skills.

CRITICAL INSTRUCTIONS FOR DOCUMENT ANALYSIS:
- You have FULL ACCESS to uploaded documents in the context below
- READ documents carefully and thoroughly before answering
- Provide DETAILED insights, not just summaries
- Cite specific sections when answering questions
- If asked about a document, reference it by title
- Extract key findings, methodology, conclusions, and implications
- Be precise and accurate - DO NOT hallucinate information
- When users ask questions, search the document content first
- Provide context-aware answers based on document content
- Highlight important passages and explain their significance

DOCUMENT READING MODE: ACTIVE
You are ready to analyze and discuss uploaded documents in detail.`;
    }

    if (documentContext) {
      systemPrompt += documentContext;
    }

    messages.push({ role: 'system', content: systemPrompt });

    const historyLimit = Math.min(conversationHistory.length, 10);
    for (
      let i = Math.max(0, conversationHistory.length - historyLimit);
      i < conversationHistory.length;
      i++
    ) {
      const msg = conversationHistory[i] as any;
      messages.push({ role: msg.role, content: msg.content });
    }

    let userMessage = message;

    // Disable search mode when media is attached - focus on analyzing the media
    const effectiveSearchMode = media && media.data ? false : isSearchMode;

    if (effectiveSearchMode) {
      try {
        console.log('[Chat] Performing web search for:', message);
        const searchResponse = await ollamaWebSearch(message, { maxResults: 5 });

        if (searchResponse.results && searchResponse.results.length > 0) {
          console.log('[Chat] Found', searchResponse.results.length, 'search results');

          const searchContext =
            `\n\n=== WEB SEARCH RESULTS ===\n\n` +
            searchResponse.results
              .slice(0, 5)
              .map(
                (r: any, i: number) =>
                  `**Source ${i + 1}: ${r.title}**\nURL: ${r.url}\n${r.snippet || ''}\n`
              )
              .join('\n---\n') +
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

    // Handle multimodal content (images, video, audio)
    if (media && media.data) {
      console.log('[Chat Stream] Processing media:', {
        type: media.type,
        name: media.name,
        dataSize: media.data.length,
        preview: media.data.substring(0, 50) + '...',
      });

      // Check if this is an Ollama model
      const isOllama =
        model.includes('ollama') ||
        !model.includes('/') ||
        model.includes('gemma4') ||
        model.includes('gemma-4');

      // Check if model supports vision
      const ollamaVisionModels = [
        'llava',
        'moondream',
        'bakllava',
        'cogvlm',
        'vision',
        'gemma4',
        'gemma-4',
        'gemma',
      ];
      const externalVisionModels = ['gpt-4o', 'gpt-4-vision', 'gpt-4-turbo', 'claude-3', 'gemini'];

      const isOllamaVision =
        isOllama && ollamaVisionModels.some(vm => model.toLowerCase().includes(vm));
      const isExternalVision =
        !isOllama && externalVisionModels.some(vm => model.toLowerCase().includes(vm));

      console.log('[Chat Stream] Vision detection:', {
        model,
        isOllama,
        isOllamaVision,
        isExternalVision,
        mediaType: media.type,
        searchMode: effectiveSearchMode,
      });

      // If search mode is on AND there's media, warn that search might interfere
      if (effectiveSearchMode && media.type === 'image') {
        console.log(
          '[Chat Stream] WARNING: Search mode is ON with image - search results may override image analysis'
        );
      }

      if (media.type === 'image') {
        if (isOllamaVision) {
          // Ollama format: images array with base64 data (strip data:image/...;base64, prefix)
          const base64Data = media.data.replace(/^data:image\/[^;]+;base64,/, '');
          console.log(
            '[Chat Stream] Using Ollama vision format. Base64 length:',
            base64Data.length
          );
          const lastUserIdx = messages.length - 1;
          messages[lastUserIdx] = {
            role: 'user',
            content: userMessage,
            images: [base64Data],
          } as any;
        } else if (isExternalVision) {
          // OpenAI/external format: content array
          const lastUserIdx = messages.length - 1;
          messages[lastUserIdx] = {
            role: 'user',
            content: [
              { type: 'text', text: userMessage },
              { type: 'image_url', image_url: { url: media.data } },
            ],
          } as any;
        } else {
          // Non-vision model - just describe
          messages[messages.length - 1].content =
            `[User attached an image: ${media.name}]\n\n${userMessage}`;
        }
      } else if (media.type === 'audio') {
        // Audio handling - some models like Gemma 4 may support audio
        // For now, describe the audio file
        console.log('[Chat Stream] Audio file attached:', media.name);
        const base64Audio = media.data.replace(/^data:audio\/[^;]+;base64,/, '');

        // Check if model might support audio (experimental)
        const audioCapableModels = ['gemma4', 'gemma-4', 'gpt-4o-audio', 'claude-3-opus'];
        const supportsAudio = audioCapableModels.some(m => model.toLowerCase().includes(m));

        if (supportsAudio && isOllama) {
          // Try sending audio to Ollama (experimental - may not work on all versions)
          messages[messages.length - 1] = {
            role: 'user',
            content: userMessage,
            images: [base64Audio], // Ollama may treat audio similarly to images
          } as any;
          messages[messages.length - 1].content =
            `[Audio file: ${media.name}. Please transcribe and respond to this audio.]\n\n${userMessage}`;
        } else {
          // Describe audio file for text-based models
          messages[messages.length - 1].content =
            `[User attached an audio file: ${media.name}. If you cannot process audio directly, please acknowledge this and respond to any text questions.]\n\n${userMessage}`;
        }
      } else if (media.type === 'video') {
        // Video handling - description only for now
        console.log('[Chat Stream] Video file attached:', media.name);
        messages[messages.length - 1].content =
          `[User attached a video file: ${media.name}. Please respond based on the filename and any text provided.]\n\n${userMessage}`;
      }

      if (media.type === 'image') {
        if (isOllamaVision) {
          // Ollama format: images array with base64 data (strip data:image/...;base64, prefix)
          const base64Data = media.data.replace(/^data:image\/[^;]+;base64,/, '');
          console.log(
            '[Chat Stream] Using Ollama vision format. Base64 length:',
            base64Data.length
          );
          const lastUserIdx = messages.length - 1;
          messages[lastUserIdx] = {
            role: 'user',
            content: userMessage,
            images: [base64Data],
          } as any;
        } else if (isExternalVision) {
          // OpenAI/external format: content array
          const lastUserIdx = messages.length - 1;
          messages[lastUserIdx] = {
            role: 'user',
            content: [
              { type: 'text', text: userMessage },
              { type: 'image_url', image_url: { url: media.data } },
            ],
          } as any;
        } else {
          // Non-vision model - just describe
          messages[messages.length - 1].content =
            `[User attached an image: ${media.name}]\n\n${userMessage}`;
        }
      } else if (media.type === 'audio') {
        messages[messages.length - 1].content = `[Audio file: ${media.name}]\n\n${userMessage}`;
      } else if (media.type === 'video') {
        messages[messages.length - 1].content = `[Video file: ${media.name}]\n\n${userMessage}`;
      }
    }

    // Create a TransformStream for streaming
    const encoder = new TextEncoder();
    const stream = new TransformStream();
    const writer = stream.writable.getWriter();

    // Start streaming in background
    (async () => {
      try {
        // Use the selected model, with fallback
        const useModel = model || 'ollama/llama3.2:latest';
        console.log('[Chat Stream] Using model:', useModel, 'with media:', !!media);

        const result = await streamChatCompletion({
          model: useModel,
          messages,
        });

        // Check if we got a stream (Ollama) or a complete response (external APIs)
        if ((result as any).stream) {
          // Handle Ollama streaming response with timeout
          const reader = (result as any).stream.getReader();
          const decoder = new TextDecoder();

          // 2 minute timeout for the entire stream
          const streamTimeout = setTimeout(() => {
            console.error('[Chat Stream] Stream timeout - cancelling');
            reader.cancel();
          }, 120000);

          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              const chunk = decoder.decode(value, { stream: true });
              const lines = chunk.split('\n').filter(line => line.trim());

              for (const line of lines) {
                try {
                  const parsed = JSON.parse(line);
                  if (parsed.message?.content) {
                    await writer.write(
                      encoder.encode(
                        `data: ${JSON.stringify({ chunk: parsed.message.content, done: false })}\n\n`
                      )
                    );
                  }
                  if (parsed.done) {
                    await writer.write(
                      encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`)
                    );
                  }
                } catch {
                  // Skip invalid JSON
                }
              }
            }
          } finally {
            clearTimeout(streamTimeout);
          }
        } else {
          // Handle complete response (non-streaming APIs like OpenRouter, GLM, DeepSeek)
          const msg = result.message as unknown as { content?: string };
          const content = msg?.content || String(result.message) || '';

          // Stream the content in chunks for a simulated streaming effect
          const chunkSize = 20;
          for (let i = 0; i < content.length; i += chunkSize) {
            const chunk = content.slice(i, i + chunkSize);
            await writer.write(
              encoder.encode(`data: ${JSON.stringify({ chunk, done: false })}\n\n`)
            );
          }

          // Send completion signal
          await writer.write(encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`));
        }
      } catch (error) {
        console.error('[Chat Stream] Error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        await writer.write(
          encoder.encode(`data: ${JSON.stringify({ error: errorMessage, done: true })}\n\n`)
        );
      } finally {
        await writer.close();
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
    console.error('Stream error:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to process request',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
