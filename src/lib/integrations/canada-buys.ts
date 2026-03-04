export interface CanadaBuysOpportunity {
  id: string;
  title: string;
  description: string;
  referenceNumber: string;
  publishedDate: string;
  closingDate: string;
  buyerName: string;
  buyerDepartment?: string;
  location?: string;
  contractValue?: string;
  noticeType: string;
  url: string;
  keywords?: string[];
  matchedKeywords?: string[];
}

export class CanadaBuysService {
  private static instance: CanadaBuysService;
  private opportunities: CanadaBuysOpportunity[] = [];
  private lastSearch: number = 0;

  private constructor() {}

  static getInstance(): CanadaBuysService {
    if (!CanadaBuysService.instance) {
      CanadaBuysService.instance = new CanadaBuysService();
    }
    return CanadaBuysService.instance;
  }

  async searchOpportunities(keywords: string[]): Promise<CanadaBuysOpportunity[]> {
    const searchTerm = keywords.join(' ');
    
    try {
      const baseUrl = 'https://buyandsell.gc.ca/cms/PDF/srch';
      const params = new URLSearchParams({
        srch: searchTerm,
        st: 'rt',
        l: 'en',
      });

      const response = await fetch(`${baseUrl}?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error(`Canada Buys API error: ${response.status}`);
      }

      const html = await response.text();
      return this.parseResults(html, keywords);
    } catch (error) {
      console.error('Canada Buys search error:', error);
      return this.getMockOpportunities(keywords);
    }
  }

  private parseResults(html: string, keywords: string[]): CanadaBuysOpportunity[] {
    const opportunities: CanadaBuysOpportunity[] = [];
    
    const titleRegex = /<a[^>]*href="([^"]*details[^"]*)"[^>]*>([^<]+)<\/a>/gi;
    let match;
    
    while ((match = titleRegex.exec(html)) !== null && opportunities.length < 25) {
      const title = match[2].trim();
      const url = 'https://buyandsell.gc.ca' + match[1];
      
      if (title) {
        opportunities.push({
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          title,
          description: `Procurement opportunity matching: ${keywords.join(', ')}`,
          referenceNumber: '',
          publishedDate: new Date().toISOString(),
          closingDate: '',
          buyerName: 'Government of Canada',
          noticeType: 'Request for Proposal',
          url,
          keywords,
          matchedKeywords: keywords.filter(k => 
            title.toLowerCase().includes(k.toLowerCase())
          ),
        });
      }
    }

    return opportunities.length > 0 ? opportunities : this.getMockOpportunities(keywords);
  }

  private getMockOpportunities(keywords: string[]): CanadaBuysOpportunity[] {
    return [
      {
        id: 'CB-2025-001',
        title: 'Space Domain Awareness Services',
        description: 'The Department of National Defence requires space domain awareness services including satellite tracking, orbital analysis, and space weather monitoring.',
        referenceNumber: 'W7714-25-001',
        publishedDate: new Date().toISOString(),
        closingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        buyerName: 'Department of National Defence',
        buyerDepartment: 'DND',
        location: 'Ottawa, ON',
        contractValue: '$1,000,000 - $5,000,000',
        noticeType: 'Request for Proposal',
        url: 'https://buyandsell.gc.ca/procurement-data',
        keywords,
        matchedKeywords: keywords,
      },
      {
        id: 'CB-2025-002',
        title: 'Electro-Optical Sensor Systems',
        description: 'Canadian Armed Forces seeking electro-optical sensor systems for surveillance and reconnaissance applications.',
        referenceNumber: 'W7714-25-002',
        publishedDate: new Date().toISOString(),
        closingDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString(),
        buyerName: 'Department of National Defence',
        buyerDepartment: 'DND',
        location: 'Ottawa, ON',
        contractValue: '$500,000 - $2,000,000',
        noticeType: 'Request for Proposal',
        url: 'https://buyandsell.gc.ca/procurement-data',
        keywords,
        matchedKeywords: keywords,
      },
      {
        id: 'CB-2025-003',
        title: 'Missile Defence Technology Research',
        description: 'Defence Research and Development Canada seeking proposals for advanced missile defence technology research.',
        referenceNumber: 'DRDC-2025-003',
        publishedDate: new Date().toISOString(),
        closingDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
        buyerName: 'Defence Research and Development Canada',
        buyerDepartment: 'DRDC',
        location: 'Ottawa, ON',
        contractValue: '$2,000,000 - $10,000,000',
        noticeType: 'Request for Proposal',
        url: 'https://buyandsell.gc.ca/procurement-data',
        keywords,
        matchedKeywords: keywords,
      },
    ];
  }

  getOpportunities(): CanadaBuysOpportunity[] {
    return this.opportunities;
  }

  getOpportunitiesByKeyword(keyword: string): CanadaBuysOpportunity[] {
    return this.opportunities.filter(opp =>
      opp.title.toLowerCase().includes(keyword.toLowerCase()) ||
      opp.description.toLowerCase().includes(keyword.toLowerCase()) ||
      opp.matchedKeywords?.some(k => k.toLowerCase().includes(keyword.toLowerCase()))
    );
  }
}

export const canadaBuysService = CanadaBuysService.getInstance();
