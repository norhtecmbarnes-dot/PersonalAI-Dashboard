import { NextRequest, NextResponse } from 'next/server';
import { brandWorkspace } from '@/lib/services/brand-workspace';
import { documentProcessor } from '@/lib/services/document-processor';
import type { ChatMessage } from '@/types/brand-workspace';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    const projectId = searchParams.get('projectId');

    if (sessionId) {
      const session = await brandWorkspace.getChatSessionById(sessionId);
      if (!session) {
        return NextResponse.json({ error: 'Session not found' }, { status: 404 });
      }
      return NextResponse.json({ session });
    }

    if (projectId) {
      const sessions = await brandWorkspace.getChatSessions(projectId);
      return NextResponse.json({ sessions });
    }

    return NextResponse.json({ error: 'sessionId or projectId required' }, { status: 400 });
  } catch (error) {
    console.error('Chat session API GET error:', error);
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
      case 'createSession': {
        const { projectId, brandId, title } = data;
        const session = await brandWorkspace.createChatSession(projectId, brandId, title);
        return NextResponse.json({ success: true, session });
      }

      case 'deleteSession': {
        const { sessionId } = data;
        await brandWorkspace.deleteChatSession(sessionId);
        return NextResponse.json({ success: true });
      }

      case 'chat': {
        const { projectId, brandId, message, sessionId, model } = data;

        if (!brandId) {
          return NextResponse.json({ error: 'Brand ID is required' }, { status: 400 });
        }

        const brand = await brandWorkspace.getBrandById(brandId);
        if (!brand) {
          return NextResponse.json({ error: 'Brand not found' }, { status: 404 });
        }

        // Handle brand-level chat (no project)
        if (!projectId) {
          let session = sessionId 
            ? await brandWorkspace.getChatSessionById(sessionId)
            : null;

          if (!session) {
            session = await brandWorkspace.createChatSession(undefined, brandId, `Brand Chat - ${brand.name} - ${new Date().toLocaleDateString()}`);
          }

          const currentSessionId = session.id;
          const userMessage: Omit<ChatMessage, 'id' | 'timestamp'> = {
            role: 'user',
            content: message,
          };
          session = await brandWorkspace.addMessageToSession(currentSessionId, userMessage);

          if (!session) {
            throw new Error('Failed to add message to session');
          }

          // Build context from brand documents only (no project documents)
          const context = await brandWorkspace.buildContextForChat(brandId, undefined);

          const systemPrompt = buildSystemPrompt(context.systemPrompt, undefined, brand);

          const conversationHistory = session.messages.map(m => ({
            role: m.role as 'user' | 'assistant' | 'system',
            content: m.content,
          }));

          const response = await fetch(new URL('/api/chat', request.url).origin + '/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model: model || brand.settings?.defaultModel || 'ollama/qwen2.5:14b',
              message,
              conversationHistory: [
                { role: 'system' as const, content: systemPrompt },
                ...conversationHistory,
              ],
              systemPrompt,
            }),
          });

          if (!response.ok) {
            throw new Error('Failed to get AI response');
          }

          const responseData = await response.json();
          const assistantContent = responseData.message || responseData.response || 'I apologize, but I was unable to generate a response.';

          const assistantMessage: Omit<ChatMessage, 'id' | 'timestamp'> = {
            role: 'assistant',
            content: assistantContent,
            metadata: {
              model: model || brand.settings?.defaultModel,
              documentsReferenced: context.documents.slice(0, 5).map(d => d.id),
            },
          };
          const updatedSession = await brandWorkspace.addMessageToSession(currentSessionId, assistantMessage);

          return NextResponse.json({
            success: true,
            session: updatedSession,
            message: updatedSession?.messages[updatedSession.messages.length - 1],
          });
        }

        // Project-level chat (existing code)
        const project = await brandWorkspace.getProjectById(projectId);
        if (!project) {
          return NextResponse.json({ error: 'Project not found' }, { status: 404 });
        }

        let session = sessionId 
          ? await brandWorkspace.getChatSessionById(sessionId)
          : null;

        if (!session) {
          session = await brandWorkspace.createChatSession(projectId, brandId);
        }

        const currentSessionId = session.id;
        const userMessage: Omit<ChatMessage, 'id' | 'timestamp'> = {
          role: 'user',
          content: message,
        };
        session = await brandWorkspace.addMessageToSession(currentSessionId, userMessage);

        if (!session) {
          throw new Error('Failed to add message to session');
        }

        const context = await brandWorkspace.buildContextForChat(brandId, projectId);

        const systemPrompt = buildSystemPrompt(context.systemPrompt, project, brand);

        const conversationHistory = session.messages.map(m => ({
          role: m.role as 'user' | 'assistant' | 'system',
          content: m.content,
        }));

        const response = await fetch(new URL('/api/chat', request.url).origin + '/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: model || brand.settings?.defaultModel || 'ollama/qwen2.5:14b',
            message,
            conversationHistory: [
              { role: 'system' as const, content: systemPrompt },
              ...conversationHistory,
            ],
            systemPrompt,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to get AI response');
        }

        const responseData = await response.json();
        const assistantContent = responseData.message || responseData.response || 'I apologize, but I was unable to generate a response.';

        const assistantMessage: Omit<ChatMessage, 'id' | 'timestamp'> = {
          role: 'assistant',
          content: assistantContent,
          metadata: {
            model: model || brand.settings?.defaultModel,
            documentsReferenced: context.documents.slice(0, 5).map(d => d.id),
          },
        };
        const updatedSession = await brandWorkspace.addMessageToSession(currentSessionId, assistantMessage);

        return NextResponse.json({
          success: true,
          session: updatedSession,
          message: updatedSession?.messages[updatedSession.messages.length - 1],
        });
      }

      case 'generateProposal':
      case 'generateQuote': {
        const { projectId, brandId, requirements, sessionId } = data;

        const project = await brandWorkspace.getProjectById(projectId);
        if (!project) {
          return NextResponse.json({ error: 'Project not found' }, { status: 404 });
        }

        const brand = await brandWorkspace.getBrandById(brandId);
        if (!brand) {
          return NextResponse.json({ error: 'Brand not found' }, { status: 404 });
        }

        const context = await brandWorkspace.buildContextForChat(brandId, projectId);

        const outputType = action === 'generateProposal' ? 'proposal' : 'quote';
        const promptTitle = action === 'generateProposal' ? 'Proposal' : 'Quote';

        const prompt = buildGenerationPrompt(outputType, project, brand, context.systemPrompt, requirements);

        const response = await fetch(new URL('/api/chat', request.url).origin + '/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: brand.settings?.defaultModel || 'ollama/qwen2.5:14b',
            message: prompt,
            systemPrompt: `You are a professional ${outputType} writer for ${brand.name}. Generate a comprehensive, well-formatted ${outputType} in markdown format. Use the brand voice and include all relevant information from the provided context.`,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to generate output');
        }

        const responseData = await response.json();
        const generatedContent = responseData.message || responseData.response || '';

        const output = await brandWorkspace.saveGeneratedOutput(projectId, {
          type: outputType as 'proposal' | 'quote',
          title: `${brand.name} ${promptTitle} - ${project.name}`,
          content: generatedContent,
          format: 'markdown',
          sessionId,
        });

        return NextResponse.json({
          success: true,
          output,
          content: generatedContent,
        });
      }

      case 'compactDocument': {
        const { documentId } = data;
        const document = await brandWorkspace.compactDocument(documentId);
        if (!document) {
          return NextResponse.json({ error: 'Document not found' }, { status: 404 });
        }
        return NextResponse.json({ success: true, document });
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Chat API POST error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

function buildSystemPrompt(contextPrompt: string, project: any, brand: any): string {
  let systemPrompt = contextPrompt;

  systemPrompt += `\n\n## Your Role\nYou are an AI assistant for ${brand.name}, working on the "${project.name}" project. `;
  
  if (brand.voiceProfile?.tone) {
    systemPrompt += `Your tone should be ${brand.voiceProfile.tone}. `;
  }
  
  if (brand.voiceProfile?.style) {
    systemPrompt += `Your writing style is ${brand.voiceProfile.style}. `;
  }

  if (brand.voiceProfile?.keyMessages?.length) {
    systemPrompt += `\n\nKey messages to emphasize: ${brand.voiceProfile.keyMessages.join(', ')}.`;
  }

  if (brand.voiceProfile?.avoidPhrases?.length) {
    systemPrompt += `\n\nAvoid using these phrases: ${brand.voiceProfile.avoidPhrases.join(', ')}.`;
  }

  if (brand.voiceProfile?.customInstructions) {
    systemPrompt += `\n\nAdditional instructions: ${brand.voiceProfile.customInstructions}`;
  }

  systemPrompt += `\n\n## Guidelines
- Use information from the provided documents when available
- If the information isn't in the documents, clearly state that
- Maintain consistency with the brand voice
- For proposals and quotes, be professional and comprehensive
- Format responses in markdown when appropriate
- Cite sources from documents when referencing specific information`;

  return systemPrompt;
}

function buildGenerationPrompt(
  outputType: string,
  project: any,
  brand: any,
  contextPrompt: string,
  requirements?: string
): string {
  const typeInstructions: Record<string, string> = {
    proposal: `Generate a comprehensive business proposal that includes:
1. Executive Summary
2. Understanding of Requirements
3. Proposed Solution
4. Timeline & Milestones
5. Deliverables
6. Investment/Pricing (if applicable)
7. Why Choose ${brand.name}
8. Next Steps`,
    quote: `Generate a professional quote that includes:
1. Client/Project Information
2. Scope of Work
3. Itemized Pricing
4. Terms & Conditions
5. Validity Period
6. Contact Information`,
  };

  return `Based on the following context and requirements, generate a ${outputType} for ${brand.name}.

## Project Details
- Name: ${project.name}
- Type: ${project.type}
- Status: ${project.status}
${project.description ? `- Description: ${project.description}` : ''}
${project.requirements ? `- Requirements: ${project.requirements}` : ''}

## Additional Requirements
${requirements || 'No additional requirements specified.'}

## Context from Brand Documents
${contextPrompt}

## Output Format
${typeInstructions[outputType] || 'Generate a professional document.'}

Please generate the ${outputType} now, formatted in markdown.`;
}