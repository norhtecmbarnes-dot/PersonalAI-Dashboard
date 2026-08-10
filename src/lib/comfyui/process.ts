export const runtime = 'nodejs';

import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import fs from 'fs';

export interface ComfyProcessStatus {
  running: boolean;
  pid?: number;
  starting: boolean;
  stopping: boolean;
  error?: string;
  startedAt?: number;
}

class ComfyProcessManager {
  private proc: ChildProcess | null = null;
  private starting = false;
  private stopping = false;
  private startedAt: number | null = null;
  private lastError: string | null = null;

  private resolvePaths() {
    const python = process.env.COMFYUI_PYTHON || 'C:\\ComfyUI\\venv\\Scripts\\python.exe';
    const comfyDir = process.env.COMFYUI_DIR || 'C:\\ComfyUI\\ComfyUI';
    const args = (process.env.COMFYUI_ARGS || '--listen 0.0.0.0 --port 8188').split(/\s+/);
    const mainScript = path.join(comfyDir, 'main.py');

    if (!fs.existsSync(python)) {
      throw new Error(`Python not found at ${python}. Set COMFYUI_PYTHON env var.`);
    }
    if (!fs.existsSync(mainScript)) {
      throw new Error(`ComfyUI main.py not found at ${mainScript}. Set COMFYUI_DIR env var.`);
    }

    return { python, comfyDir, args, mainScript };
  }

  async start(): Promise<ComfyProcessStatus> {
    if (this.proc && !this.proc.killed) {
      return this.getStatus();
    }
    if (this.starting) {
      return this.getStatus();
    }

    this.starting = true;
    this.lastError = null;

    try {
      const { python, comfyDir, args, mainScript } = this.resolvePaths();

      this.proc = spawn(python, [mainScript, ...args], {
        cwd: comfyDir,
        stdio: 'ignore',
        detached: false,
        windowsHide: true,
      });

      this.startedAt = Date.now();

      this.proc.on('error', (err: Error) => {
        this.lastError = err.message;
        this.proc = null;
        this.starting = false;
      });

      this.proc.on('exit', (code: number | null) => {
        if (code !== 0 && code !== null) {
          this.lastError = `ComfyUI exited with code ${code}`;
        }
        this.proc = null;
        this.starting = false;
        this.startedAt = null;
      });

      this.starting = false;
      return this.getStatus();
    } catch (error) {
      this.starting = false;
      this.lastError = error instanceof Error ? error.message : String(error);
      throw error;
    }
  }

  async stop(): Promise<ComfyProcessStatus> {
    if (!this.proc) {
      return this.getStatus();
    }
    if (this.stopping) {
      return this.getStatus();
    }

    this.stopping = true;

    return new Promise((resolve) => {
      const proc = this.proc;
      if (!proc) {
        this.stopping = false;
        resolve(this.getStatus());
        return;
      }

      const forceKillTimer = setTimeout(() => {
        try {
          proc.kill('SIGKILL');
        } catch {}
      }, 5000);

      proc.on('exit', () => {
        clearTimeout(forceKillTimer);
        this.proc = null;
        this.stopping = false;
        this.startedAt = null;
        resolve(this.getStatus());
      });

      try {
        proc.kill('SIGTERM');
      } catch {
        try {
          proc.kill('SIGKILL');
        } catch {}
      }
    });
  }

  async restart(): Promise<ComfyProcessStatus> {
    await this.stop();
    await new Promise((r) => setTimeout(r, 1000));
    return this.start();
  }

  getStatus(): ComfyProcessStatus {
    return {
      running: !!(this.proc && !this.proc.killed),
      pid: this.proc?.pid,
      starting: this.starting,
      stopping: this.stopping,
      error: this.lastError || undefined,
      startedAt: this.startedAt || undefined,
    };
  }
}

const manager = new ComfyProcessManager();
export const comfyProcessManager = manager;