import { API_CONFIG } from '../_config.js';

// Helper to format date to YYYYMMDD format required by HubSpot Analytics API
function formatDateToHubSpot(dateStr) {
  // Input format: yyyy-MM-dd, Output format: YYYYMMDD
  return dateStr.replace(/-/g, '');
}

// Helper to safely extract a numeric value from various possible field names
function extractMetric(obj, ...fieldNames) {
  for (const field of fieldNames) {
    if (obj && obj[field] !== undefined && obj[field] !== null) {
      return obj[field];
    }
  }
  return null;
}

export default async function handler(req, res) {
  try {
    const token = API_CONFIG.hubspot.privateAppToken;
    const { startDate, endDate } = req.query;
    
    if (!token) {
      return res.status(200).json({
        uniqueVisitors: null,
        bounceRate: null,
        timeOnPage: null,
        totalLeadSubmissions: null,
        leadSubmissionsByPage: [],
        uniqueVisitorsHistory: [],
        error: 'No HubSpot token configured',
      });
    }

    if (!startDate || !endDate) {
      return res.status(400).json({
        error: 'startDate and endDate query parameters are required',
      });
    }

    // Format dates to YYYYMMDD as required by HubSpot Analytics API v2
    const formattedStart = formatDateToHubSpot(startDate);
    const formattedEnd = formatDateToHubSpot(endDate);

    // Fetch totals for the period using HubSpot Analytics API v2
    // Using 'sessions' breakdown which provides visitor/session level metrics
    const totalsUrl = `${API_CONFIG.hubspot.baseUrl}/analytics/v2/reports/totals/total?start=${formattedStart}&end=${formattedEnd}`;
    
    // Also fetch sessions breakdown for more detailed metrics
    const sessionsUrl = `${API_CONFIG.hubspot.baseUrl}/analytics/v2/reports/sessions/total?start=${formattedStart}&end=${formattedEnd}`;
    
    // Fetch daily breakdown for the chart
    const dailyUrl = `${API_CONFIG.hubspot.baseUrl}/analytics/v2/reports/totals/daily?start=${formattedStart}&end=${formattedEnd}`;

    // Make all requests in parallel
    const [totalsResponse, sessionsResponse, dailyResponse] = await Promise.all([
      fetch(totalsUrl, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }),
      fetch(sessionsUrl, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }),
      fetch(dailyUrl, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }),
    ]);

    let uniqueVisitors = null;
    let bounceRate = null;
    let timeOnPage = null;
    let totalLeadSubmissions = null;
    let uniqueVisitorsHistory = [];
    let rawResponses = {};

    // Parse totals response
    if (totalsResponse.ok) {
      const totalsData = await totalsResponse.json();
      rawResponses.totals = totalsData;
      console.log('HubSpot totals response:', JSON.stringify(totalsData, null, 2));
      
      // The response structure has a 'totals' object with the metrics
      const totals = totalsData.totals || totalsData;
      
      uniqueVisitors = extractMetric(totals, 'visitors', 'visits', 'rawViews');
      bounceRate = extractMetric(totals, 'bounceRate', 'pageBounceRate');
      timeOnPage = extractMetric(totals, 'timePerSession', 'timePerPageview', 'avgTimeOnPage');
      totalLeadSubmissions = extractMetric(totals, 'submissions', 'leads', 'contacts');
    } else {
      const errorText = await totalsResponse.text();
      console.error('HubSpot Analytics totals error:', totalsResponse.status, errorText);
      rawResponses.totalsError = { status: totalsResponse.status, error: errorText };
    }

    // Parse sessions response for additional metrics (may have bounce rate, time on page)
    if (sessionsResponse.ok) {
      const sessionsData = await sessionsResponse.json();
      rawResponses.sessions = sessionsData;
      console.log('HubSpot sessions response:', JSON.stringify(sessionsData, null, 2));
      
      const sessionTotals = sessionsData.totals || sessionsData;
      
      // Only use sessions data if totals didn't have it
      if (bounceRate === null) {
        bounceRate = extractMetric(sessionTotals, 'bounceRate', 'pageBounceRate');
      }
      if (timeOnPage === null) {
        timeOnPage = extractMetric(sessionTotals, 'timePerSession', 'timePerPageview', 'avgTimeOnPage');
      }
      if (uniqueVisitors === null) {
        uniqueVisitors = extractMetric(sessionTotals, 'visitors', 'visits');
      }
    } else {
      const errorText = await sessionsResponse.text();
      console.error('HubSpot Analytics sessions error:', sessionsResponse.status, errorText);
      rawResponses.sessionsError = { status: sessionsResponse.status, error: errorText };
    }

    // Parse daily breakdown for chart data
    if (dailyResponse.ok) {
      const dailyData = await dailyResponse.json();
      rawResponses.daily = dailyData;
      console.log('HubSpot daily response:', JSON.stringify(dailyData, null, 2));
      
      // The response has a 'breakdowns' array with daily data
      const breakdowns = dailyData.breakdowns || dailyData.results || [];
      
      uniqueVisitorsHistory = breakdowns.map((day) => {
        // The 'breakdown' field contains the date in YYYYMMDD format
        const dateStr = String(day.breakdown || day.date || '');
        // Convert YYYYMMDD to yyyy-MM-dd format
        const formattedDate = dateStr.length === 8 
          ? `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`
          : dateStr;
        
        return {
          date: formattedDate,
          value: extractMetric(day, 'visitors', 'visits', 'rawViews') || 0,
        };
      }).filter(item => item.date); // Filter out any invalid entries
      
      // Sort by date ascending
      uniqueVisitorsHistory.sort((a, b) => a.date.localeCompare(b.date));
    } else {
      const errorText = await dailyResponse.text();
      console.error('HubSpot Analytics daily error:', dailyResponse.status, errorText);
      rawResponses.dailyError = { status: dailyResponse.status, error: errorText };
    }

    // Convert timeOnPage from milliseconds to seconds if needed (HubSpot returns ms)
    if (timeOnPage !== null && timeOnPage > 1000) {
      timeOnPage = Math.round(timeOnPage / 1000);
    }

    // Convert bounceRate to percentage if it's a decimal (0-1 range)
    if (bounceRate !== null && bounceRate > 0 && bounceRate <= 1) {
      bounceRate = bounceRate * 100;
    }

    return res.status(200).json({
      uniqueVisitors,
      bounceRate,
      timeOnPage,
      totalLeadSubmissions,
      leadSubmissionsByPage: [],
      uniqueVisitorsHistory,
      // Include raw responses for debugging (can be removed in production)
      _debug: rawResponses,
    });
  } catch (error) {
    console.error('HubSpot Analytics error:', error);
    return res.status(200).json({
      uniqueVisitors: null,
      bounceRate: null,
      timeOnPage: null,
      totalLeadSubmissions: null,
      leadSubmissionsByPage: [],
      uniqueVisitorsHistory: [],
      error: error.message,
    });
  }
}
