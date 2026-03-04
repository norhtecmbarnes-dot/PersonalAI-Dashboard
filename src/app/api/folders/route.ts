export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { sqlDatabase } from '@/lib/database/sqlite';

export async function GET(request: Request) {
  try {
    await sqlDatabase.initialize();
    const { searchParams } = new URL(request.url);
    const parentId = searchParams.get('parentId');
    
    const folders = sqlDatabase.getFolders(parentId === null ? undefined : parentId || undefined);
    return NextResponse.json({ folders });
  } catch (error) {
    console.error('Folders API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await sqlDatabase.initialize();
    const body = await request.json();
    const { action, folder } = body;

    switch (action) {
      case 'create': {
        const newFolder = sqlDatabase.addFolder(folder);
        return NextResponse.json({ success: true, folder: newFolder });
      }

      case 'update': {
        const updated = sqlDatabase.updateFolder(folder.id, folder);
        return NextResponse.json({ success: !!updated, folder: updated });
      }

      case 'delete': {
        const deleted = sqlDatabase.deleteFolder(folder.id);
        return NextResponse.json({ success: deleted });
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Folders API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
