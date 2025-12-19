# 🔴 API Key Status - EXPIRED

## Critical Issue Found

**The HubSpot API key is EXPIRED!**

Error message from HubSpot:
```
"The OAuth token used to make this call expired 20432 day(s) ago."
```

This is why you're seeing mock data - all API calls are failing with 401 Unauthorized errors.

## ✅ How to Fix

### Step 1: Get a New HubSpot API Key

1. **Log into HubSpot**
2. Go to **Settings** (gear icon in top right)
3. Navigate to **Integrations** → **Private Apps**
4. Either:
   - **Create a new Private App** (recommended)
   - Or **Regenerate the token** for existing app

### Step 2: Create Private App

1. Click **"Create a private app"**
2. Give it a name (e.g., "Analytics Dashboard")
3. **Select Scopes** - Make sure to enable:
   - ✅ **Forms** - `forms` scope (for form submissions)
   - ✅ **Contacts** - `contacts` scope (if needed)
   - ⚠️ **Analytics** - May not be available (HubSpot analytics is limited)
4. Click **"Create app"**
5. **Copy the access token** (starts with `pat-` or similar)

### Step 3: Update the API Key

Once you have the new API key:

1. Update `src/config/api.ts`:
   ```typescript
   hubspot: {
     apiKey: 'YOUR_NEW_API_KEY_HERE',
     baseUrl: 'https://api.hubapi.com',
   },
   ```

2. Update `backend/config.js`:
   ```javascript
   hubspot: {
     apiKey: 'YOUR_NEW_API_KEY_HERE',
     baseUrl: 'https://api.hubapi.com',
   },
   ```

3. Restart the backend server

## 📊 What Will Work After Fix

- ✅ **HubSpot Forms** - Should work with new API key
- ⚠️ **HubSpot Analytics** - May still not be available (HubSpot doesn't expose analytics via public API)
- ❌ **Other APIs** - Still need OAuth2 tokens (Google, Meta, etc.)

## 🚀 Next Steps

1. **Get new HubSpot API key** (see steps above)
2. **Update the config files** with new key
3. **Restart backend server**
4. **Test** - Forms data should start working

## ⚠️ Important Notes

- **HubSpot Analytics**: HubSpot doesn't have a public analytics API. You may need to:
  - Use Google Analytics instead (we have GA4 credentials)
  - Export data from HubSpot dashboard manually
  - Use HubSpot's Reporting API (requires special access)

- **Other APIs**: Google and Meta APIs still need OAuth2 setup, which requires a backend proxy with OAuth flow.

