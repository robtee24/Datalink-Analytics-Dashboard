import type { AdsMetrics, DateRange } from '../types';

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

