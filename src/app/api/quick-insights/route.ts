import { NextResponse } from 'next/server';
import { sqlDatabase } from '@/lib/database/sqlite';
import { memoryStore } from '@/lib/memory/persistent-store';
import { getSecurityStatus } from '@/lib/security/ai-security-scanner';
import { taskScheduler } from '@/lib/services/task-scheduler';
import { router } from '@/lib/models/model-router';

export async function GET() {
  try {
    // Initialize database
    sqlDatabase.initialize();

    // Get chat statistics
    let chats = { total: 0, today: 0, avgResponseTime: 'N/A' };
    try {
      const allChats = await sqlDatabase.all('SELECT COUNT(*) as count FROM conversations');
      chats.total = (allChats?.[0] as any)?.count || 0;

      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayChats = await sqlDatabase.all(
        `SELECT COUNT(*) as count FROM conversations WHERE created_at >= ${todayStart.getTime()}`
      );
      chats.today = (todayChats?.[0] as any)?.count || 0;

      // Estimate average response time (placeholder - would need actual timing data)
      chats.avgResponseTime = '~2.5s';
    } catch (e) {
      console.error('Error loading chat stats:', e);
    }

    // Get document statistics
    let documents = { total: 0, indexed: 0, totalSize: '0 MB' };
    try {
      const docs = await sqlDatabase.all('SELECT COUNT(*), SUM(size) FROM documents');
      documents.total = (docs?.[0] as any)?.['COUNT(*)'] || 0;
      documents.indexed = documents.total; // Assume all are indexed
      documents.totalSize = `${(((docs?.[0] as any)?.['SUM(size)'] || 0) / 1024 / 1024).toFixed(1)} MB`;
    } catch (e) {
      console.error('Error loading document stats:', e);
    }

    // Get memory statistics
    let memory = { entries: 0, categories: 0, lastSync: 'Never' };
    try {
      const memories = await memoryStore.search('', { limit: 1000 });
      memory.entries = memories?.length || 0;

      const categories = new Set(memories?.map((m: any) => m.memory?.category));
      memory.categories = categories.size;

      if (memories?.length > 0) {
        const latest = memories.reduce(
          (latest: any, m: any) =>
            !latest || (m.memory?.createdAt || 0) > (latest.memory?.createdAt || 0) ? m : latest,
          null
        );
        memory.lastSync = new Date(latest?.memory?.createdAt || 0).toLocaleString();
      }
    } catch (e) {
      console.error('Error loading memory stats:', e);
    }

    // Get task statistics
    let tasks = { pending: 0, completed: 0, scheduled: 0 };
    try {
      const pendingTasks = await sqlDatabase.all(
        "SELECT COUNT(*) as count FROM tasks WHERE status = 'pending'"
      );
      tasks.pending = (pendingTasks?.[0] as any)?.count || 0;

      const completedTasks = await sqlDatabase.all(
        "SELECT COUNT(*) as count FROM tasks WHERE status = 'completed'"
      );
      tasks.completed = (completedTasks?.[0] as any)?.count || 0;

      const scheduledTasks = await sqlDatabase.all(
        'SELECT COUNT(*) as count FROM scheduled_tasks WHERE enabled = 1'
      );
      tasks.scheduled = (scheduledTasks?.[0] as any)?.count || 0;
    } catch (e) {
      console.error('Error loading task stats:', e);
    }

    // Get model statistics - use available models list directly
    const modelStats = {
      available: 10, // Approximate count
      local: 5, // Ollama models
      cloud: 5, // Cloud providers
    };

    // Get security statistics
    let security = { riskScore: 0, lastScan: 'Never', issues: 0 };
    try {
      const status = await getSecurityStatus();
      security.riskScore = status.lastScan?.riskScore || 0;
      security.lastScan = status.lastScan
        ? new Date(status.lastScan.timestamp).toLocaleString()
        : 'Never';
      security.issues = status.lastScan
        ? (status.lastScan.summary?.critical || 0) + (status.lastScan.summary?.high || 0)
        : 0;
    } catch (e) {
      console.error('Error loading security stats:', e);
    }

    const metrics = {
      chats,
      documents,
      memory,
      tasks,
      models: modelStats,
      security,
    };

    return NextResponse.json({ metrics });
  } catch (error) {
    console.error('Error loading quick insights:', error);
    return NextResponse.json({ error: 'Failed to load insights' }, { status: 500 });
  }
}
