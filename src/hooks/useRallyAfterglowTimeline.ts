import * as React from 'react';
import { listRallyAfterglow } from '@/lib/api/afterglow';

export function useRallyAfterglowTimeline(day?: string) {
  const [items, setItems] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const refresh = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listRallyAfterglow(day);
      setItems(data);
    } catch (e: any) {
      setError(e?.message || 'Failed');
    } finally {
      setLoading(false);
    }
  }, [day]);

  React.useEffect(() => {
    refresh();
  }, [refresh]);

  return { items, loading, error, refresh };
}