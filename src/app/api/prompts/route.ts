export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { sqlDatabase } from '@/lib/database/sqlite';

export async function GET(request: NextRequest) {
  try {
    sqlDatabase.initialize();
    
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const category = searchParams.get('category');
    const query = searchParams.get('query');
    
    if (id) {
      const prompt = sqlDatabase.getPromptById(id);
      if (!prompt) {
        return NextResponse.json({ error: 'Prompt not found' }, { status: 404 });
      }
      sqlDatabase.incrementPromptUse(id);
      return NextResponse.json({ prompt });
    }
    
    if (query) {
      const prompts = sqlDatabase.searchPrompts(query);
      return NextResponse.json({ prompts });
    }
    
    const prompts = sqlDatabase.getPrompts(category || undefined);
    return NextResponse.json({ prompts });
  } catch (error) {
    console.error('Error fetching prompts:', error);
    return NextResponse.json({ error: 'Failed to fetch prompts' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    sqlDatabase.initialize();
    
    const body = await request.json();
    const { action, id, title, content, category, tags, variables } = body;
    
    if (action === 'delete' && id) {
      const deleted = sqlDatabase.deletePrompt(id);
      return NextResponse.json({ success: deleted });
    }
    
    if (action === 'increment' && id) {
      sqlDatabase.incrementPromptUse(id);
      return NextResponse.json({ success: true });
    }
    
    if (!title || !content) {
      return NextResponse.json({ error: 'Title and content are required' }, { status: 400 });
    }
    
    if (id) {
      const updated = sqlDatabase.updatePrompt(id, { title, content, category, tags, variables });
      return NextResponse.json({ success: updated, prompt: sqlDatabase.getPromptById(id) });
    }
    
    const result = sqlDatabase.addPrompt({ title, content, category, tags, variables });
    const prompt = sqlDatabase.getPromptById(result.id);
    
    return NextResponse.json({ success: true, prompt });
  } catch (error) {
    console.error('Error saving prompt:', error);
    return NextResponse.json({ error: 'Failed to save prompt' }, { status: 500 });
  }
}