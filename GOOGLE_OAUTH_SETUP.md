# Google OAuth2 Setup Instructions

## 🎯 Quick Start

To get Google Search Console, Google Analytics, and Google My Business data working, you need to authorize the application with Google OAuth2.

### Step 1: Get Authorization URL

Visit this URL in your browser:
```
http://localhost:3001/api/google/oauth/authorize
```

This will return a JSON response with an `authUrl`. Copy that URL and open it in your browser.

### Step 2: Authorize the Application

1. You'll be redirected to Google's authorization page
2. Sign in with your Google account
3. Review the permissions requested:
   - Google Search Console (read-only)
   - Google Analytics (read-only)
   - Google My Business (manage)
4. Click "Allow" or "Continue"

### Step 3: Complete Authorization

After authorizing, you'll be redirected back to the callback URL. The tokens will be automatically stored.

### Step 4: Test the APIs

Once authorized, refresh your dashboard. The Google APIs should now work!

## 🔧 Alternative: Manual Token Entry

If you already have a refresh token, you can store it manually:

```bash
curl -X POST http://localhost:3001/api/google/oauth/token \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "YOUR_REFRESH_TOKEN_HERE"
  }'
```

## 📋 Required Scopes

The application requests these scopes:
- `https://www.googleapis.com/auth/webmasters.readonly` - Google Search Console
- `https://www.googleapis.com/auth/analytics.readonly` - Google Analytics
- `https://www.googleapis.com/auth/business.manage` - Google My Business

## ⚠️ Important Notes

1. **Redirect URI**: Make sure `http://localhost:3001/api/google/oauth/callback` is added to your Google Cloud Console OAuth2 credentials
2. **Token Storage**: Tokens are stored in memory (will be lost on server restart). For production, use a database.
3. **Token Refresh**: The backend automatically refreshes access tokens using the refresh token when needed.

## 🐛 Troubleshooting

### "redirect_uri_mismatch" Error
- Go to Google Cloud Console → APIs & Services → Credentials
- Edit your OAuth 2.0 Client ID
- Add `http://localhost:3001/api/google/oauth/callback` to Authorized redirect URIs

### "access_denied" Error
- Make sure you clicked "Allow" on the authorization page
- Check that all required APIs are enabled in Google Cloud Console

### "invalid_grant" Error
- The refresh token may have expired or been revoked
- Re-authorize the application to get a new refresh token

## ✅ Verification

After authorization, you can test the APIs:

```bash
# Test Google Search Console
curl -X POST http://localhost:3001/api/google/search-console \
  -H "Content-Type: application/json" \
  -d '{"startDate": "2024-01-01", "endDate": "2024-01-31"}'

# Test Google Analytics
curl -X POST http://localhost:3001/api/google/analytics \
  -H "Content-Type: application/json" \
  -d '{"startDate": "2024-01-01", "endDate": "2024-01-31"}'

# Test Google My Business
curl -X POST http://localhost:3001/api/google/my-business \
  -H "Content-Type: application/json" \
  -d '{"startDate": "2024-01-01", "endDate": "2024-01-31"}'
```

