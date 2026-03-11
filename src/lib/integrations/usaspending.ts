import { sqlDatabase } from '@/lib/database/sqlite';
import { sanitizeString } from '@/lib/utils/validation';

export interface USASpendingAward {
  id: string;
  title: string;
  description?: string;
  awardAmount: number;
  awardDate: string;
  recipientName: string;
  recipientLocation: string;
  awardingAgency: string;
  fundingAgency: string;
  naicsCode?: string;
  naicsDescription?: string;
  cfdaNumber?: string;
  cfdaTitle?: string;
  awardType?: string;
  uri?: string;
}

export interface USASpendingSearchParams {
  keyword?: string;
  agency?: string;
  naicsCode?: string;
  dateFrom?: string;
  dateTo?: string;
  awardType?: 'contracts' | 'grants' | 'direct_payments' | 'loans' | 'other';
  limit?: number;
  offset?: number;
}

export interface USASpendingAgency {
  id: number;
  name: string;
  abbreviation?: string;
}

const BASE_URL = 'https://api.usaspending.gov/api/v2';

const fetchTimeout = 30000;

const withTimeout = <T>(ms: number, promise: Promise<T>): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Request timed out after ${ms}ms`)), ms)
    ),
  ]);
};

export class USASpendingService {
  private static instance: USASpendingService;
  private agencies: Map<string, number> = new Map();
  private lastAgencyFetch: number = 0;
  private readonly AGENCY_CACHE_TTL = 86400000;

  private constructor() {}

  static getInstance(): USASpendingService {
    if (!USASpendingService.instance) {
      USASpendingService.instance = new USASpendingService();
    }
    return USASpendingService.instance;
  }

  async initialize(): Promise<void> {
    await sqlDatabase.initialize();
  }

  async searchAwards(params: USASpendingSearchParams): Promise<{
    success: boolean;
    count: number;
    total?: number;
    awards: USASpendingAward[];
    error?: string;
  }> {
    const {
      keyword,
      agency,
      naicsCode,
      dateFrom,
      dateTo,
      awardType = 'contracts',
      limit = 10,
      offset = 0,
    } = params;

    try {
      const filters: Record<string, any> = {
        award_type: awardType,
      };

      if (keyword) {
        filters.keywords = [sanitizeString(keyword).slice(0, 200)];
      }

      if (naicsCode) {
        filters.naics_codes = [sanitizeString(naicsCode).slice(0, 10)];
      }

      if (agency) {
        const agencyId = await this.getAgencyId(agency);
        if (agencyId) {
          filters.agency = agencyId;
        }
      }

      if (dateFrom || dateTo) {
        filters.time_period = [];
        if (dateFrom) {
          filters.time_period.push({
            start_date: dateFrom,
            end_date: dateTo || new Date().toISOString().split('T')[0],
          });
        } else if (dateTo) {
          filters.time_period.push({
            start_date: '2000-01-01',
            end_date: dateTo,
          });
        }
      }

      const requestBody = {
        filters,
        page: Math.floor(offset / limit) + 1,
        limit,
        sort: 'Award Amount',
        order: 'desc',
      };

      console.log('[USASpending] Searching awards with filters:', JSON.stringify(requestBody, null, 2));

      const response = await withTimeout(
        fetchTimeout,
        fetch(`${BASE_URL}/search/spending_by_award/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        })
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[USASpending] API error:', response.status, errorText);
        return {
          success: false,
          count: 0,
          awards: [],
          error: `API error: ${response.status}`,
        };
      }

      const data = await response.json();
      const results = data.results || [];
      const page_metadata = data.page_metadata || {};

      const awards: USASpendingAward[] = results.map((item: any) => ({
        id: item.internal_id || item.generated_unique_award_id || `award-${Date.now()}-${Math.random()}`,
        title: item['Awarding Agency'] || item.awarding_agency_name || 'Unknown Agency',
        description: item['Award Description'] || item.transaction_description || undefined,
        awardAmount: item.Amount || item.award_amount || 0,
        awardDate: item['Award Date'] || item.award_date || '',
        recipientName: item.Recipient || item.recipient_name || '',
        recipientLocation: item['Recipient Location'] || item.recipient_location || '',
        awardingAgency: item['Awarding Agency'] || item.awarding_agency_name || '',
        fundingAgency: item['Funding Agency'] || item.funding_agency_name || '',
        naicsCode: item['NAICS Code'] || item.naics_code || undefined,
        naicsDescription: item['NAICS Description'] || item.naics_description || undefined,
        cfdaNumber: item['CFDA Number'] || item.cfda_number || undefined,
        cfdaTitle: item['CFDA Title'] || item.cfda_title || undefined,
        awardType: item['Award Type'] || item.award_type || awardType,
        uri: item.uri || `https://www.usaspending.gov/award/${item.internal_id || item.generated_unique_award_id}`,
      }));

      await this.saveSearch(keyword || 'unknown', params, awards.length);

      return {
        success: true,
        count: awards.length,
        total: page_metadata.total || results.length,
        awards,
      };
    } catch (error) {
      console.error('[USASpending] Search error:', error);
      return {
        success: false,
        count: 0,
        awards: [],
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async getAwardDetails(awardId: string): Promise<USASpendingAward | null> {
    try {
      const response = await withTimeout(
        fetchTimeout,
        fetch(`${BASE_URL}/awards/${awardId}/`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        })
      );

      if (!response.ok) {
        console.error('[USASpending] Award detail error:', response.status);
        return null;
      }

      const data = await response.json();

      return {
        id: data.id || awardId,
        title: data.awarding_agency?.name || 'Unknown Award',
        description: data.description || data.transaction?.description || undefined,
        awardAmount: data.total_obligation || data.amount || 0,
        awardDate: data.period_of_performance?.start_date || data.date_signed || '',
        recipientName: data.recipient?.recipient_name || '',
        recipientLocation: data.recipient?.location?.country_name || '',
        awardingAgency: data.awarding_agency?.name || '',
        fundingAgency: data.funding_agency?.name || '',
        naicsCode: data.naics_code || undefined,
        naicsDescription: data.naics_description || undefined,
        cfdaNumber: data.cfda_number || undefined,
        cfdaTitle: data.cfda_title || undefined,
        awardType: data.category || undefined,
        uri: `https://www.usaspending.gov/award/${awardId}`,
      };
    } catch (error) {
      console.error('[USASpending] Award detail error:', error);
      return null;
    }
  }

  async getAgencies(): Promise<USASpendingAgency[]> {
    try {
      const response = await withTimeout(
        fetchTimeout,
        fetch(`${BASE_URL}/references/toptier_agencies/`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        })
      );

      if (!response.ok) {
        console.error('[USASpending] Agencies error:', response.status);
        return [];
      }

      const data = await response.json();
      const agencies = (data.results || []).map((item: any) => ({
        id: item.id || item.toptier_agency_id,
        name: item.name || item.agency_name,
        abbreviation: item.abbreviation || item.agency_abbreviation,
      }));

      this.agencies.clear();
      for (const agency of agencies) {
        const key = (agency.abbreviation || agency.name).toLowerCase();
        this.agencies.set(key, agency.id);
      }
      this.lastAgencyFetch = Date.now();

      return agencies;
    } catch (error) {
      console.error('[USASpending] Agencies fetch error:', error);
      return [];
    }
  }

  private async getAgencyId(agencyNameOrAbbr: string): Promise<number | null> {
    if (Date.now() - this.lastAgencyFetch > this.AGENCY_CACHE_TTL) {
      await this.getAgencies();
    }

    const key = agencyNameOrAbbr.toLowerCase();
    
    if (this.agencies.has(key)) {
      return this.agencies.get(key) || null;
    }

    for (const [name, id] of this.agencies.entries()) {
      if (name.includes(key) || key.includes(name)) {
        return id;
      }
    }

    const numericId = parseInt(agencyNameOrAbbr);
    if (!isNaN(numericId)) {
      return numericId;
    }

    return null;
  }

  async getSpendingByAgency(params: { year?: string; agency?: string } = {}): Promise<{
    success: boolean;
    data: Array<{ name: string; amount: number; count: number }>;
    error?: string;
  }> {
    try {
      const requestBody: Record<string, any> = {};

      if (params.year) {
        requestBody.filters = {
          time_period: [{ fiscal_year: params.year }],
        };
      }

      const response = await withTimeout(
        fetchTimeout,
        fetch(`${BASE_URL}/search/spending_by_agency/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        })
      );

      if (!response.ok) {
        return {
          success: false,
          data: [],
          error: `API error: ${response.status}`,
        };
      }

      const data = await response.json();
      const results = (data.results || []).map((item: any) => ({
        name: item.name || item.agency_name || 'Unknown',
        amount: item.amount || item.obligation || 0,
        count: item.count || item.award_count || 0,
      }));

      return {
        success: true,
        data: results,
      };
    } catch (error) {
      console.error('[USASpending] Spending by agency error:', error);
      return {
        success: false,
        data: [],
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async getSpendingByCategory(category: string, params: { year?: string } = {}): Promise<{
    success: boolean;
    data: Array<{ name: string; amount: number; count?: number }>;
    error?: string;
  }> {
    const validCategories = [
      'budget_function',
      'budget_subfunction',
      'federal_account',
      'object_class',
      'program_activity',
      'recipient',
      'recipient_duns',
      'naics',
      'naics_category',
      'psc',
      'psc_category',
      'cfda',
      'county',
      'congressional_district',
      'state',
      'country',
    ];

    if (!validCategories.includes(category)) {
      return {
        success: false,
        data: [],
        error: `Invalid category: ${category}. Valid categories: ${validCategories.join(', ')}`,
      };
    }

    try {
      const requestBody: Record<string, any> = {};

      if (params.year) {
        requestBody.filters = {
          time_period: [{ fiscal_year: params.year }],
        };
      }

      const response = await withTimeout(
        fetchTimeout,
        fetch(`${BASE_URL}/search/spending_by_category/${category}/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        })
      );

      if (!response.ok) {
        return {
          success: false,
          data: [],
          error: `API error: ${response.status}`,
        };
      }

      const data = await response.json();
      const results = (data.results || []).map((item: any) => ({
        name: item.name || item.description || 'Unknown',
        amount: item.amount || item.obligation || 0,
        count: item.count || item.award_count || undefined,
      }));

      return {
        success: true,
        data: results,
      };
    } catch (error) {
      console.error('[USASpending] Spending by category error:', error);
      return {
        success: false,
        data: [],
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private async saveSearch(keyword: string, params: USASpendingSearchParams, resultCount: number): Promise<void> {
    try {
      const searchId = `usaspending_${Date.now()}`;
      await sqlDatabase.run(
        `INSERT INTO sam_searches (id, keywords, params, results_count, last_run)
         VALUES (?, ?, ?, ?, ?)`,
        [
          searchId,
          JSON.stringify([keyword]),
          JSON.stringify(params),
          resultCount,
          Date.now(),
        ]
      );
    } catch (error) {
      console.error('[USASpending] Failed to save search:', error);
    }
  }
}

export const usaSpendingService = USASpendingService.getInstance();