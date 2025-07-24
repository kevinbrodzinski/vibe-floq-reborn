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

    const fetchETA = async () => {
      const s = await getETA(from, to);
      if (!mounted) return;
      setSecs(Math.round(s ?? 0));
      setFresh(true);
      setTimeout(() => setFresh(false), 30_000);
    };
    fetchETA();
    const id = setInterval(fetchETA, 30_000);   // every 30 s
    return () => { mounted = false; clearInterval(id); };
  }, [from?.join(','), to?.join(',')]);

  return { secs, isFresh: fresh };
}