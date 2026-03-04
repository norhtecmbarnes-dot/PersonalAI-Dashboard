import { NextResponse } from 'next/server';
import { vectorLake } from '@/lib/storage/vector-lake';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, query } = body;

    switch (action) {
      case 'search': {
        const result = await vectorLake.processQuery(query);
        
        if (result.organizedData && !result.cached) {
          await vectorLake.saveOrganizedData(result.organizedData);
        }

        return NextResponse.json({
          success: true,
          cached: result.cached,
          answer: result.answer,
          searchTerms: result.searchTerms,
          searchResults: result.searchResults,
          organizedData: result.organizedData,
          entryId: result.entry?.id,
        });
      }

      case 'saveData': {
        const { organizedData } = body;
        await vectorLake.saveOrganizedData(organizedData);
        return NextResponse.json({ success: true });
      }

      case 'stats': {
        const stats = vectorLake.getStats();
        const popular = vectorLake.getPopularQueries(5);
        const recent = vectorLake.getRecentQueries(5);
        return NextResponse.json({ stats, popular, recent });
      }

      case 'clearExpired': {
        const count = vectorLake.clearExpiredEntries();
        return NextResponse.json({ success: true, cleared: count });
      }

      case 'popular': {
        const queries = vectorLake.getPopularQueries(10);
        return NextResponse.json({ queries });
      }

      case 'recent': {
        const queries = vectorLake.getRecentQueries(10);
        return NextResponse.json({ queries });
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (error) {
    console.error('VectorLake API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    switch (action) {
      case 'stats': {
        const stats = vectorLake.getStats();
        const popular = vectorLake.getPopularQueries(5);
        const recent = vectorLake.getRecentQueries(5);
        return NextResponse.json({ stats, popular, recent });
      }

      case 'popular': {
        const limit = parseInt(searchParams.get('limit') || '10');
        const queries = vectorLake.getPopularQueries(limit);
        return NextResponse.json({ queries });
      }

      case 'recent': {
        const limit = parseInt(searchParams.get('limit') || '10');
        const queries = vectorLake.getRecentQueries(limit);
        return NextResponse.json({ queries });
      }

      default:
        return NextResponse.json({
          endpoints: {
            '?action=stats': 'Get vector lake statistics',
            '?action=popular': 'Get popular cached queries',
            '?action=recent': 'Get recent cached queries',
          },
        });
    }
  } catch (error) {
    console.error('VectorLake API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
