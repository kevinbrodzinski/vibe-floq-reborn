'use client';
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  YAxis,
  Tooltip,
} from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';

interface SparkProps {
  data: { x: string; y: number }[];
  gradientId: string;
  stroke: string;
  height?: number;
  withTooltip?: boolean;
  isLoading?: boolean;
}

export default function TrendSparkline({
  data,
  gradientId,
  stroke,
  height = 60,
  withTooltip = false,
  isLoading,
}: SparkProps) {
  if (isLoading) return <Skeleton className="h-[60px] w-full" />;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={stroke} stopOpacity={0.4} />
            <stop offset="95%" stopColor={stroke} stopOpacity={0} />
          </linearGradient>
        </defs>

        <YAxis hide domain={['dataMin', 'dataMax']} />
        <Area
          type="monotone"
          dataKey="y"
          stroke={stroke}
          fillOpacity={1}
          fill={`url(#${gradientId})`}
          dot={false}
          strokeWidth={2}
        />
        {withTooltip && (
          <Tooltip
            contentStyle={{ background: '#1f2937', border: 'none' }}
            labelFormatter={() => ''}
            formatter={(v: number) => Math.round(v)}
          />
        )}
      </AreaChart>
    </ResponsiveContainer>
  );
}