import { canadaBuysService, CanadaBuysOpportunity } from '../integrations/canada-buys';

export interface IntelligenceReport {
  id: string;
  createdAt: number;
  period: string;
  newsSummary: NewsSummary;
  keyIndividuals: KeyIndividual[];
  bidOpportunities: BidOpportunityReport;
}

export interface NewsSummary {
  spaceDomainAwareness: Article[];
  commercialSpace: Article[];
  noaaCommercialSpace: Article[];
  jointCommercialOffice: Article[];
  goldenDome: Article[];
  generatedAt: number;
}

export interface Article {
  title: string;
  source: string;
  url: string;
  publishedDate: string;
  summary: string;
  keyPoints: string[];
}

export interface KeyIndividual {
  name: string;
  title?: string;
  organization?: string;
  linkedInUrl?: string;
  email?: string;
  phone?: string;
  notes?: string;
  sources: string[];
}

export interface BidOpportunityReport {
  samGov: any[];
  canadaBuys: CanadaBuysOpportunity[];
  generatedAt: number;
}

export class IntelligenceService {
  private static instance: IntelligenceService;
  private lastReport: IntelligenceReport | null = null;

  static getInstance(): IntelligenceService {
    if (!IntelligenceService.instance) {
      IntelligenceService.instance = new IntelligenceService();
    }
    return IntelligenceService.instance;
  }

  async generateReport(): Promise<IntelligenceReport> {
    const report: IntelligenceReport = {
      id: `report_${Date.now()}`,
      createdAt: Date.now(),
      period: this.getReportPeriod(),
      newsSummary: await this.scanNewsSources(),
      keyIndividuals: this.scanKeyIndividuals(),
      bidOpportunities: await this.scanBidOpportunities(),
    };

    this.lastReport = report;
    this.saveReport(report);
    return report;
  }

  getLastReport(): IntelligenceReport | null {
    return this.lastReport;
  }

  getRecentReports(days: number = 30): IntelligenceReport[] {
    if (typeof window === 'undefined') return [];
    try {
      const reportsJson = localStorage.getItem('intelligence_reports');
      if (!reportsJson) return [];
      
      const reports: IntelligenceReport[] = JSON.parse(reportsJson);
      const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000);
      return reports.filter(r => r.createdAt > cutoff);
    } catch {
      return [];
    }
  }

  private getReportPeriod(): string {
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    return `${yesterday.toLocaleDateString()} - ${now.toLocaleDateString()}`;
  }

  private async scanNewsSources(): Promise<NewsSummary> {
    const sources = [
      { name: 'spaceDomainAwareness', url: 'https://www.spaceforce.mil/News/' },
      { name: 'commercialSpace', url: 'https://spacenews.com/' },
      { name: 'noaaCommercialSpace', url: 'https://www.noaa.gov/commercial-space' },
      { name: 'jointCommercialOffice', url: 'https://www.spacecom.mil/' },
      { name: 'goldenDome', url: 'https://www.mda.mil/' },
    ];

    const summary: NewsSummary = {
      spaceDomainAwareness: [],
      commercialSpace: [],
      noaaCommercialSpace: [],
      jointCommercialOffice: [],
      goldenDome: [],
      generatedAt: Date.now(),
    };

    for (const source of sources) {
      try {
        const articles = await this.scrapeNewsSource(source.url, source.name);
        (summary as any)[source.name] = articles;
      } catch (error) {
        console.error(`Error scanning ${source.name}:`, error);
      }
    }

    return summary;
  }

  private async scrapeNewsSource(url: string, sourceName: string): Promise<Article[]> {
    return [];
  }

  private scanKeyIndividuals(): KeyIndividual[] {
    const individuals = [
      {
        name: 'Gen. Chance Saltzman',
        title: 'Chief of Space Operations',
        organization: 'U.S. Space Force',
        sources: ['https://www.spaceforce.mil/'],
      },
      {
        name: 'Dr. Frank Calvelli',
        title: 'Assistant Secretary of the Air Force for Space Acquisition and Integration',
        organization: 'U.S. Air Force',
        sources: ['https://www.af.mil/'],
      },
      {
        name: 'Lt. Gen. Philip Garrant',
        title: 'Deputy Chief of Space Operations for Strategy, Plans, Programs, and Requirements',
        organization: 'U.S. Space Force',
        sources: ['https://www.spaceforce.mil/'],
      },
    ];

    return individuals.map(ind => ({
      ...ind,
      linkedInUrl: this.generateLinkedInUrl(ind.name),
    }));
  }

  private generateLinkedInUrl(name: string): string {
    const encoded = encodeURIComponent(name);
    return `https://www.linkedin.com/search/results/all/?keywords=${encoded}`;
  }

  private async scanBidOpportunities(): Promise<BidOpportunityReport> {
    // SAM.gov integration has been removed
    const canadaKeywords = [
      'missile defense',
      'space domain awareness',
      'electro-optical',
      'satellite surveillance',
    ];

    const canadaResults = await canadaBuysService.searchOpportunities(canadaKeywords);

    return {
      samGov: [],
      canadaBuys: canadaResults,
      generatedAt: Date.now(),
    };
  }

  private saveReport(report: IntelligenceReport): void {
    if (typeof window === 'undefined') return;
    try {
      const reportsJson = localStorage.getItem('intelligence_reports');
      const reports: IntelligenceReport[] = reportsJson ? JSON.parse(reportsJson) : [];
      
      reports.unshift(report);
      
      const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
      const filtered = reports.filter(r => r.createdAt > thirtyDaysAgo);
      
      localStorage.setItem('intelligence_reports', JSON.stringify(filtered.slice(0, 30)));
    } catch (error) {
      console.error('Error saving intelligence report:', error);
    }
  }
}

export const intelligenceService = IntelligenceService.getInstance();
export default intelligenceService;
