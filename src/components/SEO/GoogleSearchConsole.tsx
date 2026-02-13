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
                  const getCompareColor = (metric: string, current: number | null, compare: number | null): string => {
                    if (current === null || current === undefined || compare === null || compare === undefined) {
                      return 'text-red-400'; // Default to red if data is missing
                    }
                    
                    if (metric === 'position') {
                      // For position: lower is better
                      // If compare > current, it's worse (red)
                      // If compare < current, it's better (green)
                      return compare > current ? 'text-red-400' : compare < current ? 'text-green-400' : 'text-red-400';
                    } else {
                      // For impressions, clicks, CTR: higher is better
                      // If compare > current, it's better (green)
                      // If compare < current, it's worse (red)
                      return compare > current ? 'text-green-400' : compare < current ? 'text-red-400' : 'text-red-400';
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
                            <td colSpan={compareDateRange ? 10 : 6} className="px-6 py-4">
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
                            <td colSpan={compareDateRange ? 10 : 6} className="px-6 py-4">
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
                  <td colSpan={compareDateRange ? 10 : 6} className="px-6 py-8 text-center text-sm text-gray-500">
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
    </div>
  );
}

