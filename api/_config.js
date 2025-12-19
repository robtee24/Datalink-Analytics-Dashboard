import { kv } from '@vercel/kv';

// Shared API Configuration for Vercel Serverless Functions
// All sensitive values come from environment variables

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

// Token storage using Vercel KV
const TOKEN_KEY = 'google_oauth_tokens';

export async function getTokens() {
  try {
    const tokens = await kv.get(TOKEN_KEY);
    return tokens || { accessToken: null, refreshToken: null, expiresAt: null };
  } catch (error) {
    console.error('Error getting tokens from KV:', error);
    return { accessToken: null, refreshToken: null, expiresAt: null };
  }
}

export async function setTokens(accessToken, refreshToken, expiresIn) {
  try {
    const tokens = {
      accessToken,
      refreshToken,
      expiresAt: Date.now() + (expiresIn * 1000),
    };
    await kv.set(TOKEN_KEY, tokens);
    return true;
  } catch (error) {
    console.error('Error setting tokens in KV:', error);
    return false;
  }
}

export async function clearTokens() {
  try {
    await kv.del(TOKEN_KEY);
    return true;
  } catch (error) {
    console.error('Error clearing tokens from KV:', error);
    return false;
  }
}

// Helper to get a valid access token (refreshes if needed)
export async function getValidAccessToken() {
  const tokens = await getTokens();
  
  if (!tokens.accessToken) {
    return null;
  }
  
  // Check if token is expired (with 5 minute buffer)
  if (tokens.expiresAt && tokens.expiresAt < Date.now() + 300000) {
    // Token is expired or about to expire, try to refresh
    if (tokens.refreshToken) {
      const newToken = await refreshAccessToken(tokens.refreshToken);
      if (newToken) {
        return newToken;
      }
    }
    return null;
  }
  
  return tokens.accessToken;
}

async function refreshAccessToken(refreshToken) {
  try {
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
      console.log('✅ Refreshed Google access token');
      return data.access_token;
    } else {
      console.error('❌ Failed to refresh token:', await response.text());
    }
  } catch (error) {
    console.error('❌ Error refreshing token:', error);
  }
  return null;
}
