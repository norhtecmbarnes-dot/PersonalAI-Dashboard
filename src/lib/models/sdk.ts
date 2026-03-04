'use client';

export interface OllamaMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
}

export interface ChatCompletionResponse {
    message: OllamaMessage;
    done: boolean;
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

export async function chatCompletion(params: {
    model: string;
    messages: OllamaMessage[];
    temperature?: number;
    maxTokens?: number;
}): Promise<ChatCompletionResponse> {
    try {
        const response = await fetch(`${OLLAMA_API_URL}/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: params.model,
                messages: params.messages,
                temperature: params.temperature || 0.7,
                stream: false,
            }),
        });

        if (!response.ok) {
            throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        return {
            message: {
                role: 'assistant',
                content: data.message?.content,
            },
            done: true,
        };
    } catch (error) {
        console.error('Chat completion error:', error);
        throw error;
    }
}

export async function streamChatCompletion(params: {
    model: string;
    messages: OllamaMessage[];
    temperature?: number;
    maxTokens?: number;
}): Promise<ChatStreamChunk> {
    try {
        const response = await fetch(`${OLLAMA_API_URL}/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: params.model,
                messages: params.messages,
                temperature: params.temperature || 0.7,
                stream: true,
            }),
        });

        if (!response.ok) {
            throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
        }

        const reader = response.body?.getReader();
        const decoder = new TextDecoder('utf-8');

        if (!reader) {
            throw new Error('No response body reader available');
        }

        let fullContent = '';
        let done = false;

        while (!done) {
            const { done: streamDone, value } = await reader.read();
            done = streamDone;

            if (value) {
                const chunk = decoder.decode(value);
                const lines = chunk.split('\n').filter(line => line.trim() !== '');

                for (const line of lines) {
                    try {
                        const json = JSON.parse(line);
                        if (json.message?.content) {
                            fullContent += json.message.content;
                        }
                        if (json.done) {
                            done = true;
                        }
                    } catch (e) {
                        console.error('Error parsing stream chunk:', e);
                    }
                }
            }
        }

        return {
            message: {
                role: 'assistant',
                content: fullContent,
            },
            done: true,
        };
    } catch (error) {
        console.error('Stream chat completion error:', error);
        throw error;
    }
}

export async function listModels(): Promise<string[]> {
    try {
        const response = await fetch(`${OLLAMA_API_URL}/tags`);

        if (!response.ok) {
            throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        return data.models?.map((model: { name: string }) => model.name) || [];
    } catch (error) {
        console.error('List models error:', error);
        const defaultModels = ['glm-4.7-flash', 'glm-5:cloud', 'qwen2.5:14b'];
        return defaultModels;
    }
}

export async function checkOllamaHealth(): Promise<boolean> {
    try {
        const result = await chatCompletion({
            model: 'glm-4.7-flash',
            messages: [{ role: 'user', content: 'test' }],
            maxTokens: 1,
        });

        return Boolean(result);
    } catch (error) {
        console.error('Health check error:', error);
        return false;
    }
}