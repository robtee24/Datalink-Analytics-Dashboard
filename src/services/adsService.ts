import type { AdsMetrics, DateRange } from '../types';

const _generateMockCampaigns = (platform: string, count: number): AdsMetrics['campaigns'] => {
  return Array.from({ length: count }, (_, i) => ({
    id: `${platform}-campaign-${i + 1}`,
    name: `${platform} Campaign ${i + 1}`,
    impressions: Math.floor(Math.random() * 50000) + 10000,
    clicks: Math.floor(Math.random() * 2000) + 200,
    ctr: Math.random() * 5 + 1,
    costPerClick: Math.random() * 2 + 0.5,
    totalLeads: Math.floor(Math.random() * 100) + 10,
    costPerLead: Math.random() * 50 + 10,
    totalSpend: Math.floor(Math.random() * 5000) + 500,
  }));
};

export const fetchAdsMetrics = async (
  platform: 'meta' | 'reddit' | 'google' | 'linkedin',
  _dateRange: DateRange,
  compareDateRange: DateRange | null
): Promise<{ current: AdsMetrics; compare: AdsMetrics | null }> => {
  try {
    // TODO: Implement actual API calls for each platform
    // For now, return unavailable data
    throw new Error(`${platform} Ads API not yet implemented`);
  } catch (error) {
    console.error(`Error fetching ${platform} Ads data:`, error);
    // Return unavailable data (will show N/A)
    return getUnavailableData(compareDateRange);
  }
};

function getUnavailableData(
  compareDateRange: DateRange | null
): { current: AdsMetrics; compare: AdsMetrics | null } {
  const unavailableCurrent: AdsMetrics = {
    totalImpressions: null,
    totalClicks: null,
    totalCtr: null,
    totalCostPerClick: null,
    totalLeads: null,
    totalCostPerLead: null,
    totalSpend: null,
    campaigns: [],
  };

  const unavailableCompare: AdsMetrics | null = compareDateRange
    ? {
        totalImpressions: null,
        totalClicks: null,
        totalCtr: null,
        totalCostPerClick: null,
        totalLeads: null,
        totalCostPerLead: null,
        totalSpend: null,
        campaigns: [],
      }
    : null;

  return { current: unavailableCurrent, compare: unavailableCompare };
}

