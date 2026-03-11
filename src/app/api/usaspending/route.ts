import { NextRequest, NextResponse } from 'next/server';
import { usaSpendingService } from '@/lib/integrations/usaspending';
import { sanitizeString } from '@/lib/utils/validation';

type AwardType = 'contracts' | 'grants' | 'direct_payments' | 'loans' | 'other';

export async function GET(request: NextRequest) {
  try {
    await usaSpendingService.initialize();

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    switch (action) {
      case 'agencies':
        const agencies = await usaSpendingService.getAgencies();
        return NextResponse.json({ success: true, agencies });

      case 'spending_by_agency':
        const year = searchParams.get('year') || undefined;
        const agencySpending = await usaSpendingService.getSpendingByAgency({ year });
        return NextResponse.json(agencySpending);

      case 'spending_by_category':
        const category = searchParams.get('category');
        const catYear = searchParams.get('year') || undefined;
        if (!category) {
          return NextResponse.json(
            { error: 'Category parameter required' },
            { status: 400 }
          );
        }
        const categorySpending = await usaSpendingService.getSpendingByCategory(category, { year: catYear });
        return NextResponse.json(categorySpending);

      case 'award':
        const awardId = searchParams.get('id');
        if (!awardId) {
          return NextResponse.json(
            { error: 'Award ID required' },
            { status: 400 }
          );
        }
        const awardDetails = await usaSpendingService.getAwardDetails(awardId);
        return NextResponse.json({ success: true, award: awardDetails });

      case 'search':
      default:
        const keyword = searchParams.get('keyword');
        const limit = parseInt(searchParams.get('limit') || '10');
        const offset = parseInt(searchParams.get('offset') || '0');
        const agency = searchParams.get('agency') || undefined;
        const naicsCode = searchParams.get('naicsCode') || undefined;
        const dateFrom = searchParams.get('dateFrom') || undefined;
        const dateTo = searchParams.get('dateTo') || undefined;
        const awardType = (searchParams.get('awardType') || 'contracts') as AwardType;

        if (!keyword && !agency && !naicsCode) {
          return NextResponse.json(
            { error: 'At least one search parameter required: keyword, agency, or naicsCode' },
            { status: 400 }
          );
        }

        const result = await usaSpendingService.searchAwards({
          keyword: keyword ? sanitizeString(keyword).slice(0, 200) : undefined,
          agency,
          naicsCode,
          dateFrom,
          dateTo,
          awardType,
          limit,
          offset,
        });

        return NextResponse.json(result);
    }
  } catch (error) {
    console.error('[USASpending API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await usaSpendingService.initialize();

    const body = await request.json();
    const { action, params } = body;

    switch (action) {
      case 'search':
        const searchResult = await usaSpendingService.searchAwards(params || {});
        return NextResponse.json(searchResult);

      case 'spending_by_agency':
        const agencyResult = await usaSpendingService.getSpendingByAgency(params || {});
        return NextResponse.json(agencyResult);

      case 'spending_by_category':
        if (!params?.category) {
          return NextResponse.json(
            { error: 'Category parameter required' },
            { status: 400 }
          );
        }
        const categoryResult = await usaSpendingService.getSpendingByCategory(
          params.category,
          { year: params.year }
        );
        return NextResponse.json(categoryResult);

      case 'award_details':
        if (!params?.awardId) {
          return NextResponse.json(
            { error: 'Award ID required' },
            { status: 400 }
          );
        }
        const awardResult = await usaSpendingService.getAwardDetails(params.awardId);
        return NextResponse.json({ success: true, award: awardResult });

      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: search, spending_by_agency, spending_by_category, award_details' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('[USASpending API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}