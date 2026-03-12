export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { sqlDatabase } from '@/lib/database/sqlite';

export async function GET(request: NextRequest) {
  try {
    sqlDatabase.initialize();
    
    const { searchParams } = new URL(request.url);
    const enabledOnly = searchParams.get('enabledOnly') === 'true';
    
    const tools = sqlDatabase.getCustomTools(enabledOnly);
    
    return NextResponse.json({
      success: true,
      tools,
    });
  } catch (error) {
    console.error('Error fetching custom tools:', error);
    return NextResponse.json(
      { error: 'Failed to fetch custom tools' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    sqlDatabase.initialize();
    
    const body = await request.json();
    const { action, tool } = body;
    
    if (action === 'create') {
      if (!tool?.name || !tool?.endpoint) {
        return NextResponse.json(
          { error: 'Tool name and endpoint are required' },
          { status: 400 }
        );
      }
      
      const existing = sqlDatabase.getCustomToolByName(tool.name);
      if (existing) {
        return NextResponse.json(
          { error: `Tool "${tool.name}" already exists` },
          { status: 400 }
        );
      }
      
      const result = sqlDatabase.addCustomTool({
        name: tool.name,
        description: tool.description,
        endpoint: tool.endpoint,
        method: tool.method || 'POST',
        headers: tool.headers,
        bodyTemplate: tool.bodyTemplate,
        parameters: tool.parameters,
        responsePath: tool.responsePath,
      });
      
      return NextResponse.json({
        success: true,
        id: result.id,
        message: `Tool "${tool.name}" created successfully`,
      });
    }
    
    if (action === 'update') {
      if (!tool?.id) {
        return NextResponse.json(
          { error: 'Tool ID is required for update' },
          { status: 400 }
        );
      }
      
      const success = sqlDatabase.updateCustomTool(tool.id, {
        name: tool.name,
        description: tool.description,
        endpoint: tool.endpoint,
        method: tool.method,
        headers: tool.headers,
        bodyTemplate: tool.bodyTemplate,
        parameters: tool.parameters,
        responsePath: tool.responsePath,
        enabled: tool.enabled,
      });
      
      return NextResponse.json({ success, message: success ? 'Tool updated' : 'Tool not found' });
    }
    
    if (action === 'delete') {
      if (!body.id) {
        return NextResponse.json(
          { error: 'Tool ID is required for deletion' },
          { status: 400 }
        );
      }
      
      const success = sqlDatabase.deleteCustomTool(body.id);
      return NextResponse.json({ success, message: success ? 'Tool deleted' : 'Tool not found' });
    }
    
    if (action === 'toggle') {
      if (!body.id) {
        return NextResponse.json(
          { error: 'Tool ID is required' },
          { status: 400 }
        );
      }
      
      const success = sqlDatabase.updateCustomTool(body.id, { enabled: body.enabled });
      return NextResponse.json({ success });
    }
    
    return NextResponse.json(
      { error: 'Invalid action. Use: create, update, delete, or toggle' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error managing custom tool:', error);
    return NextResponse.json(
      { error: 'Failed to manage custom tool' },
      { status: 500 }
    );
  }
}