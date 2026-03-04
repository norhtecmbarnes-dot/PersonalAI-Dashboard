import { NextRequest, NextResponse } from 'next/server';
import { onlyOfficeService } from '@/lib/integrations/onlyoffice';
import { documentGenerator } from '@/lib/services/document-generator';
import { v4 as uuidv4 } from 'uuid';

// Generate stable key for OnlyOffice (must change after every save to bypass cache)
function generateKey(): string {
  return uuidv4();
}

// Log to AI for self-improvement
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
  } catch {
    // Silent fail - logging shouldn't break operations
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const documentId = searchParams.get('documentId');

    switch (action) {
      case 'list':
        const documents = await onlyOfficeService.listDocuments();
        // Add stable key to each document
        const documentsWithKeys = documents.map(doc => ({
          ...doc,
          key: doc.id, // Use id as key - will be updated on save
        }));
        return NextResponse.json({ success: true, documents: documentsWithKeys });

      case 'get':
        if (!documentId) {
          return NextResponse.json({ error: 'Document ID required' }, { status: 400 });
        }
        const doc = await onlyOfficeService.getDocument(documentId);
        if (!doc) {
          return NextResponse.json({ error: 'Document not found' }, { status: 404 });
        }
        return NextResponse.json({ 
          success: true, 
          document: { ...doc, key: doc.id } 
        });

      case 'config':
        const docId = searchParams.get('docId');
        const mode = searchParams.get('mode') || 'edit';
        
        if (!docId) {
          return NextResponse.json({ error: 'Document ID required' }, { status: 400 });
        }
        
        const document = await onlyOfficeService.getDocument(docId);
        if (!document) {
          return NextResponse.json({ error: 'Document not found' }, { status: 404 });
        }
        
        const config = onlyOfficeService.createEditorConfig(document, mode as 'edit' | 'view');
        return NextResponse.json({ success: true, config });

      default:
        return NextResponse.json({
          endpoints: {
            '?action=list': 'List all documents',
            '?action=get&documentId=ID': 'Get a specific document',
            '?action=config&docId=ID': 'Get editor configuration',
          }
        });
    }
  } catch (error) {
    console.error('OnlyOffice API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, data } = body;

    switch (action) {
      case 'create': {
        const newDoc = await onlyOfficeService.createDocument(
          data.title,
          data.type || 'word'
        );
        await logToAI('document_create', { id: newDoc.id, title: newDoc.title, type: data.type });
        return NextResponse.json({ 
          success: true, 
          document: { ...newDoc, key: newDoc.id } 
        });
      }

      case 'createWithContent': {
        let doc;
        
        if (data.type === 'cell' && data.headers && data.rows) {
          doc = await onlyOfficeService.createSpreadsheetWithData(data.title, {
            headers: data.headers,
            rows: data.rows
          });
        } else if (data.type === 'slide' && data.slides) {
          doc = await onlyOfficeService.createPresentationWithSlides(data.title, data.slides);
        } else {
          const content = Array.isArray(data.content) 
            ? data.content.join('\n\n') 
            : (data.content || '');
          doc = await onlyOfficeService.createDocument(data.title, data.type || 'word', content);
        }
        
        await logToAI('document_create_with_content', { id: doc.id, title: doc.title });
        return NextResponse.json({ success: true, document: { ...doc, key: doc.id } });
      }

      case 'generate': {
        const generatedDoc = await onlyOfficeService.generateDocumentFromPrompt(
          data.prompt,
          data.type || 'word'
        );
        await logToAI('document_generate_ai', { id: generatedDoc.id, prompt: data.prompt?.substring(0, 100) });
        return NextResponse.json({ success: true, document: { ...generatedDoc, key: generatedDoc.id } });
      }

      case 'generateFile': {
        let generated;
        const title = data.title || 'Generated Document';
        
        if (data.type === 'word') {
          const paragraphs = data.content || ['Generated document', 'Created by AI Dashboard'];
          generated = await documentGenerator.createWordDocument(title, paragraphs);
        } else if (data.type === 'cell') {
          generated = documentGenerator.createSpreadsheet(title, {
            headers: data.headers || ['Column 1', 'Column 2', 'Column 3'],
            rows: data.rows || [['Row 1', 'Data', 'More data']]
          });
        } else if (data.type === 'slide') {
          const slides = data.slides || [{ title: 'Title Slide', bulletPoints: ['Generated by AI Dashboard'] }];
          generated = await documentGenerator.createPresentation(title, slides);
        } else {
          generated = documentGenerator.createText(title, data.content || 'Generated content');
        }
        
        const fileDoc = await onlyOfficeService.createDocument(title, data.type || 'word');
        await onlyOfficeService.insertText(fileDoc.id, 
          data.type === 'cell' 
            ? (data.headers?.join(',') + '\n' + data.rows?.map((r: string[]) => r.join(',')).join('\n'))
            : (Array.isArray(data.content) ? data.content.join('\n') : data.content || '')
        );
        
        await logToAI('document_generate_file', { id: fileDoc.id, title });
        return NextResponse.json({ 
          success: true, 
          document: fileDoc,
          downloadUrl: `/api/onlyoffice/download?id=${fileDoc.id}`
        });
      }

      case 'appendToSpreadsheet':
        await onlyOfficeService.appendToSpreadsheet(data.documentId, data.rows);
        await logToAI('document_append', { id: data.documentId });
        return NextResponse.json({ success: true });

      case 'insertText':
        await onlyOfficeService.insertText(
          data.documentId,
          data.text,
          data.position
        );
        await logToAI('document_insert', { id: data.documentId });
        return NextResponse.json({ success: true });

      case 'delete':
        await onlyOfficeService.deleteDocument(data.documentId);
        await logToAI('document_delete', { id: data.documentId });
        return NextResponse.json({ success: true });

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('OnlyOffice API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}