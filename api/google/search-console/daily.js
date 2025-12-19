import { API_CONFIG, getValidAccessToken } from '../../_config.js';

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

    const { startDate, endDate } = req.body;
    const siteUrl = API_CONFIG.googleSearchConsole.siteUrl;

    const response = await fetch(
      `${API_CONFIG.googleSearchConsole.baseUrl}/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          startDate,
          endDate,
          dimensions: ['date'],
          rowLimit: 500,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Search Console daily error:', response.status, errorText);
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    const dailyData = (data.rows || []).map(row => ({
      date: row.keys[0],
      clicks: row.clicks || 0,
      impressions: row.impressions || 0,
      ctr: (row.ctr || 0) * 100,
      position: row.position || 0,
    }));

    res.status(200).json({ dailyData });
  } catch (error) {
    console.error('Search Console daily API error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch daily data',
      details: error.message,
      dailyData: []
    });
  }
}
