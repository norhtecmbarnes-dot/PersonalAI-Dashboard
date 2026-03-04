export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { securityAgent } from '@/lib/agent/security-agent';
import { securityAnalyzer } from '@/lib/agent/security-analyzer';

async function getSourceFiles(dir: string, files: Array<{ path: string; content: string }> = []): Promise<Array<{ path: string; content: string }>> {
  const fs = await import('fs');
  const path = await import('path');
  
  try {
    const entries = fs.readdirSync(dir);
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry);
      
      if (entry === 'node_modules' || entry === '.next' || entry === '.git' || entry === 'dist' || entry === 'build') {
        continue;
      }
      
      try {
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          await getSourceFiles(fullPath, files);
        } else if (entry.endsWith('.ts') || entry.endsWith('.tsx') || entry.endsWith('.js') || entry.endsWith('.jsx')) {
          try {
            const content = fs.readFileSync(fullPath, 'utf-8');
            const relativePath = fullPath.replace(process.cwd(), '').replace(/^[\/\\]/, '');
            files.push({ path: relativePath, content });
          } catch {}
        }
      } catch {}
    }
  } catch {}
  
  return files;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const action = body.action;

    if (action === 'scan') {
      const report = await securityAgent.performSecurityScan();
      return NextResponse.json({ success: true, report });
    }

    if (action === 'history') {
      const history = securityAgent.getReportHistory();
      return NextResponse.json({ success: true, reports: history });
    }

    if (action === 'deep-scan') {
      const targetFiles = body.files || [];
      let files: Array<{ path: string; content: string }> = [];
      
      if (targetFiles.length === 0) {
        files = await getSourceFiles(process.cwd());
      } else {
        const fs = await import('fs');
        const path = await import('path');
        for (const filePath of targetFiles) {
          try {
            const fullPath = path.join(process.cwd(), filePath);
            const content = fs.readFileSync(fullPath, 'utf-8');
            files.push({ path: filePath, content });
          } catch {}
        }
      }

      const result = await securityAnalyzer.scanForIssues(files);
      
      return NextResponse.json({
        success: true,
        scanId: result.id,
        summary: result.summary,
        issues: result.issues,
        recommendations: result.recommendations,
      });
    }

    if (action === 'autofix') {
      const { issueId, filePath, content } = body;
      
      if (!issueId || !filePath || !content) {
        return NextResponse.json({ error: 'Missing required fields: issueId, filePath, content' }, { status: 400 });
      }

      const result = await securityAnalyzer.attemptAutoFix(issueId, filePath, content);
      
      return NextResponse.json({
        success: result.success,
        newContent: result.newContent,
        message: result.message,
      });
    }

    if (action === 'escalate') {
      const { issue } = body;
      
      if (!issue) {
        return NextResponse.json({ error: 'Missing issue data' }, { status: 400 });
      }

      const task = await securityAnalyzer.escalateToOpenCode(issue);
      
      return NextResponse.json({
        success: true,
        taskId: task.id,
        message: 'Issue escalated to OpenCode queue',
        prompt: `Please fix the following security issue:\n\n${task.description}\n\nPriority: ${task.priority}`,
      });
    }

    if (action === 'dismiss') {
      const { issueId } = body;
      
      if (!issueId) {
        return NextResponse.json({ error: 'Missing issueId' }, { status: 400 });
      }

      securityAnalyzer.dismissIssue(issueId);
      
      return NextResponse.json({
        success: true,
        message: 'Issue dismissed',
      });
    }

    return NextResponse.json(
      { error: 'Invalid action. Use: scan, history, deep-scan, autofix, escalate, or dismiss' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Security API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  try {
    if (action === 'history') {
      const history = securityAgent.getReportHistory();
      return NextResponse.json({ success: true, reports: history });
    }

    if (action === 'opencode-queue') {
      const queue = securityAnalyzer.getOpenCodeQueue();
      return NextResponse.json({ success: true, tasks: queue });
    }

    if (action === 'latest-scan') {
      const scan = securityAnalyzer.getLatestScan();
      return NextResponse.json({ success: true, scan });
    }

    const report = securityAgent.getLatestReport();
    const shouldRun = securityAgent.shouldRunScan();

    return NextResponse.json({
      success: true,
      latestReport: report,
      shouldRunScan: shouldRun,
      lastScan: report?.timestamp || null,
      endpoints: {
        'POST ?action=scan': 'Run security agent scan',
        'POST ?action=deep-scan': 'Run deep security scan with auto-fix detection',
        'POST ?action=autofix': 'Attempt to auto-fix a security issue',
        'POST ?action=escalate': 'Escalate issue to OpenCode queue',
        'POST ?action=dismiss': 'Dismiss a security issue',
        'GET ?action=history': 'Get security scan history',
        'GET ?action=opencode-queue': 'Get pending OpenCode tasks',
        'GET ?action=latest-scan': 'Get latest deep scan result',
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
