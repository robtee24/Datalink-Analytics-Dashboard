import type { AdsMetrics, DateRange } from '../types';
import { format } from 'date-fns';
import { API_CONFIG } from '../config/api';

export const fetchMetaAds = async (
  dateRange: DateRange,
  compareDateRange: DateRange | null
): Promise<{ current: AdsMetrics; compare: AdsMetrics | null }> => {
  const formatDate = (date: Date) => format(date, 'yyyy-MM-dd');
  const startDate = formatDate(dateRange.startDate);
  const endDate = formatDate(dateRange.endDate);

  try {
    // Meta Ads API requires OAuth2 access token
    // You'll need to get an access token through OAuth2 flow
    // For now, we'll structure it to work with a token
    
    // Note: To get an access token, you need to:
    // 1. Implement OAuth2 flow to get user access token
    // 2. Or use a long-lived token generated from App ID and App Secret
    // 3. Or use a backend proxy to handle authentication
    
    const accessToken = await getMetaAccessToken();
    
    const current = await fetchMetaAdsData(accessToken, startDate, endDate);
    
    let compare: AdsMetrics | null = null;
    if (compareDateRange) {
      const compareStartDate = formatDate(compareDateRange.startDate);
      const compareEndDate = formatDate(compareDateRange.endDate);
      compare = await fetchMetaAdsData(accessToken, compareStartDate, compareEndDate);
    }

    return { current, compare };
  } catch (error) {
    console.error('Error fetching Meta Ads data:', error);
    // Return unavailable data (will show N/A)
    return getUnavailableData(compareDateRange);
  }
};

async function getMetaAccessToken(): Promise<string> {
  // This function should get an OAuth2 access token
  // For production, you'd implement OAuth2 flow or use a stored token
  // For now, we'll try to get a token using App ID and App Secret (server-side only)
  
  // Note: Getting access token from App ID/Secret requires server-side implementation
  // For frontend, you'd need to implement OAuth2 flow
  // This is a placeholder - you'll need to implement proper token management
  
  try {
    // Attempt to get a long-lived token (this would typically be done server-side)
    // For frontend, you'd store the token from OAuth2 flow
    const response = await fetch(
      `${API_CONFIG.metaAds.baseUrl}/oauth/access_token?client_id=${API_CONFIG.metaAds.clientId}&client_secret=${API_CONFIG.metaAds.appSecret}&grant_type=client_credentials`,
      {
        method: 'GET',
      }
    );

    if (response.ok) {
      const data = await response.json();
      return data.access_token;
    }
  } catch (error) {
    console.warn('Could not get access token, will use stored token or fallback');
  }

  // Return empty string - in production, you'd have a stored token
  return '';
}

async function fetchMetaAdsData(accessToken: string, startDate: string, endDate: string): Promise<AdsMetrics> {
  try {
    if (!accessToken) {
      throw new Error('No access token available');
    }

    const adAccountId = `act_${API_CONFIG.metaAds.adAccountId}`;
    
    // Fetch campaign insights
    const response = await fetch(
      `${API_CONFIG.metaAds.baseUrl}/v18.0/${adAccountId}/insights?fields=impressions,clicks,ctr,cpc,spend&time_range={"since":"${startDate}","until":"${endDate}"}&level=campaign`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Meta Ads API error: ${response.status} - ${response.statusText}`);
    }

    const data = await response.json();
    return parseMetaAdsResponse(data);
  } catch (error) {
    console.error('Error fetching Meta Ads data:', error);
    // Return unavailable data on error
    return getUnavailableCampaignsData();
  }
}

function parseMetaAdsResponse(data: any): AdsMetrics {
  const campaigns: AdsMetrics['campaigns'] = [];
  let totalImpressions = 0;
  let totalClicks = 0;
  let totalSpend = 0;
  let totalLeads = 0;

  if (data.data && Array.isArray(data.data)) {
    data.data.forEach((campaign: any, index: number) => {
      const impressions = parseInt(campaign.impressions || '0', 10);
      const clicks = parseInt(campaign.clicks || '0', 10);
      const spend = parseFloat(campaign.spend || '0');
      const ctr = parseFloat(campaign.ctr || '0');
      const cpc = parseFloat(campaign.cpc || '0');
      
      // Estimate leads (Meta Ads doesn't provide leads directly, would need conversion data)
      const estimatedLeads = Math.floor(clicks * 0.1); // 10% conversion rate estimate
      const costPerLead = estimatedLeads > 0 ? spend / estimatedLeads : 0;

      totalImpressions += impressions;
      totalClicks += clicks;
      totalSpend += spend;
      totalLeads += estimatedLeads;

      campaigns.push({
        id: campaign.campaign_id || `campaign-${index}`,
        name: campaign.campaign_name || `Campaign ${index + 1}`,
        impressions,
        clicks,
        ctr,
        costPerClick: cpc,
        totalLeads: estimatedLeads,
        costPerLead,
        totalSpend: spend,
      });
    });
  }

  const totalCtr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
  const totalCostPerClick = totalClicks > 0 ? totalSpend / totalClicks : 0;
  const totalCostPerLead = totalLeads > 0 ? totalSpend / totalLeads : 0;

  return {
    totalImpressions,
    totalClicks,
    totalCtr,
    totalCostPerClick,
    totalLeads,
    totalCostPerLead,
    totalSpend,
    campaigns,
  };
}

function getUnavailableData(
  compareDateRange: DateRange | null
): { current: AdsMetrics; compare: AdsMetrics | null } {
  const current = getUnavailableCampaignsData();
  
  const compare: AdsMetrics | null = compareDateRange
    ? getUnavailableCampaignsData()
    : null;

  return { current, compare };
}

function getUnavailableCampaignsData(): AdsMetrics {
  return {
    totalImpressions: null as any,
    totalClicks: null as any,
    totalCtr: null as any,
    totalCostPerClick: null as any,
    totalLeads: null as any,
    totalCostPerLead: null as any,
    totalSpend: null as any,
    campaigns: [],
  };
}

function getMockCampaignsData(): AdsMetrics {
  const campaigns = Array.from({ length: 25 }, (_, i) => ({
    id: `meta-campaign-${i + 1}`,
    name: `Meta Campaign ${i + 1}`,
    impressions: Math.floor(Math.random() * 50000) + 10000,
    clicks: Math.floor(Math.random() * 2000) + 200,
    ctr: Math.random() * 5 + 1,
    costPerClick: Math.random() * 2 + 0.5,
    totalLeads: Math.floor(Math.random() * 100) + 10,
    costPerLead: Math.random() * 50 + 10,
    totalSpend: Math.floor(Math.random() * 5000) + 500,
  }));

  const totalSpend = campaigns.reduce((sum, c) => sum + c.totalSpend, 0);
  const totalClicks = campaigns.reduce((sum, c) => sum + c.clicks, 0);
  const totalImpressions = campaigns.reduce((sum, c) => sum + c.impressions, 0);
  const totalLeads = campaigns.reduce((sum, c) => sum + c.totalLeads, 0);

  return {
    totalImpressions,
    totalClicks,
    totalCtr: (totalClicks / totalImpressions) * 100,
    totalCostPerClick: totalSpend / totalClicks,
    totalLeads,
    totalCostPerLead: totalSpend / totalLeads,
    totalSpend,
    campaigns,
  };
}

