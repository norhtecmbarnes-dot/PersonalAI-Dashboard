import { sqlDatabase } from '@/lib/database/sqlite';

export interface SAMOpportunity {
  id: string;
  title: string;
  synopsis?: string;
  solicitationNumber: string;
  postedDate?: string;
  responseDeadline?: string;
  awardAmount?: string;
  naicsCode?: string;
  classificationCode?: string;
  agency?: string;
  office?: string;
  location?: string;
  url?: string;
  keywords?: string[];
  matchedKeywords?: string[];
}

export interface SAMSearchParams {
  /** Title search term. Optional when naicsCode/pscCode filters are used. */
  keyword?: string;
  limit?: number;
  offset?: number;
  postedFrom?: string; // MM/dd/yyyy format
  postedTo?: string; // MM/dd/yyyy format
  agency?: string;
  /** Comma-separated NAICS codes — targets opportunities in these industries. */
  naicsCode?: string;
  /** Comma-separated PSC codes (product/service codes). */
  pscCode?: string;
}

export class SamGovService {
  private static instance: SamGovService;
  private apiKey: string | null = null;
  private baseUrl = 'https://api.sam.gov/opportunities/v2/search';

  private constructor() {}

  static getInstance(): SamGovService {
    if (!SamGovService.instance) {
      SamGovService.instance = new SamGovService();
    }
    return SamGovService.instance;
  }

  async initialize(): Promise<void> {
    sqlDatabase.initialize();
    this.apiKey = sqlDatabase.getApiKey('sam');
  }

  getApiKey(): string | null {
    return this.apiKey;
  }

  setApiKey(key: string): void {
    sqlDatabase.setApiKey('sam', key);
    this.apiKey = key;
  }

  private formatDate(date: Date): string {
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const year = date.getFullYear();
    return `${month}/${day}/${year}`;
  }

  async search(params: SAMSearchParams): Promise<{
    success: boolean;
    count: number;
    opportunities: SAMOpportunity[];
    searchId?: string;
  }> {
    if (!this.apiKey) {
      throw new Error('SAM.gov API key not configured');
    }

    const {
      keyword,
      limit = 5,
      offset = 0,
      postedFrom,
      postedTo,
      agency,
      naicsCode,
      pscCode,
    } = params;

    // Build URL with parameters
    const urlParams = new URLSearchParams({
      api_key: this.apiKey,
      limit: limit.toString(),
      offset: offset.toString(),
    });

    if (keyword) urlParams.set('title', keyword);
    if (postedFrom) urlParams.set('postedFrom', postedFrom);
    if (postedTo) urlParams.set('postedTo', postedTo);
    if (agency) urlParams.set('agency', agency);
    if (naicsCode) urlParams.set('naicsCode', naicsCode);
    if (pscCode) urlParams.set('pscCode', pscCode);

    const url = `${this.baseUrl}?${urlParams.toString()}`;

    const response = await fetch(url);
    // Defensive: if the API rejects an unsupported filter param, retry without
    // it so the scan still runs with keyword-only results.
    if (response.status === 400 && (naicsCode || pscCode)) {
      urlParams.delete('naicsCode');
      urlParams.delete('pscCode');
      const retry = await fetch(`${this.baseUrl}?${urlParams.toString()}`);
      if (!retry.ok) {
        const errorText = await retry.text();
        throw new Error(`SAM.gov API error: ${retry.status} - ${errorText}`);
      }
      return this.mapSearchResponse(await retry.json(), keyword);
    }
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`SAM.gov API error: ${response.status} - ${errorText}`);
    }

    return this.mapSearchResponse(await response.json(), keyword);
  }

  /** Map a SAM.gov opportunities v2 search response into our record shape. */
  private mapSearchResponse(data: any, keyword?: string): {
    success: boolean;
    count: number;
    opportunities: SAMOpportunity[];
    searchId?: string;
  } {
    const opportunitiesData = data.opportunitiesData || [];

    // Map to our format
    const opportunities: SAMOpportunity[] = opportunitiesData.map((item: any) => ({
      id: item.id || item.noticeId,
      title: item.title,
      synopsis: item.synopsis,
      solicitationNumber: item.solicitationNumber || item.noticeId,
      postedDate: item.postedDate,
      responseDeadline: item.responseDeadline,
      awardAmount: item.awardAmount,
      naicsCode: item.naicsCode,
      classificationCode: item.classificationCode,
      agency: item.agency,
      office: item.office,
      location: item.placeOfPerformance,
      url: item.uiLink,
      keywords: keyword ? [keyword] : [],
      matchedKeywords: keyword ? [keyword] : [],
    }));

    // Store search and opportunities in database
    const searchId = `search_${Date.now()}`;
    sqlDatabase.addSAMSearch(searchId, keyword ? [keyword] : [], { limit: opportunities.length });
    
    for (const opp of opportunities) {
      sqlDatabase.addSAMOpportunity(opp, searchId);
    }
    
    sqlDatabase.updateSAMSearch(searchId, { resultsCount: opportunities.length, lastRun: Date.now() });

    return {
      success: true,
      count: opportunities.length,
      opportunities,
      searchId,
    };
  }

  async searchSBIR(params: SAMSearchParams & { agency?: string }): Promise<{
    success: boolean;
    count: number;
    opportunities: SAMOpportunity[];
    searchId?: string;
  }> {
    // First perform regular search
    const result = await this.search(params);
    
    // Filter for SBIR opportunities (classificationCode contains 'SBIR' or title contains 'SBIR')
    const sbirOpportunities = result.opportunities.filter((opp: SAMOpportunity) => {
      const classification = opp.classificationCode || '';
      const title = opp.title || '';
      return classification.includes('SBIR') || title.includes('SBIR');
    });
    
    // If agency specified, further filter by agency
    if (params.agency) {
      const agencyFiltered = sbirOpportunities.filter((opp: SAMOpportunity) => 
        opp.agency?.toLowerCase().includes(params.agency!.toLowerCase())
      );
      return {
        success: true,
        count: agencyFiltered.length,
        opportunities: agencyFiltered,
        searchId: result.searchId,
      };
    }
    
    return {
      success: true,
      count: sbirOpportunities.length,
      opportunities: sbirOpportunities,
      searchId: result.searchId,
    };
  }

  async getRecentSearches(): Promise<any[]> {
    sqlDatabase.initialize();
    return sqlDatabase.getSAMSearches();
  }

  async getOpportunities(searchId?: string): Promise<any[]> {
    sqlDatabase.initialize();
    return sqlDatabase.getSAMOpportunities(searchId);
  }

  async clearOpportunities(searchId?: string): Promise<void> {
    sqlDatabase.initialize();
    sqlDatabase.clearSAMOpportunities(searchId);
  }
}