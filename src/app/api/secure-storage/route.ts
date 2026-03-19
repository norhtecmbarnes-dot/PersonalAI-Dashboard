export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { secureStorage } from '@/lib/security/secure-storage';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    switch (action) {
      case 'list': {
        const entries = secureStorage.list();
        return NextResponse.json({ success: true, entries });
      }

      case 'get': {
        const id = searchParams.get('id');
        if (!id) {
          return NextResponse.json({ error: 'ID required' }, { status: 400 });
        }
        const entry = secureStorage.get(id);
        if (!entry) {
          return NextResponse.json({ error: 'Not found' }, { status: 404 });
        }
        secureStorage.markUsed(id);
        return NextResponse.json({ success: true, entry });
      }

      case 'api-keys': {
        const keys = secureStorage.getAllApiKeys();
        const providers = [
          'openai',
          'anthropic',
          'google',
          'gemini',
          'deepseek',
          'openrouter',
          'tavily',
          'brave',
          'serpapi',
          'ollama',
        ];

        // Merge with existing API keys table
        const result = providers.map(provider => {
          const existing = keys.find(k => k.provider === provider);
          return {
            provider,
            hasKey: !!existing,
            keyId: existing?.keyId,
            lastUsed: existing?.lastUsed,
          };
        });

        return NextResponse.json({ success: true, keys: result });
      }

      case 'stats': {
        const stats = secureStorage.getStats();
        return NextResponse.json({ success: true, stats });
      }

      case 'export': {
        const data = secureStorage.export();
        return NextResponse.json({ success: true, data });
      }

      default:
        return NextResponse.json({
          endpoints: {
            'GET ?action=list': 'List all entries (values masked)',
            'GET ?action=get&id=...': 'Get specific entry',
            'GET ?action=api-keys': 'List API key status',
            'GET ?action=stats': 'Get storage statistics',
            'GET ?action=export': 'Export all data (encrypted)',
            'POST action=store': 'Store encrypted value',
            'POST action=delete': 'Delete an entry',
            'POST action=import': 'Import data',
            'POST action=purge': 'Delete all data',
          },
        });
    }
  } catch (error) {
    console.error('[SecureStorage API] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, ...data } = body;

    switch (action) {
      case 'store': {
        if (!data.service || !data.type || !data.value) {
          return NextResponse.json(
            { error: 'service, type, and value are required' },
            { status: 400 }
          );
        }

        const entry = secureStorage.store({
          service: data.service,
          type: data.type,
          key: data.key,
          value: data.value,
          username: data.username,
          url: data.url,
          notes: data.notes,
          tags: data.tags,
        });

        return NextResponse.json({
          success: true,
          id: entry.id,
          maskedValue: data.value.slice(0, 3) + '***',
        });
      }

      case 'delete': {
        if (!data.id) {
          return NextResponse.json({ error: 'ID required' }, { status: 400 });
        }

        const deleted = secureStorage.delete(data.id);
        return NextResponse.json({ success: deleted });
      }

      case 'purge': {
        const count = secureStorage.deleteAll();
        return NextResponse.json({ success: true, deleted: count });
      }

      case 'import': {
        if (!data.entries || !Array.isArray(data.entries)) {
          return NextResponse.json({ error: 'entries array required' }, { status: 400 });
        }

        const result = secureStorage.import(
          { version: 1, exportedAt: Date.now(), entries: data.entries },
          data.merge !== false
        );

        return NextResponse.json({ success: true, ...result });
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (error) {
    console.error('[SecureStorage API] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
