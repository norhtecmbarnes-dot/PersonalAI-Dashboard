// Canada Buys integration removed - no external procurement APIs
// External news scraping removed - system now generates reports without external HTTP calls

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
  canadaBuys: any[];
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
    // Generate empty reports without external HTTP calls
    const report: IntelligenceReport = {
      id: `report_${Date.now()}`,
      createdAt: Date.now(),
      period: this.getReportPeriod(),
      newsSummary: {
        spaceDomainAwareness: [],
        commercialSpace: [],
        noaaCommercialSpace: [],
        jointCommercialOffice: [],
        goldenDome: [],
        generatedAt: Date.now(),
      },
      keyIndividuals: [],
      bidOpportunities: {
        samGov: [],
        canadaBuys: [],
        generatedAt: Date.now(),
      },
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
