# Google Search Console - HTTPS Property

## ✅ Updated Configuration

The backend has been updated to prioritize the **HTTPS property** (`https://www.datalinknetworks.net/`) for Google Search Console.

## 🔄 Re-Authorization Needed

Since the server was restarted, the OAuth tokens stored in memory were lost. You'll need to re-authorize:

### Quick Re-Authorization:

1. **Visit the authorization URL**:
   ```
   http://localhost:3001/api/google/oauth/authorize
   ```

2. **Copy the `authUrl`** from the JSON response

3. **Open that URL** in your browser and authorize again

4. **After authorization**, the tokens will be stored and Google Search Console will use the HTTPS property

## 📋 Site URL Priority

The backend now tries these site URLs in order:
1. ✅ `https://www.datalinknetworks.net/` (Primary - with trailing slash)
2. `https://www.datalinknetworks.net` (without trailing slash)
3. `sc-domain:www.datalinknetworks.net` (domain property format)

## 🧪 Test After Re-Authorization

After re-authorizing, refresh your dashboard. The Google Search Console section should now pull data from the HTTPS property.

You can also test directly:
```bash
curl -X POST http://localhost:3001/api/google/search-console \
  -H "Content-Type: application/json" \
  -d '{"startDate": "2024-12-01", "endDate": "2024-12-31"}'
```

## 💡 Note

For production, consider storing tokens in a database instead of memory so they persist across server restarts.

