/**
 * BitNet Service - 1-bit LLM Inference
 * 
 * BitNet is a 1.58-bit quantized model that runs efficiently on CPU.
 * This service provides integration with Microsoft's BitNet inference framework.
 * 
 * Requirements:
 * - BitNet installed in a directory (configurable)
 * - Python 3.9+ with required packages
 * - Clang 18+ or Visual Studio 2022 (Windows)
 * 
 * Setup:
 * 1. Run: npm run bitnet:setup
 * 2. Or manually: git clone --recursive https://github.com/microsoft/BitNet.git
 * 3. Configure path in Settings → Models
 */

import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

export interface BitNetConfig {
  enabled: boolean;
  installPath: string;
  modelPath: string;
  model: string;
  threads: number;
  contextSize: number;
  temperature: number;
}

export interface BitNetModel {
  id: string;
  name: string;
  parameters: string;
  filename: string;
  description: string;
}

export const BITNET_MODELS: BitNetModel[] = [
  {
    id: 'bitnet-b1.58-2b',
    name: 'BitNet b1.58 2B',
    parameters: '2.4B',
    filename: 'ggml-model-i2_s.gguf',
    description: 'Official Microsoft BitNet model, optimized for CPU inference'
  },
  {
    id: 'bitnet-b1.58-large',
    name: 'BitNet b1.58 Large',
    parameters: '0.7B',
    filename: 'ggml-model-i2_s.gguf',
    description: 'Smaller BitNet model for faster inference'
  },
  {
    id: 'bitnet-b1.58-3b',
    name: 'BitNet b1.58 3B',
    parameters: '3.3B',
    filename: 'ggml-model-i2_s.gguf',
    description: 'Larger BitNet model with better quality'
  },
  {
    id: 'llama3-8b-1.58',
    name: 'Llama3 8B 1.58-bit',
    parameters: '8B',
    filename: 'ggml-model-i2_s.gguf',
    description: 'Llama3 quantized to 1.58 bits'
  },
  {
    id: 'falcon3-1b-1.58',
    name: 'Falcon3 1B 1.58-bit',
    parameters: '1B',
    filename: 'ggml-model-i2_s.gguf',
    description: 'Falcon3 quantized to 1.58 bits'
  },
];

const DEFAULT_CONFIG: BitNetConfig = {
  enabled: false,
  installPath: '',
  modelPath: '',
  model: 'bitnet-b1.58-2b',
  threads: 4,
  contextSize: 4096,
  temperature: 0.7,
};

class BitNetService {
  private config: BitNetConfig;
  private process: ChildProcess | null = null;
  private isRunning: boolean = false;

  constructor() {
    this.config = { ...DEFAULT_CONFIG };
    this.loadConfig();
  }

  private loadConfig(): void {
    try {
      const { sqlDatabase } = require('../database/sqlite');
      sqlDatabase.initialize();
      const savedPath = sqlDatabase.getSetting('bitnet_install_path');
      const savedModel = sqlDatabase.getSetting('bitnet_model');
      const enabled = sqlDatabase.getSetting('bitnet_enabled');
      
      if (savedPath) this.config.installPath = savedPath;
      if (savedModel) this.config.model = savedModel;
      if (enabled === 'true') this.config.enabled = true;
      
      if (this.config.installPath && this.config.model) {
        const modelInfo = BITNET_MODELS.find(m => m.id === this.config.model);
        if (modelInfo) {
          this.config.modelPath = path.join(
            this.config.installPath,
            'models',
            this.getModelDirName(this.config.model),
            modelInfo.filename
          );
        }
      }
    } catch (error) {
      console.log('[BitNet] Could not load config from database');
    }
  }

  private getModelDirName(modelId: string): string {
    const modelDirMap: Record<string, string> = {
      'bitnet-b1.58-2b': 'BitNet-b1.58-2B-4T',
      'bitnet-b1.58-large': 'BitNet-b1.58-large',
      'bitnet-b1.58-3b': 'BitNet-b1.58-3B',
      'llama3-8b-1.58': 'Llama3-8B-1.58-100B-tokens',
      'falcon3-1b-1.58': 'Falcon3-1B-Instruct-1.58bit',
    };
    return modelDirMap[modelId] || modelId;
  }

  saveConfig(newConfig: Partial<BitNetConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    try {
      const { sqlDatabase } = require('../database/sqlite');
      sqlDatabase.initialize();
      
      if (newConfig.installPath !== undefined) {
        sqlDatabase.setSetting('bitnet_install_path', newConfig.installPath, 'models');
      }
      if (newConfig.model !== undefined) {
        sqlDatabase.setSetting('bitnet_model', newConfig.model, 'models');
      }
      if (newConfig.enabled !== undefined) {
        sqlDatabase.setSetting('bitnet_enabled', String(newConfig.enabled), 'models');
      }
    } catch (error) {
      console.error('[BitNet] Failed to save config:', error);
    }
  }

  getConfig(): BitNetConfig {
    return { ...this.config };
  }

  isConfigured(): boolean {
    return !!(
      this.config.installPath &&
      fs.existsSync(this.config.installPath) &&
      fs.existsSync(path.join(this.config.installPath, 'run_inference.py'))
    );
  }

  async checkInstallation(installPath: string): Promise<{
    installed: boolean;
    python: boolean;
    model: boolean;
    error?: string;
  }> {
    const result = {
      installed: false,
      python: false,
      model: false,
    };

    try {
      if (!fs.existsSync(installPath)) {
        return { ...result, error: 'BitNet directory not found' };
      }

      const inferencePath = path.join(installPath, 'run_inference.py');
      if (!fs.existsSync(inferencePath)) {
        return { ...result, error: 'run_inference.py not found' };
      }

      result.installed = true;

      try {
        await this.runCommand('python', ['--version'], installPath);
        result.python = true;
      } catch {
        try {
          await this.runCommand('python3', ['--version'], installPath);
          result.python = true;
        } catch {
          return { ...result, error: 'Python not found. Install Python 3.9+' };
        }
      }

      const modelInfo = BITNET_MODELS.find(m => m.id === this.config.model);
      if (modelInfo) {
        const modelPath = path.join(
          installPath,
          'models',
          this.getModelDirName(this.config.model),
          modelInfo.filename
        );
        result.model = fs.existsSync(modelPath);
      }

      return result;
    } catch (error) {
      return { ...result, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  private runCommand(command: string, args: string[], cwd: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const proc = spawn(command, args, { cwd, shell: true });
      let stdout = '';
      let stderr = '';

      proc.stdout?.on('data', (data) => (stdout += data));
      proc.stderr?.on('data', (data) => (stderr += data));

      proc.on('close', (code) => {
        if (code === 0) {
          resolve(stdout);
        } else {
          reject(new Error(stderr || `Command failed with code ${code}`));
        }
      });

      proc.on('error', reject);
    });
  }

  async inference(
    prompt: string,
    options?: {
      conversation?: boolean;
      maxTokens?: number;
      temperature?: number;
    }
  ): Promise<string> {
    if (!this.isConfigured()) {
      throw new Error('BitNet not configured. Run setup or configure in Settings.');
    }

    const modelInfo = BITNET_MODELS.find(m => m.id === this.config.model);
    if (!modelInfo) {
      throw new Error(`Unknown model: ${this.config.model}`);
    }

    const modelPath = path.join(
      this.config.installPath,
      'models',
      this.getModelDirName(this.config.model),
      modelInfo.filename
    );

    if (!fs.existsSync(modelPath)) {
      throw new Error(`Model not found at ${modelPath}. Run setup to download.`);
    }

    const args = [
      'run_inference.py',
      '-m', modelPath,
      '-p', prompt,
      '-t', String(this.config.threads),
      '-c', String(this.config.contextSize),
      '-temp', String(options?.temperature ?? this.config.temperature),
      '-n', String(options?.maxTokens ?? 256),
    ];

    if (options?.conversation) {
      args.push('-cnv');
    }

    return new Promise((resolve, reject) => {
      let output = '';
      let errorOutput = '';

      this.process = spawn('python', args, {
        cwd: this.config.installPath,
      });
      this.isRunning = true;

      this.process.stdout?.on('data', (data) => {
        output += data.toString();
      });

      this.process.stderr?.on('data', (data) => {
        errorOutput += data.toString();
      });

      this.process.on('close', (code) => {
        this.isRunning = false;
        this.process = null;

        if (code === 0) {
          const lines = output.split('\n');
          const response = lines
            .filter((line: string) => !line.startsWith('[') && line.trim())
            .slice(-1)
            .join('\n')
            .trim();
          resolve(response || output);
        } else {
          reject(new Error(errorOutput || `Inference failed with code ${code}`));
        }
      });

      this.process.on('error', (error: Error) => {
        this.isRunning = false;
        this.process = null;
        reject(error);
      });
    });
  }

  stopInference(): void {
    if (this.process && this.isRunning) {
      this.process.kill('SIGTERM');
      this.process = null;
      this.isRunning = false;
    }
  }

  getAvailableModels(): BitNetModel[] {
    return BITNET_MODELS;
  }

  getStatus(): {
    configured: boolean;
    installed: boolean;
    modelReady: boolean;
    running: boolean;
  } {
    const modelInfo = BITNET_MODELS.find(m => m.id === this.config.model);
    let modelReady = false;

    if (this.config.installPath && modelInfo) {
      const modelPath = path.join(
        this.config.installPath,
        'models',
        this.getModelDirName(this.config.model),
        modelInfo.filename
      );
      modelReady = fs.existsSync(modelPath);
    }

    return {
      configured: !!this.config.installPath,
      installed: this.isConfigured(),
      modelReady,
      running: this.isRunning,
    };
  }
}

export const bitnetService = new BitNetService();