import type { GoogleMyBusinessMetrics, DateRange } from '../types';
import { API_BASE_URL } from '../config/api';

export const fetchGoogleMyBusiness = async (
  dateRange: DateRange,
  compareDateRange: DateRange | null
): Promise<{ current: GoogleMyBusinessMetrics; compare: GoogleMyBusinessMetrics | null }> => {
  const formatDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  try {
    const startDate = formatDate(dateRange.startDate);
    const endDate = formatDate(dateRange.endDate);

    // Call backend proxy for Google My Business API
    const response = await fetch(`${API_BASE_URL}/api/google/my-business`, {
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
      console.error('❌ Google My Business API error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorData
      });
      
      if (response.status === 401) {
        console.warn('⚠️ Google My Business requires OAuth2 authentication');
        console.warn('💡 Visit ${API_BASE_URL}/api/google/oauth/authorize to authorize');
      } else if (response.status === 403) {
        console.warn('⚠️ Google My Business API not enabled or permission denied');
        console.warn('💡 Enable the API at: https://console.cloud.google.com/apis/library/mybusinessaccountmanagement.googleapis.com');
      } else if (response.status === 429 || response.status === 500) {
        // Handle both rate limits and 500 errors (which might be rate limit related)
        const errorData = await response.json().catch(() => ({ error: response.statusText }));
        console.warn('⚠️ Google My Business API rate limit exceeded or server error');
        if (errorData.code === 'ACCOUNT_FETCH_FAILED') {
          console.warn('💡 The Account Management API is rate-limiting requests. Please wait 10-15 minutes and try again.');
          console.warn('💡 The system will use cached location data if available.');
        } else {
          console.warn('💡 Please wait a few minutes and try again');
        }
        console.warn('Details:', errorData.message || errorData.error || errorData.details || 'Unknown error');
      }
      
      // Return unavailable data instead of throwing
      console.log('⚠️ Returning unavailable data due to API error');
      const unavailable = getUnavailableData(compareDateRange);
      console.log('📊 Unavailable data structure:', {
        hasCurrent: !!unavailable.current,
        hasCompare: !!unavailable.compare,
        currentLocations: unavailable.current?.locations?.length || 0,
      });
      return unavailable;
    }

    const data = await response.json();
    console.log('✅ Google My Business API Response:', {
      hasImpressions: data.impressions !== undefined,
      hasClicks: data.clicks !== undefined,
      hasCalls: data.calls !== undefined,
      locationsCount: data.locations?.length || 0,
    });
    
    // Parse the response
    const current: GoogleMyBusinessMetrics = {
      impressions: data.impressions !== null && data.impressions !== undefined ? data.impressions : null,
      clicks: data.clicks !== null && data.clicks !== undefined ? data.clicks : null,
      calls: data.calls !== null && data.calls !== undefined ? data.calls : null,
      reviews: data.reviews !== null && data.reviews !== undefined ? data.reviews : null,
      locations: (data.locations || []).map((loc: any) => ({
        id: loc.id,
        name: loc.name,
        address: loc.address,
        city: loc.city,
        state: loc.state,
        verified: loc.verified || false,
        impressions: loc.impressions !== null && loc.impressions !== undefined ? loc.impressions : null,
        clicks: loc.clicks !== null && loc.clicks !== undefined ? loc.clicks : null,
        calls: loc.calls !== null && loc.calls !== undefined ? loc.calls : null,
        reviews: loc.reviews !== null && loc.reviews !== undefined ? loc.reviews : null,
      })),
    };

    // Fetch compare period data if provided
    // Note: We skip the compare period fetch if we got rate limited on the main request
    // to avoid making additional API calls that will also fail
    let compare: GoogleMyBusinessMetrics | null = null;
    if (compareDateRange && response.ok) {
      const compareStartDate = formatDate(compareDateRange.startDate);
      const compareEndDate = formatDate(compareDateRange.endDate);

      // Add a delay before the compare period request to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay

      try {
        const compareResponse = await fetch(`${API_BASE_URL}/api/google/my-business`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            startDate: compareStartDate,
            endDate: compareEndDate,
          }),
        });

        if (compareResponse.ok) {
          const compareData = await compareResponse.json();
          compare = {
            impressions: compareData.impressions !== null && compareData.impressions !== undefined ? compareData.impressions : null,
            clicks: compareData.clicks !== null && compareData.clicks !== undefined ? compareData.clicks : null,
            calls: compareData.calls !== null && compareData.calls !== undefined ? compareData.calls : null,
            reviews: compareData.reviews !== null && compareData.reviews !== undefined ? compareData.reviews : null,
            locations: (compareData.locations || []).map((loc: any) => ({
              id: loc.id,
              name: loc.name,
              address: loc.address,
              city: loc.city,
              state: loc.state,
              verified: loc.verified || false,
              impressions: loc.impressions !== null && loc.impressions !== undefined ? loc.impressions : null,
              clicks: loc.clicks !== null && loc.clicks !== undefined ? loc.clicks : null,
              calls: loc.calls !== null && loc.calls !== undefined ? loc.calls : null,
              reviews: loc.reviews !== null && loc.reviews !== undefined ? loc.reviews : null,
            })),
          };
        } else if (compareResponse.status === 429) {
          console.warn('⚠️ Rate limited on compare period fetch, skipping compare data');
        }
      } catch (compareError) {
        console.warn('Error fetching compare period data:', compareError);
      }
    }

    return { current, compare };
  } catch (error) {
    console.error('Error fetching Google My Business data:', error);
    // Return unavailable data (will show N/A)
    return getUnavailableData(compareDateRange);
  }
};

function getUnavailableData(
  compareDateRange: DateRange | null
): { current: GoogleMyBusinessMetrics; compare: GoogleMyBusinessMetrics | null } {
  const unavailableCurrent: GoogleMyBusinessMetrics = {
    impressions: null as any,
    clicks: null as any,
    calls: null as any,
    reviews: null as any,
    locations: [],
  };

  const unavailableCompare: GoogleMyBusinessMetrics | null = compareDateRange
    ? {
        impressions: null as any,
        clicks: null as any,
        calls: null as any,
        reviews: null as any,
        locations: [],
      }
    : null;

  return { current: unavailableCurrent, compare: unavailableCompare };
}

