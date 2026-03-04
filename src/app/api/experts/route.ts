import { NextRequest, NextResponse } from 'next/server';
import { expertStorage } from '@/lib/storage/experts';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const prompt = searchParams.get('prompt');

    if (id) {
      const expert = expertStorage.getById(id);
      if (!expert) {
        return NextResponse.json({ error: 'Expert not found' }, { status: 404 });
      }
      
      if (prompt === 'true') {
        return NextResponse.json({ 
          expert,
          systemPrompt: expertStorage.getSystemPrompt(id)
        });
      }
      
      return NextResponse.json({ expert });
    }

    const experts = expertStorage.getAll();
    return NextResponse.json({ experts });
    
  } catch (error) {
    console.error('Experts API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const { name, role, description, capabilities, systemPrompt, personality } = body;
    
    if (!name || !role || !systemPrompt) {
      return NextResponse.json(
        { error: 'Missing required fields: name, role, systemPrompt' },
        { status: 400 }
      );
    }
    
    const expert = expertStorage.add({
      name,
      role,
      description: description || '',
      capabilities: capabilities || [],
      systemPrompt,
      personality: personality || '',
      editable: true
    });
    
    return NextResponse.json({ 
      success: true, 
      expert,
      message: `Expert "${name}" created successfully`
    });
    
  } catch (error) {
    console.error('Experts API error:', error);
    return NextResponse.json(
      { error: 'Failed to create expert' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;
    
    if (!id) {
      return NextResponse.json(
        { error: 'Missing expert ID' },
        { status: 400 }
      );
    }
    
    const updated = expertStorage.update(id, updates);
    
    if (!updated) {
      return NextResponse.json(
        { error: 'Expert not found or not editable' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ 
      success: true, 
      expert: updated,
      message: 'Expert updated successfully'
    });
    
  } catch (error) {
    console.error('Experts API error:', error);
    return NextResponse.json(
      { error: 'Failed to update expert' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { error: 'Missing expert ID' },
        { status: 400 }
      );
    }
    
    const deleted = expertStorage.delete(id);
    
    if (!deleted) {
      return NextResponse.json(
        { error: 'Expert not found or cannot be deleted (default experts are protected)' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ 
      success: true,
      message: 'Expert deleted successfully'
    });
    
  } catch (error) {
    console.error('Experts API error:', error);
    return NextResponse.json(
      { error: 'Failed to delete expert' },
      { status: 500 }
    );
  }
}