export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { sqlDatabase } from '@/lib/database/sqlite';

export async function GET(request: NextRequest) {
  try {
    sqlDatabase.initialize();
    
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const id = searchParams.get('id');
    const query = searchParams.get('query');
    const limit = parseInt(searchParams.get('limit') || '20');

    switch (action) {
      case 'get': {
        if (!id) {
          return NextResponse.json({ error: 'ID required' }, { status: 400 });
        }
        const chats = sqlDatabase.getChatHistory(id);
        return NextResponse.json({ chat: chats[0] || null });
      }

      case 'search': {
        if (!query) {
          return NextResponse.json({ error: 'Query required' }, { status: 400 });
        }
        const results = sqlDatabase.searchChatHistory(query);
        return NextResponse.json({ results, count: results.length });
      }

      case 'recent': {
        const chats = sqlDatabase.getRecentChatHistory(limit);
        return NextResponse.json({ chats, count: chats.length });
      }

      case 'list':
      default: {
        const chats = sqlDatabase.getChatHistory();
        return NextResponse.json({ 
          chats: chats.slice(0, limit),
          total: chats.length 
        });
      }
    }
  } catch (error) {
    console.error('Chat history API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    sqlDatabase.initialize();
    const body = await request.json();
    
    const { action, ...data } = body;

    switch (action) {
      case 'save': {
        if (!data.messages || !Array.isArray(data.messages)) {
          return NextResponse.json({ error: 'Messages array required' }, { status: 400 });
        }

        // Auto-generate title from first user message
        if (!data.title && data.messages.length > 0) {
          const firstUserMsg = data.messages.find((m: any) => m.role === 'user');
          if (firstUserMsg) {
            data.title = firstUserMsg.content.slice(0, 50) + (firstUserMsg.content.length > 50 ? '...' : '');
          }
        }

        const result = sqlDatabase.saveChatHistory({
          id: data.id,
          title: data.title || 'Untitled Chat',
          summary: data.summary,
          messages: data.messages,
          model: data.model,
          expert: data.expert,
          tags: data.tags,
        });

        return NextResponse.json({ success: true, id: result.id, createdAt: result.createdAt });
      }

      case 'delete': {
        if (!data.id) {
          return NextResponse.json({ error: 'ID required' }, { status: 400 });
        }
        const deleted = sqlDatabase.deleteChatHistory(data.id);
        return NextResponse.json({ success: deleted });
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Chat history API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}