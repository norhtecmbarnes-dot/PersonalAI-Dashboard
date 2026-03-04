export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { sqlDatabase } from '@/lib/database/sqlite';

export async function GET(request: Request) {
  try {
    await sqlDatabase.initialize();
    const brands = sqlDatabase.getBrands();
    return NextResponse.json({ brands });
  } catch (error) {
    console.error('Brands API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await sqlDatabase.initialize();
    const body = await request.json();
    const { action, brand } = body;

    switch (action) {
      case 'create': {
        const newBrand = sqlDatabase.addBrand(brand);
        return NextResponse.json({ success: true, brand: newBrand });
      }

      case 'update': {
        const updated = sqlDatabase.updateBrand(brand.id, brand);
        return NextResponse.json({ success: !!updated, brand: updated });
      }

      case 'delete': {
        const deleted = sqlDatabase.deleteBrand(brand.id);
        return NextResponse.json({ success: deleted });
      }

      case 'addDocument': {
        const brandData = sqlDatabase.getBrandById(brand.id);
        if (!brandData) return NextResponse.json({ error: 'Brand not found' }, { status: 404 });
        const documents = [...brandData.documents, brand.documentId];
        const updated = sqlDatabase.updateBrand(brand.id, { documents });
        return NextResponse.json({ success: !!updated, brand: updated });
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Brands API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
