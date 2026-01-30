import { useState, useEffect } from 'react';
import type { DateRange } from '../../types';
import { fetchGoogleAnalytics } from '../../services/googleAnalyticsService';
import type { GoogleAnalyticsMetrics } from '../../services/googleAnalyticsService';
import SectionHeader from '../SectionHeader';
import KPICard from '../KPICard';
import LineChart from '../LineChart';

interface GoogleAnalyticsProps {
  dateRange: DateRange;
  compareDateRange: DateRange | null;
}

export default function GoogleAnalytics({ dateRange, compareDateRange }: GoogleAnalyticsProps) {
  const [data, setData] = useState<{
    current: GoogleAnalyticsMetrics;
    compare: GoogleAnalyticsMetrics | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const result = await fetchGoogleAnalytics(dateRange, compareDateRange);
        setData(result);
      } catch (error) {
        console.error('Error fetching Google Analytics:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [dateRange, compareDateRange]);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <SectionHeader title="Google Analytics" logoUrl="https://cdn.simpleicons.org/googleanalytics/E37400" />
        <div className="py-8">
          <div className="flex flex-col items-center space-y-3">
            <div className="w-full max-w-xs bg-gray-200 rounded-full h-2.5">
              <div 
                className="bg-orange-500 h-2.5 rounded-full animate-pulse"
                style={{ width: '60%' }}
              ></div>
            </div>
            <div className="text-sm text-gray-600">
              Loading Google Analytics data...
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  // Check if we have any data
  const hasData = data.current.uniqueVisitors !== null || 
                  data.current.bounceRate !== null || 
                  data.current.timeOnPage !== null;

  if (!hasData) {
    return (
      <div className="space-y-6">
        <SectionHeader title="Google Analytics" logoUrl="https://cdn.simpleicons.org/googleanalytics/E37400" />
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="text-center py-8">
            <div className="text-gray-500 mb-4">N/A - Google Analytics data not available</div>
            <div className="text-sm text-gray-400">
              <p>Make sure you have:</p>
              <ul className="list-disc list-inside mt-2 text-left max-w-md mx-auto">
                <li>Enabled the Google Analytics Data API in Google Cloud Console</li>
                <li>Set the GA_PROPERTY_ID environment variable in Vercel</li>
                <li>Authorized Google services via the "Authorize Services" button</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SectionHeader title="Google Analytics" logoUrl="https://cdn.simpleicons.org/googleanalytics/E37400" />
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          label="Unique Visitors"
          value={data.current.uniqueVisitors}
          compareValue={data.compare?.uniqueVisitors}
        />
        <KPICard
          label="Bounce Rate"
          value={data.current.bounceRate !== null ? `${data.current.bounceRate.toFixed(1)}%` : null}
          compareValue={data.compare?.bounceRate !== null && data.compare?.bounceRate !== undefined ? `${data.compare.bounceRate.toFixed(1)}%` : null}
        />
        <KPICard
          label="Avg Session Duration"
          value={data.current.timeOnPage !== null ? `${data.current.timeOnPage}s` : null}
          compareValue={data.compare?.timeOnPage !== null && data.compare?.timeOnPage !== undefined ? `${data.compare.timeOnPage}s` : null}
        />
        <KPICard
          label="Page Views"
          value={data.current.pageViews}
          compareValue={data.compare?.pageViews}
        />
      </div>

      {data.current.uniqueVisitorsHistory.length > 0 ? (
        <LineChart
          data={data.current.uniqueVisitorsHistory}
          compareData={data.compare?.uniqueVisitorsHistory}
          title="Active Users Over Time"
          yAxisLabel="Users"
        />
      ) : (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Active Users Over Time</h3>
          <div className="text-center py-8 text-gray-500">N/A - Daily data not available</div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Top Pages</h3>
        {data.current.topPages.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Page
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Page Views
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Users
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data.current.topPages.map((item, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.page}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.pageViews.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.users.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">N/A - No page data available</div>
        )}
      </div>
    </div>
  );
}
