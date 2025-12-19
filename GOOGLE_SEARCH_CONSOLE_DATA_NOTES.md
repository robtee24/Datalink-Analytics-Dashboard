# Google Search Console Data Notes

## 📊 Data Discrepancies

The data shown in the dashboard may differ from Google Search Console web interface for several reasons:

### 1. **Privacy Filtering**
- Google excludes queries with very low search volume to protect user privacy
- Queries with fewer than a certain threshold of impressions may not appear in API results
- The web interface may show aggregated data that includes these filtered queries

### 2. **Data Processing Delays**
- API data may be 1-3 days behind the web interface
- Recent data (last 2-3 days) may not be fully processed yet

### 3. **Aggregation Differences**
- The web interface may aggregate data differently than the API
- Date ranges might be calculated differently (timezone differences)

### 4. **Sampling**
- For very large datasets, Google may sample data in the API
- The web interface shows unsampled data

### 5. **Query Filtering**
- The API excludes certain types of queries (very rare, sensitive, etc.)
- The web interface may include more comprehensive data

## ✅ What We're Fetching

### All Keywords (Pagination)
- **Status**: ✅ Implemented
- **Method**: Pagination with 25,000 rows per request
- **Result**: Fetches ALL keywords, not just the first 1,000
- **Note**: This may take longer for sites with many keywords

### Pages Indexed
- **Status**: ⚠️ Approximation
- **Method**: Uses sitemap data to estimate pages indexed
- **Limitation**: Exact pages indexed requires URL Inspection API (rate limited)
- **Note**: Shows average number of pages indexed based on sitemap submissions

## ❌ Numbers We Cannot Get

### 1. **Exact Pages Indexed (Real-time)**
- **Why**: Requires URL Inspection API which is rate-limited (200 requests/day)
- **Workaround**: Using sitemap data as approximation
- **Alternative**: Use Google Search Console web interface for exact numbers

### 2. **Individual URL Performance**
- **Why**: Requires URL Inspection API (rate limited)
- **Workaround**: Aggregate data by query/page is available

### 3. **Real-time Data (Last 2-3 Days)**
- **Why**: Google processes data with a delay
- **Workaround**: Data is typically available 1-3 days after the date

### 4. **Filtered/Private Queries**
- **Why**: Privacy protection - low-volume queries are excluded
- **Workaround**: These queries don't significantly impact overall metrics

## 🔧 Recommendations

1. **For Exact Numbers**: Use Google Search Console web interface
2. **For Historical Trends**: The API data is accurate for trends over time
3. **For Large Datasets**: The pagination will fetch all keywords, but may take time
4. **For Recent Data**: Check data from 3+ days ago for most accurate results

## 📈 Data Accuracy

- **Impressions**: ✅ Accurate (may be slightly lower due to filtering)
- **Clicks**: ✅ Accurate (may be slightly lower due to filtering)
- **CTR**: ✅ Accurate (calculated from impressions/clicks)
- **Position**: ✅ Accurate (average position)
- **Keywords**: ✅ Complete (all keywords fetched via pagination)
- **Pages Indexed**: ⚠️ Approximation (based on sitemaps)

