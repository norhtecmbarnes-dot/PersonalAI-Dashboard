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

  if (action === 'cloud-models') {
    return NextResponse.json({ cloudModels: bus.getCloudModelOptions() });
  }

  if (action === 'preferred-cloud') {
    return NextResponse.json({ preferredCloudModel: bus.getPreferredCloudModel() });
  }

  if (action === 'local-models') {
    const localModels = await bus.getLocalModels();
    return NextResponse.json({ localModels });
  }

  if (action === 'triage') {
    const query = searchParams.get('query') || '';
    const context = searchParams.get('context') || '';
    const result = await bus.triageQuery(query, context);
    return NextResponse.json(result);
  }

  return NextResponse.json({
    message: 'Model Message Bus API',
    availableActions: [
      'history',
      'budget',
      'models',
      'cloud-models',
      'preferred-cloud',
      'local-models',
      'triage',
      'process',
      'delegate',
      'reset-budget',
      'set-preferred-cloud',
    ],
  });
}

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action') || 'process';

  try {
    const body = await request.json();
    const bus = getModelBus();

    if (action === 'triage') {
      const result = await bus.triageQuery(body.query, body.context);
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
        preferredCloudModel: body.preferredCloudModel,
      });
      return NextResponse.json(result);
    }

    if (action === 'delegate') {
      const result = await bus.delegateDirect(
        body.query || body.message,
        body.context || '',
        body.targetModel,
        body.apiKey
      );
      return NextResponse.json(result);
    }

    if (action === 'reset-budget') {
      bus.resetBudget();
      return NextResponse.json({ success: true, message: 'Budget reset' });
    }

    if (action === 'set-preferred-cloud') {
      if (body.model) {
        bus.setPreferredCloudModel(body.model);
        return NextResponse.json({ success: true, preferredCloudModel: body.model });
      }
      return NextResponse.json({ error: 'No model provided' }, { status: 400 });
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
