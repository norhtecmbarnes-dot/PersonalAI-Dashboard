/**
 * Tool Inventory — what the self-education system watches for upgrades.
 *
 * A declarative list of the tools, runtimes, libraries, and models the dashboard
 * depends on, each with a machine-checkable source (GitHub repo / npm package).
 * Code fetches the *facts* (latest release, version); models only summarise and
 * judge. See docs/SELF-EDUCATION.md and book/Chapter-25.
 *
 * Add a tool you care about here and it joins the upgrade watch automatically.
 */

export type ToolCategory = 'runtime' | 'framework' | 'library' | 'model' | 'service';
export type ToolSource = 'github' | 'npm' | 'web';

export interface TrackedTool {
  id: string;
  name: string;
  category: ToolCategory;
  /** Where the latest-version fact comes from. */
  source: ToolSource;
  /** GitHub "owner/name" when source === 'github'. */
  repo?: string;
  /** npm package name when source === 'npm'. */
  npm?: string;
  /** Why the system cares — used by the summariser and the report. */
  why?: string;
  /** What subsystem uses it (for grouping in the report). */
  usedBy?: string;
}

export const TOOL_INVENTORY: TrackedTool[] = [
  // --- Director / media pipeline (the user's example: ComfyUI + MiniMax H3) ---
  {
    id: 'comfyui',
    name: 'ComfyUI',
    category: 'service',
    source: 'github',
    repo: 'comfyanonymous/ComfyUI',
    why: 'Runs the MiniMax H3 video and avatar graphs for the Director dashboard.',
    usedBy: 'Director',
  },
  {
    id: 'comfyui-manager',
    name: 'ComfyUI-Manager',
    category: 'service',
    source: 'github',
    repo: 'ltdrdata/ComfyUI-Manager',
    why: 'Manages ComfyUI custom nodes and model downloads.',
    usedBy: 'Director',
  },

  // --- Local inference ---
  {
    id: 'ollama',
    name: 'Ollama',
    category: 'runtime',
    source: 'github',
    repo: 'ollama/ollama',
    why: 'Runs the local models the whole dashboard depends on (local-first).',
    usedBy: 'All',
  },
  {
    id: 'llama.cpp',
    name: 'llama.cpp',
    category: 'runtime',
    source: 'github',
    repo: 'ggml-org/llama.cpp',
    why: 'Alternative local inference backend; GGUF support.',
    usedBy: 'All',
  },

  // --- App framework & core libraries ---
  {
    id: 'next.js',
    name: 'Next.js',
    category: 'framework',
    source: 'github',
    repo: 'vercel/next.js',
    why: 'The dashboard framework; security and performance fixes matter.',
    usedBy: 'All',
  },
  {
    id: 'better-sqlite3',
    name: 'better-sqlite3',
    category: 'library',
    source: 'github',
    repo: 'WiseLibs/better-sqlite3',
    why: 'The native SQLite driver; must match the Node ABI (Node 24).',
    usedBy: 'All',
  },
  {
    id: 'mcp-sdk',
    name: 'MCP TypeScript SDK',
    category: 'library',
    source: 'github',
    repo: 'modelcontextprotocol/typescript-sdk',
    why: 'Powers the dashboard-as-tools MCP server.',
    usedBy: 'Agent integration',
  },
  {
    id: 'playwright',
    name: 'Playwright',
    category: 'library',
    source: 'github',
    repo: 'microsoft/playwright',
    why: 'Browser automation for the dashboard and the agentic browser work.',
    usedBy: 'Browser',
  },

  // --- Document / media generation ---
  {
    id: 'three.js',
    name: 'three.js',
    category: 'library',
    source: 'github',
    repo: 'mrdoob/three.js',
    why: 'WebGL for the Star Raiders game.',
    usedBy: 'Games',
  },
  {
    id: 'tesseract.js',
    name: 'tesseract.js',
    category: 'library',
    source: 'github',
    repo: 'naptha/tesseract.js',
    why: 'OCR for scanned solicitation documents.',
    usedBy: 'Documents',
  },
];

/** A model the system uses (tracked by name; upgraded by pulling a newer tag). */
export interface TrackedModel {
  id: string;
  name: string;
  role: 'local' | 'cloud' | 'media';
  why: string;
}

export const MODEL_INVENTORY: TrackedModel[] = [
  {
    id: 'gemma4',
    name: 'gemma4 (local)',
    role: 'local',
    why: 'Default local model.',
  },
  {
    id: 'qwen3.5',
    name: 'qwen3.5 (local)',
    role: 'local',
    why: 'Fast local model used by the chat tool loop.',
  },
  {
    id: 'minimax-h3',
    name: 'MiniMax H3',
    role: 'media',
    why: 'Video generation model for the Director dashboard.',
  },
];

/** Group the inventory by the subsystem that uses it (for the report). */
export function inventoryBySubsystem(): Record<string, TrackedTool[]> {
  const out: Record<string, TrackedTool[]> = {};
  for (const t of TOOL_INVENTORY) {
    const key = t.usedBy || 'Other';
    (out[key] ||= []).push(t);
  }
  return out;
}
