import { NextRequest, NextResponse } from 'next/server';
import { processQuery } from '@/lib/services/model-bus';

export async function POST(req: NextRequest) {
  try {
    const { query, expertMode = false } = await req.json();

    if (!query) {
      return NextResponse.json({ success: false, error: 'Query is required' }, { status: 400 });
    }

    const result = await processQuery(query, expertMode);

    return NextResponse.json({
      success: true,
      response: result.response,
      modelUsed: result.modelUsed,
      tier: result.tier,
      escalated: result.escalated,
      tokensUsed: result.tokensUsed,
      costEstimate: result.costEstimate || 0,
    });
  } catch (error: any) {
    console.error('Message Bus Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Internal server error',
      },
      { status: 500 }
    );
  }
}
