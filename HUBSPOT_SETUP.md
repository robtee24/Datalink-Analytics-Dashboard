# HubSpot Authentication Setup

## 🔍 Current Situation

You provided OAuth2 credentials (App ID, Client ID, Secret), but HubSpot OAuth2 requires:
1. **User authorization** - User must visit HubSpot and authorize your app
2. **Authorization code** - HubSpot redirects back with a code
3. **Token exchange** - Exchange code for access token

This is complex for server-to-server access.

## ✅ Recommended Solution: Private App (Easier!)

**For server-to-server API access, HubSpot recommends Private Apps**, not OAuth apps.

### How to Get Private App Token:

1. **Log into HubSpot**
2. Go to **Settings** (gear icon) → **Integrations** → **Private Apps**
3. Click **"Create a private app"**
4. Give it a name: "Analytics Dashboard"
5. **Select Scopes:**
   - ✅ **Forms** - `forms` scope
   - ✅ **Contacts** - `contacts` scope (if needed)
   - ✅ **Analytics** - If available
6. Click **"Create app"**
7. **Copy the access token** (it will look like: `pat-na1-...` or similar)

### Update Config:

Add the Private App token to `backend/config.js`:

```javascript
hubspot: {
  // OAuth2 Credentials (for future OAuth flow)
  appId: '25985669',
  clientId: 'f8d3715a-095e-40bf-9a6b-a62b6e924d13',
  clientSecret: '25d609ac-c621-4755-973a-2dd7505b6840',
  
  // Private App Token (use this for API calls)
  privateAppToken: 'YOUR_PRIVATE_APP_TOKEN_HERE',
  
  baseUrl: 'https://api.hubapi.com',
},
```

Then update `backend/server.js` to use `privateAppToken` instead of OAuth.

## 🔄 Alternative: OAuth2 Flow (More Complex)

If you want to use OAuth2, you need to:

1. **Set up OAuth redirect URL** in HubSpot app settings
2. **Implement authorization flow** - User visits HubSpot to authorize
3. **Get authorization code** from redirect
4. **Exchange code for tokens** (access token + refresh token)
5. **Store refresh token** - Use it to get new access tokens

This requires:
- Backend OAuth endpoint
- Frontend redirect handling
- Token storage

**Recommendation:** Use Private App for now (much simpler!)

## 🚀 Quick Fix

**Get Private App token → Update config → Restart server → Live data!**

Which approach would you like to use?

