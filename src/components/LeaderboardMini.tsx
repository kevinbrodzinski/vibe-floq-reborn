import { useLeaderboardStats } from '@/hooks/useLeaderboardStats';
import { ResponsiveContainer, RadialBarChart, RadialBar } from 'recharts';
import { AlertTriangle } from 'lucide-react';

export const LeaderboardMini = () => {
  const { data, isLoading, isError } = useLeaderboardStats();

  if (isLoading) {
    return (
      <div className="flex flex-col items-center gap-2" aria-label="Loading leaderboard stats">
        <div className="w-[120px] h-[120px] rounded-full bg-muted animate-pulse" />
        <div className="h-4 w-24 bg-muted rounded animate-pulse" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="flex flex-col items-center gap-2 text-destructive" role="alert">
        <AlertTriangle className="w-8 h-8" />
        <p className="text-sm">Unable to load stats</p>
      </div>
    );
  }

  const chartData = [{ name: 'You', value: data.percentile }];

  return (
    <div className="flex flex-col items-center gap-2">
      <ResponsiveContainer width={120} height={120}>
        <RadialBarChart 
          innerRadius="70%" 
          outerRadius="100%" 
          data={chartData}
          aria-label={`You are in the top ${data.percentile}% of players`}
        >
          <RadialBar
            background
            dataKey="value"
            cornerRadius={6}
            fill="hsl(var(--primary))"
          />
        </RadialBarChart>
      </ResponsiveContainer>

      <p className="text-sm text-center text-muted-foreground">
        Top&nbsp;
        <span className="font-semibold text-foreground">{data.percentile}%</span>
        &nbsp;of&nbsp;
        <span className="font-mono text-foreground">{data.total_users}</span> players
      </p>
    </div>
  );
};