import { useEffect, useState } from 'react';

/** 
 * Live GPS as {lat, lng} object (standardized format)
 * @deprecated Consider using useGeo or useUserLocation for more robust location handling
 */
export function useMyLocation() {
  const [pos, setPos] = useState<{lat: number, lng: number} | null>(null);

  useEffect(() => {
    if (!('geolocation' in navigator)) return;

    const watchId = navigator.geolocation.watchPosition(
      p => setPos({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => { /* ignore errors */ },
      { enableHighAccuracy: true, maximumAge: 20_000, timeout: 20_000 },
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  return pos;
}