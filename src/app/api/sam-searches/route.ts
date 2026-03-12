import { NextResponse } from 'next/server';
import { sqlDatabase } from '@/lib/database/sqlite';

export async function GET() {
  try {
    sqlDatabase.initialize();
    const searches = sqlDatabase.getSAMSearches();
    return NextResponse.json({ success: true, searches });
  } catch (error) {
    console.error('Error fetching SAM searches:', error);
    return NextResponse.json(
      { error: 'Failed to fetch searches' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    sqlDatabase.initialize();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ error: 'Search ID required' }, { status: 400 });
    }
    
    sqlDatabase.deleteSAMSearch(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting SAM search:', error);
    return NextResponse.json(
      { error: 'Failed to delete search' },
      { status: 500 }
    );
  }
}