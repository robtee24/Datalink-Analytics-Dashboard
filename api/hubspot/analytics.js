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

    // Fetch totals for visitors and submissions
    const totalsUrl = `${API_CONFIG.hubspot.baseUrl}/analytics/v2/reports/totals/total?start=${formattedStart}&end=${formattedEnd}`;
    
    // Fetch sources/total for bounceRate and timePerSession (these metrics are in sources breakdown)
    const sourcesUrl = `${API_CONFIG.hubspot.baseUrl}/analytics/v2/reports/sources/total?start=${formattedStart}&end=${formattedEnd}`;
    
    // Fetch summarized daily breakdown for the chart (totals/daily requires summarize/)
    const dailyUrl = `${API_CONFIG.hubspot.baseUrl}/analytics/v2/reports/totals/summarize/daily?start=${formattedStart}&end=${formattedEnd}`;

    // Make all requests in parallel
    const [totalsResponse, sourcesResponse, dailyResponse] = await Promise.all([
      fetch(totalsUrl, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }),
      fetch(sourcesUrl, {
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

    // Parse totals response for visitors and submissions
    if (totalsResponse.ok) {
      const totalsData = await totalsResponse.json();
      rawResponses.totals = totalsData;
      
      const totals = totalsData.totals || totalsData;
      
      uniqueVisitors = extractMetric(totals, 'visitors', 'visits', 'rawViews');
      totalLeadSubmissions = extractMetric(totals, 'submissions', 'leads', 'contacts');
    } else {
      const errorText = await totalsResponse.text();
      console.error('HubSpot Analytics totals error:', totalsResponse.status, errorText);
      rawResponses.totalsError = { status: totalsResponse.status, error: errorText };
    }

    // Parse sources response for bounceRate and timePerSession
    if (sourcesResponse.ok) {
      const sourcesData = await sourcesResponse.json();
      rawResponses.sources = sourcesData;
      
      const sourceTotals = sourcesData.totals || sourcesData;
      
      // Sources endpoint has bounceRate and timePerSession
      bounceRate = extractMetric(sourceTotals, 'bounceRate', 'pageBounceRate');
      timeOnPage = extractMetric(sourceTotals, 'timePerSession', 'time', 'timePerPageview');
      
      // Fallback for visitors if totals didn't have it
      if (uniqueVisitors === null) {
        uniqueVisitors = extractMetric(sourceTotals, 'visitors', 'visits');
      }
    } else {
      const errorText = await sourcesResponse.text();
      console.error('HubSpot Analytics sources error:', sourcesResponse.status, errorText);
      rawResponses.sourcesError = { status: sourcesResponse.status, error: errorText };
    }

    // Parse daily breakdown for chart data
    if (dailyResponse.ok) {
      const dailyData = await dailyResponse.json();
      rawResponses.daily = dailyData;
      
      // The summarize/daily response format is: { "2025-12-31": [{ visitors: 52, ... }], ... }
      // Each date is a key, and the value is an array with metrics
      uniqueVisitorsHistory = Object.entries(dailyData)
        .filter(([key]) => /^\d{4}-\d{2}-\d{2}$/.test(key)) // Only process date keys (YYYY-MM-DD format)
        .map(([date, dataArray]) => {
          // dataArray is an array, get the first element
          const dayData = Array.isArray(dataArray) ? dataArray[0] : dataArray;
          return {
            date: date,
            value: extractMetric(dayData, 'visitors', 'visits', 'rawViews') || 0,
          };
        })
        .filter(item => item.date && item.value !== undefined);
      
      // Sort by date ascending
      uniqueVisitorsHistory.sort((a, b) => a.date.localeCompare(b.date));
    } else {
      const errorText = await dailyResponse.text();
      console.error('HubSpot Analytics daily error:', dailyResponse.status, errorText);
      rawResponses.dailyError = { status: dailyResponse.status, error: errorText };
    }

    // Convert bounceRate to percentage (HubSpot returns as decimal 0-1)
    if (bounceRate !== null && bounceRate >= 0 && bounceRate <= 1) {
      bounceRate = Math.round(bounceRate * 1000) / 10; // e.g., 0.862 -> 86.2
    }

    // Round timeOnPage to whole seconds
    if (timeOnPage !== null) {
      timeOnPage = Math.round(timeOnPage);
    }

    return res.status(200).json({
      uniqueVisitors,
      bounceRate,
      timeOnPage,
      totalLeadSubmissions,
      leadSubmissionsByPage: [],
      uniqueVisitorsHistory,
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
