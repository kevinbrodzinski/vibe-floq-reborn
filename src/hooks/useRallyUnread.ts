import * as React from 'react';
import { listRallyInbox, subscribeRallyInbox } from '@/lib/api/rallyInbox';

export function useRallyUnread() {
  const [count, setCount] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const lastRefreshRef = React.useRef(0);

  const refresh = React.useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      const rows = await listRallyInbox();
      const total = rows.reduce((sum: number, r: any) => sum + (Number(r.unread_count ?? 0) || 0), 0);
      setCount(total);
    } catch (e: any) {
      setError(e?.message || 'Failed to load inbox');
    } finally {
      setLoading(false);
      lastRefreshRef.current = Date.now();
    }
  }, []);

  React.useEffect(() => { 
    refresh(); 
  }, [refresh]);

  React.useEffect(() => {
    const unsub = subscribeRallyInbox(() => {
      const now = Date.now();
      if (now - lastRefreshRef.current < 2000) return;
      refresh();
    });
    return unsub;
  }, [refresh]);

  return { count, loading, error, refresh };
}