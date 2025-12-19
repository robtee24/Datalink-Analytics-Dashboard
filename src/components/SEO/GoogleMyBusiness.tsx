import { useState, useEffect } from 'react';
import type { DateRange } from '../../types';
import { fetchGoogleMyBusiness } from '../../services/googleMyBusinessService';
import SectionHeader from '../SectionHeader';
import KPICard from '../KPICard';

interface GoogleMyBusinessProps {
  dateRange: DateRange;
  compareDateRange: DateRange | null;
}

export default function GoogleMyBusiness({ dateRange, compareDateRange }: GoogleMyBusinessProps) {
  const [data, setData] = useState<{
    current: any;
    compare: any | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        console.log('🔄 Fetching Google My Business data...', { dateRange, compareDateRange });
        const result = await fetchGoogleMyBusiness(dateRange, compareDateRange);
        console.log('✅ Google My Business data received:', {
          hasCurrent: !!result.current,
          hasCompare: !!result.compare,
          currentLocations: result.current?.locations?.length || 0,
          currentImpressions: result.current?.impressions,
        });
        setData(result);
      } catch (error) {
        console.error('❌ Error fetching Google My Business data:', error);
        // Set unavailable data on error
        setData({
          current: {
            impressions: null,
            clicks: null,
            calls: null,
            reviews: null,
            locations: [],
          },
          compare: null,
        });
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [dateRange, compareDateRange]);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <SectionHeader title="Google My Business" logoUrl="https://cdn.simpleicons.org/googlemaps/4285F4" />
        <div className="text-center py-8">Loading...</div>
      </div>
    );
  }

  // Always show the component, even if data is unavailable (will show N/A)
  if (!data) {
    return (
      <div className="space-y-6">
        <SectionHeader title="Google My Business" logoUrl="https://cdn.simpleicons.org/googlemaps/4285F4" />
        <div className="bg-blue-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Total Metrics</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard label="Impressions" value={null} compareValue={null} />
            <KPICard label="Clicks" value={null} compareValue={null} />
            <KPICard label="Calls" value={null} compareValue={null} />
            <KPICard label="Reviews" value={null} compareValue={null} />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Location Breakdown</h3>
          <div className="text-center py-8 text-gray-500">N/A - No location data available</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SectionHeader title="Google My Business" logoUrl="https://cdn.simpleicons.org/googlemaps/4285F4" />
      
      {/* Total Metrics */}
      <div className="bg-blue-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Total Metrics</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            label="Impressions"
            value={data.current.impressions}
            compareValue={data.compare?.impressions}
          />
          <KPICard
            label="Clicks"
            value={data.current.clicks}
            compareValue={data.compare?.clicks}
          />
          <KPICard
            label="Calls"
            value={data.current.calls}
            compareValue={data.compare?.calls}
          />
          <KPICard
            label="Reviews"
            value={data.current.reviews}
            compareValue={data.compare?.reviews}
          />
        </div>
      </div>

      {/* Location Breakdown */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Location Breakdown</h3>
        {data.current.locations.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {data.current.locations.map((location: any) => {
            const compareLocation = data.compare?.locations.find(
              (loc: any) => loc.id === location.id
            );
            
            return (
              <div key={location.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="text-base font-semibold text-gray-900">{location.name}</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      {location.address}
                    </p>
                    <p className="text-sm text-gray-600">
                      {location.city}, {location.state}
                    </p>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      location.verified
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {location.verified ? (
                      <span className="flex items-center gap-1">
                        <svg
                          className="w-3 h-3"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                        Verified
                      </span>
                    ) : (
                      <span className="flex items-center gap-1">
                        <svg
                          className="w-3 h-3"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                            clipRule="evenodd"
                          />
                        </svg>
                        Verification Required
                      </span>
                    )}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-3 mt-4">
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Impressions</div>
                    <div className="flex items-baseline gap-2">
                      <div className={`text-lg font-semibold ${location.impressions !== null && location.impressions !== undefined ? 'text-gray-900' : 'text-gray-400'}`}>
                        {location.impressions !== null && location.impressions !== undefined ? location.impressions.toLocaleString() : 'N/A'}
                      </div>
                      {compareLocation && compareLocation.impressions !== null && compareLocation.impressions !== undefined && (
                        <div className="text-xs text-gray-500">
                          ({compareLocation.impressions.toLocaleString()})
                        </div>
                      )}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Clicks</div>
                    <div className="flex items-baseline gap-2">
                      <div className={`text-lg font-semibold ${location.clicks !== null && location.clicks !== undefined ? 'text-gray-900' : 'text-gray-400'}`}>
                        {location.clicks !== null && location.clicks !== undefined ? location.clicks.toLocaleString() : 'N/A'}
                      </div>
                      {compareLocation && compareLocation.clicks !== null && compareLocation.clicks !== undefined && (
                        <div className="text-xs text-gray-500">
                          ({compareLocation.clicks.toLocaleString()})
                        </div>
                      )}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Calls</div>
                    <div className="flex items-baseline gap-2">
                      <div className={`text-lg font-semibold ${location.calls !== null && location.calls !== undefined ? 'text-gray-900' : 'text-gray-400'}`}>
                        {location.calls !== null && location.calls !== undefined ? location.calls.toLocaleString() : 'N/A'}
                      </div>
                      {compareLocation && compareLocation.calls !== null && compareLocation.calls !== undefined && (
                        <div className="text-xs text-gray-500">
                          ({compareLocation.calls.toLocaleString()})
                        </div>
                      )}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Reviews</div>
                    <div className="flex items-baseline gap-2">
                      <div className={`text-lg font-semibold ${location.reviews !== null && location.reviews !== undefined ? 'text-gray-900' : 'text-gray-400'}`}>
                        {location.reviews !== null && location.reviews !== undefined ? location.reviews.toLocaleString() : 'N/A'}
                      </div>
                      {compareLocation && compareLocation.reviews !== null && compareLocation.reviews !== undefined && (
                        <div className="text-xs text-gray-500">
                          ({compareLocation.reviews.toLocaleString()})
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">N/A - No location data available</div>
        )}
      </div>
    </div>
  );
}

