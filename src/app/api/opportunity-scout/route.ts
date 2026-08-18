export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { opportunityScout } from '@/lib/services/opportunity-scout';
import { brandWorkspace } from '@/lib/services/brand-workspace';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'profile';
    const brandId = searchParams.get('brandId') || '';

    if (!brandId) {
      return NextResponse.json({ success: false, error: 'brandId is required' }, { status: 400 });
    }

    switch (action) {
      case 'profile': {
        const profile = opportunityScout.getProfile(brandId);
        return NextResponse.json({ success: true, profile });
      }
      case 'learn-events': {
        const events = opportunityScout.getLearnEvents(brandId);
        return NextResponse.json({ success: true, events });
      }
      case 'status': {
        const profile = opportunityScout.getProfile(brandId);
        const brand = await brandWorkspace.getBrandById(brandId).catch(() => null);
        return NextResponse.json({
          success: true,
          status: {
            apiConfigured: opportunityScout.isApiConfigured(),
            hasProfile: profile.keywords.length > 0 || profile.learnedKeywords.length > 0,
            searchCount: profile.searchCount,
            lastSearchAt: profile.lastSearchAt,
            learnedKeywordCount: profile.learnedKeywords.length,
            brandName: brand?.name,
          },
        });
      }
      default:
        return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
    }
  } catch (error) {
    console.error('[OpportunityScout API] Error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, brandId, projectId, outcome, model, limit, queries, sources, profile } = body || {};

    if (!brandId) {
      return NextResponse.json({ success: false, error: 'brandId is required' }, { status: 400 });
    }

    switch (action) {
      case 'build-profile': {
        const built = await opportunityScout.buildProfile(brandId, model);
        return NextResponse.json({ success: true, profile: built });
      }

      case 'save-profile': {
        if (!profile) {
          return NextResponse.json({ success: false, error: 'profile is required' }, { status: 400 });
        }
        opportunityScout.saveProfile(brandId, profile);
        return NextResponse.json({ success: true, profile: opportunityScout.getProfile(brandId) });
      }

      case 'search': {
        const result = await opportunityScout.search(brandId, { limit, queries, sources });
        return NextResponse.json(result);
      }

      case 'learn': {
        if (!projectId) {
          return NextResponse.json({ success: false, error: 'projectId is required' }, { status: 400 });
        }
        const result = await opportunityScout.learnFromProject(
          brandId,
          projectId,
          (outcome as any) || 'bid',
          model
        );
        return NextResponse.json({ success: true, ...result });
      }

      default:
        return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
    }
  } catch (error) {
    console.error('[OpportunityScout API] Error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
