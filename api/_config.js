// Shared API Configuration for Vercel Serverless Functions
// All sensitive values come from environment variables

// In-memory token cache (for the lifetime of a single serverless function instance)
let tokenCache = null;

export const API_CONFIG = {
  hubspot: {
    privateAppToken: process.env.HUBSPOT_PRIVATE_APP_TOKEN || '',
    clientSecret: process.env.HUBSPOT_CLIENT_SECRET || '',
    baseUrl: 'https://api.hubapi.com',
  },
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    apiKey: process.env.GOOGLE_API_KEY || '',
    redirectUri: process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}/api/google/oauth/callback`
      : (process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3001/api/google/oauth/callback'),
  },
  googleSearchConsole: {
    siteUrl: 'https://www.datalinknetworks.net/',
    baseUrl: 'https://www.googleapis.com/webmasters/v3',
  },
  googleAnalytics: {
    measurementId: process.env.GA_MEASUREMENT_ID || '',
    streamId: process.env.GA_STREAM_ID || '',
    propertyId: process.env.GA_PROPERTY_ID || '',
    baseUrl: 'https://analyticsdata.googleapis.com',
  },
  googleMyBusiness: {
    accountManagementBaseUrl: 'https://mybusinessaccountmanagement.googleapis.com',
    businessInfoBaseUrl: 'https://mybusinessbusinessinformation.googleapis.com',
    performanceBaseUrl: 'https://businessprofileperformance.googleapis.com',
  },
  metaAds: {
    appId: process.env.META_APP_ID || '',
    appSecret: process.env.META_APP_SECRET || '',
    clientId: process.env.META_CLIENT_ID || '',
    adAccountId: process.env.META_AD_ACCOUNT_ID || '',
    baseUrl: 'https://graph.facebook.com',
  },
  googleAds: {
    baseUrl: 'https://googleads.googleapis.com',
    developerToken: process.env.GOOGLE_ADS_DEVELOPER_TOKEN || '',
    customerId: process.env.GOOGLE_ADS_CUSTOMER_ID || '',
  },
};

// Token storage - uses environment variable for refresh token + in-memory cache for access token
// This approach doesn't require Vercel KV or any external storage

export async function getTokens() {
  // First, check if we have a refresh token in environment variables (permanent storage)
  const envRefreshToken = process.env.GOOGLE_REFRESH_TOKEN || '';
  
  // Check in-memory cache
  if (tokenCache) {
    return {
      accessToken: tokenCache.accessToken,
      refreshToken: tokenCache.refreshToken || envRefreshToken,
      expiresAt: tokenCache.expiresAt,
    };
  }
  
  // If we have a refresh token in env, return it (access token will be fetched via refresh)
  if (envRefreshToken) {
    return {
      accessToken: null,
      refreshToken: envRefreshToken,
      expiresAt: null,
    };
  }
  
  return { accessToken: null, refreshToken: null, expiresAt: null };
}

export async function setTokens(accessToken, refreshToken, expiresIn) {
  // Store in memory cache
  tokenCache = {
    accessToken,
    refreshToken,
    expiresAt: Date.now() + (expiresIn * 1000),
  };
  console.log('✅ Tokens stored in memory cache');
  return true;
}

export async function clearTokens() {
  tokenCache = null;
  return true;
}

// Helper to get a valid access token (refreshes if needed)
export async function getValidAccessToken() {
  const tokens = await getTokens();
  
  // Check if we have a valid cached access token
  if (tokens.accessToken && tokens.expiresAt && tokens.expiresAt > Date.now() + 300000) {
    return tokens.accessToken;
  }
  
  // Need to refresh - check if we have a refresh token
  const refreshToken = tokens.refreshToken || process.env.GOOGLE_REFRESH_TOKEN;
  
  if (!refreshToken) {
    console.log('❌ No refresh token available');
    return null;
  }
  
  // Refresh the access token
  const newToken = await refreshAccessToken(refreshToken);
  return newToken;
}

async function refreshAccessToken(refreshToken) {
  try {
    console.log('🔄 Refreshing Google access token...');
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: API_CONFIG.google.clientId,
        client_secret: API_CONFIG.google.clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    if (response.ok) {
      const data = await response.json();
      await setTokens(data.access_token, refreshToken, data.expires_in || 3600);
      console.log('✅ Refreshed Google access token successfully');
      return data.access_token;
    } else {
      const errorText = await response.text();
      console.error('❌ Failed to refresh token:', errorText);
    }
  } catch (error) {
    console.error('❌ Error refreshing token:', error);
  }
  return null;
}
