# Environment Variables Template

Copy these environment variables to your Vercel project settings or create a `.env.local` file for local development.

## Required Environment Variables

### Google OAuth
```
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-your-secret
GOOGLE_API_KEY=AIzaSy-your-api-key
```

### Google Analytics
```
GA_MEASUREMENT_ID=G-XXXXXXXX
GA_STREAM_ID=1234567890
GA_PROPERTY_ID=1234567890
```

### Google Ads
```
GOOGLE_ADS_DEVELOPER_TOKEN=your-developer-token
GOOGLE_ADS_CUSTOMER_ID=1234567890
```

### HubSpot
```
HUBSPOT_PRIVATE_APP_TOKEN=pat-na1-xxxxx
HUBSPOT_CLIENT_SECRET=xxxxx
```

### Meta Ads
```
META_APP_ID=your-app-id
META_APP_SECRET=your-app-secret
META_CLIENT_ID=your-client-id
META_AD_ACCOUNT_ID=your-ad-account-id
```

### Frontend (Vite)
```
VITE_API_URL=https://your-api-domain.vercel.app
```

## Setting Up in Vercel

1. Go to your Vercel project settings
2. Navigate to "Environment Variables"
3. Add each variable above with your actual values
4. Redeploy the project for changes to take effect

