# Enable Google APIs

## ✅ Status

OAuth2 authorization is complete! However, some APIs need to be enabled in your Google Cloud Project.

## 🔧 Required APIs to Enable

You need to enable these APIs in your Google Cloud Console:

### 1. Google Search Console API ✅ (Should be working)
- **API Name**: Search Console API
- **Enable URL**: https://console.cloud.google.com/apis/library/searchconsole.googleapis.com?project=941213137130

### 2. Google Analytics Data API ❌ (Needs to be enabled)
- **API Name**: Google Analytics Data API
- **Enable URL**: https://console.cloud.google.com/apis/api/analyticsdata.googleapis.com/overview?project=941213137130
- **Error**: "Google Analytics Data API has not been used in project 941213137130 before or it is disabled"

### 3. Google My Business APIs ❌ (Needs to be enabled)
- **API Name**: My Business Account Management API
- **Enable URL**: https://console.cloud.google.com/apis/api/mybusinessaccountmanagement.googleapis.com/overview?project=941213137130
- **Also enable**: My Business Business Information API
- **Enable URL**: https://console.cloud.google.com/apis/api/mybusinessbusinessinformation.googleapis.com/overview?project=941213137130
- **Also enable**: Business Profile Performance API (NEW - Required for Performance API)
- **Enable URL**: https://console.cloud.google.com/apis/api/businessprofileperformance.googleapis.com/overview?project=941213137130

### 4. Google Ads API ❌ (Needs to be enabled)
- **API Name**: Google Ads API
- **Enable URL**: https://console.cloud.google.com/apis/library/googleads.googleapis.com?project=941213137130
- **Important**: After enabling, you also need a **Developer Token** from Google Ads (not Cloud Console)
- **Get Developer Token**: https://ads.google.com/aw/apicenter → Tools & Settings → API Center
- **Add to config**: Set `GOOGLE_ADS_DEVELOPER_TOKEN` environment variable or add to `backend/config.js`

## 📋 Quick Steps

1. **Go to Google Cloud Console**: https://console.cloud.google.com/
2. **Select your project**: Project ID `941213137130`
3. **Navigate to APIs & Services → Library**
4. **Enable each API** by clicking the links above or searching for:
   - ✅ Search Console API (should already be enabled)
   - ❌ Google Analytics Data API
   - ❌ My Business Account Management API
   - ❌ My Business Business Information API
   - ❌ Business Profile Performance API (NEW - Required for Performance metrics)
   - ❌ Google Ads API (Also requires Developer Token from ads.google.com)

5. **Wait 2-3 minutes** after enabling for the changes to propagate

## 🧪 Test After Enabling

After enabling the APIs, refresh your dashboard. The data should start flowing!

You can also test the APIs directly:

```bash
# Test Google Search Console
curl -X POST http://localhost:3001/api/google/search-console \
  -H "Content-Type: application/json" \
  -d '{"startDate": "2024-12-01", "endDate": "2024-12-31"}'

# Test Google Analytics (after enabling)
curl -X POST http://localhost:3001/api/google/analytics \
  -H "Content-Type: application/json" \
  -d '{"startDate": "2024-12-01", "endDate": "2024-12-31"}'

# Test Google My Business (after enabling)
curl -X POST http://localhost:3001/api/google/my-business \
  -H "Content-Type: application/json" \
  -d '{"startDate": "2024-12-01", "endDate": "2024-12-31"}'
```

## ⚠️ Note

Even if you enabled the APIs earlier, there might be a propagation delay. Wait a few minutes and try again.

