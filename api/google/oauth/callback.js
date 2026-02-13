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
    
    // Store tokens in memory cache
    const saved = await setTokens(
      tokens.access_token,
      tokens.refresh_token,
      tokens.expires_in || 3600
    );

    if (!saved) {
      console.warn('Warning: Could not save tokens');
    }

    // Check if refresh token is already in env vars
    const hasEnvRefreshToken = !!process.env.GOOGLE_REFRESH_TOKEN;
    const hasNewRefreshToken = !!tokens.refresh_token;
    
    // Return success HTML with instructions to save refresh token
    // ALWAYS show the new token if we received one, so user can update expired tokens
    res.status(200).send(`
      <html>
        <head>
          <title>Authorization Successful</title>
          <style>
            body { 
              font-family: -apple-system, BlinkMacSystemFont, sans-serif; 
              text-align: center; 
              padding: 20px;
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
              max-width: 600px;
              text-align: left;
            }
            .success { color: #10b981; font-size: 48px; margin-bottom: 10px; text-align: center; }
            h1 { color: #1e3a5f; margin-bottom: 10px; text-align: center; }
            h2 { color: #1e3a5f; margin-top: 20px; font-size: 16px; }
            p { color: #64748b; }
            .token-box {
              background: #f1f5f9;
              border: 1px solid #e2e8f0;
              border-radius: 8px;
              padding: 12px;
              font-family: monospace;
              font-size: 11px;
              word-break: break-all;
              margin: 10px 0;
              max-height: 100px;
              overflow-y: auto;
            }
            .copy-btn {
              background: #3b82f6;
              color: white;
              border: none;
              padding: 8px 16px;
              border-radius: 6px;
              cursor: pointer;
              font-size: 14px;
            }
            .copy-btn:hover { background: #2563eb; }
            .steps { 
              background: #fef3c7; 
              border: 1px solid #fcd34d;
              border-radius: 8px; 
              padding: 15px; 
              margin-top: 15px;
            }
            .steps ol { margin: 10px 0 0 0; padding-left: 20px; }
            .steps li { margin: 5px 0; color: #92400e; }
            .warning {
              background: #fef3c7;
              border: 1px solid #f59e0b;
              border-radius: 8px;
              padding: 15px;
              margin-top: 15px;
              text-align: center;
            }
            .warning p { color: #92400e; margin: 5px 0; }
            .close-btn {
              background: #10b981;
              color: white;
              border: none;
              padding: 12px 24px;
              border-radius: 6px;
              cursor: pointer;
              font-size: 16px;
              margin-top: 20px;
              display: block;
              width: 100%;
            }
            .close-btn:hover { background: #059669; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="success">✓</div>
            <h1>Authorization Successful!</h1>
            
            ${hasNewRefreshToken ? `
              ${hasEnvRefreshToken ? `
                <div class="warning">
                  <p><strong>⚠️ A GOOGLE_REFRESH_TOKEN already exists in Vercel.</strong></p>
                  <p>If your Google data isn't loading, the old token may have expired. Update it with the new token below.</p>
                </div>
              ` : ''}
              
              <p>To make this authorization permanent, add the refresh token below to your Vercel environment variables.</p>
              
              <h2>Your New Refresh Token:</h2>
              <div class="token-box" id="token">${tokens.refresh_token}</div>
              <button class="copy-btn" onclick="copyToken()">📋 Copy Token</button>
              
              <div class="steps">
                <strong>⚠️ Important: Save this token to Vercel</strong>
                <ol>
                  <li>Copy the token above</li>
                  <li>Go to your <a href="https://vercel.com/dashboard" target="_blank">Vercel Dashboard</a></li>
                  <li>Select your project → Settings → Environment Variables</li>
                  <li>${hasEnvRefreshToken ? 'Update' : 'Add'}: <code>GOOGLE_REFRESH_TOKEN</code> = (paste the token)</li>
                  <li>Redeploy your project</li>
                </ol>
              </div>
            ` : `
              <p style="color: #dc2626;"><strong>Warning:</strong> No refresh token was received from Google.</p>
              <p>This can happen if you've already authorized this app before. Try revoking access at 
                <a href="https://myaccount.google.com/permissions" target="_blank">Google Account Permissions</a> 
                and authorizing again.</p>
            `}
            
            <button class="close-btn" onclick="closeWindow()">Close & Refresh Dashboard</button>
          </div>
          <script>
            function copyToken() {
              const token = document.getElementById('token').innerText;
              navigator.clipboard.writeText(token).then(() => {
                alert('Token copied to clipboard!');
              });
            }
            function closeWindow() {
              if (window.opener) {
                window.opener.postMessage('oauth-complete', '*');
                window.opener.location.reload();
              }
              window.close();
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
