export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { sqlDatabase } from '@/lib/database/sqlite';
import { DocumentStore } from '@/lib/storage/documents';

export async function POST(request: Request) {
  try {
    await sqlDatabase.initialize();
    const body = await request.json();
    const { brandId, message, conversationHistory } = body;

    if (!brandId || !message) {
      return NextResponse.json(
        { error: 'brandId and message are required' },
        { status: 400 }
      );
    }

    const brand = sqlDatabase.getBrandById(brandId);
    if (!brand) {
      return NextResponse.json(
        { error: 'Brand not found' },
        { status: 404 }
      );
    }

    const brandDocuments = brand.documents || [];
    let documentContext = '';

    if (brandDocuments.length > 0) {
      const allDocs = await DocumentStore.getAll();
      const relevantDocs = allDocs.filter((doc: any) => brandDocuments.includes(doc.id));
      
      documentContext = relevantDocs
        .map((doc: any) => `--- Document: ${doc.title} ---\n${doc.content?.substring(0, 5000) || ''}`)
        .join('\n\n');
    }

    let systemPrompt = `You are a helpful AI assistant for ${brand.name}.`;
    
    if (brand.persona) {
      systemPrompt += `\n\nBrand Persona: ${brand.persona}`;
    }
    
    if (brand.systemPrompt) {
      systemPrompt += `\n\nAdditional Instructions: ${brand.systemPrompt}`;
    }
    
    if (brand.voiceStyle) {
      systemPrompt += `\n\nVoice Style: ${brand.voiceStyle}`;
    }
    
    if (documentContext) {
      systemPrompt += `\n\nYou have access to the following brand documents. Use them to answer questions accurately:\n\n${documentContext}`;
    }

    systemPrompt += `\n\nWhen answering questions about ${brand.name}, use information from the provided documents. If the information isn't in the documents, say so. Always maintain the brand's voice and style.`;

    const messages = [
      { role: 'system' as const, content: systemPrompt },
      ...(conversationHistory || []),
      { role: 'user' as const, content: message }
    ];

    const model = body.model || 'openrouter';
    
    const response = await fetch(new URL('/api/chat', request.url).origin + '/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        message,
        conversationHistory: messages,
        systemPrompt
      })
    });

    if (!response.ok) {
      throw new Error('Failed to get chat response');
    }

    const data = await response.json();
    
    return NextResponse.json({
      brand: {
        id: brand.id,
        name: brand.name,
        voiceStyle: brand.voiceStyle
      },
      message: data.message || data.response,
      documentsUsed: brandDocuments.length
    });

  } catch (error) {
    console.error('Brand chat error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    await sqlDatabase.initialize();
    const { searchParams } = new URL(request.url);
    const brandId = searchParams.get('brandId');

    if (!brandId) {
      return NextResponse.json(
        { error: 'brandId is required' },
        { status: 400 }
      );
    }

    const brand = sqlDatabase.getBrandById(brandId);
    if (!brand) {
      return NextResponse.json(
        { error: 'Brand not found' },
        { status: 404 }
      );
    }

    const brandDocuments = brand.documents || [];
    const allDocs = await DocumentStore.getAll();
    const documents = allDocs.filter((doc: any) => brandDocuments.includes(doc.id));

    return NextResponse.json({
      brand: {
        id: brand.id,
        name: brand.name,
        description: brand.description,
        website: brand.website,
        persona: brand.persona,
        systemPrompt: brand.systemPrompt,
        voiceStyle: brand.voiceStyle,
        industry: brand.industry,
        documents: documents.map((d: any) => ({
          id: d.id,
          title: d.title,
          category: d.category,
          tags: d.tags
        })),
        documentsCount: documents.length
      }
    });

  } catch (error) {
    console.error('Brand info error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
