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
        message: 'Google OAuth2 access token required. Please authorize via the dashboard.'
      });
    }

    const { startDate, endDate } = req.body;
    const siteUrl = API_CONFIG.googleSearchConsole.siteUrl;

    // Fetch keywords with pagination
    let allRows = [];
    let startRow = 0;
    const rowLimit = 25000;
    let hasMore = true;

    while (hasMore) {
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
            dimensions: ['query'],
            rowLimit,
            startRow,
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Search Console error:', response.status, errorText);
        
        if (response.status === 401 || response.status === 403) {
          return res.status(401).json({ 
            error: 'Authentication error',
            message: 'Please re-authorize Google services'
          });
        }
        
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      const rows = data.rows || [];
      allRows = allRows.concat(rows);

      if (rows.length < rowLimit) {
        hasMore = false;
      } else {
        startRow += rowLimit;
      }
    }

    // Parse keywords
    const keywords = allRows.map((row, index) => ({
      id: `kw-${index}`,
      keyword: row.keys[0],
      clicks: row.clicks || 0,
      impressions: row.impressions || 0,
      ctr: (row.ctr || 0) * 100,
      position: row.position || 0,
    }));

    // Calculate totals
    const totalClicks = keywords.reduce((sum, k) => sum + k.clicks, 0);
    const totalImpressions = keywords.reduce((sum, k) => sum + k.impressions, 0);

    res.status(200).json({
      keywords,
      totalClicks,
      totalImpressions,
      totalKeywords: keywords.length,
    });
  } catch (error) {
    console.error('Search Console API error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch Search Console data',
      details: error.message 
    });
  }
}
