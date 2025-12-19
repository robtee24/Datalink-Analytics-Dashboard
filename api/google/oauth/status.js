import { getTokens } from '../../_config.js';

export default function handler(req, res) {
  const tokens = getTokens();
  
  const authorized = !!(tokens.accessToken && tokens.expiresAt > Date.now());
  
  res.status(200).json({
    authorized,
    hasAccessToken: !!tokens.accessToken,
    hasRefreshToken: !!tokens.refreshToken,
    message: authorized 
      ? 'Google OAuth2 is authorized. Access granted to Search Console, Analytics, My Business, and Google Ads.'
      : 'Google OAuth2 is not authorized. Please authorize via the OAuth modal.',
  });
}

