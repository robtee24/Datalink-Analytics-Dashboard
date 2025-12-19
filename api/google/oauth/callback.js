import { API_CONFIG, setTokens } from '../../_config.js';

export default async function handler(req, res) {
  const { code, error } = req.query;

  if (error) {
    return res.status(400).send(`
      <html>
        <head><title>Authorization Failed</title></head>
        <body>
          <h1>Authorization Failed</h1>
          <p>Error: ${error}</p>
          <script>
            if (window.opener) {
              window.opener.postMessage('oauth-error', '*');
              window.close();
            }
          </script>
        </body>
      </html>
    `);
  }

  if (!code) {
    return res.status(400).json({ error: 'No authorization code provided' });
  }

  try {
    // Exchange code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: API_CONFIG.google.clientId,
        client_secret: API_CONFIG.google.clientSecret,
        redirect_uri: API_CONFIG.google.redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error('Token exchange failed:', errorData);
      throw new Error('Failed to exchange authorization code');
    }

    const tokens = await tokenResponse.json();
    
    // Store tokens
    setTokens(
      tokens.access_token,
      tokens.refresh_token,
      tokens.expires_in || 3600
    );

    // Return success HTML that closes popup
    res.status(200).send(`
      <html>
        <head>
          <title>Authorization Successful</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; text-align: center; padding: 50px; }
            .success { color: #10b981; font-size: 48px; }
            h1 { color: #1e3a5f; }
            p { color: #64748b; }
          </style>
        </head>
        <body>
          <div class="success">✓</div>
          <h1>Authorization Successful!</h1>
          <p>You can close this window and refresh the dashboard.</p>
          <script>
            if (window.opener) {
              window.opener.postMessage('oauth-complete', '*');
              setTimeout(() => window.close(), 2000);
            }
          </script>
        </body>
      </html>
    `);
  } catch (error) {
    console.error('OAuth callback error:', error);
    res.status(500).send(`
      <html>
        <head><title>Authorization Error</title></head>
        <body>
          <h1>Authorization Error</h1>
          <p>${error.message}</p>
          <script>
            if (window.opener) {
              window.opener.postMessage('oauth-error', '*');
            }
          </script>
        </body>
      </html>
    `);
  }
}

