export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { pythonAnalytics } from '@/lib/analytics/python-analytics';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      code,
      libraries = ['matplotlib', 'networkx', 'pandas', 'numpy'],
      saveImage = true,
    } = body;

    if (!code) {
      return NextResponse.json({ error: 'Python code is required' }, { status: 400 });
    }

    // Check Python availability
    const pythonAvailable = await pythonAnalytics.isPythonAvailable();
    if (!pythonAvailable) {
      return NextResponse.json({
        success: false,
        error: 'Python is not installed or not in PATH',
        fallback: true,
        message: 'Returning code for manual execution',
      });
    }

    // Execute Python code
    const result = await pythonAnalytics.executeWithLibraries(code, libraries);

    if (result.success) {
      return NextResponse.json({
        success: true,
        output: result.output,
        imageUrl: result.imageUrl,
        executionTime: result.executionTime,
        libraries,
      });
    } else {
      return NextResponse.json({
        success: false,
        error: result.error,
        executionTime: result.executionTime,
      });
    }
  } catch (error) {
    console.error('[Python Execute] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to execute Python code',
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  const pythonAvailable = await pythonAnalytics.isPythonAvailable();
  const libraries = pythonAvailable ? await pythonAnalytics.getInstalledLibraries() : [];

  return NextResponse.json({
    pythonAvailable,
    libraries: libraries.filter(lib =>
      ['matplotlib', 'networkx', 'pandas', 'numpy', 'seaborn', 'plotly', 'scipy'].includes(lib)
    ),
  });
}
