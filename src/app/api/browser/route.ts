import { NextRequest, NextResponse } from 'next/server';
import { ollamaWebSearch } from '@/lib/browser/web-search-tool';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  if (action === 'status') {
    return NextResponse.json({
      status: 'available',
      message: 'Web search via Ollama API is ready. Browser automation has been disabled.',
    });
  }

  return NextResponse.json({
    endpoints: {
      'GET ?action=status': 'Check web search status',
      'POST {action: "search", query, maxResults}': 'Search the web using Ollama',
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, query, maxResults } = body;

    switch (action) {
      case 'search': {
        if (!query) {
          return NextResponse.json({ error: 'Query required' }, { status: 400 });
        }

        const response = await ollamaWebSearch(query, { maxResults: maxResults || 5 });

        return NextResponse.json({
          success: response.results.length > 0,
          query,
          results: response.results,
          count: response.results.length,
          message: response.results.length > 0 
            ? `Found ${response.results.length} results` 
            : 'No results found. Make sure OLLAMA_API_KEY is set in .env.local',
        });
      }

      default:
        return NextResponse.json({ error: 'Invalid action. Use: search' }, { status: 400 });
    }
  } catch (error) {
    console.error('[Browser API] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
