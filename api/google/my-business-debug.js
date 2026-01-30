import { API_CONFIG, getValidAccessToken } from '../_config.js';

export default async function handler(req, res) {
  const results = {
    accessToken: null,
    accounts: null,
    locations: null,
    metrics: null,
    errors: [],
  };

  try {
    const accessToken = await getValidAccessToken();
    
    if (!accessToken) {
      return res.status(401).json({ 
        error: 'Authentication required',
        message: 'Google OAuth2 access token required'
      });
    }
    
    results.accessToken = 'present (hidden)';

    // Step 1: Get accounts
    console.log('📍 Step 1: Fetching accounts...');
    const accountsResponse = await fetch(
      `${API_CONFIG.googleMyBusiness.accountManagementBaseUrl}/v1/accounts`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    const accountsText = await accountsResponse.text();
    let accountsData;
    try {
      accountsData = JSON.parse(accountsText);
    } catch {
      accountsData = { raw: accountsText };
    }

    results.accounts = {
      status: accountsResponse.status,
      ok: accountsResponse.ok,
      data: accountsData,
    };

    if (!accountsResponse.ok) {
      results.errors.push(`Accounts API failed: ${accountsResponse.status}`);
      return res.status(200).json(results);
    }

    const accounts = accountsData.accounts || [];
    if (accounts.length === 0) {
      results.errors.push('No Google Business Profile accounts found for this Google account');
      return res.status(200).json(results);
    }

    const accountName = accounts[0].name;

    // Step 2: Get locations
    console.log('📍 Step 2: Fetching locations for', accountName);
    const locationsResponse = await fetch(
      `${API_CONFIG.googleMyBusiness.businessInfoBaseUrl}/v1/${accountName}/locations`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    const locationsText = await locationsResponse.text();
    let locationsData;
    try {
      locationsData = JSON.parse(locationsText);
    } catch {
      locationsData = { raw: locationsText };
    }

    results.locations = {
      status: locationsResponse.status,
      ok: locationsResponse.ok,
      data: locationsData,
    };

    if (!locationsResponse.ok) {
      results.errors.push(`Locations API failed: ${locationsResponse.status}`);
      return res.status(200).json(results);
    }

    const locations = locationsData.locations || [];
    if (locations.length === 0) {
      results.errors.push('No locations found for this account');
      return res.status(200).json(results);
    }

    // Step 3: Get metrics for first location
    const locationName = locations[0].name;
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - 30);

    console.log('📍 Step 3: Fetching metrics for', locationName);
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
              year: startDate.getFullYear(),
              month: startDate.getMonth() + 1,
              day: startDate.getDate(),
            },
            endDate: {
              year: today.getFullYear(),
              month: today.getMonth() + 1,
              day: today.getDate(),
            },
          },
        }),
      }
    );

    const metricsText = await metricsResponse.text();
    let metricsData;
    try {
      metricsData = JSON.parse(metricsText);
    } catch {
      metricsData = { raw: metricsText };
    }

    results.metrics = {
      status: metricsResponse.status,
      ok: metricsResponse.ok,
      data: metricsData,
    };

    if (!metricsResponse.ok) {
      results.errors.push(`Metrics API failed: ${metricsResponse.status}`);
    }

    res.status(200).json(results);
  } catch (error) {
    console.error('GMB Debug error:', error);
    results.errors.push(error.message);
    res.status(500).json(results);
  }
}
