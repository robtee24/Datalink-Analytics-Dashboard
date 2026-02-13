import { useState, useEffect } from 'react';
import type { DateRange } from '../../types';
import { fetchAdsMetrics } from '../../services/adsService';
import SectionHeader from '../SectionHeader';
import KPICard from '../KPICard';

interface RedditAdsProps {
  dateRange: DateRange;
  compareDateRange: DateRange | null;
  loadTrigger: number;
}

export default function RedditAds({ dateRange, compareDateRange, loadTrigger }: RedditAdsProps) {
  const [data, setData] = useState<{
    current: any;
    compare: any | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCampaigns, setSelectedCampaigns] = useState<Set<string>>(new Set());
  const [appliedFilter, setAppliedFilter] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const itemsPerPage = 10;

  useEffect(() => {
    if (loadTrigger === 0) return; // Don't load until triggered
    
    const loadData = async () => {
      setLoading(true);
      try {
        const result = await fetchAdsMetrics('reddit', dateRange, compareDateRange);
        setData(result);
      } catch (error) {
        console.error('Error fetching Reddit Ads data:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [loadTrigger, dateRange, compareDateRange]);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <SectionHeader title="Reddit Ads" logoUrl="https://cdn.simpleicons.org/reddit/FF4500" />
        <div className="text-center py-8">Loading...</div>
      </div>
    );
  }

  if (!data) return null;

  // Apply search filter
  let filteredCampaigns = data.current.campaigns.filter((campaign: any) =>
    campaign.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Apply checkbox filter if active
  if (appliedFilter.size > 0) {
    filteredCampaigns = filteredCampaigns.filter((campaign: any) =>
      appliedFilter.has(campaign.id)
    );
  }

  // Apply sorting
  if (sortColumn) {
    filteredCampaigns = [...filteredCampaigns].sort((a: any, b: any) => {
      let aVal: any = a[sortColumn];
      let bVal: any = b[sortColumn];

      if (sortColumn === 'name') {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }

  const paginatedCampaigns = filteredCampaigns.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalPages = Math.ceil(filteredCampaigns.length / itemsPerPage);

  const toggleCampaign = (campaignId: string) => {
    const newSelected = new Set(selectedCampaigns);
    if (newSelected.has(campaignId)) {
      newSelected.delete(campaignId);
    } else {
      newSelected.add(campaignId);
    }
    setSelectedCampaigns(newSelected);
  };

  const applyFilter = () => {
    setAppliedFilter(new Set(selectedCampaigns));
    setCurrentPage(1);
  };

  const clearFilter = () => {
    setSearchTerm('');
    setSelectedCampaigns(new Set());
    setAppliedFilter(new Set());
    setCurrentPage(1);
    setSortColumn(null);
    setSortDirection('asc');
  };

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
    setCurrentPage(1);
  };

  const getSortIcon = (column: string) => {
    if (sortColumn !== column) {
      return (
        <span className="ml-1 text-gray-400">
          <svg className="w-4 h-4 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
          </svg>
        </span>
      );
    }
    return (
      <span className="ml-1">
        {sortDirection === 'asc' ? '↑' : '↓'}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <SectionHeader title="Reddit Ads" logoUrl="https://cdn.simpleicons.org/reddit/FF4500" />
      
      <div className="bg-blue-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Total Metrics</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <KPICard
            label="Impressions"
            value={data.current.totalImpressions}
            compareValue={data.compare?.totalImpressions}
          />
          <KPICard
            label="Clicks"
            value={data.current.totalClicks}
            compareValue={data.compare?.totalClicks}
          />
          <KPICard
            label="CTR"
            value={data.current.totalCtr !== null ? `${data.current.totalCtr.toFixed(2)}%` : null}
            compareValue={data.compare?.totalCtr !== null && data.compare?.totalCtr !== undefined ? `${data.compare.totalCtr.toFixed(2)}%` : null}
          />
          <KPICard
            label="CPC"
            value={data.current.totalCostPerClick !== null ? `$${data.current.totalCostPerClick.toFixed(2)}` : null}
            compareValue={data.compare?.totalCostPerClick !== null && data.compare?.totalCostPerClick !== undefined ? `$${data.compare.totalCostPerClick.toFixed(2)}` : null}
          />
          <KPICard
            label="Total Leads"
            value={data.current.totalLeads}
            compareValue={data.compare?.totalLeads}
          />
          <KPICard
            label="Cost per Lead"
            value={data.current.totalCostPerLead !== null ? `$${data.current.totalCostPerLead.toFixed(2)}` : null}
            compareValue={data.compare?.totalCostPerLead !== null && data.compare?.totalCostPerLead !== undefined ? `$${data.compare.totalCostPerLead.toFixed(2)}` : null}
          />
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Campaigns</h3>
          <div className="flex gap-4 mb-4">
            <input
              type="text"
              placeholder="Search campaigns..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {selectedCampaigns.size > 0 && appliedFilter.size === 0 && (
              <button
                onClick={applyFilter}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Apply Filter ({selectedCampaigns.size})
              </button>
            )}
            {appliedFilter.size > 0 && (
              <button
                onClick={clearFilter}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Clear Filter
              </button>
            )}
            {searchTerm && appliedFilter.size === 0 && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setCurrentPage(1);
                }}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
              >
                Clear Search
              </button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <input
                    type="checkbox"
                    className="rounded border-gray-300"
                    checked={paginatedCampaigns.length > 0 && paginatedCampaigns.every((c: any) => selectedCampaigns.has(c.id))}
                    onChange={(e) => {
                      if (e.target.checked) {
                        const newSelected = new Set(selectedCampaigns);
                        paginatedCampaigns.forEach((c: any) => newSelected.add(c.id));
                        setSelectedCampaigns(newSelected);
                      } else {
                        const newSelected = new Set(selectedCampaigns);
                        paginatedCampaigns.forEach((c: any) => newSelected.delete(c.id));
                        setSelectedCampaigns(newSelected);
                      }
                    }}
                  />
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('name')}
                >
                  Campaign Name {getSortIcon('name')}
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('impressions')}
                >
                  Impressions {getSortIcon('impressions')}
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('clicks')}
                >
                  Clicks {getSortIcon('clicks')}
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('ctr')}
                >
                  CTR {getSortIcon('ctr')}
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('costPerClick')}
                >
                  CPC {getSortIcon('costPerClick')}
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('totalLeads')}
                >
                  Total Leads {getSortIcon('totalLeads')}
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('costPerLead')}
                >
                  Cost per Lead {getSortIcon('costPerLead')}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedCampaigns.length > 0 ? (
                paginatedCampaigns.map((campaign: any) => (
                  <tr key={campaign.id} className={(selectedCampaigns.has(campaign.id) || appliedFilter.has(campaign.id)) ? 'bg-blue-50' : ''}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedCampaigns.has(campaign.id)}
                        onChange={() => toggleCampaign(campaign.id)}
                        className="rounded border-gray-300"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {campaign.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {campaign.impressions !== null && campaign.impressions !== undefined ? campaign.impressions.toLocaleString() : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {campaign.clicks !== null && campaign.clicks !== undefined ? campaign.clicks.toLocaleString() : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {campaign.ctr !== null && campaign.ctr !== undefined ? campaign.ctr.toFixed(2) + '%' : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {campaign.costPerClick !== null && campaign.costPerClick !== undefined ? '$' + campaign.costPerClick.toFixed(2) : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {campaign.totalLeads !== null && campaign.totalLeads !== undefined ? campaign.totalLeads : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {campaign.costPerLead !== null && campaign.costPerLead !== undefined ? '$' + campaign.costPerLead.toFixed(2) : 'N/A'}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-sm text-gray-500">
                    N/A - No campaigns data available
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredCampaigns.length)} of {filteredCampaigns.length} campaigns
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

