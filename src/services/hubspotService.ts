import type { HubSpotMetrics, DateRange } from '../types';
import { format } from 'date-fns';
import { API_BASE_URL } from '../config/api';

export type ProgressCallback = (progress: number, message: string) => void;

export const fetchHubSpotAnalytics = async (
  dateRange: DateRange,
  compareDateRange: DateRange | null,
  onProgress?: ProgressCallback
): Promise<{ current: HubSpotMetrics; compare: HubSpotMetrics | null }> => {
  const formatDate = (date: Date) => format(date, 'yyyy-MM-dd');
  const startDate = formatDate(dateRange.startDate);
  const endDate = formatDate(dateRange.endDate);

  // Calculate total steps: analytics + forms for current, optionally for compare
  const totalSteps = compareDateRange ? 4 : 2;
  let completedSteps = 0;

  const updateProgress = (message: string) => {
    completedSteps++;
    const progress = Math.round((completedSteps / totalSteps) * 100);
    onProgress?.(progress, message);
  };

  try {
    onProgress?.(0, 'Fetching analytics data...');

    // Fetch current period analytics
    const analyticsData = await fetchHubSpotAnalyticsData(startDate, endDate);
    updateProgress('Analytics data loaded');

    // Fetch current period forms
    const formsData = await fetchHubSpotFormsData(startDate, endDate);
    updateProgress('Forms data loaded');

    const current: HubSpotMetrics = {
      uniqueVisitors: analyticsData.uniqueVisitors,
      bounceRate: analyticsData.bounceRate,
      timeOnPage: analyticsData.timeOnPage,
      totalLeadSubmissions: formsData.totalSubmissions,
      leadSubmissionsByPage: formsData.submissionsByPage,
      uniqueVisitorsHistory: analyticsData.visitorsHistory,
    };

    // Fetch compare period data if provided
    let compare: HubSpotMetrics | null = null;
    if (compareDateRange) {
      const compareStartDate = formatDate(compareDateRange.startDate);
      const compareEndDate = formatDate(compareDateRange.endDate);

      onProgress?.(50, 'Fetching comparison analytics...');
      const compareAnalyticsData = await fetchHubSpotAnalyticsData(compareStartDate, compareEndDate);
      updateProgress('Comparison analytics loaded');

      const compareFormsData = await fetchHubSpotFormsData(compareStartDate, compareEndDate);
      updateProgress('Comparison forms loaded');

      compare = {
        uniqueVisitors: compareAnalyticsData.uniqueVisitors,
        bounceRate: compareAnalyticsData.bounceRate,
        timeOnPage: compareAnalyticsData.timeOnPage,
        totalLeadSubmissions: compareFormsData.totalSubmissions,
        leadSubmissionsByPage: compareFormsData.submissionsByPage,
        uniqueVisitorsHistory: compareAnalyticsData.visitorsHistory,
      };
    }

    onProgress?.(100, 'Complete');
    return { current, compare };
  } catch (error: any) {
    console.error('Error fetching HubSpot analytics:', error);
    console.warn('⚠️ HubSpot API Error Details:', {
      message: error?.message,
      stack: error?.stack,
    });
    onProgress?.(100, 'Error loading data');
    // Return unavailable data (will show N/A)
    return getUnavailableData(dateRange, compareDateRange);
  }
};

async function fetchHubSpotAnalyticsData(startDate: string, endDate: string) {
  try {
    const proxyResponse = await fetch(
      `${API_BASE_URL}/api/hubspot/analytics?startDate=${startDate}&endDate=${endDate}`
    );
    
    if (!proxyResponse.ok) {
      const errorData = await proxyResponse.json().catch(() => ({ error: 'Unknown error' }));
      console.error('HubSpot analytics API error:', proxyResponse.status, errorData);
      throw new Error(`API error: ${proxyResponse.status}`);
    }
    
    const data = await proxyResponse.json();
    console.log('HubSpot analytics response:', data);
    
    // The API now returns data in the correct format directly
    return {
      uniqueVisitors: data.uniqueVisitors,
      bounceRate: data.bounceRate,
      timeOnPage: data.timeOnPage,
      visitorsHistory: data.uniqueVisitorsHistory || [],
    };
  } catch (error: any) {
    console.error('❌ Error fetching HubSpot analytics data:', error);
    console.warn('⚠️ HubSpot analytics not available - returning null');
    return {
      uniqueVisitors: null,
      bounceRate: null,
      timeOnPage: null,
      visitorsHistory: [],
    };
  }
}


async function fetchHubSpotFormsData(startDate: string, endDate: string) {
  try {
    const proxyResponse = await fetch(
      `${API_BASE_URL}/api/hubspot/forms?startDate=${startDate}&endDate=${endDate}`
    );
    
    if (!proxyResponse.ok) {
      const errorData = await proxyResponse.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(`Backend proxy error: ${proxyResponse.status} - ${errorData.error || 'Unknown'}`);
    }
    
    const data = await proxyResponse.json();
    console.log('HubSpot forms response:', data);
    
    // The API now returns totalSubmissions and submissionsByPage directly
    return {
      totalSubmissions: data.totalSubmissions ?? null,
      submissionsByPage: data.submissionsByPage || [],
    };
  } catch (error: any) {
    console.error('Error fetching HubSpot forms data:', error);
    return {
      totalSubmissions: null,
      submissionsByPage: [],
    };
  }
}


function getUnavailableData(
  _dateRange: DateRange,
  compareDateRange: DateRange | null
): { current: HubSpotMetrics; compare: HubSpotMetrics | null } {
  const unavailableCurrent: HubSpotMetrics = {
    uniqueVisitors: null as any,
    bounceRate: null as any,
    timeOnPage: null as any,
    totalLeadSubmissions: null as any,
    leadSubmissionsByPage: [],
    uniqueVisitorsHistory: [],
  };

  const unavailableCompare: HubSpotMetrics | null = compareDateRange
    ? {
        uniqueVisitors: null as any,
        bounceRate: null as any,
        timeOnPage: null as any,
        totalLeadSubmissions: null as any,
        leadSubmissionsByPage: [],
        uniqueVisitorsHistory: [],
      }
    : null;

  return { current: unavailableCurrent, compare: unavailableCompare };
}

