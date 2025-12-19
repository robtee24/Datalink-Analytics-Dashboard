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

    const response = await fetch(
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
          ],
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Google Analytics error:', response.status, errorText);
      
      // Return null data instead of error for graceful fallback
      return res.status(200).json({
        uniqueVisitors: null,
        bounceRate: null,
        timeOnPage: null,
        totalLeadSubmissions: null,
        leadSubmissionsByPage: [],
        uniqueVisitorsHistory: [],
      });
    }

    const data = await response.json();
    const row = data.rows?.[0];
    
    res.status(200).json({
      uniqueVisitors: row?.metricValues?.[0]?.value ? parseInt(row.metricValues[0].value) : null,
      bounceRate: row?.metricValues?.[1]?.value ? parseFloat(row.metricValues[1].value) * 100 : null,
      timeOnPage: row?.metricValues?.[2]?.value ? parseFloat(row.metricValues[2].value) : null,
      totalLeadSubmissions: null,
      leadSubmissionsByPage: [],
      uniqueVisitorsHistory: [],
    });
  } catch (error) {
    console.error('Google Analytics API error:', error);
    res.status(200).json({
      uniqueVisitors: null,
      bounceRate: null,
      timeOnPage: null,
      totalLeadSubmissions: null,
      leadSubmissionsByPage: [],
      uniqueVisitorsHistory: [],
    });
  }
}
