/**
 * Remotion Video Generation Service
 * 
 * Remotion runs as a separate server for video rendering. This service
 * communicates via REST API to create and render videos programmatically.
 * 
 * Setup:
 * 1. Install and configure Remotion server (see docs/OPTIONAL-INTEGRATIONS.md)
 * 2. Set REMOTION_API_URL and REMOTION_API_KEY in .env
 * 3. Configure webhook URL for render completion notifications
 */

export interface RemotionStatus {
  connected: boolean;
  version?: string;
  compositions?: string[];
  queueLength?: number;
  error?: string;
}

export interface VideoRenderOptions {
  template: string;
  composition: string;
  props: Record<string, any>;
  format: 'mp4' | 'webm' | 'gif';
  quality?: 'low' | 'medium' | 'high' | 'ultra';
  fps?: number;
  durationInFrames?: number;
  width?: number;
  height?: number;
  audio?: {
    src: string;
    volume?: number;
  };
  // AI-generated content
  aiPrompt?: string;
  aiGenerated?: boolean;
}

export interface RenderStatus {
  renderId: string;
  status: 'pending' | 'rendering' | 'done' | 'failed';
  progress: number; // 0-100
  currentFrame?: number;
  totalFrames?: number;
  estimatedTimeRemaining?: number; // seconds
  error?: string;
  outputUrl?: string;
  createdAt: number;
  completedAt?: number;
}

export interface VideoTemplate {
  id: string;
  name: string;
  description: string;
  compositionId: string;
  defaultProps: Record<string, any>;
  requiredProps: string[];
  optionalProps: string[];
  durationRange?: { min: number; max: number };
  thumbnail?: string;
}

export interface Composition {
  id: string;
  name: string;
  width: number;
  height: number;
  fps: number;
  durationInFrames: number;
  defaultProps: Record<string, any>;
}

class RemotionService {
  private static instance: RemotionService;
  private baseUrl: string;
  private apiKey: string | undefined;
  private webhookUrl: string | undefined;
  private timeout: number = 300000; // 5 minutes for renders

  private constructor() {
    this.baseUrl = process.env.REMOTION_API_URL || 'http://localhost:3001';
    this.apiKey = process.env.REMOTION_API_KEY;
    this.webhookUrl = process.env.REMOTION_WEBHOOK_URL;
  }

  static getInstance(): RemotionService {
    if (!RemotionService.instance) {
      RemotionService.instance = new RemotionService();
    }
    return RemotionService.instance;
  }

  private async request(
    endpoint: string,
    method: 'GET' | 'POST' | 'DELETE' = 'GET',
    body?: any
  ): Promise<any> {
    const url = `${this.baseUrl}/api${endpoint}`;
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Remotion API error: ${response.status} ${error}`);
      }

      const text = await response.text();
      
      if (!text) {
        return { success: true };
      }

      return JSON.parse(text);
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Remotion request timed out');
      }
      throw error;
    }
  }

  async checkStatus(): Promise<RemotionStatus> {
    try {
      const response = await this.request('/status');
      return {
        connected: true,
        version: response.version,
        compositions: response.compositions,
        queueLength: response.queueLength,
      };
    } catch (error) {
      return {
        connected: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async listCompositions(): Promise<Composition[]> {
    const response = await this.request('/compositions');
    return response.compositions || [];
  }

  async listTemplates(): Promise<VideoTemplate[]> {
    const response = await this.request('/templates');
    return response.templates || [];
  }

  async createVideo(options: VideoRenderOptions): Promise<{ renderId: string }> {
    const response = await this.request('/render', 'POST', {
      composition: options.composition,
      inputProps: options.props,
      outputFormat: options.format,
      quality: options.quality || 'medium',
      fps: options.fps,
      frames: options.durationInFrames,
      width: options.width,
      height: options.height,
      audio: options.audio,
      webhook: this.webhookUrl,
      metadata: {
        template: options.template,
        aiGenerated: options.aiGenerated,
        aiPrompt: options.aiPrompt,
      },
    });

    return {
      renderId: response.renderId || response.render_id,
    };
  }

  async getRenderStatus(renderId: string): Promise<RenderStatus> {
    const response = await this.request(`/render/${renderId}`);
    
    return {
      renderId,
      status: response.status,
      progress: response.progress || 0,
      currentFrame: response.currentFrame || response.current_frame,
      totalFrames: response.totalFrames || response.total_frames,
      estimatedTimeRemaining: response.estimatedTimeRemaining,
      error: response.error,
      outputUrl: response.outputUrl || response.output_url,
      createdAt: response.createdAt || response.created_at,
      completedAt: response.completedAt || response.completed_at,
    };
  }

  async getDownloadUrl(renderId: string): Promise<string> {
    const response = await this.request(`/render/${renderId}/download`);
    return response.downloadUrl || response.download_url;
  }

  async cancelRender(renderId: string): Promise<boolean> {
    const response = await this.request(`/render/${renderId}`, 'DELETE');
    return response.success === true;
  }

  async previewComposition(
    compositionId: string,
    props: Record<string, any>
  ): Promise<{ previewUrl: string }> {
    const response = await this.request('/preview', 'POST', {
      composition: compositionId,
      inputProps: props,
    });

    return {
      previewUrl: response.previewUrl || response.preview_url,
    };
  }

  async renderFromAiPrompt(
    prompt: string,
    options?: {
      template?: string;
      duration?: number;
      format?: 'mp4' | 'webm' | 'gif';
    }
  ): Promise<{ renderId: string; interpretation: any }> {
    const response = await this.request('/ai/render', 'POST', {
      prompt,
      template: options?.template || 'slideshow',
      duration: options?.duration || 30,
      format: options?.format || 'mp4',
    });

    return {
      renderId: response.renderId,
      interpretation: response.interpretation,
    };
  }

  isConfigured(): boolean {
    return !!this.baseUrl;
  }

  getApiUrl(): string {
    return this.baseUrl;
  }
}

export const remotionService = RemotionService.getInstance();