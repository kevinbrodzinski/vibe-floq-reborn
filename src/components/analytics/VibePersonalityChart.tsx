import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { vibeToHex } from '@/lib/vibe/color';
import { safeVibe } from '@/lib/vibes';
import { useProfileStats, VibeDistribution } from '@/hooks/useProfileStats';
import { Card } from '@/components/ui/card';
import { Palette } from 'lucide-react';

export function VibePersonalityChart() {
  const { data: stats, isLoading } = useProfileStats();

  if (isLoading || !stats?.vibe_distribution?.length) {
    return (
      <Card className="p-4 bg-card/50 backdrop-blur-sm border-border/30">
        <div className="flex items-center gap-2 mb-3">
          <Palette className="h-4 w-4 text-secondary" />
          <h3 className="text-sm font-medium">Vibe Personality</h3>
        </div>
        {isLoading ? (
          <div className="h-32 bg-muted rounded animate-pulse" />
        ) : (
          <div className="h-32 flex items-center justify-center text-xs text-muted-foreground">
            No vibe data for analysis
          </div>
        )}
      </Card>
    );
  }

  const chartData = stats.vibe_distribution.map((item: VibeDistribution) => ({
    name: item.vibe,
    value: item.percentage,
    count: item.count,
    fill: vibeToHex(safeVibe(item.vibe))
  }));

  // Custom tooltip for pie chart
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      return (
        <div className="bg-popover border border-border rounded-md p-2 shadow-md">
          <p className="text-xs font-medium capitalize" style={{ color: data.payload.fill }}>
            {data.name}
          </p>
          <p className="text-xs text-muted-foreground">
            {data.value}% ({data.payload.count} times)
          </p>
        </div>
      );
    }
    return null;
  };

  // Custom legend
  const renderCustomLegend = (props: any) => {
    const { payload } = props;
    return (
      <div className="flex flex-wrap gap-2 justify-center mt-2">
        {payload.slice(0, 4).map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-1">
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-xs capitalize text-muted-foreground">
              {entry.value} ({entry.payload.value}%)
            </span>
          </div>
        ))}
      </div>
    );
  };

  const dominantVibe = chartData[0];

  return (
    <Card className="p-4 bg-card/50 backdrop-blur-sm border-border/30">
      <div className="flex items-center gap-2 mb-3">
        <Palette className="h-4 w-4 text-secondary" />
        <h3 className="text-sm font-medium">Vibe Personality</h3>
      </div>
      
      <div className="h-32">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={25}
              outerRadius={50}
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend content={renderCustomLegend} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      
      {dominantVibe && (
        <div className="text-center mt-2">
          <p className="text-xs text-muted-foreground">
            Most dominant: <span className="capitalize font-medium" style={{ color: dominantVibe.fill }}>
              {dominantVibe.name}
            </span> ({dominantVibe.value}%)
          </p>
        </div>
      )}
    </Card>
  );
}