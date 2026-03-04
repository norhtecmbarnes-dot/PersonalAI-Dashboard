import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface BrowserSnapshot {
  elements: BrowserElement[];
  url: string;
  title: string;
}

export interface BrowserElement {
  ref: string;
  type: string;
  name?: string;
  text?: string;
  value?: string;
  placeholder?: string;
  tagName: string;
  isInteractive: boolean;
  attributes: Record<string, string>;
}

export interface AgentBrowserOptions {
  session?: string;
  timeout?: number;
  headed?: boolean;
  json?: boolean;
}

export interface FormFillOptions {
  url: string;
  fields: Array<{
    selector: string;
    value: string;
    type?: 'text' | 'select' | 'checkbox';
  }>;
  submitSelector?: string;
  waitForNavigation?: boolean;
}

class AgentBrowserService {
  private installed: boolean | null = null;
  private currentSession: string | null = null;

  async checkInstalled(): Promise<boolean> {
    if (this.installed !== null) return this.installed;
    
    try {
      const { stdout } = await execAsync('agent-browser --version');
      console.log('[AgentBrowser] Version:', stdout.trim());
      this.installed = true;
    } catch {
      console.log('[AgentBrowser] Not installed. Install with: npm install -g agent-browser && agent-browser install');
      this.installed = false;
    }
    
    return this.installed;
  }

  async install(): Promise<boolean> {
    try {
      console.log('[AgentBrowser] Installing...');
      await execAsync('npm install -g agent-browser');
      await execAsync('agent-browser install');
      this.installed = true;
      console.log('[AgentBrowser] Installed successfully');
      return true;
    } catch (error) {
      console.error('[AgentBrowser] Installation failed:', error);
      return false;
    }
  }

  async open(url: string, options: AgentBrowserOptions = {}): Promise<{ success: boolean; message: string }> {
    if (!await this.checkInstalled()) {
      return { success: false, message: 'Agent-browser not installed. Run: npm install -g agent-browser && agent-browser install' };
    }

    try {
      let cmd = 'agent-browser open';
      if (options.session) cmd += ` --session ${options.session}`;
      if (options.headed) cmd += ' --headed';
      cmd += ` "${url}"`;

      const { stdout } = await execAsync(cmd, { timeout: options.timeout || 30000 });
      this.currentSession = options.session || 'default';
      
      return { success: true, message: stdout.trim() || 'Page opened' };
    } catch (error) {
      return { 
        success: false, 
        message: `Failed to open page: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }

  async snapshot(options: AgentBrowserOptions = {}): Promise<BrowserSnapshot> {
    if (!await this.checkInstalled()) {
      throw new Error('Agent-browser not installed');
    }

    try {
      let cmd = 'agent-browser snapshot -i';
      if (options.session) cmd += ` --session ${options.session}`;
      cmd += ' --json';

      const { stdout } = await execAsync(cmd, { timeout: options.timeout || 10000 });
      const data = JSON.parse(stdout);
      
      return {
        elements: this.parseElements(data),
        url: data.url || '',
        title: data.title || '',
      };
    } catch (error) {
      throw new Error(`Snapshot failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async click(ref: string, options: AgentBrowserOptions = {}): Promise<boolean> {
    if (!await this.checkInstalled()) return false;

    try {
      let cmd = `agent-browser click ${ref}`;
      if (options.session) cmd += ` --session ${options.session}`;
      
      await execAsync(cmd, { timeout: options.timeout || 5000 });
      return true;
    } catch {
      return false;
    }
  }

  async fill(ref: string, value: string, options: AgentBrowserOptions = {}): Promise<boolean> {
    if (!await this.checkInstalled()) return false;

    try {
      let cmd = `agent-browser fill ${ref} "${value.replace(/"/g, '\\"')}"`;
      if (options.session) cmd += ` --session ${options.session}`;
      
      await execAsync(cmd, { timeout: options.timeout || 5000 });
      return true;
    } catch {
      return false;
    }
  }

  async type(ref: string, value: string, options: AgentBrowserOptions = {}): Promise<boolean> {
    if (!await this.checkInstalled()) return false;

    try {
      let cmd = `agent-browser type ${ref} "${value.replace(/"/g, '\\"')}"`;
      if (options.session) cmd += ` --session ${options.session}`;
      
      await execAsync(cmd, { timeout: options.timeout || 5000 });
      return true;
    } catch {
      return false;
    }
  }

  async press(key: string, options: AgentBrowserOptions = {}): Promise<boolean> {
    if (!await this.checkInstalled()) return false;

    try {
      let cmd = `agent-browser press ${key}`;
      if (options.session) cmd += ` --session ${options.session}`;
      
      await execAsync(cmd, { timeout: options.timeout || 5000 });
      return true;
    } catch {
      return false;
    }
  }

  async wait(selector: string | number, options: AgentBrowserOptions = {}): Promise<boolean> {
    if (!await this.checkInstalled()) return false;

    try {
      let cmd = typeof selector === 'number' 
        ? `agent-browser wait ${selector}` 
        : `agent-browser wait ${selector}`;
      if (options.session) cmd += ` --session ${options.session}`;
      
      await execAsync(cmd, { timeout: options.timeout || 30000 });
      return true;
    } catch {
      return false;
    }
  }

  async getText(ref: string, options: AgentBrowserOptions = {}): Promise<string> {
    if (!await this.checkInstalled()) return '';

    try {
      let cmd = `agent-browser get text ${ref} --json`;
      if (options.session) cmd += ` --session ${options.session}`;
      
      const { stdout } = await execAsync(cmd, { timeout: options.timeout || 5000 });
      const data = JSON.parse(stdout);
      return data.text || '';
    } catch {
      return '';
    }
  }

  async screenshot(path?: string, options: AgentBrowserOptions = {}): Promise<Buffer | null> {
    if (!await this.checkInstalled()) return null;

    try {
      let cmd = 'agent-browser screenshot';
      if (path) cmd += ` ${path}`;
      if (options.session) cmd += ` --session ${options.session}`;
      cmd += ' --full';
      
      await execAsync(cmd, { timeout: options.timeout || 10000 });
      
      if (path) {
        const fs = await import('fs');
        return fs.promises.readFile(path);
      }
      return null;
    } catch {
      return null;
    }
  }

  async getState(options: AgentBrowserOptions = {}): Promise<{ url: string; title: string }> {
    if (!await this.checkInstalled()) {
      return { url: '', title: '' };
    }

    try {
      const urlCmd = 'agent-browser get url' + (options.session ? ` --session ${options.session}` : '');
      const titleCmd = 'agent-browser get title' + (options.session ? ` --session ${options.session}` : '');
      
      const [{ stdout: url }, { stdout: title }] = await Promise.all([
        execAsync(urlCmd, { timeout: 5000 }),
        execAsync(titleCmd, { timeout: 5000 }),
      ]);
      
      return { 
        url: url.trim(), 
        title: title.trim() 
      };
    } catch {
      return { url: '', title: '' };
    }
  }

  async close(options: AgentBrowserOptions = {}): Promise<void> {
    try {
      let cmd = 'agent-browser close';
      if (options.session) cmd += ` --session ${options.session}`;
      await execAsync(cmd, { timeout: 5000 });
    } catch {
      // Ignore close errors
    }
  }

  async fillForm(options: FormFillOptions): Promise<{ success: boolean; message: string; url?: string }> {
    if (!await this.checkInstalled()) {
      return { success: false, message: 'Agent-browser not installed' };
    }

    try {
      // Open the page
      const openResult = await this.open(options.url);
      if (!openResult.success) {
        return openResult;
      }

      // Wait for page load
      await this.wait(2000);

      // Get interactive elements
      const snapshot = await this.snapshot();

      // Fill each field
      for (const field of options.fields) {
        const element = this.findElement(snapshot.elements, field.selector);
        if (!element) {
          return { success: false, message: `Element not found: ${field.selector}` };
        }

        if (field.type === 'checkbox') {
          await this.click(element.ref);
        } else if (field.type === 'select') {
          // Handle select dropdown
          await execAsync(`agent-browser select ${element.ref} "${field.value}"`);
        } else {
          await this.fill(element.ref, field.value);
        }
      }

      // Submit if requested
      if (options.submitSelector) {
        await this.click(options.submitSelector);
        
        if (options.waitForNavigation) {
          await this.wait(3000);
        }
      }

      const state = await this.getState();
      return { 
        success: true, 
        message: 'Form filled successfully',
        url: state.url 
      };
    } catch (error) {
      return { 
        success: false, 
        message: `Form fill failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }

  private parseElements(data: any): BrowserElement[] {
    const elements: BrowserElement[] = [];
    
    if (!data.elements || !Array.isArray(data.elements)) {
      return elements;
    }

    for (const el of data.elements) {
      elements.push({
        ref: el.ref || `@e${elements.length + 1}`,
        type: el.type || el.role || 'unknown',
        name: el.name,
        text: el.text || el.textContent,
        value: el.value,
        placeholder: el.placeholder,
        tagName: el.tagName || el.tagName,
        isInteractive: el.interactive !== false,
        attributes: el.attributes || {},
      });
    }

    return elements;
  }

  private findElement(elements: BrowserElement[], selector: string): BrowserElement | null {
    // Try ref first
    if (selector.startsWith('@')) {
      return elements.find(e => e.ref === selector) || null;
    }

    // Try by name, text, or attributes
    return elements.find(e => 
      e.name === selector ||
      e.text?.includes(selector) ||
      e.attributes.id === selector ||
      e.attributes.name === selector
    ) || null;
  }

  async extractData(url: string, selectors: Record<string, string>): Promise<Record<string, string>> {
    if (!await this.checkInstalled()) {
      return {};
    }

    try {
      await this.open(url);
      await this.wait(2000);
      
      const snapshot = await this.snapshot();
      const data: Record<string, string> = {};

      for (const [key, selector] of Object.entries(selectors)) {
        const element = this.findElement(snapshot.elements, selector);
        if (element) {
          data[key] = await this.getText(element.ref);
        }
      }

      return data;
    } catch {
      return {};
    }
  }

  async saveState(path: string): Promise<boolean> {
    try {
      await execAsync(`agent-browser state save ${path}`);
      return true;
    } catch {
      return false;
    }
  }

  async loadState(path: string): Promise<boolean> {
    try {
      await execAsync(`agent-browser state load ${path}`);
      return true;
    } catch {
      return false;
    }
  }
}

export const agentBrowserService = new AgentBrowserService();

// Tool definition for AI to use
export const agentBrowserToolDefinition = {
  type: 'function' as const,
  function: {
    name: 'browser_automate',
    description: 'Automate browser interactions using agent-browser CLI. Navigate, click, type, fill forms, extract data from web pages.',
    parameters: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['open', 'click', 'fill', 'type', 'press', 'snapshot', 'wait', 'get', 'close', 'screenshot'],
          description: 'The browser action to perform',
        },
        url: {
          type: 'string',
          description: 'URL to open (for open action)',
        },
        ref: {
          type: 'string',
          description: 'Element reference from snapshot (for click, fill, type actions)',
        },
        value: {
          type: 'string',
          description: 'Value to type or fill',
        },
        key: {
          type: 'string',
          description: 'Key to press (for press action)',
        },
        selector: {
          type: 'string',
          description: 'CSS selector or element description',
        },
      },
      required: ['action'],
    },
  },
};

export async function executeBrowserTool(args: {
  action: 'open' | 'click' | 'fill' | 'type' | 'press' | 'snapshot' | 'wait' | 'get' | 'close' | 'screenshot';
  url?: string;
  ref?: string;
  value?: string;
  key?: string;
  selector?: string;
}): Promise<string> {
  const service = agentBrowserService;

  switch (args.action) {
    case 'open':
      if (!args.url) return 'Error: URL required for open action';
      const openResult = await service.open(args.url);
      return openResult.message;

    case 'snapshot':
      const snapshot = await service.snapshot();
      const elements = snapshot.elements
        .filter(e => e.isInteractive)
        .slice(0, 20)
        .map(e => `${e.ref}: ${e.type} "${e.text || e.name || ''}"`)
        .join('\n');
      return `Page: ${snapshot.title}\nURL: ${snapshot.url}\n\nInteractive Elements:\n${elements}`;

    case 'click':
      if (!args.ref) return 'Error: ref required for click action';
      const clicked = await service.click(args.ref);
      return clicked ? `Clicked ${args.ref}` : `Failed to click ${args.ref}`;

    case 'fill':
      if (!args.ref || !args.value) return 'Error: ref and value required for fill action';
      const filled = await service.fill(args.ref, args.value);
      return filled ? `Filled ${args.ref} with "${args.value}"` : `Failed to fill ${args.ref}`;

    case 'type':
      if (!args.ref || !args.value) return 'Error: ref and value required for type action';
      const typed = await service.type(args.ref, args.value);
      return typed ? `Typed "${args.value}" into ${args.ref}` : `Failed to type into ${args.ref}`;

    case 'press':
      if (!args.key) return 'Error: key required for press action';
      const pressed = await service.press(args.key);
      return pressed ? `Pressed ${args.key}` : `Failed to press ${args.key}`;

    case 'wait':
      await service.wait(args.ref ? parseInt(args.ref) : 2000);
      return 'Waited';

    case 'get':
      if (!args.ref) return 'Error: ref required for get action';
      const text = await service.getText(args.ref);
      return text || 'No text found';

    case 'close':
      await service.close();
      return 'Browser closed';

    case 'screenshot':
      const buffer = await service.screenshot();
      return buffer ? 'Screenshot taken' : 'Failed to take screenshot';

    default:
      return `Unknown action: ${args.action}`;
  }
}