import * as React from 'react';
import type { VibeReading } from '@/core/vibe/types';
import { getRecentReadings } from '@/storage/vibeSnapshots';
import { useVibeEngine } from '@/hooks/useVibeEngine';

export function useVibeSnapshots(limit = 20) {
  const eng = useVibeEngine(); // we only tap timestamp to trigger refresh
  const [data, setData] = React.useState<VibeReading[]>([]);
  const refresh = React.useCallback(async () => {
    try {
      const rows = await getRecentReadings(limit);
      setData(rows);
    } catch {
      setData([]);
    }
  }, [limit]);

  // Refresh when engine posts a new production reading; also poll as safety
  React.useEffect(() => { refresh(); }, [refresh, (eng as any)?.productionReading?.timestamp]);
  React.useEffect(() => {
    const id = window.setInterval(refresh, 30_000);
    return () => clearInterval(id);
  }, [refresh]);

  return { data, refresh };
}