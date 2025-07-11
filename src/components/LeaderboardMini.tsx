import { useLeaderboardStats } from '@/hooks/useLeaderboardStats';
import { ResponsiveContainer, RadialBarChart, RadialBar } from 'recharts';

export const LeaderboardMini = () => {
  const { data, isLoading, isError } = useLeaderboardStats();

  if (isLoading) return <p className="text-muted-foreground">Loading…</p>;
  if (isError || !data) return <p className="text-destructive">Error loading stats</p>;

  const chartData = [{ name: 'You', value: data.percentile }];

  return (
    <div className="flex flex-col items-center gap-2">
      <ResponsiveContainer width={120} height={120}>
        <RadialBarChart innerRadius="70%" outerRadius="100%" data={chartData}>
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