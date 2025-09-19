import { useEffect, useState } from "react";

export function useDeviceLocation(enabled = false) {
  const [loc, setLoc] = useState<{ lat:number; lng:number } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    if (!enabled || typeof navigator === "undefined" || !navigator.geolocation) return;
    let id = -1;
    
    const startWatching = () => {
      id = navigator.geolocation.watchPosition(
        (pos) => setLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (e) => setErr(e.message),
        { enableHighAccuracy: true, maximumAge: 10_000, timeout: 10_000 }
      );
    };

    // Check permissions if API available
    if (navigator.permissions?.query) {
      navigator.permissions.query({ name: "geolocation" as PermissionName }).then((p) => {
        if (p.state === "denied") { 
          setErr("Location permission denied"); 
          return; 
        }
        startWatching();
      }).catch(() => {
        // Fallback if Permissions API unsupported
        startWatching();
      });
    } else {
      // Direct fallback for browsers without Permissions API
      startWatching();
    }
    
    return () => { if (id !== -1) navigator.geolocation.clearWatch(id); };
  }, [enabled]);
  return { loc, error: err };
}