import { API_CONFIG, getTokens } from '../../_config.js';

async function refreshAccessToken() {
  const tokens = getTokens();
  if (!tokens.refreshToken) return null;

  try {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: API_CONFIG.google.clientId,
        client_secret: API_CONFIG.google.clientSecret,
        refresh_token: tokens.refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    if (response.ok) {
      const data = await response.json();
      const { setTokens } = await import('../../_config.js');
      setTokens(data.access_token, tokens.refreshToken, data.expires_in || 3600);
      return data.access_token;
    }
  } catch (error) {
    console.error('Token refresh failed:', error);
  }
  return null;
}

async function getAccessToken() {
  const tokens = getTokens();
  
  if (tokens.accessToken && tokens.expiresAt > Date.now()) {
    return tokens.accessToken;
  }
  
  if (tokens.refreshToken) {
    return await refreshAccessToken();
  }
  
  return null;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const accessToken = await getAccessToken();
  
  if (!accessToken) {
    return res.status(401).json({ 
      error: 'Authentication required',
      message: 'Google OAuth2 access token required'
    });
  }

  const { startDate, endDate } = req.body;
  const siteUrl = 'https://www.datalinknetworks.net/';

  try {
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

