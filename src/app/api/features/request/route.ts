import { NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';
import { openCodeAgent, OpenCodeResult } from '@/lib/agent/opencode-agent';
import { streamChatCompletion } from '@/lib/models/sdk.server';

export interface FeatureRequest {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'approved' | 'rejected' | 'completed';
  proposedChanges?: ProposedChange[];
  createdAt: number;
  updatedAt: number;
}

export interface ProposedChange {
  filePath: string;
  action: 'create' | 'modify' | 'delete';
  content?: string;
  originalContent?: string;
  description: string;
  approved: boolean;
}

const REQUESTS_FILE = 'data/feature-requests.json';
const ROOT_DIR = process.cwd();

function getRequestsFilePath(): string {
  return path.join(ROOT_DIR, REQUESTS_FILE);
}

function loadRequests(): FeatureRequest[] {
  try {
    const filePath = getRequestsFilePath();
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    }
  } catch (error) {
    console.error('Error loading requests:', error);
  }
  return [];
}

function saveRequests(requests: FeatureRequest[]): void {
  const filePath = getRequestsFilePath();
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(filePath, JSON.stringify(requests, null, 2));
}

function canModify(filePath: string): boolean {
  const normalizedPath = path.normalize(filePath);
  const relativePath = path.relative(ROOT_DIR, normalizedPath);
  
  if (relativePath.startsWith('..')) return false;
  
  const disallowedPatterns = [
    /password/i, /secret/i, /api[_-]?key/i, /credential/i,
    /\.env/i, /node_modules/, /\.git/, /\.gitignore/,
  ];
  
  for (const pattern of disallowedPatterns) {
    if (pattern.test(relativePath)) return false;
  }
  
  const allowedPaths = ['src/lib/', 'src/components/', 'src/app/api/', 'src/app/', 'docs/'];
  const isAllowed = allowedPaths.some(p => relativePath.startsWith(p));
  
  return isAllowed;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, request: requestData, requestId, changeIndex } = body;

    let requests = loadRequests();

    switch (action) {
      case 'create': {
        const newRequest: FeatureRequest = {
          ...requestData,
          id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
          status: 'pending',
          proposedChanges: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        requests.push(newRequest);
        saveRequests(requests);
        return NextResponse.json({ success: true, request: newRequest });
      }

      case 'implement': {
        const featureRequest = requests.find(r => r.id === requestId);
        if (!featureRequest) {
          return NextResponse.json({ error: 'Request not found' }, { status: 404 });
        }

        const status = openCodeAgent.checkAvailability();
        if (!status.available) {
          return NextResponse.json({ 
            error: 'OpenCode not available', 
            details: status.error 
          }, { status: 503 });
        }

        featureRequest.status = 'in_progress';
        featureRequest.updatedAt = Date.now();
        saveRequests(requests);

        const result = await executeWithOpenCode(
          featureRequest.title,
          featureRequest.description
        );

        if (result.success) {
          featureRequest.status = 'completed';
          featureRequest.proposedChanges = [{
            filePath: result.filesModified?.join(', ') || 'Various files',
            action: 'create',
            description: `OpenCode implemented: ${result.output.slice(0, 500)}`,
            approved: true,
          }];
        } else {
          featureRequest.status = 'rejected';
        }

        saveRequests(requests);
        return NextResponse.json({ success: true, request: featureRequest });
      }

      case 'approveChange': {
        const featureRequest = requests.find(r => r.id === requestId);
        if (!featureRequest || !featureRequest.proposedChanges) {
          return NextResponse.json({ error: 'Request not found' }, { status: 404 });
        }

        if (changeIndex >= 0 && changeIndex < featureRequest.proposedChanges.length) {
          featureRequest.proposedChanges[changeIndex].approved = true;
        }

        const allApproved = featureRequest.proposedChanges.every(c => c.approved);
        if (allApproved) {
          featureRequest.status = 'approved';
        }

        featureRequest.updatedAt = Date.now();
        saveRequests(requests);

        return NextResponse.json({ success: true, request: featureRequest });
      }

      case 'rejectChange': {
        const featureRequest = requests.find(r => r.id === requestId);
        if (!featureRequest || !featureRequest.proposedChanges) {
          return NextResponse.json({ error: 'Request not found' }, { status: 404 });
        }

        if (changeIndex >= 0 && changeIndex < featureRequest.proposedChanges.length) {
          featureRequest.proposedChanges[changeIndex].approved = false;
        }

        featureRequest.status = 'rejected';
        featureRequest.updatedAt = Date.now();
        saveRequests(requests);

        return NextResponse.json({ success: true, request: featureRequest });
      }

      case 'apply': {
        const featureRequest = requests.find(r => r.id === requestId);
        if (!featureRequest || !featureRequest.proposedChanges) {
          return NextResponse.json({ error: 'Request not found' }, { status: 404 });
        }

        const notApproved = featureRequest.proposedChanges.filter(c => !c.approved);
        if (notApproved.length > 0) {
          return NextResponse.json({ 
            error: 'Cannot apply: some changes are not approved' 
          }, { status: 400 });
        }

        for (const change of featureRequest.proposedChanges) {
          if (!canModify(change.filePath)) {
            return NextResponse.json({ 
              error: `Cannot modify: ${change.filePath} is not allowed` 
            }, { status: 403 });
          }

          const fullPath = path.join(ROOT_DIR, change.filePath);

          switch (change.action) {
            case 'create':
              if (!fs.existsSync(fullPath) && change.content) {
                const dir = path.dirname(fullPath);
                if (!fs.existsSync(dir)) {
                  fs.mkdirSync(dir, { recursive: true });
                }
                fs.writeFileSync(fullPath, change.content);
              }
              break;

            case 'modify':
              if (change.content && fs.existsSync(fullPath)) {
                fs.writeFileSync(fullPath, change.content);
              }
              break;

            case 'delete':
              if (fs.existsSync(fullPath)) {
                fs.unlinkSync(fullPath);
              }
              break;
          }
        }

        featureRequest.status = 'completed';
        featureRequest.updatedAt = Date.now();
        saveRequests(requests);

        return NextResponse.json({ success: true, request: featureRequest });
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Feature request error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'opencode-status') {
      const status = openCodeAgent.checkAvailability();
      return NextResponse.json({ status });
    }

    const requests = loadRequests();

    switch (action) {
      case 'list':
        return NextResponse.json({ requests });

      case 'get':
        const id = searchParams.get('id');
        const request = requests.find(r => r.id === id);
        if (!request) {
          return NextResponse.json({ error: 'Request not found' }, { status: 404 });
        }
        return NextResponse.json({ request });

      default:
        return NextResponse.json({
          endpoints: {
            '?action=list': 'List all feature requests',
            '?action=get&id=...': 'Get specific request',
          },
        });
    }
  } catch (error) {
    console.error('Feature request error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function generateProposedChanges(
  title: string,
  description: string
): Promise<ProposedChange[]> {
  const prompt = `You are an expert software architect. A user has requested a new feature:

Title: ${title}
Description: ${description}

Analyze this request and generate specific code changes needed to implement it. 

Provide a JSON array of proposed changes. Each change should have:
{
  "filePath": "relative path from project root (e.g., src/lib/new-feature.ts)",
  "action": "create" | "modify" | "delete",
  "description": "What this change does",
  "content": "Full file content for create/modify, or null for delete",
  "approved": false
}

Rules:
1. Only modify files in: src/lib/, src/components/, src/app/api/, src/app/, docs/
2. Do NOT suggest changes to: .env, node_modules, package-lock.json, or any file with secrets
3. For "modify" actions, provide the complete updated file content
4. Use TypeScript/Next.js conventions
5. Be specific and practical - don't over-engineer

Return ONLY valid JSON, no explanation.`;

  try {
    const result = await streamChatCompletion({
      model: 'ollama/qwen2.5-coder',
      messages: [{ role: 'user', content: prompt }],
    });

    const msg = result.message as unknown as { content?: string };
    const content = msg?.content || String(result.message) || '';
    const match = content.match(/\[[\s\S]*\]/);
    if (match) {
      const changes = JSON.parse(match[0]);
      return changes.map((c: any) => ({
        ...c,
        approved: false,
      }));
    }
  } catch (error) {
    console.error('Error generating changes:', error);
  }

  return [
    {
      filePath: 'src/lib/features/custom-feature.ts',
      action: 'create',
      description: 'Create custom feature module',
      content: `// Feature: ${title}\n// ${description}\n\nexport function ${title.replace(/\s+/g, '')}() {\n  // TODO: Implement feature\n}\n`,
      approved: false,
    },
  ];
}

async function executeWithOpenCode(
  title: string,
  description: string
): Promise<OpenCodeResult> {
  const fullPrompt = `You are an expert software developer implementing a new feature for an AI Research Assistant.

## Project Context
This is a Next.js 14 application with TypeScript, Tailwind CSS, and a SQLite database. The application runs at http://localhost:3000.

## Feature to Implement
**Title:** ${title}
**Description:** ${description}

## Your Task
1. First, explore the codebase to understand the existing structure
2. Identify what files need to be created or modified
3. Implement the feature following existing patterns
4. Make minimal, targeted changes that work with the existing system

## Important Rules
- ONLY modify files within: src/lib/, src/components/, src/app/api/, src/app/, docs/
- NEVER modify: .env, node_modules, package.json, .gitignore, or any files containing secrets
- Keep changes focused and practical
- Follow existing code patterns and conventions
- For UI components, use Tailwind CSS with the existing dark theme (slate/purple gradients)

## Authorizations
You have full authorization to:
- Create new files in src/lib/, src/components/, src/app/
- Modify existing files in src/lib/, src/components/, src/app/
- Add new API routes
- Add new pages
- Add new components

## Output
After completing the implementation:
1. Run any necessary commands (npm install if absolutely needed, but avoid)
2. Verify the implementation works by checking the code
3. Provide a summary of what was created/modified

Start by exploring the codebase structure.`;

  return await openCodeAgent.executeTask(fullPrompt);
}
