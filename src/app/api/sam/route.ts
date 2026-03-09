import { NextRequest, NextResponse } from 'next/server';
import { sqlDatabase } from '@/lib/database/sqlite';
import { sanitizeString } from '@/lib/utils/validation';

export async function GET(request: NextRequest) {
  try {
    await sqlDatabase.initialize();
    
    const { searchParams } = new URL(request.url);
    const keyword = searchParams.get('keyword');
    const limit = parseInt(searchParams.get('limit') || '5');
    const offset = parseInt(searchParams.get('offset') || '0');
    const postedFrom = searchParams.get('postedFrom');
    const postedTo = searchParams.get('postedTo');
    
    if (!keyword) {
      return NextResponse.json({ error: 'Keyword is required' }, { status: 400 });
    }
    
    const sanitizedKeyword = sanitizeString(keyword).slice(0, 200);
    
    // Get SAM.gov API key
    const apiKey = sqlDatabase.getApiKey('sam');
    if (!apiKey) {
      return NextResponse.json({ error: 'SAM.gov API key not configured' }, { status: 400 });
    }
    
    // Build SAM.gov API URL
    const baseUrl = 'https://api.sam.gov/opportunities/v2/search';
    const params = new URLSearchParams({
      api_key: apiKey,
      limit: limit.toString(),
      offset: offset.toString(),
    });
    
    // Add optional parameters
    if (postedFrom) params.set('postedFrom', postedFrom);
    if (postedTo) params.set('postedTo', postedTo);
    
    // Add keyword as title search (SAM.gov uses 'title' parameter)
    params.set('title', sanitizedKeyword);
    
    const apiUrl = `${baseUrl}?${params.toString()}`;
    
    // Fetch from SAM.gov
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('SAM.gov API error:', response.status, errorText);
      return NextResponse.json({ error: `SAM.gov API error: ${response.status}` }, { status: response.status });
    }
    
    const data = await response.json();
    
    // Store search in database (optional)
    const searchId = `search_${Date.now()}`;
    sqlDatabase.addSAMSearch(searchId, [sanitizedKeyword], { limit, offset, postedFrom, postedTo });
    
    // Store opportunities in database
    if (data.opportunitiesData && Array.isArray(data.opportunitiesData)) {
      for (const opp of data.opportunitiesData) {
        // Map SAM.gov response to our opportunity format
        const mappedOpp = {
          id: opp.id || opp.noticeId,
          title: opp.title,
          synopsis: opp.synopsis,
          solicitationNumber: opp.solicitationNumber || opp.noticeId,
          postedDate: opp.postedDate,
          responseDeadline: opp.responseDeadline,
          awardAmount: opp.awardAmount,
          naicsCode: opp.naicsCode,
          classificationCode: opp.classificationCode,
          agency: opp.agency,
          office: opp.office,
          location: opp.placeOfPerformance,
          url: opp.uiLink,
          keywords: [sanitizedKeyword],
          matchedKeywords: [sanitizedKeyword],
        };
        sqlDatabase.addSAMOpportunity(mappedOpp, searchId);
      }
      sqlDatabase.updateSAMSearch(searchId, { resultsCount: data.opportunitiesData.length, lastRun: Date.now() });
    }
    
    return NextResponse.json({ 
      success: true, 
      count: data.opportunitiesData?.length || 0,
      opportunities: data.opportunitiesData || [],
      searchId 
    });
  } catch (error) {
    console.error('SAM.gov search error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}