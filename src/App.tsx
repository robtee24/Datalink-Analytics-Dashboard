import { useState, useEffect } from 'react';
import DatePeriodSelector from './components/DatePeriodSelector';
import HubSpotAnalytics from './components/SEO/HubSpotAnalytics';
import GoogleAnalytics from './components/SEO/GoogleAnalytics';
import GoogleSearchConsole from './components/SEO/GoogleSearchConsole';
import GoogleMyBusiness from './components/SEO/GoogleMyBusiness';
import MetaAds from './components/Ads/MetaAds';
import RedditAds from './components/Ads/RedditAds';
import GoogleAds from './components/Ads/GoogleAds';
import LinkedInAds from './components/Ads/LinkedInAds';
import OAuthModal from './components/OAuthModal';
import { API_BASE_URL } from './config/api';
import type { DateRange } from './types';

function App() {
  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: new Date(new Date().setDate(new Date().getDate() - 30)),
    endDate: new Date(),
  });
  const [compareDateRange, setCompareDateRange] = useState<DateRange | null>(null);
  const [showOAuthModal, setShowOAuthModal] = useState(false);
  const [hasCheckedAuth, setHasCheckedAuth] = useState(false);
  const [loadTrigger, setLoadTrigger] = useState(0); // Increments when user clicks "Load Data"
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

  const handleLoadData = () => {
    setLoadTrigger(prev => prev + 1);
    setHasLoadedOnce(true);
  };

  useEffect(() => {
    // Check if we should show the OAuth modal on first load
    const checkAuthOnLoad = async () => {
      try {
        // Check if Google is authorized
        const testResponse = await fetch(`${API_BASE_URL}/api/google/search-console`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ startDate: '2024-01-01', endDate: '2024-01-31' }),
        });
        
        // If not authorized, show modal (but only once)
        if (testResponse.status === 401 && !hasCheckedAuth) {
          // Check if user has dismissed the modal before
          const dismissed = localStorage.getItem('oauth-modal-dismissed');
          if (!dismissed) {
            setShowOAuthModal(true);
          }
        }
      } catch (error) {
        // If backend is not available, don't show modal
        console.warn('Could not check auth status:', error);
      } finally {
        setHasCheckedAuth(true);
      }
    };

    // Small delay to let the page load first
    const timer = setTimeout(checkAuthOnLoad, 1000);
    return () => clearTimeout(timer);
  }, [hasCheckedAuth]);

  const handleCloseOAuthModal = () => {
    setShowOAuthModal(false);
    // Remember that user dismissed the modal
    localStorage.setItem('oauth-modal-dismissed', 'true');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-bold text-gray-900">Marketing Analytics Dashboard</h1>
          <button
            onClick={() => setShowOAuthModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <span>🔐</span>
            <span>Authorize Services</span>
          </button>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <DatePeriodSelector
            dateRange={dateRange}
            compareDateRange={compareDateRange}
            onDateRangeChange={setDateRange}
            onCompareDateRangeChange={setCompareDateRange}
          />
          <div className="mt-4 flex justify-center">
            <button
              onClick={handleLoadData}
              className="px-6 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors font-semibold flex items-center gap-2"
            >
              <span>📊</span>
              <span>{hasLoadedOnce ? 'Refresh Data' : 'Load Data'}</span>
            </button>
          </div>
        </div>

        {!hasLoadedOnce ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <div className="text-gray-400 text-6xl mb-4">📊</div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">Set Date Range and Load Data</h3>
            <p className="text-gray-500">
              Select your desired date range above, then click "Load Data" to fetch analytics.
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* SEO Tracking Sections */}
            <div className="space-y-6">
              <h2 className="text-2xl font-semibold text-gray-800">SEO Tracking</h2>
              <HubSpotAnalytics dateRange={dateRange} compareDateRange={compareDateRange} loadTrigger={loadTrigger} />
              <GoogleAnalytics dateRange={dateRange} compareDateRange={compareDateRange} loadTrigger={loadTrigger} />
              <GoogleSearchConsole dateRange={dateRange} compareDateRange={compareDateRange} loadTrigger={loadTrigger} />
              <GoogleMyBusiness dateRange={dateRange} compareDateRange={compareDateRange} loadTrigger={loadTrigger} />
            </div>

            {/* Paid Ads Tracking Sections */}
            <div className="space-y-6">
              <h2 className="text-2xl font-semibold text-gray-800">Paid Ads Tracking</h2>
              <MetaAds dateRange={dateRange} compareDateRange={compareDateRange} loadTrigger={loadTrigger} />
              <RedditAds dateRange={dateRange} compareDateRange={compareDateRange} loadTrigger={loadTrigger} />
              <GoogleAds dateRange={dateRange} compareDateRange={compareDateRange} loadTrigger={loadTrigger} />
              <LinkedInAds dateRange={dateRange} compareDateRange={compareDateRange} loadTrigger={loadTrigger} />
            </div>
          </div>
        )}
      </div>

      <OAuthModal isOpen={showOAuthModal} onClose={handleCloseOAuthModal} />
    </div>
  );
}

export default App;
