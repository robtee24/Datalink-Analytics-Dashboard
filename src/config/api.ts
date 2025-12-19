// API Configuration

// Backend API URL - uses environment variable in production, localhost in development
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// API endpoints - all calls go through the backend proxy
export const API_ENDPOINTS = {
  health: `${API_BASE_URL}/health`,
  google: {
    oauth: {
      authorize: `${API_BASE_URL}/api/google/oauth/authorize`,
      callback: `${API_BASE_URL}/api/google/oauth/callback`,
      status: `${API_BASE_URL}/api/google/oauth/status`,
    },
    searchConsole: `${API_BASE_URL}/api/google/search-console`,
    searchConsoleDaily: `${API_BASE_URL}/api/google/search-console/daily`,
    searchConsoleKeywordPages: `${API_BASE_URL}/api/google/search-console/keyword-pages`,
    analytics: `${API_BASE_URL}/api/google/analytics`,
    myBusiness: `${API_BASE_URL}/api/google/my-business`,
    ads: `${API_BASE_URL}/api/google/ads`,
  },
  hubspot: {
    analytics: `${API_BASE_URL}/api/hubspot/analytics`,
    forms: `${API_BASE_URL}/api/hubspot/forms`,
  },
  meta: {
    ads: `${API_BASE_URL}/api/meta/ads`,
  },
};

