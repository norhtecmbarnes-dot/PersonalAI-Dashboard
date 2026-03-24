// =============================================================================
// DEPRECATED - SAM.gov API Routes
// This functionality is moved to future/proposal-manager for later development
// =============================================================================
// import { NextRequest, NextResponse } from 'next/server';
// import { sqlDatabase } from '@/lib/database/sqlite';
// import { sanitizeString } from '@/lib/utils/validation';
//
// export async function GET(request: NextRequest) {
//   try {
//     sqlDatabase.initialize();
//
//     const { searchParams } = new URL(request.url);
//     const keyword = searchParams.get('keyword');
//     const limit = parseInt(searchParams.get('limit') || '5');
//     const offset = parseInt(searchParams.get('offset') || '0');
//
//     if (!keyword) {
//       return NextResponse.json({ error: 'Keyword is required' }, { status: 400 });
//     }
//
//     // ... SAM.gov functionality moved to future/proposal-manager
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  return NextResponse.json(
    {
      error: 'SAM.gov API has been moved to future development',
      message: 'This feature will be available in the proposal manager module',
    },
    { status: 410 }
  );
}
