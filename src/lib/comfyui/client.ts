export const runtime = 'nodejs';

export interface ComfyUIConfig {
  baseUrl: string;
}

export function getComfyUIBaseUrl(): string {
  const env = process.env.COMFYUI_URL || process.env.NEXT_PUBLIC_COMFYUI_URL;
  if (env && env.trim()) return env.replace(/\/$/, '');
  return 'http://127.0.0.1:8188';
}

export async function comfyFetch<T>(path: string, init?: RequestInit, baseUrl?: string): Promise<T> {
  const root = (baseUrl || getComfyUIBaseUrl()).replace(/\/$/, '');
  const url = path.startsWith('http') ? path : `${root}${path}`;
  const res = await fetch(url, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`ComfyUI ${res.status} ${path}: ${text.slice(0, 300)}`);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export interface SystemStats {
  system: {
    os: string;
    python_version: string;
    devices: Array<{ name: string; type: string; index: number; vram_total: number; vram_free: number; torch_ver: string }>;
  };
  devices: Array<{ name: string; type: string; vram_total: number; vram_free: number }>;
}

export interface QueueItem {
  prompt_id: string;
  number: number;
  node: string;
  prompt: Record<string, unknown>;
}

export interface QueueStatus {
  queue_running: QueueItem[];
  queue_pending: QueueItem[];
}

export interface PromptResponse {
  prompt_id: string;
  number: number;
  node_errors?: Record<string, unknown>;
}

export interface HistoryEntry {
  prompt: QueueItem;
  outputs: Record<string, {
    images?: Array<{ filename: string; subfolder: string; type: string; abspath?: string }>;
    gifs?: Array<{ filename: string; subfolder: string; type: string; format: string }>;
    audios?: Array<{ filename: string; subfolder: string; type: string; format?: string; sample_rate?: number }>;
    videos?: Array<{ filename: string; subfolder: string; type: string; format: string }>;
  }>;
  status: {
    status_str: string;
    completed: boolean;
    messages: Array<unknown>;
  };
}

export interface ObjectInfoNode {
  name: string;
  display_name?: string;
  category?: string;
  input: {
    required: Record<string, unknown>;
    optional?: Record<string, unknown>;
  };
  output: string[];
  output_name: string[];
}

export interface ObjectInfoResponse {
  _meta?: unknown;
  [nodeName: string]: ObjectInfoNode | unknown;
}

export async function getSystemStats(baseUrl?: string): Promise<SystemStats> {
  return comfyFetch<SystemStats>('/system_stats', {}, baseUrl);
}

export async function getQueue(baseUrl?: string): Promise<QueueStatus> {
  return comfyFetch<QueueStatus>('/queue', {}, baseUrl);
}

export async function getObjectInfo(baseUrl?: string): Promise<ObjectInfoResponse> {
  return comfyFetch<ObjectInfoResponse>('/object_info', {}, baseUrl);
}

export async function submitPrompt(
  prompt: Record<string, unknown>,
  options: { clientId?: string; baseUrl?: string } = {}
): Promise<PromptResponse> {
  const clientId = options.clientId || `director-${Date.now()}`;
  const body = { prompt, client_id: clientId };
  return comfyFetch<PromptResponse>('/prompt', {
    method: 'POST',
    body: JSON.stringify(body),
  }, options.baseUrl);
}

export async function getHistory(promptId: string, baseUrl?: string): Promise<Record<string, HistoryEntry>> {
  return comfyFetch<Record<string, HistoryEntry>>(`/history/${promptId}`, {}, baseUrl);
}

export async function deleteHistory(promptId: string, baseUrl?: string): Promise<void> {
  await comfyFetch<void>(`/history`, {
    method: 'POST',
    body: JSON.stringify({ delete: [promptId] }),
  }, baseUrl);
}

export async function cancelPrompt(promptId: string, baseUrl?: string): Promise<void> {
  await comfyFetch<void>(`/queue`, {
    method: 'POST',
    body: JSON.stringify({ delete: [promptId] }),
  }, baseUrl);
}

export function viewUrl(filename: string, subfolder = '', type = 'output', baseUrl?: string): string {
  const root = (baseUrl || getComfyUIBaseUrl()).replace(/\/$/, '');
  const params = new URLSearchParams({ filename, subfolder, type });
  return `${root}/view?${params.toString()}`;
}

export interface UploadedImage {
  name: string;
  subfolder: string;
  type: string;
}

export async function uploadImage(file: File, baseUrl?: string): Promise<UploadedImage> {
  const root = (baseUrl || getComfyUIBaseUrl()).replace(/\/$/, '');
  const form = new FormData();
  form.append('image', file);
  const res = await fetch(`${root}/upload/image`, { method: 'POST', body: form });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`ComfyUI upload ${res.status}: ${text.slice(0, 200)}`);
  }
  const data = (await res.json()) as UploadedImage;
  return data;
}