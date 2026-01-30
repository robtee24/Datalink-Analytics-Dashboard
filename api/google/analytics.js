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

    const { startDate, endDate } = req.body;
    const propertyId = API_CONFIG.googleAnalytics.propertyId;

    if (!propertyId) {
      return res.status(400).json({
        error: 'Configuration error',
        message: 'Google Analytics property ID not configured'
      });
    }

    // Fetch aggregate metrics
    const aggregateResponse = await fetch(
      `${API_CONFIG.googleAnalytics.baseUrl}/v1beta/properties/${propertyId}:runReport`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          dateRanges: [{ startDate, endDate }],
          metrics: [
            { name: 'activeUsers' },
            { name: 'bounceRate' },
            { name: 'averageSessionDuration' },
            { name: 'sessions' },
            { name: 'screenPageViews' },
          ],
        }),
      }
    );

    // Fetch daily data for chart
    const dailyResponse = await fetch(
      `${API_CONFIG.googleAnalytics.baseUrl}/v1beta/properties/${propertyId}:runReport`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          dateRanges: [{ startDate, endDate }],
          dimensions: [{ name: 'date' }],
          metrics: [
            { name: 'activeUsers' },
          ],
          orderBys: [{ dimension: { dimensionName: 'date' } }],
        }),
      }
    );

    // Fetch top pages
    const pagesResponse = await fetch(
      `${API_CONFIG.googleAnalytics.baseUrl}/v1beta/properties/${propertyId}:runReport`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          dateRanges: [{ startDate, endDate }],
          dimensions: [{ name: 'pagePath' }],
          metrics: [
            { name: 'screenPageViews' },
            { name: 'activeUsers' },
          ],
          orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
          limit: 10,
        }),
      }
    );

    let uniqueVisitors = null;
    let bounceRate = null;
    let timeOnPage = null;
    let sessions = null;
    let pageViews = null;

    if (aggregateResponse.ok) {
      const data = await aggregateResponse.json();
      const row = data.rows?.[0];
      
      uniqueVisitors = row?.metricValues?.[0]?.value ? parseInt(row.metricValues[0].value) : null;
      bounceRate = row?.metricValues?.[1]?.value ? parseFloat(row.metricValues[1].value) * 100 : null;
      timeOnPage = row?.metricValues?.[2]?.value ? Math.round(parseFloat(row.metricValues[2].value)) : null;
      sessions = row?.metricValues?.[3]?.value ? parseInt(row.metricValues[3].value) : null;
      pageViews = row?.metricValues?.[4]?.value ? parseInt(row.metricValues[4].value) : null;
    } else {
      const errorText = await aggregateResponse.text();
      console.error('Google Analytics aggregate error:', aggregateResponse.status, errorText);
    }

    // Parse daily data
    let uniqueVisitorsHistory = [];
    if (dailyResponse.ok) {
      const dailyData = await dailyResponse.json();
      uniqueVisitorsHistory = (dailyData.rows || []).map(row => {
        const dateStr = row.dimensionValues?.[0]?.value || '';
        // Format YYYYMMDD to YYYY-MM-DD
        const formattedDate = dateStr.length === 8 
          ? `${dateStr.slice(0,4)}-${dateStr.slice(4,6)}-${dateStr.slice(6,8)}`
          : dateStr;
        return {
          date: formattedDate,
          value: parseInt(row.metricValues?.[0]?.value || '0'),
        };
      });
    } else {
      const errorText = await dailyResponse.text();
      console.error('Google Analytics daily error:', dailyResponse.status, errorText);
    }

    // Parse top pages
    let topPages = [];
    if (pagesResponse.ok) {
      const pagesData = await pagesResponse.json();
      topPages = (pagesData.rows || []).map(row => ({
        page: row.dimensionValues?.[0]?.value || '',
        pageViews: parseInt(row.metricValues?.[0]?.value || '0'),
        users: parseInt(row.metricValues?.[1]?.value || '0'),
      }));
    } else {
      const errorText = await pagesResponse.text();
      console.error('Google Analytics pages error:', pagesResponse.status, errorText);
    }

    res.status(200).json({
      uniqueVisitors,
      bounceRate,
      timeOnPage,
      sessions,
      pageViews,
      uniqueVisitorsHistory,
      topPages,
    });
  } catch (error) {
    console.error('Google Analytics API error:', error);
    res.status(200).json({
      uniqueVisitors: null,
      bounceRate: null,
      timeOnPage: null,
      sessions: null,
      pageViews: null,
      uniqueVisitorsHistory: [],
      topPages: [],
    });
  }
}
