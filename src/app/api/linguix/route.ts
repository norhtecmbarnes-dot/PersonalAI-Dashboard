export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { sqlDatabase } from '@/lib/database/sqlite';

const LINGUIX_API_URL = 'https://api.linguix.com/api/v1';

interface LinguixAlert {
  length: number;
  offset: number;
  message: string;
  shortMessage?: string;
  category: string;
  replacements: string[];
}

interface LinguixResponse {
  status: number;
  alerts: LinguixAlert[];
  stats?: {
    wordsCount: number;
    charsCount: number;
    sentencesCount: number;
  };
}

function loadApiKey(): string | null {
  try {
    sqlDatabase.initialize();
    return sqlDatabase.getApiKey('linguix');
  } catch (e) {
    console.error('[Linguix] Error loading API key:', e);
    return null;
  }
}

function saveApiKey(apiKey: string): void {
  try {
    sqlDatabase.initialize();
    sqlDatabase.setApiKey('linguix', apiKey);
  } catch (e) {
    console.error('[Linguix] Error saving API key:', e);
  }
}

function deleteApiKey(): void {
  try {
    sqlDatabase.initialize();
    sqlDatabase.deleteApiKey('linguix');
  } catch (e) {
    console.error('[Linguix] Error deleting API key:', e);
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const action = searchParams.get('action');
  const apiKey = loadApiKey();

  switch (action) {
    case 'status': {
      return NextResponse.json({
        configured: !!apiKey,
        usage: { used: 0, limit: 1000000, remaining: 1000000 },
        languages: [
          { code: 'en-US', name: 'English (US)' },
          { code: 'en-GB', name: 'English (UK)' },
          { code: 'es', name: 'Spanish' },
          { code: 'fr', name: 'French' },
          { code: 'de', name: 'German' },
          { code: 'it', name: 'Italian' },
          { code: 'pt', name: 'Portuguese' },
          { code: 'pt-BR', name: 'Portuguese (Brazil)' },
        ],
      });
    }

    default:
      return NextResponse.json({
        configured: !!apiKey,
        usage: { used: 0, limit: 1000000, remaining: 1000000 },
      });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, text, apiKey } = body;

    if (action === 'configure') {
      if (!apiKey) {
        return NextResponse.json({ error: 'API key required' }, { status: 400 });
      }
      saveApiKey(apiKey);
      return NextResponse.json({
        success: true,
        message: 'Linguix API key configured',
      });
    }

    if (action === 'clear') {
      deleteApiKey();
      return NextResponse.json({ success: true, message: 'Configuration cleared' });
    }

    // All other actions require text
    if (!text) {
      return NextResponse.json({ error: 'Text required' }, { status: 400 });
    }

    const key = loadApiKey();
    if (!key) {
      return NextResponse.json(
        { error: 'Linguix not configured. Add API key in Settings.' },
        { status: 400 }
      );
    }

    // Call Linguix API with X-API-Key header
    const response = await fetch(`${LINGUIX_API_URL}/checker`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': key,
      },
      body: JSON.stringify({ text }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('[Linguix] API error:', response.status, errorData);
      return NextResponse.json(
        {
          error: errorData.message || `Linguix API error: ${response.status}`,
        },
        { status: response.status }
      );
    }

    const data: LinguixResponse = await response.json();

    if (action === 'check' || action === 'analyze') {
      const errors = (data.alerts || []).filter(
        (a: LinguixAlert) =>
          a.category === 'Grammar' ||
          a.category === 'Spelling' ||
          a.category === 'TYPOS' ||
          a.category === 'Verb Form'
      ).length;

      const warnings = (data.alerts || []).filter(
        (a: LinguixAlert) => a.category === 'Style' || a.category === 'Punctuation'
      ).length;

      return NextResponse.json({
        status: data.status || 200,
        alerts: data.alerts || [],
        stats: data.stats || {
          wordsCount: text.split(/\s+/).filter((w: string) => w.length > 0).length,
          charsCount: text.length,
          sentencesCount: text.split(/[.!?]+/).filter((s: string) => s.trim().length > 0).length,
        },
        summary:
          action === 'analyze'
            ? { errors, warnings, totalIssues: (data.alerts || []).length }
            : undefined,
      });
    }

    if (action === 'fix' || action === 'quickCheck') {
      let fixedText = text;
      let changes = 0;

      const sortedAlerts = (data.alerts || [])
        .filter((a: LinguixAlert) => a.replacements && a.replacements.length > 0)
        .sort((a: LinguixAlert, b: LinguixAlert) => b.offset - a.offset);

      for (const alert of sortedAlerts) {
        fixedText =
          fixedText.substring(0, alert.offset) +
          alert.replacements[0] +
          fixedText.substring(alert.offset + alert.length);
        changes++;
      }

      if (action === 'quickCheck') {
        const corrections = (data.alerts || []).map((a: LinguixAlert) => ({
          original: text.substring(a.offset, a.offset + a.length),
          replacement: a.replacements?.[0] || '',
          category: a.category,
          message: a.message,
        }));

        return NextResponse.json({
          text,
          corrections,
        });
      }

      return NextResponse.json({
        original: text,
        fixed: fixedText,
        changes,
      });
    }

    // Default: return full response
    return NextResponse.json({
      status: data.status || 200,
      alerts: data.alerts || [],
      stats: data.stats,
    });
  } catch (error) {
    console.error('[Linguix API] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
