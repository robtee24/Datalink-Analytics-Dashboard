import type { DateRange } from '../types';
import { format } from 'date-fns';
import { API_BASE_URL } from '../config/api';

export interface GoogleAnalyticsMetrics {
  uniqueVisitors: number | null;
  bounceRate: number | null;
  timeOnPage: number | null;
  sessions: number | null;
  pageViews: number | null;
  uniqueVisitorsHistory: Array<{ date: string; value: number }>;
  topPages: Array<{ page: string; pageViews: number; users: number }>;
}

export const fetchGoogleAnalytics = async (
  dateRange: DateRange,
  compareDateRange: DateRange | null
): Promise<{ current: GoogleAnalyticsMetrics; compare: GoogleAnalyticsMetrics | null }> => {
  const formatDate = (date: Date) => format(date, 'yyyy-MM-dd');
  const startDate = formatDate(dateRange.startDate);
  const endDate = formatDate(dateRange.endDate);

  try {
    const current = await fetchGA4Data(startDate, endDate);
    
    let compare: GoogleAnalyticsMetrics | null = null;
    if (compareDateRange) {
      const compareStartDate = formatDate(compareDateRange.startDate);
      const compareEndDate = formatDate(compareDateRange.endDate);
      compare = await fetchGA4Data(compareStartDate, compareEndDate);
    }

    return { current, compare };
  } catch (error) {
    console.error('Error fetching Google Analytics data:', error);
    return getUnavailableData(compareDateRange);
  }
};

async function fetchGA4Data(startDate: string, endDate: string): Promise<GoogleAnalyticsMetrics> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/google/analytics`, {
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
      console.error('Google Analytics API error:', errorData);
      
      if (response.status === 401) {
        console.warn('⚠️ Google Analytics requires OAuth2 authentication');
      }
      
      throw new Error(`GA4 API error: ${response.status}`);
    }

    const data = await response.json();
    
    return {
      uniqueVisitors: data.uniqueVisitors,
      bounceRate: data.bounceRate,
      timeOnPage: data.timeOnPage,
      sessions: data.sessions,
      pageViews: data.pageViews,
      uniqueVisitorsHistory: data.uniqueVisitorsHistory || [],
      topPages: data.topPages || [],
    };
  } catch (error) {
    console.error('Error fetching GA4 data:', error);
    return {
      uniqueVisitors: null,
      bounceRate: null,
      timeOnPage: null,
      sessions: null,
      pageViews: null,
      uniqueVisitorsHistory: [],
      topPages: [],
    };
  }
}

function getUnavailableData(
  compareDateRange: DateRange | null
): { current: GoogleAnalyticsMetrics; compare: GoogleAnalyticsMetrics | null } {
  const unavailable: GoogleAnalyticsMetrics = {
    uniqueVisitors: null,
    bounceRate: null,
    timeOnPage: null,
    sessions: null,
    pageViews: null,
    uniqueVisitorsHistory: [],
    topPages: [],
  };

  return { 
    current: unavailable, 
    compare: compareDateRange ? { ...unavailable } : null 
  };
}

