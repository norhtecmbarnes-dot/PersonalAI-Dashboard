import { NextRequest, NextResponse } from 'next/server';
import { brandWorkspace } from '@/lib/services/brand-workspace';
import { documentProcessor } from '@/lib/services/document-processor';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const brandId = searchParams.get('id');
    const includeDocuments = searchParams.get('includeDocuments') === 'true';

    if (brandId) {
      const brand = await brandWorkspace.getBrandById(brandId);
      if (!brand) {
        return NextResponse.json({ error: 'Brand not found' }, { status: 404 });
      }

      let documents = undefined;
      if (includeDocuments) {
        documents = await brandWorkspace.getBrandDocuments(brandId);
      }

      return NextResponse.json({ brand, documents });
    }

    const brands = await brandWorkspace.getBrands();
    return NextResponse.json({ brands });
  } catch (error) {
    console.error('Brand API GET error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, ...data } = body;

    switch (action) {
      case 'create': {
        const brand = await brandWorkspace.createBrand(data);
        return NextResponse.json({ success: true, brand });
      }

      case 'update': {
        const { id, ...updates } = data;
        const brand = await brandWorkspace.updateBrand(id, updates);
        if (!brand) {
          return NextResponse.json({ error: 'Brand not found' }, { status: 404 });
        }
        return NextResponse.json({ success: true, brand });
      }

      case 'delete': {
        const { id } = data;
        await brandWorkspace.deleteBrand(id);
        return NextResponse.json({ success: true });
      }

      case 'addDocument': {
        const { brandId, projectId, title, content, type, metadata } = data;
        const document = await brandWorkspace.addDocument(brandId, {
          title,
          content,
          type,
          projectId,
          metadata: {
            ...metadata,
            importedAt: Date.now(),
          },
        });
        return NextResponse.json({ success: true, document });
      }

      case 'addDocumentFromUrl': {
        const { brandId, projectId, url } = data;
        const processed = await documentProcessor.processURL(url);
        const document = await brandWorkspace.addDocument(brandId, {
          title: processed.title,
          content: processed.content,
          type: processed.type,
          projectId,
          metadata: {
            ...processed.metadata,
            url,
            importedAt: Date.now(),
          },
        });
        return NextResponse.json({ success: true, document });
      }

      case 'addDocumentFromText': {
        const { brandId, projectId, title, content } = data;
        const processed = await documentProcessor.processTextContent(content, title);
        const document = await brandWorkspace.addDocument(brandId, {
          title: processed.title,
          content: processed.content,
          type: processed.type,
          projectId,
          metadata: {
            ...processed.metadata,
            importedAt: Date.now(),
          },
        });
        return NextResponse.json({ success: true, document });
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Brand API POST error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}