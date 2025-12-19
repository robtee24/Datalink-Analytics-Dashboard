import type { AdsMetrics, DateRange } from '../types';
import { API_BASE_URL } from '../config/api';

export const fetchGoogleAds = async (
  dateRange: DateRange,
  compareDateRange: DateRange | null
): Promise<{ current: AdsMetrics; compare: AdsMetrics | null }> => {
  const formatDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  try {
    const startDate = formatDate(dateRange.startDate);
    const endDate = formatDate(dateRange.endDate);

    // Call backend proxy for Google Ads API
    const response = await fetch(`${API_BASE_URL}/api/google/ads`, {
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
      const errorData = await response.json().catch(() => ({ error: response.statusText }));
      console.error('❌ Google Ads API error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorData
      });
      
      if (response.status === 401) {
        console.warn('⚠️ Google Ads requires OAuth2 authentication');
        console.warn('💡 Visit ' + API_BASE_URL + '/api/google/oauth/authorize to authorize');
      } else if (response.status === 403) {
        console.warn('⚠️ Google Ads API not enabled or permission denied');
        console.warn('💡 Enable the API at: https://console.cloud.google.com/apis/library/googleads.googleapis.com');
      } else if (response.status === 400 && (errorData.error === 'Developer token required' || errorData.message?.includes('developer token'))) {
        console.warn('⚠️ Google Ads Developer Token Required');
        console.warn('💡 Get your developer token from: https://ads.google.com/aw/apicenter');
        console.warn('💡 Navigate to: Tools & Settings > API Center in your Google Ads account');
        console.warn('💡 Then set it as GOOGLE_ADS_DEVELOPER_TOKEN environment variable or add to backend/config.js');
        // Store error message for UI display
        (errorData as any).needsDeveloperToken = true;
      }
      
      // Return unavailable data instead of throwing
      return getUnavailableData(compareDateRange);
    }

    const data = await response.json();
    console.log('✅ Google Ads API Response:', {
      hasCampaigns: data.campaigns?.length > 0,
      totalImpressions: data.totalImpressions,
      totalClicks: data.totalClicks,
    });
    
    // Parse the response
    const current: AdsMetrics = {
      totalImpressions: data.totalImpressions !== null && data.totalImpressions !== undefined ? data.totalImpressions : null,
      totalClicks: data.totalClicks !== null && data.totalClicks !== undefined ? data.totalClicks : null,
      totalCtr: data.totalCtr !== null && data.totalCtr !== undefined ? data.totalCtr : null,
      totalCostPerClick: data.totalCostPerClick !== null && data.totalCostPerClick !== undefined ? data.totalCostPerClick : null,
      totalLeads: data.totalLeads !== null && data.totalLeads !== undefined ? data.totalLeads : null,
      totalCostPerLead: data.totalCostPerLead !== null && data.totalCostPerLead !== undefined ? data.totalCostPerLead : null,
      totalSpend: data.totalSpend !== null && data.totalSpend !== undefined ? data.totalSpend : null,
      campaigns: (data.campaigns || []).map((campaign: any) => ({
        id: campaign.id,
        name: campaign.name,
        impressions: campaign.impressions !== null && campaign.impressions !== undefined ? campaign.impressions : null,
        clicks: campaign.clicks !== null && campaign.clicks !== undefined ? campaign.clicks : null,
        ctr: campaign.ctr !== null && campaign.ctr !== undefined ? campaign.ctr : null,
        costPerClick: campaign.costPerClick !== null && campaign.costPerClick !== undefined ? campaign.costPerClick : null,
        totalLeads: campaign.totalLeads !== null && campaign.totalLeads !== undefined ? campaign.totalLeads : null,
        costPerLead: campaign.costPerLead !== null && campaign.costPerLead !== undefined ? campaign.costPerLead : null,
        totalSpend: campaign.totalSpend !== null && campaign.totalSpend !== undefined ? campaign.totalSpend : null,
      })),
    };

    // Fetch compare period data if provided
    let compare: AdsMetrics | null = null;
    if (compareDateRange && response.ok) {
      const compareStartDate = formatDate(compareDateRange.startDate);
      const compareEndDate = formatDate(compareDateRange.endDate);

      try {
        const compareResponse = await fetch(`${API_BASE_URL}/api/google/ads`, {
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
          compare = {
            totalImpressions: compareData.totalImpressions !== null && compareData.totalImpressions !== undefined ? compareData.totalImpressions : null,
            totalClicks: compareData.totalClicks !== null && compareData.totalClicks !== undefined ? compareData.totalClicks : null,
            totalCtr: compareData.totalCtr !== null && compareData.totalCtr !== undefined ? compareData.totalCtr : null,
            totalCostPerClick: compareData.totalCostPerClick !== null && compareData.totalCostPerClick !== undefined ? compareData.totalCostPerClick : null,
            totalLeads: compareData.totalLeads !== null && compareData.totalLeads !== undefined ? compareData.totalLeads : null,
            totalCostPerLead: compareData.totalCostPerLead !== null && compareData.totalCostPerLead !== undefined ? compareData.totalCostPerLead : null,
            totalSpend: compareData.totalSpend !== null && compareData.totalSpend !== undefined ? compareData.totalSpend : null,
            campaigns: (compareData.campaigns || []).map((campaign: any) => ({
              id: campaign.id,
              name: campaign.name,
              impressions: campaign.impressions !== null && campaign.impressions !== undefined ? campaign.impressions : null,
              clicks: campaign.clicks !== null && campaign.clicks !== undefined ? campaign.clicks : null,
              ctr: campaign.ctr !== null && campaign.ctr !== undefined ? campaign.ctr : null,
              costPerClick: campaign.costPerClick !== null && campaign.costPerClick !== undefined ? campaign.costPerClick : null,
              totalLeads: campaign.totalLeads !== null && campaign.totalLeads !== undefined ? campaign.totalLeads : null,
              costPerLead: campaign.costPerLead !== null && campaign.costPerLead !== undefined ? campaign.costPerLead : null,
              totalSpend: campaign.totalSpend !== null && campaign.totalSpend !== undefined ? campaign.totalSpend : null,
            })),
          };
        }
      } catch (compareError) {
        console.warn('Error fetching compare period data:', compareError);
      }
    }

    return { current, compare };
  } catch (error) {
    console.error('Error fetching Google Ads data:', error);
    // Return unavailable data (will show N/A)
    return getUnavailableData(compareDateRange);
  }
};

function getUnavailableData(
  compareDateRange: DateRange | null
): { current: AdsMetrics; compare: AdsMetrics | null } {
  const unavailableCurrent: AdsMetrics = {
    totalImpressions: null as any,
    totalClicks: null as any,
    totalCtr: null as any,
    totalCostPerClick: null as any,
    totalLeads: null as any,
    totalCostPerLead: null as any,
    totalSpend: null as any,
    campaigns: [],
  };

  const unavailableCompare: AdsMetrics | null = compareDateRange
    ? {
        totalImpressions: null as any,
        totalClicks: null as any,
        totalCtr: null as any,
        totalCostPerClick: null as any,
        totalLeads: null as any,
        totalCostPerLead: null as any,
        totalSpend: null as any,
        campaigns: [],
      }
    : null;

  return { current: unavailableCurrent, compare: unavailableCompare };
}

