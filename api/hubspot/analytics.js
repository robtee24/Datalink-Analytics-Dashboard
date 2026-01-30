import { API_CONFIG } from '../_config.js';

// Helper to format date to YYYYMMDD format required by HubSpot Analytics API
function formatDateToHubSpot(dateStr) {
  // Input format: yyyy-MM-dd, Output format: YYYYMMDD
  return dateStr.replace(/-/g, '');
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
    // Endpoint: GET /analytics/v2/reports/{breakdown_by}/{time_period}
    const totalsUrl = `${API_CONFIG.hubspot.baseUrl}/analytics/v2/reports/totals/total?start=${formattedStart}&end=${formattedEnd}`;
    
    const totalsResponse = await fetch(totalsUrl, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    // Fetch daily breakdown for the chart
    const dailyUrl = `${API_CONFIG.hubspot.baseUrl}/analytics/v2/reports/totals/daily?start=${formattedStart}&end=${formattedEnd}`;
    
    const dailyResponse = await fetch(dailyUrl, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    let uniqueVisitors = null;
    let bounceRate = null;
    let timeOnPage = null;
    let totalLeadSubmissions = null;
    let uniqueVisitorsHistory = [];

    // Parse totals response
    if (totalsResponse.ok) {
      const totalsData = await totalsResponse.json();
      console.log('HubSpot totals response:', JSON.stringify(totalsData, null, 2));
      
      // The response structure has a 'totals' object with the metrics
      const totals = totalsData.totals || totalsData;
      
      uniqueVisitors = totals.visitors ?? totals.visits ?? null;
      bounceRate = totals.bounceRate ?? null;
      timeOnPage = totals.timePerSession ?? totals.timePerPageview ?? null;
      totalLeadSubmissions = totals.submissions ?? totals.leads ?? totals.contacts ?? null;
    } else {
      const errorText = await totalsResponse.text();
      console.error('HubSpot Analytics totals error:', totalsResponse.status, errorText);
    }

    // Parse daily breakdown for chart data
    if (dailyResponse.ok) {
      const dailyData = await dailyResponse.json();
      console.log('HubSpot daily response:', JSON.stringify(dailyData, null, 2));
      
      // The response has a 'breakdowns' array with daily data
      const breakdowns = dailyData.breakdowns || dailyData.results || [];
      
      uniqueVisitorsHistory = breakdowns.map((day) => {
        // The 'breakdown' field contains the date in YYYYMMDD format
        const dateStr = day.breakdown || day.date || '';
        // Convert YYYYMMDD to yyyy-MM-dd format
        const formattedDate = dateStr.length === 8 
          ? `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`
          : dateStr;
        
        return {
          date: formattedDate,
          value: day.visitors ?? day.visits ?? 0,
        };
      }).filter(item => item.date); // Filter out any invalid entries
    } else {
      const errorText = await dailyResponse.text();
      console.error('HubSpot Analytics daily error:', dailyResponse.status, errorText);
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
