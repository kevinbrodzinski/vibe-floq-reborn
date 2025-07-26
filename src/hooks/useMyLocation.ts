import { useEffect, useState } from 'react';

/** Live GPS as `[lng, lat]` (or `null` while we wait) */
export function useMyLocation() {
  const [pos, setPos] = useState<[number, number] | null>(null);

  useEffect(() => {
    if (!('geolocation' in navigator)) return;

    const watchId = navigator.geolocation.watchPosition(
      p => setPos([p.coords.longitude, p.coords.latitude]),
      () => { /* ignore errors */ },
      { enableHighAccuracy: true, maximumAge: 20_000, timeout: 20_000 },
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  return pos;
}