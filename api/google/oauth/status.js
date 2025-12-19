import { getTokens } from '../../_config.js';

export default async function handler(req, res) {
  try {
    const tokens = await getTokens();
    
    const authorized = !!(tokens.accessToken && tokens.expiresAt > Date.now());
    
    res.status(200).json({
      authorized,
      hasAccessToken: !!tokens.accessToken,
      hasRefreshToken: !!tokens.refreshToken,
      message: authorized 
        ? 'Google OAuth2 is authorized. Access granted to Search Console, Analytics, My Business, and Google Ads.'
        : 'Google OAuth2 is not authorized. Please authorize via the OAuth modal.',
    });
  } catch (error) {
    console.error('Error checking OAuth status:', error);
    res.status(200).json({
      authorized: false,
      hasAccessToken: false,
      hasRefreshToken: false,
      message: 'Error checking authorization status',
      error: error.message,
    });
  }
}
