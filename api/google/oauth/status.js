import { getTokens, getValidAccessToken } from '../../_config.js';

export default async function handler(req, res) {
  try {
    const tokens = await getTokens();
    const envRefreshToken = process.env.GOOGLE_REFRESH_TOKEN || '';
    
    // Check if we have a refresh token (either in memory or env var)
    const hasRefreshToken = !!(tokens.refreshToken || envRefreshToken);
    
    // Try to get a valid access token (this will refresh if needed)
    let accessToken = null;
    let authorized = false;
    
    if (hasRefreshToken) {
      accessToken = await getValidAccessToken();
      authorized = !!accessToken;
    }
    
    res.status(200).json({
      authorized,
      hasAccessToken: !!accessToken,
      hasRefreshToken,
      hasEnvRefreshToken: !!envRefreshToken,
      message: authorized 
        ? 'Google OAuth2 is authorized. Access granted to Search Console, Analytics, My Business, and Google Ads.'
        : hasRefreshToken
          ? 'Refresh token found but could not get access token. Check your Google Cloud credentials.'
          : 'Google OAuth2 is not authorized. Please authorize via the OAuth modal.',
    });
  } catch (error) {
    console.error('Error checking OAuth status:', error);
    res.status(200).json({
      authorized: false,
      hasAccessToken: false,
      hasRefreshToken: false,
      hasEnvRefreshToken: !!process.env.GOOGLE_REFRESH_TOKEN,
      message: 'Error checking authorization status',
      error: error.message,
    });
  }
}
