export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { sqlDatabase } from '@/lib/database/sqlite';

export async function GET() {
  try {
    sqlDatabase.initialize();
    
    const docs = sqlDatabase.getDocuments(undefined, 'telegram_config');
    
    return NextResponse.json({
      count: docs?.length || 0,
      documents: docs?.map(d => ({
        id: d.id,
        title: d.title,
        category: d.category,
        content: d.content,
      })),
    });
  } catch (error) {
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}