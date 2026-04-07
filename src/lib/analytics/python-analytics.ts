import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

export interface PythonExecutionResult {
  success: boolean;
  output?: string;
  imageUrl?: string;
  error?: string;
  executionTime: number;
}

export class PythonAnalytics {
  private pythonPath: string;
  private tempDir: string;

  constructor() {
    this.pythonPath = process.env.PYTHON_PATH || 'python3';
    this.tempDir = path.join(process.cwd(), 'data', 'temp', 'python-viz');
    this.ensureTempDir();
  }

  private ensureTempDir() {
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  /**
   * Execute Python code and capture output/images
   */
  async execute(
    code: string,
    options?: { timeout?: number; saveImage?: boolean }
  ): Promise<PythonExecutionResult> {
    const startTime = Date.now();
    const timeout = options?.timeout || 30000;

    return new Promise(resolve => {
      // Create a temporary Python script
      const scriptPath = path.join(this.tempDir, `script_${Date.now()}.py`);
      const imagePath = path.join(this.tempDir, `output_${Date.now()}.png`);

      // Wrap the user's code with image saving if requested
      const wrappedCode = options?.saveImage ? this.wrapCodeForImageOutput(code, imagePath) : code;

      fs.writeFileSync(scriptPath, wrappedCode, 'utf-8');

      // Execute Python script
      const pythonProcess = spawn(this.pythonPath, [scriptPath], {
        cwd: this.tempDir,
        env: { ...process.env, PYTHONPATH: this.tempDir },
      });

      let output = '';
      let errorOutput = '';

      pythonProcess.stdout.on('data', data => {
        output += data.toString();
      });

      pythonProcess.stderr.on('data', data => {
        errorOutput += data.toString();
      });

      // Set timeout
      const timeoutId = setTimeout(() => {
        pythonProcess.kill();
        fs.unlinkSync(scriptPath);
        resolve({
          success: false,
          error: 'Python execution timed out',
          executionTime: timeout,
        });
      }, timeout);

      pythonProcess.on('close', code => {
        clearTimeout(timeoutId);

        // Clean up script
        try {
          fs.unlinkSync(scriptPath);
        } catch (e) {
          // Ignore cleanup errors
        }

        const executionTime = Date.now() - startTime;

        if (code === 0) {
          // Check if image was created
          let imageUrl: string | undefined;
          if (options?.saveImage && fs.existsSync(imagePath)) {
            // Convert image to base64 for embedding in HTML
            const imageData = fs.readFileSync(imagePath);
            const base64 = imageData.toString('base64');
            imageUrl = `data:image/png;base64,${base64}`;

            // Clean up image file
            try {
              fs.unlinkSync(imagePath);
            } catch (e) {
              // Ignore
            }
          }

          resolve({
            success: true,
            output: output || 'Execution completed',
            imageUrl,
            executionTime,
          });
        } else {
          resolve({
            success: false,
            error: errorOutput || `Python process exited with code ${code}`,
            executionTime,
          });
        }
      });

      pythonProcess.on('error', err => {
        clearTimeout(timeoutId);
        try {
          fs.unlinkSync(scriptPath);
        } catch (e) {
          // Ignore
        }

        resolve({
          success: false,
          error: `Failed to start Python: ${err.message}. Make sure Python is installed and in PATH.`,
          executionTime: Date.now() - startTime,
        });
      });
    });
  }

  /**
   * Wrap user code to automatically save matplotlib plots
   */
  private wrapCodeForImageOutput(code: string, imagePath: string): string {
    return `
import matplotlib
matplotlib.use('Agg')  # Non-interactive backend
import matplotlib.pyplot as plt
import sys

# User's code
${code}

# Save any current figure
if plt.gcf().get_size_inches().prod() > 0:
    plt.savefig('${imagePath.replace(/\\/g, '\\\\')}', dpi=150, bbox_inches='tight', facecolor='white')
    print(f"Image saved to: ${imagePath}")
plt.close()
`.trim();
  }

  /**
   * Execute Python code with common data science libraries
   */
  async executeWithLibraries(
    code: string,
    libraries: string[] = ['matplotlib', 'networkx', 'pandas', 'numpy']
  ): Promise<PythonExecutionResult> {
    // Add library imports if not present
    const imports = libraries
      .map(lib => {
        if (lib === 'matplotlib')
          return "import matplotlib\nmatplotlib.use('Agg')\nimport matplotlib.pyplot as plt";
        if (lib === 'networkx') return 'import networkx as nx';
        if (lib === 'pandas') return 'import pandas as pd';
        if (lib === 'numpy') return 'import numpy as np';
        if (lib === 'seaborn') return 'import seaborn as sns';
        if (lib === 'plotly') return 'import plotly.graph_objects as go';
        return `import ${lib}`;
      })
      .join('\n');

    const fullCode = `${imports}\n\n${code}`;
    return this.execute(fullCode, { saveImage: true });
  }

  /**
   * Check if Python is available
   */
  async isPythonAvailable(): Promise<boolean> {
    try {
      const { exec } = await import('child_process');
      return new Promise(resolve => {
        exec(`${this.pythonPath} --version`, error => {
          resolve(!error);
        });
      });
    } catch {
      return false;
    }
  }

  /**
   * Get installed Python libraries
   */
  async getInstalledLibraries(): Promise<string[]> {
    const code = `
import pkg_resources
installed = [pkg.key for pkg in pkg_resources.working_set]
print(','.join(installed))
`;
    const result = await this.execute(code);
    if (result.success && result.output) {
      return result.output.trim().split(',');
    }
    return [];
  }
}

export const pythonAnalytics = new PythonAnalytics();
