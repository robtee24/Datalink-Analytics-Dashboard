import { API_CONFIG } from '../../_config.js';

export default function handler(req, res) {
  const scopes = [
    'https://www.googleapis.com/auth/webmasters.readonly',
    'https://www.googleapis.com/auth/analytics.readonly',
    'https://www.googleapis.com/auth/business.manage',
    'https://www.googleapis.com/auth/adwords',
  ];

  // Determine the redirect URI based on the request origin
  let redirectUri = API_CONFIG.google.redirectUri;
  
  // If we have a Vercel URL or host header, use it
  const host = req.headers.host;
  if (host && !host.includes('localhost')) {
    redirectUri = `https://${host}/api/google/oauth/callback`;
  }

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${API_CONFIG.google.clientId}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&response_type=code` +
    `&scope=${encodeURIComponent(scopes.join(' '))}` +
    `&access_type=offline` +
    `&prompt=${encodeURIComponent('select_account consent')}`;

  res.status(200).json({ authUrl });
}
