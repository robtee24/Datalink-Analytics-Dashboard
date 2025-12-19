import { API_CONFIG, getValidAccessToken } from '../_config.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const accessToken = await getValidAccessToken();
    
    if (!accessToken) {
      return res.status(401).json({ 
        error: 'Authentication required',
        message: 'Google OAuth2 access token required'
      });
    }

    const developerToken = API_CONFIG.googleAds.developerToken;
    if (!developerToken) {
      return res.status(200).json({
        totalImpressions: null,
        totalClicks: null,
        totalCtr: null,
        totalCostPerClick: null,
        totalLeads: null,
        totalCostPerLead: null,
        totalSpend: null,
        campaigns: [],
        error: 'Developer token not configured',
      });
    }

    const { startDate, endDate } = req.body;
    let customerId = API_CONFIG.googleAds.customerId;

    // Remove dashes from customer ID
    if (customerId) {
      customerId = customerId.replace(/-/g, '');
    }

    if (!customerId) {
      return res.status(200).json({
        totalImpressions: null,
        totalClicks: null,
        totalCtr: null,
        totalCostPerClick: null,
        totalLeads: null,
        totalCostPerLead: null,
        totalSpend: null,
        campaigns: [],
        error: 'Customer ID not configured',
      });
    }

    const query = `
      SELECT
        campaign.id,
        campaign.name,
        metrics.impressions,
        metrics.clicks,
        metrics.cost_micros,
        metrics.conversions,
        metrics.ctr,
        metrics.average_cpc
      FROM campaign
      WHERE segments.date BETWEEN '${startDate}' AND '${endDate}'
      ORDER BY campaign.name
    `;

    const response = await fetch(
      `${API_CONFIG.googleAds.baseUrl}/v17/customers/${customerId}/googleAds:search`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'developer-token': developerToken,
          'login-customer-id': customerId,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: query.trim() }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Google Ads error:', response.status, errorText);
      return res.status(200).json({
        totalImpressions: null,
        totalClicks: null,
        totalCtr: null,
        totalCostPerClick: null,
        totalLeads: null,
        totalCostPerLead: null,
        totalSpend: null,
        campaigns: [],
      });
    }

    const data = await response.json();
    
    // Aggregate campaigns
    const campaignMap = new Map();
    
    if (data.results && Array.isArray(data.results)) {
      data.results.forEach((result) => {
        const campaignId = result.campaign?.id?.toString() || 'unknown';
        const campaignName = result.campaign?.name || 'Unknown Campaign';
        
        if (!campaignMap.has(campaignId)) {
          campaignMap.set(campaignId, {
            id: campaignId,
            name: campaignName,
            impressions: 0,
            clicks: 0,
            costMicros: 0,
            conversions: 0,
          });
        }
        
        const campaign = campaignMap.get(campaignId);
        campaign.impressions += parseInt(result.metrics?.impressions || '0', 10);
        campaign.clicks += parseInt(result.metrics?.clicks || '0', 10);
        campaign.costMicros += parseInt(result.metrics?.costMicros || '0', 10);
        campaign.conversions += parseFloat(result.metrics?.conversions || '0');
      });
    }

    // Convert to output format
    let totalImpressions = 0;
    let totalClicks = 0;
    let totalCostMicros = 0;
    let totalConversions = 0;
    const campaigns = [];

    campaignMap.forEach((campaign) => {
      totalImpressions += campaign.impressions;
      totalClicks += campaign.clicks;
      totalCostMicros += campaign.costMicros;
      totalConversions += campaign.conversions;

      const cost = campaign.costMicros / 1000000;
      const ctr = campaign.impressions > 0 ? (campaign.clicks / campaign.impressions) * 100 : 0;
      const cpc = campaign.clicks > 0 ? cost / campaign.clicks : 0;
      const costPerLead = campaign.conversions > 0 ? cost / campaign.conversions : 0;

      campaigns.push({
        id: campaign.id,
        name: campaign.name,
        impressions: campaign.impressions,
        clicks: campaign.clicks,
        ctr,
        costPerClick: cpc,
        totalLeads: Math.round(campaign.conversions),
        costPerLead,
        totalSpend: cost,
      });
    });

    const totalCost = totalCostMicros / 1000000;

    res.status(200).json({
      totalImpressions,
      totalClicks,
      totalCtr: totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0,
      totalCostPerClick: totalClicks > 0 ? totalCost / totalClicks : 0,
      totalLeads: Math.round(totalConversions),
      totalCostPerLead: totalConversions > 0 ? totalCost / totalConversions : 0,
      totalSpend: totalCost,
      campaigns,
    });
  } catch (error) {
    console.error('Google Ads API error:', error);
    res.status(200).json({
      totalImpressions: null,
      totalClicks: null,
      totalCtr: null,
      totalCostPerClick: null,
      totalLeads: null,
      totalCostPerLead: null,
      totalSpend: null,
      campaigns: [],
    });
  }
}
