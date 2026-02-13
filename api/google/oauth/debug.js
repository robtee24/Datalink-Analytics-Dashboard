import { API_CONFIG } from '../../_config.js';

export default async function handler(req, res) {
  // Check for refresh token
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;
  
  if (!refreshToken) {
    return res.status(200).json({
      error: 'No GOOGLE_REFRESH_TOKEN environment variable set',
      solution: 'Re-authorize via the Authorize Services button',
    });
  }

  // Try to refresh and capture the exact error
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

    const data = await response.json();
    
    if (response.ok) {
      return res.status(200).json({
        status: 'success',
        message: 'Token refresh successful!',
        tokenPreview: data.access_token ? `${data.access_token.substring(0, 20)}...` : null,
        expiresIn: data.expires_in,
      });
    } else {
      return res.status(200).json({
        status: 'error',
        httpStatus: response.status,
        error: data.error,
        errorDescription: data.error_description,
        refreshTokenPreview: `${refreshToken.substring(0, 20)}...`,
        clientIdConfigured: !!API_CONFIG.google.clientId,
        clientSecretConfigured: !!API_CONFIG.google.clientSecret,
        solution: data.error === 'invalid_grant' 
          ? 'The refresh token has expired or been revoked. You need to re-authorize via the Authorize Services button and set a new GOOGLE_REFRESH_TOKEN in Vercel.'
          : 'Check your Google Cloud Console credentials.',
      });
    }
  } catch (error) {
    return res.status(200).json({
      status: 'exception',
      error: error.message,
    });
  }
}
