import { NextRequest, NextResponse } from 'next/server';
import { performWebSearch } from '@/lib/websearch';

export async function POST(request: NextRequest) {
  try {
    const { query } = await request.json();
    
    if (!query) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    const results = await performWebSearch(query);
    
    return NextResponse.json({ results });
  } catch (error) {
    console.error('Web search API error:', error);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}
