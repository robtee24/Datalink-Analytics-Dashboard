# Datalink Analytics Dashboard

A comprehensive marketing analytics dashboard that aggregates data from multiple marketing services including Google Search Console, Google Analytics, Google My Business, HubSpot, Meta Ads, Google Ads, and more.

## Features

- 📊 **Unified Dashboard** - View all marketing metrics in one place
- 📅 **Date Range Selection** - Analyze data for any custom time period
- 🔄 **Period Comparison** - Compare performance between two time periods
- 🔗 **Multi-Platform Integration** - Connects to 7+ marketing platforms
- 📈 **Interactive Charts** - Visualize trends with toggleable line charts
- 🔍 **Search & Filter** - Find specific campaigns and keywords easily
- 📱 **Responsive Design** - Works on desktop and mobile

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS
- **Charts**: Recharts
- **Backend**: Node.js + Express (API Proxy)
- **Authentication**: OAuth2 (Google), Private App Tokens (HubSpot)

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- API credentials for each service

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/robtee24/Datalink-Analytics-Dashboard.git
   cd Datalink-Analytics-Dashboard
   ```

2. **Install dependencies**
   ```bash
   # Frontend
   npm install

   # Backend
   cd backend && npm install
   ```

3. **Configure environment variables**
   ```bash
   # Copy example files
   cp backend/env.example backend/.env
   
   # Edit backend/.env with your API credentials
   ```

4. **Start the development servers**
   ```bash
   # Terminal 1 - Backend (port 3001)
   cd backend && node server.js

   # Terminal 2 - Frontend (port 5173)
   npm run dev
   ```

5. **Open the dashboard**
   - Navigate to http://localhost:5173
   - Authorize Google Services in the OAuth modal

## Deployment to Vercel

### Frontend Deployment

1. Push your code to GitHub
2. Import the repository in Vercel
3. Set the following environment variables in Vercel:
   - `VITE_API_URL` - Your backend API URL

### Backend Deployment

The backend can be deployed to:
- **Vercel Serverless Functions** (included in `/api` directory)
- **Railway**, **Render**, or **Fly.io** for the Express server

### Required Environment Variables

Set these in your Vercel/deployment platform:

```
# Google OAuth2
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_API_KEY=
GOOGLE_REDIRECT_URI=

# Google Analytics
GA_MEASUREMENT_ID=
GA_STREAM_ID=
GA_PROPERTY_ID=

# Google Ads
GOOGLE_ADS_DEVELOPER_TOKEN=
GOOGLE_ADS_CUSTOMER_ID=

# HubSpot
HUBSPOT_PRIVATE_APP_TOKEN=
HUBSPOT_CLIENT_SECRET=

# Meta Ads
META_APP_ID=
META_APP_SECRET=
META_CLIENT_ID=
META_AD_ACCOUNT_ID=
```

## API Integrations

| Service | Auth Method | Status |
|---------|-------------|--------|
| Google Search Console | OAuth2 | ✅ Active |
| Google Analytics | OAuth2 | ✅ Active |
| Google My Business | OAuth2 | ✅ Active |
| Google Ads | OAuth2 + Dev Token | ⚠️ Requires Basic Access |
| HubSpot | Private App Token | ✅ Active |
| Meta Ads | OAuth2 | 🔄 In Progress |
| Reddit Ads | API Key | 🔄 Pending |
| LinkedIn Ads | OAuth2 | 🔄 Pending |

## Documentation

See [DOCUMENTATION.md](./DOCUMENTATION.md) for complete documentation including:
- Detailed setup instructions
- API endpoint reference
- Configuration options
- Troubleshooting guide

## License

MIT
