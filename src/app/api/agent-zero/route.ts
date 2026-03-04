import { NextRequest, NextResponse } from 'next/server';
import { agentZeroService } from '@/lib/integrations/agent-zero';
import { validateString, validateArray } from '@/lib/utils/validation';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  try {
    switch (action) {
      case 'status':
        const status = await agentZeroService.checkStatus();
        return NextResponse.json(status);

      case 'sessions':
        const sessions = await agentZeroService.listSessions();
        return NextResponse.json({ sessions, count: sessions.length });

      case 'capabilities':
        const capabilities = await agentZeroService.checkStatus();
        return NextResponse.json({
          configured: agentZeroService.isConfigured(),
          apiUrl: agentZeroService.getApiUrl(),
          capabilities: capabilities.connected ? capabilities.capabilities : [],
        });

      default:
        return NextResponse.json({
          configured: agentZeroService.isConfigured(),
          apiUrl: agentZeroService.getApiUrl(),
          endpoints: {
            'GET ?action=status': 'Check Agent Zero connection status',
            'GET ?action=sessions': 'List active sessions',
            'GET ?action=capabilities': 'Get available capabilities',
            'POST action=shell': 'Execute shell command',
            'POST action=python': 'Execute Python code',
            'POST action=agent': 'Run autonomous agent task',
            'POST action=file-read': 'Read file from Agent Zero',
            'POST action=file-write': 'Write file to Agent Zero',
            'POST action=file-list': 'List directory contents',
            'POST action=session-create': 'Create isolated session',
            'POST action=session-close': 'Close session',
          },
        });
    }
  } catch (error) {
    console.error('[Agent Zero API] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, data } = body;

    switch (action) {
      case 'shell': {
        const commandValidation = validateString(data?.command, 'command', { required: true, maxLength: 10000 });
        if (!commandValidation.valid) {
          return NextResponse.json({ error: commandValidation.error }, { status: 400 });
        }

        const result = await agentZeroService.executeShell(data.command, {
          timeout: data.timeout,
          cwd: data.cwd,
          env: data.env,
        });

        return NextResponse.json({
          success: true,
          result,
        });
      }

      case 'python': {
        const codeValidation = validateString(data?.code, 'code', { required: true, maxLength: 100000 });
        if (!codeValidation.valid) {
          return NextResponse.json({ error: codeValidation.error }, { status: 400 });
        }

        const result = await agentZeroService.executePython(data.code, {
          timeout: data.timeout,
          packages: data.packages,
        });

        return NextResponse.json({
          success: true,
          result,
        });
      }

      case 'agent': {
        const taskValidation = validateString(data?.task, 'task', { required: true, maxLength: 5000 });
        if (!taskValidation.valid) {
          return NextResponse.json({ error: taskValidation.error }, { status: 400 });
        }

        const result = await agentZeroService.runAgentTask(data.task, {
          maxSteps: data.maxSteps || 10,
          timeout: data.timeout || 120000,
          sessionId: data.sessionId,
        });

        return NextResponse.json({
          success: true,
          result,
        });
      }

      case 'file-read': {
        const pathValidation = validateString(data?.path, 'path', { required: true, maxLength: 1000 });
        if (!pathValidation.valid) {
          return NextResponse.json({ error: pathValidation.error }, { status: 400 });
        }

        const result = await agentZeroService.readFile(data.path, {
          encoding: data.encoding,
          maxSize: data.maxSize,
        });

        return NextResponse.json({
          success: true,
          result,
        });
      }

      case 'file-write': {
        const pathValidation = validateString(data?.path, 'path', { required: true, maxLength: 1000 });
        if (!pathValidation.valid) {
          return NextResponse.json({ error: pathValidation.error }, { status: 400 });
        }

        const contentValidation = validateString(data?.content, 'content', { required: true, maxLength: 50 * 1024 * 1024 });
        if (!contentValidation.valid) {
          return NextResponse.json({ error: contentValidation.error }, { status: 400 });
        }

        const result = await agentZeroService.writeFile(data.path, data.content, {
          encoding: data.encoding,
          createDirs: data.createDirs,
        });

        return NextResponse.json({
          success: true,
          result,
        });
      }

      case 'file-list': {
        const pathValidation = validateString(data?.path, 'path', { required: true, maxLength: 1000 });
        if (!pathValidation.valid) {
          return NextResponse.json({ error: pathValidation.error }, { status: 400 });
        }

        const entries = await agentZeroService.listDirectory(data.path);

        return NextResponse.json({
          success: true,
          entries,
        });
      }

      case 'file-delete': {
        const pathValidation = validateString(data?.path, 'path', { required: true, maxLength: 1000 });
        if (!pathValidation.valid) {
          return NextResponse.json({ error: pathValidation.error }, { status: 400 });
        }

        const deleted = await agentZeroService.deleteFile(data.path);

        return NextResponse.json({
          success: deleted,
        });
      }

      case 'session-create': {
        const session = await agentZeroService.createSession(data?.context);

        return NextResponse.json({
          success: true,
          session,
        });
      }

      case 'session-close': {
        const idValidation = validateString(data?.sessionId, 'sessionId', { required: true, maxLength: 100 });
        if (!idValidation.valid) {
          return NextResponse.json({ error: idValidation.error }, { status: 400 });
        }

        const closed = await agentZeroService.closeSession(data.sessionId);

        return NextResponse.json({
          success: closed,
        });
      }

      default:
        return NextResponse.json(
          { error: 'Unknown action. Use: shell, python, agent, file-read, file-write, file-list, session-create, session-close' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('[Agent Zero API] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}