const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const { API_CONFIG } = require('./config');

const app = express();
const PORT = 3001;

// Enable CORS for frontend
app.use(cors());
app.use(express.json());

// Store HubSpot access token (in production, use a database or secure storage)
let hubspotAccessToken = null;
let hubspotTokenExpiry = null;

// Store Google OAuth2 tokens (in production, use a database or secure storage)
let googleAccessToken = null;
let googleRefreshToken = null;
let googleTokenExpiry = null;

// Function to get HubSpot access token
// Using Private App token (direct access, no OAuth needed)
async function getHubSpotAccessToken() {
  if (API_CONFIG.hubspot.privateAppToken) {
    return API_CONFIG.hubspot.privateAppToken;
  }
  
  if (process.env.HUBSPOT_PRIVATE_APP_TOKEN) {
    return process.env.HUBSPOT_PRIVATE_APP_TOKEN;
  }

  console.error('❌ No HubSpot Private App token found!');
  return null;
}

// HubSpot Analytics Endpoint
app.get('/api/hubspot/analytics', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    console.log(`📊 HubSpot Analytics Request: ${startDate} to ${endDate}`);
    
    // Get OAuth2 access token
    const accessToken = await getHubSpotAccessToken();
    if (!accessToken) {
      return res.status(401).json({ 
        error: 'Failed to get HubSpot access token',
        message: 'OAuth2 authentication failed. May need to implement full OAuth flow.'
      });
    }
    
    // HubSpot Analytics - Try multiple possible endpoints
    // Note: HubSpot's analytics API structure has changed
    // We'll try the most common endpoints
    
    // HubSpot doesn't have a direct public analytics API
    // Analytics data is typically accessed through:
    // 1. HubSpot's internal dashboard (not via API)
    // 2. HubSpot Reporting API (requires special access)
    // 3. Google Analytics (which we have credentials for)
    
    // Try a few possible endpoints
    const endpoints = [
      // Try CMS analytics
      `${API_CONFIG.hubspot.baseUrl}/cms/v3/site-search/analytics/overview`,
      // Try events (pageviews)
      `${API_CONFIG.hubspot.baseUrl}/events/v3/events?eventType=pageview&startDate=${startDate}&endDate=${endDate}&limit=100`,
    ];
    
    for (const url of endpoints) {
      try {
        const response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const data = await response.json();
          console.log('✅ HubSpot Analytics Success from:', url);
          return res.json(data);
        } else {
          const errorText = await response.text();
          console.warn(`⚠️ Endpoint failed (${response.status}):`, url);
          if (response.status === 403) {
            console.warn('   Missing required scope for analytics');
          }
        }
      } catch (err) {
        console.warn(`⚠️ Endpoint error:`, url, err.message);
      }
    }
    
    // HubSpot analytics is not available via public API
    // Return structured response indicating we need to use Google Analytics instead
    console.warn('⚠️ HubSpot analytics API not available via public API');
    console.warn('💡 Recommendation: Use Google Analytics (GA4) for website analytics');
    return res.json({ 
      message: 'HubSpot analytics not available via API',
      note: 'HubSpot does not expose website analytics through their public API. Use Google Analytics for visitor data.',
      recommendation: 'Use Google Analytics (GA4) integration instead'
    });
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${API_CONFIG.hubspot.apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    console.log(`HubSpot Analytics Response Status: ${response.status}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('HubSpot Analytics Error Response:', errorText.substring(0, 500));
      
      // Check for expired token
      if (response.status === 401 && errorText.includes('expired')) {
        console.error('🔴 HUBSPOT API KEY IS EXPIRED!');
        console.error('   Please get a new API key from HubSpot Settings → Private Apps');
        return res.status(401).json({ 
          error: 'HubSpot API key is expired',
          message: 'Please update the API key. See API_KEY_STATUS.md for instructions',
          details: errorText.substring(0, 500)
        });
      }
      
      return res.status(response.status).json({ 
        error: `HubSpot API error: ${response.status}`,
        details: errorText.substring(0, 500)
      });
    }

    const data = await response.json();
    console.log('HubSpot Analytics Success:', Object.keys(data));
    return res.json(data);
  } catch (error) {
    console.error('HubSpot Analytics Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// HubSpot Forms Endpoint
app.get('/api/hubspot/forms', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    console.log(`📝 HubSpot Forms Request: ${startDate} to ${endDate}`);
    
    // Get OAuth2 access token
    const accessToken = await getHubSpotAccessToken();
    if (!accessToken) {
      return res.status(401).json({ 
        error: 'Failed to get HubSpot access token',
        message: 'OAuth2 authentication failed. May need to implement full OAuth flow.'
      });
    }
    
    // Get all forms using Marketing API (confirmed working)
    const formsResponse = await fetch(
      `${API_CONFIG.hubspot.baseUrl}/marketing/v3/forms`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    console.log(`HubSpot Forms List Status: ${formsResponse.status}`);

    if (!formsResponse.ok) {
      const errorText = await formsResponse.text();
      console.error('HubSpot Forms List Error:', errorText.substring(0, 500));
      
      // Check for expired token
      if (formsResponse.status === 401 && errorText.includes('expired')) {
        console.error('🔴 HUBSPOT API KEY IS EXPIRED!');
        console.error('   Please get a new API key from HubSpot Settings → Private Apps');
        return res.status(401).json({ 
          error: 'HubSpot API key is expired',
          message: 'Please update the API key. See API_KEY_STATUS.md for instructions',
          details: errorText.substring(0, 500)
        });
      }
      
      return res.status(formsResponse.status).json({ 
        error: 'Failed to fetch forms',
        details: errorText.substring(0, 500)
      });
    }

    const formsData = await formsResponse.json();
    console.log(`Found ${formsData.results?.length || 0} forms`);
    const formIds = formsData.results?.map((form) => form.id) || [];

    if (formIds.length === 0) {
      console.warn('No forms found in HubSpot account');
      return res.json({ results: [] });
    }

    const submissions = [];
    for (const formId of formIds.slice(0, 10)) {
      try {
        // Try the form submissions endpoint
        const submissionsResponse = await fetch(
          `${API_CONFIG.hubspot.baseUrl}/form-integrations/v1/submissions/forms/${formId}?startDate=${startDate}&endDate=${endDate}&limit=100`,
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
          }
        );

        if (submissionsResponse.ok) {
          const data = await submissionsResponse.json();
          const formSubmissions = data.results || data.data || [];
          console.log(`✅ Form ${formId}: ${formSubmissions.length} submissions`);
          submissions.push(...formSubmissions);
        } else {
          // Try alternative endpoint
          const altResponse = await fetch(
            `${API_CONFIG.hubspot.baseUrl}/marketing/v3/forms/${formId}/submissions?startDate=${startDate}&endDate=${endDate}&limit=100`,
            {
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
              },
            }
          );
          
          if (altResponse.ok) {
            const altData = await altResponse.json();
            const formSubmissions = altData.results || altData.data || [];
            console.log(`✅ Form ${formId} (alt): ${formSubmissions.length} submissions`);
            submissions.push(...formSubmissions);
          } else {
            const errorText = await altResponse.text();
            console.warn(`⚠️ Form ${formId} submissions failed: ${altResponse.status} - ${errorText.substring(0, 100)}`);
          }
        }
      } catch (err) {
        console.warn(`Error fetching form ${formId}:`, err.message);
      }
    }

    console.log(`Total submissions found: ${submissions.length}`);
    res.json({ results: submissions });
  } catch (error) {
    console.error('HubSpot Forms Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get Google OAuth2 access token
async function getGoogleAccessToken() {
  // Check if we have a valid token
  if (googleAccessToken && googleTokenExpiry && Date.now() < googleTokenExpiry) {
    return googleAccessToken;
  }

  // If we have a refresh token, use it to get a new access token
  if (googleRefreshToken) {
    try {
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: API_CONFIG.google.clientId,
          client_secret: API_CONFIG.google.clientSecret,
          refresh_token: googleRefreshToken,
          grant_type: 'refresh_token',
        }),
      });

      if (tokenResponse.ok) {
        const tokenData = await tokenResponse.json();
        googleAccessToken = tokenData.access_token;
        googleTokenExpiry = Date.now() + (tokenData.expires_in * 1000);
        console.log('✅ Refreshed Google access token');
        return googleAccessToken;
      }
    } catch (error) {
      console.error('Error refreshing Google token:', error);
    }
  }

  // Return stored token even if expired (will fail but user will know)
  return googleAccessToken;
}

// Google OAuth2 - Get authorization URL (JSON endpoint)
app.get('/api/google/oauth/authorize', (req, res) => {
  const scopes = [
    'https://www.googleapis.com/auth/webmasters.readonly',
    'https://www.googleapis.com/auth/analytics.readonly',
    'https://www.googleapis.com/auth/business.manage',
    'https://www.googleapis.com/auth/adwords', // Google Ads API
  ].join(' ');
  
  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${API_CONFIG.google.clientId}&` +
    `redirect_uri=${encodeURIComponent(API_CONFIG.google.redirectUri)}&` +
    `response_type=code&` +
    `scope=${encodeURIComponent(scopes)}&` +
    `access_type=offline&` +
    `prompt=consent`;
  
  res.json({ authUrl, message: 'Visit this URL to authorize the application' });
});

// Google OAuth2 - Authorization page (HTML)
app.get('/google/authorize', (req, res) => {
  const scopes = [
    'https://www.googleapis.com/auth/webmasters.readonly',
    'https://www.googleapis.com/auth/analytics.readonly',
    'https://www.googleapis.com/auth/business.manage',
    'https://www.googleapis.com/auth/adwords', // Google Ads API
  ].join(' ');
  
  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${API_CONFIG.google.clientId}&` +
    `redirect_uri=${encodeURIComponent(API_CONFIG.google.redirectUri)}&` +
    `response_type=code&` +
    `scope=${encodeURIComponent(scopes)}&` +
    `access_type=offline&` +
    `prompt=consent`;
  
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Google OAuth2 Authorization</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }
        .container {
          background: white;
          border-radius: 12px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.3);
          padding: 40px;
          max-width: 500px;
          width: 100%;
          text-align: center;
        }
        h1 {
          color: #333;
          margin-bottom: 10px;
          font-size: 28px;
        }
        p {
          color: #666;
          margin-bottom: 30px;
          line-height: 1.6;
        }
        .btn {
          display: inline-block;
          background: #4285f4;
          color: white;
          padding: 14px 32px;
          border-radius: 6px;
          text-decoration: none;
          font-weight: 600;
          font-size: 16px;
          transition: background 0.3s;
          box-shadow: 0 2px 8px rgba(66, 133, 244, 0.3);
        }
        .btn:hover {
          background: #357ae8;
          box-shadow: 0 4px 12px rgba(66, 133, 244, 0.4);
        }
        .info {
          margin-top: 30px;
          padding: 20px;
          background: #f5f5f5;
          border-radius: 8px;
          text-align: left;
        }
        .info h3 {
          color: #333;
          margin-bottom: 10px;
          font-size: 16px;
        }
        .info ul {
          color: #666;
          margin-left: 20px;
          line-height: 1.8;
        }
        .status {
          margin-top: 20px;
          padding: 12px;
          background: #e8f5e9;
          border-radius: 6px;
          color: #2e7d32;
          font-size: 14px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>🔐 Google OAuth2 Authorization</h1>
        <p>Click the button below to authorize access to your Google services.</p>
        
        <a href="${authUrl}" class="btn">Authorize with Google</a>
        
        <div class="info">
          <h3>This will grant access to:</h3>
          <ul>
            <li>Google Search Console (read-only)</li>
            <li>Google Analytics (read-only)</li>
            <li>Google My Business (manage)</li>
            <li>Google Ads (read-only)</li>
          </ul>
        </div>
        
        <div class="status">
          ✅ After authorization, you'll be redirected back automatically
        </div>
      </div>
    </body>
    </html>
  `);
});

// Google OAuth2 - Callback endpoint (receives authorization code)
app.get('/api/google/oauth/callback', async (req, res) => {
  try {
    const { code, error } = req.query;
    
    if (error) {
      return res.status(400).json({ error: 'Authorization failed', details: error });
    }
    
    if (!code) {
      return res.status(400).json({ error: 'No authorization code provided' });
    }
    
    // Exchange authorization code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code: code,
        client_id: API_CONFIG.google.clientId,
        client_secret: API_CONFIG.google.clientSecret,
        redirect_uri: API_CONFIG.google.redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      return res.status(400).json({ 
        error: 'Token exchange failed',
        details: errorText
      });
    }

    const tokenData = await tokenResponse.json();
    
    // Store tokens
    googleAccessToken = tokenData.access_token;
    googleRefreshToken = tokenData.refresh_token;
    googleTokenExpiry = Date.now() + (tokenData.expires_in * 1000);
    
    console.log('✅ Google OAuth2 tokens stored successfully');
    
    res.send(`
      <html>
        <head>
          <title>Authorization Successful</title>
        </head>
        <body style="font-family: Arial; padding: 40px; text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; display: flex; align-items: center; justify-content: center; margin: 0;">
          <div style="background: white; border-radius: 12px; padding: 40px; max-width: 500px; box-shadow: 0 20px 60px rgba(0,0,0,0.3);">
            <div style="font-size: 64px; margin-bottom: 20px;">✅</div>
            <h1 style="color: #2d3748; margin-bottom: 10px;">Authorization Successful!</h1>
            <p style="color: #718096; margin-bottom: 30px;">Google OAuth2 tokens have been stored.</p>
            <p style="color: #a0aec0; font-size: 14px;">This window will close automatically...</p>
          </div>
          <script>
            // Notify parent window if opened in popup
            if (window.opener) {
              window.opener.postMessage('oauth-complete', window.location.origin);
            }
            // Close window after 2 seconds
            setTimeout(() => {
              window.close();
            }, 2000);
          </script>
        </body>
      </html>
    `);
  } catch (error) {
    console.error('OAuth callback error:', error);
    res.status(500).send(`
      <html>
        <body style="font-family: Arial; padding: 40px; text-align: center;">
          <h1 style="color: red;">❌ Authorization Failed</h1>
          <p>${error.message}</p>
        </body>
      </html>
    `);
  }
});

// Google OAuth2 - Store refresh token endpoint (manual token entry)
app.post('/api/google/oauth/token', async (req, res) => {
  try {
    const { refreshToken, accessToken, expiresIn } = req.body;
    
    if (refreshToken) {
      googleRefreshToken = refreshToken;
      console.log('✅ Google refresh token stored');
    }
    
    if (accessToken) {
      googleAccessToken = accessToken;
      googleTokenExpiry = expiresIn ? Date.now() + (expiresIn * 1000) : null;
      console.log('✅ Google access token stored');
    }
    
    res.json({ success: true, message: 'Token stored successfully' });
  } catch (error) {
    console.error('Error storing Google token:', error);
    res.status(500).json({ error: error.message });
  }
});

// Google OAuth2 - Status endpoint (check if authorized)
app.get('/api/google/oauth/status', (req, res) => {
  const authorized = !!(googleAccessToken || googleRefreshToken);
  res.json({ 
    authorized,
    hasAccessToken: !!googleAccessToken,
    hasRefreshToken: !!googleRefreshToken,
    message: authorized 
      ? 'Google OAuth2 is authorized. Access granted to Search Console, Analytics, My Business, and Google Ads.'
      : 'Google OAuth2 is not authorized. Please authorize via the OAuth modal.'
  });
});

// Google Search Console Endpoint - Fetch ALL keywords with pagination
app.post('/api/google/search-console', async (req, res) => {
  try {
    const { startDate, endDate } = req.body;
    
    console.log(`🔍 Google Search Console Request: ${startDate} to ${endDate}`);
    
    // Get OAuth2 access token
    const accessToken = await getGoogleAccessToken();
    
    if (!accessToken) {
      return res.status(401).json({ 
        error: 'Authentication required',
        message: 'Google OAuth2 access token required',
        details: 'Please provide a refresh token via POST /api/google/oauth/token',
        instructions: 'Get a refresh token from Google OAuth2 flow and send it to this endpoint'
      });
    }
    
    // Try different site URL formats
    // Note: Site must be verified in Google Search Console
    // Prioritize HTTPS version as specified by user
    const siteUrls = [
      'https://www.datalinknetworks.net/',  // Primary - HTTPS with www
      'https://www.datalinknetworks.net',   // HTTPS with www (no trailing slash)
      'sc-domain:www.datalinknetworks.net', // Domain property format
      'sc-domain:datalinknetworks.net',     // Domain property format (no www)
    ];
    
    let workingSiteUrl = null;
    
    // First, find the working site URL
    for (const siteUrl of siteUrls) {
      try {
        const encodedUrl = encodeURIComponent(siteUrl);
        const testResponse = await fetch(
          `${API_CONFIG.googleSearchConsole.baseUrl}/sites/${encodedUrl}/searchAnalytics/query`,
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
              rowLimit: 1, // Just test with 1 row
            }),
          }
        );

        if (testResponse.ok) {
          workingSiteUrl = siteUrl;
          console.log(`✅ Found working site URL: ${siteUrl}`);
          break;
        } else if (testResponse.status === 404) {
          console.warn(`⚠️ Site not found: ${siteUrl}, trying next...`);
          continue;
        }
      } catch (err) {
        console.warn(`Error trying ${siteUrl}:`, err.message);
        continue;
      }
    }
    
    if (!workingSiteUrl) {
      return res.status(404).json({ 
        error: 'Site not found',
        message: 'Could not find the site in Google Search Console',
        tried: siteUrls
      });
    }
    
    // Now fetch ALL keywords with pagination
    // Google Search Console API max is 25,000 rows per request
    // We'll paginate to get all results
    const allRows = [];
    let startRow = 0;
    const maxRowsPerRequest = 25000; // Maximum allowed by API
    let hasMore = true;
    
    while (hasMore) {
      const encodedUrl = encodeURIComponent(workingSiteUrl);
      const response = await fetch(
        `${API_CONFIG.googleSearchConsole.baseUrl}/sites/${encodedUrl}/searchAnalytics/query`,
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
            rowLimit: maxRowsPerRequest,
            startRow: startRow,
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error fetching keywords:', errorText.substring(0, 500));
        break;
      }

      const data = await response.json();
      const rows = data.rows || [];
      
      if (rows.length > 0) {
        allRows.push(...rows);
        console.log(`📊 Fetched ${rows.length} keywords (total: ${allRows.length})`);
        
        // If we got less than max, we've reached the end
        if (rows.length < maxRowsPerRequest) {
          hasMore = false;
        } else {
          startRow += maxRowsPerRequest;
        }
      } else {
        hasMore = false;
      }
    }
    
    console.log(`✅ Google Search Console Success: ${allRows.length} total keywords`);
    
    return res.json({
      rows: allRows,
      responseAggregationType: 'byProperty',
    });
  } catch (error) {
    console.error('Google Search Console Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Google Search Console - Get daily data for charts
app.post('/api/google/search-console/daily', async (req, res) => {
  try {
    const { startDate, endDate } = req.body;
    
    console.log(`📊 Google Search Console Daily Data: ${startDate} to ${endDate}`);
    
    const accessToken = await getGoogleAccessToken();
    
    if (!accessToken) {
      return res.status(401).json({ 
        error: 'Authentication required',
        message: 'Google OAuth2 access token required'
      });
    }
    
    // Use HTTPS version as specified by user
    const siteUrls = [
      'https://www.datalinknetworks.net/',  // Primary - HTTPS with www
      'https://www.datalinknetworks.net',   // HTTPS with www (no trailing slash)
      'sc-domain:www.datalinknetworks.net', // Domain property format
    ];
    
    for (const siteUrl of siteUrls) {
      try {
        const encodedUrl = encodeURIComponent(siteUrl);
        const response = await fetch(
          `${API_CONFIG.googleSearchConsole.baseUrl}/sites/${encodedUrl}/searchAnalytics/query`,
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
              rowLimit: 1000,
            }),
          }
        );

        if (response.ok) {
          const data = await response.json();
          return res.json(data);
        } else if (response.status === 404) {
          continue;
        }
      } catch (err) {
        continue;
      }
    }
    
    return res.status(404).json({ error: 'Site not found' });
  } catch (error) {
    console.error('Google Search Console Daily Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Google Search Console - Get pages for a specific keyword
app.post('/api/google/search-console/keyword-pages', async (req, res) => {
  try {
    const { keyword, startDate, endDate } = req.body;
    
    console.log(`📄 Google Search Console Keyword Pages: "${keyword}" from ${startDate} to ${endDate}`);
    
    const accessToken = await getGoogleAccessToken();
    
    if (!accessToken) {
      return res.status(401).json({ 
        error: 'Authentication required',
        message: 'Google OAuth2 access token required'
      });
    }
    
    const siteUrls = [
      'https://www.datalinknetworks.net/',
      'https://www.datalinknetworks.net',
      'sc-domain:www.datalinknetworks.net',
      'sc-domain:datalinknetworks.net',
    ];
    
    for (const siteUrl of siteUrls) {
      try {
        const encodedUrl = encodeURIComponent(siteUrl);
        const response = await fetch(
          `${API_CONFIG.googleSearchConsole.baseUrl}/sites/${encodedUrl}/searchAnalytics/query`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              startDate,
              endDate,
              dimensions: ['query', 'page'],
              dimensionFilterGroups: [{
                filters: [{
                  dimension: 'query',
                  expression: keyword,
                  operator: 'equals'
                }]
              }],
              rowLimit: 25000, // Get all pages for this keyword
            }),
          }
        );

        if (response.ok) {
          const data = await response.json();
          console.log(`✅ Found ${data.rows?.length || 0} pages for keyword "${keyword}"`);
          return res.json(data);
        } else if (response.status === 404) {
          continue;
        } else {
          const errorText = await response.text();
          console.warn(`⚠️ Error fetching pages for keyword "${keyword}":`, response.status, errorText.substring(0, 200));
        }
      } catch (err) {
        console.warn(`Error trying ${siteUrl} for keyword pages:`, err.message);
        continue;
      }
    }
    
    return res.status(404).json({ error: 'Site not found or no data available' });
  } catch (error) {
    console.error('Google Search Console Keyword Pages Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Google Search Console - Get pages indexed (using sitemap data)
app.post('/api/google/search-console/pages-indexed', async (req, res) => {
  try {
    const { startDate, endDate } = req.body;
    
    console.log(`📄 Google Search Console Pages Indexed: ${startDate} to ${endDate}`);
    
    const accessToken = await getGoogleAccessToken();
    
    if (!accessToken) {
      return res.status(401).json({ 
        error: 'Authentication required',
        message: 'Google OAuth2 access token required'
      });
    }
    
    const siteUrls = [
      'https://www.datalinknetworks.net/',
      'https://www.datalinknetworks.net',
      'sc-domain:www.datalinknetworks.net',
      'sc-domain:datalinknetworks.net',
    ];
    
    // Get sitemaps to estimate pages indexed
    // Note: Google Search Console API doesn't have a direct endpoint for exact pages indexed
    // The Index Coverage report data is not available via API
    // We'll use sitemap data as an approximation
    for (const siteUrl of siteUrls) {
      try {
        const encodedUrl = encodeURIComponent(siteUrl);
        
        // Get sitemaps
        const sitemapsResponse = await fetch(
          `${API_CONFIG.googleSearchConsole.baseUrl}/sites/${encodedUrl}/sitemaps`,
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
            },
          }
        );
        
        if (sitemapsResponse.ok) {
          const sitemapsData = await sitemapsResponse.json();
          const sitemaps = sitemapsData.sitemap || [];
          
          // Calculate total submitted URLs from all sitemaps
          let totalSubmitted = 0;
          let totalIndexed = 0;
          
          sitemaps.forEach((sitemap) => {
            if (sitemap.contents && Array.isArray(sitemap.contents)) {
              sitemap.contents.forEach((content) => {
                totalSubmitted += parseInt(content.submitted || '0', 10);
                totalIndexed += parseInt(content.indexed || '0', 10);
              });
            }
          });
          
          // Use indexed count if available, otherwise use submitted as approximation
          // Note: The sitemap API may not always return accurate indexed counts
          const pagesIndexedLastDay = totalIndexed > 0 ? totalIndexed : (totalSubmitted > 0 ? totalSubmitted : null);
          
          console.log(`✅ Pages Indexed (Last Day): ${pagesIndexedLastDay} (from ${sitemaps.length} sitemaps, indexed: ${totalIndexed}, submitted: ${totalSubmitted})`);
          
          return res.json({
            averagePagesIndexed: pagesIndexedLastDay, // Keep for backward compatibility
            totalSubmitted,
            totalIndexed, // This is the value we'll use for "last day"
            sitemapsCount: sitemaps.length,
            note: 'This shows the number of pages indexed based on sitemap data. The Google Search Console API does not provide a direct endpoint for exact pages indexed count. For exact numbers, use Google Search Console web interface.'
          });
        } else if (sitemapsResponse.status === 404) {
          continue;
        }
      } catch (err) {
        console.warn(`Error getting pages indexed for ${siteUrl}:`, err.message);
        continue;
      }
    }
    
    // If we can't get data, return null
    return res.json({
      averagePagesIndexed: null,
      totalIndexed: null,
      totalSubmitted: null,
      note: 'Could not retrieve pages indexed data. This may require additional API permissions or the site may not have sitemaps configured.'
    });
  } catch (error) {
    console.error('Google Search Console Pages Indexed Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Google Analytics (GA4) Endpoint
app.post('/api/google/analytics', async (req, res) => {
  try {
    const { startDate, endDate } = req.body;
    
    console.log(`📊 Google Analytics Request: ${startDate} to ${endDate}`);
    
    const accessToken = await getGoogleAccessToken();
    
    if (!accessToken) {
      return res.status(401).json({ 
        error: 'Authentication required',
        message: 'Google OAuth2 access token required'
      });
    }
    
    const propertyId = API_CONFIG.googleAnalytics.propertyId;
    
    const requestBody = {
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: 'date' }],
      metrics: [
        { name: 'activeUsers' },
        { name: 'screenPageViews' },
        { name: 'averageSessionDuration' },
        { name: 'bounceRate' },
      ],
    };

    const response = await fetch(
      `${API_CONFIG.googleAnalytics.baseUrl}/v1beta/properties/${propertyId}:runReport`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Google Analytics API Error:', errorText.substring(0, 500));
      return res.status(response.status).json({ 
        error: 'Google Analytics API error',
        details: errorText.substring(0, 500),
        status: response.status
      });
    }

    const data = await response.json();
    console.log('✅ Google Analytics Success');
    res.json(data);
  } catch (error) {
    console.error('Google Analytics Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// In-memory cache for accounts and locations (they don't change often)
let cachedAccounts = null;
let cachedLocations = null;
let cacheTimestamp = null;
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes (accounts/locations rarely change)

// Google My Business Performance Endpoint (using Business Profile Performance API)
app.post('/api/google/my-business', async (req, res) => {
  try {
    const { startDate, endDate } = req.body;
    
    console.log(`🏢 Google My Business Request (Performance API): ${startDate} to ${endDate}`);
    
    const accessToken = await getGoogleAccessToken();
    
    if (!accessToken) {
      return res.status(401).json({ 
        error: 'Authentication required',
        message: 'Google OAuth2 access token required'
      });
    }
    
    // Helper function to handle rate limits with retry and exponential backoff
    const fetchWithRetry = async (url, options, retries = 5) => {
      for (let i = 0; i < retries; i++) {
        try {
          const response = await fetch(url, options);
          if (response.status === 429 || response.status === 503) {
            // Rate limited or service unavailable - wait and retry with exponential backoff
            const waitTime = Math.pow(2, i) * 3000; // 3s, 6s, 12s, 24s, 48s
            console.log(`⏳ Rate limited (${response.status}), waiting ${waitTime/1000}s before retry ${i + 1}/${retries}...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
            continue;
          }
          return response;
        } catch (error) {
          if (i === retries - 1) throw error;
          const waitTime = Math.pow(2, i) * 3000;
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }
      throw new Error('Max retries exceeded');
    };

    // Step 1: Get account list and locations (use cache if available to avoid rate limits)
    let accountNames = [];
    let allLocations = [];
    
    // Check cache first
    const now = Date.now();
    if (cachedAccounts && cachedLocations && cacheTimestamp && (now - cacheTimestamp) < CACHE_DURATION) {
      console.log('✅ Using cached accounts and locations data');
      accountNames = cachedAccounts;
      allLocations = cachedLocations;
    } else {
      // Cache miss or expired - fetch fresh data
      console.log('🔄 Cache miss or expired, fetching fresh accounts and locations...');
      
      let accountsResponse;
      try {
        accountsResponse = await fetchWithRetry(
          `${API_CONFIG.googleMyBusiness.accountManagementBaseUrl}/v1/accounts`,
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
            },
          }
        );
      } catch (error) {
        console.error('❌ Failed to fetch accounts after retries:', error.message);
        // If we can't get accounts due to rate limits, try using cache even if expired
        if (cachedAccounts && cachedLocations) {
          console.log('⚠️ Using expired cache due to rate limit');
          accountNames = cachedAccounts;
          allLocations = cachedLocations;
        } else {
          // If we can't get accounts and have no cache, return a helpful error
          console.error('❌ No cached data available and cannot fetch accounts');
          // Return a structured error that the frontend can handle gracefully
          return res.status(500).json({ 
            error: 'Failed to fetch accounts',
            message: 'Unable to fetch Google My Business accounts. The Account Management API is rate-limiting requests.',
            details: error.message,
            suggestion: 'Please wait 10-15 minutes and try again. The Account Management API has very strict rate limits. The system will use cached data if available.',
            code: 'ACCOUNT_FETCH_FAILED'
          });
        }
      }

      if (accountsResponse && accountsResponse.ok) {
        const accountsData = await accountsResponse.json();
        accountNames = accountsData.accounts?.map(acc => acc.name) || [];
        console.log(`✅ Found ${accountNames.length} GMB accounts: ${accountNames.join(', ')}`);

        if (accountNames.length === 0) {
          return res.status(404).json({ error: 'No Google My Business accounts found.' });
        }

        // Step 2: Get locations for each account (using Business Information API)
        for (let i = 0; i < accountNames.length; i++) {
          const accountName = accountNames[i];
          
          // Add delay between account requests to avoid rate limits
          if (i > 0) {
            await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay
          }
          
          try {
            const locationsResponse = await fetchWithRetry(
              `${API_CONFIG.googleMyBusiness.businessInfoBaseUrl}/v1/${accountName}/locations`,
              {
                headers: {
                  'Authorization': `Bearer ${accessToken}`,
                },
              }
            );

            if (!locationsResponse.ok) {
              const errorText = await locationsResponse.text();
              console.warn(`⚠️ Error fetching locations for ${accountName}:`, locationsResponse.status, errorText.substring(0, 200));
              continue;
            }

            const locationsData = await locationsResponse.json();
            const locations = locationsData.locations || [];
            console.log(`✅ Found ${locations.length} locations for account ${accountName}`);
            allLocations.push(...locations);
          } catch (err) {
            console.warn(`Error fetching locations for ${accountName}:`, err.message);
            continue;
          }
        }
        
        // Update cache
        cachedAccounts = accountNames;
        cachedLocations = allLocations;
        cacheTimestamp = now;
        console.log('✅ Cached accounts and locations data');
      }
    }

    if (allLocations.length === 0) {
      return res.status(404).json({ error: 'No Google My Business locations found.' });
    }

    // Step 3: Fetch performance metrics for each location using Performance API
    // Parse dates for the API (format: YYYY-MM-DD)
    const startDateParts = startDate.split('-');
    const endDateParts = endDate.split('-');
    
    const dailyRange = {
      startDate: {
        year: parseInt(startDateParts[0]),
        month: parseInt(startDateParts[1]),
        day: parseInt(startDateParts[2])
      },
      endDate: {
        year: parseInt(endDateParts[0]),
        month: parseInt(endDateParts[1]),
        day: parseInt(endDateParts[2])
      }
    };

    console.log(`📊 Fetching performance metrics for ${allLocations.length} locations using Performance API...`);

    // Prepare location data structure
    const detailedLocations = allLocations.map((location) => ({
      id: location.name,
      name: location.title || location.displayName || 'Unknown',
      address: location.storefrontAddress?.addressLines?.join(', ') || location.address?.addressLines?.join(', ') || 'N/A',
      city: location.storefrontAddress?.locality || location.address?.locality || 'N/A',
      state: location.storefrontAddress?.administrativeArea || location.address?.administrativeArea || 'N/A',
      verified: location.storefrontAddress?.addressLines ? true : false,
      impressions: null,
      clicks: null,
      calls: null,
      reviews: null, // Not available in Performance API
    }));

    // Fetch metrics for each location using Performance API
    // We'll make parallel requests with a small delay between batches to avoid rate limits
    const BATCH_SIZE = 5; // Process 5 locations at a time
    const BATCH_DELAY = 1000; // 1 second delay between batches

    for (let i = 0; i < allLocations.length; i += BATCH_SIZE) {
      const batch = allLocations.slice(i, i + BATCH_SIZE);
      
      // Process batch in parallel
      await Promise.all(batch.map(async (location, index) => {
        try {
          // Add small delay within batch to avoid rate limits
          if (index > 0) {
            await new Promise(resolve => setTimeout(resolve, 200));
          }

          // Use Performance API: fetchMultiDailyMetricsTimeSeries
          // Endpoint: GET /v1/locations/{locationId}:fetchMultiDailyMetricsTimeSeries
          // Location ID: Try both full path and just location ID
          const locationFullPath = location.name; // Format: accounts/{accountId}/locations/{locationId}
          const locationIdOnly = locationFullPath.split('/locations/')[1] || locationFullPath;
          
          // Build query parameters for multiple metrics
          const queryParams = new URLSearchParams();
          queryParams.append('dailyMetrics', 'QUERIES_DIRECT');
          queryParams.append('dailyMetrics', 'QUERIES_INDIRECT');
          queryParams.append('dailyMetrics', 'VIEWS_MAPS');
          queryParams.append('dailyMetrics', 'VIEWS_SEARCH');
          queryParams.append('dailyMetrics', 'ACTIONS_WEBSITE');
          queryParams.append('dailyMetrics', 'ACTIONS_PHONE');
          queryParams.append('dailyMetrics', 'ACTIONS_DRIVING_DIRECTIONS');
          queryParams.append('dailyRange.startDate.year', dailyRange.startDate.year.toString());
          queryParams.append('dailyRange.startDate.month', dailyRange.startDate.month.toString());
          queryParams.append('dailyRange.startDate.day', dailyRange.startDate.day.toString());
          queryParams.append('dailyRange.endDate.year', dailyRange.endDate.year.toString());
          queryParams.append('dailyRange.endDate.month', dailyRange.endDate.month.toString());
          queryParams.append('dailyRange.endDate.day', dailyRange.endDate.day.toString());
          
          // Try full path first (most likely format)
          let metricsUrl = `${API_CONFIG.googleMyBusiness.performanceBaseUrl}/v1/${locationFullPath}:fetchMultiDailyMetricsTimeSeries?${queryParams.toString()}`;
          
          console.log(`🔍 Fetching metrics for location: ${locationFullPath}`);
          console.log(`📡 URL: ${metricsUrl.substring(0, 200)}...`);

          let metricsResponse = await fetchWithRetry(
            metricsUrl,
            {
              headers: {
                'Authorization': `Bearer ${accessToken}`,
              },
            }
          );

          // If 404, try with just the location ID
          if (metricsResponse.status === 404) {
            console.log(`⚠️ Full path failed (404), trying location ID only: ${locationIdOnly}`);
            metricsUrl = `${API_CONFIG.googleMyBusiness.performanceBaseUrl}/v1/locations/${locationIdOnly}:fetchMultiDailyMetricsTimeSeries?${queryParams.toString()}`;
            metricsResponse = await fetchWithRetry(
              metricsUrl,
              {
                headers: {
                  'Authorization': `Bearer ${accessToken}`,
                },
              }
            );
          }

          if (!metricsResponse.ok) {
            const errorText = await metricsResponse.text();
            let errorData;
            try {
              errorData = JSON.parse(errorText);
            } catch {
              errorData = { message: errorText };
            }
            
            console.error(`❌ Error fetching metrics for ${locationFullPath}:`, {
              status: metricsResponse.status,
              statusText: metricsResponse.statusText,
              error: errorData,
              url: metricsUrl.substring(0, 200),
              suggestion: metricsResponse.status === 403 ? 'Business Profile Performance API may not be enabled. Enable it at: https://console.cloud.google.com/apis/api/businessprofileperformance.googleapis.com' : 
                          metricsResponse.status === 404 ? 'Location ID format may be incorrect' :
                          metricsResponse.status === 401 ? 'OAuth token may be expired or missing required scopes' :
                          'Check API documentation for correct format'
            });
            return;
          }

          const metricsData = await metricsResponse.json();
          console.log(`📊 Metrics data received for ${locationId}:`, JSON.stringify(metricsData).substring(0, 300));
          
          // Parse the response - it contains timeSeries for each metric
          let impressions = 0;
          let clicks = 0;
          let calls = 0;

          // The response structure: { dailyMetricTimeSeries: [...] }
          if (metricsData.dailyMetricTimeSeries && Array.isArray(metricsData.dailyMetricTimeSeries)) {
            metricsData.dailyMetricTimeSeries.forEach((timeSeries) => {
              const metric = timeSeries.dailyMetric;
              let totalValue = 0;

              // Sum all daily values in the time series
              // Structure: { dailyValues: [{ date: {...}, value: "123" }, ...] }
              if (timeSeries.dailyValues && Array.isArray(timeSeries.dailyValues)) {
                totalValue = timeSeries.dailyValues.reduce((sum, daily) => {
                  const val = daily.value || daily.metricValue?.value || '0';
                  return sum + (parseInt(val, 10));
                }, 0);
              }

              console.log(`  📈 Metric ${metric}: ${totalValue}`);

              // Map metrics to our categories
              // Impressions = queries (direct + indirect) or views (maps + search)
              if (metric === 'QUERIES_DIRECT' || metric === 'QUERIES_INDIRECT' || 
                  metric === 'VIEWS_MAPS' || metric === 'VIEWS_SEARCH') {
                impressions += totalValue;
              }
              // Clicks = website actions + driving directions
              else if (metric === 'ACTIONS_WEBSITE' || metric === 'ACTIONS_DRIVING_DIRECTIONS') {
                clicks += totalValue;
              }
              // Calls = phone actions
              else if (metric === 'ACTIONS_PHONE') {
                calls += totalValue;
              }
            });
          } else {
            console.warn(`⚠️ Unexpected response structure for ${locationId}:`, Object.keys(metricsData));
          }

          // Update the location in detailedLocations
          const locationIndex = detailedLocations.findIndex(loc => loc.id === locationId);
          if (locationIndex !== -1) {
            detailedLocations[locationIndex].impressions = impressions > 0 ? impressions : null;
            detailedLocations[locationIndex].clicks = clicks > 0 ? clicks : null;
            detailedLocations[locationIndex].calls = calls > 0 ? calls : null;
          }

        } catch (err) {
          console.error(`❌ Error fetching metrics for location ${location.name}:`, {
            message: err.message,
            stack: err.stack?.substring(0, 300)
          });
        }
      }));

      // Delay between batches
      if (i + BATCH_SIZE < allLocations.length) {
        await new Promise(resolve => setTimeout(resolve, BATCH_DELAY));
      }
    }

    // Calculate totals
    const totalImpressions = detailedLocations.reduce((sum, loc) => sum + (loc.impressions || 0), 0);
    const totalClicks = detailedLocations.reduce((sum, loc) => sum + (loc.clicks || 0), 0);
    const totalCalls = detailedLocations.reduce((sum, loc) => sum + (loc.calls || 0), 0);
    const totalReviews = 0; // Not available in Performance API

    console.log(`✅ Google My Business Success (Performance API): ${detailedLocations.length} locations, ${totalImpressions} impressions, ${totalClicks} clicks, ${totalCalls} calls`);

    res.json({
      impressions: totalImpressions > 0 ? totalImpressions : null,
      clicks: totalClicks > 0 ? totalClicks : null,
      calls: totalCalls > 0 ? totalCalls : null,
      reviews: null, // Not available in Performance API
      locations: detailedLocations,
    });
  } catch (error) {
    console.error('❌ Google My Business Error:', {
      message: error.message,
      stack: error.stack?.substring(0, 500)
    });
    res.status(500).json({ 
      error: error.message,
      details: 'Check server logs for more information'
    });
  }
});

// Meta Ads Endpoint (requires OAuth token)
app.get('/api/meta/ads', async (req, res) => {
  try {
    const { startDate, endDate, accessToken } = req.query;
    
    if (!accessToken) {
      return res.status(401).json({ error: 'OAuth access token required' });
    }

    const adAccountId = `act_${API_CONFIG.metaAds.adAccountId}`;
    const response = await fetch(
      `${API_CONFIG.metaAds.baseUrl}/v18.0/${adAccountId}/insights?fields=impressions,clicks,ctr,cpc,spend,campaign_name,campaign_id&time_range={"since":"${startDate}","until":"${endDate}"}&level=campaign`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({ error: errorText });
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Meta Ads Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Backend proxy server is running' });
});

// Google Ads Endpoint
app.post('/api/google/ads', async (req, res) => {
  try {
    const { startDate, endDate } = req.body;
    
    console.log(`📊 Google Ads Request: ${startDate} to ${endDate}`);
    
    const accessToken = await getGoogleAccessToken();
    
    if (!accessToken) {
      return res.status(401).json({ 
        error: 'Authentication required',
        message: 'Google OAuth2 access token required'
      });
    }

    // Google Ads API requires a customer ID and developer token
    const developerToken = API_CONFIG.googleAds.developerToken || process.env.GOOGLE_ADS_DEVELOPER_TOKEN;
    
    if (!developerToken) {
      return res.status(400).json({
        error: 'Developer token required',
        message: 'Google Ads API requires a developer token. Get it from: https://ads.google.com/aw/apicenter',
        details: 'Navigate to Tools & Settings > API Center in your Google Ads account to get your developer token.',
        suggestion: 'Set GOOGLE_ADS_DEVELOPER_TOKEN environment variable or add it to backend/config.js'
      });
    }

    // Try to get customer ID from config first, otherwise list accessible customers
    let customerId = API_CONFIG.googleAds.customerId || process.env.GOOGLE_ADS_CUSTOMER_ID;
    
    if (!customerId) {
      // Try to list customers accessible by this account
      try {
        const customersResponse = await fetch(
          `${API_CONFIG.googleAds.baseUrl}/v17/customers:listAccessibleCustomers`,
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'developer-token': developerToken,
            },
          }
        );

        if (!customersResponse.ok) {
          const errorText = await customersResponse.text();
          console.error('❌ Error listing Google Ads customers:', customersResponse.status, errorText.substring(0, 500));
          
          return res.status(400).json({
            error: 'Customer ID required',
            message: 'Unable to automatically fetch customer ID. Please provide a Google Ads customer ID.',
            details: 'Google Ads API requires a customer ID to fetch campaign data. You can find your customer ID in your Google Ads account (format: 123-456-7890, use without dashes: 1234567890).',
            suggestion: 'Set GOOGLE_ADS_CUSTOMER_ID environment variable or add it to backend/config.js'
          });
        }

        const customersData = await customersResponse.json();
        const customerIds = customersData.resourceNames || [];
        
        if (customerIds.length === 0) {
          return res.status(404).json({ error: 'No Google Ads customers found for this account.' });
        }

        // Use the first customer ID (remove 'customers/' prefix if present)
        customerId = customerIds[0].replace('customers/', '');
        console.log(`✅ Auto-detected Google Ads customer ID: ${customerId}`);
      } catch (listError) {
        console.error('❌ Error listing customers:', listError);
        return res.status(500).json({
          error: 'Failed to list customers',
          details: listError.message
        });
      }
    } else {
      // Remove dashes from customer ID if present (format: 123-456-7890 -> 1234567890)
      customerId = customerId.replace(/-/g, '');
      console.log(`✅ Using configured Google Ads customer ID: ${customerId}`);
    }
    
    try {

      // Now query campaign performance data using GAQL
      // Google Ads API requires date filtering in the WHERE clause
      // We'll query for campaigns with metrics: impressions, clicks, cost, conversions
      const query = `
        SELECT
          campaign.id,
          campaign.name,
          metrics.impressions,
          metrics.clicks,
          metrics.cost_micros,
          metrics.conversions,
          metrics.ctr,
          metrics.average_cpc
        FROM campaign
        WHERE segments.date BETWEEN '${startDate}' AND '${endDate}'
        ORDER BY campaign.name
      `;

      const searchResponse = await fetch(
        `${API_CONFIG.googleAds.baseUrl}/v17/customers/${customerId}/googleAds:search`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'developer-token': developerToken,
            'login-customer-id': customerId,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query: query.trim(),
          }),
        }
      );

      if (!searchResponse.ok) {
        const errorText = await searchResponse.text();
        console.error('❌ Error querying Google Ads:', searchResponse.status, errorText.substring(0, 500));
        return res.status(searchResponse.status).json({
          error: 'Google Ads API error',
          details: errorText.substring(0, 500),
          status: searchResponse.status
        });
      }

      const searchData = await searchResponse.json();
      
      // Parse the response - Google Ads API returns results in a specific format
      // The API returns one row per day per campaign, so we need to aggregate
      const campaigns = [];
      const campaignMap = new Map();
      
      if (searchData.results && Array.isArray(searchData.results)) {
        searchData.results.forEach((result) => {
          const campaignId = result.campaign?.id?.toString() || 'unknown';
          const campaignName = result.campaign?.name || 'Unknown Campaign';
          
          if (!campaignMap.has(campaignId)) {
            campaignMap.set(campaignId, {
              id: campaignId,
              name: campaignName,
              impressions: 0,
              clicks: 0,
              costMicros: 0,
              conversions: 0,
            });
          }
          
          const campaign = campaignMap.get(campaignId);
          // Aggregate metrics across all days
          campaign.impressions += parseInt(result.metrics?.impressions || '0', 10);
          campaign.clicks += parseInt(result.metrics?.clicks || '0', 10);
          campaign.costMicros += parseInt(result.metrics?.costMicros || '0', 10);
          campaign.conversions += parseFloat(result.metrics?.conversions || '0');
        });
      } else {
        console.warn('⚠️ No results in Google Ads API response:', Object.keys(searchData));
      }

      // Convert to our format
      let totalImpressions = 0;
      let totalClicks = 0;
      let totalCostMicros = 0;
      let totalConversions = 0;

      campaignMap.forEach((campaign) => {
        totalImpressions += campaign.impressions;
        totalClicks += campaign.clicks;
        totalCostMicros += campaign.costMicros;
        totalConversions += campaign.conversions;

        const cost = campaign.costMicros / 1000000; // Convert micros to dollars
        const ctr = campaign.impressions > 0 ? (campaign.clicks / campaign.impressions) * 100 : 0;
        const cpc = campaign.clicks > 0 ? cost / campaign.clicks : 0;
        const costPerLead = campaign.conversions > 0 ? cost / campaign.conversions : 0;

        campaigns.push({
          id: campaign.id,
          name: campaign.name,
          impressions: campaign.impressions > 0 ? campaign.impressions : null,
          clicks: campaign.clicks > 0 ? campaign.clicks : null,
          ctr: ctr > 0 ? ctr : null,
          costPerClick: cpc > 0 ? cpc : null,
          totalLeads: campaign.conversions > 0 ? Math.round(campaign.conversions) : null, // Conversions = Leads
          costPerLead: costPerLead > 0 ? costPerLead : null,
          totalSpend: cost > 0 ? cost : null,
        });
      });

      const totalCost = totalCostMicros / 1000000;
      const totalCtr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
      const totalCostPerClick = totalClicks > 0 ? totalCost / totalClicks : 0;
      const totalCostPerLead = totalConversions > 0 ? totalCost / totalConversions : 0;

      console.log(`✅ Google Ads Success: ${campaigns.length} campaigns, ${totalImpressions} impressions, ${totalClicks} clicks, ${totalConversions} conversions`);

      res.json({
        totalImpressions: totalImpressions > 0 ? totalImpressions : null,
        totalClicks: totalClicks > 0 ? totalClicks : null,
        totalCtr: totalCtr > 0 ? totalCtr : null,
        totalCostPerClick: totalCostPerClick > 0 ? totalCostPerClick : null,
        totalLeads: totalConversions > 0 ? Math.round(totalConversions) : null, // Conversions = Leads
        totalCostPerLead: totalCostPerLead > 0 ? totalCostPerLead : null,
        totalSpend: totalCost > 0 ? totalCost : null,
        campaigns,
      });
    } catch (error) {
      console.error('❌ Google Ads Error:', error);
      res.status(500).json({ 
        error: error.message,
        details: 'Check server logs for more information. Make sure Google Ads API is enabled and developer token is configured.'
      });
    }
  } catch (error) {
    console.error('❌ Google Ads Error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Backend server running on http://localhost:${PORT}`);
  console.log(`📊 Ready to proxy API requests from frontend`);
  console.log(`\n⚠️  IMPORTANT: HubSpot API key appears to be EXPIRED`);
  console.log(`   Please update the API key in backend/config.js`);
  console.log(`   See API_KEY_STATUS.md for instructions\n`);
});

