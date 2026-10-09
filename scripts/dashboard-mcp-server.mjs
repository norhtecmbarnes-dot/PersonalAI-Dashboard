#!/usr/bin/env node
/**
 * Dashboard MCP server — Pattern 2 (dashboard-as-tools).
 *
 * Exposes the Proposal Genie dashboard's own data as MCP tools, so ANY
 * MCP-capable agent (Hermes, Claude Code, Cursor, …) can use what the dashboard
 * knows. It talks to the running dashboard over HTTP — it does not read the
 * database directly, so it inherits the dashboard's own API behaviour.
 *
 * Run it (Hermes spawns it automatically once configured):
 *     node scripts/dashboard-mcp-server.mjs
 *
 * Configure by adding to ~/.hermes/config.yaml:
 *     mcp_servers:
 *       proposal_genie:
 *         command: "node"
 *         args: ["C:/ai/proposal genie/PersonalAI-Dashboard/scripts/dashboard-mcp-server.mjs"]
 *         env:
 *           DASHBOARD_URL: "http://localhost:3000"
 *
 * See docs/AGENT-INTEGRATION.md and book/Chapter-23 for the full walkthrough.
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

const BASE = (process.env.DASHBOARD_URL || 'http://localhost:3000').replace(/\/+$/, '');

/** GET a dashboard API path and parse JSON. Throws on non-2xx. */
async function api(path) {
  const url = `${BASE}${path}`;
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Dashboard ${path} -> HTTP ${res.status}: ${text.slice(0, 300)}`);
  }
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

const textResult = (obj) => ({
  content: [{ type: 'text', text: typeof obj === 'string' ? obj : JSON.stringify(obj, null, 2) }],
});
const errorResult = (msg) => ({ content: [{ type: 'text', text: `Error: ${msg}` }], isError: true });

const server = new McpServer({ name: 'proposal-genie-dashboard', version: '1.0.0' });

server.registerTool(
  'dashboard_status',
  {
    title: 'Dashboard status',
    description: 'Check that the Proposal Genie dashboard is running and healthy.',
    inputSchema: {},
  },
  async () => {
    try {
      const hb = await api('/api/heartbeat');
      return textResult({
        reachable: true,
        url: BASE,
        status: hb.status,
        model: hb.model,
        schedulerRunning: hb.schedulerRunning,
      });
    } catch (e) {
      return errorResult(e.message);
    }
  }
);

server.registerTool(
  'list_documents',
  {
    title: 'List documents',
    description: 'List the documents stored in the dashboard (id, title, type, tags).',
    inputSchema: {
      contains: z
        .string()
        .optional()
        .describe('Only return documents whose title contains this text (case-insensitive).'),
    },
  },
  async ({ contains }) => {
    try {
      const data = await api('/api/documents');
      let docs = data.documents || [];
      if (contains) {
        const q = contains.toLowerCase();
        docs = docs.filter((d) => String(d.title || '').toLowerCase().includes(q));
      }
      return textResult({
        count: docs.length,
        documents: docs.map((d) => ({
          id: d.id,
          title: d.title,
          type: d.type,
          tags: d.tags,
          importance: d.importance,
        })),
      });
    } catch (e) {
      return errorResult(e.message);
    }
  }
);

server.registerTool(
  'list_brands',
  {
    title: 'List companies (brands)',
    description:
      'List the companies/brands in the corporate vault, with their industry and voice settings.',
    inputSchema: {},
  },
  async () => {
    try {
      const data = await api('/api/brand-workspace/brands');
      const brands = data.brands || [];
      return textResult({
        count: brands.length,
        brands: brands.map((b) => ({
          id: b.id,
          name: b.name,
          industry: b.industry,
          description: b.description,
          tags: b.tags,
        })),
      });
    } catch (e) {
      return errorResult(e.message);
    }
  }
);

server.registerTool(
  'get_brand',
  {
    title: 'Get company (brand) detail',
    description:
      'Get one company/brand by id or name, including its voice profile and settings.',
    inputSchema: {
      idOrName: z.string().describe('The brand id or its name (case-insensitive).'),
    },
  },
  async ({ idOrName }) => {
    try {
      const data = await api('/api/brand-workspace/brands');
      const brands = data.brands || [];
      const needle = idOrName.toLowerCase();
      const found = brands.find(
        (b) => b.id === idOrName || String(b.name || '').toLowerCase() === needle
      );
      if (!found) {
        return errorResult(`No brand matched "${idOrName}". Try list_brands.`);
      }
      return textResult(found);
    } catch (e) {
      return errorResult(e.message);
    }
  }
);

server.registerTool(
  'search_opportunities',
  {
    title: 'Search government opportunities',
    description:
      'Search SAM.gov opportunities for a keyword (e.g. "space domain awareness", "missile defense").',
    inputSchema: {
      keyword: z.string().describe('Search keyword(s).'),
      limit: z.number().int().min(1).max(50).optional().describe('Max results (default 10).'),
    },
  },
  async ({ keyword, limit }) => {
    try {
      const q = new URLSearchParams({ keyword });
      if (limit) q.set('limit', String(limit));
      const data = await api(`/api/sam?${q.toString()}`);
      return textResult({
        success: data.success,
        mode: data.mode,
        count: data.count,
        opportunities: (data.opportunities || []).slice(0, limit || 10),
      });
    } catch (e) {
      return errorResult(e.message);
    }
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
