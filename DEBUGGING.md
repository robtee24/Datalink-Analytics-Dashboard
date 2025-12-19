# Debugging Live Data Issues

## 🔍 Current Status

The APIs are failing and falling back to mock data. Here's what's happening:

### HubSpot API Issues

1. **API Key Authentication**: The API key might be:
   - Invalid or expired
   - Missing required scopes/permissions
   - Not a valid private app access token

2. **API Endpoints**: HubSpot's API structure may have changed:
   - `/events/v3/events` - May not exist or require different auth
   - `/analytics/v3/reports/*` - May require different setup
   - `/forms/v3/forms` - Should work but might need different permissions

## 🛠️ How to Debug

### 1. Check Backend Server Logs

Look at the terminal where the backend server is running. You should see:
- `📊 HubSpot Analytics Request: ...`
- `HubSpot Analytics Response Status: ...`
- Any error messages

### 2. Check Browser Console

Open browser DevTools (F12) → Console tab. Look for:
- `❌ Error fetching HubSpot analytics data`
- `⚠️ This is why you see mock data`
- Any CORS or network errors

### 3. Test HubSpot API Key

The API key might be invalid. To verify:

1. Go to HubSpot → Settings → Integrations → Private Apps
2. Check if the API key is still valid
3. Verify it has the right scopes:
   - `forms` scope for forms API
   - `analytics` or `reports` scope for analytics

### 4. Check API Response

The backend server logs will show the actual error response from HubSpot. Common issues:
- `401 Unauthorized` - Invalid API key
- `403 Forbidden` - Missing scopes
- `404 Not Found` - Wrong endpoint
- HTML response - API key format issue

## 🔧 Next Steps

1. **Verify API Key**: Check if the HubSpot API key is still valid
2. **Check Scopes**: Ensure the private app has required permissions
3. **Review Backend Logs**: See what errors HubSpot is returning
4. **Update Endpoints**: May need to use different HubSpot API endpoints

## 📝 What to Share

If you want help debugging, share:
1. Backend server terminal output (error messages)
2. Browser console errors
3. HubSpot API key status (is it still active?)

