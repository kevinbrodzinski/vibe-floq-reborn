import { useLeaderboardStats } from '@/hooks/useLeaderboardStats';
import { ResponsiveContainer, RadialBarChart, RadialBar } from 'recharts';
import { AlertTriangle } from 'lucide-react';
import { ErrorBoundary } from '@/components/ui/error-boundary';

const LeaderboardMiniContent = () => {
  const { data, isLoading, isError } = useLeaderboardStats();

  if (isLoading) {
    return (
      <div className="flex flex-col items-center gap-2 sm:gap-3" aria-label="Loading leaderboard stats">
        <div className="w-20 h-20 sm:w-[120px] sm:h-[120px] rounded-full bg-muted animate-pulse" />
        <div className="h-3 sm:h-4 w-20 sm:w-24 bg-muted rounded animate-pulse" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="flex flex-col items-center gap-2 text-destructive" role="alert">
        <AlertTriangle className="w-6 h-6 sm:w-8 sm:h-8" />
        <p className="text-xs sm:text-sm">Unable to load stats</p>
      </div>
    );
  }

  const { percentile = 0, total_users = 1 } = data;
  const chartData = [{ name: 'You', value: percentile }];

  // Safe string formatting with null checks
  const safePercentile = Number(percentile) || 0;
  const safeTotalUsers = Number(total_users) || 1;

  return (
    <div className="flex flex-col items-center gap-2 sm:gap-3">
      <div className="w-20 h-20 sm:w-[120px] sm:h-[120px]">
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart 
            innerRadius="70%" 
            outerRadius="100%" 
            data={chartData}
            role="img"
            aria-label={`Leaderboard position: You are in the top ${safePercentile}% of ${safeTotalUsers.toLocaleString()} players`}
          >
            <RadialBar
              background
              dataKey="value"
              cornerRadius={6}
              fill="hsl(var(--primary))"
            />
          </RadialBarChart>
        </ResponsiveContainer>
      </div>

      <p className="text-xs sm:text-sm text-center text-muted-foreground leading-tight">
        Top&nbsp;
        <span className="font-semibold text-foreground">{safePercentile}%</span>
        &nbsp;of&nbsp;
        <span className="font-mono text-foreground">{safeTotalUsers.toLocaleString()}</span>
        <span className="sm:inline"> players</span>
      </p>
    </div>
  );
};

export const LeaderboardMini = () => {
  return (
    <ErrorBoundary
      fallback={({ error, retry }) => (
        <div className="flex flex-col items-center gap-2 text-muted-foreground" role="alert">
          <AlertTriangle className="w-6 h-6" />
          <p className="text-xs">Stats unavailable</p>
        </div>
      )}
    >
      <LeaderboardMiniContent />
    </ErrorBoundary>
  );
};