import { LineChart, Line, Tooltip, XAxis, ResponsiveContainer } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';

type Point = { day: string; energy: number; social: number };

export const TrendMiniChart = ({ data }: { data: Point[] }) => {
  if (data.length < 3) {
    return <Skeleton className="h-[50px] w-[120px] rounded-md" />;
  }

  return (
    <div role="img" aria-label="7-day energy and social trend chart">
      <ResponsiveContainer width={120} height={50}>
        <LineChart data={data}>
          <XAxis dataKey="day" hide />
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
            contentStyle={{ background: 'hsl(var(--popover))', border: 'none' }}
            labelFormatter={() => ''}
            formatter={(v: number, k: 'energy' | 'social') => [
              Math.round(v),
              k === 'energy' ? 'Energy' : 'Social',
            ]}
          />
        </LineChart>
      </ResponsiveContainer>
      {/* a11y mirror */}
      <span className="sr-only">
        {data.map(d => `${d.day}: energy ${d.energy}, social ${d.social}; `)}
      </span>
    </div>
  );
};