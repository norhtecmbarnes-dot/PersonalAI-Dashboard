export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { sqlDatabase } from '@/lib/database/sqlite';

export async function POST(request: NextRequest) {
  try {
    await sqlDatabase.initialize();
    
    const body = await request.json();
    const { toolName, parameters } = body;
    
    if (!toolName) {
      return NextResponse.json(
        { error: 'Tool name is required' },
        { status: 400 }
      );
    }
    
    const tool = sqlDatabase.getCustomToolByName(toolName);
    
    if (!tool) {
      return NextResponse.json(
        { error: `Tool "${toolName}" not found` },
        { status: 404 }
      );
    }
    
    if (!tool.enabled) {
      return NextResponse.json(
        { error: `Tool "${toolName}" is disabled` },
        { status: 400 }
      );
    }
    
    // Validate required parameters
    if (tool.parameters) {
      const requiredParams = tool.parameters.filter((p: any) => p.required);
      for (const param of requiredParams) {
        if (parameters[param.name] === undefined || parameters[param.name] === '') {
          return NextResponse.json(
            { error: `Missing required parameter: ${param.name}` },
            { status: 400 }
          );
        }
      }
    }
    
    // Build request
    const method = tool.method || 'POST';
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...tool.headers,
    };
    
    // Replace template variables in endpoint
    let endpoint = tool.endpoint;
    const allParams = parameters || {};
    
    // Replace {param} in endpoint URL
    for (const [key, value] of Object.entries(allParams)) {
      endpoint = endpoint.replace(`{${key}}`, encodeURIComponent(String(value)));
    }
    
    // Build body from template
    let requestBody: string | undefined;
    if (tool.bodyTemplate && method !== 'GET') {
      requestBody = tool.bodyTemplate;
      // Replace {{param}} in body template
      for (const [key, value] of Object.entries(allParams)) {
        if (requestBody) {
          requestBody = requestBody.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), String(value));
        }
      }
      // Also replace any JSON placeholders
      try {
        if (requestBody) {
          const bodyObj = JSON.parse(requestBody);
          for (const [key, value] of Object.entries(allParams)) {
            if (bodyObj[key] === `{{${key}}}`) {
              bodyObj[key] = value;
            }
          }
          requestBody = JSON.stringify(bodyObj);
        }
      } catch {
        // Keep as is if not valid JSON
      }
    } else if (method !== 'GET' && Object.keys(allParams).length > 0) {
      requestBody = JSON.stringify(allParams);
    }
    
    // Make the API call
    const fetchOptions: RequestInit = {
      method,
      headers,
    };
    
    if (requestBody && method !== 'GET') {
      fetchOptions.body = requestBody;
    }
    
    console.log(`[CustomTool] Calling ${tool.name}: ${method} ${endpoint}`);
    
    const response = await fetch(endpoint, fetchOptions);
    const responseText = await response.text();
    
    let responseData: any;
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = responseText;
    }
    
    // Extract data from response path if specified
    let result = responseData;
    if (tool.responsePath && typeof responseData === 'object') {
      const paths = tool.responsePath.split('.');
      for (const path of paths) {
        if (responseData && typeof responseData === 'object' && path in responseData) {
          responseData = responseData[path];
        } else {
          break;
        }
      }
      result = responseData;
    }
    
    if (!response.ok) {
      return NextResponse.json({
        success: false,
        error: `API returned ${response.status}`,
        details: result,
      });
    }
    
    return NextResponse.json({
      success: true,
      data: result,
      metadata: {
        tool: tool.name,
        endpoint: tool.endpoint,
        method: tool.method,
        responsePath: tool.responsePath,
      },
    });
    
  } catch (error) {
    console.error('Error executing custom tool:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to execute custom tool' },
      { status: 500 }
    );
  }
}