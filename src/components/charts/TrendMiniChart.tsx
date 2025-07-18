import { LineChart, Line, Tooltip, XAxis, YAxis, ResponsiveContainer } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';

type Point = { day: string; energy: number; social: number };

interface TrendMiniChartProps {
  data: Point[];
  width?: number | string;
  height?: number;
}

export const TrendMiniChart = ({ 
  data, 
  width = 120, 
  height = 50 
}: TrendMiniChartProps) => {
  if (data.length < 3) {
    return (
      <div className="flex items-center justify-center">
        <Skeleton className="h-[50px] w-[120px] rounded-md" />
        <span className="sr-only">Need more data for trend chart</span>
      </div>
    );
  }

  return (
    <div role="img" aria-label="7-day energy and social trend chart">
      <ResponsiveContainer width={width} height={height}>
        <LineChart data={data}>
          <XAxis dataKey="day" hide />
          <YAxis hide domain={[0, 100]} />
          <Line
            type="monotone"
            dataKey="energy"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="social"
            stroke="hsl(var(--secondary))"
            strokeDasharray="4 4"
            strokeWidth={2}
            dot={false}
          />
          <Tooltip
            contentStyle={{ 
              background: 'hsl(var(--popover))', 
              border: '1px solid hsl(var(--border))',
              borderRadius: '6px'
            }}
            labelFormatter={() => ''}
            formatter={(v: number, k: 'energy' | 'social') => [
              `${Math.round(v)}%`,
              k === 'energy' ? 'Energy' : 'Social',
            ]}
          />
        </LineChart>
      </ResponsiveContainer>
      {/* a11y mirror */}
      <span className="sr-only">
        {data.map(d => `${d.day}: energy ${d.energy}, social ${d.social}; `).join('')}
      </span>
    </div>
  );
};