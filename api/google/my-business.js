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

    // First, get the list of accounts
    const accountsResponse = await fetch(
      `${API_CONFIG.googleMyBusiness.accountManagementBaseUrl}/v1/accounts`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    if (!accountsResponse.ok) {
      console.error('GMB accounts error:', accountsResponse.status);
      return res.status(200).json({
        impressions: null,
        clicks: null,
        calls: null,
        reviews: null,
        locations: [],
      });
    }

    const accountsData = await accountsResponse.json();
    const accounts = accountsData.accounts || [];

    if (accounts.length === 0) {
      return res.status(200).json({
        impressions: null,
        clicks: null,
        calls: null,
        reviews: null,
        locations: [],
      });
    }

    const accountName = accounts[0].name;

    // Get locations for the account
    const locationsResponse = await fetch(
      `${API_CONFIG.googleMyBusiness.businessInfoBaseUrl}/v1/${accountName}/locations`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    if (!locationsResponse.ok) {
      console.error('GMB locations error:', locationsResponse.status);
      return res.status(200).json({
        impressions: null,
        clicks: null,
        calls: null,
        reviews: null,
        locations: [],
      });
    }

    const locationsData = await locationsResponse.json();
    const locations = locationsData.locations || [];

    // Fetch metrics for each location using Performance API
    let totalImpressions = 0;
    let totalClicks = 0;
    let totalCalls = 0;
    const locationMetrics = [];

    for (const location of locations.slice(0, 8)) { // Limit to 8 locations
      const locationName = location.name;
      
      try {
        const metricsResponse = await fetch(
          `${API_CONFIG.googleMyBusiness.performanceBaseUrl}/v1/${locationName}:fetchMultiDailyMetricsTimeSeries`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              dailyMetrics: [
                'BUSINESS_IMPRESSIONS_DESKTOP_MAPS',
                'BUSINESS_IMPRESSIONS_MOBILE_MAPS',
                'WEBSITE_CLICKS',
                'CALL_CLICKS',
              ],
              dailyRange: {
                startDate: {
                  year: parseInt(startDate.split('-')[0]),
                  month: parseInt(startDate.split('-')[1]),
                  day: parseInt(startDate.split('-')[2]),
                },
                endDate: {
                  year: parseInt(endDate.split('-')[0]),
                  month: parseInt(endDate.split('-')[1]),
                  day: parseInt(endDate.split('-')[2]),
                },
              },
            }),
          }
        );

        if (metricsResponse.ok) {
          const metricsData = await metricsResponse.json();
          
          // Sum up the metrics
          let locImpressions = 0;
          let locClicks = 0;
          let locCalls = 0;

          (metricsData.multiDailyMetricTimeSeries || []).forEach(series => {
            (series.dailyMetricTimeSeries?.timeSeries?.datedValues || []).forEach(dv => {
              const value = parseInt(dv.value || '0');
              if (series.dailyMetric?.includes('IMPRESSIONS')) {
                locImpressions += value;
              } else if (series.dailyMetric === 'WEBSITE_CLICKS') {
                locClicks += value;
              } else if (series.dailyMetric === 'CALL_CLICKS') {
                locCalls += value;
              }
            });
          });

          totalImpressions += locImpressions;
          totalClicks += locClicks;
          totalCalls += locCalls;

          locationMetrics.push({
            id: locationName,
            name: location.title || location.storefrontAddress?.locality || 'Location',
            address: location.storefrontAddress?.addressLines?.[0] || '',
            city: location.storefrontAddress?.locality || '',
            state: location.storefrontAddress?.administrativeArea || '',
            verified: location.metadata?.hasVoiceOfMerchant || false,
            impressions: locImpressions,
            clicks: locClicks,
            calls: locCalls,
            reviews: null,
          });
        }
      } catch (locError) {
        console.error('Error fetching metrics for location:', locError);
      }
      
      // Add delay between requests to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    res.status(200).json({
      impressions: totalImpressions || null,
      clicks: totalClicks || null,
      calls: totalCalls || null,
      reviews: null,
      locations: locationMetrics,
    });
  } catch (error) {
    console.error('Google My Business API error:', error);
    res.status(200).json({
      impressions: null,
      clicks: null,
      calls: null,
      reviews: null,
      locations: [],
    });
  }
}
