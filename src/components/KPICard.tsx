interface KPICardProps {
  label: string;
  value: string | number | null | undefined;
  compareValue?: string | number | null;
  format?: (value: number) => string;
}

export default function KPICard({ label, value, compareValue, format }: KPICardProps) {
  const formatValue = (val: string | number | null | undefined) => {
    if (val === null || val === undefined) {
      return 'N/A';
    }
    if (typeof val === 'number' && format) {
      return format(val);
    }
    return typeof val === 'number' ? val.toLocaleString() : val;
  };

  const getChange = () => {
    if (value === null || value === undefined || compareValue === null || compareValue === undefined) {
      return null;
    }
    if (typeof value !== 'number' || typeof compareValue !== 'number') {
      return null;
    }
    const change = ((value - compareValue) / compareValue) * 100;
    return change;
  };

  const change = getChange();
  const isUnavailable = value === null || value === undefined;

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="text-sm text-gray-600 mb-2">{label}</div>
      <div className="flex items-baseline gap-2">
        <div className={`text-3xl font-bold ${isUnavailable ? 'text-gray-400' : 'text-gray-900'}`}>
          {formatValue(value)}
        </div>
        {change !== null && !isUnavailable && (
          <div
            className={`text-sm font-medium ${
              change >= 0 ? 'text-green-600' : 'text-red-600'
            }`}
          >
            {change >= 0 ? '+' : ''}
            {change.toFixed(1)}%
          </div>
        )}
      </div>
      {compareValue !== null && compareValue !== undefined && !isUnavailable && (
        <div className="text-xs text-gray-500 mt-2">
          Compare: {formatValue(compareValue)}
        </div>
      )}
    </div>
  );
}

