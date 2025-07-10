import { LineChart, Line, ResponsiveContainer, Tooltip } from 'recharts';
import { getVibeColor } from '@/utils/getVibeColor';
import { useProfileStats, VibeEntry } from '@/hooks/useProfileStats';
import { Card } from '@/components/ui/card';
import { TrendingUp } from 'lucide-react';
import { format } from 'date-fns';

interface SparklineDataPoint {
  timestamp: number;
  vibe: string;
  vibeIndex: number;
  formattedTime: string;
}

const VIBE_ORDER = ['down', 'solo', 'chill', 'flowing', 'social', 'open', 'curious', 'hype', 'romantic', 'weird'];

export function VibeHistorySparkline() {
  const { data: stats, isLoading } = useProfileStats();

  if (isLoading || !stats?.recent_vibes?.length) {
    return (
      <Card className="p-4 bg-card/50 backdrop-blur-sm border-border/30">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-medium">Vibe Timeline</h3>
        </div>
        {isLoading ? (
          <div className="h-16 bg-muted rounded animate-pulse" />
        ) : (
          <div className="h-16 flex items-center justify-center text-xs text-muted-foreground">
            No recent vibe data
          </div>
        )}
      </Card>
    );
  }

  // Transform recent vibes into sparkline data
  const sparklineData: SparklineDataPoint[] = stats.recent_vibes
    .slice()
    .reverse() // Show oldest to newest for timeline
    .map((entry: VibeEntry) => ({
      timestamp: entry.timestamp,
      vibe: entry.vibe,
      vibeIndex: VIBE_ORDER.indexOf(entry.vibe.toLowerCase()) + 1,
      formattedTime: format(new Date(entry.ts), 'MMM d, HH:mm')
    }));

  // Custom tooltip for sparkline
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-popover border border-border rounded-md p-2 shadow-md">
          <p className="text-xs font-medium capitalize" style={{ color: getVibeColor(data.vibe) }}>
            {data.vibe}
          </p>
          <p className="text-xs text-muted-foreground">{data.formattedTime}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="p-4 bg-card/50 backdrop-blur-sm border-border/30">
      <div className="flex items-center gap-2 mb-3">
        <TrendingUp className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-medium">Vibe Timeline</h3>
        <span className="text-xs text-muted-foreground ml-auto">
          Last {stats.recent_vibes.length} vibes
        </span>
      </div>
      
      <div className="h-16">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={sparklineData}>
            <Line
              type="monotone"
              dataKey="vibeIndex"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              dot={{ fill: 'hsl(var(--primary))', strokeWidth: 0, r: 3 }}
              activeDot={{ r: 4, stroke: 'hsl(var(--primary))', strokeWidth: 2 }}
            />
            <Tooltip content={<CustomTooltip />} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      
      <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
        <span>Energy Low</span>
        <span>Energy High</span>
      </div>
    </Card>
  );
}