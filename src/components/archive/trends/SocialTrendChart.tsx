import TrendSparkline from './TrendSparkline';
import { useDailyTrends } from '@/hooks/useAfterglowTrends';

export default function SocialTrendChart() {
  const { data, isLoading } = useDailyTrends();

  const sparkData =
    data?.map((d) => ({ x: d.date, y: d.social_intensity })) ?? [];

  return (
    <TrendSparkline
      data={sparkData}
      gradientId="socialGrad"
      stroke="#0ea5e9"
      isLoading={isLoading}
    />
  );
}