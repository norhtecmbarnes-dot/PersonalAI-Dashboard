import { NextRequest, NextResponse } from 'next/server';
import { sqlDatabase } from '@/lib/database/sqlite';
import { sanitizeString } from '@/lib/utils/validation';

export async function GET(request: NextRequest) {
  try {
    await sqlDatabase.initialize();
    
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const solicitationNumber = searchParams.get('solicitationNumber');
    
    // If solicitationNumber is provided, find specific opportunity
    if (solicitationNumber) {
      const opportunity = sqlDatabase.getTrackedOpportunityBySolicitationNumber(solicitationNumber);
      return NextResponse.json({ opportunity: opportunity || null });
    }
    
    // Otherwise, filter by status if provided
    const opportunities = sqlDatabase.getTrackedOpportunities(status || undefined);
    
    // Map to response format
    const mapped = opportunities.map((opp: any) => ({
      id: opp.id,
      title: opp.title,
      solicitationNumber: opp.solicitation_number,
      agency: opp.agency,
      status: opp.status,
      responseDeadline: opp.response_deadline,
      userPriority: opp.user_priority,
      pipelineStage: opp.pipeline_stage,
      postedDate: opp.posted_date,
      updatedAt: opp.updated_at,
    }));
    
    return NextResponse.json({ opportunities: mapped, count: mapped.length });
  } catch (error) {
    console.error('Error fetching tracked opportunities:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await sqlDatabase.initialize();
    
    const body = await request.json();
    const { 
      action, 
      id, 
      title, 
      solicitationNumber, 
      type, 
      agency, 
      office, 
      postedDate, 
      responseDeadline, 
      awardAmount, 
      naicsCode, 
      classificationCode, 
      location, 
      synopsis, 
      url, 
      notes, 
      priority, 
      status,
      tags 
    } = body;
    
    // Handle update action
    if (action === 'update' && id) {
      // Update existing tracked opportunity
      const existing = sqlDatabase.getTrackedOpportunityById(id);
      if (!existing) {
        return NextResponse.json({ error: 'Opportunity not found' }, { status: 404 });
      }
      
      const updates: any = {};
      if (status) updates.status = sanitizeString(status);
      if (notes) updates.notes = sanitizeString(notes);
      // More fields could be updated
      
      // For simplicity, we'll just update status and notes
      const success = sqlDatabase.updateTrackedOpportunity(id, updates);
      return NextResponse.json({ success, message: 'Opportunity updated' });
    }
    
    // Default action: track new opportunity
    if (!title || !solicitationNumber) {
      return NextResponse.json({ error: 'Title and solicitationNumber are required' }, { status: 400 });
    }
    
    // Check if already tracked
    const existing = sqlDatabase.getTrackedOpportunityBySolicitationNumber(solicitationNumber);
    if (existing) {
      return NextResponse.json({ error: 'Already tracking this opportunity' }, { status: 409 });
    }
    
    // Add to tracked opportunities
    const result = sqlDatabase.addTrackedOpportunity({
      title: sanitizeString(title),
      solicitationNumber: sanitizeString(solicitationNumber),
      type: type ? sanitizeString(type) : 'Solicitation',
      agency: agency ? sanitizeString(agency) : '',
      office: office ? sanitizeString(office) : '',
      postedDate: postedDate ? sanitizeString(postedDate) : '',
      responseDeadline: responseDeadline ? sanitizeString(responseDeadline) : '',
      awardAmount: awardAmount ? sanitizeString(awardAmount) : '',
      naicsCode: naicsCode ? sanitizeString(naicsCode) : '',
      classificationCode: classificationCode ? sanitizeString(classificationCode) : '',
      location: location ? sanitizeString(location) : '',
      url: url ? sanitizeString(url) : '',
      synopsis: synopsis ? sanitizeString(synopsis) : '',
      notes: notes ? sanitizeString(notes) : '',
      tags: tags && Array.isArray(tags) ? tags.map((t: string) => sanitizeString(t)) : [],
      userPriority: (priority as 'low' | 'medium' | 'high' | 'critical') || 'medium',
      status: 'active',
      pipelineStage: 'interested',
    });
    
    return NextResponse.json({ 
      success: true, 
      opportunity: { 
        id: result.id, 
        title, 
        solicitationNumber,
        createdAt: result.createdAt 
      } 
    });
  } catch (error) {
    console.error('Error tracking opportunity:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}