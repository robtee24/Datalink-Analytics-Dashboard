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
      : 'http://localhost:3001/api/google/oauth/callback',
  },
  googleSearchConsole: {
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

// Token storage using Vercel KV (or in-memory for development)
// In production, you should use Vercel KV or a database
let tokenStore = {
  accessToken: null,
  refreshToken: null,
  expiresAt: null,
};

export const getTokens = () => tokenStore;

export const setTokens = (accessToken, refreshToken, expiresIn) => {
  tokenStore = {
    accessToken,
    refreshToken,
    expiresAt: Date.now() + (expiresIn * 1000),
  };
};

export const clearTokens = () => {
  tokenStore = { accessToken: null, refreshToken: null, expiresAt: null };
};

