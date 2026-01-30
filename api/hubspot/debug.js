import { API_CONFIG } from '../_config.js';

// Debug endpoint to test HubSpot API connectivity and see raw responses
export default async function handler(req, res) {
  const token = API_CONFIG.hubspot.privateAppToken;
  const results = {
    tokenConfigured: !!token,
    tokenPreview: token ? `${token.substring(0, 8)}...${token.substring(token.length - 4)}` : null,
    endpoints: {},
  };

  if (!token) {
    return res.status(200).json({
      ...results,
      error: 'No HUBSPOT_PRIVATE_APP_TOKEN configured',
    });
  }

  // Test dates - last 30 days
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30);
  
  const formatDate = (d) => d.toISOString().slice(0, 10).replace(/-/g, '');
  const start = formatDate(startDate);
  const end = formatDate(endDate);

  // Test multiple endpoints
  const endpoints = [
    { name: 'totals_total', url: `/analytics/v2/reports/totals/total?start=${start}&end=${end}` },
    { name: 'totals_daily', url: `/analytics/v2/reports/totals/daily?start=${start}&end=${end}` },
    { name: 'sources_total', url: `/analytics/v2/reports/sources/total?start=${start}&end=${end}` },
    { name: 'contacts', url: `/crm/v3/objects/contacts?limit=1` },
  ];

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(`${API_CONFIG.hubspot.baseUrl}${endpoint.url}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        data = text;
      }

      results.endpoints[endpoint.name] = {
        status: response.status,
        ok: response.ok,
        url: endpoint.url,
        data: data,
      };
    } catch (error) {
      results.endpoints[endpoint.name] = {
        url: endpoint.url,
        error: error.message,
      };
    }
  }

  // Extract what fields are available in the totals response
  const totalsData = results.endpoints.totals_total?.data;
  if (totalsData?.totals) {
    results.availableMetrics = Object.keys(totalsData.totals);
  }

  return res.status(200).json(results);
}
