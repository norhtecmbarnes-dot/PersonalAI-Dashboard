export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { sqlDatabase } from '@/lib/database/sqlite';

export async function GET(request: Request) {
  try {
    sqlDatabase.initialize();
    const { searchParams } = new URL(request.url);
    const folderId = searchParams.get('folderId') || undefined;
    const brandId = searchParams.get('brandId') || undefined;
    const status = searchParams.get('status') as any || undefined;
    
    const projects = sqlDatabase.getProjects(folderId, brandId, status);
    return NextResponse.json({ projects });
  } catch (error) {
    console.error('Projects API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    sqlDatabase.initialize();
    const body = await request.json();
    const { action, project } = body;

    switch (action) {
      case 'create': {
        const newProject = sqlDatabase.addProject(project);
        return NextResponse.json({ success: true, project: newProject });
      }

      case 'update': {
        const updated = sqlDatabase.updateProject(project.id, project);
        return NextResponse.json({ success: !!updated, project: updated });
      }

      case 'delete': {
        const deleted = sqlDatabase.deleteProject(project.id);
        return NextResponse.json({ success: deleted });
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Projects API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
