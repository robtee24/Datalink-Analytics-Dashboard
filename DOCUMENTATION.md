# Datalink Analytics Dashboard
## Complete Documentation Guide

---

## Table of Contents

1. [Overview](#overview)
2. [Technology Stack](#technology-stack)
3. [Getting Started](#getting-started)
4. [Dashboard Features](#dashboard-features)
5. [API Integrations](#api-integrations)
6. [Configuration Reference](#configuration-reference)
7. [Troubleshooting](#troubleshooting)

---

## Overview

The Datalink Analytics Dashboard is a comprehensive marketing analytics platform that aggregates data from multiple marketing services into a single, unified view. It provides real-time insights into SEO performance, paid advertising campaigns, and business profile metrics.

### Key Features

- **Unified Dashboard**: View all marketing metrics in one place
- **Date Range Selection**: Analyze data for any custom time period
- **Period Comparison**: Compare performance between two time periods
- **Multi-Platform Support**: Integrates with 7+ marketing platforms
- **Real-Time Data**: Fetches live data from all connected APIs
- **Export & Filtering**: Search, filter, and sort all data tables

---

## Technology Stack

| Component | Technology |
|-----------|------------|
| Frontend | React 18 + TypeScript |
| Styling | Tailwind CSS v3 |
| Charts | Recharts |
| Build Tool | Vite |
| Backend Proxy | Node.js + Express |
| Authentication | OAuth2 (Google), Private App Tokens (HubSpot) |

### Project Structure

```
Datalink-Analytics-Dashboard/
├── src/
│   ├── components/
│   │   ├── Ads/
│   │   │   ├── GoogleAds.tsx
│   │   │   ├── LinkedInAds.tsx
│   │   │   ├── MetaAds.tsx
│   │   │   └── RedditAds.tsx
│   │   ├── SEO/
│   │   │   ├── GoogleMyBusiness.tsx
│   │   │   ├── GoogleSearchConsole.tsx
│   │   │   └── HubSpotAnalytics.tsx
│   │   ├── DatePeriodSelector.tsx
│   │   ├── KPICard.tsx
│   │   ├── LineChart.tsx
│   │   ├── OAuthModal.tsx
│   │   └── SectionHeader.tsx
│   ├── services/
│   │   ├── adsService.ts
│   │   ├── googleAdsService.ts
│   │   ├── googleAnalyticsService.ts
│   │   ├── googleMyBusinessService.ts
│   │   ├── googleSearchConsoleService.ts
│   │   ├── hubspotService.ts
│   │   └── metaAdsService.ts
│   ├── config/
│   │   └── api.ts
│   ├── types.ts
│   ├── App.tsx
│   └── main.tsx
├── backend/
│   ├── server.js
│   ├── config.js
│   └── package.json
├── package.json
└── tailwind.config.js
```

---

## Getting Started

### Prerequisites

- Node.js v18 or higher
- npm or yarn
- API credentials for each service (see Configuration section)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd Datalink-Analytics-Dashboard
   ```

2. **Install frontend dependencies**
   ```bash
   npm install
   ```

3. **Install backend dependencies**
   ```bash
   cd backend
   npm install
   cd ..
   ```

4. **Configure API credentials**
   - Edit `backend/config.js` with your API keys and tokens
   - See [Configuration Reference](#configuration-reference) for details

5. **Start the backend server**
   ```bash
   cd backend
   node server.js
   ```
   Backend runs on: `http://localhost:3001`

6. **Start the frontend development server**
   ```bash
   npm run dev
   ```
   Frontend runs on: `http://localhost:5173`

7. **Authorize Google Services**
   - On first load, an OAuth modal will appear
   - Click "Authorize" for Google Services
   - Complete the Google sign-in flow

---

## Dashboard Features

### Date Period Selector

Located at the top of the dashboard, the date period selector allows you to:

- **Select Measurement Period**: Choose the date range for analysis
- **Enable Compare Period**: Toggle comparison mode to compare two time periods
- **Select Compare Period**: When enabled, choose a second date range for comparison

When comparison is enabled, all metrics display both periods with visual indicators showing improvement or decline.

### SEO Tracking Sections

#### 1. HubSpot Analytics

**Metrics Displayed:**
- Unique Visitors
- Bounce Rate
- Time on Page
- Total Lead Form Submissions
- Lead Submissions by Page

**Features:**
- Line chart showing unique visitors over time
- Comparison line (grey) when compare period is enabled
- Form submissions breakdown by page

**API Used:** HubSpot Private App API

---

#### 2. Google Search Console

**Metrics Displayed:**
- Total Impressions
- Total Clicks
- Ranked Keywords count

**Keywords Table Features:**
- Paginated list (20 keywords per page)
- Search bar for filtering
- Multi-select checkboxes for comparison
- "Apply Filter" and "Clear Filter" buttons
- Sortable columns (click header to sort)
- Accordion rows showing page-level data

**Compare Period Features:**
- Additional columns for compare period metrics
- Color-coded indicators:
  - 🟢 Green text: Improvement
  - 🔴 Red text: Decline
- Position: Lower is better
- Other metrics: Higher is better

**Chart Options:**
- Toggle charts for Impressions, Clicks, and Position
- Compare line shown in grey

**API Used:** Google Search Console API (OAuth2)

---

#### 3. Google My Business

**Metrics Displayed:**
- Total Impressions
- Total Clicks  
- Total Calls
- Total Reviews

**Location Breakdown:**
- Individual metrics for each of 8 locations
- Verification badge for each location

**API Used:** Business Profile Performance API (OAuth2)

---

### Paid Ads Tracking Sections

Each ad platform section includes:

#### Total Metrics Panel
- Impressions
- Clicks
- Click-Through Rate (CTR)
- Cost Per Click (CPC)
- Total Leads
- Cost Per Lead

#### Campaign Table Features
- Paginated list (10 campaigns per page)
- Search bar for filtering
- Multi-select checkboxes
- "Apply Filter" / "Clear Filter" buttons
- All columns sortable
- Comparison data when compare period enabled

---

#### 4. Meta Ads (Facebook/Instagram)

**API Used:** Meta Marketing API (OAuth2)

**Campaigns Display:**
- Campaign name
- Impressions, Clicks, CTR
- CPC, Total Leads, Cost per Lead

---

#### 5. Reddit Ads

**API Used:** Reddit Ads API

**Note:** Currently displays placeholder data. Reddit Ads API integration pending credentials.

---

#### 6. Google Ads

**API Used:** Google Ads API v17 (OAuth2 + Developer Token)

**Requirements:**
- Google Ads API enabled in Cloud Console
- Developer Token from Google Ads API Center
- Customer ID (format: 123-456-7890)

**Important:** Developer token must have "Basic Access" or higher to access production data.

---

#### 7. LinkedIn Ads

**API Used:** LinkedIn Marketing API

**Note:** Currently displays placeholder data. LinkedIn Marketing API integration pending credentials.

---

## API Integrations

### Google Services (OAuth2)

All Google services use the same OAuth2 authentication flow:

1. User clicks "Authorize" in OAuth modal
2. Popup opens to Google sign-in
3. User grants permissions
4. Tokens stored in backend memory
5. Automatic token refresh when expired

**Scopes Requested:**
- `https://www.googleapis.com/auth/webmasters.readonly` (Search Console)
- `https://www.googleapis.com/auth/analytics.readonly` (Analytics)
- `https://www.googleapis.com/auth/business.manage` (My Business)
- `https://www.googleapis.com/auth/adwords` (Google Ads)

### HubSpot (Private App Token)

Uses Private App authentication:
- No user OAuth flow required
- Token configured in backend
- Scopes: Forms, Marketing content, CMS/Website analytics

### API Endpoints (Backend Proxy)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/google/oauth/authorize` | GET | Initiate Google OAuth |
| `/api/google/oauth/callback` | GET | OAuth callback handler |
| `/api/google/oauth/status` | GET | Check authorization status |
| `/api/google/search-console` | POST | Fetch Search Console keywords |
| `/api/google/search-console/daily` | POST | Fetch daily metrics |
| `/api/google/search-console/keyword-pages` | POST | Fetch pages for keyword |
| `/api/google/analytics` | POST | Fetch Analytics data |
| `/api/google/my-business` | POST | Fetch My Business metrics |
| `/api/google/ads` | POST | Fetch Google Ads campaigns |
| `/api/hubspot/analytics` | POST | Fetch HubSpot analytics |
| `/api/hubspot/forms` | GET | Fetch HubSpot forms |
| `/api/meta/ads` | POST | Fetch Meta Ads campaigns |
| `/health` | GET | Backend health check |

---

## Configuration Reference

### Backend Configuration (`backend/config.js`)

```javascript
const API_CONFIG = {
  hubspot: {
    privateAppToken: 'pat-na1-xxxxx',  // HubSpot Private App token
    clientSecret: 'xxxxx',
    baseUrl: 'https://api.hubapi.com',
  },
  google: {
    clientId: 'xxxxx.apps.googleusercontent.com',
    clientSecret: 'GOCSPX-xxxxx',
    apiKey: 'AIzaSyxxxxx',
    redirectUri: 'http://localhost:3001/api/google/oauth/callback',
  },
  googleSearchConsole: {
    apiKey: 'AIzaSyxxxxx',
    uniqueId: 'xxxxx',
    serviceAccountEmail: 'xxxxx@xxxxx.iam.gserviceaccount.com',
    baseUrl: 'https://www.googleapis.com/webmasters/v3',
  },
  googleAnalytics: {
    measurementId: 'G-XXXXX',
    streamId: 'xxxxx',
    propertyId: 'xxxxx',
    baseUrl: 'https://analyticsdata.googleapis.com',
  },
  googleMyBusiness: {
    accountManagementBaseUrl: 'https://mybusinessaccountmanagement.googleapis.com',
    businessInfoBaseUrl: 'https://mybusinessbusinessinformation.googleapis.com',
    performanceBaseUrl: 'https://businessprofileperformance.googleapis.com',
  },
  metaAds: {
    appId: 'xxxxx',
    appSecret: 'xxxxx',
    clientId: 'xxxxx',
    adAccountId: 'xxxxx',
    baseUrl: 'https://graph.facebook.com',
  },
  googleAds: {
    baseUrl: 'https://googleads.googleapis.com',
    developerToken: 'xxxxx',  // From Google Ads API Center
    customerId: 'xxxxx',       // Without dashes (1234567890)
  },
};
```

### Required Google Cloud APIs

Enable these APIs in Google Cloud Console:

1. **Google Search Console API**
2. **Google Analytics Data API**
3. **My Business Account Management API**
4. **My Business Business Information API**
5. **Business Profile Performance API**
6. **Google Ads API**

### HubSpot Private App Scopes

Required scopes for HubSpot Private App:

- `forms` - Access to form submissions
- `content` - Marketing content access
- `analytics.read` - Website analytics (if available)

---

## Troubleshooting

### Common Issues

#### "Authentication required" Error
**Cause:** OAuth tokens not set or expired
**Solution:** 
1. Refresh the page
2. Click "Authorize" in the OAuth modal
3. Complete Google sign-in

#### Google Ads "UNIMPLEMENTED" Error
**Cause:** Developer token has "Test Access" level
**Solution:**
1. Go to [Google Ads API Center](https://ads.google.com/aw/apicenter)
2. Check Access Level
3. Apply for "Basic Access" upgrade

#### Google My Business Rate Limits
**Cause:** Too many API requests
**Solution:** 
- Backend implements caching (30-minute expiry)
- Backend uses exponential backoff retry
- Wait a few minutes and refresh

#### "N/A" Displayed for Metrics
**Cause:** API returned no data or error
**Solution:**
1. Check backend console for errors
2. Verify API credentials
3. Ensure APIs are enabled in Cloud Console

#### Search Console Data Discrepancies
**Cause:** API data may differ from web interface due to:
- Privacy filtering
- Sampling
- Processing delays
- Different aggregation methods

### Checking Backend Logs

View backend output:
```bash
# If running in background
tail -f /tmp/backend.log

# Or run in foreground
cd backend && node server.js
```

### Testing API Endpoints

```bash
# Check backend health
curl http://localhost:3001/health

# Check OAuth status
curl http://localhost:3001/api/google/oauth/status

# Test Search Console
curl -X POST http://localhost:3001/api/google/search-console \
  -H "Content-Type: application/json" \
  -d '{"startDate":"2024-12-01","endDate":"2024-12-19"}'
```

### Restarting Servers

```bash
# Kill existing processes
lsof -ti:3001 | xargs kill -9  # Backend
lsof -ti:5173 | xargs kill -9  # Frontend

# Restart backend
cd backend && node server.js &

# Restart frontend
npm run dev
```

---

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review backend console logs
3. Verify all API credentials are correct
4. Ensure required APIs are enabled

---

*Documentation Version: 1.0*  
*Last Updated: December 2024*

