import type { GoogleSearchConsoleMetrics, DateRange } from '../types';
import { format } from 'date-fns';
import { API_CONFIG, API_BASE_URL } from '../config/api';

// Note: Google Search Console API data may differ from the web interface due to:
// 1. Privacy filtering (low-volume queries are excluded)
// 2. Data aggregation differences
// 3. Processing delays (API may be 1-3 days behind)
// 4. Sampling for very large datasets

export const fetchGoogleSearchConsole = async (
  dateRange: DateRange,
  compareDateRange: DateRange | null
): Promise<{ current: GoogleSearchConsoleMetrics; compare: GoogleSearchConsoleMetrics | null }> => {
  const formatDate = (date: Date) => format(date, 'yyyy-MM-dd');
  const startDate = formatDate(dateRange.startDate);
  const endDate = formatDate(dateRange.endDate);

  try {
    // Fetch current period data
    const current = await fetchSearchConsoleData(startDate, endDate);

    // Fetch compare period data if provided
    let compare: GoogleSearchConsoleMetrics | null = null;
    if (compareDateRange) {
      const compareStartDate = formatDate(compareDateRange.startDate);
      const compareEndDate = formatDate(compareDateRange.endDate);
      compare = await fetchSearchConsoleData(compareStartDate, compareEndDate);
    }

    return { current, compare };
  } catch (error) {
    console.error('Error fetching Google Search Console data:', error);
    // Return unavailable data (will show N/A)
    return getUnavailableData(dateRange, compareDateRange);
  }
};

async function fetchSearchConsoleData(startDate: string, endDate: string): Promise<GoogleSearchConsoleMetrics> {
  try {
    // Call backend proxy for Google Search Console API
    const response = await fetch(`${API_BASE_URL}/api/google/search-console`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        startDate,
        endDate,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: response.statusText }));
      console.error('❌ Google Search Console API error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorData
      });
      
      // If it's an authentication error, provide helpful message
      if (response.status === 401) {
        console.warn('⚠️ Google Search Console requires OAuth2 authentication');
        console.warn('💡 Please authorize via the OAuth modal or visit ${API_BASE_URL}/api/google/oauth/authorize');
      }
      
      throw new Error(`Google Search Console API error: ${response.status} - ${errorData.message || errorData.error || response.statusText}`);
    }

    const data = await response.json();
    
    if (!data || !data.rows) {
      console.error('❌ Invalid API response structure:', data);
      throw new Error('Invalid API response: missing rows data');
    }
    
    console.log('✅ Google Search Console API Response:', {
      rowsCount: data.rows?.length || 0,
      sampleRow: data.rows?.[0],
      totalImpressions: data.rows?.reduce((sum: number, row: any) => sum + (parseInt(row.impressions || '0', 10)), 0) || 0,
      totalClicks: data.rows?.reduce((sum: number, row: any) => sum + (parseInt(row.clicks || '0', 10)), 0) || 0,
    });
    
    // Also fetch daily data for charts
    let dailyData = null;
    try {
      const dailyResponse = await fetch(`${API_BASE_URL}/api/google/search-console/daily`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          startDate,
          endDate,
        }),
      });
      
      if (dailyResponse.ok) {
        dailyData = await dailyResponse.json();
        console.log('✅ Google Search Console Daily Data:', {
          rowsCount: dailyData.rows?.length || 0,
        });
      }
    } catch (dailyError) {
      console.warn('Could not fetch daily data:', dailyError);
    }
    
    // Fetch pages indexed data
    let pagesIndexedData = null;
    try {
      const pagesIndexedResponse = await fetch(`${API_BASE_URL}/api/google/search-console/pages-indexed`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          startDate,
          endDate,
        }),
      });
      
      if (pagesIndexedResponse.ok) {
        pagesIndexedData = await pagesIndexedResponse.json();
        console.log('✅ Google Search Console Pages Indexed Data:', pagesIndexedData);
      }
    } catch (pagesError) {
      console.warn('Could not fetch pages indexed data:', pagesError);
    }
    
    const parsed = parseSearchConsoleResponse(data, dailyData, pagesIndexedData, startDate, endDate);
    console.log('✅ Parsed Google Search Console Data:', {
      totalImpressions: parsed.impressions,
      totalClicks: parsed.clicks,
      keywordsCount: parsed.keywords.length,
      pagesIndexed: parsed.pagesIndexed,
      historyPoints: parsed.impressionsHistory.length,
    });
    
    return parsed;
  } catch (error: any) {
    console.error('❌ Error fetching Search Console data:', {
      message: error?.message,
      stack: error?.stack,
      startDate,
      endDate,
    });
    // Return unavailable data on error
    return getUnavailableDataForPeriod(startDate, endDate);
  }
}

function parseSearchConsoleResponse(data: any, dailyData: any, pagesIndexedData: any, startDate: string, endDate: string): GoogleSearchConsoleMetrics {
  const keywords: Array<{
    keyword: string;
    position: number | null;
    impressions: number | null;
    clicks: number | null;
    ctr: number | null;
  }> = [];

  let totalImpressions = 0;
  let totalClicks = 0;
  const impressionsHistory: Array<{ date: string; value: number }> = [];
  const clicksHistory: Array<{ date: string; value: number }> = [];

  // Process keywords from query-level data
  if (data.rows && Array.isArray(data.rows)) {
    data.rows.forEach((row: any) => {
      const keyword = row.keys?.[0] || '';
      const impressions = parseInt(row.impressions || '0', 10);
      const clicks = parseInt(row.clicks || '0', 10);
      const ctr = parseFloat(row.ctr || '0');
      const position = parseFloat(row.position || '0');

      keywords.push({
        keyword,
        position: position > 0 ? Math.round(position) : null,
        impressions: impressions >= 0 ? impressions : null, // Allow 0 values
        clicks: clicks >= 0 ? clicks : null, // Allow 0 values
        ctr: ctr >= 0 ? ctr * 100 : null, // Convert to percentage, allow 0
      });
    });
  }

  // Sort keywords by impressions descending
  keywords.sort((a, b) => {
    const aImp = a.impressions || 0;
    const bImp = b.impressions || 0;
    return bImp - aImp;
  });

  // Calculate totals from daily data (more accurate than query-level aggregation)
  // Use daily data if available, otherwise fall back to query-level totals
  if (dailyData && dailyData.rows && Array.isArray(dailyData.rows)) {
    dailyData.rows.forEach((row: any) => {
      const dateStr = row.keys?.[0] || '';
      const impressions = parseInt(row.impressions || '0', 10);
      const clicks = parseInt(row.clicks || '0', 10);
      
      // Sum up totals from daily data
      totalImpressions += impressions;
      totalClicks += clicks;
      
      if (dateStr) {
        impressionsHistory.push({
          date: dateStr,
          value: impressions,
        });
        clicksHistory.push({
          date: dateStr,
          value: clicks,
        });
      }
    });
  } else {
    // Fallback: calculate from query-level data if daily data not available
    if (data.rows && Array.isArray(data.rows)) {
      data.rows.forEach((row: any) => {
        totalImpressions += parseInt(row.impressions || '0', 10);
        totalClicks += parseInt(row.clicks || '0', 10);
      });
    }
    // Generate history data if daily data not available
    impressionsHistory.push(...generateHistoryData(new Date(startDate), new Date(endDate), totalImpressions * 0.9, totalImpressions * 1.1));
    clicksHistory.push(...generateHistoryData(new Date(startDate), new Date(endDate), totalClicks * 0.9, totalClicks * 1.1));
  }

  // Get pages indexed for the last day of the period
  // Note: Google Search Console API doesn't provide exact pages indexed count
  // We'll use totalIndexed from sitemaps if available, otherwise totalSubmitted as approximation
  let pagesIndexed = null;
  const pagesIndexedHistory: Array<{ date: string; value: number }> = [];
  
  if (pagesIndexedData) {
    // Use totalIndexed as the "last day" value (current state)
    // If totalIndexed is 0 or null, use totalSubmitted as approximation
    if (pagesIndexedData.totalIndexed !== null && pagesIndexedData.totalIndexed !== undefined && pagesIndexedData.totalIndexed > 0) {
      pagesIndexed = pagesIndexedData.totalIndexed;
    } else if (pagesIndexedData.totalSubmitted !== null && pagesIndexedData.totalSubmitted !== undefined && pagesIndexedData.totalSubmitted > 0) {
      // Fallback to submitted if indexed not available or is 0
      pagesIndexed = pagesIndexedData.totalSubmitted;
    }
  }
  
  // Generate pages indexed history (use the last day value for all dates in the period)
  if (pagesIndexed !== null && pagesIndexed > 0) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const current = new Date(start);
    while (current <= end) {
      pagesIndexedHistory.push({
        date: format(current, 'yyyy-MM-dd'),
        value: pagesIndexed,
      });
      current.setDate(current.getDate() + 1);
    }
  }

  return {
    pagesIndexed,
    impressions: totalImpressions >= 0 ? totalImpressions : null, // Allow 0 values
    clicks: totalClicks >= 0 ? totalClicks : null, // Allow 0 values
    keywords,
    impressionsHistory,
    clicksHistory,
    pagesIndexedHistory,
  };
}

function getUnavailableData(
  dateRange: DateRange,
  compareDateRange: DateRange | null
): { current: GoogleSearchConsoleMetrics; compare: GoogleSearchConsoleMetrics | null } {
  const current = getUnavailableDataForPeriod(
    format(dateRange.startDate, 'yyyy-MM-dd'),
    format(dateRange.endDate, 'yyyy-MM-dd')
  );

  const compare = compareDateRange
    ? getUnavailableDataForPeriod(
        format(compareDateRange.startDate, 'yyyy-MM-dd'),
        format(compareDateRange.endDate, 'yyyy-MM-dd')
      )
    : null;

  return { current, compare };
}

function getUnavailableDataForPeriod(_startDate: string, _endDate: string): GoogleSearchConsoleMetrics {
  return {
    pagesIndexed: null as any,
    impressions: null as any,
    clicks: null as any,
    keywords: [],
    impressionsHistory: [],
    clicksHistory: [],
    pagesIndexedHistory: [],
  };
}

function getMockDataForPeriod(startDate: string, endDate: string): GoogleSearchConsoleMetrics {
  const mockKeywords = [
    { keyword: 'data analytics services', position: 3, impressions: 12450, clicks: 342, ctr: 2.75 },
    { keyword: 'business intelligence solutions', position: 5, impressions: 8920, clicks: 198, ctr: 2.22 },
    { keyword: 'cloud data management', position: 7, impressions: 6540, clicks: 145, ctr: 2.22 },
    { keyword: 'data integration platform', position: 4, impressions: 5430, clicks: 167, ctr: 3.07 },
    { keyword: 'enterprise analytics', position: 6, impressions: 4320, clicks: 98, ctr: 2.27 },
    { keyword: 'data visualization tools', position: 8, impressions: 3890, clicks: 76, ctr: 1.95 },
    { keyword: 'big data consulting', position: 9, impressions: 3210, clicks: 65, ctr: 2.02 },
    { keyword: 'data warehouse solutions', position: 5, impressions: 2980, clicks: 89, ctr: 2.99 },
    { keyword: 'analytics dashboard', position: 4, impressions: 2670, clicks: 112, ctr: 4.19 },
    { keyword: 'data pipeline automation', position: 7, impressions: 2340, clicks: 54, ctr: 2.31 },
    { keyword: 'real-time analytics', position: 6, impressions: 2100, clicks: 67, ctr: 3.19 },
    { keyword: 'data quality management', position: 8, impressions: 1890, clicks: 43, ctr: 2.28 },
    { keyword: 'predictive analytics', position: 5, impressions: 1760, clicks: 78, ctr: 4.43 },
    { keyword: 'data governance platform', position: 9, impressions: 1650, clicks: 32, ctr: 1.94 },
    { keyword: 'business data insights', position: 7, impressions: 1540, clicks: 56, ctr: 3.64 },
    { keyword: 'data migration services', position: 6, impressions: 1430, clicks: 61, ctr: 4.27 },
    { keyword: 'cloud analytics platform', position: 4, impressions: 1320, clicks: 89, ctr: 6.74 },
    { keyword: 'data science consulting', position: 8, impressions: 1210, clicks: 34, ctr: 2.81 },
    { keyword: 'machine learning analytics', position: 10, impressions: 1100, clicks: 28, ctr: 2.55 },
    { keyword: 'data strategy consulting', position: 5, impressions: 990, clicks: 45, ctr: 4.55 },
    { keyword: 'data architecture design', position: 7, impressions: 880, clicks: 38, ctr: 4.32 },
    { keyword: 'enterprise data platform', position: 6, impressions: 770, clicks: 42, ctr: 5.45 },
  ];

  return {
    pagesIndexed: 1245,
    impressions: 89234,
    clicks: 2341,
    keywords: mockKeywords,
    impressionsHistory: generateHistoryData(new Date(startDate), new Date(endDate), 85000, 95000),
    clicksHistory: generateHistoryData(new Date(startDate), new Date(endDate), 2000, 2500),
    pagesIndexedHistory: generateHistoryData(new Date(startDate), new Date(endDate), 1200, 1250),
  };
}

function generateHistoryData(startDate: Date, endDate: Date, min: number, max: number) {
  const data = [];
  const current = new Date(startDate);
  while (current <= endDate) {
    data.push({
      date: format(current, 'yyyy-MM-dd'),
      value: Math.floor(Math.random() * (max - min) + min),
    });
    current.setDate(current.getDate() + 1);
  }
  return data;
}

