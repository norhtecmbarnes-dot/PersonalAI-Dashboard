import { stripThinkingTags } from '@/lib/utils/clean-ai-response';

export interface OllamaMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  images?: string[]; // Base64 encoded images for vision models
  tool_calls?: ToolCall[];
}

export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

export interface ChatCompletionResponse {
  message: OllamaMessage;
  done: boolean;
  tool_calls?: ToolCall[];
}

export interface ChatStreamChunk {
  message: OllamaMessage;
  done: boolean;
}

export interface ListModelsResponse {
  models: Array<{
    name: string;
    modified_at: string;
    size: number;
    digest: string;
  }>;
}

export const OLLAMA_API_URL = process.env.OLLAMA_API_URL || 'http://localhost:11434/api';

// API Keys - loaded from database (with env-var fallback).
// The Settings UI stores keys under api_key_<provider> in the settings table.
// Env vars remain the production escape hatch; a DB key takes precedence so that
// users can change providers without restarting the server.
let CACHED_KEYS: {
  openrouter?: string;
  deepseek?: string;
  glm?: string;
  openai?: string;
  anthropic?: string;
  gemini?: string;
  groq?: string;
  mistral?: string;
  lastLoad: number;
} = { lastLoad: 0 };

const KEY_CACHE_TTL = 60000; // 1 minute cache

async function loadApiKeys(): Promise<void> {
  const now = Date.now();
  if (now - CACHED_KEYS.lastLoad < KEY_CACHE_TTL) {
    return;
  }

  const fromDb = (provider: string): string | undefined => {
    try {
      // Indirect so webpack does not statically bundle better-sqlite3 into
      // client builds that import this module via chatCompletion().
      const mod = (eval('require') as (id: string) => unknown)('@/lib/database/sqlite') as {
        sqlDatabase: { initialize: () => void; getApiKey: (p: string) => string | null };
      };
      mod.sqlDatabase.initialize();
      const key = mod.sqlDatabase.getApiKey(provider);
      return key && key.length > 0 ? key : undefined;
    } catch {
      return undefined;
    }
  };

  const dbKey = (provider: string, envVar: string): string | undefined =>
    fromDb(provider) || process.env[envVar];

  CACHED_KEYS = {
    openrouter: dbKey('openrouter', 'OPENROUTER_API_KEY'),
    deepseek: dbKey('deepseek', 'DEEPSEEK_API_KEY'),
    glm: dbKey('glm', 'GLM_API_KEY'),
    openai: dbKey('openai', 'OPENAI_API_KEY'),
    anthropic: dbKey('anthropic', 'ANTHROPIC_API_KEY'),
    gemini: dbKey('gemini', 'GEMINI_API_KEY'),
    groq: dbKey('groq', 'GROQ_API_KEY'),
    mistral: dbKey('mistral', 'MISTRAL_API_KEY'),
    lastLoad: now,
  };
}

function getOpenRouterKey(): string | undefined {
  return CACHED_KEYS.openrouter || process.env.OPENROUTER_API_KEY;
}

function getDeepSeekKey(): string | undefined {
  return CACHED_KEYS.deepseek || process.env.DEEPSEEK_API_KEY;
}

function getGLMKey(): string | undefined {
  return CACHED_KEYS.glm || process.env.GLM_API_KEY;
}

function getGeminiKey(): string | undefined {
  return CACHED_KEYS.gemini || process.env.GEMINI_API_KEY;
}

function getGroqKey(): string | undefined {
  return CACHED_KEYS.groq || process.env.GROQ_API_KEY;
}

function getMistralKey(): string | undefined {
  return CACHED_KEYS.mistral || process.env.MISTRAL_API_KEY;
}

function getOllamaKey(): string | undefined {
  try {
    const mod = (eval('require') as (id: string) => unknown)('@/lib/database/sqlite') as {
      sqlDatabase: { initialize: () => void; getApiKey: (p: string) => string | null };
    };
    mod.sqlDatabase.initialize();
    const key = mod.sqlDatabase.getApiKey('ollama');
    if (key && key.length > 0) return key;
  } catch {}
  return process.env.OLLAMA_API_KEY;
}

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;
const REQUEST_TIMEOUT = 120000; // 2 minutes for large multimodal requests

async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number = REQUEST_TIMEOUT
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Request timed out after ${timeoutMs}ms`);
    }
    throw error;
  }
}

async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries: number = MAX_RETRIES
): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetchWithTimeout(url, options);
      return response;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < maxRetries) {
        console.warn(
          `Request attempt ${attempt} failed, retrying in ${RETRY_DELAY}ms...`,
          lastError.message
        );
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * attempt));
      }
    }
  }

  throw new Error(
    `Request failed after ${maxRetries} attempts: ${lastError?.message || 'Unknown error'}`
  );
}

function validateApiResponse(
  data: unknown,
  provider: string
): { choices?: Array<{ message?: { content?: string } }>; message?: { content?: string } } {
  if (!data || typeof data !== 'object') {
    throw new Error(`${provider} API error: Invalid response format - expected object`);
  }

  const response = data as Record<string, unknown>;

  // Check for expected structure
  if (!response.choices && !response.message) {
    throw new Error(`${provider} API error: Invalid response format - missing choices or message`);
  }

  return response as {
    choices?: Array<{ message?: { content?: string } }>;
    message?: { content?: string };
  };
}

function extractContent(data: unknown, provider: string): string {
  const validated = validateApiResponse(data, provider);

  // Try to extract content from various possible paths
  const content = validated.choices?.[0]?.message?.content ?? validated.message?.content ?? '';

  if (typeof content !== 'string') {
    throw new Error(`${provider} API error: Content is not a string`);
  }

  return content;
}

async function callOpenRouter(
  model: string,
  messages: OllamaMessage[],
  tools?: any[]
): Promise<ChatCompletionResponse> {
  await loadApiKeys();
  const openRouterKey = getOpenRouterKey();
  if (!openRouterKey) {
    throw new Error('OpenRouter API key is not configured');
  }

  try {
    const body: Record<string, any> = {
      model: model.replace('openrouter/', '') || 'openai/gpt-4o-mini',
      messages: messages,
      temperature: 0.7,
    };
    if (tools && tools.length > 0) {
      body.tools = tools;
    }

    const response = await fetchWithRetry('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${openRouterKey}`,
        'HTTP-Referer': 'http://localhost:3000',
        'X-Title': 'Proposal Genie',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'No error details available');
      throw new Error(
        `OpenRouter API error: ${response.status} ${response.statusText}. Details: ${errorText}`
      );
    }

    const data = await response.json();
    const content = extractContent(data, 'OpenRouter');
    const toolCalls = data.choices?.[0]?.message?.tool_calls;

    return {
      message: {
        role: 'assistant',
        content: content,
      },
      done: true,
      tool_calls: toolCalls,
    };
  } catch (error) {
    console.error(
      'OpenRouter API call failed:',
      error instanceof Error ? error.message : 'Unknown error'
    );
    throw error;
  }
}

async function callDeepSeek(
  model: string,
  messages: OllamaMessage[],
  tools?: any[]
): Promise<ChatCompletionResponse> {
  await loadApiKeys();
  const deepSeekKey = getDeepSeekKey();
  if (!deepSeekKey) {
    throw new Error('DeepSeek API key is not configured');
  }

  try {
    const body: Record<string, any> = {
      model: model.replace('deepseek/', '') || 'deepseek-chat',
      messages: messages,
      temperature: 0.7,
    };
    if (tools && tools.length > 0) {
      body.tools = tools;
    }

    const response = await fetchWithRetry('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${deepSeekKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'No error details available');
      throw new Error(
        `DeepSeek API error: ${response.status} ${response.statusText}. Details: ${errorText}`
      );
    }

    const data = await response.json();
    const content = extractContent(data, 'DeepSeek');
    const toolCalls = data.choices?.[0]?.message?.tool_calls;

    return {
      message: {
        role: 'assistant',
        content: content,
      },
      done: true,
      tool_calls: toolCalls,
    };
  } catch (error) {
    console.error(
      'DeepSeek API call failed:',
      error instanceof Error ? error.message : 'Unknown error'
    );
    throw error;
  }
}

async function callGLM(
  model: string,
  messages: OllamaMessage[],
  tools?: any[]
): Promise<ChatCompletionResponse> {
  await loadApiKeys();
  const glmKey = getGLMKey();
  if (!glmKey) {
    throw new Error('GLM API key is not configured');
  }

  try {
    const body: Record<string, any> = {
      model: model.replace('glm/', '') || 'glm-4',
      messages: messages,
      temperature: 0.7,
    };
    if (tools && tools.length > 0) {
      body.tools = tools;
    }

    const response = await fetchWithRetry('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${glmKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'No error details available');
      throw new Error(
        `GLM API error: ${response.status} ${response.statusText}. Details: ${errorText}`
      );
    }

    const data = await response.json();
    const content = extractContent(data, 'GLM');
    const toolCalls = data.choices?.[0]?.message?.tool_calls;

    return {
      message: {
        role: 'assistant',
        content: content,
      },
      done: true,
      tool_calls: toolCalls,
    };
  } catch (error) {
    console.error('GLM API call failed:', error instanceof Error ? error.message : 'Unknown error');
    throw error;
  }
}

async function callGemini(
  model: string,
  messages: OllamaMessage[],
  tools?: any[]
): Promise<ChatCompletionResponse> {
  await loadApiKeys();
  const geminiKey = getGeminiKey();
  if (!geminiKey) {
    throw new Error('Gemini API key is not configured. Add it in Settings.');
  }

  const modelName = model.replace('gemini/', '').replace('gemini-', '') || 'gemini-2.0-flash';

  // Convert messages to Gemini format
  const contents = messages.map(msg => ({
    role: msg.role === 'user' ? 'user' : 'model',
    parts: [{ text: msg.content }],
  }));

  // Convert OpenAI tools to Gemini format
  const geminiTools = tools
    ? tools.map(tool => ({
        functionDeclarations: [
          {
            name: tool.function.name,
            description: tool.function.description,
            parameters: tool.function.parameters,
          },
        ],
      }))
    : undefined;

  const body: Record<string, any> = {
    contents,
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 8192,
    },
  };
  if (geminiTools) {
    body.tools = geminiTools;
  }

  try {
    const response = await fetchWithRetry(
      `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${geminiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      }
    );

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'No error details');
      throw new Error(`Gemini API error: ${response.status}. ${errorText}`);
    }

    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const functionCall = data.candidates?.[0]?.content?.parts?.[0]?.functionCall;

    const toolCalls = functionCall
      ? [
          {
            id: `call_${Date.now()}`,
            type: 'function' as const,
            function: {
              name: functionCall.name,
              arguments: JSON.stringify(functionCall.args || {}),
            },
          },
        ]
      : undefined;

    return {
      message: { role: 'assistant', content },
      done: true,
      tool_calls: toolCalls,
    };
  } catch (error) {
    console.error('Gemini API call failed:', error);
    throw error;
  }
}

async function callOpenAI(
  model: string,
  messages: OllamaMessage[],
  tools?: any[]
): Promise<ChatCompletionResponse> {
  await loadApiKeys();
  const openaiKey = getOpenAIKey();
  if (!openaiKey) {
    throw new Error('OpenAI API key is not configured. Add it in Settings.');
  }

  const modelName = model.replace('openai/', '').replace('openai-', '') || 'gpt-4o-mini';

  const body: Record<string, any> = {
    model: modelName,
    messages,
    temperature: 0.7,
  };
  if (tools && tools.length > 0) {
    body.tools = tools;
  }

  try {
    const response = await fetchWithRetry('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${openaiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'No error details');
      throw new Error(`OpenAI API error: ${response.status}. ${errorText}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    const toolCalls = data.choices?.[0]?.message?.tool_calls;

    return {
      message: { role: 'assistant', content },
      done: true,
      tool_calls: toolCalls,
    };
  } catch (error) {
    console.error('OpenAI API call failed:', error);
    throw error;
  }
}

async function callAnthropic(
  model: string,
  messages: OllamaMessage[],
  tools?: any[]
): Promise<ChatCompletionResponse> {
  await loadApiKeys();
  const anthropicKey = getAnthropicKey();
  if (!anthropicKey) {
    throw new Error('Anthropic API key is not configured. Add it in Settings.');
  }

  const modelName =
    model.replace('anthropic/', '').replace('claude-', '') || 'claude-3-5-sonnet-20241022';

  // Convert messages - Anthropic expects system separately
  const systemMessage = messages.find(m => m.role === 'system');
  const otherMessages = messages
    .filter(m => m.role !== 'system')
    .map(m => ({
      role: m.role === 'user' ? 'user' : 'assistant',
      content: m.content,
    }));

  // Convert OpenAI tools to Anthropic format
  const anthropicTools = tools
    ? tools.map(tool => ({
        name: tool.function.name,
        description: tool.function.description,
        input_schema: tool.function.parameters,
      }))
    : undefined;

  const body: Record<string, any> = {
    model: modelName,
    max_tokens: 4096,
    system: systemMessage?.content,
    messages: otherMessages,
  };
  if (anthropicTools && anthropicTools.length > 0) {
    body.tools = anthropicTools;
  }

  try {
    const response = await fetchWithRetry('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'No error details');
      throw new Error(`Anthropic API error: ${response.status}. ${errorText}`);
    }

    const data = await response.json();
    const content = data.content?.[0]?.text || '';
    const toolUse = data.content?.find((c: any) => c.type === 'tool_use');

    const toolCalls = toolUse
      ? [
          {
            id: toolUse.id || `call_${Date.now()}`,
            type: 'function' as const,
            function: {
              name: toolUse.name,
              arguments: JSON.stringify(toolUse.input || {}),
            },
          },
        ]
      : undefined;

    return {
      message: { role: 'assistant', content },
      done: true,
      tool_calls: toolCalls,
    };
  } catch (error) {
    console.error('Anthropic API call failed:', error);
    throw error;
  }
}

async function callGroq(
  model: string,
  messages: OllamaMessage[],
  tools?: any[]
): Promise<ChatCompletionResponse> {
  await loadApiKeys();
  const groqKey = getGroqKey();
  if (!groqKey) {
    throw new Error('Groq API key is not configured. Add it in Settings.');
  }

  const modelName = model.replace('groq/', '') || 'llama-3.3-70b-versatile';

  const body: Record<string, any> = {
    model: modelName,
    messages,
    temperature: 0.7,
  };
  if (tools && tools.length > 0) {
    body.tools = tools;
  }

  try {
    const response = await fetchWithRetry('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${groqKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'No error details');
      throw new Error(`Groq API error: ${response.status}. ${errorText}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    const toolCalls = data.choices?.[0]?.message?.tool_calls;

    return {
      message: { role: 'assistant', content },
      done: true,
      tool_calls: toolCalls,
    };
  } catch (error) {
    console.error('Groq API call failed:', error);
    throw error;
  }
}

async function callMistral(
  model: string,
  messages: OllamaMessage[],
  tools?: any[]
): Promise<ChatCompletionResponse> {
  await loadApiKeys();
  const mistralKey = getMistralKey();
  if (!mistralKey) {
    throw new Error('Mistral API key is not configured. Add it in Settings.');
  }

  const modelName = model.replace('mistral/', '') || 'mistral-large-latest';

  const body: Record<string, any> = {
    model: modelName,
    messages,
    temperature: 0.7,
  };
  if (tools && tools.length > 0) {
    body.tools = tools;
  }

  try {
    const response = await fetchWithRetry('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${mistralKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'No error details');
      throw new Error(`Mistral API error: ${response.status}. ${errorText}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    const toolCalls = data.choices?.[0]?.message?.tool_calls;

    return {
      message: { role: 'assistant', content },
      done: true,
      tool_calls: toolCalls,
    };
  } catch (error) {
    console.error('Mistral API call failed:', error);
    throw error;
  }
}

function getOpenAIKey(): string | undefined {
  return CACHED_KEYS.openai || process.env.OPENAI_API_KEY;
}

function getAnthropicKey(): string | undefined {
  return CACHED_KEYS.anthropic || process.env.ANTHROPIC_API_KEY;
}

export async function chatCompletion(params: {
  model: string;
  messages: OllamaMessage[];
  temperature?: number;
  maxTokens?: number;
  tools?: any[];
}): Promise<ChatCompletionResponse> {
  await loadApiKeys();
  const openRouterKey = getOpenRouterKey();
  const deepSeekKey = getDeepSeekKey();
  const glmKey = getGLMKey();
  const geminiKey = getGeminiKey();
  const openaiKey = getOpenAIKey();
  const anthropicKey = getAnthropicKey();
  const groqKey = getGroqKey();
  const mistralKey = getMistralKey();

  // Route to appropriate API based on model prefix
  if (params.model.startsWith('gemini/') || params.model.startsWith('gemini-')) {
    if (geminiKey) return callGemini(params.model, params.messages, params.tools);
  }

  if (params.model.startsWith('openai/') || params.model.startsWith('gpt-')) {
    if (openaiKey) return callOpenAI(params.model, params.messages, params.tools);
  }

  if (params.model.startsWith('anthropic/') || params.model.startsWith('claude-')) {
    if (anthropicKey) return callAnthropic(params.model, params.messages, params.tools);
  }

  if (params.model.startsWith('groq/')) {
    if (groqKey) return callGroq(params.model, params.messages, params.tools);
  }

  if (params.model.startsWith('mistral/')) {
    if (mistralKey) return callMistral(params.model, params.messages, params.tools);
  }

  if (params.model === 'openrouter' || params.model.startsWith('openrouter/')) {
    if (openRouterKey) return callOpenRouter(params.model, params.messages, params.tools);
  }

  if (params.model.startsWith('deepseek/') && deepSeekKey) {
    return callDeepSeek(params.model, params.messages, params.tools);
  }

  if (params.model.startsWith('glm/') && glmKey) {
    return callGLM(params.model, params.messages, params.tools);
  }

  // For Ollama models, remove the 'ollama/' prefix
  const ollamaModel = params.model.startsWith('ollama/')
    ? params.model.replace('ollama/', '')
    : params.model;

  // Check if this is a cloud model (from EXTERNAL_MODELS ollama-cloud list)
  const cloudModels = getExternalModels().filter(m => m.provider === 'ollama-cloud');
  const isCloudModel = cloudModels.some(m => m.id === ollamaModel);

  // Cloud models go to ollama.com/v1 (OpenAI-compatible)
  if (isCloudModel) {
    const ollamaKey = getOllamaKey();
    if (!ollamaKey) {
      throw new Error('Ollama API key required for cloud models. Get one at https://ollama.com/settings/keys');
    }
    try {
      const body: Record<string, any> = {
        model: ollamaModel,
        messages: params.messages,
        temperature: params.temperature || 0.7,
        max_tokens: params.maxTokens || 16384,
        stream: false,
      };
      if (params.tools && params.tools.length > 0) {
        body.tools = params.tools;
      }
      const response = await fetchWithRetry('https://ollama.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${ollamaKey}`,
        },
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        const errorText = await response.text().catch(() => 'No error details available');
        throw new Error(`Ollama Cloud error: ${response.status} ${response.statusText}. Details: ${errorText}`);
      }
      const data = await response.json();
      const rawContent = data.choices?.[0]?.message?.content || '';
      const content = stripThinkingTags(rawContent);
      return {
        message: {
          role: 'assistant',
          content,
        },
        done: true,
      };
    } catch (error) {
      console.error('Ollama Cloud completion error:', error);
      throw error;
    }
  }

  // Default: Try local Ollama
  try {
    const body: Record<string, any> = {
      model: ollamaModel,
      messages: params.messages,
      temperature: params.temperature || 0.7,
      stream: false,
    };
    if (params.tools && params.tools.length > 0) {
      body.tools = params.tools;
    }

    const ollamaKey = getOllamaKey();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (ollamaKey) {
      headers['Authorization'] = `Bearer ${ollamaKey}`;
    }

    const response = await fetchWithRetry(`${OLLAMA_API_URL}/chat`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'No error details available');
      throw new Error(
        `Ollama API error: ${response.status} ${response.statusText}. Details: ${errorText}`
      );
    }

    const data = await response.json();

    // Validate response data
    if (!data || typeof data !== 'object') {
      throw new Error('Ollama API error: Invalid response format - expected object');
    }

    // Check for message structure and ensure content is a string
    const messageContent = data.message?.content;
    if (messageContent !== undefined && typeof messageContent !== 'string') {
      throw new Error('Ollama API error: message.content is not a string');
    }

    return {
      message: {
        role: 'assistant',
        content: messageContent || '',
      },
      done: true,
      tool_calls: data.message?.tool_calls,
    };
  } catch (error) {
    console.error('Chat completion error:', error);

    // Only fall back to OpenRouter if explicitly configured and user wants cloud
    // Disable fallback when using Ollama to prevent unwanted API calls
    const shouldFallback = process.env.ENABLE_CLOUD_FALLBACK === 'true';
    if (shouldFallback && openRouterKey && !params.model.startsWith('openrouter/')) {
      console.log('Falling back to OpenRouter...');
      return callOpenRouter(params.model, params.messages, params.tools);
    }

    throw error;
  }
}

export async function streamChatCompletion(params: {
  model: string;
  messages: OllamaMessage[];
  temperature?: number;
  maxTokens?: number;
}): Promise<ChatStreamChunk> {
  await loadApiKeys();
  const openRouterKey = getOpenRouterKey();
  const deepSeekKey = getDeepSeekKey();
  const glmKey = getGLMKey();

  // Try external APIs if external model selected
  if (params.model === 'openrouter' || params.model.startsWith('openrouter/')) {
    if (openRouterKey) {
      const result = await callOpenRouter(params.model, params.messages);
      return {
        message: result.message,
        done: true,
      };
    }
  }
  if (params.model.startsWith('deepseek/') && deepSeekKey) {
    const result = await callDeepSeek(params.model, params.messages);
    return {
      message: result.message,
      done: true,
    };
  }
  if (params.model.startsWith('glm/') && glmKey) {
    const result = await callGLM(params.model, params.messages);
    return {
      message: result.message,
      done: true,
    };
  }

  // For Ollama models, remove the 'ollama/' prefix
  const ollamaModel = params.model.startsWith('ollama/')
    ? params.model.replace('ollama/', '')
    : params.model;

  // Check if this is a cloud model (from EXTERNAL_MODELS ollama-cloud list)
  const cloudModels = getExternalModels().filter(m => m.provider === 'ollama-cloud');
  const isCloudModel = cloudModels.some(m => m.id === ollamaModel);

  // Cloud models go to ollama.com/v1 (OpenAI-compatible)
  if (isCloudModel) {
    const ollamaKey = getOllamaKey();
    if (!ollamaKey) {
      throw new Error('Ollama API key required for cloud models. Get one at https://ollama.com/settings/keys');
    }
    try {
      const response = await fetchWithRetry('https://ollama.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${ollamaKey}`,
        },
        body: JSON.stringify({
          model: ollamaModel,
          messages: params.messages,
          temperature: params.temperature || 0.7,
          max_tokens: params.maxTokens || 16384,
          stream: true,
        }),
      });
      if (!response.ok) {
        const errorText = await response.text().catch(() => 'No error details available');
        throw new Error(`Ollama Cloud error: ${response.status} ${response.statusText}. Details: ${errorText}`);
      }

      // Transform OpenAI-format SSE chunks to {chunk, done} format
      // and strip reasoning/thinking tokens
      const encoder = new TextEncoder();
      const decoder = new TextDecoder();
      const transform = new TransformStream({
        transform(chunk, controller) {
          const text = decoder.decode(chunk, { stream: true });
          const lines = text.split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const jsonStr = line.slice(6).trim();
              if (jsonStr === '[DONE]') {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`));
                continue;
              }
              try {
                const data = JSON.parse(jsonStr);
                const delta = data.choices?.[0]?.delta;
                // Only emit content, skip reasoning/thinking tokens
                if (delta?.content) {
                  const cleaned = stripThinkingTags(delta.content);
                  if (cleaned) {
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ chunk: cleaned, done: false })}\n\n`));
                  }
                }
                if (data.choices?.[0]?.finish_reason) {
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`));
                }
              } catch (e) {
                // Skip invalid JSON lines
              }
            }
          }
        },
      });

      const transformedStream = response.body!.pipeThrough(transform);
      return {
        message: { role: 'assistant', content: '' },
        done: false,
        stream: transformedStream,
      } as any;
    } catch (error) {
      console.error('Ollama Cloud stream error:', error);
      throw error;
    }
  }

  // Default: Try local Ollama with streaming
  try {
    const ollamaKey = getOllamaKey();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (ollamaKey) {
      headers['Authorization'] = `Bearer ${ollamaKey}`;
    }

    const response = await fetchWithRetry(`${OLLAMA_API_URL}/chat`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: ollamaModel,
        messages: params.messages,
        temperature: params.temperature || 0.7,
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'No error details available');
      throw new Error(
        `Ollama API error: ${response.status} ${response.statusText}. Details: ${errorText}`
      );
    }

    // For streaming, return the response reader
    return {
      message: {
        role: 'assistant',
        content: '',
      },
      done: false,
      stream: response.body,
    } as any;
  } catch (error) {
    console.error('Stream chat completion error:', error);

    // Only fall back to OpenRouter if explicitly configured
    // Disable fallback when using Ollama to prevent unwanted API calls
    const shouldFallback = process.env.ENABLE_CLOUD_FALLBACK === 'true';
    if (shouldFallback && openRouterKey) {
      console.log('Falling back to OpenRouter...');
      const result = await callOpenRouter(params.model, params.messages);
      return {
        message: result.message,
        done: true,
      };
    }

    throw error;
  }
}

export interface OllamaModel {
  name: string;
  modified_at: string;
  size: number;
  digest: string;
}

export interface ExternalModel {
  id: string;
  name: string;
  provider: string;
  description: string;
}

const EXTERNAL_MODELS: ExternalModel[] = [
  // Ollama Cloud models (require OLLAMA_API_KEY)
  // Only models activated on the account — fetched via GET ollama.com/api/tags
  { id: 'glm-5.3', name: 'GLM 5.3', provider: 'ollama-cloud', description: '755B — latest GLM with thinking + tools' },
  { id: 'glm-5.3-flash', name: 'GLM 5.3 Flash', provider: 'ollama-cloud', description: '328B — fast GLM with vision + thinking' },
  { id: 'glm-5.2', name: 'GLM 5.2', provider: 'ollama-cloud', description: '756B — GLM thinking model' },
  { id: 'glm-5.1', name: 'GLM 5.1', provider: 'ollama-cloud', description: '1.5T — massive GLM model' },
  { id: 'deepseek-v4-pro:0813', name: 'DeepSeek V4 Pro', provider: 'ollama-cloud', description: '892B — latest DeepSeek flagship' },
  { id: 'deepseek-v4-flash:0731', name: 'DeepSeek V4 Flash', provider: 'ollama-cloud', description: '167B — fast DeepSeek V4' },
  { id: 'kimi-k3', name: 'Kimi K3', provider: 'ollama-cloud', description: '1.5T — Moonshot flagship' },
  { id: 'kimi-k2.7-code', name: 'Kimi K2.7 Code', provider: 'ollama-cloud', description: '595B — code specialist' },
  { id: 'kimi-k2.6', name: 'Kimi K2.6', provider: 'ollama-cloud', description: '595B — improved Kimi' },
  { id: 'qwen3.5:397b', name: 'Qwen 3.5 397B', provider: 'ollama-cloud', description: '397B Qwen flagship' },
  { id: 'nemotron-3-ultra', name: 'Nemotron 3 Ultra', provider: 'ollama-cloud', description: 'NVIDIA largest Nemotron' },
  { id: 'nemotron-3-super', name: 'Nemotron 3 Super', provider: 'ollama-cloud', description: '230B — NVIDIA mid-tier' },
  { id: 'nemotron-3-nano:30b', name: 'Nemotron 3 Nano', provider: 'ollama-cloud', description: '30B — efficient agentic model' },
  { id: 'minimax-m3', name: 'MiniMax M3', provider: 'ollama-cloud', description: 'Latest MiniMax model' },
  { id: 'minimax-m2.7', name: 'MiniMax M2.7', provider: 'ollama-cloud', description: 'MiniMax model' },
  { id: 'mistral-large-3:675b', name: 'Mistral Large 3', provider: 'ollama-cloud', description: '675B Mistral' },
  { id: 'gpt-oss:120b', name: 'GPT-OSS 120B', provider: 'ollama-cloud', description: '120B open-source GPT' },
  { id: 'gpt-oss:20b', name: 'GPT-OSS 20B', provider: 'ollama-cloud', description: '20B open-source GPT' },
  { id: 'gemma4:31b', name: 'Gemma 4 31B', provider: 'ollama-cloud', description: '31B Gemma 4' },

  // Gemini models
  {
    id: 'gemini/gemini-2.0-flash',
    name: 'Gemini 2.0 Flash',
    provider: 'gemini',
    description: 'Fast, efficient, free tier available',
  },
  {
    id: 'gemini/gemini-1.5-pro',
    name: 'Gemini 1.5 Pro',
    provider: 'gemini',
    description: 'Advanced reasoning, large context',
  },
  {
    id: 'gemini/gemini-1.5-flash',
    name: 'Gemini 1.5 Flash',
    provider: 'gemini',
    description: 'Fast multimodal model',
  },

  // OpenAI models
  {
    id: 'openai/gpt-4o',
    name: 'GPT-4o',
    provider: 'openai',
    description: 'Most capable GPT-4 model',
  },
  {
    id: 'openai/gpt-4o-mini',
    name: 'GPT-4o Mini',
    provider: 'openai',
    description: 'Fast and affordable',
  },
  {
    id: 'openai/gpt-4-turbo',
    name: 'GPT-4 Turbo',
    provider: 'openai',
    description: 'Previous generation flagship',
  },

  // Anthropic models
  {
    id: 'anthropic/claude-3-5-sonnet-20241022',
    name: 'Claude 3.5 Sonnet',
    provider: 'anthropic',
    description: 'Latest Claude model',
  },
  {
    id: 'anthropic/claude-3-opus-20240229',
    name: 'Claude 3 Opus',
    provider: 'anthropic',
    description: 'Most powerful Claude',
  },

  // Groq models (ultra-fast)
  {
    id: 'groq/llama-3.3-70b-versatile',
    name: 'Llama 3.3 70B (Groq)',
    provider: 'groq',
    description: 'Ultra-fast inference',
  },
  {
    id: 'groq/llama-3.1-8b-instant',
    name: 'Llama 3.1 8B (Groq)',
    provider: 'groq',
    description: 'Fastest inference',
  },
  {
    id: 'groq/mixtral-8x7b-32768',
    name: 'Mixtral 8x7B (Groq)',
    provider: 'groq',
    description: 'Fast mixture of experts',
  },

  // Mistral models
  {
    id: 'mistral/mistral-large-latest',
    name: 'Mistral Large',
    provider: 'mistral',
    description: 'Mistral flagship model',
  },
  {
    id: 'mistral/mistral-medium-latest',
    name: 'Mistral Medium',
    provider: 'mistral',
    description: 'Balanced performance',
  },

  // DeepSeek models
  {
    id: 'deepseek/deepseek-chat',
    name: 'DeepSeek Chat',
    provider: 'deepseek',
    description: 'DeepSeek Chat Model',
  },
  {
    id: 'deepseek/deepseek-reasoner',
    name: 'DeepSeek Reasoner',
    provider: 'deepseek',
    description: 'Advanced reasoning model',
  },

  // GLM models (via GLM API)
  {
    id: 'glm-4.7-flash',
    name: 'GLM-4.7 Flash',
    provider: 'glm',
    description: 'Fast multilingual chat model',
  },

  // OpenRouter (aggregator)
  {
    id: 'openrouter/auto',
    name: 'OpenRouter Auto',
    provider: 'openrouter',
    description: 'Auto-select best model',
  },
];

export async function getOllamaModels(): Promise<OllamaModel[]> {
  try {
    const ollamaKey = getOllamaKey();
    const headers: Record<string, string> = {};

    if (ollamaKey) {
      headers['Authorization'] = `Bearer ${ollamaKey}`;
    }

    const response = await fetchWithRetry(
      `${OLLAMA_API_URL}/tags`,
      {
        method: 'GET',
        headers,
      },
      2
    ); // Fewer retries for model listing

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'No error details available');
      throw new Error(
        `Ollama API error: ${response.status} ${response.statusText}. Details: ${errorText}`
      );
    }

    const data = await response.json();

    // Validate response structure
    if (!data || typeof data !== 'object') {
      console.error('Get Ollama models error: Invalid response format');
      return [];
    }

    if (!Array.isArray(data.models)) {
      console.warn('Get Ollama models warning: models field is not an array');
      return [];
    }

    return data.models;
  } catch (error) {
    console.error(
      'Get Ollama models error:',
      error instanceof Error ? error.message : 'Unknown error'
    );
    return [];
  }
}

export function getExternalModels(): ExternalModel[] {
  return EXTERNAL_MODELS;
}

export async function listModels(): Promise<string[]> {
  try {
    const ollamaKey = getOllamaKey();
    const headers: Record<string, string> = {};

    if (ollamaKey) {
      headers['Authorization'] = `Bearer ${ollamaKey}`;
    }

    const response = await fetchWithRetry(
      `${OLLAMA_API_URL}/tags`,
      {
        method: 'GET',
        headers,
      },
      2
    ); // Fewer retries for model listing

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'No error details available');
      throw new Error(
        `Ollama API error: ${response.status} ${response.statusText}. Details: ${errorText}`
      );
    }

    const data = await response.json();

    // Validate response structure
    if (!data || typeof data !== 'object') {
      console.error('List models error: Invalid response format');
      throw new Error('Invalid response format from Ollama API');
    }

    const ollamaModelNames = data.models?.map((model: OllamaModel) => model.name) || [];

    const allModels = [
      ...ollamaModelNames,
      'glm-4.7-flash',
      'openrouter/gpt-4o-mini',
      'deepseek/deepseek-chat',
    ];

    return allModels;
  } catch (error) {
    console.error('List models error:', error instanceof Error ? error.message : 'Unknown error');
    const defaultModels = [
      'ollama/qwen3.5:9b',
      'ollama/llama3.2',
      'ollama/deepseek-r1',
      'ollama/llama3.1',
      'glm-4.7-flash',
      'openrouter/gpt-4o-mini',
      'deepseek/deepseek-chat',
    ];
    return defaultModels;
  }
}

export async function checkOllamaHealth(): Promise<boolean> {
  try {
    const ollamaKey = getOllamaKey();
    const headers: Record<string, string> = {};

    if (ollamaKey) {
      headers['Authorization'] = `Bearer ${ollamaKey}`;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout

    const response = await fetch(`${OLLAMA_API_URL}/tags`, {
      method: 'GET',
      headers,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response.ok;
  } catch (error) {
    console.error('Health check error:', error);
    return false;
  }
}

// Cache for available models
let cachedAvailableModels: string[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Priority list of lightweight models for CPU-only setups (no GPU required)
const LIGHTWEIGHT_MODEL_PRIORITY = [
  'llama3.2:3b', // Meta's lightweight model
  'llama3.2:latest', // Default llama3.2
  'phi3:mini', // Microsoft's lightweight model
  'gemma:2b', // Google's lightweight model
  'qwen3.5:9b', // Qwen lightweight
  'glm-4.7-flash:latest', // GLM flash model
  'phi4:latest', // Phi model
  'llama3.2', // Default llama3.2
];

/**
 * Get the best lightweight model for CPU-only setups
 * Prioritizes models that don't require GPU
 */
function getBestLightweightModel(availableModels: string[]): string {
  // Check priority list in order
  for (const preferredModel of LIGHTWEIGHT_MODEL_PRIORITY) {
    if (availableModels.includes(preferredModel)) {
      console.log(`[SDK] Selected lightweight model: ${preferredModel}`);
      return preferredModel;
    }
  }

  // Fallback to first available
  return availableModels[0];
}

/**
 * Get the first available model from Ollama
 * Returns a fallback if Ollama is not available
 * Prioritizes CPU-friendly lightweight models
 */
export async function getFirstAvailableModel(): Promise<string> {
  // Check cache first
  if (cachedAvailableModels && Date.now() - cacheTimestamp < CACHE_TTL) {
    return cachedAvailableModels[0] || 'ollama/llama3.2:latest';
  }

  try {
    const models = await getOllamaModels();
    if (models.length > 0) {
      const availableModels = models.map(m => m.name);
      const bestModel = getBestLightweightModel(availableModels);
      cachedAvailableModels = availableModels.map(m => `ollama/${m}`);
      cacheTimestamp = Date.now();
      return `ollama/${bestModel}`;
    }
  } catch (error) {
    console.log('[SDK] Could not fetch Ollama models, using fallback');
  }

  // Fallback defaults - prioritize lightweight CPU-friendly model
  return 'ollama/llama3.2:latest';
}

/**
 * Validate if a model is available
 * If not, return the first available fallback
 * Prioritizes lightweight models for CPU-only setups
 */
export async function validateOrFallbackModel(model: string): Promise<string> {
  // If it's not an Ollama model, just return it (external APIs)
  if (!model.startsWith('ollama/')) {
    return model;
  }

  try {
    const models = await getOllamaModels();
    const modelName = model.replace('ollama/', '');

    // Check if the requested model is available
    const isAvailable = models.some(m => m.name === modelName);
    if (isAvailable) {
      return model;
    }

    // Return best lightweight model
    const availableModels = models.map(m => m.name);
    if (availableModels.length > 0) {
      const fallback = getBestLightweightModel(availableModels);
      console.log(`[SDK] Model ${model} not found, using fallback: ollama/${fallback}`);
      return `ollama/${fallback}`;
    }
  } catch (error) {
    console.log('[SDK] Could not validate model, using fallback');
  }

  // Default fallback - llama3.2:latest (common lightweight model)
  return 'ollama/llama3.2:latest';
}

/**
 * Check if a model is suitable for CPU-only operation (no GPU required)
 * Models with < 5B parameters can typically run on CPU
 */
export function isCPUFriendlyModel(model: string): boolean {
  const cpuFriendlyModels = [
    'llama3.2:3b',
    'llama3.2:latest',
    'gemma:2b',
    'phi3:mini',
    'phi3',
    'phi4',
    'glm-4.7-flash',
  ];

  const modelName = model.replace('ollama/', '');
  return cpuFriendlyModels.some(m => modelName.includes(m));
}

/**
 * Get recommended model based on hardware capabilities
 */
export async function getRecommendedModel(): Promise<{ model: string; reason: string }> {
  try {
    const models = await getOllamaModels();
    const availableModels = models.map(m => m.name);

    // Check for lightweight models in priority order
    for (const preferred of LIGHTWEIGHT_MODEL_PRIORITY) {
      if (availableModels.includes(preferred)) {
        return {
          model: `ollama/${preferred}`,
          reason: `${preferred}: Lightweight model suitable for CPU-only operation`,
        };
      }
    }

    // Fallback to first available
    if (availableModels.length > 0) {
      return {
        model: `ollama/${availableModels[0]}`,
        reason: `${availableModels[0]}: Available local model`,
      };
    }
  } catch (error) {
    console.log('[SDK] Could not get model recommendations');
  }

  // Default recommendation
  return {
    model: 'ollama/llama3.2:latest',
    reason: 'llama3.2: Recommended default - lightweight, CPU-friendly model',
  };
}
