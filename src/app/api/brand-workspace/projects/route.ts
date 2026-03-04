import { NextRequest, NextResponse } from 'next/server';
import { brandWorkspace } from '@/lib/services/brand-workspace';
import type { ProjectType, ProjectStatus } from '@/types/brand-workspace';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('id');
    const brandId = searchParams.get('brandId');
    const status = searchParams.get('status') as ProjectStatus | null;
    const includeDocuments = searchParams.get('includeDocuments') === 'true';
    const includeSessions = searchParams.get('includeSessions') === 'true';

    if (projectId) {
      const project = await brandWorkspace.getProjectById(projectId);
      if (!project) {
        return NextResponse.json({ error: 'Project not found' }, { status: 404 });
      }

      let documents = undefined;
      let sessions = undefined;

      if (includeDocuments) {
        documents = await brandWorkspace.getBrandDocuments(project.brandId, projectId);
      }

      if (includeSessions) {
        sessions = await brandWorkspace.getChatSessions(projectId);
      }

      return NextResponse.json({ project, documents, sessions });
    }

    const projects = await brandWorkspace.getProjects(brandId || undefined, status || undefined);
    return NextResponse.json({ projects });
  } catch (error) {
    console.error('Project API GET error:', error);
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
      case 'create': {
        const { brandId, name, description, type, requirements, deliverables, deadline, metadata, tags } = data;
        const project = await brandWorkspace.createProject(brandId, {
          name,
          description,
          type: type as ProjectType,
          status: 'active' as ProjectStatus,
          requirements,
          deliverables: deliverables || [],
          deadline,
          metadata,
          tags: tags || [],
        });
        return NextResponse.json({ success: true, project });
      }

      case 'update': {
        const { id, ...updates } = data;
        const project = await brandWorkspace.updateProject(id, updates);
        if (!project) {
          return NextResponse.json({ error: 'Project not found' }, { status: 404 });
        }
        return NextResponse.json({ success: true, project });
      }

      case 'delete': {
        const { id } = data;
        await brandWorkspace.deleteProject(id);
        return NextResponse.json({ success: true });
      }

      case 'addDocument': {
        const { projectId, brandId, title, content, type, metadata } = data;
        const document = await brandWorkspace.addDocument(brandId, {
          title,
          content,
          type,
          projectId,
          metadata: {
            ...metadata,
            importedAt: Date.now(),
          },
        });
        return NextResponse.json({ success: true, document });
      }

      case 'getOutputs': {
        const { projectId } = data;
        const outputs = await brandWorkspace.getGeneratedOutputs(projectId);
        return NextResponse.json({ outputs });
      }

      case 'saveOutput': {
        const { projectId, sessionId, type, title, content, format, metadata } = data;
        const output = await brandWorkspace.saveGeneratedOutput(projectId, {
          type,
          title,
          content,
          format,
          sessionId,
          metadata,
        });
        return NextResponse.json({ success: true, output });
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Project API POST error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}