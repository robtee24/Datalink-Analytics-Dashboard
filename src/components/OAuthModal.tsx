import { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config/api';

interface OAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ServiceStatus {
  name: string;
  icon: string;
  color: string;
  authorized: boolean;
  authUrl?: string;
  description: string;
}

export default function OAuthModal({ isOpen, onClose }: OAuthModalProps) {
  const [services, setServices] = useState<ServiceStatus[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      checkAuthorizationStatus();
    }
  }, [isOpen]);

  const checkAuthorizationStatus = async () => {
    setLoading(true);
    
    // Initialize with default services (will be updated if API calls succeed)
    let googleAuthUrl = '';
    let googleAuthorized = false;
    
    try {
      // Check Google OAuth status
      try {
        const googleAuthResponse = await fetch(`${API_BASE_URL}/api/google/oauth/authorize`);
        if (googleAuthResponse.ok) {
          const googleAuth = await googleAuthResponse.json();
          googleAuthUrl = googleAuth.authUrl || '';
        } else {
          console.warn('Failed to get Google OAuth URL:', googleAuthResponse.status);
        }
      } catch (error) {
        console.error('Error fetching Google OAuth URL:', error);
      }
      
      // Check if we have tokens by checking OAuth status endpoint
      try {
        const statusResponse = await fetch(`${API_BASE_URL}/api/google/oauth/status`);
        if (statusResponse.ok) {
          const statusData = await statusResponse.json();
          googleAuthorized = statusData.authorized === true;
        }
      } catch {
        // Fallback: try a test API call
        try {
          const testResponse = await fetch(`${API_BASE_URL}/api/google/search-console`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ startDate: '2024-01-01', endDate: '2024-01-31' }),
          });
          googleAuthorized = testResponse.status !== 401;
        } catch {
          googleAuthorized = false;
        }
      }
    } catch (error) {
      console.error('Error checking authorization status:', error);
    } finally {
      // Always set services, even if there was an error
      setServices([
        {
          name: 'Google Services',
          icon: '🔍',
          color: '#4285f4',
          authorized: googleAuthorized,
          authUrl: googleAuthUrl,
          description: 'Google Search Console, Analytics, My Business, and Google Ads',
        },
        {
          name: 'Meta Ads',
          icon: '📱',
          color: '#0081FB',
          authorized: false,
          description: 'Facebook and Instagram Ads',
        },
        {
          name: 'HubSpot',
          icon: '🔷',
          color: '#FF7A59',
          authorized: true, // Using Private App token, no OAuth needed
          description: 'Analytics and Forms (using Private App)',
        },
      ]);
      setLoading(false);
    }
  };

  const handleAuthorize = (authUrl: string) => {
    // Open OAuth in a popup window
    const width = 600;
    const height = 700;
    const left = window.screen.width / 2 - width / 2;
    const top = window.screen.height / 2 - height / 2;
    
    const popup = window.open(
      authUrl,
      'OAuth Authorization',
      `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no,scrollbars=yes,resizable=yes`
    );

    // Check if popup was blocked
    if (!popup) {
      alert('Popup blocked! Please allow popups for this site and try again.');
      return;
    }

    // Poll for popup to close (user completed authorization)
    const checkClosed = setInterval(() => {
      if (popup.closed) {
        clearInterval(checkClosed);
        // Recheck authorization status
        setTimeout(() => {
          checkAuthorizationStatus();
        }, 2000);
      }
    }, 1000);

    // Also listen for message from popup (if callback sends it)
    const messageHandler = (event: MessageEvent) => {
      // Accept messages from localhost (development) or same origin
      if (
        (event.origin === window.location.origin || event.origin.includes('localhost')) &&
        event.data === 'oauth-complete'
      ) {
        checkAuthorizationStatus();
        window.removeEventListener('message', messageHandler);
      }
    };
    window.addEventListener('message', messageHandler);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">🔐 Service Authorization</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
          >
            ×
          </button>
        </div>

        <div className="p-6">
          <p className="text-gray-600 mb-6">
            Authorize access to your marketing services to view live data on the dashboard.
          </p>

          {loading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-4 text-gray-600">Checking authorization status...</p>
            </div>
          ) : services.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-red-600 mb-4">Unable to load services. Please check your backend connection.</p>
              <button
                onClick={checkAuthorizationStatus}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Retry
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {services.map((service) => (
                <div
                  key={service.name}
                  className={`border-2 rounded-lg p-4 ${
                    service.authorized
                      ? 'border-green-200 bg-green-50'
                      : 'border-gray-200 bg-gray-50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <span className="text-3xl">{service.icon}</span>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 text-lg">{service.name}</h3>
                        <p className="text-sm text-gray-600 mt-1">{service.description}</p>
                        {service.authorized && (
                          <div className="mt-2 flex items-center gap-2">
                            <span className="text-green-600 text-sm font-medium">✓ Authorized</span>
                          </div>
                        )}
                      </div>
                    </div>
                    {!service.authorized && service.authUrl && (
                      <button
                        onClick={() => handleAuthorize(service.authUrl!)}
                        className="px-4 py-2 rounded-md text-white font-medium text-sm hover:opacity-90 transition-opacity shadow-sm"
                        style={{ backgroundColor: service.color }}
                      >
                        Authorize
                      </button>
                    )}
                    {service.authorized && service.authUrl && (
                      <button
                        onClick={() => handleAuthorize(service.authUrl!)}
                        className="px-4 py-2 rounded-md text-white font-medium text-sm hover:opacity-90 transition-opacity shadow-sm"
                        style={{ backgroundColor: service.color }}
                        title="Re-authorize to update permissions"
                      >
                        Re-authorize
                      </button>
                    )}
                    {!service.authorized && !service.authUrl && (
                      <span className="text-gray-400 text-sm">Coming soon</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-semibold text-blue-900 mb-2">ℹ️ About Authorization</h4>
              <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                <li>Authorization is secure and handled through official OAuth2 flows</li>
                <li>You can revoke access at any time from your account settings</li>
                <li>Tokens are stored securely on the backend server</li>
                <li>You only need to authorize once per service</li>
              </ul>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-4">
            <button
              onClick={() => window.location.reload()}
              className="w-full px-6 py-3 bg-green-600 text-white rounded-md font-semibold hover:bg-green-700 transition-colors flex items-center justify-center gap-2 shadow-md"
            >
              <span>🔄</span>
              Refresh After Auth
            </button>
            
            <div className="flex justify-end gap-3">
              <button
                onClick={onClose}
                className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 font-medium hover:bg-gray-50 transition-colors"
              >
                Close
              </button>
              <button
                onClick={checkAuthorizationStatus}
                className="px-6 py-2 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 transition-colors"
              >
                Check Status
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

