'use client';

import { useState, useEffect } from 'react';

interface NewsArticle {
  title: string;
  source: string;
  url: string;
  publishedDate: string;
  summary: string;
  keyPoints: string[];
}

interface KeyIndividual {
  name: string;
  title?: string;
  organization?: string;
  linkedInUrl?: string;
  email?: string;
  phone?: string;
  notes?: string;
  sources: string[];
}

interface BidOpportunity {
  id: string;
  title: string;
  synopsis?: string;
  description?: string;
  solicitationNumber?: string;
  referenceNumber?: string;
  postedDate: string;
  closingDate?: string;
  responseDeadline?: string;
  awardAmount?: string;
  contractValue?: string;
  agency?: string;
  buyerName?: string;
  buyerDepartment?: string;
  location?: string;
  url: string;
  keywords?: string[];
}

interface USASpendingAward {
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

interface FederalSpending {
  topAgencies: Array<{ name: string; amount: number; count: number }>;
  topRecipients: Array<{ name: string; amount: number }>;
  totalSpending: number;
  generatedAt: number;
}

interface IntelligenceReport {
  id: string;
  createdAt: number;
  period: string;
  newsSummary: {
    spaceDomainAwareness: NewsArticle[];
    commercialSpace: NewsArticle[];
    noaaCommercialSpace: NewsArticle[];
    jointCommercialOffice: NewsArticle[];
    goldenDome: NewsArticle[];
    generatedAt: number;
  };
  keyIndividuals: KeyIndividual[];
  bidOpportunities: {
    samGov: BidOpportunity[];
    usaspending: USASpendingAward[];
    generatedAt: number;
  };
  federalSpending?: FederalSpending;
}

export default function IntelligencePage() {
  const [report, setReport] = useState<IntelligenceReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'news' | 'people' | 'bids' | 'spending'>('bids');
  const [newsCategory, setNewsCategory] = useState<string>('spaceDomainAwareness');

  useEffect(() => {
    loadLatestReport();
  }, []);

  const loadLatestReport = async () => {
    try {
      const response = await fetch('/api/intelligence?latest=true');
      const data = await response.json();
      if (data.latestReport) {
        setReport(data.latestReport);
      }
    } catch (error) {
      console.error('Error loading report:', error);
    }
  };

  const generateReport = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/intelligence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generate' }),
      });
      const data = await response.json();
      if (data.report) {
        setReport(data.report);
      }
    } catch (error) {
      console.error('Error generating report:', error);
    } finally {
      setLoading(false);
    }
  };

  const newsCategories = [
    { key: 'spaceDomainAwareness', label: 'Space Domain Awareness' },
    { key: 'commercialSpace', label: 'Commercial Space' },
    { key: 'noaaCommercialSpace', label: 'NOAA Commercial Space' },
    { key: 'jointCommercialOffice', label: 'Joint Commercial Office' },
    { key: 'goldenDome', label: 'Golden Dome' },
  ];

  const getArticles = (): NewsArticle[] => {
    if (!report) return [];
    return (report.newsSummary[newsCategory as keyof typeof report.newsSummary] as NewsArticle[]) || [];
  };

  const formatCurrency = (amount: number): string => {
    if (amount >= 1000000000) {
      return `$${(amount / 1000000000).toFixed(2)}B`;
    }
    if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(2)}M`;
    }
    if (amount >= 1000) {
      return `$${(amount / 1000).toFixed(1)}K`;
    }
    return `$${amount.toFixed(0)}`;
  };

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white">Intelligence Report</h1>
            <p className="text-gray-400 mt-1">
              Federal Spending, Contracts & Opportunities
            </p>
          </div>
          <button
            onClick={generateReport}
            disabled={loading}
            className="px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white rounded-lg font-medium"
          >
            {loading ? 'Generating...' : 'Generate New Report'}
          </button>
        </div>

        {report && (
          <>
            <div className="flex gap-2 mb-6 flex-wrap">
              <button
                onClick={() => setActiveTab('spending')}
                className={`px-4 py-2 rounded-lg font-medium ${
                  activeTab === 'spending' ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-300'
                }`}
              >
                Federal Spending
              </button>
              <button
                onClick={() => setActiveTab('bids')}
                className={`px-4 py-2 rounded-lg font-medium ${
                  activeTab === 'bids' ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-300'
                }`}
              >
                Opportunities ({(report.bidOpportunities.samGov?.length || 0) + (report.bidOpportunities.usaspending?.length || 0)})
              </button>
              <button
                onClick={() => setActiveTab('news')}
                className={`px-4 py-2 rounded-lg font-medium ${
                  activeTab === 'news' ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-300'
                }`}
              >
                News ({getArticles().length})
              </button>
              <button
                onClick={() => setActiveTab('people')}
                className={`px-4 py-2 rounded-lg font-medium ${
                  activeTab === 'people' ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-300'
                }`}
              >
                Key People ({report.keyIndividuals.length})
              </button>
            </div>

            {activeTab === 'spending' && report.federalSpending && (
              <div className="space-y-6">
                <div className="bg-gray-800 rounded-lg p-6">
                  <h2 className="text-xl font-semibold text-white mb-2">Federal Spending Overview</h2>
                  <p className="text-4xl font-bold text-green-400">
                    {formatCurrency(report.federalSpending.totalSpending)}
                  </p>
                  <p className="text-gray-400 text-sm mt-1">
                    Total from top agencies
                  </p>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-4">Top Agencies by Spending</h3>
                    <div className="space-y-2">
                      {report.federalSpending.topAgencies.map((agency, idx) => (
                        <div key={idx} className="bg-gray-800 rounded-lg p-3 flex justify-between items-center">
                          <div>
                            <p className="text-white font-medium">{agency.name}</p>
                            <p className="text-gray-400 text-sm">{agency.count?.toLocaleString() || 0} awards</p>
                          </div>
                          <p className="text-green-400 font-semibold">{formatCurrency(agency.amount)}</p>
                        </div>
                      ))}
                      {report.federalSpending.topAgencies.length === 0 && (
                        <p className="text-gray-500">No agency data available</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-white mb-4">Top Recipients</h3>
                    <div className="space-y-2">
                      {report.federalSpending.topRecipients.map((recipient, idx) => (
                        <div key={idx} className="bg-gray-800 rounded-lg p-3 flex justify-between items-center">
                          <p className="text-white font-medium truncate pr-4">{recipient.name}</p>
                          <p className="text-green-400 font-semibold whitespace-nowrap">{formatCurrency(recipient.amount)}</p>
                        </div>
                      ))}
                      {report.federalSpending.topRecipients.length === 0 && (
                        <p className="text-gray-500">No recipient data available</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'spending' && !report.federalSpending && (
              <div className="text-center text-gray-400 py-12">
                <p className="text-lg">No federal spending data available.</p>
                <p className="mt-2">Click "Generate New Report" to fetch spending data.</p>
              </div>
            )}

            {activeTab === 'bids' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-semibold text-white mb-4">
                    USA Spending Awards ({report.bidOpportunities.usaspending?.length || 0})
                  </h2>
                  <div className="grid gap-4">
                    {report.bidOpportunities.usaspending?.map((award, idx) => (
                      <div key={idx} className="bg-gray-800 rounded-lg p-4">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold text-white">{award.title || award.awardingAgency}</h3>
                            <p className="text-gray-400 text-sm mt-1">{award.recipientName}</p>
                          </div>
                          <div className="text-right ml-4">
                            <p className="text-2xl font-bold text-green-400">{formatCurrency(award.awardAmount)}</p>
                            {award.uri && (
                              <a
                                href={award.uri}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-400 hover:text-blue-300 text-sm"
                              >
                                View on USASpending.gov
                              </a>
                            )}
                          </div>
                        </div>
                        {award.description && (
                          <p className="text-gray-300 mt-2 text-sm line-clamp-2">{award.description}</p>
                        )}
                        <div className="flex gap-4 mt-2 text-sm text-gray-400 flex-wrap">
                          {award.awardingAgency && <span>Agency: {award.awardingAgency}</span>}
                          {award.naicsDescription && <span>NAICS: {award.naicsDescription}</span>}
                          {award.awardDate && <span>Date: {new Date(award.awardDate).toLocaleDateString()}</span>}
                        </div>
                      </div>
                    ))}
                    {(!report.bidOpportunities.usaspending || report.bidOpportunities.usaspending.length === 0) && (
                      <p className="text-gray-500">No USASpending awards available. Generate a report to fetch data.</p>
                    )}
                  </div>
                </div>

                <div>
                  <h2 className="text-xl font-semibold text-white mb-4">SAM.gov Opportunities</h2>
                  <div className="grid gap-4">
                    {report.bidOpportunities.samGov.map((opp, idx) => (
                      <div key={idx} className="bg-gray-800 rounded-lg p-4">
                        <div className="flex justify-between items-start">
                          <h3 className="text-lg font-semibold text-white">{opp.title}</h3>
                          {opp.url && (
                            <a
                              href={opp.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-400 hover:text-blue-300 text-sm"
                            >
                              View
                            </a>
                          )}
                        </div>
                        <p className="text-gray-400 text-sm mt-1">{opp.solicitationNumber}</p>
                        <p className="text-gray-300 mt-2 line-clamp-2">{opp.synopsis}</p>
                        <div className="flex gap-4 mt-2 text-sm text-gray-400 flex-wrap">
                          {opp.agency && <span>Agency: {opp.agency}</span>}
                          {opp.awardAmount && <span>Amount: {opp.awardAmount}</span>}
                          {opp.responseDeadline && <span>Deadline: {new Date(opp.responseDeadline).toLocaleDateString()}</span>}
                        </div>
                      </div>
                    ))}
                    {report.bidOpportunities.samGov.length === 0 && (
                      <p className="text-gray-500">No SAM.gov opportunities available.</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'news' && (
              <div className="space-y-6">
                <div className="flex gap-2 flex-wrap">
                  {newsCategories.map((cat) => (
                    <button
                      key={cat.key}
                      onClick={() => setNewsCategory(cat.key)}
                      className={`px-3 py-1 rounded-full text-sm ${
                        newsCategory === cat.key
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-800 text-gray-300'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>

                <div className="grid gap-4">
                  {getArticles().map((article, idx) => (
                    <div key={idx} className="bg-gray-800 rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <h3 className="text-lg font-semibold text-white">{article.title}</h3>
                        <a
                          href={article.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:text-blue-300 text-sm"
                        >
                          Source
                        </a>
                      </div>
                      <p className="text-gray-400 text-sm mt-1">{article.source} • {new Date(article.publishedDate).toLocaleDateString()}</p>
                      <p className="text-gray-300 mt-2">{article.summary}</p>
                      {article.keyPoints.length > 0 && (
                        <ul className="mt-2 list-disc list-inside text-gray-400 text-sm">
                          {article.keyPoints.map((point, i) => (
                            <li key={i}>{point}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'people' && (
              <div className="grid gap-4">
                {report.keyIndividuals.map((person, idx) => (
                  <div key={idx} className="bg-gray-800 rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-lg font-semibold text-white">{person.name}</h3>
                        {person.title && <p className="text-gray-400 text-sm">{person.title}</p>}
                        {person.organization && <p className="text-purple-400 text-sm">{person.organization}</p>}
                      </div>
                      {person.linkedInUrl && (
                        <a
                          href={person.linkedInUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm"
                        >
                          LinkedIn
                        </a>
                      )}
                    </div>
                    {person.notes && <p className="text-gray-400 text-sm mt-2">{person.notes}</p>}
                  </div>
                ))}
                {report.keyIndividuals.length === 0 && (
                  <p className="text-gray-500 text-center">No key individuals tracked.</p>
                )}
              </div>
            )}
          </>
        )}

        {!report && !loading && (
          <div className="text-center text-gray-400 py-12">
            <p className="text-lg">No intelligence report available.</p>
            <p className="mt-2">Click "Generate New Report" to scan for intelligence.</p>
          </div>
        )}
      </div>
    </div>
  );
}