import type { AdsMetrics, DateRange } from '../types';
import { format } from 'date-fns';
import { API_BASE_URL } from '../config/api';

export const fetchMetaAds = async (
  dateRange: DateRange,
  compareDateRange: DateRange | null
): Promise<{ current: AdsMetrics; compare: AdsMetrics | null }> => {
  const formatDate = (date: Date) => format(date, 'yyyy-MM-dd');
  const startDate = formatDate(dateRange.startDate);
  const endDate = formatDate(dateRange.endDate);

  try {
    // Call backend proxy for Meta Ads API
    const response = await fetch(`${API_BASE_URL}/api/meta/ads`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        startDate,
        endDate,
      }),
    });

    if (!response.ok) {
      console.error('Meta Ads API error:', response.status);
      return getUnavailableData(compareDateRange);
    }

    const data = await response.json();
    const current = parseMetaAdsResponse(data);
    
    let compare: AdsMetrics | null = null;
    if (compareDateRange) {
      const compareStartDate = formatDate(compareDateRange.startDate);
      const compareEndDate = formatDate(compareDateRange.endDate);
      
      const compareResponse = await fetch(`${API_BASE_URL}/api/meta/ads`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          startDate: compareStartDate,
          endDate: compareEndDate,
        }),
      });

      if (compareResponse.ok) {
        const compareData = await compareResponse.json();
        compare = parseMetaAdsResponse(compareData);
      }
    }

    return { current, compare };
  } catch (error) {
    console.error('Error fetching Meta Ads data:', error);
    return getUnavailableData(compareDateRange);
  }
};

function parseMetaAdsResponse(data: any): AdsMetrics {
  const campaigns: AdsMetrics['campaigns'] = [];
  let totalImpressions = 0;
  let totalClicks = 0;
  let totalSpend = 0;
  let totalLeads = 0;

  if (data.campaigns && Array.isArray(data.campaigns)) {
    data.campaigns.forEach((campaign: any) => {
      const impressions = campaign.impressions || 0;
      const clicks = campaign.clicks || 0;
      const spend = campaign.totalSpend || 0;
      const ctr = campaign.ctr || 0;
      const cpc = campaign.costPerClick || 0;
      const leads = campaign.totalLeads || 0;
      const costPerLead = campaign.costPerLead || 0;

      totalImpressions += impressions;
      totalClicks += clicks;
      totalSpend += spend;
      totalLeads += leads;

      campaigns.push({
        id: campaign.id,
        name: campaign.name,
        impressions,
        clicks,
        ctr,
        costPerClick: cpc,
        totalLeads: leads,
        costPerLead,
        totalSpend: spend,
      });
    });
  }

  return {
    totalImpressions: data.totalImpressions ?? totalImpressions,
    totalClicks: data.totalClicks ?? totalClicks,
    totalCtr: data.totalCtr ?? (totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0),
    totalCostPerClick: data.totalCostPerClick ?? (totalClicks > 0 ? totalSpend / totalClicks : 0),
    totalLeads: data.totalLeads ?? totalLeads,
    totalCostPerLead: data.totalCostPerLead ?? (totalLeads > 0 ? totalSpend / totalLeads : 0),
    totalSpend: data.totalSpend ?? totalSpend,
    campaigns,
  };
}

function getUnavailableData(
  compareDateRange: DateRange | null
): { current: AdsMetrics; compare: AdsMetrics | null } {
  const unavailable: AdsMetrics = {
    totalImpressions: null as any,
    totalClicks: null as any,
    totalCtr: null as any,
    totalCostPerClick: null as any,
    totalLeads: null as any,
    totalCostPerLead: null as any,
    totalSpend: null as any,
    campaigns: [],
  };

  return {
    current: unavailable,
    compare: compareDateRange ? { ...unavailable } : null,
  };
}
