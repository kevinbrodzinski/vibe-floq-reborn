import { useEffect, useState } from "react";

export function useDeviceLocation(enabled = false) {
  const [loc, setLoc] = useState<{ lat:number; lng:number } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    if (!enabled || typeof navigator === "undefined" || !navigator.geolocation) return;
    const id = navigator.geolocation.watchPosition(
      (pos) => setLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (e) => setErr(e.message),
      { enableHighAccuracy: true, maximumAge: 10_000, timeout: 10_000 }
    );
    return () => navigator.geolocation.clearWatch(id);
  }, [enabled]);
  return { loc, error: err };
}