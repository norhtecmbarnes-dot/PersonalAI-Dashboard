import { NextRequest, NextResponse } from 'next/server';
import { bidWorkflowService } from '@/lib/services/bid-workflow';
import { brandWorkspace } from '@/lib/services/brand-workspace';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'get';
    const workflowId = searchParams.get('workflowId');
    const projectId = searchParams.get('projectId');
    const brandId = searchParams.get('brandId');
    const limit = parseInt(searchParams.get('limit') || '50');

    switch (action) {
      case 'get':
        if (workflowId) {
          const workflow = await bidWorkflowService.getWorkflowById(workflowId);
          return NextResponse.json({ workflow });
        } else if (projectId) {
          const workflow = await bidWorkflowService.getWorkflowByProject(projectId);
          return NextResponse.json({ workflow });
        } else {
          return NextResponse.json({ error: 'Missing workflowId or projectId' }, { status: 400 });
        }

      case 'list':
        if (!brandId) {
          return NextResponse.json({ error: 'Missing brandId' }, { status: 400 });
        }
        const workflows = await bidWorkflowService.getWorkflowsByBrand(brandId);
        return NextResponse.json({ workflows });

      case 'capture':
        if (!projectId) {
          return NextResponse.json({ error: 'Missing projectId' }, { status: 400 });
        }
        const captureDoc = await bidWorkflowService.getCaptureDocumentByProject(projectId);
        return NextResponse.json({ captureDocument: captureDoc });

      case 'compliance':
        if (!projectId) {
          return NextResponse.json({ error: 'Missing projectId' }, { status: 400 });
        }
        const matrix = await bidWorkflowService.getComplianceMatrixByProject(projectId);
        return NextResponse.json({ complianceMatrix: matrix });

      case 'historical':
        if (!brandId) {
          return NextResponse.json({ error: 'Missing brandId' }, { status: 400 });
        }
        const bids = await bidWorkflowService.getHistoricalBids(brandId, limit);
        return NextResponse.json({ bids });

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Bid workflow API GET error:', error);
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
      case 'start': {
        const { brandId, opportunityId, opportunityData, projectName } = data;
        if (!brandId || !opportunityId) {
          return NextResponse.json({ error: 'Missing brandId or opportunityId' }, { status: 400 });
        }
        const result = await bidWorkflowService.startBidFromOpportunity(brandId, opportunityId, opportunityData, projectName);
        return NextResponse.json({ success: true, ...result });
      }

      case 'capture': {
        const { projectId, documents, model } = data;
        if (!projectId || !documents || !Array.isArray(documents)) {
          return NextResponse.json({ error: 'Missing projectId or documents array' }, { status: 400 });
        }
        const captureDoc = await bidWorkflowService.createCaptureDocument(projectId, documents, model);
        return NextResponse.json({ success: true, captureDocument: captureDoc });
      }

      case 'compliance': {
        const { projectId, documents, model } = data;
        if (!projectId || !documents || !Array.isArray(documents)) {
          return NextResponse.json({ error: 'Missing projectId or documents array' }, { status: 400 });
        }
        const matrix = await bidWorkflowService.createComplianceMatrix(projectId, documents, model);
        return NextResponse.json({ success: true, complianceMatrix: matrix });
      }

      case 'outline': {
        const { projectId, captureDocumentId, complianceMatrixId, model } = data;
        if (!projectId) {
          return NextResponse.json({ error: 'Missing projectId' }, { status: 400 });
        }
        const outline = await bidWorkflowService.generateOutline(projectId, captureDocumentId, complianceMatrixId, model);
        return NextResponse.json({ success: true, outline });
      }

      case 'update': {
        const { projectId, stage, updates } = data;
        if (!projectId || !stage) {
          return NextResponse.json({ error: 'Missing projectId or stage' }, { status: 400 });
        }
        const workflow = await bidWorkflowService.updateWorkflowStage(projectId, stage, updates || {});
        return NextResponse.json({ success: true, workflow });
      }

      case 'historical': {
        const { brandId, limit } = data;
        if (!brandId) {
          return NextResponse.json({ error: 'Missing brandId' }, { status: 400 });
        }
        const bids = await bidWorkflowService.getHistoricalBids(brandId, limit || 5);
        return NextResponse.json({ success: true, bids });
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Bid workflow API POST error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}