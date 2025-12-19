# Backend Proxy Server Setup

## ✅ Backend Server Created!

I've created a backend proxy server that will:
- ✅ Bypass CORS restrictions
- ✅ Handle HubSpot API calls
- ✅ Support OAuth2 for Google/Meta APIs (when tokens are provided)

## 🚀 How to Use

### 1. Start the Backend Server

The backend server should already be starting. If not, run:

```bash
cd backend
npm start
```

The server will run on **http://localhost:3001**

### 2. Frontend Will Auto-Connect

The frontend has been updated to:
- First try the backend proxy at `http://localhost:3001`
- Fall back to direct API calls if backend is unavailable
- Use mock data if both fail

### 3. Check Status

- **Backend running**: You should see "🚀 Backend proxy server running" in the terminal
- **Frontend**: Refresh your browser at http://localhost:5173
- **HubSpot**: Should now work through the backend proxy!

## 📊 What's Working Now

- ✅ **HubSpot Analytics** - Should work through backend proxy
- ✅ **HubSpot Forms** - Should work through backend proxy
- ⏳ **Google/Meta APIs** - Need OAuth tokens (structure ready)

## 🔍 Testing

1. Make sure backend is running (check terminal)
2. Refresh your browser
3. Check browser console for any errors
4. HubSpot data should now be live!

## 🛠️ Troubleshooting

If you see errors:
- Check that backend is running on port 3001
- Check browser console for connection errors
- Verify HubSpot API key is correct

