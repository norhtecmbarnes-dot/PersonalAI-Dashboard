export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { dailySamScan } from '@/lib/services/daily-sam-scan';

/**
 * Daily targeted SAM.gov scan API.
 *
 * GET  /api/sam-scan?brandId=X  — status + scored matches. If the last scan is
 *      older than 24h (and none is running), kicks off a fresh one in the
 *      background — this is what makes the matches URL self-refresh daily.
 * POST /api/sam-scan {brandId, force} — run a scan now (background).
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const brandId = await dailySamScan.resolveBrandId(searchParams.get('brandId'));
    if (!brandId) {
      return NextResponse.json(
        { success: false, error: 'No company found. Create a company in Brands first.' },
        { status: 400 }
      );
    }

    // Lazy daily trigger: if stale and idle, start the background scan.
    if (dailySamScan.isStale(brandId) && !dailySamScan.isRunning(brandId)) {
      await dailySamScan.runScan(brandId);
    }

    const [status, matches, summary] = await Promise.all([
      dailySamScan.getStatus(brandId),
      Promise.resolve(dailySamScan.getMatches(brandId, { limit: 100 })),
      Promise.resolve(dailySamScan.getSummary(brandId)),
    ]);

    return NextResponse.json({ success: true, status, matches, summary });
  } catch (error) {
    console.error('[SamScan API] Error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const brandId = await dailySamScan.resolveBrandId(body?.brandId);
    if (!brandId) {
      return NextResponse.json(
        { success: false, error: 'No company found. Create a company in Brands first.' },
        { status: 400 }
      );
    }

    const result = await dailySamScan.runScan(brandId, { force: true });
    return NextResponse.json({ success: true, brandId, ...result });
  } catch (error) {
    console.error('[SamScan API] Error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
