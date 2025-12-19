// API Configuration

// Backend API URL:
// - In production (Vercel): Use empty string for relative URLs (same domain)
// - In development: Use localhost:3001
// - Can be overridden with VITE_API_URL environment variable
const getApiBaseUrl = () => {
  // If explicitly set, use that
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  // In production (Vercel), use relative URLs
  if (import.meta.env.PROD) {
    return '';
  }
  // In development, use localhost
  return 'http://localhost:3001';
};

export const API_BASE_URL = getApiBaseUrl();

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

