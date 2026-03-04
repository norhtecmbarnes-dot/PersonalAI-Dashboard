import { NextRequest, NextResponse } from 'next/server';
import { memoryFileService, memoryToMarkdown, parseMemoryFromMarkdown, MemoryFile, MemorySection } from '@/lib/services/memory-file';

export async function GET(request: NextRequest) {
  try {
    const action = request.nextUrl.searchParams.get('action');
    
    switch (action) {
      case 'memory':
        const memory = memoryFileService.getMemory();
        return NextResponse.json({ success: true, memory });
        
      case 'markdown':
        const md = memoryToMarkdown(memoryFileService.getMemory());
        return NextResponse.json({ success: true, markdown: md });
        
      case 'prompt':
        const prompt = memoryFileService.getSystemPrompt();
        return NextResponse.json({ success: true, prompt });
        
      case 'soul':
        const soul = memoryFileService.loadSoul();
        return NextResponse.json({ success: true, soul });
        
      default:
        return NextResponse.json({ 
          success: false, 
          error: 'Invalid action. Use: memory, markdown, prompt, or soul' 
        }, { status: 400 });
    }
  } catch (error) {
    console.error('Memory file error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to load memory' 
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;
    
    switch (action) {
      case 'updateUser':
        await memoryFileService.updateUser(body.user);
        return NextResponse.json({ success: true });
        
      case 'addProject':
        await memoryFileService.addProject(body.project);
        return NextResponse.json({ success: true });
        
      case 'addBrand':
        await memoryFileService.addBrand(body.brand);
        return NextResponse.json({ success: true });
        
      case 'addKnowledge':
        await memoryFileService.addKnowledge(body.section as MemorySection);
        return NextResponse.json({ success: true });
        
      case 'updateConversation':
        await memoryFileService.updateConversation(
          body.summary, 
          body.topics || [], 
          body.actions || []
        );
        return NextResponse.json({ success: true });
        
      case 'updateContext':
        await memoryFileService.updateContext(
          body.focus,
          body.recentFiles || [],
          body.activeQueries || []
        );
        return NextResponse.json({ success: true });
        
      case 'updateSoul':
        // Save soul to database instead of file
        try {
          const { sqlDatabase } = await import('@/lib/database/sqlite');
          sqlDatabase.setSetting('memory_soul', body.soul);
          return NextResponse.json({ success: true });
        } catch (e) {
          console.error('[MemoryFile] Could not save soul:', e);
          return NextResponse.json({ success: false, error: 'Failed to save soul' }, { status: 500 });
        }
        
      case 'import':
        const imported = parseMemoryFromMarkdown(body.markdown);
        // Save to database
        try {
          const { sqlDatabase } = await import('@/lib/database/sqlite');
          sqlDatabase.setSetting('memory_file', JSON.stringify({
            ...memoryFileService.getMemory(),
            ...imported
          }));
          return NextResponse.json({ success: true, memory: imported });
        } catch (e) {
          console.error('[MemoryFile] Could not import:', e);
          return NextResponse.json({ success: false, error: 'Failed to import' }, { status: 500 });
        }
        
      case 'reset':
        await memoryFileService.reset();
        return NextResponse.json({ success: true });
        
      default:
        return NextResponse.json({ 
          success: false, 
          error: 'Invalid action' 
        }, { status: 400 });
    }
  } catch (error) {
    console.error('Memory file update error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to update memory' 
    }, { status: 500 });
  }
}
