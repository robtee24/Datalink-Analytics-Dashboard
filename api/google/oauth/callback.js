import { API_CONFIG, setTokens } from '../../_config.js';

export default async function handler(req, res) {
  const { code, error } = req.query;

  if (error) {
    return res.status(400).send(`
      <html>
        <head><title>Authorization Failed</title></head>
        <body style="font-family: -apple-system, sans-serif; text-align: center; padding: 50px;">
          <h1 style="color: #dc2626;">Authorization Failed</h1>
          <p>Error: ${error}</p>
          <script>
            if (window.opener) {
              window.opener.postMessage('oauth-error', '*');
              setTimeout(() => window.close(), 3000);
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
    // Determine the redirect URI based on the request origin
    let redirectUri = API_CONFIG.google.redirectUri;
    const host = req.headers.host;
    if (host && !host.includes('localhost')) {
      redirectUri = `https://${host}/api/google/oauth/callback`;
    }

    // Exchange code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: API_CONFIG.google.clientId,
        client_secret: API_CONFIG.google.clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error('Token exchange failed:', errorData);
      throw new Error('Failed to exchange authorization code');
    }

    const tokens = await tokenResponse.json();
    
    // Store tokens in Vercel KV
    const saved = await setTokens(
      tokens.access_token,
      tokens.refresh_token,
      tokens.expires_in || 3600
    );

    if (!saved) {
      console.warn('Warning: Could not save tokens to KV storage');
    }

    // Return success HTML that closes popup
    res.status(200).send(`
      <html>
        <head>
          <title>Authorization Successful</title>
          <style>
            body { 
              font-family: -apple-system, BlinkMacSystemFont, sans-serif; 
              text-align: center; 
              padding: 50px;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              min-height: 100vh;
              margin: 0;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            .card {
              background: white;
              padding: 40px;
              border-radius: 16px;
              box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            }
            .success { color: #10b981; font-size: 64px; margin-bottom: 20px; }
            h1 { color: #1e3a5f; margin-bottom: 10px; }
            p { color: #64748b; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="success">✓</div>
            <h1>Authorization Successful!</h1>
            <p>You can close this window and refresh the dashboard.</p>
          </div>
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
        <body style="font-family: -apple-system, sans-serif; text-align: center; padding: 50px;">
          <h1 style="color: #dc2626;">Authorization Error</h1>
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
