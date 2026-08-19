import { NextRequest, NextResponse } from 'next/server';
import { SamGovService } from '@/lib/services/sam-gov';

/**
 * SAM.gov opportunities search.
 *
 * The SAM.gov API key is REQUIRED — there is no browser-scrape fallback.
 * Without a key the route returns a clear error pointing to Settings.
 */
export async function GET(request: NextRequest) {
  try {
    const service = SamGovService.getInstance();
    await service.initialize();

    if (!service.getApiKey()) {
      return NextResponse.json(
        {
          error:
            'SAM.gov API key required — add your free key in Settings > API Keys (SAM.gov) to enable searching.',
          keyRequired: true,
        },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const keyword = searchParams.get('keyword') || undefined;
    const limit = Math.min(
      Math.max(parseInt(searchParams.get('limit') || '10', 10) || 10, 1),
      50
    );
    const offset = Math.max(parseInt(searchParams.get('offset') || '0', 10) || 0, 0);
    const postedFrom = searchParams.get('postedFrom') || undefined;
    const postedTo = searchParams.get('postedTo') || undefined;
    const agency = searchParams.get('agency') || undefined;
    const naicsCode = searchParams.get('naicsCode') || undefined;
    const pscCode = searchParams.get('pscCode') || undefined;

    if (!keyword && !naicsCode && !pscCode) {
      return NextResponse.json(
        { error: 'A keyword, NAICS code, or PSC code is required' },
        { status: 400 }
      );
    }

    const result = await service.search({
      keyword,
      limit,
      offset,
      postedFrom,
      postedTo,
      agency,
      naicsCode,
      pscCode,
    });

    return NextResponse.json({
      success: true,
      count: result.count,
      opportunities: result.opportunities,
      searchId: result.searchId,
    });
  } catch (error) {
    console.error('[SAM API] Search error:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'SAM.gov search failed. Check your API key and try again.',
      },
      { status: 500 }
    );
  }
}
