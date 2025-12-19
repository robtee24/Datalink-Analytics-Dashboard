import { API_CONFIG } from '../_config.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { appId, appSecret, adAccountId } = API_CONFIG.metaAds;
    
    if (!appId || !appSecret || !adAccountId) {
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

    const { startDate, endDate } = req.body;

    // Get access token using app credentials
    const tokenResponse = await fetch(
      `${API_CONFIG.metaAds.baseUrl}/oauth/access_token?` +
      `client_id=${appId}&client_secret=${appSecret}&grant_type=client_credentials`
    );

    if (!tokenResponse.ok) {
      console.error('Meta token error:', tokenResponse.status);
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

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // Fetch ad account insights
    const insightsResponse = await fetch(
      `${API_CONFIG.metaAds.baseUrl}/v18.0/act_${adAccountId}/insights?` +
      `fields=impressions,clicks,ctr,cpc,spend,actions&` +
      `time_range={"since":"${startDate}","until":"${endDate}"}&` +
      `level=campaign`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    if (!insightsResponse.ok) {
      console.error('Meta insights error:', insightsResponse.status);
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

    const insightsData = await insightsResponse.json();
    
    let totalImpressions = 0;
    let totalClicks = 0;
    let totalSpend = 0;
    let totalLeads = 0;
    const campaigns = [];

    (insightsData.data || []).forEach((campaign, index) => {
      const impressions = parseInt(campaign.impressions || '0');
      const clicks = parseInt(campaign.clicks || '0');
      const spend = parseFloat(campaign.spend || '0');
      const ctr = parseFloat(campaign.ctr || '0');
      const cpc = parseFloat(campaign.cpc || '0');
      
      // Extract leads from actions
      let leads = 0;
      if (campaign.actions) {
        const leadAction = campaign.actions.find(a => a.action_type === 'lead');
        if (leadAction) {
          leads = parseInt(leadAction.value || '0');
        }
      }

      totalImpressions += impressions;
      totalClicks += clicks;
      totalSpend += spend;
      totalLeads += leads;

      campaigns.push({
        id: campaign.campaign_id || `campaign-${index}`,
        name: campaign.campaign_name || `Campaign ${index + 1}`,
        impressions,
        clicks,
        ctr,
        costPerClick: cpc,
        totalLeads: leads,
        costPerLead: leads > 0 ? spend / leads : 0,
        totalSpend: spend,
      });
    });

    res.status(200).json({
      totalImpressions: totalImpressions || null,
      totalClicks: totalClicks || null,
      totalCtr: totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : null,
      totalCostPerClick: totalClicks > 0 ? totalSpend / totalClicks : null,
      totalLeads: totalLeads || null,
      totalCostPerLead: totalLeads > 0 ? totalSpend / totalLeads : null,
      totalSpend: totalSpend || null,
      campaigns,
    });
  } catch (error) {
    console.error('Meta Ads API error:', error);
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
