import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import type { DateRange } from '../../types';
import { fetchGoogleSearchConsole } from '../../services/googleSearchConsoleService';
import { API_BASE_URL } from '../../config/api';
import SectionHeader from '../SectionHeader';
import LineChart from '../LineChart';

interface GoogleSearchConsoleProps {
  dateRange: DateRange;
  compareDateRange: DateRange | null;
  loadTrigger: number;
}

// Intent types and their styling
type IntentType = 'informational' | 'navigational' | 'transactional' | 'commercial';

const INTENT_CONFIG: Record<IntentType, { label: string; color: string; bgColor: string }> = {
  informational: { label: 'Informational', color: 'text-blue-700', bgColor: 'bg-blue-100 hover:bg-blue-200' },
  navigational: { label: 'Navigational', color: 'text-purple-700', bgColor: 'bg-purple-100 hover:bg-purple-200' },
  transactional: { label: 'Transactional', color: 'text-green-700', bgColor: 'bg-green-100 hover:bg-green-200' },
  commercial: { label: 'Commercial', color: 'text-orange-700', bgColor: 'bg-orange-100 hover:bg-orange-200' },
};

const INTENT_ORDER: IntentType[] = ['informational', 'navigational', 'transactional', 'commercial'];

// Auto-classify keyword based on patterns
function autoClassifyIntent(keyword: string): IntentType {
  const kw = keyword.toLowerCase();
  
  // Transactional patterns (highest priority)
  if (/\b(buy|purchase|order|shop|price|pricing|cost|cheap|deal|discount|coupon|sale|for sale|affordable|quote)\b/.test(kw)) {
    return 'transactional';
  }
  
  // Commercial/Research patterns
  if (/\b(best|top|review|reviews|compare|comparison|vs|versus|alternative|alternatives|recommended|rating|ratings)\b/.test(kw)) {
    return 'commercial';
  }
  
  // Navigational patterns
  if (/\b(login|log in|sign in|signin|website|official|account|dashboard|portal|app|download)\b/.test(kw)) {
    return 'navigational';
  }
  
  // Informational patterns
  if (/\b(how|what|why|when|where|who|which|can|does|do|is|are|guide|tutorial|tips|learn|example|examples|definition|meaning|explained)\b/.test(kw)) {
    return 'informational';
  }
  
  // Default to informational for general queries
  return 'informational';
}

// Find similar keywords based on shared words
function findSimilarKeywords(targetKeyword: string, allKeywords: string[]): string[] {
  const targetWords = targetKeyword.toLowerCase().split(/\s+/).filter(w => w.length > 2);
  if (targetWords.length === 0) return [];
  
  return allKeywords.filter(kw => {
    if (kw === targetKeyword) return false;
    const kwWords = kw.toLowerCase().split(/\s+/);
    // Check if any significant word matches
    return targetWords.some(tw => kwWords.some(kww => kww.includes(tw) || tw.includes(kww)));
  });
}

export default function GoogleSearchConsole({ dateRange, compareDateRange, loadTrigger }: GoogleSearchConsoleProps) {
  const [data, setData] = useState<{
    current: any;
    compare: any | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedKeywords, setSelectedKeywords] = useState<Set<string>>(new Set());
  const [appliedFilter, setAppliedFilter] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [showImpressionsChart, setShowImpressionsChart] = useState(false);
  const [showClicksChart, setShowClicksChart] = useState(false);
  const [showRankedKeywordsChart, setShowRankedKeywordsChart] = useState(false);
  const [expandedKeyword, setExpandedKeyword] = useState<string | null>(null);
  const [keywordPages, setKeywordPages] = useState<Map<string, Array<{ page: string; clicks: number; impressions: number; ctr: number }>>>(new Map());
  const [loadingPages, setLoadingPages] = useState<Set<string>>(new Set());
  
  // Intent classification state
  const [intentOverrides, setIntentOverrides] = useState<Record<string, IntentType>>(() => {
    // Load from localStorage on init
    try {
      const stored = localStorage.getItem('keyword-intent-overrides');
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });
  const [intentModal, setIntentModal] = useState<{ keyword: string; currentIntent: IntentType } | null>(null);
  const [similarKeywords, setSimilarKeywords] = useState<string[]>([]);
  const [selectedSimilar, setSelectedSimilar] = useState<Set<string>>(new Set());

  // Save intent overrides to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('keyword-intent-overrides', JSON.stringify(intentOverrides));
  }, [intentOverrides]);

  // Get intent for a keyword (override or auto-classified)
  const getKeywordIntent = (keyword: string): IntentType => {
    return intentOverrides[keyword] || autoClassifyIntent(keyword);
  };

  // Handle intent change
  const handleIntentChange = (keyword: string, newIntent: IntentType, applyToSimilar: boolean) => {
    const newOverrides = { ...intentOverrides, [keyword]: newIntent };
    
    if (applyToSimilar && selectedSimilar.size > 0) {
      selectedSimilar.forEach(similarKw => {
        newOverrides[similarKw] = newIntent;
      });
    }
    
    setIntentOverrides(newOverrides);
    setIntentModal(null);
    setSelectedSimilar(new Set());
  };

  // Open intent modal
  const openIntentModal = (keyword: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const currentIntent = getKeywordIntent(keyword);
    const allKeywords = data?.current?.keywords?.map((k: any) => k.keyword) || [];
    const similar = findSimilarKeywords(keyword, allKeywords);
    setSimilarKeywords(similar);
    setSelectedSimilar(new Set());
    setIntentModal({ keyword, currentIntent });
  };

  const itemsPerPage = 20;

  useEffect(() => {
    if (loadTrigger === 0) return; // Don't load until triggered
    
    const loadData = async () => {
      setLoading(true);
      try {
        console.log('🔄 Fetching Google Search Console data...', { dateRange, compareDateRange });
        const result = await fetchGoogleSearchConsole(dateRange, compareDateRange);
        console.log('✅ Google Search Console data loaded:', {
          keywordsCount: result.current?.keywords?.length || 0,
          impressions: result.current?.impressions,
          clicks: result.current?.clicks,
        });
        setData(result);
      } catch (error) {
        console.error('❌ Error fetching Google Search Console data:', error);
        // Set data to unavailable on error
        setData({
          current: {
            pagesIndexed: null,
            impressions: null,
            clicks: null,
            keywords: [],
            impressionsHistory: [],
            clicksHistory: [],
            pagesIndexedHistory: [],
          },
          compare: null,
        });
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [loadTrigger, dateRange, compareDateRange]);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <SectionHeader title="Google Search Console" logoUrl="https://cdn.simpleicons.org/googlesearchconsole/4285F4" />
        <div className="text-center py-8">Loading...</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <SectionHeader title="Google Search Console" logoUrl="https://cdn.simpleicons.org/googlesearchconsole/4285F4" />
        <div className="text-center py-8 text-gray-500">N/A - No data available</div>
      </div>
    );
  }
  
  // Check if we have keywords data
  if (!data.current || !data.current.keywords || data.current.keywords.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <SectionHeader title="Google Search Console" logoUrl="https://cdn.simpleicons.org/googlesearchconsole/4285F4" />
        <div className="text-center py-8 text-gray-500">N/A - No keywords data available</div>
      </div>
    );
  }

  // Apply search filter
  let filteredKeywords = data.current.keywords.filter((keyword: any) =>
    keyword.keyword.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Apply checkbox filter if active
  if (appliedFilter.size > 0) {
    filteredKeywords = filteredKeywords.filter((keyword: any) =>
      appliedFilter.has(keyword.keyword)
    );
  }

  // Create a map of compare keywords by keyword name for quick lookup
  const compareKeywordsMap = new Map();
  if (data.compare && data.compare.keywords && Array.isArray(data.compare.keywords)) {
    data.compare.keywords.forEach((kw: any) => {
      compareKeywordsMap.set(kw.keyword, kw);
    });
  }

  // Apply sorting
  if (sortColumn) {
    filteredKeywords = [...filteredKeywords].sort((a: any, b: any) => {
      let aVal: any = a[sortColumn];
      let bVal: any = b[sortColumn];

      if (sortColumn === 'keyword') {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }

  const paginatedKeywords = filteredKeywords.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalPages = Math.ceil(filteredKeywords.length / itemsPerPage);

  const toggleKeyword = (keyword: string) => {
    const newSelected = new Set(selectedKeywords);
    if (newSelected.has(keyword)) {
      newSelected.delete(keyword);
    } else {
      newSelected.add(keyword);
    }
    setSelectedKeywords(newSelected);
  };

  const applyFilter = () => {
    setAppliedFilter(new Set(selectedKeywords));
    setCurrentPage(1);
  };

  const clearFilter = () => {
    setSearchTerm('');
    setSelectedKeywords(new Set());
    setAppliedFilter(new Set());
    setCurrentPage(1);
    setSortColumn(null);
    setSortDirection('asc');
  };

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
    setCurrentPage(1);
  };

  const handleKeywordRowClick = async (keyword: string) => {
    // Toggle expansion
    if (expandedKeyword === keyword) {
      setExpandedKeyword(null);
      return;
    }

    setExpandedKeyword(keyword);

    // If we already have the pages data, don't fetch again
    if (keywordPages.has(keyword)) {
      return;
    }

    // Fetch pages for this keyword
    setLoadingPages(prev => new Set(prev).add(keyword));
    try {
      const startDate = format(dateRange.startDate, 'yyyy-MM-dd');
      const endDate = format(dateRange.endDate, 'yyyy-MM-dd');
      
      const response = await fetch(`${API_BASE_URL}/api/google/search-console/keyword-pages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          keyword,
          startDate,
          endDate,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const pages = (data.rows || []).map((row: any) => ({
          page: row.keys?.[1] || '', // Second dimension is the page
          clicks: parseInt(row.clicks || '0', 10),
          impressions: parseInt(row.impressions || '0', 10),
          ctr: parseFloat(row.ctr || '0') * 100,
        })).sort((a: any, b: any) => b.clicks - a.clicks); // Sort by clicks descending

        setKeywordPages(prev => {
          const newMap = new Map(prev);
          newMap.set(keyword, pages);
          return newMap;
        });
      } else {
        console.error('Error fetching keyword pages:', await response.text());
        setKeywordPages(prev => {
          const newMap = new Map(prev);
          newMap.set(keyword, []);
          return newMap;
        });
      }
    } catch (error) {
      console.error('Error fetching keyword pages:', error);
      setKeywordPages(prev => {
        const newMap = new Map(prev);
        newMap.set(keyword, []);
        return newMap;
      });
    } finally {
      setLoadingPages(prev => {
        const newSet = new Set(prev);
        newSet.delete(keyword);
        return newSet;
      });
    }
  };

  const getSortIcon = (column: string) => {
    if (sortColumn !== column) {
      return (
        <span className="ml-1 text-gray-400">
          <svg className="w-4 h-4 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
          </svg>
        </span>
      );
    }
    return (
      <span className="ml-1">
        {sortDirection === 'asc' ? '↑' : '↓'}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <SectionHeader title="Google Search Console" logoUrl="https://cdn.simpleicons.org/googlesearchconsole/4285F4" />
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">Impressions</h3>
            <button
              onClick={() => setShowImpressionsChart(!showImpressionsChart)}
              className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200"
            >
              {showImpressionsChart ? 'Hide Chart' : 'Show Chart'}
            </button>
          </div>
          {showImpressionsChart ? (
            <LineChart
              data={data.current.impressionsHistory}
              compareData={data.compare?.impressionsHistory}
              title=""
              yAxisLabel="Impressions"
            />
          ) : (
            <div>
              <div className={`text-3xl font-bold mb-2 ${data.current.impressions !== null && data.current.impressions !== undefined ? 'text-gray-900' : 'text-gray-400'}`}>
                {data.current.impressions !== null && data.current.impressions !== undefined ? data.current.impressions.toLocaleString() : 'N/A'}
              </div>
              {data.compare && data.compare.impressions !== null && data.compare.impressions !== undefined && (
                <div className="text-sm text-gray-500">
                  Compare: {data.compare.impressions.toLocaleString()}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">Clicks</h3>
            <button
              onClick={() => setShowClicksChart(!showClicksChart)}
              className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200"
            >
              {showClicksChart ? 'Hide Chart' : 'Show Chart'}
            </button>
          </div>
          {showClicksChart ? (
            <LineChart
              data={data.current.clicksHistory}
              compareData={data.compare?.clicksHistory}
              title=""
              yAxisLabel="Clicks"
            />
          ) : (
            <div>
              <div className={`text-3xl font-bold mb-2 ${data.current.clicks !== null && data.current.clicks !== undefined ? 'text-gray-900' : 'text-gray-400'}`}>
                {data.current.clicks !== null && data.current.clicks !== undefined ? data.current.clicks.toLocaleString() : 'N/A'}
              </div>
              {data.compare && data.compare.clicks !== null && data.compare.clicks !== undefined && (
                <div className="text-sm text-gray-500">
                  Compare: {data.compare.clicks.toLocaleString()}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">Ranked Keywords</h3>
            <button
              onClick={() => setShowRankedKeywordsChart(!showRankedKeywordsChart)}
              className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200"
            >
              {showRankedKeywordsChart ? 'Hide Chart' : 'Show Chart'}
            </button>
          </div>
          {showRankedKeywordsChart ? (
            <LineChart
              data={[]}
              compareData={null}
              title=""
              yAxisLabel="Keywords"
            />
          ) : (
            <div>
              <div className={`text-3xl font-bold mb-2 ${data.current.keywords && data.current.keywords.length > 0 ? 'text-gray-900' : 'text-gray-400'}`}>
                {data.current.keywords && data.current.keywords.length > 0 ? data.current.keywords.length.toLocaleString() : 'N/A'}
              </div>
              {data.compare && data.compare.keywords && data.compare.keywords.length > 0 && (
                <div className="text-sm text-gray-500">
                  Compare: {data.compare.keywords.length.toLocaleString()}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Target Keyword Rankings</h3>
          <div className="flex gap-4 mb-4">
            <input
              type="text"
              placeholder="Search keywords..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {selectedKeywords.size > 0 && appliedFilter.size === 0 && (
              <button
                onClick={applyFilter}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Apply Filter ({selectedKeywords.size})
              </button>
            )}
            {appliedFilter.size > 0 && (
              <button
                onClick={clearFilter}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Clear Filter
              </button>
            )}
            {searchTerm && appliedFilter.size === 0 && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setCurrentPage(1);
                }}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
              >
                Clear Search
              </button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" rowSpan={compareDateRange ? 2 : 1}>
                  <input
                    type="checkbox"
                    className="rounded border-gray-300"
                    checked={paginatedKeywords.length > 0 && paginatedKeywords.every((k: any) => selectedKeywords.has(k.keyword))}
                    onChange={(e) => {
                      if (e.target.checked) {
                        const newSelected = new Set(selectedKeywords);
                        paginatedKeywords.forEach((k: any) => newSelected.add(k.keyword));
                        setSelectedKeywords(newSelected);
                      } else {
                        const newSelected = new Set(selectedKeywords);
                        paginatedKeywords.forEach((k: any) => newSelected.delete(k.keyword));
                        setSelectedKeywords(newSelected);
                      }
                    }}
                  />
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  rowSpan={compareDateRange ? 2 : 1}
                  onClick={() => handleSort('keyword')}
                >
                  Keyword {getSortIcon('keyword')}
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  rowSpan={compareDateRange ? 2 : 1}
                >
                  Intent
                </th>
                {compareDateRange ? (
                  <>
                    <th colSpan={2} className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => handleSort('position')}>
                      Position {getSortIcon('position')}
                    </th>
                    <th colSpan={2} className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => handleSort('impressions')}>
                      Impressions {getSortIcon('impressions')}
                    </th>
                    <th colSpan={2} className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => handleSort('clicks')}>
                      Clicks {getSortIcon('clicks')}
                    </th>
                    <th colSpan={2} className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => handleSort('ctr')}>
                      CTR {getSortIcon('ctr')}
                    </th>
                  </>
                ) : (
                  <>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('position')}
                    >
                      Position {getSortIcon('position')}
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('impressions')}
                    >
                      Impressions {getSortIcon('impressions')}
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('clicks')}
                    >
                      Clicks {getSortIcon('clicks')}
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('ctr')}
                    >
                      CTR {getSortIcon('ctr')}
                    </th>
                  </>
                )}
              </tr>
              {compareDateRange && (
                <tr>
                  <th className="px-6 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Current
                  </th>
                  <th className="px-6 py-2 text-left text-xs font-medium text-red-400 uppercase tracking-wider">
                    Compare
                  </th>
                  <th className="px-6 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Current
                  </th>
                  <th className="px-6 py-2 text-left text-xs font-medium text-red-400 uppercase tracking-wider">
                    Compare
                  </th>
                  <th className="px-6 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Current
                  </th>
                  <th className="px-6 py-2 text-left text-xs font-medium text-red-400 uppercase tracking-wider">
                    Compare
                  </th>
                  <th className="px-6 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Current
                  </th>
                  <th className="px-6 py-2 text-left text-xs font-medium text-red-400 uppercase tracking-wider">
                    Compare
                  </th>
                </tr>
              )}
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedKeywords.length > 0 ? (
                paginatedKeywords.map((keyword: any, index: number) => {
                  const compareKeyword = compareKeywordsMap.get(keyword.keyword);
                  
                  // Helper function to determine color based on comparison
                  // Colors indicate whether current period IMPROVED vs compare period
                  const getCompareColor = (metric: string, current: number | null, compare: number | null): string => {
                    if (current === null || current === undefined || compare === null || compare === undefined) {
                      return 'text-gray-400'; // Default to gray if data is missing
                    }
                    
                    if (metric === 'position') {
                      // For position: lower is better (rank 1 > rank 10)
                      // If compare > current, we improved (e.g., was rank 10, now rank 5) = GREEN
                      // If compare < current, we got worse (e.g., was rank 5, now rank 10) = RED
                      return compare > current ? 'text-green-400' : compare < current ? 'text-red-400' : 'text-gray-400';
                    } else {
                      // For impressions, clicks, CTR: higher is better
                      // If compare < current, we improved (e.g., had 100, now 200) = GREEN
                      // If compare > current, we got worse (e.g., had 200, now 100) = RED
                      return compare < current ? 'text-green-400' : compare > current ? 'text-red-400' : 'text-gray-400';
                    }
                  };
                  
                  const isExpanded = expandedKeyword === keyword.keyword;
                  const pages = keywordPages.get(keyword.keyword) || [];
                  const isLoadingPages = loadingPages.has(keyword.keyword);
                  
                  return (
                    <>
                      <tr 
                        key={index} 
                        className={`${selectedKeywords.has(keyword.keyword) ? 'bg-blue-50' : ''} ${isExpanded ? 'bg-gray-50' : ''} cursor-pointer hover:bg-gray-100`}
                        onClick={(e) => {
                          // Don't trigger if clicking on checkbox
                          if ((e.target as HTMLElement).tagName === 'INPUT') {
                            return;
                          }
                          handleKeywordRowClick(keyword.keyword);
                        }}
                      >
                        <td className="px-6 py-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selectedKeywords.has(keyword.keyword)}
                            onChange={() => toggleKeyword(keyword.keyword)}
                            className="rounded border-gray-300"
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          <div className="flex items-center gap-2">
                            {keyword.keyword}
                            {isExpanded ? (
                              <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                              </svg>
                            ) : (
                              <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {(() => {
                            const intent = getKeywordIntent(keyword.keyword);
                            const config = INTENT_CONFIG[intent];
                            return (
                              <button
                                onClick={(e) => openIntentModal(keyword.keyword, e)}
                                className={`px-2 py-1 rounded-full text-xs font-medium ${config.bgColor} ${config.color} transition-colors`}
                                title="Click to change intent classification"
                              >
                                {config.label}
                              </button>
                            );
                          })()}
                        </td>
                      {compareDateRange ? (
                        <>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {keyword.position !== null && keyword.position !== undefined ? keyword.position : 'N/A'}
                          </td>
                          <td className={`px-6 py-4 whitespace-nowrap text-sm ${getCompareColor('position', keyword.position, compareKeyword?.position)}`}>
                            {compareKeyword && compareKeyword.position !== null && compareKeyword.position !== undefined ? compareKeyword.position : 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {keyword.impressions !== null && keyword.impressions !== undefined ? keyword.impressions.toLocaleString() : 'N/A'}
                          </td>
                          <td className={`px-6 py-4 whitespace-nowrap text-sm ${getCompareColor('impressions', keyword.impressions, compareKeyword?.impressions)}`}>
                            {compareKeyword && compareKeyword.impressions !== null && compareKeyword.impressions !== undefined ? compareKeyword.impressions.toLocaleString() : 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {keyword.clicks !== null && keyword.clicks !== undefined ? keyword.clicks.toLocaleString() : 'N/A'}
                          </td>
                          <td className={`px-6 py-4 whitespace-nowrap text-sm ${getCompareColor('clicks', keyword.clicks, compareKeyword?.clicks)}`}>
                            {compareKeyword && compareKeyword.clicks !== null && compareKeyword.clicks !== undefined ? compareKeyword.clicks.toLocaleString() : 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {keyword.ctr !== null && keyword.ctr !== undefined ? keyword.ctr.toFixed(2) + '%' : 'N/A'}
                          </td>
                          <td className={`px-6 py-4 whitespace-nowrap text-sm ${getCompareColor('ctr', keyword.ctr, compareKeyword?.ctr)}`}>
                            {compareKeyword && compareKeyword.ctr !== null && compareKeyword.ctr !== undefined ? compareKeyword.ctr.toFixed(2) + '%' : 'N/A'}
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {keyword.position !== null && keyword.position !== undefined ? keyword.position : 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {keyword.impressions !== null && keyword.impressions !== undefined ? keyword.impressions.toLocaleString() : 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {keyword.clicks !== null && keyword.clicks !== undefined ? keyword.clicks.toLocaleString() : 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {keyword.ctr !== null && keyword.ctr !== undefined ? keyword.ctr.toFixed(2) + '%' : 'N/A'}
                          </td>
                        </>
                      )}
                    </tr>
                    {isExpanded && (
                      <>
                        {isLoadingPages ? (
                          <tr className="bg-gray-50">
                            <td colSpan={compareDateRange ? 11 : 7} className="px-6 py-4">
                              <div className="text-sm text-gray-500 py-2">Loading pages...</div>
                            </td>
                          </tr>
                        ) : pages.length > 0 ? (
                          pages.map((page, pageIndex) => (
                            <tr key={`page-${pageIndex}`} className="bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap"></td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                <a 
                                  href={page.page} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:text-blue-800 hover:underline"
                                  onClick={(e) => e.stopPropagation()}
                                  title={page.page}
                                >
                                  {page.page}
                                </a>
                              </td>
                              {compareDateRange ? (
                                <>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500"></td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500"></td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {page.impressions.toLocaleString()}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500"></td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {page.clicks.toLocaleString()}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500"></td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {page.ctr.toFixed(2)}%
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500"></td>
                                </>
                              ) : (
                                <>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500"></td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {page.impressions.toLocaleString()}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {page.clicks.toLocaleString()}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {page.ctr.toFixed(2)}%
                                  </td>
                                </>
                              )}
                            </tr>
                          ))
                        ) : (
                          <tr className="bg-gray-50">
                            <td colSpan={compareDateRange ? 11 : 7} className="px-6 py-4">
                              <div className="text-sm text-gray-500 py-2">No page data available for this keyword</div>
                            </td>
                          </tr>
                        )}
                      </>
                    )}
                  </>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={compareDateRange ? 11 : 7} className="px-6 py-8 text-center text-sm text-gray-500">
                    N/A - No keywords data available
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredKeywords.length)} of {filteredKeywords.length} keywords
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {selectedKeywords.size > 0 && (
          <div className="mt-4 p-4 bg-blue-50 rounded-md">
            <div className="text-sm font-medium text-gray-700 mb-2">
              Selected Keywords ({selectedKeywords.size}):
            </div>
            <div className="flex flex-wrap gap-2">
              {Array.from(selectedKeywords).map((keyword) => (
                <span
                  key={keyword}
                  className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                >
                  {keyword}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Intent Classification Modal */}
      {intentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setIntentModal(null)}>
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Change Intent Classification</h3>
            <p className="text-sm text-gray-600 mb-4">
              Keyword: <span className="font-medium">{intentModal.keyword}</span>
            </p>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Select Intent Type:</label>
              <div className="grid grid-cols-2 gap-2">
                {INTENT_ORDER.map((intent) => {
                  const config = INTENT_CONFIG[intent];
                  const isSelected = intentModal.currentIntent === intent;
                  return (
                    <button
                      key={intent}
                      onClick={() => setIntentModal({ ...intentModal, currentIntent: intent })}
                      className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                        isSelected 
                          ? `${config.bgColor} ${config.color} ring-2 ring-offset-1 ring-gray-400` 
                          : `${config.bgColor} ${config.color}`
                      }`}
                    >
                      {config.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {similarKeywords.length > 0 && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Apply to similar keywords ({similarKeywords.length} found):
                </label>
                <div className="max-h-32 overflow-y-auto border border-gray-200 rounded-md p-2">
                  {similarKeywords.map((kw) => (
                    <label key={kw} className="flex items-center gap-2 py-1 hover:bg-gray-50 px-1 rounded cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedSimilar.has(kw)}
                        onChange={() => {
                          const newSelected = new Set(selectedSimilar);
                          if (newSelected.has(kw)) {
                            newSelected.delete(kw);
                          } else {
                            newSelected.add(kw);
                          }
                          setSelectedSimilar(newSelected);
                        }}
                        className="rounded border-gray-300"
                      />
                      <span className="text-sm text-gray-700 truncate">{kw}</span>
                    </label>
                  ))}
                </div>
                <button
                  onClick={() => setSelectedSimilar(new Set(similarKeywords))}
                  className="mt-2 text-xs text-blue-600 hover:text-blue-800"
                >
                  Select All
                </button>
              </div>
            )}

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setIntentModal(null)}
                className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md"
              >
                Cancel
              </button>
              <button
                onClick={() => handleIntentChange(intentModal.keyword, intentModal.currentIntent, selectedSimilar.size > 0)}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Apply Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

