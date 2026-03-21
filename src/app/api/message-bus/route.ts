import { NextResponse } from 'next/server';
import { getModelBus } from '@/lib/services/model-bus';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  const bus = getModelBus();

  if (action === 'history') {
    return NextResponse.json({ history: bus.getHistory() });
  }

  if (action === 'budget') {
    return NextResponse.json(bus.getBudgetStatus());
  }

  if (action === 'models') {
    return NextResponse.json({ models: bus.getAvailableModels() });
  }

  return NextResponse.json({
    message: 'Model Message Bus API',
    availableActions: ['history', 'budget', 'models', 'triage', 'process'],
  });
}

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action') || 'process';

  try {
    const body = await request.json();

    const bus = getModelBus();

    if (action === 'triage') {
      const result = await bus.triageQuery(body.query);
      return NextResponse.json(result);
    }

    if (action === 'process') {
      const result = await bus.process({
        originalQuery: body.query || body.message,
        context: body.context || '',
        sourceModel: body.sourceModel || 'user',
        userId: body.userId,
        brandId: body.brandId,
        preferredTier: body.preferredTier,
      });
      return NextResponse.json(result);
    }

    if (action === 'delegate') {
      const result = await bus.delegateDirect(
        body.query || body.message,
        body.context || '',
        body.targetModel || 'cloud-smart'
      );
      return NextResponse.json(result);
    }

    if (action === 'reset-budget') {
      bus.resetBudget();
      return NextResponse.json({ success: true, message: 'Budget reset' });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('Message bus error:', error);
    return NextResponse.json(
      { error: 'Message bus processing failed', details: String(error) },
      { status: 500 }
    );
  }
}
