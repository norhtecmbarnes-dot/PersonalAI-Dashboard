export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { sqlDatabase } from '@/lib/database/sqlite';

/**
 * OnlyOffice Callback Handler
 * 
 * OnlyOffice Document Server calls this URL when:
 * - Document is saved (forcesave)
 * - Document is closed for editing
 * - User disconnects
 * 
 * We use this to:
 * 1. Save the document content to SQLite
 * 2. Generate a new key for next edit session
 * 3. Log the event for AI self-improvement
 * 4. Auto-tag with PARA/GTD if content suggests actions
 */

interface OnlyOfficeCallback {
  key: string;
  status: number;
  url?: string;
  changesurl?: string;
  history?: any;
  users?: string[];
  actions?: Array<{ type: number; userid: string }>;
  lastsave?: number;
  notmodified?: boolean;
  forcesavetype?: number;
}

// Status codes from OnlyOffice
const STATUS = {
  BEING_EDITED: 1,
  READY_FOR_SAVING: 2,
  SAVING_ERROR: 3,
  CLOSED_NO_CHANGES: 4,
  FORCESAVE: 6,
  FORCESAVE_ERROR: 7,
};

export async function POST(request: NextRequest) {
  try {
    const body: OnlyOfficeCallback = await request.json();
    
    // Log only essential info, not full body to reduce console spam
    console.log('[OnlyOffice Callback] status:', body.status, 'key:', body.key?.substring(0, 20));
    
    const { key, status, url, users, forcesavetype } = body;
    
    // Extract document ID from key
    const documentId = key.split('_')[0];
    
    switch (status) {
      case STATUS.BEING_EDITED:
        return NextResponse.json({ error: 0 });
        
      case STATUS.READY_FOR_SAVING:
      case STATUS.FORCESAVE:
        if (!url) {
          console.error('[OnlyOffice Callback] No URL provided');
          return NextResponse.json({ error: 1 });
        }
        
        try {
          // Download content from OnlyOffice
          const response = await fetch(url);
          const content = await response.text();
          
          await sqlDatabase.initialize();
          
          // Generate new key for next edit
          const newKey = `${documentId}_${Date.now()}`;
          
          await sqlDatabase.updateDocument(documentId, {
            content,
            tags: [`key:${newKey}`, 'onlyoffice'],
          });
          
          // Log for AI
          await logToAI('document_save', {
            id: documentId,
            status,
            forcesavetype,
            contentLength: content.length,
            users: users || [],
          });
          
          // Extract PARA/GTD tags
          await extractTagsAndTasks(documentId, content);
          
          return NextResponse.json({ error: 0 });
          
        } catch (error) {
          console.error('[OnlyOffice Callback] Save error:', error);
          return NextResponse.json({ error: 1 });
        }
        
      case STATUS.CLOSED_NO_CHANGES:
        await logToAI('document_close', { id: documentId, users });
        return NextResponse.json({ error: 0 });
        
      case STATUS.SAVING_ERROR:
      case STATUS.FORCESAVE_ERROR:
        await logToAI('document_error', { id: documentId, status });
        return NextResponse.json({ error: 0 });
        
      default:
        return NextResponse.json({ error: 0 });
    }
    
  } catch (error) {
    console.error('[OnlyOffice Callback] Error:', error);
    return NextResponse.json({ error: 1 });
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: 'OnlyOffice callback endpoint',
    note: 'POST from OnlyOffice Document Server when documents are saved',
    statuses: {
      1: 'Being edited',
      2: 'Ready for saving',
      3: 'Saving error',
      4: 'Closed no changes',
      6: 'Forcesave',
      7: 'Forcesave error',
    }
  });
}

async function logToAI(event: string, data: any) {
  try {
    await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/ai-log`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source: 'onlyoffice',
        event,
        data,
        timestamp: Date.now(),
      }),
    });
  } catch {}
}

async function extractTagsAndTasks(documentId: string, content: string) {
  try {
    await sqlDatabase.initialize();
    
    const projectKeywords = /\b(project|deadline|goal|launch|complete)\b/gi;
    const taskKeywords = /\b(todo|task|action|must|should|need to)\b/gi;
    const datePattern = /\b(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|tomorrow|next week)\b/gi;
    
    const tags: string[] = ['onlyoffice'];
    
    if (projectKeywords.test(content)) tags.push('para:project');
    
    const doc = sqlDatabase.getDocumentById(documentId);
    if (doc) {
      await sqlDatabase.updateDocument(documentId, {
        tags: [...new Set([...(doc.tags || []), ...tags])],
      });
    }
    
    const taskMatches = content.match(taskKeywords);
    const dateMatches = content.match(datePattern);
    
    if (taskMatches && taskMatches.length > 0) {
      const sentences = content.split(/[.!?]+/).filter(s => taskKeywords.test(s));
      
      if (sentences.length > 0) {
        const taskTitle = sentences[0].substring(0, 200).trim();
        
        await sqlDatabase.addTask({
          title: taskTitle,
          description: `From document: ${doc?.title || 'Unknown'}`,
          priority: 'medium',
          status: 'pending',
          tags: ['auto', 'document', documentId],
          source: 'onlyoffice',
        });
        
        await logToAI('task_created', { documentId, taskTitle: taskTitle.substring(0, 50) });
      }
    }
    
  } catch (error) {
    console.error('[OnlyOffice] Tag extraction error:', error);
  }
}