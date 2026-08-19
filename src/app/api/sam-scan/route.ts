export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { dailySamScan } from '@/lib/services/daily-sam-scan';
import { opportunityLearning } from '@/lib/services/opportunity-learning';
import { opportunityRanking } from '@/lib/services/opportunity-ranking';

/**
 * Daily targeted SAM.gov scan API.
 *
 * GET  /api/sam-scan?brandId=X  — status + scored matches (+ AI ranking +
 *      learning status). If the last scan is older than 24h (and none is
 *      running), kicks off a fresh one in the background — this is what makes
 *      the matches URL self-refresh daily. After a scan completes, the AI
 *      ranking of the matches is also lazily computed on first view (one LLM
 *      pass per scan), and the self-improvement learning pass runs lazily once
 *      new engagement/outcome signals appear.
 * POST /api/sam-scan {brandId, force}          — run a scan now (background).
 * POST /api/sam-scan {brandId, action:'rank'}  — re-rank the matches with AI now.
 * POST /api/sam-scan {brandId, action:'learn'} — run the learning pass now.
 * POST /api/sam-scan {brandId, action:'engage', engagement} — record what the
 *      human did with an AI-ranked item (signal: bid|pursue|not-relevant).
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

    // Lazy AI ranking: once a scan has produced matches, have the AI read and
    // rank them on first view (cached per scan, one LLM pass).
    const lastRun = status.lastRun;
    if (
      matches.length > 0 &&
      lastRun &&
      !opportunityRanking.isRankingRunning(brandId) &&
      opportunityRanking.isRankStale(brandId, lastRun)
    ) {
      await opportunityRanking.startRanking(brandId);
    }

    // Lazy self-improvement: when there are engagements/outcomes the AI has
    // not learned from yet, kick off the learning pass on first view.
    if (opportunityLearning.hasNewSignals(brandId) && !opportunityLearning.isLearning(brandId)) {
      await opportunityLearning.startLearning(brandId);
    }

    const ranking = opportunityRanking.getRanking(brandId);
    const rankStatus = opportunityRanking.getRankStatus(brandId, lastRun);
    const learning = opportunityLearning.getLearningStatus(brandId);

    return NextResponse.json({ success: true, status, matches, summary, ranking, rankStatus, learning });
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

    if (body?.action === 'rank') {
      const result = await opportunityRanking.startRanking(brandId, { force: true });
      return NextResponse.json({ success: true, brandId, ...result });
    }

    if (body?.action === 'learn') {
      const result = await opportunityLearning.startLearning(brandId, { force: true });
      return NextResponse.json({ success: true, brandId, ...result });
    }

    if (body?.action === 'engage') {
      const engagement = body?.engagement;
      if (!engagement?.opportunityId || !['bid', 'pursue', 'not-relevant'].includes(engagement?.signal)) {
        return NextResponse.json(
          { success: false, error: 'Engagement needs opportunityId and signal (bid | pursue | not-relevant).' },
          { status: 400 }
        );
      }
      opportunityLearning.recordEngagement(brandId, engagement);
      return NextResponse.json({ success: true, brandId });
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
