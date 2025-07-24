import { useEffect, useState } from 'react';
import { getETA } from '@/lib/directionsCache';

export function useLiveETA(
  from: [number, number] | null,
  to:   [number, number] | null,
): { secs: number | null; isFresh: boolean } {
  const [secs, setSecs] = useState<number | null>(null);
  const [fresh, setFresh] = useState(false);

  // Memoize keys to avoid allocation on every render
  const keyFrom = from ? from.join('|') : '';
  const keyTo = to ? to.join('|') : '';

  useEffect(() => {
    if (!keyFrom || !keyTo) return;
    
    let cancelled = false;
    let freshTimeout: number | null = null;

    const fetchETA = async () => {
      const s = await getETA(from!, to!);
      if (cancelled) return;
      setSecs(Math.round(s ?? 0));
      setFresh(true);
      freshTimeout = window.setTimeout(() => setFresh(false), 30_000);
    };

    fetchETA();
    const id = window.setInterval(fetchETA, 30_000);
    
    return () => { 
      cancelled = true;
      window.clearInterval(id);
      if (freshTimeout) window.clearTimeout(freshTimeout);
    };
  }, [keyFrom, keyTo]);

  return { secs, isFresh: fresh };
}