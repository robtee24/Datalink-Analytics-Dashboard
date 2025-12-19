import { useState, useEffect } from 'react';
import type { DateRange } from '../../types';
import { fetchHubSpotAnalytics } from '../../services/hubspotService';
import SectionHeader from '../SectionHeader';
import KPICard from '../KPICard';
import LineChart from '../LineChart';

interface HubSpotAnalyticsProps {
  dateRange: DateRange;
  compareDateRange: DateRange | null;
}

export default function HubSpotAnalytics({ dateRange, compareDateRange }: HubSpotAnalyticsProps) {
  const [data, setData] = useState<{
    current: any;
    compare: any | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const result = await fetchHubSpotAnalytics(dateRange, compareDateRange);
        setData(result);
      } catch (error) {
        console.error('Error fetching HubSpot analytics:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [dateRange, compareDateRange]);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <SectionHeader title="HubSpot Analytics" logoUrl="https://cdn.simpleicons.org/hubspot/FF7A59" />
        <div className="text-center py-8">Loading...</div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      <SectionHeader title="HubSpot Analytics" logoUrl="https://cdn.simpleicons.org/hubspot/FF7A59" />
      
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
          label="Time on Page"
          value={data.current.timeOnPage !== null ? `${data.current.timeOnPage}s` : null}
          compareValue={data.compare?.timeOnPage !== null && data.compare?.timeOnPage !== undefined ? `${data.compare.timeOnPage}s` : null}
        />
        <KPICard
          label="Total Lead Submissions"
          value={data.current.totalLeadSubmissions}
          compareValue={data.compare?.totalLeadSubmissions}
        />
      </div>

      {data.current.uniqueVisitorsHistory.length > 0 ? (
        <LineChart
          data={data.current.uniqueVisitorsHistory}
          compareData={data.compare?.uniqueVisitorsHistory}
          title="Unique Visitors Over Time"
          yAxisLabel="Visitors"
        />
      ) : (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Unique Visitors Over Time</h3>
          <div className="text-center py-8 text-gray-500">N/A - Data not available</div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Lead Submissions by Page</h3>
        {data.current.leadSubmissionsByPage.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Page
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Submissions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data.current.leadSubmissionsByPage.map((item: any, index: number) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.page}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.count}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">N/A - No data available</div>
        )}
      </div>
    </div>
  );
}

