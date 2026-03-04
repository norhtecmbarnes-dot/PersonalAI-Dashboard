import { NextResponse } from 'next/server';
import { DocumentStore } from '@/lib/storage/documents';

export async function GET() {
  try {
    const docs = await DocumentStore.getAll();
    return NextResponse.json({
      documents: docs,
      total: docs.length
    });
  } catch (error) {
    console.error('Error fetching documents:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch documents',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, content, type, tags, metadata, category } = body;

    if (!title || !content) {
      return NextResponse.json(
        { error: 'Title and content are required' },
        { status: 400 }
      );
    }

    const doc = await DocumentStore.create({
      title,
      content,
      size: content.length,
      type: type || 'text',
      category,
      metadata: {
        tags: tags || [],
        ...metadata
      }
    });

    return NextResponse.json({
      document: doc,
      success: true
    });
  } catch (error) {
    console.error('Error creating document:', error);
    return NextResponse.json(
      {
        error: 'Failed to create document',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Document ID is required' },
        { status: 400 }
      );
    }

    const doc = await DocumentStore.update(id, updates);
    
    if (!doc) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      document: doc,
      success: true
    });
  } catch (error) {
    console.error('Error updating document:', error);
    return NextResponse.json(
      {
        error: 'Failed to update document',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Document ID is required' },
        { status: 400 }
      );
    }

    const success = await DocumentStore.delete(id);
    
    return NextResponse.json({
      success
    });
  } catch (error) {
    console.error('Error deleting document:', error);
    return NextResponse.json(
      {
        error: 'Failed to delete document',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}