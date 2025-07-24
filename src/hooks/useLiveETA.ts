import { useEffect, useState } from 'react';
import { getETA } from '@/lib/directionsCache';

export function useLiveETA(
  from: [number, number] | null,
  to:   [number, number] | null,
) {
  const [secs, setSecs]   = useState<number | null>(null);
  const [fresh, setFresh] = useState(false);

  useEffect(() => {
    if (!from || !to) return;
    let mounted = true;
    let freshTimeout: number | null = null;

    const fetchETA = async () => {
      const s = await getETA(from, to);
      if (!mounted) return;
      setSecs(Math.round(s ?? 0));
      setFresh(true);
      freshTimeout = window.setTimeout(() => setFresh(false), 30_000);
    };
    fetchETA();
    const id = setInterval(fetchETA, 30_000);   // every 30 s
    return () => { 
      mounted = false; 
      clearInterval(id);
      if (freshTimeout) clearTimeout(freshTimeout);
    };
  }, [
    // Use JSON.stringify to avoid array instance changes causing re-fetches
    from ? JSON.stringify([from[0], from[1]]) : null,
    to ? JSON.stringify([to[0], to[1]]) : null
  ]);

  return { secs, isFresh: fresh };
}