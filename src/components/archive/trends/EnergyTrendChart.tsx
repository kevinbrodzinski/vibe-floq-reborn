import TrendSparkline from './TrendSparkline';
import { useDailyTrends } from '@/hooks/useAfterglowTrends';

export default function EnergyTrendChart() {
  const { data, isLoading } = useDailyTrends();

  const sparkData =
    data?.map((d) => ({ x: d.date, y: d.energy_score })) ?? [];

  return (
    <TrendSparkline
      data={sparkData}
      gradientId="energyGrad"
      stroke="#16a34a"
      isLoading={isLoading}
    />
  );
}