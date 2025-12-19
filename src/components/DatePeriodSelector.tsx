import type { DateRange } from '../types';
import { format } from 'date-fns';

interface DatePeriodSelectorProps {
  dateRange: DateRange;
  compareDateRange: DateRange | null;
  onDateRangeChange: (range: DateRange) => void;
  onCompareDateRangeChange: (range: DateRange | null) => void;
}

export default function DatePeriodSelector({
  dateRange,
  compareDateRange,
  onDateRangeChange,
  onCompareDateRangeChange,
}: DatePeriodSelectorProps) {
  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onDateRangeChange({
      ...dateRange,
      startDate: new Date(e.target.value),
    });
  };

  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onDateRangeChange({
      ...dateRange,
      endDate: new Date(e.target.value),
    });
  };

  const handleCompareStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (compareDateRange) {
      onCompareDateRangeChange({
        ...compareDateRange,
        startDate: new Date(e.target.value),
      });
    }
  };

  const handleCompareEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (compareDateRange) {
      onCompareDateRangeChange({
        ...compareDateRange,
        endDate: new Date(e.target.value),
      });
    }
  };

  const toggleCompare = () => {
    if (compareDateRange) {
      onCompareDateRangeChange(null);
    } else {
      const daysDiff = Math.ceil(
        (dateRange.endDate.getTime() - dateRange.startDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      const compareStart = new Date(dateRange.startDate);
      compareStart.setDate(compareStart.getDate() - daysDiff - 1);
      const compareEnd = new Date(dateRange.startDate);
      compareEnd.setDate(compareEnd.getDate() - 1);
      onCompareDateRangeChange({ startDate: compareStart, endDate: compareEnd });
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <div className="flex flex-wrap gap-6 items-end">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Date Range
          </label>
          <div className="flex gap-2">
            <input
              type="date"
              value={format(dateRange.startDate, 'yyyy-MM-dd')}
              onChange={handleStartDateChange}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span className="self-center text-gray-500">to</span>
            <input
              type="date"
              value={format(dateRange.endDate, 'yyyy-MM-dd')}
              onChange={handleEndDateChange}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="flex-1 min-w-[200px]">
          <div className="flex items-center gap-3 mb-2">
            <label className="block text-sm font-medium text-gray-700">
              Compare Period
            </label>
            <button
              onClick={toggleCompare}
              className={`px-3 py-1 text-sm rounded-md ${
                compareDateRange
                  ? 'bg-red-100 text-red-700 hover:bg-red-200'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {compareDateRange ? 'Disable' : 'Enable'}
            </button>
          </div>
          {compareDateRange && (
            <div className="flex gap-2">
              <input
                type="date"
                value={format(compareDateRange.startDate, 'yyyy-MM-dd')}
                onChange={handleCompareStartDateChange}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="self-center text-gray-500">to</span>
              <input
                type="date"
                value={format(compareDateRange.endDate, 'yyyy-MM-dd')}
                onChange={handleCompareEndDateChange}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

