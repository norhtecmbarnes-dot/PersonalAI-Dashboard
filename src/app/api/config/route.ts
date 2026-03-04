import { NextResponse } from 'next/server';
import { configManager } from '@/lib/config/app-config';
import { featureManager } from '@/lib/config/features';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    switch (action) {
      case 'config':
        return NextResponse.json(configManager.getConfig());

      case 'features':
        return NextResponse.json({
          features: featureManager.getAllFeatures(),
          categories: featureManager.getCategories(),
          currentState: featureManager.toConfig(),
        });

      case 'models':
        return NextResponse.json({
          models: configManager.getAvailableModels(),
        });

      case 'settings':
        return NextResponse.json(configManager.getSettings());

      case 'isOutOfTheBox':
        return NextResponse.json({
          mode: configManager.getMode(),
          isOutOfTheBox: configManager.isOutOfTheBox(),
        });

      case 'export':
        return NextResponse.json({
          config: configManager.exportConfig(),
        });

      default:
        return NextResponse.json({
          endpoints: {
            '?action=config': 'Get full configuration',
            '?action=features': 'Get feature list',
            '?action=models': 'Get available models',
            '?action=settings': 'Get app settings',
            '?action=isOutOfTheBox': 'Check mode',
            '?action=export': 'Export configuration',
          },
        });
    }
  } catch (error) {
    console.error('Config API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, data } = body;

    switch (action) {
      case 'setMode': {
        const { mode } = data;
        if (mode === 'out-of-the-box' || mode === 'custom') {
          configManager.setMode(mode);
          return NextResponse.json({ success: true, mode });
        }
        return NextResponse.json({ error: 'Invalid mode' }, { status: 400 });
      }

      case 'setAPIKey': {
        const { provider, key, endpoint, model } = data;
        if (!provider || !key) {
          return NextResponse.json(
            { error: 'Provider and key are required' },
            { status: 400 }
          );
        }
        configManager.setAPIKey(provider, key, endpoint, model);
        return NextResponse.json({ success: true, provider });
      }

      case 'removeAPIKey': {
        const { provider } = data;
        const removed = configManager.removeAPIKey(provider);
        return NextResponse.json({ success: removed, provider });
      }

      case 'enableFeature': {
        const { featureId } = data;
        const success = featureManager.enableFeature(featureId);
        if (success) {
          configManager.setFeatureState(featureId, true);
        }
        return NextResponse.json({ success, featureId });
      }

      case 'disableFeature': {
        const { featureId } = data;
        const success = featureManager.disableFeature(featureId);
        if (success) {
          configManager.setFeatureState(featureId, false);
        }
        return NextResponse.json({ success, featureId });
      }

      case 'updateSettings': {
        const { settings } = data;
        configManager.updateSettings(settings);
        return NextResponse.json({ success: true, settings: configManager.getSettings() });
      }

      case 'setSetting': {
        const { key, value } = data;
        configManager.setSetting(key, value);
        return NextResponse.json({ success: true, key, value });
      }

      case 'reset': {
        const { mode } = data;
        if (mode === 'all') {
          configManager.resetToDefaults();
          featureManager.resetToDefaults();
        } else if (mode === 'out-of-the-box') {
          configManager.resetToOutOfTheBox();
        }
        return NextResponse.json({
          success: true,
          mode: configManager.getMode(),
          config: configManager.getConfig(),
        });
      }

      case 'import': {
        const { config: configJson } = data;
        const success = configManager.importConfig(configJson);
        return NextResponse.json({ success });
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Config API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
