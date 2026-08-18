import { NextRequest, NextResponse } from 'next/server';
import { customerKnowledge } from '@/lib/services/customer-knowledge';
import { brandWorkspace } from '@/lib/services/brand-workspace';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const brandId = searchParams.get('brandId');
    if (!brandId) {
      return NextResponse.json({ error: 'brandId is required' }, { status: 400 });
    }
    const customers = await customerKnowledge.getCustomers(brandId);
    return NextResponse.json({ customers });
  } catch (error) {
    console.error('Customers API GET error:', error);
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
      case 'list': {
        const { brandId } = data;
        if (!brandId) {
          return NextResponse.json({ error: 'brandId is required' }, { status: 400 });
        }
        const customers = await customerKnowledge.getCustomers(brandId);
        return NextResponse.json({ success: true, customers });
      }

      case 'upsert': {
        const { brandId, name, ...fields } = data;
        if (!brandId || !name) {
          return NextResponse.json({ error: 'brandId and name are required' }, { status: 400 });
        }
        const customer = await customerKnowledge.upsertCustomer(brandId, { name, ...fields });
        return NextResponse.json({ success: true, customer });
      }

      case 'delete': {
        const { id } = data;
        if (!id) {
          return NextResponse.json({ error: 'id is required' }, { status: 400 });
        }
        await customerKnowledge.deleteCustomer(id);
        return NextResponse.json({ success: true });
      }

      case 'orgChart': {
        const { brandId, id, model } = data;
        if (!brandId || !id) {
          return NextResponse.json(
            { error: 'brandId and id are required' },
            { status: 400 }
          );
        }
        const customer = await customerKnowledge.buildOrgChartForCustomer(
          brandId,
          id,
          model
        );
        if (!customer) {
          return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
        }
        return NextResponse.json({ success: true, customer });
      }

      case 'learn': {
        const { brandId, projectId } = data;
        if (!brandId || !projectId) {
          return NextResponse.json(
            { error: 'brandId and projectId are required' },
            { status: 400 }
          );
        }
        const customer = await customerKnowledge.learnFromProject(brandId, projectId);
        return NextResponse.json({ success: true, customer });
      }

      case 'learnAll': {
        const { brandId } = data;
        if (!brandId) {
          return NextResponse.json({ error: 'brandId is required' }, { status: 400 });
        }
        const projects = await brandWorkspace.getProjects(brandId);
        const learned: string[] = [];
        for (const project of projects) {
          const customer = await customerKnowledge
            .learnFromProject(brandId, project.id)
            .catch(() => null);
          if (customer) learned.push(`${customer.name} (${project.name})`);
        }
        const customers = await customerKnowledge.getCustomers(brandId);
        return NextResponse.json({ success: true, learned, customers });
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Customers API POST error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
