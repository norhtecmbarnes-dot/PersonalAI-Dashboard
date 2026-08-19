import { NextRequest, NextResponse } from 'next/server';
import { SamGovService } from '@/lib/services/sam-gov';
import { agentBrowserService } from '@/lib/browser/agent-browser-service';

/**
 * SAM.gov opportunities search.
 *
 * Prefers the official SAM.gov API when a key is set (faster, structured).
 * Without a key, a browser agent drives the system Edge/Chrome browser against
 * SAM.gov's public search — no login, no key, immune to the 90-day key
 * rotation. Returns 401 only when neither path is available.
 */
export async function GET(request: NextRequest) {
  try {
    const service = SamGovService.getInstance();
    await service.initialize();

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

    const apiKey = service.getApiKey();

    // Preferred path: official API with the key.
    if (apiKey) {
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
        mode: 'api',
        count: result.count,
        opportunities: result.opportunities,
        searchId: result.searchId,
      });
    }

    // Keyless path: the browser agent searches sam.gov without login.
    if (!(await agentBrowserService.checkInstalled())) {
      return NextResponse.json(
        {
          error:
            'No SAM.gov API key and no browser available. Add your free key in Settings > API Keys (SAM.gov), or install Microsoft Edge / Google Chrome for browser search.',
          keyRequired: true,
        },
        { status: 401 }
      );
    }

    const browserResult = await agentBrowserService.searchSAMGov({
      keyword,
      naics: naicsCode,
      psc: pscCode,
      limit,
    });

    if (!browserResult.success) {
      return NextResponse.json(
        {
          error:
            browserResult.message ||
            'SAM.gov browser search failed. Try adding your free API key in Settings > API Keys (SAM.gov).',
          keyRequired: true,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      mode: 'browser',
      count: browserResult.opportunities.length,
      opportunities: browserResult.opportunities,
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
