import { LineChart as RechartsLineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';

interface DataPoint {
  date: string;
  value: number;
}

interface LineChartProps {
  data: DataPoint[];
  compareData?: DataPoint[] | null;
  title: string;
  yAxisLabel?: string;
}

export default function LineChart({ data, compareData, title, yAxisLabel }: LineChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        {title && <h3 className="text-lg font-semibold text-gray-800 mb-4">{title}</h3>}
        <div className="text-center py-8 text-gray-500">N/A - Data not available</div>
      </div>
    );
  }

  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), 'MMM dd');
    } catch {
      return dateStr;
    }
  };

  const chartData = data.map((point, index) => {
    const comparePoint = compareData?.[index];
    return {
      date: formatDate(point.date),
      current: point.value,
      compare: comparePoint?.value ?? null,
    };
  });

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={300}>
        <RechartsLineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis label={{ value: yAxisLabel, angle: -90, position: 'insideLeft' }} />
          <Tooltip />
          <Legend />
          <Line
            type="monotone"
            dataKey="current"
            stroke="#3b82f6"
            strokeWidth={2}
            name="Current Period"
            dot={false}
          />
          {compareData && (
            <Line
              type="monotone"
              dataKey="compare"
              stroke="#9ca3af"
              strokeWidth={2}
              name="Compare Period"
              strokeDasharray="5 5"
              dot={false}
            />
          )}
        </RechartsLineChart>
      </ResponsiveContainer>
    </div>
  );
}

