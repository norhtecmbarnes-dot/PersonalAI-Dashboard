import { usaSpendingService, USASpendingAward } from '@/lib/integrations/usaspending';
import { sqlDatabase } from '@/lib/database/sqlite';

export interface IntelligenceReport {
  id: string;
  createdAt: number;
  period: string;
  newsSummary: NewsSummary;
  keyIndividuals: KeyIndividual[];
  bidOpportunities: BidOpportunityReport;
  federalSpending: FederalSpendingReport;
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
  samGov: SAMOpportunity[];
  usaspending: USASpendingAward[];
  generatedAt: number;
}

export interface SAMOpportunity {
  id: string;
  title: string;
  synopsis?: string;
  solicitationNumber?: string;
  postedDate?: string;
  responseDeadline?: string;
  awardAmount?: string;
  agency?: string;
  url?: string;
}

export interface FederalSpendingReport {
  topAgencies: Array<{ name: string; amount: number; count: number }>;
  topRecipients: Array<{ name: string; amount: number }>;
  totalSpending: number;
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

  async generateReport(options: {
    keywords?: string[];
    agencies?: string[];
    naicsCodes?: string[];
  } = {}): Promise<IntelligenceReport> {
    const {
      keywords = ['space', 'satellite', 'aerospace', 'defense', 'technology'],
      agencies = [],
      naicsCodes = [],
    } = options;

    const [samOpportunities, usaspendingAwards, spendingByAgency] = await Promise.all([
      this.getSAMOpportunities(keywords),
      this.getUSASpendingAwards(keywords, agencies, naicsCodes),
      this.getFederalSpending(),
    ]);

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
        samGov: samOpportunities,
        usaspending: usaspendingAwards,
        generatedAt: Date.now(),
      },
      federalSpending: spendingByAgency,
    };

    this.lastReport = report;
    this.saveReport(report);
    return report;
  }

  private async getSAMOpportunities(keywords: string[]): Promise<SAMOpportunity[]> {
    try {
      await sqlDatabase.initialize();
      const opportunities = await sqlDatabase.getSAMOpportunities();
      
      if (opportunities && opportunities.length > 0) {
        return opportunities.slice(0, 10).map((opp: any) => ({
          id: opp.id || opp.notice_id,
          title: opp.title || 'Untitled',
          synopsis: opp.synopsis?.substring(0, 500),
          solicitationNumber: opp.solicitation_number,
          postedDate: opp.posted_date,
          responseDeadline: opp.response_deadline,
          awardAmount: opp.award_amount,
          agency: opp.agency,
          url: opp.url || `https://sam.gov/opp/${opp.id || opp.notice_id}`,
        }));
      }

      return [];
    } catch (error) {
      console.error('[Intelligence] Error fetching SAM opportunities:', error);
      return [];
    }
  }

  private async getUSASpendingAwards(
    keywords: string[],
    agencies: string[],
    naicsCodes: string[]
  ): Promise<USASpendingAward[]> {
    try {
      const allAwards: USASpendingAward[] = [];
      
      for (const keyword of keywords.slice(0, 3)) {
        const result = await usaSpendingService.searchAwards({
          keyword,
          limit: 5,
          awardType: 'contracts',
        });
        
        if (result.success && result.awards.length > 0) {
          allAwards.push(...result.awards);
        }
      }

      for (const agency of agencies.slice(0, 2)) {
        const result = await usaSpendingService.searchAwards({
          agency,
          limit: 5,
          awardType: 'contracts',
        });
        
        if (result.success && result.awards.length > 0) {
          allAwards.push(...result.awards);
        }
      }

      for (const naicsCode of naicsCodes.slice(0, 2)) {
        const result = await usaSpendingService.searchAwards({
          naicsCode,
          limit: 5,
          awardType: 'contracts',
        });
        
        if (result.success && result.awards.length > 0) {
          allAwards.push(...result.awards);
        }
      }

      const seen = new Set<string>();
      const unique = allAwards.filter((award) => {
        if (seen.has(award.id)) return false;
        seen.add(award.id);
        return true;
      });

      return unique
        .sort((a, b) => b.awardAmount - a.awardAmount)
        .slice(0, 20);
    } catch (error) {
      console.error('[Intelligence] Error fetching USASpending awards:', error);
      return [];
    }
  }

  private async getFederalSpending(): Promise<FederalSpendingReport> {
    try {
      const [agencyResult, recipientResult] = await Promise.all([
        usaSpendingService.getSpendingByAgency({}),
        usaSpendingService.getSpendingByCategory('recipient', {}),
      ]);

      const topAgencies = (agencyResult.data || [])
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 10);

      const topRecipients = (recipientResult.data || [])
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 10);

      const totalSpending = topAgencies.reduce((sum, agency) => sum + agency.amount, 0);

      return {
        topAgencies,
        topRecipients,
        totalSpending,
        generatedAt: Date.now(),
      };
    } catch (error) {
      console.error('[Intelligence] Error fetching federal spending:', error);
      return {
        topAgencies: [],
        topRecipients: [],
        totalSpending: 0,
        generatedAt: Date.now(),
      };
    }
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
      const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
      return reports.filter((r) => r.createdAt > cutoff);
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

      const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
      const filtered = reports.filter((r) => r.createdAt > thirtyDaysAgo);

      localStorage.setItem('intelligence_reports', JSON.stringify(filtered.slice(0, 30)));
    } catch (error) {
      console.error('Error saving intelligence report:', error);
    }
  }
}

export const intelligenceService = IntelligenceService.getInstance();
export default intelligenceService;