import { useEffect, useState } from 'react';

/** live [lng, lat] from browser/Expo GPS  */
export function useMyLocation() {
  const [pos, setPos] = useState<[number, number] | null>(null);

  useEffect(() => {
    if (!('geolocation' in navigator)) return;

    const id = navigator.geolocation.watchPosition(
      p => setPos([p.coords.longitude, p.coords.latitude]),
      () => {/* ignore errors */},
      { enableHighAccuracy: true, maximumAge: 20_000, timeout: 20_000 }
    );

    return () => navigator.geolocation.clearWatch(id);
  }, []);

  return pos;          // [lng, lat] or null
}