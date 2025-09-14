import * as React from 'react';
import type { VibeReading } from '@/core/vibe/types';
import { getRecentReadings } from '@/storage/vibeSnapshots';
import { useVibeEngine } from '@/hooks/useVibeEngine';

export function useVibeSnapshots(limit = 20) {
  const eng = useVibeEngine(); // we only use its ticking to refresh
  const [data, setData] = React.useState<VibeReading[]>([]);

  const refresh = React.useCallback(async () => {
    try {
      const rows = await getRecentReadings(limit);
      setData(rows);
    } catch {
      setData([]);
    }
  }, [limit]);

  // initial + update when engine posts a new production reading
  React.useEffect(() => { refresh(); }, [refresh, (eng as any)?.productionReading?.timestamp]);

  // live snapshot events
  React.useEffect(() => {
    if (typeof document === 'undefined') return;
    const onNew = () => refresh();
    document.addEventListener('vibe:snapshot', onNew as EventListener, { passive: true });
    return () => document.removeEventListener('vibe:snapshot', onNew as EventListener);
  }, [refresh]);

  // safety poll (SSR-safe)
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const id = window.setInterval(refresh, 30_000);
    return () => clearInterval(id);
  }, [refresh]);

  return { data, refresh };
}